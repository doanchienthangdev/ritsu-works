---
type: concept
slug: risk-register
title: Risk Register (Supply Chain Transformation)
source_collection: consulting-toolkits
toolkit: supply-chain-strategy
domain: operations
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Register (Supply Chain Transformation)

*Category: planning · Toolkit: Supply Chain Strategy*

## What it is
A structured log of all identified risks to a supply chain transformation initiative, each rated on likelihood and impact, with an assigned risk owner, mitigation actions, and a residual risk assessment after mitigation. Maintained throughout the Phase IV–V implementation lifecycle.

**Origin:** Standard in PMI PMBOK risk management (Project Management Body of Knowledge, 1987 onwards), Prince2 (1989), and ISO 31000 Risk Management standard (2009). Supply chain-specific application synthesizes these frameworks with SCOR risk management best practices.

## Why it works
Supply chain transformations fail for identifiable, often predictable reasons — technology integration failure, change resistance, supplier non-cooperation, budget overrun, and project dependency conflicts are the most common. The risk register forces these failure modes to be named, quantified, owned, and actively managed before they materialize. A risk that is named and has a mitigation plan is not eliminated — but its probability and impact are reduced. The combination of likelihood and impact scoring (risk matrix) prioritizes which risks warrant active mitigation investment vs. passive monitoring.

## When to use
Initiate in Phase IV for each approved initiative. Maintain actively through Phase V implementation. Archive with lessons learned after each initiative closes.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. 1. Identify risks: for each initiative, run a structured risk brainstorm using four risk category lenses — Execution Risk (can we deliver this technically and on time?), Organizational Risk (will people adopt and sustain the change?), Dependency Risk (do we rely on other initiatives or decisions not yet made?), External Risk (supplier behaviour, regulatory change, market dynamics).
2. 2. For each identified risk, write a risk statement in the format: 'The risk that [event] occurs, causing [impact on initiative outcome].' This format prevents vague risk statements like 'technology risk' — it forces specificity: 'The risk that the ERP integration with the TMS fails during UAT, causing a 3-month delay to the logistics cost savings and a $4M budget overrun.'
3. 3. Score likelihood (1–5): 1 = Rare (<10% probability); 2 = Unlikely (10–30%); 3 = Possible (30–50%); 4 = Likely (50–70%); 5 = Almost Certain (>70%).
4. 4. Score impact (1–5): 1 = Negligible (<5% impact on initiative NPV); 2 = Minor (5–15% NPV impact); 3 = Moderate (15–30% NPV impact); 4 = Major (30–50% NPV impact); 5 = Critical (>50% NPV impact or initiative failure).
5. 5. Compute risk score: Likelihood × Impact. Plot on the risk matrix to identify the risk zone (Low/Medium/High/Critical).
6. 6. Assign a risk owner: each risk must have one named owner responsible for monitoring and executing the mitigation plan. The owner is accountable for updating the risk score monthly.
7. 7. Define the mitigation plan: for each Medium/High/Critical risk, document: the specific mitigation actions, the party responsible for each action, the timeline, and the estimated cost of the mitigation. The mitigation should reduce either likelihood or impact (or both).
8. 8. Calculate the residual risk score: after the mitigation plan is implemented, what is the new likelihood × impact? The residual risk score is the measure of the remaining exposure.
9. 9. Review the risk register at every PMO meeting (weekly) and Steering Committee meeting (monthly). Risks that materialize become issues and move to a separate issue log with a resolution owner and deadline.

## Real-life example — Procter & Gamble
P&G's 'Supply Chain 2020' transformation risk register included a critical risk: 'The risk that key ERP data quality issues in the demand planning module are not resolved before the AI demand-sensing tool is deployed, causing the AI model to produce unreliable forecasts and damaging trust in the new system.' Likelihood was scored 4 (Likely — data quality issues had already been identified). Impact was scored 5 (Critical — the AI demand-sensing initiative was the centerpiece of the D&SP pillar strategy, and failed adoption would undermine the entire transformation). Risk score: 20 (Critical). The mitigation plan required a 6-month data quality remediation workstream as a prerequisite to AI deployment, adding $3M and 6 months to the initiative timeline. This delay was accepted in Phase IV — the alternative (deploying AI on poor data and eroding trust in the system) would have cost far more in both money and organizational confidence. By year 3, the AI demand-sensing tool was running on clean data and delivered 94% of its projected benefits.

**So what:** The risk register justifies delay or scope change decisions that would otherwise be politically uncomfortable. Having a Critical risk score of 20 for a data quality issue makes the case for a $3M data remediation prerequisite far more compelling than 'we think the data might not be good enough.'

## Template
Complete one row per identified risk. Score each risk on both pre-mitigation and post-mitigation (residual) likelihood and impact. Review the register weekly at the PMO level and escalate Critical risks to the Steering Committee immediately.

- [ ] Risk ID
- [ ] Initiative Name
- [ ] Risk Statement (format: 'The risk that [event], causing [impact]')
- [ ] Risk Category (Execution / Organizational / Dependency / External)
- [ ] Pre-Mitigation Likelihood (1–5)
- [ ] Pre-Mitigation Impact (1–5)
- [ ] Pre-Mitigation Risk Score (L×I)
- [ ] Risk Zone (Low / Medium / High / Critical)
- [ ] Mitigation Actions (specific — what, by whom, by when)
- [ ] Mitigation Cost ($)
- [ ] Post-Mitigation Likelihood (1–5)
- [ ] Post-Mitigation Impact (1–5)
- [ ] Residual Risk Score
- [ ] Risk Owner (named individual)
- [ ] Status (Open / Mitigated / Materialized — became an Issue / Closed)
- [ ] Last Review Date

## Pitfalls
- Risks without owners: a risk without a named owner is a statement of anxiety, not a risk management action. Every risk must have one accountable owner who updates its status monthly.
- Scoring bias toward Low: teams systematically underestimate risk likelihood to avoid escalation. Require explicit probability estimates (percentages) and calibrate against historical project performance in similar contexts.
- Conflating risks with issues: a risk is something that might happen; an issue is something that has happened. Maintain separate logs — issues require immediate resolution owners and deadlines, not just monitoring.
- Failing to review the register: a risk register updated at project initiation and never touched again is organizational compliance theatre. The register must be a living document reviewed at every PMO meeting.
