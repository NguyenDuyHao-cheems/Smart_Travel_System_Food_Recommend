# 🎨 DESIGN.md — Wanderbite Design System

## 1. 🧠 Brand Identity & Vibe

**Project Name:** **Wanderbite**

**Core Vibe:**

* Premium
* High-Tech
* Clean & Minimal
* SaaS-like
* AI-driven & Interactive

Wanderbite is not just a food app — it feels like an **intelligent companion** guiding users through personalized culinary journeys. Every UI element should feel **lightweight, responsive, and intentional**.

---

## 2. 🎨 Color Palette

### 🌤 Light Mode

| Purpose        | Color           | Hex       | Tailwind        |
| -------------- | --------------- | --------- | --------------- |
| Background     | Very Light Gray | `#F9FAFB` | `bg-gray-50`    |
| Surface/Card   | White           | `#FFFFFF` | `bg-white`      |
| Primary Text   | Dark Slate      | `#111827` | `text-gray-900` |
| Secondary Text | Gray            | `#6B7280` | `text-gray-500` |

---

### 🌙 Dark Mode

| Purpose        | Color         | Hex       | Tailwind          |
| -------------- | ------------- | --------- | ----------------- |
| Background     | Deep Charcoal | `#111827` | `bg-gray-900`     |
| Surface/Card   | Dark Gray     | `#1F2937` | `bg-gray-800`     |
| Primary Text   | White         | `#FFFFFF` | `text-white`      |
| Secondary Text | Light Gray    | `#9CA3AF` | `text-gray-400`   |
| Borders        | Subtle Lines  | `#374151` | `border-gray-700` |

---

### 🔥 Primary Accent (Energy)

| Purpose      | Color        | Hex       | Tailwind                           |
| ------------ | ------------ | --------- | ---------------------------------- |
| CTA / Active | Amber Orange | `#ff8f00` | `text-orange-500`, `bg-orange-500` |

**Usage:**

* Primary buttons
* Active filters
* Highlights
* Glow effects

---

### 🤖 Secondary Accent (Tech)

| Purpose   | Color     | Hex       | Tailwind                       |
| --------- | --------- | --------- | ------------------------------ |
| AI / Tech | Teal Blue | `#00bcd4` | `text-cyan-500`, `bg-cyan-500` |

**Usage:**

* AI Match badges
* GPS/location tags
* Tech indicators

---

## 3. 🔤 Typography

### Font Family

* **Primary:** `Inter`
* **Alternative:** `Plus Jakarta Sans`

```css
font-family: 'Inter', sans-serif;
```

---

### Type Scale

| Element      | Size    | Tailwind              | Usage           |
| ------------ | ------- | --------------------- | --------------- |
| H1 (Hero)    | 32–40px | `text-3xl / text-4xl` | Main headlines  |
| H2 (Section) | 20–24px | `text-xl / text-2xl`  | Section titles  |
| Body         | 14–16px | `text-sm / text-base` | General content |
| Small / Tags | 12–13px | `text-xs`             | Pills, badges   |

---

### Typography Rules

* Use **font-semibold** for headings
* Use **font-medium** for important UI labels
* Maintain **high contrast readability**
* Avoid serif fonts ❌

---

## 4. 📐 Layout & Spacing System

### 🧩 Bento Grid Layout

Wanderbite uses a **Bento Grid system** for modular UI:

```css
grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6
```

**Principles:**

* Asymmetrical but balanced
* Highlight important content (Hero Card spans 2 columns)
* Maintain visual hierarchy

---

### 🔲 Border Radius

| Element    | Tailwind                     |
| ---------- | ---------------------------- |
| Cards      | `rounded-2xl`                |
| Hero Cards | `rounded-3xl`                |
| Buttons    | `rounded-xl` / `rounded-2xl` |
| Pills      | `rounded-full`               |

---

### 🌫 Shadows & Effects

#### Light Mode:

