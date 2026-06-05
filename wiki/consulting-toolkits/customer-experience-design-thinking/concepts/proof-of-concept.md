---
type: concept
slug: proof-of-concept
title: Proof of Concept (PoC)
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: prototyping
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Proof of Concept (PoC)

*Category: prototyping · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A minimal coded implementation of the core technical mechanic of a proposed solution — built specifically to validate that the key technical or algorithmic component is feasible, before investing in the full product build.

**Origin:** Standard software engineering practice; adopted into the Design Thinking prototyping toolkit to bridge the gap between design prototypes and production code when technical feasibility is the key unknown.

## Why it works
Some design ideas are technically unproven — they require an algorithm, an AI model, an API integration, or a hardware component whose performance at the required quality level is uncertain. A PoC tests this uncertainty cheaply, before the full product is built and the team discovers the technical constraint too late to pivot.

## When to use
Use in Phase 8 (Prototype) for any proposed solution that includes a technically uncertain component. Build the PoC in parallel with hi-fi prototyping so both technical feasibility and user experience are validated simultaneously.

## Visual
`none`

## Step-by-step tutorial
1. 1. Identify the single most technically uncertain element of the proposed solution: the algorithm, the data pipeline, the API, or the model that is required but unproven at the required performance level.
2. 2. Write the PoC hypothesis: 'We believe [technical component] can achieve [performance metric] using [approach]. We will know this is validated when [measurable criterion].'
3. 3. Scope the PoC to the minimum code required to test the hypothesis — not a full feature, just the core mechanic.
4. 4. Build the PoC in the least time possible: typically 1–3 days for a skilled engineer.
5. 5. Measure the PoC against the hypothesis criterion. Document: does it meet the performance metric? What are the edge cases and failure modes?
6. 6. Present PoC results to the design team: 'The technical hypothesis is validated / not validated. The constraint we discovered is X. The design implication is Y.'

## Real-life example — Zalando
Zalando's design team proposed a real-time outfit recommendation feature that required an image-recognition model to identify the user's uploaded photo and suggest complementary items. The key technical unknown: could the model identify clothing items with sufficient accuracy from a typical mobile phone photo? The PoC was a 3-day Python notebook that tested the model on 200 sample photos. Result: accuracy was 92% for standard clothing but 31% for accessories (scarves, jewelry). This PoC finding led to a design decision to scope the feature to clothing-only in v1.0 — a decision that would have been made after 6 months of full development without the PoC.

**So what:** A PoC converts 'I assume the technical component works' into 'I know the technical component works, and I know its constraints.'

## Template
Define the technical hypothesis before building. Scope the PoC to the minimum required to test it. Document results honestly — a PoC that fails validates the constraint, not the engineer.

- [ ] Technical component being validated: ___
- [ ] PoC hypothesis: 'We believe ___ can achieve ___ using ___. Validated when: ___'
- [ ] PoC scope (what will be built): ___
- [ ] Estimated build time: ___ days | Engineer: ___
- [ ] Performance criterion: ___
- [ ] PoC result: Meets criterion Y/N | Observed performance: ___
- [ ] Edge cases / failure modes discovered: ___
- [ ] Design implication: ___
- [ ] Go / Pivot / No-Go for the full feature: ___

## Pitfalls
- PoC scope creep: a PoC that grows into a full feature defeats its purpose. Counter: the PoC budget is a maximum of 3 engineer-days. Any scope beyond that requires a separate decision.
- Skipping the PoC for 'obvious' technical features: engineers who are confident in the technical feasibility skip the PoC. Counter: any feature that has not been demonstrated at the required performance level in a live system requires a PoC.
