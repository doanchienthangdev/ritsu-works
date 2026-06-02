---
version: alpha
name: Ritsu
description: >-
  Electric-cyan brand system for Ritsu — the AI tutor that turns any document
  into true mastery. Calm, confident, precise; learning-science-grounded, never
  salesy. Derived from the product's "Electric Cyan V2" theme
  (/Users/doanchienthang/omg/ritsu, .omgkit/design/theme.json). Dark-mode-capable.
colors:
  # — Brand —
  primary: "#0ABCD0"          # electric cyan (hsl 186 91% 42.7%) — THE brand color
  primaryHover: "#05ABBD"
  primaryForeground: "#F8FAFC"
  accent: "#12A58D"           # teal (hsl 170 80% 36%) — secondary brand accent
  # — Neutrals (slate, hue 210) —
  background: "#FFFFFF"
  foreground: "#020817"       # near-black slate
  surface: "#FCFCFD"          # slate-1
  muted: "#F1F5F9"
  mutedForeground: "#64748B"  # slate-ish
  border: "#E2E8F0"
  ring: "#0ABCD0"
  # — Status —
  destructive: "#EF4444"
  success: "#30A66D"
  warning: "#FFA600"
  info: "#0090FF"
  # — Data viz (chart 1–5) —
  chart1: "#0ABCD0"           # cyan
  chart2: "#7C3AED"           # violet
  chart3: "#F97316"           # orange
  chart4: "#16A34A"           # green
  chart5: "#E11D48"           # rose
  # — Dark mode —
  darkBackground: "#020817"
  darkForeground: "#F8FAFC"
  darkSurface: "#151C29"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "\"rlig\" 1, \"calt\" 1"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"      # base --radius 0.5rem
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  "2xl": "64px"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryForeground}"
    rounded: "{rounded.lg}"
    padding: "10px 18px"
    typography: "{typography.body}"
    hover: { backgroundColor: "{colors.primaryHover}" }
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.md}"
    height: "40px"
logo:
  # image-platform v0.3 (/cla extend): brand-scoped corner logo overlay policy.
  # When `/image --style=ritsu --ref=<asset>` runs, the canonical brand LOCKUP below is
  # composited SMALL in this corner (deterministic, pixel-perfect, the real asset) instead
  # of feeding the logo to the OpenAI /v1/images/edits endpoint — which renders it BIG and
  # CENTERED (the bug this fixes). The `--ref` flag is the TRIGGER ("brand this image");
  # the `asset` below is what gets stamped (the mark + "Ritsu" wordmark lockup, matching
  # ritsu.ai). Consumed by scripts/image/lib/compose.cjs (the "draw no logo, keep the
  # corner clean" directive + asset-path resolution) + scripts/image/lib/png-overlay.cjs
  # (the dependency-free PNG stamp). Ritsu-scoped by data; the mechanism is general — any
  # design system may set this block to get the same corner-lockup treatment.
  overlay: true
  position: top-left      # top-left | top-right | bottom-left | bottom-right
  scale: 0.18             # lockup WIDTH = 18% of the canvas's SHORTER edge; the lockup is wide
                          # + short (~3.4:1), so this reads as a SMALL, balanced corner logo.
  margin: 0.05            # inset from the edges = 5% of the shorter edge
  asset: assets/ritsu-lockup.png   # the canonical mark + "Ritsu" wordmark lockup (NOT the bare mark)
---

# Ritsu — Design System

## Overview

Ritsu turns any document into a personal AI tutor whose core promise is **mastery —
true understanding, not content delivery**. The visual identity must feel the way the
product feels at its best: **calm, confident, precise, and quietly energetic** — an
"electric cyan" optimism layered over a clean, near-monochrome slate canvas.

Brand personality (from `00-core/brand_voice.md`): **helpful, honest, concrete, calm,
efficient — never salesy, cute, corporate-stiff, or pretending-to-be-human.** The
design system enforces this: generous whitespace, high contrast, one decisive accent,
restrained motion. The cyan is the moment of insight ("I finally get it"); everything
else gets out of its way.

Use for: deepask reports, dashboards, slide decks, blog visuals, social cards, PDFs,
and any other Ritsu-branded artifact emitted by ritsu-works.

## Colors

- **Primary — Electric Cyan `#0ABCD0`.** The single hero color. Buttons, links, key
  data series, focus rings, the wordmark gradient start. Hover → `#05ABBD`. Use
  sparingly for emphasis; it loses power if everything is cyan.
- **Accent — Teal `#12A58D`.** Secondary brand accent for supporting highlights,
  secondary series, gradient partners. Cyan→teal reads as one coherent family.
