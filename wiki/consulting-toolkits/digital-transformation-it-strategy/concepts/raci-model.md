---
type: concept
slug: raci-model
title: RACI Responsibility Matrix
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# RACI Responsibility Matrix

*Category: governance · Toolkit: Digital Transformation & IT Strategy*

## What it is
A responsibility assignment matrix that maps tasks or decisions to four roles — Responsible (does the work), Accountable (owns the outcome), Consulted (provides input), Informed (receives updates) — eliminating ambiguity about who does what in a complex programme.

**Origin:** The RACI model emerged in project management from the 1950s–1970s, formalised in PMI's Project Management Body of Knowledge (PMBOK). The RACI acronym was widely used from the 1980s onwards. Related frameworks include RASCI (Responsible, Accountable, Supportive, Consulted, Informed) and DACI (Driver, Approver, Contributor, Informed).

## Why it works
In large digital transformation programmes with multiple workstreams, business units, and external partners, the most common failure mode is not technical — it is role ambiguity: two people think they are both accountable for the same decision, or nobody is. RACI solves this by creating a single source of truth for who does what. The critical rule: there is exactly one Accountable person per task (if two people are both Accountable, nobody is). There can be multiple Responsible (people doing the work), but one Accountable (the person who faces consequences if the work is not done).

## When to use
Use in Phase II Step 2 (Programme Team and Governance) and Phase III Step 1 (Programme Governance) to establish clear accountability from the start. Re-use in Phase IT-I Step 7 (IT Team Structure) and Phase IT-III Step 5 (IT Governance) for IT-specific governance.

## Visual
`table`

## Step-by-step tutorial
1. 1. List the tasks and decisions: from the programme plan, extract all major decisions and deliverables that require clarity. Common categories: governance decisions, approvals, deliverable production, stakeholder communications, risk management, budget sign-off.
2. 2. List the roles: identify the functional roles involved (not names — roles, so it survives personnel changes). Keep to <10 roles to maintain readability.
3. 3. Assign letters: for each task-role intersection, determine R, A, C, I, or leave blank. Start with Accountable (who faces consequences if this is not done?) then Responsible (who will do the work?), then Consulted and Informed.
4. 4. Apply the validation rules: (a) each row has exactly one A; (b) each row has at least one R; (c) no role is A for more than 60% of rows (indicates over-centralisation); (d) minimise C entries (every C is a potential bottleneck).
5. 5. Review with stakeholders: share the draft RACI with all named roles. Invite challenges — stakeholders who disagree with their assignment will not follow the matrix. Resolve conflicts in a facilitated session.
6. 6. Publish and embed: publish the RACI as a single-source-of-truth document. Reference it at the start of every programme governance meeting. Update as the programme evolves (roles and responsibilities change as phases transition).
7. 7. Use for decision RACI separately: create a separate RACI for key decisions (vs. tasks). Decision RACI maps who has decision authority, not just who does the work. The Accountable for a decision is the one who can say 'yes' or 'no'.

## Real-life example — KPMG (internal digital transformation)
KPMG's global digital transformation of its audit and tax practice (2016–2020) used RACI extensively to manage a programme spanning 40+ countries and 30,000+ professionals. A key RACI decision: who is Accountable for the deployment of new audit tools in each country? The initial design made both Global IT and Country Managing Partners Accountable — which in practice meant neither took ownership. The RACI was revised to make Country Managing Partners exclusively Accountable for user adoption (and a Global IT team Accountable for tool availability). This single RACI clarification accelerated adoption in the 15 pilot countries from 23% to 67% within 6 months.

**So what:** RACI's most valuable function is the 'dual Accountable' diagnostic. If two people are both Accountable for the same outcome, the RACI reveals the ambiguity — and the resolution typically involves a difficult but necessary conversation about whose career is on the line if it fails.

## Template
List all major programme tasks and decisions in the left column. List all roles in the top row. Assign R, A, C, or I. Validate: exactly one A per row, no role >60% A.

- [ ] TASKS/DECISIONS (rows) vs ROLES (columns)
- [ ] Roles: Programme Sponsor | Programme Director | PMO Lead | Workstream Lead 1 | Workstream Lead 2 | IT Lead | Finance | HR | External Partner
- [ ] Task 1: Business Case preparation | [A/R/C/I for each role]
- [ ] Task 2: Phase gate approvals | [A/R/C/I for each role]
- [ ] Task 3: Programme budget management | [A/R/C/I for each role]
- [ ] Task 4: Workstream delivery | [A/R/C/I for each role]
- [ ] Task 5: Stakeholder communications | [A/R/C/I for each role]
- [ ] Task 6: Risk and issue escalation | [A/R/C/I for each role]
- [ ] [Add rows for all major tasks and decisions]
- [ ] VALIDATION CHECK: Any row with more than one A? [List — resolve before publishing]
- [ ] VALIDATION CHECK: Any role with A on >60% of rows? [List — indicates over-centralisation]

## Pitfalls
- Dual Accountable — the most common and most damaging RACI error; if two people are both Accountable, neither will act decisively.
- RACI created and never referenced — the RACI must be a living document referenced in governance meetings, not a one-time workshop output.
- Too many Consulted — each C is a potential bottleneck; if everyone is Consulted on every decision, the programme slows to the speed of the slowest responder.
- RACI at too high a level — a programme-level RACI ('workstream delivery: R=workstream lead') is useful but must be supplemented with workstream-level RACIs for individual deliverables.
