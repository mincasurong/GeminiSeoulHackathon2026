const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type EngineType = "gemini";

export interface SeamKeypoint {
    keypoint_id: string;
    adjacent_pair: number[];
    bearing_degrees: number;
    visual_feature: string;
    estimated_distance_m?: number;
}

export interface LoopClosure {
    pair: number[];
    shared_landmarks: string[];
    closure_verified: boolean;
    notes?: string;
}

export interface SpatialRelation {
    source: string;
    relation: string;
    target: string;
    cardinal_direction?: string;
    distance_estimate?: string;
}

export interface RoomGeometry {
    shape?: string;
    approx_dimensions?: string;
    center_description?: string;
    perimeter_keypoints_order?: string[];
}

export interface SpatialNode {
    node_name: string;
    room_geometry?: RoomGeometry;
    seam_keypoints?: SeamKeypoint[];
    loop_closure?: LoopClosure;
    static_anchors: { 
        anchor_id: string; 
        type: string; 
        cardinal_direction?: string;
        description: string; 
        image_indices: number[];
        associated_keypoints?: string[];
    }[];
    dynamic_objects: { 
        object_id: string; 
        type: string; 
        cardinal_direction?: string;
        description: string; 
        image_indices: number[];
        relative_to_keypoint?: string;
    }[];
    spatial_relations?: SpatialRelation[];
    navigable_edges: { 
        edge_id: string; 
        cardinal_direction?: string;
        description: string; 
        visual_cue: string;
        keypoint_anchor?: string;
    }[];
}

export interface ObjectLocation {
    object_id: string;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
}

export interface EngineInfo {
    id: EngineType;
    name: string;
    available: boolean;
}

export const api = {
    uploadNode: async (formData: FormData) => {
        const res = await fetch(`${API_BASE_URL}/upload-node`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(600_000),  // 10 min
        });
        return res.json();
    },

    queryPlanner: async (userQuery: string, currentNode: string) => {
        const res = await fetch(`${API_BASE_URL}/query-planner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_query: userQuery, current_node: currentNode }),
            signal: AbortSignal.timeout(300_000),
        });
        return res.json();
    },

    getGraph: async () => {
        const res = await fetch(`${API_BASE_URL}/graph`);
        return res.json();
    },

    chat: async (query: string, nodeName: string, history: { role: string, text: string }[], engine: EngineType = "gemini") => {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, node_name: nodeName, history, engine }),
            signal: AbortSignal.timeout(300_000),
        });
        return res.json();
    },

    getNodeImages: async (nodeName: string) => {
        const res = await fetch(`${API_BASE_URL}/node/${encodeURIComponent(nodeName)}/images`);
        return res.json();
    },

    getEngines: async (): Promise<{ engines: EngineInfo[] }> => {
        const res = await fetch(`${API_BASE_URL}/engines`);
        return res.json();
    }
};
