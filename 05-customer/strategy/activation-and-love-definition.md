---
title: "Activation & Love Definition — the canonical truth the love-instrumentation and measurement SOPs consume"
type: strategy-doc
pillar: 05-customer
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Activation & Love Definition (north-star instrumentation foundation)"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/north-star.md
  - 00-core/icp-summary.md
  - 00-core/product.md
  - 01-marketing/icp/customer-journey.md
  - 01-marketing/icp/persona-portrait.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-ownership.yaml
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Canonical source of truth for "what counts as ACTIVATION, and what counts as LOVE, at Ritsu."**
> Every love-instrumentation hook, every measurement SOP (SOP-CUSTOMER-001/002/003, SOP-GTM-011/014/016, SOP-METRICS-004/005/007), and every dashboard tile that says the word "activation" or "love" MUST resolve its definition here — not re-derive its own. If two docs disagree on what activation means, **this doc wins** and the other is a bug.
>
> **Why this doc exists (the gap the adversarial-verify found):** `north-star.md` §1.3 names the leading-indicator ladder; `icp-summary.md` §4 names four wedge KPIs; `kpi-ownership.yaml` carries *two contradictory* activation definitions (`activation_rate` = 24h window, `signup_to_activation_pct` = same-cohort window) and an aha-moment that points at `SOP-CUSTOMER-001` which does not yet define it. The execution layer jumped ahead of the foundation. This doc IS the foundation: it pins the aha-moment to a *named, queryable* Door-2 signal, fixes the window, reconciles the two conflicting definitions into one, and states the exact thresholds that constitute "love."
>
> **Read in order:** §1 (the aha-moment + its honest proxy) → §2 (the canonical activation definition + the reconciliation) → §3 (the leading-metric ladder, each with a Door-2 source + a date window) → §4 (the love definition + thresholds) → §6 (the instrumentation contract — what downstream consumes).

