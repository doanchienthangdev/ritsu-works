---
type: concept
slug: programme-governance-model
title: Data Programme Governance Model
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Programme Governance Model

*Category: delivery · Toolkit: Data Analytics & AI Strategy*

## What it is
A formal governance structure for multi-year data and AI programmes — defining the Steering Committee composition and cadence, the escalation path for issues and scope changes, and the KPI review framework that keeps the programme accountable to its business case.

**Origin:** Standard programme governance from PRINCE2 (UK government, 1989) and PMI Programme Management Standard (2003). Applied to data transformation programmes by Deloitte and KPMG consulting practices, which documented that the #1 cause of data programme failure is inadequate executive governance (not technical failure).

## Why it works
A data programme without formal governance drifts: scope creeps, business sponsors disengage, and the data team optimises for technical elegance rather than business value. Formal governance creates accountability — the Steering Committee is accountable for the business outcomes, the CDO is accountable for the programme delivery, and the business sponsors are accountable for adoption and value realisation. Without all three, the accountability triangle collapses and the programme becomes a technology project that nobody owns.

## When to use
In Phase 5 (Step 3: establish programme governance) before any use-case delivery begins. Maintain throughout the programme.

## Visual
`process-flow`

## Step-by-step tutorial
1. Establish the Steering Committee before the programme starts, not after: membership = CDO (chair), CFO, all business sponsors whose use cases are in the portfolio, CTO. Monthly meeting cadence; 90-minute agenda: 30 min programme status (RAG), 30 min business-value update (actual vs business case), 30 min decisions required.
2. Define the escalation path for issues: any issue that cannot be resolved at the use-case team level within 5 business days escalates to the PMO; any issue requiring a funding change, scope change, or business sponsor decision escalates to the Steering Committee agenda.
3. Define the change-control process: scope changes with no cost impact (feature changes within the approved use case) are approved by the CDO; scope changes with <10% cost impact are approved by the CDO + business sponsor; scope changes with >10% cost impact require Steering Committee approval.
4. Implement a programme dashboard updated weekly: one page covering project RAG status (Red/Amber/Green for each use case), milestone delivery vs plan, budget vs actual (cumulative), value realised vs business case (cumulative), and top 3 risks with mitigation status.
5. Conduct a formal mid-programme review at Month 6 (end of Wave 1): have the Wave 1 use cases delivered their promised value? Is the business case for Wave 2 still valid? The mid-programme review is the go/no-go decision point for Wave 2 investment.
6. Define the programme closure protocol: at the end of the formal programme, transfer ownership of ongoing use cases to business sponsors; maintain the CDO function as an operational role (not a programme role); conduct a formal lessons-learnt review.

## Real-life example — BNP Paribas
BNP Paribas's global data transformation programme established a Programme Steering Committee chaired by the Group CDO with representation from all major business lines (Retail Banking, Corporate Banking, Asset Management) and the CFO. The Committee met monthly and had decision authority up to €5M per session. The governance model survived two CDO transitions without programme disruption because the business sponsors were accountable (not just informed) members of the Steering Committee. The programme maintained >85% on-time delivery across 24 months — attributed primarily to the clarity of the escalation path and the Steering Committee's rapid decision velocity.

**So what:** Programme governance is the difference between a data programme that delivers and one that drifts. The Steering Committee's most important function is not oversight — it is decision velocity. Decisions that take 2 weeks get resolved; decisions that take 2 months kill programmes.

## Template
Complete the governance structure before the programme starts. Every committee and team must have a named chair and an explicit decision authority level.

- [ ] Steering Committee: chair / members (name + role) / meeting cadence / decision authority level
- [ ] Programme Management Office: PMO lead / programme manager / reporting cadence / dashboard owner
- [ ] Escalation path: use-case team → PMO (trigger and timeline) → Steering Committee (trigger and timeline)
- [ ] Change-control thresholds: CDO-only authority / CDO + sponsor authority / Steering Committee authority
- [ ] Programme dashboard: who updates it / what frequency / key metrics tracked
- [ ] Mid-programme review: scheduled date / criteria for Wave 2 go/no-go
- [ ] Programme closure protocol: ownership handover / lessons-learnt review date

## Pitfalls
- Steering Committee that meets quarterly instead of monthly: counter: a data programme can go off the rails in 2 months. Monthly reviews with decision authority are required; quarterly reviews are too slow to course-correct.
- Business sponsors who are 'informed' rather than 'accountable': counter: business sponsors must be accountable for adoption and value realisation within their function. An informed sponsor who disengages when the use case goes live is the most common cause of non-adoption.
- No formal escalation path: counter: without a defined escalation path, issues fester until they become crises. Define the escalation trigger (issue unresolved in 5 days) and the escalation target (the Steering Committee agenda for the next monthly meeting) explicitly.
