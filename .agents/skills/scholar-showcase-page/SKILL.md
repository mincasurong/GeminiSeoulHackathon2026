---
name: scholar-showcase-page
description: >-
  Workflows and design guidelines for the standalone /scholar showcase and introduction landing page.
  Covers integrating pre-generated static assets (maps, videos, JSON), styling with CSS Modules,
  and customizing the simulated VLA Q&A playback system.
---

# 🎓 Scholar Showcase Page Design & Asset Guide

The `/scholar` route (`frontend/app/scholar/`) is a standalone, offline introduction and demonstration page for GeminiSpace. It is decoupled from live cloud APIs to allow reliable, instant-playback product walkthroughs.

---

## 1. Page Architecture & Structure

```
frontend/app/scholar/
├── layout.tsx         # Dedicated dark-theme metadata wrapper
├── page.tsx           # Interactive client component with simulated VLA playback
└── page.module.css    # Scoped CSS module with glassmorphism design tokens
```

---

## 2. Integrating Pre-Generated Media Assets

### A. Pre-Generated 2D Map & 3D Renderings
1. Place static assets in `frontend/public/` (e.g. `public/scholar-map.png` or `public/scholar-3d.mp4`).
2. Update the corresponding container in `frontend/app/scholar/page.tsx`:
   ```tsx
   {/* Interactive Map */}
   <div className={styles.card}>
     <img 
       src="/scholar-map.png" 
       alt="Pre-generated 2D Floor Plan" 
       className="w-full h-auto rounded-xl object-contain" 
     />
   </div>
   ```

### B. Pre-Generated Topology Data
1. Import `topology.json` directly from `frontend/public/topology.json`:
   ```tsx
   import topologyData from '@/public/topology.json';
   import SemanticGraph from '../components/SemanticGraph';

   {/* Inside page render */}
   <div className={styles.card}>
     <SemanticGraph data={topologyData} />
   </div>
   ```

---

## 3. Simulated VLA Model Q&A Customization

The Q&A section runs on an automatic progressive disclosure timer (`useEffect` + `setTimeout`) using the `MOCK_QA` array:

```typescript
const MOCK_QA = [
  { 
    sender: 'user', 
    text: 'Can you show me the overall structure of GeminiSpace?' 
  },
  { 
    sender: 'agent', 
    text: 'Certainly. GeminiSpace is organized into multiple interactive zones. The interactive map provides a 2D overview, while the topology graph details the underlying network architecture.' 
  },
  // Add additional conversational turns here
];
```

*   **Timing Defaults**:
    - User message delay: `1500ms`
    - Agent "thinking" and synthesis delay: `3000ms`

---

## 4. Design Tokens & Styling (`page.module.css`)

- **Color Scheme**: Deep obsidian (`#0a0a0a`), clean slate (`#ededed`), subdued muted gray (`#a1a1aa`).
- **Glassmorphism**: `background: rgba(255, 255, 255, 0.03)`, `border: 1px solid rgba(255, 255, 255, 0.1)`, `backdrop-filter: blur(8px)`.
- **Micro-Interactions**: Hover lift `translateY(-5px)`, continuous gradient shimmer (`@keyframes shimmer`).
