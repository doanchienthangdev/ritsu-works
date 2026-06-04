---
type: concept
slug: continuous-improvement-fpa
title: Continuous Improvement for the FP&A Function
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Continuous Improvement for the FP&A Function

*Category: governance · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
The systematic application of Lean principles and performance benchmarking (Hackett Group / APQC) to identify and eliminate non-value-add steps in the FP&A close, forecast, and reporting cycles — improving forecast accuracy, reducing cycle time, and rebalancing the finance team's time toward value-add analytical work.

**Origin:** Lean manufacturing principles (Toyota Production System, Taiichi Ohno, 1950s) applied to service and knowledge work. Applied to finance by the Lean Enterprise Institute and documented in Hackett Group research on finance function effectiveness. APQC process benchmarking database provides the quantitative benchmarks.

## Why it works
Best-in-class finance functions spend 60% of their time on value-add analytical work (scenario analysis, business partnering, strategic guidance) and 40% on transactional/data work. Median finance functions invert this ratio: 40% value-add, 60% transactional. Continuous improvement systematically transfers work from transactional to value-add, freeing analyst capacity for the work that actually drives business decisions.

## When to use
Run annually as a self-assessment and improvement planning exercise. Also use when: (a) the finance team is overworked; (b) forecast accuracy is not improving; (c) a new CFO joins and wants to assess the finance function's maturity; or (d) planning a technology investment that requires a process baseline.

## Visual
`comparison`

## Step-by-step tutorial
1. Baseline the FP&A function: measure the current state on the 5 Hackett metrics: planning cycle time (days), forecast accuracy (MAPE %), finance headcount per $1B revenue, % of time on value-add work (time study), and close-to-dashboard cycle time.
2. Benchmark against Hackett Group or APQC: purchase or access the latest benchmark report for your industry. Plot your current metrics against the median and top-quartile. Identify the 3 metrics with the largest gap to top-quartile.
3. Run a value stream map of the close cycle: document every step in the month-end close from the moment the period ends to the moment the Finance Committee receives the dashboard. Categorize each step as value-add (CFO makes a decision), necessary non-value-add (regulatory requirement), or waste (waiting, rework, manual reconciliation). Waste is the improvement target.
4. Identify the top 3 improvement opportunities: typically (a) automate the manual data extraction from ERP (use Power BI or Tableau connectors instead of manually downloading reports); (b) reduce reconciliation rework by improving data quality at source (work with IT to add validation rules in the ERP); (c) eliminate reports that nobody reads (audit report utilization by tracking open rates or running a 'report moratorium' test).
5. Build the FP&A capability improvement roadmap: 3–5 initiatives over 12–18 months, each with a clear metric target (e.g., 'Reduce close-to-dashboard from 15 days to 8 days by Q3 by automating the ERP data pull — saves 3 analyst-days per month').
6. Measure and report annually: the FP&A capability scorecard should be presented to the CFO annually alongside the function's budget request. This creates accountability for the improvement roadmap.
7. Target the 'golden ratio': 70% value-add / 30% transactional by Year 3. This is the Hackett top-quartile benchmark. Achieving it typically requires automation of data extraction, elimination of manual reconciliations, and consolidation of report variants.

## Real-life example — Procter & Gamble finance transformation
P&G's finance function ran a continuous improvement program that reduced the close-to-Board-report cycle from 22 days (2015) to 6 days (2020). Key changes: (1) SAP S/4HANA implementation with real-time financial data — eliminated the 5-day data extraction process; (2) Standardized chart of accounts across 80+ countries — eliminated 60% of reconciliation rework; (3) Global Business Services (GBS) hub in Manila and Warsaw took over transaction processing — freed ~30% of finance capacity for value-add analysis. Result: P&G's finance cost as % of revenue declined from 1.2% to 0.7% — a $400M annual saving. The Hackett Group rated P&G's finance function as 'world-class' in 2019.

**So what:** Finance transformation is not about technology — it is about ruthlessly eliminating non-value-add work. The data extraction step that takes 3 days in most organizations is solved by a $10K Power BI connector, not a $50M ERP upgrade. Start with process simplification before adding technology.

## Template
Baseline the FP&A function on the 5 Hackett metrics. Identify the top 3 improvement opportunities. Build the improvement roadmap.

- [ ] Current Planning Cycle Time: ___days | Hackett Median: 30–60days | Top Quartile: <20days | Gap: ___days
- [ ] Current Forecast Accuracy (MAPE): ___% | Hackett Median: 5–10% | Top Quartile: <3% | Gap: ___%
- [ ] Finance Headcount per $1B Revenue: ___ FTEs | Hackett Median: 40–60 | Top Quartile: <25 | Gap: ___
- [ ] % Time on Value-Add Work: ___% | Hackett Median: 30–50% | Top Quartile: >60% | Gap: ___%
- [ ] Close-to-Dashboard Cycle: ___days | Hackett Median: 10–15 | Top Quartile: <5 | Gap: ___days
- [ ] Value Stream Map: Total steps in close cycle: ___ | Value-add: ___ | Necessary NVA: ___ | Waste: ___
- [ ] Top 3 Improvement Opportunities: 1.___ Target:___ Saving:$___/year | 2.___ Target:___ Saving:$___/year | 3.___ Target:___
- [ ] Improvement Roadmap: Initiative 1: ___ | Target Completion: Q___ | Metric impact: ___

## Pitfalls
- Benchmarking and never acting — the improvement plan must have named owners, specific metric targets, and quarterly check-ins. An annual benchmarking exercise with no improvement roadmap is a waste of the benchmarking cost.
- Automating a broken process — do not automate a process before simplifying it. Automating a 30-step manual process that has 15 waste steps produces a fast, automated, broken process. Simplify first; automate second.
- Tracking activity (we ran 5 Lean workshops) rather than outcomes (close cycle time reduced by 7 days) — always measure improvement by the Hackett/APQC metric, not by the activity that was supposed to achieve it.
