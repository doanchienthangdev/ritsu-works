---
type: concept
slug: risk-taxonomy
title: Risk Taxonomy and Classification Framework
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Taxonomy and Classification Framework

*Category: analysis · Toolkit: Risk Management*

## What it is
A hierarchical classification system that organizes all organizational risks into mutually exclusive and collectively exhaustive categories, ensuring consistent risk language across the enterprise and preventing both duplication and blind spots in the risk register.

**Origin:** Risk taxonomies are defined by each organization (no single universal taxonomy exists), but widely adopted structures include those from: ISO/IEC 27005 (information security), Basel II/III (operational risk categories for banks), FERMA (Federation of European Risk Management Associations), and industry bodies. The 6-category structure used in this toolkit draws from common consulting practice at McKinsey, Deloitte, and PwC.

## Why it works
Without a taxonomy, risk identification workshops produce inconsistent results: one business unit calls 'data breach' a Technology risk; another calls it a Compliance risk; a third doesn't surface it at all. A taxonomy acts as a systematic prompt — workshop facilitators run through each category to ensure no class of risk is missed. The MECE (Mutually Exclusive, Collectively Exhaustive) principle ensures every risk has exactly one home in the taxonomy, preventing double-counting in the risk register and heat map.

## When to use
Before any risk identification activity (Phase 2, Step 1). Must be distributed to all risk owners before workshops. Also use when consolidating risk registers across business units that have used different risk classification systems.

## Visual
`tree`

## Step-by-step tutorial
1. Start with the 6 top-level categories (Strategic, Financial, Operational, Compliance, Reputational, Emerging) as the default taxonomy structure. Validate against the organization's regulatory requirements — banks may need Basel II categories; healthcare organizations may need Clinical Risk as a seventh category.
2. For each top-level category, define 3–6 sub-categories specific to the organization. Use examples from past incidents, near-misses, and industry loss databases to make sub-categories concrete rather than abstract.
3. Assign a 3-letter code to each category and sub-category (e.g., STR-01, FIN-02). This code becomes the prefix for risk IDs in the register, making categories immediately visible from the risk ID alone.
4. Validate the taxonomy is MECE: for 10 sample risks from past incidents, confirm each can be unambiguously placed in exactly one sub-category. If a risk could fit two sub-categories, the taxonomy has an overlap — resolve by further defining the boundary between them.
5. Publish the taxonomy as a one-page reference document and distribute to all risk owners before identification workshops. Include 3 concrete examples per sub-category so owners can correctly classify their risks.
6. Review the taxonomy annually — emerging risk categories (e.g., AI/automation risk, physical climate risk) need to be added as they become material to the organization.
7. Create a 'taxonomy exception' process: when a risk genuinely doesn't fit any category, it is a signal that a new category may be needed. Log exceptions in the CRO's office for annual taxonomy review.

## Real-life example — Airbus SE
Airbus maintains a structured enterprise risk taxonomy aligned to its aerospace manufacturing context: Strategic (market demand cycles, program development risk), Industrial (supply chain, manufacturing quality, certification), Financial (programme cost overruns, currency exposure on multi-currency long-term contracts), Compliance (export controls, anti-corruption in defense sales), Security (cyber/industrial espionage — a category elevated after the 2019 espionage incident), and Emerging (climate transition risk affecting aircraft fuel regulations). The taxonomy is published in Airbus's Annual Report and Form 20-F to align investor understanding of the risk profile. Each category in the Annual Report maps directly to the internal risk register taxonomy.

**So what:** A well-designed taxonomy makes external risk disclosure (Annual Report) and internal risk management (risk register) use the same language, reducing translation effort and ensuring no risk category visible to investors is absent from the internal process.

## Template
Define your organization's risk taxonomy by completing this template. Start with the 6 standard categories and customize sub-categories to your industry and business model.

- [ ] Top-level risk category (6 minimum: Strategic, Financial, Operational, Compliance, Reputational, Emerging)
- [ ] Category code (3-letter prefix, e.g., STR, FIN, OPS, COM, REP, EMG)
- [ ] Category definition (1 sentence: what types of risk belong here?)
- [ ] Sub-category name and code (e.g., STR-01: Market Position Risk)
- [ ] Sub-category definition (what is included AND what is excluded from this sub-category)
- [ ] 3 concrete examples of risks in this sub-category from the organization's context
- [ ] Excluded risks (what explicitly does NOT belong here, to prevent classification confusion)
- [ ] Taxonomy owner (who updates this sub-category's content annually?)

## Pitfalls
- Creating too many top-level categories (>10) — more than 10 categories are too complex for workshop facilitation and too granular for Board-level reporting. Counter: keep top-level categories at 6–8; use sub-categories for granularity.
- Using generic, abstract category names — 'Operational Risk' means nothing without sub-categories with concrete examples. Counter: always define sub-categories with industry-specific examples before distributing the taxonomy.
- Treating the taxonomy as permanent — new risk categories emerge (COVID-19 as a pandemic risk category emerged as material for most organizations in 2020 with no prior recognition). Counter: annual taxonomy review is mandatory.
