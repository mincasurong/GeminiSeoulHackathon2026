import sys
import asyncio
import networkx as nx
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from local_gemma_service import LocalGemmaService
from vla_service import VLAService as GeminiService

def _get_service(engine: str):
    """Return the correct service class based on engine selection."""
    if engine == "gemma":
        return LocalGemmaService
    return GeminiService

app = FastAPI(title="Spatial AI SaaS Backend")

# Suppress harmless Windows asyncio ConnectionResetError (WinError 10054)
# that fires after a successful response when the browser closes the socket.
if sys.platform == "win32":
    _original_handler = None

    def _silence_connection_reset(loop, context):
        exc = context.get("exception")
        if isinstance(exc, ConnectionResetError):
            return  # Swallow silently
        if _original_handler:
            _original_handler(context)
        else:
            loop.default_exception_handler(context)

    @app.on_event("startup")
    async def _patch_event_loop():
        global _original_handler
        loop = asyncio.get_running_loop()
        _original_handler = getattr(loop, "_exception_handler", None)
        loop.set_exception_handler(_silence_connection_reset)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
session_graph = nx.DiGraph()
node_data: Dict[str, Any] = {}
node_images: Dict[str, list] = {}       # Store source images per node
node_map_images: Dict[str, str] = {}    # Store generated map (data URL) per node


class QueryPayload(BaseModel):
    user_query: str
    current_node: str


class ChatPayload(BaseModel):
    query: str
    node_name: str
    history: List[Dict[str, str]] = []
    engine: str = "gemma"


@app.get("/api/engines")
async def get_engines():
    """Return available engines and their status."""
    gemma_ok = True
    try:
        from local_gemma_service import _client
        _client.list()  # Quick ping
    except Exception:
        gemma_ok = False
    return {
        "engines": [
            {"id": "gemma",  "name": "Gemma 4 (Local/Ollama)", "available": gemma_ok},
            {"id": "gemini", "name": "Gemini (Cloud API)",     "available": True},
        ]
    }


@app.post("/api/upload-node")
async def upload_node(
    node_name: str = Form(...),
    images: List[UploadFile] = File(...),
    engine: str = Form("gemma")
):
    service = _get_service(engine)
    engine_label = "Gemma (local)" if engine == "gemma" else "Gemini (cloud)"
    gemini_images = []
    for img in images:
        content = await img.read()
        gemini_images.append({
            "mime_type": img.content_type,
            "data": base64.b64encode(content).decode('utf-8')
        })

    try:
        # -- Step 1: Topology Extraction --
        print(f"[Step 1/3] [{engine_label}] Extracting topology for '{node_name}'...")
        actual_name, topology = service.extract_topology(gemini_images, node_name)
        print(f"[Step 1/3] Topology extracted: {actual_name}")

        # -- Step 2: Bird's-Eye Map Generation --
        print(f"[Step 2/3] [{engine_label}] Generating bird's-eye view map...")
        try:
            map_image = service.generate_birds_eye_view(gemini_images, topology)
            print(f"[Step 2/3] Map generated successfully")
        except Exception as e:
            print(f"[Step 2/3] Map generation failed: {e}, using placeholder")
            map_image = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"

        # -- Step 3: Spatial Localization --
        locations = []
        if map_image.startswith("data:"):
            print(f"[Step 3/3] [{engine_label}] Localizing objects on map...")
            try:
                locations = service.locate_objects_in_map(map_image, topology)
                print(f"[Step 3/3] Located {len(locations)} objects")
            except Exception as e:
                print(f"[Step 3/3] Localization failed: {e}")
        else:
            print(f"[Step 3/3] Skipping localization (no generated map)")

        # Store results
        session_graph.add_node(actual_name, captured=True)
        node_data[actual_name] = topology
        node_images[actual_name] = gemini_images
        node_map_images[actual_name] = map_image

        nodes = list(session_graph.nodes())
        if len(nodes) > 1:
            session_graph.add_edge(nodes[-2], actual_name)

        return {
            "status": "success",
            "node_name": actual_name,
            "topology": topology,
            "map_image": map_image,
            "locations": locations,
            "engine": engine,
            "message": f"Processed {len(images)} images with {engine_label}"
        }
    except Exception as e:
        print(f"VLA Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat(payload: ChatPayload):
    service = _get_service(payload.engine)
    topology = node_data.get(payload.node_name)
    if not topology:
        if node_data:
            payload.node_name = list(node_data.keys())[-1]
            topology = node_data[payload.node_name]
        else:
            raise HTTPException(status_code=404, detail="No environment data available. Process a node first.")

    try:
        map_img = node_map_images.get(payload.node_name)
        source_imgs = node_images.get(payload.node_name)

        response_text = service.chat_with_environment(
            payload.query, topology, payload.history,
            map_image_b64=map_img,
            source_images=source_imgs
        )
        return {"response": response_text, "node_name": payload.node_name}
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query-planner")
async def query_planner(payload: QueryPayload):
    current_node = payload.current_node
    if current_node not in session_graph.nodes() and len(session_graph.nodes()) > 0:
        current_node = list(session_graph.nodes())[0]

    nodes_list = list(session_graph.nodes())
    edges_list = list(session_graph.edges())
    context_data = {n: node_data.get(n, {}).get("dynamic_objects", []) for n in nodes_list}

    try:
        result = VLAService.plan_trajectory(
            nodes_list, edges_list, context_data, current_node, payload.user_query
        )
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/graph")
async def get_graph():
    nodes = [{"id": n, "data": {"label": n}, "vla": node_data.get(n)} for n in session_graph.nodes()]
    edges = [{"id": f"e-{u}-{v}", "source": u, "target": v} for u, v in session_graph.edges()]
    return {"nodes": nodes, "edges": edges}


@app.get("/api/node/{node_id:path}/images")
async def get_node_images(node_id: str):
    """Return the original 8 source images as data URLs for the interactive map."""
    images = node_images.get(node_id, [])
    if not images:
        raise HTTPException(status_code=404, detail="No images found for this node")
    
    result = []
    for img in images:
        data_url = f"data:{img['mime_type']};base64,{img['data']}"
        result.append(data_url)
    return {"node_id": node_id, "images": result, "count": len(result)}


@app.get("/api/node/{node_id:path}")
async def get_node_detail(node_id: str):
    if node_id not in node_data:
        raise HTTPException(status_code=404, detail="Node not found")
    return node_data[node_id]

