---
type: concept
slug: mece
title: MECE (Mutually Exclusive, Collectively Exhaustive)
source_book: bulletproof-problem-solving
source_chapter_index: 3
source_chapter_title: Problem Disaggregation and Prioritization
cited_in_chapters: [3]
extracted_from: wiki/bulletproof-problem-solving/chapters/chapter-03-problem-disaggregation-and-prioritization.md
extracted_from_source_id: e81e162f-5409-435c-a162-2406be977e78
confidence: 0.95
llm_model: claude-sonnet-4-6
extracted_at: 2026-06-02
license_status: copyrighted_internal_only
review_state: auto_accepted
see_also:
  - logic-tree
  - factor-component-tree
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# MECE (Mutually Exclusive, Collectively Exhaustive)

**Type:** concept · **From:** *Bulletproof Problem Solving* (Charles Conn, Robert McLean, 2018), Ch 3 — Problem Disaggregation and Prioritization

## Summary

MECE is a principle for constructing logic trees where branches do not overlap (mutually exclusive) and together cover the entire problem space (collectively exhaustive). Violating mutual exclusivity means a concept is spread across several branches; violating collective exhaustivity means part of the problem is missing. The authors use it as a quality check on any disaggregation.

## Raw quotes (verbatim, for citation)

- **From [Ch 3 — Problem Disaggregation and Prioritization](../chapters/chapter-03-problem-disaggregation-and-prioritization.md)** (PDF pp. 79–116, confidence 0.95):

  > MECE stands for "mutually exclusive, collectively exhaustive." Because this tree confuses or overlaps some of its branches, it isn't MECE.

  > If you are having trouble getting clear hypotheses out of your tree, check to see if it is really MECE.

## Ritsu relevance

The `/think` skill `mece-decomposition-check` in ritsu-works is a direct implementation of this principle, used as a 2-test quality gate on any list, decomposition, or grouping output.

## Source citation

- **Source RECORD:** [bulletproof-problem-solving source.md](../source.md)
- **Original ref:** raw/mckinsey/bulletproof-problem-solving.pdf (John Wiley & Sons, Inc., 2018)
- **License:** Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY
