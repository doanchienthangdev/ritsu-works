---
type: concept
slug: weill-ross-it-operating-model
title: Weill-Ross IT Operating Models (4 Archetypes)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Weill-Ross IT Operating Models (4 Archetypes)

*Category: architecture · Toolkit: Digital Transformation & IT Strategy*

## What it is
A framework developed by Peter Weill and Jeanne Ross at MIT Sloan CISR that classifies IT operating models into four archetypes based on the degree of business process standardisation (low/high) and business unit integration (low/high), providing a structured basis for selecting the right IT governance and architecture approach.

**Origin:** Peter Weill and Jeanne Ross, MIT Sloan Center for Information Systems Research (CISR), published in 'IT Governance: How Top Performers Manage IT Decision Rights for Superior Results' (Harvard Business Press, 2004). Based on research into 300+ enterprises globally.

## Why it works
There is no universally correct IT architecture — the right architecture depends on the business operating model. A business that operates highly standardised processes across all its business units (e.g., McDonald's, Zara) needs a different IT architecture than a conglomerate with autonomous divisions (e.g., Berkshire Hathaway, GE). The Weill-Ross framework makes this explicit: the degree of process standardisation and business unit integration required by the business strategy determines which of four archetypes is correct. Applying the wrong archetype creates either over-centralised IT that stifles business unit autonomy, or under-integrated IT that cannot support cross-business-unit processes.

## When to use
Use in Phase IT-II Step 1 (Design and Implement the IT Operating Model) as the first decision in the IT strategy implementation. The operating model selection is the foundation for all subsequent IT architecture and governance decisions.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. 1. Understand the business operating model: analyse the degree to which business processes are standardised across business units (or must be), and the degree to which business units must share data or transact with each other.
2. 2. Classify the current operating model: plot the business on the 2×2 grid based on current standardisation and integration levels. This is the 'as-is' position.
3. 3. Classify the target operating model: based on the corporate strategy (e.g., 'We are moving from a portfolio of independent brands to an integrated enterprise'), determine where the business needs to be. This is the 'to-be' position.
4. 4. Understand the IT implications of the target model: each archetype has specific IT architecture requirements — Diversification (federated IT, minimal shared services), Coordination (shared data layer, autonomous applications), Replication (shared platform with configurable templates), Unification (single integrated platform).
5. 5. Design the IT Operating Model: based on the target archetype, design the IT governance structure (centralised vs. federated), the IT organisation (IT at centre vs. embedded in business units), and the IT architecture principles (standardise vs. allow variation).
6. 6. Plan the transition: if moving from Diversification to Coordination (a common digital transformation pattern), plan the data integration initiatives required. Moving to Unification requires significant ERP consolidation — the most complex and expensive transition.
7. 7. Validate with business leaders: the IT Operating Model selection has significant implications for business unit autonomy. Business unit leaders who prefer autonomy will resist moves towards Replication or Unification. The conversation must be explicit about the business model intent.

## Real-life example — Procter & Gamble (P&G)
P&G operated historically as a Diversification model (autonomous brands, separate marketing and supply chain teams). In the early 2000s, P&G's CEO A.G. Lafley drove a move toward a Unification model: standardising supply chain processes globally (one S/4HANA ERP across 70 countries), sharing customer data across brands (one data platform), and unifying IT infrastructure. The IT implications were massive: a decade-long ERP standardisation programme, a global data warehouse, and a shift from IT embedded in business units to a centralised global IT function. The payoff: P&G's cost of IT fell from approximately 1.4% of revenue to 0.8% of revenue, and the supply chain efficiency improvements generated >$1B in annual savings. The Unification model enabled the data transparency that made P&G's supply chain one of the most efficient in FMCG.

**So what:** The IT Operating Model is not an IT decision — it is a business strategy decision about how much the company wants to standardise and integrate its business processes. The CIO can propose but cannot decide; the CEO must own the operating model choice because it determines business unit autonomy.

## Template
Score the business on standardisation and integration. Select the appropriate archetype. Document the IT implications and the transition requirements.

- [ ] Business Standardisation Level: How standardised are processes across business units? (1=highly varied; 5=identical) Score: [X]
- [ ] Business Integration Level: How much do business units share data and transact with each other? (1=fully autonomous; 5=fully integrated) Score: [X]
- [ ] Current IT Operating Model archetype: [Diversification / Coordination / Replication / Unification]
- [ ] Target IT Operating Model archetype (based on business strategy): [Diversification / Coordination / Replication / Unification]
- [ ] Rationale for target selection: [Fill in]
- [ ] IT Architecture implications of target model: [Fill in]
- [ ] IT Governance structure required: [Centralised / Federated / Hybrid — describe]
- [ ] Key transition initiatives required to move from current to target: [List 3–5]
- [ ] Business unit autonomy implications: [Describe impact on each business unit]
- [ ] CEO/Business Leader endorsement of operating model choice: [Y/N — if N, do not proceed]

## Pitfalls
- IT deciding the operating model alone — the Weill-Ross model is a business design decision with IT implications; the CEO must own it, not the CIO.
- Moving to Unification too quickly — Unification (one process, one system) is the most efficient but most disruptive archetype; attempts to jump from Diversification to Unification in 18 months typically fail due to business unit resistance and implementation complexity.
- Hybrid confusion — organisations that say 'we want some standardisation but also unit autonomy' are choosing Coordination; that is a valid archetype, but it must be consciously chosen and its IT requirements (shared data layer) must be resourced.
