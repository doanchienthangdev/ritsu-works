---
type: book
slug: marketing-management-kotler
title: Marketing Management (16th Edition SE) — Kotler, Keller & Chernev
authors:
  - Philip Kotler
  - Kevin Lane Keller
  - Alexander Chernev
publisher: Pearson Education
edition: 16e SE
published: 2021
source_kind: book
source_ref: raw/marketing-management-kotler.pdf
source_hash: 1f97354cf3ff12682543f7535a055cb3592836fa2382f444eb9d6e7ce6c0ad7a
license_status: copyrighted_internal_only
rights_notice: >-
  © Pearson Education. All rights reserved. INTERNAL USE ONLY —
  attribution-watcher fires Tier B Telegram heads-up when ≥3 observations
  from this source contribute to any external content draft.
split_mode: toc
chapters_count: 21
main_chapters: 21
appendices: 0
parts: 7
pdf_book_page_offset: 27
ingestion_job_id: 662a6c50-1bab-47f4-b5f9-0aefcb662370
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, batch 2 book)
ingested_at: 2026-05-19
companion_book: principles-of-marketing-kotler
dedup_strategy: distill_own_package_defer_to_review
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked) -->

# Marketing Management (16th Edition SE)

**Kotler, Keller & Chernev · Pearson Education · 2021 · 607 pages**

The MBA-strategic companion to *Principles of Marketing* — same Kotler lineage but compressed, more analytical, with emphasis on the strategic frameworks marketers actually deploy (G-STIC action planning, 5 Cs + 5 Forces, Market Value Map, customer value proposition crafting, customer-oriented organization design). Distilled into per-chapter source RECORDs and derived entity pages with citation via `ops.knowledge_extractions`.

## Relationship to *Principles of Marketing* 18e

Both books are part of the [principles-of-marketing-kotler](../principles-of-marketing-kotler/source.md) corpus + this Marketing Management 16e SE corpus. Significant concept overlap (4 Ps, STP, CLV, customer equity, IMC, PLC, branding, channels) but with distinct framing:

- **Principles 18e**: introductory undergraduate, narrative-rich, more case examples, broader marketing-landscape coverage (23 chapters).
- **Marketing Management 16e**: MBA / executive level, framework-dense, more analytical, more compact (21 chapters, no appendices). Adds: G-STIC action planning, Market Value Map, 5 Cs of competition, 7 Ts (vs 4 Ps), "Customer-Oriented Organization" design, "10 Deadly Marketing Sins," Behavioral Decision Theory.

**Dedup policy (founder decision 2026-05-19):** entities are distilled into this package independently. v4.0 composite-UNIQUE means `marketing-mix-4ps` etc. can coexist in both packages. Dedup pass (vector similarity > 0.92) will flag overlapping concept candidates for `/wiki review` — founder decides per pair: keep separate (preserves each book's framing), merge to canonical (shared with both citations), or soft-delete duplicate.

## License & attribution

© Pearson Education. All rights reserved. Internal use only.

## How this entry was produced

Ingested via `/wiki sync raw/marketing-management-kotler.pdf` on 2026-05-19 with founder Tier B approval (estimated $5 cost, ~2.5× the $2 `wiki-distill-pdf` per-task-kind cap). Mode: v3.0 distill+extract default. Split: `toc`. Adapter: pdf-adapter. PDF→book page offset: +27 (consistent through book content).

Pipeline stages (per chapter):

1. **Extract** the chapter's PDF page range via `pdftotext -layout`
2. **Chunk** into ~3–5K token slices respecting section boundaries
3. **Distill** per-Part (each subagent handles a thematic Part for cross-chapter coherence) using Sonnet
4. **Cite** every derived entity via `ops.knowledge_extractions`
5. **Dedup** within-source slug-equality + cross-source vector similarity (queued for review, not auto-merged across packages per founder decision)
6. **Embed** the source RECORD page + each derived entity page
7. **Write** chapter source.md + entity pages

## Chapters (auto-extracted, toc split)

**Part 1 — Fundamentals of Marketing Management**

1. [Defining Marketing for the New Realities](chapters/chapter-01-defining-marketing-new-realities.md) (pp. 2–27)
2. [Marketing Planning and Management](chapters/chapter-02-marketing-planning-and-management.md) (pp. 28–51)

**Part 2 — Understanding the Market**

3. [Analyzing Consumer Markets](chapters/chapter-03-analyzing-consumer-markets.md) (pp. 52–77)
4. [Analyzing Business Markets](chapters/chapter-04-analyzing-business-markets.md) (pp. 78–97)
5. [Conducting Marketing Research](chapters/chapter-05-conducting-marketing-research.md) (pp. 98–117)

**Part 3 — Developing a Viable Market Strategy**

6. [Identifying Market Segments and Target Customers](chapters/chapter-06-identifying-segments-and-targets.md) (pp. 118–139)
7. [Crafting a Customer Value Proposition and Positioning](chapters/chapter-07-customer-value-proposition-positioning.md) (pp. 140–159)

**Part 4 — Designing Value**

8. [Designing and Managing Products](chapters/chapter-08-designing-and-managing-products.md) (pp. 160–181)
9. [Designing and Managing Services](chapters/chapter-09-designing-and-managing-services.md) (pp. 182–207)
10. [Building Strong Brands](chapters/chapter-10-building-strong-brands.md) (pp. 208–237)
11. [Managing Pricing and Sales Promotions](chapters/chapter-11-managing-pricing-sales-promotions.md) (pp. 238–261)

**Part 5 — Communicating Value**

12. [Managing Marketing Communications](chapters/chapter-12-managing-marketing-communications.md) (pp. 262–281)
13. [Designing an Integrated Marketing Campaign in the Digital Age](chapters/chapter-13-integrated-marketing-campaign-digital.md) (pp. 282–303)
14. [Personal Selling and Direct Marketing](chapters/chapter-14-personal-selling-direct-marketing.md) (pp. 304–321)

**Part 6 — Delivering Value**

15. [Designing and Managing Distribution Channels](chapters/chapter-15-designing-managing-distribution.md) (pp. 322–345)
16. [Managing Retailing](chapters/chapter-16-managing-retailing.md) (pp. 346–371)

**Part 7 — Managing Growth**

17. [Driving Growth in Competitive Markets](chapters/chapter-17-driving-growth-competitive-markets.md) (pp. 372–395)
18. [Developing New Market Offerings](chapters/chapter-18-developing-new-market-offerings.md) (pp. 396–417)
19. [Building Customer Loyalty](chapters/chapter-19-building-customer-loyalty.md) (pp. 418–441)
20. [Tapping into Global Markets](chapters/chapter-20-tapping-into-global-markets.md) (pp. 442–463)
21. [Socially Responsible Marketing](chapters/chapter-21-socially-responsible-marketing.md) (pp. 464–486)

## Entities distilled from this source

Populated as chapters are processed. Derived entities live under:

- `concepts/` — strategic frameworks + definitional terms (G-STIC, 5 Cs/5 Forces, 7 Ts, Market Value Map, Customer Value Proposition, etc.)
- `observations/` — empirical claims from cases (Google, Disney, Nike, Zappos, Mayo Clinic, Intuit, Alibaba, Salesforce.com, L'Oréal, Chase Sapphire, MUJI, marketing spotlights)
- `decisions/` — actionable strategic recommendations
- `ideas/` — generative prompts tied to Ritsu's situation

## Source artifact

Local-only (in `raw/`, not synced): `raw/marketing-management-kotler.pdf` · sha256 `1f97354c…ce6c0ad7a` · 25.2 MB · PDF produced by iTextSharp 5.5.5.
