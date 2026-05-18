---
type: book
slug: principles-of-marketing-kotler
title: Principles of Marketing (18th Global Edition) — Kotler, Armstrong & Opresnik
authors:
  - Philip Kotler
  - Gary Armstrong
  - Marc Oliver Opresnik
publisher: Pearson Education Limited
edition: 18e Global
published: 2021
isbn_13_print: 978-1-292-34113-2
isbn_13_ebook: 978-1-292-34120-0
source_kind: book
source_ref: raw/principles-of-marketing-kotler.pdf
source_hash: 6df845154ae46b5cf52d050faa05f83d4a820eebb300f07355bc679bd91d0b43
license_status: copyrighted_internal_only
rights_notice: >-
  © Pearson Education Limited 2021. All rights reserved per UK Copyright,
  Designs and Patents Act 1988. INTERNAL USE ONLY — attribution-watcher
  fires Tier B Telegram heads-up when ≥3 observations from this source
  contribute to any external content draft.
split_mode: toc
chapters_count: 23
main_chapters: 20
appendices: 3
ingestion_job_id: 31c61e23-d632-4452-802c-d34c9c5083c2
generated_by: wiki-sync v4.0 (Claude-walked, distill mode)
ingested_at: 2026-05-18
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked) -->

# Principles of Marketing (18th Global Edition)

**Kotler, Armstrong & Opresnik · Pearson Education Limited · 2021 · 729 pages**

The canonical contemporary text on marketing fundamentals. Foundational reference for Ritsu's **01-marketing** (ICP, brand voice, content templates) and **03-gtm** (funnel orchestration, distribution engine, PMF instrumentation) pillars. Distilled into per-chapter source RECORDs and derived entity pages (concepts, observations, decisions, ideas) with citation via `ops.knowledge_extractions`.

## License & attribution

© Pearson Education Limited 2021. All rights reserved. Authorized adaptation from the US edition (Principles of Marketing, 18th Edition, ISBN 978-0-13-576659-0). All trademarks property of their respective owners.

**Internal use only.** Per the v3.0 `attribution-watcher` discipline (spec §0 axis A11), if ≥3 observations from this source contribute to a single external content draft, a Tier B Telegram heads-up surfaces to founder before that draft ships. This is not a copyright bypass — paraphrased internal learning ≠ verbatim reproduction.

## How this entry was produced

Ingested via `/wiki sync raw/principles-of-marketing-kotler.pdf` on 2026-05-18 with founder Tier B approval (estimated $4–7 cost, ~3.5× the $2 `wiki-distill-pdf` per-task-kind cap). Mode: v3.0 distill+extract default. Split: `toc` (clean book-level TOC bookmarks). Adapter: pdf-adapter.

Pipeline stages (per chapter, deterministic where possible):

1. **Extract** the chapter's page range via `pdftotext -layout`
2. **Chunk** into ~3–5K token slices respecting section boundaries
3. **Distill** per-chunk into concept/observation/decision/idea proposals using Haiku (concept+idea) and Sonnet (observation+decision)
4. **Cite** every derived entity via `ops.knowledge_extractions` (source_chunk_index → derived_page_id, with raw_quote + confidence)
5. **Dedup** against existing entities in the same package (slug-equality + 0.92 vector-similarity threshold)
6. **Embed** the source RECORD page + each derived entity page (OpenAI `text-embedding-3-small`)
7. **Write** the chapter source.md + entity pages under `wiki/principles-of-marketing-kotler/`

## Chapters (auto-extracted, toc split)

**Part 1 — Defining Marketing and the Marketing Process**

1. [Marketing: Creating Customer Value and Engagement](chapters/chapter-01-marketing-creating-customer-value.md) (pp. 22–55)
2. [Company and Marketing Strategy: Partnering to Build Customer Engagement, Value, and Relationships](chapters/chapter-02-company-and-marketing-strategy.md) (pp. 56–83)

**Part 2 — Understanding the Marketplace and Consumer Value**

3. [Analyzing the Marketing Environment](chapters/chapter-03-analyzing-the-marketing-environment.md) (pp. 84–115)
4. [Managing Marketing Information to Gain Customer Insights](chapters/chapter-04-managing-marketing-information.md) (pp. 116–149)
5. [Consumer Markets and Buyer Behavior](chapters/chapter-05-consumer-markets-and-buyer-behavior.md) (pp. 150–179)
6. [Business Markets and Business Buyer Behavior](chapters/chapter-06-business-markets-and-buyer-behavior.md) (pp. 180–201)

