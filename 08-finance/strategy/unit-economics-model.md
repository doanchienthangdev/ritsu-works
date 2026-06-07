---
title: "Ritsu Unit Economics Model — The Money Math Behind \"100 Paying Who Love\""
type: strategy-doc
pillar: 08-finance
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Phase-1 — Unit-Economics Model (NPV/CAC/LTV)"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/product.md
  - 00-core/positioning.md
  - 00-core/icp-summary.md
  - 00-core/north-star.md
  - 01-marketing/icp/persona-portrait.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-ownership.yaml
  - knowledge/kpi-registry.yaml
  - knowledge/economic-architecture.md
  - wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/npv-irr-payback-model.md
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **The foundational unit-economics truth for Ritsu's first-100-paying push.** This is the per-customer money math — ARPU, contribution margin, CAC, LTV, LTV:CAC, payback — that every downstream finance SOP, the paid-acquisition harness (`03-gtm`), the pricing-pull-test (SOP-PRODUCT-010), and the north-star "100 paying who love" arithmetic (`00-core/north-star.md`) reference without re-deriving.
>
> **Built on the Domont NPV/IRR/Payback discipline** (`wiki/consulting-toolkits/sales-marketing-pricing-communication/concepts/npv-irr-payback-model.md`): *use all three lenses (value created / return rate / time-to-recover), never one; always run conservative + base + optimistic; vary the top 2-3 assumptions ±20%.* Adapted to a B2C-PLG-solo+AI context where the "capex" is near-zero and the real investment is **CAC**, the real return is **retained contribution margin**, and the real risk is that **retention and willingness-to-pay are both UNPROVEN at true-zero**.
>
> **Honesty contract (true-zero):** Every number is tagged. **[OBS]** = observed in Door-2 pseudonymized analytics (the firewall-safe product-data path; 25 profiles all founder/test, 18 with AI usage, 2 founder-test payments). **[INF]** = inferred from a verified input (live pricing, published CPI benchmarks, observed cost-per-token). **[HYP]** = hypothesis to be tested in the N=10 watch (SOP-PRODUCT-002) or the pricing-pull-test (SOP-PRODUCT-010). **The two load-bearing unknowns — retention months and free→paid conversion — are [HYP]. Read this model as a *structure with calibrated assumptions*, not a forecast.**

---

## 1. The one-paragraph answer

At Ritsu's **verified live prices** (Free $0 / Plus $29 / Pro $59 / Ultra $119 per month, credit-based, annual −17% — `product.md` §10, ritsu.ai/pricing), the **contribution margin per paying user is structurally excellent: ~85-98%** [INF/OBS] — because the dominant variable cost, LLM inference, runs through a cheap default model (Gemini 3 Flash) at an **observed $0.148 per AI-usage session (a session with ≥1 LLM call; ≈163 of 656 sessions)** [OBS], so even a heavy masterer doing 30 sessions/month costs ~$4.43 in infra against a $29 floor. **The entire unit-economics risk is therefore NOT cost — it is the two revenue-side unknowns: do they convert, and do they retain?** Those two numbers are [HYP] at true-zero. The model's load-bearing conclusion: **organic / creator-led / share-loop acquisition (≈$0 cash CAC) is unconditionally profitable; paid acquisition is conditionally profitable and FAILS the north-star "CAC payback < 90 days" guardrail at the realistic 2% paid-yield** unless conversion or retention beat the base case — which is exactly why the 60-day plan gates the paid engine behind the free engines.

---

## 2. The Domont three-lens frame, translated to Ritsu

The NPV/IRR/Payback model asks three questions; in a subscription PLG business each maps to a per-customer metric:

| Domont lens | Corporate question | Ritsu per-customer translation | This doc's section |
|---|---|---|---|
| **NPV** ("how much value created?") | Is the project value-positive at the hurdle rate? | **LTV − CAC** (contribution lifetime value net of acquisition cost) | §7, §8 |
| **IRR** ("what return rate?") | Beat the WACC + risk premium? | **LTV:CAC ratio** (the efficiency of each acquisition dollar) | §8 |
| **Payback** ("when do we recover?") | Liquidity & risk | **CAC payback period** (months of contribution to recover CAC) | §8 |

