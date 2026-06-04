---
type: concept
slug: technology-radar
title: Technology Radar (Adopt/Trial/Assess/Hold)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: technology
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Technology Radar (Adopt/Trial/Assess/Hold)

*Category: technology · Toolkit: Digital Transformation & IT Strategy*

## What it is
A visual tool popularised by ThoughtWorks that classifies technologies into four rings — Adopt, Trial, Assess, Hold — across four quadrants (Techniques, Platforms, Tools, Languages & Frameworks) to communicate the organisation's technology posture and guide investment decisions.

**Origin:** ThoughtWorks Technology Radar, first published externally in 2010 as a bi-annual publication. The ring classification system (Adopt/Trial/Assess/Hold) was developed by ThoughtWorks Chief Scientists and has become the de facto standard for technology strategy communication. Many organisations have adapted the format for their own internal technology strategy.

## Why it works
Technology investment decisions in digital transformation involve hundreds of technology choices. Without a structured framework for communicating technology posture, every team makes independent decisions (often based on individual preferences), resulting in an inconsistent, difficult-to-manage technology landscape. The Technology Radar provides a shared vocabulary and a visual mechanism for communicating: (a) what technologies we are confident in and investing in (Adopt); (b) what we are piloting carefully (Trial); (c) what we are monitoring and learning about (Assess); and (d) what we are actively moving away from or not starting (Hold).

## When to use
Use in Phase IT-II Step 2 (Build the Technology Roadmap) to define the technology posture for each technology class in the IT Strategy. Update semi-annually throughout the programme.

## Visual
`chart`

## Step-by-step tutorial
1. 1. Convene the Architecture Review Board and key technology leads for a Technology Radar session (half-day).
2. 2. Brainstorm technologies: each participant nominates technologies relevant to the organisation's IT Strategy, in each quadrant (Techniques, Platforms, Tools, Languages & Frameworks). Collect all nominations on sticky notes or a digital board.
3. 3. Classify each technology: for each nominated technology, vote as a group on the ring placement. Use these criteria — Adopt: proven in production at scale, team has high confidence; Trial: enough evidence to pilot, controlled risk; Assess: promising but insufficient evidence, monitor the space; Hold: not recommended, technical debt, or actively being retired.
4. 4. Document the rationale: for each technology, write a 2–3 sentence blurb explaining why it is in that ring. The rationale is as important as the classification — it gives teams the context to apply the guidance.
5. 5. Align with IT Guiding Principles: ensure the Technology Radar is consistent with the IT Guiding Principles (e.g., if a Guiding Principle is 'Cloud-first', then on-premise-only technologies should be in Hold).
6. 6. Publish and communicate: share the Technology Radar with all IT and digital teams. Hold a walk-through session to explain the rationale for key placements.
7. 7. Update semi-annually: technology moves fast. Review and update the radar every 6 months. When a technology moves from Trial to Adopt, it signals a significant investment decision. When it moves to Hold, projects using it need a migration plan.
8. 8. Link to architecture decisions: all major technology procurement and build decisions must reference the Technology Radar. Choices of Hold technologies require Architecture Review Board approval and a documented justification.

## Real-life example — ThoughtWorks (the originator)
ThoughtWorks' own Technology Radar (publicly available at thoughtworks.com/radar) is the authoritative reference. The January 2024 edition shows: in ADOPT — Platform Engineering (internal developer platforms), Infrastructure as Code (Terraform), and large language model orchestration frameworks. In TRIAL — AI-assisted code review tools, WASM (WebAssembly) for edge computing. In ASSESS — Multi-modal AI models for enterprise applications, quantum computing for optimisation problems. In HOLD — Microservices as the default architecture for new projects (moving away from the 'everything must be a microservice' dogma of 2015–2020). The ThoughtWorks radar is used by technology leaders globally as a calibration reference for their own internal radars.

**So what:** The Technology Radar's most important function is the Hold ring. The willingness to explicitly classify technologies as 'not recommended' — even popular ones — is what distinguishes a real technology strategy from a catalogue of technology options.

## Template
Classify each technology in scope for the IT Strategy into one of four rings across four quadrants. Provide a 2–3 sentence rationale for each classification.

- [ ] TECHNIQUES quadrant:
- [ ] ADOPT: [Technology] | Rationale: [2–3 sentences] | Owner: [Architecture team or domain lead]
- [ ] TRIAL: [Technology] | Rationale: [2–3 sentences] | Pilot scope: [Where we are testing it]
- [ ] ASSESS: [Technology] | Rationale: [2–3 sentences] | Review date: [When we will revisit]
- [ ] HOLD: [Technology] | Rationale: [2–3 sentences] | Migration plan: [If applicable]
- [ ] [Repeat for PLATFORMS, TOOLS, and LANGUAGES & FRAMEWORKS quadrants]
- [ ] REVIEW SCHEDULE: Next Technology Radar review date: [6 months from now]
- [ ] GOVERNANCE: Technology Radar owner: [Architecture Lead / CTO] | ARB approval required for Hold technology use: [Y/N]

## Pitfalls
- No Hold ring — a Technology Radar with only Adopt and Trial is not a strategy; it is a wishlist. The Hold ring (what we are not doing) is as important as the Adopt ring.
- Technology Radar without rationale — classifying a technology without explaining why provides no guidance to teams who encounter the technology in a new context.
- Annual instead of semi-annual updates — in fast-moving technology domains (AI, cloud, security), 12-month cycles are too slow; a technology can move from Assess to Adopt in 6 months.
- Technology Radar created by IT alone — business and digital leaders should participate in the quadrant sessions to ensure the radar reflects business value, not just technical preference.
