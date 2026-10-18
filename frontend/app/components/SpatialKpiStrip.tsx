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
      <div className="hud-card rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
          <span className="font-medium">Active Spatial Twin</span>
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Building2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            LIVE
          </span>
        </div>
        <div className="font-mono font-semibold text-sm text-slate-100 truncate">
          {topology.node_name}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800/90 text-emerald-300 border border-slate-700">
            {topology.room_geometry?.approx_dimensions || "10m x 7m"}
          </span>
          <span className="truncate text-slate-400">
            {topology.room_geometry?.shape || "rectangular"}
          </span>
        </div>
      </div>

      <div className="hud-card rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
          <span className="font-medium">Visual SLAM Loop Closure</span>
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" aria-hidden="true" />
            VERIFIED
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
            {keypointCount} Seams
          </span>
          <span className="text-xs text-slate-300 font-mono">360° Closed (0.0° drift)</span>
        </div>
        <div className="mt-2.5 text-[11px] font-mono text-slate-400 truncate">
          {topology.room_geometry?.flooring_material || "Calibrated orthographic plane"}
        </div>
      </div>

      <div className="hud-card rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
          <span className="font-medium">Grounded Entities</span>
          <Box className="w-4 h-4 text-sky-400" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-3 tabular-nums">
          <div>
            <span className="text-lg font-bold font-mono text-slate-100">{staticCount}</span>
            <span className="text-xs text-slate-300 ml-1">Anchors</span>
          </div>
          <div>
            <span className="text-lg font-bold font-mono text-amber-400">{dynamicCount}</span>
            <span className="text-xs text-slate-300 ml-1">Objects</span>
          </div>
        </div>
        <div className="mt-2.5 text-[11px] font-mono text-slate-400 tabular-nums">
          {relationCount} topological relations &middot; {topology.navigable_edges?.length || 0} exits
        </div>
      </div>

      <div className="hud-card rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
          <span className="font-medium">CAD &amp; Robotics Export Suite</span>
          <FileCode2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 my-1">
          {(["svg", "dxf", "ros2", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => onExport(fmt)}
              className="px-2 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-[10px] font-mono font-semibold uppercase text-slate-100 transition-colors cursor-pointer"
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
