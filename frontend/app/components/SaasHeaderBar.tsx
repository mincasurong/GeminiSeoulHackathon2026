"use client";

import {
  Crown,
  Sun,
  Moon,
  Building2,
  LogOut,
  ShieldAlert,
  Globe,
} from "lucide-react";
import { EngineType, WorkspaceInfo } from "../lib/api";
import { UserProfile } from "../lib/googleAuth";
import { GraphNodeSummary } from "../lib/useSpatialWorkspace";
import { Locale, LOCALE_OPTIONS, TRANSLATIONS } from "../lib/i18n";

export type AppStage = "opening" | "auth" | "intro" | "main";

interface SaasHeaderBarProps {
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  currentStage: AppStage;
  onChangeStage: (stage: AppStage) => void;
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
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export default function SaasHeaderBar({
  locale,
  onChangeLocale,
  currentStage,
  onChangeStage,
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
  theme,
  onToggleTheme,
  onOpenSettings,
}: SaasHeaderBarProps) {
  const isDark = theme === "dark";
  const currentTier = workspaceInfo?.tier || "free";
  const isPaidOrAdmin = Boolean(userProfile?.is_admin) || currentTier !== "free";
  const t = TRANSLATIONS[locale];

  const stages: { id: AppStage; label: string }[] = [
    { id: "opening", label: t.stageOpening },
    { id: "auth", label: t.stageAuth },
    { id: "intro", label: t.stageIntro },
    { id: "main", label: t.stageMain },
  ];

  return (
    <header className="relative overflow-hidden border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-40">
      <div className="scan-line" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChangeStage("opening")}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
            title={t.stageOpening}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black bg-emerald-500 text-slate-950 text-sm shadow-sm group-hover:scale-105 transition-transform">
              3D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black tracking-tight text-base text-slate-100">
                  SPATIAL<span className="text-emerald-400">_OS</span>
                </span>
              </div>
            </div>
          </button>

          <nav
            aria-label="Stage Navigation"
            className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs font-bold"
          >
            {stages.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangeStage(st.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  currentStage === st.id
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => onChangeLocale(e.target.value as Locale)}
              className="bg-transparent text-xs font-mono font-bold text-slate-100 focus:outline-none cursor-pointer"
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option
                  key={opt.code}
                  value={opt.code}
                  className="bg-slate-900 text-slate-100"
                >
                  {opt.label} ({opt.native})
                </option>
              ))}
            </select>
          </div>

          {currentStage === "main" && availableNodes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <select
                aria-label="Active Spatial Node"
                value={activeNodeName || ""}
                onChange={(e) => {
                  const found = availableNodes.find((n) => n.id === e.target.value);
                  if (found) onSelectNode(found.id, found);
                }}
                className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                {availableNodes.map((n) => (
                  <option key={n.id} value={n.id} className="bg-slate-900 text-slate-100">
                    {n.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentStage === "main" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex font-mono text-[11px]">
              <button
                type="button"
                onClick={() => {
                  if (isPaidOrAdmin) {
                    onSelectEngine("gemini-4-argon");
                  } else {
                    onOpenSettings();
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedEngine === "gemini-4-argon"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                v4 Argon
              </button>
              <button
                type="button"
                onClick={() => onSelectEngine("gemini-3.8-flash")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedEngine === "gemini-3.8-flash"
                    ? "bg-sky-400 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                3.8 Flash
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>{currentTier === "free" ? t.headerFreeMode : currentTier.toUpperCase()}</span>
          </button>

          {userProfile?.is_admin && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs text-amber-300 font-bold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>ADMIN</span>
            </button>
          )}

          {userProfile ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
              <div
                className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold"
                aria-hidden="true"
              >
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-100 max-w-[100px] truncate hidden sm:inline">
                {userProfile.name}
              </span>
              <button
                type="button"
                aria-label={t.headerLogoutTitle}
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-0.5"
                title={t.headerLogoutTitle}
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
            >
              <span>{t.headerGoogleLogin}</span>
            </button>
          )}

          <button
            type="button"
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:border-slate-600 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-400" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