**Why all three, not one (the Domont pitfall):** LTV:CAC alone can look healthy (e.g. 3:1) while payback is 11 months — fatal for a pre-revenue solo founder with no runway buffer. Conversely a sub-1 payback can hide a thin LTV:CAC if churn is brutal. **Ritsu's binding constraint is payback** (cash-survival), with the north-star guardrail **CAC payback < 90 days** (`north-star.md` §2). We evaluate every channel on all three.

**The capex adaptation:** Domont's "Year-0 capex" is a built thing (AWS servers). Ritsu's product is already built and the AI-Native cost curve is falling (`knowledge/economic-architecture.md`: `ai_ops_cost_as_pct_of_mrr` target <5%). So **there is no meaningful upfront capex line — the investment IS the per-customer CAC**, spent continuously. This is why we model unit economics, not a capex NPV. (The one genuine capex-like decision — *spend on a paid channel or not* — is itself a unit-economics gate, §8.)

---

## 3. ARPU — average revenue per paying user

### 3.1 The price ladder (verified)

Per `product.md` §10 (verified ritsu.ai/pricing 2026-05-29; **dynamic + experimental pre-PMF — always re-fetch**):

| Tier | $/mo | Credits/mo | Per-source limit | The hard wall that triggers upgrade |
|---|---|---|---|---|
| **Free** | $0 | 600 | 40 pages / 30 min video / 5 sessions/project | First dense PDF (>40pp) OR 6th session in a project |
| **Plus** *(most popular)* | $29 | 12,000 | 100 pages / 2h video / 20 sessions | The masterer's daily driver |
| **Pro** *(best value)* | $59 | 25,000 | 200 pages / 6h video / unlimited sessions | Multi-course / unlimited-session masterer |
| **Ultra** | $119 | 55,000 | 500 pages / 12h video | Power / professional |

Annual billing = **−17%** (≈ Plus $24.07/mo-equivalent, Pro $48.97, Ultra $98.77). Extra credit packs purchasable and **never expire** — a small additive revenue line, ignored in the base model (conservative).

### 3.2 Blended ARPU — three scenarios (Domont conservative / base / optimistic)

Tier mix is **[HYP]** at true-zero (zero real paying customers to observe a mix). We model three:

| Scenario | Tier mix (Plus/Pro/Ultra) | Blended ARPU/mo | Annual-adjusted (~−17% on annual takers) |
|---|---|---|---|
| **Conservative** (Plus-heavy, price-sensitive ICP) | 70 / 25 / 5 | **$41.00** | ~$37-39 |
| **Base** | 60 / 30 / 10 | **$47.00** | ~$42-44 |
| **Optimistic** (Pro/Ultra skew — serious masterers, multi-course) | 40 / 40 / 20 | **$59.00** | ~$53-55 |

> **ICP-grounded prior:** `icp-summary.md` §5 calls the wedge "price-sensitive" with a US WTP anchor of "$15-25/mo" *as the felt-pain bar* — yet the **live floor is $29 (Plus)**. This gap is the single most important pricing-pull-test question: **is the price ABOVE the felt WTP?** If yes, conversion suffers (it does not change ARPU-per-payer, but it crushes the free→paid rate in §6 and therefore CAC in §8). The base case assumes the $29 floor holds for the deadline-gated payer ("$29 is trivial vs the cost of failing" — `icp-summary.md` §4); the conservative case is the hedge. **This is [HYP] until SOP-PRODUCT-010.**

**Base ARPU used downstream: $47/mo.** (When in doubt for a survival decision, use the **conservative $41**.)

---

## 4. Variable cost per active user — the contribution-margin engine

This is the section where Ritsu's economics are decisively de-risked by **observed** data, and where this model adds the most value over a textbook estimate.

### 4.1 The credit→USD conversion (validated)

**1 credit = exactly $0.001 USD** [OBS]. Validated against `live.resource_providers`: Mistral OCR bills `$0.002/page = 2.0 credits/page`; CloudConvert `$0.018/job = 18 credits`; Supadata video `$0.010 = 10 credits`; R2 storage `$0.000015/MB = 0.015 credits`. **The credit system IS the cost-pass-through meter** — credits are priced at raw vendor cost. This means **each tier's credit budget is a hard ceiling on that tier's variable cost** (§4.4).

