import os
import sys
import asyncio
import logging
import base64
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

import networkx as nx
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse

from models import (
    SpatialNode, ObjectLocation, UploadNodeResponse,
    ChatPayload, ChatResponse,
    QueryPayload, QueryPlannerResponse,
    EnginesResponse, EngineInfo,
    GraphResponse, GraphNode, GraphEdge,
    NodeImagesResponse, WorkspaceInfo, WorkspaceTierUpdatePayload,
    GoogleAuthVerifyPayload, UserProfileResponse, AdminUserTierUpdatePayload,
    BillingCheckoutPayload, BillingCheckoutResponse, PaymentReceipt,
    BillingCancelPayload, BillingCancelResponse
)
from vla_service import VLAService
from storage import (
    WorkspaceStore,
    DEFAULT_GOOGLE_CLIENT_ID,
    GCP_PROJECT_ID,
    FIRESTORE_COLLECTION,
    is_admin_email,
    _sync_user_to_firestore,
    compute_polygon_from_keypoints,
    derive_default_locations,
    generate_parametric_svg,
    generate_parametric_svg_data_url,
    generate_dxf_blueprint,
    generate_ros2_mission,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("spatial_os_backend")

store = WorkspaceStore()

session_graph = nx.DiGraph()
node_data: Dict[str, Dict[str, Any]] = {}
node_images: Dict[str, List[Dict[str, str]]] = {}
node_map_images: Dict[str, str] = {}


def _sync_legacy_globals(workspace_id: str = "default") -> None:
    store.ensure_workspace(workspace_id)
    global session_graph, node_data, node_images, node_map_images
    session_graph = store.graphs[workspace_id]
    node_data = store.node_data[workspace_id]
    node_images = store.node_images[workspace_id]
    node_map_images = store.node_map_images[workspace_id]


def _seed_default_sample_topology(workspace_id: str = "default") -> None:
    store.ensure_workspace(workspace_id)
    existing_nodes = store.node_data.get(workspace_id, {})
    default_node_name = "Building Elevator Lobby and Stairwell"
    if existing_nodes:
        existing_sample = existing_nodes.get(default_node_name)
        anchors = (existing_sample or {}).get("static_anchors") or []
        if not existing_sample or (anchors and anchors[0].get("bbox")):
            _sync_legacy_globals("default")
            return

    possible_paths = [
        os.path.join(os.path.dirname(__file__), "out", "topology.json"),
        os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "topology.json"),
        os.path.join(os.path.dirname(__file__), "public", "topology.json"),
        "frontend/public/topology.json"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    sample = json.load(f)
                node_name = sample.get("node_name", default_node_name)
                rg = sample.setdefault("room_geometry", {})
                rg.setdefault("flooring_material", "Polished grey marble tiles with subtle veining")
                rg.setdefault("wall_finish", "Light travertine stone panels with brushed steel & brass trim")
                if not rg.get("polygon_points"):
                    rg["polygon_points"] = compute_polygon_from_keypoints(sample)
                locs = derive_default_locations(sample)
                param_svg = generate_parametric_svg_data_url(sample, locs)
                default_map_img = "/default_blueprint.png"
                blueprint_candidates = [
                    os.path.join(os.path.dirname(__file__), "out", "default_blueprint.png"),
                    os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "default_blueprint.png"),
                    "frontend/public/default_blueprint.png",
                ]
                for bp in blueprint_candidates:
                    if os.path.exists(bp):
                        try:
                            with open(bp, "rb") as bf:
                                b64_png = base64.b64encode(bf.read()).decode("utf-8")
                                default_map_img = f"data:image/png;base64,{b64_png}"
                            break
                        except Exception:
                            pass
                store.save_node(
                    workspace_id=workspace_id,
                    node_name=node_name,
                    topology=sample,
                    locations=locs,
                    map_image=default_map_img,
                    parametric_svg=param_svg,
                    images=[],
                    increment_scan=False,
                )
                _sync_legacy_globals("default")
                return
            except Exception as e:
                logger.warning(f"Could not load sample topology: {e}")


