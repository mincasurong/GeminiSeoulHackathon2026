---
name: scholar-showcase-page
description: >-
  Use when modifying the /scholar introduction page, adding pre-generated assets
  (images, JSON, videos) to it, or building new showcase/demo landing pages.
  Covers the standalone scholar page architecture, CSS module styling, and the
  mock VLA Q&A playback system.
---

# Scholar Showcase Page Skill

## Overview

The `/scholar` route is a standalone introduction/showcase page for GeminiSpace.
It does NOT connect to the Gemini API — it uses pre-generated assets and
predefined Q&A playback to demonstrate the system's capabilities.

## Page Structure

```
frontend/app/scholar/
├── layout.tsx           # Dark-themed wrapper layout
├── page.tsx             # Main showcase page (client component)
└── page.module.css      # Scoped CSS with premium glassmorphism styling
```

## Sections

1. **Hero**: Title + subtitle with gradient text animation.
2. **Interactive Map**: Placeholder container for pre-generated map image/video.
3. **Topology Graph**: Placeholder for pre-generated graph visualization.
4. **3D Spatial Map**: Placeholder for 3D rendering (video or embed).
5. **VLA Model Q&A**: Animated chat playback using `MOCK_QA` array.

## Adding Pre-generated Assets

### Static Images
1. Place files in `frontend/public/` (e.g., `public/scholar/map.png`).
2. Replace the placeholder `<div>` in `page.tsx`:
   ```tsx
   <img src="/scholar/map.png" alt="Interactive Map" style={{ width: '100%', borderRadius: '12px' }} />
   ```

### Pre-recorded Videos
1. Place `.mp4` files in `frontend/public/scholar/`.
2. Replace placeholder:
   ```tsx
   <video autoPlay loop muted playsInline style={{ width: '100%', borderRadius: '12px' }}>
     <source src="/scholar/3d-demo.mp4" type="video/mp4" />
   </video>
   ```

### JSON Topology Data
1. Create a JSON file (e.g., `frontend/app/scholar/data/topology.json`).
2. Import and render using the existing `SemanticGraph` component:
   ```tsx
   import topologyData from './data/topology.json';
   import SemanticGraph from '../components/SemanticGraph';
   // ...
   <SemanticGraph data={topologyData} />
   ```

### Modifying the Q&A Playback
Edit the `MOCK_QA` array in `page.tsx`:
```typescript
const MOCK_QA = [
  { sender: 'user', text: 'Your question here' },
  { sender: 'agent', text: 'VLA model response here' },
  // Add more exchanges...
];
```
Timing: User messages appear after 1500ms, agent responses after 3000ms.

## Styling

The page uses CSS Modules (`page.module.css`) with:
- Dark background: `#0a0a0a`
- Glassmorphism cards: `backdrop-filter: blur(8px)`, translucent borders
- Shimmer loading animation on placeholder containers
- Hover lift effect: `translateY(-5px)`
- Gradient text: `linear-gradient(135deg, #ffffff, #a1a1aa)`
