---
type: concept
slug: enterprise-architecture-framework
title: Enterprise Architecture Framework (Business Capability Map)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Enterprise Architecture Framework (Business Capability Map)

*Category: architecture · Toolkit: Digital Transformation & IT Strategy*

## What it is
A business-demand-driven architecture tool that maps an organisation's business capabilities (what the business does) to the business strategy objectives they support and to the IT capabilities needed to enable them — creating the 'demand signal' that justifies IT investment.

**Origin:** Business Capability Modelling was formalised by Gartner and The Open Group as part of enterprise architecture practice in the 2000s. The approach was popularised in consulting practice by McKinsey, BCG, and Accenture as a bridge between strategy and IT planning from approximately 2010.

## Why it works
The fundamental problem in IT strategy is the disconnect between business strategy and IT investment. A Business Capability Map solves this by making the connection explicit: Business Strategy → Business Capabilities needed → IT Capabilities required. This demand-driven logic ensures that every IT investment can trace to a business capability gap, and every business capability gap has a clear IT investment owner.

## When to use
Use in Phase IT-I Step 2 (Summarise Business Strategy, create Business Capability Map) to generate the IT demand signal. Also use in Phase II to ensure the Digital Transformation project portfolio addresses the highest-priority capability gaps.

## Visual
`table`

## Step-by-step tutorial
1. 1. Define capabilities: a capability is 'what the business does' (not how, not who, not what technology). Examples: 'Customer Acquisition', 'Demand Forecasting', 'Order Fulfilment'. Keep to 50–80 capabilities for a mid-size organisation.
2. 2. Group into domains: cluster capabilities into 6–10 domains (e.g., Customer, Operations, Finance, HR, Product, IT) for visual clarity.
3. 3. Rate strategic importance: for each capability, score 1–3 on strategic importance (3 = differentiating/critical; 2 = important; 1 = table stakes). Use the corporate strategy to drive this score.
4. 4. Rate current maturity: for each capability, score 1–3 on current IT maturity (3 = excellent; 2 = adequate; 1 = poor/absent).
5. 5. Calculate investment priority: Strategic Importance minus IT Maturity = Investment Priority. High strategic importance + low IT maturity = highest priority for IT investment.
6. 6. Colour the heat map: Red = Strategic 3, Maturity 1 (critical gap); Amber = strategic 3, maturity 2 or strategic 2, maturity 1; Green = adequate; Grey = non-strategic, low maturity (candidates for outsourcing).
7. 7. Map to the IT Strategy: for each Red capability, identify the specific IT investments required (new system, data platform, integration, talent). This creates the demand signal for the IT initiative pipeline.
8. 8. Validate with business leaders: share the heat map with business unit leaders. Their challenges to the maturity scores are data — they know the operational reality better than IT does.

## Real-life example — ASOS (online fashion retailer)
ASOS used a Business Capability Map approach to prioritise its IT investments. The map identified 'Personalised Product Recommendation' as a Red capability (strategic importance: 3 — a core differentiator; IT maturity: 1 — using a basic rules-based recommendation engine). The IT investment case for an AI-powered recommendation engine was direct: this is a Red capability gap. By contrast, 'Accounts Payable Processing' was rated Green (strategic importance: 1; IT maturity: 3 — SAP well-implemented). This logic protected ASOS's AI investment from being de-prioritised in favour of ERP upgrades. By 2022, ASOS's recommendation engine was responsible for approximately 30% of revenue, validating the Red capability classification.

**So what:** The Business Capability Map converts the political battle between 'what IT wants to build' and 'what the business needs' into an evidence-based conversation. ASOS's ability to protect its AI investment was grounded in the explicit map showing it as a Red capability — the single most powerful argument in any budget discussion.

## Template
List all business capabilities (50–80). Score on Strategic Importance (1–3) and IT Maturity (1–3). Calculate Investment Priority. Colour-code the heat map. Use Red capabilities to drive the IT initiative pipeline.

- [ ] Capability Name | Domain | Strategic Importance (1–3) | IT Maturity (1–3) | Investment Priority (SI–ITC) | Colour | IT Investment Required
- [ ] [Repeat for all capabilities — typically 50–80 rows]
- [ ] RED capabilities (top investment priorities): [List]
- [ ] AMBER capabilities: [List]
- [ ] GREEN capabilities (maintain/optimise): [List]
- [ ] GREY capabilities (candidates for outsourcing): [List]
- [ ] VALIDATION: IT investment pipeline aligns to Red + Amber capabilities? [Y/N — if N, identify misaligned investments]

## Pitfalls
- Capabilities defined at the wrong granularity — 'IT' as a single capability is too coarse; 'Data entry' is too fine. Target 50–80 capabilities for a mid-size organisation.
- IT team defines capabilities without business input — IT's view of what the business does is invariably incomplete. The capability map must be co-created with business leaders.
- One-time exercise — the map must be refreshed when strategy changes. A 2-year-old capability map drives wrong investment decisions.
