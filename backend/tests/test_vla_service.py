import pytest
from vla_service import _clean_and_parse_json, DIRECTION_PRESETS


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