### 4.2 The dominant cost: LLM inference (observed)

From `live.ai_usage_logs` (the firewall-safe product cost ledger; **all founder/test traffic, but real product behavior**):

| Observed metric | Value | [tag] |
|---|---|---|
| Total LLM calls | 1,588 | [OBS] |
| Distinct users with AI usage | 18 | [OBS] |
| Distinct sessions | 163 | [OBS] |
| **Total estimated LLM cost** | **$24.07** | [OBS] |
| Avg tokens/call | 14,433 | [OBS] |
| **Cost per session** | **$0.1477** | [OBS] |
| Cost per user (lifetime, test period) | $1.337 | [OBS] |
| Median user lifetime cost | $0.093 | [OBS] |
| **Heaviest user (852 calls / 104 sessions — the power masterer)** | **$14.70 lifetime** | [OBS] |

**Critical observed fact: 100% of LLM traffic routed through one cheap model — Gemini 3 Flash Preview ($0.50 input / $3.00 output per 1M tokens** — `live.ai_models`).** The product is NOT defaulting to a premium model (Claude Sonnet at $3/$15 sits in the catalog as a ceiling option, not the default). **This is the structural reason the margin is ~95%+, and it is a deliberate AI-Native cost-routing choice — the single most important assumption to protect.** (Mitigated downside risk: if the product re-routes the default to a premium model, per-session cost could rise 3-5×; the contribution math in §4.3 would shift but stay positive — see §9 sensitivity.)

### 4.3 Contribution margin per paying tier (the core table)

Variable cost/active-user/month = (sessions/mo) × $0.148 + small extraction overhead. Modeling three usage intensities of the masterer:

| Usage profile | Infra cost/mo | **Plus $29 CM** | **Pro $59 CM** | **Ultra $119 CM** |
|---|---|---|---|---|
| **Light** (8 sessions/mo ≈ 2/wk) | ~$1.18 | **$27.82 (96%)** | $57.82 (98%) | $117.82 (99%) |
| **Typical** (15 sessions/mo) | ~$2.22 | **$26.78 (92%)** | $56.78 (96%) | $116.78 (98%) |
30 × $0.148 = $4.44 (doc rounds to $4.43). Trivial rounding; CM and % unaffected. **$24.57 (85%)** | $54.57 (92%) | $114.57 (96%) |

**Add extraction overhead** (OCR/transcript/render, charged at vendor cost via credits — typically $0.20-1.50/source for a dense PDF or long video). Even loading 10 dense sources/month adds ~$2-15 of credit-metered cost, which the **credit budget caps** (§4.4). The base contribution margin used downstream is **~92%** (typical-usage Plus/Pro blend).

> **The honest framing (Domont "conservative case"):** the cost numbers are [OBS] but from **founder/test usage** — a real paying cohort of deadline-stressed masterers may run *heavier* (more sessions in exam weeks). The **heavy-power row ($14.70 lifetime for the most extreme observed user across the whole test period) is the realistic ceiling**, and even it lands at **85% CM on Plus**. Contribution margin is **not** the risk.

### 4.4 The worst-case backstop — the credit cap

Because credits = cost pass-through, **the maximum possible variable cost per tier is its credit budget consumed 100%:**

| Tier | Credits | Max infra if 100% burned | **Worst-case CM** |
|---|---|---|---|
| Plus $29 | 12,000 | $12.00 | **$17.00 (59%)** |
| Pro $59 | 25,000 | $25.00 | **$34.00 (58%)** |
| Ultra $119 | 55,000 | $55.00 | **$64.00 (54%)** |

**Even a user who burns every credit yields ~55-59% contribution margin.** The credit system is a **built-in margin floor** — there is no scenario (short of a model-routing regression) where a paying user is gross-negative. **This is the structural protection the freemium-credit model buys.** (Free tier worst case = −$0.60/user if 600 credits fully burned — the intended, capped loss-leader cost; §5.)

