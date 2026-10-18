"use client";

import Link from "next/link";
import {
  Settings,
  Sparkles,
  Crown,
  Sun,
  Moon,
  Building2,
  LogOut,
  ShieldAlert,
  Zap,
  Radio,
} from "lucide-react";
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
      <div className="bg-[#020617]/95 border-b border-emerald-500/20 px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tracking-wider z-50 relative">
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full pulse-dot bg-emerald-400" aria-hidden="true" />
            <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
          </div>
          <span className="hidden sm:inline text-slate-700" aria-hidden="true">|</span>
          <span className="hidden sm:inline">
            ENGINE:{" "}
            <strong className="text-sky-400">
              {selectedEngine === "gemini-4-argon" ? "V4 ARGON PRO" : "3.8 FLASH"}
            </strong>
          </span>
          <span className="hidden md:inline text-slate-700" aria-hidden="true">|</span>
          <span className="hidden md:inline">
            LATENCY: <strong className="text-emerald-400">~18ms</strong>
          </span>
          <span className="hidden lg:inline text-slate-700" aria-hidden="true">|</span>
          <span className="hidden lg:inline">
            ROS2 BRIDGE: <strong className="text-amber-400">STANDBY</strong>
          </span>
          {workspaceInfo && (
            <>
              <span className="hidden xl:inline text-slate-700" aria-hidden="true">|</span>
              <span className="hidden xl:inline tabular-nums">
                QUOTA:{" "}
                <strong className="text-emerald-400">
                  {workspaceInfo.scans_used}/{workspaceInfo.scans_limit} SCANS
                </strong>
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/30 text-slate-200 transition-all cursor-pointer"
          >
            <Crown className="w-3 h-3 text-amber-400" aria-hidden="true" />
            <span>{workspaceInfo?.plan_name || "Starter B2C (Free)"}</span>
            <span className="text-emerald-400 font-bold ml-1">
              {currentTier === "free" && !userProfile?.is_admin ? "[SUBSCRIBE]" : "[PLAN]"}
            </span>
          </button>

          {userProfile?.is_admin && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 rounded px-2.5 py-0.5 text-[10px] text-amber-300 font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" aria-hidden="true" />
              <span>ADMIN CONSOLE</span>
            </button>
          )}

          <Link
            href="/scholar"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/30 text-sky-400 hover:bg-sky-500/20 hover:border-sky-400 transition-all font-bold"
          >
            <Sparkles className="w-3 h-3 animate-pulse" aria-hidden="true" />
            <span>SHOWCASE LAB</span>
          </Link>

          <a
            href="https://mincasurong.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all"
          >
            <span>Developed by</span>
            <strong className="text-emerald-400 font-bold">m9g</strong>
          </a>
        </div>
      </div>

      <header className="relative overflow-hidden border-b border-emerald-500/20 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="scan-line" />

        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 shadow-[0_0_24px_rgba(0,255,157,0.18)] group-hover:border-emerald-400 group-hover:scale-105 transition-all text-lg">
                S<span className="text-[10px] align-super text-sky-400">OS</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full pulse-dot bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-mono font-black tracking-widest text-xl text-slate-100">
                  SPATIAL<span className="text-emerald-400">_OS</span>
                </h1>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  v4.0 CLOUD HUD
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase rounded bg-sky-500/10 text-sky-400 border border-sky-500/25">
                  <Radio className="w-2.5 h-2.5" aria-hidden="true" />
                  SLAM TELEMETRY
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-slate-400 uppercase mt-0.5">
                COGNITIVE SLAM &middot; PARAMETRIC 2D/3D CAD &middot; ROS2 NAV2 DISPATCH
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {availableNodes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/40 rounded-lg px-2.5 py-1.5 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <select
                  aria-label="Active Spatial Node"
                  value={activeNodeName || ""}
                  onChange={(e) => {
                    const found = availableNodes.find((n) => n.id === e.target.value);
                    if (found) onSelectNode(found.id, found);
                  }}
                  className="bg-transparent font-mono text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer max-w-[190px] truncate"
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
              className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 flex font-mono text-[10px]"
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
                className={`px-2.5 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                  selectedEngine === "gemini-4-argon"
                    ? "bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(0,255,157,0.45)]"
                    : "text-slate-400 hover:text-slate-100"
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
                className={`px-2.5 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                  selectedEngine === "gemini-3.8-flash"
                    ? "bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
                    : "text-slate-400 hover:text-slate-100"
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
                className="cyber-btn py-1 px-3 text-[11px]"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>UPGRADE PRO</span>
              </button>
            )}

            {userProfile ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                <div
                  className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-300"
                  aria-hidden="true"
                >
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-mono text-xs font-semibold text-slate-100 max-w-[120px] truncate">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 font-mono text-xs font-bold text-slate-100 transition-all cursor-pointer"
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
                <span>GOOGLE LOGIN</span>
              </button>
            )}

            <div
              role="group"
              aria-label="Interface Font Scale"
              className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 flex"
            >
              {(["S", "M", "L"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={fontSize === s}
                  onClick={() => onChangeFontSize(s)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition-all text-xs cursor-pointer ${
                    fontSize === s
                      ? "bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(0,255,157,0.4)]"
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
              className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-300 transition-all hover:border-emerald-500/40 cursor-pointer"
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
              className="w-8 h-8 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-300 transition-all hover:text-emerald-400 hover:border-emerald-500/40 cursor-pointer"
              title="Subscription Plans, Checkout & ROS2 Bridge"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
