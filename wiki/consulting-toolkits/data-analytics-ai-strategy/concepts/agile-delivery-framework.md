---
type: concept
slug: agile-delivery-framework
title: Agile Delivery for Analytics and AI (Scrum + CRISP-DM Integration)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Agile Delivery for Analytics and AI (Scrum + CRISP-DM Integration)

*Category: delivery · Toolkit: Data Analytics & AI Strategy*

## What it is
An integrated delivery framework that combines Agile/Scrum sprint structure with the CRISP-DM phases for ML use cases, producing an iterative, incremental delivery approach that delivers working analytics products every 2 weeks and keeps business sponsors engaged throughout.

**Origin:** Agile Manifesto (Beck et al., 2001) and Scrum (Schwaber and Sutherland, 2020). The integration of CRISP-DM into Agile for data science is a widely-used consulting pattern, formalised in TeamData Science Process (TDSP, Microsoft, 2016) and the 'Analytics Agile' methodology described in McKinsey Digital's 'Delivering Analytics in a Digital World' (2019).

## Why it works
Waterfall delivery of analytics use cases fails because the requirements evolve as the business sponsor sees the outputs: what they thought they wanted (a churn prediction dashboard) and what actually helps them (an early-warning system with workflow integration) are different. Agile delivery exposes this misalignment within 2 weeks rather than 6 months. For ML use cases, CRISP-DM provides the analytical rigour (Business Understanding, Data Preparation) inside the Agile sprint structure.

## When to use
In Phase 5 (Step 4: deliver projects using the right methodology) for all iterative analytics and AI use cases. Combine with CRISP-DM for ML use cases.

## Visual
`process-flow`

## Step-by-step tutorial
1. In Sprint 0, run the CRISP-DM Business Understanding and Data Understanding phases: define the problem statement, confirm the data availability, identify quality issues that will affect the timeline. Sprint 0 should not produce any code — only a problem statement, a data profile, and a revised delivery estimate if data quality issues were discovered.
2. Sprint Planning: at the start of each sprint, identify the 3–5 backlog items that will deliver the most value and are achievable in 2 weeks. For ML use cases, backlog items are typically: 'Feature engineering for X variable group', 'Train baseline model and evaluate on validation set', 'Build monitoring dashboard for X metric'.
3. Daily standups: 15 minutes, three questions: what did you complete yesterday? What will you complete today? What is blocking you? Keep technical details out — the standup is for surfacing blockers, not design reviews.
4. Sprint Review (last day of sprint): demonstrate the working product to the business sponsor. For an analytics use case, 'working product' means a working dashboard or a model evaluation on real data — not a presentation deck. Business sponsor feedback becomes the next sprint's backlog.
5. Sprint Retrospective (last day of sprint): 30-minute team retrospective — what worked well, what didn't, one improvement for next sprint. Document the improvement and verify in the next retrospective that it was implemented.
6. For ML use cases, track two velocity metrics: model performance improvement per sprint (AUC, RMSE change) and business adoption (% of target users engaging with the model output). When model performance plateaus but adoption is low, the next sprint should focus on adoption, not model improvement.

## Real-life example — ING Bank
ING's analytics engineering teams operate in 2-week sprints with business sponsor reviews at every sprint end. Their credit risk ML programme integrated CRISP-DM into Scrum: Sprint 0 defined the business question ('predict 90-day default probability for SME loans') and profiled 3 years of loan data; Sprints 1–4 built the feature engineering pipeline and trained candidate models; Sprint 5 deployed the champion model to a 10% A/B test; Sprint 6+ monitored performance and iterated on feature engineering. Business sponsor reviews at each sprint end caught two misalignments early: the initial feature set excluded the loan officer's subjective assessment (caught in Sprint 2 review) and the output format was wrong for the loan officers' workflow (caught in Sprint 4 review).

**So what:** Agile delivery for analytics reduces the risk of building the right model for the wrong business question. The sprint review, not the retrospective, is the most important Agile ceremony for analytics — it is where the business sponsor sees the model's output for the first time and tells you whether it solves their problem.

## Template
Define the sprint structure before starting delivery. Every sprint must have a defined deliverable and a scheduled business sponsor review.

- [ ] Use case name and business sponsor
- [ ] Sprint 0 deliverables: problem statement / data profile / revised delivery estimate
- [ ] Sprint backlog for Sprints 1–3 (initial): 3–5 backlog items per sprint with the CRISP-DM phase and deliverable
- [ ] Sprint Review agenda: what will be demonstrated to the business sponsor at each sprint end?
- [ ] Definition of Done: for this use case, what must be true for a sprint item to be considered 'done'?
- [ ] Velocity tracking: model performance metric per sprint / business adoption metric per sprint
- [ ] Blockers log: any dependency (data quality, business sponsor availability, infrastructure) that risks the sprint timeline

## Pitfalls
- Sprint Reviews without a working demonstration: counter: 'We made progress on the model training' is not a sprint review. A working demonstration must show the business sponsor something they can interact with and provide feedback on.
- Sprint 0 that produces code: counter: Sprint 0 is for problem definition and data understanding, not code. Code written before data quality is understood typically requires rewriting when quality issues are discovered in Sprint 1.
- Skipping the Sprint Retrospective: counter: without retrospectives, the team repeats the same inefficiencies in every sprint. The retrospective is the team's improvement mechanism — it takes 30 minutes and pays back in every subsequent sprint.
