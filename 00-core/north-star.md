---
title: Ritsu North Star
type: core-doc
slug: north-star
layer: strategy
status: canonical
owner: founder
last_reviewed: 2026-05-29
review_cadence: on-trigger
market_posture: us-led-intermarket
cited_by: []
auto_load: false
ai_synthesized_v0_1: false
founder_confirmed_at: 2026-05-29
ai_synthesized_from: [product.md, positioning.md, icp-summary.md, growth-playbook-fixture-wiki, kotler-metrics-wiki, paul-graham, sean-ellis]
ai_synthesis_note: "v1 (2026-05-21) AI-synthesized. v1.1 (2026-05-29) founder-confirmed + A+ via /update tier1-file (run 77ae5713): restructured into 3 layers (PMF milestone / ongoing metric / leading-indicator ladder), added timeline honesty + leading-vs-lagging label + theory grounding; US-coherence (actual prices $29/$59/$119). Goal ('100 paying who love') + $1B ambition unchanged."
---

<!-- updated-by: /update tier1-file v1.1.1 run=77ae5713-dd82-49a1-84db-26535aeda9c7 @ 2026-05-29 (D-Std override: realign north-star to A+ three-layer structure + honest timeline + US coherence). Goal + ambition preserved; structure/honesty/coherence sharpened. -->

# Ritsu North Star

> The single canonical compressed answer to **"what are we optimizing?"**. Cited by ANY agent making prioritization decisions across 03-gtm / 04-product / 10-metrics. Update on stage transition (current → next stage).
>
> **Read §1 carefully — it has THREE layers the workforce must not confuse:** the PMF *milestone* (the gate), the ongoing *metric* (the value-delivery proxy), and the *leading-indicator ladder* (the daily levers). You act on the ladder; it produces the metric; that clears the milestone.

## 1. The metric of the year

### 1.0 — Three layers, one north-star

| Layer | What | Lagging/Leading |
|---|---|---|
| **(A) PMF milestone** | **100 paying customers who LOVE Ritsu** (the gate). Then 1000. | Lagging |
| **(B) Ongoing north-star metric** | **Weekly retained paying learners who hit the mastery moment** (the value-delivery proxy that keeps mattering after 100 — Airbnb=nights-booked analog). | Slightly-lagging, ongoing |
| **(C) Leading-indicator ladder** | What the workforce moves daily — see §1.3. | Leading |

**How they connect:** the workforce **acts on (C)** → which produces **(B)** → which clears **(A)**. When in doubt, optimize a leading indicator (C), not the milestone (A) directly — you cannot "do" a lagging number.

### 1.1 — The PMF milestone (the gate)

**100 paying customers who LOVE Ritsu.** Then 1000.

This is the **only** gate that matters right now. Not signups (signal, not commit). Not DAU. Not "people who said they liked it" (anecdote). 100 humans paying real money and retaining.

Why this specific number:
- **100 = Paul Graham's "make something 100 people want"** — below it you don't have a business; above it you extrapolate to 1000 and beyond.
- **Love** = durable demand (defined operationally in §2). Lukewarm 100 paying is harder to grow than 30 who love — loved customers refer; lukewarm don't.
- **The "100" are now the US-led, English-speaking, mastery-motivated serious learner** (per `icp-summary.md`) — the "True friends" quadrant (high value × high loyalty). *Provisional on Phase-A validation (see §5).*

### 1.2 — The ongoing north-star metric (what the dashboard tracks forever)

> **Weekly retained paying learners who hit the mastery moment.**

One proxy combining **value** (the mastery moment — the core-value claim), **usage** (weekly), **commercial** (paying), and **durability** (retained). Unlike the milestone, this keeps mattering after 100 → 1000 → beyond. It is the truest single measure of "are we delivering durable value to the right people?" (growth-playbook: a north-star metric is a value-delivery proxy, not a one-time count).

### 1.3 — The leading-indicator ladder (the daily levers)

These are what the workforce can actually *move* — and they *predict* (B) and (A):

| Leading indicator | Target | Owner | KPI |
|---|---|---|---|
| **Activation rate** (signup → <60s magic moment, first session) | ≥ 40% of signups *(refine via SOP-CUSTOMER-002)* | product-orchestrator | `magic_moment_completion_rate` |
| **Week-4 retention** | ≥ 30% | customer-lead | `day_30_retention` / `paid_retention_week_4` |
| **Free → paid conversion** | ≥ 5% (rolling 30d) | gtm-orchestrator | `free_to_plus_conversion` |
| **Sean Ellis "very disappointed"** | ≥ 40% | gtm-orchestrator | `nps_very_disappointed_pct` |

