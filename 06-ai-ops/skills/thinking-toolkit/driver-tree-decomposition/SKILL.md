---
name: thinking-toolkit/driver-tree-decomposition
description: |
  Use to decompose any target metric (KPI, business outcome, cost driver)
  into a tree of upstream actionable drivers. Each leaf is a driver you
  can directly influence; each internal node is a composition of children.
  Reveals "where is the actual lever?" for any metric drift, growth goal,
  or cost optimization.

  Trigger conditions: 10-metrics pillar (KPI registry decomposition);
  /cgo funnel analysis; cost-optimization-review weekly skill; root-cause
  analysis on KPI drift; growth target planning ("how do we get to X
  MRR?"); /update phase analyzing entity-level drivers of skill quality.

  Skip when: single-driver metrics (count of X = directly observable);
  qualitative outcomes without measurable upstream factors; metrics whose
  drivers are opaque (3rd-party platform metrics).

  Cost: zero LLM (rules + arithmetic). ~10-15 min per metric. Catches
  intervention points typically missed when staring at the top-line KPI.
allowed-tools: []
disable-model-invocation: false
---

# Driver Tree Decomposition

> A metric is the wrong place to intervene. The drivers are. A driver tree shows where the lever is.

The driver tree (also called value tree, KPI tree, or formula tree) is McKinsey's standard for decomposing any business metric into its upstream constituent drivers. The premise: you can't move MRR by "trying to move MRR". You move users-acquired, conversion-rate, ARPPU, churn-rate — and they compose to MRR via known math.

Ritsu-works needs this discipline because the KPI registry has 80+ KPIs but driver chains are implicit. When a KPI drifts, there's no formal trace from the symptom (top-line) to the cause (actionable upstream driver). Driver tree fixes that.

## When to use

**Mandatory:**
- 10-metrics pillar work — every top-level KPI should have a driver tree before alerts fire
- Cost-optimization-review weekly skill — decompose total cost into per-bucket per-task-kind drivers
- Root-cause analysis on KPI drift — driver tree is the systematic search

**Recommended:**
- Growth planning ("How do we get to 100 paying users?")
- /cgo funnel analysis (each funnel stage = a driver of the next)
- /update phase analyzing why a skill is degrading (skill-quality has driver chains)
- Capacity planning (founder hours / agent costs / cron schedule density)

## When NOT to use

**Skip for:**
- Single-driver metrics (e.g., "count of active capabilities" — directly counted, no decomposition)
- Qualitative outcomes (e.g., "user happiness" — driver tree needs measurable nodes)
- Metrics where upstream drivers are opaque (e.g., third-party platform metrics where you can't see internals)
- Trivia metrics (effort > value)

**Anti-pattern: building a driver tree for a metric you can't change.** Some metrics are observation-only (e.g., "share of voice in industry conversations"). Driver tree for these = decoration. Use for metrics where you control or influence drivers.

## How to apply

### Step 1 — Identify the target metric

State the metric, its current value, and target (if drift-driven, the gap).

Example: "MRR is $12K; target is $50K by 2026-12-31; gap is $38K."

### Step 2 — Find the top-level decomposition

Most business metrics have a canonical top-level decomposition. Common patterns:

| Metric | Top-level decomposition |
|---|---|
| MRR | paying_users × ARPPU |
| Revenue | users × conversion_rate × ARPPU |
| Total cost | sum(per-cost-bucket cost) |
| LTV | ARPPU / monthly_churn_rate |
| CAC | marketing_spend / new_paying_users |
| Conversion rate | activated_users / signups |
| Activation rate | aha_moment_users / signups |
| NPS | promoters_pct − detractors_pct |
| Cost per agent run | tokens × $/token + tool_invocations × $/tool_call |

If your metric isn't standard, decompose by either:
- **Multiplicative** (X = A × B × C — common for rates, ratios)
- **Additive** (X = A + B + C — common for sums, totals)
- **Sequential** (X = A → B → C — common for funnels, where each step "filters" the previous)

### Step 3 — Recursively decompose each driver

For each child driver, repeat Step 2 until you reach **actionable leaves**.

A leaf is actionable when:
- You can directly influence it (run an experiment, change a config, ship a feature)
- It's measurable (you have an instrument)
- It's the right level of abstraction (not too granular)

Stop decomposing when the leaves are actionable. Going deeper = useless complexity.

Example for MRR:

```
MRR
├── paying_users
│   ├── new_paying_users / month
│   │   ├── signups / month
│   │   │   ├── organic_signups (SEO, referrals)
│   │   │   ├── paid_signups (ads, sponsorships)
│   │   │   └── partner_signups
│   │   └── free_to_paid_conversion_rate
│   │       ├── activation_rate
│   │       │   ├── aha_moment_completion
│   │       │   └── time_to_first_value
│   │       └── upgrade_offer_acceptance
│   │           ├── pricing_perception
│   │           └── value_perception
│   ├── churned_paying_users / month
│   │   ├── voluntary_churn (cancellations)
│   │   └── involuntary_churn (payment fails)
│   └── prior_period_paying_users (carry-over)
└── ARPPU
    ├── tier_distribution (% on plus/pro/ultra)
    │   ├── plus_to_pro_upgrade_rate
    │   └── pro_to_ultra_upgrade_rate
    └── effective_price_per_tier
        ├── list_price_per_tier
        └── discount_rate
```

### Step 4 — Mark MECE at each level

At each level of decomposition, the children must be MECE relative to the parent. Apply `mece-decomposition-check`:

- Are children orthogonal? (M)
- Do children collectively cover the parent? (C)

For MRR = paying_users × ARPPU: M ✓ (they're orthogonal multiplicands), C ✓ (definitional — MRR has only these two dimensions).

For new_paying_users = signups × free_to_paid_conversion: M ✓ (orthogonal), C ✓ (definitional flow).

### Step 5 — Identify intervention points

A driver tree's value is in surfacing where YOU CAN ACT. Mark each leaf as:

- 🔴 **Hard to influence** (e.g., "macro economic conditions affecting purchase intent")
- 🟡 **Indirect influence** (e.g., "brand awareness — influenced by months of content")
- 🟢 **Direct influence** (e.g., "free-tier daily quota — change config, ships tomorrow")

The intervention points are 🟢 leaves. Rank by leverage (which lever, if pulled, moves the most upstream value?).

### Step 6 — Recommendation falls out

Top-line: "To close the $X gap on MRR, focus on these N drivers (ranked by leverage)..."

Each recommended driver gets a 🟢 mark. Use `pyramid-principle-output` to structure.

## Worked examples

### Example 1 — GOOD (cost-optimization driver tree)

**Target metric:** Monthly LLM cost. Current: $180/mo. Target: $120/mo (gap: $60/mo).

**Driver tree:**

```
Monthly LLM cost ($180)
├── Per-skill cost breakdown (additive)
│   ├── wiki-sync/distill ($65/mo) 🟢
│   │   ├── per-call cost ($0.15)
│   │   │   ├── input tokens (avg 4K) 🟢 — chunk smaller
│   │   │   └── output tokens (avg 1K) 🟢 — tighter prompt
│   │   └── calls per month (~430)
│   │       ├── new sources synced 🟡 — depends on ingestion velocity
│   │       └── re-distill on update 🟢 — add idempotency check
│   ├── /evolve runs ($40/mo) 🟢
│   │   ├── iterations per run (8) 🟢 — early-stop ratchet
│   │   └── cost per iteration ($5)
│   ├── /update runs ($25/mo) 🟡 — driven by founder cadence
│   ├── morning-brief assembly ($15/mo) 🟢 — cache yesterday's brief
│   ├── all other skills ($35/mo) 🟢 — long tail; optimize top 3 only
```

**Intervention ranking (highest leverage first):**

1. **wiki-sync/distill output token reduction** (save ~$15/mo by tightening prompt) — 🟢
2. **wiki-sync/distill chunk-size optimization** (save ~$10/mo) — 🟢
3. **/evolve early-stop ratchet** (save ~$10/mo by skipping iterations after plateau) — 🟢
4. **morning-brief caching** (save ~$10/mo) — 🟢

Total addressable: ~$45/mo. Closes 75% of the gap. Remaining $15 via long-tail optimization or accepted as variance.

**Top-line:** "Hit $60/mo cost reduction by focusing on 4 drivers in 2 skills. wiki-sync/distill is 60% of total leverage."

### Example 2 — ANTI-PATTERN (decomposition that doesn't reach actionable leaves)

**Target metric:** User satisfaction.

**Driver tree:**
```
User satisfaction
├── Product quality
│   ├── Features
│   └── Reliability
└── Customer service
    ├── Response time
    └── Helpfulness
```

**Why this fails:**
- "Product quality" — not measurable as-is
- "Features" — not actionable (which feature?)
- "Helpfulness" — qualitative, no instrument
- No 🟢/🟡/🔴 marks possible

The tree decomposed terms, but didn't reach actionable measurable leaves. Either go deeper until leaves are actionable, OR abandon driver tree (the metric "user satisfaction" doesn't admit driver-tree treatment — use NPS components or specific behaviors instead).

**Fix:** Replace target with NPS:

```
NPS
├── % promoters (9-10 scores)
│   ├── aha_moment_completion_rate 🟢
│   ├── time_to_first_value 🟢
│   ├── 30-day_retention_rate 🟢
│   └── feature_X_usage (specific) 🟢
├── % passives (7-8 scores)
└── % detractors (0-6 scores)
    ├── support_ticket_unresolved_rate 🟢
    ├── product_bug_encounter_rate 🟢
    └── churn_intent_signals 🟢
```

Now leaves are measurable and actionable.

### Example 3 — EDGE CASE (sequential funnel decomposition)

**Target metric:** Free-to-paid conversion rate. Current: 8%. Target: 15%.

**Driver tree (funnel-style):**

```
Free-to-paid conversion (8%)
└── % signups who upgrade to paid
    ├── Step 1: signed up (100%)
    ├── Step 2: completed onboarding (60%) — 40% drop here 🟢
    ├── Step 3: reached aha moment (45%) — 15% drop 🟢
    ├── Step 4: used product daily for 7+ days (20%) — 25% drop 🟢
    ├── Step 5: saw upgrade prompt (18%) — 2% drop 🔴 (mostly technical)
    └── Step 6: accepted upgrade (8%) — 10% drop 🟢
```

**Insight:** Biggest drops are Step 1→2 (onboarding) and Step 3→4 (early retention). Step 5→6 (offer accept) is third-biggest.

**Action:** Three sprints — improve onboarding (Step 1→2), improve early retention scaffolding (Step 3→4), then iterate on offer copy (Step 5→6).

**Why this is good:** Funnel structure makes drop-points visible. Each leaf is a known intervention. Pyramid-output structures the recommendation.

## Composition notes

### With `pyramid-principle-output`
Driver tree is evidence; top-line states the intervention recommendation. Order: top-line first ("Focus on drivers X, Y, Z"), then driver tree as supporting visual.

### With `mece-decomposition-check`
Mandatory at every level of the tree. Children of each node must be MECE. Otherwise the "math" doesn't add up (overlap = double-counting; gaps = unattributed variance).

### With `so-what-test`
For each 🟢 leaf, ask so-what. "Tighten wiki-sync/distill prompt" — so what? → "Saves ~$15/mo." So what (action)? → "Run /update on distill SKILL.md with shorter prompt next week." If a leaf fails so-what, it's not actually actionable.

### With `2x2-synthesis-matrix`
After driver tree identifies multiple intervention points, 2x2 prioritizes them. Axes: leverage (impact on target metric) × effort (founder hours). Quadrant II (high-leverage, low-effort) = ship first.

### With `tosca-problem-framing`
TOSCA defines the gap (Trouble) and the measurable goal (Success criteria). Driver tree then operates on the goal metric. Use TOSCA before driver tree, not after.

## References

- McKinsey Value Driver Tree — standard tool in strategy practice since 1990s.
- *Valuation* (Koller/Goedhart/Wessels, McKinsey, 2020) — driver trees for financial metrics.
- *The Lean Startup* (Ries, 2011) — funnel decomposition variant (AARRR).
- Bain Net-Promoter framework (Reichheld, 2003) — driver-tree decomposition of customer loyalty.

## Anti-claims

- Driver tree is NOT a forecast model. It identifies levers; it doesn't predict outcomes.
- Driver tree is NOT always quantitative. Sometimes the tree shows structural relationships even when measurements are partial. But qualitative-only trees risk being decorative.
- Driver tree is NOT a substitute for causal experimentation. Trees show MATHEMATICAL composition; A/B tests show CAUSAL effect.
- Not every metric admits a useful driver tree. Some are intrinsically observation-only (e.g., macro factors). Recognize and skip.
