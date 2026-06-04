---
type: concept
slug: impact-effort-matrix
title: Impact vs. Effort Matrix (Initiative Prioritization)
source_collection: consulting-toolkits
toolkit: supply-chain-strategy
domain: operations
category: planning
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Impact vs. Effort Matrix (Initiative Prioritization)

*Category: planning · Toolkit: Supply Chain Strategy*

## What it is
A 2×2 portfolio tool that plots improvement initiatives on strategic impact (vertical) versus implementation effort/complexity (horizontal), producing four action categories: Quick Wins, Strategic Bets, Fill-Ins, and Low-Value Burdens. Used to sequence a transformation roadmap.

**Origin:** A widely-used management tool without a single attributed origin. Variations appear as the Eisenhower Matrix (urgency/importance, 1950s), the GE-McKinsey Initiative Prioritization approach, and the Lean 'impact/effort' sprint planning tool. The supply-chain-strategy version is standard in transformation program design.

## Why it works
Resource constraints are the governing reality of every transformation — no organization can do everything at once. The Impact vs. Effort Matrix forces explicit trade-off decisions: high-impact/low-effort initiatives (Quick Wins) should be scheduled first to build momentum and demonstrate value; high-impact/high-effort initiatives (Strategic Bets) require careful sequencing, full resourcing, and executive sponsorship; low-impact initiatives should be deprioritized or dropped. Dependencies between initiatives (a technology platform must precede process redesign initiatives that depend on it) are overlaid as a second filter.

## When to use
Use in Phase V after all business cases have been approved to sequence the implementation roadmap. Also useful mid-transformation when new initiatives emerge and must be integrated into an existing portfolio.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. 1. List all approved initiatives from Phase IV: each initiative entering this analysis has an approved business case (NPV, IRR, benefit profile) and a risk register.
2. 2. Score Strategic Impact for each initiative (1–10): how significantly does this initiative advance the Phase I strategic objectives? How large is the KPI improvement it drives (use the benefit model from Phase IV as input)? Score 10 = addresses a top-priority objective with a ≥10pp KPI improvement; Score 1 = marginal impact on a secondary objective.
3. 3. Score Implementation Effort for each initiative (1–10): combine implementation cost, calendar time to benefit realization, organizational disruption (headcount affected, process change intensity), and technology complexity. Score 10 = >$20M investment, >24 months to benefit, high disruption; Score 1 = <$1M, <6 months, minimal disruption.
4. 4. Plot each initiative on the 2×2 using Impact (vertical) and Effort (horizontal). Use bubble size to represent NPV magnitude.
5. 5. Assign quadrant labels: Quick Wins (top-left), Strategic Bets (top-right), Fill-Ins (bottom-left), Low-Value Burden (bottom-right). For borderline cases, bias toward higher effort (conservative resourcing).
6. 6. Overlay initiative dependencies: draw arrows between initiatives where one must precede the other. Dependencies frequently pull Quick Wins into Year 1 ahead of Strategic Bets that rely on them (e.g., a data platform initiative must complete before AI-enabled planning can be implemented).
7. 7. Build the sequencing: Year 1 = all Quick Wins + critical dependency enablers; Year 2 = first wave of Strategic Bets; Year 3 = second wave of Strategic Bets. Fill-Ins are inserted when PMO bandwidth allows.
8. 8. Present the prioritized sequence to the Steering Committee with explicit rationale for each sequencing decision. Document all Low-Value Burden decisions with the reasoning so they can be revived if circumstances change.

## Real-life example — Procter & Gamble
During P&G's supply chain transformation under CSCO Yannis Skoufalos (2012–2018), P&G used an explicit impact-effort prioritization to sequence its 'Supply Chain 2020' initiative portfolio. Quick Wins in Year 1 included standardizing supplier data formats (low effort, enabled many downstream initiatives) and consolidating regional 3PL contracts (immediate cost savings, low complexity). The Strategic Bets — including end-to-end supply chain digitization with a unified control tower and AI-driven demand sensing — were sequenced for Years 2–4 because they depended on the data infrastructure Quick Wins. By front-loading the Quick Wins, P&G generated $500M in Year 1 savings that funded and politically justified the larger Strategic Bets. The control tower initiative, which took 3+ years and hundreds of millions in investment, was deployed with organizational credibility because early wins had already proven the transformation's value.

**So what:** Quick Wins are not just about cost savings — they are about building the organizational credibility and political capital that allows the Steering Committee to invest in the Strategic Bets. Front-load them deliberately.

## Template
For each approved initiative, complete the scoring table. Then plot on the 2×2 (or use the quadrant assignment column) and sequence into the roadmap waves (Year 1/2/3).

- [ ] Initiative Name
- [ ] Pillar (D&SP / S&P / Manufacturing / L&D)
- [ ] NPV ($M) from Phase IV
- [ ] Strategic Impact Score (1–10)
- [ ] Implementation Effort Score (1–10)
- [ ] Quadrant (Quick Win / Strategic Bet / Fill-In / Low-Value Burden)
- [ ] Key Dependencies (other initiatives that must precede this one)
- [ ] Proposed Roadmap Wave (Year 1 / Year 2 / Year 3)
- [ ] Rationale for Sequencing
- [ ] Initiative Owner

## Pitfalls
- Scoring bias toward Quick Wins: initiative owners consistently underestimate effort and overestimate impact for their own initiatives. Use cross-functional scoring panels and challenge sessions to counter this.
- Ignoring dependencies: sequencing purely on the 2×2 without overlaying dependencies produces a roadmap that is theoretically optimal but practically impossible — critical enabling initiatives may be delayed because they scored as 'Fill-Ins' on impact alone.
- No Low-Value Burden decisions: if nothing gets dropped, the matrix has not done its job. Every transformation has initiatives that survive political pressure but deliver negligible value. The matrix must be used to say no.
- Treating the sequence as fixed: the roadmap built from this matrix must be reviewed quarterly. New information (technology changes, market shifts, resource constraints) will require re-sequencing.
