"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { UserProfile } from "../lib/googleAuth";
import { Locale, TRANSLATIONS } from "../lib/i18n";

interface AuthScreenProps {
  locale: Locale;
  userProfile?: UserProfile | null;
  onGoogleLogin: () => Promise<void> | void;
  onContinue: () => void;
  onBack: () => void;
}

export default function AuthScreen({
  locale,
  userProfile,
  onGoogleLogin,
  onContinue,
  onBack,
}: AuthScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const t = TRANSLATIONS[locale];

  const handleGoogleClick = async () => {
    setIsSigningIn(true);
    try {
      await onGoogleLogin();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-slate-900/95 border-2 border-b-4 border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 text-center"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center space-x-1 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t.stageOpening}</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
            {t.authStepBadge}
          </span>
        </div>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border-2 border-b-4 border-slate-700 flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {t.authTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {t.authSubtitle}
          </p>
        </div>

        {userProfile ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between text-left">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-sm font-extrabold text-white truncate">
                    {userProfile.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    {userProfile.email}
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-4 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-sm sm:text-base border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>{t.authContinueAccount}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleClick}
              className="w-full py-4 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 shadow-md flex items-center justify-center space-x-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{t.authSigningIn}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span>{t.authGoogleSignIn}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border-2 border-b-4 border-slate-700 active:border-b-2 active:translate-y-0.5 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <span>{t.authContinueFreeGuest}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          <span>{t.authFooterNote}</span>
        </div>
      </motion.div>
    </div>
  );
}
