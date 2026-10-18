import json
from typing import Dict, Any, List, Tuple

SYSTEM_INSTRUCTION_TOPOLOGY = (
    "You are an advanced Spatial AI & Visual SLAM Geometry Architect.\n"
    "Your mission is to perform visual feature matching, material extraction, and keypoint triangulation "
    "across 8 sequential 45-degree directional images taken from a room center.\n"
    "You must apply Visual SLAM principles:\n"
    "1. Identify invariant visual keypoints and architectural seams shared across adjacent overlapping frames "
    "(0-1, 1-2, 2-3, 3-4, 4-5, 5-6, 6-7, 7-0).\n"
    "2. Perform loop closure verification between image 7 (NW: 315°) and image 0 (N: 0°) to form a closed, "
    "drift-free 360-degree perimeter polygon.\n"
    "3. Extract the exact physical materials, floor textures, and color finishes to enable photorealistic "
    "overhead architectural rendering.\n"
    "4. Anchor all static fixtures and dynamic objects to these invariant keypoints to eliminate spatial hallucinations."
)

PROMPT_EXTRACT_TOPOLOGY = (
    "Perform Visual SLAM keypoint extraction, surface material analysis, and topological property graph "
    "reconstruction on these 8 sequential directional photos taken from room center:\n"
    "- Index 0 = North (N) [0°]\n"
    "- Index 1 = North-East (NE) [45°]\n"
    "- Index 2 = East (E) [90°]\n"
    "- Index 3 = South-East (SE) [135°]\n"
    "- Index 4 = South (S) [180°]\n"
    "- Index 5 = South-West (SW) [225°]\n"
    "- Index 6 = West (W) [270°]\n"
    "- Index 7 = North-West (NW) [315°]\n\n"
    "### Visual SLAM & Keypoint Tracking Protocol:\n"
    "1. Seam Keypoint Identification across consecutive image pairs [0,1]..[7,0].\n"
    "2. Loop Closure confirmation between Image 7 and Image 0.\n"
    "3. Material & Surface Textures for floor and walls.\n"
    "4. Keypoint-Anchored Entities & Parametric Bounds ([ymin, xmin, ymax, xmax] in [0, 100] and height_m).\n\n"
    "### Output Format (Strict JSON):\n"
    "Return a single JSON object with keys: node_name (string), room_geometry (shape: string, "
    "approx_dimensions: string e.g. '6.8m x 5.4m x 2.8m', flooring_material: string, wall_finish: string, "
    "center_description: string, perimeter_keypoints_order: list of strings, polygon_points: list of [x, y] float pairs), "
    "seam_keypoints (keypoint_id: string, adjacent_pair: [int, int], bearing_degrees: float, visual_feature: string, estimated_distance_m: float), "
    "loop_closure (pair: [7, 0], shared_landmarks: list of strings, closure_verified: bool, notes: string), "
    "static_anchors (anchor_id: string, type: string, cardinal_direction: string, description: string, image_indices: list of ints, associated_keypoints: list of strings, bbox: [ymin, xmin, ymax, xmax], height_m: float), "
    "dynamic_objects (object_id: string, type: string, cardinal_direction: string, description: string, image_indices: list of ints, relative_to_keypoint: string, bbox: [ymin, xmin, ymax, xmax], height_m: float), "
    "spatial_relations (source: string, relation: string, target: string, cardinal_direction: string, distance_estimate: string e.g. '1.5m'), "
    "and navigable_edges (edge_id: string, cardinal_direction: string, description: string, visual_cue: string, keypoint_anchor: string)."
)


def build_layout_description_prompt(topology: Dict[str, Any]) -> str:
    return (
        "You are an expert architectural visualizer and SLAM cartographer.\n"
        "Review the 8 directional photos (N, NE, E, SE, S, SW, W, NW) and the SLAM Seam Keypoints & Relational Property Graph below.\n\n"
        "1. Analyze physical materials, flooring tile patterns, wall finishes, metallic trims, and furniture textures.\n"
        "2. Construct the closed room outer wall perimeter by connecting the seam keypoints in angular sequence (0° -> 360°).\n"
        "3. Write a detailed architectural specification for a photorealistic top-down 2D orthographic floor plan cutaway "
        "(strictly 90 degrees overhead, zero 3D tilt, no text/labels/watermarks).\n\n"
        "### Spatial SLAM & Topology Context:\n"
        + json.dumps(topology, indent=2)
    )


