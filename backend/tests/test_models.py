import pytest
from models import (
    StaticAnchor, DynamicObject, NavigableEdge, SpatialRelation,
    SeamKeypoint, LoopClosure, RoomGeometry, SpatialNode, ObjectLocation,
    ChatPayload, QueryPayload, GraphNode, GraphEdge
)


def test_spatial_node_serialization_with_slam_keypoints():
    data = {
        "node_name": "elevator_lobby",
        "room_geometry": {
            "shape": "rectangular",
            "approx_dimensions": "8m x 6m",
            "center_description": "Marble floor lobby",
            "perimeter_keypoints_order": ["kp_0_1_ne", "kp_7_0_nw"]
        },
        "seam_keypoints": [
            {
                "keypoint_id": "kp_0_1_ne",
                "adjacent_pair": [0, 1],
                "bearing_degrees": 45.0,
                "visual_feature": "Northeast wall corner seam",
                "estimated_distance_m": 3.5
            },
            {
                "keypoint_id": "kp_7_0_nw",
                "adjacent_pair": [7, 0],
                "bearing_degrees": 360.0,
                "visual_feature": "Elevator frame left edge closing loop",
                "estimated_distance_m": 3.0
            }
        ],
        "loop_closure": {
            "pair": [7, 0],
            "shared_landmarks": ["kp_7_0_nw"],
            "closure_verified": True
        },
        "static_anchors": [
            {
                "anchor_id": "elevator_door",
                "type": "Elevator",
                "cardinal_direction": "N",
                "description": "Double metal sliding doors",
                "image_indices": [0, 1],
                "associated_keypoints": ["kp_7_0_nw"]
            }
        ],
        "dynamic_objects": [
            {
                "object_id": "potted_plant",
                "type": "Decor",
                "cardinal_direction": "SE",
                "description": "Indoor ficus tree in white ceramic pot",
                "image_indices": [2],
                "relative_to_keypoint": "kp_0_1_ne"
            }
        ],
        "spatial_relations": [
            {
                "source": "potted_plant",
                "relation": "adjacent_to",
                "target": "elevator_door",
                "cardinal_direction": "S",
                "distance_estimate": "1.5m"
            }
        ],
        "navigable_edges": [
            {
                "edge_id": "hallway_east",
                "cardinal_direction": "E",
                "description": "Corridor leading to conference rooms",
                "visual_cue": "Glass door with exit sign",
                "keypoint_anchor": "kp_0_1_ne"
            }
        ]
    }

    node = SpatialNode(**data)
    assert node.node_name == "elevator_lobby"
    assert node.room_geometry.shape == "rectangular"
    assert len(node.seam_keypoints) == 2
    assert node.seam_keypoints[0].bearing_degrees == 45.0
    assert node.loop_closure.closure_verified is True
    assert len(node.static_anchors) == 1
    assert node.static_anchors[0].anchor_id == "elevator_door"
    assert len(node.dynamic_objects) == 1
    assert node.dynamic_objects[0].relative_to_keypoint == "kp_0_1_ne"
    assert len(node.spatial_relations) == 1
    assert len(node.navigable_edges) == 1


def test_object_location_bounds():
    loc = ObjectLocation(
        object_id="test_desk",
        ymin=10.5,
        xmin=20.0,
        ymax=35.0,
        xmax=50.0
    )
    assert loc.object_id == "test_desk"
    assert loc.ymin == 10.5
    assert loc.xmax == 50.0

    # Bounds validation
    with pytest.raises(Exception):
        ObjectLocation(object_id="invalid", ymin=-5.0, xmin=10.0, ymax=20.0, xmax=30.0)


def test_chat_payload_defaults():
    payload = ChatPayload(query="Where is the exit?", node_name="lobby")
    assert payload.engine == "gemini"
    assert payload.history == []
