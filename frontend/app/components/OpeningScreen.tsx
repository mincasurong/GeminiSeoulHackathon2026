"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, ArrowRight, Sparkles } from "lucide-react";

interface OpeningScreenProps {
  onNext: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

const COLORS = ["#10B981", "#F59E0B", "#34D399", "#38BDF8", "#059669", "#FDE047"];

export default function OpeningScreen({ onNext }: OpeningScreenProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generated: Particle[] = [];
    for (let b = 0; b < 5; b++) {
      const cx = 15 + Math.random() * 70;
      const cy = 15 + Math.random() * 50;
      for (let i = 0; i < 10; i++) {
        const angle = (i * 36 * Math.PI) / 180;
        const dist = 35 + Math.random() * 50;
        generated.push({
          id: b * 100 + i,
          x: cx,
          y: cy,
          targetX: cx + Math.cos(angle) * (dist / 10),
          targetY: cy + Math.sin(angle) * (dist / 10),
          color: COLORS[(b + i) % COLORS.length],
          size: 4 + (i % 4) * 1.5,
          duration: 1.4 + (i % 3) * 0.4,
          delay: b * 0.3,
        });
      }
    }
    setParticles(generated);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-600 via-emerald-700 to-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.x}%`, top: `${p.y}%`, scale: 0, opacity: 1 }}
            animate={{
              left: `${p.targetX}%`,
              top: `${p.targetY}%`,
              scale: [0, 1.6, 0],
              opacity: [1, 0.85, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: "easeOut",
            }}
            style={{
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              boxShadow: `0 0 12px ${p.color}`,
            }}
            className="absolute rounded-full"
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="relative z-10 max-w-md w-full text-center space-y-7 bg-white/10 backdrop-blur-xl border-2 border-b-4 border-white/25 p-8 sm:p-10 rounded-3xl shadow-2xl"
      >
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28">
          <motion.div
            animate={{ y: [0, -7, 0], rotate: [0, -2, 2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full h-full rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 border-4 border-b-8 border-white shadow-2xl flex flex-col items-center justify-center text-amber-950"
          >
            <div className="absolute -top-3.5 -right-2 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white shadow-md">
              <Crown className="w-4 h-4 fill-current text-yellow-200" aria-hidden="true" />
            </div>
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">3D</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-900/80 font-mono">
              SPATIAL
            </span>
          </motion.div>
        </div>

        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>1st Place Spatial Intelligence AI</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SPATIAL_OS 스튜디오
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            8장의 방 사진으로 <strong>2D 평면도 · 3D 디지털 트윈 · 로봇 자율주행 경로</strong>를 한 번에 완성하세요.
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-base tracking-wide shadow-xl shadow-amber-500/30 flex items-center justify-center space-x-2 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 transition-all cursor-pointer"
        >
          <span>시작하기 (Get Started)</span>
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </motion.button>

        <div className="pt-1">
          <a
            href="https://mincasurong.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-200/80 hover:text-white transition-colors"
          >
            Developed by m9g &middot; mincasurong.github.io ↗
          </a>
        </div>
      </motion.div>
    </div>
  );
}
