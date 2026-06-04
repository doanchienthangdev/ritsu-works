---
type: concept
slug: risk-assessment-matrix
title: Risk Assessment Matrix (Likelihood × Consequence Scoring)
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Assessment Matrix (Likelihood × Consequence Scoring)

*Category: analysis · Toolkit: Risk Management*

## What it is
A structured scoring system that evaluates each identified risk on two dimensions — Likelihood (probability of occurrence) and Consequence (severity of impact) — to produce a numerical Risk Score (Likelihood × Consequence) that drives heat map placement and prioritization decisions.

**Origin:** The likelihood–consequence matrix originates from engineering risk assessment (nuclear, aerospace) in the 1960s–70s, codified in US MIL-STD-882 (1969) for systems safety. Adapted for enterprise risk management through ISO 31000, COSO ERM, and the UK HM Treasury's Orange Book. The 5×5 variant is standard in consulting practice; the 3×3 variant is used for Board-level simplicity.

## Why it works
Combining likelihood and consequence into a single risk score makes two different types of risk comparable: a high-likelihood/low-consequence risk (e.g., minor operational delays) and a low-likelihood/high-consequence risk (e.g., a catastrophic product failure) score differently and require different responses. The multiplicative scoring (L × C) produces an expected-value approximation of risk exposure. The critical design decision is the consequence scoring method: taking the maximum dimension score (rather than averaging across dimensions) ensures that a risk with catastrophic impact on one dimension (e.g., regulatory licence loss) is not obscured by moderate scores on other dimensions.

## When to use
Phase 3 (Risk Assessment) for all risks in the register. Also use for rapid triage of new risks identified outside the formal cycle (e.g., a new regulatory announcement, a competitor incident). Use the 3×3 variant for Board reporting; the 5×5 for operational management.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. Define probability anchors for each of the 5 likelihood levels using percentages and time horizons (e.g., 'Level 4 (Likely) = 50–80% probability of occurrence within the next 12 months'). Use the same anchors consistently across all business units.
2. Define consequence anchors for each of the 5 levels across all relevant impact dimensions: Financial (€ amount), Operational (service disruption duration), Reputational (media/stakeholder impact), Regulatory (fine/penalty range), Strategic (% of strategic objective at risk). Write these anchors before any scoring begins.
3. Score each risk's Likelihood with the risk owner: ask 'Based on your knowledge of this area, what is the probability this risk event occurs within the next 12 months?' Record the score and the rationale.
4. Score each risk's Consequence by working through each impact dimension separately. Take the MAXIMUM score across all dimensions — not the average. Rationale: a risk that is only catastrophic on one dimension is still a catastrophic risk.
5. Calculate Inherent Risk Score = Likelihood × Consequence. This is the risk score before any controls exist.
6. Assess the effectiveness of existing controls on a 3-point scale: 1 (Ineffective — control exists but consistently fails), 2 (Partial — control works some of the time), 3 (Effective — control reliably reduces likelihood or consequence). Calculate Residual Risk Score = Inherent × (1 – (Control Effectiveness – 1)/2). For a 5-point control scale: Residual = Inherent × (1 – CE/5).
7. Run a calibration session: present 5 sample risks scored by different risk owners and discuss where scores diverge by >1 point. Agree the scoring rationale. Calibration sessions are the most effective way to ensure cross-business-unit consistency.
8. Map all risks to the heat map using residual scores. Confirm that the colour zone boundaries align with the Risk Appetite Statement quantitative thresholds.

## Real-life example — BP plc
BP's 2010 Deepwater Horizon disaster exposed fundamental failures in its risk assessment scoring. Post-incident analysis (Baker Panel Report) found that BP's risk assessment matrix had scored the 'blowout preventer failure leading to well blowout' risk at Likelihood 2 (Unlikely) × Consequence 3 (Moderate) = Score 6 (Low priority) — despite the blowout preventer being the last line of defence for a well operating at unprecedented depth. The consequence scoring had used financial impact as the primary dimension and had not applied the 'maximum dimension' rule: the Safety and Regulatory dimensions would have scored 5 (Critical), producing a High-priority risk. BP subsequently mandated a 'maximum dimension' consequence scoring rule across all its operations and added Safety as a separate non-financial consequence dimension weighted above all others.

**So what:** The 'maximum dimension' consequence scoring rule is not a technicality — it is the mechanism that prevents a catastrophic safety or regulatory risk from being buried by moderate scores on financial dimensions. BP's failure to apply this rule contributed to the Deepwater Horizon classification as 'Low priority' at the risk assessment stage.

## Template
Complete one row per risk. Score after reviewing the likelihood and consequence anchor tables. Run calibration before finalizing scores for any risk that scores 'High' on either dimension.

- [ ] Risk ID and brief description
- [ ] Likelihood Score (1–5) and anchor reference (e.g., '3 – Possible, based on 2 near-misses in prior 24 months')
- [ ] Consequence — Financial dimension (1–5) with € estimate
- [ ] Consequence — Operational dimension (1–5) with disruption duration estimate
- [ ] Consequence — Reputational dimension (1–5) with description
- [ ] Consequence — Regulatory dimension (1–5) with fine/penalty estimate
- [ ] Consequence — Strategic dimension (1–5) with objective impact description
- [ ] Consequence Score (MAX of all dimension scores)
- [ ] Inherent Risk Score (Likelihood × Consequence Score)
- [ ] Existing Control(s) and rationale for effectiveness rating
- [ ] Control Effectiveness (1=Ineffective, 2=Partial, 3=Effective)
- [ ] Residual Risk Score
- [ ] Heat map zone (Red/Amber/Green)
- [ ] Calibration note (if score was adjusted at calibration session)

## Pitfalls
- Scoring consequence by averaging across dimensions — a risk with Critical safety impact but Minor financial impact averages to Moderate. Counter: always take the maximum dimension. If the scoring convention is 'take maximum,' document it explicitly in the scoring guidance and enforce it at calibration.
- Inconsistent likelihood anchors — different risk owners using different time horizons (one scores '20% probability in 5 years' as Level 2; another scores '20% probability in 1 year' as Level 3). Counter: always specify the time horizon in the anchor definition (typically 12 months for operational risks, 3 years for strategic risks).
- Treating the risk score as precise — the product of two 5-point subjective scales is not a precise risk quantification. Counter: treat risk scores as ordinal (for ranking) rather than cardinal (for calculation). A score of 12 is not '50% more risky' than a score of 8 — it is just higher on the heat map.
