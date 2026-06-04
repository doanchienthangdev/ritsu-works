---
type: concept
slug: issue-log
title: Issue Log
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Issue Log

*Category: analysis · Toolkit: Risk Management*

## What it is
The operational document that tracks all risks that have materialized into active problems — from the moment of materialization through containment, investigation, remediation, and formal closure. Maintained in parallel with the risk register and reported to the same governance bodies.

**Origin:** Issue management as a formal discipline originates from project management practice (PMI PMBOK, IEEE software engineering standards). Enterprise-level issue logs — distinct from risk registers — became standard in risk management practice post-2000, formalized in ISO 31000 as the output of the risk monitoring and review process.

## Why it works
A risk that materializes becomes categorically different from a risk that is merely identified and assessed. It demands immediate action, a clear incident response chain, and a root-cause investigation. Keeping materialized risks in the risk register alongside future risks conflates two different management processes: proactive risk management and reactive incident response. The issue log is the instrument of incident response. Separating them allows the risk register to remain focused on future risk management while the issue log drives the urgent response to present problems. The feedback loop — lessons from closed issues re-entering the risk register as new or updated risks — closes the ISO 31000 improvement cycle.

## When to use
Phase 6 (Risk Closure and Issue Management). Activated whenever a risk from the register materializes. Also use for incidents or problems that arise without prior risk identification — these are the risks the identification process missed, and they must be added to the register after the issue is resolved.

## Visual
`process-flow`

## Step-by-step tutorial
1. Create the issue log as a separate document from the risk register — typically a separate Excel tab or sheet, mirroring the register structure but with issue-specific fields replacing the assessment and mitigation fields.
2. Define the escalation levels: Level 1 (Managed) = issue owner can resolve within their authority; Level 2 (Escalated) = exceeds issue owner's authority, requires senior sponsor; Level 3 (Critical) = Board/CEO notification required within 24 hours.
3. For each new issue entry: populate the source Risk ID (linking the issue back to the risk that materialized), a description (what happened, when, and the immediate business impact), the quantified financial impact, and the issue owner.
4. Implement the containment step within 4 hours of issue identification for Level 2+ issues: the goal is to stop the bleeding, not to fix the root cause. Document containment actions in the issue log.
5. Run a structured root cause analysis within 48–72 hours: use the '5 Whys' technique (ask 'Why?' five times for each proximate cause until the root cause is reached). Document the root cause in the issue log.
6. Design remediation actions to address the root cause, not just the symptom. Assign SMART actions with owners and dates. These should be more rigorous and permanent than the containment actions.
7. Close the issue only when the remediation is validated as effective — not when the actions are complete. Validation requires observation of at least one similar situation handled correctly under the new controls.
8. Run a 30-minute lessons-learned review within 5 business days of issue closure. Feed outputs into the risk register: update existing risks that the issue reveals were scored incorrectly; add new risks surfaced by the root cause analysis.

## Real-life example — Boeing (737 MAX)
The Boeing 737 MAX grounding (2019) represents a catastrophic failure of the risk-to-issue escalation process. The Maneuvering Characteristics Augmentation System (MCAS) software issue had been identified internally as a risk but was managed within the product certification process rather than escalated to an enterprise risk level. When Lion Air Flight 610 crashed in October 2018, the risk materialized into an issue — but the issue log response (the FAA and Boeing's internal review) failed to apply the full 8-step issue resolution process: containment (continued flying) was inadequate; the root cause investigation was incomplete; and the remediation (software update) was not validated before the Ethiopian Airlines crash in March 2019. Only after the second crash was the 737 MAX grounded. A rigorous issue log with mandatory escalation at Level 2 (financial + safety impact) and a validated remediation requirement before return-to-service would have interrupted this chain.

**So what:** The Boeing case illustrates the most dangerous failure mode in issue management: treating a safety issue as an engineering project management issue rather than escalating it to the enterprise risk and governance level. The issue log's escalation classification and 8-step resolution protocol are designed explicitly to prevent this.

## Template
Create one row per issue. Update daily during active response; weekly after containment. Close only after remediation is validated. Feed lessons learned back to the risk register within 5 business days of closure.

- [ ] Issue ID (format: I-YYYY-NNN)
- [ ] Source Risk ID (the risk register entry that materialized into this issue)
- [ ] Issue Description (what happened, when, and where — factual, no speculation)
- [ ] Date and time materialized
- [ ] Date and time reported to risk function
- [ ] Business Impact — Financial (€ estimate)
- [ ] Business Impact — Operational (service disruption description and duration)
- [ ] Business Impact — Reputational (stakeholder/media impact description)
- [ ] Business Impact — Regulatory (regulatory notification required? Y/N; regulator name)
- [ ] Issue Owner (single named individual with authority to commission response actions)
- [ ] Escalation Level (1-Managed / 2-Escalated / 3-Critical) with escalation chain notified
- [ ] Containment Actions completed (description, owner, date completed)
- [ ] Root Cause (from 5 Whys or Fishbone analysis)
- [ ] Remediation Actions (SMART: description, owner, target date, actual completion date)
- [ ] Validation method and date (how was the remediation validated as effective?)
- [ ] Issue Status (Open / In Progress / Resolved / Closed)
- [ ] Closure Date
- [ ] Lessons Learned (2–5 bullet points)
- [ ] Risk Register Action (which risks were updated or added as a result of this issue?)

## Pitfalls
- Treating the issue log as a complaint register rather than a risk management instrument — if the issue log is maintained by customer service or operations without involvement from the risk function, the root-cause analysis and risk register update steps are systematically skipped. Counter: the risk function must own the issue log, even if operational teams manage individual issue response.
- Closing issues when actions are complete, not when remediation is validated — completing a remediation action does not mean the risk has been eliminated. Counter: define validation criteria before the remediation begins: 'Issue closed when [specific observable condition] is confirmed for [N] consecutive [periods].'
- Missing the risk register feedback loop — the most valuable output of issue management is the updated risk register. If closed issues don't feed back into the risk identification and assessment process, the organization is not learning from its incidents. Counter: make the risk register update a mandatory field in the issue closure process.
