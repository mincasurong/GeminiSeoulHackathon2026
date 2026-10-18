"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, MessageSquare, Loader2, Sparkles, Navigation } from "lucide-react";
import { api, SpatialNode, EngineType } from "../lib/api";

interface CommandBarProps {
    topology: SpatialNode | null;
    systemLogs: string[];
    selectedEngine?: EngineType;
    workspaceId?: string;
    onAddSystemLog?: (msg: string) => void;
}

const CHAT_PROMPTS = [
    "Where is the elevator?",
    "List all dynamic objects and obstacles",
    "Describe the pathway to the Golden Door",
    "What are the room dimensions and floor materials?",
];

const PLANNER_PROMPTS = [
    "Plan trajectory to the elevator",
    "Navigate to golden_door entrance",
    "Route to reception_desk avoiding obstacles",
    "Find path to staircase_structure",
];

export default function CommandBarComponent({
    topology,
    systemLogs,
    selectedEngine = "gemini-4-argon",
    workspaceId = "default",
    onAddSystemLog,
}: CommandBarProps) {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string; mode?: 'CHAT' | 'PLANNER' }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [activeMode, setActiveMode] = useState<'CHAT' | 'PLANNER' | 'TERMINAL'>('CHAT');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    const engineBadgeLabel =
        selectedEngine === "gemini-3.8-flash" ? "3.8 Flash VLA" : "v4 Argon VLA";

    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [systemLogs, activeMode]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isChatting]);

    const handleSubmit = async (queryToSubmit?: string) => {
        const text = (queryToSubmit || chatInput).trim();
        if (!text || !topology || isChatting) return;

        const runMode: 'CHAT' | 'PLANNER' = activeMode === 'PLANNER' ? 'PLANNER' : 'CHAT';
        setChatInput('');
        const newHistory = [...chatHistory, { role: 'user' as const, text, mode: runMode }];
        setChatHistory(newHistory);
        setIsChatting(true);

        try {
            if (runMode === 'PLANNER') {
                onAddSystemLog?.(`[PLANNER] Computing trajectory for '${text}' via ${selectedEngine}...`);
                const planData = await api.queryPlanner(text, topology.node_name, selectedEngine, workspaceId);
                const routeStr = (planData.plan || [topology.node_name]).join(" → ");
                const wpCount = planData.waypoints?.length || 0;
                const firstWp = planData.waypoints?.[0]?.pose?.position;
                const wpSummary = firstWp
                    ? `\nROS2 Nav2 Target Waypoint: (x: ${firstWp.x}m, y: ${firstWp.y}m, z: 0.0m) [${wpCount} waypoint(s) ready]`
                    : "";
                const reply = `Route Sequence: [${routeStr}]\nReasoning: ${planData.message || "Optimal path calculated."}${wpSummary}`;
                onAddSystemLog?.(`[PLANNER] Route: ${routeStr} (${wpCount} ROS2 waypoints generated)`);
                setChatHistory(prev => [...prev, { role: 'model', text: reply, mode: 'PLANNER' }]);
            } else {
                const data = await api.chat(text, topology.node_name, newHistory, selectedEngine, workspaceId);
                setChatHistory(prev => [...prev, { role: 'model', text: data.response || "No response received.", mode: 'CHAT' }]);
            }
        } catch (err) {
            console.error("Query error:", err);
            setChatHistory(prev => [...prev, { role: 'model', text: "Error: Could not process spatial query.", mode: runMode }]);
        } finally {
            setIsChatting(false);
        }
    };

    const activePrompts = activeMode === 'PLANNER' ? PLANNER_PROMPTS : CHAT_PROMPTS;

    return (
        <div className="flex flex-col h-full rounded-2xl overflow-hidden min-h-[340px] max-h-[460px] bg-slate-950/80 border border-slate-800">
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-mono font-bold uppercase text-xs text-slate-100 tracking-wider">
                        Spatial Cognitive Chat &amp; Trajectory Planner
                    </h3>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveMode('CHAT')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            activeMode === 'CHAT'
                                ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                    >
                        <MessageSquare className="w-3 h-3" />
                        CHAT
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMode('PLANNER')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            activeMode === 'PLANNER'
                                ? 'bg-sky-400 text-slate-950 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                    >
                        <Navigation className="w-3 h-3" />
                        PLANNER
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMode('TERMINAL')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            activeMode === 'TERMINAL'
                                ? 'bg-amber-400 text-slate-950 border-amber-400'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                    >
                        <Terminal className="w-3 h-3" />
                        LOGS ({systemLogs.length})
                    </button>

                    {!topology ? (
                        <div className="font-mono text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            NO CONTEXT
                        </div>
                    ) : (
                        <div className="hidden sm:flex font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                            <span className="truncate max-w-[140px]">{topology.node_name}</span>
                        </div>
                    )}
                </div>
            </div>

            {topology && activeMode !== 'TERMINAL' && (
                <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
                    <span className="text-slate-500 flex items-center gap-1 flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        {activeMode === 'PLANNER' ? 'Route Goals:' : 'Suggestions:'}
                    </span>
                    {activePrompts.map((prompt, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSubmit(prompt)}
                            disabled={isChatting}
                            className="flex-shrink-0 px-2.5 py-0.5 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/40 transition-all cursor-pointer"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs bg-slate-950/60">
                {activeMode === 'TERMINAL' ? (
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
                                    <span className={log.includes("ERROR") ? "text-red-400" : log.includes("PLANNER") || log.includes("NAV2") ? "text-sky-400" : "text-emerald-400"}>
                                        {log}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={terminalEndRef} />
                    </div>
                ) : (
                    <>
                        {chatHistory.length === 0 && (
                            <div className="my-auto text-center flex flex-col items-center gap-2 text-slate-500">
                                <Terminal className="w-8 h-8 opacity-20 text-emerald-400" />
                                <p className="text-slate-400">
                                    {activeMode === 'PLANNER'
                                        ? 'Enter a navigation goal to compute a multi-room path and ROS2 Nav2 waypoints.'
                                        : 'Ask spatial questions about room geometry, materials, anchors, or navigation.'}
                                </p>
                                <span className="text-[10px] text-slate-600">Grounded in v4 Argon Relational Property Graph</span>
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
                                        <span className="text-sky-400">Operator ({msg.mode || 'CHAT'})</span>
                                    ) : (
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            {engineBadgeLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        ))}

                        {isChatting && (
                            <div className="self-start bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-2 text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span className="text-[11px]">
                                    {activeMode === 'PLANNER'
                                        ? 'Planning multi-node trajectory & ROS2 waypoints...'
                                        : 'Reasoning across spatial property graph...'}
                                </span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-2.5 border-t border-slate-800 bg-slate-900/70 flex gap-2">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={!topology || isChatting}
                    placeholder={
                        !topology
                            ? "Upload room images first..."
                            : activeMode === 'PLANNER'
                            ? "Enter navigation goal (e.g. 'Route to golden_door')..."
                            : "Ask spatial query (e.g. 'Where is the elevator?')..."
                    }
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