_original_handler = None


def _silence_connection_reset(loop, context):
    exc = context.get("exception")
    if isinstance(exc, ConnectionResetError) or (
        hasattr(exc, "winerror") and getattr(exc, "winerror", None) == 10054
    ):
        return
    if _original_handler:
        _original_handler(context)
    else:
        loop.default_exception_handler(context)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _original_handler
    if sys.platform == "win32":
        loop = asyncio.get_running_loop()
        _original_handler = getattr(loop, "_exception_handler", None)
        loop.set_exception_handler(_silence_connection_reset)

    _seed_default_sample_topology("default")
    yield


app = FastAPI(
    title="SPATIAL_OS Cloud Backend",
    version="4.0.0",
    description="Vision-Language-Action indoor spatial mapping, parametric CAD & ROS2 navigation API.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_seed_default_sample_topology("default")


@app.get("/api/info", tags=["System"])
def read_root():
    return {
        "status": "ok",
        "service": "SPATIAL_OS Cloud Backend",
        "version": "4.0.0",
        "active_nodes": len(session_graph.nodes())
    }


@app.get("/api/config", tags=["System"])
def get_runtime_config():
    return {
        "version": "4.0.0",
        "service": "SPATIAL_OS Cloud",
        "gcpProjectId": GCP_PROJECT_ID,
        "defaultEngine": "gemini-3.8-flash",
        "googleClientId": (
            os.environ.get("GOOGLE_CLIENT_ID")
            or os.environ.get("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
            or DEFAULT_GOOGLE_CLIENT_ID
        ),
    }


def _fetch_json_url(url_or_req, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
    with urllib.request.urlopen(url_or_req, timeout=timeout) as resp:
        if resp.status == 200:
            return json.loads(resp.read().decode("utf-8"))
    return None


@app.post("/api/auth/google/verify", tags=["Authentication"])
async def verify_google_auth(payload: GoogleAuthVerifyPayload):
    verified_email = (payload.email or "").strip()
    verified_name = (payload.name or "").strip()
    verified_picture = payload.avatarUrl

    if payload.idToken:
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(payload.idToken)}"
            token_info = await asyncio.to_thread(_fetch_json_url, url, 5.0)
            if token_info:
                verified_email = token_info.get("email") or verified_email
                verified_name = token_info.get("name") or token_info.get("given_name") or verified_name
                verified_picture = token_info.get("picture") or verified_picture
        except Exception as e:
            logger.warning(f"Google id_token verification fallback: {e}")

    if payload.accessToken and not verified_email:
        try:
            req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.accessToken}"},
            )
            user_info = await asyncio.to_thread(_fetch_json_url, req, 5.0)
            if user_info:
                verified_email = user_info.get("email") or verified_email
                verified_name = user_info.get("name") or user_info.get("given_name") or verified_name
                verified_picture = user_info.get("picture") or verified_picture
        except Exception as e:
            logger.warning(f"Google access_token userinfo fallback: {e}")

    if not verified_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for Google authentication."
        )

    user_record = store.upsert_user(
        email=verified_email,
        name=verified_name,
        avatar_url=verified_picture,
        sync_firestore=True,
    )
    ws_slug = user_record["workspace_id"]
    _seed_default_sample_topology(ws_slug)
    ws_info = store.get_workspace_info(ws_slug)

    profile = UserProfileResponse(
        name=user_record["name"],
        email=user_record["email"],
        avatarUrl=user_record.get("avatarUrl"),
        loginProvider="google",
        loginTime=user_record["last_login"],
        workspace_id=ws_slug,
        role=user_record["role"],
        is_admin=user_record["is_admin"],
        login_count=user_record["login_count"],
        firestore_synced=bool(user_record.get("firestore_synced", False)),
    )

    logger.info(json.dumps({
        "severity": "INFO",
        "event": "USER_AUTHENTICATED",
        "userEmail": verified_email,
        "role": user_record["role"],
        "isAdmin": user_record["is_admin"],
        "workspaceId": ws_slug,
        "firestoreSynced": user_record.get("firestore_synced", False),
    }))

    return {
        "success": True,
        "profile": profile.model_dump(),
        "workspace": ws_info,
    }


