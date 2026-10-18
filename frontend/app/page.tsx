"use client";

import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import GraphVisualizerComponent from "./components/GraphVisualizerComponent";
import DigitalTwin from "./components/DigitalTwin";
import RobotSettingsModal from "./components/RobotSettingsModal";
import GoogleAuthModal from "./components/GoogleAuthModal";
import AdminConsoleModal from "./components/AdminConsoleModal";
import SaasHeaderBar from "./components/SaasHeaderBar";
import SpatialKpiStrip from "./components/SpatialKpiStrip";
import SpatialEntityInspector from "./components/SpatialEntityInspector";
import { useSpatialWorkspace } from "./lib/useSpatialWorkspace";
import { Download, Compass, Layers, Radar, Award } from "lucide-react";

const FONT_SIZE_CLASS_MAP = {
  S: "text-xs",
  M: "text-sm",
  L: "text-base",
};

export default function Home() {
  const {
    topology,
    mapImage,
    parametricSvg,
    locations,
    sourceImages,
    availableNodes,
    selectedObjectId,
    setSelectedObjectId,
    viewMode,
    setViewMode,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    selectedEngine,
    setSelectedEngine,
    workspaceId,
    workspaceInfo,
    userProfile,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isAdminModalOpen,
    setIsAdminModalOpen,
    handleTriggerGoogleLogin,
    handleGoogleAuthSuccess,
    handleLogout,
    refreshWorkspaceAndGraph,
    robotApiUrl,
    setRobotApiUrl,
    isSettingsOpen,
    setIsSettingsOpen,
    systemLogs,
    setIsBusy,
    addSystemLog,
    handleTierChange,
    handleBillingSuccess,
    handleAnalysisComplete,
    handleSelectFleetNode,
    handleExportArtifact,
  } = useSpatialWorkspace("default");

  return (
    <div
      className={`grid-bg min-h-screen flex flex-col transition-colors duration-300 ${FONT_SIZE_CLASS_MAP[fontSize]}`}
    >
      <SaasHeaderBar
        selectedEngine={selectedEngine}
        onSelectEngine={setSelectedEngine}
        workspaceInfo={workspaceInfo}
        userProfile={userProfile}
        onOpenAuthModal={handleTriggerGoogleLogin}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
        availableNodes={availableNodes}
        activeNodeName={topology?.node_name}
        onSelectNode={handleSelectFleetNode}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="max-w-7xl w-full mx-auto px-6 py-6 flex-1 flex flex-col gap-6">
        {topology && (
          <SpatialKpiStrip topology={topology} onExport={handleExportArtifact} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="hud-card rounded-2xl p-5 relative">
              <div className="corner-bracket corner-tl" />
              <div className="corner-bracket corner-tr" />
              <div className="corner-bracket corner-bl" />
              <div className="corner-bracket corner-br" />

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <h2 className="font-mono font-bold uppercase tracking-wider text-slate-100 text-sm">
                    360° Panoramic Ingestion
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                  8 SECTORS
                </span>
              </div>

              <NodeCaptureComponent
                onAnalysisComplete={handleAnalysisComplete}
                onBusyChange={setIsBusy}
                selectedEngine={selectedEngine}
                workspaceId={workspaceId}
              />
            </div>

            <SpatialEntityInspector
              topology={topology}
              locations={locations}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
            />
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="hud-card rounded-2xl overflow-hidden flex flex-col min-h-[520px] relative">
              <div className="corner-bracket corner-tl" />
              <div className="corner-bracket corner-tr" />
              <div className="corner-bracket corner-bl" />
              <div className="corner-bracket corner-br" />

              {topology ? (
                <>
                  <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/75">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Layers className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <h2 className="font-mono font-bold uppercase tracking-wider text-sm text-slate-100">
                        {viewMode === "MAP" && "Orthographic 2D Blueprint"}
                        {viewMode === "GRAPH" && "Relational Semantic Mesh"}
                        {viewMode === "FLEET" && "Multi-Room Fleet Topology"}
                        {viewMode === "TWIN" && "3D Voxel Digital Twin"}
                      </h2>
                      <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                        {topology.node_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExportArtifact("json")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer"
                        title="Download full spatial topology JSON"
                      >
                        <Download className="w-3 h-3" aria-hidden="true" /> JSON
                      </button>
                    </div>

                    <div className="flex bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 gap-1">
                      {[
                        { key: "MAP", label: "2D MAP" },
                        { key: "GRAPH", label: "SLAM MESH" },
                        { key: "FLEET", label: "MULTI-ROOM" },
                        { key: "TWIN", label: "3D TWIN" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setViewMode(tab.key as any)}
                          className={`px-3 py-1 rounded-lg font-mono font-bold transition-all text-xs tracking-wider cursor-pointer ${
                            viewMode === tab.key
                              ? "bg-emerald-400 text-slate-950 shadow-[0_0_14px_rgba(0,255,157,0.45)]"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative w-full flex-1 bg-slate-950">
                    {viewMode === "MAP" && mapImage && (
                      <InteriorMapComponent
                        mapImage={mapImage}
                        parametricSvg={parametricSvg}
                        locations={locations}
                        topology={topology}
                        sourceImages={sourceImages}
                        selectedObjectId={selectedObjectId}
                        onSelectObject={setSelectedObjectId}
                        theme={theme}
                        robotApiUrl={robotApiUrl}
                        workspaceId={workspaceId}
                        onAddSystemLog={addSystemLog}
                      />
                    )}
                    {viewMode === "GRAPH" && <SemanticGraph data={topology} />}
                    {viewMode === "FLEET" && (
                      <GraphVisualizerComponent
                        workspaceId={workspaceId}
                        activeNodeName={topology.node_name}
                        onNodeSelect={handleSelectFleetNode}
                      />
                    )}
                    {viewMode === "TWIN" && mapImage && (
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
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[520px]">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(0,255,157,0.12)]">
                      <Radar className="w-9 h-9" aria-hidden="true" />
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

            <div className="hud-card rounded-2xl overflow-hidden relative">
              <div className="corner-bracket corner-tl" />
              <div className="corner-bracket corner-tr" />
              <div className="corner-bracket corner-bl" />
              <div className="corner-bracket corner-br" />
              <CommandBarComponent
                topology={topology}
                systemLogs={systemLogs}
                selectedEngine={selectedEngine}
                workspaceId={workspaceId}
                onAddSystemLog={addSystemLog}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-slate-800 bg-slate-950/85">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-slate-500 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Award className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>SPATIAL_OS Cloud — Autonomous Spatial Intelligence &amp; Robotics Platform</span>
            </span>
            <span className="hidden sm:inline text-slate-700">&middot;</span>
            <a
              href="https://mincasurong.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-emerald-400 transition-colors underline decoration-emerald-500/40 underline-offset-4"
            >
              Developed by <strong className="text-emerald-400">m9g</strong>
            </a>
          </div>
          <span>
            Powered by <strong className="text-emerald-400">v4 Argon SLAM</strong> &amp;{" "}
            <strong className="text-sky-400">3.8 Flash Vision</strong>
          </span>
        </div>
      </footer>

      <RobotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={robotApiUrl}
        onSave={setRobotApiUrl}
        workspaceInfo={workspaceInfo}
        userProfile={userProfile}
        onSelectTier={handleTierChange}
        onBillingSuccess={handleBillingSuccess}
        onRequestGoogleLogin={handleTriggerGoogleLogin}
      />

      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleGoogleAuthSuccess}
      />

      {userProfile?.is_admin && (
        <AdminConsoleModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          adminEmail={userProfile.email}
          onWorkspaceUpdated={refreshWorkspaceAndGraph}
        />
      )}
    </div>
  );
}
