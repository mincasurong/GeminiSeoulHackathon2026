# MISSION: Scaffold Spatial AI SaaS (Next.js + FastAPI)

## Phase 1: Environment & Dependencies
- [ ] Initialize a monorepo with two directories: `/frontend` (Next.js) and `/backend` (FastAPI).
- [ ] Backend: Install `fastapi`, `uvicorn`, `python-multipart`, `google-generativeai`, `pydantic`, `networkx`.
- [ ] Frontend: Install `axios`, `lucide-react` (for icons), and `react-flow-renderer` (for graph visualization).

## Phase 2: FastAPI Backend Setup
- [ ] Create `main.py` with standard CORS middleware allowing local frontend connections.
- [ ] Create an in-memory dictionary or `networkx` graph object to store the topological nodes globally during the session.
- [ ] Create a POST endpoint `/api/upload-node` that accepts 8 image files (`UploadFile`) and a `node_name` string.
- [ ] Create a POST endpoint `/api/query-planner` that accepts a JSON payload containing the `user_query` and `current_node`.

## Phase 3: Next.js Frontend Setup
- [ ] Create a clean, dark-mode SaaS dashboard layout.
- [ ] Build a `NodeCaptureComponent`: A circular UI layout with 8 image dropzones representing a 360-degree view. Include a "Process Node" submit button.
- [ ] Build a `GraphVisualizerComponent`: Use `react-flow-renderer` to dynamically render the JSON node graph as it updates from the backend.
- [ ] Build a `CommandBarComponent`: A text input field for the user to type spatial queries (e.g., "Find the microwave"). Display the returned trajectory plan as a sequential list below the input.

## Phase 4: Integration
- [ ] Wire the `NodeCaptureComponent` to send `multipart/form-data` to `/api/upload-node`.
- [ ] Wire the `CommandBarComponent` to send JSON to `/api/query-planner`.