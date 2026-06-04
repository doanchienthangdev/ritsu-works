---
type: concept
slug: risk-register
title: Risk Register
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Register

*Category: analysis · Toolkit: Risk Management*

## What it is
The central operational document of any risk management system — a structured log that captures every identified risk with its assessment scores, mitigation actions, ownership, and status. Exists in two forms: a simplified PowerPoint executive version (top 10–15 risks) and a comprehensive Excel master log (full risk inventory).

**Origin:** Risk registers have been used in project management since the 1970s (PMI, US Department of Defense), but their enterprise-wide application became standard practice with ISO 31000 (2009) and the proliferation of ERM frameworks post-Enron (2001) and the 2008 financial crisis. The dual-format (executive PPT + operational Excel) convention originates from consulting practice at McKinsey and Deloitte.

## Why it works
The risk register is the system of record that makes risk management auditable, consistent, and traceable. Without a register, risk management is a series of conversations with no institutional memory. The cause–event–consequence risk description format ('Risk that [cause] leads to [event], resulting in [consequence]') is the critical discipline: it separates what might happen (the risk event) from why it might happen (the cause) and what the damage would be (the consequence). This three-part structure enables targeted mitigation: address the cause to reduce likelihood; address the consequence dimension to reduce impact; address the event probability to reduce inherent risk.

## When to use
Permanently — from the first risk identification workshop through to the end of the organization's risk management program. The register is the backbone of every other framework in this toolkit.

## Visual
`table`

## Step-by-step tutorial
1. Establish the register structure before the first identification workshop — populate the field headers and define the scoring anchors so all entries from day one are consistent.
2. Write every risk description in the format: 'Risk that [cause/trigger] leads to [event], resulting in [consequence affecting specific strategic objective].' Reject any risk description that uses the format 'Risk of [thing]' — this conflates cause, event, and consequence.
3. Assign a unique Risk ID using the taxonomy prefix + sequential number (e.g., OPS-007 for the 7th operational risk). This makes category visible from the ID alone.
4. Assign a single named risk owner per risk — not a team, not a committee. The owner is responsible and accountable for the mitigation actions and for updating the register entry at each review cycle.
5. Score likelihood and consequence per the defined anchors (from the risk assessment matrix). Record the control description before scoring residual risk — the control description is what justifies the gap between inherent and residual scores.
6. Keep two versions: the Excel master (full fields, all risks, operational use) and the PowerPoint executive version (top 10–15 risks, simplified fields, Board reporting). Automate the count calculations in Excel using COUNTIF formulae keyed to the Residual Risk Score field.
7. Update the register at every risk committee meeting. Any risk with a Residual Risk Score that has worsened since the last review must be discussed at the meeting — put it first on the agenda.
8. Archive closed risks in a separate 'Closed Risks' tab/sheet — never delete them. The historical record is required for audit, lessons-learned, and pattern analysis.

## Real-life example — Volkswagen AG
Post-Dieselgate (2015), Volkswagen rebuilt its enterprise risk register with a specific focus on compliance and reputational risk categories. The rebuilt register introduced the cause–event–consequence description format for the first time, which revealed that the prior register had been describing risks as events only ('Regulatory investigation risk') without capturing the underlying causes (inadequate emissions testing culture, incentive misalignment between engineering and compliance) that a mitigation plan could address. The new register required that each compliance risk description explicitly name the cause, enabling root-cause mitigation rather than event-response mitigation. VW also introduced mandatory cross-functional validation of all compliance risks — no compliance risk could be scored by the compliance team alone; it required sign-off from the relevant business unit leader.

**So what:** The cause–event–consequence description format is not semantic pedantry — it is the mechanism that links the risk to its root cause, enabling targeted mitigation. VW's prior 'event-only' descriptions were the symptom of a risk register that documented outcomes but could not drive prevention.

## Template
Use this template to structure the Excel risk register. Create one row per risk. Color-code the Residual Risk Score column: Red ≥ 15 (5×5) or ≥ 7 (3×3); Amber 8–14 (5×5) or 4–6 (3×3); Green ≤ 7 (5×5) or ≤ 3 (3×3).

- [ ] Risk ID (taxonomy prefix + sequential number)
- [ ] Risk Description: 'Risk that [cause] leads to [event], resulting in [consequence]'
- [ ] Risk Category (from taxonomy)
- [ ] Risk Owner (single named individual, title)
- [ ] Date Identified (YYYY-MM-DD)
- [ ] Linked Strategic Objective(s)
- [ ] Likelihood Score (1–5, with anchor reference)
- [ ] Consequence Score (1–5, maximum dimension, with anchor reference)
- [ ] Inherent Risk Score (Likelihood × Consequence, auto-calculated)
- [ ] Existing Control(s) Description
- [ ] Control Effectiveness (1=Ineffective, 2=Partial, 3=Effective)
- [ ] Residual Risk Score (formula: Inherent × (1 – control_eff/3))
- [ ] Priority Tier (Red/Amber/Green from heat map thresholds)
- [ ] Response Option (Tolerate / Treat / Transfer / Terminate)
- [ ] Mitigation Action(s) — SMART format
- [ ] Action Owner(s) (named individual per action)
- [ ] Action Target Date(s)
- [ ] Action Status (Not Started / In Progress / Complete / Overdue)
- [ ] Target Residual Score Post-Mitigation
- [ ] Risk Status (Open / Monitoring / Closed)
- [ ] Closure Date and Reason (if closed)
- [ ] Last Review Date
- [ ] Comments / Notes

## Pitfalls
- Confusing cause, event, and consequence in the risk description — 'Risk of a cyberattack' describes the event but tells you nothing about the cause (unpatched systems? phishing?) or the consequence (data loss? operational outage? regulatory fine?). Counter: enforce the cause–event–consequence format with concrete examples in the training session before the first workshop.
- Risk register maintained by the risk function, not by risk owners — when risk owners don't update their own entries, the register becomes stale and loses credibility. Counter: make register update a mandatory pre-requisite for any risk owner to present at the risk committee.
- Single-format register (either too detailed for Board or too summary for operations) — a Board-level register with 5 fields is useless for mitigation tracking; a 25-field Excel with 150 risks is unusable in a Board paper. Counter: maintain both formats from day one.
