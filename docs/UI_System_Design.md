# Smart Travel System - UI Design System & Style Guide

## 1. Core Vibe & Theme

- **Theme**: High-Tech Culinary, AI-Powered Discovery, Elegant Michelin Dining.
- **Aesthetic**: Premium Dark Mode, Cinematic, Glassmorphism & Neon-Glowing Accents.
- **Vibe**: The perfect fusion between romantic/elegant dining and cutting-edge artificial intelligence. Deep, moody, and highly interactive.

## 2. Color Palette

Using Tailwind utility classes with custom HEX variables for precise control:

### Backgrounds & Environment

- **Main Background**: `#0B0F19` (Deep space/slate black).
- **Cards/Glass Surfaces**: `#121A2A` (usually combined with opacity `/40` to `/80` for depth).
- **Ambient Glow Nodes**: Layered blurred blobs (`bg-purple-900/20`, `bg-amber-900/10`, `bg-cyan-900/10`) placed in the `z-0` background space.

### Texts & Typographic Colors

- **Primary Text**: `white` (`#FFFFFF`).
- **Muted/Body Text**: `white/70`, `white/60`, `white/50` (soft transparency hierarchy).
- **Borders & Dividers**: `white/5` (subtle cards), `white/10` (active/input borders).

### Accent & Branding Colors (The Sparks)

- **Culinary Flame (Warmth)**: Gradient `from-amber-500 via-orange-500 to-red-600`.
- **AI / Technology (Coolness)**: `cyan-400`, `cyan-500` (Electric Cyan).
- **Magic / Trending (Mystery)**: `purple-400`, `purple-500`.

## 3. Typography

- **Headings (Luxury/Culinary)**: `font-[Playfair]` (Playfair Display) or similar elegant Serif.
    - Used prominently on H1s and Hero Headers.
    - *Styles*: `font-black`, `tracking-tighter`, `leading-[1.1]`.
- **System / Body (Tech)**: Standard Sans-Serif (`font-sans` default Tailwind like Inter/System UI).
    - Used for buttons, descriptions, AI badges.
    - *Styles*: `font-light` for paragraphs, `font-bold` and `font-semibold` for interactive elements and tags.

## 4. UI Effects & Materials

### Glassmorphism System

- **Heavy Glass (Cards)**: `bg-[#121A2A]/40 backdrop-blur-2xl border border-white/5`.
- **Solid Glass (Inputs/Headers)**: `bg-[#121A2A]/80 backdrop-blur-xl border border-white/10`.
- **Inner Highlighting**: Pseudo or absolute `<div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />` inside cards.

### Shadows & Glows

- **Card Shadows**: Deep shadow `shadow-[0_8px_32px_rgba(0,0,0,0.5)]`.
- **Neon Glows (Buttons & Icons)**:
    - Amber glow: `shadow-[0_0_30px_rgba(245,158,11,0.4)]`
    - Cyan glow: `shadow-[0_0_30px_rgba(6,182,212,0.2)]`
    - *Hover States*: Increase alpha channel (from `0.4` to `0.6` or `0.8`) and expand radius on hover.

## 5. Component Styles

### Buttons

- **Primary/CTA**: Pill-shaped (`rounded-full`), `h-12` to `h-14`, intense gradients (`bg-gradient-to-r from-amber-500...`), neon drop shadows. Uses `hover:scale-[1.02]` mechanics.
- **Secondary/Tech Buttons**: Pill-shaped border styles (`border-cyan-500/30 bg-cyan-950/20 text-cyan-300`), subtle glow on hover.
- **Micro Interactions**: Use `group-hover:translate-x-1` for icons inside buttons, and overlay sweeping effects (`translate-x-full` to `translate-x-full` backgrounds).

### Inputs (AI Prompt Bar)

- **Container**: `rounded-[2rem]`, thick padding, glowing focus-within (`focus-within:ring-2 focus-within:ring-cyan-500/50`).
- **Internal Borders**: Use 1-pixel height gradients positioned absolute top/bottom for futuristic scanning effects (`bg-gradient-to-r from-transparent via-cyan-400 to-transparent`).
- **Input Reset**: `bg-transparent border-none outline-none`.

### Bento Cards

- **Structure**: Auto-spanning CSS grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Card Shape**: Large rounded corners `rounded-3xl`, hidden overflow `overflow-hidden`.
- **Interactions**: Reveal textures or gradients strictly on `group-hover:opacity-100` alongside transform translations for inner child images (`hover:scale-105`).

## 6. Technical Stack & Conventions

- **Framework**: React 19 / Next.js 16 (App Router).
- **CSS Architecture**: Tailwind CSS V4. Local inline themes using `oklch` but UI relies heavily on standard variables (`white/10`, `cyan-400`, `amber-500`).
- **Animation Engine**: `motion` (Framer Motion v12). Typical animation pattern: `initial={{ opacity: 0, y: 50 }}` to `animate={{ opacity: 1, y: 0 }}`.
- **Iconography**: `lucide-react` (Usage of `w-5 h-5` up to `w-10 h-10` globally).
- **Utility Processing**: Standard combination of `clsx` and `tailwind-merge`