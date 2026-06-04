---
type: concept
slug: it-guiding-principles
title: IT Guiding Principles
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# IT Guiding Principles

*Category: architecture · Toolkit: Digital Transformation & IT Strategy*

## What it is
A set of 8–12 declarative principles that govern all IT decisions made in the organisation — defining how IT behaves, what it prioritises, and what trade-offs it makes by default — approved by IT leadership and business stakeholders.

**Origin:** Enterprise architecture best practice; formalised in TOGAF ADM Preliminary Phase. Standard practice in McKinsey, Accenture, and Gartner-led IT strategy engagements from the 2000s. The 'Cloud-first', 'API-first', 'Security by design' principles emerged as industry standards from approximately 2015.

## Why it works
Without explicit guiding principles, every IT decision is made on an ad-hoc basis, resulting in inconsistent architecture and unnecessary rework. Principles encode the organisation's values and strategic priorities into decision rules: when a team faces a choice between building bespoke or buying a product, the 'Buy before build' principle resolves the debate without escalation.

## When to use
Use in Phase IT-I Step 8 (IT Guiding Principles) as part of the IT Strategy. The principles then govern all Phase IT-II and IT-III decisions.

## Visual
`table`

## Step-by-step tutorial
1. 1. Derive from IT Vision and business strategy: each principle should trace to the IT Vision or a specific business requirement.
2. 2. Use the structure: Principle (positive statement), Rationale (why this is important), Implication (what changes in how decisions are made).
3. 3. Draft 12–15 candidates. Narrow to 8–12 by removing overlapping or redundant principles.
4. 4. Test against real recent decisions: apply each candidate principle to a recent IT decision. If the principle would have led to a different decision, it is genuinely impactful.
5. 5. Validate with IT leadership and key business stakeholders: principles that IT endorses but business rejects will not be followed.
6. 6. Publish with the Architecture Principles: the Guiding Principles apply to all IT decisions; the Architecture Principles (TOGAF) apply specifically to architecture decisions. They should be consistent.
7. 7. Reference in all IT governance decisions: the Architecture Review Board and CAB should explicitly reference relevant principles in their decision records.
8. 8. Review annually: principles become outdated as strategy evolves (e.g., a 'Cloud-first' principle becomes 'Cloud-native' as legacy systems are retired).

## Real-life example — Google (Cloud-first internal principle)
Google's internal IT (Google IT) operates under the explicit principle 'Everything runs on Google infrastructure.' This principle: eliminates evaluation time for infrastructure decisions (the answer is always GCP), creates an alignment between internal IT and Google Cloud product quality (internal users find bugs before customers do), and signals to employees that Google's own products are production-quality. The principle has organisational implications (internal IT teams must be skilled in GCP) and commercial implications (Google's internal usage is the best marketing case for GCP).

**So what:** The most effective IT Guiding Principles are sufficiently specific to change behaviour. 'Cloud-first' may be too vague (cloud of which provider?). 'Default to GCP for all new infrastructure; on-premise requires CIO approval' is specific enough to govern real decisions.

## Template
Define 8–12 IT Guiding Principles. For each, provide the principle statement, rationale, and implication for decision-making.

- [ ] Principle 1: [Cloud-first] | Rationale: [Lower capex; faster deployment; better scalability] | Implication: [New services default to cloud; on-premise requires CIO approval]
- [ ] Principle 2: [API-first] | Rationale: [Enables integration and ecosystem] | Implication: [All new systems expose APIs; point-to-point integrations prohibited]
- [ ] Principle 3: [Security by design] | Rationale: [Reduces cost of security incidents] | Implication: [Security review at design stage, before build begins]
- [ ] Principle 4: [Buy before build] | Rationale: [Reduces time to value] | Implication: [Internal build requires CIO approval and documented differentiator justification]
- [ ] Principle 5: [Standardise before customise] | Rationale: [Reduces complexity] | Implication: [Vendor standard configuration preferred; customisation requires ARB approval]
- [ ] [Add principles 6–12]
- [ ] Validation: Each principle tested against recent IT decisions (Y/N) | Business stakeholder endorsement (Y/N)

## Pitfalls
- Too many principles — beyond 12, principles are not memorised and therefore not applied.
- Principles without implications — a principle without its decision implication is a statement of aspiration, not a decision rule.
