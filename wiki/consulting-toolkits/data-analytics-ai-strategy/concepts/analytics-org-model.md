---
type: concept
slug: analytics-org-model
title: Analytics Organisation Model (Centralised / Federated / Hub-and-Spoke)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: organisation
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Analytics Organisation Model (Centralised / Federated / Hub-and-Spoke)

*Category: organisation · Toolkit: Data Analytics & AI Strategy*

## What it is
A framework for choosing and designing the analytics team structure, balancing quality and consistency (centralised) against speed and business alignment (federated) via the hub-and-spoke model that maximises both for enterprises above $200M revenue.

**Origin:** Three-model taxonomy from Davenport and Harris 'Competing on Analytics' (2007) and McKinsey 'How to Build an Analytics Centre of Excellence' (2020). Hub-and-spoke is the contemporary consensus architecture for mid-to-large enterprises.

## Why it works
The wrong analytics org model is a silent killer of data programmes. Fully centralised creates a bottleneck: business units wait weeks for analyses, lose trust in the team's domain knowledge, and build shadow analytics. Fully federated creates inconsistency: teams calculate the same KPIs differently, platform investment is duplicated, quality varies. Hub-and-spoke resolves both: a central CoE sets standards and builds the platform (hub); embedded analytics translators in each function own use-case delivery with specialist support from the hub (spokes).

## When to use
In Phase 2 (building Pillar 4: Data-Driven Organisation) when designing the analytics team. Revisit at each annual strategy review as the organisation scales.

## Visual
`process-flow`

## Step-by-step tutorial
1. Assess current state: where does analytics talent sit today, what is the average turnaround time for an analytics request, and what are the top-3 complaints from business units about the analytics function?
2. Choose the model based on three factors: (1) company size (<$200M: centralised; $200M–$1B: early hub-and-spoke; >$1B: full hub-and-spoke or mesh-inspired); (2) maturity (Level 1–2: centralised; Level 3–4: hub-and-spoke; Level 5: mesh); (3) business-unit autonomy (high autonomy BUs need embedded analytics to move at their speed).
3. Define the hub structure: CDO, Data Engineering lead, Analytics Engineering lead, Data Science lead, Platform lead, Governance lead. Size: roughly 1 hub FTE per 5 spoke FTEs.
4. Define the analytics translator role: understands the business domain deeply (ideally previously worked in the function), translates business questions into analytical specifications, and translates findings into business decisions. Hardest role to hire for; most impactful.
5. Define governance between hub and spokes: hub owns unilaterally (platform architecture, data standards, tool selection); co-owned (use-case prioritisation, spoke hiring); spoke owns (which analyses to run, how to present findings).
6. Publish a service catalogue describing what the hub provides and the SLA for each service type (complex ML model: 6-week SLA; self-service dataset: 48-hour SLA).

## Real-life example — Google
Google's analytics organisation is a canonical hub-and-spoke: a central data infrastructure team (hub) runs Google Cloud, BigQuery, and the internal analytics platform; every product team (Search, YouTube, Maps, Ads) has embedded data scientists and analysts (spokes) who own product analytics. The hub sets quality standards and provides ML infrastructure; spokes own product-specific use cases and run 500+ A/B tests simultaneously. Platform consistency at petabyte scale plus product team speed.

**So what:** Hub-and-spoke scales because it resolves the speed-quality tension: the hub provides quality infrastructure; the spokes provide business-domain speed. Neither alone delivers both.

## Template
Define the org model and populate the role matrix. Every hub role and spoke role must have a named accountability owner and clear decision rights.

- [ ] Chosen model (Centralised / Federated / Hub-and-Spoke) + rationale
- [ ] Hub structure: roles + headcount each
- [ ] Spoke structure: analytics translator per function + headcount
- [ ] Reporting lines: hub roles report to CDO; spoke reporting structure
- [ ] Decision rights matrix: hub owns / co-owns / spokes own
- [ ] Service catalogue: list of hub services + SLA per type
- [ ] Hiring plan: priority roles Year 1, Year 2, Year 3
- [ ] Analytics translator selection criteria: domain expertise + data fluency + communication

## Pitfalls
- Centralised model at scale: creates a backlog that destroys business trust. Counter: transition to hub-and-spoke at the 5–7 FTE mark in the central team.
- Analytics translators without business-domain credibility: counter: hire from within the business unit where possible — a marketing analyst who previously worked in brand management is 3× more effective.
- Hub-and-spoke without clear decision rights: counter: define explicitly whether spoke tool choices require hub approval — ambiguity creates the most common conflict.
