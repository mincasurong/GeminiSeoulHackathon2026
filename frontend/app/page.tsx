"use client";

import { useState, useEffect } from "react";
import { SpatialNode, ObjectLocation, api } from './lib/api';
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import DigitalTwin from "./components/DigitalTwin";

export default function Home() {
  const [topology, setTopology] = useState<SpatialNode | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [locations, setLocations] = useState<ObjectLocation[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH' | 'TWIN'>('MAP');

  // UX Controls
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'S' | 'M' | 'L'>('M');

  const fontSizeMap = { S: '12px', M: '14px', L: '17px' };

  const handleAnalysisComplete = async (newTopology: SpatialNode, newMapImage: string, newLocations: ObjectLocation[]) => {
    setTopology(newTopology);
    setMapImage(newMapImage);
    setLocations(newLocations);

    // Fetch source images for interactive map
    try {
      const imgData = await api.getNodeImages(newTopology.node_name);
      setSourceImages(imgData.images || []);
    } catch (err) {
      console.error("Failed to fetch source images:", err);
    }
  };

  const isDark = theme === 'dark';
  const bg = isDark ? '#050505' : '#f0f0f0';
  const cardBg = isDark ? '#111' : '#fff';
  const border = isDark ? '#333' : '#ddd';
  const text = isDark ? '#fff' : '#111';
  const textMuted = isDark ? '#888' : '#666';
  const accent = '#00FF9D';

  return (
    <div style={{ background: bg, color: text, fontSize: fontSizeMap[fontSize], minHeight: '100vh', transition: 'all 0.3s' }}
      className="p-4 md:p-8 flex flex-col items-center">

      {/* Header */}
      <header className="w-full max-w-7xl mb-8 flex items-center justify-between pb-4"
        style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: cardBg, border: `1px solid ${border}` }}>
            <span style={{ color: accent }} className="font-bold text-xl">VLA</span>
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tight">SPATIAL_OS</h1>
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: textMuted }}>Indoor Navigator</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Font Sizer */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: isDark ? '#222' : '#e0e0e0', border: `1px solid ${border}` }}>
            {(['S', 'M', 'L'] as const).map(s => (
              <button key={s} onClick={() => setFontSize(s)}
                className={`px-2 py-1 rounded transition-colors font-bold`}
                style={{ background: fontSize === s ? accent : 'transparent', color: fontSize === s ? '#000' : textMuted }}>
                {s}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: isDark ? '#222' : '#e0e0e0', border: `1px solid ${border}`, color: text }}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Status */}
          <div className="hidden md:flex items-center gap-2" style={{ color: textMuted }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }}></span>
            ONLINE
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Input */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-xl overflow-hidden p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <NodeCaptureComponent onAnalysisComplete={handleAnalysisComplete} />
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          <div className="rounded-xl overflow-hidden flex flex-col flex-1 min-h-[500px]"
            style={{ background: cardBg, border: `1px solid ${border}` }}>
            {topology ? (
              <>
                <div className="p-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${border}`, background: isDark ? '#151515' : '#fafafa' }}>
                  <h2 className="text-sm font-mono font-bold uppercase">
                    {viewMode === 'MAP' && '🗺️ Interactive Floor Plan'}
                    {viewMode === 'GRAPH' && '🔗 Semantic Graph'}
                    {viewMode === 'TWIN' && '🧊 Digital Twin 3D'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono" style={{ color: textMuted }}>{topology.node_name}</span>
                    <div className="flex rounded-lg p-1" style={{ background: isDark ? '#222' : '#e0e0e0', border: `1px solid ${border}` }}>
                      <button onClick={() => setViewMode('MAP')}
                        className="px-3 py-1 rounded text-xs font-mono transition-colors font-bold"
                        style={{ background: viewMode === 'MAP' ? accent : 'transparent', color: viewMode === 'MAP' ? '#000' : textMuted }}>
                        MAP
                      </button>
                      <button onClick={() => setViewMode('GRAPH')}
                        className="px-3 py-1 rounded text-xs font-mono transition-colors font-bold"
                        style={{ background: viewMode === 'GRAPH' ? '#A020F0' : 'transparent', color: viewMode === 'GRAPH' ? '#fff' : textMuted }}>
                        GRAPH
                      </button>
                      <button onClick={() => setViewMode('TWIN')}
                        className="px-3 py-1 rounded text-xs font-mono transition-colors font-bold"
                        style={{ background: viewMode === 'TWIN' ? '#FF009D' : 'transparent', color: viewMode === 'TWIN' ? '#fff' : textMuted }}>
                        TWIN
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative w-full flex-1" style={{ background: isDark ? '#000' : '#f5f5f5' }}>
                  {viewMode === 'MAP' && mapImage && (
                    <InteriorMapComponent
                      mapImage={mapImage}
                      locations={locations}
                      topology={topology}
                      sourceImages={sourceImages}
                      selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId}
                      theme={theme}
                    />
                  )}
                  {viewMode === 'GRAPH' && (
                    <SemanticGraph data={topology} />
                  )}
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[500px]">
                <div className="w-16 h-16 border-2 border-dashed rounded-xl mb-4 flex items-center justify-center"
                  style={{ borderColor: border, color: textMuted }}>
                  <span className="font-mono text-2xl">?</span>
                </div>
                <h3 className="text-sm font-mono font-bold mb-2 uppercase">Awaiting Environment Data</h3>
                <p className="text-xs max-w-sm" style={{ color: textMuted }}>
                  Upload images and process a node to generate the topological graph and interior map views.
                </p>
              </div>
            )}
          </div>

          <CommandBarComponent topology={topology} />
        </div>
      </main>
    </div>
  );
}
