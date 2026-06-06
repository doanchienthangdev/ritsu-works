---
title: "Ritsu Metrics Tree — the cause-effect KPI hierarchy rolling up to \"100 paying who love\""
type: metrics-tree
pillar: 10-metrics
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Balanced Scorecard / KPI Hierarchy"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/north-star.md
  - 00-core/icp-summary.md
  - 00-core/product.md
  - 00-core/positioning.md
  - 10-metrics/strategy/activation-and-love-definition.md
  - knowledge/kpi-ownership.yaml
  - knowledge/kpi-registry.yaml
  - knowledge/analytics-sync-contract.yaml
  - 10-metrics/README.md
  - 10-metrics/pmf-instrumentation/SOP-METRICS-007-100-paying-who-love-composite-metric
  - 10-metrics/dashboards/SOP-METRICS-008-founder-monday-dashboard
  - 10-metrics/pmf-instrumentation/SOP-METRICS-004-sean-ellis-very-disappointed-tracking
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/balanced-scorecard.md
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Foundation doc for the 10-metrics pillar.** This is the *strategy map* that the KPI registry, dashboards, alerting, and every measurement SOP reference. It is NOT the KPI list — it is the **cause-and-effect logic that says why each KPI exists and how it produces the next one up the chain.** Per the Balanced Scorecard discipline (Kaplan & Norton, 1992): *"the Scorecard's value is the cause-and-effect strategy map, not the KPI list."* Without this doc, every pillar's KPIs scatter; with it, the founder can read a single tree from "content shipped this week" all the way up to "are we a business."
>
> **Companion:** the *definitions* of the two load-bearing nodes — what "activation/aha" and "love" mean operationally, and which Door-2 proxy each uses while the real instrumentation is empty — are deferred to **`10-metrics/strategy/activation-and-love-definition.md` (F9)**. This doc owns the **tree** (the cause-effect skeleton + per-node owner + Door-2 source); F9 owns the **two definitions**. Read both together.

---

## 0. Why a tree, and why now (the one-paragraph thesis)

Ritsu's execution layer jumped ahead of its measurement foundation. There are 20 scaffolded SOP-METRICS-* procedures, a Tier-2 `kpi-registry.yaml`, and a `kpi-ownership.yaml` map — but **none of them carry the *causal logic* that connects a daily lever to the north star.** A founder looking at the dashboard today cannot answer "if I want the `hundred_paying_who_love_composite` to move next month, what is the *one input* I should push this week?" The Balanced Scorecard answers exactly that question by stacking four perspectives in a strict cause→effect order: **Learning & Growth** (the capabilities we build) enable **Internal Process** (how fast/well we convert a signup), which produce **Customer** outcomes (retention + love), which produce **Financial** results (paying + MRR). For a pre-PMF, true-zero, solo-founder + AI-workforce B2C-PLG company, this tree is not a board-reporting artifact — it is the **prioritization spine.** It tells the workforce: *act on the bottom of the tree; the top is a consequence you cannot "do" directly* (the north-star's own §1.0 three-layer rule, restated as a four-layer scorecard).

This doc fixes the tree. It does **not** re-derive the north star (`00-core/north-star.md` is canonical and cited throughout) — it *operationalizes* it into a measurable hierarchy and **flags the single biggest hole**: the entire instrumented KPI registry is internal-ops; **zero product/love KPIs are actually wired** (§6). That hole is what the "love block" of the foundation backlog fills.

---

## 1. The Ritsu strategy map (the cause-effect picture)

Read **bottom-up** (the direction of causation) — but the founder *reports* top-down (the direction of attention). Every arrow is a falsifiable hypothesis: "improving the node below *causes* the node above to improve."

