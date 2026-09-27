"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Loader2, Camera, Circle, Compass, Sparkles } from "lucide-react";
import { api, SpatialNode, ObjectLocation } from "../lib/api";

interface NodeCaptureProps {
    onAnalysisComplete: (topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => void;
    onBusyChange: (busy: boolean) => void;
}

const STEPS = [
    { id: 1, label: "Topology & Relational Graph Extraction", model: "Gemini 3.1 Pro" },
    { id: 2, label: "Text-Bridge & 2D Blueprint Synthesis", model: "Gemini 3.1 Flash Image" },
    { id: 3, label: "Visual Object Grounding & Metric BBoxes", model: "Gemini 3.8 Flash" },
];

const compressImage = (file: File, maxDim = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }));
                        else resolve(file);
                    }, "image/jpeg", 0.8);
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

export default function NodeCaptureComponent({ onAnalysisComplete, onBusyChange }: NodeCaptureProps) {
    const [files, setFiles] = useState<(File | null)[]>(Array(8).fill(null));
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [currentStep, setCurrentStep] = useState(0);
    const hasAutoTriggered = useRef(false);

    const directions = [
        { label: "N", angle: "0°", index: 0 },
        { label: "NE", angle: "45°", index: 1 },
        { label: "E", angle: "90°", index: 2 },
        { label: "SE", angle: "135°", index: 3 },
        { label: "S", angle: "180°", index: 4 },
        { label: "SW", angle: "225°", index: 5 },
        { label: "W", angle: "270°", index: 6 },
        { label: "NW", angle: "315°", index: 7 },
    ];
    const uploadedCount = files.filter(f => f !== null).length;

    const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
            const newFiles = [...files];
            for (let i = 0; i < Math.min(8, selectedFiles.length); i++) {
                newFiles[i] = selectedFiles[i];
            }
            hasAutoTriggered.current = false;
            setFiles(newFiles);
        }
    };

    const handleSingleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = [...files];
            newFiles[index] = e.target.files[0];
            hasAutoTriggered.current = false;
            setFiles(newFiles);
        }
    };

    const uploadNode = useCallback(async () => {
        if (isUploading) return;

        setIsUploading(true);
        setMessage("");
        setCurrentStep(1);
        onBusyChange(true);

        const nodeName = `room_${Date.now().toString(36)}`;
        const formData = new FormData();
        formData.append("node_name", nodeName);
        formData.append("engine", "gemini");

        for (const file of files) {
            if (file) {
                const compressed = await compressImage(file);
                formData.append("images", compressed);
            }
        }

        // Simulate step progression timer for visual feedback
        const stepTimer = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < 3) return prev + 1;
                return prev;
            });
        }, 12_000);

        try {
            const data = await api.uploadNode(formData);
            clearInterval(stepTimer);
            setCurrentStep(3);

            if (data.status === "success") {
                setMessage(`✓ Synthesized '${data.node_name}' successfully.`);
                if (data.topology && data.map_image) {
                    onAnalysisComplete(data.topology, data.map_image, data.locations || []);
                }
                setFiles(Array(8).fill(null));
            } else {
                setMessage(data.detail || "Upload failed.");
            }
        } catch (err: any) {
            clearInterval(stepTimer);
            console.error(err);
            setMessage(err.message || "VLA pipeline processing error.");
        } finally {
            setIsUploading(false);
            onBusyChange(false);
            setTimeout(() => setCurrentStep(0), 4000);
        }
    }, [files, isUploading, onAnalysisComplete, onBusyChange]);

    // Auto-trigger when all 8 images are loaded
    useEffect(() => {
        if (uploadedCount >= 8 && !isUploading && !hasAutoTriggered.current) {
            hasAutoTriggered.current = true;
            uploadNode();
        }
    }, [uploadedCount, isUploading, uploadNode]);

    return (
        <div className="flex flex-col h-full gap-3">
            {/* 360° Circular Radar / Compass Cockpit */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center my-2">
                
                {/* SVG Radar Compass Background */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none text-slate-800" viewBox="0 0 280 280">
                    <circle cx="140" cy="140" r="130" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="140" cy="140" r="95" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                    <circle cx="140" cy="140" r="45" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                    
                    {/* Reticle Axis Lines */}
                    <line x1="140" y1="10" x2="140" y2="270" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <line x1="10" y1="140" x2="270" y2="140" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <line x1="48" y1="48" x2="232" y2="232" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                    <line x1="48" y1="232" x2="232" y2="48" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />

                    {/* Rotating Radar Sweep Line during Processing */}
                    {isUploading && (
                        <g className="radar-sweep">
                            <line x1="140" y1="140" x2="140" y2="15" stroke="#00FF9D" strokeWidth="2" strokeOpacity="0.8" />
                            <path d="M 140 140 L 140 15 A 125 125 0 0 1 228 51 Z" fill="url(#radarGradient)" opacity="0.2" />
                        </g>
                    )}

                    <defs>
                        <radialGradient id="radarGradient">
                            <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#00FF9D" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                </svg>

                {/* Center: High-Tech Batch Upload Button */}
                <label
                    className="absolute z-20 w-16 h-16 rounded-full cursor-pointer flex flex-col items-center justify-center transition-all bg-emerald-500/20 border-2 border-emerald-400 hover:bg-emerald-500/30 hover:scale-110 shadow-[0_0_20px_rgba(0,255,157,0.3)] group"
                    title="Batch upload all 8 directional photos (N → NW)"
                >
                    <Camera className="w-5 h-5 text-emerald-300 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-tighter mt-0.5">
                        BATCH
                    </span>
                    <input
                        type="file" multiple accept="image/*"
                        className="hidden" onChange={handleBatchFileChange}
                    />
                </label>

                {/* 8 Directional Satellite Nodes */}
                {directions.map((dir, i) => {
                    const angle = (i * 45 - 90) * (Math.PI / 180);
                    const radius = 98;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isLoaded = files[i] !== null;

                    return (
                        <div
                            key={dir.label}
                            className="absolute w-12 h-12 flex items-center justify-center z-10"
                            style={{
                                left: `calc(50% + ${x}px - 24px)`,
                                top: `calc(50% + ${y}px - 24px)`
                            }}
                        >
                            <label
                                className={`w-full h-full flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer ${
                                    isLoaded
                                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(0,255,157,0.25)] scale-105'
                                        : 'bg-slate-900/90 border-slate-700/80 text-slate-400 hover:border-emerald-500/50 hover:text-slate-200'
                                }`}
                                title={`Upload sector photo ${dir.label} (${dir.angle})`}
                            >
                                {isLoaded ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <span className="font-mono font-bold text-[10px]">{dir.label}</span>
                                )}
                                <span className="font-mono text-[8px] opacity-70 tracking-tighter">{dir.angle}</span>
                                <input
                                    type="file" className="hidden" accept="image/*"
                                    onChange={(e) => handleSingleFileChange(i, e)}
                                />
                            </label>
                        </div>
                    );
                })}
            </div>

            {/* Ingestion Status & Step Progress */}
            {isUploading && currentStep > 0 ? (
                <div className="rounded-xl p-3 bg-slate-900/90 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            <span className="font-mono font-bold uppercase text-xs text-emerald-400 tracking-wider">
                                VLA Multi-Model Synthesis
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Step {currentStep}/3</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        {STEPS.map(step => {
                            const isDone = currentStep > step.id;
                            const isActive = currentStep === step.id;
                            return (
                                <div key={step.id} className="flex items-center justify-between font-mono text-xs">
                                    <div className="flex items-center gap-2">
                                        {isDone ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        ) : isActive ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 opacity-40" />
                                        )}
                                        <span className={isDone ? 'text-emerald-400 font-semibold' : isActive ? 'text-slate-100 font-bold' : 'text-slate-500'}>
                                            {step.label}
                                        </span>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        {step.model}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center font-mono text-xs">
                    {message ? (
                        <div className={`py-1.5 px-3 rounded-lg border ${
                            message.startsWith("✓") 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                            {message}
                        </div>
                    ) : (
                        <div className="text-slate-400 flex items-center justify-center gap-2">
                            <span>Sensory Progress:</span>
                            <strong className="text-emerald-400 font-bold">{uploadedCount}/8 photos</strong>
                            <span className="text-slate-600">&middot;</span>
                            <span className="text-slate-400">
                                {uploadedCount >= 8 ? 'Starting synthesis...' : 'Upload 8 sectors'}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