@app.get("/api/admin/overview", tags=["Administration"])
async def get_admin_overview(admin_email: str = Query(..., description="Authenticated admin email")):
    if not is_admin_email(admin_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required."
        )
    users_list = store.list_users()
    all_nodes = []
    for ws_id, nodes_dict in store.node_data.items():
        for n_name, topo in nodes_dict.items():
            all_nodes.append({
                "workspace_id": ws_id,
                "node_name": n_name,
                "anchors_count": len(topo.get("static_anchors") or []),
                "objects_count": len(topo.get("dynamic_objects") or []),
                "keypoints_count": len(topo.get("seam_keypoints") or []),
            })
    return {
        "status": "ok",
        "admin_email": admin_email,
        "database": {
            "provider": "Google Cloud Firestore + SQLite Mirror",
            "collection": FIRESTORE_COLLECTION,
            "region": "asia-northeast3",
        },
        "users": users_list,
        "nodes": all_nodes,
        "payments": store.payments[:50],
        "total_users": len(users_list),
        "total_nodes": len(all_nodes),
        "total_payments": len(store.payments),
    }


@app.post("/api/admin/user-tier", tags=["Administration"])
async def admin_update_user_tier(payload: AdminUserTierUpdatePayload):
    if not is_admin_email(payload.admin_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required."
        )
    ws_info = store.set_workspace_tier(payload.workspace_id, payload.tier)
    target_key = payload.target_email.strip().lower()
    if target_key in store.users:
        store.users[target_key]["tier"] = ws_info["tier"]
        _sync_user_to_firestore(store.users[target_key])
    return {
        "status": "success",
        "workspace": ws_info,
        "users": store.list_users(),
    }


@app.get("/health", tags=["System"])
@app.get("/healthz", tags=["System"])
def health_check():
    return {"status": "healthy", "nodes_count": len(session_graph.nodes())}


@app.get("/api/engines", response_model=EnginesResponse, tags=["Engines"])
async def get_engines():
    return EnginesResponse(
        engines=[
            EngineInfo(
                id="gemini-4-argon",
                name="Gemini 4 Argon (Deep SLAM & Reasoning)",
                available=True,
                tier="pro",
                badge="PRO v4"
            ),
            EngineInfo(
                id="gemini-3.8-flash",
                name="Gemini 3.8 Flash (Ultra-Low Latency VLA)",
                available=True,
                tier="free",
                badge="18ms FLASH"
            ),
            EngineInfo(
                id="gemini",
                name="Gemini 4 Argon + 3.8 Flash Hybrid",
                available=True,
                tier="pro",
                badge="HYBRID"
            ),
        ]
    )


@app.get("/api/workspace", response_model=WorkspaceInfo, tags=["SaaS Workspace"])
async def get_workspace(workspace_id: str = Query("default")):
    _seed_default_sample_topology(workspace_id)
    return WorkspaceInfo(**store.get_workspace_info(workspace_id))


@app.post("/api/workspace/tier", response_model=WorkspaceInfo, tags=["SaaS Workspace"])
async def update_workspace_tier(payload: WorkspaceTierUpdatePayload):
    _seed_default_sample_topology(payload.workspace_id)
    target_tier = payload.tier.strip().lower()
    if target_tier != "free" and not is_admin_email(payload.user_email):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Individual users can only use Free mode directly. Complete SaaS subscription checkout to upgrade to Pro or Enterprise."
        )
    return WorkspaceInfo(**store.set_workspace_tier(payload.workspace_id, target_tier))


