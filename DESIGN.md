---
name: Speakers Club Portal
colors:
  background: "#0f172a"
  foreground: "#f8fafc"
  primary: "#0ea5e9"
  primary-hover: "#0284c7"
  card-bg: "rgba(30, 41, 59, 0.7)"
  card-border: "rgba(255, 255, 255, 0.1)"
  text-muted: "#94a3b8"
  text-subtle: "#cbd5e1"
  orb-blue: "rgba(14, 165, 233, 0.2)"
  orb-purple: "rgba(139, 92, 246, 0.15)"
  btn-secondary-hover-bg: "rgba(255, 255, 255, 0.05)"
  btn-secondary-hover-border: "rgba(255, 255, 255, 0.2)"
  nav-bg: "rgba(15, 23, 42, 0.8)"
  event-card-bg-alt: "rgba(15, 23, 42, 0.4)"
typography:
  font-family:
    sans: "Geist, Arial, sans-serif"
    mono: "Geist_Mono, monospace"
  hero-title:
    fontSize: "4rem"
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
    fontWeight: "700"
  hero-subtitle:
    fontSize: "1.2rem"
    lineHeight: "1.6"
  nav-logo:
    fontSize: "1.5rem"
    fontWeight: "700"
  nav-link:
    fontSize: "0.95rem"
    fontWeight: "500"
  section-title:
    fontSize: "1.5rem"
    letterSpacing: "0.1em"
    textTransform: "uppercase"
  card-title:
    fontSize: "1.25rem"
    fontWeight: "600"
  card-date:
    fontSize: "0.85rem"
    fontWeight: "600"
  card-desc:
    fontSize: "0.95rem"
    lineHeight: "1.5"
  card-footer:
    fontSize: "0.85rem"
spacing:
  nav-padding: "1.5rem 5%"
  hero-padding: "4rem 5%"
  hero-gap: "3rem"
  hero-actions-gap: "1rem"
  section-padding: "2rem 5%"
  section-margin-bottom: "4rem"
  grid-gap: "1.5rem"
  card-padding: "1.5rem"
  btn-padding: "0.6rem 1.5rem"
rounded:
  pill: "50px"
  card: "16px"
  orb: "50%"
elevation:
  btn-primary-shadow: "0 4px 14px rgba(14, 165, 233, 0.3)"
  btn-primary-shadow-hover: "0 6px 20px rgba(14, 165, 233, 0.4)"
  nav-blur: "blur(10px)"
  card-blur: "blur(10px)"
  orb-blur: "blur(100px)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "white"
    rounded: "{rounded.pill}"
    padding: "{spacing.btn-padding}"
    fontWeight: "600"
    boxShadow: "{elevation.btn-primary-shadow}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "{spacing.btn-padding}"
    fontWeight: "600"
    border: "1px solid {colors.card-border}"
  event-card:
    backgroundColor: "{colors.card-bg}"
    border: "1px solid {colors.card-border}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
    backdropFilter: "{elevation.card-blur}"
  nav-bar:
    backgroundColor: "{colors.nav-bg}"
    borderBottom: "1px solid {colors.card-border}"
    padding: "{spacing.nav-padding}"
    backdropFilter: "{elevation.nav-blur}"
---

## Brand & Style

The Speakers Club Portal design system employs a dark, immersive "Glassmorphism" aesthetic. It aims to evoke a sense of modern professionalism, depth, and focused clarity, mirroring the journey of mastering the art of public speaking. The dark theme acts as a calm, confident backdrop, allowing vibrant accents to guide the user's attention.

The interface is structured around a "deep space" concept: a rich, dark slate background (`#0f172a`) energized by massive, heavily blurred, multi-colored orbs that act as ambient light sources. Overlying this are glass-like UI panels that lightly refract the background, creating a layered, floating environment. The emotional tone is intended to be sophisticated, inspiring, and technically polished.

## Colors

The palette relies heavily on the interplay between deep shadows and luminous accents, ensuring high contrast and legibility while maintaining the dark mood.

- **Primary Canvas:** A solid, deep Slate 900 (`#0f172a`) background.
- **Ambient Lighting:** Large, blurred orbs provide ambient light in the background. An ethereal Light Blue (`rgba(14, 165, 233, 0.2)`) and a subtle Purple (`rgba(139, 92, 246, 0.15)`) create localized areas of energy and depth.
- **Surface Alpha:** Interface components like cards and navigation bars use semi-transparent dark slate backgrounds (e.g., `rgba(30, 41, 59, 0.7)` or `rgba(15, 23, 42, 0.8)`) to maintain the glassmorphic illusion without washing out the text.
- **Accents:** A vibrant Light Blue (`#0ea5e9`) serves as the primary brand color, used for key actions, highlighted text, and active states. It transitions to a deeper blue (`#0284c7`) on hover to provide tactile feedback.
- **Text:** The foreground text is a high-contrast Slate 50 (`#f8fafc`) for maximum readability. Secondary text utilizes muted (`#94a3b8`) or subtle (`#cbd5e1`) slate tones to establish clear informational hierarchy without cluttering the visual space.

