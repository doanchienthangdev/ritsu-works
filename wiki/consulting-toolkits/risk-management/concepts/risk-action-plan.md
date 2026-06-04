---
type: concept
slug: risk-action-plan
title: Risk Action Plan (SMART Mitigation Actions)
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Action Plan (SMART Mitigation Actions)

*Category: governance · Toolkit: Risk Management*

## What it is
The operational instrument that translates the risk response option (4T) into specific, accountable, time-bound mitigation actions for each High and Medium priority risk. Each action is SMART (Specific, Measurable, Achievable, Relevant, Time-bound) with a single named owner.

**Origin:** SMART goal-setting (Specific, Measurable, Achievable, Relevant, Time-bound) was articulated by George T. Doran in Management Review (1981) and adopted universally in project and performance management. Its application to risk mitigation actions was formalized by ISO 31000 under 'risk treatment implementation' and by PMI's Practice Standard for Risk Management.

## Why it works
The most common failure in risk mitigation is vague actions: 'Strengthen the IT security controls' is not a mitigation action — it has no owner, no deadline, no measurable outcome, and no way to confirm it was done. The SMART framework enforces the specificity that makes actions executable and trackable. The single named owner discipline eliminates the 'group responsibility = no responsibility' failure mode. The target residual score (the expected risk score after the action is complete) creates a measurable success criterion for each action, enabling the risk function to validate whether mitigation is actually working.

## When to use
Phase 5 (Risk Mitigation), Step 2. Activated for every risk with a 'Treat' response option. Tracked in Phase 5, Step 3 (monitoring via dashboard). Also use for issue remediation actions in Phase 6.

## Visual
`table`

## Step-by-step tutorial
1. For each High and Medium priority risk selected for a 'Treat' response (from the 4T framework), open a risk action plan entry.
2. Design 2–5 SMART actions per risk. Apply the SMART test to each: Specific (what exactly will be done?), Measurable (how will completion be verified?), Achievable (is it feasible with available resources?), Relevant (will it actually reduce the Likelihood or Consequence?), Time-bound (by what specific date?).
3. Identify whether the action reduces Likelihood, Consequence, or both. Actions that reduce Likelihood target the cause of the risk (e.g., training to reduce human error probability). Actions that reduce Consequence target the impact when the risk occurs (e.g., business continuity plan to reduce downtime duration).
4. Assign a single named accountable owner per action — not a team, not a role, not a department. The owner is the individual who will be asked at the next risk committee meeting: 'Is Action 3 for Risk OPS-007 complete? Why not?'
5. Set a realistic target date that allows sufficient time for the action to be completed. For High-priority risks, first actions should complete within 30 days. For Medium-priority risks, within 90 days.
6. Estimate the cost of each action (direct cost: FTE time, technology, external support). Actions that cost more than the expected loss reduction should trigger a 'Transfer' or 'Tolerate' reconsideration.
7. After each action completes, re-score the risk using the assessment matrix. If the actual residual score is higher than the target residual score, the action was not as effective as planned — design additional actions or escalate.
8. Track action status in the Risk Dashboard with a RAG indicator: Green = Complete; Amber = In Progress; Red = Overdue. Escalate overdue Red actions to the senior sponsor within 5 business days.

## Real-life example — Siemens AG
Following the 2008 FCPA violations ($800M in fines for bribery in multiple countries), Siemens implemented a massive compliance risk action plan under court supervision. The action plan for the 'bribery and corruption in sales processes' risk included over 300 specific SMART actions, each with a named owner (typically the country head or function head), a target date, and a completion verification method (external audit sign-off). The program included: mandatory anti-bribery training for 420,000+ employees (owner: Chief Compliance Officer; target date: 6 months; measured by training completion rate); redesigned sales incentive structure removing commission components tied to contract awards (owner: CHRO; 9 months; measured by payroll system change); and a global anti-corruption compliance management system (owner: CIO; 18 months; measured by system go-live and adoption rate). The action plan was the instrument that enabled Siemens to demonstrate to the DOJ and SEC that the risk had been systematically mitigated.

**So what:** Siemens' post-FCPA action plan illustrates that a SMART risk action plan is not just an internal management tool — it is the evidence package that demonstrates to external enforcers (regulators, courts, investors) that material risks are being systematically addressed. The specificity, accountability, and measurability of each action was what made the plan credible.

## Template
Complete one section per High or Medium priority risk. Design 2–5 SMART actions per risk. Obtain risk owner sign-off before populating target dates. Update status at every risk committee meeting.

- [ ] Risk ID and description (from risk register)
- [ ] Response Option selected (should be 'Treat' for this template to apply)
- [ ] Current Residual Risk Score
- [ ] Target Residual Score post-all-actions
- [ ] For each action (repeat fields for each of 2–5 actions):
- [ ]   Action number (1, 2, 3...)
- [ ]   Action description (SMART: specific; what exactly will be done?)
- [ ]   Type: Likelihood-reducing / Consequence-reducing / Both
- [ ]   Named accountable owner (individual, not team or role)
- [ ]   Target completion date
- [ ]   Estimated cost (€ FTE time + direct costs)
- [ ]   Verification method (how will completion be confirmed and by whom?)
- [ ]   Expected residual score after THIS action is complete
- [ ]   Current status (Not Started / In Progress / Complete / Overdue)
- [ ]   Actual completion date (if complete)
- [ ]   Post-action residual score (actual, from re-assessment)
- [ ]   Variance from target: if actual > target, describe additional actions planned

## Pitfalls
- Actions that target symptoms rather than root causes — 'Train employees on the new procedure' sounds specific but if the root cause of the risk is an unclear procedure (not lack of training), more training will not reduce the risk. Counter: always trace the action back to the cause element of the risk description (cause → event → consequence). The action should address the cause.
- Overloading a single owner with too many actions — if the CFO is named as the owner of 12 mitigation actions across 8 different risks, none will be completed on time. Counter: distribute ownership across the organization; escalate resource constraints to the CRO before assigning.
- Target dates that are aspirational rather than committed — a target date that the owner has not confirmed is a fiction. Counter: always obtain explicit verbal or written commitment from the action owner before recording the target date in the plan.
