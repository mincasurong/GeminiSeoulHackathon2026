# Interior Mapper: Multimodal Spatial Extraction VLA Subsystem

## Overview
Interior Mapper is an advanced Vision-Language-Action (VLA) subsystem designed to process 360-degree environmental images (up to 8 nodes) and extract a structured topological understanding of a physical space. It leverages Google's Gemini multimodal models to identify objects, generate a top-down architectural floor plan, map object coordinates onto that plan, and provide an interactive chat interface for spatial querying.

## Architecture & Workflow

The system operates in a 3-step sequential pipeline, orchestrated by the React frontend and powered by the `@google/genai` SDK.

### 1. Topology Extraction (Gemini 3.1 Pro)
- **Input**: Array of base64-encoded images representing a 360-degree view of a room.
- **Process**: The `gemini-3.1-pro-preview` model analyzes the images using a strict JSON schema.
- **Output**: A `SpatialNode` object containing:
  - `node_name`: A descriptive name for the location.
  - `static_anchors`: Immovable architectural features/furniture (e.g., "refrigerator", "door"). Includes the specific image indices where the anchor is visible.
  - `dynamic_objects`: Movable objects of interest (e.g., "laptop", "cup"). Includes image indices.
  - `navigable_edges`: Pathways leading out of the area.

### 2. Bird's-Eye Map Generation (Gemini 2.5 Flash Image / "Nano Banana")
- **Input**: The original images + the extracted `SpatialNode` data.
- **Process**: The `gemini-2.5-flash-image` model is prompted with strict architectural constraints ("Perspective MUST be exactly 90 degrees straight down. No 3D walls...").
- **Output**: A single, clean, 16:9 2D top-down floor plan image (base64).

### 3. Spatial Localization (Gemini 3.1 Pro)
- **Input**: The generated floor plan image + the list of identified anchors and objects.
- **Process**: The `gemini-3.1-pro-preview` model analyzes the 2D map and returns bounding boxes (`ymin`, `xmin`, `ymax`, `xmax` as percentages) for each identified entity.
- **Output**: An array of `ObjectLocation` data used to render interactive hotspots on the UI.

## User Interface (React + Tailwind + Framer Motion)

- **Dark/Technical Aesthetic**: Styled as a high-tech terminal/dashboard using a custom Tailwind theme (`#050505` background, `#00FF9D` accents, `JetBrains Mono` typography).
- **Progress Terminal**: Displays real-time, timestamped logs of the AI pipeline execution.
- **Interactive Map**: The generated floor plan is overlaid with clickable bounding boxes. Clicking a box reveals the object's description and the specific source photos where it was originally detected.
- **Spatial Query Interface**: A chat menu at the bottom allows users to ask questions about the environment. The chat is powered by Gemini 3.1 Pro, injected with the extracted `SpatialNode` JSON as system context.

## Key Files

- `src/services/gemini.ts`: Contains all AI integration logic (`analyzeImages`, `generateBirdsEyeView`, `locateObjectsInMap`, `chatWithEnvironment`).
- `src/App.tsx`: The main React component handling state, file uploads, pipeline orchestration, and rendering the interactive map/chat UI.
- `src/index.css`: Global styles defining the custom CSS variables and scrollbar styling.

## Environment Variables
- `GEMINI_API_KEY`: Required for all model interactions. Injected automatically by the AI Studio runtime.