* `shadow-sm` → default
* `shadow-md` → hover or emphasis

#### Dark Mode:

* Use **borders instead of shadows**
* `border border-gray-700`
* Add **glassmorphism when needed:**

```css
bg-gray-800/70 backdrop-blur-md
```

---

### 📏 Spacing System

| Type    | Value   | Tailwind        |
| ------- | ------- | --------------- |
| Small   | 8px     | `p-2`           |
| Medium  | 16px    | `p-4`           |
| Large   | 24px    | `p-6`           |
| Section | 32–48px | `py-8`, `py-12` |

---

## 5. 🧱 Core UI Components

---

### 🔘 Buttons

#### Primary Button (CTA)

```css
bg-orange-500 text-white rounded-2xl px-6 py-3
hover:bg-orange-600 transition-all duration-200
```

**Optional Glow (Dark Mode):**

```css
shadow-[0_0_20px_rgba(255,143,0,0.4)]
```

---

#### Secondary Button

```css
border border-gray-300 text-gray-700 bg-white
hover:bg-gray-100 transition-all duration-200
```

(Dark Mode: `border-gray-700 text-gray-300`)

---

#### Icon Button

```css
p-2 rounded-full hover:bg-gray-100 transition
```

---

### 🏷 Pills / Tags (Vibe Filters)

#### Default State

```css
bg-white border border-gray-200 text-gray-600
```

#### Active State

```css
bg-orange-100 border-orange-300 text-orange-600
```

#### Dark Mode Active

```css
bg-orange-500/20 text-orange-400 border-orange-500/30
```

---

### 🧾 Cards (Food Recommendation)

#### Base Card

```css
bg-white rounded-2xl shadow-sm overflow-hidden
```

Dark Mode:

```css
bg-gray-800 border border-gray-700
```

---

#### Required Elements

Each Food Card MUST include:

1. **Image (Top)**
2. **Food Name + Restaurant**
3. **AI Match Badge**
4. **Distance Tag**
5. **Vibe Tags**

---

#### 🤖 AI Match Badge

```css
bg-cyan-500/90 text-white text-xs px-2 py-1 rounded-full
```

---

#### 📍 Distance Tag

```css
bg-black/60 text-white text-xs px-2 py-1 rounded-full
```

Dark Mode alternative:

```css
bg-gray-700 text-gray-300
```

---

### 🔍 Inputs (AI Search Bar)

#### Base Style

```css
w-full bg-white rounded-3xl border border-gray-200 px-5 py-4
shadow-md focus:outline-none
```

---

#### Focus / Glow Effect

```css
focus:ring-2 focus:ring-orange-400
```

Dark Mode Glow:

```css
focus:shadow-[0_0_20px_rgba(255,143,0,0.3)]
```

---

#### Placeholder Style

```css
text-gray-400
```

---

## 6. ✨ Motion & Interaction

* Always use smooth transitions:

```css
transition-all duration-200
```

* Hover Effects:

  * Slight scale: `hover:scale-[1.02]`
  * Elevation (light): `hover:shadow-md`
  * Glow (dark): subtle neon shadows

---

## 7. 📱 Responsiveness

| Breakpoint | Layout     |
| ---------- | ---------- |
| Mobile     | 1 column   |
| Tablet     | 2 columns  |
| Desktop    | 3+ columns |

**Rule:**

* Stack vertically on mobile
* Preserve hierarchy (Hero always on top)

---

## 8. 🧠 Design Principles (Important)

* **Clarity over complexity**
* **Whitespace is premium**
* **AI elements must feel special (use teal)**
* **CTAs must stand out (use amber)**
* **Everything should feel clickable & alive**

---

## ✅ Final Note

Wanderbite's UI should always feel:

> ✨ *Effortless. Intelligent. Delightful.*

If a screen feels crowded, remove elements.
If something important doesn't stand out, enhance it with **color or scale**.
