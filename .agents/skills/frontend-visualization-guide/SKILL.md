---
name: frontend-visualization-guide
description: >-
  Use when adding, modifying, or debugging the Three.js 3D Digital Twin,
  D3.js Semantic Graph, ReactFlow multi-room graph, or the 2D InteriorMap
  bounding box overlay. Covers the visualization tech stack (Three.js,
  React Three Fiber, D3, ReactFlow), component prop interfaces, and
  how to add new visualization tabs.
---

# Frontend Visualization Guide

## Overview

SPATIAL_OS has four distinct visualization modes, each using a different
rendering technology. This skill provides the technical context needed to
modify or extend these visualizations.

---

## Visualization Stack

| Tab | Component | Technology | Purpose |
|-----|-----------|------------|---------|
| MAP | `InteriorMapComponent` | Native HTML/CSS + SVG overlays | 2D floor plan with bounding boxes |
| GRAPH | `SemanticGraph` | D3.js v7 (Force simulation) | Topology force-directed graph |
| TWIN | `DigitalTwin` | Three.js + React Three Fiber + Drei | 3D voxel heightmap digital twin |
| (Global) | `GraphVisualizerComponent` | ReactFlow v11 | Multi-room node graph with minimap |

---

## Component Prop Interfaces

### InteriorMapComponent
```typescript
interface Props {
  mapImage: string | null;           // Base64 floor plan image
  locations: ObjectLocation[];        // { object_id, ymin, xmin, ymax, xmax }
  topology: SpatialNode | null;       // Full topology for metadata
  sourceImages: string[];             // 8 directional source photos
  selectedObjectId: string | null;    // Cross-component selection sync
  onSelectObject: (id: string | null) => void;
  theme: 'dark' | 'light';
  robotApiUrl: string;               // ROS2 Nav2 endpoint
  onAddSystemLog: (log: string) => void;
}
```

### SemanticGraph
```typescript
interface Props {
  data: SpatialNode;  // Room topology
}
```
- D3 config: `forceLink(distance=100)`, `forceManyBody(strength=-300)`,
  `forceCollide(radius=40)`, `d3.zoom(scaleExtent=[0.1, 4])`.
- Node colors: Purple (Room root), Green (Anchors), Orange (Objects), Red (Edges).

### DigitalTwin
```typescript
interface Props {
  mapImage: string | null;
  locations: ObjectLocation[];
  topology: SpatialNode | null;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}
```
- Voxel generation: Reads floor plan on 128×128 grid canvas, inverts brightness
  for wall extrusion height. Uses `THREE.InstancedMesh` for performance.
- Camera: OrbitControls, constrained polar angles `[0, PI/2 - 0.05]`.

### GraphVisualizerComponent
```typescript
interface Props {
  onNodeSelect: (nodeId: string, vlaData: any) => void;
}
```
- Polls `api.getGraph()` every 5 seconds.
- Grid layout for multi-room nodes.

---

## Adding a New Visualization Tab

1. **Create the component** in `frontend/app/components/NewVizComponent.tsx`.
2. **Extend the view mode type** in `page.tsx`:
   ```typescript
   const [viewMode, setViewMode] = useState<'MAP' | 'GRAPH' | 'TWIN' | 'NEW'>('MAP');
   ```
3. **Add the tab button** in the tab bar section of `page.tsx`.
4. **Add the rendering case** in the visualization panel switch:
   ```tsx
   {viewMode === 'NEW' && <NewVizComponent topology={topology} ... />}
   ```
5. **Pass required props** — topology, mapImage, locations, selectedObjectId
   are available in `page.tsx` state.

---

## Key npm Dependencies

```json
{
  "@react-three/drei": "^10.7.7",   // Three.js helpers (Text, OrbitControls, etc.)
  "@react-three/fiber": "^9.5.0",   // React renderer for Three.js
  "three": "^0.183.1",              // 3D engine
  "d3": "^7.9.0",                   // Data-driven documents (force graphs)
  "reactflow": "^11.11.4",          // Node-edge graph UI
  "framer-motion": "^12.34.3",      // Animation library
  "lucide-react": "^0.575.0"        // Icons
}
```

## Theming Integration

All visualizations respect the `theme` prop or CSS variables:
- Dark: Background `#030712`, accent `#00FF9D`, text `#e2e8f0`
- Light: Background `#f1f5f9`, accent `#059669`, text `#0f172a`
- Use `var(--bg-primary)`, `var(--accent)`, `var(--text-primary)` from `globals.css`.
