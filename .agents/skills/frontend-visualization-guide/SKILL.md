---
name: frontend-visualization-guide
description: >-
  Technical reference for the SPATIAL_OS multi-mode visualization subsystem.
  Covers Three.js 3D Voxel Digital Twins, D3.js force-directed semantic graphs,
  ReactFlow multi-room graphs, and 2D SVG bounding box overlays.
---

# 🎨 SPATIAL_OS Frontend Visualization Guide

This skill provides comprehensive technical documentation for maintaining, debugging, and extending the four visualization modes in the SPATIAL_OS interface.

---

## 1. Visualization Technology Stack

| Mode | Component | Engine / Library | Key Technical Capabilities |
| :--- | :--- | :--- | :--- |
| **MAP** | `InteriorMapComponent.tsx` | Native HTML5 / SVG / CSS | Interactive % bounding box overlays, source photo inspector modal, ROS2 dispatch |
| **GRAPH** | `SemanticGraph.tsx` | D3.js v7 (`d3-force`, `d3-zoom`) | Physics force simulation, color-coded node taxonomy, SVG-to-Canvas PNG export |
| **TWIN** | `DigitalTwin.tsx` | Three.js + React Three Fiber + Drei | 128-grid pixel brightness heightmap, `THREE.InstancedMesh` voxel wall extrusion |
| **GLOBAL** | `GraphVisualizerComponent.tsx`| ReactFlow v11 | Multi-room building-scale topology graph with minimap and controls |

---

## 2. Component Architecture & Props Contracts

### 1. `InteriorMapComponent` (2D Floor Plan + ROS2)
```typescript
interface InteriorMapProps {
  mapImage: string | null;            // Base64 Data URL or public image URL
  locations: ObjectLocation[];         // [{ object_id, ymin, xmin, ymax, xmax }]
  topology: SpatialNode | null;        // Full topology structure for metadata lookup
  sourceImages: string[];              // 8 raw directional source photographs
  selectedObjectId: string | null;     // Cross-component selected object ID
  onSelectObject: (id: string | null) => void;
  theme: 'dark' | 'light';
  robotApiUrl: string;                // Target ROS2 Nav2 REST API URL
  onAddSystemLog: (log: string) => void;
}
```

### 2. `SemanticGraph` (D3.js Force-Directed Graph)
```typescript
interface SemanticGraphProps {
  data: SpatialNode;                   // Semantic topology data
}
```
*   **Force Configuration**:
    - `d3.forceLink().id(d => d.id).distance(100)`
    - `d3.forceManyBody().strength(-300)`
    - `d3.forceCollide().radius(40)`
    - `d3.zoom().scaleExtent([0.1, 4])`
*   **Node Taxonomy**:
    - Root Room: `#A855F7` (Purple square, radius 28)
    - Static Anchors: `#10B981` (Green square, radius 18)
    - Dynamic Objects: `#F59E0B` (Orange square, radius 14)
    - Navigable Edges: `#EF4444` (Red circle, radius 16)

### 3. `DigitalTwin` (Three.js 3D Voxel Heightmap)
```typescript
interface DigitalTwinProps {
  mapImage: string | null;
  locations: ObjectLocation[];
  topology: SpatialNode | null;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}
```
*   **Voxel Wall Extrusion Algorithm**:
    1. Loads the 2D floor plan onto an offscreen $128 \times 128$ HTML5 canvas.
    2. Reads pixel values: `const brightness = (r + g + b) / 3`.
    3. Inverts brightness: dark wall lines $\to$ high voxel height; light open floor $\to$ zero height.
    4. Renders thousands of voxels in a single draw call via `THREE.InstancedMesh`.
*   **Camera Controls**: `OrbitControls` with polar angle limits `[0, \pi/2 - 0.05]` to prevent clipping underneath the floor plane.

---

## 3. Adding a New Visualization Tab

To add a new visualization mode (e.g. `POINTCLOUD`):

1. **Create Component**: Create `frontend/app/components/PointCloudVisualizer.tsx`.
2. **Extend ViewMode Union** in `frontend/app/page.tsx`:
   ```typescript
   type ViewMode = 'MAP' | 'GRAPH' | 'TWIN' | 'POINTCLOUD';
   ```
3. **Add Navigation Button** in the tab bar section of `page.tsx`.
4. **Wire Render Branch**:
   ```tsx
   {viewMode === 'POINTCLOUD' && (
     <PointCloudVisualizer 
       topology={topology} 
       mapImage={mapImage} 
       locations={locations} 
     />
   )}
   ```
