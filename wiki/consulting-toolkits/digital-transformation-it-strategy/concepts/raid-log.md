---
type: concept
slug: raid-log
title: RAID Log (Risks, Assumptions, Issues, Dependencies)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# RAID Log (Risks, Assumptions, Issues, Dependencies)

*Category: governance · Toolkit: Digital Transformation & IT Strategy*

## What it is
A structured register that captures and tracks all Risks (potential future problems), Assumptions (things assumed to be true without full verification), Issues (current problems), and Dependencies (external factors the project relies on) throughout the programme lifecycle.

**Origin:** Standard programme management tool; integral to PRINCE2 risk management and OGC MSP. The RAID acronym has been used in UK programme management since the 1990s. Widely adopted in McKinsey, PwC, KPMG, and Deloitte programme delivery.

## Why it works
Risks that are not logged are not managed. The RAID Log provides a structured mechanism for capturing all known threats and uncertainties, assigning ownership, and tracking mitigation progress. The key discipline is weekly review: a RAID Log that is completed at programme start and never reviewed provides no value — risks escalate unnoticed.

## When to use
Use throughout Phase III and all other delivery phases. Establish at programme initiation (Phase II); review weekly throughout delivery; close at programme evaluation (Phase III Step 7).

## Visual
`table`

## Step-by-step tutorial
1. 1. Establish the RAID Log at programme initiation: use a shared tool (Confluence, SharePoint, Jira) accessible to all programme team members.
2. 2. Populate Risks: for each work package, brainstorm all risk scenarios. Score Probability (H/M/L) and Impact (H/M/L). Risk Score = Probability × Impact (H×H = Red, M×M = Amber, L×L = Green).
3. 3. Populate Assumptions: list all assumptions embedded in the programme plan (e.g., 'The supplier will deliver the integration API by Month 3'). For each, define a validation plan.
4. 4. Establish weekly RAID review: the PMO reviews all RAID items weekly. New items are added; closed items are archived.
5. 5. Escalate RED risks: any risk scored Red (H×H) is escalated to the Programme Steering Committee within 2 working days.
6. 6. Convert assumptions to risks: any assumption that is not validated by its due date becomes a risk.
7. 7. Track issues to resolution: every issue must have an owner and a target resolution date. Issues not resolved by target date are escalated.
8. 8. Report RAID summary in governance packs: the Steering Committee pack includes a RAID summary (counts by category and severity, and a highlight of the top 3 risks).

## Real-life example — Heathrow Airport (Terminal 5 project — historic)
The Heathrow Terminal 5 project (1999–2008, £4.3B) maintained a comprehensive RAID Log as part of its programme management. The project's risk log captured the baggage system integration risk as an amber risk (probability medium, impact high) from 2006. However, the mitigation plan (a 24-hour rehearsal of the full baggage process before go-live) was deprioritised due to schedule pressure. When Terminal 5 opened in March 2008, the un-rehearsed baggage system failed on Day 1, causing the cancellation of 500 flights. The RAID Log had identified the risk; the mitigation was not executed. The lesson: a risk on the RAID Log without a verified, executed mitigation is not a managed risk.

**So what:** The RAID Log's purpose is not documentation — it is management. A risk on the log with an unexecuted mitigation is a warning sign that requires escalation. The weekly review and the PMO's challenge function ('Is the mitigation actually being implemented?') are the tools that make the RAID Log effective.

## Template
Complete and review weekly. Escalate Red risks within 2 working days. Convert unvalidated assumptions to risks on their validation due date.

- [ ] RISKS: ID | Description | Probability (H/M/L) | Impact (H/M/L) | Score | Owner | Mitigation plan | Mitigation status (Not started/In progress/Complete) | Review date
- [ ] ASSUMPTIONS: ID | Assumption statement | Evidence basis | Validation plan | Validation due date | Owner | Status (Validated/Assumed/Escalated to Risk)
- [ ] ISSUES: ID | Description | Date raised | Priority (1–4) | Owner | Resolution plan | Target date | Status (Open/In progress/Closed)
- [ ] DEPENDENCIES: ID | Description | Type (Internal/External) | Dependency owner | Due date | Status (On track/At risk/Missed)

## Pitfalls
- RAID Log as documentation exercise — a RAID Log that is not reviewed weekly adds bureaucracy without risk management value.
- Risk scores without probability × impact discipline — subjective 'High' risk ratings without a defined probability and impact scoring scale are inconsistent and unmanagebable.
