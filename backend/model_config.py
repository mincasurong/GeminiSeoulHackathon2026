# ─── Gemini Model Configuration (v4 Architecture) ─────────────────
# Supports dual-engine routing:
# - Gemini 4 Argon ("gemini-4-argon") for deep SLAM topology, reasoning & planning
# - Gemini 3.8 Flash ("gemini-3.8-flash") for low-latency drafting, blueprint synthesis & grounding

MODEL_PRO = "gemini-4-argon"
MODEL_FLASH = "gemini-3.8-flash"

# Step 1: Topology Extraction (360° SLAM keypoints & relational property graph)
MODEL_TOPOLOGY = MODEL_PRO

# Step 2a: Layout Description (Text-Bridge material, texture & geometric drafting)
MODEL_LAYOUT = MODEL_FLASH

# Step 2b: Bird's-Eye Map Generation (Photorealistic 2D orthographic floor plan synthesis)
MODEL_IMAGE = "gemini-3.1-flash-image"

# Step 3: Object Localization (bounding box coordinate detection)
MODEL_LOCALIZATION = MODEL_FLASH

# Spatial Chat / Multimodal Environmental Q&A
MODEL_CHAT = MODEL_PRO

# Trajectory Planner (goal-driven graph traversal & navigation)
MODEL_PLANNER = MODEL_PRO


def resolve_engine_model(engine: str | None, default_model: str) -> str:
    """Resolve runtime engine selection ('gemini-4-argon', 'gemini-3.8-flash', or default 'gemini')."""
    if not engine or engine == "gemini":
        return default_model
    normalized = engine.strip().lower()
    if normalized in ("gemini-4-argon", "argon", "pro"):
        return MODEL_PRO
    if normalized in ("gemini-3.8-flash", "flash"):
        return MODEL_FLASH
    return default_model
