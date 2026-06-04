---
name: dataviz/renderers/svg-native
description: |
  The default /dataviz renderer — a zero-dependency, pure-Node, byte-stable SVG-string
  renderer encoding the McKinsey data-viz house style. renderChart(chartType, data,
  spec, theme) -> svgString (scripts/dataviz/render.cjs). No d3/canvas/DOM. v0.1
  builds 9 chart types; the McKinsey aesthetic is grounded in 3 real reports.
allowed-tools: [Read, Bash]
disable-model-invocation: false
---

# dataviz/renderers/svg-native — the McKinsey-grade SVG renderer

> Zero dependency, pure function, byte-stable. The novel core of `/dataviz`. `renderChart(chartType, data, spec, theme) -> svgString` (`scripts/dataviz/render.cjs`). Every number routes through `fmt()` (2-dp, trailing-zeros-stripped, locale-independent) → identical bytes every run → unit-tested with `toBe`/`toEqual` (the repo forbids vitest snapshots).

## Why zero-dep (not d3 / vega-lite)

`d3-scale`/`d3-shape` v4+ are ESM-only → not `require()`-able from a `.cjs`; vega-lite's accurate-text SVG path pulls `node-canvas` (native build). The McKinsey look is **subtractive + direct-labeled** — you AUTHOR the exact SVG (strip gridlines/legend/axis-chrome, inject direct labels + action title + source footer), you don't override an engine. The scale math (`(v-d0)/(d1-d0)*(r1-r0)+r0`; band `i*step+pad`; paths `M…L…`; bars = `<rect>`) is elementary (`scripts/dataviz/lib/svg.cjs`). Result: no `pnpm-lock` churn, no native builds, works in CI/worktree immediately.

## v0.1 chart types (9 built)

`bar` (horizontal sorted desc), `column`, `line` (multi-series, end-labels), `stacked`, `stacked100`, `grouped` (paired/leader-vs-laggard), `scatter`, **`waterfall`** (running-cumulative bridge, rising=teal/falling=amber/total=highlight, dashed connectors), `kpi` (big-number callout). Deferred to v0.2 (registry `deferred_chart_types`): marimekko, statstack, dumbbell, diverging, bubble, heatmap, bubble-matrix, histogram, area, pie.

## The McKinsey aesthetic it encodes (`lib/theme.cjs`)

Classic hex: highlight `#005EB8`, neutrals `#A2AAAD`/`#C0C5C9`, ink `#222222`, ink-muted `#6B7280`, gridline `#E6E8EA`, bg `#FFFFFF`, accents teal `#418FDE`/amber `#F3C13A`. Hard defaults: **one-highlight-only**, data-ink minimalism (no border/fill/3D/gradient/gridline/legend), bar value-axis **from zero**, **direct data labels** (no legend), **one message per exhibit**, **action-title ON the chart**, **source footer on EVERY exhibit**, fixed title→plot→footer rhythm, serif-title/sans-body (Georgia/Arial fallback). **`mckinsey-rebrand`** = darker variant.

**STRUCTURE ⊥ BRAND:** when `--style=<design-system>` is supplied, its brand palette/type OVERRIDE the McKinsey tokens (precedence brand > legibility > McKinsey art-direction > decoration) via the SAME `resolve-style.cjs` token shape `/image` consumes — read `resolved.tokens.colors`/`.typography` with guarded fallbacks (arbitrary keys). A `--style` miss → classic theme + warn (never crash).

## Documented v0.1 non-goals (honest)

No text-measurement engine (no canvas/DOM) → **data-label de-collision on dense data is a non-goal** (axis ticks use a coarse char-width estimate; positioning via `text-anchor`/`dominant-baseline`). PNG/PDF raster output is a v0.2 stretch (svg/html/inline now). marimekko + the other deferred types render as their nearest built type with a warning until v0.2.

## Data shapes — see the umbrella `06-ai-ops/skills/dataviz/SKILL.md`.
