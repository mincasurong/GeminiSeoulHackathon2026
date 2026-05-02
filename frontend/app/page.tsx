"use client";

import { useState, useEffect } from "react";
import { SpatialNode, ObjectLocation, api, EngineType } from './lib/api';
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import DigitalTwin from "./components/DigitalTwin";
import RobotSettingsModal from "./components/RobotSettingsModal";
import { Settings, Cpu, Cloud, Download } from "lucide-react";

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
  const [engine, setEngine] = useState<EngineType>("gemma");
  const [isBusy, setIsBusy] = useState(false);

  const fontSizeMap = { S: '13pt', M: '14pt', L: '16pt' };

  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.background = theme === 'dark' ? '#030712' : '#f1f5f9';
    document.body.style.color = theme === 'dark' ? '#e2e8f0' : '#0f172a';
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

  // Theme-aware colors
  const bg = isDark ? '#030712' : '#f1f5f9';
  const cardBg = isDark ? 'rgba(10, 22, 40, 0.6)' : 'rgba(255, 255, 255, 0.85)';
  const border = isDark ? 'rgba(0, 255, 157, 0.12)' : 'rgba(0, 100, 60, 0.15)';
  const borderStrong = isDark ? 'rgba(0, 255, 157, 0.3)' : 'rgba(0, 100, 60, 0.3)';
  const accent = isDark ? '#00FF9D' : '#059669';
  const accentDim = isDark ? 'rgba(0, 255, 157, 0.15)' : 'rgba(5, 150, 105, 0.1)';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#64748b' : '#6b7280';
  const visBg = isDark ? '#000' : '#f5f5f5';

  // Engine-specific colors
  const gemmaColor = '#F97316';  // orange for local
  const geminiColor = '#3B82F6'; // blue for cloud
  const activeEngineColor = engine === 'gemma' ? gemmaColor : geminiColor;

  // "How It Works" steps with model info per engine
  const howItWorks = [
    {
      num: '01',
      text: 'Stand at room center, take 8 directional photos',
      model: null,
    },
    {
      num: '02',
      text: 'AI extracts topology -- objects, anchors, exits',
      model: engine === 'gemma' ? 'Gemma 4' : 'Gemini',
    },
    {
      num: '03',
      text: 'Text-Bridge converts photos to layout description',
      model: engine === 'gemma' ? 'Gemma 4' : 'Gemini',
    },
    {
      num: '04',
      text: "Generates 2D bird's-eye floor plan from text",
      model: 'Gemini',  // Always Gemini (image generation)
    },
    {
      num: '05',
      text: 'Ask spatial queries: "Where is the coffee pot?"',
      model: engine === 'gemma' ? 'Gemma 4' : 'Gemini',
    },
  ];

  return (
    <div className="grid-bg min-h-screen transition-all duration-500"
      style={{ fontSize: fontSizeMap[fontSize], background: bg, color: textPrimary }}>

      {/* HEADER */}
      <header className="relative overflow-hidden" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="scan-line" />

        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black"
                style={{ background: accentDim, color: accent, border: `1px solid ${borderStrong}`, fontSize: '18px' }}>
                S<span style={{ fontSize: '10px', verticalAlign: 'super' }}>OS</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
                style={{ background: accent }} />
            </div>
            <div>
              <h1 className="font-mono font-bold tracking-widest" style={{ color: textPrimary, fontSize: '20px' }}>
                SPATIAL<span style={{ color: accent }}>_OS</span>
              </h1>
              <p className="font-mono tracking-[0.3em] uppercase" style={{ color: textMuted, fontSize: '10px' }}>
                SLAM &middot; INDOOR NAVIGATION &middot; ROBOTICS
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">

            {/* Engine Toggle */}
            <div className="rounded-lg p-0.5 flex items-center"
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
                backdropFilter: 'blur(16px)',
                opacity: isBusy ? 0.5 : 1,
                pointerEvents: isBusy ? 'none' : 'auto',
              }}>
              <button onClick={() => setEngine('gemma')}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono font-bold transition-all"
                style={{
                  background: engine === 'gemma' ? gemmaColor : 'transparent',
                  color: engine === 'gemma' ? '#fff' : textMuted,
                  fontSize: '11px',
                }}>
                <Cpu className="w-3.5 h-3.5" />
                GEMMA
              </button>
              <button onClick={() => setEngine('gemini')}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono font-bold transition-all"
                style={{
                  background: engine === 'gemini' ? geminiColor : 'transparent',
                  color: engine === 'gemini' ? '#fff' : textMuted,
                  fontSize: '11px',
                }}>
                <Cloud className="w-3.5 h-3.5" />
                GEMINI
              </button>
            </div>

            {/* Font Sizer */}
            <div className="rounded-lg p-0.5 flex" style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
              {(['S', 'M', 'L'] as const).map(s => (
                <button key={s} onClick={() => setFontSize(s)}
                  className="px-2.5 py-1 rounded font-mono font-bold transition-all"
                  style={{ background: fontSize === s ? accent : 'transparent', color: fontSize === s ? '#000' : textMuted }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
              style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)', fontSize: '16px' }}>
              {isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            </button>

            {/* Settings Gear */}
            <button onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
              style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
              <Settings className="w-5 h-5" style={{ color: textPrimary }} />
            </button>

            {/* Status */}
            <div className="hidden md:flex rounded-lg items-center gap-2 px-3 py-1.5"
              style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: activeEngineColor }} />
              <span className="font-mono font-bold uppercase" style={{ color: activeEngineColor, fontSize: '10px', letterSpacing: '0.15em' }}>
                {engine === 'gemma' ? 'GEMMA LOCAL' : 'GEMINI CLOUD'}
              </span>
            </div>
          </div>
        </div>

        {/* Gradient edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Node Capture */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
              <span>&#x1F4F8;</span>
              <h2 className="font-mono font-bold uppercase tracking-wider">Node Capture</h2>
            </div>
            <NodeCaptureComponent onAnalysisComplete={handleAnalysisComplete} engine={engine} onBusyChange={setIsBusy} />
          </div>

          {/* How It Works */}
          <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span>&#x1F916;</span>
              <span className="font-mono font-bold uppercase" style={{ color: accent }}>How It Works</span>
            </div>
            <ol className="flex flex-col gap-2.5 font-mono" style={{ color: textMuted }}>
              {howItWorks.map(step => (
                <li key={step.num} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 font-bold" style={{ color: accent }}>{step.num}</span>
                  <span className="flex-1">
                    {step.text}
                    {step.model && (
                      <span
                        className="inline-block ml-1.5 px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.05em',
                          background: step.model === 'Gemma 4'
                            ? 'rgba(249, 115, 22, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                          color: step.model === 'Gemma 4' ? gemmaColor : geminiColor,
                          border: `1px solid ${step.model === 'Gemma 4'
                            ? 'rgba(249, 115, 22, 0.3)'
                            : 'rgba(59, 130, 246, 0.3)'}`,
                        }}
                      >
                        {step.model}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: Visualizations */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Visualization Panel */}
          <div className="rounded-2xl overflow-hidden flex flex-col min-h-[500px]"
            style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            {topology ? (
              <>
                {/* Tab Bar */}
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center gap-2">
                    <span>
                      {viewMode === 'MAP' && '\uD83D\uDDFA\uFE0F'}
                      {viewMode === 'GRAPH' && '\uD83D\uDD17'}
                      {viewMode === 'TWIN' && '\uD83E\uDDCA'}
                    </span>
                    <h2 className="font-mono font-bold uppercase tracking-wider">
                      {viewMode === 'MAP' && 'Interactive Floor Plan'}
                      {viewMode === 'GRAPH' && 'Semantic Topology'}
                      {viewMode === 'TWIN' && 'Digital Twin 3D'}
                    </h2>
                    <span className="font-mono px-2 py-0.5 rounded-full"
                      style={{ fontSize: '10px', background: accentDim, color: accent, border: `1px solid ${border}` }}>
                      {topology.node_name}
                    </span>
                    <button
                      onClick={() => {
                        const json = JSON.stringify(topology, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `topology_${topology.node_name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                        a.style.display = 'none';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono font-bold transition-all hover:scale-105"
                      style={{ fontSize: '10px', background: accentDim, color: accent, border: `1px solid ${border}` }}
                      title="Download topology JSON"
                    >
                      <Download className="w-3 h-3" /> JSON
                    </button>
                  </div>

                  <div className="flex rounded-xl p-0.5" style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}` }}>
                    {[
                      { key: 'MAP', label: 'MAP', color: accent },
                      { key: 'GRAPH', label: 'GRAPH', color: '#A855F7' },
                      { key: 'TWIN', label: 'TWIN', color: '#EC4899' },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setViewMode(tab.key as any)}
                        className="px-4 py-1.5 rounded-lg font-mono font-bold transition-all"
                        style={{
                          background: viewMode === tab.key ? tab.color : 'transparent',
                          color: viewMode === tab.key ? '#000' : textMuted,
                          letterSpacing: '0.1em'
                        }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div className="relative w-full flex-1" style={{ background: visBg }}>
                  {viewMode === 'MAP' && mapImage && (
                    <InteriorMapComponent
                      mapImage={mapImage} locations={locations} topology={topology}
                      sourceImages={sourceImages} selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId} theme={theme}
                      robotApiUrl={robotApiUrl} onAddSystemLog={addSystemLog}
                    />
                  )}
                  {viewMode === 'GRAPH' && <SemanticGraph data={topology} />}
                  {viewMode === 'TWIN' && mapImage && (
                    <DigitalTwin mapImage={mapImage} locations={locations} topology={topology}
                      selectedObjectId={selectedObjectId} onSelectObject={setSelectedObjectId}
                    />
                  )}
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: accentDim, border: `2px dashed ${borderStrong}`, fontSize: '32px' }}>
                    &#x1F52D;
                  </div>
                </div>
                <h3 className="font-mono font-bold uppercase tracking-wider mb-2">
                  Awaiting Spatial Data
                </h3>
                <p className="font-mono max-w-xs leading-relaxed" style={{ color: textMuted }}>
                  Upload 8 directional images and synthesize to generate your indoor navigation map.
                </p>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          <CommandBarComponent topology={topology} systemLogs={systemLogs} engine={engine} />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between font-mono" style={{ color: textMuted }}>
          <span>Google Gemini Seoul Hackathon 2026</span>
          <span>
            Powered by{' '}
            <span style={{ color: engine === 'gemma' ? gemmaColor : geminiColor, fontWeight: 700 }}>
              {engine === 'gemma' ? 'Gemma 4 (Local)' : 'Gemini (Cloud)'}
            </span>
            {' '}&middot; Text-Bridge Architecture
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
