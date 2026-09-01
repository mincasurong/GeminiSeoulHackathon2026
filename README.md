# Spatial OS (GeminiSpace) — Indoor Navigator Powered by Gemini

> 🏆 **1st Place Winner — Gemini in Hard Tech Track** at the **[Gemini 3 Seoul Hackathon](https://cerebralvalley.ai/e/gemini-3-seoul-hackathon/hackathon/gallery?project=27)**  
> 📰 **Featured on Google Korea Official Blog:** [단 7시간 만에 혼자 구현하는 AI 공간 솔루션 완성](https://blog.google/intl/ko-kr/company-news/inside-google/gemini-seoul-hackathon-first/)  
> 🎥 **Demo & Pitch Video:** [YouTube Presentation & Live Demo](https://www.youtube.com/watch?v=rZI6C7XsnY4)

<p align="center">
  <img src="docs/geminispace-ezgif.com-video-to-gif-converter.gif" alt="GeminiSpace Animated Demo" width="100%" />
</p>

---

## 🏆 Hackathon Story & Background

**GeminiSpace (Spatial OS)** was born at the **Gemini 3 Seoul Hackathon** (February 28, 2026, hosted by **Google DeepMind**, **Cerebral Valley**, and **AttentionX** in Seoul, Korea). Out of 111 competing AI projects, GeminiSpace was awarded **1st Place** in the *Gemini in Hard Tech* category.

### 💡 The Problem
In industrial automation and smart factories, constructing indoor spatial maps for autonomous mobile robots (AMRs) using traditional SLAM (Simultaneous Localization and Mapping) is time-consuming, rigid, and computationally heavy, requiring expensive LiDAR arrays and strict deterministic engineering.

### 🚀 The 7-Hour Solo Sprint
Developed by a solo engineer in under 7 hours using **Google Antigravity**, **Google AI Studio**, and **Gemini 3 models**, GeminiSpace completely reimagined spatial mapping by answering a simple question:  
*“Can an AI construct a functional 2D floor plan, topological routing graph, 3D voxel twin, and robotic trajectory just by looking at 8 panoramic photos taken from the center of a room?”*

### 🧠 The Core Breakthrough: Text-Bridge Architecture
During development, feeding perspective camera photos directly into image generation models caused perspective distortions and 3D hallucinations in the 2D output. GeminiSpace solved this with a novel **Text-Bridge** pipeline:
1. **Visual to Architecture Text**: Gemini 3 Flash analyzes 8 directional room photos and extracts structured geometric and architectural descriptions.
2. **Text to 2D Orthographic Map**: The image generation model receives *only* pure geometric text descriptions, synthesizing distortion-free 2D floor plans.
3. **Spatial Localization**: Gemini correlates the generated floor plan with detected objects to plot accurate interactive bounding boxes.

### 🤖 Bridging Generative AI with Physical Robotics (VLA)
GeminiSpace goes beyond passive visualization — it translates natural language spatial queries (*"How do I navigate to the table?"*) into obstacle-free coordinate trajectories formatted as standard **ROS2 Nav2 `FollowWaypoints`** payloads for direct physical hardware execution.

---

## 🔗 Official Links & Press

- **Cerebral Valley Project Gallery:** [Project #27 — GeminiSpace (1st Place Winner)](https://cerebralvalley.ai/e/gemini-3-seoul-hackathon/hackathon/gallery?project=27)
- **Google Korea Official Blog Interview:** [구글 블로그 인터뷰: "단 7시간 만에 혼자 구현하는 AI 공간 솔루션 완성"](https://blog.google/intl/ko-kr/company-news/inside-google/gemini-seoul-hackathon-first/)
- **YouTube Project Showcase & Demo:** [Watch the Hackathon Pitch on YouTube](https://www.youtube.com/watch?v=rZI6C7XsnY4)

---

## What Is This?

Spatial OS is a **Vision-Language-Action (VLA)** indoor spatial intelligence system powered exclusively by **Google Gemini cloud models**.

**How it works:**
1. 📸 Stand in the center of a room and capture **8 directional photos** (N, NE, E, SE, S, SW, W, NW).
2. 🧠 Gemini extracts a structured **semantic topology** (furniture, appliances, pathways, exits).
3. 🎨 Gemini generates a **2D orthographic bird's-eye floor plan** via the Text-Bridge.
4. 📍 Objects are **localized on the map** with interactive bounding boxes.
5. 💬 Ask questions in real time (*"Where is the coffee pot?"*, *"How do I get to the elevator?"*).
6. 🚀 Dispatch trajectories directly to **ROS2 Nav2** robot hardware controllers.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19)                      │
│  ├── 8-Photo Radial Compass Capture                    │
│  ├── 🗺️ MAP — Interactive 2D Map (SVG BBoxes + ROS2)   │
│  ├── 🔗 GRAPH — D3.js Force-Directed Semantic Graph    │
│  ├── 🧊 TWIN — Three.js 3D Voxel Digital Twin          │
│  ├── 🌐 /scholar — Standalone Showcase & Intro Page   │
│  └── 💬 Spatial Query & Hardware Kernel Terminal      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST
                           ▼
┌────────────────────────────────────────────────────────┐
│  Backend (FastAPI + Google GenAI SDK)                  │
│                                                        │
│  POST /api/upload-node  ──► 3-Step VLA Pipeline        │
│    Step 1: Topology Extraction  (gemini-3.7-flash)     │
│    Step 2a: Layout Description  (gemini-3.7-flash)     │
│    Step 2b: Bird's-Eye Floor Plan (gemini-3.1-flash-img)│
│    Step 3: Spatial Localization (gemini-3.7-flash)     │
│                                                        │
│  POST /api/chat         ──► Multimodal Spatial Q&A     │
│  POST /api/query-planner──► Graph Trajectory Planner   │
└──────────────────────────┬─────────────────────────────┘
                           │ ROS2 Nav2 FollowWaypoints
                           ▼
┌────────────────────────────────────────────────────────┐
│  Hardware Layer (ROS2 Robot / Action Server)           │
└────────────────────────────────────────────────────────┘
```

### Gemini Models Used

| Pipeline Step | Model Identifier | Purpose |
|---|---|---|
| Topology Extraction | `gemini-3.7-flash` | Low-latency SLAM reasoning: 8 images $\to$ relational property graph (JSON) |
| Layout Description | `gemini-3.7-flash` | Text-Bridge: material extraction, seam keypoints & 2D layout drafting |
| Bird's-Eye Floor Plan | `gemini-3.1-flash-image` | Synthesizes photorealistic 16:9 orthographic 2D floor plan rendering |
| Object Localization | `gemini-3.7-flash` | Calculates $(y_{\min}, x_{\min}, y_{\max}, x_{\max})$ % bounding boxes on 2D map |
| Spatial Q&A Chat | `gemini-3.7-flash` | Multimodal conversational assistant grounded in spatial property graph |
| Trajectory Planner | `gemini-3.7-flash` | Goal-driven graph traversal $\to$ multi-node path plan |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API Key

### 1. Clone the Repository
```bash
git clone https://github.com/mincasurong/GeminiSeoulHackathon2026.git
cd GeminiSeoulHackathon2026
```

### 2. Configure Gemini API Key
Create a `.env` file in the `backend/` directory:
```bash
echo GOOGLE_API_KEY=your_api_key_here > backend/.env
```
> 🔑 Get your API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Run Backend (Terminal 1)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows PowerShell
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend runs on **http://localhost:8000** (Swagger API Docs at `/docs`).

### 4. Run Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:3000**.  
Intro / Showcase page available at **http://localhost:3000/scholar**.

---

## Project Structure

```
GeminiSeoulHackathon2026/
├── .agents/                    # Agent rules & system design knowledge base
│   ├── AGENTS.md               # Persistent project instructions for AI agents
│   └── skills/                 # Specialized on-demand workflows
│       ├── spatial-os-system-design/
│       ├── vla-pipeline-debugging/
│       ├── frontend-visualization-guide/
│       ├── scholar-showcase-page/
│       └── gcp-cloud-run-deploy/
├── backend/
│   ├── main.py                 # FastAPI endpoints & session state
│   ├── vla_service.py          # 3-step Gemini VLA pipeline & fallback presets
│   ├── model_config.py         # Centralized Gemini model configuration
│   ├── models.py               # Pydantic schemas
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Cloud Run backend container
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main cyber-operator dashboard
│   │   ├── scholar/            # Standalone introduction showcase page
│   │   ├── components/
│   │   │   ├── NodeCaptureComponent.tsx    # 8-photo radial compass upload UI
│   │   │   ├── InteriorMapComponent.tsx    # 2D map + bounding boxes + ROS2 dispatch
│   │   │   ├── SemanticGraph.tsx           # D3.js force-directed graph
│   │   │   ├── DigitalTwin.tsx             # Three.js 3D voxel heightmap twin
│   │   │   ├── CommandBarComponent.tsx     # Spatial chat + system terminal
│   │   │   └── RobotSettingsModal.tsx      # ROS2 endpoint configuration
│   │   └── lib/api.ts          # Centralized API client
│   ├── package.json
│   └── Dockerfile              # Cloud Run frontend container
├── ARCHITECTURE.md             # In-depth architectural documentation
├── README.md
└── manual.md
```

---

## Deploying to Google Cloud Run

Deploy as two independent services on Google Cloud Run:

### 1. Deploy Backend
```bash
cd backend
gcloud run deploy spatial-ai-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_api_key_here"
```

### 2. Deploy Frontend
```bash
cd ../frontend
gcloud run deploy spatial-ai-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_BASE_URL="https://spatial-ai-backend-xxxxx-uc.a.run.app/api"
```

---

## License

MIT License. Built for the Google Seoul Hackathon 2026.
