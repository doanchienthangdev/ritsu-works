---
type: concept
slug: change-readiness-assessment
title: Change Readiness Assessment (Pulse Survey)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: change-management
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Change Readiness Assessment (Pulse Survey)

*Category: change-management · Toolkit: Digital Transformation & IT Strategy*

## What it is
A recurring survey tool (typically 10 questions, monthly cadence) that measures each affected stakeholder group's readiness to adopt a digital change on five ADKAR dimensions, producing a readiness score plotted against a target curve aligned to the deployment calendar.

**Origin:** Derived from the Prosci ADKAR survey and organisational readiness assessment practice in OGC MSP. Widely adapted by McKinsey, Deloitte, and Accenture change management practices from the mid-2000s.

## Why it works
Change readiness is a lagging indicator if measured only at go-live; as a leading indicator (measured monthly), it provides 4–8 weeks of warning that a group is not ready, enabling corrective action before the go-live gate decision.

## When to use
Use throughout Phase IV from 6 months before first go-live. Gate all go-live decisions on the readiness score.

## Visual
`chart`

## Step-by-step tutorial
1. 1. Design the pulse survey: 10 questions covering the 5 ADKAR stages (2 per stage), rated 1–5.
2. 2. Define the survey sample: 15–20% of each affected cohort, representative by seniority and function.
3. 3. Administer monthly from 6 months before go-live through to 3 months post-go-live.
4. 4. Calculate the readiness score per cohort per ADKAR stage (average of 2 questions per stage).
5. 5. Plot on the readiness chart: actual vs. target curve. The target curve should reach 3.5/5 overall readiness 4 weeks before go-live.
6. 6. Identify bottleneck stages (the lowest-scoring stage per cohort) — these drive the targeted interventions.
7. 7. Escalate to Programme Board: any cohort below 3.0/5 at 4 weeks before go-live triggers an escalation and a go/no-go discussion.
8. 8. Post-go-live: continue for 3 months to track that reinforcement is sustaining the change.

## Real-life example — Unilever
Unilever's SAP S/4HANA rollout used monthly change readiness surveys across 85 countries. The surveys identified that manufacturing plant managers in Asia-Pacific were at Awareness level 2.8/5 at 8 weeks before go-live (target: 4.0). A targeted regional CEO communication and a site visit from the global programme sponsor moved awareness to 4.2/5 within 3 weeks. Without the monthly survey, the issue would have been discovered at go-live.

**So what:** The change readiness pulse survey's value is the early warning it provides. Eight weeks of warning enables targeted intervention; a post-go-live survey enables only damage control.

## Template
Administer monthly. Calculate ADKAR scores per cohort. Plot vs. target curve. Escalate cohorts below threshold.

- [ ] SURVEY MONTH: [Date] | Cohort: [Name] | Sample size: [n]
- [ ] A score (average of 2 awareness questions): [X/5]
- [ ] D score (desire): [X/5] | K score (knowledge): [X/5] | A score (ability): [X/5] | R score (reinforcement): [X/5]
- [ ] Overall readiness score: [X/5] | Target at this stage: [X/5] | RAG: [R/A/G]
- [ ] Bottleneck stage: [ADKAR stage with lowest score]
- [ ] Corrective actions triggered: [Fill in]

## Pitfalls
- Survey fatigue — keep to 10 questions maximum; use digital tools for quick completion.
- Using readiness scores as compliance metrics — teams coached to score highly without genuinely improving readiness.
