---
type: concept
slug: voc-ctq-tree
title: Voice of the Customer (VOC) and CTQ Tree
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: customer-requirements
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Voice of the Customer (VOC) and CTQ Tree

*Category: customer-requirements · Toolkit: Lean Six Sigma*

## What it is
A two-stage translation tool that converts qualitative customer language (Voice of the Customer) into quantifiable, measurable quality requirements (Critical-to-Quality metrics with specification limits) that become the project's primary outcome measures.

**Origin:** VOC as a systematic practice was developed by John Hauser and Don Clausing at MIT in their 1988 Harvard Business Review article 'The House of Quality.' The CTQ tree was formalized within Six Sigma curricula in the 1990s as the bridge from customer needs to process metrics.

## Why it works
Customers express needs in vague, emotional language ('I want fast service'). Without translation, improvement teams optimize metrics that are easy to measure rather than metrics customers actually value. The CTQ tree forces a structured translation: Customer Need → Specific Quality Characteristic → Measurable CTQ with a pass/fail specification. Every project metric that does not trace to a customer CTQ is measuring internal convenience, not customer value.

## When to use
Mandatory in Phase I (Define) of every DMAIC project. Also used in DFSS (Design for Six Sigma) when designing new products or processes from scratch.

## Visual
`tree`

## Step-by-step tutorial
1. 1. Collect VOC data from multiple sources: structured customer interviews (aim for 20–40), satisfaction surveys, NPS verbatims, complaint logs, call-centre transcripts, and field observation.
2. 2. Transcribe customer statements verbatim onto sticky notes. Preserve the customer's exact language — do not paraphrase yet.
3. 3. Group the verbatims by theme using affinity mapping. Label each cluster with a Customer Need statement.
4. 4. Prioritise the Customer Needs: which needs, if unmet, would cause customers to defect? High-severity needs become the focus.
5. 5. For each prioritised Customer Need, ask: 'What property of our product or service delivers this?' — this produces the Quality Characteristic (Level 1 of the tree).
6. 6. For each Quality Characteristic, ask: 'How do we measure this? What unit and what data source?' — this produces the CTQ Metric (Level 2).
7. 7. For each CTQ Metric, define the Specification Limit: the boundary between acceptable performance and a defect. Get the customer to validate this limit.
8. 8. Document the full CTQ tree and review with the Project Sponsor to confirm that the project's success criteria are anchored to these customer-validated metrics.

## Real-life example — Citigroup (Retail Banking Operations)
In the late 1990s, Citigroup deployed Six Sigma across its retail banking operations. For its credit card dispute resolution process, VOC interviews revealed customers saying 'I want to know my dispute is being handled' and 'I don't want to keep explaining the same problem to different people.' The CTQ tree translated these into two measurable CTQs: (1) Time to first status update 24 hours or less, and (2) Number of times the customer must re-explain the issue equals zero. These CTQs drove redesign of the case management system, reducing dispute handling time by 40% and customer re-contact rate by 65%.

**So what:** The CTQ tree is valuable precisely because it exposes the gap between what customers say and what the process currently measures. Citigroup's existing metrics tracked time to resolution — the CTQ tree revealed that customers cared more about time to first contact and continuity of case ownership, metrics the process had never tracked.

## Template
Complete one row per customer CTQ. Start from the verbatim customer quote and translate through three levels. Obtain customer sign-off on the specification limit.

- [ ] Customer Verbatim Quote: [exact language from interview or survey]
- [ ] Customer Need (theme): [synthesised need label]
- [ ] Quality Characteristic: [what property of the output delivers this need?]
- [ ] CTQ Metric: [how is it measured? include unit and data source]
- [ ] Specification Limit (Upper): [maximum acceptable value]
- [ ] Specification Limit (Lower): [minimum acceptable value, if applicable]
- [ ] Defect Definition: [a defect occurs when CTQ metric exceeds or falls below specification]
- [ ] Customer Validation: [how was the spec limit validated with the customer?]
- [ ] Priority: [High or Medium — what is the cost of failing this CTQ?]

## Pitfalls
- Setting specification limits based on current process capability rather than customer requirements — the spec limit must come from the customer, not from what the process can currently achieve.
- Stopping at the Quality Characteristic level without defining a measurable CTQ — 'good quality' is not a CTQ. 'Defect rate 0.5% or less of units' is.
- Collecting VOC only from satisfied customers — dissatisfied customers and churned customers contain the most valuable signal.
- Having too many CTQs (more than 5–7 for a single project) — the project becomes unmeasurable and unfocused. Use prioritisation to select the vital few.
