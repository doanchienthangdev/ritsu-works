---
type: concept
slug: analytics-tool-selection-decision-tree
title: Analytics Tool Selection Decision Tree
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
  - hypothesis-first-sequencing
  - multivariate-regression-analysis
  - bayesian-conditional-statistics
  - randomized-controlled-trials-and-ab-testing
  - natural-experiments
  - monte-carlo-simulation
  - machine-learning-for-prediction
  - crowdsourcing-algorithms
  - game-theory-thinking
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# Analytics Tool Selection Decision Tree

**Type:** concept · **From:** *Bulletproof Problem Solving* (Charles Conn, Robert McLean, 2018), Ch 6 — Big Guns of Analysis

## Summary

The chapter presents a decision tree for choosing the right advanced analytical tool. The primary branching question is whether the analyst is trying to understand the drivers of causation (leading toward statistical analysis and experiments) or predict outcomes to plan decisions (leading toward machine learning, forecasting models, and game theory). Some problems span both branches and require combining tools.

## Raw quotes (verbatim, for citation)

- **From [Ch 6 — Big Guns of Analysis](../chapters/chapter-06-big-guns-of-analysis.md)** (PDF pp. 165–208, confidence 0.95):

  > The most important defining question at the outset is to understand the nature of your problem: Are you primarily trying to understand the drivers of causation of your problem (how much each element contributes and in what direction), or are you primarily trying to predict a state of the world in order to make a decision?

  > Some problems have elements of both sides, and require combining tools from both branches of the decision tree.

## Ritsu relevance

The `/cla` capability-lifecycle and the `deepask` orchestrator both face a version of this tree: choose the right analytical 'big gun' (resolver, simulation, regression) for the sub-need type before executing. The causation-vs-prediction split maps directly onto the IA-type taxonomy in the deepask spec (A=System-of-Record vs. B=Predictive).

## Source citation

- **Source RECORD:** [bulletproof-problem-solving source.md](../source.md)
- **Original ref:** raw/mckinsey/bulletproof-problem-solving.pdf (John Wiley & Sons, Inc., 2018)
- **License:** Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY
