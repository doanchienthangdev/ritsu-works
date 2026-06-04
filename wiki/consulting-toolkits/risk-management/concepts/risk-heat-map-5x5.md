---
type: concept
slug: risk-heat-map-5x5
title: 5×5 Risk Heat Map (Operational)
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# 5×5 Risk Heat Map (Operational)

*Category: analysis · Toolkit: Risk Management*

## What it is
A 5×5 matrix plotting all risks by Likelihood (5-level scale) against Consequence (5-level scale), colour-coded Red/Amber/Green, providing 25 differentiated cells for granular risk prioritization in operational risk management. Pairs with the 3×3 Board version.

**Origin:** Developed from military and nuclear engineering risk assessment practice (US MIL-STD-882, 1969). The 5×5 variant became standard in enterprise risk management practice through ISO 31000, COSO ERM, and PMI's Practice Standard for Risk Management (2009). Adopted by McKinsey, Deloitte, and Accenture as the default operational risk heat map.

## Why it works
The 5×5 matrix is essential when a risk portfolio is large enough that a 3×3 would force risks into the same cell that deserve different management responses. A 5×5 produces 25 cells and 75 possible scores (L × C combinations), providing sufficient differentiation to identify which risks in the Amber zone are 'high Amber' (close to Red) versus 'low Amber' (close to Green). The Red zone in a 5×5 is typically defined as scores ≥15 (out of 25), capturing all combinations where both L and C are ≥ 3, or where one is 5 and the other is ≥ 3. This aligns to the intuition that 'almost certain' occurrence of even a 'moderate' consequence risk deserves priority management.

## When to use
Phase 4 (Risk Prioritization) for operational risk committees, the CRO's risk team, and program risk management. Use alongside the 3×3 Board heat map — same risks, two different levels of granularity.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. Build the 5×5 grid in Excel or PowerPoint with 5 columns (likelihood levels) and 5 rows (consequence levels). Pre-populate each cell with the product score (1×1=1 to 5×5=25).
2. Colour-code cells: Score 15–25 = Red; 8–14 = Amber; 1–7 = Green. Validate that the colour boundary thresholds match the Risk Appetite Statement quantitative thresholds. If the RAS says 'High = financial loss > €5M per event,' trace which heat map score corresponds to '> €5M' and ensure that score falls in the Red zone.
3. After the risk assessment phase, plot each risk's residual risk score onto the heat map. Use the Risk ID label (e.g., OPS-007) as the label in the cell. Stack multiple risks in the same cell vertically.
4. Add a 'Top 10 by residual score' ranked list beside the heat map for those who prefer a list to a visual.
5. Draw a 'critical risk boundary' line — a step function from the top-left to bottom-right of the Red zone. Risks touching or above this line have the highest urgency.
6. In Excel, use conditional formatting to automatically colour-code the risk register's 'Residual Risk Score' column using the same colour rules as the heat map. This creates a live heat map in the register itself.
7. At each risk committee meeting, review only the risks in the Red zone and the risks that have moved between zones since the last meeting. This focuses attention where it belongs.

## Real-life example — Amazon Web Services (AWS)
AWS uses a 5×5 operational risk matrix for its service reliability program, mapping risks such as 'cascade failure in a single availability zone due to software bug' (Likelihood 3 × Consequence 5 = 15, Red) and 'DDoS attack overwhelming network capacity' (Likelihood 4 × Consequence 4 = 16, Red). The 5×5 granularity allows AWS to differentiate between 'Red' risks that score 25 (the worst) and those that score 15 (the threshold) — a differentiation that would be invisible in a 3×3 where all are simply 'High'. The top-right 2×2 cells of the 5×5 (scores 20–25) trigger a mandatory immediate response protocol; scores 15–19 trigger a 30-day mitigation plan requirement.

**So what:** The 5×5 enables meaningful prioritization within the Red zone — not all Red risks are equal. A risk scoring 25 requires immediate CEO escalation; a risk scoring 15 requires a 30-day plan. The 3×3 cannot make this distinction.

## Template
Plot all risks from the risk register (using residual scores) on the 5×5 grid. Use the Excel conditional formatting template to auto-colour the grid. Review at each risk committee meeting.

- [ ] Risk ID and brief name for each risk plotted
- [ ] Residual Likelihood Score (1–5) with anchor reference
- [ ] Residual Consequence Score (1–5) with anchor reference
- [ ] Residual Risk Score (product) and cell position
- [ ] Zone (Red/Amber/Green) and required response timeline (Red = 30 days; Amber = 90 days; Green = annual review)
- [ ] Change vs. prior period: score moved by how many points? Direction: improving or deteriorating?
- [ ] For risks moved from Amber to Red: immediate notification to CRO (document date and method)
- [ ] For risks moved from Red to Amber: confirmation that mitigation is validated as effective

## Pitfalls
- Treating the 5×5 score as an expected loss calculation — L × C is an ordinal ranking tool, not a probabilistic expected value formula. Counter: never express the risk score as a 'probability-weighted loss figure.' Use Monte Carlo simulation or scenario analysis if quantitative expected loss is needed.
- Anchoring all likelihood scores to the same time horizon — strategic risks (3–5 year horizon) and operational risks (12-month horizon) should not use the same probability anchors. Counter: define separate likelihood scales for strategic and operational risk registers, or adjust scores explicitly for time horizon.
- Using bubble size to indicate something not defined in the legend — some heat maps use bubble size to indicate 'number of impacted objectives' without explaining it. Counter: every visual element on the heat map (size, shape, colour, label) must have an explicit legend.
