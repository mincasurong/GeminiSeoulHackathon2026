'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment, AdaptiveDpr, AdaptiveEvents, BakeShadows, PerformanceMonitor } from '@react-three/drei';
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
const FLOOR_WIDTH = 16;
const FLOOR_DEPTH = 9;

function VoxelMap({ mapImage }: { mapImage: string }) {
    const [voxelData, setVoxelData] = useState<{ position: [number, number, number]; color: THREE.Color; scale: number }[]>([]);

    useEffect(() => {
        if (!mapImage) return;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
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
            setVoxelData(voxels);
        };
        img.src = mapImage;
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

    return (
        <>
            <ambientLight intensity={0.65} />
            <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <Environment preset="city" />

            <VoxelMap mapImage={mapImage} />
            <ParametricPerimeterWalls topology={topology} />

            {locations?.map((loc) => {
                const isStatic = staticAnchorsMap.has(loc.object_id);
                const isSelected = selectedObjectId === loc.object_id;
                const customHeight =
                    staticAnchorsMap.get(loc.object_id)?.height_m ||
                    dynamicObjectsMap.get(loc.object_id)?.height_m;

                const widthPct = (loc.xmax - loc.xmin) / 100;
                const depthPct = (loc.ymax - loc.ymin) / 100;
                const cxPct = (loc.xmin + loc.xmax) / 2 / 100;
                const czPct = (loc.ymin + loc.ymax) / 2 / 100;

                const w = Math.max(0.4, widthPct * FLOOR_WIDTH);
                const d = Math.max(0.4, depthPct * FLOOR_DEPTH);
                const h = customHeight ? Math.max(0.5, customHeight) : isStatic ? 2.3 : 1.3;

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
                                opacity={isSelected ? 0.85 : 0.45}
                                roughness={0.15}
                                metalness={0.5}
                            />
                        </mesh>

                        {(isSelected || isStatic) && (
                            <Text
                                position={[0, h / 2 + 0.4, 0]}
                                fontSize={0.3}
                                color="white"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.05}
                                outlineColor="black"
                            >
                                {loc.object_id}
                            </Text>
                        )}
                    </group>
                );
            })}
        </>
    );
}

export default function DigitalTwin(props: DigitalTwinProps) {
    const [dpr, setDpr] = useState(1.5);
    return (
        <div className="w-full h-full bg-[#0a0a0a] relative min-h-[400px]">
            <Canvas camera={{ position: [0, 12, 12], fov: 45 }} shadows dpr={dpr} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)}>
                    <React.Suspense fallback={null}>
                        <Scene {...props} />
                        <AdaptiveDpr pixelated />
                        <AdaptiveEvents />
                        <BakeShadows />
                    </React.Suspense>
                </PerformanceMonitor>
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    maxDistance={40}
                    minDistance={2}
                    target={[0, 0, 0]}
                />
            </Canvas>

            <div className="absolute bottom-4 left-4 bg-[#111]/85 backdrop-blur border border-[#333] p-3 rounded-lg text-[10px] font-mono text-[#aaa] flex flex-col gap-2 pointer-events-none z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#38bdf8] border border-white opacity-60"></div>
                    <span>SLAM Parametric Perimeter Wall</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10b981] border border-white opacity-60"></div>
                    <span>Static Anchor (Interactive)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#f59e0b] border border-white opacity-60"></div>
                    <span>Dynamic Object (Interactive)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#00FF9D] border border-white opacity-90"></div>
                    <span>Selected Target</span>
                </div>
            </div>
        </div>
    );
}
