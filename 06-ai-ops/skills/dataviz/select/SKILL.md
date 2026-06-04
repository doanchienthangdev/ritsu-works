---
name: dataviz/select
description: |
  The Zelazny message→chart-type selector for /dataviz. Choose the chart FROM THE
  MESSAGE, not the data (Gene Zelazny, "Say It With Charts"). Deterministic, pure
  (scripts/dataviz/select.cjs). Used by gen.cjs when --chart=auto.
allowed-tools: [Read, Bash]
disable-model-invocation: false
---

# dataviz/select — pick the chart from the message

> **The whole method in one sentence: choose the chart from the MESSAGE, not the data.** Write the message as one complete sentence (it doubles as the action-title), find its trigger words, map to ONE comparison type, then the data only fills the form.

`selectChart(message, hints) -> { chartType, ideal, reason }` (`scripts/dataviz/select.cjs`). Top-down FIRST-MATCH (order resolves overlaps):

1. **waterfall** — bridge / build-up / contribution-to-change / inflows-outflows / has_negatives ("how did we get from A to B").
2. **marimekko** (→ stacked100 in v0.1) — two share dimensions (size × share).
3. **bubble** (→ scatter) — three measures.
4. **scatter** — correlation / relationship-between / two measures.
5. **histogram** (→ column) — distribution / frequency / buckets.
6. **stacked100** — a share-word AND a time-word (component over time; never multiple pies).
7. **grouped** — leader-vs-laggard triad (winners/high-performers vs others), n_series ≥ 2.
8. **component** (→ bar) — share / % / composition single-period (McKinsey demotes pie → ranked bar).
9. **timeseries** → column (≤7 periods, absolute, zero-baseline) | line (many periods / multi-series).
10. **item** → horizontal bar sorted desc (Zelazny safe default / fallback).

**Two HARD guard-rails:** (#1) **entity x-axis ⇒ Item, never time-series** — only a real date/period axis is time ("market share by salesperson" reads like a trend but is a ranking). (#2) **>~6 slices ⇒ demote pie → bar.** **`vs.`/`%` are overloaded** — disambiguate by operand TYPE (entity-vs-entity = Item; measure-vs-measure = correlation; part-of-whole = component), never the token.

**Hints** (data tie-breakers only): `{ n_categories, n_periods, n_series, n_measures, has_negatives, has_time_axis, max_pie_slices=6 }`. Deferred ideals map to the nearest BUILT type + an honest `reason`. Seeded from `wiki/cracked-it/concepts/quantitative-chart-typology.md` (the Cracked It! Ch.11 Zelazny+waterfall taxonomy).

The chosen message-sentence IS the rendered **action-title** (analytical/survey genre) or a topic label (brand/survey-trend genre).
