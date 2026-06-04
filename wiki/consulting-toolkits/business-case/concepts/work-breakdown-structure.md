---
type: concept
slug: work-breakdown-structure
title: Work Breakdown Structure (WBS)
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Work Breakdown Structure (WBS)

*Category: planning · Toolkit: Business Case*

## What it is
A hierarchical decomposition of the total project scope into manageable, deliverable-focused components — workstreams, sub-workstreams, activities, and tasks — each with a defined deliverable.

**Origin:** Formalised by the U.S. Department of Defense (MIL-STD-881, 1968) and adopted as a core planning tool by the Project Management Institute (PMI PMBOK).

## Why it works
A project that cannot be decomposed cannot be planned, costed, resourced, or tracked. The WBS is the foundation: it makes all scope visible, prevents work from falling through the cracks, and is the input to the Gantt chart (sequencing), cost model (estimating), and RACI (assignment). The decomposition stops when each leaf-level task can be assigned to one person and estimated in time and cost.

## When to use
Before building the Gantt chart; after the project scope is agreed in Step 1.3.

## Visual
`tree`

## Step-by-step tutorial
1. Start with the project name as the root node.
2. Identify the major workstreams (typically 3–6) — the top-level decomposition of the project scope. Name them as noun phrases, not verbs.
3. For each workstream, identify the sub-workstreams or phases (2–4 per workstream).
4. For each sub-workstream, list the activities — the concrete things the team will do.
5. Continue decomposing until each leaf-level task can be: (a) assigned to one person, (b) estimated in time, and (c) has a clear done-definition.
6. Tag each leaf-level task with its deliverable — the output that can be reviewed and accepted.
7. Use the WBS as the input to the Gantt chart: convert activities to bars, add sequence dependencies, and mark the critical path.

## Real-life example — NASA (Space Shuttle programme)
NASA introduced the WBS for the Space Shuttle programme in the 1970s. The top-level decomposition was five workstreams: Orbiter, External Tank, Solid Rocket Boosters, Main Engines, and Mission Operations. Each decomposed to hundreds of sub-systems, each with a defined deliverable and owner. The WBS became the shared language between NASA and 450+ contractors — the only way to coordinate a programme of that complexity without a single person managing everything. The approach became the PMI standard for project planning.

**So what:** A WBS makes all scope visible, assignable, and trackable — the prerequisite for any realistic Gantt chart or cost model.

## Template
Start with the project name. Identify 3–6 workstreams. Decompose each to 2–4 sub-workstreams, then to activities, then to tasks. Stop when each task is assignable and estimable. Tag each task with its deliverable.

- [ ] Project name: [e.g. 'Sustainable Packaging Investment']
- [ ] Workstream 1: [Name]
- [ ]   Sub-workstream 1.1: [Name]
- [ ]     Activity 1.1.1: [Name] | Deliverable: [What it produces] | Owner: [Role] | Duration: [Days]
- [ ]     Activity 1.1.2: [Name] | Deliverable: [What it produces] | Owner: [Role] | Duration: [Days]
- [ ]   Sub-workstream 1.2: [Name]
- [ ] Workstream 2: [Name]
- [ ]   Sub-workstream 2.1: [Name]

## Pitfalls
- Decomposing by function (Finance, IT, HR) instead of deliverable — a function-based WBS creates silos; a deliverable-based WBS creates accountability.
- Stopping decomposition too early — if a task cannot be assigned to one person and estimated, it is still too large and must be broken down further.
- Confusing WBS with Gantt — the WBS defines WHAT must be done; the Gantt defines WHEN and in what sequence. Build the WBS first, then sequence it into a Gantt.
