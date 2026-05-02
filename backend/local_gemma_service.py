import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()

import ollama
from ollama import ResponseError

# ── Configuration ──────────────────────────────────────────────────────────────
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")

import httpx

# Point the Ollama client at the right host with a generous timeout
# (gemma4:e4b processing 8 panoramic images can take several minutes)
_client = ollama.Client(
    host=OLLAMA_HOST,
    timeout=httpx.Timeout(timeout=600.0)  # 10 minute timeout
)

SYSTEM_INSTRUCTION = (
    "You are an advanced Spatial AI and Visual-Language VLA subsystem. "
    "Your task is to process images representing a 360-degree view of a single "
    'localized environment (a "Node") and extract a structured topological '
    "understanding of this space."
)

# ── Startup health-check ────────────────────────────────────────────────────────
def _check_local_ready():
    """Confirm Ollama is reachable and the model is available; raise otherwise."""
    try:
        models = [m.model for m in _client.list().models]
    except Exception as exc:
        raise RuntimeError(
            f"[Gemma-branch] Cannot reach Ollama at {OLLAMA_HOST}.\n"
            "Make sure Ollama is running:  ollama serve\n"
            f"Original error: {exc}"
        )

    # Normalize: Ollama sometimes stores tags like "gemma4:e4b" or "gemma4:latest"
    if not any(OLLAMA_MODEL in m for m in models):
        raise RuntimeError(
            f"[Gemma-branch] Model '{OLLAMA_MODEL}' not found in Ollama.\n"
            f"Pull it with:  ollama pull {OLLAMA_MODEL}\n"
            f"Available models: {models}"
        )

    print(f"[LocalGemmaService] Ollama OK - using model '{OLLAMA_MODEL}' at {OLLAMA_HOST}")

_check_local_ready()


# ── Helpers ────────────────────────────────────────────────────────────────────
def _images_to_bytes(gemini_images: list) -> list[bytes]:
    """Convert the backend's base64 image dicts to raw bytes for Ollama."""
    return [base64.b64decode(img["data"]) for img in gemini_images]


