'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, AdaptiveDpr, AdaptiveEvents, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SpatialNode, ObjectLocation } from '../lib/api';

interface DigitalTwinProps {
    mapImage: string;
    locations: ObjectLocation[];
    topology: SpatialNode;
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
}

const GRID_SIZE = 128;
const FLOOR_WIDTH = 22;
const FLOOR_DEPTH = 13.5;

function VoxelMap({ mapImage }: { mapImage: string }) {
    const [voxelData, setVoxelData] = useState<{ position: [number, number, number]; color: THREE.Color; scale: number }[]>([]);

    useEffect(() => {
        if (!mapImage) return;
        let cancelled = false;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            if (cancelled) return;
            const canvas = document.createElement('canvas');
            canvas.width = GRID_SIZE;
            canvas.height = Math.floor(GRID_SIZE * (FLOOR_DEPTH / FLOOR_WIDTH));
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            const voxels = [];
            const voxelWidth = FLOOR_WIDTH / canvas.width;
            const voxelDepth = FLOOR_DEPTH / canvas.height;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];

                    const brightness = (r + g + b) / 3;
                    const darkness = 1.0 - brightness / 255;
                    const height = darkness > 0.78 ? 0.45 : 0.08 + darkness * 0.14;

                    const px = (x / canvas.width - 0.5) * FLOOR_WIDTH + voxelWidth / 2;
                    const pz = (y / canvas.height - 0.5) * FLOOR_DEPTH + voxelDepth / 2;
                    const py = height / 2;

                    voxels.push({
                        position: [px, py, pz] as [number, number, number],
                        color: new THREE.Color(`rgb(${Math.max(12, r)},${Math.max(18, g)},${Math.max(28, b)})`),
                        scale: height
                    });
                }
            }
            if (!cancelled) {
                setVoxelData(voxels);
            }
        };
        img.src = mapImage;
        return () => {
            cancelled = true;
        };
    }, [mapImage]);

    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (meshRef.current && voxelData.length > 0) {
            const voxelWidth = FLOOR_WIDTH / GRID_SIZE;
            const voxelDepth = FLOOR_DEPTH / Math.floor(GRID_SIZE * (FLOOR_DEPTH / FLOOR_WIDTH));

            voxelData.forEach((voxel, i) => {
                dummy.position.set(...voxel.position);
                dummy.scale.set(voxelWidth * 0.9, voxel.scale, voxelDepth * 0.9);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                meshRef.current!.setColorAt(i, voxel.color);
            });
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [voxelData, dummy]);

    if (voxelData.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, voxelData.length]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial roughness={0.85} metalness={0.15} />
        </instancedMesh>
    );
}

function ParametricPerimeterWalls({ topology }: { topology: SpatialNode }) {
    const wallSegments = useMemo(() => {
        let poly = topology?.room_geometry?.polygon_points;
        if (!poly || poly.length < 3) {
            const kps = topology?.seam_keypoints || [];
            if (kps.length >= 3) {
                const sorted = [...kps].sort((a, b) => a.bearing_degrees - b.bearing_degrees);
                poly = sorted.map((kp) => {
                    const rad = ((kp.bearing_degrees - 90) * Math.PI) / 180;
                    const distPct = Math.min(44, 28 + ((kp.estimated_distance_m || 3.8) / 5.0) * 14);
                    return [50 + distPct * Math.cos(rad), 50 + distPct * Math.sin(rad)];
                });
            } else {
                poly = [[10, 10], [90, 10], [90, 90], [10, 90]];
            }
        }

        const segments: { cx: number; cz: number; len: number; angle: number }[] = [];
        for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i];
            const p2 = poly[(i + 1) % poly.length];
            const x1 = (p1[0] / 100 - 0.5) * FLOOR_WIDTH;
            const z1 = (p1[1] / 100 - 0.5) * FLOOR_DEPTH;
            const x2 = (p2[0] / 100 - 0.5) * FLOOR_WIDTH;
            const z2 = (p2[1] / 100 - 0.5) * FLOOR_DEPTH;
            const dx = x2 - x1;
            const dz = z2 - z1;
            const len = Math.hypot(dx, dz);
            if (len < 0.1) continue;
            segments.push({
                cx: (x1 + x2) / 2,
                cz: (z1 + z2) / 2,
                len,
                angle: -Math.atan2(dz, dx),
            });
        }
        return segments;
    }, [topology]);

    const wallHeight = 2.6;

    return (
        <group>
            {wallSegments.map((seg, i) => (
                <mesh
                    key={`wall-${i}`}
                    position={[seg.cx, wallHeight / 2, seg.cz]}
                    rotation={[0, seg.angle, 0]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[seg.len, wallHeight, 0.16]} />
                    <meshStandardMaterial
                        color="#38bdf8"
                        transparent
                        opacity={0.22}
                        roughness={0.2}
                        metalness={0.6}
                    />
                </mesh>
            ))}
        </group>
    );
}

