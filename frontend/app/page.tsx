"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SpatialNode, ObjectLocation, api } from './lib/api';
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import DigitalTwin from "./components/DigitalTwin";
import RobotSettingsModal from "./components/RobotSettingsModal";
import { Settings, Download, Compass, Cpu, Layers, Sparkles } from "lucide-react";

export default function Home() {
  const [topology, setTopology] = useState<SpatialNode | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [locations, setLocations] = useState<ObjectLocation[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH' | 'TWIN'>('MAP');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'S' | 'M' | 'L'>('M');
  const [robotApiUrl, setRobotApiUrl] = useState("http://localhost:8080/nav2/follow_waypoints");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const fontSizeClassMap = {
    S: 'text-xs',
    M: 'text-sm',
    L: 'text-base'
  };

  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleAnalysisComplete = async (newTopology: SpatialNode, newMapImage: string, newLocations: ObjectLocation[]) => {
    setTopology(newTopology);
    setMapImage(newMapImage);
    setLocations(newLocations);
    try {
      const imgData = await api.getNodeImages(newTopology.node_name);
      setSourceImages(imgData.images || []);
    } catch (err) {
      console.error("Failed to fetch source images:", err);
    }
  };

  const isDark = theme === 'dark';

  const howItWorks = [
    {
      num: '01',
      title: '360° Capture',
      text: 'Stand at room center, capture 8 directional photos (N → NW).',
      badge: 'Sensory',
    },
    {
      num: '02',
      title: 'Cognitive Topology',
      text: 'Gemini 3.1 Pro stitches overlaps into a Relational Property Graph.',
      badge: 'Reasoning',
    },
    {
      num: '03',
      title: 'Text-Bridge Draft',
      text: 'CoT ASCII layout matrix generates zero-distortion 2D CAD text.',
      badge: 'Architecture',
    },
    {
      num: '04',
      title: 'Blueprint & Grounding',
      text: 'Synthesizes 16:9 orthographic map & detects % bounding boxes.',
      badge: 'Vision',
    },
    {
      num: '05',
      title: 'Hardware Dispatch',
      text: 'Translates visual percentages to ROS2 metric coordinates (x, y, yaw).',
      badge: 'Action',
    },
  ];

  return (
    <div className={`grid-bg min-h-screen transition-colors duration-300 ${fontSizeClassMap[fontSize]}`}>

      {/* TOP TELEMETRY STATUS BAR */}
      <div className="bg-[#020617]/90 border-b border-emerald-500/20 px-6 py-1.5 flex items-center justify-between text-[11px] font-mono tracking-wider z-50 relative">
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full pulse-dot bg-emerald-400" />
            <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">ENGINE: <strong className="text-sky-400">GEMINI 3.7 FLASH</strong></span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">LATENCY: <strong className="text-emerald-400">18ms</strong></span>
          <span className="hidden lg:inline text-slate-600">|</span>
          <span className="hidden lg:inline">ROS2 BRIDGE: <strong className="text-amber-400">STANDBY</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/scholar" 
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/30 text-sky-400 hover:bg-sky-500/20 hover:border-sky-400 transition-all font-bold"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>SHOWCASE LAB</span>
          </Link>
        </div>
      </div>

      {/* PRIMARY HEADER */}
      <header className="relative overflow-hidden border-b border-emerald-500/20 bg-slate-950/60 backdrop-blur-xl">
        <div className="scan-line" />

        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-10">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(0,255,157,0.15)] group-hover:border-emerald-400 group-hover:scale-105 transition-all text-lg">
                S<span className="text-[10px] align-super text-sky-400">OS</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full pulse-dot bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-black tracking-widest text-xl text-slate-100">
                  SPATIAL<span className="text-emerald-400">_OS</span>
                </h1>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.0 PRO
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                COGNITIVE SLAM &middot; INDOOR VLA &middot; ROS2 DISPATCH
              </p>
            </div>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-3">
            {/* Font Scale Selector */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-0.5 flex">
              {(['S', 'M', 'L'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition-all text-xs ${
                    fontSize === s 
                      ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(0,255,157,0.4)]' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-sm transition-all hover:border-slate-500 hover:scale-105"
              title="Toggle Dark/Light Mode"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Hardware Settings Gear */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 transition-all hover:text-emerald-400 hover:border-emerald-500/40 hover:scale-105"
              title="Configure ROS2 Hardware Bridge"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN COCKPIT DASHBOARD */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Sensory Ingestion (Node Capture) & System Workflow */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Node Capture HUD Card */}
          <div className="hud-card rounded-2xl p-5 relative">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h2 className="font-mono font-bold uppercase tracking-wider text-slate-100 text-sm">
                  360° Panoramic Ingestion
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                8 SECTORS
              </span>
            </div>

            <NodeCaptureComponent onAnalysisComplete={handleAnalysisComplete} onBusyChange={setIsBusy} />
          </div>

          {/* How It Works High-Tech Pipeline Card */}
          <div className="hud-card rounded-2xl p-5 relative">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />

            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="font-mono font-bold uppercase text-sky-400 text-xs tracking-wider">
                VLA Pipeline Directives
              </span>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs text-slate-400">
              {howItWorks.map(step => (
                <div key={step.num} className="flex gap-2.5 items-start group">
                  <span className="flex-shrink-0 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 w-5 h-5 rounded flex items-center justify-center text-[10px]">
                    {step.num}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {step.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Mode Visualizer & Spatial Reasoning Terminal */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Primary Visualization Hub */}
          <div className="hud-card rounded-2xl overflow-hidden flex flex-col min-h-[520px] relative">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />

            {topology ? (
              <>
                {/* Visualizer Mode Header & Selector */}
                <div className="px-5 py-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/70">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-mono font-bold uppercase tracking-wider text-sm text-slate-100">
                      {viewMode === 'MAP' && 'Orthographic 2D Blueprint'}
                      {viewMode === 'GRAPH' && 'Relational Semantic Mesh'}
                      {viewMode === 'TWIN' && '3D Voxel Digital Twin'}
                    </h2>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {topology.node_name}
                    </span>
                    <button
                      onClick={() => {
                        const json = JSON.stringify(topology, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.setAttribute('download', `topology_${topology.node_name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-all border border-slate-700"
                      title="Download full spatial topology JSON"
                    >
                      <Download className="w-3 h-3" /> JSON
                    </button>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 gap-1">
                    {[
                      { key: 'MAP', label: '2D MAP', color: '#00FF9D' },
                      { key: 'GRAPH', label: 'GRAPH', color: '#A855F7' },
                      { key: 'TWIN', label: '3D TWIN', color: '#38BDF8' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setViewMode(tab.key as any)}
                        className={`px-3 py-1 rounded-lg font-mono font-bold transition-all text-xs tracking-wider ${
                          viewMode === tab.key
                            ? 'bg-slate-100 text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Viewport Canvas */}
                <div className="relative w-full flex-1 bg-slate-950">
                  {viewMode === 'MAP' && mapImage && (
                    <InteriorMapComponent
                      mapImage={mapImage}
                      locations={locations}
                      topology={topology}
                      sourceImages={sourceImages}
                      selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId}
                      theme={theme}
                      robotApiUrl={robotApiUrl}
                      onAddSystemLog={addSystemLog}
                    />
                  )}
                  {viewMode === 'GRAPH' && <SemanticGraph data={topology} />}
                  {viewMode === 'TWIN' && mapImage && (
                    <DigitalTwin
                      mapImage={mapImage}
                      locations={locations}
                      topology={topology}
                      selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId}
                    />
                  )}
                </div>
              </>
            ) : (
              /* Awaiting State */
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[520px]">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-3xl shadow-[0_0_30px_rgba(0,255,157,0.1)]">
                    🔭
                  </div>
                  <div className="absolute -inset-2 rounded-3xl border border-emerald-500/10 animate-ping" />
                </div>
                <h3 className="font-mono font-bold uppercase tracking-wider text-slate-200 text-base mb-2">
                  Awaiting Spatial Telemetry
                </h3>
                <p className="font-mono max-w-sm text-xs leading-relaxed text-slate-400">
                  Upload 8 sequential directional images on the left to initiate the 3-step VLA pipeline.
                </p>
              </div>
            )}
          </div>

          {/* Spatial Reasoning Chat & SLAM Kernel Terminal */}
          <div className="hud-card rounded-2xl overflow-hidden relative">
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />
            <CommandBarComponent topology={topology} systemLogs={systemLogs} />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 border-t border-slate-800 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-slate-500 gap-2">
          <span>🏆 1st Place — Gemini 3 Seoul Hackathon (Hard Tech Track)</span>
          <span>
            Powered by <strong className="text-emerald-400">Gemini 3.1 Pro</strong> &amp; <strong className="text-sky-400">Gemini 3.1 Flash Image</strong>
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <RobotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={robotApiUrl}
        onSave={setRobotApiUrl}
      />
    </div>
  );
}
