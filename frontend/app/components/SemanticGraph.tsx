'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SpatialNode } from '../lib/api';

const RootNode = ({ data }: any) => (
  <div className="bg-purple-950/95 px-4 py-2.5 rounded-xl text-white font-bold font-mono text-xs border-2 border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.4)] text-center min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-purple-300" />
    <div className="text-[9px] uppercase tracking-widest text-purple-300 mb-0.5">SLAM ROOT NODE</div>
    <div className="truncate max-w-[220px]">{data.label}</div>
    {data.dims && <div className="text-[10px] text-emerald-300 mt-0.5">{data.dims}</div>}
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-purple-300" />
  </div>
);

const KeypointNode = ({ data }: any) => (
  <div className="bg-slate-900/95 px-2.5 py-1.5 rounded-lg border-2 border-emerald-400 shadow-[0_0_15px_rgba(0,255,157,0.25)] font-mono text-center min-w-[120px]">
    <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-emerald-400" />
    <div className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-wider">
      SEAM {data.bearing !== undefined ? `${data.bearing}°` : ''} {data.dist ? `· ${data.dist}m` : ''}
    </div>
    <div className="text-[10px] text-white font-bold truncate max-w-[150px]">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-emerald-400" />
  </div>
);

const AnchorNode = ({ data }: any) => (
  <div className="bg-sky-950/95 px-3 py-1.5 rounded-lg text-white font-mono text-xs border-2 border-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.25)] text-center min-w-[130px]">
    <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-sky-300" />
    <div className="text-[9px] text-sky-300 font-bold uppercase">{data.direction || 'ANCHOR'} · {data.sublabel}</div>
    <div className="font-bold text-[11px] text-white">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-sky-300" />
  </div>
);

const ObjectNode = ({ data }: any) => (
  <div className="bg-amber-500/95 px-3 py-1.5 rounded-lg text-slate-950 font-bold font-mono text-xs border-2 border-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.35)] text-center min-w-[130px]">
    <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-amber-900" />
    <div className="text-[9px] text-amber-950/80 font-extrabold uppercase">{data.direction || 'DYNAMIC'} · {data.sublabel}</div>
    <div className="font-extrabold text-[11px] text-slate-950">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-amber-900" />
  </div>
);

const nodeTypes = {
  root: RootNode,
  keypoint: KeypointNode,
  anchor: AnchorNode,
  object: ObjectNode,
};

