import networkx as nx
import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from models import QueryPayload
from vla_service import VLAService

app = FastAPI(title="Spatial AI SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
session_graph = nx.DiGraph()
node_data: Dict[str, Any] = {} # Store detailed VLA results per node

@app.post("/api/upload-node")
async def upload_node(
    node_name: str = Form(...),
    images: List[UploadFile] = File(...)
):
    gemini_images = []
    for img in images:
        content = await img.read()
        gemini_images.append({
            "mime_type": img.content_type,
            "data": base64.b64encode(content).decode('utf-8')
        })

    try:
        actual_name, vla_result = VLAService.extract_topology(gemini_images, node_name)
        
        session_graph.add_node(actual_name, captured=True)
        node_data[actual_name] = vla_result
        
        nodes = list(session_graph.nodes())
        if len(nodes) > 1:
            session_graph.add_edge(nodes[-2], actual_name)

        return {
            "status": "success",
            "node_name": actual_name,
            "data": vla_result,
            "message": f"Successfully processed {len(images)} images and extracted spatial topology."
        }
    except Exception as e:
        print(f"VLA Error: {e}")
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

@app.get("/api/node/{node_id}")
async def get_node_detail(node_id: str):
    if node_id not in node_data:
        raise HTTPException(status_code=404, detail="Node not found")
    return node_data[node_id]