```
                        ┌─────────────────────────────────────────────────────┐
   THE COMPOSITE  ▲     │  ★ hundred_paying_who_love_composite  (NORTH STAR)   │
   (lagging; the  │     │  weighted blend of paying_count × week-4 retention   │
    one tile)     │     │  × Sean-Ellis very-disappointed% → normalized 0-100% │
                        └───────────────────────────▲─────────────────────────┘
                                                     │ rolls up from ↓
   ┌──────────────────────────── FINANCIAL ─────────┴──────────────────────────┐
   │  paying_users_count_by_tier · mrr · arppu · free_to_plus_conversion        │ ▲ lagging
   │  "Are we a business?"  — the COUNT (the §1.1 milestone half of the comp.)   │ │
   └────────────────────────────────────▲──────────────────────────────────────┘
                                         │ caused by ↓ (you don't buy love; love pays)
   ┌──────────────────────────── CUSTOMER ─┴────────────────────────────────────┐
   │  ★ nps_very_disappointed_pct (Sean-Ellis ≥40% = PRIMARY love signal)       │ │ slightly
   │  day_30_retention / paid_retention_week_4 (≥30%/≥25%) · nps_score · churn   │ │ lagging
   │  mastery_progression_rate (Ritsu-specific: did they actually master it?)    │ │
   │  "Do the right people get durable value — and would they grieve losing us?" │ │
   └────────────────────────────────────▲──────────────────────────────────────┘
                                         │ caused by ↓ (retention is built at activation)
   ┌──────────────── INTERNAL PROCESS ─────┴────────────────────────────────────┐
   │  ★ activation_rate / magic_moment_completion_rate (≥40%; first <60s aha)    │ │ leading
   │  time_to_first_value (median signup→activated, sec) · signup_to_activation% │ │
   │  faq_handled_pct · activation_to_paid_pct · share-link generation (loop)    │ │
   │  "How well do we convert a stranger into someone who felt the value fast?"  │ │
   └────────────────────────────────────▲──────────────────────────────────────┘
                                         │ caused by ↓ (process quality is built by what we ship + learn)
   ┌──────────── LEARNING & GROWTH ────────┴────────────────────────────────────┐
   │  experiments_shipped/wk · features_shipped/wk · content shipped (4 engines) │ │ leading-
   │  N=10-stranger-activation gate (≥40%) · wedge_validity_rate · message-fit   │ │ most
   │  "Are we building the capability + learning the truth that improves Process?"│ │
   └─────────────────────────────────────────────────────────────────────────────┘
```

**The Ritsu-specific reading of the map (the "so what"):**

- The **Customer→Financial** arrow is the whole bet: *love precedes revenue, not the reverse.* The north star is "100 paying **who love**" — not "100 paying." The guardrails in `north-star.md` §2 (CAC payback <90d, <5% refund) exist precisely to stop the workforce from buying the Financial node without the Customer node beneath it.
- The **Process→Customer** arrow is the highest-leverage lever Ritsu has: **first-session activation drives 4–5× better 30-day retention** than >24h time-to-value (`north-star.md` §1.3, replicated PLG telemetry). This is why `activation_rate` sits at the top of Internal Process and is the **single most-watched leading indicator** — it is the cause of the Customer layer.
- The **L&G→Process** arrow is where the **60-day plan actually operates.** The four acquisition engines (creator spine, AI-avatar content factory, paid message-fit, product share-loop) and the **N=10 US-stranger activation ≥40% gate** are L&G investments whose *only justification* is that they improve the Process layer (activation, share-loop) — exactly the Hilton lesson (training is a financial decision because of the cause-effect chain).

---

## 2. Layer-by-layer: the canonical node table

Each node below carries: the **KPI id** (matching `kpi-ownership.yaml`), the **canonical owner** (pillar + role), the **target** (from `north-star.md` / dissolution criteria where one exists), the **Door-2 source** (the *real* table/column — or the honest gap), and the **status flag** (`INSTRUMENTED` = in Tier-2 `kpi-registry.yaml`; `MAPPED-ONLY` = owner-assigned but NOT in the registry, i.e. defined but not wired; `PROXY` = no real source yet, using a Door-2 stand-in).

