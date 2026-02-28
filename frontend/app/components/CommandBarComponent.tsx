"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, MessageSquare, Loader2 } from "lucide-react";
import { api, SpatialNode } from "../lib/api";

interface CommandBarProps {
    topology: SpatialNode | null;
    systemLogs: string[];
}

export default function CommandBarComponent({ topology, systemLogs }: CommandBarProps) {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [systemLogs, showTerminal]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatting]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !topology || isChatting) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
        setChatHistory(newHistory);
        setIsChatting(true);

        try {
            const data = await api.chat(userMsg, topology.node_name, newHistory);
            setChatHistory(prev => [...prev, { role: 'model', text: data.response || "No response." }]);
        } catch (err) {
            console.error("Chat error:", err);
            setChatHistory(prev => [...prev, { role: 'model', text: "System Error: VLA offline." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="flex flex-col h-full rounded-xl overflow-hidden min-h-[300px] max-h-[400px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
            <div className="p-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <h3 className="font-mono font-bold uppercase" style={{ color: 'var(--text-primary)' }}>Spatial Query Interface</h3>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold transition-all"
                        style={{
                            background: showTerminal ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: showTerminal ? '#000' : 'var(--text-muted)',
                            border: `1px solid ${showTerminal ? 'var(--accent)' : 'var(--border)'}`
                        }}
                    >
                        <Terminal className="w-3 h-3" />
                        TERMINAL {showTerminal ? 'ON' : 'OFF'}
                    </button>

                    {!topology ? (
                        <div className="font-mono px-2 py-1 rounded"
                            style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            AWAITING TOPOLOGY CONTEXT
                        </div>
                    ) : (
                        <div className="font-mono px-2 py-1 rounded"
                            style={{ fontSize: '10px', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--border)' }}>
                            CONTEXT: {topology.node_name}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
                style={{ background: 'var(--bg-primary)' }}>
                {chatHistory.length === 0 && (
                    <div className="font-mono text-center my-auto flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Terminal className="w-8 h-8 opacity-20" />
                        <p>Ask questions about the extracted environment...</p>
                        <p style={{ fontSize: '12px' }}>E.g., &quot;Where is the microwave?&quot;</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[85%] p-3 rounded-lg font-mono leading-relaxed"
                            style={msg.role === 'user'
                                ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--border-strong)' }
                                : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                            }>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="p-3 rounded-lg flex items-center gap-2"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                            <span className="font-mono" style={{ color: 'var(--text-muted)' }}>Querying VLA...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* System Terminal Overlay */}
            {showTerminal && (
                <div className="h-32 overflow-y-auto p-3 font-mono text-[10px] space-y-1 animate-in slide-in-from-bottom"
                    style={{ background: 'rgba(0,0,0,0.8)', borderTop: '1px solid var(--border)', color: '#00FF9D' }}>
                    {systemLogs.length === 0 ? (
                        <div className="opacity-50 italic">Init SPATIAL_OS System Kernel...</div>
                    ) : (
                        systemLogs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                                <span>{log}</span>
                            </div>
                        ))
                    )}
                    <div ref={terminalEndRef} />
                </div>
            )}

            <form onSubmit={handleChatSubmit} className="p-3 flex gap-2"
                style={{ borderTop: '1px solid var(--border)' }}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={topology ? "Query the environment..." : "Process a node first..."}
                    className="flex-1 rounded px-3 py-2 font-mono focus:outline-none transition-colors"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    disabled={isChatting || !topology}
                />
                <button
                    type="submit"
                    disabled={isChatting || !chatInput.trim() || !topology}
                    className="px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    style={{ background: 'var(--accent)', color: '#000' }}
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
