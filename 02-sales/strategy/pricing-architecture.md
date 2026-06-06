---
title: "Ritsu Pricing Architecture — the value-metric, tier map, and money-moment design (philosophy DEFERRED)"
type: strategy-doc
pillar: 02-sales
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Pillar-4 — Pricing Architecture"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/product.md
  - 00-core/positioning.md
  - 00-core/icp-summary.md
  - 00-core/north-star.md
  - 00-core/pricing-philosophy.md
  - 01-marketing/icp/persona-portrait.md
  - 01-marketing/icp/customer-journey.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-registry.yaml
  - knowledge/kpi-ownership.yaml
  - raw/consultant/toolkits/09-sales-marketing-pricing-communication/frameworks/pricing-maturity-model.md
  - raw/consultant/toolkits/09-sales-marketing-pricing-communication/frameworks/van-westendorp-psm.md
  - raw/consultant/toolkits/09-sales-marketing-pricing-communication/frameworks/price-sensitivity-ladder.md
  - raw/consultant/toolkits/09-sales-marketing-pricing-communication/frameworks/product-life-cycle.md
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Scope discipline (read first).** This is the **architecture map**, not the pricing *philosophy*. The philosophy — the *why* (no dark patterns, no manufactured urgency, freemium-forever-as-moat, the ethical stance on a price-sensitive student) — lives in `00-core/pricing-philosophy.md`, which is a **stub, DEFERRED (entry condition: first SOP-PRODUCT-010 pricing-pull-test)** per `knowledge/manifest.yaml`. This doc describes *what the price structure IS and why each piece exists mechanically* — the value-metric, the tier ladder, the money-moment, the WTP evidence, the maturity diagnosis, and a data-gated PSM plan. It is the foundation the downstream sales/pricing SOPs (SOP-PRODUCT-010 pricing-pull-test, SOP-PRODUCT-011 tier-boundary-experiment, SOP-GTM-012 free-to-paid-trigger-detection) reference for "what is the structure?" — without re-deriving the map each time.
>
> **Honesty posture (true-zero).** Every load-bearing claim is tagged `[observed · Door-2]`, `[verified · ritsu.ai/pricing]`, or `[inferred / hypothesis — UNPROVEN]`. The two things this doc most wants to know — **does the wedge pay, and at what number** — are **both unproven** (0 real paying customers; the only `live.payments` rows are 2 founder test charges at $31.90). This is the architecture we will *test*, not the architecture we have *validated*.

---

## 0. The pricing decision in one paragraph

Ritsu prices a **freemium, credit-metered, four-tier value-ladder** — Free $0 / Plus $29 / Pro $59 / Ultra $119 (USD/mo, annual −17%) `[verified · ritsu.ai/pricing 2026-05-29]`. The **value-metric is credits** (the meter the buyer watches deplete), fenced by three **hard ceilings** — per-source pages, per-source video-minutes, and sessions-per-project. The **money-moment** is the moment a deadline-bearing STEM/ML masterer hits the first hard fence *mid-mastery-path* — most often the **free 5-sessions-per-project cap** `[observed · Door-2: 6 of 26 projects already hit-or-exceeded it]` or the **40-page / 30-minute per-source cap** when a 120-page lecture deck or a 90-minute lecture won't fit free. The strategic frame is **"more for more"**: paid is the *destination* (depth, all 17+ activities, unlimited sessions, the full Knowledge Map), Free is the *loss-leader on-ramp* — never the product (`00-core/positioning.md` §8). On the **pricing-maturity staircase** Ritsu sits at **~Level 2 (competitive/cost-anchored)** today and must climb to **Level 4 (value-based)**; the bridge is a **Van Westendorp PSM survey** that runs *only once the N=10 cohort exists* (data-gated, NOT executed here).

---

## 1. The value-metric — credits, and the three hard fences behind them

> *Pricing-Strategy-Selection-Ladder step 4 ("design the price architecture: list price, tier structure") + Pricing-Maturity dimension "pricing tools/data": the value-metric is the single most consequential pricing decision, because it determines **what the customer feels they are buying more of** as they upgrade.*

### 1.1 What the meter is

Ritsu's value-metric is **credits** — a usage unit consumed by generation work (building a learning path, generating activities, tutoring turns) `[verified · product.md §10]`. Credits are the *visible* meter; the *binding* constraints are three hard ceilings that gate **input size** and **depth of engagement per project**:

| Fence | Free | Plus $29 | Pro $59 | Ultra $119 | What it gates |
|---|---|---|---|---|---|
| **Credits / mo** | 600 | 12,000 | 25,000 | 55,000 | Total generation volume (the headline meter) `[verified · product.md §10]` |
| **Pages / source** | 40 | 100 | 200 | 500 | Can a real lecture deck / chapter even *fit*? `[observed · live.tier_limits]` |
| **Video-min / source** | 30 | 120 | 360 | 720 | Can a full lecture video be ingested? `[observed · live.tier_limits]` |
| **Sessions / project** | 5 | 20 | unlimited | unlimited | Can you sustain the *multi-week* mastery path? `[observed · live.tier_limits]` |