> **Door-2 honesty banner (read before trusting any source below):** the ONLY product-data path is the pseudonymized `ritsu-analytics` `live.*` schema (firewall: never `product.*`). As of 2026-06-07 it holds **profiles=25 (all founder/test), learning_sessions=656, learning_progress=369, sources=756, session_shares=15 (founder-only), payments(paid)=2 (founder test card)** — and CRITICALLY **`live.quiz_attempts` / `live.activity_results` / `live.flashcard_reviews` = 0 ROWS.** *Observed via `mcp__supabase-analytics__query`, 2026-06-07.* Therefore **every "first-quiz-aha" node is a PROXY** built from what IS logged. The exact proxy columns are defined in F9; this doc records which table each node *will* read.

### 2.1 — FINANCIAL perspective (top of the dashboard; lagging; "Are we a business?")

| KPI id | Owner | Target | Door-2 source (real columns) | Status |
|---|---|---|---|---|
| `paying_users_count_by_tier` | finance / backoffice-clerk | →100 (milestone) | `live.payments` (`status='paid'`, `plan_tier`, `paid_at`) ∪ `live.profiles.subscription_tier/subscription_status` | **PROXY** (Stripe→Tier-2 is canonical; Door-2 mirrors it. **2 paid rows = founder test card, not real demand**) |
| `mrr` | finance / backoffice-clerk | grow | Stripe (READ-ONLY)→`ops.kpi_snapshots`; Door-2 cross-check: `SUM(amount_usd − fee_usd − refund_amount_usd)` from `live.payments WHERE status='paid'` | MAPPED-ONLY |
| `arppu` | sales / growth-orchestrator | — | `mrr / paying_users_count` | MAPPED-ONLY |
| `arr_projection` | finance / backoffice-clerk | — | `mrr × 12` | MAPPED-ONLY |
| `free_to_plus_conversion` | sales / growth-orchestrator | ≥5% (rolling 30d) | `live.profiles` tier transitions Free→Plus over cohort window | MAPPED-ONLY |
| `runway_months` | finance / backoffice-clerk | "default alive" | finance internal; not Door-2 | MAPPED-ONLY |
| `ai_ops_cost_as_pct_of_mrr` | finance / backoffice-clerk | <5% | `SUM(ops.cost_attributions.usd) / mrr` | MAPPED-ONLY |

**Canonical definition (Financial):** the Financial layer answers `north-star.md` §1.1's *milestone* half — the **paying COUNT**. It is **lagging** (`north-star.md` §1.4: "the milestone + paying-count are lagging") and **must never be the thing agents are ranked on**. The counter-metric guardrails (`north-star.md` §2: CAC payback <90d, refund <5%, 0 catastrophic incidents) live conceptually *inside* this layer as the "don't game the count" rail. **Pricing is verified-live** (`product.md` §10 / ritsu.ai/pricing): Free $0 (600cr) / Plus $29 (12k) / Pro $59 (25k) / Ultra $119 (55k), annual −17% — these set the `amount_usd` buckets but the **WTP at these points is UNPROVEN at true-zero** (the SOP-PRODUCT-010 pricing-pull-test, `icp-summary.md` §5).

### 2.2 — CUSTOMER perspective ("Do the right people get durable value — and would they grieve losing us?")

| KPI id | Owner | Target | Door-2 source (real columns) | Status |
|---|---|---|---|---|
| ★ `nps_very_disappointed_pct` | gtm / gtm-orchestrator | **≥40%** (PMF + the **primary love signal**) | in-product Sean-Ellis survey → `ops.events`/`ops.kpi_snapshots` (NOT Door-2; behavioral survey) | **MAPPED-ONLY** (no survey shipped) |
| `day_30_retention` | customer / customer-lead | ≥30% | `live.profiles.last_active_at` vs `created_at` cohort; `live.learning_progress.last_activity_at` | **PROXY** |
| `paid_retention_week_4` | gtm / gtm-orchestrator | ≥25% (dissolution) | `live.payments` active-at-week-4 ∩ `live.profiles.subscription_status` | **PROXY** |
| `day_7_retention` | customer / customer-lead | (leading rung) | same proxy substrate, 7-day window | **PROXY** |
| `nps_score` | customer / feedback-aggregator | ≥40 (alt love signal) | in-app + cancel-flow survey → `ops.*` | MAPPED-ONLY |
| `churn_rate_monthly` | customer / retention-watcher | low | `live.profiles.subscription_status` transitions to churned | **PROXY** |
| `win_back_rate` | customer / retention-watcher | — | reactivation cohort | MAPPED-ONLY |
| ★ `mastery_progression_rate` | customer / cs-coach | — (**Ritsu-specific moat metric**) | `live.learning_progress.completed_at` / `current_unit_index` over plan; `live.user_achievements.earned_at` | **PROXY** |
| `very_disappointed_pct_by_feature` | product / product-orchestrator | — | disaggregation of the survey by feature usage | MAPPED-ONLY |

