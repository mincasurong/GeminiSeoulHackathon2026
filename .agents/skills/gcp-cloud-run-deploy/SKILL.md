---
name: gcp-cloud-run-deploy
description: >-
  Builds, containerizes, and deploys the SPATIAL_OS multi-service stack (FastAPI backend +
  Next.js frontend) to Google Cloud Run from source using a single unified container. Handles environment configuration
  and Artifact Registry IAM troubleshooting.
---

# 🚀 Google Cloud Run Unified Deployment Skill

This skill guides the end-to-end containerization and deployment of the **GeminiSpace (SPATIAL_OS)** stack to **Google Cloud Run**.

Based on lessons learned, we now use a **Monolithic Dockerfile** approach:
1. **Stage 1 (Node.js)**: Compiles the Next.js frontend into static files (`out/`).
2. **Stage 2 (Python)**: Installs the FastAPI backend and copies the static frontend files. FastAPI then serves both the API routes (`/api/*`) and the static frontend (`/*`) from a single container on a single port.

This solves CORS issues and prevents `NEXT_PUBLIC_API_BASE_URL` build-time injection headaches.

---

## 1. Prerequisites & Pre-Flight Checks

Before initiating deployment:

1. **Verify Local Builds**:
   - Run `npm run build` inside `frontend/` to ensure zero TypeScript, JSX, or Tailwind compilation errors.
2. **Ensure Active GCP Project**:
   ```bash
   gcloud config get-value project
   ```

---

## 2. Step-by-Step Deployment Workflow

Deploy the entire stack as a single Cloud Run service from the root of the repository.

```bash
# Execute from the repository root
gcloud run deploy spatial-ai-os \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```

*From the output, capture the Service URL (e.g. `https://spatial-ai-os-72491823-uc.a.run.app`). Both frontend and backend are now live at this URL!*

---

## 3. Custom Domain Mapping (Optional)

If mapping custom domains (e.g. `spatial.example.com`):

```bash
gcloud beta run domain-mappings create \
  --service spatial-ai-os \
  --domain spatial.example.com \
  --region us-central1
```

*Remind the user to add the DNS records (A/AAAA/CNAME) provided by Google Cloud Console.*

---

## 4. Troubleshooting & IAM Remediation

### Artifact Registry Permission Error
**Error**: `denied: Permission "artifactregistry.repositories.uploadArtifacts" denied on resource...`

**Fix**: Grant Artifact Registry writer roles to Cloud Build and Compute Engine default service accounts:

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant to Cloud Build service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant to Compute Engine default service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```
