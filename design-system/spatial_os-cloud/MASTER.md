# Design System Master File — SPATIAL_OS Cloud (Holographic Spatial HUD & Bento Console)

**Project:** SPATIAL_OS Cloud
**Style ID:** `hud-sci-fi-fui` + `bento-box-grid` (Holographic Spatial HUD & Bento Console)
**References:** `ui-ux-pro-max`, `kevindeasis/awesome-ui` (Visual Hierarchy, Keylines, Micro-Interactions, High-Contrast Overlays)

---

## 1. Color Palette (Deep Space Obsidian + Neon Mint & Cyber Cyan)

| Role | Value | CSS Variable |
|------|-------|--------------|
| Primary Canvas | `#030712` | `--bg-primary` |
| Secondary Surface | `#0F172A` | `--bg-secondary` |
| HUD Glass Card | `rgba(15, 23, 42, 0.78)` | `--bg-card` |
| HUD Card Hover | `rgba(30, 41, 59, 0.88)` | `--bg-card-hover` |
| Primary Neon Accent | `#00FF9D` | `--accent` |
| Secondary Cyber Cyan | `#38BDF8` | `--accent-cyan` |
| Tertiary Holographic Purple | `#A855F7` | `--accent-purple` |
| Warning / Dynamic Amber | `#F59E0B` | `--accent-amber` |
| Structural Keyline Border | `rgba(56, 189, 248, 0.16)` | `--border` |
| Active Hover Border | `rgba(0, 255, 157, 0.42)` | `--border-accent` |

---

## 2. Typography

- **UI / Body Font:** `Inter` (`400, 500, 600, 700, 800`)
- **Telemetry / HUD / Code Font:** `JetBrains Mono` (`400, 500, 700, 800`) with `font-feature-settings: 'tnum'` for tabular coordinate alignment.

---

## 3. Signature HUD Elements & Micro-Interactions

1. **Header Laser Scanline (`.scan-line`)**: 6s horizontal gradient sweep (`transparent -> #00FF9D -> #38BDF8 -> transparent`) along the top header keyline.
2. **HUD Corner Reticles (`.corner-bracket`)**: 9px x 9px `2px solid var(--accent)` L-brackets anchoring all primary Bento telemetry and viewport cards.
3. **360° Radar Ingestion Sweep (`.radar-sweep`)**: Conic/radial SVG sweep during active VLA synthesis.
4. **Cyber Action Buttons (`.cyber-btn`)**: Monospace uppercase `#00FF9D` bordered triggers that invert to solid `#00FF9D` on hover with `0 0 22px rgba(0, 255, 157, 0.45)` glow.
5. **Accessibility & Reduced Motion**: Full WCAG `focus-visible` outlines (`2px solid var(--accent)`) and `@media (prefers-reduced-motion: reduce)` animation suppression.
