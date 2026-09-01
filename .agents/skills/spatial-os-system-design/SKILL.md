---
name: spatial-os-system-design
description: >-
  Comprehensive system design skill for the SPATIAL_OS (GeminiSpace) project.
  Use when the user asks to modify the VLA pipeline, add new visualization modes,
  extend the API, integrate new Gemini models, add new spatial features,
  refactor architecture, or needs deep understanding of the 3-step pipeline
  (Topology → Text-Bridge Map → Localization). Also use when onboarding a new
  contributor or explaining how the system works end-to-end.
---

# SPATIAL_OS System Design Skill

## Overview

SPATIAL_OS is a Vision-Language-Action (VLA) indoor navigation system. It turns
8 directional room photographs into an interactive semantic map using Google
Gemini cloud models exclusively. This skill encodes the complete system design
knowledge required to extend, debug, or refactor the project.

---

## System Architecture

```
[User Browser — Next.js 16]
      │
      ├── NodeCaptureComponent ──► POST /api/upload-node (8 images + node_name)
      │                                    │
      │                      ┌─────────────┴──────────────┐
      │                      │   VLA 3-Step Pipeline       │
      │                      │   Step 1: Topology (Flash)  │
      │                      │   Step 2a: Layout Desc      │
      │                      │   Step 2b: Image Gen (Pro)  │
      │                      │   Step 3: Localization       │
      │                      └─────────────┬──────────────┘
      │                                    │
      ├── InteriorMapComponent ◄───────────┤ (mapImage + locations)
      ├── SemanticGraph ◄──────────────────┤ (topology graph)
      ├── DigitalTwin ◄────────────────────┘ (3D voxel from map)
      │
      ├── CommandBarComponent ──► POST /api/chat (spatial Q&A)
      │
      └── RobotSettingsModal ───► ROS2 Nav2 FollowWaypoints dispatch
```

---

## The VLA Pipeline in Detail

### Step 1: Topology Extraction

- **Service Function**: `VLAService.extract_topology()`
- **Model**: `MODEL_TOPOLOGY` (currently `gemini-3.7-flash`)
- **Input**: 8 base64-encoded directional images (N, NE, E, SE, S, SW, W, NW)
- **Prompt Strategy**: System prompt instructs the model to act as a spatial
  analyst examining a 360° sweep. Returns strict JSON schema.
- **Output Schema**:
  ```json
  {
    "node_name": "kitchen",
    "static_anchors": [
      { "anchor_id": "refrigerator", "type": "appliance",
        "description": "...", "image_indices": [0, 1] }
    ],
    "dynamic_objects": [
      { "object_id": "laptop", "type": "electronics",
        "description": "...", "image_indices": [4] }
    ],
    "navigable_edges": [
      { "edge_id": "hallway_east", "description": "...",
        "visual_cue": "..." }
    ]
  }
  ```

### Step 2: Bird's-Eye Map Generation (Text-Bridge)

This is the **most critical architectural decision** in the system.

- **Step 2a — Layout Description** (`extract_layout_description()`)
  - Model: `MODEL_LAYOUT` (Flash)
  - Input: 8 images + topology JSON
  - Output: Purely textual architectural description of the room layout
  - Purpose: Convert visual spatial data into geometric text

- **Step 2b — Blueprint Generation** (`generate_birds_eye_view()`)
  - Model: `MODEL_IMAGE` (Image generation model)
  - Input: **TEXT ONLY** — the layout description from Step 2a
  - Output: 16:9 orthographic 2D floor plan image (base64 data URL)

> **WHY TEXT-BRIDGE?**
> Feeding raw perspective photos directly to an image generation model causes
> 3D perspective hallucinations in the 2D output. By converting to text first,
> the image model produces clean orthographic layouts without perspective artifacts.

### Step 3: Spatial Localization

- **Service Function**: `VLAService.locate_objects_in_map()`
- **Model**: `MODEL_LOCALIZATION` (Flash)
- **Input**: Generated 2D floor plan + list of all anchors and objects
- **Output**: Bounding boxes as percentages: `{ ymin, xmin, ymax, xmax }` (0–100)
- **Fallback**: `DIRECTION_PRESETS` maps image indices (0=N through 7=NW) to
  predefined bounding box positions for any object the model fails to locate.
- **Coordinate Normalization**: Clamps to 2.0%–98.0% range with minimum
  dimension enforcement.