The `live.tier_limits` table confirms these exactly — Free `{40 pages, 30 min, 5 sessions}`, Plus `{100, 120, 20}`, Pro `{200, 360, −1=unlimited}`, Ultra `{500, 720, −1}` `[observed · Door-2 query 2026-06-07]`. The credit count is the *marketed* unit; the **per-source size cap and the sessions-per-project cap are the fences a serious learner actually crashes into** — and those, not the abstract credit balance, are where the money-moment lives (§3).

### 1.2 Why credits is the *right* value-metric for this wedge

A good value-metric satisfies three tests (Simon-Kucher value-metric doctrine, distilled in the maturity model): it (a) **tracks value received**, (b) **scales with the heavy user**, (c) **is legible**. Credits passes all three *for the deadline-bearing masterer*:

- **(a) Tracks value** — the masterer's value is *generated practice from their own dense material*. Credits meter exactly that generation. They are not paying for storage (Notion's metric) or for seats (enterprise's metric) — they are paying for **mastery-work produced**, which is the core-value claim (`product.md` §4: "what the buyer is really buying = *I finally get it*"). `[inferred — coherent with product.md §6.0]`
- **(b) Scales with the heavy user** — the observed heavy user (one real account: **42 sources / 36 sessions** `[observed · persona-portrait S1 ★3]`) is precisely the masterer who will exhaust Free and need Plus→Pro. A per-seat metric would *under-charge* this exact ideal user; a credit metric *captures* their intensity. The avg project already runs **4.2 sessions** `[observed · Door-2]` — brushing the free 5-cap.
- **(c) Legible** — but only *partially*. **Risk:** credits are an abstraction; a student cannot pre-compute "how many credits is a cs231n midterm worth?" The page/video/session fences are far more legible ("my 120-page deck won't fit Free") — which is *why the money-moment should be triggered on the legible fence, not the credit number* (§3.3). `[hypothesis — UNPROVEN; this is a SOP-PRODUCT-010 question]`

> **Architecture decision A1:** the value-metric is **credits + three hard fences**, but the **money-moment is fired on the most-legible fence the user is about to hit** (pages/video/sessions), not on an opaque credit-balance warning. Rationale: legibility drives conversion; an abstract "you're low on credits" mid-exam-prep reads as a dark pattern to a gimmick-distrusting masterer (`icp-summary.md` §1 identity). This is an *architecture* choice; the *ethics* of how it's surfaced is deferred to `pricing-philosophy.md`.

---

## 2. The tier architecture — the value-ladder logic

> *Pricing-Strategy-Selection-Ladder: "design the price architecture (list price, tier structure, bundles)." The question each tier must answer is **"who is this rung FOR, and what single thing unlocks at it that the rung below lacks?"** — a tier that doesn't unlock a felt capability is just a discount waiting to happen.*

### 2.1 The four rungs, each as a job-to-tier match

| Tier | List `[verified 2026-05-29]` | Positioning name | The ONE thing it unlocks | Who it's FOR (wedge-mapped) |
|---|---|---|---|---|
| **Free** | **$0** / 600 cr | *Starter* | **The magic moment** (all 17+ activities + 7 modes + 3 personalities), capped at 40pg/30min/5-sess | The masterer's **first contact** — the loss-leader on-ramp; proves "this actually works" in <60s |
| **Plus** | **$29** / 12k cr · *most popular* | *Personal* | **The multi-week PATH survives** (20 sessions/project) + 100pg/2h sources + Basic Knowledge Map + 10 personalities + XP/streak | The **paying core** — a masterer sustaining ONE hard graded course across weeks |
| **Pro** | **$59** / 25k cr · *best value* | *Academic* | **Unlimited sessions** + 200pg/6h + **Full Knowledge Map (share + export)** + PDF/MD/DOCX export + advanced analytics | The **multi-course / power masterer** (the 42-source/36-session user) — no fence interrupts mastery |
| **Ultra** | **$119** / 55k cr | *Professional* | **Unlimited custom personalities/characters** + 500pg/12h + priority models + API (beta) | The **expansion edge** — career-switchers, educators, researchers; not a first-100 target |

`[All tier facts verified · product.md §10 + live.tier_limits]`

### 2.2 The ladder *logic* — why the gaps sit where they do

The ladder is engineered around the wedge's **single most important verb: sustain a multi-week path.** Read top-to-bottom as a sequence of *felt walls*, not feature lists:

1. **Free → Plus is the load-bearing jump**, and it is deliberately *cheap to feel*. The wall is **"my mastery path died at session 5."** A masterer working a 6-week course will, by construction, exceed 5 sessions on the one project that matters — `[observed · Door-2: avg 4.2 sessions/project, 23% of projects already ≥5]`. Plus's 20-session ceiling is sized to **cover one full hard course** without a second wall. This is the rung that converts; it must feel like *rescuing the work in progress*, not buying an upsell.
2. **Plus → Pro is the "I have more than one hard course / I am a power user" jump.** The walls are **unlimited sessions** (the 42-source user blows past 20) and **export + Full Knowledge Map** (sharing the concept map with a study group = the referral loop, `icp-summary.md` §4 referral velocity). Pro is *best value* because for the heavy masterer it removes *all* session anxiety permanently.
3. **Pro → Ultra is NOT a wedge rung** — it sells *unlimited custom personalities, priority models, API*. These map to the **expansion personas** (educators, professionals, builders — `product.md` §8), not the first-100 masterer. Ultra exists to (a) **anchor** ($119 makes $59 read as "best value" — the classic decoy/anchor effect) and (b) **catch** the rare power-user willing to pay for it. `[inferred — anchor logic per price-sensitivity-ladder; UNPROVEN that Ultra converts at the wedge]`

> **Architecture decision A2:** the ladder's center of gravity is the **Free→Plus wall = the 5-session cap**, because that is the fence the *paying-core job* (sustain a multi-week course) crashes into first and most legibly. Every other rung is secondary to making that one conversion feel like rescuing mastery-in-progress. The price gaps ($0 → $29 → $59 → $119, roughly 2× steps) are **inherited/verified, not derived here** — validating that *these* are the optimal gaps is the SOP-PRODUCT-011 tier-boundary-experiment job.

### 2.3 What the ladder is NOT (anti-patterns this architecture rejects)

- **Not seat-based** — no per-user pricing; the buyer = user = payer (B2C, `persona-portrait` S1 #8). Seats would mis-meter the single intense learner.
- **Not feature-gated at the magic moment** — Free gets *all 17+ activities and all 7 modes* `[verified · product.md §10]`. The wedge's first-contact "wow" (`product.md` §7) is **never** behind a paywall; only *volume and depth-over-time* are. Gating the aha would kill activation — the top leading indicator (`north-star.md` §1.3). This is a deliberate architecture stance: **gate the marathon, never the first mile.**
- **Not "more for less"** — Free is explicitly a **loss-leader on-ramp**, not a sustainable product tier (`positioning.md` §8: "more for less is unsustainable per Kotler's value-proposition matrix"). The architecture's revenue thesis depends on the masterer *outgrowing* Free, which the multi-week-path job structurally forces.

---

## 3. The money-moment — designing the free→paid conversion event

> *This is the single most important section for the sales pillar. The "money-moment" is the **specific event** at which a Free masterer converts to Plus. North-star leading indicator: **free→paid ≥ 5% (rolling 30d)**, owned by gtm-orchestrator (`north-star.md` §1.3). The SOP that detects and acts on this event is **SOP-GTM-012 free-to-paid-trigger-detection**; this section is its design foundation.*

### 3.1 The money-moment, located precisely

The money-moment is **NOT** "credits ran out" (opaque) and **NOT** "trial expired" (Ritsu has no time-trial — Free is permanent). It is:

> **The masterer hits a hard fence *while actively mastering a graded course they care about*, mid-path, with a deadline visible.**

Ranked by observed/expected frequency:

| Rank | Fence hit | Why it fires *for this wedge* | Evidence |
|---|---|---|---|
| **1** | **Free 5-sessions-per-project cap** | The multi-week-path job *structurally* exceeds 5 sessions on the one project that matters | `[observed · Door-2: 6/26 (23%) of projects already ≥5 sessions; max 19; avg 4.2]` |
| **2** | **40-page / 30-min per-source cap** | A real lecture deck (100–200pg) or full lecture video (60–90min) won't fit Free | `[observed · Door-2: PDF 63% (479/756) + video 16% (124/756) of sources — exactly the formats that overflow]` |
| **3** | **600 credits/mo exhausted** | Heavy generation in an intense exam week | `[hypothesis — UNPROVEN; depends on per-activity credit cost not in Door-2]` |

The decisive fact: **fence #1 is observed-real, not hypothetical.** Even in founder/test data, ~1-in-4 projects bumps the exact wall that should trigger the upgrade. This makes the **5-session cap the empirical money-moment surface** — the architecture should instrument *that* fence as the primary conversion trigger.

### 3.2 The conversion logic (why the masterer pays *here*)

The masterer pays at this fence because the wedge psychographics make the cost of *not* paying acute, exactly here:

- **Sunk mastery + live deadline** — they've already invested 5 sessions building understanding of *this* graded material; the deadline is real (`icp-summary.md` §4: "exam urgency = a sharp WTP timer"). Abandoning the path mid-course = re-incurring the pain the product just removed. **The pain of the wall > $29.** `[inferred — JTBD logic]`
- **Substitution math is favorable** — Plus $29 sits **below the $25–100/mo study stack** it replaces (Anki-time + Quizlet ~$8 + ChatGPT $20) `[verified · icp-summary.md §5]`. The masterer *saves money* switching — the architecture should surface this at the fence ("Plus replaces your $28+ stack" — `positioning.md` §8 monetary CVP). `[inferred]`
- **"More for more," felt** — the upgrade isn't "pay to remove an annoyance"; it's "unlock the **multi-week path** your course needs." Framed as *more capability for the job*, not *less friction for a fee* — which a gimmick-distrusting masterer (`icp-summary.md` §1) tolerates where a dark pattern would repel them.

### 3.3 Money-moment design principles (architecture-level; ethics deferred)

1. **Fire on the legible fence, not the credit number** (decision A1). "Your 6-week path needs more than 5 sessions" >> "you have 40 credits left."
2. **Surface the substitution value at the wall** — "$29 < your current $28+ stack," tied to the *specific* job in progress.
3. **Never gate the in-flight aha** — the user must already have *felt* mastery on this material before the wall (they have: 5 sessions deep). The wall lands on a *believer*, not a skeptic.
4. **No manufactured urgency** — the urgency is *real* (their deadline), never invented. *(The boundary between "surfacing real urgency" and "manufacturing it" is a **philosophy** question → `pricing-philosophy.md`, deferred. This doc only fixes that the trigger is the **real** fence + **real** deadline.)*

> **Architecture decision A3:** instrument the **free 5-sessions-per-project cap as the primary money-moment trigger** (it is the observed-most-hit fence aligned to the paying-core job), with the **per-source page/video cap as the secondary trigger**. SOP-GTM-012 consumes these two fence-events as its conversion signals. **Open instrumentation gap:** which on-platform signal best *predicts* (not just coincides with) paid conversion is unconfirmed at true-zero — `icp-summary.md` §6 flags this; resolve post-launch with the N=10 cohort.

### 3.4 The proxy problem (critical measurement caveat)

The natural money-moment leading metric would be **"reached first-quiz-aha → hit a fence → converted."** But Door-2 **cannot measure the aha**: `live.quiz_attempts`, `live.activity_results`, and `live.flashcard_reviews` are **all 0 rows**, AND the `learning_sessions.activities_completed` proxy column is **also 0 across every session** `[observed · Door-2 2026-06-07]`. Therefore:

> **Any activation/value gate feeding the money-moment MUST use a PROXY from what IS logged:** `learning_sessions` count (≥N sessions on a project), source uploads (≥2 sources = the "uploaded again" love signal, `icp-summary.md` §4), sustained revisit (the 42-source/36-session pattern), and `onboarding_completed_at`. The "first-quiz-aha" metric is **unavailable** until the product instruments activity completion into the analytics export. This is a hard constraint on SOP-GTM-012 and SOP-CUSTOMER-002, not a preference.

---

## 4. Willingness-to-pay evidence — what we know, and the size of what we don't

> *Pricing-Maturity dimension "pricing tools/data" + Van-Westendorp "build the evidence base for a value-based pricing move." The honest answer: the WTP evidence base is **thin and unvalidated**. This section states what is anchored vs. assumed so downstream SOPs don't over-trust the number.*

### 4.1 The WTP anchors we have

| Source of WTP signal | Value | Confidence |
|---|---|---|
| **ICP WTP anchor** | **$15–25/mo**, deadline-gated | `[inferred — icp-summary.md §5; an *estimate*, not a survey]` |
| **Substitution stack ceiling** | **$25–100+/mo** (the stack Ritsu replaces) | `[verified · icp-summary.md §5 — real competitor prices]` |
| **Set list price (Plus)** | **$29/mo** | `[verified · ritsu.ai/pricing]` |
| **Adjacent proven WTP (med/pre-med co-beachhead)** | **$300–500** for UWorld / Anki add-ons / Sketchy / Pixorize | `[verified · icp-summary.md §4b — demonstrated in the adjacent market]` |
| **Observed real payment** | **2 charges @ $31.90** (= $29 + ~10% MoR tax), **both founder test cards** | `[observed · live.payments — but NOT a customer signal]` |

### 4.2 The gap that defines the whole pricing risk

There is a **$4–14 gap between the ICP anchor ($15–25) and the set list price ($29)** — i.e., **the list price may sit *above* the wedge's estimated WTP.** Three readings, all live:

- **(a) The anchor is too low** — it was an *estimate* (`icp-summary.md` §5 explicitly down-weights it: "corrected an earlier $15-25 estimate"; v1.0.1 note). The deadline-gated masterer may pay $29 *the week before a midterm* even if their *steady-state* WTP is $20. WTP is a **range**, not a point (Van Westendorp's core premise) — and the deadline shifts the whole curve right.
- **(b) The list price is right but conversion will be low** — $29 clears for the *intense* fraction, suppressing free→paid below the 5% target. The architecture would then rely on the **deadline trigger** doing the WTP lifting (pay-at-the-fence-before-the-exam).
- **(c) The price is wrong and needs a lower entry or an annual nudge** — the −17% annual discount ($29→~$24/mo effective) *already* pulls the effective price into the anchor band. Annual billing may be the de facto WTP-bridge for the price-sensitive student.

> **This gap is THE pricing question, and it is UNPROVEN.** `live.payments` gives us *zero* customer WTP signal (2 founder rows). The med/pre-med adjacency is the *strongest* WTP evidence we have — and it points **up** ($300–500 already paid next door), which is why the co-beachhead N=10 (`icp-summary.md` §4b) doubles as a **WTP de-risking instrument**: if med students pay $29 at the fence, the anchor was too conservative.

### 4.3 What resolves it

The gap is resolved by **two data-gated instruments, in order**:
1. **SOP-PRODUCT-002 N=10 stranger watch** (and the parallel med/pre-med N=10) — the *pay-at-first-limit* observation. This answers **"do they pay at all, at $29?"** — the binary R1 question (`icp-summary.md` §8).
2. **Van Westendorp PSM** (§7 below) — once N=10 proves payment exists, PSM finds the *acceptable price range and optimal point* to confirm or adjust $29/$59/$119. This answers **"is $29 the right number?"**

Until both run, **the architecture treats $29 as a hypothesis-to-falsify, not a validated price.**

---

## 5. Pricing-maturity diagnosis — Level 2 today → Level 4 target

> *Pricing-Maturity-Model: score the current state across 5 dimensions, set a target 1–2 levels up, and name the capability gaps. McKinsey: a 1% price improvement = 6–8% EBITDA improvement — pricing capability is a top margin lever, so the climb is worth instrumenting.*

### 5.1 Current-state diagnostic (5 dimensions)

| Dimension | Score (1–5) | Evidence |
|---|---|---|
| **Pricing strategy** | **2** | Freemium chosen (correct for PLG), but tier *numbers* are competitive/intuition-set, not WTP-derived. Strategy *type* is Level-4-ready; the *numbers* are Level 2. `[inferred]` |
| **Pricing process** | **2** | Prices are **"dynamic and EXPERIMENTAL pre-PMF"** with a *planned* pricing-pull-test (SOP-PRODUCT-010) — but that test has **not run**. Process = "set by judgment, intend to test." `[verified · product.md §10 pricing-discipline note]` |
| **Pricing tools/data** | **1–2** | Door-2 gives `tier_limits` + `payments`, but **0 customer WTP data** (2 founder rows) and **no PSM / conjoint / experiment** yet. Data infrastructure exists; pricing *evidence* doesn't. `[observed · live.payments]` |
| **Pricing organisation** | **2** | Solo founder + AI workforce; pricing owned by gtm-orchestrator/sales pillar with HITL Tier C on the public pricing page (`governance/HITL.md`). Lean but defined. `[verified]` |
| **Pricing culture** | **3** | Strong *value-based intent* — "more for more," value-metric = mastery-work, explicit anti-"more-for-less" (`positioning.md` §8). The *culture* is ahead of the *data*. `[inferred — coherent with positioning]` |

> **Diagnosis: Ritsu is at ~Level 2 (competitive / cost-anchored) overall** — with a **Level-2 floor on data/process** dragging down a **Level-3+ culture/strategy-intent.** The defining gap is **evidence, not philosophy**: Ritsu *wants* value-based pricing and has *designed* the value-ladder for it, but has **no WTP data to set the numbers from.** This is the classic "culture ahead of capability" profile the maturity model warns about.

### 5.2 Target and the capability build

**Target: Level 4 (value-based)** — price set to capture full value delivered, tiers/bundles derived from WTP research, not competitor benchmarks. Achievable as PMF data accrues (the model's typical 1–2-level, 18–24-month climb).

**The three capability gaps to close (sequenced):**
1. **Generate WTP evidence** (closes the Level 1–2 → 3 data gap) → run SOP-PRODUCT-002 N=10 *pay-at-fence* watch → then the PSM (§7). *Foundation first.*
2. **Build the value-narrative at the fence** (closes strategy → Level 4) → the money-moment surfaces *value delivered* ("your $28+ stack, replaced"; "your 6-week path, sustained"), the Michelin "cost-per-km not per-unit" move applied to studying: **sell "mastery-per-dollar," not "credits-per-dollar."** `[inferred — Michelin analogy from maturity model]`
3. **Instrument price realization** (closes process → Level 4) → SOP-PRODUCT-011 tier-boundary-experiment + the maturity-model KPIs below, run continuously once paying users exist.

### 5.3 Maturity KPIs (the model's "3–4 KPIs to measure progress")

| KPI | Definition | Source / owner |
|---|---|---|
| **Free→paid conversion** | the money-moment success rate (target ≥5% rolling 30d) | `free_to_plus_conversion` · gtm-orchestrator (`north-star.md` §1.3) |
| **Tier mix / ARPU** | blended revenue per paying user (target ~$30–45/mo, `north-star.md` §4) | `arppu` / `paying_users_count_by_tier` · backoffice-clerk |
| **Plus→Pro upgrade rate** | the "power masterer" upgrade (value-capture depth) | `plus_to_pro_upgrade_rate` · growth-orchestrator |
| **Refund rate (30d)** | price-regret guardrail (target <5%, `north-star.md` §2) | counter-metric · backoffice-clerk |

> **Architecture decision A4:** the maturity climb is **data-led, not philosophy-led.** Ritsu does **not** need `pricing-philosophy.md` written to *climb to Level 4* — it needs **WTP data** (N=10 + PSM). The philosophy doc graduates *on the same trigger* (first SOP-PRODUCT-010 pricing-pull-test) precisely because that test is what *generates* both the evidence AND the lived stance that the philosophy will codify. The two are joined at the data event.

> ⚠ **Maturity-model pitfall, explicitly avoided:** do **not** jump toward Level 5 (dynamic/AI-set pricing) — the maturity model flags this as the canonical failure (dynamic pricing without data/culture *damages trust*), and a gimmick-distrusting masterer (`icp-summary.md` §1) would read algorithmic pricing as exactly the manipulation the brand promises to avoid. **Level 4 is the ceiling for this wedge.**

---

## 6. Pricing-strategy classification (where Ritsu sits on the selection ladder)

> *Price-Sensitivity-Ladder step 1–2: answer the six diagnostics, map to a strategy. This fixes **why freemium** is the right macro-strategy, so the tier architecture above has a named parent.*

| Diagnostic | Ritsu answer | Implication |
|---|---|---|
| 1. Differentiated or commodity? | **Differentiated** (structured multi-week PATH + 17 activities + concept-level Knowledge Map + learning-science) — but the *core spine* (doc→quiz→explain→share) is **commoditized by free NotebookLM** | Supports premium *on the PATH*, faces freemium pressure *on the spine* (R2) |
| 2. Price-sensitive or value-focused? | **Price-sensitive** (student $0–300/mo discretionary, `persona-portrait` S3 #12) | Freemium on-ramp is mandatory; entry price must clear a *felt* pain bar |
| 3. Volume/share or margin? | **Volume/share** (PLG, first-100, viral share-loop) | Penetration energy at the top of funnel (Free), value-capture at depth (paid) |
| 4. New or mature product? | **Introduction stage** in a **mature category** (see §6b) | Skimming impossible (incumbents + free); penetration via freemium |
| 5. Real-time dynamic-pricing capability? | **No** (and shouldn't — §5.2 pitfall) | Rules out Level-5/dynamic |
| 6. Customer economic value received? | **$25–100+/mo** stack replaced; grade/credential outcome | Strong value case → headroom to climb to value-based |

> **Strategy classification: FREEMIUM (penetration on-ramp) → with a VALUE-BASED capture layer at depth.** This is the selection-ladder's "Freemium" rung *evolving toward* its "Value-Based" rung — exactly the **Adobe Creative-Suite→Creative-Cloud move** the framework cites (a differentiated product, pressured by a free/pirated alternative, expands its addressable market via freemium *while* re-rating on recurring value). Ritsu's NotebookLM threat is structurally analogous to Adobe's piracy signal: **free demand exists; freemium is how you convert it into paid mastery.** `[inferred — Adobe analogy from price-sensitivity-ladder]`

> **Selection-ladder pitfall, avoided:** "setting a penetration price without a defined path to raising it." Ritsu's path is explicit — **the money-moment (§3) is the raise**: Free *never* gets cheaper, the masterer *graduates* to $29 at the fence. The low anchor ($0) is escaped *per-user as they outgrow the job*, not via a list-price hike.

### 6b. Product-life-cycle position — Introduction, and why it dictates "freemium-penetration not skimming"

> *Product-Life-Cycle: an honest stage classification is the framework's whole value ("calling Decline 'Maturity' is the most expensive misclassification"). The pricing strategy MUST match the stage.*

**Stage classification: INTRODUCTION** — 0 paying customers, pre-PMF, building awareness `[observed · north-star.md "Current stage: GTM (pre-PMF, 0 paying)"]`. Critically, this is an **Introduction-stage *product* inside a Maturity-stage *category*** (EdTech is saturated; incumbents Anki/Quizlet/ChatGPT/NotebookLM are mature `[verified · persona-portrait S2 #8]`).

The PLC dictates the pricing posture:
- **Introduction-stage pricing options are skimming OR penetration.** Skimming (price high, harvest early adopters) is **foreclosed** — a *free, mature* substitute (NotebookLM) sets the reference price at $0 for the commodity spine. You cannot skim above a free incumbent.
- **Therefore: penetration via freemium** — invest in *awareness + activation* (the magic moment, the share-loop), set a free on-ramp, capture value as users graduate. This is the *only* PLC-consistent move, and it matches the strategy classification (§6) and the tier architecture (§2).
- **The Growth-stage pricing move (when it comes):** PLC says "maintain or slightly raise prices" in Growth. Ritsu's Growth-stage raise is **not** a list-price hike but **tier-mix shift** (push Pro/annual) + **closing the WTP gap upward** if the N=10/PSM data shows $29 was conservative (§4.2). `[inferred — PLC Growth-stage guidance]`

> **PLC honesty check (avoiding the Kodak error):** Ritsu must not misread its *category's* maturity as its *product's* maturity. The category is mature; **the product is in Introduction** — so the correct spend is *acquisition + activation*, NOT margin-defense/cost-cutting. Pricing-wise: **do not optimize ARPU before PMF.** The pre-PMF job is to find 100 who pay-and-love at *whatever* the right entry price is — not to maximize price. (This is why $29 is held as a falsifiable hypothesis, §4.) `[inferred — PLC Introduction-stage]`

---

## 7. The Van Westendorp PSM plan — DESIGNED, NOT EXECUTED (data-gated)

> *Van-Westendorp-PSM: the survey-based instrument to find the **acceptable price range** and **optimal price point** — the evidence base for the Level 2→4 value-based move. **This is a PLAN to run when the N=10 cohort exists. It is explicitly NOT executed here** (true-zero: no respondents, no real users). Running it now would violate the framework's own pitfall — applying PSM without a concrete product experience to anchor respondents' WTP, and with N far below the 100-respondent validity floor.*

### 7.1 Trigger condition (when this runs)

| Gate | Condition |
|---|---|
| **Earliest trigger** | After SOP-PRODUCT-002 N=10 watch confirms **R1 = "yes, they pay at the fence"** (binary payment existence). PSM is wasted if payment doesn't exist at all. |
| **Validity trigger** | A reachable cohort of **≥100 wedge respondents** who have *experienced the magic moment* (PSM pitfall: respondents need a concrete product experience — survey AFTER they've used Free, not cold). |
| **Ownership** | gtm-orchestrator drafts; **HITL Tier C** (it informs the public pricing page); runs *inside* SOP-PRODUCT-010 pricing-pull-test as its quantitative leg. |

### 7.2 Survey design (ready to deploy)

**Product description shown to respondents** (PSM requires a concrete anchor — pitfall #1): *"Ritsu turns your own course material — a lecture PDF, a recorded lecture, slides — into a structured multi-week mastery plan with auto-generated quizzes, flashcards, a concept map, and a tutor that explains where you're stuck. Unlimited sessions, all 17 activity types, full Knowledge Map you can share with your study group."* (i.e., describe the **Plus/Pro experience**, since that's what's being priced.)

**The four questions** (per the framework, asked of the *experienced* wedge respondent):
1. *(Too cheap)* At what monthly price would Ritsu be so cheap you'd question whether it's actually good?
2. *(Bargain)* At what monthly price would Ritsu be a great deal for what it does for your grades?
3. *(Expensive)* At what monthly price would Ritsu start to feel expensive, but you'd still consider it before a big exam?
4. *(Too expensive)* At what monthly price would Ritsu be so expensive you definitely wouldn't pay?

### 7.3 What the output decides

Plot the four cumulative curves; extract: **Acceptable Price Range** (lower = too-cheap meets too-expensive; upper bound), **OPP** (psychologically optimal — where too-cheap and too-expensive cross), **IPP** (market-typical — where bargain and expensive cross). Then:

- **If OPP ≈ $25–30** → **$29 Plus is validated**; the ICP anchor was right; hold.
- **If OPP < $25** → $29 is *above* the acceptable optimum → consider a **lower entry rung** or lean on **annual ($24 effective)** as the real entry price.
- **If OPP > $30** (the med-adjacency-implied direction, §4.2) → **$29 was conservative**; the architecture has *upward* room — raise Plus or re-weight toward Pro.
- The Acceptable Price Range becomes the **guardrail** for SOP-PRODUCT-011 tier-boundary experiments (don't test outside the validated band).

> **Framework discipline noted:** PSM's OPP is the *psychologically neutral* price, **NOT the revenue-maximizing** price (pitfall #2). For revenue optimization, follow PSM with a **price A/B experiment** (SOP-PRODUCT-011) — PSM finds the *defensible band*; the experiment finds the *profit point inside it*. PSM is also **least reliable for committee/B2B** purchase (pitfall #3) — which is fine: this wedge is **pure B2C self-serve** (buyer=user=payer), PSM's strongest use case.

> **Architecture decision A5:** the PSM is **the bridge from Level 2 → Level 4**, but it is **gated on payment-existence (N=10 R1) first.** Sequence is non-negotiable: *prove they pay → then optimize what they pay.* Running PSM before R1 is answered would produce a precisely-quantified answer to the wrong question.

---

## 8. The Spotify benchmark — why $29 is *plausible* (not validated)

> *Van-Westendorp real-life example: Spotify's PSM put the acceptable range at €5–15 with OPP ≈ €10, landing €9.99 just under the €10 psychological threshold. The analog is instructive, not authoritative.*

The Spotify case shows the *shape* of a defensible consumer-subscription price: an acceptable range bounded *below* by "too cheap = low quality" and *above* by the offline-equivalent cost, with the optimum at a psychological round number. Mapped to Ritsu `[inferred — analogy, UNPROVEN for Ritsu]`:

- **Lower bound (too cheap):** below ~$10/mo, a gimmick-distrusting masterer may *doubt the rigor* — the "is this another free AI hack?" objection (`icp-summary.md` §2). A *too-low* price would actively *undermine* the learning-science positioning. (This is a real risk argument *against* a sub-$10 entry rung.)
- **Upper bound (too expensive):** the **$25–100/mo stack ceiling** `[verified · icp-summary.md §5]` — above the stack it replaces, the value case inverts.
- **Implied optimum:** somewhere in **$20–35** — which is where $29 sits, just under the **$30 psychological threshold** (Spotify's €10-threshold logic). **$29 is the round-number-anchored, stack-undercutting, rigor-signaling price** — *plausible by analogy*, **pending PSM confirmation.**

> The honest synthesis: **$29 is a well-reasoned hypothesis** (under the stack, above the rigor-doubt floor, just under a round threshold) — but Spotify's number was *validated by a 100+ respondent PSM*, and **Ritsu's has not been.** The architecture's job is to *get to* Spotify's level of evidence (§7), not to claim it.

---

## 9. Coherence with the canonical WHAT-trio + downstream consumers

This doc is the **02-sales foundation**; it must cohere with the canonical strategy and feed the execution layer.

**Coheres with (cited, never contradicted):**
- `00-core/product.md` §10 — the four-tier credit-based model + verified prices + per-source limits (the factual ground of §1–§2).
- `00-core/positioning.md` §7 (accuracy = greens-fee POP; "AI ⇒ unreliable" must be neutralized) + §8 ("more for more"; free = loss-leader, not "more for less") — the framing ground of §2–§3.
- `00-core/icp-summary.md` §5 (substitution stack + the $15–25 anchor + "proven WTP unvalidated") + §4/§4b (the deadline WTP trigger + med co-beachhead) — the WTP ground of §4.
- `00-core/north-star.md` §1.3 (free→paid ≥5% leading indicator) + §2 (refund <5% guardrail) + §4 (ARPU path) — the metrics ground of §5.3.

**Feeds (downstream SOPs/engines reference THIS for the structure):**
- **SOP-PRODUCT-010 pricing-pull-test** — §4 (the WTP gap), §5 (maturity climb), §7 (the PSM is its quantitative leg). *This SOP's firing is also the graduation trigger for `pricing-philosophy.md`.*
- **SOP-PRODUCT-011 tier-boundary-experiment** — §2.2 (the tier gaps to test), §7.3 (the validated band as guardrail).
- **SOP-GTM-012 free-to-paid-trigger-detection** — §3 (the money-moment design: fire on the 5-session/page/video fence; the proxy constraint).
- **SOP-CUSTOMER-002 activation-event-instrumentation** — §3.4 (the proxy-metric constraint: no activity data; use sessions/uploads).
- `00-core/pricing-philosophy.md` (DEFERRED) — inherits the *ethics* questions this doc deliberately bracketed (A1/A3/A4): how to surface real urgency without manufacturing it, freemium-forever as moat, the stance on the price-sensitive student.

---

## 10. The five load-bearing architecture decisions (summary table)

| # | Decision | Rationale | Status |
|---|---|---|---|
| **A1** | Value-metric = **credits + 3 hard fences**; money-moment fires on the **legible fence**, not the credit number | Legibility drives conversion; opaque credit warnings read as dark patterns to a gimmick-distrusting masterer | `[architecture — ethics deferred]` |
| **A2** | Ladder center of gravity = **Free→Plus wall = the 5-session cap** | It is the fence the paying-core job (multi-week path) crashes into first, observed in Door-2 (23% of projects) | `[observed-grounded; gaps UNPROVEN]` |
| **A3** | Instrument the **5-session cap as primary money-moment trigger**, page/video cap secondary | Observed-most-hit fence aligned to the job; SOP-GTM-012 consumes these events | `[observed-grounded]` |
| **A4** | The Level 2→4 climb is **data-led, not philosophy-led** | Ritsu needs WTP data (N=10 + PSM), not a written philosophy, to set value-based numbers; philosophy graduates on the same data event | `[architecture]` |
| **A5** | **PSM is gated on payment-existence (N=10 R1) first** | Prove they pay → then optimize what they pay; PSM before R1 answers the wrong question precisely | `[plan — data-gated, NOT executed]` |

---

*This is the pricing **architecture map**: the value-metric, the ladder logic, the money-moment, the WTP evidence, the maturity diagnosis, and the data-gated PSM plan. The **philosophy** — the ethical *why* behind these mechanics — is `00-core/pricing-philosophy.md`, DEFERRED until the first SOP-PRODUCT-010 pricing-pull-test generates both the WTP evidence and the lived stance it will codify. The single most important honest fact in this document: **the wedge has never paid, and the price has never been validated** — `live.payments` holds 2 founder test charges and nothing else. Everything here is the architecture we will test, not the architecture we have proven.*
