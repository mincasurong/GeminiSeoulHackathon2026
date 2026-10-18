from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator


def _coerce_str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        if any(k in val for k in ("length_m", "width_m", "height_m", "length", "width", "height")):
            parts = []
            for k in ("length_m", "width_m", "height_m", "length", "width", "height"):
                if k in val and val[k] is not None:
                    v_str = str(val[k])
                    parts.append(v_str if v_str.endswith("m") else f"{v_str}m")
            if parts:
                return " x ".join(parts)
        return ", ".join(f"{k}: {v}" for k, v in val.items() if v is not None)
    if isinstance(val, (list, tuple)):
        return ", ".join(str(x) for x in val)
    return str(val)


def _coerce_optional_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = "".join(c for c in val if (c.isdigit() or c in ".-"))
        try:
            return float(cleaned) if cleaned else None
        except Exception:
            return None
    return None


def _coerce_bbox(val: Any) -> Optional[List[float]]:
    if val is None:
        return None
    if isinstance(val, dict):
        if all(k in val for k in ("ymin", "xmin", "ymax", "xmax")):
            try:
                return [
                    float(val["ymin"]),
                    float(val["xmin"]),
                    float(val["ymax"]),
                    float(val["xmax"]),
                ]
            except Exception:
                return None
        return None
    if isinstance(val, (list, tuple)) and len(val) == 4:
        try:
            return [float(x) for x in val]
        except Exception:
            return None
    return None


class SeamKeypoint(BaseModel):
    keypoint_id: str = Field(default="kp_0", description="Unique identifier")
    adjacent_pair: List[int] = Field(default_factory=lambda: [0, 1])
    bearing_degrees: float = Field(default=0.0, ge=0.0, le=360.0)
    visual_feature: str = Field(default="")
    estimated_distance_m: Optional[float] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {}
        out = dict(data)
        out["keypoint_id"] = _coerce_str(out.get("keypoint_id") or out.get("id"), "kp_0")
        out["visual_feature"] = _coerce_str(out.get("visual_feature") or out.get("description"), "Keypoint")
        deg = _coerce_optional_float(out.get("bearing_degrees"))
        out["bearing_degrees"] = max(0.0, min(360.0, deg if deg is not None else 0.0))
        out["estimated_distance_m"] = _coerce_optional_float(out.get("estimated_distance_m"))
        pair = out.get("adjacent_pair")
        if isinstance(pair, (list, tuple)) and len(pair) >= 2:
            try:
                out["adjacent_pair"] = [int(pair[0]), int(pair[1])]
            except Exception:
                out["adjacent_pair"] = [0, 1]
        else:
            out["adjacent_pair"] = [0, 1]
        return out


class LoopClosure(BaseModel):
    pair: List[int] = Field(default_factory=lambda: [7, 0])
    shared_landmarks: List[str] = Field(default_factory=list)
    closure_verified: bool = Field(default=True)
    notes: Optional[str] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {}
        out = dict(data)
        if out.get("notes") is not None:
            out["notes"] = _coerce_str(out["notes"])
        landmarks = out.get("shared_landmarks")
        if isinstance(landmarks, list):
            out["shared_landmarks"] = [_coerce_str(x) for x in landmarks]
        else:
            out["shared_landmarks"] = []
        return out


class StaticAnchor(BaseModel):
    anchor_id: str = Field(..., description="Unique snake_case identifier")
    type: str = Field(default="Architectural Feature")
    cardinal_direction: Optional[str] = Field(None)
    description: str = Field(default="")
    image_indices: List[int] = Field(default_factory=list)
    associated_keypoints: List[str] = Field(default_factory=list)
    bbox: Optional[List[float]] = Field(None)
    height_m: Optional[float] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {"anchor_id": "anchor_0", "type": "Feature", "description": _coerce_str(data)}
        out = dict(data)
        out["anchor_id"] = _coerce_str(out.get("anchor_id") or out.get("id") or out.get("name"), "anchor_0")
        out["type"] = _coerce_str(out.get("type") or out.get("category"), "Architectural Feature")
        if out.get("cardinal_direction") is not None:
            out["cardinal_direction"] = _coerce_str(out["cardinal_direction"])
        out["description"] = _coerce_str(out.get("description"), out["type"])
        raw_indices = out.get("image_indices")
        if isinstance(raw_indices, list):
            indices = []
            for x in raw_indices:
                val = _coerce_optional_float(x)
                if val is not None:
                    indices.append(int(val))
            out["image_indices"] = indices
        else:
            out["image_indices"] = []
        raw_kps = out.get("associated_keypoints")
        out["associated_keypoints"] = [_coerce_str(x) for x in raw_kps] if isinstance(raw_kps, list) else []
        out["bbox"] = _coerce_bbox(out.get("bbox"))
        out["height_m"] = _coerce_optional_float(out.get("height_m"))
        return out


