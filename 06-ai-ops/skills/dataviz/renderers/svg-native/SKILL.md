---
name: dataviz/renderers/svg-native
description: |
  The default /dataviz renderer — a zero-dependency, pure-Node, byte-stable SVG-string
  renderer encoding the McKinsey data-viz house style. renderChart(chartType, data,
  spec, theme) -> svgString (scripts/dataviz/render.cjs). No d3/canvas/DOM. v0.2
  builds 27 chart types across all six families; the McKinsey aesthetic is grounded in 3 real reports.
allowed-tools: [Read, Bash]
disable-model-invocation: false
---

# dataviz/renderers/svg-native — the McKinsey-grade SVG renderer

> Zero dependency, pure function, byte-stable. The novel core of `/dataviz`. `renderChart(chartType, data, spec, theme) -> svgString` (`scripts/dataviz/render.cjs`). Every number routes through `fmt()` (2-dp, trailing-zeros-stripped, locale-independent) → identical bytes every run → unit-tested with `toBe`/`toEqual` (the repo forbids vitest snapshots).

## Why zero-dep (not d3 / vega-lite)

`d3-scale`/`d3-shape` v4+ are ESM-only → not `require()`-able from a `.cjs`; vega-lite's accurate-text SVG path pulls `node-canvas` (native build). The McKinsey look is **subtractive + direct-labeled** — you AUTHOR the exact SVG (strip gridlines/legend/axis-chrome, inject direct labels + action title + source footer), you don't override an engine. The scale math (`(v-d0)/(d1-d0)*(r1-r0)+r0`; band `i*step+pad`; paths `M…L…`; bars = `<rect>`) is elementary (`scripts/dataviz/lib/svg.cjs`). Result: no `pnpm-lock` churn, no native builds, works in CI/worktree immediately.

## v0.3 chart types (60 built across all 6 families)

The dispatch (`DISPATCH` in `render.cjs`) and the source-of-truth list (`BUILT` in `lib/taxonomy.cjs`). Every renderer is PURE + byte-stable + never-throws (renderChart's try/catch is the backstop) + deterministic layout (no force-directed; no Math.random/Date — jitter via `jitterOffset()`). A `dispatch-coverage` test asserts all 60 have a real renderer (none silently falls back to bar).

- **v0.1/v0.2 (27):** bar · column · line · area · stacked-area · stacked · stacked100 · grouped · scatter · bubble · waterfall · kpi · pie · donut · marimekko · heatmap · dumbbell · lollipop · dot · slope · bullet · diverging · histogram · box · funnel · quadrant · radar
- **v0.3 (+33):** small-multiples (grid of mini-columns) · range · matrix-chart (presence dots) · table-chart (conditionally-shaded) · connected-scatter · hexbin · waffle (10×10) · treemap (squarified) · population-pyramid · sunburst (radial ring) · dendrogram (1-level tree) · venn (2-3 sets) · semicircle-donut · bump (ranking lines) · spline (smoothed) · step-line · gantt · candlestick · ohlc · barcode · density (binned-smoothed) · ridgeline · violin (mirrored density) · strip · jitter · beeswarm · horizon (banded) · sankey (2-layer ribbons) · chord (sectors + ribbons) · arc · network (circular layout) · flowchart (linear boxes) · tile-map (grid-positioned)

New SVG primitives (`lib/svg.cjs`): `polarToCartesian`, `arcPath` (pie wedge), `ringPath` (donut/sunburst segment), `polygonD` (radar/violin), `splinePath` (Catmull-Rom smooth), `bezierH` (sankey/arc links), `hexPath` (hexbin), `squarify` (treemap), `jitterOffset` (deterministic swarm). Only 14 cataloged-but-not-built types remain (10 anti-McKinsey + 4 infeasible-in-pure-renderer); they render as their nearest built type + a warning. **The default output wordmark is the Ritsu brand** (the "McKinsey" label is the design discipline, never the output brand).

## The McKinsey aesthetic it encodes (`lib/theme.cjs`)

Classic hex: highlight `#005EB8`, neutrals `#A2AAAD`/`#C0C5C9`, ink `#222222`, ink-muted `#6B7280`, gridline `#E6E8EA`, bg `#FFFFFF`, accents teal `#418FDE`/amber `#F3C13A`. Hard defaults: **one-highlight-only**, data-ink minimalism (no border/fill/3D/gradient/gridline/legend), bar value-axis **from zero**, **direct data labels** (no legend), **one message per exhibit**, **action-title ON the chart**, **source footer on EVERY exhibit**, fixed title→plot→footer rhythm, serif-title/sans-body (Georgia/Arial fallback). **`mckinsey-rebrand`** = darker variant.

**STRUCTURE ⊥ BRAND:** when `--style=<design-system>` is supplied, its brand palette/type OVERRIDE the McKinsey tokens (precedence brand > legibility > McKinsey art-direction > decoration) via the SAME `resolve-style.cjs` token shape `/image` consumes — read `resolved.tokens.colors`/`.typography` with guarded fallbacks (arbitrary keys). A `--style` miss → classic theme + warn (never crash).

## Documented v0.1 non-goals (honest)

No text-measurement engine (no canvas/DOM) → **data-label de-collision on dense data is a non-goal** (axis ticks use a coarse char-width estimate; positioning via `text-anchor`/`dominant-baseline`). PNG/PDF raster output remains a stretch (svg/html/inline now). The cataloged-only types (treemap, sankey, gantt, choropleth, …) render as their nearest built type with a warning (heavy graph/map topology or anti-McKinsey decoration — see `lib/taxonomy.cjs`).

## Data shapes — see the umbrella `06-ai-ops/skills/dataviz/SKILL.md`.
