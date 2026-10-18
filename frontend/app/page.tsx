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
import { Download, Compass, Cpu, Layers, Radar, Award } from "lucide-react";

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
      className={`grid-bg min-h-screen flex flex-col transition-colors duration-200 ${FONT_SIZE_CLASS_MAP[fontSize]}`}
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
            <div className="hud-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-sans font-semibold text-slate-100 text-sm">
                    360° Panoramic Ingestion
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  8 SECTORS (0°–315°)
                </span>
              </div>

              <NodeCaptureComponent
                onAnalysisComplete={handleAnalysisComplete}
                onBusyChange={setIsBusy}
                selectedEngine={selectedEngine}
                workspaceId={workspaceId}
              />
            </div>

            {topology ? (
              <SpatialEntityInspector
                topology={topology}
                locations={locations}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
              />
            ) : (
              <div className="hud-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span className="font-sans font-semibold text-sky-400 text-xs uppercase tracking-wider">
                    VLA Pipeline Architecture
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload 8 directional room photos to extract a 360° SLAM keypoint graph, synthesize a parametric 2D CAD floor plan, and generate ROS2 Nav2 trajectories.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="hud-card rounded-2xl overflow-hidden flex flex-col min-h-[520px]">
              {topology ? (
                <>
                  <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/60">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h2 className="font-sans font-semibold text-sm text-slate-100">
                        {viewMode === "MAP" && "Orthographic 2D Blueprint & CAD Overlay"}
                        {viewMode === "GRAPH" && "Visual SLAM Keypoint & Relational Graph"}
                        {viewMode === "FLEET" && "Multi-Room Topological Fleet Graph"}
                        {viewMode === "TWIN" && "3D Voxel & Parametric Wall Digital Twin"}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleExportArtifact("json")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold text-[10px] bg-slate-900 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-colors cursor-pointer"
                        title="Download full spatial topology JSON"
                      >
                        <Download className="w-3 h-3" /> JSON
                      </button>
                    </div>

                    <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
                      {[
                        { key: "MAP", label: "2D Blueprint" },
                        { key: "GRAPH", label: "SLAM Graph" },
                        { key: "FLEET", label: "Multi-Room" },
                        { key: "TWIN", label: "3D Twin" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setViewMode(tab.key as any)}
                          className={`px-3 py-1 rounded-md font-sans font-semibold transition-all text-xs cursor-pointer ${
                            viewMode === tab.key
                              ? "bg-emerald-500 text-slate-950"
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
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-5">
                    <Radar className="w-8 h-8" />
                  </div>
                  <h3 className="font-sans font-semibold text-slate-200 text-base mb-1.5">
                    Awaiting Spatial Telemetry
                  </h3>
                  <p className="max-w-sm text-xs leading-relaxed text-slate-400">
                    Upload 8 sequential directional images on the left to initiate the 3-step VLA pipeline.
                  </p>
                </div>
              )}
            </div>

            <div className="hud-card rounded-2xl overflow-hidden">
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

      <footer className="py-4 border-t border-slate-800/80 bg-slate-950/90">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>SPATIAL_OS Cloud — Autonomous Spatial Intelligence &amp; Robotics Platform</span>
            </span>
            <span className="hidden sm:inline text-slate-700">&middot;</span>
            <a
              href="https://mincasurong.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-slate-300 hover:text-emerald-400 transition-colors underline decoration-emerald-500/40 underline-offset-4"
            >
              Developed by <strong className="text-emerald-400">m9g</strong>
            </a>
          </div>
          <span className="font-mono text-[11px]">
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
