---
type: concept
slug: traditional-project-management
title: Traditional Project Management (PMI PMBOK)
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Traditional Project Management (PMI PMBOK)

*Category: governance · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
The PMI Project Management Body of Knowledge (PMBOK) five process groups — Initiating, Planning, Executing, Monitoring & Controlling, and Closing — applied to major financial implementation projects (ERP implementations, cost transformation programs, new consolidation platforms) to ensure delivery within scope, schedule, and budget.

**Origin:** Project Management Institute (PMI) founded 1969. First PMBOK Guide published 1987; currently in 7th edition (2021). Remains the gold standard for large, well-defined projects. PMP certification (Project Management Professional) held by 1M+ professionals globally.

## Why it works
Large, structured projects (a $50M ERP implementation, a $100M cost transformation program) fail at a rate of 60–70% when run without formal governance (McKinsey, 2012). The PMBOK five process groups provide the proven governance backbone: clear scope (prevents scope creep), detailed WBS (makes the work visible), risk register (anticipates problems), and earned value management (tracks progress objectively, not just by anecdote).

## When to use
Use for large, structured financial implementation projects with well-defined scope, schedule, and budget: ERP implementations, new consolidation platforms, major cost reduction programs, or any financial initiative with a budget >$1M and duration >3 months.

## Visual
`process-flow`

## Step-by-step tutorial
1. Initiating: Write a Project Charter (1–2 pages): project purpose, scope, out-of-scope, sponsor, PM, key stakeholders, high-level timeline, and budget authorization. Get the sponsor's signature before proceeding. A project without a charter has no formal authorization and cannot hold stakeholders accountable.
2. Planning: Build the Work Breakdown Structure (WBS): decompose the project into 100% of the work in a hierarchical tree. Build a Gantt chart from the WBS with durations, dependencies, critical path, and resource assignments. Build the risk register: identify top 10 risks, rate by probability × impact, define mitigation and contingency. Build the budget baseline: sum WBS task estimates to get the budget-at-completion (BAC).
3. Executing: Manage the team and vendors per the plan. Track time and cost against the WBS tasks. Issue a weekly status report: scope completed, scheduled vs. actual dates, budget spent vs. plan, top 3 risks, top 3 issues, next week's work plan.
4. Monitoring & Controlling: Apply Earned Value Management (EVM) monthly: EV (Earned Value = % complete × BAC), PV (Planned Value = planned % complete × BAC), AC (Actual Cost = money spent to date). Calculate SPI (Schedule Performance Index = EV/PV; <1.0 means behind schedule) and CPI (Cost Performance Index = EV/AC; <1.0 means over budget). Forecast Budget-at-Completion: BAC/CPI. This is the most objective progress tracking method available.
5. Closing: Conduct formal project closure: final delivery accepted by sponsor, all contracts closed, team released. Write the lessons-learned document: what worked, what did not, what to do differently next time. Schedule the post-implementation review (12 months after go-live) to measure benefit realization vs. business case.

## Real-life example — SAP S/4HANA implementation at Nestle (2018–2022)
Nestlé undertook one of the largest SAP S/4HANA implementations in history across 400+ legal entities and 190 countries, with an estimated $1.5B investment. The project applied PMBOK rigor: a global PMO with a standardized reporting cadence, earned value management tracking monthly, and a formal change control process for any scope additions. Key EVM outputs tracked: CPI ranged from 0.88 to 1.05 across waves, flagging two waves as over-budget early enough to course-correct. The post-implementation review documented the critical lesson: data migration preparation required 3× more effort than estimated — now a standard risk in the risk register for any large ERP project. Despite its scale, the project delivered within 10% of original budget by applying structured governance.

**So what:** EVM is the most objective tool available for tracking project health. An EVM report that shows CPI = 0.88 tells you the project is spending $1.14 for every $1.00 of work completed — a clear early warning that requires action, not reassurance.

## Template
Use this template for any major financial implementation project (>$1M budget or >3 months duration). Fill in each PMBOK artifact.

- [ ] Project Charter: Name ___ | Sponsor ___ | PM ___ | Budget $___M | Start ___ | End ___ | Scope statement: ___
- [ ] WBS Level 1 deliverables: 1.___ | 2.___ | 3.___ | 4.___ | 5.___
- [ ] Critical Path (longest chain of tasks): ___ → ___ → ___ → ___ (total: ___ days)
- [ ] Budget Baseline (BAC): $___M | By WBS phase: Design $___M | Build $___M | Test $___M | Deploy $___M
- [ ] Risk Register: Risk 1: ___ | P: ___% | I: $___M | Mitigation: ___ | Contingency: ___
- [ ] EVM Monthly (Month ___): PV $___M | EV $___M | AC $___M | SPI: ___  | CPI: ___ | Budget-at-Completion (BAC/CPI): $___M
- [ ] Change Log: Change ___ | Scope impact: ___ | Cost impact: $___M | Approved by: ___
- [ ] Lessons Learned: What worked: ___ | What did not: ___ | Do differently: ___

## Pitfalls
- Applying PMBOK to projects that should use Agile — PMBOK is designed for well-defined, stable-scope projects; applying it to exploratory or iterative work (e.g., new FP&A dashboard design) creates bureaucratic overhead without governance benefit.
- Treating the project charter as a one-time document — the charter must be updated when scope, budget, or timeline changes significantly; a project operating against a 2-year-old charter is operating with obsolete authorization.
- Reporting schedule and cost status separately from earned value — saying 'we are 3 weeks behind schedule and $2M over budget' is less actionable than 'SPI = 0.82 and CPI = 0.88, which projects a final cost of $___M — a $___M overrun.'
