---
title: "Ritsu Distribution Strategy — The Channel Mix for the Deadline-Bearing STEM/ML Masterer (Domont Pillar 3)"
type: strategy-doc
pillar: 02-sales
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Pillar-3 — Distribution Strategy"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/icp-summary.md
  - 00-core/north-star.md
  - 00-core/positioning.md
  - 00-core/product.md
  - 01-marketing/icp/persona-portrait.md
  - 01-marketing/icp/customer-journey.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-ownership.yaml
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/distribution-channel-matrix.md
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/process.md
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Foundational doc.** The canonical answer to **"through which channels does a stranger first reach Ritsu, in what order, and at what cost?"** — Pillar 3 (Sales Distribution) of the Domont 5-Pillar commercial-strategy layer, re-cast for a B2C-PLG-solo+AI company at true-zero. This is the *strategy* the four 60-day acquisition engines and the `03-gtm` distribution SOPs (`SOP-GTM-003/006/008/009`) execute. It does not duplicate the *tactical* channel sequence (budgets, cadence, per-post playbooks) — that lives in `03-gtm/`. It fixes the **channel-selection logic + channel economics + sequence rationale** those SOPs must obey.
>
> **Honest at true-zero.** Every claim is tagged `observed` (grounded in `supabase-analytics` Door-2), `inferred` (market / framework / the canonical persona), or `hypothesis` (untested). The two load-bearing channel facts are unproven: per-channel CAC (no real paid acquisition yet) and the organic share-loop's K-factor (15 shares, **all founder**, 0 organic stranger conversion). This doc is a decision-grade *plan to instrument and sequence*, not a claim of proven channel performance.

---

## 0. The one-sentence distribution strategy

**Lead with a zero-cash organic spine — a creator-authority layer + a community-seeding layer + the in-product share-loop, aimed at the pre-assembled learning-method / hard-STEM communities where the [deadline-bearing STEM/ML masterer](../../00-core/icp-summary.md) already lives — prove message-and-channel fit on near-$0 CAC first, and gate paid acquisition (Reddit / YouTube / Meta, US CPI ~$2.50–$5.28) behind a proven activation funnel; the product self-distributes at ~$0 marginal cost, so "distribution" here means *acquisition*, not *delivery*.**

