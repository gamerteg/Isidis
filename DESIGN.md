---
brand: Isidis
tokens:
  colors:
    background:
      deep: "#030306" # --background-deep
      default: "#050509" # --background
      surface: "#0c0c12" # --card-surface
    text:
      primary: "#f4f1ff" # --text-1
      secondary: "#c8c0e0" # --text-2
      muted: "#8b83a8" # --text-3
    brand:
      primary: "#a16efd" # HSL(262, 83%, 65%) - Vivid Purple
      secondary: "#6366f1" # HSL(240, 50%, 60%) - Indigo
      accent: "#f5c451" # HSL(43, 96%, 56%) - Mystical Gold
      violet-bright: "#a78bfa"
      gold-bright: "#f5c451"
    ui:
      border: "#202030" # HSL(240, 22%, 16%)
      card: "#12121c" # HSL(240, 22%, 9%)
      card-elevated: "#1a1a26" # HSL(240, 22%, 13%)
  typography:
    families:
      sans: "Manrope, sans-serif"
      serif: "Fraunces, serif"
      display: "Fraunces, serif"
      mono: "JetBrains Mono, monospace"
    weights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
  spacing:
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]
    unit: "px"
  radii:
    default: "12px" # --radius (0.75rem)
    lg: "12px"
    xl: "20px"
    "2xl": "28px"
    "3xl": "36px"
  shadows:
    glow: "0 0 40px -10px rgba(161, 110, 253, 0.35)" # --shadow-glow
    glow-gold: "0 0 40px -10px rgba(245, 196, 81, 0.3)" # --shadow-glow-gold
    glow-sm: "0 0 20px -8px rgba(161, 110, 253, 0.25)" # --shadow-glow-sm
  motion:
    durations:
      fast: "200ms"
      normal: "300ms"
      slow: "700ms"
    easings:
      standard: "cubic-bezier(0.16, 1, 0.3, 1)"
      out: "ease-out"
---

# Mystic Deep Design System

The **Mystic Deep** design system is the visual and experiential foundation of Isidis. It is crafted to evoke a sense of deep focus, otherworldly elegance, and premium cinematic quality. Designed with a mobile-first philosophy, it prioritizes readability and immersion in a "Cinema Dark" environment.

## Design Philosophy

### 1. The Ethereal Void
The interface is built upon a "Deep" dark theme. Unlike standard dark modes that use charcoal or grey, Isidis uses a very deep, desaturated navy/violet background (`#050509`). This creates a canvas where light and color feel like they are emerging from a void, enhancing the focus on content.

### 2. Mystical Glow & Light
Light is used sparingly and intentionally. High-contrast gradients (Purples to Golds) and "soft glow" box shadows simulate bioluminescence or celestial light. These effects guide the user's attention to primary actions without being abrasive.

### 3. Glassmorphism & Depth
Layering is achieved through varying levels of transparency and high-radius blurs (up to 24px). "Glass" components allow the background "orbs" and gradients to peek through, creating a sense of physical material and depth.

## Core Elements

### Color Palette
- **Primary (Vivid Purple)**: Used for main actions, brand identity, and spiritual "energy".
- **Accent (Gold)**: Used for highlights, achievements, and "mystical" status indicators. It provides a warm, high-contrast counterpoint to the deep purple.
- **Surface Elevation**: Cards use subtle shifts in lightness and HSL saturation to distinguish between base surfaces and interactive elements.

### Typography
- **Fraunces (Serif/Display)**: Chosen for its distinct character and editorial elegance. Used for headings to create a sense of storytelling and authority.
- **Manrope (Sans)**: A geometric sans-serif that ensures high legibility for body text and interface controls.
- **JetBrains Mono (Mono)**: Precise and clean, used for technical data and identifiers.

### Motion System
Motion in Isidis is "weightless". 
- **Entrance**: Elements fade and slide upward with long, smooth cubic-bezier transitions (`0.7s`).
- **State Changes**: Interactions feel responsive but soft, using `0.3s` durations.
- **Ambient Motion**: Background "orbs" and "auroras" flow with slow, infinite cycles, keeping the interface feeling alive even when static.

## Visual Utilities
- **Shimmer Sweeps**: Used for loading states and decorative "shine" on borders.
- **Aurora Backgrounds**: Deep multi-stop radial gradients that create a sense of an ever-changing sky.
- **Urgent Accents**: A high-impact red (`#f87171`) is reserved strictly for time-sensitive or critical errors.