**Canonical definition (Customer):** this is the **load-bearing layer of the whole tree** because the north star is *love*, not just pay. Two sub-claims:

1. **`nps_very_disappointed_pct` ≥40% is the PRIMARY definition of "love"** (`north-star.md` §2; Sean-Ellis). The other love signals (NPS≥40, unprompted referral, week-4 retention ≥30%) are *secondary/proxy* per the north-star's priority order. **F9 owns the precise operational definition of "love"** — this doc only places it in the tree.
2. **`mastery_progression_rate` is Ritsu's differentiating Customer metric** — *"% of users who actually master the content they upload"* (`kpi-ownership.yaml`). It is the **measurable expression of the core-value claim** (`product.md` §4: "core value is mastery — true understanding"). It is also the **moat metric vs the shadow rival**: free Google NotebookLM clones doc→quiz→explanation→share (`icp-summary.md` §8 R2), so Ritsu's Customer-layer win must show up as *PATH-completion + concept-level mastery*, never as "we make quizzes." Tracking it requires the multi-week-path proxy (`live.learning_progress`), which is the most analytically-rich substrate Door-2 currently offers (369 rows).

> **Activation vs Customer boundary (so the layers don't blur):** `activation_rate` (did they feel the value *once*, fast) is **Internal Process** (§2.3) — it is the *cause*. `day_30_retention` / `mastery_progression` (do they get value *durably*) is **Customer** — the *effect*. F9 nails the activation/aha definition; this doc fixes that activation lives one layer *below* retention in the causal stack.

### 2.3 — INTERNAL PROCESS perspective ("How well do we convert a stranger into someone who felt the value fast?")

| KPI id | Owner | Target | Door-2 source (real columns) | Status |
|---|---|---|---|---|
| ★ `activation_rate` | customer / customer-lead | **≥40%** (the top lever) | **PROXY** — `live.learning_sessions.activities_completed` > 0 (since `quiz_attempts`=0) ∩ `live.profiles.onboarding_completed_at` | **PROXY** (def → F9) |
| ★ `magic_moment_completion_rate` | product / product-orchestrator | ≥40% | same proxy: first session reaching first generated-activity (`activities_completed`, `commands_used`) | **PROXY** (def → F9) |
| `time_to_first_value` | product / product-orchestrator | <60s (the activation event) | `median(live.learning_sessions.started_at − live.profiles.created_at)` for first session; in-product magic-moment is the canonical clock | **PROXY** |
| `signup_to_activation_pct` | gtm / gtm-orchestrator | ≥30% (alert <30%/2wk) | `ops.events(signup)` ∩ activation-proxy event | MAPPED-ONLY |
| `activation_to_paid_pct` | gtm / gtm-orchestrator | — | first-paid cohort / activated cohort | MAPPED-ONLY |
| share-link generation (the **PLG loop**) | gtm / gtm-orchestrator | (loop health) | `live.session_shares` (`is_active`, `view_count`) — **15 rows, all founder** | **PROXY** |
| `faq_handled_pct` | customer / support-agent | ≥70% | `ops.support_tickets` (self-service deflection) | MAPPED-ONLY |
| `feature_usage_distribution` | product / product-orchestrator | — (reveals the wedge) | `live.learning_sessions.commands_used` (which of 17 activity types) | **PROXY** |

**Canonical definition (Internal Process):** this layer is **where the product's <60-second three-step flow becomes a number** (`product.md` §7: drop file → AI builds plan → start mastering = "the activation event"). It is the **most actionable layer** — `activation_rate` is *the* top lever (`north-star.md` §1.3) because of the 4–5× retention multiplier. The **share-loop** belongs here too: in a PLG company "product usage itself drives acquisition" (`product.md` §7), so `session_shares` is simultaneously a Process-quality signal *and* the acquisition mechanism that feeds back into L&G. **Every node here is a PROXY** until real activity logging fills `quiz_attempts`/`activity_results` — the proxy of record is `learning_sessions.activities_completed`, the one column that *does* fire on a completed activity.

### 2.4 — LEARNING & GROWTH perspective ("Are we building the capability + learning the truth that improves Process?")

| KPI id | Owner | Target | Door-2 source | Status |
|---|---|---|---|---|
| `experiments_shipped_per_week` (`persona.cgo.*`) | ai_ops / gtm-orchestrator | 1–3/wk | `ops.campaigns` | INSTRUMENTED (persona KPI) |
| `experiment_kill_rate` (`persona.cgo.*`) | ai_ops / gtm-orchestrator | 50–70% | `ops.campaigns` | INSTRUMENTED (persona KPI) |
| `features_shipped_per_week` (`persona.cpo.*`) | ai_ops / product-orchestrator | 1–2/wk | `ops.tasks` + `ops.events` | INSTRUMENTED (persona KPI) |
| `wedge_validity_rate` (`persona.cpo.*`) | ai_ops / product-orchestrator | >0.60 | `ops.events` (feature-launched/killed) | INSTRUMENTED (persona KPI) |
| **N=10-stranger-activation gate** | product / product-orchestrator | **≥40%** (the 60-day go/no-go) | SOP-PRODUCT-002 observed sessions → `ops.events`; the activation-proxy applied to the 10 US testers | **MAPPED-ONLY** (the gate exists; metric not wired) |
| content shipped (4 engines) | gtm / gtm-orchestrator | per 60-day plan | `ops.campaigns` / `ops.content_drafts` | MAPPED-ONLY |
| `experiment_turnaround_days` | metrics / experiment-analyst | ≤7d | `ops.campaigns` | MAPPED-ONLY |

**Canonical definition (Learning & Growth):** the *capability + truth-discovery* layer — what the company **builds and learns** that makes the Process layer better. For Ritsu this is dominated by two things: **(a)** the four acquisition engines + experiment cadence (the cgo/cpo persona KPIs are *already instrumented* — the only product-adjacent KPIs that are), and **(b)** the **N=10 US-stranger activation ≥40% gate** — the explicit go/no-go that the 60-day plan hangs on (`product.md` §12: "SOP-PRODUCT-002 mandates N=10 strangers observed before any major feature build … the strangers should be US testers — Phase A"). The gate *is* an L&G KPI: it measures whether the company has *learned the truth* (do real US strangers activate?) before it spends on the Process/Customer layers above. **This is the single most important L&G measurement and it is MAPPED-ONLY** — flagged in §6.

---

## 3. The composite — how the tree rolls up to ONE tile

The north star is **not** a layer; it is the **weighted apex** that collapses the Financial + Customer layers into a single 0–100% progress score (`north-star.md` §1.2 "ongoing metric"; `kpi-ownership.yaml` `hundred_paying_who_love_composite`; defined in **SOP-METRICS-007**).

```
hundred_paying_who_love_composite  =  normalize(
        w₁ · paying_users_count            (FINANCIAL — the milestone count)
      + w₂ · paid_retention_week_4         (CUSTOMER — durability)
      + w₃ · nps_very_disappointed_pct     (CUSTOMER — the love signal)
   )  → 0–100%
```

- **Owner:** *defined* in `kpi-ownership.yaml` as **gtm / gtm-orchestrator** (sub-pillar 05-pmf-instrumentation), *composed* in **10-metrics / SOP-METRICS-007**, *displayed* on the founder-Monday dashboard as **THE tile** (SOP-METRICS-008). This split is deliberate: GTM owns the *meaning*, Metrics owns the *readout* (`10-metrics/README.md`: "Metrics owns definitions + dashboards; the domain meaning lives in the owning pillar").
- **Polarity + alert:** P0 alert if it **decreases week-over-week 2× in a row** (`kpi-ownership.yaml`). "If this number doesn't move, nothing else matters" (CEO Review v1.0.1).
- **Why a blend, not the raw count:** a raw paying count is gameable (buy lukewarm users); the blend forces *paying × retained × loved* to move **together**, which is the only honest expression of "100 who LOVE." This is the scorecard's anti-vanity discipline applied to the single most important number.
- **The weights (`w₁,w₂,w₃`) are an open decision** — set in SOP-METRICS-007, not here. Recommended default until real data: weight **love (Sean-Ellis) heaviest** pre-PMF, because at true-zero the *quality* of the first cohort predicts growth far more than its size (`north-star.md` §1.1: "lukewarm 100 paying is harder to grow than 30 who love").

---

## 4. Leading vs lagging — what the workforce may act on

The four perspectives map cleanly onto the north-star's own leading/lagging rule (`north-star.md` §1.4) — restated as a scorecard, this is the **single most important operating instruction in the tree**:

| Perspective | Leading/Lagging | Can the workforce *act* on it? | What you do |
|---|---|---|---|
| Learning & Growth | leading-most | **YES — directly** | ship experiments/content; run the N=10 gate |
| Internal Process | leading | **YES — directly** | cut time-to-value; raise activation; fix the share-loop |
| Customer | slightly lagging | **NO — only via Process** | you don't "do" retention; you cause it at activation |
| Financial | lagging | **NO — only via Customer** | you don't "do" MRR; loved customers pay |

**The rule:** *rank every experiment on L&G + Process; measure success on Customer + the composite.* The most common failure this prevents is **optimizing a lagging number directly** — e.g. discounting to bump the paying count (Financial) without the Customer layer beneath it, which the CAC/refund guardrails (`north-star.md` §2) exist to catch. (The Cadillac/BMW lesson, `north-star.md` §6: market-share-style counts are lagging; customer-equity signals are leading.)

---

## 5. Cause-effect narrative (the strategy-map prose the SOPs reference)

The Balanced Scorecard's template requires an explicit narrative of the L&G→Process→Customer→Financial links. Ritsu's, in one paragraph per arrow:

- **L&G → Process.** The 60-day plan's four acquisition engines + the N=10 activation gate exist *only* to improve the Process layer. The gate is the regulator: if observed US-stranger activation is **<40%**, the company has learned that the Process layer is broken and must **NOT** spend on scaling the engines (the gate *blocks* the L&G→acquisition spend). This is the Hilton lesson — the N=10 watch (an L&G investment) is a *financial* decision because it sits at the base of the chain that ends in MRR.
- **Process → Customer.** First-session activation (<60s magic moment) **causes** 30-day retention at a **4–5×** rate vs slow time-to-value (`north-star.md` §1.3). Therefore raising `activation_rate` is the highest-leverage move available — it is the lever that most moves the Customer layer, which most moves the composite. The PLG share-loop (`session_shares`) is the second Process→Customer (and Process→L&G) link: shares both signal value *and* re-feed acquisition.
- **Customer → Financial.** Loved customers (Sean-Ellis ≥40%) **refer and retain**; lukewarm ones don't (`north-star.md` §1.1). Revenue is the *consequence* of love, never its substitute. `mastery_progression_rate` is the Customer-layer metric that most directly justifies the price — a learner who *actually mastered* a hard graded course (`icp-summary.md` wedge) hits the first hard credit limit while in a state of demonstrated value, which is exactly the "money-moment" (`icp-summary.md` §4: free→paid at the first hard limit).
- **Financial → (back to L&G).** Revenue funds more L&G capacity (more experiments, more content, lower `ai_ops_cost_as_pct_of_mrr`) — closing the loop. Pre-PMF this arrow is weak (true-zero revenue); the company runs on the founder's time + AI-workforce, not on revenue-funded growth (`north-star.md` §2b timeline honesty).

---

## 6. ★ THE GAP THIS FOUNDATION FILLS — the registry is 100% internal-ops, 0% product/love

This is the **central finding** of the metrics-tree foundation and the reason the "love block" of the backlog exists.

**Observed (Tier-1, 2026-06-07):** the instrumented Tier-2 KPI registry — `knowledge/kpi-registry.yaml` — contains **~30 KPIs, and every single one is internal-ops infrastructure**: `minion_queue_depth`, `hitl_backlog_size`, `docs_drift_count`, `core_docs_filled_count`, the 5 `brain.*` gbrain KPIs, the 4 `entity_update_*`, the 3 `skillopt_*`, the 3 `deepask.*`, the 4 `forge.*`, the 3 `design_system.*`, the 2 `analytics_*`. **There is NOT ONE product, funnel, retention, activation, or love KPI in the wired registry.**

Meanwhile **`knowledge/kpi-ownership.yaml`** *names* all the product/love KPIs of this tree (`activation_rate`, `day_30_retention`, `nps_very_disappointed_pct`, `mastery_progression_rate`, `hundred_paying_who_love_composite`, `mrr`, `free_to_plus_conversion`, …) — but **only as an owner-map.** They are **MAPPED-ONLY**: assigned an owner and a formula sentence, but **not wired into the alerting/threshold registry, and their Door-2 sources are mostly empty or proxy** (§2). The composite tile — *"if this number doesn't move, nothing else matters"* — **has no instrumented row in `kpi-registry.yaml`.**

**The three-part gap, precisely:**

| # | Gap | Where it bites | What fills it |
|---|---|---|---|
| **G1** | Every product/love KPI is **MAPPED-ONLY** (in ownership, absent from the wired registry) | the founder Monday dashboard would render the *whole bottom-right of the company* (the actual business) as un-instrumented | **register the §2.1–§2.4 ★ nodes in `kpi-registry.yaml`** with thresholds + Door-2 sources — the love-block's first artifact |
| **G2** | The two load-bearing nodes (**activation/aha** + **love**) have **no operational definition** and **no real source** (`quiz_attempts`=0) | you cannot compute `activation_rate` or `nps_very_disappointed_pct` today | **F9 `activation-and-love-definition.md`** (the definitions + the Door-2 proxies); then SOP-METRICS-004 (Sean-Ellis) + the activation event must ship |
| **G3** | The composite (**SOP-METRICS-007**) is scaffolded but **not built**, and its weights are unset | THE tile is empty | **build SOP-METRICS-007** on top of G1+G2 — the apex of this tree |

**Why this happened (honest read, not blame):** the AI-workforce built its *own* operating capabilities first (gbrain, deepask, forge, /update, design-system) and instrumented those — because those are the things the workforce *does*. The product/love KPIs measure things the workforce *cannot do directly* (they depend on real users, who don't exist yet at true-zero). The tree makes the omission visible: **the company has rigorously instrumented its tools and left its north star un-wired.** Fixing that is the foundation layer's job — and it is *correctly sequenced after* this tree, because you cannot wire a KPI registry until the cause-effect map (this doc) and the two definitions (F9) exist.

**Acceptance test for "the gap is closed":** the founder-Monday dashboard renders **THE tile** (`hundred_paying_who_love_composite`) as a live number, backed by **registered, threshold-ed rows** for the four ★ nodes (`activation_rate`, `paid_retention_week_4`, `nps_very_disappointed_pct`, `mastery_progression_rate`), each with a Door-2 source (proxy-tagged where real logging is empty). Until then, every ★ in §2 is the open work.

---

## 7. Honesty ledger (observed vs inferred vs hypothesis)

| Claim | Status | Basis |
|---|---|---|
| `kpi-registry.yaml` has 0 product/love KPIs | **OBSERVED** (Tier-1) | full read of the file, §6 |
| `quiz_attempts`/`activity_results`/`flashcard_reviews` = 0 rows | **OBSERVED** (Door-2) | `mcp__supabase-analytics__query`, 2026-06-07 |
| profiles=25 (all founder/test), payments(paid)=2 (founder card), session_shares=15 (founder) | **OBSERVED** (Door-2) | same query; founder-attribution per brief |
| `learning_sessions.activities_completed` is a usable activation proxy | **INFERRED** | the one column that fires on a completed activity; column verified to exist |
| activation → 4–5× retention | **INFERRED** (external evidence) | replicated PLG telemetry cited in `north-star.md` §1.3; not yet Ritsu-observed |
| WTP at $29/$59/$119 | **HYPOTHESIS / UNPROVEN** | `icp-summary.md` §5; SOP-PRODUCT-010 pricing-pull-test pending |
| Sean-Ellis ≥40% = love | **DEFINITIONAL** | `north-star.md` §2 (the chosen primary love signal); to be operationalized in F9 |
| the composite weights `w₁,w₂,w₃` | **OPEN DECISION** | deferred to SOP-METRICS-007 |

---

## 8. What this doc fixes (load-bearing decisions) vs what it defers

**Fixes (canonical from here):** the four-perspective cause-effect skeleton (§1); the per-node owner + Door-2 source + status flag (§2); the composite roll-up formula shape + owner-split (§3); the leading/lagging action rule (§4); the strategy-map narrative the SOPs cite (§5); and the **central gap finding** (§6).

**Defers (NOT this doc's job):**
- **Activation/aha + love operational definitions + their exact proxy columns** → **F9 `activation-and-love-definition.md`** (cited throughout).
- **Composite weights + normalization** → **SOP-METRICS-007**.
- **Sean-Ellis survey mechanics** → **SOP-METRICS-004** / SOP-CUSTOMER-018.
- **Cohort-retention windowing** → **SOP-METRICS-005**.
- **Dashboard layout (the 5 tiles)** → **SOP-METRICS-008**.
- **Channel CAC/LTV attribution** → `03-gtm` SOP-GTM-009 / SOP-METRICS-018.

---

## 9. Cross-references

- `00-core/north-star.md` — **the canonical apex.** This tree operationalizes its §1.0 three-layer model into a four-perspective scorecard; never contradict §1.1/§1.2/§1.3/§2.
- `10-metrics/strategy/activation-and-love-definition.md` (**F9**, sibling) — the two definitions + Door-2 proxies for the ★ Process/Customer nodes. **Read together.**
- `00-core/icp-summary.md` — the WHO whose behavior these metrics measure (the deadline-bearing STEM/ML masterer; the free→paid money-moment; R1 payability-unproven; R2 NotebookLM).
- `00-core/product.md` §7 (the activation event), §4 (mastery = core value), §12 (N=10 gate).
- `knowledge/kpi-ownership.yaml` — the owner-map for every node id above.
- `knowledge/kpi-registry.yaml` — the wired registry the §6 gap refers to (where the ★ nodes must land).
- `knowledge/analytics-sync-contract.yaml` — what Door-2 exposes (the 30 `live.*` tables; the empty-activity reality).
- `10-metrics/pmf-instrumentation/SOP-METRICS-007` — builds the composite tile (the apex).
- `10-metrics/dashboards/SOP-METRICS-008` — renders the tile + 4 supporting tiles.

---

## 10. Versioning

| Version | Date | Changes |
|---|---|---|
| v1.0-draft | 2026-06-07 | Foundation. Authored as F10 of the 11-way commercial-strategy fan-out. Establishes the four-perspective cause-effect tree (Balanced Scorecard, Kaplan-Norton 1992) mapped onto `north-star.md`'s three-layer model; per-node owner + Door-2 source + INSTRUMENTED/MAPPED-ONLY/PROXY flag; the composite roll-up; the leading/lagging action rule; and the central **§6 gap finding** (the wired KPI registry is 100% internal-ops, 0% product/love — the hole the love-block fills). Door-2 counts observed 2026-06-07. Activation/love definitions deferred to F9. |