This is the channel translation of three locked decisions: the [US-led wedge](../../00-core/icp-summary.md) (a skeptical, authority-trusting, gimmick-averse buyer → **authority > raw reach**), the [60-day plan](../../00-core/north-star.md) (4 parallel engines gated on **N=10 US-stranger activation ≥40%**), and the [true-zero reality](#1-why-the-domont-matrix-must-be-re-cast-for-b2c-plg-solo) (a solo founder + AI workforce + ~$0 ad budget cannot buy reach, so it must **earn** it).

---

## 1. Why the Domont matrix must be re-cast for B2C-PLG-solo

The [Distribution Channel Selection Matrix](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/distribution-channel-matrix.md) scores eight **physical-goods sales channels** (Retail, Wholesale, Online, Own Stores, Franchising, Strategic Partnerships, Multi-channel, Direct Sales Team) on five criteria. Applied literally, six of those eight are nonsensical for Ritsu — there is no shelf, no dealer, no franchisee, no field sales team. The framework's *logic* is right (an explicit, weighted, multi-criteria channel choice beats defaulting to the channel the founder knows best); its *channel taxonomy* must be replaced.

**Two re-castings make the matrix fit Ritsu:**

### 1.1 "Distribution" = acquisition, not delivery

For a physical product, distribution is *delivery* — getting the good into the buyer's hands costs real money per unit (logistics, dealer margin, retail markup). For a web-native SaaS, **delivery is free**: the product is a URL; serving the Nth user costs near-$0 marginal infrastructure (the only real per-user cost is AI inference, governed separately in `08-finance`). So the high-leverage channel decision is **not "how do we deliver Ritsu?"** (the answer is trivially "the open web") **but "how does a stranger first discover Ritsu and arrive at the upload box?"** Every channel below is an *acquisition* channel — a different answer to "where does the qualified click come from?"

> **Implication for the funnel.** Because delivery is free and the product *is* the pitch (the [ACT stage has no human/sales step](../../01-marketing/icp/customer-journey.md) — the `<60s` magic moment sells itself), the entire channel strategy collapses to one job: **get the right stranger to the upload box with intent.** The [Sales & Marketing Funnel](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md) frame (§5) carries the downstream conversion; distribution owns only AWARE → APPEAL (the top two of Kotler's 5A).

### 1.2 The five criteria, re-weighted for the solo founder at true-zero

The Domont matrix's default weights — Reach 25%, Margin 20%, Control 20%, Investment 15% (inverse), Strategic-Fit 20% — assume a funded company optimizing margin. A solo-founder-at-true-zero optimizes a different objective: **prove the wedge with the scarcest resource (founder hours + ~$0 cash), then scale only what's proven.** So:

| Domont criterion | Re-cast for Ritsu | Weight | Why this weight |
|---|---|:--:|---|
| Customer Reach | **Reach** — qualified strangers the channel can put in front of the wedge | **20%** | Reach matters, but for a *skeptical authority-trusting* buyer, mass reach is worth less than precision (the persona's [`Channel we avoid`](../../01-marketing/icp/persona-portrait.md): "avoid the broad reach, not the platform"). Down-weighted from 25%. |
| Investment Required (inverse) | **Cash cost / CAC** (inverse — lower cash = higher score) | **20%** | At ~$0 budget this is near-binding. A channel that needs real ad spend before message-fit is proven is a near-disqualifier *now* (re-rateable post-funding). |
| Strategic Fit with ICP | **Wedge-fit** — does the channel's audience match the locked job (master a hard graded course)? | **25%** | **The highest weight.** A narrow wedge wins only by hitting the *exact* psychographic; a high-reach low-fit channel burns the scarcest resource (founder attention) on the wrong stranger. Up-weighted from 20%. |
| Control Level | **Control** — own the audience relationship + the data + can't be de-platformed | **15%** | Matters for durability (owned > rented), but pre-PMF *speed-to-signal* beats *long-run control* — an owned SEO asset that takes 6 months to rank is worth less *today* than a rented community thread that converts tonight. |
| Margin Impact | **Founder-effort** (inverse — lower founder-hours/unit = higher score) | **20%** | Replaces "margin" (margin is ~uniform across channels since delivery is free). The *real* scarce input is **founder hours** — the [60-day plan](../../00-core/north-star.md) has the founder building *both* the product *and* `ritsu-works` while AI runs content "per the founder's system." A channel that needs constant founder labor doesn't scale on a 1-person team. |

> **The single most important re-weighting:** Wedge-fit (25%) + Cash-cost (20%) now dominate, and Founder-effort (20%) replaces Margin. This is the mathematical expression of "earn reach before you buy it, and spend the founder's hours only where the wedge is exact." It is *deliberately* a true-zero weighting — see §8 for when to re-weight.

---

## 2. The candidate channels (the five-channel taxonomy)

Re-cast from the Domont eight, these are the five acquisition channels available to Ritsu. Each is defined by *the answer it gives to "where does the qualified click come from?"*

| # | Channel | What it is for Ritsu | Domont analog | Owned vs Rented |
|---|---|---|---|---|
| **C1** | **Organic PLG share-loop** | The in-product [share-link](../../01-marketing/icp/customer-journey.md) — an activated masterer pastes a quiz / Knowledge-Map link into a course Discord; a stranger clicks → enters the funnel. The product distributes itself. | Direct (the product *is* the channel) | **Owned** (the mechanic) |
| **C2** | **Creator-affiliate / authority** | Sponsored or co-built content with learning-science + hard-STEM creators (Justin Sung, Ali Abdaal, StatQuest, Med School Insiders) — host-read, managed-placement, or affiliate. Borrows the creator's *trust*, not just their reach. | Strategic Partnerships | **Rented** (the audience) |
| **C3** | **Community-seeding (organic)** | Founder/AI participates honestly in the pre-assembled communities (r/learnmachinelearning, r/Anki, r/GetStudying, fast.ai forums, course Discords) — help first, link second. The [Collison-install](../../01-marketing/icp/persona-portrait.md) recruiting surface for N=10. | Direct Sales (relationship-led, but 1:many) | **Rented** (the community) |
| **C4** | **Paid acquisition** | Bought placements: Reddit Promoted Posts in ML/STEM subs, YouTube Ads (managed-placement on study/ML channels + custom-intent), Meta/IG interest+lookalike, X promoted. Buys reach directly. | Online / Multi-channel (paid) | **Rented** (the impression) |
| **C5** | **Owned content-SEO** | Long-tail SEO + comparison content ("Ritsu vs NotebookLM for lecture PDFs", "how to actually learn backprop", "[textbook] quiz") on ritsu.ai/blog — compounds over months. Each [situational workflow](../../00-core/product.md) = a content cluster. | Own Stores (the owned storefront/asset) | **Owned** (the asset) |

> **Note on the missing Domont channels.** Retail, Wholesale, Franchising are structurally absent (no physical good). The **B2B educator channel** (a professor distributing Ritsu to a class) is real but **deferred post-PMF** — it is the [land-and-expand expansion ladder](../../01-marketing/icp/persona-portrait.md) (S17), seeded *bottom-up* by C1 (a student-champion who loved the B2C product), not a first-100 channel. It is out of scope for this foundation.

---

## 3. The channel scoring matrix (the Domont decision, executed)

Each channel scored 1–5 on the five re-cast criteria (§1.2), weighted, summed. Scores are `inferred` from the canonical persona + market deep-research; the *weights* are the true-zero policy from §1.2. **Read the rank-order, not the decimal** — the matrix's job is to force an explicit, defensible *sequence*, exactly as the Domont matrix intends (and exactly as it drove [Tesla's direct-model decision](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/distribution-channel-matrix.md)).

| Channel | Reach (20%) | Cash-cost ↓ (20%) | Wedge-fit (25%) | Control (15%) | Founder-effort ↓ (20%) | **Weighted** | **Rank** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **C2 Creator-authority** | 4 | 4 | **5** | 2 | 3 | **3.75** | **①** |
| **C1 Organic share-loop** | 2 | **5** | **5** | **5** | **5** | **4.40** | **①\*** |
| **C3 Community-seeding** | 3 | **5** | **5** | 3 | 2 | **3.70** | **③** |
| **C5 Owned content-SEO** | 3 | 4 | 4 | **5** | 3 | **3.75** | **④** |
| **C4 Paid acquisition** | **5** | 1 | 3 | 2 | **5** | **3.25** | **⑤** |

**Score reads (the *why* behind each number — this is the decision-grade part):**

- **C1 Organic share-loop (4.40, the structural winner)** — perfect on cash (the loop is free), control (we own the mechanic + the [`view_count` signal is already instrumented](#5-channel-economics-the-contribution-model) `observed`), wedge-fit (a share *is* a peer recommendation inside the exact deadline-cohort — the persona's [`Virality mechanism`](../../01-marketing/icp/persona-portrait.md)), and founder-effort (once built, it runs with zero founder labor). It scores **2/5 on reach for one brutal reason: it has a cold-start problem** — a share-loop with zero activated users produces zero shares. It is the *destination* engine, not the *ignition* engine. **The matrix says C1 is the highest-value channel *and* the one that cannot go first.** This single tension defines the whole sequence (§7).
- **C2 Creator-authority (3.75, the ignition winner)** — the highest *wedge-fit* of any *cold-start-capable* channel (5/5) because this buyer trusts **expert > peer > numbers** (persona [`Social proof type`](../../01-marketing/icp/persona-portrait.md): "study-science creators carry more weight than testimonials with a method-distrusting audience"). It is cash-cheap relative to paid (a mid-tier host-read or affiliate deal, sometimes performance-only) and *solves C1's cold-start* by injecting the first activated cohort. It scores **2/5 on control** (rented audience, creator can churn) and **3/5 on founder-effort** (deal-making + briefing is founder-time-heavy). **This is the channel that goes first** (highest fit among ignition-capable channels).
- **C5 Owned content-SEO (3.75)** — the *compounding* asset: perfect control (owned), the [preemptive learning-science + citation moat](../../00-core/positioning.md) expressed as content (the comparison page "Ritsu vs NotebookLM for lecture PDFs" attacks [R2](../../00-core/icp-summary.md) at the ASK stage). It ranks #4 *today* only because of **latency** (cash 4 / effort 3 are fine, but SEO takes months to rank → low *speed-to-signal*). It is a slow-burn that must *start early* precisely because it's slow — the rank understates its strategic value once PMF is near.
- **C3 Community-seeding (3.70)** — perfect wedge-fit + cash (free, the communities are pre-assembled), but **2/5 founder-effort** (honest community participation does not scale — it is 1:few, founder-hours-bound, and punishes automation/ad-tone). It is the **N=10 recruiting surface** (`SOP-PRODUCT-002` Collison-install) and a *seeding* tactic, not a *scaling* channel.
- **C4 Paid acquisition (3.25, deliberately last)** — perfect reach + effort (you buy reach instantly, AI runs the creative), but **1/5 on cash** (it is the only channel that needs real money *before* message-fit is proven) and only **3/5 wedge-fit** (paid targeting on this skeptical audience converts worse than earned authority — ad-tone is a [drop-off trigger at AWARE](../../01-marketing/icp/customer-journey.md)). **The matrix's verdict: paid is the *amplifier of a proven message*, never the *discoverer of one*.** It is gated behind activation proof (§4, §7).

> **The matrix's headline output (the Tesla-equivalent insight):** the two highest-scoring channels are C2 (creator-authority, 3.75) — both *organic / earned*, both ~$0 cash. **Paid (C4) scores lowest.** This is not a coincidence of weighting; it is the structural truth of a true-zero B2C-PLG-solo company: **you must earn distribution before you can afford to buy it, and the buyer you've chosen rewards earned trust over bought reach.** The mix is *organic-spine-first by arithmetic, not by preference.*

---

## 4. The PLG gate — the rule that overrides the matrix score

A channel's matrix rank says *which* channel is most valuable. It does **not** say *when* to turn it on. The [60-day plan](../../00-core/north-star.md) imposes a hard gate that supersedes raw rank:

> **No paid acquisition (C4) and no broad scaling of any channel until the product proves it can activate a stranger: N=10 US-stranger activation ≥ 40%** (`SOP-PRODUCT-002`).

The logic is the [Sales & Marketing Funnel](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md)'s #1 pitfall, stated for Ritsu: *"optimising top-of-funnel when the real problem is mid-funnel conversion — more leads into a leaky funnel wastes budget."* At true-zero, **the funnel is unproven below the upload box** — the [two moments of truth](../../01-marketing/icp/customer-journey.md) (the `<60s` aha on dense math, and the `$29` money-moment) have *never once fired* on a real stranger. Pouring paid reach into an unvalidated funnel is the canonical way to burn a startup's cash. So:

- **Channels C1/C2/C3 run *during* the gate** — they are the *instruments* that produce the N=10 cohort and the activation reading. They are ~$0, so a failed reading costs only founder-time, not cash.
- **Channel C4 (paid) is the *reward* of clearing the gate** — once activation ≥40% proves the funnel holds, paid becomes a rational *amplifier* (you're now buying a *known* conversion, not gambling on an unknown one).
- **Channel C5 (SEO) starts during the gate but compounds after** — its latency means it must be seeded early regardless, but its payoff lands post-gate.

> **This gate is the single most important sequencing rule in the doc.** It is why the matrix-#1 *amplifier* (paid) is *last in time*, and why the ~$0 *instruments* (creator + community + share-loop) are *first* — they double as the activation-proof mechanism. The four [60-day acquisition engines](#7-the-channel-sequence-the-60-day-distribution-plan) map 1:1 onto C1–C4, gated exactly here.

---

## 5. Channel economics — the contribution model

The Domont matrix's *"essential companion output"* is the **channel economics model** (unit contribution per channel). For Ritsu this is **CAC per channel** measured against a single **contribution-per-paying-customer**, since delivery is free.

### 5.1 The shared contribution figure (what one paying customer is worth)

From the [price-derived contribution estimate](../../00-core/product.md) (the persona headline CLV is ~$200-350; this conservative $130-180 is the contribution basis) and [live pricing](../../00-core/product.md), grounded where possible in Door-2:

| Input | Value | Tag |
|---|---|---|
| Plus price | **$29/mo** (Pro $59, Ultra $119; annual −17%) | `observed` (live pricing + `live.payments`) |
| Payment processor fee | ~3% (LemonSqueezy is Merchant-of-Record; `live.payments.fee_usd`) | `observed` (schema; n=2) |
| AI inference cost / paying user / mo | governed to **< 5% of MRR** (`ai_ops_cost_as_pct_of_mrr`, `08-finance`) | `inferred` (target) |
| **Gross contribution / paying-Plus / mo** | **~$26** ($29 − ~$1 fee − ~$1.50 inference) | `inferred` |
| Retained lifespan | **~5–7 academic-cycle months** (recurring-deadline cadence; churns between terms) | `hypothesis` |
| **Lifetime contribution (LTV)** | **~$130–180** (≈ $26 × 5–7) | `hypothesis` |

> **Honesty flag (R1).** This LTV is a *hypothesis*, not a measurement. **`live.payments` shows exactly 2 paid rows, both founder test-card** (`observed`). No real paying customer has ever retained. The whole contribution model rests on the [unproven WTP bet](../../00-core/icp-summary.md) the N=10 watch exists to settle. Treat ~$130–180 as a *planning anchor to falsify*, not a fact.

### 5.2 CAC + contribution per channel

| Channel | Cash CAC (US) | Founder-hours / acquired user | LTV : CAC (cash) | Status / signal |
|---|---|---|---|---|
| **C1 Organic share-loop** | **~$0** | ~0 (after build) | **effectively ∞** (cash) | `view_count` on `live.session_shares` is the K-factor proxy — **instrumented today**; 15 shares, **0 organic conversion** (`observed`). The economics are unbeatable *if the loop ignites*. |
| **C2 Creator-authority** | **~$0–low** (host-read flat fee, or affiliate / rev-share = performance-priced) | medium (deal + brief) | **high if affiliate** (rev-share caps downside) | No spend yet (`observed` = 0). Prefer **affiliate / performance** structure first so CAC is self-limiting; flat host-reads only after a creator converts. |
| **C3 Community-seeding** | **~$0** | **high** (1:few, non-scaling) | **high but capacity-bound** | Free but founder-hour-capped; the N=10 recruiting surface, not a volume channel. |
| **C5 Owned content-SEO** | **~$0 cash** (founder/AI authored) | medium upfront, ~0 ongoing | **high, lagged** | Compounds; CAC → ~$0 as the asset ranks. Latency is the cost, not cash. |
| **C4 Paid acquisition** | **~$2.50–$5.28 CPI** (US app-install benchmark) → **CAC ≈ $50–105 / paying** at a 5% free→paid conversion | low (AI runs creative) | **~1.2×–3.6×** at planning LTV $130–180 — **thin, conversion-sensitive** | **No spend yet** (`observed` = 0). The math only clears the [<90-day CAC-payback guardrail](../../00-core/north-star.md) *if* free→paid ≥ ~5% — which is itself unproven (R1). This is *why* paid is gated. |

**The decisive economics read:**
- **C4 paid is a knife-edge.** At US CPI ~$2.50–5.28 and a *hoped* 5% free→paid, CAC lands ~$50–105 against a *hoped* LTV ~$130–180 → LTV:CAC ~1.2–3.6×. The low end (1.2×) **violates the [<90-day payback guardrail](../../00-core/north-star.md)**. Paid is only rational once the *real* free→paid rate is known — confirming §4's gate from the economics side, not just the funnel side.
- **C1/C2/C3/C5 are all ~$0 cash**, so their LTV:CAC is dominated by founder-hours, not money. The constraint that separates them is **scalability of founder-effort**: C1 and C5 scale (build-once); C2 is semi-scalable (each deal is bespoke but the asset persists); C3 does *not* scale (pure founder-hours). This is the §1.2 founder-effort weight made economic.

### 5.3 The instrumentation gap that blocks `channel_cac_by_channel` (critical)

> **The KPI [`channel_cac_by_channel`](../../knowledge/kpi-ownership.yaml) (owner: `gtm-orchestrator`, sub-pillar `03-distribution-engine`) cannot be computed today, because there is no acquisition-channel field anywhere in Door-2.** Verified `observed`: `live.profiles`, `live.sources`, `live.payments`, `live.session_shares` carry **no UTM, no referrer, no first-touch, no signup-source column.** `sources.source_type` is *content origin* (PDF/YouTube), not *acquisition channel*; `blog_post_views` / `docs_article_views` / `learn_tutorial_views` are *anonymous* (`session_hash`, not `user_hash`) so they cannot be joined to a signup.

**The one channel signal that IS live:** the share-loop's **`session_shares.view_count`** — the K-factor / virality proxy for C1, instrumented today (currently all founder, 0 organic). C1 is therefore the *only* channel whose economics can be measured *now*; the other four are dark until attribution is built.

**Prerequisite the GTM distribution SOPs must build before per-channel CAC exists:**
1. **First-touch UTM tagging at signup** — every acquisition link (creator code, Reddit promoted post, SEO landing, share-link) carries a UTM; the signup event persists `first_touch_channel` to a Product field that the [Door-2 contract](../../knowledge/analytics-sync-contract.yaml) then exposes (a founder-D-MAX product-side view addition + a contract bump). This is the **single highest-leverage instrumentation task** in the distribution pillar — without it, `SOP-GTM-009` (channel attribution + double-down) is inert and "double-down on the best channel" is unanswerable.
2. **Share-link → conversion attribution** — extend `session_shares` so a clicked link's downstream signup is traceable (the [ADVOCACY-loop KPI](../../01-marketing/icp/customer-journey.md): organic-stranger-referral-signups, currently 0).

Until (1) lands, **`channel_cac_by_channel` starts empty and CAC is planned, not measured.** Stating this prevents the failure mode of "optimising channels" on data that doesn't exist.

---

## 6. The funnel each channel feeds (where distribution hands off)

Distribution owns the *top* of the [5A funnel](../../01-marketing/icp/customer-journey.md); it must hand a *qualified* click to the product. Mapping each channel to the funnel stage it feeds — and the [Domont funnel pitfall](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md) it must respect:

| 5A stage | Channels that feed it | The hand-off (what "qualified" means) | Stage KPI |
|---|---|---|---|
| **AWARE** | C2 (creator), C3 (community), C5 (SEO long-tail) | A *qualified click* to ritsu.ai with intent ("built for *my* course"), from a wedge surface | qualified landing sessions by source (UTM) |
| **APPEAL** | C2, C5 (comparison content), the landing page itself | Lands on a hero that reads as *a method to master a hard course*, not a quiz toy ([R2 perception risk](../../00-core/icp-summary.md)) | landing → signup-intent rate |
| **ASK** | C5 ("Ritsu vs NotebookLM" comparison page), C3 (Discord "anyone tried Ritsu?") | The skeptic's head-to-head resolves in Ritsu's favor on **accuracy + the multi-week PATH** | research → signup rate |
| **ACT** | *(product, no channel)* | — the product self-distributes; channels stop here | free→paid at first hard limit |
| **ADVOCACY** | **C1 (share-loop)** — the loop *closes back to AWARE* | A stranger clicks a share-link → sees the PATH (not a paywall) → enters AWARE | organic stranger-referral signups (**0 today**) |

> **The structural elegance: C1 is both the last stage and the first.** The share-loop is the only channel that is *generated by* the funnel (an activated, loving user) and *feeds back into* it (a new stranger). It is the PLG flywheel — which is exactly why it scores #1 on the matrix and exactly why it cannot ignite cold. **C2 (creator-authority) is the spark that fills the funnel; C1 (share-loop) is the flywheel that keeps it turning once full.**

**The funnel pitfall, stated for Ritsu:** do not scale *any* AWARE channel (especially paid C4) while the **APPEAL→ASK→ACT** middle is unproven — that is the [Domont "leaky funnel"](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md) failure. The §4 gate is the operational guard.

---

## 7. The channel sequence — the 60-day distribution plan

The sequence is the matrix-rank *bent by* the §4 gate and the C1-cold-start problem. It is the **strategic ordering** the four [60-day engines](../../00-core/north-star.md) execute; the *tactical* week-by-week cadence + budgets live in `03-gtm/` (`SOP-GTM-003/006/008/009`), not here.

```
PHASE 0  (gate: activation unproven)         PHASE 1  (gate cleared: activation ≥40%)
─────────────────────────────────────        ──────────────────────────────────────
  C2  Creator-authority   ── ignition ──►       C2  scale the proven creator pattern
  C3  Community-seeding   ── N=10 recruit        C4  Paid acquisition  ◄── UNLOCKED
  C1  Share-loop          ── build + seed        C1  share-loop now ignited (loving
  C5  Content-SEO         ── start (latency)          users exist → organic shares fire)
                                                  C5  SEO compounding (ranks landing)
        │                                                        ▲
        └──────────  N=10 US-stranger activation ≥40%  ─────────┘  (SOP-PRODUCT-002 gate)
```

**The four moves, in order of *first action* (mapped to the 4 engines + their `03-gtm` SOPs):**

1. **C2 Creator-authority spine — *first, the ignition engine.*** Highest cold-start-capable wedge-fit. Start with **affiliate/performance-priced** deals with mid-scale learning-science + hard-STEM creators (the persona's [top-fit channels](../../01-marketing/icp/persona-portrait.md): Justin Sung ~195K, Benjamin Keep ~150–250K, StatQuest ~1.6M, Med School Insiders ~1.8M, Ninja Nerd ~3M — *authority over raw reach*; performance structure caps CAC downside). The **AI-avatar content factory** ([the public face](../../00-core/north-star.md)) runs *alongside* this — an owned creator voice on the same surfaces, AI-produced "per the founder's system." → maps to `SOP-GTM-008` (creator discovery) + the creator-spine + avatar engines.
2. **C3 Community-seeding — *concurrent, the N=10 recruiting surface.*** Founder hand-recruits the [N=10 deadline-bearing masterers](../../01-marketing/icp/persona-portrait.md) from r/learnmachinelearning, fast.ai forums, course Discords, #studytwt — each mid-course with a live graded deadline (Collison-install, `SOP-PRODUCT-002`). Help first, link second; never ad-tone (it's a [AWARE drop-off trigger](../../01-marketing/icp/customer-journey.md)). This is *also* where the activation reading comes from. → maps to `SOP-GTM-006` (multi-channel deploy) + `SOP-CUSTOMER-006`.
3. **C1 Share-loop — *build + hand-seed during Phase 0; ignites in Phase 1.*** The mechanic exists (15 shares) but is 100% founder. The Phase-0 job is to (a) make the [share-link destination win on the PATH](../../01-marketing/icp/customer-journey.md) (a visible multi-week path + Knowledge Map, *not* a paywall — so it out-positions free NotebookLM), and (b) **hand-seed one live course cohort** so a single Discord reaches share-link critical mass and the *first organic stranger-referral fires*. The product share-loop engine. → the PLG flywheel; instrumentation via `session_shares.view_count` + the §5.3 attribution build.
4. **C5 Content-SEO — *start early (latency), compounds post-gate.*** Seed the comparison cluster ("Ritsu vs NotebookLM for lecture PDFs" — the [ASK-stage R2 weapon](../../00-core/icp-summary.md)) + the [situational-workflow](../../00-core/product.md) long-tail. Slow to rank → must start in Phase 0 to pay off in Phase 1+. → the owned-content engine.
5. **C4 Paid acquisition — *unlocked only at the gate.*** The **paid message-fit engine**. Once activation ≥40% proves the funnel, run small, tightly-targeted tests (Reddit promoted posts in the [top-fit subs](../../01-marketing/icp/persona-portrait.md), YouTube managed-placement on study/ML channels, Meta interest+lookalike) to *amplify the message C2/C3 already proved* and to *find the message-fit* the funnel rewards — held to the [<90-day CAC-payback guardrail](../../00-core/north-star.md). Kill any placement whose CAC breaches it (`SOP-GTM-009` stop-and-double-down). → maps to `SOP-GTM-009` + the paid engine.

> **Why this order, in one line:** **earn trust where the skeptic already is (C2/C3) → build the flywheel and seed it (C1) → compound the owned moat (C5) → buy amplification only once the funnel is proven (C4).** It is the matrix-rank (organic-first) executed under the activation gate (paid-last) around the share-loop's cold-start (ignite-then-flywheel).

---

## 8. When to re-weight the matrix (the governance hook)

The §1.2 weights are a **true-zero policy**, not a permanent law. They are deliberately tuned to "earn before you buy" because cash is the binding constraint *now*. Re-run the matrix (and likely re-sequence) when any of these fire:

| Trigger | Likely re-weighting | Effect on the mix |
|---|---|---|
| **Activation ≥40% proven (gate cleared)** | Cash-cost weight ↓; Reach weight ↑ | C4 (paid) becomes rational → moves from last to a funded amplifier. |
| **First real funding / ad budget** | Cash-cost no longer near-binding | C4 re-rates upward across the board; reach can be bought. |
| **`channel_cac_by_channel` goes live (attribution built)** | Channels re-scored on *measured* CAC, not planned | The whole matrix shifts from `inferred` to `observed` — the first honest re-rank. |
| **A creator partnership proves a repeatable CAC** | Wedge-fit confirmed `observed` for C2 | C2 scales from bespoke deals to a systematized engine. |
| **Free→paid rate measured (R1 settles)** | The LTV anchor (§5.1) firms or breaks | If LTV < planning anchor, C4's thin LTV:CAC may *never* clear payback → organic-only persists longer. |
| **NotebookLM closes the PATH gap (R2 realizes)** | Wedge-fit ↓ for *all* channels | A distribution problem becomes a *product* problem — re-anchor to the [residual moat](../../00-core/icp-summary.md) before spending on any channel. |
| **B2B educator signal (a class-distributing professor)** | New channel enters the matrix | The deferred [land-and-expand](../../01-marketing/icp/persona-portrait.md) channel activates as a parallel motion. |
| **6-month default refresh** | Sanity re-score even if no trigger fired | Catches silent drift in channel economics. |

> Change to the weights or the channel taxonomy is a **Tier C PR** (per `governance/HITL.md`), co-owned by `gtm-orchestrator` (execution) and the founder (strategy). The matrix is a *living decision*, not a one-time artifact — exactly as the [Domont framework](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/distribution-channel-matrix.md) intends ("when redesigning channel mix, re-run the weighted evaluation").

---

## 9. Channel pitfalls (the Domont pitfalls, stated for Ritsu)

The [Distribution Channel Matrix pitfalls](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/distribution-channel-matrix.md), translated to Ritsu's exact failure modes:

1. **Picking a channel because it's familiar, not because it has the best economics.** For a solo founder this is "default to paid ads because that's how SaaS is 'supposed' to grow" — the matrix's whole point is that for *this* buyer at *this* stage, paid is *last*. The discipline: obey the rank-order, not the instinct.
2. **Channel conflict — selling the same thing two ways at odds.** For Ritsu the live conflict is **free-tier vs paid**: if free is framed as "the product," paid never converts (the [Kotler "more for less" trap](../../00-core/positioning.md)). The guard: free is the *loss-leader on-ramp*, named clearly; paid is "more for more" (the destination). A *channel-level* version: don't let a creator-affiliate (C2) over-promise "free forever" in a way that suppresses the C1/C4 paid conversion.
3. **Under-investing in channel management.** For Ritsu this is **launching C2/C4 without the instrumentation to know which works** — the §5.3 attribution gap. Selecting a channel without funding its measurement infrastructure = flying blind. Build first-touch UTM *before* scaling any paid/creator channel.
4. **Ritsu-specific #4 — scaling reach into a leaky funnel** (the [funnel pitfall](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md), §4/§6). The single most expensive mistake available: turning on paid (C4) before activation ≥40% proves the funnel holds. The gate exists to prevent exactly this.
5. **Ritsu-specific #5 — ad-tone in an authority community.** Treating C3 (community) like C4 (paid) — dropping promotional links into r/learnmachinelearning or a course Discord — burns trust with the [gimmick-averse skeptic](../../00-core/icp-summary.md) and can get the brand banned. C3 is *help-first, link-second*; the line between C3 and C4 must never blur.

---

## 10. Coherence + cross-references

This doc is Pillar 3 of the [Domont 5-pillar commercial strategy](../../wiki/consulting-toolkits/sales-marketing-pricing-communication/process.md) and must stay coherent with:

- **[`00-core/icp-summary.md`](../../00-core/icp-summary.md)** — the WHO (the channels target the deadline-bearing STEM/ML masterer; the "authority > reach" logic flows from this buyer's psychographics). **Authoritative on the segment.**
- **[`00-core/north-star.md`](../../00-core/north-star.md)** — the 60-day plan, the 4 engines, the N=10 activation gate, the <90-day CAC-payback guardrail. **Authoritative on sequence + the gate.**
- **[`00-core/positioning.md`](../../00-core/positioning.md)** — the PODs the channel *message* must carry (learning-science + citation moat; the PATH vs NotebookLM). Channels distribute *this* message; they don't invent their own.
- **[`00-core/product.md`](../../00-core/product.md)** — pricing ($29/$59/$119), the situational workflows (= C5 content clusters), the `<60s` magic moment (the product self-distribution that makes ACT channel-free).
- **[`01-marketing/icp/persona-portrait.md`](../../01-marketing/icp/persona-portrait.md)** (S9-A) — the **628-source scored channel map** that operationalizes C2/C3/C4 placement-by-placement. **The tactical channel inventory this strategy ranks.**
- **[`01-marketing/icp/customer-journey.md`](../../01-marketing/icp/customer-journey.md)** — the 5A funnel each channel feeds (§6); the share-loop's place in ADVOCACY→AWARE.
- **[`knowledge/analytics-sync-contract.yaml`](../../knowledge/analytics-sync-contract.yaml)** — what Door-2 exposes; the §5.3 attribution gap is a *contract* limitation (the fix is a contract bump + product-side view).
- **[`knowledge/kpi-ownership.yaml`](../../knowledge/kpi-ownership.yaml)** — `channel_cac_by_channel`, `blended_ltv_proxy`, `weekly_signups`, `signup_to_activation_pct`, `free_to_plus_conversion` — the distribution KPIs (owner `gtm-orchestrator`).

**Downstream consumers (the SOPs/engines this foundation serves):** `SOP-GTM-003` (public launch channels), `SOP-GTM-006` (multi-channel deploy), `SOP-GTM-008` (YouTube/creator discovery), `SOP-GTM-009` (channel attribution + double-down), `SOP-PRODUCT-002` (N=10 stranger watch — the gate), `SOP-CUSTOMER-006` (Collison install — C3/C1 hand-seed). These execute the *tactics*; this doc fixes the *channel-selection logic, economics, and sequence* they reference.

> **The WHAT this doc must never contradict:** the [WHAT-trio](../../00-core/product.md) (product/positioning/icp-summary) on segment, message, and the residual moat. If a channel decision would require contradicting them (e.g., "broaden the audience to make paid reach cheaper"), that contradiction is a bug — re-anchor to the wedge, don't widen it.

---

## 11. Open questions / what to instrument first

In falsification priority order — these are what turn this `inferred`/`hypothesis` foundation into an `observed` one:

1. **(R1, blocking everything) Does free→paid clear ~5% at the first hard limit?** — the N=10 watch (`SOP-PRODUCT-002`). Until settled, *every* CAC:LTV number in §5 is a planning anchor, and C4's payback math is unknowable. **This is the #1 thing to measure.**
2. **Build first-touch UTM attribution** (§5.3) — without it, `channel_cac_by_channel` is empty and `SOP-GTM-009` cannot pick a winner. The highest-leverage *instrumentation* task in the pillar.
3. **Does the share-loop (C1) ignite organically?** — `session_shares.view_count → signup` attribution. The first non-founder organic referral is the PLG-flywheel heartbeat (currently 0). The one channel measurable *today*, so start here.
4. **Does a creator (C2) convert at a repeatable CAC?** — the first affiliate/host-read with tracked UTM. Confirms the matrix-#1-ignition channel empirically.
5. **Does the comparison-SEO cluster (C5) rank + convert the ASK-stage skeptic?** — the R2 weapon's effectiveness; lagged, so seed early and measure at month 3–6.

*Confidence ledger: `observed` = Door-2 (`live.*`: 25 profiles, 756 sources, 656 sessions, 15 founder-only shares, 2 founder-test payments, 0 acquisition-channel field). `inferred` = the canonical persona + market deep-research + the Domont/Kotler frameworks. `hypothesis` = LTV, free→paid, per-channel CAC, share-loop ignition — all untested at true-zero. The matrix rank-order is `inferred`-stable; the decimals are not load-bearing; the per-channel economics are `hypothesis` until R1 and attribution land.*
