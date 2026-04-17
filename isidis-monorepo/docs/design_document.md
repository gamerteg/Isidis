# Isidis App — Design System & UI/UX Reference

This document serves as a technical and visual reference for the Isidis application design. It is intended for UI/UX designers and developers to maintain consistency across the platform.

## Design Philosophy: "Mystic Deep"
The app uses a premium, dark-themed aesthetic that combines spiritual mysticism with modern digital product standards. Key characteristics include:
- **Glassmorphism**: Subtle translucency and blur effects.
- **Ethereal Glows**: Controlled use of primary and accent colors as glows.
- **Nebula Backgrounds**: Dark backgrounds with subtle star patterns and cosmic gradients.
- **Mobile-First**: A highly responsive experience with dedicated mobile navigation.

---

## 🎨 Color Palette

### Base Colors
- **Background**: `hsl(240 30% 6%)` — Deep charcoal with a purple tint.
- **Card/Surface**: `hsl(240 30% 12% / 60%)` — Glass translucent surface.
- **Foreground (Text)**: `hsl(0 0% 98%)` — Near white for maximum contrast.

### Brand Colors
- **Primary (Action)**: `hsl(262 83% 65%)` — Vivid Purple.
- **Secondary**: `hsl(240 50% 60%)` — Indigo.
- **Accent (Premium)**: `hsl(43 96% 56%)` — Golden/Amber.
- **Destructive**: `hsl(0 62.8% 30.6%)` — Deep Red.

### Gradients
- **Primary Text Gradient**: `linear-gradient(135deg, hsl(270 85% 60%), hsl(300 80% 65%))`
- **Gold Text Gradient**: `linear-gradient(135deg, hsl(46 80% 55%), hsl(35 90% 65%))`

---

## 🖋️ Typography

- **Primary Font**: `Inter` (Sans-serif)
- **Scale**:
    - `h1`: 3xl to 5xl, black weight, tight tracking.
    - `h2`: 2xl to 3xl, bold weight.
    - `h3`: xl to 2xl, semi-bold.
    - `body`: 14px-16px, regular to medium.
    - `labels`: 10px-12px, uppercase, bold, `0.2em` tracking.

---

## 🍱 UI Components

### 1. Cards (Glassmorphism)
- **Style**: `.glass` utility.
- **Specs**: `backdrop-filter: blur(16px)`, `border: 1px solid hsl(var(--border) / 0.5)`.
- **Usage**: Practitioner profiles, Dashboard widgets, Service lists.

### 2. Buttons
- **Primary**: Full purple background, `0.75rem` radius, subtle glow on hover.
- **Secondary/Outline**: Glass background with white/10% border.
- **Animations**: `animate-glow-pulse` for high-conversion CTAs.

### 3. Navigation
- **Desktop Sidebar**: Fixed left, minimalist icons, active state indicated by background highlight.
- **Mobile Bottom Nav**: 5-column layout, blurred background, primary color for active icons.

---

## 📸 Screen Directory

The screenshots for all screens are organized in the following directory structure:
`isidis-monorepo/docs/design_screenshots/`

### Screens Captured:
- **Marketing**: Home, Marketplace, Maria Profile, Service Details.
- **Auth**: Login, Register, Recovery, Quiz Onboarding.
- **Client Panel**: Dashboard, Message Center, Tickets, Profile.
- **Reader Panel**: Dashboard, Gig Management, Orders, Wallet, Analytics.
- **Legal**: Terms of Use, Withdrawal Policy.

---

## ⚡ Animation & Interactions
- **Entrance**: `animate-fade-in-up` for new sections.
- **Loading**: `animate-shimmer` for skeleton states.
- **Interactive**: `hover-glow` for cards to provide depth feedback.