---

## API Endpoints Reference

| Method | Path | Body | Returns | Purpose |
|--------|------|------|---------|---------|
| POST | `/api/upload-node` | FormData: `node_name`, `images[]`, `engine` | topology + mapImage + locations | Full VLA pipeline |
| POST | `/api/chat` | `{ query, node_name, history, engine }` | `{ response }` | Spatial Q&A |
| POST | `/api/query-planner` | `{ user_query, current_node }` | `{ plan[], message }` | Trajectory planning |
| GET | `/api/graph` | — | `{ nodes[], edges[] }` | Session graph |
| GET | `/api/node/{id}/images` | — | `{ images[] }` | Source photos |
| GET | `/api/node/{id}` | — | topology dict | Node details |
| GET | `/api/engines` | — | `{ engines[] }` | Available AI engines |
| GET | `/health` | — | `{ status: "healthy" }` | Health check |

---

## Frontend Visualization Components

### MAP Tab — `InteriorMapComponent`
- Renders the 2D floor plan with SVG bounding box overlays.
- Clicking an object shows the original source photos where it was detected.
- "SEND TO ROBOT" converts visual % coordinates to metric (1% = 0.1m),
  wraps into `Nav2_FollowWaypoints` JSON, and POSTs to the ROS2 endpoint.

### GRAPH Tab — `SemanticGraph`
- D3.js force-directed simulation with zoom/pan/drag.
- Color-coded: Purple (Room), Green (Anchors), Orange (Objects), Red (Edges).
- Export as PNG via offscreen canvas rasterization.

### TWIN Tab — `DigitalTwin`
- Three.js voxel heightmap: reads floor plan pixel brightness on a 128-grid,
  inverts brightness so dark wall lines extrude upward as 3D blocks.
- `THREE.InstancedMesh` for performance.
- 3D text labels via `@react-three/drei`.
- OrbitControls with constrained polar angles.

### Chat — `CommandBarComponent`
- Multi-turn conversational spatial Q&A grounded in topology context.
- Integrated collapsible system terminal for ROS2 dispatch logs.

---

## Key Design Decisions & Rationale

1. **Text-Bridge Architecture**: Prevents 3D perspective hallucinations in map
   generation. This is non-negotiable for output quality.

2. **Centralized Model Config**: All model strings in `model_config.py` for
   easy swapping during model upgrades (e.g., Flash → Pro transitions).

3. **In-Memory State**: Session data (graphs, images, topologies) stored in
   Python dictionaries — no database. Acceptable for demo/hackathon scope.

4. **Directional Fallback Presets**: Guarantees 100% object coverage on the
   map even when Gemini fails to localize some items.

5. **Dual-Service Cloud Run**: Backend and frontend deployed as separate Cloud
   Run services connected via `NEXT_PUBLIC_API_BASE_URL`.

---

## Extension Guidelines

### Adding a New Visualization Mode
1. Create a new component in `frontend/app/components/`.
2. Add a new tab label in the `viewMode` type union in `page.tsx`.
3. Wire the component into the tab rendering switch in the right column.
4. Pass existing props (`topology`, `mapImage`, `locations`, etc.) as needed.

### Adding a New Pipeline Step
1. Add a new function in `backend/vla_service.py`.
2. Add a new model constant in `backend/model_config.py`.
3. Call the new step from the `process_node()` orchestration in `main.py`.
4. Update `NodeCaptureComponent.tsx` progress bar step count.
5. Update `ARCHITECTURE.md`.

### Adding a New API Endpoint
1. Define the Pydantic request model in `backend/models.py`.
2. Add the FastAPI route in `backend/main.py`.
3. Add the corresponding method in `frontend/app/lib/api.ts`.
4. Never call fetch directly from components.

---

## Common Pitfalls

- **Forgetting Text-Bridge**: If you feed raw images to the image generation
  model, the output will have perspective distortion. Always use the 2-step
  text-bridge approach.
- **Hardcoding model names**: Always use constants from `model_config.py`.
- **Missing JSON cleanup**: Gemini sometimes wraps JSON in markdown code fences.
  Always parse through `_clean_and_parse_json()`.
- **Coordinate range**: Bounding boxes are 0–100 percentages, NOT 0–1 floats.
- **Windows asyncio**: The backend has a special handler to suppress harmless
  `ConnectionResetError (WinError 10054)` on Windows.
