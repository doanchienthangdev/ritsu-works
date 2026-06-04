# CHANGELOG — capability `dataviz`

## v0.2.0 — 2026-06-04 (extend, SOP-AIOPS-001-extend)

**"Many charts + an intelligent, context-aware selector."** `/cla extend dataviz`,
self-shipped (the `/image` + `/forge` autonomous pattern). Tier A runtime; extend ceremony
Tier C (Section-4 component adds). Reversibility 5/5 (additive pure code).

### Added
- **18 new built chart types → 27 total**, across all six Datylon families: `area`,
  `stacked-area`, `pie`, `donut`, `marimekko`, `bubble`, `heatmap`, `dumbbell`, `lollipop`,
  `dot`, `slope`, `bullet`, `diverging`, `histogram`, `funnel`, `quadrant`, `radar`, `box`.
- **`scripts/dataviz/lib/taxonomy.cjs`** — the chart-type knowledge base: every type from the
  Datylon catalog (~74), tagged family/built/fallback/McKinsey-stance/intents/needs. Source of
  truth for `BUILT`.
- **An intelligent, context-aware selector** (`select.cjs` rewrite): message-intent →
  data-shape → audience → McKinsey guard-rails → built type, returning `{chartType, ideal,
  family, intent, reason, alternatives[], warnings[], confidence}`. Explainable + anti-pattern-aware.
- **5 flags**: `--explain`, `--audience`, `--target`, `--x-label`, `--y-label`.
- **Polar/arc SVG primitives** (`lib/svg.cjs`): `polarToCartesian`, `arcPath`, `ringPath`, `polygonD`.
- **`wiki/capabilities/dataviz/spec.md`** (the v0.1 promotion gap, filled) + this CHANGELOG.
- **~90 new unit tests** (`tests/dataviz/{select,render,params,taxonomy}.test.ts`).

### Changed (intentional, backward-compatible)
- `--chart=auto` selection of marimekko/bubble/histogram now renders those types **natively**
  (v0.1 fell back to stacked100/scatter/column). Three select tests updated to the stronger
  assertion (never weakened).
- pie/donut are now **buildable** (`--chart=pie`) but **auto-demoted to a ranked bar** — the
  McKinsey discipline moved from "not built" to "selector-demoted". The `BUILT`-not-contain-pie
  guard test became an auto-demotion test.
- `knowledge/dataviz-renderers.yaml` `chart_types`/`deferred_chart_types`/`supports` updated;
  registry `version` 1.0.0 → 1.1.0. `SOP-AIOPS-011` `version` 1.0.0 → 1.1.0.

### Unchanged
- The 9 v0.1 chart types render byte-identically. The McKinsey discipline (one-highlight,
  data-ink minimalism, zero-baseline, direct labels, action-title, source-footer,
  structure ⊥ brand). Pure/offline, no secret/API key, Tier A, ~$0.

## v0.1.0 — 2026-06-04 (initial, /cla propose-then-execute)

9 chart types (bar/column/line/stacked/stacked100/grouped/scatter/waterfall/kpi), the Zelazny
message→type selector (10 rules + 2 guard-rails), the zero-dependency pure-Node byte-stable SVG
renderer encoding the McKinsey house style, `--style` brand override, the split renderer
registry + L2 validator + SOP-AIOPS-011. Decision `dataviz-capability-v0.1`. PR #235.
