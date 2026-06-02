---
type: concept
slug: randomized-controlled-trials-and-ab-testing
title: Randomized Controlled Trials and A/B Testing
source_book: bulletproof-problem-solving
source_chapter_index: 6
source_chapter_title: Big Guns of Analysis
cited_in_chapters: [6]
extracted_from: wiki/bulletproof-problem-solving/chapters/chapter-06-big-guns-of-analysis.md
extracted_from_source_id: 530215ca-5371-405c-9144-f58c864e3ccf
confidence: 0.95
llm_model: claude-sonnet-4-6
extracted_at: 2026-06-02
license_status: copyrighted_internal_only
review_state: auto_accepted
see_also:
  - analytics-tool-selection-decision-tree
  - ea-simcity-ab-test-no-promotion-wins
  - correlation-vs-causation-pitfall
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# Randomized Controlled Trials and A/B Testing

**Type:** concept · **From:** *Bulletproof Problem Solving* (Charles Conn, Robert McLean, 2018), Ch 6 — Big Guns of Analysis

## Summary

Constructed experiments allow analysts to generate their own data when none exists. RCTs randomly allocate participants into treatment and control groups, eliminating confounding variables and establishing causal inference. A/B testing is the lightweight online variant — rapidly exposing two randomly selected groups to different stimuli (website designs, pricing, offers) and measuring the differential response. Both methods are described as particularly powerful but are subject to ethical constraints and practical complexity in non-digital settings.

## Raw quotes (verbatim, for citation)

- **From [Ch 6 — Big Guns of Analysis](../chapters/chapter-06-big-guns-of-analysis.md)** (PDF pp. 165–208, confidence 0.95):

  > Randomized controlled experiments allow us to test a change in one variable while controlling for all other variables.

  > A/B testing is used to make adjustments to product offers in real time.

## Ritsu relevance

Ritsu's `10-metrics` pillar and SOP-PRODUCT-012 (A/B test decision protocol) + SOP-PRODUCT-010 (pricing-pull-test) operationalise exactly this methodology for pricing experiments and feature tests. The `experiment-analyst` role and `testing-chaos-engineering` skill are the workforce equivalents.

## Source citation

- **Source RECORD:** [bulletproof-problem-solving source.md](../source.md)
- **Original ref:** raw/mckinsey/bulletproof-problem-solving.pdf (John Wiley & Sons, Inc., 2018)
- **License:** Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY
