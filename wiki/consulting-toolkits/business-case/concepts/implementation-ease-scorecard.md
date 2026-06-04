---
type: concept
slug: implementation-ease-scorecard
title: Implementation Ease Scorecard
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: assessment
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Implementation Ease Scorecard

*Category: assessment · Toolkit: Business Case*

## What it is
A four-dimension scoring tool that converts the subjective question 'how hard is this project to implement?' into a comparable, decision-ready score — enabling the prioritisation matrix to plot ease accurately alongside value.

**Origin:** A practitioner tool developed within project management and consulting practice, drawing on McKinsey's 'Ease of Implementation' axis from the classic initiative-prioritisation matrix and PMI's project risk assessment frameworks.

## Why it works
A project that is high-value but very hard to implement needs different treatment than a project that is high-value and easy to implement. Without an explicit ease score, the board default is to be optimistic about execution difficulty — the same bias that causes 65% of projects to fail. The scorecard forces a structured, multi-dimensional assessment of implementation risk before capital is committed.

## When to use
In Phase 2 (Step 2.3) as part of the project assessment; the output feeds into the Y-axis of the prioritisation matrix in Phase 3.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Rate the project on Organisational Readiness (1–5): 5 = the team has done this before, culture supports it, no major capability gap; 1 = this is a fundamentally new capability with cultural resistance.
2. Rate Technology Readiness (1–5): 5 = existing systems are fully capable, no new integrations needed; 1 = new systems must be built or acquired, high integration complexity.
3. Rate Change Management Complexity (1–5): 5 = few stakeholders, incremental change, supportive sponsors; 1 = large stakeholder group, disruptive change, key sponsors resistant.
4. Rate Regulatory / Compliance Risk (1–5): 5 = no new approvals needed, clear regulatory path; 1 = novel regulatory territory with uncertain approval timelines.
5. Compute the weighted ease score: (0.30 × Org) + (0.25 × Tech) + (0.25 × Change) + (0.20 × Reg).
6. Interpret: score > 4 = straightforward execution; 3–4 = manageable with active risk management; < 3 = high execution risk — recommend a phased approach, a pilot, or explicit de-risking actions before full-scale investment.
7. Link the ease score to the financial model: a low ease score means the contingency reserve in the financial model should be higher (typically 15–25% of capex vs 5–10% for high-ease projects).

## Real-life example — Royal Bank of Scotland (core banking system replacement, 2012)
RBS's internal business case for replacing its core banking system was evaluated against exactly these four dimensions before the project was approved. Organisational readiness scored 2/5 — the bank had not replaced core infrastructure in 30 years and lacked internal capability. Technology readiness scored 1/5 — the new system had no successful implementation at comparable scale in the UK. Change management complexity scored 2/5 — tens of thousands of employees across retail and corporate banking needed retraining. Regulatory risk scored 3/5 — the FCA was watching closely but had not objected. Weighted ease score: 2.0/5. The project was ultimately abandoned after £750M in spend and a highly publicised IT failure in 2012 — a case study in approving a high-value, very-low-ease project without a phased approach.

**So what:** An explicit ease scorecard, honestly assessed, provides an early warning that a high-value project may require a phased approach or additional de-risking before full-scale investment.

## Template
Score each dimension 1–5 with explicit rationale. Compute the weighted ease score. If any dimension scores 1 or 2, note the specific de-risking action required before full-scale investment.

- [ ] Organisational Readiness (30% weight)
- [ ]   Score (1–5): [Rating]
- [ ]   Rationale: [Evidence for the rating — specific capability gaps, cultural factors, relevant precedents]
- [ ]   If score ≤ 2, de-risking action required: [e.g. 'Hire 3 specialists with domain experience before project start']
- [ ] Technology Readiness (25% weight)
- [ ]   Score (1–5): [Rating]
- [ ]   Rationale: [Current infrastructure assessment vs requirements]
- [ ]   If score ≤ 2, de-risking action required: [e.g. 'Run a 6-week PoC with vendor X before committing full capex']
- [ ] Change Management Complexity (25% weight)
- [ ]   Score (1–5): [Rating]
- [ ]   Rationale: [Stakeholder count, disruption level, sponsor quality]
- [ ]   If score ≤ 2, de-risking action required: [e.g. 'Appoint a dedicated change management lead; run stakeholder workshops in Month 1']
- [ ] Regulatory / Compliance Risk (20% weight)
- [ ]   Score (1–5): [Rating]
- [ ]   Rationale: [Approvals needed, timeline certainty, legal exposure]
- [ ]   If score ≤ 2, de-risking action required: [e.g. 'Obtain pre-application meeting with regulator before project announcement']
- [ ] Weighted Ease Score: [(0.30 × Org) + (0.25 × Tech) + (0.25 × Change) + (0.20 × Reg)]
- [ ] Interpretation: [> 4 = straightforward; 3–4 = manageable; < 3 = recommend phased approach]

## Pitfalls
- Scoring ease optimistically to justify the project — the scorecard is only useful if honestly assessed. Challenge the team with 'what is the evidence for this score?' rather than accepting self-assessment.
- Using the ease score in isolation — it is only meaningful in comparison to other investment candidates plotted on the same prioritisation matrix.
- Not translating a low ease score into financial model adjustments — a score below 3 should add 15–25% contingency to the capex estimate and extend the payback period in the financial model.
