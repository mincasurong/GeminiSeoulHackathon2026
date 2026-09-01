---
name: vla-pipeline-debugging
description: >-
  Use when debugging or troubleshooting the 3-step VLA pipeline (Topology
  Extraction, Bird's-Eye Map Generation, Spatial Localization). Covers common
  failure modes like malformed JSON from Gemini, missing bounding boxes,
  perspective hallucinations in generated maps, image encoding issues, and
  fallback logic.
---

# VLA Pipeline Debugging Skill

## Overview

This skill helps diagnose and fix issues in the SPATIAL_OS 3-step VLA pipeline
when Gemini model outputs are incorrect, incomplete, or malformed.

## Common Failure Modes & Fixes

### 1. Malformed JSON from Gemini

**Symptom**: `json.JSONDecodeError` after a Gemini call.

**Root Cause**: Gemini wraps JSON in markdown fences (` ```json ... ``` `).

**Fix**: The `_clean_and_parse_json()` helper in `vla_service.py` handles this.
If you see this error, ensure all new Gemini calls route through this parser:

```python
def _clean_and_parse_json(raw: str):
    # Strip markdown code fences
    cleaned = re.sub(r'```(?:json)?\s*', '', raw).strip()
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    # Fallback regex extraction
    match = re.search(r'(\[.*\]|\{.*\})', cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(cleaned)
```

### 2. Missing Bounding Boxes (Localization Gaps)

**Symptom**: Some objects appear in the topology but have no bounding box on the map.

**Root Cause**: Gemini failed to locate the object on the 2D floor plan.

**Fix**: The `DIRECTION_PRESETS` fallback in `vla_service.py` automatically
assigns default bounding boxes based on the object's `image_indices` (directional
position). Verify this fallback is active:

```python
DIRECTION_PRESETS = {
    0: (5, 35, 25, 65),    # N  (top center)
    1: (5, 65, 25, 95),    # NE (top right)
    2: (35, 75, 65, 95),   # E  (right center)
    3: (75, 65, 95, 95),   # SE (bottom right)
    4: (75, 35, 95, 65),   # S  (bottom center)
    5: (75, 5, 95, 35),    # SW (bottom left)
    6: (35, 5, 65, 25),    # W  (left center)
    7: (5, 5, 25, 35),     # NW (top left)
}
```

### 3. 3D Perspective Artifacts in Floor Plan

**Symptom**: The generated bird's-eye map shows walls at an angle or has
perspective distortion instead of true top-down orthographic view.

**Root Cause**: Raw images were accidentally passed to the image generation model.

**Fix**: Verify the Text-Bridge is intact — Step 2b MUST receive **only text**
(the layout description from Step 2a), never raw images. Check
`generate_birds_eye_view()` in `vla_service.py`.

### 4. Empty or Placeholder Map Image

**Symptom**: Map displays a generic placeholder or broken image.

**Root Cause**: Step 2 image generation failed silently.

**Fix**: Check `vla_service.py` — the fallback substitutes a placeholder URL.
Look at backend logs for the actual Gemini API error. Common causes:
- Image generation quota exceeded
- Model not available in region
- Content safety filter triggered by room photos

### 5. Coordinate System Mismatch

**Symptom**: Bounding boxes appear in wrong positions on the floor plan.

**Key Facts**:
- Backend outputs bounding boxes as **0–100 percentages** (NOT 0–1 floats).
- Frontend (`InteriorMapComponent`) uses these directly as CSS percentages.
- ROS2 dispatch converts 1% = 0.1 meters.
- Coordinate validation clamps to 2.0%–98.0% with minimum size enforcement.

### 6. Chat Context Failures

**Symptom**: Chat returns generic answers without spatial awareness.

**Root Cause**: The node topology wasn't injected into the chat system context.

**Fix**: Ensure `chat_with_environment()` receives the full topology dict, the
map image, and up to 4 source photos as context alongside the user query.

## Debugging Checklist

1. Check backend console for Gemini API errors.
2. Visit `http://localhost:8000/docs` → test endpoints directly via Swagger.
3. Verify `GOOGLE_API_KEY` is valid and has quota.
4. Check `model_config.py` — ensure model names haven't been deprecated.
5. For frontend rendering issues, check browser DevTools Network tab for
   the `/api/upload-node` response payload structure.
