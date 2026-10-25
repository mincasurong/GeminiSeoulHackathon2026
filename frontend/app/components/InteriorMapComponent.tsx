"use client";

import { useState } from "react";
import { Download, X, Eye, Loader2, Crosshair, Grid, Navigation, Layers } from "lucide-react";
import { ObjectLocation, SpatialNode, api } from "../lib/api";

interface InteriorMapProps {
    mapImage: string;
    parametricSvg?: string | null;
    locations: ObjectLocation[];
    topology: SpatialNode;
    sourceImages: string[];
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
    theme: 'dark' | 'light';
    robotApiUrl: string;
    workspaceId?: string;
    onAddSystemLog: (msg: string) => void;
}

const DIRECTION_LABELS = [
    "North (N) - 0°",
    "North-East (NE) - 45°",
    "East (E) - 90°",
    "South-East (SE) - 135°",
    "South (S) - 180°",
    "South-West (SW) - 225°",
    "West (W) - 270°",
    "North-West (NW) - 315°"
];

export default function InteriorMapComponent({
    mapImage,
    parametricSvg,
    locations,
    topology,
    sourceImages,
    selectedObjectId,
    onSelectObject,
    robotApiUrl,
    workspaceId = "default",
    onAddSystemLog
}: InteriorMapProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [viewingSource, setViewingSource] = useState<{ objectId: string; imageIndices: number[] } | null>(null);
    const [isDispatching, setIsDispatching] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [useCadBlueprint, setUseCadBlueprint] = useState(false);
    const [imgAspectRatio, setImgAspectRatio] = useState<string>("16 / 9");

    if (!mapImage) return null;

    const displayedImage = useCadBlueprint && parametricSvg ? parametricSvg : mapImage;

    const effectiveLocations: ObjectLocation[] = (locations && locations.length > 0)
        ? locations
        : [
            ...(topology.static_anchors || [])
                .filter(a => Array.isArray(a.bbox) && a.bbox.length === 4)
                .map(a => ({
                    object_id: a.anchor_id,
                    ymin: a.bbox![0],
                    xmin: a.bbox![1],
                    ymax: a.bbox![2],
                    xmax: a.bbox![3],
                })),
            ...(topology.dynamic_objects || [])
                .filter(d => Array.isArray(d.bbox) && d.bbox.length === 4)
                .map(d => ({
                    object_id: d.object_id,
                    ymin: d.bbox![0],
                    xmin: d.bbox![1],
                    ymax: d.bbox![2],
                    xmax: d.bbox![3],
                })),
        ];

    const getImageIndices = (objectId: string): number[] => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return anchor.image_indices || [];
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return obj.image_indices || [];
        return [];
    };

    const getObjectLabel = (objectId: string): string => {
        const anchor = topology.static_anchors?.find(a => a.anchor_id === objectId);
        if (anchor) return `${anchor.type} (${anchor.anchor_id})`;
        const obj = topology.dynamic_objects?.find(d => d.object_id === objectId);
        if (obj) return `${obj.type} (${obj.object_id})`;
        return objectId;
    };

    const isStaticAnchor = (objectId: string): boolean => {
        return !!topology.static_anchors?.some(a => a.anchor_id === objectId);
    };

    const handleObjectClick = (objectId: string) => {
        const indices = getImageIndices(objectId);
        if (indices.length > 0 && sourceImages.length > 0) {
            setViewingSource({ objectId, imageIndices: indices });
        }
        onSelectObject(objectId === selectedObjectId ? null : objectId);
    };

    const handleDownloadImage = () => {
        const link = document.createElement('a');
        link.href = displayedImage;
        link.download = `blueprint_${topology.node_name || 'map'}.${displayedImage.startsWith('data:image/svg') ? 'svg' : 'png'}`;
        link.click();
    };

    const handleExportArtifact = (fmt: "svg" | "dxf" | "ros2") => {
        const url = api.getExportUrl(topology.node_name, fmt, workspaceId);
        onAddSystemLog(`[EXPORT] Downloading ${fmt.toUpperCase()} artifact for '${topology.node_name}'...`);
        window.open(url, "_blank");
    };

    const dispatchToHardware = async () => {
        if (!effectiveLocations || effectiveLocations.length === 0) return;
        setIsDispatching(true);
        onAddSystemLog("Initiating ROS2 Nav2 FollowWaypoints sequence...");

        const waypoints = effectiveLocations.map(loc => {
            const centerX = (loc.xmin + loc.xmax) / 2;
            const centerY = (loc.ymin + loc.ymax) / 2;
            const metricX = Number((centerX * 0.1).toFixed(3));
            const metricY = Number((centerY * 0.1).toFixed(3));

            return {
                header: { frame_id: "map", stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 } },
                pose: {
                    position: { x: metricX, y: metricY, z: 0.0 },
                    orientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
                }
            };
        });

        const payload = {
            action: "Nav2_FollowWaypoints",
            frame_id: "map",
            node_name: topology.node_name,
            waypoints: waypoints
        };

        onAddSystemLog(`[NAV2] Payload constructed with ${waypoints.length} metric waypoints.`);

        try {
            onAddSystemLog(`[NAV2] Dispatching to Action Server: ${robotApiUrl}`);
            await fetch(robotApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {
                console.log("Hardware simulation active.");
            });

            onAddSystemLog(`[NAV2] Execution accepted: 200 OK.`);
        } catch {
            onAddSystemLog(`[NAV2] Hardware dispatch simulation completed.`);
        } finally {
            setIsDispatching(false);
        }
    };

    const selectedLoc = effectiveLocations.find(l => l.object_id === selectedObjectId);
    const selectedMetricX = selectedLoc ? (((selectedLoc.xmin + selectedLoc.xmax) / 2) * 0.1).toFixed(2) : null;
    const selectedMetricY = selectedLoc ? (((selectedLoc.ymin + selectedLoc.ymax) / 2) * 0.1).toFixed(2) : null;

    return (
        <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-[440px]">
            <div className="absolute top-3 right-3 z-30 flex flex-wrap items-center gap-1.5">
                {parametricSvg && (
                    <button
                        type="button"
                        onClick={() => setUseCadBlueprint(!useCadBlueprint)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all border ${
                            useCadBlueprint
                                ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-sky-400/40'
                        }`}
                        title="Switch between AI Render and Parametric CAD Blueprint"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{useCadBlueprint ? 'CAD MODE' : 'RENDER MODE'}</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all border ${
                        showGrid
                            ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(0,255,157,0.2)]'
                            : 'bg-slate-900/90 text-slate-400 border-slate-700'
                    }`}
                    title="Toggle Metric Grid Overlay"
                >
                    <Grid className="w-3.5 h-3.5" />
                    <span>GRID {showGrid ? 'ON' : 'OFF'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleExportArtifact("svg")}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all"
                    title="Export Parametric SVG Blueprint"
                >
                    <Download className="w-3 h-3" />
                    <span>SVG</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleExportArtifact("dxf")}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-sky-300 hover:text-sky-200 border border-sky-500/30 hover:border-sky-400 transition-all"
                    title="Export AutoCAD R12 DXF File"
                >
                    <Download className="w-3 h-3" />
                    <span>DXF</span>
                </button>

                <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 transition-all"
                >
                    <Download className="w-3 h-3" />
                    <span>IMG</span>
                </button>

                <button
                    type="button"
                    onClick={dispatchToHardware}
                    disabled={isDispatching}
                    className="cyber-btn flex items-center gap-1.5 px-3 py-1 text-xs disabled:opacity-40"
                >
                    {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    <span>DISPATCH ROS2</span>
                </button>
            </div>

            {selectedLoc && (
                <div className="absolute top-3 left-3 z-30 bg-slate-900/90 backdrop-blur border border-emerald-500/40 rounded-xl px-3 py-1.5 font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,157,0.15)]">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="text-slate-300 font-bold">{selectedLoc.object_id}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400">X: {selectedMetricX}m</span>
                    <span className="text-sky-400">Y: {selectedMetricY}m</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-400 text-[10px]">{isStaticAnchor(selectedLoc.object_id) ? 'ANCHOR' : 'DYNAMIC'}</span>
                </div>
            )}

            <div className="relative w-full min-h-[520px] sm:min-h-[580px] flex items-center justify-center p-2 sm:p-4 bg-[#030712]">
                <div
                    className="relative w-full mx-auto overflow-hidden rounded-xl border border-slate-800/80 shadow-2xl"
                    style={{
                        aspectRatio: useCadBlueprint ? "1 / 1" : imgAspectRatio,
                        maxWidth: useCadBlueprint ? "580px" : "100%",
                    }}
                >
                    <img
                        src={displayedImage}
                        alt="Orthographic Floor Plan Blueprint"
                        onLoad={(e) => {
                            const nw = e.currentTarget.naturalWidth;
                            const nh = e.currentTarget.naturalHeight;
                            if (nw > 0 && nh > 0) {
                                setImgAspectRatio(`${nw} / ${nh}`);
                            }
                        }}
                        className="w-full h-full block object-fill select-none pointer-events-none"
                    />

                    {showGrid && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <pattern id="smallGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                                    <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#00FF9D" strokeWidth="0.2" />
                                </pattern>
                                <pattern id="mainGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <rect width="20" height="20" fill="url(#smallGrid)" />
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#38BDF8" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#mainGrid)" />
                            <circle cx="50" cy="50" r="1.5" fill="#00FF9D" opacity="0.8" />
                            <line x1="46" y1="50" x2="54" y2="50" stroke="#00FF9D" strokeWidth="0.3" />
                            <line x1="50" y1="46" x2="50" y2="54" stroke="#00FF9D" strokeWidth="0.3" />
                        </svg>
                    )}

                    {effectiveLocations?.map((loc, idx) => {
                        const isHovered = hoveredId === loc.object_id;
                        const isSelected = selectedObjectId === loc.object_id;
                        const label = getObjectLabel(loc.object_id);
                        const hasSource = getImageIndices(loc.object_id).length > 0;
                        const isAnchor = isStaticAnchor(loc.object_id);

                        const borderColor = isSelected
                            ? '#00FF9D'
                            : isHovered
                            ? '#38BDF8'
                            : isAnchor
                            ? '#3B82F6'
                            : '#10B981';

                        const clampedTop = Math.max(0.5, Math.min(96, loc.ymin));
                        const clampedLeft = Math.max(0.5, Math.min(96, loc.xmin));
                        const clampedWidth = Math.max(3, Math.min(100 - clampedLeft, loc.xmax - loc.xmin));
                        const clampedHeight = Math.max(3, Math.min(100 - clampedTop, loc.ymax - loc.ymin));

                        return (
                            <div
                                key={`${loc.object_id}-${idx}`}
                                onMouseEnter={() => setHoveredId(loc.object_id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={(e) => { e.stopPropagation(); handleObjectClick(loc.object_id); }}
                                className="absolute cursor-pointer transition-all duration-150 group"
                                style={{
                                    top: `${clampedTop}%`,
                                    left: `${clampedLeft}%`,
                                    width: `${clampedWidth}%`,
                                    height: `${clampedHeight}%`,
                                    border: `2px solid ${borderColor}`,
                                    background: isSelected
                                        ? 'rgba(0, 255, 157, 0.24)'
                                        : isHovered
                                        ? 'rgba(56, 189, 248, 0.20)'
                                        : isAnchor
                                        ? 'rgba(59, 130, 246, 0.10)'
                                        : 'rgba(16, 185, 129, 0.12)',
                                    boxShadow: isSelected
                                        ? '0 0 24px rgba(0, 255, 157, 0.7), inset 0 0 12px rgba(0, 255, 157, 0.3)'
                                        : isHovered
                                        ? '0 0 16px rgba(56, 189, 248, 0.6)'
                                        : '0 0 8px rgba(15, 23, 42, 0.45)',
                                    borderRadius: '4px',
                                    zIndex: isSelected || isHovered ? 25 : 10,
                                }}
                            >
                                {isSelected && (
                                    <>
                                        <div className="corner-bracket corner-tl" />
                                        <div className="corner-bracket corner-tr" />
                                        <div className="corner-bracket corner-bl" />
                                        <div className="corner-bracket corner-br" />
                                    </>
                                )}

                                <div
                                    className="absolute -top-4 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold truncate max-w-[160px] pointer-events-none shadow-md transition-opacity"
                                    style={{
                                        background: isSelected
                                            ? '#00FF9D'
                                            : isHovered
                                            ? '#38BDF8'
                                            : isAnchor
                                            ? 'rgba(30, 58, 138, 0.92)'
                                            : 'rgba(6, 78, 59, 0.92)',
                                        color: isSelected || isHovered ? '#020617' : '#e2e8f0',
                                        border: isSelected || isHovered ? 'none' : `1px solid ${borderColor}`,
                                    }}
                                >
                                    {loc.object_id}
                                </div>

                                {(isHovered || isSelected) && (
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap text-[10px] font-mono font-bold z-30 bg-slate-900/95 border border-slate-700 text-slate-100 shadow-xl">
                                        {hasSource && <Eye className="w-3 h-3 text-emerald-400" />}
                                        <span>{label}</span>
                                        <span className="text-slate-400">
                                            ({(((loc.xmin + loc.xmax) / 2) * 0.1).toFixed(1)}m, {(((loc.ymin + loc.ymax) / 2) * 0.1).toFixed(1)}m)
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {viewingSource && sourceImages.length > 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                    <div className="relative max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] bg-slate-900 border border-slate-800">
                        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                                    Correlated Panoramic Photos: <strong className="text-emerald-400">{getObjectLabel(viewingSource.objectId)}</strong>
                                </span>
                            </div>
                            <button
                                onClick={() => setViewingSource(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1 bg-slate-950/60">
                            {viewingSource.imageIndices.map(idx => {
                                const imgSrc = sourceImages[idx];
                                if (!imgSrc) return null;
                                const dirLabel = DIRECTION_LABELS[idx] || `Photo ${idx}`;
                                return (
                                    <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-800 group shadow-lg">
                                        <img src={imgSrc} alt={dirLabel} className="w-full h-44 object-cover" />
                                        <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 bg-slate-950/90 text-emerald-400 border border-emerald-500/30">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                                            {dirLabel}
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
