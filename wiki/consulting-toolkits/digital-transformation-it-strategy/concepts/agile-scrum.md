---
type: concept
slug: agile-scrum
title: Agile Scrum Framework
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Agile Scrum Framework

*Category: delivery · Toolkit: Digital Transformation & IT Strategy*

## What it is
An iterative project delivery framework that organises work into fixed-length sprints (typically 2 weeks), with cross-functional squads, a prioritised Product Backlog, and a set of prescribed ceremonies (sprint planning, daily stand-up, sprint review, retrospective) — enabling rapid delivery of value with frequent feedback loops.

**Origin:** Scrum was developed by Ken Schwaber and Jeff Sutherland, first presented at OOPSLA conference in 1995, and formalised in the Scrum Guide (first published 2010, revised 2020). Builds on iterative and incremental development concepts from the 1970s–1980s. The broader Agile Manifesto was signed by 17 software practitioners in 2001.

## Why it works
Traditional Waterfall project delivery defers value and learning to the end of long delivery cycles — requirements are wrong by the time the product is delivered. Scrum delivers value in small increments every 2 weeks, creating rapid feedback loops that surface misaligned requirements and changing priorities early, when correction is cheap. The cross-functional squad (all skills needed to deliver end-to-end on the team) eliminates handoff delays. The empirical process control (inspect → adapt → repeat) is the theoretical foundation: don't plan everything upfront; learn by doing.

## When to use
Use in Phase III for digital product and technology projects (the majority of a digital transformation portfolio). Apply Scrum when: requirements will evolve with user feedback; the solution approach is uncertain; time-to-market is a priority; and the team can be cross-functional and empowered.

## Visual
`cycle`

## Step-by-step tutorial
1. 1. Form the squad: 6–10 people with all the skills needed to deliver the product end-to-end (developers, UX, QA, business analyst). Identify the Product Owner (accountable for the backlog and business value) and Scrum Master (facilitates the process).
2. 2. Build the Product Backlog: break the project scope into User Stories (As a [user], I want [feature], so that [benefit]). Estimate each story in Story Points (relative effort, not time). The Product Owner prioritises by business value.
3. 3. Run Sprint Planning: the squad selects items from the top of the backlog that fit the sprint capacity. Define the Sprint Goal (what value this sprint delivers). Break selected stories into Tasks (4–8h each).
4. 4. Execute the sprint: every day, hold the Daily Stand-up (15 min standing). Track progress on a Sprint Burndown Chart (Story Points remaining vs. days remaining). Scrum Master removes impediments same-day.
5. 5. Hold the Sprint Review (end of sprint): demonstrate working software to stakeholders. Gather feedback. Update the Product Backlog. The Product Owner accepts or rejects the increment.
6. 6. Hold the Sprint Retrospective (after Sprint Review): What went well? What did not? What will we change? Agree 1–3 actionable improvements for the next sprint.
7. 7. Report to PMO: provide weekly velocity (Story Points completed) and burn-down data. Forecast delivery date using velocity trend.
8. 8. Scale for large programmes: use SAFe (Scaled Agile Framework) or LeSS (Large-Scale Scrum) to coordinate multiple squads working on the same product.

## Real-life example — Spotify
Spotify adapted Scrum into its 'Squads, Tribes, Chapters, and Guilds' model (2012), which became a widely-copied reference for scaling agile. Each Squad (6–12 people) owns a mission and a piece of the product end-to-end, operates like a mini-startup with a Product Owner, and has full autonomy to choose how to work (most use Scrum). Tribes are collections of squads working in related areas (e.g., Music Discovery Tribe). Chapters (functional communities: iOS developers, backend engineers) maintain craft standards. Guilds (informal communities of interest: security, agile coaching) share knowledge. By 2018, Spotify operated 150+ squads with full agile autonomy. The key lesson from Spotify: copy the mindset (autonomy, mission-driven squads), not the org chart (Spotify itself evolved away from the original model).

**So what:** Scrum's effectiveness is contingent on genuine empowerment: the squad must have the authority to make decisions about how it works, and the Product Owner must have real authority over the backlog. Scrum imposed on a command-and-control culture delivers the bureaucracy of Scrum without the adaptability — what practitioners call 'ScrumBut' (We do Scrum, but we also need sign-offs, but we also need monthly milestones...).

## Template
Complete the sprint template at the start of each 2-week sprint. Update the Sprint Burndown daily. Complete the retrospective template at the end of each sprint.

- [ ] Sprint number: [n] | Sprint Goal: [Fill in] | Sprint dates: [Start] to [End]
- [ ] Sprint Backlog (Story: User Story | Points: [X] | Assignee: [Name] | Status: [To Do/In Progress/Done])
- [ ] [List all sprint backlog items]
- [ ] Sprint Burndown: Day 1 remaining [X pts] | Day 3 [X pts] | Day 5 [X pts] | Day 7 [X pts] | Day 10 [X pts]
- [ ] Sprint Review: Demonstrated features | Stakeholder feedback | Backlog updates
- [ ] RETROSPECTIVE: What went well (keep doing): [Fill in]
- [ ] What did not go well: [Fill in]
- [ ] What we will change next sprint (max 3 items): [Fill in]
- [ ] Team velocity this sprint (Story Points completed): [X]
- [ ] Rolling average velocity (last 3 sprints): [X] points/sprint

## Pitfalls
- ScrumBut — using Scrum ceremonies without empowering the squad; if the squad cannot make decisions about how to build the product, Scrum adds bureaucracy without agility.
- Product Owner not available — a Product Owner who is not embedded with the squad (attending sprint ceremonies, answering questions same-day) causes the squad to guess on requirements and build the wrong thing.
- No Definition of Done — without a clear, agreed Definition of Done (what 'completed' means for a Story), stories are declared done prematurely and technical debt accumulates.
- Velocity as a management tool — velocity is a planning tool for the squad, not a performance metric for management. Comparing squads' velocities is meaningless and creates gaming behaviour.
