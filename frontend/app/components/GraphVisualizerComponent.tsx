"use client";

import { useEffect, useState, useCallback } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

interface GraphVisualizerProps {
    onNodeSelect: (nodeId: string, vlaData: any) => void;
}

import { api } from "../lib/api";

export default function GraphVisualizerComponent({ onNodeSelect }: GraphVisualizerProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const fetchGraph = async () => {
        try {
            const data = await api.getGraph();

            const formattedNodes = data.nodes.map((n: any, i: number) => ({
                id: n.id,
                position: { x: (i % 5) * 200 + 50, y: Math.floor(i / 5) * 150 + 50 },
                data: { label: n.id, vla: n.vla },
                style: {
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    minWidth: '140px',
                    textAlign: 'center' as const,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                }
            }));

            const formattedEdges = data.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: true,
                style: { stroke: '#4f46e5', strokeWidth: 3, opacity: 0.6 }
            }));

            setNodes(formattedNodes);
            setEdges(formattedEdges);
        } catch (err) {
            console.error("Error fetching graph data:", err);
        }
    };

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        onNodeSelect(node.id, node.data.vla);
    }, [onNodeSelect]);

    useEffect(() => {
        fetchGraph();
        const interval = setInterval(fetchGraph, 5000);
        return () => clearInterval(interval);
    }, []);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    return (
        <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
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