**Activation is the top lever:** first-session activation drives **4-5× better 30-day retention** than >24h time-to-value (replicated PLG telemetry — Amplitude/Mixpanel/Heap). The <60s magic moment (`product.md` §7) IS that first-session activation + the PLG viral engine (share-links).

### 1.4 — Leading vs lagging (so you know what you can act on)

Per the Cadillac/BMW lesson (Kotler): market-share-style counts are **lagging** (reflect past acquisition); customer-equity signals are **leading** (predict future value). For Ritsu: the **milestone + paying-count are lagging**; **activation / week-4 retention / very-disappointed% are leading**. *The workforce can only act on leading indicators* — rank experiments on the ladder (§1.3), measure success on the milestone (§1.1).

## 2. Definition of done

Operationally precise (no wiggle room):

- **"Paying"** = ≥1 successful subscription charge (via Stripe) AND ≥7 days retention from first charge date.
- **"Who love"** = at least one of (in priority order):
  - **Sean Ellis test: ≥ 40% "very disappointed"** if they could no longer use Ritsu (the canonical PMF signal; SOP-METRICS-004 / `nps_very_disappointed_pct`) — **the primary love signal.**
  - NPS ≥ 40 on first in-app survey (SOP-CUSTOMER-018)
  - ≥1 unprompted positive mention (social post, review, message to founder, organic referral)
  - Week-4 retention ≥ 30% across the cohort (proxy when individual signals are sparse)
- **"In 30 days"** = a rolling 30-day **measurement window** (the cadence we report on). Resets Day 1 of each month.

