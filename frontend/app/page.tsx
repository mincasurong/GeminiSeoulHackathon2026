"use client";

import { useState, useEffect } from "react";
import { SpatialNode, ObjectLocation, api } from './lib/api';
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import DigitalTwin from "./components/DigitalTwin";
import RobotSettingsModal from "./components/RobotSettingsModal";
import { Settings } from "lucide-react";

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

  return (
    <div className="grid-bg min-h-screen transition-all duration-500"
      style={{ fontSize: fontSizeMap[fontSize], background: bg, color: textPrimary }}>

      {/* ═══════════════════ HEADER ═══════════════════ */}
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
                SLAM · INDOOR NAVIGATION · ROBOTICS
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
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
              {isDark ? '☀️' : '🌙'}
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
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: accent }} />
              <span className="font-mono font-bold uppercase" style={{ color: accent, fontSize: '10px', letterSpacing: '0.15em' }}>
                VLA ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Gradient edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      </header>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* ─── Left: Node Capture ─── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `1px solid ${border}` }}>
              <span>📸</span>
              <h2 className="font-mono font-bold uppercase tracking-wider">Node Capture</h2>
            </div>
            <NodeCaptureComponent onAnalysisComplete={handleAnalysisComplete} />
          </div>

          {/* Info Card */}
          <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${border}`, backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span>🤖</span>
              <span className="font-mono font-bold uppercase" style={{ color: accent }}>How It Works</span>
            </div>
            <ol className="flex flex-col gap-2 font-mono" style={{ color: textMuted }}>
              <li className="flex gap-2"><span style={{ color: accent }}>01</span> Stand at room center, take 8 directional photos</li>
              <li className="flex gap-2"><span style={{ color: accent }}>02</span> AI extracts topology — objects, anchors, exits</li>
              <li className="flex gap-2"><span style={{ color: accent }}>03</span> Text-Bridge converts photos to layout description</li>
              <li className="flex gap-2"><span style={{ color: accent }}>04</span> Generates 2D bird&apos;s-eye floor plan from text</li>
              <li className="flex gap-2"><span style={{ color: accent }}>05</span> Ask spatial queries: &quot;Where is the coffee pot?&quot;</li>
            </ol>
          </div>
        </div>

        {/* ─── Right: Visualizations ─── */}
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
                      {viewMode === 'MAP' && '🗺️'}
                      {viewMode === 'GRAPH' && '🔗'}
                      {viewMode === 'TWIN' && '🧊'}
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
                    🔭
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
          <CommandBarComponent topology={topology} systemLogs={systemLogs} />
        </div>
      </main>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="py-4" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between font-mono" style={{ color: textMuted }}>
          <span>Google Gemini Seoul Hackathon 2026</span>
          <span>Powered by Gemini VLA · Text-Bridge Architecture</span>
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
