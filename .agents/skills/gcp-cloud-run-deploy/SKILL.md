---
name: gcp-cloud-run-deploy
description: >-
  Builds a local web application, containerizes it, and deploys it to Google Cloud Run from source. Handles common Artifact Registry permission issues during deployment.
---

# Google Cloud Run Deployment Skill

## Overview
This skill guides the agent in building a web application locally to ensure it is error-free, and then deploying it directly to Google Cloud Run using `gcloud run deploy --source .`. It also includes troubleshooting steps for common IAM permission errors related to Artifact Registry.

## Dependencies
None.

## Quick Start
To use this skill, ask the agent: "Deploy this application to Cloud Run."

## Workflow

### 1. Build and Verify Locally
- Run `npm run build` (or the equivalent build command for the project).
- Fix any build or syntax errors before attempting to deploy. Cloud Build will fail if the local build fails.

### 2. Check for Dockerfile (Optional)
- Check if a `Dockerfile` exists in the repository. If it does not, Cloud Run will attempt to use Google Cloud Buildpacks automatically. Ensure the user is aware of this.

### 3. Deploy to Cloud Run
- Run the deployment command:
  ```bash
  gcloud run deploy [SERVICE_NAME] --source . --region [REGION] --allow-unauthenticated
  ```
- If the user hasn't specified a service name or region, prompt them or infer from the project context.

### 4. Handle Artifact Registry Permissions (Troubleshooting)
- If the deployment fails with a permissions error (e.g., "denied: Permission \"artifactregistry.repositories.uploadArtifacts\" denied on resource"), it is likely because the service accounts lack the `roles/artifactregistry.writer` role.
- Run the following commands to fix it (replace `PROJECT_ID` and `PROJECT_NUMBER` accordingly):
  ```bash
  gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

  gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"
  ```
- After granting permissions, retry the deployment.

### 5. Finalize
- Output the deployed Cloud Run Service URL to the user.
- Add a summary of the deployment steps and any fixes applied to a `README.md` or similar documentation file if requested by the user.

## Common Mistakes
- **Deploying broken code**: Failing to run a local build before deploying, causing the remote build to fail and wasting time.
- **Ignoring IAM errors**: Thinking the build failed due to code, when it was actually a lack of `artifactregistry.writer` permissions for the Cloud Build or Compute Engine service accounts.
