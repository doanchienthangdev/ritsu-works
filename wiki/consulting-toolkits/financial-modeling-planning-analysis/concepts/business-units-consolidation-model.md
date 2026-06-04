---
type: concept
slug: business-units-consolidation-model
title: Business Units Consolidation Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Business Units Consolidation Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A group-level financial model that aggregates the standalone P&L (and optionally balance sheet and cash flow) of each business unit or subsidiary, eliminates intercompany transactions, and produces a consolidated group view. Essential for multi-BU CFOs who need to understand group performance and allocate capital across BUs.

**Origin:** Derived from IFRS 10 / GAAP ASC 810 consolidation accounting standards. Modeled practice codified in 'Financial Modeling' by Simon Benninga (MIT Press) and by investment banking training programs for multi-subsidiary M&A analysis.

## Why it works
A group's consolidated P&L tells you whether the group is making money; a BU-by-BU P&L tells you which businesses are making money, which are destroying value, and which are cross-subsidizing which. Capital allocation decisions require BU-level visibility. Consolidation eliminates double-counting: if BU1 sells to BU2, that revenue and cost must be eliminated so the group counts it only once.

## When to use
Use whenever you need to understand the profitability of individual business units within a group, for capital allocation decisions, M&A target analysis (identifying which BUs to acquire or divest), or post-merger integration financial tracking.

## Visual
`table`

## Step-by-step tutorial
1. Collect the standalone P&L model for each BU / subsidiary for the same time period (monthly or annual). Ensure all BUs use the same chart of accounts and accounting periods.
2. Identify all intercompany transactions: BU1 selling goods or services to BU2, central allocations from corporate, shared services charges. Document each intercompany flow with the originating BU, receiving BU, and amount.
3. Build the consolidation model in Excel: create one tab per BU, one 'Corporate/Central' tab, and one 'Eliminations' tab. The Group Summary tab pulls from all BU tabs.
4. Apply the intercompany eliminations in the Eliminations tab: for each intercompany transaction, enter a negative entry (elimination) that exactly reverses the gross-up at the BU level. For BU1→BU2 sales of $100M: Eliminate Revenue in BU1 column: −$100M. Eliminate COGS in BU2 column: −$100M.
5. Build the group total: Group Revenue = Sum(all BU revenues) + Sum(eliminations). Check: the eliminations should net to zero at the profit line (only timing and unrealized profit must be eliminated below gross profit in GAAP accounting).
6. Allocate corporate overhead to BUs using a consistent allocation methodology (revenue-based, headcount-based, or asset-based). Document the methodology — this is the most contentious step and will be challenged by BU heads.
7. Calculate BU-level profitability metrics: BU EBITDA margin, BU ROIC (requires a balance sheet split by BU). These metrics drive capital allocation: BUs with ROIC > WACC receive more capital; BUs with ROIC < WACC are candidates for restructuring or divestiture.

## Real-life example — General Electric under Larry Culp (2018–2023)
When Larry Culp became GE CEO in October 2018, one of his first actions was building a transparent BU-by-BU P&L model to understand which businesses were actually profitable. The previous GE Capital cross-subsidies had masked the underperformance of GE's industrial businesses. The consolidation model revealed: GE Power was generating negative EBITDA due to long-term service contract losses; GE Aviation was the primary value-creator; GE Capital was a liability at its leverage levels. This BU-level clarity enabled Culp to divest non-core businesses (GE Biopharma to Danaher for $21B, GE Capital Aviation Services, Baker Hughes), restructure GE Power, and focus capital on GE Aviation and Renewable Energy — resulting in a 3-way split into standalone companies (GE Aerospace, GE Vernova, GE HealthCare) by 2024.

**So what:** A consolidation model without BU-level transparency hides value destruction. The moment you can see each BU's true EBITDA and ROIC, capital allocation becomes simple: fund the winners, fix or exit the losers.

## Template
Enter each BU's standalone P&L and identify all intercompany transactions. The consolidation sums and eliminations calculate automatically.

- [ ] BU 1: Name ___ | Revenue $___M | Gross Profit $___M | EBITDA $___M | EBITDA Margin ___% | Interco Revenue to BU2 $___M
- [ ] BU 2: Name ___ | Revenue $___M | Gross Profit $___M | EBITDA $___M | EBITDA Margin ___% | Interco Purchases from BU1 $___M
- [ ] BU 3–N: [repeat above]
- [ ] Corporate Central Costs: $___M | Allocation method: ___
- [ ] Interco Eliminations: Revenue −$___M | COGS −$___M | Net P&L impact: $___M (should be 0)
- [ ] Group Total Revenue: $___M | EBITDA: $___M | EBITDA Margin: ___%
- [ ] BU ROIC check: ROIC(BU1) ___% vs. WACC ___% = [Value creating / Destroying]

## Pitfalls
- Allocating corporate costs arbitrarily to BUs — if allocation methodology changes, BU performance appears to change even if nothing operationally changed. Use a rule-based, consistent allocation method and document it in the model.
- Not eliminating all intercompany transactions — a missed intercompany flow inflates group revenue and gross profit; this is a reportable error in audited financials.
- Treating the group EBITDA margin as representative — a 15% group EBITDA margin that hides a 2% margin BU and a 30% margin BU is a fundamentally different business than one where all BUs run at 15%.
