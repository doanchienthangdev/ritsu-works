---
type: idea
slug: ritsu-break-even-freemium
title: "Apply Break-Even + Contribution to Ritsu Freemium"
summary: "Ritsu's freemium: fixed costs (infra, employee, baseline Anthropic) + variable costs (per-active-user tokens). Free users = 0 revenue, nonzero variable cost. Contribution computed only on paying users. Break-even paying-user count = Monthly fixed costs / (ARPU - Variable cost per paying user). NMC excludes overhead. ROMI on paid acquisition channels computed monthly."
parent_book: principles-of-marketing-kotler
extracted_from_source: principles-of-marketing-kotler__chapter-22-appendix-2-marketing-by-the-numbers
source_chunk_index: 12
book_pages:
  - 622
  - 633
confidence: 0.87
review_state: auto_accepted
llm_model: claude-sonnet-4-6
see_also:
  - break-even-analysis
  - contribution-margin
  - marketing-roi-romi
  - cost-plus-pricing
license_status: copyrighted_internal_only
ingestion_job_id: "92654d10-1066-4af6-9d42-e9349f94eff4"
parent_ingestion_job_id: "31c61e23-d632-4452-802c-d34c9c5083c2"
generated_by: "wiki-sync v4.0 distill (Sonnet subagent, batch 5 — Ch 17-23 final)"
---

<!-- generated-by: wiki-sync v4.0 distill -->

# Apply Break-Even + Contribution to Ritsu Freemium

> **Source.** [Chapter 22](../chapters/chapter-22-appendix-2-marketing-by-the-numbers.md), book pp. 622–633, chunk 12 (confidence 0.87, auto-accepted).
>
> "Break-even volume = fixed costs / (price - unit variable cost)"
>
> — Kotler/Armstrong/Opresnik, *Principles of Marketing* (18e Global, Pearson 2021)

## Summary

Ritsu's freemium: fixed costs (infra, employee, baseline Anthropic) + variable costs (per-active-user tokens). Free users = 0 revenue, nonzero variable cost. Contribution computed only on paying users. Break-even paying-user count = Monthly fixed costs / (ARPU - Variable cost per paying user). NMC excludes overhead. ROMI on paid acquisition channels computed monthly.

## Additional quotes

> "Contribution margin = (price - variable cost) / price"
>
> "NMC = net sales - cost of goods sold - marketing expenses"
>
> "A 10% reduction in price results in a decrease in the contribution margin from 21% to 12%"
>

## For Ritsu

Direct action: build simple financial model in 08-finance/ with these formulas, parameterized by ARPU + variable cost + fixed base. Run monthly. Tie to ops.kpi_snapshots. Most important financial tool for Ritsu at pre-PMF.

## See also

- `break-even-analysis`
- `contribution-margin`
- `marketing-roi-romi`
- `cost-plus-pricing`
