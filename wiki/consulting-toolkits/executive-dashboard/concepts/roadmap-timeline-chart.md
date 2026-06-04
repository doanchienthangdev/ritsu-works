---
type: concept
slug: roadmap-timeline-chart
title: Multi-Year Roadmap Timeline Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: strategy
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Multi-Year Roadmap Timeline Chart

*Category: strategy · Toolkit: Executive Dashboard*

## What it is
A horizontal Gantt-style chart showing all strategic initiatives grouped by pillar across a 1–5 year timeline. Each initiative is one horizontal bar; quarters are the time unit; colours map to strategic pillars. A 'Today' line shows current position on the roadmap.

**Origin:** Adapted from the product roadmap visualisation popularised in software product management (a-la Aha!, ProductPlan, Roadmunk) and applied to corporate strategy communication. The multi-year strategic roadmap is a standard deliverable in McKinsey and BCG strategy engagements.

## Why it works
Strategy execution fails most often because of three problems: (1) too many initiatives competing for resources, (2) no visibility of which initiatives are running concurrently (resource conflicts), and (3) no way to see whether the sequencing of initiatives is logical (later initiatives depend on earlier ones). The roadmap timeline chart makes all three problems visible in one view.

## When to use
Use as the primary visualisation in Phase 4 (Strategic Plan Dashboard). Also use in board presentations, investor days, and all-hands strategy communication.

## Visual
`process-flow`

## Step-by-step tutorial
1. Use the Strategic Roadmap Input Table as the data source (Pillar, Initiative Name, Start Quarter/Year, End Quarter/Year).
2. Convert start and end dates to the quarter number within the overall roadmap timeline (e.g., Q1 2024 = quarter 1 of the timeline; Q2 2026 = quarter 9).
3. Build the Gantt chart using the stacked-bar technique: Base = Start Quarter number − 1; Duration = End Quarter − Start Quarter + 1.
4. Group rows by strategic pillar. Add a bold pillar-header row between groups using a thin full-width coloured bar.
5. Apply pillar-colour fills to each initiative bar.
6. Add initiative name labels inside each bar (or in a Y-axis label if bars are too narrow).
7. Add the Today vertical line using the scatter-point technique from the Gantt chart tutorial.
8. Add a 5-year milestone overlay: key strategic targets (e.g., '€1B Revenue by 2027') as vertical reference lines in contrasting colours.

## Real-life example — ING Bank — 'Think Forward' 5-year strategy, 2014–2018
ING Bank's 5-year 'Think Forward' strategy was visualised as a multi-year roadmap with four strategic pillars: Customer Experience, Empowered Employees, Innovation, and Financial Strength. The roadmap timeline showed ~30 flagship initiatives distributed across the 5 years, revealing that years 1–2 were heavily loaded in the Technology Modernisation pillar (infrastructure investment that enabled later initiatives). The board used the roadmap to identify resource conflicts in years 1–2 and approved additional capital allocation to prevent bottlenecks.

**So what:** The roadmap timeline reveals strategic sequencing risk — if years 1–2 are overloaded with foundational investments and years 3–5 assume all foundational work is complete, any delay in years 1–2 cascades into the entire strategic plan.

## Template
Fill in the Strategic Roadmap Input Table. The roadmap chart will update automatically as start/end quarters are entered. Colour coding by pillar is applied via the Pillar column formula.

- [ ] Pillar: [select from dropdown of defined pillar names]
- [ ] Initiative Name: [short descriptive name ≤40 characters]
- [ ] Start Year/Quarter: [e.g. 2024 Q1]
- [ ] End Year/Quarter: [e.g. 2026 Q3]
- [ ] RAG Status: [formula-driven from % complete vs. planned]
- [ ] Outcome KPI: [the metric this initiative will move]
- [ ] Investment ($K): [total approved budget]

## Pitfalls
- Including operational programmes (BAU improvement work) alongside strategic initiatives — the roadmap should show only true strategic initiatives; BAU work belongs in the operational plan.
- Not updating end dates when initiatives slip — a roadmap that shows all initiatives ending on their original date after 12 months of execution has been abandoned as a management tool.
- Making the roadmap too detailed (50+ initiatives) — an executive roadmap should show 15–30 headline initiatives. Detail lives in programme plans, not the strategic roadmap.
