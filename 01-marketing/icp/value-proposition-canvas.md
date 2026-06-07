---
title: "Ritsu Value Proposition Canvas — the deadline-bearing STEM/ML masterer"
type: value-proposition-canvas
pillar: 01-marketing
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Pillar-1 — Value Proposition Canvas (Osterwalder)"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 01-marketing/icp/persona-portrait.md
  - 01-marketing/icp/customer-journey.md
  - 00-core/product.md
  - 00-core/positioning.md
  - 00-core/icp-summary.md
  - 00-core/north-star.md
  - 00-core/charter.md
  - knowledge/analytics-sync-contract.yaml
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **The value-side foundation.** This is the Osterwalder Value Proposition Canvas (Strategyzer, *Value Proposition Design*, 2014) for the locked wedge. It pairs with `01-marketing/icp/persona-portrait.md` (the **need-side** — WHO, jobs/pains/gains) and renders the **value-side** explicit: which Ritsu capability relieves which top pain, and which capability creates which top gain. Where the persona answers *"who are they and what do they need?"*, this doc answers *"does what we ship actually fit that, where are the gaps, and which gaps must the roadmap close?"*
>
> **One-sentence purpose:** prove (or disprove) **problem–solution fit** on paper for the deadline-bearing STEM/ML masterer, so every downstream surface — homepage copy, ad messaging, the SOP-PRODUCT-002 stranger watch, the SOP-PRODUCT-010 pricing-pull-test — inherits a ranked, fit-checked map instead of a feature list.
>
> **Coherence contract:** this doc must not contradict the WHAT-trio — `00-core/product.md` (the capabilities), `00-core/positioning.md` (the belief + PODs/POPs), `00-core/icp-summary.md` (the segment). It is downstream of all three and of `persona-portrait.md`. If it drifts, the doc is the bug.
>
> **Honesty discipline (true-zero):** the **Customer Profile** (right side) is high-confidence — it is grounded in observed Door-2 analytics + the persona study. The **Fit** (does the value land?) is **problem–solution fit on paper, NOT product–market fit in the market.** The two load-bearing claims — *"they pay at the first hard limit"* (WTP) and *"first-quiz activation ≥40% on US strangers"* — are **UNPROVEN hypotheses** (0 real paying; 0 non-founder shares). Every fit-arrow is tagged for confidence, and §6 lists exactly what the N=10 watch must falsify.

---

## 0. How to read this canvas

