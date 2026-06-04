---
type: concept
slug: it-operating-model
title: IT Operating Model Design
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# IT Operating Model Design

*Category: architecture · Toolkit: Digital Transformation & IT Strategy*

## What it is
A blueprint for how the IT function is organised, governed, and managed — covering organisation structure, key IT processes, governance committees, decision rights, and the interface between IT and the business — derived from the selected Weill-Ross archetype.

**Origin:** Synthesised from Weill-Ross IT Operating Models (MIT CISR), McKinsey IT Organisation Design, and TOGAF IT Architecture. The specific components of IT Operating Model design (structure, processes, governance, interfaces) are standard in McKinsey, Deloitte, and PwC IT strategy engagements.

## Why it works
The IT Operating Model is the execution vehicle for the IT Strategy: it defines how the IT function will operate to deliver the IT Strategic Objectives. Without an explicit operating model, the IT function operates on implicit assumptions about reporting lines, decision rights, and interfaces — which leads to conflicts, delays, and inconsistent service quality.

## When to use
Use in Phase IT-I Step 7 (IT Team Structure) and Phase IT-II Step 1 (IT Operating Model) to design how the IT function will be organised and governed.

## Visual
`table`

## Step-by-step tutorial
1. 1. Select the Weill-Ross archetype (see weill-ross-it-operating-model) — this determines the degree of centralisation.
2. 2. Design the IT organisation structure: central IT functions (shared infrastructure, security, architecture) vs. embedded IT (business-unit IT, product teams). Define reporting lines.
3. 3. Define key IT processes: which processes are standard across all IT (Incident Management, Change Management, Procurement) vs. which can vary by business unit.
4. 4. Design governance committees: IT Steering Committee (CIO + business sponsors, monthly), Architecture Review Board (architects + domain leads, fortnightly), Change Advisory Board (IT change management, weekly).
5. 5. Define decision rights using RACI: who decides on IT investment, architecture, vendor selection, IT org changes? Use the Weill-Ross IT Governance framework to assign decision rights to appropriate bodies.
6. 6. Design the IT-Business interface: how do business units request IT capability? Through a business relationship management (BRM) function, a product owner model, or a demand management process?
7. 7. Define IT performance management: how is IT performance measured and reported? SLAs, cost per service, innovation metrics.
8. 8. Plan the transition: define the roadmap to move from current IT organisation to target operating model.

## Real-life example — ING Bank
ING's 2014 agile transformation redesigned its IT Operating Model from a traditional centralised IT function (separate IT department, waterfall delivery) to an embedded, product-oriented model: cross-functional squads (developers, UX, business embedded together), tribe structures aligned to business domains, and a lean central IT function responsible only for shared infrastructure and enterprise architecture standards. The new IT Operating Model eliminated the handoff delay between 'business requirements' and 'IT delivery' that had been averaging 6 months. The ING model became a widely-referenced archetype for agile IT operating model transformation.

**So what:** The ING model demonstrates that IT Operating Model design is not primarily about technology — it is about eliminating organisational barriers between problem identification (business) and problem solving (IT). The agile IT Operating Model integrates these two into cross-functional product teams.

## Template
Design the target IT Operating Model using the 5 components. Validate against the selected Weill-Ross archetype.

- [ ] Selected Weill-Ross archetype: [Diversification/Coordination/Replication/Unification]
- [ ] IT Organisation Structure (target): CIO → [domains] → [teams] — describe
- [ ] Central functions: [List shared services: infrastructure, security, architecture, procurement]
- [ ] Embedded functions: [List business-unit or product-aligned IT roles]
- [ ] IT Steering Committee: Members [List] | Frequency [Monthly] | Decision rights [List]
- [ ] Architecture Review Board: Members [List] | Frequency [Fortnightly] | Decision rights [List]
- [ ] Change Advisory Board: Members [List] | Frequency [Weekly] | Decision rights [List]
- [ ] IT-Business Interface model: [BRM / Product Owner / Demand Management — describe]
- [ ] IT Performance metrics: [SLAs, cost/service, value delivered — list]

## Pitfalls
- Org structure without process — changing reporting lines without changing how work gets done produces a reorganisation with no operating improvement.
- Ignoring informal influence — the formal org chart and the informal influence network are rarely the same; understand both before designing.
