const API_BASE_URL = "http://localhost:8000/api";

export type EngineType = "gemma" | "gemini";

export interface SpatialNode {
    node_name: string;
    static_anchors: { anchor_id: string; type: string; description: string; image_indices: number[] }[];
    dynamic_objects: { object_id: string; type: string; description: string; image_indices: number[] }[];
    navigable_edges: { edge_id: string; description: string; visual_cue: string }[];
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

    chat: async (query: string, nodeName: string, history: { role: string, text: string }[], engine: EngineType = "gemma") => {
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
