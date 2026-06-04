---
type: concept
slug: prince2-stage-gate
title: PRINCE2 Stage-Gate Project Methodology
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# PRINCE2 Stage-Gate Project Methodology

*Category: delivery · Toolkit: Digital Transformation & IT Strategy*

## What it is
A structured project management methodology (Projects IN Controlled Environments) that divides projects into sequential, governed stages with formal decision gates — ensuring that fixed-requirement projects (infrastructure, compliance, data migration) are delivered with appropriate oversight and risk management.

**Origin:** PRINCE2 was developed by the UK Government's CCTA in 1989, based on PROMPTII (1975). Now maintained by AXELOS. The current version is PRINCE2 6th Edition (2017). PRINCE2 is the most widely-used project management methodology in Europe and is standard in UK government and financial services.

## Why it works
For projects with stable, well-defined requirements (infrastructure builds, regulatory compliance implementations, data migrations), the Waterfall/PRINCE2 methodology outperforms Agile: the full scope is known upfront, so staged delivery with formal sign-offs provides better governance and risk management than iterative backlog delivery. PRINCE2's stage-gate model creates natural decision points where the project sponsor confirms the business case remains valid before authorising the next stage's expenditure.

## When to use
Use in Phase III Step 5 for infrastructure, compliance, and data migration projects where requirements are stable and well-defined.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Start with the Project Brief: define scope, objectives, risks, assumptions, and a high-level business case. Obtain project sponsor approval before proceeding.
2. 2. Initiate the project: develop the full Project Initiation Document (PID) — detailed Business Case, Project Plan (milestones and resources), Risk Register, Quality Plan, Communication Plan. The PID is the contract between the project team and the sponsor.
3. 3. Define stage plans: break the project into 3–5 stages, each with a plan, a budget, and a gate review. Stages should be 4–12 weeks each — short enough to maintain control, long enough to produce meaningful deliverables.
4. 4. Execute stages with RAID management: throughout each stage, maintain the RAID Log (Risks, Assumptions, Issues, Dependencies). Review the RAID Log weekly; escalate any item that threatens the stage plan.
5. 5. Conduct stage-end gate reviews: at each gate, the Project Board (sponsor + senior supplier + senior user) reviews progress, validates the business case, and authorises the next stage. A gate review that reveals a material change in the business case should trigger a project exception report.
6. 6. Manage by exception: PRINCE2's management by exception principle means the project team only escalates to the Project Board when tolerances (time, cost, scope, quality, risk, benefits) are breached. Between escalations, the project manager manages independently.
7. 7. Close the project: produce the End Project Report (actuals vs. plan, lessons learned, open risks). Handover the Benefits Realisation responsibilities to the benefit owners.
8. 8. Apply to the right project types: PRINCE2 is appropriate when requirements are stable and well-defined (infrastructure, regulatory compliance, data migration). Do not apply to digital product development, customer experience redesign, or AI/ML projects — use Agile Scrum for these.

## Real-life example — UK Home Office (immigration system modernisation)
The UK Home Office's immigration case management system (HMRC Visa Caseworking) used PRINCE2 as the delivery methodology for its infrastructure and integration elements, while Agile was used for user-facing application development. The PRINCE2 stage-gate approach — with formal Gateway Reviews (UK Government's version of PRINCE2 gates) — caught a critical database architecture issue at Gate 2 (Design Review) that would have required a £4M rework if discovered at Gate 3 (Build & Test). The gate review, which included external technical assurance, identified that the proposed database schema could not support the query volumes required. A 6-week design revision at Gate 2 prevented an estimated 6-month delay at Gate 3.

**So what:** The PRINCE2 stage gate's greatest value is as an early detection mechanism: issues discovered at the design gate cost 10× less to fix than issues discovered at the test gate, and 100× less than issues discovered post-deployment.

## Template
Complete the Project Initiation Document for PRINCE2 projects. Conduct formal gate reviews at the end of each stage.

- [ ] PROJECT BRIEF: Project name | Objective | Scope | Out of scope | Business case summary | Risks | Assumptions | Sponsor
- [ ] STAGE PLAN: Stage 1 — [Name] | Activities | Resources | Duration | Budget | Gate review criteria
- [ ] Stage 2 — [Name] | Activities | Resources | Duration | Budget | Gate review criteria
- [ ] Stage 3 — [Name] | Activities | Resources | Duration | Budget | Gate review criteria
- [ ] RAID LOG (reviewed weekly): Risk ID | Description | Probability | Impact | Owner | Mitigation | Status
- [ ] GATE REVIEW RECORD: Stage [n] gate date | Reviewers | Decision (Proceed/Pause/Exception) | Conditions | Signature

## Pitfalls
- Applying PRINCE2 to digital product development — the stage-gate model assumes stable requirements; digital product requirements evolve with user feedback and should use Agile.
- PRINCE2 without real authority — Project Boards that rubber-stamp all gate reviews provide no governance value; the Board must be willing to pause or reject projects that fail gate criteria.
