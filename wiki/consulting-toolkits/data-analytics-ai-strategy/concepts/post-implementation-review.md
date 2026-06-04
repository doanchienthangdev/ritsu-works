---
type: concept
slug: post-implementation-review
title: Post-Implementation Review (PIR) for Analytics and AI
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Post-Implementation Review (PIR) for Analytics and AI

*Category: delivery · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured review process conducted at 30, 90, and 180 days after a data or AI use case goes live, comparing actual business value delivered to the business case forecast, identifying root causes of any shortfall, and feeding lessons back into the business-case methodology for future use cases.

**Origin:** Standard programme management practice from PRINCE2 post-project review and PMI lessons-learnt process. Applied specifically to analytics and AI by McKinsey Digital 'Capturing Value from AI' (2021) and Gartner 'How to Measure the ROI of AI Investments' (2022).

## Why it works
87% of data-science projects never reach production; of those that do, fewer than 50% deliver their projected business value (McKinsey, 2021). The post-implementation review exists to close this gap: by measuring actual vs forecast at 30/90/180 days, it identifies whether the shortfall is from adoption (the model is good but nobody uses it), from accuracy (the model is below the business-case assumption), or from value attribution (the model is deployed but we cannot measure its impact). Each root cause has a different remedy.

## When to use
In Phase 5 (Step 5: run continuous improvement and post-implementation evaluation) for every deployed use case. The 30/90/180-day review cycle is non-negotiable.

## Visual
`table`

## Step-by-step tutorial
1. For every deployed use case, schedule the three PIR dates at go-live: 30-day, 90-day, and 180-day. Pre-schedule the calendar invites with the business sponsor and PMO before the go-live sprint ends.
2. At the 30-day PIR: measure adoption (% of target users who used the model/dashboard at least once; target ≥50%); identify critical issues (bugs, data quality problems, model errors that undermine user trust); document any 'surprise' use cases (the model is being used for something other than the original business question — often a signal that the model is more broadly valuable than planned).
3. At the 90-day PIR: compare the actual business metric trend to the business-case trajectory (e.g., 'The business case projected a 1.4% conversion lift by Week 12; we are seeing 0.8% in the A/B test at Week 12'). For each shortfall, identify the root cause: adoption gap (not enough users), accuracy gap (model below business-case assumption), or attribution gap (impact is real but we cannot measure it).
4. At the 180-day PIR: present to the Steering Committee with the value realisation statement: 'Use case X delivered $Y of attributed value in the first 6 months against a business-case forecast of $Z. The shortfall (if any) is attributed to [root cause] and will be addressed by [remedy].' Update the cumulative value dashboard.
5. Feed the lessons from every PIR back into the business-case model: if 5 consecutive use cases produce lower adoption than forecast, adjust the adoption assumption downward for all future business cases. If 5 consecutive use cases produce higher accuracy than forecast, recalibrate the improvement magnitude assumption.
6. Publish a PIR summary to the programme team after each review. Lessons-learnt that affect the team's methodology (e.g., 'we consistently underestimate data preparation time by 30%') must be applied in the Sprint 0 planning for all future use cases.

## Real-life example — American Express
American Express's fraud detection AI went through three PIRs: 30-day PIR identified that the model's output format was not integrated into the fraud analyst's workflow (adoption 22% vs 70% target — an interface problem, not a model problem). 90-day PIR after the UI fix showed adoption 78% and fraud detection rate +12% vs baseline (exceeding the business case assumption of +8%). 180-day PIR confirmed $47M in fraud prevention value against a $32M business case forecast. The lessons learnt from the adoption failure in the 30-day PIR were applied to all subsequent use cases: UI integration is now a Sprint 0 requirement, not an afterthought.

**So what:** The 30-day PIR often reveals implementation problems that can be fixed quickly (wrong output format, missing workflow integration, training gap) before they become embedded patterns. A missed 30-day PIR allows adoption problems to become culture problems — much harder to fix at 180 days.

## Template
Complete one PIR per deployed use case at each time point. Every shortfall must have a named root cause and a named remediation action.

- [ ] Use case name + go-live date
- [ ] 30-day PIR: adoption rate (% target users active) / critical issues identified / adoption trend vs target / remediation actions
- [ ] 90-day PIR: business metric trajectory vs business case / root cause of any shortfall (adoption / accuracy / attribution) / remediation actions
- [ ] 180-day PIR: 6-month attributed value ($) vs business case forecast ($) / variance explanation / lessons learnt
- [ ] Lessons to apply to future use cases: (1) business case methodology adjustments / (2) delivery process improvements / (3) adoption programme improvements

## Pitfalls
- Skipping the 30-day PIR because the team has moved to the next use case: counter: the 30-day PIR is the most actionable review — it catches problems when they are still cheap to fix. Schedule it at go-live; it takes 1 hour.
- PIR that measures outputs instead of outcomes: counter: 'The dashboard is live and has 200 users' is an output. 'The business decision quality improved by X% as measured by Y' is an outcome. PIRs must measure outcomes against the business case.
- Not feeding PIR lessons back into the business-case model: counter: business cases that consistently overestimate value by 20% will continue to do so unless the model is recalibrated. PIR feedback is the calibration mechanism for all future business cases.