**Part 3 — Designing a Customer Value–Driven Strategy and Mix**

7. [Customer Value–Driven Marketing Strategy: Creating Value for Target Customers](chapters/chapter-07-customer-value-driven-marketing-strat.md) (pp. 202–231)
8. [Products, Services, and Brands: Building Customer Value](chapters/chapter-08-products-services-and-brands.md) (pp. 232–267)
9. [Developing New Products and Managing the Product Life Cycle](chapters/chapter-09-developing-new-products-plc.md) (pp. 268–293)
10. [Pricing: Understanding and Capturing Customer Value](chapters/chapter-10-pricing-understanding-customer-value.md) (pp. 294–315)
11. [Pricing Strategies: Additional Considerations](chapters/chapter-11-pricing-strategies-additional.md) (pp. 316–341)
12. [Marketing Channels: Delivering Customer Value](chapters/chapter-12-marketing-channels.md) (pp. 342–373)
13. [Retailing and Wholesaling](chapters/chapter-13-retailing-and-wholesaling.md) (pp. 374–407)
14. [Engaging Consumers and Communicating Customer Value: Integrated Marketing Communications Strategy](chapters/chapter-14-engaging-consumers-imc.md) (pp. 408–433)
15. [Advertising and Public Relations](chapters/chapter-15-advertising-and-public-relations.md) (pp. 434–461)
16. [Personal Selling and Sales Promotion](chapters/chapter-16-personal-selling-and-sales-promotion.md) (pp. 462–491)
17. [Direct, Online, Social Media, and Mobile Marketing](chapters/chapter-17-direct-online-social-media-mobile.md) (pp. 492–523)

**Part 4 — Extending Marketing**

18. [Creating Competitive Advantage](chapters/chapter-18-creating-competitive-advantage.md) (pp. 524–549)
19. [The Global Marketplace](chapters/chapter-19-the-global-marketplace.md) (pp. 550–579)
20. [Sustainable Marketing: Social Responsibility and Ethics](chapters/chapter-20-sustainable-marketing.md) (pp. 580–608)

**Appendices**

21. [Appendix 1 — Marketing Plan](chapters/chapter-21-appendix-1-marketing-plan.md) (pp. 609–618)
22. [Appendix 2 — Marketing by the Numbers](chapters/chapter-22-appendix-2-marketing-by-the-numbers.md) (pp. 619–636)
23. [Appendix 3 — Careers in Marketing](chapters/chapter-23-appendix-3-careers-in-marketing.md) (pp. 637–648)

## Entities distilled from this source

Populated as chapters are processed. Per the v4.0 source-grouped layout, derived entities live under:

- `concepts/` — defined marketing terms and frameworks (e.g., 4 Ps, customer lifetime value, marketing mix)
- `observations/` — empirical claims and case-study insights from the text
- `decisions/` — strategic choices the authors recommend in specific situations
- `ideas/` — generative prompts / questions the text raises for the reader

Cross-reference these via the `wiki/_index/<page_type>/<canonical-name>.md` reverse-lookup link-lists (regenerated by `wiki-sync/index-rebuild` after each chapter completes).

## Resumption protocol

Chapter children are tracked as `ops.ingestion_jobs` rows with `parent_job_id = 31c61e23-d632-4452-802c-d34c9c5083c2`. Re-invoking `/wiki sync raw/principles-of-marketing-kotler.pdf` checks `source_hash` dedup → finds this parent (state may be `processing` while children advance, or `completed` after all 23 done) → returns existing slug rather than re-ingesting.

To resume mid-flight: query `ops.ingestion_jobs WHERE parent_job_id = '31c61e23-d632-4452-802c-d34c9c5083c2' AND state IN ('queued', 'failed')` and dispatch a Sonnet/Haiku subagent per pending chapter following the `wiki-sync/distill` SKILL's per-chunk protocol.

## Source artifact

Local-only (in `raw/`, not synced): `raw/principles-of-marketing-kotler.pdf` · sha256 `6df8451…d91d0b43` · 126.4 MB · PDF 1.4 produced by Adobe InDesign CC 2015 / Adobe PDF Library 15.0 (Pearson eBook formatter).
