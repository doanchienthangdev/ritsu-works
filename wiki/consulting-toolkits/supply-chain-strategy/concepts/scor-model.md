---
type: concept
slug: scor-model
title: SCOR Model (Supply Chain Operations Reference)
source_collection: consulting-toolkits
toolkit: supply-chain-strategy
domain: operations
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# SCOR Model (Supply Chain Operations Reference)

*Category: analysis · Toolkit: Supply Chain Strategy*

## What it is
The SCOR Model is the industry-standard process reference framework for supply chain management, defining six primary management processes — Plan, Source, Make, Deliver, Return, and Enable — with a hierarchical structure of process categories, performance metrics (level 1–3), best practices, and technology requirements.

**Origin:** Developed by the Supply Chain Council, first published in 1996. Now maintained by ASCM (Association for Supply Chain Management). Currently at version 13.0.

## Why it works
SCOR provides a common language and measurement system that allows organizations to benchmark their supply chain against peers, identify process gaps, and prioritize improvements. By decomposing the supply chain into standardized processes at three levels of granularity (process type → process category → process element), SCOR enables apples-to-apples comparison across industries and geographies. The framework connects strategy to execution: Level 1 metrics (e.g., Perfect Order Fulfillment, Cash-to-Cash Cycle Time) measure strategic performance; Levels 2–3 metrics diagnose the operational root cause.

## When to use
Use SCOR when you need a structured, benchmarkable framework to assess the full supply chain across all six process domains — especially useful for cross-industry benchmarking, identifying process gaps, and providing a common language across functional silos.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Scope the SCOR analysis: define the geographic and product scope (which supply chains, which markets, which product families are in scope).
2. 2. Map your current supply chain to the SCOR process framework: for each of the six processes (Plan/Source/Make/Deliver/Return/Enable), document the key sub-processes your organization performs and those you outsource.
3. 3. Select your Level 1 benchmark metrics: the five standard SCOR Level 1 metrics are Perfect Order Fulfillment (reliability), Order Fulfillment Cycle Time (responsiveness), Upside Supply Chain Flexibility (agility), Supply Chain Management Cost (cost), and Cash-to-Cash Cycle Time (asset management). Collect current data for each.
4. 4. Benchmark against peers: use ASCM's SCOR benchmark database or APQC to find median and top-quartile values for your industry. Plot your current position vs. benchmarks on a radar chart.
5. 5. Identify performance gaps: for each metric where you are below median or top-quartile (depending on ambition), drill down to Level 2 and Level 3 metrics to identify the root-cause process gap.
6. 6. Map best practices: SCOR's best-practices library (volume 2 of the framework) provides proven practices for each process category. Identify which applicable best practices you are not yet implementing.
7. 7. Prioritize improvements: score gaps by impact on Level 1 metrics and implementation feasibility. Map the highest-priority gaps to your Phase III initiative list.
8. 8. Use SCOR as the common language: in all cross-functional design sessions, use SCOR process names and metric definitions to avoid ambiguity and facilitate precise benchmarking.

## Real-life example — Cisco Systems
Cisco applied the SCOR model in its supply chain transformation following the 2001 inventory crisis (when Cisco wrote off $2.25B of inventory). Using SCOR Level 1 metrics as the baseline, Cisco found its Perfect Order Fulfillment rate was 85% (vs. top-quartile 97%) and Cash-to-Cash Cycle Time was 72 days (vs. top-quartile 18 days). Drilling to Level 3 revealed the root cause: build-to-forecast with long lead times and poor demand visibility to contract manufacturers. Cisco redesigned its Source and Make processes — moving to a build-to-order model with contract manufacturer integration — reducing inventory by $700M within 2 years and improving Perfect Order Fulfillment to 94%.

**So what:** SCOR's value is in its hierarchical metric structure: Level 1 tells you where the pain is; Levels 2 and 3 tell you what to fix. Without that drill-down capability, supply chain diagnosis becomes guesswork.

## Template
Complete the SCOR benchmarking table for your supply chain. For each Level 1 metric, collect current data, find the relevant industry benchmark, and calculate the gap. Then drill to Level 2/3 for the metrics with the largest gaps.

- [ ] SCOR Process (Plan / Source / Make / Deliver / Return / Enable)
- [ ] Level 1 Metric Name
- [ ] Current Performance (value + date)
- [ ] Industry Median Benchmark (source)
- [ ] Top-Quartile Benchmark (source)
- [ ] Gap vs. Median
- [ ] Gap vs. Top-Quartile
- [ ] Root-Cause Level 2/3 Metric (for largest gaps)
- [ ] Linked Initiative (from Phase III)

## Pitfalls
- Treating SCOR as a one-time analysis rather than a management system: SCOR is most valuable as an ongoing benchmarking and improvement framework, not a project deliverable that is filed after the strategy phase.
- Skipping the benchmark step: without external benchmarks, SCOR metric gaps are unmeasurable — you cannot know if your 85% Perfect Order Fulfillment is excellent or poor without context.
- Over-using Level 3 metrics in executive discussions: Level 3 metrics are process-diagnostic — they belong in operational reviews. Executive Steering Committees should focus on Level 1 metrics only.
- Ignoring the 'Enable' process: organizations focus on Plan/Source/Make/Deliver but neglect Enable (data management, governance, risk management). Poor data quality and governance is often the root cause of Level 1 metric underperformance.
