---
type: concept
slug: issue-tree-analysis
title: Issue Tree Analysis (MECE Problem Decomposition)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Issue Tree Analysis (MECE Problem Decomposition)

*Category: analysis · Toolkit: Digital Transformation & IT Strategy*

## What it is
A structured problem decomposition technique that breaks any business issue or KPI shortfall into a hierarchical tree of mutually exclusive, collectively exhaustive (MECE) sub-issues — enabling systematic root cause identification and targeted solution design.

**Origin:** Core analytical tool at McKinsey & Company, taught in the McKinsey Structured Problem Solving training. Derived from the logical decomposition principles of Barbara Minto's Pyramid Principle (1966–1973). The MECE principle was formalised by McKinsey partners in the 1980s.

## Why it works
When a KPI is in RED, there are multiple possible root causes. Without a structured decomposition, teams jump to the most visible cause (confirmation bias) or the most comfortable solution (solution bias). The Issue Tree forces exhaustive decomposition: if E-commerce revenue is below target, it is either because there are fewer orders or because average order value is lower (MECE split). Fewer orders is because there is less traffic or lower conversion. Lower conversion is because of UX issues, pricing, or product gaps. Each branch narrows until a diagnosis is specific enough to test and act on.

## When to use
Use in Phase V Step 4 (Performance Reviews) to diagnose KPIs in RED. Also use in Phase I Step 1 to decompose the business challenge into its constituent issues before forming the Business Case.

## Visual
`tree`

## Step-by-step tutorial
1. 1. State the problem precisely: 'E-commerce conversion rate is 2.1% vs. 3.5% target in Q2.'
2. 2. First-level MECE split: for revenue-type problems, split as Traffic × Conversion × AOV. For cost-type problems, split as Volume × Unit Cost. Every problem has a natural first-level MECE split.
3. 3. Diagnose which branches are the problem: using data, determine which first-level branches are below target. This narrows the tree to investigate.
4. 4. Second-level MECE split on the problem branches: if Conversion is the issue, split as 'Users who start checkout but don't complete' vs. 'Users who don't start checkout'. These are mutually exclusive and collectively exhaustive.
5. 5. Continue until terminal hypotheses: repeat splitting until each leaf is a specific, testable hypothesis (e.g., 'The 3-step address form is causing 45% checkout abandonment').
6. 6. Prioritise hypotheses: rank terminal hypotheses by potential impact × cost to test. Test the highest-impact, cheapest-to-test hypotheses first.
7. 7. Design targeted solutions: once the root cause is confirmed, design a solution for that specific issue. Avoid solutions that address the symptoms without the root cause.
8. 8. Validate with data: close the loop — after implementing the solution, confirm that the specific metric (e.g., address form abandonment rate) improved.

## Real-life example — Amazon (internal)
Amazon's 'Working Backwards' and issue analysis methodology uses MECE decomposition extensively. When Amazon Prime Video's subscriber growth slowed in 2018, the issue tree decomposition identified: Total subscribers = New subscribers + Retained subscribers. New subscriber shortfall was decomposed to: Awareness (not a problem — brand awareness high) → Conversion from free trial to paid (the issue) → Decomposed to: Trial-to-paid conversion by feature usage. The terminal hypothesis: users who watched at least 1 original series in their trial month converted at 68% vs. 24% for users who did not. Solution: in-trial recommendations optimised for original series exposure. Trial-to-paid conversion improved from 42% to 55% in 6 months. The issue tree identified the specific lever in a system with thousands of potential variables.

**So what:** The Issue Tree's value is specificity. 'Improve e-commerce conversion' is not a solution — 'reduce address form abandonment from 45% to 20%' is. The tree forces the journey from vague symptom to specific, testable root cause.

## Template
For each KPI in RED, build an Issue Tree. Start with the first-level MECE split. Use data to diagnose which branches are the problem. Decompose to terminal hypotheses.

- [ ] Problem statement: [KPI name] is [actual] vs. [target] in [period]
- [ ] First-level MECE split: [Factor 1] × [Factor 2] × [Factor 3]
- [ ] Data diagnosis: [Factor 1] actual: [X] vs. target: [Y] — problem? [Y/N]
- [ ] [Factor 2] actual: [X] vs. target: [Y] — problem? [Y/N]
- [ ] Second-level split for problem factor: [Sub-factor A] vs. [Sub-factor B]
- [ ] [Continue to terminal hypotheses]
- [ ] Top 3 root cause hypotheses (ranked by impact × test cost): [List]
- [ ] Solution for #1 hypothesis: [Fill in]
- [ ] Metric to track solution effectiveness: [Fill in]

## Pitfalls
- Non-MECE splits — overlapping branches double-count the problem; exhaustive gaps mean the real cause is in the uncovered space.
- Stopping at Level 1 — 'conversion is low' is not a root cause; decompose to specific, testable hypotheses.
- Issue Tree as a reporting exercise — the tree is a problem-solving tool, not a slide; it should generate specific actions, not just a diagnosis.
