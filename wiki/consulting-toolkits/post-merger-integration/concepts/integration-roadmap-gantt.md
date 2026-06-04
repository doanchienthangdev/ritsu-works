---
type: concept
slug: integration-roadmap-gantt
title: Integration Roadmap (Gantt)
source_collection: consulting-toolkits
toolkit: post-merger-integration
domain: corp-dev
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Integration Roadmap (Gantt)

*Category: planning · Toolkit: Post Merger Integration*

## What it is
A 24-month Gantt-style project roadmap sequencing all prioritized integration and synergy initiatives across five time horizons — Pre-Day-1, D1–30, M1–6, M6–12, M12–24 — showing milestones, dependencies, resource requirements, and synergy realization timing.

**Origin:** Standard program management tool; the Gantt chart was developed by Henry Gantt in the 1910s. Applied to PMI roadmapping in McKinsey and BCG integration practices as the primary integration sequencing tool.

## Why it works
A list of initiatives without sequencing is a wish list. The Gantt roadmap exposes dependency conflicts (initiative B cannot start until initiative A completes), resource bottlenecks (three initiatives requiring the same team in the same month), and unrealistic synergy realization schedules before they cause real delays.

## When to use
Phase II Step 4, after the prioritized initiative portfolio is approved. Live throughout Phases III and IV.

## Visual
`process-flow`

## Step-by-step tutorial
1. Take the prioritized initiative portfolio (from the Initiative Prioritization Matrix) and assign each initiative to its primary time horizon based on feasibility and dependency constraints.
2. For each initiative, identify: start date, key milestones, completion date, dependencies on other initiatives, resource requirements (FTE by function), and synergy realization start date.
3. Build the dependency map: which initiatives must complete before others can start? Mark critical path dependencies explicitly.
4. Identify resource conflicts: where does the roadmap require more FTE in a given month than is available? Resolve by sequencing initiatives or increasing resources.
5. Calculate the synergy realization curve implied by the roadmap: does it match the synergy commitment schedule? If not, revise the roadmap.
6. Present the roadmap at the Steering Committee for approval — require workstream leads to sign off on their sections.

## Real-life example — Marriott / Starwood integration (2016)
The Marriott-Starwood roadmap explicitly sequenced the Marriott Bonvoy loyalty program launch (M6–12) to follow the IT infrastructure migration (M1–6) which in turn depended on the SSO and identity management integration (Pre-Day-1 to Day 30). The sequencing prevented the failure mode of launching the loyalty program before the supporting IT infrastructure was stable.

**So what:** In integrations with complex IT dependencies, the roadmap's critical path almost always runs through the IT workstream — IT sequencing should be built first and all other workstreams fit around it.

## Template
Build one row per initiative. Organize by time horizon. Identify dependency chains. Validate resource loading.

- [ ] Initiative name
- [ ] Workstream
- [ ] Time horizon (Pre-D1 / D1–30 / M1–6 / M6–12 / M12–24)
- [ ] Start date
- [ ] End date
- [ ] Key milestones (with dates)
- [ ] Dependencies (initiative IDs that must complete first)
- [ ] Resource requirement (FTE by month, by function)
- [ ] Synergy realization start date and amount ($M/year)
- [ ] Owner
- [ ] Status (planned / in progress / complete / at risk)

## Pitfalls
- Building the roadmap in a spreadsheet that no one updates — the roadmap is only valuable if it is a live document updated at least monthly.
- Ignoring resource loading — a roadmap that shows three large IT migrations happening simultaneously in Month 2 is not a plan, it is optimism.
- Not connecting the roadmap to the Synergy Waterfall Model — the two must be synchronized: when an initiative on the roadmap slips, the synergy realization date in the waterfall model must also slip.
