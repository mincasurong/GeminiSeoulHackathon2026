# Spatial OS — Indoor Navigator Powered by Gemini

> **Google Indoor Navigation** — Capture 8 photos from the center of any room, and Gemini builds you a semantic map you can ask questions about.

---

## What Is This?

Spatial OS is a **Vision-Language-Action (VLA)** system that turns ordinary room photos into an interactive indoor map powered exclusively by **Google Gemini cloud models**.

**How it works:**
1. 📸 Stand in the center of a room and capture **8 directional photos** (N, NE, E, SE, S, SW, W, NW)
2. 🧠 Gemini analyzes the images and extracts a **semantic topology** (furniture, objects, pathways)
3. 🎨 Gemini generates a **bird's-eye view floor plan** from the photos
4. 📍 Objects are **localized on the map** with interactive bounding boxes
5. 💬 Ask questions like *"Where is the coffee pot?"* or *"How do I get to the fridge from here?"*

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API Key

### 1. Clone the Repo
```bash
git clone https://github.com/mincasurong/GeminiSeoulHackathon2026.git
cd GeminiSeoulHackathon2026
```

### 2. Set Up Your Gemini API Key
Create a `.env` file in the `backend/` folder:
```bash
echo GOOGLE_API_KEY=your_api_key_here > backend/.env
```
> 🔑 Get your API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Start the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs on `http://localhost:8000`

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

### 5. Use the App
1. Open `http://localhost:3000`
2. Enter a **Node Name** (e.g., `living_room`)
3. Upload **8 photos** (batch or individually) taken from the center of the room
4. Click **"Synthesize Environment"**
5. Wait for the 3-step pipeline:
   - Step 1: Topology Extraction
   - Step 2: Bird's-Eye Map Generation
   - Step 3: Object Localization
6. Explore the results:
   - 🗺️ **MAP** — Interactive floor plan with clickable object boxes
   - 🔗 **GRAPH** — D3.js semantic relationship graph
   - 🧊 **TWIN** — 3D voxel digital twin view
7. Use the **Spatial Query Interface** to ask about the environment

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  Frontend (Next.js)     http://localhost:3000          │
│  ├── Upload 8 Photos                                   │
│  ├── MAP / GRAPH / TWIN Visualizers                    │
│  └── Spatial Query Interface                           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Backend (FastAPI)      http://localhost:8000          │
│                                                        │
│  POST /api/upload-node  ─► 3-Step Pipeline            │
│    Step 1: Topology     (gemini-3.6-flash)            │
│    Step 2: Map Gen      (gemini-3.1-flash-image)       │
│    Step 3: Localization (gemini-3.6-flash)            │
│                                                        │
│  POST /api/chat  ─► Spatial Q&A (gemini-3.6-flash)     │
└────────────────────────────────────────────────────────┘
```

## Gemini Models Used

| Pipeline Step | Model | Purpose |
|---|---|---|
| Topology Extraction | `gemini-3.6-flash` | Analyze 8 images → extract objects, anchors, edges |
| Bird's-Eye Map | `gemini-3.1-flash-image` | Generate a 2D floor plan image |
| Object Localization | `gemini-3.6-flash` | Find bounding boxes on the generated map |
| Spatial Chat | `gemini-3.6-flash` | Answer questions about the environment |

---

## Project Structure

```
GeminiSeoulHackathon2026/
├── backend/
│   ├── main.py              # FastAPI server + endpoints
│   ├── vla_service.py        # 3-step Gemini pipeline
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # GOOGLE_API_KEY (not committed)
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Dashboard with MAP/GRAPH/TWIN tabs
│   │   ├── components/
│   │   │   ├── NodeCaptureComponent.tsx   # 8-image upload
│   │   │   ├── InteriorMapComponent.tsx   # Interactive floor plan
│   │   │   ├── SemanticGraph.tsx          # D3 relationship graph
│   │   │   ├── DigitalTwin.tsx            # 3D voxel view
│   │   │   └── CommandBarComponent.tsx    # Spatial chat
│   │   └── lib/api.ts        # API client
│   └── package.json
└── README.md
```

---

## Deploy to Google Cloud Run

We deploy this system as two separate services on Cloud Run.

### 1. Deploy the Backend
Deploy the FastAPI backend first to obtain its public URL:

```bash
cd backend

# Deploy the backend to Cloud Run
gcloud run deploy spatial-ai-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_api_key_here"
```

*Note the deployed URL provided in the output (e.g., `https://spatial-ai-backend-xxxxx-uc.a.run.app`).*

### 2. Deploy the Frontend
Now deploy the Next.js frontend, pointing it to the backend's URL. A `Dockerfile` is included in the `frontend` directory.

```bash
cd ../frontend

# Deploy the frontend to Cloud Run
# Replace [BACKEND_URL] with the URL you received in step 1!
gcloud run deploy spatial-ai-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_BASE_URL="[BACKEND_URL]"
```

*After deployment completes, open the frontend URL provided in the output to access your application.*

### Artifact Registry Permission Fix
If your deployment fails with permission errors during the build step, you may need to grant Artifact Registry writer roles:
```bash
# Grant Artifact Registry writer role to Cloud Build and Compute Engine service accounts
gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding [PROJECT_ID] \
  --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

---

## License

MIT

