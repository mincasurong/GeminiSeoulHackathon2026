import os
import json
import base64
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: Neither GOOGLE_API_KEY nor GEMINI_API_KEY found in environment.")
    client = None
else:
    client = genai.Client(api_key=api_key)

from model_config import (
    MODEL_TOPOLOGY, MODEL_LAYOUT, MODEL_IMAGE, MODEL_LOCALIZATION,
    MODEL_CHAT, MODEL_PLANNER
)

SYSTEM_INSTRUCTION = """You are an advanced Spatial AI and Visual-Language VLA subsystem. 
Your task is to process 8 directional images representing a full 360-degree view of a single localized environment (a "Node") 
and extract a structured topological understanding of this space."""


def _clean_and_parse_json(text: str):
    """Robustly parse JSON response from Gemini, removing markdown codeblocks if present."""
    if not text:
        return {}
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"(\[.*\]|\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        return {}


# Directional coordinate presets (ymin, xmin, ymax, xmax) for fallback placement
DIRECTION_PRESETS = {
    0: (10, 35, 32, 65),   # 0: N (North / Top-Center)
    1: (10, 65, 32, 90),   # 1: NE (North-East / Top-Right)
    2: (35, 65, 65, 90),   # 2: E (East / Right-Center)
    3: (65, 65, 90, 90),   # 3: SE (South-East / Bottom-Right)
    4: (65, 35, 90, 65),   # 4: S (South / Bottom-Center)
    5: (65, 10, 90, 35),   # 5: SW (South-West / Bottom-Left)
    6: (35, 10, 65, 35),   # 6: W (West / Left-Center)
    7: (10, 10, 32, 35),   # 7: NW (North-West / Top-Left)
}


class VLAService:

    # ── Step 1: Topology Extraction ────────────────────────────────────
    @staticmethod
    def extract_topology(gemini_images, default_node_name):
        if not client:
            raise ValueError("GenAI client not initialized.")

        prompt = """Analyze the 8 provided images taken sequentially from the center of a room looking in 8 directions:
Index 0 = North (N)
Index 1 = North-East (NE)
Index 2 = East (E)
Index 3 = South-East (SE)
Index 4 = South (S)
Index 5 = South-West (SW)
Index 6 = West (W)
Index 7 = North-West (NW)

Output a strictly formatted JSON object following these rules:
1. "node_name": Assign a concise, logical name to this room (e.g., "living_room", "office_workspace", "kitchen").
2. "static_anchors": Identify large immovable features (walls, doors, windows, heavy desks, cabinets, refrigerators, sofas).
   Each item must have:
   - "anchor_id": Unique snake_case string (e.g., "main_desk_n", "door_w", "window_e", "sofa_s")
   - "type": Short category string (e.g., "Desk", "Door", "Sofa", "Cabinet")
   - "description": Concise description
   - "image_indices": Array of integers (0-7) indicating which images show this feature.
3. "dynamic_objects": Identify movable items of interest (chairs, monitors, laptops, lamps, trash cans, plants, cups).
   Each item must have:
   - "object_id": Unique snake_case string (e.g., "office_chair_n", "laptop_n", "monitor_e")
   - "type": Short category string (e.g., "Chair", "Laptop", "Monitor", "Plant")
   - "description": Concise description
   - "image_indices": Array of integers (0-7) indicating which images show this object.
4. "navigable_edges": Identify clear pathways out of this room or into adjacent areas.
   Each item must have: "edge_id", "description", "visual_cue".

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

        vla_result = _clean_and_parse_json(response.text)
        if isinstance(vla_result, list):
            vla_result = vla_result[0] if len(vla_result) > 0 else {}

        actual_name = vla_result.get("node_name", default_node_name) if isinstance(vla_result, dict) else default_node_name
        return actual_name, vla_result

    # ── Step 2: Bird's-Eye Map Generation ──────────────────────────────
    # ── Step 2a: Extract Layout Description (Text-Bridge) ───────────────
    @staticmethod
    def extract_layout_description(gemini_images, topology):
        """Use Gemini to convert 8 photos + topology into a pure TEXT layout description."""
        if not client:
            raise ValueError("GenAI client not initialized.")

        prompt = """You are an expert architectural draftsperson. Review these 8 images taken from the center of a room looking in 8 directions (N, NE, E, SE, S, SW, W, NW), and the provided spatial data.

Write a highly detailed, strictly textual description of the 2D floor plan.
Describe the exact shape of the room and the relative 2D positions (North, South, East, West, Center) of all static anchors and dynamic objects.
Do not describe colors or lighting; focus purely on the 2D geometric layout and object placement.

Spatial data:
""" + json.dumps(topology, indent=2)

        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"])
            )
        parts.append(prompt)

        response = client.models.generate_content(
            model=MODEL_LAYOUT,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="text/plain"
            )
        )

        return response.text or ""

    # ── Step 2b: Generate Bird's-Eye View (Text-Only → Image) ──────────
    @staticmethod
    def generate_birds_eye_view(gemini_images, topology):
        """Two-step Text-Bridge: first extract layout text, then generate image from TEXT ONLY."""
        if not client:
            raise ValueError("GenAI client not initialized.")

        print("  [Step 2a] Extracting layout description from photos...")
        layout_text = VLAService.extract_layout_description(gemini_images, topology)
        print(f"  [Step 2a] ✓ Layout description: {len(layout_text)} chars")

        prompt = f"""An orthographic, 2D top-down architectural floor plan blueprint.
