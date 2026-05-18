---
type: concept
slug: marketing-analytics
title: Marketing Analytics
summary: "Analysis tools/technologies/processes by which marketers dig out meaningful patterns in big data for customer insights and performance measurement. Netflix: 130M subscriber profiles = 130M versions of Netflix."
parent_book: principles-of-marketing-kotler
extracted_from_source: principles-of-marketing-kotler__chapter-04-managing-marketing-information
source_chunk_index: 6
book_pages:
  - 137
  - 138
confidence: 0.95
review_state: auto_accepted
llm_model: claude-sonnet-4-6
see_also:
  - big-data
  - netflix-big-data-personalization-loop
  - ritsu-ops-supabase-as-internal-database-mis
license_status: copyrighted_internal_only
ingestion_job_id: "33e9f348-0aae-47d1-b1bc-02e830fc87aa"
parent_ingestion_job_id: "31c61e23-d632-4452-802c-d34c9c5083c2"
generated_by: wiki-sync v4.0 distill (Sonnet subagent via Opus orchestrator, batch 2)
---

<!-- generated-by: wiki-sync v4.0 distill -->

# Marketing Analytics

> **Source.** [Chapter 4](../chapters/chapter-04-managing-marketing-information.md), book pp. 137–138, chunk 6 (confidence 0.95, auto-accepted).
>
> "Marketing analytics consists of the analysis tools, technologies, and processes by which marketers dig out meaningful patterns in big data to gain customer insights and gauge marketing performance."
>
> — Kotler/Armstrong/Opresnik, *Principles of Marketing* (18e Global, Pearson 2021)

## Summary

Analysis tools/technologies/processes by which marketers dig out meaningful patterns in big data for customer insights and performance measurement. Netflix: 130M subscriber profiles = 130M versions of Netflix.

## Additional quotes from the chapter

> "It's actually about getting big insights from big data. It's throwing away 99.999 percent of that data to find things that are actionable."
>
> "According to Netflix, there are 130 million different versions of Netflix, one for each individual subscriber worldwide."
>

## For Ritsu

Ritsu's 10-metrics pillar maps directly to this. At 100-paying-user scale, marketing analytics means: (a) defining 3-5 metrics that predict retained love (not vanity), (b) querying ops-supabase daily, (c) NOT building a dashboard for everything. Netflix personalization is Ritsu's long-term product direction — every user gets a Ritsu version tuned to their learning style.

## See also

- `big-data` (link resolved after package-wide index rebuild)
- `netflix-big-data-personalization-loop` (link resolved after package-wide index rebuild)
- `ritsu-ops-supabase-as-internal-database-mis` (link resolved after package-wide index rebuild)
