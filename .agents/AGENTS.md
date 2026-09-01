# GeminiSpace (SPATIAL_OS) — Agent Rules

## Project Identity

This repository is **SPATIAL_OS (GeminiSpace)** — a Vision-Language-Action (VLA) system
that converts 8 directional room photographs into interactive indoor maps powered by
Google Gemini cloud models. It was originally built for the **Google Seoul Hackathon 2026**.

## Core Architecture

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS v4
- **Backend**: FastAPI (Python 3.10+) + Google GenAI SDK (`google-genai`)
- **Visualization**: Three.js / React Three Fiber (3D), D3.js (Force Graph), ReactFlow (Multi-node Graph)
- **Hardware Bridge**: ROS2 Nav2 FollowWaypoints REST dispatch (simulated)
- **Deployment**: Google Cloud Run (two separate services: backend + frontend)

## Coding Conventions

### Python (Backend)
- Use **Pydantic** for all request/response schemas.
- All Gemini model identifiers must be defined in `backend/model_config.py` — never hardcode model strings in service files.
- JSON responses from Gemini MUST be parsed through `_clean_and_parse_json()` to strip markdown backticks.
- Always provide directional fallback bounding boxes via `DIRECTION_PRESETS` when localization fails.
- Use `python-dotenv` for environment variable loading. API key env var: `GOOGLE_API_KEY`.

### TypeScript (Frontend)
- Use the **App Router** pattern (`app/` directory). No Pages Router.
- All API calls go through `app/lib/api.ts` — never call `fetch()` directly from components.
- State is managed in `page.tsx` and passed via props (no global state library).
- Theme is controlled via `data-theme` attribute on `document.documentElement`.
- Use **CSS Variables** defined in `globals.css` for all color references.
- Use `lucide-react` for icons and `framer-motion` for animations.

### Styling
- Dark mode is the default theme. Light mode is a secondary option.
- The design aesthetic is **Cyberpunk / SLAM Operator Console** — dark backgrounds, neon mint (`#00FF9D`) accent, `JetBrains Mono`-style monospace typography, glassmorphism cards, grid backgrounds, scan-line animations.
- Use Tailwind utility classes for layout; CSS Variables for theme colors.

## The 3-Step VLA Pipeline

This is the core intellectual property. When modifying or extending the pipeline:

1. **Step 1 — Topology Extraction** (`extract_topology`): 8 images → structured JSON (anchors, objects, edges).
2. **Step 2 — Text-Bridge Map Generation** (`generate_birds_eye_view`):
   - 2a: Images + topology → textual architectural description (Flash model).
   - 2b: Text-only → 2D orthographic floor plan image (Image generation model).
3. **Step 3 — Spatial Localization** (`locate_objects_in_map`): Floor plan + object list → bounding boxes (%).

> **CRITICAL**: Step 2 uses a "Text-Bridge" — the image model receives ONLY text, never raw photos.
> This prevents 3D perspective hallucinations in the 2D output.

## Directory Structure

```
GeminiSeoulHackathon2026/
├── .agents/                    # Agent customizations (this folder)
├── backend/
│   ├── main.py                 # FastAPI endpoints
│   ├── vla_service.py          # 3-step Gemini VLA pipeline
│   ├── model_config.py         # Model name constants
│   ├── models.py               # Pydantic schemas
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main dashboard (MAP/GRAPH/TWIN tabs)
│   │   ├── layout.tsx          # Root layout (fonts, globals)
│   │   ├── globals.css         # Theme variables & effects
│   │   ├── scholar/            # Standalone introduction/showcase page
│   │   ├── components/
│   │   │   ├── NodeCaptureComponent.tsx    # 8-photo radial upload
│   │   │   ├── InteriorMapComponent.tsx    # 2D map + bounding boxes + ROS2
│   │   │   ├── SemanticGraph.tsx           # D3.js force graph
│   │   │   ├── DigitalTwin.tsx            # Three.js 3D voxel twin
│   │   │   ├── CommandBarComponent.tsx    # Chat + system terminal
│   │   │   ├── GraphVisualizerComponent.tsx # ReactFlow multi-room graph
│   │   │   └── RobotSettingsModal.tsx     # ROS2 endpoint config
│   │   └── lib/api.ts          # Centralized API client
│   └── package.json
├── ARCHITECTURE.md
├── README.md
└── manual.md
```

## Environment Variables

| Variable | Location | Required | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | `backend/.env` | Yes | Google AI Studio Gemini API key |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend env / Cloud Run | For deploy | Backend API URL (default: `http://localhost:8000/api`) |

## Running Locally

1. Backend: `cd backend && uvicorn main:app --host 127.0.0.1 --port 8000`
2. Frontend: `cd frontend && npm run dev` → `http://localhost:3000`
3. API Docs: `http://localhost:8000/docs`

## Gemini Models Used

| Pipeline Step | Config Constant | Current Model |
|---|---|---|
| Topology Extraction | `MODEL_TOPOLOGY` | `gemini-3.7-flash` |
| Layout Description | `MODEL_LAYOUT` | `gemini-3.7-flash` |
| Floor Plan Image | `MODEL_IMAGE` | `gemini-3.1-flash-image` |
| Object Localization | `MODEL_LOCALIZATION` | `gemini-3.7-flash` |
| Spatial Chat | `MODEL_CHAT` | `gemini-3.7-flash` |
| Trajectory Planner | `MODEL_PLANNER` | `gemini-3.7-flash` |
