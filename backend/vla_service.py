import os
import json
import base64
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("spatial_os_backend.vla_service")

# Configure Gemini Client
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("Neither GOOGLE_API_KEY nor GEMINI_API_KEY found in environment.")
    client = None
else:
    client = genai.Client(api_key=api_key)

from model_config import (
    MODEL_TOPOLOGY, MODEL_LAYOUT, MODEL_IMAGE, MODEL_LOCALIZATION,
    MODEL_CHAT, MODEL_PLANNER
)

SYSTEM_INSTRUCTION_TOPOLOGY = """You are an advanced Spatial AI & Visual SLAM Geometry Architect.
Your mission is to perform visual feature matching, material extraction, and keypoint triangulation across 8 sequential 45-degree directional images taken from a room center.
You must apply Visual SLAM principles:
1. Identify invariant visual keypoints and architectural seams shared across adjacent overlapping frames (0-1, 1-2, 2-3, 3-4, 4-5, 5-6, 6-7, 7-0).
2. Perform loop closure verification between image 7 (NW: 315°) and image 0 (N: 0°) to form a closed, drift-free 360-degree perimeter polygon.
3. Extract the exact physical materials, floor textures, and color finishes to enable photorealistic overhead architectural rendering.
4. Anchor all static fixtures and dynamic objects to these invariant keypoints to eliminate spatial hallucinations."""


def _clean_and_parse_json(text: str) -> Dict[str, Any]:
    """Robustly parse JSON response from Gemini, stripping markdown codeblocks and extracting valid JSON."""
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


