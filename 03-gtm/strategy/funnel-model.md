---
title: "The Ritsu Funnel Model — End-to-End Acquisition→Love→Refer, with the 5A Overlay and the Two Moments of Truth"
type: strategy-doc
pillar: 03-gtm
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Phase-1 — Funnel Model (+ 5A)"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/north-star.md
  - 00-core/icp-summary.md
  - 00-core/positioning.md
  - 00-core/product.md
  - 01-marketing/icp/customer-journey.md
  - 01-marketing/icp/persona-portrait.md
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-ownership.yaml
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **The canonical funnel diagnostic for the 03-gtm pillar.** This is the *structural* foundation every gtm/funnel SOP (SOP-GTM-010 landing→signup, SOP-GTM-011 signup→first-upload, SOP-GTM-012 free→paid trigger, SOP-GTM-013 weekly funnel review, SOP-GTM-014/016 PMF + retention) references for "what are the stages, what converts to what, where is the biggest leak, and what is the honest number today." It does NOT re-derive the WHO (see `01-marketing/icp/persona-portrait.md`), the channel sequence (see `03-gtm/strategy/distribution-engine.md` when it lands), or the experiment-measurement math (see `10-metrics/`). It is the **shared map** those docs stand on.
>
> **Confidence posture: true-zero.** Every stage-volume and every conversion rate below the first stage is a **hypothesis** until the N=10 US-stranger watch + first paying cohort produce observed data. Tags: `observed` = grounded in the Door-2 `supabase-analytics` mirror (profiles=25 all-founder/test · sources=756 · learning_sessions=656 · session_shares=15 founder-only · payments-paid=2 founder test card); `inferred` = market/framework benchmark; `hypothesis` = untested Ritsu-specific claim. **The funnel below is a map to instrument and test, not a claim of proven behavior.**

---

## 1. Why this doc exists — the funnel is the company's P&L identity

