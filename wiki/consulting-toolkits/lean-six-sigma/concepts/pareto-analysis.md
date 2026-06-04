---
type: concept
slug: pareto-analysis
title: Pareto Analysis (80/20 Rule)
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: prioritisation
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Pareto Analysis (80/20 Rule)

*Category: prioritisation · Toolkit: Lean Six Sigma*

## What it is
A data visualisation and prioritisation technique that displays defect categories, waste sources, or failure causes ranked by frequency or cost in a descending bar chart with a cumulative percentage line — making it immediately visible that a small number of causes account for the majority of the problem.

**Origin:** Named after Italian economist Vilfredo Pareto, who observed in 1896 that approximately 80% of Italy's land was owned by 20% of the population. Joseph Juran applied the principle to quality management in the 1950s, coining the phrase 'vital few and trivial many.' Pareto charts were popularised globally through Juran's Quality Handbook and became a core Six Sigma tool.

## Why it works
The Pareto principle — that roughly 80% of outcomes arise from 20% of causes — holds empirically across domains: defects, complaints, costs, delays. If this principle holds in your data, it means you do not need to fix everything to solve most of the problem. You need to fix the vital few. This focus is what makes Lean Six Sigma financially efficient and separates it from improvement efforts that spread resources equally across all issues.

## When to use
Phase III (Analyze) to prioritise which root causes to investigate first. Also used in Phase II (Measure) to understand the distribution of defects before hypothesis generation. Can be reapplied after improvement to confirm the vital few have been eliminated.

## Visual
`chart`

## Step-by-step tutorial
1. 1. Define your measurement unit: are you counting defect frequency, cost of poor quality (COPQ), downtime minutes, or customer complaints? The unit must be consistent across all categories.
2. 2. Collect data for each category over a representative time period (minimum 30 days; ideally 3–6 months to capture seasonal or shift variation).
3. 3. List all categories and their totals. Calculate the percentage of the grand total contributed by each category.
4. 4. Sort the categories from highest to lowest contribution. Calculate cumulative percentages: Category 1 = its own %; Category 2 = Category 1 % + Category 2 %; and so on.
5. 5. Build the chart: draw bars for each category in descending order on the left y-axis. Plot the cumulative percentage line using the right y-axis.
6. 6. Draw a horizontal reference line at 80% on the cumulative percentage axis. Drop a vertical line where the cumulative percentage crosses 80% — everything to the left is the vital few.
7. 7. Identify the vital few categories (typically 2–4). These become the focus of the root-cause analysis in Phase III.
8. 8. Avoid the common error of acting on the Pareto chart before investigating root causes — the chart tells you WHAT is causing most of the problem, not WHY. The Five Whys and Fishbone Diagram answer the why.

## Real-life example — Caterpillar Inc. (Manufacturing Operations)
Caterpillar used Pareto Analysis during a Lean Six Sigma project to reduce warranty claims on its earth-moving equipment. A Pareto chart of 1,847 warranty claims over 18 months revealed that hydraulic seal failures (38%), engine overheating (24%), and electrical harness failures (19%) accounted for 81% of all claims and 87% of total warranty cost. The remaining 14 defect categories combined represented only 13% of claims. By concentrating all improvement resources on these three categories rather than addressing all 17, the project team achieved an 84% reduction in warranty cost within 14 months — a result that would have been impossible with a scattered improvement approach.

**So what:** Pareto Analysis earns its place in every project not for the chart itself but for the resource concentration it enables. The chart transforms an intuitively felt sense that 'some things matter more' into a defensible, quantified mandate for selective focus.

## Template
Complete one Pareto analysis per outcome metric (e.g., one for defect types, one for delay causes). Sort by descending count or cost. Identify the vital few before proceeding to root-cause analysis.

- [ ] Outcome Metric: [what are you measuring — defect frequency, cost, delay minutes?]
- [ ] Data Period: [start date — end date]
- [ ] Total count/cost: [grand total across all categories]
- [ ] Category 1: [name] | Count/Cost: [...] | % of Total: [...] | Cumulative %: [...]
- [ ] Category 2: [name] | Count/Cost: [...] | % of Total: [...] | Cumulative %: [...]
- [ ] Category 3: [name] | Count/Cost: [...] | % of Total: [...] | Cumulative %: [...]
- [ ] Category 4: [name] | Count/Cost: [...] | % of Total: [...] | Cumulative %: [...]
- [ ] Category 5+: [names] | Count/Cost: [...] | % of Total: [...] | Cumulative %: [...]
- [ ] Vital Few (categories left of 80% cumulative line): [list]
- [ ] Trivial Many (categories right of 80% line): [list — note but do not act on first]
- [ ] Decision: These vital few categories are the priority targets for root-cause analysis in Phase III.

## Pitfalls
- Building a Pareto chart before data is collected systematically — the chart is only as good as the data. If categories were not consistently defined and counted, the chart will mislead.
- Acting on the chart's categories as root causes — Pareto tells you WHAT accounts for most of the problem, not WHY. Root-cause analysis still follows.
- Changing category definitions mid-collection — if you redefine 'hydraulic failure' to include sub-categories partway through, your data is no longer comparable across time.
- Using percentage alone without absolute scale — a category that is 80% of a problem that affects only 2 units per month is different from 80% of a problem affecting 2,000 units per month. Always check the absolute scale.
