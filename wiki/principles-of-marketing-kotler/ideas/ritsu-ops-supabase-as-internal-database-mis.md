---
type: idea
slug: ritsu-ops-supabase-as-internal-database-mis
title: "Ops-Supabase as Ritsu's Internal Database Layer of MIS — With Gaps to Fill"
summary: "MIS internal database = ops-supabase + metrics.product_dau_snapshot. Two gaps: (1) activity-type usage breakdown not in current ETL view; (2) session-level engagement depth not surfaced to operating AI. Both needed before marketing analytics can run."
parent_book: principles-of-marketing-kotler
extracted_from_source: principles-of-marketing-kotler__chapter-04-managing-marketing-information
source_chunk_index: 3
book_pages:
  - 121
  - 121
confidence: 0.65
review_state: pending_review
llm_model: claude-sonnet-4-6
see_also:
  - marketing-information-system
  - marketing-analytics
license_status: copyrighted_internal_only
ingestion_job_id: "33e9f348-0aae-47d1-b1bc-02e830fc87aa"
parent_ingestion_job_id: "31c61e23-d632-4452-802c-d34c9c5083c2"
generated_by: wiki-sync v4.0 distill (Sonnet subagent via Opus orchestrator, batch 2)
---

<!-- generated-by: wiki-sync v4.0 distill -->

# Ops-Supabase as Ritsu's Internal Database Layer of MIS — With Gaps to Fill

> **Source.** [Chapter 4](../chapters/chapter-04-managing-marketing-information.md), book pp. 121–121, chunk 3 (confidence 0.65, pending founder review).
>
> "The marketing department furnishes information on customer characteristics and preferences, in-store and online sales transactions and interactions, and web and social media site visits."
>
> — Kotler/Armstrong/Opresnik, *Principles of Marketing* (18e Global, Pearson 2021)

## Summary

MIS internal database = ops-supabase + metrics.product_dau_snapshot. Two gaps: (1) activity-type usage breakdown not in current ETL view; (2) session-level engagement depth not surfaced to operating AI. Both needed before marketing analytics can run.

## Additional quotes from the chapter

> "Internal databases usually can be accessed more quickly and cheaply than other information sources, but they also present some problems. Because much internal information is often collected for other purposes, it may be incomplete or in the wrong form for making marketing decisions."
>

## For Ritsu

Direct ops gap identification — ETL view spec (v_ops_dau_export in knowledge/manifest.yaml) missing activity-type and session-depth columns. Before Ritsu can answer 'which of the 17 activity types drives retention,' product team must expose these fields in ETL view and operating AI must instrument them in ops.kpi_snapshots.

## See also

- `marketing-information-system` (link resolved after package-wide index rebuild)
- `marketing-analytics` (link resolved after package-wide index rebuild)
