---
title: "Ritsu Market &amp; Competitive Landscape (Domont Phase-1 Diagnosis)"
type: strategy-doc
pillar: 01-marketing
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Phase-1 — Market & Competitor Diagnosis (TAM/SAM/SOM · CPM · Perceptual Map · SWOT · Five Forces)"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/product.md
  - 00-core/positioning.md
  - 00-core/icp-summary.md
  - 00-core/north-star.md
  - 00-core/charter.md
  - 01-marketing/icp/persona-portrait.md
  - 01-marketing/icp/customer-journey.md
  - knowledge/analytics-sync-contract.yaml
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Foundation doc — the WHERE-do-we-compete-and-why-will-we-win diagnosis.** This is the Phase-1 (market diagnosis) layer of the Domont commercial-strategy process — the fact-base that the downstream marketing SOPs (channel-attribution, ICP-discovery, content engine) and the GTM acquisition engines reference without re-deriving the market. It is to *competitive strategy* what `01-marketing/icp/persona-portrait.md` is to *the customer*: the load-bearing diagnosis under the execution layer.
>
> **Coherence contract:** this doc obeys the WHAT-trio — `00-core/product.md` (what Ritsu IS), `00-core/positioning.md` (what to SAY), `00-core/icp-summary.md` (WHO it's for). It never re-decides the wedge, the belief, or the segment — those are locked upstream. It *sizes* the market the wedge addresses, *maps* the rivals the wedge fights, and *names* the strategic options the diagnosis forces.
>
> **Honesty discipline at true-zero.** Ritsu has **0 paying strangers** and an **unproven WTP**. Every quantitative claim is tagged: `[OBSERVED]` (Door-2 pseudonymized analytics, n≈25, ~24 founder/test), `[INFERRED]` (external market research + framework logic), or `[HYPOTHESIS]` (untested). The two load-bearing unknowns — **R1: do they pay?** and **R2: does free NotebookLM make the wedge redundant?** — are flagged everywhere they bite. This is a *diagnosis built to be falsified by N=10*, not a pitch.

---

## 0. Executive diagnosis (so-what first)

Per the Domont Phase-1 gate, three questions must be answered unambiguously and on evidence. Here are the answers; the rest of the doc is the proof.

1. **Where do we compete?** A **narrow, deliberately-chosen beachhead inside a large, mature, saturated market.** The market is the global self-directed/EdTech learning category (TAM ~$80B `[INFERRED]`, HolonIQ 2024); the wedge is the **US-led English-speaking deadline-bearing committed STEM/ML masterer** (SOM target = the first 100 paying, then a thin ~$3–7M ARR slice in 3 years). We are **not** creating a category — we are entering a crowded one on **differentiation**, not on "another AI quiz tool."

2. **Why will we win — if we win?** Because the **two dominant competitive forces (Buyer Power + Threat of Substitutes) are both maximal**, and the only defensible response to maximal buyer power and free substitutes is a **switching-cost + authority moat** that the free substitutes structurally lack: the **ordered multi-week mastery PATH + 17 distinct activity types + concept-level Knowledge Map + named, cited learning-science**. We win on the *system*, never on the *feature*. Every cell in this doc that says "we win" traces to exactly that residual moat.

3. **Why might we lose?** Because the deepest competitor cell — **Google NotebookLM, free, which in April 2026 added mastery-tracking and a Socratic "Learning Guide"** — has **commoditized the doc→quiz→grounded-explanation→share spine** that was Ritsu's original product. If the residual PATH/mastery/learning-science moat is *not enough* to justify $29/mo over a free Google product (R2), and if deadline-bearers won't pay at the first hard limit (R1), the diagnosis fails. **The CPM weighted scores are close (Ritsu 3.07 vs NotebookLM 2.96 vs ChatGPT 2.71 `[INFERRED]`); we lead, but by a margin a single Google release could erase.**

**The one strategic instruction this diagnosis hands the GTM engines:** *lead every message, every channel, every comparison with the PATH + mastery + learning-science — never with "we also make quizzes," because the strongest free rival makes quizzes too.* (This is the SO/ST strategic option set, §6.)

---

## 1. Market sizing — TAM / SAM / SOM (sizing the wedge market)

> Framework: `tam-sam-som.md`. Method: top-down for TAM/SAM, **bottom-up for SOM** (the SOM must be benchmark-anchored, not a percentage guess — the framework's #1 pitfall). Triangulation check at §1.4.

### 1.1 — The three tiers

| Tier | Definition | Size | Method | Key assumption | Tag |
|---|---|---|---|---|---|
| **TAM** | Global self-directed / consumer-EdTech learning spend (all who could *ever* use an AI study tool) | **~$80B** | Top-down (HolonIQ 2024 global EdTech ≈ $340B; consumer/self-directed slice ≈ $80B) | The whole self-directed learning category is the theoretical ceiling | `[INFERRED]` |
| **SAM** | English-first, digital-first learners with PDF/video study material **and** WTP $0–119/mo for an AI study product | **~$12B** | TAM × (English-digital-paying filter ≈ 15%) | Ritsu's model (English-first, doc-upload, freemium-SaaS) can only reach English-speaking, content-bringing, card-capable learners | `[INFERRED]` |
| **SAM-wedge** | The **deadline-bearing committed STEM/ML masterer** slice of SAM — US-led, in a hard *graded multi-week* course (ML/AI beachhead + tiered adjacents per `icp-summary.md` §4b) | **~$0.4–0.8B** | SAM × (graded-STEM-masterer share ≈ 4–6%) | The wedge is the *job* "master dense graded material before a deadline," not all of STEM; tiered CORE→WEAK per icp §4b | `[INFERRED]` |
| **SOM (3-yr)** | Realistic capture given true-zero position, solo+AI team, US-weak network | **~$3–7M ARR** | **Bottom-up** (see §1.3) | Comparable early-trajectory benchmark, not a % of SAM | `[INFERRED]` / `[HYPOTHESIS]` |

### 1.2 — The wedge sizing, bottom-up sanity (the part that must be real)

The wedge is intentionally tiny — that is the point (`icp-summary.md`: *narrowing the audience increases the addressable market via passionate advocates*). A bottom-up enrolment proxy `[INFERRED]`:

- **The named ML/AI beachhead courses** are small in absolute enrolment but dense in fit: Stanford cs231n ≈ 600/yr on-campus `[INFERRED]`; but the *open-courseware* reach (fast.ai, Andrew Ng/DeepLearning.AI Coursera, MIT 6.S191 public) is **millions of cumulative learners** — Andrew Ng's ML courses alone have **>8M cumulative enrolments** `[INFERRED]`.
- **CRITICAL split (from `icp-summary.md` §0):** that open-courseware millions is the **reach / top-of-funnel** layer with *soft* WTP. The **paying core** — those with a *dated graded* deadline (enrolled-for-credit, bootcamp cohorts, grad quals) — is a **far thinner** slice: order-of-magnitude **low-hundreds-of-thousands** of US/English learners in any given term `[INFERRED] / [HYPOTHESIS]`.
- **Tiered expansion (icp §4b)** widens the *job* boundary beyond STEM/ML — medicine/pre-med (CORE, fit 92, and **WTP already proven next door**: UWorld/Anki-add-ons/Sketchy at $300–500), CFA/law (STRONG), quant-social-science/grad-quals (MODERATE). This roughly **2–3×s the paying-core wedge** without changing the psychographic or the product.

### 1.3 — SOM, bottom-up and benchmark-anchored

The framework forbids a "% of SAM" SOM. So the SOM is built from the north-star arithmetic (`north-star.md` §4) and a comparable:

- **Year-1 SOM = the 100-paying-who-love milestone**, not a dollar figure. At blended ARPU ~$30–45/mo (`north-star.md`), 100 paying ≈ **$36–54K ARR** — trivially small, deliberately so. This is the *only* number the company is actually optimizing right now.
- **Year-3 SOM ≈ $3–7M ARR** `[HYPOTHESIS]`. Benchmark: Quizlet reached ~$30M ARR around year 5 from a *broader, free-viral* base. Ritsu, narrower and paid-first, anchoring to ~0.05–0.1% of the **SAM-wedge** ($0.4–0.8B) → **$2–8M**, midpoint $3–7M. This is the credible capture, not the $80B headline.
- **Triangulation note:** the **earlier `product.md`-era number** ("0.1% of SAM = $12M ARR at year 3, anchored to Quizlet $30M") is *more optimistic* than this revision. The gap is deliberate: that figure pre-dated the **R1/R2 honesty layer** (NotebookLM-free + unproven WTP). **This doc revises SOM down ~40% to reflect the free-substitute reality.** When the founder reconciles, $3–7M is the conservative anchor; $12M is the upside if R2 is decisively won.

### 1.4 — Triangulation & the load-bearing caveat

| Check | Result |
|---|---|
| Top-down SAM-wedge ($0.4–0.8B) vs bottom-up paying-core (low-hundreds-of-K learners × ~$300/yr realized ≈ $0.3–0.6B) | **Converge within ~1.5×** — the wedge sizing is internally consistent. |
| TAM→SAM→SAM-wedge funnel | ~$80B → ~$12B → ~$0.5B → 100 paying. Each filter is the *model's reach limit*, not a vanity claim — passes the framework's "US-only can't claim global TAM" pitfall. |
| **The caveat that dominates all of the above** | **Every dollar of SOM assumes R1 (they pay) and R2 (free NotebookLM doesn't satisfy the job). At true-zero, SOM is a *hypothesis the N=10 watch falsifies first.* No market-size number is real until pay-at-first-limit is observed (SOP-PRODUCT-002).** |

**So-what:** TAM justifies that the category is worth being in; the wedge SOM (100 paying → $3–7M) is the only plan the company executes. The headline $80B is context, not a target — and the SOM is explicitly **gated on R1/R2**, not on market math.

---

## 2. Competitive Profiling Matrix (the head-to-head)

> Framework: `competitive-profiling-matrix.md`. 8 Critical Success Factors, weighted to sum 1.0, each scored 1–4 (1 = major weakness, 4 = major strength). **CSFs are sourced from the persona's own comparison criteria** (`persona-portrait.md` S12 §9, S13) and the Porter analysis (§4) — *what actually drives the choice for this skeptical, deadline-bearing learner*, not generic SaaS factors. Ritsu vs the 5 rivals the persona actually weighs.

### 2.1 — Why these 8 CSFs, and these weights

The persona (S13 SERVQUAL) is explicit: **accuracy is #1** ("a wrong key is worse than no quiz before a midterm"), and the residual moat (S15 §24/§26) is the **path + activity depth + mastery-tracking + learning-science**. The weights encode *this buyer's* decision function — not a balanced scorecard.

| # | Critical Success Factor | Weight | Rationale for weight (from persona) |
|---|---|---|---|
| 1 | **Accuracy / source-grounding** (no hallucinated quizzes; cites page/timestamp) | **0.20** | S13 §1: the #1 SERVQUAL bar; the legitimacy gate. Highest weight. |
| 2 | **Structured multi-week mastery PATH** (difficulty-ordered, tracked) | **0.18** | S15 §24: "THE load-bearing POD"; the thing free rivals lack. |
| 3 | **Activity depth** (17+ types + 7 tutoring modes vs flat Q&A) | **0.13** | S12 §6: "no 17 activity types, no 7 modes" is the perceived gap. |
| 4 | **Concept-level mastery map / cross-session tracking** | **0.12** | S14 §8: the switching-cost moat (lose progress = lose stickiness). |
| 5 | **Price / value vs the job** (incl. free-tier ceiling) | **0.12** | S11 §1/§5: WTP $15–25, hostile $9.99 Google anchor; deadline-elastic. |
| 6 | **Learning-science authority + transparent citations** | **0.10** | `positioning.md` §6: the **preemptive** POD; compounding, least-copyable. |
| 7 | **Speed to first activity** (<30s from dense PDF) | **0.08** | S13 §3: table-stakes responsiveness; a POP not a POD. |
| 8 | **Brand awareness / distribution** | **0.07** | S12 §7: Ritsu near-zero; rivals (Google, OpenAI, Quizlet) enormous. The factor where Ritsu is structurally weakest. |
| | **Total** | **1.00** | |

### 2.2 — The matrix (rating / weighted score)

Rivals chosen per `persona-portrait.md` S12 §2 (the rivals the persona *actually weighs*): the free shadow rival **NotebookLM**, the incumbent chatbot **ChatGPT**, the flashcard incumbent **Quizlet**, the power-user free tool **Anki**, the course platform **Coursera**.

| CSF (weight) | **Ritsu** | **NotebookLM** (free) | **ChatGPT** | **Quizlet** | **Anki** | **Coursera** |
|---|---|---|---|---|---|---|
| Accuracy / grounding (0.20) | 3 / 0.60 | 4 / 0.80 | 2 / 0.40 | 3 / 0.60 | 4 / 0.80 | 4 / 0.80 |
| Mastery PATH (0.18) | **4 / 0.72** | 2 / 0.36 | 1 / 0.18 | 1 / 0.18 | 2 / 0.36 | 4 / 0.72 |
| Activity depth (0.13) | **4 / 0.52** | 2 / 0.26 | 2 / 0.26 | 2 / 0.26 | 1 / 0.13 | 2 / 0.26 |
| Mastery map / tracking (0.12) | **4 / 0.48** | 3 / 0.36 | 1 / 0.12 | 2 / 0.24 | 3 / 0.36 | 2 / 0.24 |
| Price / value (0.12) | 2 / 0.24 | **4 / 0.48** | 3 / 0.36 | 3 / 0.36 | **4 / 0.48** | 2 / 0.24 |
| Learning-science authority (0.10) | **4 / 0.40** | 2 / 0.20 | 1 / 0.10 | 2 / 0.20 | 3 / 0.30 | 3 / 0.30 |
| Speed to first activity (0.08) | 3 / 0.24 | 4 / 0.32 | 3 / 0.24 | 2 / 0.16 | 1 / 0.08 | 2 / 0.16 |
| Brand / distribution (0.07) | 1 / 0.07 | **4 / 0.28** | 4 / 0.28 | 4 / 0.28 | 3 / 0.21 | 4 / 0.28 |
| **TOTAL WEIGHTED** | **3.27** | **3.06** | **1.94** | **2.28** | **2.72** | **3.00** |

> **Scores are `[INFERRED]` (framework-disciplined estimates anchored to the persona evidence, not survey data — the framework's "use data not opinion" bar is *not yet met*; this is the day-1 estimate the N=10 watch + later message-test must calibrate).** Ratings anchored to: persona S12/S13/S15 (Ritsu, NotebookLM, ChatGPT), `product.md` §6 feature counts (Ritsu activity/mode/path), deep-research pricing (NotebookLM Pro $19.99 / Google AI Pro student $9.99 / ChatGPT Plus $20 / Quizlet Plus ~$8 / Anki free).

### 2.3 — Reading the matrix (the gaps that drive investment)

1. **Ritsu leads (3.27), but the lead is thin and concentrated.** Ritsu wins on exactly the 3 highest-fit, weight-heavy CSFs it was *designed* to win — **PATH (0.72), activity depth (0.52), mastery map (0.48), learning-science (0.40)**. Toyota's lesson (the framework's example) applies precisely: *the advantage is concentrated in a few high-weight factors, not spread across all*. This is good — it means the moat is legible and defensible — **but it means a rival closing those 4 cells erases the lead.**

2. **NotebookLM (3.06) is the real threat, and it is closing the gap on the moat cells.** NotebookLM out-scores Ritsu on **accuracy (Google retrieval), price (free), speed, and brand** — and its April-2026 mastery-tracking lifted it from 2→3 on the tracking cell. The **0.21-point margin is the smallest in the matrix and the most fragile**: a single NotebookLM release adding a structured path or more activity types would flip it. *(See the deep teardown, §3.)*

3. **Ritsu's two structural deficits are price (0.24) and brand (0.07).** Price is mitigable (deadline-elasticity collapses sensitivity, S11 §2; and the *value* case holds vs a $25–100 stack) but the **hostile $9.99 Google AI Pro student SKU** is a real anchor problem (S11 §5). Brand is the **single worst cell** — and structurally so (Ritsu is true-zero against three of the largest software brands on earth). **This is why distribution/awareness is the entire job of the 4 GTM acquisition engines** — the CPM says the product can win the head-to-head it never gets into without distribution.

4. **The two priority gap-CSFs to invest in (the framework's final step):** **(a) Accuracy** — close the 0.20 gap to NotebookLM/Anki/Coursera, because it is the highest weight *and* the credibility-of-the-whole-position POP (a wrong quiz fails both the job and the brand). **(b) Distribution/awareness** — the 0.21 brand gap is the difference between a product that wins the comparison and one no one runs the comparison on.

**So-what:** The CPM converts the qualitative positioning into a number: Ritsu wins *iff* it (1) holds the PATH/depth/tracking/science cells, (2) closes the accuracy gap to parity, and (3) solves distribution. The margin over the free rival is **0.21 — defensible but not safe.**

---

## 3. The NotebookLM teardown (the deepest competitor cell — R2 made concrete)

> Per the brief, this is the doc's deepest analysis. NotebookLM is not "a" competitor — it is the **shadow rival that defines whether the wedge survives** (`icp-summary.md` R2; `persona-portrait.md` S12 §2). Everything else in §2 is context; *this* is the cell that can falsify the strategy.

### 3.1 — What NotebookLM is, and why it is the dangerous one

NotebookLM is Google's free, account-gated, source-grounded research/study assistant. By the persona's own evidence (S12 §2, S15 §26), it now does — **for free**:

- **doc → quiz** (auto-generated questions from the user's uploaded source) `[INFERRED]`
- **doc → flashcards** `[INFERRED]`
- **doc → grounded explanation** (answers cite the exact passage — *the same "grounded, not guessed" assurance Ritsu sells*, S13 §4) `[INFERRED]`
- **share-link** (the same viral mechanism Ritsu's share-loop relies on) `[INFERRED]`
- **(April 2026) basic mastery-tracking + a Socratic "Learning Guide"** — narrowing two of Ritsu's four moat cells `[INFERRED]`

It is backed by Google's retrieval stack (→ the **accuracy 4/4** in §2, the one CSF that is Ritsu's #1 weight and the one NotebookLM beats Ritsu on), Google distribution (→ brand 4/4), and a **$0 price + a hostile $9.99 "Google AI Pro student" up-sell** (→ price 4/4). It is, structurally, *the original Ritsu product, made free, by Google.*

### 3.2 — The feature-delta map (where Ritsu still wins, honestly)

This is the residual moat, cell by cell — the *only* ground on which "Ritsu over free NotebookLM" is true. Lead every comparison here; never on the commoditized spine.

| Capability | NotebookLM (free) | **Ritsu** | Is it a *real* moat? |
|---|---|---|---|
| doc → quiz / flashcards | ✅ free | ✅ | ❌ **commoditized — table-stakes, do NOT lead on this** |
| grounded explanation w/ citations | ✅ (Google retrieval) | ✅ | ❌ **parity / NotebookLM-favored** (S13 §4) |
| share-link | ✅ | ✅ | ❌ parity |
| basic mastery-tracking | ✅ (Apr-2026) | ✅ (deeper) | △ **narrowing — was a moat, now contested** |
| **Structured, difficulty-ordered, multi-week PATH** | ❌ (flat, per-source) | ✅ | ✅ **THE moat** (S15 §24) — NotebookLM is per-document, not a tracked course path |
| **17 distinct activity types + 7 tutoring modes** | ❌ (quiz/flashcard/guide only) | ✅ | ✅ **moat** — mindmap, timeline, crossword, drag-drop, diagram, code-exercise, match, "Ask Me"/"Solve"/"Adaptive" modes |
| **Concept-level Knowledge Map** (cross-chapter gap graph) | ❌ | ✅ | ✅ **moat** — the cross-source mastery graph (S15 §19) |
| **Named, cited learning-science** (active recall / spaced rep / Feynman, *named*) | ❌ (does it, doesn't *name/teach* it) | ✅ | ✅ **preemptive moat** (`positioning.md` §6) — the authority play NotebookLM has no incentive to build |
| **Emotional AI / mastery identity** (10 personalities, encouragement) | ❌ | ✅ | △ secondary; the psychological hook (S13 §5) |

### 3.3 — Why this is R2, and what "losing R2" looks like

**R2 = the risk that the four residual moat cells are not worth $29/mo over a free Google product to a price-sensitive, deadline-gated student.** The persona evidence is sobering and must be stated plainly:

- The persona's **price objection is literally NotebookLM** (S11 §20, S10 §62): *"$29/mo when NotebookLM is free and ChatGPT Plus is $20 / Quizlet $3 / Anki $0."* The reach-layer's why-never-pay rationalization is *"NotebookLM + ChatGPT-free + Anki already cover me"* (S11 §20).
- NotebookLM's accuracy + retrieval **beats** Ritsu on the persona's #1 SERVQUAL bar (§2: 0.80 vs 0.60). Ritsu cannot win the accuracy argument against Google; it must win the **structure** argument.
- NotebookLM is a **moving target with a $0 marginal-cost incentive to keep closing the gap** (it closed two cells in one April-2026 release). The moat is not static.

**What losing R2 looks like (the falsification condition, S16 §13):** *NotebookLM's free doc→quiz spine satisfies the deadline-bearer's job well enough that they will not pay Ritsu's Plus premium* — i.e., the N=10 watch shows users hit the first hard limit and **churn to NotebookLM-free** rather than convert (S14 §3, §16 abandonment to "NotebookLM-free as the off-ramp").

### 3.4 — The strategic response to NotebookLM (the ST option, previewed)

The diagnosis forces a single response, executed across the GTM engines (full options at §6):

1. **Message:** never claim the spine. Lead with **"the ordered multi-week PATH + 17 activities + concept-level mastery map + named learning-science"** in every comparison (`icp-summary.md` R2: *"never 'we also make quizzes'"*). The approved comparison line (S15 §16) is locked: *"NotebookLM gives me quizzes/flashcards free — Ritsu gives the ordered multi-week PATH, 17 activity types, and concept-level mastery map it doesn't."*
2. **Wedge into NotebookLM's blind spot:** NotebookLM is **per-document and un-pathed**; Ritsu is **per-course and tracked.** The buyer with a *multi-week graded course* (not a single doc) is the buyer NotebookLM serves worst. **The wedge is precisely the NotebookLM-gap.** This is *why* the wedge is "master a hard multi-week *course*," not "quiz a PDF."
3. **Build the switching-cost moat NotebookLM can't easily copy:** cross-session mastery state + accumulated Knowledge Map + generated activity library = *sunk progress* (S14 §8). Every week a user stays, leaving costs more. This is the structural defense against a free rival.
4. **Out-author it:** the learning-science authority + citation discipline is the **preemptive POD** (`positioning.md` §6) — Google won't do months of compounding learning-science content; the trust-first content engine *is* the R2 defense, not a marketing tactic.

**So-what:** NotebookLM does not make Ritsu redundant *today* — it makes Ritsu's **original product** redundant. The strategy survives **only** by being a course-level mastery *system* with a switching-cost + authority moat, sold to the multi-week-deadline buyer NotebookLM serves worst. **R2 is the central bet of the whole company, and it is unproven.**

---

## 4. Perceptual map (where the white space is)

> Framework: `perceptual-map.md`. Axes chosen as **perceptual** dimensions the buyer actually uses to differentiate (the framework's #1 pitfall is choosing operational axes) — drawn from the persona's comparison criteria (S12 §9) and the positioning frame (`positioning.md` §5). **Axes are estimated, not survey-derived — the framework's customer-survey step is a Phase-A action, not yet done.**

### 4.1 — The two axes

- **X-axis: Passive consumption ←→ Active mastery.** The single deepest perceptual split for this persona — it *is* the belief (`positioning.md` §1: *"passive consumption is wasted time; active mastery is the only learning that sticks"*). Re-reading/summarizing tools sit left; quiz-yourself/explain-back/track-mastery tools sit right.
- **Y-axis: Generic / per-artifact ←→ Course-specific / structured-path.** The NotebookLM-gap axis — flat, one-document, one-off tools at the bottom; structured, multi-week, tracked *course* systems at the top. This is the axis Ritsu was built to own.

### 4.2 — The map (ASCII; circle ≈ brand awareness for the persona)

```
                 COURSE-SPECIFIC / STRUCTURED MULTI-WEEK PATH
                                  ▲
                                  │
                   Coursera ◯◯    │        ◉ RITSU  ← target white space
                   (passive,      │          (active + pathed + tracked)
                    pathed)       │
                                  │
   ────────────────────────────────────────────────────────────────────▶
   PASSIVE CONSUMPTION            │              ACTIVE MASTERY
                                  │
                  ChatGPT ◯◯◯◯    │   ◯◯◯◯ NotebookLM (active spine,
                  (passive,       │         but per-document, un-pathed)
                   generic Q&A)   │
                                  │   ◯◯ Quizlet / ◯ Anki
                                  │      (active recall, per-deck,
                                  ▼       not course-pathed)
                 GENERIC / PER-ARTIFACT / ONE-OFF
```

### 4.3 — Reading the map

- **The crowded zones (commodity traps):** the **bottom-right** (active-but-generic) is filling fast — NotebookLM, Quizlet, Anki all cluster there, and NotebookLM is the gravitational center now that it's free. The **bottom-left** (passive-generic) is ChatGPT's commodity zone. *Ritsu must not be perceived in either crowded zone* — yet that is exactly the risk if it leads with "we make quizzes" (which plots it right on top of NotebookLM).
- **The white space (Ritsu's target position):** the **top-right — active mastery × course-specific structured path — is genuinely sparse.** Coursera is top but *passive* (watch lectures, pre-built, not your material). NotebookLM is active but *bottom* (per-document, un-pathed). **Nobody owns active + pathed + your-own-material + tracked.** That is the Dove-style white space (the framework's example): a real, defensible, currently-unoccupied position.
- **The validation caveat (the framework's #2 pitfall):** *not every gap is demand.* The top-right is white space **only if the deadline-bearing masterer actually wants a course-path system enough to pay** — which is **R1, unproven.** The map identifies *where* to position; the N=10 watch tests *whether the demand is there.* Ritsu has the capability to occupy the space (`product.md` §6 path + tracking are built); the open question is willingness-to-pay for it.

**So-what:** The perceptual map gives the GTM engines the **positioning coordinate**: *active mastery + course-structured path + your own material*. It also gives the warning: drift toward "active + generic" and Ritsu is plotted on top of free NotebookLM, where it loses. The position only holds if every touchpoint pushes Ritsu *up and right* — toward the pathed-course corner NotebookLM can't reach.

---

## 5. Porter's Five Forces (the structural context)

> Framework: `porters-five-forces.md`. **Industry boundary (precisely, per the framework's #1 pitfall):** *consumer AI-assisted study/active-learning tools for individual English-speaking learners* — narrower than "EdTech," narrower than "AI apps," matching where the wedge actually competes. Each force rated H/M/L with the mechanism. **Dominant forces = Buyer Power + Threat of Substitutes** — both maximal, both driven by *free*.

### 5.1 — The five forces

| Force | Rating | Driving factors (evidence) | Mechanism on margin |
|---|---|---|---|
| **Buyer Power** | **HIGH** ⬅ dominant | Buyers are individual students; **switching cost ≈ 0** at signup; **free alternatives one click away** (NotebookLM $0, ChatGPT-free, Anki $0); price-sensitive ($15–25 WTP anchor, S11 §1); hostile $9.99 Google student SKU (S11 §5); cancel monthly. | Compresses price hard. The buyer can *always* walk to free. → forces the *switching-cost moat* response. |
| **Threat of Substitutes** | **HIGH** ⬅ dominant | **Free NotebookLM clones the spine** (R2); free ChatGPT/Gemini paste; the course's own problem sets + TA office hours; **do-nothing / cram week-of** (S12 §3); paid 1:1 tutoring at the high end. | Caps WTP and makes "good enough free" the default. → forces *differentiation on the un-substitutable system (PATH/tracking/authority)*. |
| **Rivalry** | **MEDIUM-HIGH** | Fast-consolidating early-growth category (S12 §12); a few well-funded players (Google, OpenAI, Quizlet) + a long tail of doc-to-quiz AI apps; NotebookLM commoditized the spine in <12mo. | Erodes feature-level differentiation quickly (anything copyable is copied in weeks). → forces *authority/switching-cost moats over feature races*. |
| **Supplier Power** | **MEDIUM** | Core supplier = the LLM (Anthropic primary, OpenAI embeddings, `product.md` §13); rising token costs but *falling* per-capability cost on the AI curve; multi-model optionality reduces lock-in. | Moderate input-cost pressure, *declining* over time (the AI-Native cost thesis, `north-star.md` §4). Not a binding constraint. |
| **Threat of New Entrants** | **MEDIUM** | Low *technical* barrier (a doc→quiz MVP is a weekend project); BUT high barriers to the *moat* (months of learning-science authority + a real mastery-path + brand). The dangerous "entrant" already entered: **Google (NotebookLM)** — an incumbent-as-entrant, not a startup. | The category is easy to enter, hard to *win*. The real entrant risk is a big-tech feature release, not a new startup. → reinforces the authority/path moat. |

### 5.2 — Synthesis: the two dominant forces and the forced response

**Both dominant forces are powered by the same thing: free.** Buyer Power is high *because* free substitutes exist; Threat of Substitutes is high *because* the best substitute (NotebookLM) is free and Google-grade. This is the **Netflix-analogous structural pressure** (the framework's example: high Buyer Power + high Substitutes → a structural, not whimsical, response).

The framework demands one strategic response per dominant force:

1. **Response to HIGH Buyer Power → build switching costs through accumulated value.** *(Netflix's answer was $17B in exclusive content; Ritsu's is accumulated mastery state.)* Cross-session mastery-tracking + the growing Knowledge Map + the user's generated activity library make *leaving cost the user their progress* (S14 §8). This converts a zero-switching-cost buyer into a sunk-cost-retained one — the *only* defense against a buyer who can always walk to free.

2. **Response to HIGH Threat of Substitutes → differentiate on the un-substitutable system, not the substitutable feature.** The substitute (NotebookLM) has the *spine* (quiz/flashcard/grounded-answer); it lacks the *system* (ordered multi-week path + 17 activities + concept-map + named learning-science). **Compete only on the system.** The wedge ("master a hard multi-week *course*") is itself the substitute-avoidance strategy: it targets the multi-week-deadline job that the per-document substitute serves worst.

**So-what:** The structure of this industry is *hostile to margin* — two maximal free-driven forces. A company surviving here cannot win on features (rivalry copies them) or price (buyers walk to free). It survives **only** on switching costs (accumulated mastery state) + authority (compounding learning-science) — which is exactly the moat the whole strategy is built on. Porter confirms the moat choice is *structural necessity*, not preference.

---

## 6. SWOT → strategic options (the synthesis)

> Framework: `swot-analysis.md`. Each quadrant is evidence-backed (the framework's bar: no generic entries). **The value is the cross-pairs (SO/ST/WO/WT) → concrete strategic options**, not the grid. These options are the marketing-strategy directives the downstream GTM engines and SOPs execute.

### 6.1 — The grid (evidence-backed, top items)

**STRENGTHS (internal +)**
- **S1.** The only *active + course-pathed + tracked + your-own-material* product — owns the perceptual white space (§4); the residual moat NotebookLM lacks (§3.2). `[INFERRED]`
- **S2.** Deep product already built: 17+ activities, 7 modes, Knowledge Map, mastery-tracking (`product.md` §6). `[OBSERVED]` feature surface; live on ritsu.ai.
- **S3.** Observed deep engagement on the right material: PDF 63% + YouTube 16%, sustained-revisit mastery pattern (42 src/36 sess, 4 src/10 sess). `[OBSERVED]`
- **S4.** A locked, coherent, learning-science-grounded positioning + the preemptive authority/citation POD (`positioning.md` §6). `[INFERRED]`
- **S5.** AI-Native solo+AI cost structure → can serve the wedge at near-zero marginal cost (`north-star.md` §4). `[INFERRED]`

**WEAKNESSES (internal −)**
- **W1.** **Zero brand / distribution** — the worst CPM cell (0.07); true-zero, 0 organic shares (15 all founder). `[OBSERVED]`
- **W2.** **Accuracy is only at parity, below NotebookLM/Anki on the #1-weight CSF** — and accuracy is the credibility-of-the-whole-position POP. `[INFERRED]`
- **W3.** **Price ($29) sits *above* the WTP anchor ($15–25) and far above the $0/$9.99 free-and-student anchors.** `[INFERRED]`
- **W4.** **WTP entirely unproven (R1)** — 0 paying strangers; the whole revenue thesis is a hypothesis. `[OBSERVED]` (zero) + `[HYPOTHESIS]` (that they'll pay).
- **W5.** Solo founder + weak US network; US "Differentiable" MASDA star unvalidated (`icp-summary.md` §3). `[HYPOTHESIS]`

**OPPORTUNITIES (external +)**
- **O1.** The **active + course-pathed white space is genuinely unoccupied** (§4) — Coursera passive, NotebookLM un-pathed. `[INFERRED]`
- **O2.** **Pre-assembled, reachable, skeptical-but-targetable audience** at zero net-new channel cost (r/learnmachinelearning ~276K, fast.ai forums, #studytwt, study-science creators; 262 mapped placements in persona S9-A). `[INFERRED]`
- **O3.** **Medicine/pre-med adjacent with *proven* WTP** ($300–500 already spent on UWorld/Anki/Sketchy) — de-risks R1 next door (`icp-summary.md` §4b co-beachhead). `[INFERRED]`
- **O4.** Recurring graded deadlines = a *durable* repeat-pay trigger (vs one-shot cram churn) → potential for real retention (`icp-summary.md` §0). `[HYPOTHESIS]`
- **O5.** Learning-science authority is an open, un-owned position — no incumbent is doing the cited-method content discipline (`positioning.md` §6). `[INFERRED]`

**THREATS (external −)**
- **T1.** **Free NotebookLM (R2)** — clones the spine, Google-backed, $0, closing the gap (April-2026 mastery-tracking + Socratic guide). *The dominant threat.* `[INFERRED]`
- **T2.** **High Buyer Power + Substitutes** (§5) — buyers can always walk to free; price compressed structurally. `[INFERRED]`
- **T3.** **Hostile $9.99 Google AI Pro student SKU** anchors "fair student price" below Ritsu's $29 (S11 §5). `[INFERRED]`
- **T4.** **Accuracy incident risk** — one hallucinated quiz before a graded exam = uninstall + the #1 SERVQUAL/brand failure (S13 §1–2). `[INFERRED]`
- **T5.** Fast feature-copy rivalry — any copyable feature is copied in weeks (§5 rivalry). `[INFERRED]`

### 6.2 — Cross-pair strategic options (the deliverable)

| Cross-pair | Pairing | **Strategic option** |
|---|---|---|
| **SO** (leverage strength to capture opportunity) | S1 × O1 | **SO-1 — Own the white space loudly.** Position *only* in the active+course-pathed+tracked corner; make "the ordered multi-week mastery PATH" the hero, not the quiz. The product (S1) already occupies the space (O1) — claim it before NotebookLM extends into it. |
| **SO** | S2 × O2 | **SO-2 — Authority-first distribution into the pre-assembled audience.** Deploy the deep product (S2) via study-science creators + Reddit/Discord (O2), led by learning-science credibility (the audience trusts experts > peers > numbers, S13 §8). *Authority > reach* for this skeptical buyer. |
| **SO** | S4 × O5 | **SO-3 — Build the compounding authority moat (trust-first content engine).** The cited-learning-science position (S4) into the un-owned authority space (O5) — the preemptive POD that Google won't replicate. This *is* the R2 defense. |
| **ST** (use strength to neutralize threat) | S1 × T1 | **ST-1 — Out-system the free spine (the core R2 response).** Against free NotebookLM (T1), compete only on the un-substitutable system (S1): never "we make quizzes too" — always the PATH + 17 activities + concept-map + named science. Wedge into NotebookLM's per-document blind spot (the multi-week-course buyer). |
| **ST** | S2 × T2 | **ST-2 — Build switching costs to defang Buyer Power.** Use the tracking + Knowledge Map + generated-activity library (S2) to make accumulated mastery state a sunk cost (§5 response 1) — the structural answer to a buyer who can walk to free (T2). |
| **ST** | S4 × T4 | **ST-3 — Make accuracy the brand, pre-empt the incident.** Lead with accuracy + transparent page/timestamp citations (S4) to neutralize the hallucination threat (T4) *and* the "AI ⇒ unreliable" POP — invest accuracy to *parity-plus* (the #1 CPM gap). |
| **WO** (overcome weakness to access opportunity) | W4 × O3 | **WO-1 — Run the medicine/pre-med co-beachhead N=10 to de-risk R1.** The unproven-WTP weakness (W4) is mitigated by the adjacent with *proven* study-tool WTP (O3): a parallel N=10 med cohort tests pay-at-first-limit where willingness already exists (`icp-summary.md` §4b). |
| **WO** | W1 × O2 | **WO-2 — Convert the share-loop + cohort context into organic distribution.** The zero-brand weakness (W1) is attacked via the pre-assembled cohort audience (O2) + in-product share-links — the only affordable distribution for a solo team; instrument it so the loop is *observed*, not assumed (15 founder shares → first organic share is a milestone). |
| **WT** (minimize weakness, avoid threat) | W3 × T3 | **WT-1 — Reframe price against the *job*, and field a student/.edu price.** The $29-above-anchor weakness (W3) + the $9.99-Google-anchor threat (T3): never anchor price vs other apps; anchor vs the grade-stakes (a failed midterm / a $40–80/hr tutor, S11 §15) — and seriously consider a student/.edu discount to meet the $9.99 bar without dark patterns. *(Pricing decisions are SOP-PRODUCT-010, not decided here — this is the marketing-strategy input.)* |
| **WT** | W2 × T4 | **WT-2 — Treat accuracy as existential; ship the source-grounding + error-recovery discipline.** The accuracy-parity weakness (W2) × the incident threat (T4): every quiz item cites its source; wrong items are *flagged + correctable* not silently confident (S13 §14). One silent error is an uninstall. |

### 6.3 — Chosen strategic direction (which option set dominates)

The **SO + ST set dominates** — and they converge on a single coherent thesis (the framework's "consolidate into 4–6 directions" step):

> **Own the active-mastery-course-path white space (SO-1), reach the skeptical pre-assembled audience through learning-science authority (SO-2/SO-3), defend the position against free NotebookLM by competing only on the un-substitutable system + accumulated switching costs (ST-1/ST-2), make accuracy the brand (ST-3/WT-2), and de-risk the unproven WTP via the medicine co-beachhead N=10 (WO-1) before scaling spend.**

The **WO/WT set is the *gating discipline*** — the WTP and brand and price weaknesses are real and unproven, so the direction is **prove-then-scale**: the N=10 watch (R1) and the first organic share (W1) and the message-test against NotebookLM (R2) are *gates*, not afterthoughts. The diagnosis explicitly **does not** authorize scaling acquisition before R1/R2 are tested — that is the bridge to the 60-day HOW plan, which gates its 4 acquisition engines on **N=10 US-stranger activation ≥40%**.

**So-what:** SWOT confirms what the CPM, the perceptual map, and Porter all independently say — **the win condition is the system+authority+switching-cost moat sold into the white space, and the loss conditions are R1 (no pay) and R2 (free is enough).** The strategy is coherent across all five frameworks; it is also honestly *unproven at its two load-bearing joints.*

---

## 7. The two load-bearing risks (carried from the diagnosis)

Every framework above converges on the same two unknowns. They are restated here as the falsification conditions the downstream work must resolve — *this diagnosis is built to be killed by N=10 if it's wrong.*

| Risk | What it is | How each framework surfaces it | Falsified by |
|---|---|---|---|
| **R1 — WTP unproven** | At true-zero (0 paying strangers, 15 founder-only shares `[OBSERVED]`), the entire revenue thesis is a hypothesis. SOM (§1), the price CSF (§2), the white-space demand (§4), and W4 (§6) all sit on it. | SOM is gated on it (§1.4); CPM price cell is the weakest mitigable cell (§2.3); perceptual map "not every gap is demand" (§4.3); SWOT W4 + WO-1. | The **N=10 watch (SOP-PRODUCT-002)**: do deadline-bearers **pay at the first hard limit** (Free 600cr / 40pp / 30min / 5 sessions)? Proxy-instrumented via `learning_sessions` / `sources` / `onboarding_completed_at` since `quiz_attempts`/`activity_results` = 0 rows. |
| **R2 — free NotebookLM** | The strongest rival is free, Google-grade, and closing the gap (April-2026 mastery-tracking). It commoditized Ritsu's *original* product (§3). | CPM margin is only 0.21 and fragile (§2.2); the entire §3 teardown; perceptual-map crowding risk (§4.3); Porter's dominant Substitutes force (§5); SWOT T1 + ST-1. | The **message-test (60-day plan engine 3)**: does the PATH/mastery/learning-science pitch convert *against* a NotebookLM-free comparison? And the N=10 abandonment data: do users churn to NotebookLM-free at the limit (S14 §16)? |

---

## 8. What this foundation hands downstream (the contract)

This diagnosis is the **input** to the marketing execution layer — it is referenced, not re-derived, by:

- **The sibling marketing-strategy docs** (positioning-pillar, channel-strategy, value-proposition, pricing-strategy foundations): the CPM CSFs, the perceptual coordinate, and the SWOT option set are the shared fact-base.
- **`SOP-MARKETING-001-icp-discovery`** (the first US ICP-discovery sprint): the §3 NotebookLM teardown + §7 R1/R2 are the questions the discovery interviews must close.
- **The 60-day HOW plan's 4 acquisition engines:** SO-2/SO-3 (creator spine + content factory + authority) and ST-1 (the locked anti-NotebookLM comparison message) and the **N=10 activation ≥40% gate** are this doc's direct outputs.
- **`03-gtm/` channel-attribution + SOP-GTM-009:** the brand/distribution gap (W1, CPM cell 0.07) is the entire job; the persona S9-A 262-placement map is the tactical layer this strategic "where" feeds.
- **`10-metrics/`:** the SOM (§1), the CPM margin (§2.2), and the R1/R2 falsification conditions (§7) are the things the dashboard must track — explicitly with **proxies** (`learning_sessions`/`sources`/`onboarding_completed_at`), because the natural first-quiz-aha metric source (`quiz_attempts`, `activity_results`, `flashcard_reviews`) is **0 rows at true-zero**.

**The single sentence the whole diagnosis reduces to, for the GTM engines:** *We compete in the active-mastery-course-path white space; we win on the system + authority + switching-cost moat the free rivals lack; we lead every message with the PATH, never the quiz; and we prove R1/R2 with N=10 before we scale — because at true-zero, the win is a hypothesis, not a fact.*

---

## 9. Coherence & provenance

- **Coheres with (cites, never contradicts):** `00-core/product.md` (capabilities, §6 feature counts, §6.7 SERVQUAL accuracy-#1), `00-core/positioning.md` (§1 belief, §5 frame + segment, §6 preemptive POD, §11 comparison frames — the CPM/perceptual/SWOT all express the same belief), `00-core/icp-summary.md` (§0 wedge, §4b job-not-subject tiers + co-beachhead, R1/R2), `00-core/north-star.md` (§4 SOM arithmetic, the 100-paying milestone). The `00-core/charter.md` §2 VN-first framing is **superseded** by the US-led realignment in positioning/icp v1.x (this doc follows the canonical US-led WHAT-trio).
- **Built on:** `01-marketing/icp/persona-portrait.md` (S11 WTP, S12 competition, S13 SERVQUAL, S15 product-fit, S16 MASDA — the calibre bar and the competitive-intelligence source) and `01-marketing/icp/customer-journey.md` (5A).
- **Frameworks (Domont toolkit 09, `raw/consultant/toolkits/09-sales-marketing-pricing-communication/frameworks/`):** TAM/SAM/SOM, Competitive Profiling Matrix, Perceptual Map, Porter's Five Forces, SWOT — applied as the skeleton, filled with Ritsu reality.
- **Data tags:** `[OBSERVED]` = Door-2 pseudonymized `live.*` analytics (n≈25, ~24 founder/test; `knowledge/analytics-sync-contract.yaml`); `[INFERRED]` = external market research (HolonIQ, Coursera/Stanford/fast.ai enrolments, 2026 competitor pricing) + framework logic; `[HYPOTHESIS]` = untested. **WTP, activation, SOM, and all CPM scores are unproven pre-PMF.**
- **Verification cadence:** re-run on the N=10 results (R1/R2 settled), on a NotebookLM feature release (re-score the CPM + teardown), and at minimum quarterly (the ML-beachhead course surface rotates yearly; competitor prices drift).

---

*This document is the canonical answer to "where do we compete, and why will we win?" It is a diagnosis, not a destiny — every number is tagged, the two load-bearing bets (R1/R2) are flagged, and the whole thing is built to be falsified by N=10 before a dollar of acquisition spend scales. If a marketing or GTM decision contradicts this diagnosis, that is a signal — re-anchor to the win condition (the system + authority + switching-cost moat in the active-mastery-course-path white space) or open a PR to fix this doc.*
