"use client";

import { useState } from "react";
import NodeCaptureComponent from "./components/NodeCaptureComponent";
import CommandBarComponent from "./components/CommandBarComponent";
import InteriorMapComponent from "./components/InteriorMapComponent";
import SemanticGraph from "./components/SemanticGraph";
import GraphVisualizerComponent from "./components/GraphVisualizerComponent";
import DigitalTwin from "./components/DigitalTwin";
import RobotSettingsModal from "./components/RobotSettingsModal";
import GoogleAuthModal from "./components/GoogleAuthModal";
import AdminConsoleModal from "./components/AdminConsoleModal";
import SaasHeaderBar, { AppStage } from "./components/SaasHeaderBar";
import OpeningScreen from "./components/OpeningScreen";
import AuthScreen from "./components/AuthScreen";
import IntroScreen from "./components/IntroScreen";
import { useSpatialWorkspace } from "./lib/useSpatialWorkspace";
import { Locale, TRANSLATIONS } from "./lib/i18n";
import {
  Download,
  Camera,
  Layers,
  MessageSquare,
  CreditCard,
} from "lucide-react";

type MainWorkspaceTab = "VIEWPORT" | "SCAN" | "CHAT";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [stage, setStage] = useState<AppStage>("opening");
  const [mainTab, setMainTab] = useState<MainWorkspaceTab>("VIEWPORT");
  const t = TRANSLATIONS[locale];

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

  if (stage === "opening") {
    return (
      <OpeningScreen
        locale={locale}
        onChangeLocale={setLocale}
        onNext={() => setStage("auth")}
      />
    );
  }

  return (
    <div className="grid-bg min-h-screen flex flex-col text-sm">
      <SaasHeaderBar
        locale={locale}
        onChangeLocale={setLocale}
        currentStage={stage}
        onChangeStage={setStage}
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
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {stage === "auth" && (
        <AuthScreen
          locale={locale}
          userProfile={userProfile}
          onGoogleLogin={async () => {
            await handleTriggerGoogleLogin();
            setStage("intro");
          }}
          onContinue={() => setStage("intro")}
          onBack={() => setStage("opening")}
        />
      )}

      {stage === "intro" && (
        <IntroScreen
          locale={locale}
          onEnterMain={() => setStage("main")}
          onBack={() => setStage("auth")}
        />
      )}

      {stage === "main" && (
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/90 rounded-2xl border-2 border-slate-800 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={() => setMainTab("VIEWPORT")}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mainTab === "VIEWPORT"
                  ? "bg-amber-400 text-amber-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>{t.mainTabViewport}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("SCAN")}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mainTab === "SCAN"
                  ? "bg-amber-400 text-amber-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              <span>{t.mainTabScan}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("CHAT")}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mainTab === "CHAT"
                  ? "bg-amber-400 text-amber-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>{t.mainTabChat}</span>
            </button>
          </div>

          {mainTab === "VIEWPORT" && (
            <div className="hud-card rounded-3xl overflow-hidden flex flex-col min-h-[540px] relative">
              <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-white">
                    {topology?.node_name || "Spatial Blueprint"}
                  </span>
                  {topology?.room_geometry?.approx_dimensions && (
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {topology.room_geometry.approx_dimensions}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                    {[
                      { key: "MAP", label: t.view2DMap },
                      { key: "TWIN", label: t.view3DTwin },
                      { key: "GRAPH", label: t.viewGraph },
                      { key: "FLEET", label: t.viewFleet },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setViewMode(tab.key as any)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          viewMode === tab.key
                            ? "bg-emerald-400 text-slate-950"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {topology && (
                    <button
                      type="button"
                      onClick={() => handleExportArtifact("dxf")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-mono font-bold text-xs bg-slate-900 text-sky-300 hover:bg-slate-800 border border-slate-700 cursor-pointer"
                      title="AutoCAD .DXF Download"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>.DXF</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative w-full min-h-[580px] sm:min-h-[640px] flex-1 bg-slate-950">
                {topology && viewMode === "MAP" && mapImage && (
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
                {topology && viewMode === "GRAPH" && <SemanticGraph data={topology} />}
                {topology && viewMode === "FLEET" && (
                  <GraphVisualizerComponent
                    workspaceId={workspaceId}
                    activeNodeName={topology.node_name}
                    activeTopology={topology}
                    onNodeSelect={handleSelectFleetNode}
                  />
                )}
                {topology && viewMode === "TWIN" && mapImage && (
                  <DigitalTwin
                    mapImage={mapImage}
                    locations={locations}
                    topology={topology}
                    selectedObjectId={selectedObjectId}
                    onSelectObject={setSelectedObjectId}
                  />
                )}
              </div>
            </div>
          )}

          {mainTab === "SCAN" && (
            <div className="hud-card rounded-3xl p-6 sm:p-8 max-w-xl mx-auto w-full space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-extrabold text-white">
                  {t.scanTitle}
                </h2>
                <p className="text-xs text-slate-400">{t.scanSubtitle}</p>
              </div>

              <NodeCaptureComponent
                onAnalysisComplete={(newTopo, newMap, newLocs, newSvg) => {
                  handleAnalysisComplete(newTopo, newMap, newLocs, newSvg);
                  setMainTab("VIEWPORT");
                }}
                onBusyChange={setIsBusy}
                selectedEngine={selectedEngine}
                workspaceId={workspaceId}
              />
            </div>
          )}

          {mainTab === "CHAT" && (
            <div className="space-y-4">
              <div className="hud-card rounded-3xl overflow-hidden">
                <CommandBarComponent
                  topology={topology}
                  systemLogs={systemLogs}
                  selectedEngine={selectedEngine}
                  workspaceId={workspaceId}
                  onAddSystemLog={addSystemLog}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CreditCard className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>
                    {t.currentPlanLabel}{" "}
                    <strong>{workspaceInfo?.plan_name || "Starter B2C (Free)"}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["svg", "dxf", "ros2", "json"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleExportArtifact(fmt)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold uppercase text-emerald-300 border border-slate-700 cursor-pointer"
                    >
                      .{fmt} {t.downloadLabel}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-extrabold cursor-pointer"
                  >
                    {t.manageBillingBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      <footer className="py-4 border-t border-slate-800/80 bg-slate-950/90 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>{t.footerTagline}</span>
          <a
            href="https://mincasurong.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-slate-300 hover:text-emerald-400 transition-colors"
          >
            Developed by <strong className="text-emerald-400">m9g</strong> &middot; mincasurong.github.io ↗
          </a>
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
