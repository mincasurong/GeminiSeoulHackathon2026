"use client";

import { useEffect, useState, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../lib/api";

interface GraphVisualizerProps {
    workspaceId?: string;
    activeNodeName?: string;
    onNodeSelect: (nodeId: string, nodeRecord: any) => void;
}

export default function GraphVisualizerComponent({
    workspaceId = "default",
    activeNodeName,
    onNodeSelect,
}: GraphVisualizerProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const fetchGraph = useCallback(async () => {
        try {
            const data = await api.getGraph(workspaceId);

            const formattedNodes = (data.nodes || []).map((n: any, i: number) => {
                const isActive = n.id === activeNodeName;
                return {
                    id: n.id,
                    position: { x: (i % 4) * 230 + 60, y: Math.floor(i / 4) * 160 + 80 },
                    data: {
                        label: n.id,
                        vla: n.vla,
                        map_image: n.map_image,
                        parametric_svg: n.parametric_svg,
                        locations: n.locations || [],
                    },
                    style: {
                        background: isActive ? '#064e3b' : '#0f172a',
                        color: '#f8fafc',
                        border: isActive ? '2px solid #00ff9d' : '1px solid #38bdf8',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        minWidth: '160px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        textAlign: 'center' as const,
                        boxShadow: isActive
                            ? '0 0 20px rgba(0, 255, 157, 0.35)'
                            : '0 4px 15px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                    },
                };
            });

            const formattedEdges = (data.edges || []).map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: true,
                style: { stroke: '#00ff9d', strokeWidth: 2.5, opacity: 0.75 },
            }));

            setNodes(formattedNodes);
            setEdges(formattedEdges);
        } catch (err) {
            console.error("Error fetching graph data:", err);
        }
    }, [workspaceId, activeNodeName]);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            onNodeSelect(node.id, node.data);
        },
        [onNodeSelect]
    );

    useEffect(() => {
        fetchGraph();
        const interval = setInterval(fetchGraph, 5000);
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
        <div className="w-full h-full relative" style={{ minHeight: '440px' }}>
            <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 font-mono text-[11px] text-slate-300">
                Click any room node to switch active floor plan &amp; 3D twin
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background gap={20} size={1} color="#1e293b" />
                <Controls showInteractive={false} className="bg-gray-800 border-none fill-white" />
                <MiniMap
                    nodeColor="#334155"
                    maskColor="rgba(2, 6, 23, 0.8)"
                    style={{ backgroundColor: '#0f172a' }}
                />
            </ReactFlow>
        </div>
    );
}