- **Neutrals — Slate (hue 210).** `#FFFFFF` background, `#020817` foreground, `#F1F5F9`
  muted surfaces, `#64748B` muted text, `#E2E8F0` borders. The product ships a full
  12-step slate scale (`#FCFCFD` → `#101418`).
- **Status** — destructive `#EF4444`, success `#30A66D`, warning `#FFA600`, info `#0090FF`.
- **Data viz (ordered)** — cyan `#0ABCD0`, violet `#7C3AED`, orange `#F97316`,
  green `#16A34A`, rose `#E11D48`. (8-way diagram palette in product CSS extends this
  with amber/emerald/sky/pink.)
- **Dark mode** — deep slate background `#020817`, foreground `#F8FAFC`, surface
  `#151C29`; primary cyan is unchanged and glows.

## Typography

- **Sans / everything: Inter** (`system-ui` fallback). Display 800 / heading 700 /
  body 400. Tight tracking on large text (`-0.01em`…`-0.02em`); body `line-height 1.6`;
  ligatures on (`"rlig" 1, "calt" 1`).
- **Mono: JetBrains Mono** for code, slash-commands (`/quiz`), credits, metrics.
- (Product internals also use Geist in admin and KaTeX for math; for company artifacts,
  standardize on **Inter + JetBrains Mono**.)

## Layout

8-pt spacing rhythm (`4 · 8 · 16 · 24 · 40 · 64`). Roomy, uncluttered, single-column
default with a clear top-to-bottom hierarchy (mirrors the product's <60-second
"drop file → plan → master" flow). Generous whitespace is a feature, not emptiness.

## Elevation & Depth

Flat-with-intent. Depth comes from **subtle borders + soft surface tints**, not heavy
shadows. Two signature effects, used rarely:
- **Glow** — `0 0 20px rgba(10,188,208,0.4)` on the primary action / hero element only.
- **Glass** — `backdrop-blur 12px` + translucent panel (`/0.8`) for overlays.
- **Signature gradient** — `linear-gradient(135deg, #0ABCD0, #19DEF4)` (cyan→bright cyan).

## Shapes

Rounded, friendly, not bubbly. Base radius **8px** (`lg`); inputs 6px (`md`), chips
fully round (`full`), large cards 12px (`xl`). Consistent radius across an artifact.

## Components

- **Button (primary)** — cyan `#0ABCD0` fill, near-white text, 8px radius, `10/18`
  padding; hover `#05ABBD`; reserve the glow for the single most important CTA.
- **Card** — white bg, `#E2E8F0` 1px border, 8px radius, 24px padding; dark mode →
  `#151C29` surface.
- **Badge / pill** — muted `#F1F5F9` bg, full radius (e.g. "most popular", credit tiers).
- **Input** — white bg, `#E2E8F0` border, 6px radius, 40px height, cyan focus ring.

### Logo

Ritsu has both a **symbol mark** and a **wordmark**:

- **Symbol mark** — a four-blade **pinwheel / camera-aperture**: four curved "petal"
  blades rotating around a center, each a **teal → cyan gradient** (`#12A58D` teal →
  `#0ABCD0` cyan). Reads as motion + transformation — raw material reshaped into
  mastery. Assets (recovered from product git history, staged in `assets/`):
  `ritsu-logo.png` (1000×1000 RGBA, hi-res), `ritsu-mark.png` (256×256, the compact
  mark the live site serves as its navbar/app icon), `favicon.ico` (32×32).
- **Wordmark** — "Ritsu" in **Inter Bold** with a left-to-right cyan gradient text
  fill (cyan-9 → cyan-11, `#0ABCD0` → `#0093A3`, `bg-clip-text`).
- **Lockup** — mark + wordmark side by side; mark alone for favicons/app icons;
  wordmark alone in tight horizontal space. Staged asset: `ritsu-lockup.png`
  (799×237, transparent, ~3.4:1) — the mark + "Ritsu" cyan-gradient wordmark matching
  the ritsu.ai navbar. This is the `logo.overlay.asset` that `/image` stamps small in
  the corner of branded images (image-platform v0.3); rasterized from the mark + the
  Inter-Bold cyan wordmark per this spec.

Clear space ≥ one blade-width around the mark; keep the blades within the teal–cyan
family (never recolor off-brand); avoid the gradient mark on busy backgrounds (use a
solid/favicon variant). Asset files live in `assets/` beside this DESIGN.md.

## Do's and Don'ts

**Do** — lead with whitespace and hierarchy; use cyan as a single decisive accent;
keep copy concrete and calm; pair cyan with slate neutrals; support light + dark.
**Don't** — flood the page with cyan; add hype, exclamation marks, or "AI magic"
clichés (violates brand voice); use drop-shadows as decoration; introduce off-brand
fonts; use emoji as a logo. AI is the *leverage*, not the spectacle.
