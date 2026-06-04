---
type: concept
slug: initiative-scoring-matrix
title: Initiative Scoring Matrix
source_collection: consulting-toolkits
toolkit: supply-chain-strategy
domain: operations
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Initiative Scoring Matrix

*Category: planning · Toolkit: Supply Chain Strategy*

## What it is
A weighted multi-criteria scoring tool that evaluates each initiative in the long-list against three dimensions — strategic alignment, expected KPI impact, and implementation risk — to produce a ranked medium-list of 15–25 initiatives eligible for business-case development in Phase IV.

**Origin:** Standard in McKinsey, BCG, and Bain prioritization methodology. Applied in supply chain transformation in contexts ranging from SCOR improvement programs to digital supply chain transformations. The three-dimension structure reflects the fundamental tension in initiative selection: value, effort, and risk.

## Why it works
Initiative lists generated through brainstorming are inevitably biased — toward ideas that are technically interesting (regardless of strategic relevance), organizationally comfortable (regardless of impact), or championed by the most persuasive voice in the room. The scoring matrix depoliticizes the selection by making the evaluation criteria explicit, weighting them transparently, and requiring evidence-based scores. By assigning higher weight to KPI impact (40%) than to strategic alignment (30%) or risk (30%), the matrix prioritizes initiatives that actually move measurable outcomes — preventing 'strategic theatre' initiatives that sound important but deliver little.

## When to use
Use in Phase III Step 2 to screen the initiative long-list. Also use at mid-transformation (12–18 months) when new initiative ideas emerge and must be integrated into the existing portfolio.

## Visual
`table`

## Step-by-step tutorial
1. 1. Apply the binary pre-filter: before scoring, apply two binary questions to every initiative — (1) Does it address a confirmed capability gap from Phase II? (2) Is it technically feasible within the 3-year planning horizon? Initiatives failing either filter move to the Parking Lot without scoring.
2. 2. Score Strategic Alignment (0–10): 10 = directly closes a gap linked to a top-priority Phase I objective and advances 2+ scorecard KPIs; 5 = partially relevant to one objective; 0 = no traceable link to Phase I strategy. The scoring team must cite the specific Phase I objective for any score ≥7.
3. 3. Score KPI Impact (0–10): 10 = expected to improve a Phase II KPI by ≥10 percentage points (verified by analogous project benchmarks); 5 = 3–9pp improvement; 0 = <1pp or no measurable KPI impact. Use the Phase IV financial model structure (in simplified form) to estimate benefit magnitude.
4. 4. Score Implementation Risk (0–10 — inverted scale): 10 = very low risk (proven technology, minimal disruption, clear implementation path, no dependencies); 5 = moderate (some technology uncertainty or organizational disruption); 0 = very high risk (unproven technology, significant resistance, critical dependencies on other unstarted initiatives). Risk score = 10 minus risk level.
5. 5. Compute the weighted score: (Strategic Alignment × 0.30) + (KPI Impact × 0.40) + (Risk Score × 0.30).
6. 6. Apply the threshold: initiatives with weighted score ≥6.0 proceed to Phase IV. Scores of 5.0–5.9 are 'conditional' — they proceed only if resource capacity allows or if a Steering Committee sponsor explicitly champions them. Scores below 5.0 go to the Parking Lot.
7. 7. Challenge the results: run a cross-functional challenge session where initiative owners present their highest-scored initiatives and a devil's advocate team challenges the KPI impact score. This prevents inflated self-scoring.
8. 8. Document the medium-list: for each initiative proceeding to Phase IV, confirm the Phase III deliverable — a one-page initiative brief covering problem statement, scope, preliminary benefit hypothesis, and indicative resource requirement.

## Real-life example — General Mills
General Mills' supply chain transformation team (2019–2022) used an explicit five-criterion scoring matrix (similar to the three-criterion model above, extended with cost-to-serve impact and sustainability impact) to screen 68 initiative ideas down to a 22-initiative portfolio. The scoring process revealed a counterintuitive result: a highly publicized 'Digital Supply Chain Control Tower' initiative scored only 4.8 overall — high strategic alignment (8.5) but very low KPI impact score (3.0, because the data infrastructure needed to power it did not yet exist) and high risk score inverted to 2.0. The Control Tower was moved to the Parking Lot and replaced with two Phase I data infrastructure initiatives that scored 7.2 and 6.8 respectively — less glamorous but enabling. Three years later, the Control Tower was re-scoped and implemented on the data foundation built by the Phase I initiatives, delivering its projected benefits. The matrix prevented a technology investment that would have failed for lack of supporting infrastructure.

**So what:** The scoring matrix is most valuable when it produces counterintuitive results — when it delays the exciting initiative and prioritizes the unglamorous enabler. That is the sign it is working. Accept the score.

## Template
Apply the binary filter to all initiatives first. Score survivors on all three criteria using the guidance scales below. Compute the weighted score. Review results in a cross-functional validation session before finalizing.

- [ ] Initiative Name
- [ ] Pillar
- [ ] Binary Filter: Addresses Confirmed Gap? (Y/N)
- [ ] Binary Filter: Feasible in 3 Years? (Y/N)
- [ ] Strategic Alignment Score (0–10) + Cited Phase I Objective
- [ ] KPI Impact Score (0–10) + Estimated KPI Improvement
- [ ] Implementation Risk Score (0–10 inverted) + Key Risks Identified
- [ ] Weighted Score (= SA×0.30 + KPI×0.40 + Risk×0.30)
- [ ] Decision (Proceed / Conditional / Parking Lot)
- [ ] Rationale for Decision
- [ ] Next Step (if Proceed: one-page brief; if Conditional: sponsor confirmation needed)

## Pitfalls
- Initiative owners self-scoring: when initiative owners score their own ideas, the average KPI Impact score inflates by 2–3 points vs. cross-functional scoring. Use independent scoring teams with the initiative owner excluded from the room during scoring.
- Weighting that eliminates risk consideration: some organizations weight Risk at 0% ('we will manage whatever risk we need to take'). Without risk weighting, the matrix fails to deprioritize high-risk initiatives that may fail to deliver their expected benefits.
- Parking lot as a dustbin: initiatives in the Parking Lot should be reviewed at the 12-month roadmap refresh — market conditions change, and a Parking Lot initiative may become viable once enabling initiatives are complete.
- The threshold as a bright line rather than a guide: the 6.0 threshold is a guide, not an algorithm. A score of 5.8 for an initiative that directly addresses the CSCO's top priority should prompt a conversation, not an automatic rejection.
