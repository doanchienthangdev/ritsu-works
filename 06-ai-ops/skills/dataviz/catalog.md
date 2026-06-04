<!-- generated-by: dataviz gen-catalog.cjs (from scripts/dataviz/lib/taxonomy.cjs) — do not hand-edit -->

# /dataviz chart catalog — the LLM-native selection substrate

> **You (the calling agent) are the chart selector.** Read this catalog + the situation
> (the one-sentence MESSAGE + the data shape + the audience), then pick the chart that
> makes the point — the way a McKinsey analyst would. Gene Zelazny, *Say It With Charts*:
> **choose the chart from the MESSAGE, not the data.** Then render with
> `node scripts/dataviz/gen.cjs --chart=<your-pick> --selected-by=agent --select-reason="<one line>" --data=… --source=…`.
> Generated from `scripts/dataviz/lib/taxonomy.cjs` — do not hand-edit.

## How to choose (the analyst’s sequence)

1. **What does the MESSAGE assert?** The verb decides the family — *rank/compare/leads* → comparison · *relates to/drives/correlates* → correlation · *share/mix/of-total/composition/funnel/drop-off* → part-to-whole · *grew/fell/trend/over time/bridge/since* → change-over-time · *spread/distribution/quartiles/frequency* → distribution · *flows/links/process/from→to* → flow-geospatial · *one number* → kpi.
2. **Pick within the family by the data shape** (the *data it needs* column).
3. **Apply the McKinsey discipline.** Prefer `preferred` forms. `pie`/`donut` are **DEMOTED** — use a ranked `bar` unless the message truly is a single-share callout (then pass `--chart=pie` explicitly + accept the warning). Never reach for an `avoid`/cataloged form. One highlight only, zero-baseline bars, direct labels, a source footer on every exhibit.
4. **Nudge by audience.** `exec` → simpler, fewer marks (a long ranking reads better as a `lollipop`); `analyst` → more detail is fine; `general` → the safe default.
5. **Render** with `--chart=<pick> --selected-by=agent --select-reason="why this beats the runner-up"` (optionally `--select-confidence=high|medium|low`). If you are genuinely unsure, omit `--chart` (or pass `--chart=auto`) and the deterministic fallback selector picks a safe default — but you, the agent, should almost always be able to choose better.

## Worked examples

- *"Reddit dẫn đầu các kênh acquisition"* → ranking of items → **`bar`** (the Zelazny safe default; this is the multilingual win — a Vietnamese message the old regex could not read).
- *"hoạt động nhiều hơn thì retention cao hơn"* (2 measures) → a relationship → **`scatter`**.
- *"cơ cấu doanh thu theo gói thay đổi theo từng quý"* (share + time) → **`stacked100`**.
- *"60% người dùng rớt qua từng bước trước quiz đầu tiên"* → stage drop-off → **`funnel`**.
- *"xếp hạng 20 trường theo số người dùng"*, audience `exec` → long ranking → **`lollipop`**.
- *"dòng người dùng chảy từ kênh acquisition sang gói trả phí"* → flow between nodes → **`sankey`**.

## comparison (14)

*Reach for this family when:* Compare or rank values across discrete items — who is bigger, the ranking, leader-vs-laggard, a 2×2 position, actual-vs-target.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `bar` | Rank/compare values across categories. The Zelazny safe default. | — | preferred | horizontal bar |
| `column` | Compare across a few ordered categories or short time periods (zero-baseline). | — | preferred | vertical bar |
| `grouped` | Compare 2-3 series per category (leader-vs-laggard). | ≥2 series | preferred | clustered bar, paired bar |
| `lollipop` | Space-efficient bar alternative for many categories. | — | acceptable | — |
| `dot` | Compare values without forcing a zero baseline; zoom into a range. | — | acceptable | dot plot |
| `dumbbell` | Emphasize the delta between two paired values per category (gap, before/after). | ≥2 series | preferred | connected dot plot, barbell |
| `slope` | Two-period change with the slope as the message (rank shifts). | 2 periods | preferred | slopegraph |
| `radar` | Side-by-side multi-dimensional profile (approximate, not precise). | 3+ dimensions | acceptable | spider, web, star |
| `quadrant` | Position items on two dimensions (the consulting 2×2). | 2 measures | preferred | 2x2 matrix, BCG matrix |
| `bullet` | Actual-vs-target performance in a compact bar (dashboard KPI). | a target value | preferred | bullet graph |
| `small-multiples` | Grid of simple charts, one per slice. (v-next renderer.) | — | preferred | trellis, panel |
| `range` | Range between two values per category. | — | acceptable | — |
| `matrix-chart` | Presence/strength between two categorical sets. | — | acceptable | — |
| `table-chart` | Conditionally-formatted table. | — | acceptable | — |

## correlation (5)

*Reach for this family when:* Show a RELATIONSHIP between 2-3 measures over shared subjects — does X move with Y.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `scatter` | Relationship between two measures over shared subjects. | 2 measures | preferred | scattergram |
| `bubble` | Three measures: x, y, and size — clusters + outliers. | 3 measures | preferred | bubble plot |
| `heatmap` | Color a row×column matrix by value (sensitivity tables, density). | a row×column matrix | acceptable | heat table, matrix |
| `connected-scatter` | Scatter with points linked in time order. | — | acceptable | — |
| `hexbin` | Density bins for huge scatters. | — | acceptable | hexagonal binning |

