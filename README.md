# 🗺️ GeminiSpace — Indoor Navigator Powered by Gemini

> **Google Indoor Navigation** — Capture 8 photos from the center of any room, and Gemini builds you a semantic map you can ask questions about.
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/83fcacc2-b051-4788-ba0f-31568c97bab9" />


---

## What Is This?

GeminiSpace is a **Vision-Language-Action (VLA)** system that turns ordinary room photos into an interactive indoor map. Think of it as **Google Maps Navigator, but for indoors**.

**How it works:**
1. 📸 Stand in the center of a room and capture **8 directional photos** (N, NE, E, SE, S, SW, W, NW)
2. 🧠 Gemini analyzes the images and extracts a **semantic topology** (furniture, objects, pathways)
3. 🗺️ Gemini generates a **bird's-eye view floor plan** from the photos
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
> 💡 Get your free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

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
   - ⏳ Step 1: Topology Extraction
   - ⏳ Step 2: Bird's-Eye Map Generation
   - ⏳ Step 3: Object Localization
6. Explore the results:
   - 🗺️ **MAP** — Interactive floor plan with clickable object boxes
   - 🔗 **GRAPH** — D3.js semantic relationship graph
   - 🧊 **TWIN** — 3D voxel digital twin view
7. Use the **Spatial Query Interface** to ask about the environment

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      [ 1. INPUT ]                       │
│  8 Directional Photos (Captured from the room center)   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 [ 2. CLIENT FRONTEND ]                  │
│ Next.js UI: Batch image upload & node initialization    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               [ 3. FASTAPI BACKEND SERVER ]             │
│        Orchestrating the 3-Step Gemini VLA Pipeline     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Step 1: Semantic Topology Extraction              │  │
│  │ Model: Gemini 3 Flash                             │  │
│  │ Task: Analyzes 8 images -> Extracts objects/edges │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           ▼                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Step 2: Bird's-Eye Map Generation                 │  │
│  │ Model: Gemini 3 Flash Image                       │  │
│  │ Task: Synthesizes a 2D floor plan image           │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           ▼                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Step 3: Object Localization                       │  │
│  │ Model: Gemini 3 Flash                             │  │
│  │ Task: Maps physical bounding boxes to the 2D map  │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     [ 4. OUTPUTS ]                      │
│                                                         │
│ 📍 MAP: Interactive floor plan with bounding boxes      │
│ 🔗 GRAPH: D3.js spatial relationship topology graph     │
│ 🧊 TWIN: 3D voxel representation                        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│             [ 5. SPATIAL QUERY INTERFACE ]              │
│ Model: Gemini 3 Flash                                   │
│ Task: Real-time Q&A ("How do I get to the fridge?")     │
└─────────────────────────────────────────────────────────┘
```

## Gemini Models Used

| Pipeline Step | Model | Purpose |
|---|---|---|
| Topology Extraction | `gemini-3-flash-preview` | Analyze 8 images → extract objects, anchors, edges |
| Bird's-Eye Map | `gemini-3.1-flash-image-preview` | Generate a 2D floor plan image |
| Object Localization | `gemini-3-flash-preview` | Find bounding boxes on the generated map |
| Spatial Chat | `gemini-3-flash-preview` | Answer questions about the environment |

> 💡 **Tip**: All model names are in `backend/model_config.py` — edit that single file to switch models without touching any code.

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
├── .gitignore
└── README.md
```

---

## Example Queries

After processing a room, try asking:

- *"Where is the coffee pot?"*
- *"What objects are near the refrigerator?"*
- *"How can I get to the door from here?"*
- *"Describe the layout of this room"*
- *"What furniture is in this space?"*

---

## Team

Built for the **Google Gemini Seoul Hackathon 2026** 🇰🇷

## License

MIT