function Scene({ mapImage, locations, topology, selectedObjectId, onSelectObject }: DigitalTwinProps) {
    useEffect(() => {
        return () => {
            document.body.style.cursor = 'auto';
        };
    }, []);

    const staticAnchorsMap = useMemo(() => {
        const m = new Map<string, { height_m?: number }>();
        topology?.static_anchors?.forEach(a => m.set(a.anchor_id, a));
        return m;
    }, [topology]);

    const dynamicObjectsMap = useMemo(() => {
        const m = new Map<string, { height_m?: number }>();
        topology?.dynamic_objects?.forEach(d => m.set(d.object_id, d));
        return m;
    }, [topology]);

    const effectiveLocations = useMemo<ObjectLocation[]>(() => {
        if (locations && locations.length > 0) return locations;
        const fallback: ObjectLocation[] = [];
        topology?.static_anchors?.forEach(a => {
            if (Array.isArray(a.bbox) && a.bbox.length === 4) {
                fallback.push({
                    object_id: a.anchor_id,
                    ymin: a.bbox[0],
                    xmin: a.bbox[1],
                    ymax: a.bbox[2],
                    xmax: a.bbox[3],
                });
            }
        });
        topology?.dynamic_objects?.forEach(d => {
            if (Array.isArray(d.bbox) && d.bbox.length === 4) {
                fallback.push({
                    object_id: d.object_id,
                    ymin: d.bbox[0],
                    xmin: d.bbox[1],
                    ymax: d.bbox[2],
                    xmax: d.bbox[3],
                });
            }
        });
        return fallback;
    }, [locations, topology]);

    return (
        <>
            <ambientLight intensity={0.85} />
            <hemisphereLight args={['#e2e8f0', '#0f172a', 0.9]} />
            <directionalLight position={[12, 18, 12]} intensity={1.35} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[0, 10, 0]} intensity={0.6} color="#38bdf8" />

            <Grid
                position={[0, -0.02, 0]}
                args={[FLOOR_WIDTH + 6, FLOOR_DEPTH + 6]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#1e293b"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#0ea5e9"
                fadeDistance={36}
                fadeStrength={1}
            />

            <VoxelMap mapImage={mapImage} />
            <ParametricPerimeterWalls topology={topology} />

            {effectiveLocations?.map((loc) => {
                const isStatic = staticAnchorsMap.has(loc.object_id);
                const isSelected = selectedObjectId === loc.object_id;
                const customHeight =
                    staticAnchorsMap.get(loc.object_id)?.height_m ||
                    dynamicObjectsMap.get(loc.object_id)?.height_m;

                const widthPct = (loc.xmax - loc.xmin) / 100;
                const depthPct = (loc.ymax - loc.ymin) / 100;
                const cxPct = (loc.xmin + loc.xmax) / 2 / 100;
                const czPct = (loc.ymin + loc.ymax) / 2 / 100;

                const w = Math.max(0.5, widthPct * FLOOR_WIDTH);
                const d = Math.max(0.5, depthPct * FLOOR_DEPTH);
                const h = customHeight ? Math.max(0.6, customHeight) : isStatic ? 2.3 : 1.4;

                const x = (cxPct - 0.5) * FLOOR_WIDTH;
                const z = (czPct - 0.5) * FLOOR_DEPTH;
                const y = h / 2;

                return (
                    <group key={loc.object_id} position={[x, y, z]}>
                        <mesh
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectObject(isSelected ? null : loc.object_id);
                            }}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                document.body.style.cursor = 'pointer';
                            }}
                            onPointerOut={(e) => {
                                e.stopPropagation();
                                document.body.style.cursor = 'auto';
                            }}
                        >
                            <boxGeometry args={[w, h, d]} />
                            <meshStandardMaterial
                                color={isSelected ? '#00FF9D' : isStatic ? '#10b981' : '#f59e0b'}
                                transparent
                                opacity={isSelected ? 0.88 : 0.52}
                                roughness={0.2}
                                metalness={0.45}
                            />
                        </mesh>

                        <Text
                            position={[0, h / 2 + 0.42, 0]}
                            fontSize={0.34}
                            color={isSelected ? '#00FF9D' : '#f8fafc'}
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.05}
                            outlineColor="#020617"
                        >
                            {loc.object_id}
                        </Text>
                    </group>
                );
            })}
        </>
    );
}

