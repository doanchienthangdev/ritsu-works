---
type: concept
slug: technology-selection-matrix
title: Analytics Technology Selection Matrix
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Analytics Technology Selection Matrix

*Category: architecture · Toolkit: Data Analytics & AI Strategy*

## What it is
A scoring matrix for objectively evaluating and selecting the tools for each layer of the analytics technology stack — preventing technology decisions driven by vendor relationships, hype, or the technical team's personal preferences rather than business requirements.

**Origin:** A consulting standard derived from Gartner's Magic Quadrant evaluation methodology and the structured vendor-selection approach used in enterprise software procurement. Applied to analytics stack selection by Andreessen Horowitz and the Modern Data Stack community (2021–2024).

## Why it works
The analytics tools market in 2024 is crowded and noisy: every tool claims to do everything, vendor marketing is sophisticated, and the technical team has strong personal preferences. A selection matrix forces an objective evaluation by separating requirements (derived from the use-case portfolio) from evaluation (which tool best meets the requirements) and prevents the most expensive mistake: choosing a tool that the team cannot operate or that does not solve the actual business problem.

## When to use
In Phase 2 (building Pillar 3: Analytics Tools & Techniques) when selecting the tooling stack. Also use when re-evaluating existing tools at the annual strategy review.

## Visual
`table`

## Step-by-step tutorial
1. Define the requirements for each stack layer from the use-case portfolio: ingestion (which source systems, what latency, what formats?), transformation (what scale, what transformation complexity?), storage (what query patterns, what data volume?), orchestration (what complexity of DAGs?), BI/visualisation (what user personas, self-service or governed?), ML platform (what scale of experimentation?).
2. Identify 3–5 candidate tools per layer from a market scan (not from vendor meetings — vendor meetings bias the evaluation). Use Gartner Peer Insights or StackShare for unbiased practitioner reviews.
3. Run a structured proof of concept (PoC) for the top-2 candidates per layer: load real company data (not toy data), test against the actual use-case requirements, and time the critical operations.
4. Score each candidate on the six evaluation criteria. The weights reflect the organisation's priorities — a small team with limited engineering capacity should weight 'team skillset fit' at 30%, not 20%.
5. Conduct a 3-year total cost of ownership analysis including: licensing (per-user or usage-based), compute costs, integration development cost, and training cost. TCO often reverses the apparent 'cheapest' option.
6. Document the final decision in an Architecture Decision Record (ADR): chosen tool, weighted scores for all candidates, alternatives rejected and reasons. The ADR is the defence when the decision is revisited in 18 months.

## Real-life example — Shopify
Shopify's data platform selection process evaluated Snowflake vs BigQuery vs Redshift for their analytical warehouse in 2020. They ran structured PoCs with real production data: Snowflake won on query performance for their specific query patterns (complex JOINs across large tables) and on time-to-productivity for their analytics engineering team (dbt integration maturity), despite being 15% more expensive in TCO than BigQuery. The ADR documented the decision with scored criteria and prevented a costly re-evaluation when a new CTO joined 18 months later and questioned the choice.

**So what:** A scored, documented tool selection process creates organisational memory that survives leadership changes and prevents expensive re-evaluation cycles driven by new stakeholder preferences.

## Template
Complete one matrix per stack layer. Define requirements before evaluating tools. Document the ADR with all scores and rationale.

- [ ] Stack layer (ingestion / transformation / storage / orchestration / BI / ML platform)
- [ ] Requirements: what must the tool do? (from use-case portfolio, not from tool feature list)
- [ ] Candidate tools (3–5): name, version, pricing model
- [ ] PoC conducted: Y/N; what data was used; what was tested
- [ ] Criterion scores per candidate (capability fit / team skillset / TCO / vendor maturity / integration / scalability)
- [ ] Weighted total per candidate
- [ ] Selected tool + rationale
- [ ] Alternatives rejected + reasons
- [ ] ADR date and approver

## Pitfalls
- Letting vendors run the evaluation: counter: the evaluation criteria and weights must be defined before vendor demos, not during them. Vendors will tune their demos to score well on whatever criteria they hear you mention.
- Choosing the tool the technical team prefers personally: counter: the selection matrix is designed to surface the team's preferences as legitimate inputs (team skillset fit criterion) while ensuring business requirements get the dominant weight.
- Ignoring TCO: counter: a 'free' open-source tool with a $500K/year engineering cost to operate is not free. Model the 3-year TCO including human cost.
