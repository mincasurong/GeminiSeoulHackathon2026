"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal, Send, MessageSquare, Loader2 } from "lucide-react";
import { api, SpatialNode } from "../lib/api";

interface CommandBarProps {
    topology: SpatialNode | null;
}

export default function CommandBarComponent({ topology }: CommandBarProps) {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

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
        <div className="flex flex-col h-full bg-gray-950 p-0 border border-[#333] rounded-xl overflow-hidden min-h-[300px] max-h-[400px]">
            <div className="p-3 border-b border-[#333] bg-[#151515] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#00FF9D]" />
                    <h3 className="text-xs font-mono font-bold text-white uppercase">Spatial Query Interface</h3>
                </div>
                {!topology && (
                    <div className="text-[10px] text-red-400 font-mono px-2 py-1 bg-red-500/10 border border-red-500/20 rounded">
                        AWAITING TOPOLOGY CONTEXT
                    </div>
                )}
                {topology && (
                    <div className="text-[10px] text-[#00FF9D] font-mono px-2 py-1 bg-[#00FF9D]/10 border border-[#00FF9D]/20 rounded">
                        CONTEXT: {topology.node_name}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0a0a0a]">
                {chatHistory.length === 0 && (
                    <div className="text-xs font-mono text-[#555] text-center my-auto flex flex-col items-center gap-2">
                        <Terminal className="w-8 h-8 opacity-20" />
                        <p>Ask questions about the extracted environment...</p>
                        <p className="text-[10px]">E.g., &quot;Where is the microwave?&quot;</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm font-mono leading-relaxed ${msg.role === 'user' ? 'bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/30' : 'bg-[#222] text-[#ccc] border border-[#333]'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="bg-[#222] border border-[#333] p-3 rounded-lg flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin text-[#888]" />
                            <span className="text-xs font-mono text-[#888]">Querying VLA...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-3 border-t border-[#333] bg-[#151515] flex gap-2">
                <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={topology ? "Query the environment..." : "Process a node first..."}
                    className="flex-1 bg-[#050505] border border-[#333] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#00FF9D] transition-colors"
                    disabled={isChatting || !topology}
                />
                <button
                    type="submit"
                    disabled={isChatting || !chatInput.trim() || !topology}
                    className="bg-[#00FF9D] text-black px-4 py-2 rounded hover:bg-[#00FF9D]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
