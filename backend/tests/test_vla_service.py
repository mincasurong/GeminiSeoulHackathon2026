import pytest
import vla_service
from vla_service import _clean_and_parse_json, DIRECTION_PRESETS, VLAService


def test_clean_and_parse_json_with_codeblock():
    raw_markdown = """```json
{
  "node_name": "conference_room",
  "static_anchors": [],
  "dynamic_objects": [],
  "navigable_edges": []
}
```"""
    result = _clean_and_parse_json(raw_markdown)
    assert isinstance(result, dict)
    assert result.get("node_name") == "conference_room"


def test_clean_and_parse_json_with_preamble():
    raw_text = """Here is the structured spatial topology:
{
  "node_name": "laboratory",
  "static_anchors": [],
  "dynamic_objects": [],
  "navigable_edges": []
}
Hope this helps!"""
    result = _clean_and_parse_json(raw_text)
    assert isinstance(result, dict)
    assert result.get("node_name") == "laboratory"


def test_clean_and_parse_json_empty():
    assert _clean_and_parse_json("") == {}
    assert _clean_and_parse_json("invalid text with no json") == {}


def test_direction_presets_coverage():
    # Verify all 8 directions (0: N to 7: NW) have valid bounding boxes
    for idx in range(8):
        assert idx in DIRECTION_PRESETS
        ymin, xmin, ymax, xmax = DIRECTION_PRESETS[idx]
        assert 0 <= ymin < ymax <= 100
        assert 0 <= xmin < xmax <= 100


def test_generate_content_dual_engine_fallback(monkeypatch):
    calls = []

    class DummyModels:
        def generate_content(self, *, model, contents, config=None):
            calls.append(model)
            if model == "gemini-4-argon":
                raise RuntimeError("404 Model gemini-4-argon not found in region")
            return {"model": model, "ok": True}

    class DummyClient:
        models = DummyModels()

    monkeypatch.setattr(vla_service, "client", DummyClient())
    resp = VLAService._generate_content(
        model="gemini-4-argon",
        contents=["test"],
        fallback_model="gemini-3.8-flash",
    )
    assert calls == ["gemini-4-argon", "gemini-3.8-flash"]
    assert resp["model"] == "gemini-3.8-flash"


def test_locate_objects_normalizes_1000_scale(monkeypatch):
    class DummyResp:
        text = '[{"object_id": "elevator", "ymin": 115, "xmin": 398, "ymax": 355, "xmax": 625}]'

    monkeypatch.setattr(vla_service, "client", object())
    monkeypatch.setattr(VLAService, "_generate_content", staticmethod(lambda **kwargs: DummyResp()))

    topo = {
        "static_anchors": [
            {"anchor_id": "elevator", "type": "architectural feature", "cardinal_direction": "N", "description": "Doors"}
        ],
        "dynamic_objects": [],
    }
    locs = VLAService.locate_objects_in_map("data:image/png;base64,iVBORw0KGgo=", topo)
    assert len(locs) == 1
    assert locs[0]["object_id"] == "elevator"
    assert locs[0]["ymin"] == 11.5
    assert locs[0]["xmin"] == 39.8
    assert locs[0]["ymax"] == 35.5
    assert locs[0]["xmax"] == 62.5

