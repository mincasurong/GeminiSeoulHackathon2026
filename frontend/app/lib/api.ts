const API_BASE_URL = "http://localhost:8000/api";

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

export const api = {
    uploadNode: async (formData: FormData) => {
        const res = await fetch(`${API_BASE_URL}/upload-node`, {
            method: "POST",
            body: formData,
        });
        return res.json();
    },

    queryPlanner: async (userQuery: string, currentNode: string) => {
        const res = await fetch(`${API_BASE_URL}/query-planner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_query: userQuery, current_node: currentNode }),
        });
        return res.json();
    },

    getGraph: async () => {
        const res = await fetch(`${API_BASE_URL}/graph`);
        return res.json();
    },

    chat: async (query: string, nodeName: string, history: { role: string, text: string }[]) => {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, node_name: nodeName, history }),
        });
        return res.json();
    },

    getNodeImages: async (nodeName: string) => {
        const res = await fetch(`${API_BASE_URL}/node/${encodeURIComponent(nodeName)}/images`);
        return res.json();
    }
};
