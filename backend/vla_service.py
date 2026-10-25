import os
import json
import base64
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

from model_config import (
    MODEL_FLASH,
    MODEL_TOPOLOGY,
    MODEL_LAYOUT,
    MODEL_IMAGE,
    MODEL_LOCALIZATION,
    MODEL_CHAT,
    MODEL_PLANNER,
    resolve_engine_model,
)
from prompts import (
    SYSTEM_INSTRUCTION_TOPOLOGY,
    PROMPT_EXTRACT_TOPOLOGY,
    build_layout_description_prompt,
    build_birds_eye_prompt,
    build_localization_prompt,
    build_chat_prompt,
    build_planner_prompt,
)

load_dotenv()

logger = logging.getLogger("spatial_os_backend.vla_service")

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("Neither GOOGLE_API_KEY nor GEMINI_API_KEY found in environment.")
    client = None
else:
    client = genai.Client(api_key=api_key)


def _clean_and_parse_json(text: str) -> Dict[str, Any]:
    if not text:
        return {}
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"(\[.*\]|\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        return {}


DIRECTION_PRESETS = {
    0: (10, 35, 32, 65),
    1: (10, 65, 32, 90),
    2: (35, 65, 65, 90),
    3: (65, 65, 90, 90),
    4: (65, 35, 90, 65),
    5: (65, 10, 90, 35),
    6: (35, 10, 65, 35),
    7: (10, 10, 32, 35),
}


