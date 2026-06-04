---
type: concept
slug: gantt-chart
title: Gantt Chart
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Gantt Chart

*Category: planning · Toolkit: Business Case*

## What it is
A timeline visualisation of project activities showing their start dates, durations, dependencies, and milestones — with the critical path highlighted as the sequence of activities that determines the earliest project completion date.

**Origin:** Henry L. Gantt, an American mechanical engineer and management consultant, developed the bar-chart scheduling tool in 1910–1915 for the U.S. Army during World War I. It remains the standard project scheduling tool worldwide.

## Why it works
A project plan without a timeline is a list of wishes. The Gantt chart converts the WBS into a time-bound commitment by showing when each activity starts and ends, which activities depend on others, and which path of dependencies is the critical path (the bottleneck). Managing the critical path manages the project completion date.

## When to use
After the WBS is complete; as the primary scheduling and monitoring tool throughout the project.

## Visual
`chart`

## Step-by-step tutorial
1. Start with the WBS: convert each leaf-level activity into a row on the Gantt chart.
2. Estimate the duration of each activity in working days or weeks. Validate estimates with the owner.
3. Identify dependencies: for each activity, which other activities must be complete before it can start? Draw arrows.
4. Identify the critical path: the longest chain of dependent activities from start to finish. Every day of slippage on the critical path delays the project by one day.
5. Add milestones: key decision points or stage gates (shown as diamonds on the chart).
6. Check resource loading: are the same people assigned to multiple critical-path activities in the same week? If yes, the schedule is unrealistic — adjust.
7. Present to the board with the critical path highlighted and a 'traffic light' status at each milestone.

## Real-life example — Hoover Dam construction (1931–1936)
The Hoover Dam project was one of the first large public-works projects in the US to use Gantt-style scheduling. Project manager Frank Crowe used bar charts to sequence 21,000 workers across five simultaneous workstreams (diversion tunnels, cofferdam construction, excavation, concrete pouring, and mechanical installation) — activities that had never been attempted at this scale. The sequencing made it possible to complete the dam in 4 years and 9 months — more than two years ahead of the original schedule and under budget.

**So what:** The Gantt chart makes schedule dependencies visible, enabling the project team to concentrate effort on the critical path and avoid the most costly delays.

## Template
List every WBS activity in rows. Estimate duration. Identify predecessors (which activities must finish before this one starts). Highlight the critical path. Add milestone rows at key decision points.

- [ ] Activity ID: [1.1, 1.2, 2.1…]
- [ ] Activity name: [From WBS]
- [ ] Owner: [Role]
- [ ] Duration: [X working days]
- [ ] Start date: [Calculated from predecessor end]
- [ ] End date: [Start + Duration − 1]
- [ ] Predecessor activities: [IDs of activities that must be complete first]
- [ ] Is this on the critical path? [Yes / No]
- [ ] Milestone? [Yes / No — if Yes, it appears as a diamond on the chart]

## Pitfalls
- Activity durations estimated without owner input — a PM estimating on behalf of engineers produces schedules that the engineers immediately know are wrong, destroying trust in the plan.
- Not tracking the critical path — teams focus on busy work while the critical path slips silently. Mark it explicitly and review at every status meeting.
- Over-precision — Gantt charts for boards should be high-level (workstreams and milestones). Detailed Gantt charts are for the project team, not the board.
