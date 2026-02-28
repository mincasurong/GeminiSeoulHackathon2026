import os
import json
import base64
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("WARNING: GOOGLE_API_KEY not found in environment.")
    client = None
else:
    client = genai.Client(api_key=api_key)

MODEL_PRO = 'gemini-3-flash-preview'
MODEL_FLASH = 'gemini-3-flash-preview'

class VLAService:
    @staticmethod
    def extract_topology(gemini_images, default_node_name):
        if not client:
             raise ValueError("GenAI client not initialized.")
        
        prompt = """Analyze the provided images and output a strictly formatted JSON object.
        Extraction Rules:
        1. "node_name": Descriptive name based on visual context.
        2. "static_anchors": Large immovable features (architectural/heavy furniture). Include description and image indices (0-based).
        3. "dynamic_objects": Movable objects of interest. Include description and image indices (0-based).
        4. "navigable_edges": Pathways leading out of this area.
        
        Return STRICT JSON."""

        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(
                    data=raw_bytes,
                    mime_type=img["mime_type"]
                )
            )
        parts.append(prompt)

        response = client.models.generate_content(
            model=MODEL_PRO,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        vla_result = json.loads(response.text)
        # Guard: Gemini may return a list instead of a dict
        if isinstance(vla_result, list):
            vla_result = vla_result[0] if len(vla_result) > 0 else {}
        actual_name = vla_result.get("node_name", default_node_name) if isinstance(vla_result, dict) else default_node_name
        
        # Simulated Blueprint
        vla_result["blueprint_url"] = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1000"
        
        return actual_name, vla_result

    @staticmethod
    def plan_trajectory(nodes_list, edges_list, context_data, current_node, user_query):
        if not client:
             raise ValueError("GenAI client not initialized.")

        prompt = f"""
        Current Map Topology: {nodes_list}
        Edges: {edges_list}
        Room Contents: {context_data}
        
        Robot is at: {current_node}
        User Command: "{user_query}"
        
        Plan a path. Return STRICT JSON:
        {{ "plan": ["node_1", "target"], "message": "reason" }}
    