---
type: concept
slug: cap-table-model
title: Capitalization Table (Cap Table) Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Capitalization Table (Cap Table) Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A spreadsheet that lists all equity instruments outstanding — common stock, preferred stock, stock options, warrants, and restricted stock units (RSUs) — along with each holder's ownership percentage, investment amount, and the proceeds each holder receives at various exit valuations (a 'waterfall analysis').

**Origin:** Standard tool in venture capital and startup finance, formalized in legal practices of Silicon Valley law firms (Wilson Sonsini, Cooley) in the 1980s–1990s. Investment banks use cap tables for IPO equity structure and M&A deal structuring.

## Why it works
In companies with complex equity structures (multiple preferred share classes, employee options, convertible notes), basic 'shares outstanding' calculations mask the true ownership economics. The cap table shows who owns what on a fully diluted basis and — critically — what each holder receives at various exit valuations. This matters because preferred stock with liquidation preferences can mean founders and employees receive nothing in a below-expectations exit.

## When to use
Use at any startup fundraising event (to model dilution before accepting term sheets), M&A deal structuring (to understand what each shareholder receives at the deal price), IPO preparation, or equity compensation planning.

## Visual
`table`

## Step-by-step tutorial
1. List all issued and authorized equity instruments: (a) authorized but unissued shares; (b) issued common shares (founders, employees); (c) issued preferred shares (investors, by series); (d) unissued option pool (outstanding options + authorized but ungranted); (e) warrants; (f) convertible notes (note the conversion cap and discount).
2. Calculate basic shares outstanding: all issued common + all issued preferred (as-converted). Calculate fully diluted shares: basic + all unvested options + all warrants + convertible note shares.
3. Calculate % ownership on both a basic and fully-diluted basis for each holder.
4. Model the liquidation waterfall for an exit event: (a) repay any debt or convertible notes at the conversion price; (b) pay liquidation preferences to preferred shareholders in order of priority (Series B before Series A is common in downside scenarios if 'stack' preferences apply); (c) distribute residual proceeds to common shareholders pro-rata.
5. Build a waterfall table at 5–6 exit values ($5M, $10M, $25M, $50M, $100M, $500M) showing what each holder receives in dollars and as a % of exit proceeds.
6. Identify the 'crossover point': the exit value at which common shareholders begin to receive more per share than preferred shareholders on an as-converted basis. Below this point, preferred shareholders have an economic advantage; above this point, they convert to common.
7. Model the dilution impact of future financing rounds: if the company raises a Series C at a pre-money valuation of $X, how many new shares are issued? What is the post-money ownership of existing holders? Show the 'before' and 'after' cap table.

## Real-life example — Instacart (Maplebear) IPO (2023)
When Instacart filed for its IPO in 2023, its cap table showed the consequences of raising $2.7B across multiple funding rounds at valuations peaking at $39B during 2021. By the time of the IPO, the preferred shareholders (primarily Sequoia, D1 Capital, and Softbank) held shares with liquidation preferences that would absorb the first $2.7B of any exit below the peak valuation. Instacart's IPO priced at $30/share ($9.9B market cap) — a 75% discount from the peak valuation — meaning common shareholders (employees and founders) received significantly less than their notional equity grant values suggested. The cap table waterfall model, built correctly, would have predicted this outcome at IPO pricing.

**So what:** The cap table is not just administrative bookkeeping — it is the answer to 'who actually gets rich at what exit value?' Founders and employees who do not model the liquidation waterfall can be economically surprised by a 'successful' exit that returns nothing to common shareholders.

## Template
List all equity holders and instruments. Fill in liquidation preferences and conversion terms. The waterfall calculates automatically at each exit value.

- [ ] Total Authorized Shares: ___
- [ ] Common Stock: Founder 1: ___shares | Founder 2: ___shares | Employee pool: ___shares
- [ ] Preferred Stock Series A: ___shares | Liquidation Preference per share: $___ | Participating? [Yes/No]
- [ ] Preferred Stock Series B: ___shares | Liquidation Preference per share: $___ | Participating? [Yes/No]
- [ ] Stock Options Outstanding: ___shares | Weighted avg. exercise price: $___
- [ ] Warrants: ___shares | Exercise price: $___
- [ ] Convertible Notes: $___M | Conversion cap: $___ | Discount: ___%
- [ ] Basic Shares Outstanding: ___
- [ ] Fully Diluted Shares: ___
- [ ] Waterfall at $25M exit: Preferred gets $___M | Common gets $___M
- [ ] Waterfall at $100M exit: Preferred gets $___M | Common gets $___M
- [ ] Waterfall at $500M exit: Preferred gets $___M | Common gets $___M
- [ ] Conversion crossover point: $___M exit

## Pitfalls
- Ignoring anti-dilution provisions — 'broad-based weighted average' anti-dilution clauses require re-pricing earlier preferred series in a down round, which further dilutes common shareholders; this must be modeled in the cap table.
- Confusing basic and fully diluted ownership — basic ownership overstates founders' economic position if there is a large option pool; always present both.
- Not modeling the 'waterfall' from liquidation preferences — companies with stacked liquidation preferences from multiple rounds can have a scenario where even a $50M exit returns nothing to common shareholders despite them technically owning 30% of the company.
