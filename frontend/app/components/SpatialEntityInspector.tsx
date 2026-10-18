"use client";

import { Activity, Crosshair } from "lucide-react";
import { ObjectLocation, SpatialNode } from "../lib/api";

interface SpatialEntityInspectorProps {
  topology: SpatialNode;
  locations: ObjectLocation[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}

export default function SpatialEntityInspector({
  topology,
  locations,
  selectedObjectId,
  onSelectObject,
}: SpatialEntityInspectorProps) {
  return (
    <div className="hud-card rounded-2xl p-5 flex flex-col max-h-[380px]">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h3 className="font-sans font-semibold text-sm text-slate-100">
            Spatial Entity Inspector
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 tabular-nums">
          {locations.length} localized
        </span>
      </div>

      <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
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
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                isSelected
                  ? "bg-emerald-500/15 text-slate-100"
                  : "bg-slate-900/50 hover:bg-slate-900 text-slate-300"
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
                  />
                  <span className="font-mono text-xs font-semibold truncate">
                    {loc.object_id}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {anchor?.type || dyn?.type || "Spatial Entity"} &middot; Sector {dir}
                </div>
              </div>

              <div className="text-right font-mono text-[10px] tabular-nums flex-shrink-0">
                <div className="text-emerald-400">
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
    </div>
  );
}
