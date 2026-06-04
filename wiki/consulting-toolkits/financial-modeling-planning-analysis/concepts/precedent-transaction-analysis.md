---
type: concept
slug: precedent-transaction-analysis
title: Precedent Transaction Analysis (PTA / Deal Comps)
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Precedent Transaction Analysis (PTA / Deal Comps)

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A market-based valuation method that derives an implied value for a subject company by applying multiples paid in recently completed M&A transactions in the same sector. PTA captures a control premium — the premium a buyer pays to acquire full control of a business — which is absent from CCA (minority-position trading multiples).

**Origin:** Developed in parallel with CCA by investment banks. Codified in 'Investment Banking' by Rosenbaum and Pearl (Wiley, 2009) as a standard component of the M&A valuation toolkit.

## Why it works
What buyers have actually paid in arm's-length control transactions is the most direct evidence of market-clearing value for a controlling position. Precedent transactions embed: (a) the control premium (typically 20–40% above unaffected share price); (b) deal-specific synergy expectations; and (c) the market conditions and M&A cycle at the time of the deal. Together, CCA + PTA bound the valuation range from minority (CCA) to control (PTA).

## When to use
Use PTA when you need to value a business for an acquisition, divestiture, or fairness opinion. PTA is most useful in active M&A sectors with 10+ comparable transactions. In less active sectors, use PTA with wider ranges and more conservative interpretation.

## Visual
`comparison`

## Step-by-step tutorial
1. Define the transaction universe: use Bloomberg M&A, CapIQ, or Dealogic to screen for closed M&A transactions in the same sector in the past 3–5 years. Filter for deal size >$100M (smaller deals have noisier multiples) and deals where financials of the target are disclosed.
2. Collect deal financials: for each transaction, collect the deal EV (enterprise value paid by the acquirer), the target's LTM revenue, LTM EBITDA, and LTM EBIT at the time of the transaction. Do not use forward multiples for PTA — they introduce analyst projection errors.
3. Calculate transaction multiples: EV/LTM Revenue, EV/LTM EBITDA, EV/LTM EBIT for each deal.
4. Calculate the control premium for each deal: (Deal Price per Share − Unaffected Share Price 4 weeks before announcement) / Unaffected Share Price. The unaffected price is the 'clean' baseline before deal rumor leakage.
5. Calculate 25th percentile, median, and 75th percentile multiples across all transactions.
6. Apply multiples to the subject company's current LTM financials to derive implied EV ranges.
7. Adjust for time period: transactions from 3–5 years ago may reflect a different M&A market cycle. If the market has changed significantly (e.g., interest rates have risen 300bps), discount older transactions or weight recent ones more heavily.
8. Present PTA alongside CCA and DCF in a football field chart. PTA multiples should be higher than CCA multiples by the amount of the control premium (typically 20–40%).

## Real-life example — Microsoft acquisition of Activision Blizzard (2023)
Microsoft agreed to acquire Activision Blizzard for $68.7B in January 2022 (closed 2023). At the time, Activision's LTM EBITDA was ~$3.6B, implying an EV/EBITDA deal multiple of ~19×. Comparable gaming sector precedent transactions (Take-Two/Zynga at ~16× EBITDA, Electronic Arts/Glu at ~22× EBITDA) provided a PTA range of 16–22× EBITDA, which placed Microsoft's $68.7B at the mid-to-upper end of the range — suggesting a fair but aggressive price. The control premium was ~45% above Activision's unaffected share price, at the high end of the 20–40% typical range, reflecting Microsoft's strategic imperative to win in gaming.

**So what:** PTA multiples are higher than CCA multiples by design (the control premium). When PTA multiples are significantly below CCA multiples, something unusual is happening — either the CCA peers are overvalued or the transactions had unique distressed conditions.

## Template
Source transaction data from Bloomberg M&A or CapIQ. Fill in deal details and let the multiples calculate automatically.

- [ ] Transaction 1: Target ___ | Acquirer ___ | Close Date ___ | Deal EV $___M | LTM Rev $___M | LTM EBITDA $___M | EV/Rev ___× | EV/EBITDA ___× | Control Premium ___%
- [ ] Transaction 2–15: [repeat above]
- [ ] 25th Percentile EV/EBITDA: ___× | Median: ___× | 75th: ___×
- [ ] Median Control Premium: ___%
- [ ] Subject Company LTM EBITDA: $___M
- [ ] Implied Subject EV (25th–75th): $___M – $___M
- [ ] CCA Median EV/EBITDA: ___× | PTA Median EV/EBITDA: ___× | Implied Control Premium: ___×/___× − 1 = ___%

## Pitfalls
- Using stale transactions (>5 years old) without adjustment — M&A multiples are highly cyclical; a deal in 2021 at 12× EBITDA and a deal in 2023 at 7× EBITDA may reflect credit cycle, not business fundamentals.
- Ignoring the nature of the deal premium — a strategic acquirer paying for synergies can justify a higher multiple than a financial buyer; include both in the analysis but flag which type each transaction represents.
- Confusing the unaffected share price with the deal price — the control premium is calculated off the unaffected price (4 weeks before announcement), not the spot price. Rumor leakage can inflate the 'starting price' and understate the real premium.