The VPC has two halves that must be built **right-side first** (Osterwalder's #1 discipline — *complete the Customer Profile without thinking about your product, then fill the Value Map, then draw the fit arrows*; the canonical pitfall is filling the Value Map first and shipping a feature list):

```
            VALUE MAP  (Ritsu — the value-side)        ×        CUSTOMER PROFILE  (the masterer — the need-side)
   ┌─────────────────────────────────────────┐                ┌─────────────────────────────────────────┐
   │  Gain Creators        ──── address ───►  │                │   ◄──── ranked  Customer Gains            │
   │  Products & Services   (the offer)        │  ◄── FIT ──►   │             Customer Jobs   (the center)  │
   │  Pain Relievers       ──── address ───►  │                │   ◄──── ranked  Customer Pains            │
   └─────────────────────────────────────────┘                └─────────────────────────────────────────┘
```

- **§1 Customer Profile** — Jobs (§1.1), Pains (§1.2 ranked by severity), Gains (§1.3 ranked by importance). Lifted from `persona-portrait.md` S5/S10/S11/S13.
- **§2 Value Map** — Products & Services (§2.1), Pain Relievers (§2.2), Gain Creators (§2.3). Lifted from `product.md` §6.
- **§3 The Fit** — the arrows: top pains → relievers, top gains → creators, with a confidence + an evidence tag on each.
- **§4 Fit scorecard + gaps** — the explicit Osterwalder fit-check tables (top-3 pains addressed Y/N, top-3 gains created Y/N) + the gaps the roadmap owes.
- **§5 The value-proposition statement** that falls out of the canvas.
- **§6 What is still a hypothesis** — the unproven arrows + the N=10 falsification plan.

Segment in one line (from `icp-summary.md` §0): **the deadline-bearing STEM/ML masterer** — a US-led, English-speaking learner gripping a hard, graded, multi-week course (ML/AI beachhead: cs231n / MIT 6.S191 / Andrew Ng / fast.ai) who must *truly master* dense material before a real deadline, believes "I'm not smart enough," is wrong (their method is), and will pay to actually learn. WTP ~$15–25/mo, deadline-gated, **UNPROVEN**.

---

## 1. CUSTOMER PROFILE  (the need-side — build this first)

> Source: `persona-portrait.md` S5 (Jobs-to-be-Done, 21 attrs), S10 (Pains/Triggers/Objections, 20 attrs), S11 (WTP, 19 attrs), S13 (SERVQUAL, 14 attrs). Confidence tags carried through: **Obs** = observed in Door-2 analytics; **Inf** = inferred from canonical docs; **Hyp** = hypothesis to test.

### 1.1 Customer Jobs (functional / emotional / social — what they're hiring Ritsu to do)

Osterwalder ranks jobs by **how important getting it done is to the customer.** For this persona, the functional job is top-3 life priority *in-term* (`persona` S5#16) and the emotional job is the deepest hook (`positioning.md` §1 belief, `icp-summary.md` §1).

| Rank | Job (layer) | The job, in the customer's situation | Conf |
|---|---|---|---|
| **J1** | **Functional (core)** | *"Convert a dense, multi-week STEM/ML course (200-page reader + 12 lecture-hours) into recallable, exam-ready mastery before the graded midterm/final."* The job is **mastery of a hard course**, not "make me some quizzes." | Obs · 84% |
| **J2** | **Emotional (deepest)** | *"Replace the dread of 'I'm not a math-science person' with earned confidence — feel genuinely capable, not just busy re-reading."* The strongest emotional move is **"you were never the problem — your method was."** | Inf · 64% |
| **J3** | **Functional (supporting)** | *"Stop spending 90 min of every 3-hour 'study' block on tool overhead — building Anki cards, hunting Quizlet decks, pasting into ChatGPT."* Automate the painful setup so time goes to the productive work. | Obs · 82% |
| **J4** | **Functional (path)** | *"Know what to master, in what order, across a multi-week course — a structured path, not a pile of chapters."* The job NotebookLM does **not** do. | Hyp · 50% |
| **J5** | **Social** | *"Be seen by my cohort / professor as someone who actually gets it — can explain it back, not just pass."* (#studytwt norms; explain-back as status.) | Hyp · 46% |
| **J6** | **Functional (durability)** | *"Master it so it survives the exam — apply it weeks later, not cram-and-dump."* Distinguishes the durable masterer from the one-shot crammer. | Inf · 64% |
| **J7** | **Functional (multi-source fusion)** | *"Fuse textbook + slides + lecture video + problem sets into ONE tracked mastery project."* Observed: 32 multi-source projects, 3,329 generated units. | Obs · 80% |

**The center of the canvas.** J1 (master the hard course before the deadline) is the functional job the whole Value Map must serve; J2 (feel capable, not dumb) is the emotional job that produces *love* (the north star), not just use. A value proposition that nails J1 but ignores J2 will be *used and churned*; one that nails both is *loved and referred*.

### 1.2 Customer Pains (ranked by severity — obstacles, risks, frustrations doing the job)

Osterwalder: rank pains by severity; the top pains are where the most important Pain Relievers must aim. Severity here is dominated by **deadline-proximity** — pains are "hair-on-fire" 1–2 weeks before a graded checkpoint, mild between (`persona` S10#4 — the WTP on/off cycle).

| Rank | Pain | Severity | The pain, concretely | Conf |
|---|---|---|---|---|
| **P1** | **Passive re-reading doesn't stick** | 🔴 Extreme | *Re-reads dense PDFs/slides for hours but nothing passes back — fails the midterm despite "studying."* The failed method, felt as personal inadequacy. | Inf · 64% |
| **P2** | **Building active-recall materials is hours of grunt work** | 🔴 Extreme | *Hand-building Anki cards / practice problems from a 200-page reader is hours of setup BEFORE any learning.* Observed via PDF-heavy uploads (63%). | Obs · 82% |
| **P3** | **Accuracy risk — a hallucinated quiz teaches the wrong thing** | 🔴 Extreme | *"If it hallucinates one wrong answer, I learn it wrong before my exam — I can't verify 50 cards."* The #1 kill-risk (zero tolerance, `persona` S13#1). | Inf · 66% |
| **P4** | **No structured PATH through a hard multi-week course** | 🟠 High | *Doesn't know what to master, in what order, before the deadline — has a pile of chapters, not a plan.* This is the NotebookLM-gap (the POD lever). | Hyp · 50% |
| **P5** | **The frankenstack is fragmented + no tracking** | 🟠 High | *ChatGPT + Anki + Quizlet + YouTube + re-reading — five tabs, no path, no memory of what's mastered.* ~$25–100/mo of partial tools. | Inf · 62% |
| **P6** | **Time is finite and the deadline is fixed** | 🟠 High | *"I'm already 3 lectures behind on cs231n with a midterm in 5 days"* — the struggling moment (`persona` S5#4). | Obs · 80% |
| **P7** | **No cross-session mastery memory** | 🟡 Medium | *No per-course memory of what's been mastered across sessions — every session restarts cold.* A stated deal-breaker (`persona` S10#15c). | Inf · 62% |
| **P8** | **Price anxiety vs a free clone** | 🟡 Medium | *"$29/mo when NotebookLM is free, ChatGPT Plus $20, Anki $0"* — must justify a premium over a free clone of the spine. | Inf · 64% |
| **P9** | **Freemium-trap distrust + IP/upload worry** | 🟡 Medium | *"Is free real or a paywall before any value?"* + *"My copyrighted textbook / paid-bootcamp slides — does it stay private?"* | Inf · 56% |

> **The two existential pains for *fit*** are **P3 (accuracy)** and **P4 (path)**. P3 is the credibility floor — fail it and nothing else matters (it is the #1 SERVQUAL determinant, `product.md` §6.7). P4 is the **differentiation ceiling** — it is the one top pain the free shadow-rival NotebookLM does **not** relieve, so it is where Ritsu's Pain Reliever must be visibly stronger.

### 1.3 Customer Gains (ranked by importance — the outcomes they desire)

Osterwalder: rank gains by importance; gains range from *required* (the offer is useless without it) to *nice-to-have*. Gain Creators must aim at the **required** + **expected** gains first.

| Rank | Gain | Type | The desired outcome | Conf |
|---|---|---|---|---|
| **G1** | **Durable mastery that survives the exam** | Required | *"I can solve an unseen problem cold under time pressure, weeks later"* — the success criterion (`persona` S5#9). | Inf · 64% |
| **G2** | **Earned confidence — "I'm capable after all"** | Required | *The reframe lands: "I thought I wasn't smart enough for engineering — turns out I just needed a better way to learn."* The emotional payoff = the love signal. | Inf · 64% |
| **G3** | **Value in the first session (<60s magic moment)** | Expected | *"I need to feel it work before I commit — I'm already behind, no afternoon to learn 17 activity types."* Activation = the strongest retention predictor. | Obs · 84% |
| **G4** | **Time-compression on material creation** | Expected | *Auto-quizzes from a 60-page PDF in 30s instead of an hour of Anki* — the 90 min/session of tool overhead, reclaimed. | Obs · 82% |
| **G5** | **One stack replaces five tools** | Expected | *Consolidate ChatGPT Plus + Quizlet + Anki-time + tutoring into one surface* — and *save money* doing it. | Inf · 62% |
| **G6** | **A trustworthy view of "what's left to master"** | Desired | *A mastery-progression heatmap + concept map they believe is real* — sees the gaps, tracks the path. | Hyp · 48% |
| **G7** | **Feel seen as rigorous, not gimmicky** | Desired | *Use AI to get sharper, not lazier — an identity-fit a method-distrusting learner is proud to be associated with.* | Inf · 66% |
| **G8** | **Grade / credential / career-gate outcome** | Required (ultimate) | *Ace the graded assessment* — the external proof the job was done; what justifies the spend ($29 vs a failed midterm). | Inf · 62% |

> **Required gains = G1, G2, G8.** A Ritsu that delivers G3–G7 (fast, time-saving, consolidated, trackable, rigorous) but fails G1/G2/G8 (no durable mastery, no felt confidence, failed the exam) is a *pleasing product* (high comfort, low durable benefit) — the exact trap `product.md` §4 warns against. The canvas must show Gain Creators aimed at the **required** gains, not just the easy expected ones.

---

## 2. VALUE MAP  (the value-side — Ritsu's offer)

> Source: `00-core/product.md` §6 (capabilities, verified live 2026-05-28) + §7 (the three-step flow). Counts are pinned to that snapshot (12+ formats, 17+ activities, 7 modes, 10 personalities) — fetch ritsu.ai for the authoritative current lists.

### 2.1 Products & Services (the bundle the customer engages)

The actual product, core-value-first (Kotler three-product-levels, `product.md` §6.0):

- **PS1 — Universal input (12+ formats):** drop a PDF, PPTX, DOCX, YouTube, web URL, Markdown, code, image → Ritsu ingests it. (`product.md` §6.1)
- **PS2 — The <60s magic-moment flow:** upload → ~30s structured learning path auto-built (topics difficulty-ordered) → first auto-generated quiz. (`product.md` §7) — **the activation event.**
- **PS3 — 17+ activity types:** Quiz, Flashcard, Mindmap, Timeline, Crossword, Drag-and-drop, Diagram, Code exercise, Match — all auto-generated from *the user's own* material, not templates. (`product.md` §6.2)
- **PS4 — 7 tutoring modes:** Ask Me (explain-back), Exercise (solve step-by-step), Solve (real scenarios), Upthink, Adaptive (+2). (`product.md` §6.3)
- **PS5 — Mastery engine + Knowledge Map:** concept maps connecting ideas across chapters; Compare / Analogies / Deep-Explain / Feynman breakdowns; a visual concept-level map (Basic @ Plus, Full @ Pro). (`product.md` §6.4)
- **PS6 — Mastery tracking (progress heatmap + cross-session memory):** persistent per-course state of what's mastered, across sessions/devices. (`product.md` §6, augmented product)
- **PS7 — Source-grounding / accuracy discipline:** explanations cite the exact slide/page/timestamp from the user's upload — "grounded, not guessed." (`product.md` §6.7 SERVQUAL assurance)
- **PS8 — Emotional-AI (10 personalities):** Funny / Supportive / Nerdy / Chill / Energetic / Sarcastic (+4); milestone encouragement. Free gets 3; Plus+ gets 10. (`product.md` §6.5)
- **PS9 — Freemium on-ramp + tiers:** Free $0 (600 credits, 40-page / 30-min-video / 5-session limits) → Plus $29 → Pro $59 → Ultra $119. (`product.md` §10, verified 2026-05-29)
- **PS10 — Share-links (the viral loop):** generate a shareable quiz / Knowledge Map for a coursemate. (`product.md` §7, PLG engine)

### 2.2 Pain Relievers (how each capability kills a specific pain)

| ID | Pain Reliever | Kills | How (mechanism) |
|---|---|---|---|
| **R1** | **Auto-generated active-recall from any source** | P1, P2 | Replaces passive re-reading with quizzing/explain-back (PS3+PS4) and removes the hours of card-building (PS1+PS2) — the active method that sticks, with zero setup. |
| **R2** | **Source-grounded, cited output** | P3 | Every quiz/explanation cites the exact page/slide/timestamp (PS7); accuracy is the #1 product investment (`product.md` §6.7). The literal answer to *"will it hallucinate my quiz?"* |
| **R3** | **Auto-built structured multi-week PATH** | P4 | The 30s flow orders topics by difficulty into a path (PS2+PS5) — turns a pile of chapters into a plan. The NotebookLM-gap reliever. |
| **R4** | **One surface replaces the five-tab stack** | P5 | 17 activities + 7 modes + tracking in one product (PS3/4/6) — no ChatGPT-paste + Anki + Quizlet + Notion stitching. |
| **R5** | **Fast generation under deadline pressure** | P6 | <30s to first activity from a 60-page PDF / long video (PS2) — beats the 30+ min Anki alternative when there are 5 days left. |
| **R6** | **Cross-session mastery memory** | P7 | Persistent per-course mastery state (PS6) — sessions resume, don't restart cold. |
| **R7** | **"More-for-more" value + transparent freemium** | P8, P9 | Plus $29 replaces a $25–100 stack (so paying *saves* money); Free delivers a full mastery loop on one real chapter before any wall (PS9); no-dark-patterns + "your material stays private" (`charter.md` §3, `transparency.md`). |

### 2.3 Gain Creators (how each capability produces a desired outcome)

| ID | Gain Creator | Produces | How (mechanism) |
|---|---|---|---|
| **C1** | **The full active-learning loop (17 activities × 7 modes)** | G1 | Forces retrieval, application, and explain-back — the active practice that creates *durable* mastery, not a crammed pass (PS3+PS4). |
| **C2** | **The "method, not ability" reframe, delivered by the product** | G2, G7 | The product *proves* "you can do this" by making them succeed at active recall — encouraging-but-rigorous tone (PS8) earns the reframe without gimmickry. |
| **C3** | **The <60s magic moment** | G3 | Upload → 30s path + first quiz that finds a real gap → *"wait, this actually works"* — value in session #1 (PS2). |
| **C4** | **30-second material generation** | G4 | Auto-quizzes/cards/maps from one upload — reclaims the 90 min/session of tool overhead (PS1+PS3). |
| **C5** | **Consolidated stack at lower cost** | G5 | One $29 surface for what five tools cost $25–100 (PS9) — replaces the spend AND the friction. |
| **C6** | **Knowledge Map + progress heatmap** | G6 | A visible concept-level mastery view + heatmap (PS5+PS6) — "here's what you've mastered and what's left." |
| **C7** | **Learning-science authority + citations** | G7, G2 | Named techniques (active recall, spaced repetition, Feynman, concept maps) + transparent citations (PS5+PS7) — the identity-fit for a rigor-respecting learner. The **preemptive** moat (`positioning.md` §6). |
| **C8** | **Aced the graded assessment** | G8 | The compound outcome of C1–C7 — durable mastery → the grade/credential/career-gate result that justifies the spend. |

---

## 3. THE FIT  (the arrows — does the value land on the top needs?)

> Osterwalder's "achieve Fit" step: confirm the most important Pain Relievers address the most severe Pains, and Gain Creators address the most important Gains. Each arrow carries a **confidence** (how sure we are it lands) and an **evidence tag** (Obs/Inf/Hyp). **Fit here = problem–solution fit on paper, NOT proven in the market** (§6 lists what's still a hypothesis).

### 3.1 Pain → Reliever fit (severity-ranked)

| Pain (rank) | Severity | ◄── Pain Reliever | Fit strength | Evidence |
|---|---|---|---|---|
| **P1** passive re-reading doesn't stick | 🔴 | **R1** auto active-recall | ✅ **Strong** — direct mechanism match (active beats passive) | Inf · 64% |
| **P2** card-building is grunt work | 🔴 | **R1** auto-generation | ✅ **Strong** — zero-setup is the literal fix | Obs · 82% |
| **P3** hallucinated quiz risk | 🔴 | **R2** source-grounded + cited | ⚠️ **Strong-on-design, UNPROVEN-in-market** — fit depends on *actual* accuracy on dense math/pharma; one visible hallucination = instant churn | Inf · 66% · **must verify** |
| **P4** no structured path | 🟠 | **R3** auto-built multi-week PATH | ✅ **Strong + differentiating** — the one top pain NotebookLM doesn't relieve (the POD) | Hyp · 50% |
| **P5** fragmented frankenstack | 🟠 | **R4** one-surface replacement | ✅ **Strong** — consolidation is the design intent | Inf · 62% |
| **P6** finite time / fixed deadline | 🟠 | **R5** <30s generation | ✅ **Strong** — speed is the deadline-window value | Obs · 80% |
| **P7** no cross-session memory | 🟡 | **R6** mastery memory | ✅ **Good** — persistent state matches the deal-breaker | Inf · 62% |
| **P8** price vs free clone | 🟡 | **R7** more-for-more + saves-money | ⚠️ **Contested** — the arrow is *rational* (replaces $25–100) but the hostile anchor is **Google AI Pro student $9.99 + free NotebookLM**; fit is a WTP bet, not a given | Inf · 64% · **must verify** |
| **P9** freemium-trap + IP worry | 🟡 | **R7** transparent free + privacy | ✅ **Good** — no-dark-patterns + privacy guarantee match the worry | Inf · 56% |

### 3.2 Gain → Creator fit (importance-ranked)

| Gain (rank) | Type | ◄── Gain Creator | Fit strength | Evidence |
|---|---|---|---|---|
| **G1** durable mastery | Required | **C1** active-learning loop | ✅ **Strong** — the product *is* the active method | Inf · 64% |
| **G2** earned confidence | Required | **C2** the reframe + **C7** authority | ✅ **Strong-on-design** — the emotional payoff is the love mechanism; lands only if G1 lands first | Inf · 64% |
| **G3** value in session #1 | Expected | **C3** <60s magic moment | ✅ **Observed** — dense first-uploads + 30s path observed in analytics | Obs · 84% |
| **G4** time-compression | Expected | **C4** 30s generation | ✅ **Observed** — 3,329 units across 656 sessions | Obs · 82% |
| **G5** one stack, lower cost | Expected | **C5** consolidation | ✅ **Strong** — replaces ChatGPT-Plus + Quizlet slot first | Inf · 62% |
| **G6** trustworthy "what's left" view | Desired | **C6** Knowledge Map + heatmap | ✅ **Good** — but trust in the heatmap-as-real is unproven | Hyp · 48% |
| **G7** seen as rigorous | Desired | **C7** learning-science + citations | ✅ **Strong + preemptive** — the compounding-authority moat | Inf · 66% |
| **G8** aced the assessment | Required (ultimate) | **C8** = compound of C1–C7 | ⚠️ **UNPROVEN** — the ultimate outcome no one has yet demonstrated with Ritsu (0 paying through a real graded cycle) | Inf · 62% · **must verify** |

### 3.3 Fit heat-map (one glance)

```
            R1   R2   R3   R4   R5   R6   R7        (Pain Relievers)
   P1  🔴   ███                                     ✅ strong
   P2  🔴   ███                                     ✅ strong
   P3  🔴        ▓▓▓                                ⚠ design-strong / market-UNPROVEN  ← existential
   P4  🟠             ███                           ✅ strong + DIFFERENTIATING        ← the POD
   P5  🟠                  ███                       ✅ strong
   P6  🟠                       ███                  ✅ strong
   P7  🟡                            ██              ✅ good
   P8  🟡                                 ▓▓         ⚠ WTP bet (vs $9.99 / free)       ← existential
   P9  🟡                                 ██         ✅ good

            C1   C2   C3   C4   C5   C6   C7   C8    (Gain Creators)
   G1  req  ███                                       ✅ strong
   G2  req       ███                          ███     ✅ strong (downstream of G1)
   G3  exp            ███                              ✅ observed
   G4  exp                 ███                         ✅ observed
   G5  exp                      ███                    ✅ strong
   G6  des                           ██               ✅ good (trust unproven)
   G7  des                                ▓▓   ███     ✅ strong + preemptive
   G8  req(★)                                    ▓▓▓   ⚠ UNPROVEN (no paying cycle yet)
```
`███` strong/observed fit · `▓▓▓` designed fit, market-unproven · `██` good fit

---

## 4. FIT SCORECARD + GAPS  (the Osterwalder fit-check, made decision-grade)

### 4.1 The canonical fit-check (top-3 pains addressed Y/N · top-3 gains created Y/N)

| Fit-check | Addressed? | Verdict |
|---|---|---|
| **Top pain P1** (passive re-reading) | **Y** (R1) | Strong design fit, low market risk |
| **Top pain P2** (card grunt-work) | **Y** (R1) | Strong design fit, observed in usage |
| **Top pain P3** (accuracy) | **Y on design / UNPROVEN in market** (R2) | **Conditional** — the floor; verify on dense STEM/ML |
| **Top gain G1** (durable mastery) | **Y** (C1) | Strong design fit |
| **Top gain G2** (earned confidence) | **Y** (C2/C7) | Strong, contingent on G1 |
| **Top gain G8** (aced the assessment) | **UNPROVEN** (C8) | **The headline gap** — no demonstrated win through a real graded cycle |

**Scorecard verdict:** the canvas shows **strong problem–solution fit on paper** on 7 of 9 pains and 7 of 8 gains. **Fit is GATED on three unproven arrows** — P3 (accuracy delivered), P8 (WTP at the price), G8 (the assessment actually aced). These three ARE the wedge's load-bearing risks (`icp-summary.md` R1/R2; `persona` S11#19). The canvas is therefore a **falsifiable map**, not a victory lap.

### 4.2 Differentiation fit — where the value-side beats the shadow rival

The fit that matters competitively is **vs free Google NotebookLM** (the shadow rival; does doc→quiz→grounded-explanation→share + Apr-2026 basic mastery-tracking + Socratic Learning Guide). Ritsu wins ONLY where its Pain Relievers / Gain Creators relieve a top need NotebookLM does **not**:

| Need | NotebookLM (free) | Ritsu | Ritsu's winning lever |
|---|---|---|---|
| P1/P2 active recall from a doc | ✅ does it | ✅ does it | **PARITY — do not lead here** ("we also make quizzes" loses) |
| **P4 structured multi-week PATH** | ❌ flat Q&A, no ordered path | ✅ **R3** difficulty-ordered path | ★ **LEAD** — the POD |
| J7 / depth: 17 activities × 7 modes | ❌ quiz/flashcard/guide | ✅ **PS3/PS4** 17×7 | ★ **LEAD** — depth |
| **G6 concept-level mastery map** | ⚠️ basic tracking (Apr-2026) | ✅ **C6** Knowledge Map (cross-chapter) | ★ **LEAD** — concept-level, not page-level |
| **G7 learning-science authority** | ❌ generic AI | ✅ **C7** named methods + citations | ★ **LEAD + preemptive** — authority compounds |
| P3 accuracy | ✅ source-grounded | ✅ source-grounded | **PARITY (must hold)** — can't win on it, must not lose on it |
| P8 price | ✅ **$0** | $29 | ❌ **Ritsu loses on price** — the value case must out-weigh free |

> **The single most important fit insight for messaging:** the canvas's *winning* arrows are **R3 (path), depth (17×7), C6 (concept map), C7 (authority)** — never the parity arrows. Every downstream surface (homepage, ads, the SOP-GTM message tests) must lead with the four ★ LEAD rows. Leading with "we make quizzes" surrenders the fit to a free product. This operationalizes `icp-summary.md` R2 and `positioning.md` §6 ("never 'we also make quizzes'").

### 4.3 The gaps the canvas surfaces (Osterwalder: gaps = roadmap input)

| Gap | Which arrow is weak | Owner / next step |
|---|---|---|
| **Accuracy on dense STEM/ML is asserted, not proven** | R2 → P3 | `04-product` — the SOP-PRODUCT-002 N=10 watch must log zero visible hallucinations on cs231n/orgo/pharma material; med co-beachhead doubly stress-tests it. The deal-breaker (`persona` S10#15a). |
| **WTP at $29 vs $9.99/free is a bet** | R7 → P8 | `02-sales` — SOP-PRODUCT-010 pricing-pull-test + the N=10 "pay-at-first-limit" watch. The $9.99 Google AI Pro student SKU is the hostile anchor (`persona` S11#5). |
| **No demonstrated "aced the exam" proof (G8)** | C8 | `05-customer` — capture the first real graded-cycle win as a testimonial (Collison install, SOP-CUSTOMER-006); without it, G2/G8 stay theoretical. |
| **Path quality on dense math (LaTeX/figures) unverified** | R3 → P4 | `04-product` — first-upload generation quality on dense math PDFs is a stated friction (`persona` S7#10); the POD reliever fails if ingest breaks. |
| **Trust in the mastery heatmap-as-real (G6) unverified** | C6 → G6 | `04-product` — the heatmap must feel like real mastery, not a vanity bar (`persona` S8#10). |
| **Free→paid trigger mechanics (the wall) unobserved** | R7 → P8 | `02-sales` — Free 40-page/5-session wall as the upgrade trigger is the unproven R1 moment (`persona` S11#12). |

---

## 5. THE VALUE PROPOSITION STATEMENT  (what falls out of the canvas)

The canvas resolves to a value proposition aimed at the **required gains (G1/G2/G8)** and the **existential + differentiating pains (P3/P4)** — and deliberately NOT at the parity capability:

> **For the deadline-bearing STEM/ML masterer** gripping a hard, graded, multi-week course they must truly understand before a real deadline — *and who believes they're "not smart enough" when the truth is their method (passive re-reading) was wrong* — **Ritsu turns the course into a structured multi-week path of active-recall practice in 30 seconds**, so they **master it (and prove it on the exam), not just cram it.** Unlike free doc-to-quiz tools, Ritsu delivers the **ordered path + 17 activity types + a concept-level mastery map, grounded in learning science** — not just quizzes. *Because AI can't learn for you; the right system makes you learn 10×.*

- **Trace to the belief** (`positioning.md` §1): "active mastery, AI-leveraged." ✅
- **Substitution test** (`positioning.md` §3): swap "Ritsu" → "NotebookLM" and the **path + 17 activities + concept-level map + learning-science** clause breaks. ✅ (the parity clause "make quizzes" would survive the swap — which is exactly why it is excluded.)
- **Three Kotler value domains** (`positioning.md` §8): functional (path + activities + 30s) · psychological (the reframe, exam-anxiety relief — G2) · monetary (replaces the $25–100 stack — G5). ✅
- **One-line message-market match** (`persona` S8#13): *"Turn your hardest course into a structured path that makes you master it before the deadline — not just cram it."*

---

## 6. WHAT IS STILL A HYPOTHESIS  (the honest line at true-zero)

The Customer Profile is grounded in observed behavior; the **Fit's three load-bearing arrows are unproven.** This is **problem–solution fit on paper awaiting product–market validation.**

**Observed (Door-2 analytics — the strong half of the canvas):**
- The functional job + the pains are real-behavior-grounded: PDF 63% + YouTube 16% material mix; **656 learning_sessions**; a heavy-mastery revisit tail (42 sources / 36 sessions; mean ~26 sessions/user) — the multi-session-per-source revisit IS the mastery tell (J1, P1, P2, G3, G4 land on observed usage).
- The magic moment fires: dense first-uploads → ~30s path → 3,329 generated units (G3/C3 observed).
- **Critical caveat — the activation aha is a PROXY, not a measured event.** `live.quiz_attempts`, `activity_results`, `flashcard_reviews` = **0 rows** (Sprint 5 synced the *tables*, but they carry no data at true-zero). So "first-quiz aha" cannot be measured directly — the activation proxy must be built from what IS logged: **learning_sessions / activities_completed / onboarding_completed_at** (per the task's Door-2 reality + `analytics-sync-contract.yaml`). The SOP-CUSTOMER-002 activation instrumentation must define this proxy explicitly.
- All 25 profiles are founder/test; **session_shares = 15, all founder-only**; **payments(paid) = 2, founder test card.** → *Engagement is observed; payment and organic referral are NOT.*

**UNPROVEN (the fit arrows the N=10 watch must falsify):**
1. **WTP — "they pay at the first hard limit" (R7 → P8, G8).** 0 real paying. The $29 sits *above* the ~$15–25 anchor and the hostile $9.99 Google-AI-Pro-student / free-NotebookLM line. → **SOP-PRODUCT-010 pricing-pull-test + the N=10 pay-at-first-limit watch** (`icp-summary.md` R1; `persona` S11#19).
2. **Activation — "first-session aha ≥40% on US strangers" (C3 → G3).** Observed for the founder; **unobserved for US strangers** (the gate the 60-day plan rests on). → **SOP-PRODUCT-002 stranger-recruit-and-watch (N=10 US testers)** with the proxy above.
3. **Accuracy — "no visible hallucination on dense STEM/ML" (R2 → P3).** Asserted by design (#1 SERVQUAL investment); unverified on real cs231n/orgo/pharma at scale. One visible hallucination resets trust (`persona` S13#2). → logged in the same N=10 watch; med co-beachhead stress-tests it hardest.
4. **The differentiating reliever — "the path beats free" (R3 → P4).** The POD on paper; unproven that US strangers *perceive* and *pay for* the path over a free clone. → the message-fit acquisition engine + the watch must show path-perception drives the upgrade.

> **Falsification rule (decision-grade):** if the N=10 watch shows **activation < 40%** OR **0/10 pay at the first hard limit**, the canvas's Fit is **disconfirmed for this wedge** — re-anchor to the psychographic core (per `icp-summary.md`) and re-run the canvas (the med/pre-med co-beachhead is the pre-staged alternative profile, since its WTP is *already* demonstrated next door at $300–500 for UWorld/Anki/Sketchy). The canvas is the hypothesis; the watch is the test.

---

## 7. How downstream artifacts consume this canvas

| Consumer | What it takes from here |
|---|---|
| **Homepage / ad copy** (`01-marketing`, `positioning.md`) | §4.2 ★ LEAD rows (path / 17×7 / concept-map / authority) — lead with these, never the parity arrow. §5 statement. |
| **SOP-PRODUCT-002 stranger watch** (`04-product`) | §6 hypotheses #2/#3 — instruments activation proxy + accuracy on N=10 US strangers (+ med co-beachhead). |
| **SOP-PRODUCT-010 pricing-pull-test** (`02-sales`) | §6 hypothesis #1 + §4.3 WTP gap — the $29-vs-$9.99/free bet. |
| **SOP-CUSTOMER-002 activation instrumentation** (`05-customer`) | §6 — the activation PROXY definition (learning_sessions/activities_completed/onboarding) since quiz_attempts = 0 rows. |
| **SOP-CUSTOMER-006 Collison install** (`05-customer`) | §4.3 G8 gap — capture the first real "aced the exam" testimonial. |
| **Message-fit acquisition engine** (the 60-day plan) | §4.2 differentiation table — the path-over-free perception is what the paid-message-fit engine must validate. |

---

## 8. Coherence + provenance

- **Coheres with:** `persona-portrait.md` (this is its value-side mirror — jobs/pains/gains lifted directly from S5/S10/S11/S13); `product.md` §6 (the Value Map IS the capability list, benefit-tagged); `positioning.md` §1/§3/§6/§8 (belief, substitution test, PODs, three value domains); `icp-summary.md` §0/§4/§8 (segment, wedge, R1/R2); `north-star.md` §1 (the loved-100 = the True-friends quadrant this fit produces).
- **Does NOT contradict** the WHAT-trio — it is strictly downstream of product/positioning/icp.
- **Confidence posture:** Customer Profile high (Obs/Inf, persona-grounded); Fit conditional (3 arrows UNPROVEN); WTP + activation = explicit hypotheses tagged throughout.
- **Method:** Osterwalder VPC (Strategyzer 2014) as skeleton; STP (Kotler) supplies the segment definition the profile is built on. Customer-Profile-first discipline observed (§1 before §2).

---

*This canvas is the canonical answer to "does what we ship fit who we serve, and where doesn't it?" It is decision-grade on the need-side and falsifiable on the value-side. If a product or marketing decision contradicts a top-pain → reliever arrow, that's a signal — fix the surface, or open a PR to fix this canvas. The fit is a hypothesis until the N=10 watch confirms the three unproven arrows; treat it accordingly.*

---

## 9. Domont Pillar-1 coverage check — the 8 sub-components (image-validated 2026-06-07)

> The founder's Domont reference image lists **8 sub-components** for Pillar-1 "Product/Service Positioning & Value Proposition." This section closes the loop: where each is covered, and the genuine gaps this canvas now fills. (Auditor for Pillar-1 was reconstructed by the orchestrator after the fan-out agent did not return.)

| # | Domont sub-component | Status | Where / note |
|---|---|---|---|
| 1 | Target market | **full** | `00-core/icp-summary.md` + this canvas §1 (Customer Profile) — the deadline-bearing committed STEM/ML masterer |
| 2 | Product/service offering | **full** | this canvas §2.1 + `00-core/product.md` §6 (the universal input + 17 activities + 7 modes + mastery engine) |
| 3 | Product life cycle | **gap → filled below** | not previously analyzed → §9.1 |
| 4 | Positioning: key attributes · customer benefits · USP | **full** | `00-core/positioning.md` (belief/POD/POP/USP registry) + this canvas §4.2 (differentiation fit) |
| 5 | Value proposition | **full** | this canvas §5 (the value-proposition statement) |
| 6 | Product packaging & design | **adapted → cross-ref §9.2** | "packaging" = the credit-tier bundling (`02-sales/strategy/pricing-architecture.md`); "design" = `00-core/design-system/` (Electric-Cyan DESIGN.md) |
| 7 | Product bundling | **adapted → cross-ref §9.2** | the Free/Plus/Pro/Ultra credit + feature bundles live in `pricing-architecture.md`; not re-derived here |
| 8 | Customer feedback integration | **partial → §9.3** | the feedback→product loop (`05-customer/.../SOP-CUSTOMER-021`) + this canvas §4.3 (gaps = roadmap input) + the N=10 watch |

### 9.1 Product Life Cycle stage — Ritsu is at INTRODUCTION (the most expensive stage to misread)
Per the Domont PLC framework, the most costly error is classifying a product into the wrong stage and investing accordingly. **Ritsu is unambiguously at the INTRODUCTION stage** — true-zero (0 paying ever; 25 founder/test profiles; dormant since 2026-05-27 [observed via Door-2]). The PLC implications, which every Pillar decision must honor:
- **Goal of the stage = ACTIVATION + first proof, not scale.** Spend buys *learning* (the N=10 watch), not volume. This is exactly why the 60-day plan gates engine ACTIVATE on N=10≥40% rather than firing paid at scale.
- **Pricing at Introduction** = penetration-friendly freemium to remove trial friction (Free 600 credits), NOT skimming — the WTP is unproven and the rival (NotebookLM) is free. (See `pricing-architecture.md`.)
- **Product investment** = depth on the wedge (the multi-week PATH + accuracy on dense math), not breadth of activity types — breadth is a Growth-stage move.
- **The risk** = mistaking founder-market-fit (N=1) for product-market-fit and prematurely scaling. The whole study is built to prevent exactly this.

### 9.2 Packaging, design & bundling — where they live (not re-derived here)
"Product packaging & design" and "bundling" are **deliberately owned by sibling foundations**, to keep one source of truth: the **credit-tier bundling** (what Free/Plus/Pro/Ultra each unlock + why) is the value-ladder in `02-sales/strategy/pricing-architecture.md`; the **visual design system** (logo, palette, typography that "package" the product) is `00-core/design-system/ritsu/DESIGN.md`. This canvas supplies the *value* each bundle must deliver (the §2 value map); pricing-architecture supplies the *boundaries*. A change to a tier boundary that breaks a top-pain→reliever arrow (e.g. gating the multi-week PATH behind a paywall the masterer hits mid-course) is a coherence violation — fix the boundary.

### 9.3 Customer feedback integration — the loop that re-authors this canvas
At true-zero the value-side is a hypothesis (§6). The feedback-integration mechanism that converts it to fact: **(a)** the N=10 stranger-watch (`SOP-PRODUCT-002`) — observed pay/no-pay + which pains actually bite; **(b)** the founder's 30-paying Collison interviews (`SOP-CUSTOMER-006`) — real audience language replacing the `[inferred]` job/pain/gain labels; **(c)** the standing feedback→product pipeline (`SOP-CUSTOMER-021` + in-app NPS / cancel-flow). Each is a write-back into THIS canvas: when observed data contradicts a ranked pain or a fit arrow, open a PR to this file. The canvas is not a one-time artifact — it is the living need-side truth the feedback loop keeps honest.

**Verdict:** Pillar-1 is **fully covered** against the 8-item Domont checklist — 5 full, 2 adapted (owned by pricing/design siblings), 1 gap now filled (PLC), 1 partial now made explicit (feedback integration).