class DynamicObject(BaseModel):
    object_id: str = Field(..., description="Unique snake_case identifier")
    type: str = Field(default="Object")
    cardinal_direction: Optional[str] = Field(None)
    description: str = Field(default="")
    image_indices: List[int] = Field(default_factory=list)
    relative_to_keypoint: Optional[str] = Field(None)
    bbox: Optional[List[float]] = Field(None)
    height_m: Optional[float] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {"object_id": "object_0", "type": "Object", "description": _coerce_str(data)}
        out = dict(data)
        out["object_id"] = _coerce_str(out.get("object_id") or out.get("id") or out.get("name"), "object_0")
        out["type"] = _coerce_str(out.get("type") or out.get("category"), "Object")
        if out.get("cardinal_direction") is not None:
            out["cardinal_direction"] = _coerce_str(out["cardinal_direction"])
        out["description"] = _coerce_str(out.get("description"), out["type"])
        raw_indices = out.get("image_indices")
        if isinstance(raw_indices, list):
            indices = []
            for x in raw_indices:
                val = _coerce_optional_float(x)
                if val is not None:
                    indices.append(int(val))
            out["image_indices"] = indices
        else:
            out["image_indices"] = []
        if out.get("relative_to_keypoint") is not None:
            out["relative_to_keypoint"] = _coerce_str(out["relative_to_keypoint"])
        out["bbox"] = _coerce_bbox(out.get("bbox"))
        out["height_m"] = _coerce_optional_float(out.get("height_m"))
        return out


class SpatialRelation(BaseModel):
    source: str = Field(default="")
    relation: str = Field(default="adjacent_to")
    target: str = Field(default="")
    cardinal_direction: Optional[str] = Field(None)
    distance_estimate: Optional[str] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {}
        out = dict(data)
        out["source"] = _coerce_str(out.get("source"))
        out["relation"] = _coerce_str(out.get("relation"), "adjacent_to")
        out["target"] = _coerce_str(out.get("target"))
        if out.get("cardinal_direction") is not None:
            out["cardinal_direction"] = _coerce_str(out["cardinal_direction"])
        if out.get("distance_estimate") is not None:
            dist = out["distance_estimate"]
            out["distance_estimate"] = f"{dist}m" if isinstance(dist, (int, float)) else _coerce_str(dist)
        return out


