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

from model_config import (
    MODEL_TOPOLOGY, MODEL_IMAGE, MODEL_LOCALIZATION,
    MODEL_CHAT, MODEL_PLANNER
)

SYSTEM_INSTRUCTION = """You are an advanced Spatial AI and Visual-Language VLA subsystem. 
Your task is to process images representing a 360-degree view of a single localized environment (a "Node") 
and extract a structured topological understanding of this space."""


class VLAService:

    # ── Step 1: Topology Extraction ────────────────────────────────────
    @staticmethod
    def extract_topology(gemini_images, default_node_name):
        if not client:
            raise ValueError("GenAI client not initialized.")

        prompt = """Analyze the provided images and output a strictly formatted JSON object.
The provided images are ordered sequentially from index 0 to N-1.

Extraction Rules:
1. "node_name": Assign a logical, descriptive name to this location based on the visual context.
2. "static_anchors": Identify large, immovable architectural features or heavy furniture.
   Each item must have: anchor_id, type, description, image_indices (0-based array).
3. "dynamic_objects": Identify movable objects of interest.
   Each item must have: object_id, type, description, image_indices (0-based array).
4. "navigable_edges": Identify clear pathways leading out of this area.
   Each item must have: edge_id, description, visual_cue.

Return STRICT JSON with keys: node_name, static_anchors, dynamic_objects, navigable_edges."""

        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"])
            )
        parts.append(prompt)

        response = client.models.generate_content(
            model=MODEL_TOPOLOGY,
            contents=parts,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json"
            )
        )

        vla_result = json.loads(response.text)
        if isinstance(vla_result, list):
            vla_result = vla_result[0] if len(vla_result) > 0 else {}
        actual_name = vla_result.get("node_name", default_node_name) if isinstance(vla_result, dict) else default_node_name

        return actual_name, vla_result

    # ── Step 2: Bird's-Eye Map Generation ──────────────────────────────
    @staticmethod
    def generate_birds_eye_view(gemini_images, topology):
        if not client:
            raise ValueError("GenAI client not initialized.")

        anchors_text = ", ".join(a.get("type", "") for a in topology.get("static_anchors", []))
        objects_text = ", ".join(d.get("type", "") for d in topology.get("dynamic_objects", []))
        node_name = topology.get("node_name", "Room")

        # Build a spatial description from topology for richer context
        spatial_desc = []
        for a in topology.get("static_anchors", []):
            desc = a.get("description", "")
            spatial_desc.append(f"- {a.get('type','')}: {desc}")
        for d in topology.get("dynamic_objects", []):
            desc = d.get("description", "")
            spatial_desc.append(f"- {d.get('type','')}: {desc}")
        for e in topology.get("navigable_edges", []):
            spatial_desc.append(f"- Exit/pathway: {e.get('description','')} ({e.get('visual_cue','')})")
        spatial_layout = "\n".join(spatial_desc)

        prompt = f"""Study these photographs taken from the center of a room looking in 8 directions (N, NE, E, SE, S, SW, W, NW).
Based on what you see in these photos, generate a strict 2D top-down bird's-eye view floor plan of this room.

PERSPECTIVE: Exactly 90 degrees straight down. Like removing the ceiling and looking at the floor from above.
NO 3D effects, NO angled views, NO perspective distortion. Pure 2D architectural blueprint.

Room: {node_name}
Fixed structures: {anchors_text}
Movable objects: {objects_text}

Spatial layout observed from photos:
{spatial_layout}

STYLE: Professional architectural floor plan. Walls as thick dark lines. Furniture as simple 2D outlines viewed from above.
DO NOT include any text, labels, words, or numbers. Just the visual layout."""

        # Build parts list with images and prompt text
        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"])
            )
        parts.append(types.Part.from_text(text=prompt))

        # Wrap as a single Content object (matches JS SDK's `contents: { parts }`)
        content = types.Content(parts=parts)

        response = client.models.generate_content(
            model=MODEL_IMAGE,
            contents=content,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9"
                )
            )
        )

        # Extract the generated image from the response
        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    img_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                    mime = part.inline_data.mime_type or "image/png"
                    return f"data:{mime};base64,{img_b64}"

        raise ValueError("No image was generated by the model.")

    # ── Step 3: Spatial Localization ───────────────────────────────────
    @staticmethod
    def locate_objects_in_map(map_image_data_url, topology):
        if not client:
            raise ValueError("GenAI client not initialized.")

        objects_to_locate = []
        for a in topology.get("static_anchors", []):
            objects_to_locate.append({"id": a.get("anchor_id", ""), "type": a.get("type", "")})
        for d in topology.get("dynamic_objects", []):
            objects_to_locate.append({"id": d.get("object_id", ""), "type": d.get("type", "")})

        if not objects_to_locate:
            return []

        objects_list = "\n".join(f"- {o['id']} ({o['type']})" for o in objects_to_locate)
        prompt = f"""Analyze this floor plan image. Locate the following objects and provide their bounding boxes.
Objects to locate:
{objects_list}

Return as a JSON array. Each item must have: object_id (string), ymin (number 0-100), xmin (number 0-100), ymax (number 0-100), xmax (number 0-100).
Coordinates are percentages of image dimensions. Ensure ymin < ymax and xmin < xmax."""

        # Parse the data URL to get raw bytes
        header, b64data = map_image_data_url.split(",", 1)
        raw_bytes = base64.b64decode(b64data)
        mime_type = header.split(":")[1].split(";")[0] if ":" in header else "image/png"

        parts = [
            types.Part.from_bytes(data=raw_bytes, mime_type=mime_type),
            prompt
        ]

        response = client.models.generate_content(
            model=MODEL_LOCALIZATION,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        locations = json.loads(response.text)
        if isinstance(locations, dict):
            locations = [locations]
        return locations

    # ── Chat with Environment (Image-Aware) ────────────────────────────
    @staticmethod
    def chat_with_environment(query, topology, history, map_image_b64=None, source_images=None):
        if not client:
            raise ValueError("GenAI client not initialized.")

        system_instruction = f"""You are an AI assistant embedded in a spatial mapping system.
You have access to the following topological data about the current environment:
{json.dumps(topology, indent=2)}

You are also provided with:
1. A bird's-eye view floor plan of the room (if available)
2. The original source photographs captured from the center of the room looking in 8 directions (N, NE, E, SE, S, SW, W, NW)

Answer the user's questions about this environment using BOTH the topological data AND the visual information from the images.
Be concise, helpful, and spatial-aware. When describing locations, reference nearby anchors and edges.
If the user asks about a path, describe the route step-by-step using the navigable edges."""

        # Build message history
        contents = []
        for h in history:
            contents.append(types.Content(
                role=h["role"],
                parts=[types.Part.from_text(text=h["text"])]
            ))

        # Build the user message with images
        user_parts = []

        # Attach the bird's-eye map
        if map_image_b64 and map_image_b64.startswith("data:"):
            try:
                header, b64data = map_image_b64.split(",", 1)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/png"
                user_parts.append(
                    types.Part.from_bytes(data=base64.b64decode(b64data), mime_type=mime)
                )
            except Exception:
                pass

        # Attach relevant source images
        if source_images:
            for img in source_images[:4]:  # Limit to 4 to stay within token budget
                try:
                    raw = base64.b64decode(img["data"])
                    user_parts.append(
                        types.Part.from_bytes(data=raw, mime_type=img["mime_type"])
                    )
                except Exception:
                    pass

        user_parts.append(types.Part.from_text(text=query))
        contents.append(types.Content(role="user", parts=user_parts))

        response = client.models.generate_content(
            model=MODEL_CHAT,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )

        return response.text or "No response."

    # ── Trajectory Planner (existing) ─────────────────────────────────
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
        """

        response = client.models.generate_content(
            model=MODEL_PLANNER,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
