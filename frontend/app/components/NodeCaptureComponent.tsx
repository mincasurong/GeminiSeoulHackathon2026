"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadCloud, CheckCircle2, Loader2, Camera } from "lucide-react";
import { api, SpatialNode, ObjectLocation } from "../lib/api";

interface NodeCaptureProps {
    onAnalysisComplete: (topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => void;
}

export default function NodeCaptureComponent({ onAnalysisComplete }: NodeCaptureProps) {
    const [files, setFiles] = useState<(File | null)[]>(Array(8).fill(null));
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");

    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const uploadedCount = files.filter(f => f !== null).length;

    const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
            const newFiles = [...files];
            for (let i = 0; i < Math.min(8, selectedFiles.length); i++) {
                newFiles[i] = selectedFiles[i];
            }
            setFiles(newFiles);
        }
    };

    const handleSingleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = [...files];
            newFiles[index] = e.target.files[0];
            setFiles(newFiles);
        }
    };

    const uploadNode = useCallback(async () => {
        if (isUploading) return;

        setIsUploading(true);
        setMessage("");

        const nodeName = `room_${Date.now().toString(36)}`;
        const formData = new FormData();
        formData.append("node_name", nodeName);

        files.forEach((file) => {
            if (file) formData.append("images", file);
        });

        try {
            setMessage("⏳ Step 1/4: Extracting topology...");
            const data = await api.uploadNode(formData);

            if (data.status === "success") {
                setMessage(`✓ ${data.message}`);
                if (data.topology && data.map_image) {
                    onAnalysisComplete(data.topology, data.map_image, data.locations || []);
                }
                setFiles(Array(8).fill(null));
            } else {
                setMessage(data.detail || "Upload failed.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Network error connecting to VLA Backend.");
        } finally {
            setIsUploading(false);
        }
    }, [files, isUploading, onAnalysisComplete]);

    // Auto-trigger when all 8 images are uploaded
    useEffect(() => {
        if (uploadedCount >= 8 && !isUploading) {
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

            {/* Status / Progress */}
            <div className="mt-2 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
                {isUploading ? (
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{message || "Processing..."}</span>
                    </div>
                ) : message ? (
                    <div className="py-2 rounded-lg" style={{ color: message.includes("✓") ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {message}
                    </div>
                ) : (
                    <div className="py-2">
                        <span style={{ color: 'var(--accent)' }}>{uploadedCount}</span>/8 images · {uploadedCount >= 8 ? 'Auto-synthesizing...' : 'Upload all 8 to begin'}
                    </div>
                )}
            </div>
        </div>
    );
}