Perspective is strictly 90 degrees straight down from overhead.
High contrast, flat shading, clean geometric room boundary with walls and clearly delineated furniture shapes.
No 3D perspective, no vanishing points, no slanted walls.
Do not include any text, labels, words, or numbers.

Layout details: {layout_text}"""

        print("  [Step 2b] Generating floor plan image from text-only prompt...")
        response = client.models.generate_content(
            model=MODEL_IMAGE,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9"
                )
            )
        )

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
        """Locate bounding boxes for all topology items on the generated 2D floor plan image."""
        if not client:
            raise ValueError("GenAI client not initialized.")

        # Compile full list of objects to locate
        all_items = []
        for a in topology.get("static_anchors", []):
            all_items.append({
                "id": a.get("anchor_id", ""),
                "type": a.get("type", ""),
                "indices": a.get("image_indices", [])
            })
        for d in topology.get("dynamic_objects", []):
            all_items.append({
                "id": d.get("object_id", ""),
                "type": d.get("type", ""),
                "indices": d.get("image_indices", [])
            })

        if not all_items:
            return []

        objects_list = "\n".join(f"- {item['id']} ({item['type']})" for item in all_items if item['id'])
        prompt = f"""Analyze this 2D top-down floor plan image. Locate each of the following spatial items on the map and return their bounding box coordinates.

Objects to locate:
{objects_list}

Return a STRICT JSON array where each element is an object with keys:
- "object_id": string (must match the requested item ID exactly)
- "ymin": number between 0 and 100 (percentage from top edge)
- "xmin": number between 0 and 100 (percentage from left edge)
- "ymax": number between 0 and 100 (percentage from top edge)
- "xmax": number between 0 and 100 (percentage from left edge)

Ensure ymin < ymax and xmin < xmax."""

        locations_result = []

        try:
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

            raw_parsed = _clean_and_parse_json(response.text)
            if isinstance(raw_parsed, dict):
                # Handle nested dict keys like {"objects": [...]} or {"locations": [...]}
                for k in ["locations", "objects", "items", "bounding_boxes"]:
                    if k in raw_parsed and isinstance(raw_parsed[k], list):
                        raw_parsed = raw_parsed[k]
                        break
                else:
                    raw_parsed = [raw_parsed]

            if isinstance(raw_parsed, list):
                locations_result = raw_parsed

        except Exception as e:
            print(f"Warning: Gemini localization parsing error: {e}")

        # Normalize and validate returned bounding boxes
        found_ids = set()
        validated_locations = []

        for loc in locations_result:
            if not isinstance(loc, dict):
                continue
            obj_id = str(loc.get("object_id", "")).strip()
            if not obj_id:
                continue

            try:
                ymin = float(loc.get("ymin", 0))
                xmin = float(loc.get("xmin", 0))
                ymax = float(loc.get("ymax", 0))
                xmax = float(loc.get("xmax", 0))

                # Normalize 0-100 percentages
                ymin = max(2.0, min(95.0, ymin))
                xmin = max(2.0, min(95.0, xmin))
                ymax = max(ymin + 5.0, min(98.0, ymax))
                xmax = max(xmin + 5.0, min(98.0, xmax))

                validated_locations.append({
                    "object_id": obj_id,
                    "ymin": round(ymin, 1),
                    "xmin": round(xmin, 1),
                    "ymax": round(ymax, 1),
                    "xmax": round(xmax, 1)
                })
                found_ids.add(obj_id)
            except Exception:
                continue

        # Fallback Bounding Box Estimator for missing objects based on directional image_indices
        for item in all_items:
            obj_id = item["id"]
            if not obj_id or obj_id in found_ids:
                continue

            indices = item.get("indices", [])
            if indices and any(idx in DIRECTION_PRESETS for idx in indices):
                valid_indices = [idx for idx in indices if idx in DIRECTION_PRESETS]
                if valid_indices:
                    # Calculate center position from image indices presets
                    ymins = [DIRECTION_PRESETS[idx][0] for idx in valid_indices]
                    xmins = [DIRECTION_PRESETS[idx][1] for idx in valid_indices]
                    ymaxs = [DIRECTION_PRESETS[idx][2] for idx in valid_indices]
                    xmaxs = [DIRECTION_PRESETS[idx][3] for idx in valid_indices]

                    fallback_ymin = sum(ymins) / len(ymins)
                    fallback_xmin = sum(xmins) / len(xmins)
                    fallback_ymax = sum(ymaxs) / len(ymaxs)
                    fallback_xmax = sum(xmaxs) / len(xmaxs)

                    validated_locations.append({
                        "object_id": obj_id,
                        "ymin": round(fallback_ymin, 1),
                        "xmin": round(fallback_xmin, 1),
                        "ymax": round(fallback_ymax, 1),
                        "xmax": round(fallback_xmax, 1)
                    })
                    found_ids.add(obj_id)

        print(f"  [Step 3] ✓ Localized {len(validated_locations)} / {len(all_items)} total objects on 2D map.")
        return validated_locations

    # ── Spatial Chat (Image-Aware) ─────────────────────────────────────
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

        contents = []
        for h in history:
            contents.append(types.Content(
                role=h["role"],
                parts=[types.Part.from_text(text=h["text"])]
            ))

        user_parts = []

        if map_image_b64 and map_image_b64.startswith("data:"):
            try:
                header, b64data = map_image_b64.split(",", 1)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/png"
                user_parts.append(
                    types.Part.from_bytes(data=base64.b64decode(b64data), mime_type=mime)
                )
            except Exception:
                pass

        if source_images:
            for img in source_images[:4]:
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

    # ── Trajectory Planner ─────────────────────────────────────────────
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
        return _clean_and_parse_json(response.text)
