---
type: concept
slug: ma-model
title: Mergers & Acquisitions (M&A) Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Mergers & Acquisitions (M&A) Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A financial model that tests whether a proposed acquisition creates value for the acquirer's shareholders by combining the standalone financial models of the acquirer and target, applying synergies and deal financing, and calculating the pro-forma earnings per share (EPS) and the accretion or dilution to the acquirer's standalone EPS.

**Origin:** Developed by investment banks (Goldman Sachs, Morgan Stanley, JPMorgan) as M&A advisory became a major fee business in the 1980s. Standardized in 'Investment Banking' by Rosenbaum and Pearl (Wiley, 2009).

## Why it works
An acquisition creates value if: (1) the present value of synergies exceeds the control premium paid; and (2) the deal structure (cash, debt, stock) is sustainable for the acquirer's balance sheet. The M&A model tests both. EPS accretion/dilution is a near-term earnings-per-share test that management and boards use as a proxy for shareholder value creation, though it is an imperfect measure (it is accounting-based, not cash-flow-based).

## When to use
Use for any proposed acquisition, merger, or major corporate combination. The M&A model is the primary tool for the acquirer's investment banking advisor and corporate development team to structure, price, and justify a deal to the acquirer's board.

## Visual
`process-flow`

## Step-by-step tutorial
1. Build or import the acquirer's 5-year standalone financial model (three-statement model). Note the acquirer's standalone EPS for each year.
2. Build or import the target's 5-year standalone model. Note the target's LTM EBITDA, revenue, and net income.
3. Define the deal terms: acquisition price (offer price per share × diluted shares = equity value + net debt assumed = enterprise value). Define the premium paid (offer price / unaffected share price − 1).
4. Model the deal financing: (a) Cash portion: how much cash is used from acquirer's balance sheet? (b) Debt portion: how much new debt is raised? At what interest rate? Calculate annual incremental interest expense = new debt × interest rate × (1 − tax rate). (c) Stock portion: how many new acquirer shares are issued? At what exchange ratio? Calculate new diluted share count.
5. Define synergies: (a) Cost synergies (SG&A consolidation, procurement savings, headcount reduction) — typically 2–4% of target revenue; phase in over 18–36 months. (b) Revenue synergies (cross-sell, market expansion) — typically more speculative; only include if highly specific and credible. Build a synergy realization schedule.
6. Build the pro-forma combined P&L: acquirer revenue + target revenue + revenue synergies; acquirer COGS + target COGS − cost synergies; add acquirer and target operating expenses; subtract incremental interest expense from deal debt.
7. Calculate pro-forma EPS: Pro-Forma Net Income / Pro-Forma Diluted Shares (acquirer shares + new shares issued for stock consideration).
8. Calculate accretion / dilution: (Pro-Forma EPS − Acquirer Standalone EPS) / Acquirer Standalone EPS × 100%. Positive = accretive (good for shareholders in the short term). Negative = dilutive (requires a long-term synergy story).
9. Run a premium / synergy crossover analysis: at what synergy level does the deal break even? At what acquisition premium does the deal become dilutive?

## Real-life example — Exxon Mobil acquisition of Pioneer Natural Resources (2023)
ExxonMobil announced its $60B acquisition of Pioneer Natural Resources in October 2023. The M&A model would have shown: Pioneer's standalone LTM EBITDA ~$10B; deal EV/EBITDA ~6× (attractive for a large-cap oil deal). Synergies: Exxon estimated $2B/year in cost and capital synergies (operational efficiencies in the Permian Basin, lower cost of capital for Pioneer's debt). NPV of synergies at 10% WACC = ~$13–15B, vs. control premium paid of ~$8B (Pioneer's unaffected market cap was ~$52B; deal at $60B). The model showed the deal creating value: synergy NPV > control premium, and pro-forma EPS was accretive in Year 2 after synergy phasing. Pioneer's high-quality Permian acreage lowered Exxon's long-run production cost, validating the strategic rationale.

**So what:** A well-built M&A model shows not just accretion/dilution, but the break-even synergy level. If the deal requires $1B/year in synergies to be accretive, management needs to have a credible, specific plan to achieve exactly that — and the model should test what happens if they only achieve 70%.

## Template
Fill in the acquirer and target financial projections, deal terms, synergy assumptions, and financing structure. The model calculates pro-forma EPS and accretion/dilution automatically.

- [ ] Acquirer: Name ___ | Standalone EPS Y1 ___ | Y2 ___ | Y3 ___
- [ ] Target: Name ___ | Offer Price per Share $__ | Diluted Shares ___M | Equity Value $___M | Net Debt $___M | Enterprise Value $___M
- [ ] Premium to Unaffected Price: ___%
- [ ] Deal Financing: Cash $___M | Debt $___M (rate ___%) | Stock ___M new shares
- [ ] Cost Synergies: Year 1 $___M | Year 2 $___M | Year 3 (run rate) $___M
- [ ] Revenue Synergies: Year 1 $___M | Year 2 $___M | Year 3 $___M
- [ ] Incremental Annual Interest Expense: $___M
- [ ] Pro-Forma Net Income Y1 $___M | Pro-Forma Diluted Shares ___M | Pro-Forma EPS Y1 $___
- [ ] Accretion / Dilution Y1: ___% | Y2: ___% | Y3: ___%
- [ ] Break-even synergy level (EPS neutral): $___M/year
- [ ] Synergy NPV (@ WACC ___% over __ years): $___M
- [ ] Control Premium Paid: $___M | Synergy NPV > Premium? [Yes / No]

## Pitfalls
- Over-counting revenue synergies — revenue synergies are speculative and often unrealized; use only synergies with a specific, named mechanism (e.g., 'Target's product sold through Acquirer's 200 enterprise reps'). Cost synergies are more reliable and should be stress-tested at 50% realization in the Downside scenario.
- Ignoring integration costs — synergies are never free; restructuring charges, system integration costs, and management distraction should be modeled as a one-time cash cost against the synergy NPV.
- Using EPS accretion as the only value creation test — EPS is an accounting measure that can be gamed with creative financing. The real test is: does synergy NPV > control premium? An accretive deal that fails this test is actually value-destructive.
