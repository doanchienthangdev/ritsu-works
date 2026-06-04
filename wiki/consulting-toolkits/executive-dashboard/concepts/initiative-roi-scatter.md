---
type: concept
slug: initiative-roi-scatter
title: Initiative ROI Scatter Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: strategy
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Initiative ROI Scatter Chart

*Category: strategy · Toolkit: Executive Dashboard*

## What it is
A scatter (bubble) chart where each active strategic initiative is plotted on two axes: x = % of initiative complete, y = ROI to date (benefit realised ÷ cost incurred). Bubble size = total investment. The four quadrants reveal which initiatives are generating returns, which are struggling, and which are still early-stage.

**Origin:** The ROI scatter for initiative prioritisation is a consulting-derived framework; its visual cousin is the BCG Growth-Share Matrix (1968). Applied to strategic initiatives by McKinsey's strategy and performance practices as a method for rationalising initiative portfolios in transformation programmes.

## Why it works
Strategy execution requires continuous portfolio management: not all initiatives will deliver as planned, and resources are finite. The ROI scatter chart makes the 'kill, accelerate, or nurture' decision visible: initiatives in the top-right (high completion, high ROI) should be celebrated and harvested; initiatives in the bottom-right (high completion, low ROI) should be scrutinised or wound down; initiatives in the top-left (early stage, already generating ROI) should be accelerated; initiatives in the bottom-left (early stage, low/no ROI) need a decision — stay patient or exit.

## When to use
Use in the strategic plan dashboard for any organisation executing a portfolio of major initiatives (>$5M total investment, >5 initiatives). Also use at annual strategy reviews and investor days.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. Prepare a data table with one row per initiative: Initiative Name, Pillar, % Complete, Investment to Date ($K), Benefit Realised to Date ($K), Total Investment ($K).
2. Calculate ROI to Date: = Benefit Realised ÷ Investment to Date × 100 (expressed as %).
3. Insert a Bubble chart: x = % Complete, y = ROI to Date, bubble size = Total Investment.
4. Add quadrant lines: a vertical line at x = 50 % (midpoint between early and late stage) and a horizontal line at y = 100 % (ROI at break-even).
5. Apply pillar colours to each bubble.
6. Add initiative name labels using Excel's 'Add Data Labels > Value from Cells' feature (requires Excel 2013 or later).
7. Add a chart legend for bubble-size reference (e.g., 'Bubble size = Total Investment').
8. Review the chart quarterly with the executive committee: for each bottom-right bubble, ask 'What needs to happen for this initiative to generate the expected return?'

## Real-life example — A global retail bank — digital transformation programme
The bank's digital transformation portfolio included 18 initiatives with a combined budget of €250M. The Initiative ROI scatter chart was presented at the annual strategy review. It revealed: 4 initiatives in the top-right (customer mobile app upgrades, API banking platform — both generating 3× ROI); 3 initiatives in the bottom-right (branch network redesign — 85 % complete, −20 % ROI due to lower-than-expected footfall recovery); and 6 initiatives in the bottom-left (AI credit decisioning, open banking — early stage, uncertain ROI). The board allocated additional resources to the top-left accelerator initiatives and requested a business case review for the 3 bottom-right initiatives.

**So what:** The ROI scatter transforms strategy review from a status update ('we are 40 % complete') into a portfolio management decision ('which of our investments is generating returns and which needs to change?').

## Template
Fill in Investment to Date and Benefit Realised to Date monthly. % Complete links to the Project Portfolio Input Table. ROI formula is pre-built.

- [ ] Initiative Name: [from Strategic Roadmap Input Table]
- [ ] Strategic Pillar: [link to pillar colour]
- [ ] % Complete: [link to Project Portfolio Input Table]
- [ ] Investment to Date ($K): [cumulative spend]
- [ ] Benefit Realised to Date ($K): [documented value delivered]
- [ ] Total Investment ($K): [approved total budget]
- [ ] ROI to Date %: [formula: =Benefit_Realised / Investment_to_Date × 100]

## Pitfalls
- Using projected benefits rather than realised benefits for ROI — inflated benefit projections make all initiatives look like top-right candidates. Use only documented, verified benefits (e.g., cost savings with evidence, revenue attributable to the initiative).
- Plotting initiatives before they have meaningful investment or benefit data (< 3 months of spend) — early-stage data is noise; apply a minimum-spend filter (e.g., only plot initiatives with >$100K spend).
- Not updating the chart quarterly — an ROI scatter that is updated annually shows a snapshot, not a trajectory. Quarterly updates reveal whether initiatives are moving in the right direction.
