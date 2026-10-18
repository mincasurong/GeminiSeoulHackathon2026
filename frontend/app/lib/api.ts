const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type EngineType = "gemini-4-argon" | "gemini-3.8-flash" | "gemini";
export type SubscriptionTier = "free" | "pro" | "enterprise";

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
    flooring_material?: string;
    wall_finish?: string;
    center_description?: string;
    perimeter_keypoints_order?: string[];
    polygon_points?: number[][];
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
        bbox?: number[];
        height_m?: number;
    }[];
    dynamic_objects: {
        object_id: string;
        type: string;
        cardinal_direction?: string;
        description: string;
        image_indices: number[];
        relative_to_keypoint?: string;
        bbox?: number[];
        height_m?: number;
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
    tier?: SubscriptionTier;
    badge?: string;
}

export interface WorkspaceInfo {
    workspace_id: string;
    tier: SubscriptionTier;
    plan_name: string;
    scans_used: number;
    scans_limit: number;
    allowed_engines: string[];
    features: string[];
    nodes_count: number;
    subscription_status?: string;
    billing_cycle?: string;
    last_order_id?: string | null;
}

export interface PaymentReceipt {
    order_id: string;
    workspace_id: string;
    user_email: string;
    tier: SubscriptionTier;
    plan_name: string;
    billing_cycle: "monthly" | "annual";
    payment_method: "card" | "kakaopay" | "stripe";
    amount_krw: number;
    amount_usd: number;
    amount_label: string;
    status: string;
    paid_at: string;
}

export interface StreamProgressEvent {
    step?: number;
    status: string;
    label?: string;
    node_name?: string;
    parametric_svg?: string;
    result?: {
        status: string;
        node_name: string;
        topology: SpatialNode;
        map_image: string;
        parametric_svg?: string;
        locations: ObjectLocation[];
        engine: string;
        message: string;
    };
    detail?: string;
}

export const api = {
    uploadNode: async (formData: FormData) => {
        const res = await fetch(`${API_BASE_URL}/upload-node`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(600_000),
        });
        return res.json();
    },

    uploadNodeStream: async (
        formData: FormData,
        onEvent: (evt: StreamProgressEvent) => void
    ) => {
        const res = await fetch(`${API_BASE_URL}/upload-node/stream`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(600_000),
        });
        if (!res.ok || !res.body) {
            const errJson = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
            throw new Error(errJson.detail || "Upload stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: StreamProgressEvent["result"] | null = null;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
                const line = chunk.trim();
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice(5).trim();
                if (!jsonStr) continue;
                const parsed: StreamProgressEvent = JSON.parse(jsonStr);
                onEvent(parsed);
                if (parsed.status === "error") {
                    throw new Error(parsed.detail || "VLA pipeline error");
                }
                if (parsed.status === "complete" && parsed.result) {
                    finalResult = parsed.result;
                }
            }
        }
        return finalResult;
    },

    queryPlanner: async (
        userQuery: string,
        currentNode: string,
        engine: EngineType = "gemini-4-argon",
        workspaceId: string = "default"
    ) => {
        const res = await fetch(`${API_BASE_URL}/query-planner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_query: userQuery,
                current_node: currentNode,
                engine,
                workspace_id: workspaceId,
            }),
            signal: AbortSignal.timeout(300_000),
        });
        return res.json();
    },

    getGraph: async (workspaceId: string = "default") => {
        const res = await fetch(
            `${API_BASE_URL}/graph?workspace_id=${encodeURIComponent(workspaceId)}`
        );
        return res.json();
    },

    chat: async (
        query: string,
        nodeName: string,
        history: { role: string; text: string }[],
        engine: EngineType = "gemini-4-argon",
        workspaceId: string = "default"
    ) => {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                node_name: nodeName,
                history,
                engine,
                workspace_id: workspaceId,
            }),
            signal: AbortSignal.timeout(300_000),
        });
        return res.json();
    },

    getNodeImages: async (nodeName: string, workspaceId: string = "default") => {
        const res = await fetch(
            `${API_BASE_URL}/node/${encodeURIComponent(nodeName)}/images?workspace_id=${encodeURIComponent(workspaceId)}`
        );
        return res.json();
    },

    getEngines: async (): Promise<{ engines: EngineInfo[] }> => {
        const res = await fetch(`${API_BASE_URL}/engines`);
        return res.json();
    },

    getWorkspace: async (workspaceId: string = "default"): Promise<WorkspaceInfo> => {
        const res = await fetch(
            `${API_BASE_URL}/workspace?workspace_id=${encodeURIComponent(workspaceId)}`
        );
        return res.json();
    },

    setWorkspaceTier: async (
        tier: SubscriptionTier,
        workspaceId: string = "default",
        userEmail?: string
    ): Promise<WorkspaceInfo> => {
        const res = await fetch(`${API_BASE_URL}/workspace/tier`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workspace_id: workspaceId,
                tier,
                user_email: userEmail,
            }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || `HTTP ${res.status}`);
        }
        return data;
    },

    createBillingCheckout: async (payload: {
        workspace_id: string;
        user_email: string;
        user_name?: string;
        tier: SubscriptionTier;
        billing_cycle: "monthly" | "annual";
        payment_method: "card" | "kakaopay" | "stripe";
        card_last4?: string;
        organization_name?: string;
    }): Promise<{
        status: string;
        receipt: PaymentReceipt;
        workspace: WorkspaceInfo;
        message: string;
    }> => {
        const res = await fetch(`${API_BASE_URL}/billing/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || `HTTP ${res.status}`);
        }
        return data;
    },

    getBillingHistory: async (
        workspaceId: string = "default"
    ): Promise<{ workspace_id: string; payments: PaymentReceipt[]; count: number }> => {
        const res = await fetch(
            `${API_BASE_URL}/billing/history?workspace_id=${encodeURIComponent(workspaceId)}`
        );
        return res.json();
    },

    cancelSubscription: async (payload: {
        workspace_id: string;
        user_email: string;
        order_id?: string;
    }): Promise<{
        status: string;
        canceled_order_id?: string;
        workspace: WorkspaceInfo;
        firestore_synced: boolean;
        message: string;
    }> => {
        const res = await fetch(`${API_BASE_URL}/billing/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || `HTTP ${res.status}`);
        }
        return data;
    },

    getExportUrl: (
        nodeName: string,
        format: "svg" | "dxf" | "ros2" | "json",
        workspaceId: string = "default"
    ): string => {
        return `${API_BASE_URL}/node/${encodeURIComponent(nodeName)}/export?format=${format}&workspace_id=${encodeURIComponent(workspaceId)}`;
    },

    getAdminOverview: async (adminEmail: string) => {
        const res = await fetch(
            `${API_BASE_URL}/admin/overview?admin_email=${encodeURIComponent(adminEmail)}`
        );
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
    },

    adminUpdateUserTier: async (
        adminEmail: string,
        targetEmail: string,
        workspaceId: string,
        tier: SubscriptionTier
    ) => {
        const res = await fetch(`${API_BASE_URL}/admin/user-tier`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                admin_email: adminEmail,
                target_email: targetEmail,
                workspace_id: workspaceId,
                tier,
            }),
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
    },
};
