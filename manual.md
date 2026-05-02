# Spatial OS — How to Run Locally

## Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** installed
- A **Google AI Studio API Key** ([get one here](https://aistudio.google.com/apikey))

---

## 1. Set Up Your API Key

Create or edit `backend/.env`:
```
GOOGLE_API_KEY=your_api_key_here
```

---

## 2. Start the Backend (Terminal 1)

Open a terminal and run:

### Windows (PowerShell)
```powershell
cd d:\git\GeminiSeoulHackathon2026
.\backend\venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Mac / Linux
```bash
cd /path/to/GeminiSeoulHackathon2026
source backend/venv/bin/activate
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000
```

> **First time only?** Create the virtual environment and install dependencies first:
> ```bash
> cd backend
> python -m venv venv
> # Activate (see above), then:
> pip install -r requirements.txt
> ```

✅ Backend runs on **http://localhost:8000**  
📄 Swagger docs at **http://localhost:8000/docs**

---

## 3. Start the Frontend (Terminal 2)

Open a **second** terminal and run:

### Windows (PowerShell)
```powershell
cd d:\git\GeminiSeoulHackathon2026\frontend
npm run dev
```

### Mac / Linux
```bash
cd /path/to/GeminiSeoulHackathon2026/frontend
npm run dev
```

> **First time only?** Install dependencies first:
> ```bash
> cd frontend
> npm install
> ```

✅ Frontend runs on **http://localhost:3000**

---

## 4. Open the App

Open your browser and go to:  
### 👉 **http://localhost:3000**

---

## 5. Stopping the Servers

Press `Ctrl+C` in each terminal to stop the respective server.

---

## Quick Reference

| Component | Command | URL |
|-----------|---------|-----|
| Backend   | `uvicorn main:app --host 127.0.0.1 --port 8000` | http://localhost:8000 |
| Frontend  | `npm run dev` | http://localhost:3000 |
| API Docs  | (auto) | http://localhost:8000/docs |