export default function SemanticGraph({ data }: { data: SpatialNode }) {
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const centerX = 520;
    const centerY = 340;

    let e = 1000;
    let perimeter = 2000;

    // Root Node
    flowNodes.push({
      id: data.node_name,
      type: 'root',
      position: { x: centerX - 100, y: centerY - 30 },
      data: {
        label: data.node_name,
        dims: data.room_geometry?.approx_dimensions,
      },
    });

    const existingIds = new Set<string>();
    existingIds.add(data.node_name);

    // Keypoints Layout (Outer Ring Radius 320)
    const kps = data.seam_keypoints || [];
    kps.forEach((kp, idx) => {
      const deg = kp.bearing_degrees ?? (idx * 45);
      const angleRad = (deg - 90) * (Math.PI / 180);
      flowNodes.push({
        id: kp.keypoint_id,
        type: 'keypoint',
        position: {
          x: centerX + 340 * Math.cos(angleRad) - 65,
          y: centerY + 260 * Math.sin(angleRad) - 22,
        },
        data: {
          label: kp.keypoint_id,
          bearing: deg,
          dist: kp.estimated_distance_m,
        },
      });
      existingIds.add(kp.keypoint_id);
      flowEdges.push({
        id: `edge-${e--}`,
        source: data.node_name,
        target: kp.keypoint_id,
        animated: true,
        style: { stroke: '#00FF9D', strokeWidth: 1.2, opacity: 0.35 },
      });
    });

    // Perimeter Loop Closure Ring
    if (kps.length > 1) {
      for (let i = 0; i < kps.length; i++) {
        const current = kps[i];
        const next = kps[(i + 1) % kps.length];
        flowEdges.push({
          id: `perimeter-${perimeter--}`,
          source: current.keypoint_id,
          target: next.keypoint_id,
          type: 'straight',
          style: { stroke: '#00FF9D', strokeWidth: 2, strokeDasharray: '6,4', opacity: 0.75 },
        });
      }
    }

    // Static Anchors Layout (Inner Ring Radius 185)
    const anchors = data.static_anchors || [];
    anchors.forEach((a, idx) => {
      let angleRad = (idx / Math.max(1, anchors.length)) * 2 * Math.PI - Math.PI / 2;
      if (a.associated_keypoints && a.associated_keypoints.length > 0) {
        const kp = kps.find(k => k.keypoint_id === a.associated_keypoints![0]);
        if (kp) angleRad = ((kp.bearing_degrees - 90) * Math.PI) / 180 + (idx % 2 === 0 ? 0.18 : -0.18);
      }

      flowNodes.push({
        id: a.anchor_id,
        type: 'anchor',
        position: {
          x: centerX + 195 * Math.cos(angleRad) - 65,
          y: centerY + 150 * Math.sin(angleRad) - 20,
        },
        data: {
          label: a.anchor_id,
          sublabel: a.type,
          direction: a.cardinal_direction,
        },
      });
      existingIds.add(a.anchor_id);
      flowEdges.push({
        id: `edge-${e--}`,
        source: data.node_name,
        target: a.anchor_id,
        style: { stroke: '#38BDF8', strokeWidth: 1.5, opacity: 0.6 },
      });
    });

    // Dynamic Objects Layout (Mid-Outer Ring Radius 265)
    const objects = data.dynamic_objects || [];
    objects.forEach((obj, idx) => {
      const angleRad = ((idx + 0.5) / Math.max(1, objects.length)) * 2 * Math.PI - Math.PI / 4;
      flowNodes.push({
        id: obj.object_id,
        type: 'object',
        position: {
          x: centerX + 265 * Math.cos(angleRad) - 65,
          y: centerY + 205 * Math.sin(angleRad) - 20,
        },
        data: {
          label: obj.object_id,
          sublabel: obj.type,
          direction: obj.cardinal_direction,
        },
      });
      existingIds.add(obj.object_id);
      flowEdges.push({
        id: `edge-${e--}`,
        source: data.node_name,
        target: obj.object_id,
        style: { stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '4,3', opacity: 0.7 },
      });
    });

    // Spatial Relations
    const relations = data.spatial_relations || [];
    relations.forEach(r => {
      if (existingIds.has(r.source) && existingIds.has(r.target)) {
        flowEdges.push({
          id: `edge-${e--}`,
          source: r.source,
          target: r.target,
          label: `${r.relation}${r.distance_estimate ? ` (${r.distance_estimate})` : ''}`,
          labelStyle: { fill: '#38BDF8', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#0f172a', opacity: 0.9 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38BDF8' },
          style: { stroke: '#38BDF8', strokeWidth: 2, opacity: 0.85 },
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  return (
    <div
      className="w-full h-[580px] sm:h-[640px] bg-[#030712] relative xyflow-dark overflow-hidden"
      style={{ width: '100%', height: '620px' }}
    >
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 font-mono text-[11px] text-slate-200 shadow-lg">
        <span className="text-emerald-400 font-bold">VISUAL SLAM PROPERTY GRAPH</span>
        <span className="text-slate-600">|</span>
        <span>Keypoints: <strong>{data?.seam_keypoints?.length || 0}</strong></span>
        <span className="text-slate-600">·</span>
        <span>Anchors: <strong>{data?.static_anchors?.length || 0}</strong></span>
        <span className="text-slate-600">·</span>
        <span>Objects: <strong>{data?.dynamic_objects?.length || 0}</strong></span>
        {data?.loop_closure?.closure_verified && (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
            LOOP CLOSURE 360° VERIFIED
          </span>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.2}
        maxZoom={2.0}
        style={{ width: '100%', height: '100%' }}
        className="bg-[#030712]"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="bg-slate-900 border border-slate-700 fill-slate-300" />
        <MiniMap
          nodeColor={(n) =>
            n.type === 'root'
              ? '#9333ea'
              : n.type === 'keypoint'
              ? '#10b981'
              : n.type === 'anchor'
              ? '#0ea5e9'
              : '#f59e0b'
          }
          maskColor="rgba(2, 6, 23, 0.8)"
          style={{ backgroundColor: '#0f172a' }}
        />
      </ReactFlow>
    </div>
  );
}