## Typography

The design system uses the **Geist** font family (both Sans and Mono variations) to deliver a crisp, modern, and highly legible reading experience. Geist's clean geometric lines complement the smooth, rounded aesthetic of the UI components.

- **Hierarchy:** The Hero section features a massive display title (`4rem`) with tight line-height (`1.1`) and slight negative letter-spacing (`-0.02em`) to create a bold, impactful statement. Section titles are distinctively stylized with a smaller size (`1.5rem`), wide letter-spacing (`0.1em`), and uppercase transformation to act as clear waypoints.
- **Legibility:** Standard body text and descriptions use comfortable line heights (`1.5` or `1.6`) and softer muted colors to reduce eye strain against the dark background.
- **Accents:** The primary brand color is occasionally used inline within large headings to emphasize key words.

## Layout & Spacing

The layout is designed to feel open, breathable, and structured, utilizing a responsive flexbox and grid system.

- **Rhythm:** The layout uses generous padding. The hero and main sections typically utilize a `4rem` or `2rem` vertical padding and a `5%` horizontal padding, ensuring the content is well-framed regardless of screen size.
- **Grouping:** Event cards and news items are organized in flexible grids with consistent `1.5rem` gaps, allowing them to wrap naturally on smaller viewports.
- **Alignment:** Navigation and footer elements are structured to spread out content (`justify-content: space-between`), maintaining a balanced, symmetrical feel across the top and bottom of the viewport.

## Elevation & Depth

Depth is the cornerstone of this design system, achieved through transparency, blur filters, and subtle borders rather than heavy, opaque shadows.

- **The Z-Axis Stack:**
  - **Level 1 (Background):** The deep slate canvas.
  - **Level 2 (Ambient Light):** The heavily blurred (`100px`) decorative orbs.
  - **Level 3 (Content Surfaces):** The primary UI panels, event cards, and navigation bars. These utilize a `backdrop-filter: blur(10px)` combined with semi-transparent backgrounds to simulate frosted glass.
- **Edge Definition:** Every "glass" surface is defined by a subtle, semi-transparent white border (`rgba(255, 255, 255, 0.1)`). On interaction (hovering over a card or secondary button), this border brightens (`rgba(255, 255, 255, 0.2)`) to simulate light catching the edge of the glass.
- **Action Shadows:** While structural elements rely on blurs for depth, primary action buttons use distinct, glowing drop shadows (`0 4px 14px rgba(14, 165, 233, 0.3)`) to elevate them physically and visually above the rest of the interface. This glow intensifies on hover.

## Shapes

The form language is soft and approachable, contrasting with the starkness of the dark color palette.

- **Cards and Panels:** Standard structural elements (event cards, informational panels) utilize a `16px` border-radius, creating a smooth, modern rectangle.
- **Action Elements:** Primary and secondary buttons, as well as pill-shaped indicators, use a fully rounded border-radius (`50px`). This distinctive shape instantly signals interactivity.
- **Decorative Elements:** The ambient background orbs are perfect circles (`50%`), contributing to the organic, fluid feel of the environment.

## Components

### Glass Containers

Event cards and the main navigation bar are the primary examples of glass containers. They utilize semi-transparent dark backgrounds and a `10px` backdrop blur. The navigation bar sits sticky at the top of the viewport, its glass effect becoming more apparent as content scrolls beneath it. Event cards feature a hover state that slightly lifts the card (`translateY(-5px)`) and brightens its border, enhancing interactivity.

### Action Elements

- **Primary Buttons:** These are solid, vibrant Light Blue with white text, fully rounded, and feature a glowing drop shadow. On hover, the background deepens, the shadow expands, and the button lifts slightly.
- **Secondary Buttons:** These adopt a "ghost" style, featuring a transparent background with a subtle white border and foreground text color. On hover, they gain a slight white translucent background fill and a brighter border, maintaining their secondary status while providing clear feedback.

### Typography Application

Date labels on event cards are styled with the primary blue color and a smaller, bolder font weight to stand out as key metadata. Section titles use uppercase styling and wide letter-spacing to distinguish themselves from standard body text or card titles.
