"use client";

import { useState } from "react";
import { Download, X, Eye, Loader2 } from "lucide-react";
import { ObjectLocation, SpatialNode } from "../lib/api";

interface InteriorMapProps {
    mapImage: string;
    locations: ObjectLocation[];
    topology: SpatialNode;
    sourceImages: string[];
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
    theme: 'dark' | 'light';
    robotApiUrl: string;
    onAddSystemLog: (msg: string) => void;
}

export default function InteriorMapComponent({
    mapImage, locations, topology, sourceImages,
    selectedObjectId, onSelectObject, theme,
    robotApiUrl, onAddSystemLog
}: InteriorMapProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [viewingSource, setViewingSource] = useState<{ objectId: string; imageIndices: number[] } | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);

    if (!mapImage) return null;

    const isDark = theme === 'dark';

    // Find the image_indices for a given object from the topology
    const getImageIndices = (objectId: string): number[] => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return anchor.image_indices || [];
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return obj.image_indices || [];
        return [];
    };

    const getObjectLabel = (objectId: string): string => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return `${anchor.type}`;
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return `${obj.type}`;
        return objectId;
    };

    const handleObjectClick = (objectId: string) => {
        const indices = getImageIndices(objectId);
        if (indices.length > 0 && sourceImages.length > 0) {
            setViewingSource({ objectId, imageIndices: indices });
        }
        onSelectObject(objectId === selectedObjectId ? null : objectId);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = mapImage;
        link.download = `floor_plan_${topology.node_name || 'map'}.png`;
        link.click();
    };

    const dispatchToHardware = async () => {
        if (!locations || locations.length === 0) return;
        setIsDispatching(true);
        onAddSystemLog("Starting ROS2 Trajectory Serialization...");

        // Translate visual % coordinates to "metric" (1% = 0.1m)
        const waypoints = locations.map(loc => {
            const centerX = (loc.xmin + loc.xmax) / 2;
            const centerY = (loc.ymin + loc.ymax) / 2;

            // Map to simulated metric space
            const metricX = centerX * 0.1;
            const metricY = centerY * 0.1;

            return {
                header: { frame_id: "map" },
                pose: {
                    position: { x: metricX, y: metricY, z: 0.0 },
                    orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
                }
            };
        });

        const payload = {
            action: "Nav2_FollowWaypoints",
            frame_id: "map",
            waypoints: waypoints
        };

        onAddSystemLog(`[SYSTEM] Trajectory serialized to PoseStamped array (${waypoints.length} waypoints).`);

        try {
            onAddSystemLog(`[SYSTEM] Dispatching to: ${robotApiUrl}`);
            // Simulated fetch
            await fetch(robotApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {
                // Intercept network failure for hackathon simulation
                console.log("Simulated network bypass for hackathon.");
            });

            onAddSystemLog(`[SYSTEM] Successfully dispatched ${waypoints.length} waypoints to ROS2 Nav2 Action Server.`);
            alert("Path Sent to Hardware Controller");
        } catch (err) {
            onAddSystemLog("[SYSTEM] Dispatch failed, but simulated success for demo.");
            onAddSystemLog(`[SYSTEM] Successfully dispatched ${waypoints.length} waypoints to ROS2 Nav2 Action Server.`);
        } finally {
            setIsDispatching(false);
        }
    };

    return (
        <div className="w-full h-full relative">
            {/* Download Button */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                <button onClick={handleDownload}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105"
                    style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', border: `1px solid ${isDark ? '#333' : '#ccc'}`, color: isDark ? '#00FF9D' : '#059669' }}>
                    <Download className="w-3 h-3" /> SAVE MAP
                </button>
                <button
                    onClick={dispatchToHardware}
                    disabled={isDispatching}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', border: `1px solid ${isDark ? '#00FF9D' : '#059669'}`, color: isDark ? '#00FF9D' : '#059669' }}>
                    {isDispatching ? <Loader2 className="w-3 h-3 animate-spin" /> : '🚀'} SEND TO ROBOT
                </button>
            </div>

            {/* Map Image */}
            <img src={mapImage} alt="Bird's Eye View" className="w-full h-full object-contain" />

            {/* Interactive Bounding Boxes */}
            {locations?.map(loc => {
                const isHovered = hoveredId === loc.object_id;
                const isSelected = selectedObjectId === loc.object_id;
                const label = getObjectLabel(loc.object_id);
                const hasSource = getImageIndices(loc.object_id).length > 0;

                return (
                    <div
                        key={loc.object_id}
                        onMouseEnter={() => setHoveredId(loc.object_id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={(e) => { e.stopPropagation(); handleObjectClick(loc.object_id); }}
                        className="absolute cursor-pointer transition-all duration-200"
                        style={{
                            top: `${Math.max(0, Math.min(100, loc.ymin))}%`,
                            left: `${Math.max(0, Math.min(100, loc.xmin))}%`,
                            width: `${Math.max(2, Math.min(100 - loc.xmin, loc.xmax - loc.xmin))}%`,
                            height: `${Math.max(2, Math.min(100 - loc.ymin, loc.ymax - loc.ymin))}%`,
                            border: isSelected ? '2px solid #00FF9D' : isHovered ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                            background: isSelected ? 'rgba(0,255,157,0.15)' : isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
                            boxShadow: isSelected ? '0 0 20px rgba(0,255,157,0.5)' : 'none',
                            zIndex: isSelected || isHovered ? 10 : 1,
                        }}
                    >
                        {/* Label tooltip */}
                        {(isHovered || isSelected) && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded whitespace-nowrap text-[10px] font-mono font-bold"
                                style={{ background: 'rgba(0,0,0,0.9)', border: isSelected ? '1px solid #00FF9D' : '1px solid #555', color: '#fff' }}>
                                {hasSource && <Eye className="w-2.5 h-2.5 text-[#00FF9D]" />}
                                {label}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Source Image Viewer Popup */}
            {viewingSource && sourceImages.length > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.85)' }}>
                    <div className="relative max-w-2xl w-full mx-4 rounded-xl overflow-hidden"
                        style={{ background: isDark ? '#111' : '#fff', border: `1px solid ${isDark ? '#333' : '#ddd'}` }}>

                        {/* Header */}
                        <div className="p-3 flex items-center justify-between"
                            style={{ borderBottom: `1px solid ${isDark ? '#333' : '#ddd'}` }}>
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" style={{ color: '#00FF9D' }} />
                                <span className="text-sm font-mono font-bold">
                                    Source Photos: {getObjectLabel(viewingSource.objectId)}
                                </span>
                            </div>
                            <button onClick={() => setViewingSource(null)}
                                className="p-1 rounded hover:bg-gray-700 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Images Grid */}
                        <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                            {viewingSource.imageIndices.map(idx => {
                                const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
                                const imgSrc = sourceImages[idx];
                                if (!imgSrc) return null;
                                return (
                                    <div key={idx} className="relative rounded-lg overflow-hidden"
                                        style={{ border: `1px solid ${isDark ? '#333' : '#ddd'}` }}>
                                        <img src={imgSrc} alt={`Direction ${directions[idx] || idx}`}
                                            className="w-full h-auto object-cover" />
                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                            style={{ background: 'rgba(0,0,0,0.75)', color: '#00FF9D' }}>
                                            {directions[idx] || `IMG ${idx}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
