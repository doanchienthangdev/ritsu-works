---
type: concept
slug: sales-costs-analysis
title: Sales and Costs Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Sales and Costs Analysis

*Category: analysis · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A granular decomposition of revenue by product, customer, channel, and geography — and of costs by nature, behavior (fixed vs. variable), and driver — to identify the Pareto-highest revenue sources, the margin structure by segment, and the top cost reduction levers.

**Origin:** Activity-Based Costing (Robert Kaplan and Robin Cooper, Harvard Business School, 1987) provided the conceptual framework for granular cost attribution. Pareto analysis (Vilfredo Pareto's 80/20 rule, 1896) applied to revenue analysis is a standard FP&A diagnostic. McKinsey's cost disaggregation methodology is the consulting application.

## Why it works
Aggregate P&L analysis hides the distribution of profitability. A company with 15% EBITDA margin overall may have 35% margin products subsidizing 5% margin products — and be unaware of it. The sales and costs analysis reveals this distribution, enabling management to allocate resources to high-margin segments and rationalize or fix low-margin segments.

## When to use
Use in Phase 2, Step 5 as part of the financial analysis. Also use any time gross margin is deteriorating, when considering portfolio rationalization, or when setting up an Activity-Based Costing system.

## Visual
`staircase`

## Step-by-step tutorial
1. Pull revenue data from ERP/CRM by product SKU or product family, customer or customer segment, sales channel (direct, distribution, e-commerce), and geography (country, region). This is the raw material for the Pareto analysis.
2. Build the 80/20 revenue Pareto: rank products/customers/SKUs from highest to lowest revenue. Identify the 20% that drive 80% of revenue. Flag any product or customer that is in the top-20% of revenue but bottom-20% of margin — these are the 'volume traps.'
3. Calculate contribution margin by segment: Revenue − Variable Costs (COGS directly attributable to the segment). This is the true profitability of each segment before any fixed cost allocation.
4. Build a cost waterfall: break total cost into (a) variable costs (scale with revenue); (b) fixed costs (step-fixed: scale with capacity, not revenue); (c) allocated overhead (corporate allocations). Identify the 5 largest cost line items by absolute value — these are the highest-leverage cost reduction opportunities.
5. Separate cost behavior: fixed vs. variable vs. semi-variable. Variable costs (direct materials, freight) can be reduced by volume reduction or procurement. Semi-variable costs (utilities, labor with overtime) can be reduced by operational efficiency. Fixed costs (rent, depreciation) can only be reduced by structural changes (facility consolidation, asset disposal).
6. Identify the top 5 cost levers: for each of the 5 largest cost categories, calculate the 'cost per unit' metric (e.g., 'direct labor hours per unit = 2.3 hours vs. best-in-class benchmark of 1.8 hours — a 22% opportunity'). Quantify the financial impact of closing the gap.
7. Write a one-page segment profitability summary: rank segments (products/customers/channels) by EBIT contribution margin. Identify the segments to grow, defend, fix, and exit.

## Real-life example — Nestlé portfolio rationalization (2017–2021)
When Mark Schneider joined as Nestlé CEO in 2017, he ran a sales and costs analysis across Nestlé's 2,000+ SKU portfolio. The analysis revealed: 200 SKUs generated 80% of gross profit; the remaining 1,800 generated breakeven or negative margins after full cost allocation. Nestlé's operating complexity (managing 1,800 marginal SKUs) was consuming disproportionate SG&A and supply chain overhead. The response: divest or discontinue ~100 brands and focus capital on premium food + nutrition (Starbucks licensing, Purex, dietary supplements). Between 2017–2021, Nestlé's trading operating profit margin improved from 15.3% to 17.4% primarily through portfolio rationalization — revenue actually fell but profit quality improved.

**So what:** Sales and costs analysis almost always reveals that 20% of products generate 80% of profit — and that the 80% of products generating 20% of profit are consuming disproportionate management time and operating overhead. The decision to rationalize the long tail is rarely obvious without the data.

## Template
Pull revenue and cost data from ERP by product/customer/channel. Build Pareto charts and contribution margin tables.

- [ ] Revenue by Product (top 10): Product ___ | Revenue $___M | Contribution Margin ___% | % of Total Revenue ___%
- [ ] Pareto: Top 20% of SKUs by revenue: $___M (___% of total) | Top 20% EBIT contribution: $___M
- [ ] Revenue by Channel: Direct ___% | Distribution ___% | E-commerce ___% | Contribution margin by channel: ___%, ___%, ___%
- [ ] Revenue by Geography: Region 1 ___% | Region 2 ___% | Margin by region: ___%, ___%
- [ ] Cost Waterfall: COGS $___M | SG&A $___M | R&D $___M | Fixed overhead $___M | Variable costs $___M
- [ ] Top 5 Cost Categories: 1.___ $___M | 2.___ $___M | 3.___ $___M | 4.___ $___M | 5.___ $___M
- [ ] Top 5 Cost Levers: 1. Lever ___ | Current cost/unit: ___ | Benchmark: ___ | Saving: $___M
- [ ] Segment Action Plan: Grow: ___ | Defend: ___ | Fix: ___ | Exit: ___

## Pitfalls
- Analyzing revenue without margin — high-revenue products with low or negative contribution margins are a trap; always pair revenue with margin data in the analysis.
- Using accounting cost allocation instead of causal cost attribution — accountants allocate overhead by formula (e.g., % of revenue); Activity-Based Costing traces costs to actual activities that drive them (e.g., number of customer orders). Only ABC reveals the true cost of complexity.
- Rationalizing the long tail without a customer retention analysis — eliminating marginal SKUs can lose anchor customers who buy them alongside high-margin products; always model the customer retention impact before SKU rationalization.
