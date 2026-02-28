'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Interfaces matching the backend output
interface SpatialNode {
    node_name: string;
    static_anchors: { anchor_id: string; type: string; description: string; image_indices: number[] }[];
    dynamic_objects: { object_id: string; type: string; description: string; image_indices: number[] }[];
    navigable_edges: { edge_id: string; description: string; visual_cue: string }[];
}

interface ObjectLocation {
    object_id: string;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
}

interface DigitalTwinProps {
    mapImage: string;
    locations: ObjectLocation[];
    topology: SpatialNode;
    selectedObjectId: string | null;
    onSelectObject: (id: string | null) => void;
}

const GRID_SIZE = 128; // High resolution voxel grid
const FLOOR_WIDTH = 16;
const FLOOR_DEPTH = 9;

function VoxelMap({ mapImage }: { mapImage: string }) {
    const [voxelData, setVoxelData] = useState<{ position: [number, number, number], color: THREE.Color, scale: number }[]>([]);

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

                    // Calculate brightness (0-255)
                    const brightness = (r + g + b) / 3;

                    // Invert brightness for height: darker = taller (walls/lines), lighter = flat (floor)
                    let normalizedHeight = 1.0 - (brightness / 255);

                    // Enhance contrast: make walls pop, keep floor flat
                    if (normalizedHeight < 0.2) {
                        normalizedHeight = 0.05; // Floor
                    } else {
                        normalizedHeight = Math.pow(normalizedHeight, 1.5) * 3; // Walls/Objects
                    }

                    const height = Math.max(0.1, normalizedHeight);

                    const px = (x / canvas.width - 0.5) * FLOOR_WIDTH + (voxelWidth / 2);
                    const pz = (y / canvas.height - 0.5) * FLOOR_DEPTH + (voxelDepth / 2);
                    const py = height / 2;

                    voxels.push({
                        position: [px, py, pz] as [number, number, number],
                        // Use the actual color from the image, slightly darkened for depth
                        color: new THREE.Color(`rgb(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)})`),
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
                dummy.scale.set(voxelWidth * 0.85, voxel.scale, voxelDepth * 0.85);
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
            <meshStandardMaterial roughness={0.9} metalness={0.1} />
        </instancedMesh>
    );
}

function Scene({ mapImage, locations, topology, selectedObjectId, onSelectObject }: DigitalTwinProps) {
    const staticAnchorIds = useMemo(() => new Set(topology?.static_anchors?.map(a => a.anchor_id) || []), [topology]);

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <Environment preset="city" />

            {/* Voxel Generated Map */}
            <VoxelMap mapImage={mapImage} />

            {/* Interactive Objects Overlay */}
            {locations?.map((loc) => {
                const isStatic = staticAnchorIds.has(loc.object_id);
                const isSelected = selectedObjectId === loc.object_id;

                const widthPct = (loc.xmax - loc.xmin) / 100;
                const depthPct = (loc.ymax - loc.ymin) / 100;
                const cxPct = (loc.xmin + loc.xmax) / 2 / 100;
                const czPct = (loc.ymin + loc.ymax) / 2 / 100;

                const w = Math.max(0.4, widthPct * FLOOR_WIDTH);
                const d = Math.max(0.4, depthPct * FLOOR_DEPTH);
                const h = isStatic ? 2.5 : 1.5;

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
                                color={isSelected ? '#00FF9D' : (isStatic ? '#008000' : '#FFA500')}
                                transparent
                                opacity={isSelected ? 0.8 : 0.3}
                                roughness={0.1}
                                metalness={0.5}
                            />
                        </mesh>

                        {/* Label */}
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
    return (
        <div className="w-full h-full bg-[#0a0a0a] relative min-h-[400px]">
            <Canvas camera={{ position: [0, 12, 12], fov: 45 }} shadows>
                <React.Suspense fallback={null}>
                    <Scene {...props} />
                </React.Suspense>
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    maxDistance={40}
                    minDistance={2}
                    target={[0, 0, 0]}
                />
            </Canvas>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-[#111]/80 backdrop-blur border border-[#333] p-3 rounded-lg text-[10px] font-mono text-[#888] flex flex-col gap-2 pointer-events-none z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#008000] border border-white opacity-60"></div>
                    <span>Static Anchor (Interactive)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#FFA500] border border-white opacity-60"></div>
                    <span>Dynamic Object (Interactive)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#00FF9D] border border-white opacity-90"></div>
                    <span>Selected</span>
                </div>
            </div>
        </div>
    );
}
