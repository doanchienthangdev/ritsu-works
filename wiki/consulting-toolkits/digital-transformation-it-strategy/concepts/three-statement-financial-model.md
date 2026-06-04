---
type: concept
slug: three-statement-financial-model
title: 3-Statement Financial Model
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# 3-Statement Financial Model

*Category: financial · Toolkit: Digital Transformation & IT Strategy*

## What it is
A linked financial model covering the Income Statement (P&L), Balance Sheet, and Cash Flow Statement, updated monthly with actuals and a rolling 12-month forecast — providing the Board and Finance team with a comprehensive view of the programme's financial impact on the organisation.

**Origin:** Standard corporate finance tool; the 3-statement model is taught in all CFA and investment banking training programmes. Applied to programme management to track the financial impact of a transformation programme on the organisation's financial statements.

## Why it works
Digital transformation benefits are often described in P&L terms (revenue uplift, cost reduction) but have balance sheet implications (capex → depreciation, software licensing → intangibles) and cash flow implications (capex spend precedes benefit realisation). The 3-statement model makes all three visible: the P&L shows profitability impact; the Balance Sheet shows investment accumulation and depreciation; the Cash Flow shows when cash actually leaves and returns.

## When to use
Use in Phase I Step 4 (Build the ROI Model) to construct the initial financial case; update monthly throughout Phase III and Phase V as the programme delivers.

## Visual
`table`

## Step-by-step tutorial
1. 1. Build the baseline model: populate Year 1–3 actuals/forecasts for all three statements without the transformation programme. This is the 'do nothing' baseline.
2. 2. Build the transformation overlay: add transformation costs (capex by project, by year) and transformation benefits (revenue uplift and cost reduction, by year, phased per the Benefits Realisation Profile).
3. 3. Link the three statements: ensure P&L net income links to retained earnings in the Balance Sheet; ensure depreciation (P&L) reduces fixed assets (Balance Sheet); ensure capex (Balance Sheet) appears as an outflow in Cash Flow.
4. 4. Build a monthly rolling model: update actuals monthly. The model should automatically flag variances against the prior forecast.
5. 5. Calculate programme-specific metrics: Programme FCF (cumulative), Payback Month, IRR, NPV — as direct outputs of the linked model.
6. 6. Separate capex from opex treatment: programme capex (hardware, software licences >12 months) is capitalised and depreciated; opex (professional services, cloud subscription, training) is expensed. Confirm treatment with Finance.
7. 7. Agree with Finance: the 3-statement model must be agreed with the CFO/Finance team before use. It represents how the programme will affect the published financial statements.
8. 8. Update monthly: in the monthly performance review, update the model with actuals and revise the forecast. Report the updated NPV and payback to the Programme Board.

## Real-life example — Tesco (UK) — internal financial modelling
Tesco's digital transformation programme financial model tracked programme impact on all three financial statements. Key model outputs: the P&L showed that digital programmes added £320M in EBITDA over 3 years (net of £85M programme operating costs). The Cash Flow model showed that the programme required £180M in capex over 18 months before benefits materialised — the 'cash valley of death' that required Board sign-off on the financing plan. The Balance Sheet tracked £180M in intangible assets (software) and their depreciation profile. The 3-statement model was the primary source of information for Tesco's investor presentations on its digital transformation return.

**So what:** The 3-statement model is the tool that connects digital transformation benefits to the organisation's published financial statements. Without it, programme benefits are disconnected from the CFO's financial reality — which means they will not be trusted.

## Template
Build the 3-statement model in the spreadsheet linked from the programme data room. Update monthly with actuals. Present updated NPV and payback to the Steering Committee.

- [ ] P&L: Revenue baseline [£/$M] | Digital uplift [£/$M] | Total revenue [£/$M] | Cost baseline [£/$M] | Cost reduction [£/$M] | Programme opex [£/$M] | EBITDA [£/$M] | Depreciation [£/$M] | Net income [£/$M]
- [ ] CASH FLOW: Operating cash flow [£/$M] | Programme capex [£/$M] | Free cash flow [£/$M] | Cumulative FCF [£/$M] | Payback month [n]
- [ ] BALANCE SHEET: Programme intangible assets [£/$M] | Accumulated depreciation [£/$M] | Net intangibles [£/$M]
- [ ] PROGRAMME METRICS: NPV [£/$M] | IRR [%] | Payback [months] | Variance to original business case [+/-%]

## Pitfalls
- Opex vs. capex misclassification — expensing items that should be capitalised (or vice versa) distorts both the P&L and Balance Sheet; agree treatment with Finance for each cost category.
- Model not updated monthly — a stale model is misleading; the monthly update is the mechanism that makes the model a management tool.
