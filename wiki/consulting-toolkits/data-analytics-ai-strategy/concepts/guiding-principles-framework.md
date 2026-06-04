---
type: concept
slug: guiding-principles-framework
title: Data & AI Guiding Principles
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data & AI Guiding Principles

*Category: governance · Toolkit: Data Analytics & AI Strategy*

## What it is
A set of 6–10 explicit principles that govern how data and AI decisions are made throughout the programme — functioning as tiebreakers when teams face competing priorities, preventing the strategy from being re-litigated at every sprint review.

**Origin:** Standard consulting deliverable in any programme with significant trade-off decisions. Applied to data strategy by McKinsey Digital's CDO programme practice. The principle-based governance approach is foundational to EU AI Act compliance (Article 9: risk management system principles) and NIST AI RMF (2023).

## Why it works
Without guiding principles, every contested decision escalates: 'Should we deploy this model now at 85% accuracy or wait for 92%?' becomes a political debate rather than a principled decision. Guiding principles are not aspirations — they are operational rules that resolve specific, recurring trade-offs. The test of a good guiding principle: two people in disagreement should be able to apply the principle and reach the same conclusion.

## When to use
In Phase 1 (Step 6: define guiding principles) and as a standing reference throughout the programme. Update when a new trade-off pattern emerges that the existing principles do not address.

## Visual
`table`

## Step-by-step tutorial
1. Identify the top 5–8 recurring trade-offs the data and AI programme will face: speed vs quality, cost vs capability, privacy vs personalisation, central control vs business-unit autonomy, model accuracy vs model fairness.
2. For each trade-off, write a principle that specifies which consideration wins when they conflict: 'When speed and quality conflict, quality wins' (not 'we balance speed and quality', which resolves nothing).
3. Test each principle against 3 real past decisions: would applying the principle have produced the right outcome? If not, the principle is either wrong or poorly worded.
4. Write a one-sentence rationale for each principle ('why this matters to us') and an example of a decision it would guide. The example makes the principle operational.
5. Include responsible AI principles explicitly: at minimum, 'Fairness, explainability, and privacy are non-negotiable' and 'No AI in production without a defined human-escalation path for high-stakes decisions'.
6. Publish the principles in the strategy document and reference them explicitly in every architecture decision record, every use-case business case, and every model deployment approval. Principles that are published but never referenced are decorations, not governance.

## Real-life example — Salesforce
Salesforce's 'Trusted AI Principles' (published 2019) include: Responsible (minimise bias), Accountable (explainable outputs), Transparent (AI-generated content disclosed), Empowering (augments human decisions rather than replacing them), and Inclusive (designed to work for all users). These principles have guided specific product decisions: Einstein AI disclosures in all AI-generated content (Transparency principle), fairness testing in Einstein lead scoring (Responsible principle), and the decision to retain a human override in all automated workflows (Accountable principle).

**So what:** Guiding principles are most powerful when they constrain specific product decisions — not when they appear in a strategy deck and are never applied again. The test is whether a junior engineer can look at the principles and know what to do without asking a manager.

## Template
Write 6–10 principles. Each must resolve a specific trade-off, include a one-sentence rationale, and include a concrete example decision it would guide.

- [ ] Principle statement (one sentence — specific enough to resolve a real trade-off)
- [ ] The trade-off this principle resolves (what two competing values does it adjudicate?)
- [ ] Rationale: why does this principle matter to this organisation?
- [ ] Example decision: what specific, real decision would this principle guide?
- [ ] Edge case: is there any scenario where this principle should not apply? (If yes, write the exception explicitly)

## Pitfalls
- Aspirational rather than operational principles: counter: 'We value data quality' is an aspiration. 'Data quality is a prerequisite for AI deployment — no model goes to production on data with completeness below 95%' is a principle that resolves a real trade-off.
- Principles that no two people apply consistently: counter: test each principle with 3 people on 3 real trade-off scenarios. If they produce different answers, the principle is too ambiguous to be useful.
- Publishing principles that are never referenced in decisions: counter: add a 'guiding principle reference' field to every ADR, model deployment checklist, and use-case business case template.
