"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Layers, Navigation, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Locale, TRANSLATIONS } from "../lib/i18n";

interface IntroScreenProps {
  locale: Locale;
  onEnterMain: () => void;
  onBack: () => void;
}

export default function IntroScreen({
  locale,
  onEnterMain,
  onBack,
}: IntroScreenProps) {
  const t = TRANSLATIONS[locale];
  const steps = [
    {
      icon: <Camera className="w-5 h-5 text-emerald-400" aria-hidden="true" />,
      title: t.introStep1Title,
      desc: t.introStep1Desc,
    },
    {
      icon: <Layers className="w-5 h-5 text-sky-400" aria-hidden="true" />,
      title: t.introStep2Title,
      desc: t.introStep2Desc,
    },
    {
      icon: <Navigation className="w-5 h-5 text-amber-400" aria-hidden="true" />,
      title: t.introStep3Title,
      desc: t.introStep3Desc,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg bg-slate-900/95 border-2 border-b-4 border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center space-x-1 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t.stageAuth}</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
            {t.introStepBadge}
          </span>
        </div>

        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {t.introTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">{t.introSubtitle}</p>
        </div>

        <div className="space-y-3">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                {s.icon}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onEnterMain}
            className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-sm sm:text-base border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>{t.introEnterMain}</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>

          <Link
            href="/scholar"
            className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.introShowcaseLink}</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
