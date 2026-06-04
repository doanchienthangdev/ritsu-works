---
type: concept
slug: agile-scrum-framework
title: Agile Scrum Framework
source_collection: consulting-toolkits
toolkit: program-project-change-management
domain: execution
category: delivery
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Agile Scrum Framework

*Category: delivery · Toolkit: Program, Project & Change Management*

## What it is
An iterative, incremental project delivery framework that organises work into fixed-duration Sprints (1–4 weeks), with defined roles (Product Owner, Scrum Master, Development Team), artefacts (Product Backlog, Sprint Backlog, Increment), and ceremonies (Planning, Daily Stand-up, Review, Retrospective).

**Origin:** Ken Schwaber and Jeff Sutherland, 1993 — presented at OOPSLA Conference, 1995. Formalised in 'The Scrum Guide,' first published 2010, last updated November 2020 (Schwaber and Sutherland).

## Why it works
Traditional waterfall projects fail when requirements change or when assumptions prove wrong — which is the normal condition for complex product development. Scrum's empirical process control (Transparency + Inspection + Adaptation) acknowledges this reality. By delivering working increments every sprint and inspecting them with real stakeholders, Scrum creates a tight feedback loop that catches requirement errors and changing priorities before they compound. The timeboxed sprint creates urgency and prevents scope from expanding indefinitely.

## When to use
Software and product development where requirements will evolve; any project where stakeholder feedback should shape the outcome; teams of 3–9 people where cross-functional collaboration is needed.

## Visual
`cycle`

## Step-by-step tutorial
1. Establish the three roles: Product Owner (owns the backlog, prioritises by business value, accepts stories); Scrum Master (facilitates ceremonies, removes blockers, coaches the team); Development Team (cross-functional, self-organising, 3–9 people).
2. Build the Product Backlog: translate requirements into user stories ('As a [role], I want [feature] so that [outcome]'). Estimate in story points using Planning Poker. Prioritise by business value × technical risk.
3. Sprint Planning (Day 1 of sprint): agree the sprint goal; select stories the team can complete within the sprint; break stories into tasks; total task hours should not exceed team capacity (velocity × sprint length).
4. Daily Stand-up (15 minutes max, every day): each team member answers: What did I do yesterday? What will I do today? Any blockers? Scrum Master captures blockers and resolves within 24 hours.
5. Sprint execution: update the sprint burndown chart daily. If the team is behind the burndown line by Day 5, the Scrum Master must alert the Product Owner to consider de-scoping stories.
6. Sprint Review (last day): demo only completed stories (meeting the Definition of Done). Product Owner accepts or rejects each story. Stakeholders provide feedback that updates the backlog.
7. Sprint Retrospective (last day, after Review): Start/Stop/Continue or 4Ls (Liked/Learned/Lacked/Longed For). Select 1–2 improvement actions for the next sprint only.

## Real-life example — Spotify (Engineering model, 2012 onwards)
Spotify's engineering organisation scaled Scrum into the famous 'Spotify Model' of Squads, Tribes, Chapters, and Guilds. Each Squad (equivalent to a Scrum team of 6–12) owns a specific product area (e.g., the Search squad), runs 2-week sprints, and has an embedded Product Owner and Agile Coach (Scrum Master equivalent). Tribes (groups of related Squads) hold quarterly reviews. The model enabled Spotify to deploy to production 800+ times per day while maintaining high engineering quality. The key insight: treating Squads as mini-startups with full autonomy over their product area made scaling Agile viable.

**So what:** Scrum's power scales only when Product Owners have genuine authority to set priorities — removing approval chains above the Product Owner was what unlocked Spotify's deployment frequency.

## Template
Use for sprint planning. Complete one row per user story selected for the sprint.

- [ ] Sprint Goal: [single sentence — what will we achieve this sprint?]
- [ ] Sprint Duration: [2 / 3 / 4 weeks] | Start date: | End date:
- [ ] Team velocity (story points): [from last 3 sprints average]
- [ ] Story | Acceptance Criteria | Story Points | Owner | Status (Not Started / In Progress / Done)
- [ ] [Story 1] | [criteria] | [points] | [dev] | [status]
- [ ] Total story points committed: [sum] | Team capacity: [total] | Buffer: [%]
- [ ] Definition of Done: [list criteria — e.g., code complete, tested, reviewed, documented, PO accepted]

## Pitfalls
- Scrum without empowered Product Owners: if the Product Owner cannot prioritise the backlog without multi-level approval, sprint planning becomes theatre — resolve the authority issue before adopting Scrum.
- Daily stand-ups becoming status reports to the manager: the stand-up is a team coordination tool, not a reporting mechanism — the Scrum Master must enforce the 15-minute timebox and redirect status questions to the team tracking board.
