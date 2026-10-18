"use client";

import { useState } from "react";
import { Activity, Crosshair, Cpu } from "lucide-react";
import { ObjectLocation, SpatialNode } from "../lib/api";

interface SpatialEntityInspectorProps {
  topology: SpatialNode | null;
  locations: ObjectLocation[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}

const PIPELINE_DIRECTIVES = [
  {
    num: "01",
    title: "360° Capture",
    text: "Stand at room center, capture 8 directional photos (0:N → 7:NW).",
    badge: "Sensory",
  },
  {
    num: "02",
    title: "Cognitive Topology",
    text: "Stitches overlapping seams into a Relational SLAM Property Graph.",
    badge: "Reasoning",
  },
  {
    num: "03",
    title: "Text-Bridge & CAD",
    text: "Extracts architectural geometry & materials with zero perspective warp.",
    badge: "Architecture",
  },
  {
    num: "04",
    title: "Blueprint & Grounding",
    text: "Synthesizes 16:9 orthographic 2D floor plan & percentage BBoxes.",
    badge: "Vision",
  },
  {
    num: "05",
    title: "Hardware Dispatch",
    text: "Translates visual coordinates to ROS2 Nav2 metric waypoints (1% = 0.1m).",
    badge: "Action",
  },
];

export default function SpatialEntityInspector({
  topology,
  locations,
  selectedObjectId,
  onSelectObject,
}: SpatialEntityInspectorProps) {
  const [tab, setTab] = useState<"DIRECTIVES" | "INSPECTOR">("DIRECTIVES");

  return (
    <div className="hud-card rounded-2xl p-5 flex flex-col relative">
      <div className="corner-bracket corner-tl" />
      <div className="corner-bracket corner-tr" />
      <div className="corner-bracket corner-bl" />
      <div className="corner-bracket corner-br" />

      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {tab === "DIRECTIVES" ? (
            <Cpu className="w-4 h-4 text-sky-400" aria-hidden="true" />
          ) : (
            <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          )}
          <span className="font-mono font-bold uppercase text-xs tracking-wider text-slate-100">
            {tab === "DIRECTIVES" ? "VLA Pipeline Directives" : "Spatial Entity Inspector"}
          </span>
        </div>

        <div className="flex bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setTab("DIRECTIVES")}
            className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
              tab === "DIRECTIVES"
                ? "bg-sky-400 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            STEPS
          </button>
          <button
            type="button"
            onClick={() => setTab("INSPECTOR")}
            className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
              tab === "INSPECTOR"
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ENTITIES ({locations.length})
          </button>
        </div>
      </div>

      {tab === "DIRECTIVES" || !topology ? (
        <div className="flex flex-col gap-3 font-mono text-xs text-slate-400">
          {PIPELINE_DIRECTIVES.map((step) => (
            <div key={step.num} className="flex gap-2.5 items-start group">
              <span className="flex-shrink-0 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 w-5 h-5 rounded flex items-center justify-center text-[10px]">
                {step.num}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {step.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {step.badge}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[300px]">
          {locations.map((loc) => {
            const anchor = topology.static_anchors?.find(
              (a) => a.anchor_id === loc.object_id
            );
            const dyn = topology.dynamic_objects?.find(
              (d) => d.object_id === loc.object_id
            );
            const isStatic = !!anchor;
            const isSelected = selectedObjectId === loc.object_id;
            const dir = anchor?.cardinal_direction || dyn?.cardinal_direction || "—";
            const mx = (((loc.xmin + loc.xmax) / 2) * 0.1).toFixed(2);
            const my = (((loc.ymin + loc.ymax) / 2) * 0.1).toFixed(2);

            return (
              <button
                key={loc.object_id}
                type="button"
                onClick={() => onSelectObject(isSelected ? null : loc.object_id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-400/60 text-slate-100 shadow-[0_0_12px_rgba(0,255,157,0.2)]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Crosshair
                      className={`w-3 h-3 flex-shrink-0 ${
                        isSelected
                          ? "text-emerald-400"
                          : isStatic
                          ? "text-sky-400"
                          : "text-amber-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs font-bold truncate">
                      {loc.object_id}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {anchor?.type || dyn?.type || "Spatial Entity"} &middot; Sector {dir}
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] tabular-nums flex-shrink-0">
                  <div className="text-emerald-400 font-bold">
                    {mx}m, {my}m
                  </div>
                  <div className="text-slate-500">
                    {isStatic ? "ANCHOR" : "DYNAMIC"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