# Directional coordinate presets (ymin, xmin, ymax, xmax) for guaranteed fail-safe placement
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

    # ── Step 1: SLAM Keypoint & Relational Topology Extraction ────────
    @staticmethod
    def extract_topology(gemini_images: List[Dict[str, str]], default_node_name: str) -> Tuple[str, Dict[str, Any]]:
        """
        Extracts structured 360° SLAM seam keypoints, perimeter loop closure,
        surface materials, and pairwise relational edges from 8 directional photos.
        Optimized with Gemini 3.7 Flash for low-latency reasoning.
        """
        if not client:
            raise ValueError("GenAI client not initialized. Ensure GOOGLE_API_KEY is configured.")

        prompt = """Perform Visual SLAM keypoint extraction, surface material analysis, and topological property graph reconstruction on these 8 sequential directional photos taken from room center:
- Index 0 = North (N) [0°]
- Index 1 = North-East (NE) [45°]
- Index 2 = East (E) [90°]
- Index 3 = South-East (SE) [135°]
- Index 4 = South (S) [180°]
- Index 5 = South-West (SW) [225°]
- Index 6 = West (W) [270°]
- Index 7 = North-West (NW) [315°]

### Visual SLAM & Keypoint Tracking Protocol:
1. **Seam Keypoint Identification**: Identify sharp, invariant visual features visible in the overlap of consecutive image pairs:
   - Seam [0, 1]: (e.g. Northeast corner where North marble wall meets East doorframe)
   - Seam [1, 2]: (e.g. East golden door left pillar)
   - Seam [2, 3]: (e.g. Southeast room corner / dining room divider)
   - Seam [3, 4]: (e.g. South wall / stairwell opening)
   - Seam [4, 5]: (e.g. Southwest staircase landing post)
   - Seam [5, 6]: (e.g. West wall staircase railing)
   - Seam [6, 7]: (e.g. Northwest wall corner / restaurant sign pillar)
   - Seam [7, 0]: (e.g. Northwest to North elevator left frame)
2. **Loop Closure**: Confirm that Seam [7, 0] closes the 360° loop back to the initial viewpoint in Image 0 without angular drift.
3. **Material & Surface Textures**: Record the exact visual flooring material (marble tiles, wood parquet, stone), wall finishes, and color palette.
4. **Keypoint-Anchored Entities**: Bind each static fixture and dynamic object to its closest identified seam keypoint.

### Output Format (Strict JSON):
Return a single JSON object matching this schema:
{
  "node_name": "Concise descriptive room name (e.g. 'Building Elevator Lobby and Stairwell')",
  "room_geometry": {
    "shape": "rectangular | L-shaped | open-plan | elongated",
    "approx_dimensions": "estimated metric dimensions (e.g. '10m x 7m')",
    "flooring_material": "e.g. polished grey marble floor tiles with subtle veining",
    "wall_finish": "e.g. light travertine stone panels with brushed metal elevator frames",
    "center_description": "visual description of the center floor space and viewpoint",
    "perimeter_keypoints_order": ["kp_0_1", "kp_1_2", "kp_2_3", "kp_3_4", "kp_4_5", "kp_5_6", "kp_6_7", "kp_7_0"]
  },
  "seam_keypoints": [
    {
      "keypoint_id": "unique_keypoint_id (e.g. 'kp_ne_wall_corner', 'kp_elevator_frame_right')",
      "adjacent_pair": [0, 1],
      "bearing_degrees": 45.0,
      "visual_feature": "description of salient geometric edge or corner",
      "estimated_distance_m": 3.5
    }
  ],
  "loop_closure": {
    "pair": [7, 0],
    "shared_landmarks": ["kp_7_0"],
    "closure_verified": true,
    "notes": "360-degree perimeter closure confirmed between Image 7 and Image 0"
  },
  "static_anchors": [
    {
      "anchor_id": "unique_snake_case_id (e.g. 'elevator_doors_n', 'golden_door_e')",
      "type": "Appliance | Door | Wall Sign | Architectural Feature | Heavy Furniture",
      "cardinal_direction": "N | NE | E | SE | S | SW | W | NW",
      "description": "Clear material and appearance description (e.g. 'Reflective brushed steel double doors set in light marble')",
      "image_indices": [0, 1],
      "associated_keypoints": ["kp_elevator_frame_right"]
    }
  ],
  "dynamic_objects": [
    {
      "object_id": "unique_snake_case_id (e.g. 'potted_plant_se', 'signage_stand_nw')",
      "type": "Decor | Signage | Electronics | Chair | Plant | Trash Can",
      "cardinal_direction": "N | NE | E | SE | S | SW | W | NW",
      "description": "Clear visual description of movable object with colors and materials",
      "image_indices": [3],
      "relative_to_keypoint": "kp_golden_door_frame"
    }
  ],
  "spatial_relations": [
    {
      "source": "entity_id_1",
      "relation": "adjacent_to | on_top_of | facing | left_of | right_of | inside | behind",
      "target": "entity_id_2",
      "cardinal_direction": "N | NE | E | SE | S | SW | W | NW",
      "distance_estimate": "estimated metric distance (e.g. '0.8m', '2.5m')"
    }
  ],
  "navigable_edges": [
    {
      "edge_id": "unique_snake_case_id (e.g. 'elevator_entry_n', 'stairs_up_sw')",
      "cardinal_direction": "N | NE | E | SE | S | SW | W | NW",
      "description": "Destination or pathway function",
      "visual_cue": "Salient visual landmark marking this exit",
      "keypoint_anchor": "kp_elevator_frame_right"
    }
  ]
}"""

        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"])
            )
        parts.append(prompt)

        # Low-latency reasoning configuration
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION_TOPOLOGY,
            response_mime_type="application/json",
            temperature=0.2,
            thinking_config=types.ThinkingConfig(
                thinking_budget=1024
            )
        )

        logger.info(f"Extracting SLAM keypoints & relational topology using {MODEL_TOPOLOGY} (low-latency mode)...")
        response = client.models.generate_content(
            model=MODEL_TOPOLOGY,
            contents=parts,
            config=config
        )

        vla_result = _clean_and_parse_json(response.text)
        if isinstance(vla_result, list):
            vla_result = vla_result[0] if len(vla_result) > 0 else {}

        actual_name = vla_result.get("node_name", default_node_name) if isinstance(vla_result, dict) else default_node_name
        return actual_name, vla_result

    # ── Step 2: Bird's-Eye Map Generation (Text-Bridge Architecture) ───

    # ── Step 2a: Keypoint & Material Grounded Layout Description ───────
    @staticmethod
    def extract_layout_description(gemini_images: List[Dict[str, str]], topology: Dict[str, Any]) -> str:
        """
        Converts 8 photos + SLAM keypoints into a realistic, textured 2D architectural floor plan specification.
        Extracts real physical materials (marble, brass, oak, tiles, foliage) from the images.
        """
        if not client:
            raise ValueError("GenAI client not initialized.")

        prompt = """You are an expert architectural visualizer and SLAM cartographer.
Review the 8 directional photos (N, NE, E, SE, S, SW, W, NW) and the SLAM Seam Keypoints & Relational Property Graph below.

### Task:
1. **Physical Materials & Colors**: Analyze the photos to describe the exact physical materials, flooring tile patterns, wall finishes, metallic trims (e.g. golden brass doorframes, brushed steel elevator), and realistic furniture textures visible in the room.
2. **Keypoint Perimeter Polygon**: Construct the closed room outer wall perimeter by connecting the seam keypoints in angular sequence (0° → 45° → 90° → 135° → 180° → 225° → 270° → 315° → 360°/0° loop closure).
3. **Top-Down 2D Architectural Specification**: Write a rich, highly detailed architectural specification for a photorealistic top-down 2D orthographic floor plan cutaway.

### Rendering Directives:
- Specify exact floor textures (e.g. polished light grey marble floor with subtle seams, dark slate stair treads, golden brass doorway thresholds).
- Specify exact fixture appearances matching the photographs (e.g. reflective metal elevator doors on North wall, golden glass framed entrance on East wall, green leafy ficus plant in grey cylindrical planter on Southeast).
- Perspective must be strictly 90 degrees straight down from overhead (no slanted walls, no 3D vanishing points, clean orthographic cutaway).
- Do NOT include any text, letters, labels, dimensions, or watermarks.

### Spatial SLAM & Topology Context:
""" + json.dumps(topology, indent=2)

        parts = []
        for img in gemini_images:
            raw_bytes = base64.b64decode(img["data"])
            parts.append(
                types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"])
            )
        parts.append(prompt)

        config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            temperature=0.2,
            thinking_config=types.ThinkingConfig(
                thinking_budget=1024
            )
        )

        logger.info(f"Generating realistic layout description using {MODEL_LAYOUT}...")
        response = client.models.generate_content(
            model=MODEL_LAYOUT,
            contents=parts,
            config=config
        )

        return response.text or ""

    # ── Step 2b: Photorealistic 2D Blueprint Synthesis ─────────────────
    @staticmethod
    def generate_birds_eye_view(gemini_images: List[Dict[str, str]], topology: Dict[str, Any]) -> str:
        """
        Executes the Text-Bridge:
        Step 2a extracts photorealistic material & geometric text from photos -> Step 2b sends TEXT ONLY to image model.
        """
        if not client:
            raise ValueError("GenAI client not initialized.")

        logger.info("[Step 2a] Extracting material & geometric layout text via Flash...")
        layout_text = VLAService.extract_layout_description(gemini_images, topology)
        logger.info(f"[Step 2a] Layout description ready ({len(layout_text)} chars)")

        prompt = f"""An ultra-detailed, photorealistic 2D top-down architectural floor plan cutaway rendering.
Camera perspective is strictly 90 degrees straight down from overhead (orthographic bird's-eye view, zero 3D tilt, no vanishing points, flat architectural cutaway).
High visual realism matching real architectural interiors:
- Beautiful realistic flooring textures (polished marble tiles, wood parquet, stone slabs with subtle joints and natural reflections).
- Rich true-to-life materials: golden brass metal door frames, brushed stainless steel fixtures, clean glass panels, lush green plant foliage, and crisp furniture blocks.
- Clean geometric room boundary with solid outer walls, realistic doorway cutaways, and soft contact ambient occlusion shadows beneath objects for depth.
- Absolutely no text, letters, labels, words, measurement numbers, or watermarks.

Architectural & Material Specifications:
{layout_text}"""

        logger.info(f"[Step 2b] Synthesizing photorealistic 2D floor plan using {MODEL_IMAGE}...")
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

        raise ValueError("No image was synthesized by the image generation model.")

    # ── Step 3: Spatial Localization on 2D Blueprint ──────────────────
    @staticmethod
    def locate_objects_in_map(map_image_data_url: str, topology: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Grounds all topology entities to visual bounding box coordinates on the synthesized 2D floor plan.
        Includes automatic directional fallback for guaranteed 100% object coverage.
        """
        if not client:
            raise ValueError("GenAI client not initialized.")

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
        prompt = f"""Analyze this 2D top-down floor plan blueprint image.
Locate each of the following spatial entities on the map and return their percentage-based bounding box coordinates:

Entities to locate:
{objects_list}

Return a STRICT JSON array where each element contains:
- "object_id": string (must match the requested entity ID exactly)
- "ymin": number between 0.0 and 100.0 (percentage from top edge)
- "xmin": number between 0.0 and 100.0 (percentage from left edge)
- "ymax": number between 0.0 and 100.0 (percentage from top edge)
- "xmax": number between 0.0 and 100.0 (percentage from left edge)

Ensure ymin < ymax and xmin < xmax."""

        locations_result: List[Dict[str, Any]] = []

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
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )

            parsed = _clean_and_parse_json(response.text)
            if isinstance(parsed, list):
                locations_result = parsed
            elif isinstance(parsed, dict) and "locations" in parsed:
                locations_result = parsed["locations"]
        except Exception as e:
            logger.warning(f"Visual localization model call failed: {e}. Applying directional fallbacks.")

        # Coordinate clamping and directional fallback enforcement
        located_ids = set()
        sanitized_locations = []

        for loc in locations_result:
            oid = loc.get("object_id")
            if not oid:
                continue
            try:
                raw_ymin = float(loc.get("ymin", 0))
                raw_xmin = float(loc.get("xmin", 0))
                raw_ymax = float(loc.get("ymax", 0))
                raw_xmax = float(loc.get("xmax", 0))

                ymin = max(2.0, min(90.0, min(raw_ymin, raw_ymax)))
                xmin = max(2.0, min(90.0, min(raw_xmin, raw_xmax)))
                ymax = max(ymin + 5.0, min(98.0, max(raw_ymin, raw_ymax)))
                xmax = max(xmin + 5.0, min(98.0, max(raw_xmin, raw_xmax)))

                sanitized_locations.append({
                    "object_id": oid,
                    "ymin": round(ymin, 1),
                    "xmin": round(xmin, 1),
                    "ymax": round(ymax, 1),
                    "xmax": round(xmax, 1)
                })
                located_ids.add(oid)
            except Exception:
                pass

        # Directional Preset Fallback for any unlocated items
        for item in all_items:
            oid = item["id"]
            if oid and oid not in located_ids:
                indices = item.get("indices", [])
                primary_idx = indices[0] if indices else 0
                preset = DIRECTION_PRESETS.get(primary_idx % 8, (40, 40, 60, 60))

                sanitized_locations.append({
                    "object_id": oid,
                    "ymin": float(preset[0]),
                    "xmin": float(preset[1]),
                    "ymax": float(preset[2]),
                    "xmax": float(preset[3])
                })
                located_ids.add(oid)

        return sanitized_locations

    # ── Spatial Multimodal Reasoning Chat ─────────────────────────────
    @staticmethod
    def chat_with_environment(
        query: str,
        topology: Dict[str, Any],
        history: List[Dict[str, str]],
        map_image_b64: Optional[str] = None,
        source_images: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Multimodal spatial reasoning chat grounded in SLAM keypoint topological context."""
        if not client:
            raise ValueError("GenAI client not initialized.")

        parts: List[Any] = []

        # Grounding context
        system_context = f"""You are the intelligent Spatial OS environmental reasoning assistant.
You possess a 3D cognitive mental model of the room: '{topology.get("node_name", "current area")}'.

### Room Spatial Geometry & Materials:
{json.dumps(topology.get("room_geometry", {}), indent=2)}

### Visual SLAM Seam Keypoints (Overlapping Landmarks):
{json.dumps(topology.get("seam_keypoints", []), indent=2)}

### Static Architectural Anchors:
{json.dumps(topology.get("static_anchors", []), indent=2)}

### Dynamic Movable Objects:
{json.dumps(topology.get("dynamic_objects", []), indent=2)}

### Spatial Relational Graph (Pairwise Proximity & Orientation):
{json.dumps(topology.get("spatial_relations", []), indent=2)}

### Navigable Exits:
{json.dumps(topology.get("navigable_edges", []), indent=2)}

### Instructions:
- Answer spatial, topological, navigational, and environmental questions accurately based on this graph.
- When referencing objects, specify their cardinal direction (e.g. North, South-East) and relative relationships.
- If asked how to reach an entity, provide clear obstacle-free navigation instructions relative to the room center."""

        # Attach 2D floor plan if available
        if map_image_b64 and map_image_b64.startswith("data:"):
            try:
                header, b64data = map_image_b64.split(",", 1)
                raw_bytes = base64.b64decode(b64data)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/png"
                parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime))
            except Exception:
                pass

        # Attach up to 4 key source directional photos for rich visual context
        if source_images:
            for img in source_images[:4]:
                try:
                    raw_bytes = base64.b64decode(img["data"])
                    parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"]))
                except Exception:
                    pass

        # Append conversation history
        conv_text = ""
        for turn in history[-6:]:
            role = turn.get("role", "user")
            text = turn.get("text", turn.get("content", ""))
            conv_text += f"{role.capitalize()}: {text}\n"

        full_prompt = f"{system_context}\n\nRecent Conversation:\n{conv_text}\nUser Query: {query}\nResponse:"
        parts.append(full_prompt)

        response = client.models.generate_content(
            model=MODEL_CHAT,
            contents=parts,
            config=types.GenerateContentConfig(
                temperature=0.3,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=512
                )
            )
        )
        return response.text or "I could not process the spatial query."

    # ── Trajectory Planner ─────────────────────────────────────────────
    @staticmethod
    def plan_trajectory(
        nodes: List[str],
        edges: List[Tuple[str, str]],
        context_data: Dict[str, Any],
        current_node: str,
        user_query: str
    ) -> Dict[str, Any]:
        """Goal-driven multi-node trajectory planner powered by Gemini 3.7 Flash."""
        if not client:
            raise ValueError("GenAI client not initialized.")

        graph_context = f"""Global Floor Graph:
- Nodes (Rooms): {json.dumps(nodes)}
- Edges (Hallways/Connections): {json.dumps(edges)}
- Room Contents: {json.dumps(context_data, indent=2)}
- Current Starting Node: "{current_node}"
- User Goal: "{user_query}"

Plan the optimal sequential path of nodes from the start node to the target location.
Return a STRICT JSON object:
{{
  "status": "success",
  "plan": ["{current_node}", "next_node", "destination_node"],
  "message": "Reasoning explaining why this trajectory is chosen."
}}"""

        response = client.models.generate_content(
            model=MODEL_PLANNER,
            contents=graph_context,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=512
                )
            )
        )

        return _clean_and_parse_json(response.text)
