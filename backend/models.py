from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field


# ─── Spatial SLAM Keypoints & Topology Sub-Schemas ────────────────────

class SeamKeypoint(BaseModel):
    """Represents a salient visual feature invariant identified in overlapping adjacent camera frames (like in Visual SLAM)."""
    keypoint_id: str = Field(..., description="Unique identifier (e.g. 'kp_ne_wall_corner', 'kp_elevator_frame_right')")
    adjacent_pair: List[int] = Field(..., description="Adjacent camera indices where this keypoint is visible (e.g. [0, 1] or [7, 0])")
    bearing_degrees: float = Field(..., ge=0.0, le=360.0, description="Angular azimuth from room center in degrees (0° = N, 90° = E, 180° = S, 270° = W)")
    visual_feature: str = Field(..., description="Description of the salient geometric corner, edge, doorframe, or architectural line")
    estimated_distance_m: Optional[float] = Field(None, description="Estimated metric radial distance from center viewpoint in meters")


class LoopClosure(BaseModel):
    """Validates 360-degree boundary closure between Image 7 (NW) and Image 0 (N) to prevent geometric drift."""
    pair: List[int] = Field(default=[7, 0], description="The wrapping camera indices [7, 0]")
    shared_landmarks: List[str] = Field(default_factory=list, description="Keypoint IDs that confirm 360° perimeter closure")
    closure_verified: bool = Field(default=True, description="Whether full 360-degree loop closure is mathematically confirmed")
    notes: Optional[str] = Field(None, description="Perimeter alignment and scale notes")


class StaticAnchor(BaseModel):
    """Represents an immovable architectural fixture or heavy furniture in the room."""
    anchor_id: str = Field(..., description="Unique snake_case identifier (e.g. 'refrigerator_n', 'golden_door_e')")
    type: str = Field(..., description="Category (e.g. 'Appliance', 'Door', 'Architectural Feature', 'Desk')")
    cardinal_direction: Optional[str] = Field(None, description="Primary cardinal direction (N, NE, E, SE, S, SW, W, NW)")
    description: str = Field(..., description="Visual description of the anchor and its material/appearance")
    image_indices: List[int] = Field(default_factory=list, description="Camera indices (0-7) where this anchor appears")
    associated_keypoints: List[str] = Field(default_factory=list, description="IDs of seam keypoints anchoring this fixture")


class DynamicObject(BaseModel):
    """Represents a movable object of interest in the room."""
    object_id: str = Field(..., description="Unique snake_case identifier (e.g. 'laptop_w', 'potted_plant_s')")
    type: str = Field(..., description="Category (e.g. 'Electronics', 'Decor', 'Chair', 'Signage')")
    cardinal_direction: Optional[str] = Field(None, description="Primary cardinal direction (N, NE, E, SE, S, SW, W, NW)")
    description: str = Field(..., description="Visual description of the object")
    image_indices: List[int] = Field(default_factory=list, description="Camera indices (0-7) where this object appears")
    relative_to_keypoint: Optional[str] = Field(None, description="Closest seam keypoint ID for geometric anchoring")


class SpatialRelation(BaseModel):
    """Represents a directional or relational topological edge between two entities."""
    source: str = Field(..., description="Source entity ID (anchor or object)")
    relation: str = Field(..., description="Spatial relationship (e.g. 'adjacent_to', 'on_top_of', 'facing', 'left_of', 'right_of', 'inside', 'behind')")
    target: str = Field(..., description="Target entity ID (anchor or object)")
    cardinal_direction: Optional[str] = Field(None, description="Direction vector from source to target (N, NE, E, SE, S, SW, W, NW)")
    distance_estimate: Optional[str] = Field(None, description="Estimated metric distance (e.g. '0.5m', '1.5m')")