Counter-metric guardrails (don't game the north star):
- CAC payback < 90 days (don't buy paying customers at a loss to hit 100)
- < 5% refund rate within first 30 days (refunds = not really paying)
- 0 catastrophic incidents (data leak, AI hallucination causing real harm — the #1 SERVQUAL bar per `product.md` §6.7)

## 2b. Timeline honesty (the window is a cadence, not a deadline)

**The 30-day window is the measurement *cadence* — NOT a promise of when we hit 100.** From a pre-launch, solo-founder + AI-workforce, US-pivot (weak US network), zero-paying standing start, **time-to-first-100-who-love is a stretch** — realistically measured in months, not the first 30 days. The "100 in 30 days / 1000 in 90 days" is the **forcing-function ambition** that keeps scope wartime-tight; it is **not a deadline whose miss = failure**, and **"1000 in 90 days" is explicitly aspirational**. Stating this prevents two failure modes: demoralization (chasing an impossible literal deadline) and gaming (buying lukewarm "paying" users to hit a date). *Ambition unchanged; framing made truthful.*

## 3. What it replaces

These are **vanity-or-lagging** — never the thing agents are ranked on (rank on the §1.3 leading ladder + the §1.1 milestone):

| Vanity metric | Why it's not the north star |
|---|---|
| DAU / MAU | Activity ≠ love ≠ pay. Can be 10K DAU with $0 ARR. |
| Signups | 90% of signups never reach the magic moment. Free funnel ≠ revenue funnel. |
| Page views / traffic | Pre-funnel signal; not commitment. |
| Ad CTR | Channel-level signal; doesn't predict retention. |
| "People who like the product" (interviews) | Surveyed ≠ observed. SOP-PRODUCT-002 N=10 stranger rule overrides. |
| Press mentions | Vanity. Press doesn't pay. |
| Twitter followers | Cohort-irrelevant for B2C learning. |

Pre-PMF agents MAY optimize these as *inputs*, but the OUTPUT they're ranked on is always the leading ladder → the milestone. When in doubt, ask: "does this move a §1.3 leading indicator toward a paying, loving customer?"

## 4. Long-term north star

**1 billion dollar company.** Concretely: $1B ARR.

**Path arithmetic (founder thesis, revise yearly; ARPU uses live prices verified 2026-05-29 — fetch ritsu.ai/pricing):**
- Live B2C tiers: **Plus $29 / Pro $59 / Ultra $119** per month (annual −17%). Blended B2C ARPU likely **~$30-45/mo** (~$360-540/yr) depending on tier mix.
- $1B ARR ≈ **~1.9-2.8M paid B2C learners** at ~$30-45 ARPU/mo, OR
- ~420K-700K at educator/professional ARPU ($120-200/mo), OR
- a combo of B2C wedge + educator B2B + API platform.

**Most likely shape (founder thesis):**
1. **Years 1-2: B2C wedge.** 0 → ~100K paying learners at ~$30-45 blended ARPU/mo. ARR ~$36-54M.
2. **Years 2-3: educator B2B layer activates.** 1K educators × 50 students each × ~$5/student/mo = ~$300K MRR additive. ARR ~$50-100M.
3. **Years 3-4: enterprise + intermarket expansion.** UK/CA/AU/IN English markets, then SE-Asia. ARR $100M-500M.
4. **Year 4-5: API platform.** Other learning apps embed Ritsu's mastery engine. Usage-based pricing. Pushes to $1B.

**Why this shape:**
- Each layer requires the previous proven (no B2B before the B2C wedge works; no API before B2B network effect).
- Pricing power compounds via brand + data moat (learning paths trained on real mastery curves) + the learning-science authority moat (`positioning.md` §6 preemptive POD).
- AI capability curve cuts cost while raising value (the `ai_ops_cost_as_pct_of_mrr` <5% AI-Native economics thesis).

## 5. When this changes

**Triggers for north-star evolution:**

| Trigger | New north star |
|---|---|
| 100 paying who love (achieved current goal) | "1000 paying retained 30d + ≥40% very-disappointed in 90 days" |
| 1000 paying retained 30d (PMF achieved) | "$1M MRR in 6 months" (distribution stage) |
| $10M ARR | "$50M ARR + 80% week-4 retention" (scaling stage) |
| Educator B2B activates (≥10 paying educators) | parallel B2B north star with B2C |
| Market shift (regulatory, competitive) | re-author from first principles |
| 6-month default refresh | sanity check even if no trigger fired |
| Founder energy reset (post-burnout / sabbatical) | re-author with current motivation; never lock-in stale ambition |
| **Phase A invalidates US-led** | re-author the milestone's "who" (the US segment is a confirmed-hypothesis, not observed truth — see below) |

**Current stage:** GTM (pre-PMF, 0 paying).
**Next stage:** PMF-scaling (1000 paying retained 30d).
**Provisional note:** the US-led "who" (§1.1) inherits the trio's Phase-A validation gate — it is a confirmed hypothesis until ~5-10 US interviews + the first paying cohort confirm it. The metric STRUCTURE here is stable; only the "who" is provisional.
**Stage-transition ceremony:** founder writes new north star + cofounder co-approves + PR Tier C + capability `north-star-stage-X` /cla propose. Old north star moves to `## Historical north stars`.

## 6. Theory grounding + provenance

Anchored in: **Paul Graham** ("make something people want" — the milestone §1.1); **Sean Ellis** (40% "very disappointed" PMF test — the primary love signal §2); **growth-playbook** (north-star metric = ongoing value-delivery proxy §1.2; activation = the strongest leading indicator + first-session activation → 4-5× retention §1.3); **Kotler** (leading-vs-lagging via the Cadillac/BMW customer-equity lesson §1.4; CLV; the "True friends" quadrant = the loved 100 §1.1). Coheres with `product.md` (magic moment = activation), `positioning.md` (the belief that produces love), `icp-summary.md` (the US-led "who").

## Historical north stars

(none yet — current is v1.1)

## 7. Versioning

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-21 | AI-synthesized v1: "100 paying who love in 30 days, then 1000 in 90 days"; $1B long-term; vanity-exclusions; triggers. |
| 1.1 | 2026-05-29 | A+ refresh via `/update tier1-file` (run 77ae5713, D-Std). **Restructured §1 into 3 layers** (PMF milestone / ongoing metric = "weekly retained paying learners who hit the mastery moment" / leading-indicator ladder). Added **§1.4 leading-vs-lagging** label, **§2b timeline honesty**, **Sean Ellis very-disappointed as primary love signal**, **§6 theory grounding**. **US-coherence**: §1.1 "100" = US-led ICP; §4 ARPU fixed to live prices ($29/$59/$119, was $5-15 / $7-15); activation = product magic moment. **Goal + $1B ambition unchanged** — structure + honesty + coherence + actionability sharpened. Founder Phase-3 review: ongoing metric = option (a). Provisional-on-Phase-A note added. |
