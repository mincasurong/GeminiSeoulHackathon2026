"use client";

import Link from "next/link";
import { Settings, Sparkles, Crown, Sun, Moon, Building2, LogOut, ShieldAlert, Zap } from "lucide-react";
import { EngineType, WorkspaceInfo } from "../lib/api";
import { UserProfile } from "../lib/googleAuth";
import { GraphNodeSummary } from "../lib/useSpatialWorkspace";

interface SaasHeaderBarProps {
  selectedEngine: EngineType;
  onSelectEngine: (engine: EngineType) => void;
  workspaceInfo: WorkspaceInfo | null;
  userProfile: UserProfile | null;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onLogout: () => void;
  availableNodes: GraphNodeSummary[];
  activeNodeName?: string;
  onSelectNode: (nodeId: string, nodeObj: GraphNodeSummary) => void;
  fontSize: "S" | "M" | "L";
  onChangeFontSize: (size: "S" | "M" | "L") => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export default function SaasHeaderBar({
  selectedEngine,
  onSelectEngine,
  workspaceInfo,
  userProfile,
  onOpenAuthModal,
  onOpenAdminModal,
  onLogout,
  availableNodes,
  activeNodeName,
  onSelectNode,
  fontSize,
  onChangeFontSize,
  theme,
  onToggleTheme,
  onOpenSettings,
}: SaasHeaderBarProps) {
  const isDark = theme === "dark";
  const currentTier = workspaceInfo?.tier || "free";
  const isPaidOrAdmin = Boolean(userProfile?.is_admin) || currentTier !== "free";

  return (
    <>
      <div className="bg-slate-950/95 border-b border-slate-800/80 px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono z-50">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full pulse-dot bg-emerald-400" aria-hidden="true" />
            <span className="text-emerald-400 font-semibold">LIVE CLOUD TELEMETRY</span>
          </div>
          <span className="hidden sm:inline text-slate-700" aria-hidden="true">|</span>
          <span className="hidden sm:inline">
            SLAM ENGINE:{" "}
            <strong className="text-slate-100">
              {selectedEngine === "gemini-4-argon" ? "v4 Argon Pro" : "3.8 Flash"}
            </strong>
          </span>
          <span className="hidden md:inline text-slate-700" aria-hidden="true">|</span>
          <span className="hidden md:inline">
            VISION GROUNDING: <strong className="text-sky-400">3.8 Flash</strong>
          </span>
          {workspaceInfo && (
            <>
              <span className="hidden lg:inline text-slate-700" aria-hidden="true">|</span>
              <span className="hidden lg:inline tabular-nums">
                QUOTA:{" "}
                <strong className="text-amber-400">
                  {workspaceInfo.scans_used}/{workspaceInfo.scans_limit} scans
                </strong>
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md px-2.5 py-0.5 text-[10px] text-slate-200 transition-colors cursor-pointer"
          >
            <Crown className="w-3 h-3 text-amber-400" aria-hidden="true" />
            <span>{workspaceInfo?.plan_name || "Starter B2C (Free)"}</span>
            <span className="text-emerald-400 font-semibold ml-1">
              {currentTier === "free" && !userProfile?.is_admin ? "Upgrade" : "Manage Plan"}
            </span>
          </button>

          {userProfile?.is_admin && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-md px-2.5 py-0.5 text-[10px] text-amber-300 font-bold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" aria-hidden="true" />
              <span>ADMIN CONSOLE</span>
            </button>
          )}

          <Link
            href="/scholar"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-colors font-semibold"
          >
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            <span>Interactive Demo Lab</span>
          </Link>

          <a
            href="https://mincasurong.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <span>Developed by</span>
            <strong className="text-emerald-400 font-bold">m9g</strong>
          </a>
        </div>
      </div>

      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 text-base shadow-sm">
              S<span className="text-[9px] align-super text-sky-400">OS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-bold tracking-tight text-lg text-slate-100">
                  SPATIAL<span className="text-emerald-400">_OS</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  v4.0 Enterprise SaaS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Spatial Intelligence &middot; Parametric 2D/3D CAD &middot; Autonomous Robotics VLA
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableNodes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <select
                  aria-label="Active Spatial Node"
                  value={activeNodeName || ""}
                  onChange={(e) => {
                    const found = availableNodes.find((n) => n.id === e.target.value);
                    if (found) onSelectNode(found.id, found);
                  }}
                  className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {availableNodes.map((n) => (
                    <option key={n.id} value={n.id} className="bg-slate-900 text-slate-100">
                      {n.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              role="group"
              aria-label="Cognitive Engine Selection"
              className="bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 flex font-mono text-[11px]"
            >
              <button
                type="button"
                aria-pressed={selectedEngine === "gemini-4-argon"}
                onClick={() => {
                  if (isPaidOrAdmin) {
                    onSelectEngine("gemini-4-argon");
                  } else {
                    onOpenSettings();
                  }
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedEngine === "gemini-4-argon"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                title={
                  isPaidOrAdmin
                    ? "v4 Argon Pro (Deep SLAM & Multi-Room Planner)"
                    : "Pro / Enterprise Subscription Required (Click to Subscribe)"
                }
              >
                v4 Argon
              </button>
              <button
                type="button"
                aria-pressed={selectedEngine === "gemini-3.8-flash"}
                onClick={() => onSelectEngine("gemini-3.8-flash")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  selectedEngine === "gemini-3.8-flash"
                    ? "bg-sky-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                title="3.8 Flash (Free Mode Default)"
              >
                3.8 Flash
              </button>
            </div>

            {!isPaidOrAdmin && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="cyber-btn text-xs py-1.5 px-3"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upgrade Pro</span>
              </button>
            )}

            {userProfile ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1">
                <div
                  className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300"
                  aria-hidden="true"
                >
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-100 max-w-[120px] truncate">
                  {userProfile.name}
                </span>
                <button
                  type="button"
                  aria-label="Sign out of Google Account"
                  onClick={onLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                  title="Sign out of Google Account"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <div
              role="group"
              aria-label="Interface Font Scale"
              className="bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 flex"
            >
              {(["S", "M", "L"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={fontSize === s}
                  onClick={() => onChangeFontSize(s)}
                  className={`px-2 py-1 rounded-md font-mono font-semibold transition-colors text-xs cursor-pointer ${
                    fontSize === s
                      ? "bg-slate-700 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors hover:border-slate-500 cursor-pointer"
              title="Toggle Dark/Light Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-400" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              aria-label="Open Subscription Plans and ROS2 Settings"
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-300 transition-colors hover:text-emerald-400 hover:border-emerald-500/40 cursor-pointer"
              title="Plans, Billing & ROS2 Bridge Configuration"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