class RoomGeometry(BaseModel):
    """Geometric and spatial boundary analysis of the room."""
    shape: str = Field(default="rectangular", description="Room boundary shape (rectangular, L-shaped, open-plan, circular)")
    approx_dimensions: Optional[str] = Field(None, description="Estimated room dimensions (e.g. '10m x 7m')")
    center_description: Optional[str] = Field(None, description="Description of the central viewpoint and open floor area")
    perimeter_keypoints_order: List[str] = Field(default_factory=list, description="Ordered sequence of keypoints defining outer wall polygon")


class NavigableEdge(BaseModel):
    """Represents an exit, doorway, or pathway connecting this node to adjacent areas."""
    edge_id: str = Field(..., description="Unique snake_case identifier (e.g. 'elevator_entry', 'stairs_up')")
    cardinal_direction: Optional[str] = Field(None, description="Exit direction (N, NE, E, SE, S, SW, W, NW)")
    description: str = Field(..., description="Description of destination or pathway purpose")
    visual_cue: str = Field(..., description="Salient visual feature marking the exit")
    keypoint_anchor: Optional[str] = Field(None, description="Seam keypoint marking this threshold")


class SpatialNode(BaseModel):
    """Complete semantic topology structure for a captured room node."""
    node_name: str = Field(..., description="Human-readable room identifier")
    room_geometry: Optional[RoomGeometry] = Field(default_factory=RoomGeometry, description="Room geometric boundary analysis")
    seam_keypoints: List[SeamKeypoint] = Field(default_factory=list, description="SLAM visual keypoints matching across overlapping photo seams")
    loop_closure: Optional[LoopClosure] = Field(default_factory=LoopClosure, description="360° perimeter loop closure validation")
    static_anchors: List[StaticAnchor] = Field(default_factory=list, description="List of immovable anchors")
    dynamic_objects: List[DynamicObject] = Field(default_factory=list, description="List of movable objects")
    spatial_relations: List[SpatialRelation] = Field(default_factory=list, description="Relational graph edges connecting entities")
    navigable_edges: List[NavigableEdge] = Field(default_factory=list, description="List of navigable exits and pathways")


class ObjectLocation(BaseModel):
    """Percentage-based bounding box [0.0 - 100.0] locating an object on the 2D floor plan."""
    object_id: str = Field(..., description="Matching identifier from static_anchors or dynamic_objects")
    ymin: float = Field(..., ge=0.0, le=100.0, description="Top bound percentage")
    xmin: float = Field(..., ge=0.0, le=100.0, description="Left bound percentage")
    ymax: float = Field(..., ge=0.0, le=100.0, description="Bottom bound percentage")
    xmax: float = Field(..., ge=0.0, le=100.0, description="Right bound percentage")


# ─── API Payloads & Responses ─────────────────────────────────────────

class EngineInfo(BaseModel):
    id: str
    name: str
    available: bool


class EnginesResponse(BaseModel):
    engines: List[EngineInfo]


class UploadNodeResponse(BaseModel):
    status: str
    node_name: str
    topology: SpatialNode
    map_image: str
    locations: List[ObjectLocation]
    engine: str
    message: str


class ChatPayload(BaseModel):
    query: str = Field(..., description="User's natural language question about the space")
    node_name: str = Field(..., description="Target room node name")
    history: List[Dict[str, str]] = Field(default_factory=list, description="Prior conversation turns")
    engine: str = Field(default="gemini", description="Inference engine selector")


class ChatResponse(BaseModel):
    response: str
    node_name: str


class QueryPayload(BaseModel):
    user_query: str = Field(..., description="Navigation objective (e.g. 'Navigate to the coffee pot')")
    current_node: str = Field(..., description="Current starting room node")


class QueryPlannerResponse(BaseModel):
    status: Optional[str] = "success"
    plan: List[str] = Field(default_factory=list, description="Sequence of nodes to traverse")
    message: str = Field(..., description="Reasoning or explanation for the planned path")


class GraphNode(BaseModel):
    id: str
    data: Dict[str, Any]
    vla: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class NodeImagesResponse(BaseModel):
    node_id: str
    images: List[str]
    count: int