**Owner:** customer-lead · **Pillar:** 05-customer / strategy · **Change policy:** PR + founder review (Tier C — this defines the company's primary leading indicators).
**Coheres with:** `00-core/north-star.md` (§1.2 ongoing metric, §1.3 ladder, §2 done), `00-core/icp-summary.md` (§4 wedge KPIs, §6 observable proxies), `00-core/product.md` (§7 magic moment = activation event), `01-marketing/icp/customer-journey.md` (the A4·ACT money-moment + the two moments of truth), `knowledge/analytics-sync-contract.yaml` (the Door-2 surface every metric below reads), `knowledge/kpi-ownership.yaml` (the registry this doc *corrects*).

---

## 0. The one-paragraph version (for the agent who only reads the top)

**Activation = the user reaches the mastery aha-moment within their first 7 days, where "aha-moment" is proxied — because the direct quiz signal is empty at true-zero — by `the user has at least one `live.learning_sessions` row tied to a `source_id`, with `activities_completed ≥ 1` once that counter is reliably populated; until then, the populated fallback proxy is `a learning_session of duration_minutes ≥ 2 on an uploaded source`.** **Love = a *paying, retained* learner who would be *very disappointed* to lose Ritsu** — operationally, the Sean-Ellis ≥40%-very-disappointed bar is the **primary** love signal, with week-4 cohort retention ≥25–30% and an organic (non-founder) referral as corroborating evidence. Everything between activation and love is the **leading-metric ladder** (§3): aha-proxy → week-1 re-upload → refer-by-week-2 → free→paid. **All five ladder metrics have a concrete Door-2 source and a single canonical date window, fixed in §3.** **Honest at true-zero:** activation and WTP are *unproven* (observed Door-2 state 2026-06-07: 25 profiles all founder/test, 656 sessions but `activities_completed≥1` populated on only **1**, `quiz_attempts`/`activity_results`/`flashcard_reviews` = **0 rows**, 15 shares all one founder, 2 paid on a founder test card). This doc defines the targets we will measure *the moment real users arrive*; it does not claim they are met.

---

## 1. The aha-moment — and the proxy we are forced to choose

### 1.1 What the aha-moment *is* (the experience)

The aha-moment is the single experiential event that proves Ritsu's core-value claim — *mastery from any source, fast* — to **this** learner (the deadline-bearing committed STEM/ML masterer, `icp-summary.md` §0). It is **not** "signed up," **not** "uploaded a file," **not** "saw the dashboard." Per `product.md` §7 and `customer-journey.md` A4·ACT, it is:

> **Drop a dense source → in <60s, a first quiz / first activity surfaces the *exact* concept the learner did not understand, rendered as a gap in a concept map → "oh, *that's* the piece I'm missing — and this actually works on my hardest material."**

The emotional signature (`persona-portrait.md` ★ core belief, `customer-journey.md` A4 emotion) is the reframe firing: *anxious + "I'm not smart enough" → relief + agency: "the method was wrong, not me."* That is the moment that, per `north-star.md` §1.3, drives **4–5× better 30-day retention** than a >24h time-to-value, and it is the PLG engine's ignition point.

**Two truths the aha-moment must satisfy to "count":**
1. **It happened on real material** (a `source` the user uploaded), not a demo — otherwise it is marketing, not activation.
2. **It involved active practice** (a generated activity engaged), not passive viewing — otherwise it is NotebookLM-grade document Q&A, not the mastery loop that is Ritsu's POD (`icp-summary.md` §8 R2).

### 1.2 Why we cannot measure the aha-moment directly (the true-zero instrumentation reality)

The *ideal* aha signal is **"the user completed their first generated quiz/activity on an uploaded source within 60 seconds of generation."** The direct columns for that are `live.quiz_attempts` (with `is_correct`, `time_taken_seconds`) and `live.activity_results` (`score`, `passed`, `time_taken_seconds`). **Both are 0 rows** (observed, 2026-06-07; confirmed in `analytics-sync-contract.yaml` Sprint-5 synced_tables). And `learning_sessions.activities_completed` — the counter that *should* aggregate this — is populated (`≥1`) on **exactly 1 of 656 sessions.** This is an **instrumentation gap, not a behavioral signal**: the product logs sessions and sources richly, but the activity-completion telemetry has not yet flowed into the Door-2 export. **Choosing `activities_completed ≥ 1` as the proxy today would report ~0% activation on a product people are demonstrably using** (756 sources, 656 sessions, one real user at 42 sources / 36 sessions per `persona-portrait.md` ★ observed).

So we **explicitly choose a proxy**, and we state its decay path to the real signal.

### 1.3 The chosen aha-PROXY (named, queryable, with a fallback ladder)

The aha-proxy is defined as a **two-tier signal that auto-upgrades as instrumentation lands** — so the *definition* is stable while the *underlying column* sharpens:

| Tier | Proxy definition | Door-2 source (live.*) | Populated today? | Use when |
|---|---|---|---|---|
| **Tier-1 (target proxy)** | First `learning_sessions` row for the user with a non-null `source_id` **AND** `activities_completed ≥ 1` | `learning_sessions(user_hash, source_id, activities_completed, started_at)` | ✗ (1/656 — instrumentation gap) | The moment `activities_completed` is reliably populated (product-side fix, tracked as a Door-2 dependency) |
| **Tier-2 is NOT usable today: live.learning_sessions.duration_minutes = 0 on ALL 656 rows (min=0, max=0; `>=2` matches 0, even `>0` matches 0). The proxy is itself an instrumentation gap identical to activities_completed — it would report 0% activation, the very failure mode §1.2 says it chose the proxy to avoid. Tier-0 (sources status='ready', 616 rows, processed_at populated) is the only proxy actually populated today; make THAT the in-force fallback until either duration_minutes OR activities_completed flows.** | First `learning_sessions` row for the user with a non-null `source_id` **AND** `duration_minutes ≥ 2` (a real study session on uploaded material, not an open-and-bounce) | `learning_sessions(user_hash, source_id, duration_minutes, started_at)` + `sources(user_hash, status='ready', created_at)` | ✗ — duration_minutes=0 on all 656 (proxy yields 0). Also: only 18 users have source-tied sessions (the proxy's real join); 19 is the distinct source-uploader count. | Until Tier-1 is populated |
| **Tier-0 (floor proxy — last resort)** | User has ≥1 `sources` row with `status` reaching processed/ready **within the window** (they got *to* the generated plan) | `sources(user_hash, status, processed_at)` | ✓ (756 sources) | Only if `learning_sessions` export ever degrades; weakest — proves upload, not practice |

> **Canonical statement:** **the aha-proxy is Tier-2 today and Tier-1 the moment `activities_completed` flows.** Both encode the same *intent* — "engaged in active practice on their own material in the first session" — so the upgrade does not break any downstream metric's meaning; it only sharpens it. The love-instrumentation hook (§6) MUST read the proxy through this ladder, not hard-code a single column.

**Why `duration_minutes ≥ 2` and not `> 0`:** a 0–1 minute session on an uploaded source is consistent with "opened, glanced, left" — the opposite of the aha. ≥2 minutes is the minimum window in which the <60s generation completes *and* the learner engages a first activity. This threshold is a **hypothesis to calibrate** against the first real cohort (SOP-CUSTOMER-002); it is deliberately conservative so we under-count rather than inflate activation at true-zero.

**Why NOT `onboarding_completed_at` as the aha-proxy:** `profiles.onboarding_completed_at` exists and is tempting, but (a) it is populated on only **8 of 25** profiles, and (b) onboarding completion is a *setup* event (role picked, preferences set), **upstream of and weaker than** the mastery aha — it proves the user finished a form, not that they hit "this works on my material." We retain `onboarding_completed_at` as a **secondary funnel checkpoint** (§3, the signup→onboarding leg), never as the activation gate itself.

---

## 2. The canonical ACTIVATION definition (and the reconciliation of the two conflicting defs)

### 2.1 The conflict in the registry (the bug this doc fixes)

`kpi-ownership.yaml` ships **two contradictory activation definitions** that the execution layer would otherwise both reference:

| Registry KPI | Owner | Stated formula | Window |
|---|---|---|---|
| `activation_rate` | customer-lead (05-customer/01-success) | "signups achieving aha moment **within 24h** / total signups" | **24 hours** |
| `signup_to_activation_pct` | gtm-orchestrator (03-gtm/04-funnel-orchestration) | "activated_users / signed_up_users in **same cohort window**" | **undefined ("same cohort window")** |

These are not two metrics — they are **two windows on the same event**, and the ambiguity ("24h" vs "same cohort window") guarantees two dashboards will report different activation numbers and nobody will know which is real. The adversarial-verify flagged exactly this.

### 2.2 The reconciliation (ONE canonical activation definition)

> **CANONICAL ACTIVATION (the only definition the workforce uses):**
>
> **A signup is *activated* when they reach the aha-proxy (§1.3) within their first 7 calendar days (the `Activation-7d` window), measured per weekly signup cohort.**
>
> **Activation rate** = (activated signups in cohort) / (total signups in cohort), reported per weekly cohort and as a rolling-4-week blend.

The two registry KPIs are reconciled as follows — **same event, two named windows, one of them primary:**

| Reconciled name | Window | Role | Status |
|---|---|---|---|
| **`activation_rate`** (CANONICAL) | **7 days** (`Activation-7d`) | The single source-of-truth activation metric. Owner: **customer-lead** (activation is a success/retention concept, and customer owns the lifecycle per `manifest.yaml`). | **Primary.** Re-window from 24h → 7d. |
| `activation_rate_24h` | 24 hours | A **fast-feedback secondary** for "did they activate *immediately*" — useful for the launch-day monitoring of a channel (SOP-GTM-004), NOT the headline. | Demoted to secondary; keep for speed-of-activation diagnostics only. |
| `signup_to_activation_pct` | = `Activation-7d` (resolves the "same cohort window" to **7 days**) | An **alias** of `activation_rate` for the GTM funnel view. Same numerator, same denominator, same window. NOT an independent metric. | **Merge into `activation_rate`.** gtm-orchestrator reads the customer-owned number; it does not compute a parallel one. |

**Why 7 days, not 24 hours, is canonical:** the wedge is **deadline-bearing** (`icp-summary.md` §4). A masterer who lands on a Tuesday with a problem set due in 9 days may upload, hit the aha, and return Thursday — their activation is real but spans >24h. A 24h window systematically *under-counts* the exact high-value behavior (sustained, deadline-paced study) we are optimizing for, and over-weights impulse signups who churn. The `customer-journey.md` A4·ACT narrative (re-upload the *next* lecture unprompted) is a multi-day arc. 7 days captures the aha + the first re-engagement; 24h captures only the impulse. **`north-star.md` §1.3 deliberately wrote "within N days" (not "within 24h") — this doc fixes N = 7.**

> **Registry change this doc mandates (PR to `kpi-ownership.yaml`):** (1) re-window `activation_rate` to 7 days and add the formula pointer to this doc; (2) rename the old 24h variant `activation_rate_24h`, marked secondary; (3) mark `signup_to_activation_pct` as `alias_of: activation_rate` and stop computing it independently; (4) re-point `magic_moment_completion_rate` (product-orchestrator) and the aha reference in `SOP-CUSTOMER-001` at the §1.3 proxy ladder. Until that PR lands, **this doc is the override** per the precedence note at the top.

### 2.3 The activation funnel (the steps, each a checkpoint)

The full path, with where each step is observable in Door-2 today:

| Step | Event | Door-2 signal | Observable now? |
|---|---|---|---|
| S0 | Signup | `profiles.created_at` (1 row/user) | ✓ (25, all founder/test) |
| S1 | Onboarding complete (secondary checkpoint) | `profiles.onboarding_completed_at` | ◐ (8/25 populated) |
| S2 | First upload | first `sources.created_at` per `user_hash` | ✓ (19 users, 756 sources) |
| S3 | **Source processed** (plan generated) | `sources.processed_at`, `status` | ✓ |
| **S4** | **AHA-PROXY = ACTIVATION** (first practice session on uploaded source, §1.3) | `learning_sessions` (source_id + duration/activities) | ◐ (656 sessions; Neither is populated: duration_minutes is 0 on all 656 sessions (same gap as activities_completed). Only the Tier-0 sources-ready floor proxy is populated today.) |
| S5 | Week-1 re-upload (the strongest pre-paywall retention signal) | 2nd `sources.created_at` within 7d of S2 | ✓ (the 4-source/10-session revisit is observed) |

**Activation is the S4 gate.** S0–S3 are the funnel *to* activation (owned jointly by GTM landing→signup and product onboarding); S5 onward is the *retention/love* path (§3–§4).

---

## 3. The leading-metric ladder — each metric with a Door-2 source and ONE canonical date window

This is the operational core. Per `north-star.md` §1.4, **the workforce can only act on leading indicators** — so each rung below is defined to be *measurable the moment real users arrive*, with the exact `live.*` source and a single fixed window (no ambiguity). Targets are the wedge KPIs from `icp-summary.md` §4 and the north-star ladder §1.3, reconciled.

| # | Leading metric | Canonical definition | Door-2 source (live.*) | **ONE date window** | Target | Owner | Observable today? |
|---|---|---|---|---|---|---|---|
| **L1** | **Activation rate** (the aha-proxy gate) | Activated signups / total signups, per weekly cohort. Activated = aha-proxy (§1.3) reached within 7d of `profiles.created_at`. | `profiles.created_at` ⋈ `learning_sessions(source_id, duration_minutes, activities_completed, started_at)` ⋈ `sources(status)` | **`Activation-7d`**: aha-proxy must fire within **7 days** of signup; cohort = ISO week of signup; report rolling-4-week. | **≥ 40%** of signups *(refine via SOP-CUSTOMER-002)* | customer-lead | ◐ proxy populated; direct activities counter pending |
| **L2** | **Week-1 re-upload rate** (mastery-intent / retention proof) | Of activated users, the share who upload a **2nd distinct source** within 7 days of their **first** upload. | `sources(user_hash, created_at)` — count distinct sources per user; flag 2nd within 7d of 1st | **`Reupload-7d`**: 2nd source within **7 days** of 1st `sources.created_at`. | **> 40%** (`icp-summary.md` §4: "upload-again-within-7d > 40%") | customer-lead / cs-coach | ✓ (the revisit pattern is observed; the rate is the thing to lift) |
| **L3** | **Refer-by-week-2 rate** (the flywheel ignition signal) | Of activated users, the share who **create a share-link** within 14 days of signup. *(Stranger-open is the lagging confirmation — L3b.)* | `session_shares(user_hash, created_at)`; corroborate stranger-open via `session_shares.view_count` | **`Refer-14d`**: a `session_shares` row created within **14 days** of `profiles.created_at`. | **> 15%** (`icp-summary.md` §4: "refer-a-friend-by-week-2 > 15%") | gtm-orchestrator | ✓ mechanic exists (15 shares) but **0 non-founder** — starts at ~0, the thing to move |
| **L3b** | **Organic stranger-referral signups** (lagging flywheel heartbeat) | Non-founder share-link **opened by a stranger** → that stranger signs up. The true PMF heartbeat (`customer-journey.md` A5). | `session_shares.view_count` > 0 on a non-founder `user_hash` → new `profiles.created_at` attributable to that share | event-based (no fixed window; first non-zero = ignition) | **first non-zero** (currently **0**) | gtm-orchestrator | ✗ has **never fired** (15/15 shares are one founder) |
| **L4** | **Free→paid conversion** (the money-moment KPI) | Of activated free users, the share who reach a **first successful paid charge** within 30 days. The single unproven WTP bet (R1). | `payments(user_hash, status='paid', payment_type, paid_at)` — first paid row per user; denominator = activated free users | **`Paid-30d`**: first `payments.status='paid'` within **30 days** of activation; report rolling 30-day cohort. | **> 5%** (rolling 30d) (`icp-summary.md` §4; `north-star.md` §1.3 ≥5%) | gtm-orchestrator / sales | ◐ schema ready (`payments` synced Sprint 5); **2 paid rows = founder test card** → effectively 0 real |
| **L5** | **Sean-Ellis "very disappointed" %** (the love gate — see §4) | % of surveyed activated users answering "very disappointed" if they could no longer use Ritsu. | **NOT in Door-2** — survey-sourced; lands in `ops.*` via SOP-CUSTOMER-018 / SOP-METRICS-004. | **`Love-survey`**: surveyed at **day-14 to day-30** of activation (after enough usage to have a real opinion); rolling. | **≥ 40%** | gtm-orchestrator | ✗ no survey instrument yet (0 real users to survey) |

**Window discipline (why each window is what it is):**
- **`Activation-7d` (L1):** matches the deadline-paced multi-day study arc (§2.2). 7d.
- **`Reupload-7d` (L2):** a 2nd upload is the clearest *intent-to-master-this-course* signal; 7 days is the within-assignment cadence (`customer-journey.md` A4: "re-upload the next lecture unprompted"). 7d from *first upload* (not from signup) so it measures study momentum, not acquisition.
- **`Refer-14d` (L3):** "by week 2" per the wedge KPI. A graded win + a struggling classmate (`customer-journey.md` A5) typically lands within the first exam cycle, ~2 weeks. 14d.
- **`Paid-30d` (L4):** the deadline-gated money-moment (`customer-journey.md` A4) fires at the *first hard limit mid-course*, which for an active deadline-bearer is within the first month of real use. 30d is also the north-star reporting cadence (`north-star.md` §2). 30d.
- **`Love-survey` (L5):** must be late enough that the user has *formed* an opinion (post-aha, post-re-upload) but early enough to be a leading signal — day-14 to day-30.

**The two metrics observable TODAY** (where love-instrumentation should start, per `customer-journey.md` §6.5): Only L2 (re-upload via sources.created_at) is populated right now. L1 via the ≥2-min fallback is NOT (duration_minutes=0); L1 is only computable today via the Tier-0 sources-ready floor.. L3b, L4, L5 are zero-today by reality, not by instrumentation — they are the bets the first real cohort settles.

---

## 4. The LOVE definition — what "100 paying who love" operationally means

`north-star.md` §2 defines "who love"; this doc makes it **operationally unambiguous for the love-instrumentation hook and SOP-METRICS-007** (the composite tile). Love is **not** a single metric — it is a **gate with a primary signal and corroborating evidence**, applied to a *paying, retained* learner.

### 4.1 The precondition: "paying" (gate, not signal)

Per `north-star.md` §2: **"paying" = ≥1 successful subscription charge AND ≥7 days retention from first charge date.** In Door-2 terms:
- `payments.status='paid'` with `payment_type` indicating subscription (not a one-off credit pack — exclude `pack_id`-bearing rows from the *subscription* count, though they count as revenue) — **AND**
- the user is still active 7+ days later: `profiles.last_active_at ≥ payments.paid_at + 7 days` **OR** `profiles.subscription_status` still active.

> A refund within 30 days (`payments.refund_amount_usd > 0`, `refunded_at` within 30d of `paid_at`) **disqualifies** the user from "paying who love" — refunds = not really paying (`north-star.md` §2 counter-metric). This is a hard exclusion, enforced in SOP-METRICS-007.

### 4.2 The PRIMARY love signal: Sean-Ellis ≥40% "very disappointed"

> **Love, primary:** **≥ 40% of surveyed paying-retained users answer "very disappointed"** to *"How would you feel if you could no longer use Ritsu?"* (`north-star.md` §2; SOP-METRICS-004; L5 above).

This is **the** canonical PMF / love signal. It is survey-sourced (`ops.*`, not Door-2). The 40% is the Sean-Ellis threshold, unchanged.

### 4.3 Corroborating love evidence (any ONE, in priority order — used when survey N is too small)

At true-zero and small-N, the survey will be sparse. The love-instrumentation hook treats the following as **corroborating** signals (`north-star.md` §2), in priority order:

| Priority | Corroborating love signal | Door-2 / source | Threshold |
|---|---|---|---|
| 1 | **Sean-Ellis ≥40% very-disappointed** (primary, §4.2) | survey → `ops.*` | ≥ 40% |
| 2 | **NPS ≥ 40** on first in-app survey | survey → `ops.*` (SOP-CUSTOMER-018) | ≥ 40 |
| 3 | **Week-4 cohort retention ≥ 25–30%** (proxy when individual signals sparse) | `profiles.last_active_at` / paid-cohort active at wk4; `learning_sessions` recurrence | ≥ 25% (PMF-dissolution floor) → ≥ 30% (north-star ladder target) |
| 4 | **≥1 unprompted positive mention OR organic referral** | `session_shares` stranger-open (L3b) + off-platform mention | ≥ 1 (any) |
| 5 | **Sustained mastery streak** (the emotional hook, `customer-journey.md` A5) | `profiles.current_streak` / `longest_streak`; recurring `learning_sessions` wk2→wk4 | streak ≥ 14d *(calibrate)* |

> **The week-4 retention band — reconciling two numbers:** `north-star.md` §1.3 targets **≥30%**; `kpi-ownership.yaml` `paid_retention_week_4` and the GTM PMF-dissolution criterion say **≥25%**. **Canonical resolution: ≥25% is the PMF *floor* (the dissolution gate); ≥30% is the *target* the workforce optimizes toward.** Both are correct at different altitudes — 25% clears the bar, 30% is healthy. The composite tile (SOP-METRICS-007) uses 25% as the threshold; the ladder (§3) drives toward 30%.

### 4.4 The composite — "100 paying who love"

The `hundred_paying_who_love_composite` (gtm-orchestrator, SOP-METRICS-007) is the weighted blend of **paying_count + week-4 retention + Sean-Ellis very-disappointed%**, normalized 0–100% (`kpi-ownership.yaml`). This doc fixes the inputs: **paying** per §4.1 (refund-excluded), **retention** per §4.3 priority-3 (≥25% floor), **very-disappointed** per §4.2 (≥40%). The milestone (`north-star.md` §1.1) is hit when **100 distinct users** clear *both* the paying gate (§4.1) *and* the love gate (≥40% very-disappointed at the cohort level, with corroboration).

---

## 5. Honesty ledger — what is observed vs inferred vs hypothesis (true-zero)

Every claim in this doc is tagged, per the calibre bar in `persona-portrait.md` / `customer-journey.md`:

| Claim | Status | Evidence |
|---|---|---|
| The product is being *used* (sources uploaded, sessions run, revisit pattern) | **observed** | Door-2: 756 sources, 656 sessions, 19 users-with-source, one user at 42src/36sess |
| `quiz_attempts` / `activity_results` / `flashcard_reviews` are empty → the direct aha signal is unmeasurable today | **observed** | Door-2: 0 / 0 / 0 rows (2026-06-07); `analytics-sync-contract.yaml` Sprint-5 |
| `activities_completed ≥ 1` is an instrumentation gap, not zero-behavior | **observed** | Door-2: 1/656 sessions populated, on a product with 656 sessions |
| This honesty-ledger line mis-states the evidence: duration_minutes exists as a column but = 0 on all 656 rows, so the ≥2-min proxy is NOT usable now. Correct status: instrumentation gap, not observed-usable. |
| Activation ≥40% is the right target | **inferred** | `north-star.md` §1.3; PLG telemetry (Amplitude/Mixpanel/Heap) — not yet validated on Ritsu |
| The aha drives 4–5× retention | **inferred** | replicated PLG telemetry cited in `north-star.md` §1.3 |
| The 7-day activation window beats 24h for this wedge | **inferred** (strong) | deadline-paced study arc (`icp-summary.md` §4, `customer-journey.md` A4) — to confirm against first cohort |
| Free→paid > 5% at $29 | **hypothesis** (R1, unproven) | 0 real paying (2 founder test rows); the N=10 watch's central test |
| Sean-Ellis ≥40% achievable | **hypothesis** | no real users surveyed yet |
| Organic referral fires | **hypothesis** | 0 stranger-referrals ever; 15/15 shares are one founder |

> **The two load-bearing unknowns this doc *defines but cannot assert*:** **(R1)** that deadline-bearing masterers *pay* at the first hard limit (L4), and **(R2)** that the love thresholds (§4) are reachable against *free* NotebookLM. This doc gives the measurement apparatus; SOP-CUSTOMER-002 (the N=10 stranger watch) and the first real cohort provide the data.

---

## 6. The instrumentation contract — exactly what downstream consumes

This is the doc's *output contract*. The love-instrumentation hook, the measurement SOPs, and the dashboard tiles read these **definitions** (not their own re-derivations):

| Consumer | What it reads from this doc | Door-2 / source binding |
|---|---|---|
| **Love-instrumentation hook** (05-customer) | The aha-proxy ladder (§1.3) — MUST read through the Tier-2→Tier-1 upgrade, not hard-code a column | `learning_sessions`, `sources` |
| **SOP-CUSTOMER-001** (aha-moment definition & tracking) | §1 (the aha-moment + proxy) — this doc *supplies* the definition SOP-CUSTOMER-001 was missing | §1.3 ladder |
| **SOP-CUSTOMER-002** (N=10 stranger watch) | The activation gate (§2.2) + L4 money-moment (§3) — the watch instruments "do they hit the aha-proxy, and do they pay at the first limit?" | L1, L4 |
| **SOP-CUSTOMER-003** (D1/D7/D30 cohort tracking) | The `Activation-7d` window + the week-4 retention band (§4.3) | `profiles.last_active_at`, `learning_sessions` |
| **SOP-GTM-011** (signup→first-upload activation) | The activation funnel steps S0–S4 (§2.3) | `profiles`, `sources`, `learning_sessions` |
| **SOP-GTM-014 / SOP-METRICS-004** (Sean-Ellis / very-disappointed) | §4.2 (primary love signal) + L5 window | survey → `ops.*` |
| **SOP-METRICS-005** (cohort retention wk1–wk4) | The 25%-floor / 30%-target reconciliation (§4.3) | paid-cohort active-at-wk4 |
| **SOP-METRICS-007** (the composite tile) | §4.4 (the composite inputs, refund-excluded) | `payments`, retention, survey |
| **`kpi-ownership.yaml`** | The §2.2 reconciliation — the registry PR that re-windows `activation_rate` to 7d, demotes 24h, aliases `signup_to_activation_pct` | — |

**The single rule:** if a downstream artifact needs to know "is this user activated?" or "does this cohort love Ritsu?", it resolves the answer **here** (§2.2 for activation, §4 for love) — it does not invent a parallel window or threshold. That is the entire reason this foundation exists.

---

## 7. Open dependencies (what must be true for these metrics to sharpen)

1. **Product-side: populate `activities_completed` (and ideally export `quiz_attempts`/`activity_results`) into Door-2** → upgrades the aha-proxy from Tier-2 to Tier-1 (§1.3). Tracked as the top instrumentation dependency; until then, the ≥2-min-on-source fallback is canonical.
2. **Build the in-app Sean-Ellis + NPS survey instrument** (SOP-CUSTOMER-018) → makes L5 / §4.2 measurable. Zero today.
3. **Attribute share-link opens to new signups** (L3b) → makes the flywheel heartbeat observable. The `session_shares.view_count` column exists; the signup-attribution join does not yet.
4. **Run SOP-CUSTOMER-002 (N=10 US stranger watch)** → the *only* path to converting R1/R2 from hypothesis to observed. The watch must report: activation-proxy hit-rate, week-1 re-upload rate, and **pay-at-first-limit yes/no** — the three things this doc defines and reality has not yet supplied.

---

## 8. Versioning

| Version | Date | Changes |
|---|---|---|
| 1.0-draft | 2026-06-07 | Foundation authored (F9). Defines the aha-moment + the explicit Tier-2 aha-proxy (`learning_sessions` ≥2-min-on-source, because `quiz_attempts`/`activity_results`/`activities_completed` are empty/sparse at true-zero) with a Tier-1 upgrade path. Reconciles the two conflicting `kpi-ownership.yaml` activation defs into ONE canonical `activation_rate` (7-day window; demotes the 24h variant; aliases `signup_to_activation_pct`). Defines the 5-rung leading-metric ladder, each with a concrete Door-2 source + one date window. Defines LOVE (paying-gate + Sean-Ellis ≥40% primary + corroborating ladder; reconciles the 25%-floor/30%-target retention split). States the instrumentation contract downstream consumes. Honest at true-zero (observed Door-2 state 2026-06-07 logged). Mandates a `kpi-ownership.yaml` PR. |

---

*This document is the canonical answer to "what counts as activation, and what counts as love, at Ritsu." If a measurement SOP or dashboard reports an activation or love number that does not trace to a definition here, that is a bug — fix the consumer to read this foundation, do not fork the definition.*
