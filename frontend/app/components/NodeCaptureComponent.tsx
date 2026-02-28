"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle2, Loader2, Camera } from "lucide-react";
import { api, SpatialNode, ObjectLocation } from "../lib/api";

interface NodeCaptureProps {
    onAnalysisComplete: (topology: SpatialNode, mapImage: string, locations: ObjectLocation[]) => void;
}

export default function NodeCaptureComponent({ onAnalysisComplete }: NodeCaptureProps) {
    const [nodeName, setNodeName] = useState("");
    const [files, setFiles] = useState<(File | null)[]>(Array(8).fill(null));
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState("");

    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Convert FileList to Array and sort by name
            const selectedFiles = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));

            const newFiles = [...files];
            // Fill up to 8 slots with the sorted files
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

    const uploadNode = async () => {
        if (!nodeName) {
            setMessage("Please provide a node name.");
            return;
        }

        setIsUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("node_name", nodeName);

        // Only append valid uploaded files
        let hasValidImages = false;
        files.forEach((file) => {
            if (file) {
                formData.append("images", file);
                hasValidImages = true;
            }
        });

        if (!hasValidImages) {
            setMessage("Please upload at least one valid image for VLA analysis.");
            setIsUploading(false);
            return;
        }

        try {
            setMessage("⏳ Step 1/3: Extracting topology...");
            const data = await api.uploadNode(formData);

            if (data.status === "success") {
                setMessage(`✓ ${data.message}`);

                // Call onAnalysisComplete with the 3-step pipeline results
                if (data.topology && data.map_image) {
                    onAnalysisComplete(data.topology, data.map_image, data.locations || []);
                }

                setFiles(Array(8).fill(null));
                setNodeName("");
            } else {
                setMessage(data.detail || "Upload failed.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Network error connecting to VLA Backend.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Node Identifier</label>
                <input
                    type="text"
                    className="w-full bg-gray-950 border border-gray-800 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="e.g. living_room_center"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                />
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
                {/* Octagonal layout simulation */}
                <div className="relative w-64 h-64">
                    {/* Center Icon (Batch Upload) */}
                    <label
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 cursor-pointer border-4 box-content border-gray-950 flex flex-col items-center justify-center z-10 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-colors"
                        title="Batch upload 8 images"
                    >
                        <Camera className="w-6 h-6 text-white mb-0.5" />
                        <span style={{ fontSize: '8px' }} className="font-bold text-indigo-100 uppercase">Batch</span>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleBatchFileChange}
                        />
                    </label>

                    {/* Ring of single uploaders */}
                    {directions.map((dir, i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const radius = 100;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;

                        return (
                            <div
                                key={dir}
                                className="absolute w-14 h-14"
                                style={{
                                    left: `calc(50% + ${x}px - 28px)`,
                                    top: `calc(50% + ${y}px - 28px)`,
                                }}
                            >
                                <label className={`w-full h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer ${files[i] ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800'}`}>
                                    {files[i] ? (
                                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                    ) : (
                                        <span style={{ fontSize: '10px' }} className="font-bold text-gray-500">{dir}</span>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleSingleFileChange(i, e)}
                                    />
                                </label>
                            </div>
                        );
                    })}
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded border text-sm mb-4 ${message.includes("error") || message.includes("failed") ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-emerald-900/20 border-emerald-800/50 text-emerald-400"}`}>
                    {message}
                </div>
            )}

            <button
                onClick={uploadNode}
                disabled={isUploading}
                className="mt-auto w-full py-3 rounded-md bg-white text-gray-900 font-semibold shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center disabled:opacity-70"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin text-gray-600" />
                        Processing Node...
                    </>
                ) : (
                    <>
                        <UploadCloud className="w-5 h-5 mr-2 text-gray-700" />
                        Synthesize Environment
                    </>
                )}
            </button>
        </div>
    );
}