class VLAService:

    @staticmethod
    def _generate_content(
        *,
        model: str,
        contents: Any,
        config: Optional[types.GenerateContentConfig] = None,
        fallback_model: Optional[str] = None,
    ) -> Any:
        if not client:
            raise ValueError("GenAI client not initialized. Ensure GOOGLE_API_KEY is configured.")
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except Exception as primary_err:
            if fallback_model and fallback_model != model:
                logger.warning(
                    f"Primary Gemini model '{model}' failed ({primary_err}); "
                    f"falling back to '{fallback_model}'."
                )
                return client.models.generate_content(
                    model=fallback_model,
                    contents=contents,
                    config=config,
                )
            raise

    @staticmethod
    def extract_topology(
        gemini_images: List[Dict[str, str]],
        default_node_name: str,
        engine: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        if not client:
            raise ValueError("GenAI client not initialized. Ensure GOOGLE_API_KEY is configured.")

        active_model = resolve_engine_model(engine, MODEL_TOPOLOGY)
        parts: List[Any] = [
            types.Part.from_bytes(data=base64.b64decode(img["data"]), mime_type=img["mime_type"])
            for img in gemini_images
        ]
        parts.append(PROMPT_EXTRACT_TOPOLOGY)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION_TOPOLOGY,
            response_mime_type="application/json",
            temperature=0.2,
            thinking_config=types.ThinkingConfig(thinking_budget=1024),
        )

        logger.info(f"Extracting SLAM keypoints & relational topology using {active_model}...")
        response = VLAService._generate_content(
            model=active_model,
            contents=parts,
            config=config,
            fallback_model=MODEL_FLASH,
        )

        vla_result = _clean_and_parse_json(response.text)
        if isinstance(vla_result, list):
            vla_result = vla_result[0] if len(vla_result) > 0 else {}
        if not isinstance(vla_result, dict):
            vla_result = {}

        actual_name = vla_result.get("node_name") or default_node_name
        vla_result["node_name"] = str(actual_name)
        try:
            from models import SpatialNode
            vla_result = SpatialNode(**vla_result).model_dump()
            actual_name = vla_result["node_name"]
        except Exception as norm_err:
            logger.warning(f"Topology normalization warning: {norm_err}")

        return actual_name, vla_result

    @staticmethod
    def extract_layout_description(
        gemini_images: List[Dict[str, str]],
        topology: Dict[str, Any],
    ) -> str:
        if not client:
            raise ValueError("GenAI client not initialized.")

        parts: List[Any] = [
            types.Part.from_bytes(data=base64.b64decode(img["data"]), mime_type=img["mime_type"])
            for img in gemini_images
        ]
        parts.append(build_layout_description_prompt(topology))

        config = types.GenerateContentConfig(
            response_mime_type="text/plain",
            temperature=0.2,
            thinking_config=types.ThinkingConfig(thinking_budget=1024),
        )

        logger.info(f"Generating realistic layout description using {MODEL_LAYOUT}...")
        response = VLAService._generate_content(
            model=MODEL_LAYOUT,
            contents=parts,
            config=config,
        )
        return response.text or ""

    @staticmethod
    def generate_birds_eye_view(
        gemini_images: List[Dict[str, str]],
        topology: Dict[str, Any],
    ) -> str:
        if not client:
            raise ValueError("GenAI client not initialized.")

        layout_text = VLAService.extract_layout_description(gemini_images, topology)
        prompt = build_birds_eye_prompt(layout_text)

        logger.info(f"Synthesizing photorealistic 2D floor plan using {MODEL_IMAGE}...")
        response = VLAService._generate_content(
            model=MODEL_IMAGE,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    img_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                    mime = part.inline_data.mime_type or "image/png"
                    return f"data:{mime};base64,{img_b64}"

        raise ValueError("No image was synthesized by the image generation model.")

    @staticmethod
    def locate_objects_in_map(
        map_image_data_url: str,
        topology: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        if not client:
            raise ValueError("GenAI client not initialized.")

        all_items = []
        for a in topology.get("static_anchors", []):
            all_items.append({
                "id": a.get("anchor_id", ""),
                "type": a.get("type", ""),
                "direction": a.get("cardinal_direction", ""),
                "description": a.get("description", ""),
                "indices": a.get("image_indices", []),
            })
        for d in topology.get("dynamic_objects", []):
            all_items.append({
                "id": d.get("object_id", ""),
                "type": d.get("type", ""),
                "direction": d.get("cardinal_direction", ""),
                "description": d.get("description", ""),
                "indices": d.get("image_indices", []),
            })

        if not all_items:
            return []

        objects_list = "\n".join(
            f"- {item['id']} ({item['type']}, sector={item['direction'] or 'center'}): {item['description']}"
            for item in all_items
            if item["id"]
        )
        prompt = build_localization_prompt(objects_list)
        locations_result: List[Dict[str, Any]] = []

        try:
            header, b64data = map_image_data_url.split(",", 1)
            raw_bytes = base64.b64decode(b64data)
            mime_type = header.split(":")[1].split(";")[0] if ":" in header else "image/png"

            parts = [
                types.Part.from_bytes(data=raw_bytes, mime_type=mime_type),
                prompt,
            ]

            response = VLAService._generate_content(
                model=MODEL_LOCALIZATION,
                contents=parts,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    thinking_config=types.ThinkingConfig(thinking_budget=512),
                ),
            )

            parsed = _clean_and_parse_json(response.text)
            if isinstance(parsed, list):
                locations_result = parsed
            elif isinstance(parsed, dict) and "locations" in parsed:
                locations_result = parsed["locations"]
        except Exception as e:
            logger.warning(f"Visual localization model call failed: {e}. Applying directional fallbacks.")

        located_ids = set()
        sanitized_locations = []

        for loc in locations_result:
            oid = loc.get("object_id")
            if not oid:
                continue
            try:
                raw_ymin = float(loc.get("ymin", 0))
                raw_xmin = float(loc.get("xmin", 0))
                raw_ymax = float(loc.get("ymax", 0))
                raw_xmax = float(loc.get("xmax", 0))

                max_coord = max(abs(raw_ymin), abs(raw_xmin), abs(raw_ymax), abs(raw_xmax))
                if max_coord > 100.0:
                    raw_ymin /= 10.0
                    raw_xmin /= 10.0
                    raw_ymax /= 10.0
                    raw_xmax /= 10.0
                elif 0.0 < max_coord <= 1.0:
                    raw_ymin *= 100.0
                    raw_xmin *= 100.0
                    raw_ymax *= 100.0
                    raw_xmax *= 100.0

                ymin = max(1.0, min(94.0, min(raw_ymin, raw_ymax)))
                xmin = max(1.0, min(94.0, min(raw_xmin, raw_xmax)))
                ymax = max(ymin + 3.0, min(99.0, max(raw_ymin, raw_ymax)))
                xmax = max(xmin + 3.0, min(99.0, max(raw_xmin, raw_xmax)))

                sanitized_locations.append({
                    "object_id": oid,
                    "ymin": round(ymin, 1),
                    "xmin": round(xmin, 1),
                    "ymax": round(ymax, 1),
                    "xmax": round(xmax, 1),
                })
                located_ids.add(oid)
            except Exception:
                pass

        for item in all_items:
            oid = item["id"]
            if oid and oid not in located_ids:
                raw_bbox = None
                for a in topology.get("static_anchors", []):
                    if a.get("anchor_id") == oid and isinstance(a.get("bbox"), list) and len(a["bbox"]) == 4:
                        raw_bbox = a["bbox"]
                for d in topology.get("dynamic_objects", []):
                    if d.get("object_id") == oid and isinstance(d.get("bbox"), list) and len(d["bbox"]) == 4:
                        raw_bbox = d["bbox"]
                if raw_bbox:
                    try:
                        ymin = max(2.0, min(90.0, float(raw_bbox[0])))
                        xmin = max(2.0, min(90.0, float(raw_bbox[1])))
                        ymax = max(ymin + 5.0, min(98.0, float(raw_bbox[2])))
                        xmax = max(xmin + 5.0, min(98.0, float(raw_bbox[3])))
                        sanitized_locations.append({
                            "object_id": oid,
                            "ymin": round(ymin, 1),
                            "xmin": round(xmin, 1),
                            "ymax": round(ymax, 1),
                            "xmax": round(xmax, 1),
                        })
                        located_ids.add(oid)
                        continue
                    except Exception:
                        pass

                indices = item.get("indices", [])
                primary_idx = indices[0] if indices else 0
                preset = DIRECTION_PRESETS.get(primary_idx % 8, (40, 40, 60, 60))

                sanitized_locations.append({
                    "object_id": oid,
                    "ymin": float(preset[0]),
                    "xmin": float(preset[1]),
                    "ymax": float(preset[2]),
                    "xmax": float(preset[3]),
                })
                located_ids.add(oid)

        return sanitized_locations

    @staticmethod
    def chat_with_environment(
        query: str,
        topology: Dict[str, Any],
        history: List[Dict[str, str]],
        map_image_b64: Optional[str] = None,
        source_images: Optional[List[Dict[str, str]]] = None,
        engine: Optional[str] = None,
    ) -> str:
        if not client:
            raise ValueError("GenAI client not initialized.")

        active_model = resolve_engine_model(engine, MODEL_CHAT)
        parts: List[Any] = []

        if map_image_b64 and (map_image_b64.startswith("data:image/png") or map_image_b64.startswith("data:image/jpeg")):
            try:
                header, b64data = map_image_b64.split(",", 1)
                raw_bytes = base64.b64decode(b64data)
                mime = header.split(":")[1].split(";")[0] if ":" in header else "image/png"
                parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime))
            except Exception:
                pass

        if source_images:
            for img in source_images[:4]:
                try:
                    raw_bytes = base64.b64decode(img["data"])
                    parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=img["mime_type"]))
                except Exception:
                    pass

        conv_text = ""
        for turn in history[-6:]:
            role = turn.get("role", "user")
            text = turn.get("text", turn.get("content", ""))
            conv_text += f"{role.capitalize()}: {text}\n"

        parts.append(build_chat_prompt(topology, conv_text, query))

        response = VLAService._generate_content(
            model=active_model,
            contents=parts,
            config=types.GenerateContentConfig(
                temperature=0.3,
                thinking_config=types.ThinkingConfig(thinking_budget=512),
            ),
            fallback_model=MODEL_FLASH,
        )
        return response.text or "I could not process the spatial query."

    @staticmethod
    def plan_trajectory(
        nodes: List[str],
        edges: List[Tuple[str, str]],
        context_data: Dict[str, Any],
        current_node: str,
        user_query: str,
        engine: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not client:
            raise ValueError("GenAI client not initialized.")

        active_model = resolve_engine_model(engine, MODEL_PLANNER)
        prompt = build_planner_prompt(nodes, edges, context_data, current_node, user_query)

        response = VLAService._generate_content(
            model=active_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                thinking_config=types.ThinkingConfig(thinking_budget=512),
            ),
            fallback_model=MODEL_FLASH,
        )
        return _clean_and_parse_json(response.text)
