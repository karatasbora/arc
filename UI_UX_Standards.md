# UI/UX Standards Report

This document outlines the UI/UX standards and design system implemented for the personal resume website. It serves as a guide for maintaining consistency, accessibility, and visual quality.

## 1. Design Philosophy
The design follows a "The Approachable Innovator" theme, blending professional clarity with modern, tech-forward aesthetics.
- **Keywords:** Clean, Modern, Accessible, Interactive, Human-Centered.
- **Core Visuals:** Glassmorphism, smooth gradients, and micro-animations.

## 2. Color System
The color palette utilizes semantic variable mappings to support both Light and Dark modes seamlessy.

### Primitives (Tailwind-inspired)
- **Slate (Neutral):** Used for text, backgrounds, and borders.
- **Cyan (Tech Accent):** efficient for dark mode highlights and tech-related links.
- **Amber (Human Accent):** precise for light mode highlights and focus rings.

### Semantic Mapping
| Component | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **Background** | Slate-50 + Dot Grid | Slate-950 + Dark Glows |
| **Primary Text** | Slate-900 | Slate-100 |
| **Secondary Text** | Slate-500 | Slate-400 |
| **Accent Primary** | Amber-600 | Cyan-400 |
| **Cards** | White Glass (70% opacity) | Slate-900 Glass (60% opacity) |

## 3. Typography
Three distinct typefaces establish hierarchy and character:
- **Headings:** `Inter` (Sans-serif, Geometric) - Structural and modern.
- **Body:** `IBM Plex Sans` (Humanist Sans) - Highly readable for long-form text.
- **UI Elements:** `Outfit` (Geometric/Rounded) - Friendly, used for tags and metadata.

## 4. Accessibility (A11y) Standards
- **Contrast:** High contrast ratios maintained for text (Slate-900/500 on light, Slate-100/400 on dark).
- **Focus States:** Custom dual-ring focus indicators (`--focus-ring`) ensure visibility for keyboard users.
    - *Cyan Ring* for Dark Mode.
    - *Amber Ring* for Light Mode.
- **Semantic HTML:** Proper use of `<header>`, `<main>`, `<section>`, and `<button>` elements.
- **ARIA:** `aria-label` used on icon-only buttons (e.g., Theme Toggle).
- **Reduced Motion:** Animations should respect `prefers-reduced-motion` (implied best practice for future updates).

## 5. Responsiveness
- **Responsive Design (Desktop-First):** Layout adapts via media queries (`max-width: 600px`).
- **Flexbox Layouts:** Used for header alignment and job blocks to stack vertically on smaller screens.
- **Touch Targets:** Buttons and interactive elements have adequate padding for touch interaction.

## 6. Interactive Elements & Motion
- **Micro-animations:**
    - `simpleFade`: Smooth entry for dropdowns and tooltips.
    - `slideUp`: Staggered entry for page sections on load.
    - `tagFadeIn`: Sequenced look for skill tags.
- **Feedback:**
    - Hover states on all interactive elements (transform -1px, shadow increase).
    - Visual confirmation for "Copy to Clipboard" actions.
- **Glassmorphism:** utilized on cards and headers (`backdrop-filter: blur(12px)`) to maintain context with the background.

## 7. SEO & Performance
- **Meta Tags:** Comprehensive Open Graph and Twitter Card support.
- **JSON-LD:** Structured data (`Person`, `ProfilePage`) for rich search results.
- **Loading:** Critical images (Profile) use `loading="eager"`.
- **Assets:** Vector SVGs used for iconography to ensure crispness at any scale without file size bloat.

## 8. Print Styling
- A dedicated `print.css` ensures the resume formats correctly for physical paper or PDF generation, removing interactive elements (buttons, navigation) and adjusting layout for A4/Letter sizing.