@app.post("/api/billing/checkout", response_model=BillingCheckoutResponse, tags=["SaaS Billing & Checkout"])
async def create_billing_checkout(payload: BillingCheckoutPayload):
    _seed_default_sample_topology(payload.workspace_id)
    try:
        receipt_dict = store.process_subscription_payment(
            workspace_id=payload.workspace_id,
            user_email=payload.user_email,
            tier=payload.tier,
            billing_cycle=payload.billing_cycle,
            payment_method=payload.payment_method,
        )
        ws_info = store.get_workspace_info(payload.workspace_id)
        return BillingCheckoutResponse(
            status="paid",
            receipt=PaymentReceipt(**receipt_dict),
            workspace=WorkspaceInfo(**ws_info),
            message=f"Subscription payment confirmed ({receipt_dict['amount_label']}). Upgraded to {ws_info['plan_name']}.",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@app.get("/api/billing/history", tags=["SaaS Billing & Checkout"])
async def get_billing_history(workspace_id: str = Query("default")):
    payments = [p for p in store.payments if p.get("workspace_id") == workspace_id]
    return {"workspace_id": workspace_id, "payments": payments, "count": len(payments)}


@app.post("/api/billing/cancel", response_model=BillingCancelResponse, tags=["SaaS Billing & Checkout"])
async def cancel_billing_subscription(payload: BillingCancelPayload):
    _seed_default_sample_topology(payload.workspace_id)
    res = store.cancel_subscription(
        workspace_id=payload.workspace_id,
        user_email=payload.user_email,
        order_id=payload.order_id,
    )
    ws_info = res["workspace"]
    return BillingCancelResponse(
        status="canceled",
        canceled_order_id=res.get("canceled_order_id"),
        workspace=WorkspaceInfo(**ws_info),
        firestore_synced=bool(res.get("firestore_synced", False)),
        message="Subscription has been canceled and synced with your Google account. Workspace reverted to Starter B2C (Free).",
    )


async def _read_uploaded_images(images: List[UploadFile], workspace_id: str) -> List[Dict[str, str]]:
    ws_info = store.ensure_workspace(workspace_id)
    if ws_info["scans_used"] >= ws_info["scans_limit"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Workspace '{workspace_id}' reached scan limit ({ws_info['scans_limit']}) on {ws_info['plan_name']}. Upgrade tier to continue."
        )
    result = []
    for img in images:
        content = await img.read()
        result.append({
            "mime_type": img.content_type or "image/jpeg",
            "data": base64.b64encode(content).decode("utf-8")
        })
    return result


async def _run_vla_pipeline(
    gemini_images: List[Dict[str, str]],
    node_name: str,
    engine: str,
    workspace_id: str,
):
    ws_info = store.ensure_workspace(workspace_id)
    effective_engine = engine
    if effective_engine not in ws_info["allowed_engines"] and effective_engine != "gemini":
        effective_engine = "gemini-3.8-flash"

    yield {"step": 1, "status": "running", "label": "Step 1/3: Extracting SLAM keypoints & parametric topology..."}

    actual_name, topology = await asyncio.to_thread(
        VLAService.extract_topology,
        gemini_images,
        node_name,
        effective_engine,
    )
    rg = topology.setdefault("room_geometry", {})
    rg["polygon_points"] = compute_polygon_from_keypoints(topology)
    initial_locations = derive_default_locations(topology)
    parametric_svg = generate_parametric_svg_data_url(topology, initial_locations)

    yield {
        "step": 2,
        "status": "running",
        "node_name": actual_name,
        "parametric_svg": parametric_svg,
        "label": "Step 2/3: Synthesizing 2D floor plan via Text-Bridge...",
    }

    try:
        map_image = await asyncio.to_thread(
            VLAService.generate_birds_eye_view, gemini_images, topology
        )
    except Exception as e:
        logger.warning(f"[Step 2/3] Fallback to Parametric CAD SVG: {e}")
        map_image = parametric_svg

    yield {"step": 3, "status": "running", "label": "Step 3/3: Grounding metric bounding boxes..."}

    locations = initial_locations
    if map_image.startswith("data:image/png") or map_image.startswith("data:image/jpeg"):
        try:
            locations = await asyncio.to_thread(
                VLAService.locate_objects_in_map, map_image, topology
            )
        except Exception as e:
            logger.warning(f"[Step 3/3] Fallback to parametric bounds: {e}")

    loc_by_id = {loc["object_id"]: loc for loc in locations if "object_id" in loc}
    for a in topology.get("static_anchors", []):
        aid = a.get("anchor_id")
        if aid in loc_by_id:
            l = loc_by_id[aid]
            a["bbox"] = [l["ymin"], l["xmin"], l["ymax"], l["xmax"]]
    for d in topology.get("dynamic_objects", []):
        oid = d.get("object_id")
        if oid in loc_by_id:
            l = loc_by_id[oid]
            d["bbox"] = [l["ymin"], l["xmin"], l["ymax"], l["xmax"]]

    parametric_svg = generate_parametric_svg_data_url(topology, locations)
    store.save_node(
        workspace_id=workspace_id,
        node_name=actual_name,
        topology=topology,
        locations=locations,
        map_image=map_image,
        parametric_svg=parametric_svg,
        images=gemini_images,
        increment_scan=True,
    )
    _sync_legacy_globals(workspace_id)

    final_resp = UploadNodeResponse(
        status="success",
        node_name=actual_name,
        topology=SpatialNode(**topology),
        map_image=map_image,
        parametric_svg=parametric_svg,
        locations=[ObjectLocation(**loc) for loc in locations],
        engine=effective_engine,
        message=f"Successfully synthesized '{actual_name}' from {len(gemini_images)} photos."
    )
    yield {"step": 3, "status": "complete", "result": final_resp}


@app.post("/api/upload-node", response_model=UploadNodeResponse, tags=["VLA Pipeline"])
async def upload_node(
    node_name: str = Form(...),
    images: List[UploadFile] = File(...),
    engine: str = Form("gemini-4-argon"),
    workspace_id: str = Form("default"),
):
    gemini_images = await _read_uploaded_images(images, workspace_id)
    try:
        final_result = None
        async for evt in _run_vla_pipeline(gemini_images, node_name, engine, workspace_id):
            if evt.get("status") == "complete":
                final_result = evt["result"]
        return final_result
    except Exception as e:
        logger.error(f"VLA Pipeline execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"VLA processing error: {str(e)}"
        )


@app.post("/api/upload-node/stream", tags=["VLA Pipeline"])
async def upload_node_stream(
    node_name: str = Form(...),
    images: List[UploadFile] = File(...),
    engine: str = Form("gemini-4-argon"),
    workspace_id: str = Form("default"),
):
    gemini_images = await _read_uploaded_images(images, workspace_id)

    async def event_generator():
        try:
            async for evt in _run_vla_pipeline(gemini_images, node_name, engine, workspace_id):
                if evt.get("status") == "complete":
                    payload = {
                        "step": 3,
                        "status": "complete",
                        "result": evt["result"].model_dump(),
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                else:
                    yield f"data: {json.dumps(evt)}\n\n"
                    await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"Streaming VLA error: {e}", exc_info=True)
            yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/chat", response_model=ChatResponse, tags=["Spatial Reasoning"])
async def chat(payload: ChatPayload):
    ws_id = payload.workspace_id or "default"
    _seed_default_sample_topology(ws_id)
    ws_nodes = store.node_data.get(ws_id, {})

    target_node = payload.node_name
    unquoted_name = urllib.parse.unquote(target_node) if target_node else ""
    topology = ws_nodes.get(target_node) or ws_nodes.get(unquoted_name)

    if not topology:
        if ws_nodes:
            target_node = list(ws_nodes.keys())[-1]
            topology = ws_nodes[target_node]
        else:
            return ChatResponse(
                response="No spatial environment data is currently loaded. Please upload 8 directional images on the left to initiate the VLA mapping pipeline!",
                node_name=target_node or "none",
                engine=payload.engine
            )

    try:
        ws_maps = store.node_map_images.get(ws_id, {})
        ws_imgs = store.node_images.get(ws_id, {})
        map_img = ws_maps.get(target_node) or ws_maps.get(unquoted_name)
        source_imgs = ws_imgs.get(target_node) or ws_imgs.get(unquoted_name)

        response_text = await asyncio.to_thread(
            VLAService.chat_with_environment,
            query=payload.query,
            topology=topology,
            history=payload.history,
            map_image_b64=map_img,
            source_images=source_imgs,
            engine=payload.engine,
        )
        return ChatResponse(response=response_text, node_name=target_node, engine=payload.engine)
    except Exception as e:
        anchors = [a.get("anchor_id") for a in topology.get("static_anchors", [])]
        objects = [d.get("object_id") for d in topology.get("dynamic_objects", [])]
        fallback_msg = (
            f"[{target_node} — Local SLAM Graph Summary] "
            f"Static anchors: {', '.join(anchors) or 'none'}. "
            f"Dynamic objects: {', '.join(objects) or 'none'}. "
            f"(Live Gemini API unavailable: {str(e)})"
        )
        return ChatResponse(
            response=fallback_msg,
            node_name=target_node,
            engine=payload.engine
        )


@app.post("/api/query-planner", response_model=QueryPlannerResponse, tags=["Navigation"])
async def query_planner(payload: QueryPayload):
    ws_id = payload.workspace_id or "default"
    _seed_default_sample_topology(ws_id)
    g = store.graphs.get(ws_id, session_graph)
    ws_nodes = store.node_data.get(ws_id, node_data)
    ws_locs = store.node_locations.get(ws_id, {})

    current_node = payload.current_node
    nodes_list = list(g.nodes())
    edges_list = list(g.edges())

    if current_node not in nodes_list and nodes_list:
        current_node = nodes_list[0]

    context_data = {
        n: {
            "static_anchors": [a.get("anchor_id") for a in ws_nodes.get(n, {}).get("static_anchors", [])],
            "dynamic_objects": [d.get("object_id") for d in ws_nodes.get(n, {}).get("dynamic_objects", [])],
        }
        for n in nodes_list
    }

    try:
        result = await asyncio.to_thread(
            VLAService.plan_trajectory,
            nodes=nodes_list,
            edges=edges_list,
            context_data=context_data,
            current_node=current_node,
            user_query=payload.user_query,
            engine=payload.engine,
        )
        plan_nodes = result.get("plan") or ([current_node] if current_node else [])
        dest_node = plan_nodes[-1] if plan_nodes else current_node
        mission = generate_ros2_mission(
            dest_node,
            ws_nodes.get(dest_node, {}),
            ws_locs.get(dest_node)
        )
        return QueryPlannerResponse(
            status=result.get("status", "success"),
            plan=plan_nodes,
            message=result.get("message", "Route calculated."),
            waypoints=mission.get("waypoints", [])
        )
    except Exception:
        q_lower = payload.user_query.lower()
        matched_node = current_node
        matched_entity = None
        for n in nodes_list:
            topo = ws_nodes.get(n, {})
            for a in topo.get("static_anchors", []):
                aid = a.get("anchor_id", "")
                if aid and (aid.lower() in q_lower or aid.replace("_", " ").lower() in q_lower):
                    matched_node = n
                    matched_entity = aid
                    break
            for d in topo.get("dynamic_objects", []):
                oid = d.get("object_id", "")
                if oid and (oid.lower() in q_lower or oid.replace("_", " ").lower() in q_lower):
                    matched_node = n
                    matched_entity = oid
                    break

        try:
            plan_nodes = nx.shortest_path(g, current_node, matched_node) if current_node != matched_node else [current_node]
        except Exception:
            plan_nodes = [current_node, matched_node] if current_node != matched_node else [current_node]

        mission = generate_ros2_mission(
            matched_node,
            ws_nodes.get(matched_node, {}),
            ws_locs.get(matched_node)
        )
        all_wps = mission.get("waypoints", [])
        if matched_entity:
            filtered = [w for w in all_wps if w.get("object_id") == matched_entity]
            if filtered:
                all_wps = filtered

        return QueryPlannerResponse(
            status="success",
            plan=plan_nodes,
            message=f"Planned deterministic SLAM trajectory across {len(plan_nodes)} node(s) targeting '{matched_entity or matched_node}'.",
            waypoints=all_wps
        )


@app.get("/api/graph", response_model=GraphResponse, tags=["Topology"])
async def get_graph(workspace_id: str = Query("default")):
    _seed_default_sample_topology(workspace_id)
    g = store.graphs.get(workspace_id, session_graph)
    ws_nodes = store.node_data.get(workspace_id, node_data)
    ws_maps = store.node_map_images.get(workspace_id, node_map_images)
    ws_svgs = store.node_parametric_svgs.get(workspace_id, {})
    ws_locs = store.node_locations.get(workspace_id, {})

    nodes = [
        GraphNode(
            id=n,
            data={"label": n},
            vla=ws_nodes.get(n),
            map_image=ws_maps.get(n),
            parametric_svg=ws_svgs.get(n),
            locations=[ObjectLocation(**loc) for loc in ws_locs.get(n, [])]
        )
        for n in g.nodes()
    ]
    edges = [
        GraphEdge(id=f"e-{u}-{v}", source=u, target=v)
        for u, v in g.edges()
    ]
    return GraphResponse(nodes=nodes, edges=edges, workspace_id=workspace_id)


@app.get("/api/node/{node_id:path}/images", response_model=NodeImagesResponse, tags=["Topology"])
async def get_node_images(node_id: str, workspace_id: str = Query("default")):
    unquoted_id = urllib.parse.unquote(node_id)
    ws_imgs = store.node_images.get(workspace_id, node_images)
    images = ws_imgs.get(unquoted_id) or ws_imgs.get(node_id, [])

    result = [f"data:{img['mime_type']};base64,{img['data']}" for img in images]
    return NodeImagesResponse(node_id=unquoted_id, images=result, count=len(result))


@app.get("/api/node/{node_id:path}/export", tags=["CAD & Robotics Export"])
async def export_node_artifact(
    node_id: str,
    format: str = Query("svg"),
    workspace_id: str = Query("default"),
):
    _seed_default_sample_topology(workspace_id)
    unquoted_id = urllib.parse.unquote(node_id)
    ws_nodes = store.node_data.get(workspace_id, node_data)
    ws_locs = store.node_locations.get(workspace_id, {})

    topo = ws_nodes.get(unquoted_id) or ws_nodes.get(node_id)
    if not topo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node '{unquoted_id}' not found in workspace '{workspace_id}'."
        )
    locs = ws_locs.get(unquoted_id) or ws_locs.get(node_id) or derive_default_locations(topo)
    fmt = format.strip().lower()
    safe_slug = "".join(c if c.isalnum() else "_" for c in unquoted_id)

    if fmt == "svg":
        return Response(
            content=generate_parametric_svg(topo, locs),
            media_type="image/svg+xml",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}_blueprint.svg"'}
        )
    if fmt == "dxf":
        return Response(
            content=generate_dxf_blueprint(topo, locs),
            media_type="application/dxf",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}_cad.dxf"'}
        )
    if fmt == "ros2":
        return Response(
            content=json.dumps(generate_ros2_mission(unquoted_id, topo, locs), indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}_nav2_waypoints.json"'}
        )

    payload = {
        "node_name": unquoted_id,
        "workspace_id": workspace_id,
        "topology": topo,
        "locations": locs,
    }
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{safe_slug}_topology.json"'}
    )


@app.get("/api/node/{node_id:path}", response_model=SpatialNode, tags=["Topology"])
async def get_node_detail(node_id: str, workspace_id: str = Query("default")):
    _seed_default_sample_topology(workspace_id)
    unquoted_id = urllib.parse.unquote(node_id)
    ws_nodes = store.node_data.get(workspace_id, node_data)
    data = ws_nodes.get(unquoted_id) or ws_nodes.get(node_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node '{unquoted_id}' not found in active session."
        )
    return SpatialNode(**data)


frontend_dist = os.path.join(os.path.dirname(__file__), "out")
if os.path.exists(os.path.join(frontend_dist, "_next")):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
else:
    @app.get("/", include_in_schema=False)
    def root_status():
        return read_root()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("BACKEND_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
