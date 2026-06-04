---
type: concept
slug: raci-matrix
title: RACI Matrix
source_collection: consulting-toolkits
toolkit: program-project-change-management
domain: execution
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# RACI Matrix

*Category: governance · Toolkit: Program, Project & Change Management*

## What it is
A responsibility assignment matrix that maps every deliverable or decision to four roles: Responsible (does the work), Accountable (owns the outcome), Consulted (provides input), Informed (kept up to date) — eliminating role ambiguity.

**Origin:** Derived from the broader class of 'responsibility assignment matrices' used in project management since the 1950s; the RACI acronym was standardised in the 1990s and is now embedded in PMI's PMBOK Guide and PRINCE2.

## Why it works
Most project failures attributed to 'communication breakdown' are actually failures of accountability clarity: multiple people believe they are accountable for the same outcome, or no one believes they are accountable. The RACI matrix forces a single Accountable owner for every deliverable (exactly one A per row is mandatory), makes the Responsible person(s) explicit, and distinguishes between stakeholders who must provide input (Consulted) and those who merely need to be kept in the loop (Informed) — reducing unnecessary meeting attendance.

## When to use
At project initiation (after the charter); whenever a team is experiencing confusion about who makes which decisions; after a team restructure or role change.

## Visual
`table`

## Step-by-step tutorial
1. List all deliverables and decisions in the left column (use the WBS as the input). Aim for 20–50 rows — too few and the matrix adds no value; too many and it becomes unmanageable.
2. List all relevant roles (not individuals) across the top. Use roles rather than names — when people change, the RACI remains valid.
3. For each row, first assign the single A (Accountable): who signs off on this deliverable? Who is held responsible if it is wrong or late? There must be exactly one A per row.
4. Assign R (Responsible): who physically does the work? There may be multiple Rs per row.
5. Assign C (Consulted): who must provide input before the deliverable is finalised? These people need a two-way communication channel.
6. Assign I (Informed): who needs to know the outcome but does not provide input? One-way notification is sufficient.
7. Sense-check: any row with no A is a governance failure. Any role with all Is is probably not needed on the project. Any role with too many As may be a bottleneck.
8. Review the RACI with the full team before the project begins and update it after every major scope change.

## Real-life example — NHS England (NHS COVID vaccination programme, 2020–2021)
The NHS vaccination programme operated across 10,000+ sites involving NHS trusts, GPs, pharmacies, military logistics, and central government. Without a clear RACI, the programme risked dual accountability failures at every tier. The NHS vaccination programme management office published a programme-level RACI covering 35 deliverables and 12 organisational roles. The clarity on who was Accountable for cold chain logistics (NHS Logistics) vs. site activation (NHS England local teams) vs. reporting to NHSX (NHS England national) prevented the coordination failures that plagued comparable programmes in peer countries.

**So what:** The RACI was not just an internal project document — it was shared with all 10,000 sites as an operating agreement, reducing escalations from site-level confusion by over 60% (per NHS Improvement review).

## Template
Fill in one row per deliverable/decision and one column per role. Assign R, A, C, or I to each cell. Validate: each row has exactly one A.

- [ ] Deliverable / Decision | Role 1 | Role 2 | Role 3 | Role 4 | Role 5 | ...
- [ ] [Deliverable 1] | [R/A/C/I/—] | [R/A/C/I/—] | ...
- [ ] [Deliverable 2] | ...
- [ ] Validation check: Any row with 0 or 2+ As? [fix these]
- [ ] Validation check: Any role with only Is? [consider removing from matrix]
- [ ] Validation check: Any role with 10+ As? [likely bottleneck — redistribute]

## Pitfalls
- Multiple As per row: the most common error — two people believe they are both accountable, leading to conflict or nobody acting decisively. Enforce the single-A rule absolutely.
- Confusing R and A: the Accountable person does not necessarily do the work (they may delegate) — the Responsible person does the work but is not held accountable if the outcome is wrong. Keep these distinct.
