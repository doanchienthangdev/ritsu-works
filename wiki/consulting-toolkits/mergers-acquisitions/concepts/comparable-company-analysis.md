---
type: concept
slug: comparable-company-analysis
title: Comparable Company Analysis (Trading Comps)
source_collection: consulting-toolkits
toolkit: mergers-acquisitions
domain: corp-dev
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Comparable Company Analysis (Trading Comps)

*Category: financial · Toolkit: Mergers & Acquisitions*

## What it is
A relative valuation method that estimates a target company's value by applying the valuation multiples of publicly traded peer companies (EV/EBITDA, EV/Revenue, P/E) to the target's financial metrics.

**Origin:** A standard investment banking technique, codified in Rosenbaum and Pearl's 'Investment Banking' (2009), widely used in M&A since the 1980s.

## Why it works
Markets efficiently price comparable businesses at similar multiples when controlling for growth, margins, and risk. By observing what the market pays for peers, you establish a market-clearing benchmark for the target. The spread between the target's implied multiple and the transaction multiple reveals the control premium being paid.

## When to use
Phase 2 (preliminary valuation football field), Phase 4 (updated valuation post-DD), Phase 7 (sell-side pricing in the management presentation). Always use alongside DCF and precedent transactions — never in isolation.

## Visual
`table`

## Step-by-step tutorial
1. 1. Define the PEER SET: identify 5–10 publicly traded companies that share the target's industry, business model, size range (within 0.5x–2x revenue), and geographic focus. Avoid including companies with major strategic differences.
2. 2. Collect FINANCIAL DATA for each peer: last-twelve-months (LTM) revenue, EBITDA, EBIT, net income. Source from Bloomberg, CapIQ, or SEC filings. Normalize for one-off items.
3. 3. Calculate ENTERPRISE VALUE for each peer: market capitalization + net debt (total debt – cash and equivalents). Use current market data.
4. 4. Calculate MULTIPLES: EV/Revenue (LTM), EV/EBITDA (LTM), EV/EBIT (LTM), P/E (LTM and NTM). Calculate the 25th percentile, mean, median, and 75th percentile for each multiple across the peer set.
5. 5. Apply PEER MULTIPLES to target: apply the peer median (and 25th–75th percentile range) to the target's LTM financials to derive an implied Enterprise Value range.
6. 6. Adjust for CONTROL PREMIUM: in M&A, acquirers pay a premium over trading value (typically 25–40%). Add to the comps-derived trading value to estimate a reasonable acquisition price range.
7. 7. SANITY CHECK: verify the implied multiple range is internally consistent (high EV/EBITDA multiple should correspond to above-median growth and margins).

## Real-life example — Salesforce acquisition of Slack (2021)
Investment banks running comps for Slack used Microsoft Teams, Zoom, and other SaaS collaboration peers. The peer set traded at 20–35x EV/Revenue (reflecting high growth premium). Slack's LTM revenue of ~$900M implied an EV of $18–31.5B at peer multiples. Salesforce paid $27.7B (~30x EV/Revenue), at the high end of the comps range — justified by the control premium and revenue synergy potential from Salesforce's enterprise distribution.

**So what:** Comps set the market's floor price for the asset. The acquisition price will almost always exceed the trading comps value by the control premium. If the required price exceeds 75th percentile comps plus a standard control premium, the deal requires explicit synergy justification — otherwise you are overpaying.

## Template
Build this table in Excel with a separate assumptions tab. Lock peer set and multiples before sensitizing the target's financials.

- [ ] Peer company name | Ticker | Revenue LTM ($M) | EBITDA LTM ($M) | Market Cap ($M) | Net Debt ($M) | Enterprise Value ($M) | EV/Revenue | EV/EBITDA | P/E LTM
- [ ] Peer set summary (25th pct / Median / 75th pct / Mean) for each multiple
- [ ] Target LTM Revenue ($M) | Target LTM EBITDA ($M)
- [ ] Implied Target EV at median EV/EBITDA
- [ ] Implied Target EV at 25th–75th pct range
- [ ] Control premium assumption (%)
- [ ] Implied acquisition price range

## Pitfalls
- Including structurally different peers (e.g., including a hardware company in a SaaS peer set) which distorts the median multiple. Mitigate: define explicit inclusion criteria (revenue mix %, same customer segment, same go-to-market model).
- Forgetting to normalize peer financials for one-off items — a peer with a large restructuring charge in the LTM period will appear cheaper on EV/EBITDA, skewing the median. Mitigate: always use adjusted EBITDA.
