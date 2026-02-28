"use client";

import { useState } from "react";
import { SpatialNode, ObjectLocation } from './lib/api';
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import DigitalTwin from "./components/DigitalTwin";

export default function Home() {
  const [topology, setTopology] = useState<SpatialNode | null>(null);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [locations, setLocations] = useState<ObjectLocation[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH' | 'TWIN'>('MAP');

  const handleAnalysisComplete = (newTopology: SpatialNode, newMapImage: string, newLocations: ObjectLocation[]) => {
    setTopology(newTopology);
    setMapImage(newMapImage);
    setLocations(newLocations);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-black text-white">
      <header className="w-full max-w-7xl mb-8 flex items-center justify-between border-b border-[#333] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#333] flex items-center justify-center">
            <span className="text-[#00FF9D] font-bold text-xl">VLA</span>
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-tight">SPATIAL_OS</h1>
            <p className="text-xs font-mono text-[#888] uppercase tracking-widest">Multi-Agent Infrastructure</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#888]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Input */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <NodeCaptureComponent onAnalysisComplete={handleAnalysisComplete} />
        </div>

        {/* Right Column: Visualization & Agents */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden flex flex-col flex-1 min-h-[500px]">
            {topology ? (
              <>
                <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#151515]">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-mono font-bold text-white uppercase">
                      {viewMode === 'MAP' && 'Interactive Floor Plan'}
                      {viewMode === 'GRAPH' && 'Semantic Graph'}
                      {viewMode === 'TWIN' && 'Digital Twin 3D'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-[#888]">
                      {topology.node_name}
                    </div>
                    <div className="flex bg-[#222] rounded-lg p-1 border border-[#333]">
                      <button
                        onClick={() => setViewMode('MAP')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'MAP' ? 'bg-[#00FF9D] text-black font-bold' : 'text-[#888] hover:text-white'}`}
                      >
                        MAP
                      </button>
                      <button
                        onClick={() => setViewMode('GRAPH')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'GRAPH' ? 'bg-[#A020F0] text-white font-bold' : 'text-[#888] hover:text-white'}`}
                      >
                        GRAPH
                      </button>
                      <button
                        onClick={() => setViewMode('TWIN')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${viewMode === 'TWIN' ? 'bg-[#FF009D] text-white font-bold' : 'text-[#888] hover:text-white'}`}
                      >
                        TWIN
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative w-full flex-1 bg-black">
                  {viewMode === 'MAP' && mapImage && (
                    <InteriorMapComponent
                      mapImage={mapImage}
                      locations={locations}
                      selectedObjectId={selectedObjectId}
                      onSelectObject={setSelectedObjectId}
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
                <div className="w-16 h-16 border-2 border-dashed border-[#333] rounded-xl mb-4 flex items-center justify-center text-[#333]">
                  <span className="font-mono text-2xl">?</span>
                </div>
                <h3 className="text-sm font-mono font-bold text-white mb-2 uppercase">Awaiting Environment Data</h3>
                <p className="text-xs text-[#888] max-w-sm">
                  Upload images and process a node to generate the topological graph and interior map views.
                </p>
              </div>
            )}
          </div>

          {/* Keep CommandBar at the bottom, like the Chat Interface */}
          <div className="bg-[#111] border border-[#333] rounded-xl overflow-hidden mt-6">
            <CommandBarComponent topology={topology} />
          </div>

        </div>
      </main>
    </div>
  );
}
