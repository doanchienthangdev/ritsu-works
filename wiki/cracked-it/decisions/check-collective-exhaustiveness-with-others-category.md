---
type: decision
slug: check-collective-exhaustiveness-with-others-category
title: "Check Collective Exhaustiveness by Testing Whether an 'Others' Category Exists"
source_book: cracked-it
source_chapter_index: 5
source_chapter_title: "Structure the Problem: Pyramids and Trees"
cited_in_chapters: [5]
extracted_from: wiki/cracked-it/chapters/chapter-05-structure-the-problem-pyramids-and-trees.md
extracted_from_source_id: 16779091-0115-4c8c-b85c-7ac07a2a4bd6
confidence: 0.95
llm_model: claude-sonnet-4-6
extracted_at: 2026-06-02
license_status: copyrighted_internal_only
review_state: auto_accepted
see_also:
  - mece
  - hypothesis-pyramid
  - issue-tree
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# Check Collective Exhaustiveness by Testing Whether an 'Others' Category Exists

**Type:** decision · **From:** *Cracked It! How to Solve Big Problems and Sell Solutions Like Top Strategy Consultants* (Bernard Garrette, Corey Phelps, Olivier Sibony, 2018), Ch 5 — Structure the Problem: Pyramids and Trees

## Summary

To verify that a decomposition is collectively exhaustive, ask whether an 'others' category would be empty. If any items could fall outside the listed categories, the decomposition is not exhaustive. A second check is to assume all listed conditions hold and still attempt to argue against the hypothesis — any objection that survives indicates a missing branch.

## Raw quotes (verbatim, for citation)

- **From [Ch 5 — Structure the Problem: Pyramids and Trees](../chapters/chapter-05-structure-the-problem-pyramids-and-trees.md)** (PDF pp. 86–110, confidence 0.95):

  > A trick to make sure that a list of items is collectively exhaustive is to determine whether an "others" category exists.

  > Another way to check for collective exhaustiveness is to assume that all the conditions you've listed hold, and still try to argue against the leading hypothesis: what objections can you find?

## Ritsu relevance

This is the second test in Ritsu's `/think mece-decomposition-check` skill — after checking mutual exclusivity, the skill challenges whether an 'others' bucket would be non-empty and whether the partition resists counter-argument.

## Source citation

- **Source RECORD:** [cracked-it source.md](../source.md)
- **Original ref:** raw/mckinsey/cracked-it.pdf (Palgrave Macmillan (Springer), 2018)
- **License:** Copyright © 2018 The Author(s) (Bernard Garrette, Corey Phelps, Olivier Sibony) / Palgrave Macmillan. All rights reserved. INTERNAL USE ONLY
