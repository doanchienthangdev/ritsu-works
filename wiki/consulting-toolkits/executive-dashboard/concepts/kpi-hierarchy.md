---
type: concept
slug: kpi-hierarchy
title: KPI Hierarchy (Roll-Up Architecture)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# KPI Hierarchy (Roll-Up Architecture)

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A structured tree that maps how functional KPIs aggregate into business-unit KPIs, which aggregate into company-level KPIs. It ensures that the metric shown on the C-suite dashboard is the arithmetic sum of the metrics shown on the functional dashboards.

**Origin:** The KPI hierarchy concept is implicit in the Balanced Scorecard's cascade methodology (Kaplan & Norton, 2001, *The Strategy-Focused Organisation*) and is operationalised in enterprise performance management software (SAP Analytics Cloud, IBM Cognos, Tableau). It is a fundamental data governance requirement in any multi-level reporting structure.

## Why it works
Without a defined hierarchy, the company-level Revenue on the C-suite dashboard may not equal the sum of divisional revenues on functional dashboards — a discrepancy that creates board-level credibility problems and wastes analysis time. The hierarchy ensures data integrity across all reporting levels by defining the exact aggregation path from transaction systems to executive view.

## When to use
Define the KPI hierarchy before building any dashboard. Revisit when new business units are acquired or when functional dashboards are added to the portfolio.

## Visual
`tree`

## Step-by-step tutorial
1. Start with the company-level KPIs on the C-suite dashboard (the leaves of the tree's root).
2. For each company-level KPI, identify the functional KPIs that sum to it: Revenue = Sales Revenue + Product Revenue + Service Revenue.
3. For each functional KPI, identify the operational metrics that drive it.
4. Document the aggregation rule for each parent-child link: SUM, AVERAGE, WEIGHTED AVERAGE, or MIN/MAX.
5. Implement the hierarchy in the dashboard workbook: each functional Input tab has a 'Roll-Up' row that is referenced by a formula in the company overview Input tab.
6. Test the hierarchy: introduce a known change in a leaf metric and verify it propagates correctly to the root.

## Real-life example — A retail group with 5 trading divisions
The group's total revenue (company dashboard) was supposed to equal the sum of the 5 divisional revenues (functional dashboards). In practice, it did not — because the group's finance team excluded inter-company sales from company revenue but included them in divisional revenue. The KPI hierarchy exercise identified this discrepancy, established a consistent inter-company elimination rule, and restored trust in the consolidated reporting.

**So what:** A KPI hierarchy is both a technical data-integrity tool and a governance tool: it forces explicit decisions about how metrics are defined at each level, eliminating the silent assumptions that cause 'why don't the numbers add up?' questions at board level.

## Template
Document the hierarchy for each company-level KPI. Note the aggregation rule at each level.

- [ ] Level 0 (Company KPI): [e.g. Total Revenue]
- [ ] Level 1 (Business Unit): [e.g. Division A Revenue + Division B Revenue + Division C Revenue]
- [ ] Aggregation rule (L0 from L1): [SUM]
- [ ] Level 2 (Functional): [e.g. Division A Product Revenue + Division A Service Revenue]
- [ ] Aggregation rule (L1 from L2): [SUM]
- [ ] Exclusions/adjustments: [e.g. exclude inter-company sales; exclude VAT]

## Pitfalls
- Assuming the hierarchy is self-evident — it never is; always document it explicitly, especially the adjustment/exclusion rules.
- Allowing functional teams to use different definitions of the same metric at different levels — the hierarchy definition overrides local convenience definitions.