export default function DigitalTwin(props: DigitalTwinProps) {
    const controlsRef = useRef<any>(null);

    const handleResetCamera = (preset: 'iso' | 'top') => {
        if (!controlsRef.current) return;
        const ctrl = controlsRef.current;
        if (preset === 'top') {
            ctrl.object.position.set(0, 16.5, 0.01);
            ctrl.target.set(0, 0, 0);
        } else {
            ctrl.object.position.set(0, 9.2, 8.2);
            ctrl.target.set(0, 0.4, 0.3);
        }
        ctrl.update();
    };

    return (
        <div
            className="w-full h-[580px] sm:h-[640px] bg-[#030712] relative overflow-hidden"
            style={{ width: '100%', height: '620px' }}
        >
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => handleResetCamera('iso')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-bold cursor-pointer shadow-lg"
                >
                    3D FIT SCREEN
                </button>
                <button
                    type="button"
                    onClick={() => handleResetCamera('top')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-500/40 font-mono text-[11px] font-bold cursor-pointer shadow-lg"
                >
                    TOP-DOWN 90°
                </button>
            </div>

            <Canvas
                style={{ width: '100%', height: '100%', display: 'block' }}
                camera={{ position: [0, 9.2, 8.2], fov: 52 }}
                shadows
                dpr={[1, 1.75]}
                gl={{ antialias: true, powerPreference: "high-performance" }}
            >
                <React.Suspense fallback={null}>
                    <Scene {...props} />
                    <AdaptiveDpr pixelated />
                    <AdaptiveEvents />
                </React.Suspense>
                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2 - 0.04}
                    maxDistance={32}
                    minDistance={3}
                    target={[0, 0.4, 0.3]}
                />
            </Canvas>

            <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur border border-slate-800 p-3 rounded-xl text-[10px] font-mono text-slate-300 flex flex-col gap-1.5 pointer-events-none z-10 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-[#38bdf8] border border-white/60 opacity-80"></div>
                    <span>SLAM Parametric Perimeter Wall</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-[#10b981] border border-white/60 opacity-85"></div>
                    <span>Static Anchor (Click to Inspect)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-[#f59e0b] border border-white/60 opacity-85"></div>
                    <span>Dynamic Object (Click to Inspect)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-xs bg-[#00FF9D] border border-white opacity-95"></div>
                    <span>Selected Target</span>
                </div>
            </div>
        </div>
    );
}
