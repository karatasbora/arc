# UI/UX Standards Report

## Design Philosophy
**Current Theme:** "The Approachable Innovator"
- **Concept:** Blends the clarity of technical documentation with the warmth of human connection.
- **Visual Metaphor:**
  - **Light Mode:** "The Classroom" - Clean, academic, warm accents.
  - **Dark Mode:** "The IDE" - Sharp code-editor aesthetic, glowing accents, high contrast.

## 1. Color System

### Palette Primitives (Tailwind-based)
- **Slate (Neutral):** range from `50` (#f8fafc) to `950` (#020617).
- **Cyan (Tech Accent):** `400` (#22d3ee) to `600` (#0891b2).
- **Amber (Human Accent):** `400` (#fbbf24) to `600` (#d97706).

### Theme Mapping

| Token | Light Mode Value | Dark Mode Value | Usage |
|-------|------------------|-----------------|-------|
| `--bg-color` | Slate-50 (#f8fafc) | Slate-950 (#0f172a) | Main Page Background |
| `--primary-text` | Slate-900 (#0f172a) | Slate-100 (#f1f5f9) | Body text |
| `--secondary-text` | Slate-500 (#64748b) | Slate-400 (#94a3b8) | Meta info, subtitles |
| `--accent-primary` | **Amber-600** (Warmth) | **Cyan-400** (Glow) | Key highlights, active states |
| `--accent-secondary`| **Cyan-600** (Tech) | **Amber-400** (Highlight)| Secondary interactions |
| `--border-color` | Slate-200 | Slate-800 | Dividers, card borders |

## 2. Typography

| Role | Font Family | Size | Weight | Line Height |
|------|-------------|------|--------|-------------|
| **Headings** | `Inter`, sans-serif | 2.75rem (H1), 1.5rem (H2) | 700 / 600 | 1.1 |
| **Body** | `IBM Plex Sans`, serif-ish | 1rem (base) | 400 | 1.6 |
| **UI / Meta** | `Outfit`, sans-serif | 0.8rem - 1.1rem | 500 | - |

- **H2 Styling:** Left border (4px), 16px padding, specific tracking (-0.02em).
- **Body Text:** Justified alignment for clean blocks.

## 3. Component Standards

### Cards & Surfaces
- **Glassmorphism:**
  - **Start:** `rgba(255, 255, 255, 0.7)` (Light) / `rgba(15, 23, 42, 0.6)` (Dark).
  - **Blur:** `backdrop-filter: blur(12px)`.
  - **Radius:** `12px` (standard), `6px` (small controls).
  - **Shadows:** Multi-layered soft shadows; stronger glow on hover.

### Interactive Elements
- **Buttons:**
  - Font: `Outfit`, SemiBold.
  - Hover: `translateY(-1px)`, opacity `0.9`.
- **Links:**
  - Style: Border-bottom 1px solid.
  - Hover: Color shift to `--link-hover` (Cyan in Light/Dark).
- **Focus States:**
  - Double ring system: 2px gap (bg color) + 4px ring (Accent color).

### Visual Effects
- **Background Texture:** "Grid & Glow"
  - Interactive radial gradients (Cyan top-left, Amber bottom-right).
  - Subtle dot grid overlay (`24px` spacing).
- **Animations:**
  - `simpleFade` (Opacity 0->1).
  - `slideUp` (TranslateY 15px->0).
  - `tagFadeIn` (Staggered entry).

## 4. Print Standards
**Philosophy:** "Minimalist & Refined" - Optimized for ink saving and readability.

### Layout Adjustments
- **Margins:** `1cm` uniform.
- **Hidden Elements:** Controls, Nav, Icons, Avatars, Shadows, Glass effects.
- **Typography:**
  - **H1:** `24pt`, Inter Bold.
  - **Body:** `9.5pt`, IBM Plex Sans.
- **Structure:**
  - Job Cards: Borders removed, padding removed (`page-break-inside: avoid`).
  - Descriptions: Always expanded (`grid-template-rows: 1fr`).
  - Skills: formatted as a cleaner inline list or grid.
  - Colors: Converted to High-Contrast Grayscale / Dark Gray (`#1f2937`).

## 5. Accessibility
- **Contrast:** High contrast text tokens used broadly.
- **Focus:** Visible dual-ring focus indicators (`:focus-visible`).
- **Reduced Motion:** Global transitions set to `0.3s ease`, safe for most, but should respect system pref (future improvement).
