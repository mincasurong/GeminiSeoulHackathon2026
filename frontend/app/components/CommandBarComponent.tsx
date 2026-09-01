"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, MessageSquare, Loader2, Sparkles, ChevronRight, Activity } from "lucide-react";
import { api, SpatialNode } from "../lib/api";

interface CommandBarProps {
    topology: SpatialNode | null;
    systemLogs: string[];
}

const QUICK_PROMPTS = [
    "Where is the elevator?",
    "List all dynamic objects and obstacles",
    "Describe the pathway to the Golden Door",
    "What are the room dimensions and geometry?",
];

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

    const handleChatSubmit = async (queryToSubmit?: string) => {
        const text = (queryToSubmit || chatInput).trim();
        if (!text || !topology || isChatting) return;

        setChatInput('');
        const newHistory = [...chatHistory, { role: 'user' as const, text }];
        setChatHistory(newHistory);
        setIsChatting(true);

        try {
            const data = await api.chat(text, topology.node_name, newHistory, "gemini");
            setChatHistory(prev => [...prev, { role: 'model', text: data.response || "No response received." }]);
        } catch (err) {
            console.error("Chat error:", err);
            setChatHistory(prev => [...prev, { role: 'model', text: "Error: Could not process spatial reasoning query." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="flex flex-col h-full rounded-2xl overflow-hidden min-h-[340px] max-h-[460px] bg-slate-950/80 border border-slate-800">
            {/* Header Control Bar */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-mono font-bold uppercase text-xs text-slate-100 tracking-wider">
                        Spatial Cognitive Chat &amp; Kernel Terminal
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle ROS2 Telemetry / Chat Terminal */}
                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            showTerminal
                                ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                    >
                        <Terminal className="w-3 h-3" />
                        {showTerminal ? 'TERMINAL ON' : 'TERMINAL LOGS'}
                    </button>

                    {!topology ? (
                        <div className="font-mono text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            NO SPATIAL CONTEXT
                        </div>
                    ) : (
                        <div className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                            <span>{topology.node_name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Prompt Pills (when topology is loaded) */}
            {topology && !showTerminal && (
                <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
                    <span className="text-slate-500 flex items-center gap-1 flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-sky-400" /> Suggestions:
                    </span>
                    {QUICK_PROMPTS.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => handleChatSubmit(prompt)}
                            disabled={isChatting}
                            className="flex-shrink-0 px-2.5 py-0.5 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/40 transition-all cursor-pointer"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Log / Dialogue Viewport */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs bg-slate-950/60">
                {showTerminal ? (
                    /* ROS2 Kernel Stream */
                    <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                        <div className="text-emerald-400 pb-1 border-b border-slate-800 text-[10px]">
                            -- ROS2 Hardware Dispatch &amp; Nav2 Action Stream --
                        </div>
                        {systemLogs.length === 0 ? (
                            <div className="text-slate-600 my-4 text-center">No hardware action dispatches recorded yet.</div>
                        ) : (
                            systemLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                                    <span className={log.includes("ERROR") ? "text-red-400" : log.includes("Nav2") ? "text-sky-400" : "text-emerald-400"}>
                                        {log}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={terminalEndRef} />
                    </div>
                ) : (
                    /* Natural Language Spatial Reasoning Chat */
                    <>
                        {chatHistory.length === 0 && (
                            <div className="my-auto text-center flex flex-col items-center gap-2 text-slate-500">
                                <Terminal className="w-8 h-8 opacity-20 text-emerald-400" />
                                <p className="text-slate-400">Ask spatial questions about room geometry, anchors, or navigation.</p>
                                <span className="text-[10px] text-slate-600">Grounded in Gemini 3.1 Pro Relational Property Graph</span>
                            </div>
                        )}

                        {chatHistory.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex flex-col max-w-[85%] rounded-xl p-3 ${
                                    msg.role === 'user'
                                        ? 'self-end bg-sky-600/20 text-sky-100 border border-sky-500/30'
                                        : 'self-start bg-slate-900 text-slate-200 border border-slate-700/80 shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1">
                                    {msg.role === 'user' ? (
                                        <span className="text-sky-400">Operator</span>
                                    ) : (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Gemini 3.1 Pro VLA
                                        </span>
                                    )}
                                </div>
                                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        ))}

                        {isChatting && (
                            <div className="self-start bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-2 text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span className="text-[11px]">Reasoning across spatial property graph...</span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleChatSubmit(); }} className="p-2.5 border-t border-slate-800 bg-slate-900/70 flex gap-2">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={!topology || isChatting}
                    placeholder={topology ? "Ask spatial query (e.g. 'Where is the elevator?')..." : "Upload room images first..."}
                    className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!topology || !chatInput.trim() || isChatting}
                    className="cyber-btn flex items-center justify-center px-4 py-2 disabled:opacity-30 disabled:pointer-events-none"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </form>
        </div>
    );
}