## part-to-whole (14)

*Reach for this family when:* Show composition / share / a stage drop-off — parts of a whole, the mix, a Likert split, a conversion funnel.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `stacked` | Total per category + how sub-parts contribute (absolute). | ≥2 series | acceptable | — |
| `stacked100` | Component share across categories/time (never multiple pies). | ≥2 series | preferred | 100% stacked |
| `pie` | Parts of a whole; McKinsey demotes >~5 slices to a ranked bar. | ≤6 parts | demoted | — |
| `donut` | Pie variant with a center hole (often a center KPI). | ≤6 parts | demoted | ring chart |
| `marimekko` | Variable-width stacked columns: width = segment size, height = share. A McKinsey signature. | ≥2 series | preferred | mekko, mosaic |
| `diverging` | Sentiment/Likert split around a center (agree/disagree). | a sentiment/Likert split | preferred | diverging stacked bar |
| `funnel` | Progressive reduction through ordered stages (signup→activation→paid). | — | preferred | pyramid, conversion funnel |
| `waffle` | Grid of squares as a part-to-whole. | — | acceptable | — |
| `treemap` | Nested rectangles sized by value. (v-next renderer.) | — | acceptable | — |
| `population-pyramid` | Back-to-back bars by age/gender. | — | acceptable | age-sex pyramid |
| `sunburst` | Radial nested hierarchy. | — | acceptable | — |
| `dendrogram` | Hierarchical clustering tree. | — | acceptable | — |
| `venn` | Set intersections. | — | acceptable | — |
| `semicircle-donut` | Half-circle donut. | — | acceptable | — |

## change-over-time (11)

*Reach for this family when:* Show how a value moves across a REAL date/period axis — a trend, a bridge (A→B), a ranking shift, a schedule, OHLC.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `line` | Trend across many periods or multiple series. | a date/period axis | preferred | — |
| `area` | Magnitude over time (single series, filled under the line). | a date/period axis | acceptable | — |
| `stacked-area` | Composition changing over time (absolute stacked). | ≥2 series, a date/period axis | acceptable | stacked area |
| `waterfall` | How you got from A to B (positive/negative contributions). | — | preferred | bridge, cascade |
| `bump` | Ranking changes over periods. | — | acceptable | — |
| `spline` | Smoothed line. | — | acceptable | — |
| `step-line` | Right-angle steps for discrete intervals. | — | acceptable | — |
| `gantt` | Project timeline bars. (v-next renderer.) | — | acceptable | — |
| `candlestick` | Financial OHLC per period. | — | acceptable | — |
| `ohlc` | Open/high/low/close bars. | — | acceptable | — |
| `barcode` | Vertical ticks for temporal anomalies. | — | acceptable | — |

## distribution (9)

*Reach for this family when:* Show the SHAPE or spread of a single variable — frequency, quartiles, density, the individual points.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `histogram` | Frequency across binned ranges of a continuous variable. | — | acceptable | frequency chart |
| `box` | Quartiles, median, and outliers — distribution summary across groups. | — | acceptable | box plot, box-and-whisker |
| `density` | Probability density curve. | — | acceptable | — |
| `ridgeline` | Stacked density curves. | — | acceptable | — |
| `violin` | Mirrored density (box-plus-shape). | — | acceptable | — |
| `strip` | Individual values on one axis. | — | acceptable | — |
| `jitter` | Jittered categorical scatter. | — | acceptable | — |
| `beeswarm` | Non-overlapping value swarm. | — | acceptable | — |
| `horizon` | Compact banded temporal deviations. | — | acceptable | — |

## flow-geospatial (6)

*Reach for this family when:* Show flow between nodes or a topology/grid map — where value goes, who links to whom, the process steps.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `sankey` | Flow quantities between nodes. (Needs graph layout — v-next.) | — | acceptable | — |
| `chord` | Circular entity-to-entity links. | — | acceptable | — |
| `arc` | Linear nodes with arc links. | — | acceptable | — |
| `network` | Node-link graph. | — | acceptable | — |
| `flowchart` | Process/decision diagram. | — | acceptable | — |
| `tile-map` | Equal-size grid map. | — | acceptable | — |

## kpi (1)

*Reach for this family when:* State ONE number that matters — a big-number callout.

| chart | when to use | data it needs | McKinsey | also called |
|---|---|---|---|---|
| `kpi` | Big-number callout(s) — one metric that matters. | — | preferred | — |

## Not built (cataloged) — do NOT pass these as `--chart`

They map to the nearest built type + an honest warning. **10 anti-McKinsey** (radial-bar, nightingale, pictogram, icon-chart, icon-array, word-cloud, gauge, stream, parallel-coordinates, radial-histogram) + **4 infeasible in a pure zero-dep renderer** (choropleth, geo-heatmap, contour, euler). If a situation truly calls for one, use the nearest built form and say so in `--select-reason`.
