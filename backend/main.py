import os
import sys
import asyncio
import logging
import base64
import json
import urllib.parse
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

import networkx as nx
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from models import (
    SpatialNode, ObjectLocation, UploadNodeResponse,
    ChatPayload, ChatResponse,
    QueryPayload, QueryPlannerResponse,
    EnginesResponse, EngineInfo,
    GraphResponse, GraphNode, GraphEdge,
    NodeImagesResponse
)
from vla_service import VLAService

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("spatial_os_backend")

# ─── In-Memory Session Graph & Data Store ─────────────────────────────
session_graph = nx.DiGraph()
node_data: Dict[str, Dict[str, Any]] = {}
node_images: Dict[str, List[Dict[str, str]]] = {}
node_map_images: Dict[str, str] = {}


def _seed_default_sample_topology():
    """Load default sample topology from public/topology.json if available."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "topology.json"),
        os.path.join(os.path.dirname(__file__), "public", "topology.json"),
        "frontend/public/topology.json"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    sample = json.load(f)
                    node_name = sample.get("node_name", "Building Elevator Lobby and Stairwell")
                    session_graph.add_node(node_name, captured=True)
                    node_data[node_name] = sample
                    logger.info(f"Pre-seeded session with default topology: '{node_name}'")
                    return
            except Exception as e:
                logger.warning(f"Could not load sample topology: {e}")


# ─── Lifespan & Windows Asyncio Socket Fix ────────────────────────────
_original_handler = None

def _silence_connection_reset(loop, context):
    exc = context.get("exception")
    if isinstance(exc, ConnectionResetError) or (
        hasattr(exc, "winerror") and getattr(exc, "winerror", None) == 10054
    ):
        return  # Suppress harmless connection resets on browser disconnect
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
    
    # Pre-seed session with sample data so initial queries don't 404
    _seed_default_sample_topology()
    yield

app = FastAPI(
    title="GeminiSpace (SPATIAL_OS) Backend",
    version="2.0.0",
    description="Vision-Language-Action indoor spatial mapping & ROS2 navigation API powered by Google Gemini.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Probes ───────────────────────────────────────────────────

@app.get("/api/info", tags=["System"])
def read_root():
    return {
        "status": "ok",
        "service": "GeminiSpace (SPATIAL_OS) Backend",
        "version": "2.0.0",
        "active_nodes": len(session_graph.nodes())
    }


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "nodes_count": len(session_graph.nodes())}


@app.get("/api/engines", response_model=EnginesResponse, tags=["Engines"])
async def get_engines():
    """Return available cognitive AI engines and status."""
    return EnginesResponse(
        engines=[
            EngineInfo(id="gemini", name="Gemini 3.7 Flash (Low Latency VLA)", available=True)
        ]
    )


# ─── Core VLA Ingestion & Processing ─────────────────────────────────

@app.post("/api/upload-node", response_model=UploadNodeResponse, tags=["VLA Pipeline"])
async def upload_node(
    node_name: str = Form(..., description="Target room or area name"),
    images: List[UploadFile] = File(..., description="8 sequential directional photos (0:N -> 7:NW)"),
    engine: str = Form("gemini", description="AI engine identifier")
):
    """
    Executes the 3-step VLA pipeline:
    1. Topology & SLAM Keypoints: 8 images -> Relational property graph
    2. Bird's-Eye Map Generation: Text-Bridge -> 2D orthographic floor plan
    3. Spatial Localization: Floor plan -> Object bounding boxes (%)
    """
    logger.info(f"Received {len(images)} images for node '{node_name}' (engine: {engine})")
    
    gemini_images = []
    for img in images:
        content = await img.read()
        gemini_images.append({
            "mime_type": img.content_type or "image/jpeg",
            "data": base64.b64encode(content).decode("utf-8")
        })

    try:
        # ── Step 1: SLAM Keypoint & Relational Topology Extraction ──
        logger.info(f"[Step 1/3] Extracting topology for '{node_name}'...")
        actual_name, topology = VLAService.extract_topology(gemini_images, node_name)
        logger.info(f"[Step 1/3] Topology extracted: '{actual_name}'")

        # ── Step 2: Bird's-Eye Map Generation (Text-Bridge) ──
        logger.info("[Step 2/3] Generating 2D orthographic bird's-eye floor plan...")
        try:
            map_image = VLAService.generate_birds_eye_view(gemini_images, topology)
            logger.info("[Step 2/3] 2D floor plan synthesized successfully")
        except Exception as e:
            logger.warning(f"[Step 2/3] Map synthesis fallback triggered: {e}")
            map_image = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"

        # ── Step 3: Spatial Localization ──
        locations: List[Dict[str, Any]] = []
        if map_image.startswith("data:"):
            logger.info("[Step 3/3] Localizing objects on synthesized floor plan...")
            try:
                locations = VLAService.locate_objects_in_map(map_image, topology)
                logger.info(f"[Step 3/3] Located {len(locations)} objects with bounding boxes")
            except Exception as e:
                logger.warning(f"[Step 3/3] Localization warning: {e}")
        else:
            logger.info("[Step 3/3] Skipping visual localization (placeholder map in use)")

        # Persist to in-memory graph session
        session_graph.add_node(actual_name, captured=True)
        node_data[actual_name] = topology
        node_images[actual_name] = gemini_images
        node_map_images[actual_name] = map_image

        nodes = list(session_graph.nodes())
        if len(nodes) > 1:
            session_graph.add_edge(nodes[-2], actual_name)

        return UploadNodeResponse(
            status="success",
            node_name=actual_name,
            topology=SpatialNode(**topology),
            map_image=map_image,
            locations=[ObjectLocation(**loc) for loc in locations],
            engine=engine,
            message=f"Successfully synthesized '{actual_name}' from {len(images)} photos."
        )
    except Exception as e:
        logger.error(f"VLA Pipeline execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"VLA processing error: {str(e)}"
        )


# ─── Multimodal Spatial Chat & Reasoning ─────────────────────────────

@app.post("/api/chat", response_model=ChatResponse, tags=["Spatial Reasoning"])
async def chat(payload: ChatPayload):
    """Multimodal spatial reasoning chat grounded in the extracted environment topology."""
    target_node = payload.node_name
    unquoted_name = urllib.parse.unquote(target_node) if target_node else ""
    
    topology = node_data.get(target_node) or node_data.get(unquoted_name)
    
    if not topology:
        if node_data:
            target_node = list(node_data.keys())[-1]
            topology = node_data[target_node]
        else:
            # Graceful non-404 response when session is uninitialized
            return ChatResponse(
                response="No spatial environment data is currently loaded. Please upload 8 directional images on the left to initiate the VLA mapping pipeline!",
                node_name=target_node or "none"
            )

    try:
        map_img = node_map_images.get(target_node) or node_map_images.get(unquoted_name)
        source_imgs = node_images.get(target_node) or node_images.get(unquoted_name)

        response_text = VLAService.chat_with_environment(
            query=payload.query,
            topology=topology,
            history=payload.history,
            map_image_b64=map_img,
            source_images=source_imgs
        )
        return ChatResponse(response=response_text, node_name=target_node)
    except Exception as e:
        logger.error(f"Chat reasoning error: {e}", exc_info=True)
        return ChatResponse(
            response=f"Spatial reasoning error: {str(e)}",
            node_name=target_node
        )


# ─── Trajectory Path Planner ─────────────────────────────────────────

@app.post("/api/query-planner", response_model=QueryPlannerResponse, tags=["Navigation"])
async def query_planner(payload: QueryPayload):
    """Natural language goal-driven multi-node trajectory planner."""
    current_node = payload.current_node
    nodes_list = list(session_graph.nodes())
    edges_list = list(session_graph.edges())

    if current_node not in nodes_list and nodes_list:
        current_node = nodes_list[0]

    context_data = {n: node_data.get(n, {}).get("dynamic_objects", []) for n in nodes_list}

    try:
        result = VLAService.plan_trajectory(
            nodes=nodes_list,
            edges=edges_list,
            context_data=context_data,
            current_node=current_node,
            user_query=payload.user_query
        )
        return QueryPlannerResponse(
            status=result.get("status", "success"),
            plan=result.get("plan", []),
            message=result.get("message", "Route calculated.")
        )
    except Exception as e:
        logger.error(f"Trajectory planning error: {e}", exc_info=True)
        return QueryPlannerResponse(status="error", plan=[], message=str(e))


# ─── Graph & Node Inspection ─────────────────────────────────────────

@app.get("/api/graph", response_model=GraphResponse, tags=["Topology"])
async def get_graph():
    """Retrieve active session multi-room graph topology."""
    nodes = [
        GraphNode(id=n, data={"label": n}, vla=node_data.get(n))
        for n in session_graph.nodes()
    ]
    edges = [
        GraphEdge(id=f"e-{u}-{v}", source=u, target=v)
        for u, v in session_graph.edges()
    ]
    return GraphResponse(nodes=nodes, edges=edges)


@app.get("/api/node/{node_id:path}/images", response_model=NodeImagesResponse, tags=["Topology"])
async def get_node_images(node_id: str):
    """Return the original directional source photographs as Data URLs."""
    unquoted_id = urllib.parse.unquote(node_id)
    images = node_images.get(unquoted_id) or node_images.get(node_id, [])
    
    result = [f"data:{img['mime_type']};base64,{img['data']}" for img in images]
    return NodeImagesResponse(node_id=unquoted_id, images=result, count=len(result))


@app.get("/api/node/{node_id:path}", response_model=SpatialNode, tags=["Topology"])
async def get_node_detail(node_id: str):
    """Return the structured semantic topology for a specific room node."""
    unquoted_id = urllib.parse.unquote(node_id)
    data = node_data.get(unquoted_id) or node_data.get(node_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node '{unquoted_id}' not found in active session."
        )
    return SpatialNode(**data)


# ─── SPA Static File Serving ─────────────────────────────────────────
frontend_dist = os.path.join(os.path.dirname(__file__), "out")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
else:
    logger.warning(f"Frontend dist not found at {frontend_dist}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("BACKEND_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
