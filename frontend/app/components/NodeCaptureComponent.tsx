"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Loader2, Camera, Circle } from "lucide-react";
import { api, SpatialNode, ObjectLocation, EngineType } from "../lib/api";

interface NodeCaptureProps {
    onAnalysisComplete: (topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => void;
    engine: EngineType;
    onBusyChange: (busy: boolean) => void;
}

const STEPS = [
    { id: 1, label: "Extracting topology" },
    { id: 2, label: "Generating floor plan" },
    { id: 3, label: "Localizing objects" },
];

export default function NodeCaptureComponent({ onAnalysisComplete, engine, onBusyChange }: NodeCaptureProps) {
    const [files, setFiles] = useState<(File | null)[]>(Array(8).fill(null));
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1-3 = active step
    const hasAutoTriggered = useRef(false);

    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const uploadedCount = files.filter(f => f !== null).length;

    const engineLabel = engine === "gemma" ? "Gemma 4" : "Gemini";

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
        formData.append("engine", engine);

        files.forEach((file) => {
            if (file) formData.append("images", file);
        });

        // Simulate step progression since the backend processes all in one request
        const stepTimer = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < 3) return prev + 1;
                return prev;
            });
        }, engine === "gemma" ? 60_000 : 15_000); // Gemma is slower

        try {
            const data = await api.uploadNode(formData);
            clearInterval(stepTimer);
            setCurrentStep(3);

            if (data.status === "success") {
                setMessage(`Done: ${data.message}`);
                if (data.topology && data.map_image) {
                    onAnalysisComplete(data.topology, data.map_image, data.locations || []);
                }
                setFiles(Array(8).fill(null));
            } else {
                setMessage(data.detail || "Upload failed.");
            }
        } catch (err) {
            clearInterval(stepTimer);
            console.error(err);
            setMessage("Network error connecting to backend.");
        } finally {
            setIsUploading(false);
            onBusyChange(false);
            setTimeout(() => setCurrentStep(0), 3000);
        }
    }, [files, isUploading, onAnalysisComplete, engine]);

    // Auto-trigger when all 8 images are uploaded (fires only once per batch)
    useEffect(() => {
        if (uploadedCount >= 8 && !isUploading && !hasAutoTriggered.current) {
            hasAutoTriggered.current = true;
            uploadNode();
        }
    }, [uploadedCount, isUploading, uploadNode]);

    return (
        <div className="flex flex-col h-full">
            {/* Upload Area */}
            <div className="flex-1 flex items-center justify-center py-4">
                <div className="relative w-64 h-64">
                    {/* Center: Batch Upload */}
                    <label
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 cursor-pointer border-4 box-content flex flex-col items-center justify-center z-10 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-colors"
                        style={{ borderColor: 'var(--bg-primary)' }}
                        title="Batch upload 8 images"
                    >
                        <Camera className="w-6 h-6 text-white mb-0.5" />
                        <span style={{ fontSize: '8px' }} className="font-bold text-indigo-100 uppercase">Batch</span>
                        <input
                            type="file" multiple accept="image/*"
                            className="hidden" onChange={handleBatchFileChange}
                        />
                    </label>

                    {/* Ring of directional uploaders */}
                    {directions.map((dir, i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const radius = 100;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;

                        return (
                            <div key={dir} className="absolute w-14 h-14"
                                style={{ left: `calc(50% + ${x}px - 28px)`, top: `calc(50% + ${y}px - 28px)` }}>
                                <label className="w-full h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer"
                                    style={{ borderColor: files[i] ? '#6366f1' : 'var(--border-strong)', background: files[i] ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary)' }}>
                                    {files[i] ? (
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    ) : (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="font-bold">{dir}</span>
                                    )}
                                    <input type="file" className="hidden" accept="image/*"
                                        onChange={(e) => handleSingleFileChange(i, e)} />
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Progress Bar */}
            {isUploading && currentStep > 0 ? (
                <div className="mt-2 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
                        <span className="font-mono font-bold uppercase" style={{ fontSize: '10px', color: 'var(--accent)', letterSpacing: '0.1em' }}>
                            Processing with {engineLabel}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {STEPS.map(step => {
                            const isDone = currentStep > step.id;
                            const isActive = currentStep === step.id;
                            return (
                                <div key={step.id} className="flex items-center gap-2 font-mono" style={{ fontSize: '11px' }}>
                                    {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                    ) : isActive ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                    ) : (
                                        <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                                    )}
                                    <span style={{
                                        color: isDone ? 'var(--accent)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                        opacity: isDone || isActive ? 1 : 0.4,
                                        fontWeight: isActive ? 700 : 400,
                                    }}>
                                        Step {step.id}/3: {step.label}
                                        {isActive && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>...</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="mt-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                    {message ? (
                        <div className="py-2 rounded-lg" style={{ color: message.startsWith("Done") ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {message}
                        </div>
                    ) : (
                        <div className="py-2">
                            <span style={{ color: 'var(--accent)' }}>{uploadedCount}</span>/8 images
                            {' '}&middot;{' '}
                            {uploadedCount >= 8 ? 'Auto-synthesizing...' : 'Upload all 8 to begin'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
