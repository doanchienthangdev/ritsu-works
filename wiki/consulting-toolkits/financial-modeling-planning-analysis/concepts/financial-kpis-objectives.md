---
type: concept
slug: financial-kpis-objectives
title: Financial KPI Cascade
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Financial KPI Cascade

*Category: planning · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A structured hierarchy of 8–12 financial KPIs with owners, baselines, and annual targets, cascaded from corporate level to business unit level to functional level, each linked to a strategic objective. The KPI cascade is the contract between the finance team and the rest of the business.

**Origin:** Balanced Scorecard (Kaplan & Norton, Harvard Business School, 1992) formalized the concept of a financial and non-financial KPI cascade linked to strategy. OKRs (Objectives and Key Results, Andy Grove at Intel, 1970s; popularized by John Doerr at Google) provide an alternative but related framework.

## Why it works
What gets measured gets managed. A well-designed KPI cascade creates alignment: each business unit knows exactly how its performance connects to the corporate financial targets. Each functional leader knows which metric they own. Without this cascade, different parts of the organization optimize different (sometimes conflicting) metrics, and the CFO's 'financial plan' remains a top-level document that never reaches the people who must execute it.

## When to use
Use in Phase 3, Step 3 to translate the financial plan into individual accountability. Review and update annually in conjunction with the budget cycle.

## Visual
`tree`

## Step-by-step tutorial
1. Start from the strategic objectives (Step 3.1): for each strategic objective, identify the primary financial KPI that will measure progress toward it. One strategic objective → one primary KPI.
2. Select 4 corporate KPIs: Revenue, EBITDA Margin, Free Cash Flow, and ROIC are the universal top-4. Add one or two context-specific KPIs (e.g., NPS or Churn for B2B SaaS; Market Share for consumer businesses).
3. Cascade to BU level: for each BU, identify the 3–5 financial KPIs that directly roll up to the corporate metrics. BU Revenue + BU Gross Margin are always included. Add BU-specific metrics (e.g., utilization rate for a professional services firm, inventory turns for a retailer).
4. Cascade to functional level: identify 2–3 KPIs per key function that the function controls. Finance: DSO, DPO, Forecast Accuracy (MAPE %). Operations: inventory turns, on-time delivery. Sales: Revenue per rep, Win rate.
5. Apply the SMART test to each KPI: Specific (unambiguous definition of what is measured), Measurable (calculable from available data), Achievable (realistic given resources), Relevant (linked to a strategic objective), Time-bound (annual and quarterly targets).
6. Assign a single DRI (Directly Responsible Individual) to each KPI. Dual ownership means no one is accountable.
7. Set baseline values (current performance), Year 1 target, Year 2 target, and Year 3 target for each KPI. The targets should be consistent with the financial model scenarios — not aspirational numbers invented separately.
8. Review the KPI cascade with each BU head: each BU head must agree that their BU KPIs are (a) within their control and (b) consistent with the corporate targets. If they disagree, resolve the conflict before the cascade is finalized.

## Real-life example — Microsoft FY2024 KPI cascade (publicly disclosed)
Microsoft publishes a clear KPI cascade in its FY2024 annual report aligned to its mission and three business segments. Corporate KPIs: Total Revenue ($245B, +16% YoY), Operating Income ($109B, 45% margin), EPS ($11.45, +20% YoY). Segment KPIs: Intelligent Cloud (Azure) revenue $96B (+21%); Productivity and Business Processes (Office/LinkedIn) $77B (+12%); More Personal Computing $54B (+3%). Each segment has its own operating income target. At the functional level, Microsoft tracks Azure consumption growth (operational metric) and LinkedIn engagement (non-financial KPI). The cascade is published externally — meaning every employee can see exactly how their segment and function contributes to the corporate targets.

**So what:** The best KPI cascades are transparent and publicly disclosed. When employees can see the full cascade — and their function's KPIs link directly to the CEO's targets — accountability becomes cultural rather than managerial.

## Template
Fill in the KPI cascade. Every KPI must have a DRI, baseline, and annual targets. Cross-check that BU KPIs sum to corporate KPIs.

- [ ] Corporate KPI 1: Revenue | Baseline: $___M | Y1 Target: $___M | Y2: $___M | Y3: $___M | DRI: CEO
- [ ] Corporate KPI 2: EBITDA Margin | Baseline: ___% | Y1: ___% | Y2: ___% | Y3: ___% | DRI: CFO
- [ ] Corporate KPI 3: FCF | Baseline: $___M | Y1: $___M | Y2: $___M | Y3: $___M | DRI: CFO
- [ ] Corporate KPI 4: ROIC | Baseline: ___% | Y1: ___% | Y2: ___% | Y3: ___% | DRI: CFO
- [ ] BU 1 KPI 1: Revenue | Baseline: $___M | Y1: $___M | DRI: BU1 Head
- [ ] BU 1 KPI 2: Gross Margin | Baseline: ___% | Y1: ___% | DRI: BU1 CFO
- [ ] BU 2 KPIs: [repeat above]
- [ ] Finance Function KPI: DSO | Baseline: ___days | Y1 Target: ___days | DRI: Controller
- [ ] Finance Function KPI: Forecast Accuracy (MAPE) | Baseline: ___% | Y1 Target: ___% | DRI: FP&A Director
- [ ] Sumcheck: BU1 Revenue + BU2 Revenue + BU3 Revenue = Corporate Revenue Target? [Yes / Gap: $___M]

## Pitfalls
- Having too many KPIs — if a business unit has 15 KPIs, none of them is the KPI. Enforce a maximum of 5 KPIs per level; force prioritization.
- Setting KPI targets that are not in the financial model — if the financial model says EBITDA Margin 15% and the KPI cascade says 17%, one of them is wrong; they must be synchronized.
- Assigning shared ownership to a KPI — 'CFO and BU Head share ownership of BU EBITDA' guarantees that nobody feels fully responsible when it misses. Assign one DRI; others are contributors.
