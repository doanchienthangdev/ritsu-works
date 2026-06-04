---
type: concept
slug: scenario-sensitivity-model
title: Scenario and Sensitivity Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Scenario and Sensitivity Analysis

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
Scenario analysis models three or more discrete, internally consistent futures (Base, Upside, Downside) to capture the range of possible outcomes. Sensitivity analysis (data tables / spider charts) varies one assumption at a time to quantify its impact on the output. Together, they replace a false single-point forecast with an honest range.

**Origin:** Scenario analysis formalized by Royal Dutch Shell in the 1970s under Pierre Wack (published in Harvard Business Review, 1985). Sensitivity analysis (tornado charts, spider diagrams) is standard practice in Monte Carlo simulation and decision analysis, formalized in Palisade @RISK and Crystal Ball in the 1990s.

## Why it works
No forecast is correct. The value of scenario and sensitivity analysis is not the accuracy of any individual scenario — it is: (1) forcing explicit documentation of assumptions and their ranges; (2) identifying the 'value drivers' whose uncertainty most affects the outcome; (3) communicating risk honestly to decision-makers rather than presenting false precision.

## When to use
Mandatory for any model that supports a significant investment decision (>$1M NPV), a board presentation, or a financing decision. Never present a single-point forecast to a board or investor — always present a range.

## Visual
`table`

## Step-by-step tutorial
1. Identify the 5–8 most important assumption drivers for your model: typically revenue growth, gross margin, CapEx intensity, WACC, and terminal growth rate. Rank them by estimated impact on NPV.
2. Define three scenarios with explicit, written assumption sets: Downside (what happens in a realistic bad case — recession, key customer loss, cost spike), Base (management's plan), Upside (management's ambition if key bets land). Scenarios must be internally consistent — not 'everything bad' or 'everything good.'
3. In Excel, build a Scenarios tab. Use Excel's Scenario Manager (Data → What-If Analysis → Scenario Manager) to create named scenarios that toggle the Inputs tab automatically.
4. Build a two-variable sensitivity matrix using Excel's Data Table function (Alt+D+T): put WACC values in the row header, terminal growth rates in the column header, and the EV/NPV formula in the top-left cell. Select the range and press Data → What-If Analysis → Data Table.
5. Build a tornado chart: for each key driver, calculate the NPV at the 90th percentile and 10th percentile of that driver (holding all others at Base). Sort drivers by the size of the NPV swing (high to low). The resulting chart looks like a tornado — the widest bar is the most impactful driver.
6. Interpret and present the results: identify the two or three drivers that cause the widest NPV range. For those drivers, ask 'what would have to be true in the real world for this scenario to occur?' This converts the mathematical exercise into a risk management conversation.
7. Document the scenarios in a one-page summary: assumption set for each scenario + headline financial metrics + the 'probability of occurrence' narrative (qualitative, not a single number).

## Real-life example — Netflix (2022 subscriber scenario analysis)
When Netflix reported its first subscriber loss in Q1 2022, investment banks immediately re-ran their Netflix scenario analyses. The Bear (Downside) case modeled continued subscriber erosion through 2024 as password sharing crackdowns deterred re-sign-ups and streaming competition intensified — this implied an EV of ~$60B. The Base case modeled stabilization at 220M subscribers with modest growth post-crackdown — EV ~$90B. The Bull (Upside) case modeled ad-supported tier adoption driving 10M new subscribers in H2 2022 — EV ~$130B. Netflix's actual 2022 EV bottomed at ~$55B (below all three scenarios) before recovering to ~$150B by end-2023 (above the Upside case) — a vivid example of why scenarios must bracket the 'fat tail' outcomes, not just ±10% of the Base case.

**So what:** Scenarios are only useful if the Downside is genuinely uncomfortable and the Upside is genuinely stretching. A scenario analysis where all three cases produce similar outcomes is not an analysis — it is confirmation bias.

## Template
Fill in the assumption sets for each scenario. The model will calculate the financial outputs automatically. Build the sensitivity table last.

- [ ] Driver 1 — Revenue Growth Rate: Downside ___% | Base ___% | Upside ___%
- [ ] Driver 2 — EBITDA Margin: Downside ___% | Base ___% | Upside ___%
- [ ] Driver 3 — CapEx as % of Revenue: Downside ___% | Base ___% | Upside ___%
- [ ] Driver 4 — WACC: Downside ___% | Base ___% | Upside ___%
- [ ] Driver 5 — Terminal Growth Rate: Downside ___% | Base ___% | Upside ___%
- [ ] Scenario narrative — Downside: What happens in the real world to produce these numbers?
- [ ] Scenario narrative — Base: ___
- [ ] Scenario narrative — Upside: ___
- [ ] EV / NPV — Downside: $___M | Base: $___M | Upside: $___M
- [ ] Two-variable sensitivity table: WACC (rows: ___–___%) × Terminal Growth Rate (cols: ___–___%)
- [ ] Tornado chart: Driver with largest NPV swing: ___ | Swing range: $___M to $___M

## Pitfalls
- Building scenarios that are too narrow — if the Downside is only 5% below the Base, the analysis adds no information. The Downside should reflect a genuinely plausible bad outcome (e.g., a macro recession, a competitor entering the market).
- Using the sensitivity table as the only risk communication — a data table full of numbers communicates nothing to a CFO or board. Always translate the sensitivity table into a written risk narrative: 'If WACC rises 2% above our Base (which it would if the Fed raises rates further), EV falls by $300M.'
- Running sensitivity on the wrong drivers — always rank drivers by impact before building the data table; otherwise you spend time analyzing immaterial sensitivities while missing the drivers that actually matter.
