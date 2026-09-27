# ==============================================================================
# SPATIAL_OS — Production Dockerfile for Google Cloud Run
# ==============================================================================
# Architecture:
#   Stage 1 (builder):  Node.js 20 builds the Next.js frontend (static export) -> /app/out
#   Stage 2 (runner):   Python 3.11 installs backend deps
#                       and copies /app/out from Stage 1.
#   Single container on port 8080 serves:
#     - FastAPI backend  at /api/*
#     - Next.js static at /* (via StaticFiles)
# ==============================================================================

# ── Stage 1: Frontend Build ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
# We serve frontend and backend from the same host in Cloud Run, 
# so API base URL can just be a relative path.
ENV NEXT_PUBLIC_API_BASE_URL="/api"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Output: /app/out/

# ── Stage 2: Python Backend + Serve Frontend ───────────────────────────────────
FROM python:3.11-slim AS runner

ENV PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/out ./out/

# Security: run as non-root
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
