# 🌌 GeminiSpace (SPATIAL_OS) — Agent Guidelines & Repository Directives

This document defines the core architecture, operational constraints, coding standards, and deployment workflows for AI agents operating in the **GeminiSpace (SPATIAL_OS)** repository.

---

## 1. Repository Characteristics

- **Stack**: 
  - **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS v4 + Framer Motion.
  - **Backend**: FastAPI (Python 3.10+) + Uvicorn + Google GenAI SDK (`google-genai`) + NetworkX.
  - **Visualizers**: Three.js & React Three Fiber (`@react-three/fiber`, `@react-three/drei`), D3.js v7, ReactFlow v11.
  - **Hardware Bridge**: ROS2 Nav2 REST Action Dispatcher.
- **Port Allocations**:
  - Frontend: `http://localhost:3000` (Scholar intro: `http://localhost:3000/scholar`)
  - Backend: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
  - Cloud Run Deployment: Injects dynamic `PORT=8080`.
- **Environment Keys**:
  - `GOOGLE_API_KEY`: Required in `backend/.env` for Gemini API calls.
  - `NEXT_PUBLIC_API_BASE_URL`: Frontend environment variable pointing to the backend API base.

---

## 2. The 3-Step VLA Pipeline Directives

All modifications to spatial processing must preserve the **Text-Bridge Architecture**:

| Step | Operation | Function | Active Model | Input $\to$ Output |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | **Topology Extraction** | `VLAService.extract_topology` | `MODEL_TOPOLOGY` (`gemini-3.7-flash`) | 8 directional photos $\to$ Relational Spatial Property Graph |
| **Step 2a** | **Layout Description** | `VLAService.extract_layout_description` | `MODEL_LAYOUT` (`gemini-3.7-flash`) | 8 photos + topology $\to$ CoT ASCII grid + architectural text |
| **Step 2b** | **2D Floor Plan Synthesis** | `VLAService.generate_birds_eye_view` | `MODEL_IMAGE` (`gemini-3.1-flash-image`) | **Text only** $\to$ 16:9 photorealistic 2D blueprint |
| **Step 3** | **Spatial Localization** | `VLAService.locate_objects_in_map` | `MODEL_LOCALIZATION` (`gemini-3.7-flash`) | 2D map + object list $\to$ bounding boxes (%) |
| **Chat** | **Spatial Reasoning** | `VLAService.chat_with_environment` | `MODEL_CHAT` (`gemini-3.7-flash`) | Query + property graph + source photos $\to$ response |
| **Planner** | **Trajectory Planning** | `VLAService.plan_trajectory` | `MODEL_PLANNER` (`gemini-3.7-flash`) | Goal query + graph nodes $\to$ path sequence |

> ⚠️ **CRITICAL INVARIANT**: Never pass raw photographs to `MODEL_IMAGE`. The Text-Bridge (Step 2a $\to$ Step 2b) is mandatory to eliminate 3D perspective distortion in generated floor plans.

---

## 3. Coding Conventions

### Backend (Python)
- **Model Isolation**: Always use model constants imported from `backend/model_config.py`. Never hardcode model strings in service logic.
- **Defensive JSON Parsing**: Always route LLM outputs through `_clean_and_parse_json()` to handle markdown formatting and strip code fences.
- **Fail-Safe Presets**: Always apply `DIRECTION_PRESETS` for any objects omitted during visual localization.
- **Windows Socket Handling**: Preserve the custom `set_exception_handler` in `main.py` to suppress harmless `ConnectionResetError (WinError 10054)` on browser reloads.

### Frontend (TypeScript / Next.js)
- **Centralized API Client**: All HTTP requests must go through `frontend/app/lib/api.ts`. Never use raw `fetch()` in components.
- **Prop-Driven State**: Root dashboard state lives in `app/page.tsx` and passes downward via props.
- **Design Tokens**: High-tech SLAM Operator Console aesthetic. Use CSS variables defined in `app/globals.css`:
  - Backgrounds: `var(--bg-primary)` (`#030712`), `var(--bg-secondary)` (`#0f172a`)
  - Accents: `var(--accent)` (`#00FF9D` neon mint), `var(--cyan)` (`#38BDF8`)
  - Typography: Monospace and clean sans-serif with font scale controls (`S`, `M`, `L`).

---

## 4. Google Cloud Run Deployment Workflow

When deploying the full stack to Google Cloud Run:

1. **Verify Builds Locally**:
   - Backend: Ensure dependencies in `requirements.txt` are clean.
   - Frontend: Run `npm run build` inside `frontend/` to confirm zero TypeScript/CSS errors.
2. **Deploy Backend Service**:
   ```bash
   cd backend
   gcloud run deploy spatial-ai-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GOOGLE_API_KEY="YOUR_KEY"
   ```
   *Record the deployed backend URL (e.g. `https://spatial-ai-backend-xxxxx-uc.a.run.app`).*

3. **Deploy Frontend Service**:
   ```bash
   cd ../frontend
   gcloud run deploy spatial-ai-frontend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NEXT_PUBLIC_API_BASE_URL="https://spatial-ai-backend-xxxxx-uc.a.run.app/api"
   ```

4. **Artifact Registry Permission Fix**:
   If deployment fails with an Artifact Registry upload error, grant `roles/artifactregistry.writer` to the Cloud Build and Compute Engine service accounts.

---

## 5. Specialized Agent Skills

The `.agents/skills/` directory provides on-demand workflows:

- **[`spatial-os-system-design`](file:///d:/git/GeminiSeoulHackathon2026/.agents/skills/spatial-os-system-design/SKILL.md)**: 4-layer impact analysis, architectural expansion guidelines, and schema design.
- **[`vla-pipeline-debugging`](file:///d:/git/GeminiSeoulHackathon2026/.agents/skills/vla-pipeline-debugging/SKILL.md)**: Diagnosing and resolving JSON parsing failures, missing bounding boxes, coordinate mismatches, and rate limits.
- **[`frontend-visualization-guide`](file:///d:/git/GeminiSeoulHackathon2026/.agents/skills/frontend-visualization-guide/SKILL.md)**: Deep dive into Three.js voxel instancing, D3 force graph tuning, and ReactFlow integration.
- **[`scholar-showcase-page`](file:///d:/git/GeminiSeoulHackathon2026/.agents/skills/scholar-showcase-page/SKILL.md)**: Managing the standalone `/scholar` showcase page and integrating static assets.
- **[`gcp-cloud-run-deploy`](file:///d:/git/GeminiSeoulHackathon2026/.agents/skills/gcp-cloud-run-deploy/SKILL.md)**: Containerization, IAM setup, and deployment to Google Cloud Run.
