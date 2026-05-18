---
type: article
slug: growth-playbook-fixture
title: Growth Playbook Fixture — synthetic ICP + positioning + copy
source_kind: markdown_passthrough
source_ref: tests/wiki-sync/fixtures/growth-playbook-fixture.md
source_hash: 93f236bc2af0ed1792fe1f107fe2e5430433fef3e032ceca3682283f6b0ed671
ingested_at: '2026-05-18T05:37:59Z'
generated_by: wiki-sync v3.0 (source RECORD; distill mode)
license_status: public_domain
legacy_v2_verbatim: false
review_state: auto_accepted
---

<!-- generated-by: wiki-sync v3.0 (source RECORD; derived entity pages cite this via ops.knowledge_extractions) -->

# Growth Playbook Fixture — synthetic ICP + positioning + copy

This is a synthetic copyright-clear fixture for v3.0 distill skill acceptance tests. It is original prose covering standard growth/customer-acquisition concepts. Per spec §0 Sprint 5 acceptance: ≥ 2 of 5 acceptance ingests must be growth-domain. This is one of them.

## Concepts

**Product-led growth (PLG)** is a go-to-market strategy in which product usage itself drives acquisition, expansion, and retention rather than sales-led outbound motion. Examples include Slack, Notion, Linear, and Calendly. The defining property: the product creates a "wow moment" within minutes of first use that pulls more users in via word of mouth.

**Ideal Customer Profile (ICP)** is a description of the customer who experiences the most value from your product the fastest, refers others most often, and churns least. ICP is narrower than "target market" — it is a single coherent persona rather than a demographic bucket.

**Wedge** is the narrowest viable segment of an ICP through which a startup enters a market. The classic example is Facebook's wedge: Harvard students (single dorm, then single university, then Ivy League, then college students broadly). A correctly chosen wedge has high willingness to pay AND high referral velocity within the segment.

**Activation** is the moment a new user reaches the "wow moment" — the experience that proves the product's core value claim. Activation rate is the % of signups who reach the activation event within N days of signup. It is the single strongest leading indicator of retention.

**Time-to-value (TTV)** is the elapsed time between signup and activation. Shorter TTV correlates with higher activation rate. For PLG products, sub-5-minute TTV is the loose threshold for a product that "sells itself."

**North-star metric** is the single metric a startup tracks as the proxy for sustainable value delivery to users. Examples: Airbnb = nights booked; Slack = messages sent in active teams; Notion = active workspaces with > 1 weekly editor.

## Observations

**Companies that activate users within their first session retain 4-5x better at 30 days than companies whose median TTV exceeds 24 hours.** This is one of the most replicated findings in PLG telemetry analysis, observable across thousands of B2B SaaS and consumer SaaS products in datasets from Amplitude, Mixpanel, and Heap.

**Founders who personally onboard their first 30 paying customers via 1:1 video calls discover their ICP 3-6 months faster than founders who scale onboarding through documentation alone.** This pattern is documented in Y Combinator's "Do Things That Don't Scale" essay (Paul Graham, 2013) and validated in subsequent founder retrospectives at Airbnb, Stripe, and DoorDash.

**Narrowing the wedge from "small businesses" to "boutique fitness studios with 2-5 locations" typically reduces CAC by 40-60% while increasing LTV by 2-3x within 6 months**, per case studies from the PLG community. The mechanism: narrow positioning enables word-of-mouth referrals within tight professional networks that broad positioning cannot trigger.

## Decisions

**For pre-PMF B2C SaaS startups, pick the wedge BEFORE building the brand.** A brand built around a wedge can later expand; a brand built around "everyone" cannot later narrow. This is a one-way door per Bezos's Type 1/Type 2 decision framework.

**Prefer free trial over freemium for sub-$100 ACV B2C products.** Freemium creates a class of users who never convert; free trial forces a decision moment. The conversion mathematics: if 5% of trial users convert at $50/mo, the unit economics work; if 2% of freemium users convert at $50/mo, you need 2.5x more users to hit the same revenue — which means 2.5x more support burden, 2.5x more cost, and 2.5x more noise in your activation telemetry.

## Ideas

**The interaction between time-to-value and willingness-to-pay is under-explored.** Empirical observation: products with < 5-min TTV often sell at lower ACVs because the perceived "magic" is too easy to dismiss. Products with 30-60 min TTV (requiring some setup investment) often sell at higher ACVs because the user has psychological skin in the game. This trade-off is worth a controlled experiment: same product, two onboarding flows (5-min vs 30-min activation paths), measure ACV willingness 30 days post-activation.

**Founder-led onboarding might be a leading indicator of company longevity** — not just a "do things that don't scale" tactic. Hypothesis: founders who hate the onboarding process (introvert-burnout) optimize prematurely toward self-serve and lose the wedge-discovery signal that early conversations encode. Worth testing across YC batches.
