"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface RobotSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiUrl: string;
    onSave: (url: string) => void;
}

export default function RobotSettingsModal({ isOpen, onClose, apiUrl, onSave }: RobotSettingsModalProps) {
    const [url, setUrl] = useState(apiUrl);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', backdropFilter: 'blur(16px)' }}>

                {/* Header */}
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <span>🤖</span>
                        <h3 className="font-mono font-bold uppercase tracking-wider">Robot Configuration</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity">
                        <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="block font-mono font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                            ROS2 Nav2 API Endpoint
                        </label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full rounded-lg px-4 py-3 font-mono focus:outline-none focus:ring-2 transition-all"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', focusRingColor: 'var(--accent)' }}
                            placeholder="http://localhost:8080/nav2/follow_waypoints"
                        />
                    </div>

                    <div className="rounded-lg p-3" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)' }}>
                        <p className="font-mono" style={{ color: 'var(--text-muted)' }}>
                            This endpoint receives Nav2 <code>FollowWaypoints</code> action payloads with PoseStamped waypoints translated from the 2D map coordinates.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={onClose}
                        className="px-4 py-2 rounded-lg font-mono font-bold transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave}
                        className="px-4 py-2 rounded-lg font-mono font-bold flex items-center gap-2 transition-all"
                        style={{ background: 'var(--accent)', color: '#000' }}>
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