# ── Service ────────────────────────────────────────────────────────────────────
class LocalGemmaService:

    # ── Step 1: Topology Extraction ───────────────────────────────────────────
    @staticmethod
    def extract_topology(gemini_images: list, default_node_name: str):
        import time
        prompt = (
            f"{SYSTEM_INSTRUCTION}\n\n"
            "Analyze the provided images and output a strictly formatted JSON object.\n"
            "The images are ordered sequentially from index 0 to N-1.\n\n"
            "Extraction Rules:\n"
            '1. "node_name": Assign a logical, descriptive name based on visual context.\n'
            '2. "static_anchors": Large immovable features. Each item: anchor_id, type, description, image_indices.\n'
            '3. "dynamic_objects": Movable objects. Each item: object_id, type, description, image_indices.\n'
            '4. "navigable_edges": Clear pathways out of this area. Each item: edge_id, description, visual_cue.\n\n'
            "Return STRICT JSON with keys: node_name, static_anchors, dynamic_objects, navigable_edges."
        )

        print(f"  [Ollama] Sending {len(gemini_images)} images to {OLLAMA_MODEL} for topology extraction...")
        t0 = time.time()

        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": _images_to_bytes(gemini_images)
            }],
            format="json",
            options={"temperature": 0.2},
            keep_alive="10m"  # Keep model loaded in VRAM for 10 min between requests
        )

        elapsed = time.time() - t0
        print(f"  [Ollama] Topology response received in {elapsed:.1f}s")

        try:
            vla_result = json.loads(response.message.content)
        except (json.JSONDecodeError, AttributeError):
            print("[LocalGemmaService] WARNING: Failed to decode topology JSON — using empty result.")
            vla_result = {}

        if isinstance(vla_result, list):
            vla_result = vla_result[0] if vla_result else {}

        actual_name = (
            vla_result.get("node_name", default_node_name)
            if isinstance(vla_result, dict)
            else default_node_name
        )
        return actual_name, vla_result

    # ── Step 2a: Layout Description (Text Bridge) ─────────────────────────────
    @staticmethod
    def extract_layout_description(gemini_images: list, topology: dict) -> str:
        prompt = (
            "You are an expert architectural draftsperson. Review these images taken from "
            "the center of a room looking in 8 directions (N, NE, E, SE, S, SW, W, NW), "
            "and the provided spatial data.\n\n"
            "Write a detailed, strictly textual 2D floor-plan description. "
            "Describe the exact shape of the room and the relative positions "
            "(North/South/East/West/Center) of all static anchors and dynamic objects. "
            "Do NOT describe colors or lighting — focus purely on 2D geometry.\n\n"
            f"Spatial data:\n{json.dumps(topology, indent=2)}"
        )

        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": _images_to_bytes(gemini_images)
            }],
            options={"temperature": 0.2}
        )
        return response.message.content or ""

    # ── Step 2b: Bird's-Eye Map Generation ────────────────────────────────────
    @staticmethod
    def generate_birds_eye_view(gemini_images: list, topology: dict) -> str:
        """Step 2a runs on local Gemma; Step 2b calls Gemini image-gen (Gemma cannot generate pixels)."""
        print("  [Step 2a] Extracting layout description via local Gemma...")
        layout_text = LocalGemmaService.extract_layout_description(gemini_images, topology)
        print(f"  [Step 2a] Layout description: {len(layout_text)} chars")

        print("  [Step 2b] Generating bird's-eye map via Gemini image model...")
        from google import genai
        from google.genai import types
        from model_config import MODEL_IMAGE

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not set — needed for image generation (Step 2b).")

        client = genai.Client(api_key=api_key)
        image_prompt = (
            "An orthographic, 2D top-down architectural floor plan. "
            "Perspective is strictly 90 degrees straight down. "
            "Flat shading, flat geometric shapes, no 3D walls, no vanishing points, minimalist blueprint style. "
            "Do not include any text, labels, words, or numbers.\n\n"
            f"Layout details: {layout_text}"
        )

        resp = client.models.generate_content(
            model=MODEL_IMAGE,
            contents=image_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(aspect_ratio="16:9")
            )
        )
        if resp.candidates:
            for part in resp.candidates[0].content.parts:
                if part.inline_data:
                    img_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                    mime = part.inline_data.mime_type or "image/png"
                    return f"data:{mime};base64,{img_b64}"

        raise ValueError("Gemini image model returned no image.")

    # ── Step 3: Spatial Localization ──────────────────────────────────────────
    @staticmethod
    def locate_objects_in_map(map_image_data_url: str, topology: dict) -> list:
        objects_to_locate = []
        for a in topology.get("static_anchors", []):
            objects_to_locate.append({"id": a.get("anchor_id", ""), "type": a.get("type", "")})
        for d in topology.get("dynamic_objects", []):
            objects_to_locate.append({"id": d.get("object_id", ""), "type": d.get("type", "")})

        if not objects_to_locate:
            return []

        objects_list = "\n".join(f"- {o['id']} ({o['type']})" for o in objects_to_locate)
        prompt = (
            "Analyze this floor plan image. Locate the following objects and provide their bounding boxes.\n"
            f"Objects to locate:\n{objects_list}\n\n"
            "Return a JSON array. Each item must have: "
            "object_id (string), ymin (number 0-100), xmin (number 0-100), "
            "ymax (number 0-100), xmax (number 0-100). "
            "Ensure ymin < ymax and xmin < xmax."
        )

        # Decode the data URL back to raw bytes for Ollama
        header, b64data = map_image_data_url.split(",", 1)
        raw_bytes = base64.b64decode(b64data)

        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": [raw_bytes]
            }],
            format="json",
            options={"temperature": 0.1}
        )

        try:
            locations = json.loads(response.message.content)
            if isinstance(locations, dict):
                locations = [locations]
            return locations
        except (json.JSONDecodeError, AttributeError):
            return []

    # ── Spatial Chat ──────────────────────────────────────────────────────────
    @staticmethod
    def chat_with_environment(
        query: str,
        topology: dict,
        history: list,
        map_image_b64: str = None,
        source_images: list = None
    ) -> str:
        system_content = (
            "You are an AI assistant embedded in a spatial mapping system.\n"
            "You have access to the following topological data about the current environment:\n"
            f"{json.dumps(topology, indent=2)}\n\n"
            "You are also provided with a bird's-eye view floor plan and original source photographs.\n"
            "Answer questions about this environment using BOTH the topological data AND the visual images.\n"
            "Be concise, helpful, and spatially precise. Reference anchors and edges when describing locations."
        )

        messages = [{"role": "system", "content": system_content}]

        # Replay conversation history (text only)
        for h in history:
            messages.append({"role": h["role"], "content": h["text"]})

        # Build the multimodal user message
        image_bytes = []
        if map_image_b64 and map_image_b64.startswith("data:"):
            try:
                _, b64data = map_image_b64.split(",", 1)
                image_bytes.append(base64.b64decode(b64data))
            except Exception:
                pass

        if source_images:
            for img in source_images[:4]:  # cap at 4 to stay within context
                try:
                    image_bytes.append(base64.b64decode(img["data"]))
                except Exception:
                    pass

        user_message = {"role": "user", "content": query}
        if image_bytes:
            user_message["images"] = image_bytes
        messages.append(user_message)

        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            options={"temperature": 0.7}
        )
        return response.message.content or "No response."

    # ── Trajectory Planner ────────────────────────────────────────────────────
    @staticmethod
    def plan_trajectory(
        nodes_list: list,
        edges_list: list,
        context_data: dict,
        current_node: str,
        user_query: str
    ) -> dict:
        prompt = (
            f"Current Map Topology: {nodes_list}\n"
            f"Edges: {edges_list}\n"
            f"Room Contents: {context_data}\n\n"
            f"Robot is at: {current_node}\n"
            f'User Command: "{user_query}"\n\n'
            'Plan a path. Return STRICT JSON: {{ "plan": ["node_1", "target"], "message": "reason" }}'
        )

        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",
            options={"temperature": 0.1}
        )

        try:
            return json.loads(response.message.content)
        except (json.JSONDecodeError, AttributeError):
            return {"plan": [], "message": "Failed to generate plan."}
