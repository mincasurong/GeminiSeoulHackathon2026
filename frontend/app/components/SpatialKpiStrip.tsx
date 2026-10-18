"use client";

import { Building2, CheckCircle2, Box, FileCode2 } from "lucide-react";
import { SpatialNode } from "../lib/api";

interface SpatialKpiStripProps {
  topology: SpatialNode;
  onExport: (fmt: "svg" | "dxf" | "ros2" | "json") => void;
}

export default function SpatialKpiStrip({ topology, onExport }: SpatialKpiStripProps) {
  const staticCount = topology.static_anchors?.length || 0;
  const dynamicCount = topology.dynamic_objects?.length || 0;
  const keypointCount = topology.seam_keypoints?.length || 0;
  const relationCount = topology.spatial_relations?.length || 0;

  return (
    <section
      aria-label="Spatial Intelligence Telemetry Summary"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <div className="hud-card rounded-2xl p-4 flex flex-col justify-between relative">
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          <span>[SYS.NODE.01] ACTIVE TWIN</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
            <Building2 className="w-3 h-3" aria-hidden="true" />
            LOCKED
          </span>
        </div>
        <div className="font-mono font-bold text-sm text-slate-100 truncate">
          {topology.node_name}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
            {topology.room_geometry?.approx_dimensions || "10m x 7m"}
          </span>
          <span className="truncate text-slate-400 uppercase text-[10px]">
            {topology.room_geometry?.shape || "rectangular"}
          </span>
        </div>
      </div>

      <div className="hud-card rounded-2xl p-4 flex flex-col justify-between relative">
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          <span>[SLAM.LOOP.360] TOPOLOGY</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            VERIFIED
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black font-mono text-emerald-400 tabular-nums">
            {keypointCount} SEAMS
          </span>
          <span className="text-[11px] text-sky-400 font-mono">0.0° DRIFT</span>
        </div>
        <div className="mt-2.5 text-[11px] font-mono text-slate-400 truncate">
          {topology.room_geometry?.flooring_material || "Calibrated orthographic plane"}
        </div>
      </div>

      <div className="hud-card rounded-2xl p-4 flex flex-col justify-between relative">
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          <span>[VLA.ENTITIES] GROUNDING</span>
          <Box className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-3 font-mono tabular-nums">
          <div>
            <span className="text-lg font-black text-slate-100">{staticCount}</span>
            <span className="text-[10px] text-sky-400 ml-1 uppercase font-bold">ANCHORS</span>
          </div>
          <div>
            <span className="text-lg font-black text-amber-400">{dynamicCount}</span>
            <span className="text-[10px] text-amber-300/80 ml-1 uppercase font-bold">DYNAMIC</span>
          </div>
        </div>
        <div className="mt-2.5 text-[11px] font-mono text-slate-400 tabular-nums">
          {relationCount} edges &middot; {topology.navigable_edges?.length || 0} navigable exits
        </div>
      </div>

      <div className="hud-card rounded-2xl p-4 flex flex-col justify-between relative">
        <div className="corner-bracket corner-tl" />
        <div className="corner-bracket corner-tr" />
        <div className="corner-bracket corner-bl" />
        <div className="corner-bracket corner-br" />

        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
          <span>[CAD.ROS2.IO] ARTIFACTS</span>
          <FileCode2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 my-1">
          {(["svg", "dxf", "ros2", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => onExport(fmt)}
              className="px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-400 text-[10px] font-mono font-bold uppercase text-emerald-300 transition-all cursor-pointer"
            >
              .{fmt}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          AutoCAD R12 &middot; SVG &middot; Nav2 PoseStamped
        </div>
      </div>
    </section>
  );
}
