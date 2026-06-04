---
name: dataviz/select
description: |
  The intelligent, context-aware chart selector for /dataviz (v0.2). Choose the chart
  FROM THE MESSAGE, not the data (Gene Zelazny), made smart: a full chart taxonomy +
  a multi-factor pipeline (message-intent → data-shape → audience → McKinsey guard-rails
  → built type) that returns the BEST chart with an explained reason, runner-up
  alternatives, anti-pattern warnings, and a confidence. Deterministic, pure
  (scripts/dataviz/select.cjs). Used by gen.cjs when --chart=auto.
allowed-tools: [Read, Bash]
disable-model-invocation: false
---

# dataviz/select — pick the BEST chart for the context, and defend the choice

> **The whole method: choose the chart from the MESSAGE, not the data (Zelazny) — and do it the way a McKinsey analyst would: pick the form that makes the point, explain why, name the runner-ups, and refuse the anti-patterns.** The "smart" core of `/dataviz`.

`selectChart(message, hints, context) -> { chartType, ideal, family, intent, reason, alternatives[], warnings[], confidence }` (`scripts/dataviz/select.cjs`, PURE, deterministic — no LLM in the path; the calling agent supplies the message + data).

## The knowledge base

`scripts/dataviz/lib/taxonomy.cjs` — every chart type from the Datylon catalog (~74), each tagged: `family` (comparison · correlation · part-to-whole · change-over-time · distribution · flow-geospatial · kpi), `built` (27) vs cataloged, `fallback` (the nearest built type), `mckinsey` stance (preferred · acceptable · demoted · avoid), `intents`, data-shape `needs`. This is what makes selection *informed*, not a keyword guess.

## The pipeline (the six factors)

1. **Message INTENT** — 18 ordered first-match trigger rules → a Zelazny comparison kind (waterfall · funnel · bullet · diverging · quadrant · marimekko · bubble · scatter · radar · box · histogram · slope · dumbbell · stacked100 · grouped · component · timeseries · item).
2. **Data SHAPE** (`hints`) disambiguates within the family — `n_measures` 2→scatter / 3→bubble; share + time → 100%-stacked vs `stacked-area` (relative vs absolute); single-period part-to-whole → pie (then demoted); `n_periods`=2 + ≥4 items → slope; `has_target` → bullet; `has_size` → bubble.
3. **CONTEXT** (`context.audience`) nudges — `exec` + a long ranking → `lollipop` (space-efficient); `general` → `bar` (the safe default).
4. **McKinsey GUARD-RAILS** — (#1) an entity x-axis is an **Item compare, never a trend**; (#2) **pie/donut are DEMOTED → ranked bar** in auto mode (force with `--chart=pie`); warnings on >6 pie slices, >5 grouped series (→ small-multiples/line), radar >8 axes.
5. **Map ideal → BUILT** — a cataloged ideal renders as `taxonomy.fallback` + an honest `reason`. (In v0.2 the selector's detected ideals are all built, so this mainly serves explicit `--chart=<cataloged>`.)
6. **Explain** — `reason` (the headline rationale), `alternatives[]` (2-3 runner-up built types with a `why`), `warnings[]` (anti-patterns, consequence-honest), `confidence` (high / medium / low). `--explain` prints all of it.

## Hints (data tie-breakers, computed by gen.cjs `buildHints`)

`{ n_categories, n_periods, n_series, n_measures, n_axes, has_negatives, has_time_axis, has_target, has_size, is_likert, max_pie_slices=6 }`.

## What's preserved vs what changed (v0.1 → v0.2)

The v0.1 rule outcomes are **preserved** (same ideal for the same input); v0.2 **adds** intents (funnel/bullet/diverging/quadrant/radar/box/slope/dumbbell/area/stacked-area) + the explainability fields. Three v0.1 outcomes **intentionally improve** because the deferred types are now built: marimekko/bubble/histogram now render natively instead of falling back to stacked100/scatter/column.

The chosen message-sentence IS the rendered **action-title** (analytical/survey genre) or a topic label (`--title-style=topic`, brand/survey-trend genre). Seeded from `wiki/cracked-it/concepts/quantitative-chart-typology.md` (Cracked It! Ch.11) + the Datylon taxonomy.