---

## 5. The free tier — loss-leader cost, not a margin line

Free is a **deliberate customer-acquisition cost**, not a product (`product.md` §10: "free = the loss-leader on-ramp"). Its unit economics:

- **Max cost per free user = $0.60/mo** (600 credits, fully burned) [INF]. **Observed median free-user lifetime cost = $0.093** [OBS] — most free users barely touch the budget.
- **This $0.60 cap is the true "CAC" of an organic free signup** — and it is the cheapest acquisition mechanism Ritsu has. A free user who never converts costs **at most $0.60, observed ~$0.09**.
- **Strategic implication:** Ritsu can afford a **very wide free funnel** because the downside per free user is sub-dollar and capped. The free tier's job is to manufacture the <60s magic moment (`product.md` §7) → activation → the share-loop (the [OBS] mechanism: 15 share-links generated, all founder so far) → organic acquisition. **The free tier IS the primary acquisition engine, and it costs ~$0.09-0.60/head.**

> **Counter-risk (the freemium trap):** if free is *too generous*, the masterer never hits the wall → never converts. The wall positions matter: Free = **40 pages / 5 sessions per project**. A real dense STEM course (one cs231n lecture PDF can exceed 40pp; mastery needs >5 sessions) hits both walls fast — **by design, the wall lands inside the wedge's core job.** Whether the wall is positioned right is a **[HYP] for SOP-PRODUCT-011 (tier-boundary experiment)**: too tight = rage-churn to free NotebookLM (R2); too loose = no conversion (R1). The money-moment depends entirely on this calibration.

---

## 6. The money-moment — free→paid conversion (the [HYP] that decides everything)

The **money-moment** (per the brief + `icp-summary.md` §4): the masterer hits the **first hard limit (the 40-page wall or the 6th-session wall) mid-dense-PDF with a live graded deadline** → upgrades to Plus. This is **THE single load-bearing unknown** (R1, "do they pay at the first hard limit?"; persona-portrait ★18, ★ Act-trigger row 4).

**Free→paid conversion rate — [HYP], modeled at three values:**

| Scenario | Free→paid | Basis |
|---|---|---|
| **Conservative** | 3% | Below typical PLG freemium (2-5%); hedge for "price > felt WTP" + free-NotebookLM substitution |
| **Base** | 5% | The north-star target (`north-star.md` §1.3, `free_to_plus_conversion` ≥5% rolling 30d); top-of-typical-PLG |
| **Optimistic** | 8% | Deadline-gated urgency + tight free walls converting the committed masterer |

**Observed at true-zero: 0% real conversion (0 real paying; 2 founder-test).** This rate is **pure hypothesis** and is the #1 thing the N=10 watch (SOP-PRODUCT-002) and the first paying cohort must settle. **Every CAC and LTV:CAC number in §8 is downstream of this single rate — a 3% vs 8% swing changes paid CAC by ~2.7×.**

---

## 7. LTV — lifetime value per paying customer

**LTV = ARPU × contribution-margin% × expected retention (months).** Per Domont, value in **contribution** terms (not gross revenue) — only the margin recovers CAC.

**Expected retention months — [HYP].** Retention is **unobserved** (0 paying customers retained). Critically, the wedge is **deadline-gated**: the persona-portrait (★8 motivation, ★26 avatar-split) warns of an **episodic-churn risk** — a one-shot exam-crammer churns post-exam (months ≈ 1-2), while the **deadline-bearing committed masterer** retains across a multi-week course and into the next course (the paying-core thesis; `icp-summary.md` §0). The whole north-star bet is that we acquire the *masterer*, not the *crammer*. **Decision frequency** is term-gated (~2-4 re-eval points/yr; persona row 8), so realistic retention clusters at **3 / 6 / 9 / 12 months**:

| Retention (mo) | LTV (revenue, $47 ARPU) | **LTV (contribution @92%)** |
|---|---|---|
| **3** (crammer-risk floor) | $141 | **$130** |
| **6** (base-case masterer) | $282 | **$259** |
| **9** | $423 | **$389** |
| **12** (loved retained masterer) | $564 | **$519** |