def build_birds_eye_prompt(layout_text: str) -> str:
    return (
        "An ultra-detailed, photorealistic 2D top-down architectural floor plan cutaway rendering.\n"
        "Camera perspective is strictly 90 degrees straight down from overhead (orthographic bird's-eye view, "
        "zero 3D tilt, no vanishing points, flat architectural cutaway).\n"
        "High visual realism matching real architectural interiors:\n"
        "- Realistic flooring textures (polished marble tiles, wood parquet, stone slabs).\n"
        "- Rich true-to-life materials: metal door frames, brushed steel fixtures, glass panels, green foliage, crisp furniture blocks.\n"
        "- Clean geometric room boundary with solid outer walls and doorway cutaways.\n"
        "- Absolutely no text, letters, labels, words, measurement numbers, or watermarks.\n\n"
        f"Architectural & Material Specifications:\n{layout_text}"
    )


def build_localization_prompt(objects_list: str) -> str:
    return (
        "Analyze this 2D top-down floor plan blueprint image.\n"
        "Locate each of the following spatial entities on the map and return their percentage-based bounding box coordinates:\n\n"
        f"Entities to locate:\n{objects_list}\n\n"
        "Return a STRICT JSON array where each element contains:\n"
        '- "object_id": string (must match the requested entity ID exactly)\n'
        '- "ymin": number between 0.0 and 100.0 (percentage from top edge)\n'
        '- "xmin": number between 0.0 and 100.0 (percentage from left edge)\n'
        '- "ymax": number between 0.0 and 100.0 (percentage from top edge)\n'
        '- "xmax": number between 0.0 and 100.0 (percentage from left edge)\n\n'
        "Ensure ymin < ymax and xmin < xmax."
    )


def build_chat_prompt(topology: Dict[str, Any], conv_text: str, query: str) -> str:
    return (
        f"You are the intelligent Spatial OS environmental reasoning assistant.\n"
        f"You possess a 3D cognitive mental model of the room: '{topology.get('node_name', 'current area')}'.\n\n"
        f"### Room Spatial Geometry & Materials:\n{json.dumps(topology.get('room_geometry', {}), indent=2)}\n\n"
        f"### Visual SLAM Seam Keypoints:\n{json.dumps(topology.get('seam_keypoints', []), indent=2)}\n\n"
        f"### Static Architectural Anchors:\n{json.dumps(topology.get('static_anchors', []), indent=2)}\n\n"
        f"### Dynamic Movable Objects:\n{json.dumps(topology.get('dynamic_objects', []), indent=2)}\n\n"
        f"### Spatial Relational Graph:\n{json.dumps(topology.get('spatial_relations', []), indent=2)}\n\n"
        f"### Navigable Exits:\n{json.dumps(topology.get('navigable_edges', []), indent=2)}\n\n"
        "### Instructions:\n"
        "- Answer spatial, topological, navigational, and environmental questions accurately based on this graph.\n"
        "- Specify cardinal directions and relative relationships.\n"
        "- Provide clear obstacle-free navigation instructions relative to the room center.\n\n"
        f"Recent Conversation:\n{conv_text}\nUser Query: {query}\nResponse:"
    )


def build_planner_prompt(
    nodes: List[str],
    edges: List[Tuple[str, str]],
    context_data: Dict[str, Any],
    current_node: str,
    user_query: str,
) -> str:
    return (
        f"Global Floor Graph:\n"
        f"- Nodes (Rooms): {json.dumps(nodes)}\n"
        f"- Edges (Hallways/Connections): {json.dumps(edges)}\n"
        f"- Room Contents: {json.dumps(context_data, indent=2)}\n"
        f'- Current Starting Node: "{current_node}"\n'
        f'- User Goal: "{user_query}"\n\n'
        "Plan the optimal sequential path of nodes from the start node to the target location.\n"
        "Return a STRICT JSON object:\n"
        "{\n"
        '  "status": "success",\n'
        f'  "plan": ["{current_node}", "next_node", "destination_node"],\n'
        '  "message": "Reasoning explaining why this trajectory is chosen."\n'
        "}"
    )