class RoomGeometry(BaseModel):
    shape: str = Field(default="rectangular")
    approx_dimensions: Optional[str] = Field(None)
    flooring_material: Optional[str] = Field(None)
    wall_finish: Optional[str] = Field(None)
    center_description: Optional[str] = Field(None)
    perimeter_keypoints_order: List[str] = Field(default_factory=list)
    polygon_points: List[List[float]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {}
        out = dict(data)
        out["shape"] = _coerce_str(out.get("shape"), "rectangular")
        for str_key in ("approx_dimensions", "flooring_material", "wall_finish", "center_description"):
            if out.get(str_key) is not None:
                out[str_key] = _coerce_str(out[str_key])
        raw_order = out.get("perimeter_keypoints_order")
        out["perimeter_keypoints_order"] = [_coerce_str(x) for x in raw_order] if isinstance(raw_order, list) else []
        raw_poly = out.get("polygon_points")
        clean_poly: List[List[float]] = []
        if isinstance(raw_poly, list):
            for pt in raw_poly:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    x = _coerce_optional_float(pt[0])
                    y = _coerce_optional_float(pt[1])
                    if x is not None and y is not None:
                        clean_poly.append([x, y])
                elif isinstance(pt, dict) and ("x" in pt and "y" in pt):
                    x = _coerce_optional_float(pt.get("x"))
                    y = _coerce_optional_float(pt.get("y"))
                    if x is not None and y is not None:
                        clean_poly.append([x, y])
        out["polygon_points"] = clean_poly
        return out


class NavigableEdge(BaseModel):
    edge_id: str = Field(default="exit_0")
    cardinal_direction: Optional[str] = Field(None)
    description: str = Field(default="")
    visual_cue: str = Field(default="")
    keypoint_anchor: Optional[str] = Field(None)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {"edge_id": "exit_0", "description": _coerce_str(data), "visual_cue": ""}
        out = dict(data)
        out["edge_id"] = _coerce_str(out.get("edge_id") or out.get("id"), "exit_0")
        if out.get("cardinal_direction") is not None:
            out["cardinal_direction"] = _coerce_str(out["cardinal_direction"])
        out["description"] = _coerce_str(out.get("description"), "Pathway")
        out["visual_cue"] = _coerce_str(out.get("visual_cue"), out["description"])
        if out.get("keypoint_anchor") is not None:
            out["keypoint_anchor"] = _coerce_str(out["keypoint_anchor"])
        return out


class SpatialNode(BaseModel):
    node_name: str = Field(..., description="Human-readable room identifier")
    room_geometry: Optional[RoomGeometry] = Field(default_factory=RoomGeometry)
    seam_keypoints: List[SeamKeypoint] = Field(default_factory=list)
    loop_closure: Optional[LoopClosure] = Field(default_factory=LoopClosure)
    static_anchors: List[StaticAnchor] = Field(default_factory=list)
    dynamic_objects: List[DynamicObject] = Field(default_factory=list)
    spatial_relations: List[SpatialRelation] = Field(default_factory=list)
    navigable_edges: List[NavigableEdge] = Field(default_factory=list)


class ObjectLocation(BaseModel):
    object_id: str = Field(..., description="Matching identifier from static_anchors or dynamic_objects")
    ymin: float = Field(..., ge=0.0, le=100.0)
    xmin: float = Field(..., ge=0.0, le=100.0)
    ymax: float = Field(..., ge=0.0, le=100.0)
    xmax: float = Field(..., ge=0.0, le=100.0)


class EngineInfo(BaseModel):
    id: str
    name: str
    available: bool
    tier: str = Field(default="free")
    badge: Optional[str] = Field(None)


class EnginesResponse(BaseModel):
    engines: List[EngineInfo]


class UploadNodeResponse(BaseModel):
    status: str
    node_name: str
    topology: SpatialNode
    map_image: str
    parametric_svg: Optional[str] = None
    locations: List[ObjectLocation]
    engine: str
    message: str


class ChatPayload(BaseModel):
    query: str
    node_name: str
    history: List[Dict[str, str]] = Field(default_factory=list)
    engine: str = Field(default="gemini")
    workspace_id: str = Field(default="default")


class ChatResponse(BaseModel):
    response: str
    node_name: str
    engine: Optional[str] = None


class QueryPayload(BaseModel):
    user_query: str
    current_node: str
    engine: str = Field(default="gemini-4-argon")
    workspace_id: str = Field(default="default")


class QueryPlannerResponse(BaseModel):
    status: Optional[str] = "success"
    plan: List[str] = Field(default_factory=list)
    message: str
    waypoints: List[Dict[str, Any]] = Field(default_factory=list)


class GraphNode(BaseModel):
    id: str
    data: Dict[str, Any]
    vla: Optional[Dict[str, Any]] = None
    map_image: Optional[str] = None
    parametric_svg: Optional[str] = None
    locations: List[ObjectLocation] = Field(default_factory=list)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    workspace_id: str = "default"


class NodeImagesResponse(BaseModel):
    node_id: str
    images: List[str]
    count: int


class WorkspaceInfo(BaseModel):
    workspace_id: str
    tier: str = Field(default="free")
    plan_name: str
    scans_used: int
    scans_limit: int
    allowed_engines: List[str]
    features: List[str]
    nodes_count: int
    subscription_status: str = Field(default="free_tier")
    billing_cycle: str = Field(default="monthly")
    last_order_id: Optional[str] = None


class WorkspaceTierUpdatePayload(BaseModel):
    workspace_id: str = "default"
    tier: str
    user_email: Optional[str] = None


class BillingCheckoutPayload(BaseModel):
    workspace_id: str = "default"
    user_email: str
    user_name: Optional[str] = None
    tier: str = Field(..., description="pro | enterprise")
    billing_cycle: str = Field(default="monthly", description="monthly | annual")
    payment_method: str = Field(default="card", description="card | kakaopay | stripe")
    card_last4: Optional[str] = Field(default="4242")
    organization_name: Optional[str] = None


class PaymentReceipt(BaseModel):
    order_id: str
    workspace_id: str
    user_email: str
    tier: str
    plan_name: str
    billing_cycle: str
    payment_method: str
    amount_krw: int
    amount_usd: int
    amount_label: str
    status: str = "paid"
    paid_at: str


class BillingCheckoutResponse(BaseModel):
    status: str = "paid"
    receipt: PaymentReceipt
    workspace: WorkspaceInfo
    message: str


class BillingCancelPayload(BaseModel):
    workspace_id: str = "default"
    user_email: str
    order_id: Optional[str] = None
    reason: Optional[str] = None


class BillingCancelResponse(BaseModel):
    status: str = "canceled"
    canceled_order_id: Optional[str] = None
    workspace: WorkspaceInfo
    firestore_synced: bool = False
    message: str


class GoogleAuthVerifyPayload(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    avatarUrl: Optional[str] = None
    idToken: Optional[str] = None
    accessToken: Optional[str] = None


class UserProfileResponse(BaseModel):
    name: str
    email: str
    avatarUrl: Optional[str] = None
    loginProvider: str = "google"
    loginTime: str
    workspace_id: str
    role: str = "user"
    is_admin: bool = False
    login_count: int = 1
    firestore_synced: bool = False


class AdminUserTierUpdatePayload(BaseModel):
    admin_email: str
    target_email: str
    workspace_id: str
    tier: str