**Base-case LTV (contribution): ~$259** (6-month retention × $47 ARPU × 92% CM). **Conservative floor: ~$113** (3 months × $41 ARPU × 92%). **The retention assumption is the largest single swing in the model** — it ranges 4× from floor to optimistic.

> **The mechanism that lifts retention** (so the model isn't passive): the **mastery moment + the multi-week PATH + concept-level Knowledge Map** (the PODs free NotebookLM lacks — R2). If Ritsu only delivers "quizzes," retention collapses to crammer-floor (~3mo) and LTV halves. **Retention is a product-quality KPI, not a finance assumption** — owned by `customer-lead` (`day_30_retention` / `paid_retention_week_4`, north-star §1.3). Finance's job is to flag that **every month of retention added ≈ +$43 contribution LTV.**

---

## 8. CAC, LTV:CAC, and payback — by channel (the decision section)

### 8.1 CAC by channel

**Organic / creator-spine / product share-loop — ≈ $0 cash CAC** [INF]:
- The 60-day plan's primary engines (creator-spine, AI-avatar content factory, product share-loop) are **content/time cost, not media-buy cost**. The marginal cash CAC of an organic signup ≈ the free-tier serving cost: **$0.09-0.60** (§5).
- Creator endorsements (the 628-source scored channel map; persona-portrait S9-A) are **managed placements / sponsorships** — these have cash cost, but the high-purity targeting (Justin Sung, StatQuest, Karpathy fit-score 92-99) means low cost-per-*qualified*-signup; treat as a **low-mid-cost channel between organic and paid**, to be measured per SOP-GTM-009 (first-touch attribution).

**Paid acquisition (the paid-message-fit engine) — published US benchmarks** [INF]:
- **CPI (cost per install/signup) ≈ $2.50-5.28** (US mobile/web, the brief's range).
- **Cost per *activated* signup = CPI ÷ activation rate.** At the north-star **40% activation** target: **$6.25-$13.20 per activated user.** At a pessimistic 25%: $10-21. At 10%: $25-53.
- **Cost per *paying* customer (the real CAC) = CPI ÷ (activation × free→paid):**

| Activation | Free→paid | Paid yield | **Paid CAC per paying user** |
|---|---|---|---|
| 40% | 8% (optimistic) | 3.2% | **$78 - $165** |
| 40% | 5% (base) | 2.0% | **$125 - $264** |
| 40% | 3% (conservative) | 1.2% | **$208 - $440** |

### 8.2 The three-lens verdict (Domont: NPV / IRR / Payback)

Using base LTV(contribution) = $259 (6-mo retention):

| Channel | CAC | LTV:CAC (IRR-lens) | Payback (cash-lens) | NPV-lens (LTV−CAC) | **Verdict vs north-star guardrail (payback <90d / <3mo)** |
|---|---|---|---|---|---|
| **Organic / share-loop** | ~$0.60 | **~430:1** | **~0.0 mo** | +$258 | ✅ **Unconditionally healthy** |
| **Creator / sponsorship** | ~$10-40 (est.) | ~6-26:1 | ~0.2-0.9 mo | +$219-249 | ✅ **Healthy** (measure & double down) |
| **Paid — optimistic** ($78) | $78 | 3.3:1 | **1.8 mo** | +$181 | ✅ **Passes** |
| **Paid — base** ($150) | $150 | **1.7:1** | **3.5 mo** | +$109 | ⚠️ **FAILS the <90-day guardrail** at 6-mo retention; needs ~7-mo retention to clear |
| **Paid — conservative** ($300) | $300 | **0.9:1** | 7+ mo | **−$41** | ❌ **Value-destructive** — do not run |

> **THE load-bearing finding for the paid-harness:** **Paid acquisition only clears the north-star "CAC payback < 90 days" guardrail in the optimistic case** (≥8% free→paid AND 40% activation). At the **base 2% paid-yield, paid CAC ($125-264) makes payback ~3.5+ months and LTV:CAC ~1.7:1 — below the healthy 3:1 floor.** This is not a reason to never run paid — it is the reason the **60-day plan correctly gates the paid-message-fit engine** behind (a) proven N=10 activation ≥40% and (b) a measured free→paid rate. **Paid is a *scaling* lever to switch on only after the free/organic engines prove the conversion + retention assumptions — not a cold-start acquisition channel.** Running paid before those are proven risks buying users at a loss to hit a vanity "100" (explicitly forbidden — `north-star.md` §2 counter-metric).

### 8.3 The guardrails (from north-star §2, now quantified)

| Guardrail | Threshold | Unit-economics meaning |
|---|---|---|
| CAC payback | **< 90 days (<3 mo)** | Binds the paid engine: at base ARPU×CM ($43/mo contribution), **max sustainable blended CAC ≈ $130** |
| Refund rate (first 30d) | **< 5%** | Refunds reverse the charge → effective ARPU haircut; >5% signals "paying ≠ loving" |
| Catastrophic incidents | **0** | A hallucinated quiz (the #1 SERVQUAL bar, `product.md` §6.7) breaks the brand → infinite CAC |

**Derived rule for the paid-harness:** *blended paid CAC must stay below $130 (= 3 months × $43 contribution/mo).* At observed benchmarks this requires **paid yield ≥ ~2.5-4%** — i.e. paid is only economic once free→paid is proven ≥5%.

---

## 9. Sensitivity analysis (Domont mandate: vary the top assumptions ±20%+)

The model has **three** dominant levers; ranked by impact on the base-case go/no-go:

| Lever | Base | −range | +range | Impact on the decision |
|---|---|---|---|---|
| **1. Free→paid conversion** [HYP] | 5% | 3% → CAC ×1.7, paid dies | 8% → CAC ×0.6, paid passes | **HIGHEST** — single-handedly flips paid from ❌ to ✅. The #1 thing to measure. |
| **2. Retention months** [HYP] | 6 | 3 → LTV halves ($130), paid base fails | 12 → LTV doubles ($519), paid base passes | **HIGH** — every +1 month ≈ +$43 LTV. Product-quality driven. |
| **3. Default model cost** [OBS, protect-able] | $0.148/sess (Gemini Flash) | — | premium re-route ×3-5 → $0.44-0.74/sess | **LOW on margin** (heavy user still 70-85% CM) but watch: a default-model regression silently erodes the floor. |
| 4. Blended ARPU (tier mix) | $47 | $41 (Plus-heavy) | $59 (Pro-heavy) | MODERATE — moves LTV ±25%; conservative still healthy organic. |
| 5. Activation rate | 40% | 25% → paid CAC ×1.6 | — | MODERATE — compounds with lever 1 into paid yield. |

**The sensitivity verdict:** the **margin (cost side) is robust across all scenarios** — Ritsu cannot be made gross-negative short of a model-routing failure. **The entire go/no-go variance lives in two revenue-side [HYP] levers (conversion × retention)**, both of which the N=10 watch + first paying cohort exist to measure. **This is the cleanest possible risk profile for a pre-PMF company: the unknowns are demand unknowns, not cost unknowns.**

---

## 10. The "100 paying who love" contribution math

Tying the model to the north-star milestone (`north-star.md` §1.1):

- **100 paying × $47 base ARPU = $4,700 MRR = ~$56,400 ARR** (conservative $41 → $4,100 MRR / $49,200 ARR; optimistic $59 → $5,900 MRR / $70,800 ARR).
- **Monthly contribution @92% ≈ $4,300** against **AI infra for 100 active users ≈ $220-440/mo** (100 × $2.20-4.40 typical/heavy). Plus fixed AI-ops/workforce cost (the `ritsu-works` side, separate budget). **The 100-paying milestone is contribution-positive on variable cost from roughly the first dozen paying customers.**
- **What it costs to ACQUIRE the 100** is the real question, and it depends entirely on channel mix:
  - **All-organic (the plan's intent): ~$60 total cash** (100 × $0.60 free-serving). Effectively free.
  - **Half-organic, half-creator (~$25 blended): ~$1,300.**
  - **Any paid before conversion is proven: $12,500-26,400** to buy 100 at base paid CAC — **avoid; this is the failure mode the guardrails forbid.**

**The decision this forces:** the path to the first 100 is an **organic + creator + share-loop path, not a paid path.** Paid is the lever for 100→1,000 *after* the unit economics are observed, not assumed. The finance model **endorses the 60-day plan's engine sequencing on pure economics.**

---

## 11. NPV/IRR note (why a formal DCF is deferred, honestly)

The Domont framework's headline outputs (NPV at WACC, IRR vs hurdle, multi-year payback) are **deliberately not computed here**, and the reason is itself a finding:

- **A multi-year DCF requires a retention curve and a conversion rate** — both [HYP] at true-zero. Computing an NPV on invented inputs would be **false precision** (the Domont pitfall #1: single-scenario models without honest sensitivity). The Amazon-AWS example in the framework worked because adoption *ranges* were defensible; ours are not yet.
- **The honest substitute** is the **per-customer three-lens table (§8.2)** + the **sensitivity (§9)** — which is the unit-economics analog a pre-revenue B2C company should run. **Formal NPV/IRR graduates from this stub when the N=10 watch produces a real activation rate and the first paying cohort produces a real ~30-90-day retention point** (the SOP-CUSTOMER-006 Collison-install data). At that point: build the 3-year cohort model, discount at a founder-set hurdle (recommend 25-35% — venture-risk-appropriate per Domont "WACC + risk premium for uncertain strategic bets"), and re-run.
- **Trigger to upgrade this doc:** first 30 paying observed (replace [HYP] retention/conversion with [OBS]) → §7 and §8 become forecasts, not scenarios → add formal NPV/IRR/payback per the framework template.

---

## 12. What this foundation hands downstream

| Downstream consumer | What it takes from here |
|---|---|
| **Paid-acquisition harness** (`03-gtm`, SOP-GTM-009 attribution) | The **max-CAC rule ($130 blended)**, the paid-yield gate (free→paid ≥5% before any spend), the per-channel verdict table (§8.2) |
| **SOP-PRODUCT-010 pricing-pull-test** | The **$29-floor-vs-$15-25-felt-WTP gap** (§3.2) as the #1 question; the credit-cap margin floor (§4.4) as the room to discount |
| **SOP-PRODUCT-011 tier-boundary experiment** | The **money-moment wall calibration** (§5-6): 40pp / 5-session walls as the conversion trigger to A/B |
| **`north-star.md` "100 paying" math** | The **contribution arithmetic** (§10): 100 = ~$4,700 MRR, ~$4,300/mo contribution, acquirable for ~$60 organic |
| **`metrics` pillar** (`kpi-ownership.yaml`) | Confirms `free_to_plus_conversion`, `day_30_retention`/`paid_retention_week_4`, `ai_ops_cost_as_pct_of_mrr` as the **load-bearing unit-economics KPIs** to instrument first |
| **`08-finance` SOPs** (runway, MRR-growth) | ARPU scenarios (§3), contribution-margin table (§4.3), the deferred-DCF trigger (§11) |

---

## 13. The five things to remember

1. **Cost is solved; demand is the risk.** Contribution margin is 85-98% [OBS-grounded] and structurally capped at ≥54% by the credit system. Nothing in the cost structure can sink Ritsu.
2. **The two unknowns are conversion and retention** — both [HYP], both measured by the N=10 watch + first paying cohort, both swing the model 2-4×.
3. **Organic/creator/share-loop is unconditionally profitable (~$0.60 CAC); paid is conditionally profitable and fails the 90-day-payback guardrail at base yields** — so the first 100 is an organic path, exactly as the 60-day plan sequences it.
4. **Every paying customer is contribution-positive from session one** (the credit budget is a cost-pass-through meter), so the freemium model is safe to run wide.
5. **No formal NPV until real retention data exists** — false precision is the Domont pitfall; the per-customer three-lens table + sensitivity is the honest substitute at true-zero.

---

*This is a foundation, not a forecast. Every [HYP] tag is a falsifiable bet the company is about to test with real money. When the N=10 watch and the first 30 paying replace the hypotheses with observed numbers, this stub graduates into a formal cohort DCF — and the question flips from "are the economics viable?" (yes, structurally) to "how fast can we acquire the masterer who retains?"*
