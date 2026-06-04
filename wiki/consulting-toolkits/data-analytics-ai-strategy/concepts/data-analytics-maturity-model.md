---
type: concept
slug: data-analytics-maturity-model
title: Data & Analytics Maturity Model
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: assessment
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data & Analytics Maturity Model

*Category: assessment · Toolkit: Data Analytics & AI Strategy*

## What it is
A five-level benchmarking model that scores an organisation's data and analytics capability across six dimensions, producing a radar chart of current vs target state that drives prioritisation of the strategy.

**Origin:** Synthesised from Gartner's IT Maturity Model (2008), TDWI's Analytics Maturity Model (2012), and Carnegie Mellon's CMMI framework — all converge on a five-stage progression from ad-hoc to transformational.

## Why it works
You cannot design a strategy without knowing where you are. The model provides a common language across business and IT leaders, surfaces dimension-level gaps that matter most, and creates a measurable baseline so progress can be tracked. The five levels encode the empirical observation that organisations follow a predictable sequence: they must first make data reliable (Foundational) before they can make it useful (Managed) before they can make it predictive (Advanced) before they can transform with it (Transformational). Skipping levels is possible but unstable — organisations that attempt AI (Level 4) without governance (Level 2) produce wrong predictions at scale.

## When to use
At the start of Phase 1 (before writing any strategy) and annually in the Phase 5 strategy review. Also use when a new CDO or CTO joins and needs an honest baseline.

## Visual
`staircase`

## Step-by-step tutorial
1. Schedule a 2-hour self-assessment workshop with 15–20 data and business leaders (mix of CDO, CIO, business unit heads, analytics team).
2. For each of the 6 dimensions, ask the group to score the organisation 1–5. Require a named evidence artefact for every score above 3 (e.g., 'our data catalogue covers 80% of data assets' for a Pillar 1 score of 4).
3. Calculate the average score per dimension; plot the radar chart of current vs 3-year target.
4. Identify the 2–3 dimensions with the largest gaps between current and target — these are the strategy's structural priorities.
5. Validate scores with examples: for each contested score, the group names a concrete artefact; if none exists, the score drops by 1.
6. Rerun the assessment annually at the strategy review (Phase 5, Step 3) to track progress against baseline.

## Real-life example — JPMorgan Chase
JPMorgan's multi-year data transformation moved from Level 2 (fragmented legacy systems, 100+ siloed databases, inconsistent KPI definitions) to Level 4–5: they built a cloud-native data platform on AWS, appointed Chief Data Officers for each major business line, deployed ML models for fraud detection saving ~$150M annually, and required data-literacy certification for 50,000 employees. The maturity model was used annually by their CDO office to track progress across dimensions and justify budget requests to the board.

**So what:** A maturity model makes the multi-year journey legible and creates a shared language between the CDO and the board — turning 'we're improving data quality' into 'we moved from 2.1 to 3.4 on the maturity radar, on track for the 3.8 target that unlocks the AI use-case portfolio'.

## Template
Score each dimension 1–5 with a named evidence artefact. Calculate the gap to target. Prioritise the widest-gap dimensions as structural priorities in the strategy.

- [ ] Data Governance (1–5): current score / target / evidence artefact / top gap
- [ ] Analytics Capability (1–5): current score / target / evidence artefact / top gap
- [ ] Data Platform (1–5): current score / target / evidence artefact / top gap
- [ ] AI/ML Capability (1–5): current score / target / evidence artefact / top gap
- [ ] Data Culture (1–5): current score / target / evidence artefact / top gap
- [ ] Value Measurement (1–5): current score / target / evidence artefact / top gap
- [ ] Overall weighted score: current / target
- [ ] Top 3 priority dimensions to close
- [ ] Assessment date and next review date

## Pitfalls
- Self-assessment inflation: teams score themselves 4–5 without evidence. Counter: require a named, verifiable artefact for every score above 3; if none exists, score drops by 1.
- Treating Level 5 as the universal target: counter: calibrate the target to what the strategic priorities actually require — a regional retailer needs Level 3–4, not Level 5.
- Running the assessment with only the data team: counter: business leaders must co-assess or the scores reflect the data team's self-perception, not the organisation's reality.