Per the Domont sales-marketing-funnel diagnostic (`wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/sales-marketing-funnel.md`): **revenue = (prospects entering the top) × (Π conversion-rate at each stage)**. The single highest-ROI move is never "more traffic" — it is *finding the stage with the largest **absolute** drop-off, root-causing it (interview 5–10 who didn't convert), and running 2–3 targeted experiments over 4–6 weeks.* HubSpot's 2011 freemium funnel proved the lesson: the leak was Awareness→trial-signup (an 11-field form); cutting it to 4 fields doubled signup CVR (1.2%→2.4%) — ~$15M incremental pipeline, **zero added spend**.

Ritsu's funnel is identical in shape but has one defining property: **it is a trust gauntlet, not a convenience sell.** The locked wedge — the *deadline-bearing committed STEM/ML masterer* (`icp-summary.md` §0) — is deliberately skeptical (burned-before by a "study AI" that hallucinated a wrong flashcard; accuracy-first; gimmick-averse). So every stage is won on **proof** (a real generated quiz on dense math, citations on every answer, a visible multi-week path), not on claims. Two consequences run through this whole document:

1. **The product IS the pitch.** There is no human/sales step in the conversion path (PLG, solo founder + AI workforce). The funnel converts inside the product, which is why **Activation is the load-bearing stage** — not Awareness.
2. **The shadow rival is FREE.** Google NotebookLM does doc→quiz→grounded-explanation→share, and (Apr-2026) added basic mastery-tracking (`icp-summary.md` §8 R2). Ritsu therefore cannot win on "we make quizzes too." It wins — at four of five 5A stages — **only** on the structured multi-week **PATH + 17 activity types + concept-level Knowledge Map + learning-science authority.** This is a funnel-design constraint, not just a positioning note: every stage's "lever" must surface the PATH/mastery spine, or the prospect's cheapest off-ramp (free NotebookLM) wins.

---

## 2. The funnel at a glance — seven steps, the 5A overlay, the honest number

The Ritsu funnel has **seven steps**. They map cleanly onto Kotler's **5A** (Aware · Appeal · Ask · Act · Advocate) from `01-marketing/icp/customer-journey.md`, and onto the classic AIDA→retention stages the Domont framework names. The right-most column is the **honest status today** — what is `observed` in Door-2 vs `hypothesis`.

| # | Ritsu funnel step | 5A stage | Classic stage (Domont) | North-star rung | Status today |
|---|---|---|---|---|---|
| 1 | **Awareness** — see-a-trigger → qualified land on ritsu.ai | AWARE | Awareness | (pre-funnel) | **0 organic** `observed` (15 shares all-founder ⇒ organic awareness ≈ 0) |
| 2 | **Signup** — land → appeal → research/compare → create account | APPEAL + ASK | Interest + Consideration | (top of revenue funnel) | 25 profiles, all founder/test `observed` |
| 3 | **Activation** — signup → first upload → **<60s first-quiz aha** | ACT (entry) | Intent | **Activation rate** (the top lever) | **proxy-only** — see §4.3; first-quiz tables empty `observed` |
| 4 | **Habit** — week-1 re-upload of the *next* lecture, unprompted | ACT (sustain) | (early retention) | (leading → Week-4 retention) | revisit pattern present `observed` (4 sources/10 sessions; 42 sources/36 sessions) |
| 5 | **Money-moment** — hit first hard limit mid-course → **free→paid ($29)** | ACT (commit) | Purchase | **Free→paid conversion** | **0 real** `observed` (2 paid = founder test card) — **the bet** |
| 6 | **Love** — sustained mastery → Sean-Ellis ≥40% "very disappointed" | (ACT→ADVOCATE bridge) | Retention | **Sean-Ellis very-disappointed%** + Week-4 retention | unmeasured (no cohort) |
| 7 | **Refer** — share-link created → opened by a stranger → converts (→ step 1) | ADVOCATE | Advocacy | **Organic stranger-referral signups** | **0 organic** `observed`; mechanic works (15 links) but founder-only |

**Read the table as a P&L identity.** Steps 1→2→3→5 multiply into paying-customer count; steps 4 and 6 are the *retention multipliers* that turn paying into **loving** (the north-star gate, `north-star.md` §1.1); step 7 is the *acquisition multiplier* (K-factor) that — once ignited — feeds step 1 for free. The Domont pitfall #3 ("ignoring retention; acquiring a customer costs 5–7× retaining one; the funnel must extend to advocacy") is not a footnote here — it is the entire thesis of "100 paying who **love**."

### 2.1 The flywheel framing (why this is a loop, not a line)

The seventh step bends the funnel into a **flywheel** — exactly the PLG viral engine `product.md` §7 names ("share-links = the viral loop"). A loved masterer pastes a share-link into their course Discord; a stranger clicks; that stranger enters at step 1 *with peer-trust pre-loaded* (the highest-converting kind of awareness, `customer-journey.md` A5). **This loop is mechanically built and completely un-ignited**: 15 share-links created, **all founder**, **0 organic stranger-referrals ever** `observed`. The operator's single most leveraged long-run job is to ignite it (see §7); until it fires, every prospect must be bought or earned channel-by-channel, and CAC stays high.

---

## 3. The 5A overlay — what the funnel *feels* like to the masterer

The funnel steps above are the operator's instrument; the 5A is the **customer's emotional path** through them (full narrative + per-stage levers in `01-marketing/icp/customer-journey.md`). The overlay matters because **the biggest leaks are emotional, not mechanical** — a skeptical learner doesn't abandon because a button is hard to find; they abandon because the proof didn't land.

| 5A stage | The masterer's internal state | The make-or-break moment | Maps to funnel step(s) |
|---|---|---|---|
| **AWARE** | dread/behind → *recognition* ("the method was wrong, not me") | First 3–5s on ritsu.ai: reads as **a method to master a hard course**, not "another AI quiz toy" | 1 (Awareness) |
| **APPEAL** | skeptical/defensive → cautious intrigue | drop-file → 30s → quiz-from-**MY** dense material, **credible on equations/code** | 2 (Signup, entry) |
| **ASK** | jaded/anxious → relief *or* confirmed cynicism | the **head-to-head**: same lecture PDF in Ritsu *vs* NotebookLM — which catches **my** gap + cites the slide | 2 (Signup, decision) |
| **ACT** | self-doubting → agency → tense cost-benefit | **TWO truths**: (1) the <60s aha on dense math; (2) the **$29 money-moment** at the first limit, deadline live | 3, 4, 5 |
| **ADVOCATE** | pride/relief → belonging/evangelism | a **stranger clicks a share-link** and sees the **multi-week PATH**, not a paywall or a thin quiz | 6, 7 |

**The NotebookLM-perception risk (R2) lives at four of five stages** — AWARE, APPEAL, ASK, ADVOCATE all carry "is this just a free quiz toy?" The funnel's consistent answer at every one of them is the **PATH + Knowledge Map + 17 activities + learning-science**, never "we also make quizzes." **The unproven-WTP bet (R1) is concentrated at one stage** — the ACT money-moment. Keeping those two risks attached to specific funnel stages is what lets the downstream SOPs target the right leak.

---

## 4. The seven stages in depth — conversion hypotheses, drop-offs, the diagnostic

Each stage below carries: the **conversion hypothesis** (with an honest edtech-freemium benchmark band — typically **2–8%** stage-to-stage, with the top-of-funnel signup rate the tightest), the **primary drop-off** (the thing to root-cause first), the **stage KPI** (with the exact metric ID + target from `north-star.md` §1.3 and `icp-summary.md` §4), and the **status today**. The benchmark bands are `inferred` (industry PLG telemetry); the Ritsu-specific rates are `hypothesis` (no baseline at true-zero).

### 4.0 How to read the conversion numbers (a true-zero discipline)

**There is no observed funnel yet.** The percentages below are **planning anchors**, not forecasts — they exist so the downstream SOPs have a number to instrument against and a target to beat, and so the *first* real cohort immediately reveals which anchor was wrong. Per the Domont method, **do not optimize a stage by its rate alone — optimize by absolute drop-off.** At Ritsu's pre-launch scale the largest absolute drop-off is *structurally* guaranteed to be **Awareness→Signup** (because Awareness is ~0 today), but the largest *strategic* leak — the one that decides whether the business exists — is **Activation→Money-moment**, because that is where the unproven WTP bet sits. The operator instruments both; the experiments concentrate where the *strategic* leak is.

### 4.1 Stage 1 — Awareness (AWARE)
- **What it is:** a deadline-bearing masterer hits a wall in a dense graded course (a problem set they can't start; a lecture re-watched 3× with no gain; a midterm N weeks out), stops re-reading, starts *searching* ("how to actually understand backpropagation," "cs231n assignment too hard," "best way to study dense ML papers") — and the first thing that **names their pain** ("re-reading is passive, that's why it isn't sticking") earns the qualified click to ritsu.ai.
- **Conversion hypothesis:** of qualified wedge-surface impressions (Reddit r/learnmachinelearning · r/cs231n · r/premed; long-tail Google; YouTube study-science creators), **~1–5% → a qualified landing session** `inferred` (content/community pull, not paid push — the high end requires creator co-sign; cold search is the low end).
- **Primary drop-off:** pattern-matched to AI-study slop / cram-app / ad-tone-in-a-community-that-punishes-it → no click. The "AI does it for you" frame actively repels the sharper-not-lazier learner.
- **Stage KPI:** qualified landing sessions from wedge surfaces (UTM by source) × that traffic's landing→signup rate. Secondary: ML-intent + branded-search volume; community mentions — **0 organic today** `observed`. (Owned in `03-gtm`; channel sequence is *not* set here.)
- **Status:** **~0 today.** 15 founder-only shares ⇒ organic awareness ≈ 0 `observed`. This stage starts from a standing cold start.

### 4.2 Stage 2 — Signup (APPEAL + ASK)
- **What it is:** the landing-page appeal ("drop a file → 30s → a structured *path*, not a chat box") plus the skeptical pre-commitment research (the literal "NotebookLM vs Ritsu" tab-opening, the course-Discord "anyone tried Ritsu?"), ending in account creation + intent to run the first upload test.
- **Conversion hypothesis:** **landing→signup ~2–8%** `inferred` — this is the band the Domont/HubSpot freemium case operates in, and the stage where **form friction is the classic killer** (HubSpot: 11→4 fields doubled the rate). For Ritsu the friction is double: a *credibility* gate (does the hero read as "a method for a hard course" not "a flashcard toy"?) **and** a *no-card* freemium-clarity gate (state "free forever, no card" plainly — the price-sensitive ICP needs the free tier + its limits named *before* signup).
- **Primary drop-off (two, in order):** (1) **APPEAL** — hero reads as generic edtech / flashcard app → bounced as low-stakes; demo shows only easy prose → learner doubts it parses LaTeX/diagrams/code → assumes hallucination. (2) **ASK** — no credible accuracy/citation proof → "probably hallucinates"; free NotebookLM (Google-trusted, known, $0) wins by default-inertia; a signup wall *before* one real quiz → bounce.
- **Stage KPI:** landing→signup-intent rate for wedge-sourced traffic; research→signup rate from comparison/review touchpoints. (Maps to `weekly_signups`, owned by gtm-orchestrator.)
- **Status:** 25 profiles, **all founder/test** `observed` — no organic-source baseline.

### 4.3 Stage 3 — Activation (ACT, entry) — **the top lever, and the proxy problem**
- **What it is:** signup → first upload of a dense PDF (or lecture-video link) → **<60s first-quiz aha**: the first quiz immediately surfaces the *exact* thing they don't understand (the chain-rule step through batchnorm), rendered as a concept-map gap. This is the **activation event** — the wow moment that proves the core-value claim and is **the single strongest leading indicator of retention** (`product.md` §7; first-session activation → **4–5× better 30-day retention** vs >24h time-to-value, `north-star.md` §1.3).
- **Conversion hypothesis:** **signup→activation ≥40%** of signups reach the <60s aha (`north-star.md` §1.3 target; `icp-summary.md` §4 wedge KPI "time-to-first-aha <60s"). This is the **gate the whole 60-day plan is conditioned on** — the 4 acquisition engines do not scale until N=10 US-stranger activation ≥40% (the HOW-plan gate).
- **Primary drop-off:** (a) **generation quality on dense math** — a garbled LaTeX/backprop quiz kills trust *instantly* for this learner (this is the #1 SERVQUAL reliability bar, `product.md` §6.7, AND the #1 anti-NotebookLM moat); (b) the free **40-page / 30-min-video cap** truncates a 60-page lecture or 90-min video *before* the aha fires (a pricing-limit leak landing inside Activation).
- **Stage KPI:** `magic_moment_completion_rate` (the <60s-aha completion rate, owned by product-orchestrator); supporting `signup_to_activation_pct`.
- **⚠ Status — proxy-only (critical for every downstream SOP):** the canonical aha tables in Door-2 — **`live.quiz_attempts`, `live.activity_results`, `live.flashcard_reviews` — are 0 ROWS (empty)** `observed`. **A "first-quiz-aha" metric therefore CANNOT be measured directly today.** Until those tables populate, activation must be **proxied** from what *is* logged: `learning_sessions` (656 `observed`), activities-completed / learning-units-generated (3,329 units from 756 sources `observed` ⇒ uploaders *do* keep generating), and `onboarding_completed_at`. **SOP-GTM-011 (signup→first-upload activation) and SOP-METRICS-002 (activation-event instrumentation) must (1) define the proxy explicitly, and (2) flag closing this measurement gap — wiring quiz-completion telemetry — as their first dependency.** This is the most important honest caveat in the entire funnel.

### 4.4 Stage 4 — Habit (ACT, sustain)
- **What it is:** the masterer uses Ritsu for the rest of the study-week and **uploads the *next* lecture unprompted** — the strongest pre-paywall signal of durable value (`customer-journey.md` A4). This is what separates the *paying core* (the committed multi-week masterer who retains) from the *reach layer* (the one-shot crammer who churns post-exam, `icp-summary.md` §0).
- **Conversion hypothesis:** **week-1 re-upload >40%** of activated users (`icp-summary.md` §4: "upload-again-within-7d >40%"). High vs typical freemium because the *recurring graded deadline* is a durable, recurring trigger — the masterer has a *next* lecture every week, by definition.
- **Primary drop-off:** the first week's value didn't compound into a *path* feeling — it felt like a one-off quiz (which is exactly what free NotebookLM also gives) → no reason to return for lecture 2. The fix is the visible multi-week PATH + mastery heatmap, not another activity type.
- **Stage KPI:** week-1 re-upload rate (a proxy for `day_7_retention`, owned by customer-lead). **This is one of only two activation-zone metrics observable TODAY** (the re-upload/revisit pattern *is* present in Door-2: 4 sources/10 sessions and 42 sources/36 sessions `observed`), which makes it a high-priority place to start instrumentation.
- **Status:** revisit pattern present `observed` (founder-dominated, so the *rate* is unproven for strangers).

### 4.5 Stage 5 — Money-moment (ACT, commit) — **THE bet of the entire wedge**
- **What it is:** mid-course, mid-momentum, the masterer hits the credit/page wall on the next dense PDF with the deadline 6 days out, and faces the real, untested question: **type a card for $29 now, or limp along on free NotebookLM?** This is the **free→paid conversion**, and whether the multi-week PATH + mastery-tracking is worth real money over a free quiz-maker is **the single load-bearing bet of the wedge** (`icp-summary.md` §8 R1).
- **Conversion hypothesis:** **free→paid ≥5% (rolling 30d)** of activated users (`north-star.md` §1.3; `icp-summary.md` §4). Honest framing: the *first* job is to move this metric **above zero at all** — then toward ~3–5% of activated deadline-bearers (`customer-journey.md` A4 KPI). The edtech-freemium free→paid benchmark band is **~2–5%** `inferred`; Ritsu's deadline-gating *could* push the high end (exam in 2 weeks → $29 is trivial vs failing) — **but WTP at $29 is entirely unproven at true-zero.**
- **Primary drop-off:** (a) **"free NotebookLM does doc→quiz for $0 — why pay $29?"** (R2 hits hardest exactly here); (b) **$29 sticker-shock on a student budget**; (c) the limit lands as a *wall* (a generic "upgrade now" paywall) instead of *mid-momentum* ("you're 6 days from your deadline and mid-path — keep your momentum").
- **Stage KPI:** `free_to_plus_conversion` (the money-moment KPI, owned by gtm-orchestrator). Counter-metric guardrails apply (`north-star.md` §2): CAC payback <90d, <5% refund within 30d — *don't buy lukewarm paying users to hit the number.*
- **Status:** **0 real paying** `observed` (the 2 `payments`-paid rows are the founder's test card). **This is the one stage where the funnel has literally never fired.** SOP-GTM-012 (free→paid trigger detection) exists to engineer and test it — and its honest job description is "get this metric off zero," not "optimize a known rate." The recommended de-risking lever: a **deadline-scoped trial** (one-week Plus unlock / extra credits) so the WTP test becomes "pay to finish THIS exam" — the durable, recurring-deadline hook NotebookLM can't frame (`customer-journey.md` A4 lever). A parallel **med/pre-med N=10** further de-risks R1, since med students already pay $300–500 for UWorld/Anki-add-ons/Sketchy — *proven* adjacent WTP (`icp-summary.md` §4b).

### 4.6 Stage 6 — Love (ACT→ADVOCATE bridge)
- **What it is:** sustained weekly mastery across the multi-week course produces not "nice app" but "this is the first time a method made me feel capable" — the emotion that fuels advocacy. **Love is the north-star *gate*** (`north-star.md` §1.1): 100 *paying* is not enough; they must *love*.
- **Conversion hypothesis / definition-of-done** (`north-star.md` §2): **Sean-Ellis ≥40% "very disappointed"** if they could no longer use Ritsu (the *primary* love signal) **OR** NPS ≥40 **OR** ≥1 unprompted positive mention **OR** week-4 cohort retention **≥30%** (the proxy when individual signals are sparse). "Paying" itself requires ≥1 successful charge **AND** ≥7 days retention.
- **Primary drop-off:** the win wasn't *legibly Ritsu's* — they credit themselves, not the tool (no attribution surface) → no love, no referral, and NotebookLM-free wins on price. Or the multi-week value never materialized → churn after one exam (the reach-layer crammer failure mode).
- **Stage KPI:** `nps_very_disappointed_pct` (≥40%, owned by gtm-orchestrator) + `paid_retention_week_4` / `day_30_retention` (≥30%, owned by customer-lead). SOP-GTM-014 (Sean-Ellis survey) + SOP-METRICS-005 (cohort retention) instrument this.
- **Status:** unmeasured — no real cohort exists yet.

### 4.7 Stage 7 — Refer (ADVOCATE) — **the un-ignited flywheel**
- **What it is:** an attributed win + an unbroken-heatmap streak → the masterer pastes their Ritsu share-link to the *exact* assignment's quiz-path into the course Discord ("ran the whole thing through this, the gap-map is what fixed me"), a stranger clicks, and — if the link's destination *visibly proves the PATH* — that stranger enters at step 1. **The loop closes.**
- **Conversion hypothesis:** **refer-a-friend-by-week-2 >15%** of activated users create a share (`icp-summary.md` §4); of opened-by-a-stranger shares, a referral-grade signup rate (peer-trust traffic converts well above cold). K-factor / shares-per-activated-user is the guardrail.
- **Primary drop-off:** (a) the **share-link is a paywall/dead-end** → recipient bounces (the #1 mechanical leak — a stranger must be able to *taste* one activity + see the multi-week path before any signup); (b) **no attribution surface** → the advocate can't say "*this* got me the grade" → free NotebookLM wins on price; (c) sharing **feels like shilling** → the gimmick-averse won't post a referral-code hustle.
- **Stage KPI:** **organic stranger-referral signups** (non-founder share-links × opened-by-a-stranger × converted) — the **true PMF heartbeat**; first non-zero = flywheel ignition. (Owned in `03-gtm`; relates to `win_back_rate`/referral instrumentation.)
- **Status:** **0 organic** `observed`. The mechanic *works* (15 links created) but is **100% founder**. SOP-GTM-017 (hand-recruit & onboard by name) + SOP-CUSTOMER-006 (Collison install) are the ignition levers — hand-seed ~5–10 masterers in *one* live cs231n/6.S191 cohort so a single Discord reaches share-link critical mass and the first stranger-referral fires.

---

## 5. The two moments of truth — where the company lives or dies

The Domont diagnostic says "find the biggest absolute drop-off." For Ritsu, two specific drop-offs are **disproportionately load-bearing** — not because they have the steepest rates, but because they are the two **unproven, never-fired** transitions on which the entire thesis rests. Every gtm/funnel SOP should treat these as the priority experiment surfaces.

### MOT-1 — the <60s aha on dense math (inside Stage 3, Activation)
> *Does the first quiz find a **real** gap on dense math (a backprop derivation, a softmax gradient) — accurate, on-document, not trivial and not hallucinated — in under 60 seconds?*

This is simultaneously the **activation event** (the top retention lever) **and** the **#1 anti-NotebookLM moat** (the place where generation quality on LaTeX/equations/code visibly out-performs a free document-Q&A tool). It is a **product-quality** bet as much as a funnel bet: the lever is investment in LaTeX/math generation quality + naming the gap as a concept-map node. If MOT-1 fails, nothing downstream matters — the skeptical learner's trust breaks instantly and permanently. **Falsifiable test:** N=10 US strangers, activation (proxied per §4.3) ≥40%.

### MOT-2 — the $29 money-moment (Stage 5)
> *At the first hard limit, mid-course, with the deadline live — do they type a card for $29, or fall back to free NotebookLM?*

This is the **single unproven WTP bet** (R1). It is a **pure commercial** bet, and it is the **one transition in the funnel that has literally never fired** (0 real paying). The lever is to engineer the limit to land *mid-momentum* (deadline-scoped framing, a pay-to-finish-this-exam trial) rather than as a generic paywall, and to lead the value story on the PATH + mastery-tracking. **Falsifiable test (the load-bearing question of the whole company):** *do they pay at the first hard limit?* — the explicit charter of the N=10 watch (SOP-PRODUCT-002).

**Why naming exactly two MOTs matters for the backlog:** it tells every downstream SOP where to spend its scarce experiment budget. MOT-1 is owned jointly by product (generation quality) + gtm (activation instrumentation); MOT-2 is owned by gtm (free→paid) + sales (pricing-pull-test). Everything else in the funnel is an *optimization*; these two are *existence proofs*.

---

## 6. The funnel arithmetic — an illustrative worked model (all `hypothesis`)

To make the funnel a usable planning instrument (and to show the downstream SOPs how the stage rates compound), here is one **illustrative** pass at "what does it take to reach the first 100 paying who love." **Every number is a planning anchor, not a forecast** — the first real cohort replaces them.

| Stage | Rate (hypothesis) | To net 100 paying, you need… |
|---|---|---|
| Qualified landing sessions | — | **~100,000** qualified wedge-sourced sessions (top of model) |
| → Signup | ~4% (mid-band) | ~4,000 signups |
| → Activation (<60s aha, proxied) | ~40% (target) | ~1,600 activated |
| → Habit (wk-1 re-upload) | ~40% | ~640 habitual |
| → Money-moment (free→paid) | ~5% of *activated* | **~80 paying** |
| → Love (Sean-Ellis ≥40% / wk-4 ret ≥30%) | retention multiplier | of the paying, the loved subset |

**The arithmetic teaches three things the SOPs must internalize:** (1) at ~4% signup and ~5% free→paid-of-activated, the model is **acquisition-hungry** — ~100K qualified sessions is a *lot* for a solo founder + AI to source cold, which is precisely **why the flywheel (step 7) and the creator spine matter** — they lower the cost of the top. (2) The **two metrics with the most leverage on the bottom line are Activation (40%) and free→paid (5%)** — a 40%→55% activation lift or a 5%→8% money-moment lift moves the paying count more than doubling top-of-funnel traffic. This is the Domont "biggest absolute drop-off" lesson made concrete: **fix the leak, don't just pour in more water.** (3) The honest north-star timeline (`north-star.md` §2b) follows directly — from a cold, pre-launch, weak-US-network standing start, the *first* 100-who-love is realistically **months, not the 30-day measurement cadence**; the model above is a forcing function, not a deadline.

> **Provenance note:** the ~100K-session figure is back-solved from the target rates; it is **not** a traffic commitment and **not** a channel plan. The channel-by-channel CAC, budget, and cadence to source that traffic live in `03-gtm/` distribution docs + SOP-GTM-009 (channel attribution), not here.

---

## 7. The un-ignited flywheel — the operator's highest long-run leverage

The single most important *strategic* fact in this funnel: **the referral flywheel is built and works mechanically (15 share-links) but is 100% founder-driven — 0 organic stranger-referrals have ever fired** `observed`. This is not a small leak; it is a **dormant acquisition engine**. Once it turns, step 7 feeds step 1 with peer-trusted traffic that converts above any cold channel, and CAC structurally falls. Until it turns, every prospect is bought or earned one channel at a time.

**Why it hasn't ignited (root-cause, per the Domont method):**
1. **No critical mass in any single community** — 15 founder shares scattered ≠ a Discord reaching share-link saturation.
2. **The link destination may not prove the PATH** — if a stranger lands on a paywall or a thin single quiz, NotebookLM-free wins on price (R2). The link must showcase the multi-week path + Knowledge Map + activity variety and let a stranger *taste* one activity before signup.
3. **No attribution surface at the love-moment** — the advocate can't legibly say "*this* got me the grade."

**The ignition play (concrete, owned by gtm + customer):** hand-recruit ~5–10 deadline-bearing masterers in **one** live cs231n / 6.S191 cohort (SOP-CUSTOMER-006 Collison install + SOP-GTM-017 hand-recruit-by-name), so a single course Discord reaches share-link critical mass and the **first organic stranger-referral fires** — the true PMF heartbeat. This is also why the founder personally onboards the first ~30 paying (`product.md` §12): the early funnel is *hand-built*, then automated from N=31 (SOP-CUSTOMER-009).

---

## 8. What this foundation hands to the downstream SOPs

This doc is the **shared map**; here is the explicit handoff so each gtm/funnel SOP knows what it inherits vs what it must add.

| Downstream SOP / engine | Inherits from this funnel-model | Must add / decide |
|---|---|---|
| **SOP-GTM-010** landing→signup conversion | Stage 2 hypothesis (~2–8%), the two drop-offs (credibility gate + no-card clarity), the Domont form-friction lesson | the specific landing variants + the experiment design |
| **SOP-GTM-011** signup→first-upload activation | Stage 3 = the top lever; **the proxy mandate** (§4.3 — quiz tables empty, define the proxy first) | the exact proxy definition + the telemetry-gap closure plan |
| **SOP-GTM-012** free→paid trigger detection | Stage 5 = MOT-2; "get the metric off zero"; the deadline-scoped-trial lever; the R2/sticker-shock drop-offs | the trigger rules + the trial-mechanic experiment |
| **SOP-GTM-013** weekly funnel review | the seven-stage table + the "biggest absolute drop-off" diagnostic + the observed-vs-hypothesis status column | the weekly readout cadence + the alerting thresholds |
| **SOP-GTM-014 / SOP-METRICS-004** PMF (Sean-Ellis) | Stage 6 definition-of-done (≥40% very-disappointed = primary love signal) | survey instrument + sampling |
| **SOP-GTM-015 / SOP-METRICS-005** cohort retention | Stages 4 + 6 (wk-1 re-upload *observable now*; wk-4 ret ≥30%) | cohort definition + the retention curve |
| **SOP-GTM-017 / SOP-CUSTOMER-006** hand-recruit & Collison install | Stage 7 = the un-ignited flywheel + the one-cohort ignition play | the recruit list + the onboarding runbook |
| **SOP-PRODUCT-002** stranger-recruit-and-watch | both MOTs as the falsifiable tests (activation ≥40%; "do they pay at the first limit?") | the N=10 protocol (US strangers + parallel med cohort) |
| **10-metrics** instrumentation | the KPI ladder mapping (each stage → exact metric ID + target) | the dashboards + the experiment-significance math |

**The non-negotiable inheritance:** any SOP that touches Activation or the Money-moment must (1) respect the **proxy reality** (§4.3 — you cannot measure first-quiz-aha directly today), and (2) treat the two stages as **existence proofs to be moved off zero**, not known rates to be tuned. Coherence guard: this funnel must never contradict the WHAT-trio (`product.md` / `positioning.md` / `icp-summary.md`) or the north-star ladder — if a funnel experiment implies a different segment, belief, or money-moment, that is a bug; re-anchor to the canonical docs.

---

*This funnel model is the canonical answer to "what are the stages, where is the leak, and what is the honest number." It is a decision-grade map to **instrument and test** — not a claim of proven behavior. At true-zero, the only `observed` truths are: ~0 organic awareness, an upload-then-revisit habit pattern, 0 real paying, and a built-but-founder-only share loop. Everything between is the hypothesis the next cohort settles. When the first real funnel data lands, the largest absolute drop-off it reveals — almost certainly Activation→Money-moment — is where the operator points the experiments first.*
