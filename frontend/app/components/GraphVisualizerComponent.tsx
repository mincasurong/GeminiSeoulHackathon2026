"use client";

import { useEffect, useState, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    MarkerType,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, SpatialNode } from "../lib/api";

interface GraphVisualizerProps {
    workspaceId?: string;
    activeNodeName?: string;
    activeTopology?: SpatialNode | null;
    onNodeSelect: (nodeId: string, nodeRecord: any) => void;
}

const DIRECTION_ANGLES: Record<string, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
};

export default function GraphVisualizerComponent({
    workspaceId = "default",
    activeNodeName,
    activeTopology,
    onNodeSelect,
}: GraphVisualizerProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [roomCount, setRoomCount] = useState<number>(1);
    const [portalCount, setPortalCount] = useState<number>(0);

    const buildGraphElements = useCallback(
        (rawNodes: any[], rawEdges: any[]) => {
            const effectiveRawNodes =
                rawNodes && rawNodes.length > 0
                    ? rawNodes
                    : activeTopology
                    ? [
                          {
                              id: activeTopology.node_name,
                              vla: activeTopology,
                              locations: [],
                          },
                      ]
                    : [];

            const formattedNodes: Node[] = [];
            const formattedEdges: Edge[] = [];
            let totalPortals = 0;

            effectiveRawNodes.forEach((n: any, i: number) => {
                const isActive = n.id === activeNodeName || effectiveRawNodes.length === 1;
                const centerX = (i % 3) * 620 + 460;
                const centerY = Math.floor(i / 3) * 480 + 300;
                const vla: SpatialNode | undefined = n.vla || (n.id === activeTopology?.node_name ? activeTopology : undefined);
                const anchorsCount = vla?.static_anchors?.length || 0;
                const objectsCount = vla?.dynamic_objects?.length || 0;
                const dims = vla?.room_geometry?.approx_dimensions || "10m x 7m";

                formattedNodes.push({
                    id: n.id,
                    position: { x: centerX - 115, y: centerY - 36 },
                    data: {
                        label: `${n.id}\n[${dims} · ${anchorsCount}A / ${objectsCount}O]`,
                        isRoom: true,
                        vla: vla,
                        map_image: n.map_image,
                        parametric_svg: n.parametric_svg,
                        locations: n.locations || [],
                    },
                    style: {
                        background: isActive ? "#064e3b" : "#0f172a",
                        color: "#f8fafc",
                        border: isActive ? "2px solid #00ff9d" : "2px solid #38bdf8",
                        borderRadius: "14px",
                        padding: "12px 18px",
                        width: 240,
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: 700,
                        whiteSpace: "pre-line" as const,
                        textAlign: "center" as const,
                        boxShadow: isActive
                            ? "0 0 24px rgba(0, 255, 157, 0.35)"
                            : "0 4px 15px rgba(0,0,0,0.45)",
                        cursor: "pointer",
                    },
                });

                const navEdges = vla?.navigable_edges || [];
                navEdges.forEach((nav, navIdx) => {
                    totalPortals += 1;
                    const dirKey = (nav.cardinal_direction || "N").toUpperCase();
                    const deg = DIRECTION_ANGLES[dirKey] ?? navIdx * (360 / Math.max(1, navEdges.length));
                    const rad = ((deg - 90) * Math.PI) / 180;
                    const radiusX = 270;
                    const radiusY = 195;
                    const portalId = `portal-${n.id}-${nav.edge_id || navIdx}`;

                    formattedNodes.push({
                        id: portalId,
                        position: {
                            x: centerX + radiusX * Math.cos(rad) - 95,
                            y: centerY + radiusY * Math.sin(rad) - 28,
                        },
                        data: {
                            label: `[${dirKey}] ${nav.edge_id.replace(/_/g, " ").toUpperCase()}\n${nav.description || ""}`,
                            isRoom: false,
                            parentRoomId: n.id,
                            parentData: {
                                vla,
                                map_image: n.map_image,
                                parametric_svg: n.parametric_svg,
                                locations: n.locations || [],
                            },
                        },
                        style: {
                            background: "#0c192c",
                            color: "#bae6fd",
                            border: "1.5px dashed #38bdf8",
                            borderRadius: "12px",
                            padding: "8px 12px",
                            width: 195,
                            fontFamily: "monospace",
                            fontSize: "10px",
                            fontWeight: 600,
                            whiteSpace: "pre-line" as const,
                            textAlign: "center" as const,
                            boxShadow: "0 0 14px rgba(56, 189, 248, 0.18)",
                            cursor: "pointer",
                        },
                    });

                    formattedEdges.push({
                        id: `edge-${n.id}-${portalId}`,
                        source: n.id,
                        target: portalId,
                        label: `${dirKey} PORTAL`,
                        labelStyle: { fill: "#00ff9d", fontSize: 9, fontWeight: 700 },
                        labelBgStyle: { fill: "#020617", opacity: 0.85 },
                        animated: true,
                        markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
                        style: { stroke: "#38bdf8", strokeWidth: 2, opacity: 0.8 },
                    });
                });
            });

            (rawEdges || []).forEach((e: any) => {
                formattedEdges.push({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    label: "CONNECTED ROOM",
                    labelStyle: { fill: "#00ff9d", fontSize: 10, fontWeight: 700 },
                    labelBgStyle: { fill: "#020617", opacity: 0.9 },
                    animated: true,
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#00ff9d" },
                    style: { stroke: "#00ff9d", strokeWidth: 2.5, opacity: 0.9 },
                });
            });

            setRoomCount(effectiveRawNodes.length);
            setPortalCount(totalPortals);
            setNodes(formattedNodes);
            setEdges(formattedEdges);
        },
        [activeNodeName, activeTopology]
    );

    const fetchGraph = useCallback(async () => {
        try {
            const data = await api.getGraph(workspaceId);
            buildGraphElements(data.nodes || [], data.edges || []);
        } catch (err) {
            console.error("Error fetching graph data:", err);
            buildGraphElements([], []);
        }
    }, [workspaceId, buildGraphElements]);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.data?.isRoom) {
                onNodeSelect(node.id, node.data);
            } else if (node.data?.parentRoomId) {
                onNodeSelect(String(node.data.parentRoomId), node.data.parentData);
            }
        },
        [onNodeSelect]
    );

    useEffect(() => {
        fetchGraph();
        const interval = setInterval(() => {
            if (typeof document === "undefined" || document.visibilityState === "visible") {
                fetchGraph();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchGraph]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    return (
        <div
            className="w-full h-[580px] sm:h-[640px] bg-[#030712] relative overflow-hidden"
            style={{ width: "100%", height: "620px" }}
        >
            <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 font-mono text-[11px] text-slate-200 shadow-lg">
                <span className="text-sky-400 font-bold">MULTI-ROOM TOPOLOGY &amp; PORTALS</span>
                <span className="text-slate-600">|</span>
                <span>Scanned Rooms: <strong>{roomCount}</strong></span>
                <span className="text-slate-600">·</span>
                <span>Navigable Exits: <strong>{portalCount}</strong></span>
                <span className="text-slate-400 hidden sm:inline">(Click any room node to switch active floor plan)</span>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.2}
                maxZoom={2.0}
                style={{ width: "100%", height: "100%" }}
                className="bg-[#030712]"
            >
                <Background gap={20} size={1} color="#1e293b" />
                <Controls showInteractive={false} className="bg-slate-900 border border-slate-700 fill-slate-300" />
                <MiniMap
                    nodeColor={(n) => (n.data?.isRoom ? "#10b981" : "#38bdf8")}
                    maskColor="rgba(2, 6, 23, 0.8)"
                    style={{ backgroundColor: "#0f172a" }}
                />
            </ReactFlow>
        </div>
    );
}
