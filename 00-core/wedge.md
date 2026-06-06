---
title: "The Wedge — Which Feature Makes Them Stay"
type: core-doc
slug: wedge
layer: strategy
status: v0.1-draft
owner: founder
last_reviewed: 2026-06-07
review_cadence: on-trigger
cited_by: []
auto_load: false
revisit_at: N=10-watch-complete
revisit_trigger: "SOP-PRODUCT-002 N=10 stranger-watch complete (observed pay-at-first-limit + activation) — then re-author from observed data and canonize"
revisit_owner: founder
graduated: "2026-06-07 stub→v0.1-draft (hypothesis) per founder steer (run ritsu-foundational-layer-v1); entry_condition waived to DRAFT-status only"
entry_condition: "SOP-PRODUCT-002 (N=10 strangers observed using product) complete — CANONIZES the wedge; draft-hypothesis valid until then"
triggered_by: "ops.sop_runs WHERE sop_slug = 'SOP-PRODUCT-002' AND state = 'completed'"
source_run: ritsu-foundational-layer-v1
---

> **The narrowest-viable sticky core of Ritsu, written as a falsifiable hypothesis.** This doc graduates the long-empty `wedge.md` stub from `stub` → **draft-hypothesis**. The PG gate (`SOP-PRODUCT-002`, N=10 strangers observed) is **waived to draft-status only** — the wedge below is the *bet we instrument and test*, not declared truth. It **canonizes after N=10** when observed pay-at-first-limit data replaces the inferred claims here.
>
> **Why graduate the stub now (the stub said "the wedge is DISCOVERED, not declared"):** that is still true of the *paying* validation. But the company already runs a 30-artifact execution backlog whose SOPs/engines reference "the wedge" — and a 542KB persona portrait + a full 5A journey now exist (`01-marketing/icp/`). The strategy layer fell *behind* the execution layer. This doc is the foundation those artifacts cite — the **what-makes-them-stay**, framed so the N=10 watch can falsify it cleanly. It is the product-strategy sibling of the marketing persona: the persona is the WHO; this is the **WHICH-FEATURE-AND-WHY-IT-STICKS**.
>
> **Confidence discipline (true-zero):** every claim is tagged `observed` (Door-2 analytics — `supabase-analytics`), `inferred` (framework/market), or `hypothesis` (untested). **The two load-bearing claims — willingness-to-pay and the sticky-feature mechanism — are `hypothesis`.** That is the unproven core this doc exists to test, not a hedge.

---

## 1. The wedge in one sentence

> **Ritsu's sticky core is the *structured multi-week mastery PATH* — difficulty-ordered topics + active-recall practice (17 activity types) + a concept-level gap-map that tracks mastery across sessions — that turns a hard, graded, multi-week STEM/ML course into a finishable plan. The single feature that makes the deadline-bearing masterer STAY (not just try) is the PATH-plus-mastery-map, because it is the one thing free Google NotebookLM cannot replicate, and it is what converts a one-quiz novelty into a multi-week habit.**

Two halves, both deliberate:

- **What makes them *try*** (acquisition, table-stakes): drop-a-file → 30s → a quiz from *their own* material that finds a real gap. This is the `<60s` magic moment (`product.md` §7). **It is necessary but NOT the wedge** — NotebookLM does it too, for free. A wedge built on "we also make quizzes" is a red ocean (§7).
- **What makes them *stay*** (the wedge): the **structured multi-week PATH + cross-session concept-level mastery map**, which only earns its value across *weeks* of a graded course — the timescale a free document-Q&A tool was never built for. Trial is won on the aha; **retention, referral, and willingness-to-pay are won on the PATH.**

> **The wedge is the *stay* mechanism, not the *try* mechanism.** Every downstream SOP that optimizes "activation" is optimizing the on-ramp; the SOPs that optimize re-upload / week-4 retention / referral are optimizing the wedge. Do not confuse them (this is the §1.3 leading-ladder error in `north-star.md`).

---

## 2. The transition wedge — who it's for (paying-core vs reach)

The wedge inherits `icp-summary.md` §0/§4/§4b verbatim — restated here as the *product*-strategy view of the same locked segment. **The wedge is defined by the JOB, not the subject:** *master a dense, graded, multi-week body of material under a high-stakes deadline, through active practice.*

| Layer | Who | WTP shape | Role in the wedge |
|---|---|---|---|
| **PAYING CORE** | The **deadline-bearing committed masterer** — gripping a hard, *graded, multi-week* course (ML/AI beachhead: cs231n / MIT 6.S191 / Andrew Ng / fast.ai) with a recurring graded deadline | **Durable** — the *recurring* deadline re-triggers WTP each cycle (the anti-churn property) | The customer the wedge must win and keep. Pays at the first hard limit *because the deadline is live*. |
| **REACH / top-of-funnel** | The **global open-courseware self-learner** — huge, reachable on Reddit/YouTube/Discord, but no graded external deadline | **Soft** — no deadline timer → free-rides on NotebookLM-free; churns at the paywall | The funnel mouth + the referral surface. **Not** the paying core. Acquisition fuel, not retention. |
| **EXPANSION (later)** | The broader English-speaking serious learner (grad students, self-directed professionals; UK/CA/AU/IN intermarket); the med/pre-med **co-beachhead** (`icp-summary.md` §4b) | Varies (med = *already proven* — UWorld/Anki $300-500) | Served after the wedge proves out. Med/pre-med is a *parallel-N=10 candidate* that de-risks the WTP bet. |

**The crucial split for product strategy:** the **episodic one-shot crammer churns** (uses Ritsu for one exam, leaves) — they convert but fail the *love/retention* north-star. The **deadline-bearing masterer retains** because the *next* graded checkpoint re-fires the need. The wedge feature (the PATH) is precisely what serves the masterer and is wasted on the crammer. **Optimizing for the crammer would silently destroy the wedge** — this is the single most important product-strategy implication of the segment split.

*Observed grounding (Door-2):* one real user generated **42 sources across 36 sessions**; another shows a **4-source / 10-session** revisit pattern (`supabase-analytics`). This *sustained-revisit* behavior is the masterer's fingerprint and is **observed beyond the founder** — it is the strongest signal we have that the PATH-shaped use exists. Payment, however, is **not** observed (0 real paying).

---

## 3. The sticky-feature hypotheses (1–3, falsifiable)

A wedge is 1–3 features, ranked, each stated so the N=10 watch can kill it. Ranked by **stickiness × NotebookLM-defensibility**.

### H1 (LEAD) — The structured multi-week mastery PATH + concept-level gap-map

**Hypothesis:** *A deadline-bearing masterer who completes a difficulty-ordered PATH (not just isolated quizzes) and sees their mastery rise on a concept-level Knowledge Map across ≥2 study sessions will (a) return within 7 days to continue the path, and (b) value it enough to pay at the first hard limit — at a rate materially higher than a user given only one-off quizzes.*

- **Why it sticks (mechanism):** the PATH creates a *sense of finishable progress through a scary course* + a *visible mastery curve* the learner trusts. That is an **emotional + structural** hook (relief of "I have a plan," pride of "I can see myself getting it"), not a feature novelty. Novelty fades; a half-finished path with a live deadline pulls them back.
- **Why it's defensible:** NotebookLM does doc→quiz→grounded-explanation→share, and (Apr-2026) *basic* mastery-tracking — but **it has no difficulty-ordered multi-week PATH** and no concept-level gap-map across a whole course. The PATH is the one POD that requires *the course timescale* to deliver value (§6, §7).
- **Falsification (what kills H1):** if N=10 masterers use the first quiz, get the aha, and then **do NOT re-upload / do NOT progress a path / do NOT pay** — i.e., the PATH does not change re-upload or pay behavior vs one-off quizzes — H1 is dead and the wedge must move to H2 or be re-discovered.
- **Confidence:** `hypothesis` (the PATH-as-stickiness mechanism is untested; revisit behavior is `observed` but not *causally* tied to the PATH).

### H2 — Source-grounded accuracy on *dense* material (the trust moat / #1 SERVQUAL)

**Hypothesis:** *A masterer who sees ≥2–3 accurate, source-cited quizzes on their OWN dense PDF/lecture (LaTeX, derivations, code, figures) — with zero visible hallucinations — will trust Ritsu for a graded exam; one visible hallucination resets the trust counter to zero.*

- **Why it sticks:** for this *skeptical, accuracy-first, burned-before* learner (`persona-portrait.md` S10 ★8, ★15, ★18), accuracy is not a feature — it is the **precondition for every other feature to matter**. A garbled backprop quiz kills the relationship instantly.
- **Why it's the moat-enabler, not the moat:** accuracy is a **point-of-parity** (`positioning.md` §7), not a point-of-difference — but it is the *gate* through which H1 must pass. Without H2, H1 never gets observed.
- **Falsification:** if generation quality on dense math is unreliable at N=10 (visible hallucinations, broken LaTeX, truncated long-video ingest), the wedge cannot be *tested* — fix H2 before claiming anything about H1.
- **Confidence:** `inferred` (the requirement is well-grounded; current generation quality on dense material is unmeasured here).

### H3 — Universal dense-input ingest (the on-ramp width)

**Hypothesis:** *Flawless ingest of the masterer's real material — dense PDFs (observed 63%) + long lecture videos (observed 16%) + slides + code — is what gets their HARDEST material (the 60-page lecture, the 90-min recording) into the loop before the free 40-page / 30-min cap truncates the aha.*

- **Why it matters to the wedge:** the free-tier caps (40 pages / 30-min video / 5 sessions, `product.md` §10) bite *exactly* on the masterer's dense material — so H3 is both the on-ramp and the *upgrade trigger* surface.
- **Falsification:** if ingest breaks on dense/long inputs at N=10, the masterer never reaches the aha on their *real* material → both H1 and the money-moment are untestable.
- **Confidence:** `observed` (format mix) / `inferred` (ingest robustness).

> **Ranking rationale:** H1 is *the wedge* (the stay-mechanism + the NotebookLM-defensible POD). H2 and H3 are **enablers** — they are the conditions under which H1 can even be observed. The N=10 watch must verify H2+H3 *work*, then test whether H1 *changes behavior*. If H2/H3 fail, fix them; if H1 fails, the wedge is wrong.

---

## 4. Value Proposition Canvas — the wedge fit (Osterwalder)

*Per the Value Proposition Canvas (Strategyzer, 2014): complete the Customer Profile FIRST, rank pains/gains, then map Pain Relievers / Gain Creators, then check fit on the **top-ranked** items. Sourced from `persona-portrait.md` S10/S11/S12 + `icp-summary.md`.*

### 4.1 Customer Profile (the masterer — ranked)

**Jobs-to-be-done (functional → emotional → social):**
1. *Functional* — "turn this dense chapter/lecture/paper into practice that makes it stick, so I pass the graded checkpoint." (★ load-bearing)
2. *Functional* — "know WHAT to master, in WHAT order, before the deadline" (the PATH job — the one NotebookLM doesn't serve).
3. *Emotional* — "stop feeling dumb; feel capable again" — kill the "I'm not smart enough" belief.
4. *Social* — "keep up with (or ahead of) my cohort."

**Pains (ranked by severity — `persona-portrait.md` S10):**
| Rank | Pain | Severity |
|---|---|---|
| P1 | Re-reads dense PDFs/slides for hours but it **doesn't stick** — fails the midterm despite "studying" | hair-on-fire (deadline week) |
| P2 | Building own active-recall material (Anki cards, practice problems) from a 200-page reader = **hours of grunt work before any learning** | high (`observed` 63% PDF load) |
| P3 | **No structured PATH** through a hard multi-week course — doesn't know what to master in what order | high (the wedge gap) |
| P4 | Fear of a **hallucinated quiz** teaching the wrong thing before an exam (can't verify 50 cards) | kill-risk |
| P5 | $29/mo when **NotebookLM is free** — must justify a premium over a free clone of the spine | conversion-risk |

**Gains (ranked by importance — `persona-portrait.md` S11):**
| Rank | Gain |
|---|---|
| G1 | Time-to-mastery on dense PDF + lecture (finish the hard course on time) |
| G2 | **Trusted progress** — a mastery curve across sessions they believe ("it caught something I missed") |
| G3 | Accuracy — zero hallucinated quizzes (the precondition gain) |
| G4 | The identity shift: "I'm a masterer, not a crammer; AI made me **sharper, not lazier**" |

### 4.2 Value Map (Ritsu's wedge offer)

| Customer item | Ritsu Pain Reliever / Gain Creator | Maps to |
|---|---|---|
| **P1** (re-reading doesn't stick) | Auto-generated **active-recall** practice (17 activity types) from the source — the active method that *does* stick (`product.md` §4 desirable-vs-pleasing) | H1 |
| **P2** (grunt-work to build materials) | "Drop it in — Ritsu handles the rest": materials auto-generated in 30s, zero manual card-making | H3 + magic moment |
| **P3** (no path) | **The structured multi-week PATH** — difficulty-ordered topics, auto-sequenced; the Knowledge Map shows the course as a connected whole | **H1 (the wedge core)** |
| **P4 / G3** (hallucination fear) | Source-grounded answers with **citations on every quiz** (the trust proof) | H2 |
| **P5** (free NotebookLM) | The PATH + 17 activities + concept-level mastery map = the *more-for-more* the free tool lacks (§6) | H1 (differentiation) |
| **G1** (time-to-mastery) | <60s source→practice + a finishable plan = compresses weeks of disorganized study | H1 + H3 |
| **G2** (trusted progress) | Cross-session **concept-level mastery map** + progress heatmap | **H1** |
| **G4** (sharper not lazier) | "AI is the leverage, not the substitute" — Ritsu makes YOU do the active work (`positioning.md` §1 belief) | belief |

### 4.3 Fit check (the discipline: do Relievers hit the TOP pains?)

- **Top-3 pains addressed?** P1 ✓ (H1 active recall) · P2 ✓ (H3 auto-gen) · P3 ✓ (H1 PATH). **YES.**
- **Top-3 gains created?** G1 ✓ · G2 ✓ (mastery map) · G3 ✓ (H2 citations). **YES — but G2/G3 fit is `hypothesis`** (depends on generation quality + that the masterer *trusts* the curve; untested).
- **The one fit GAP that is the whole risk:** **P5 (free NotebookLM)** is only relieved *if the masterer perceives the PATH as worth paying for over a free quiz-maker.* That perception is **unproven** (R2 + R1). **The fit holds on paper; the N=10 watch tests whether it holds in a wallet.**

---

## 5. The four wedge love-KPIs (the falsifiers)

These are the wedge's **love-test indicators** (inherited from `icp-summary.md` §4 + the `north-star.md` §1.3 leading ladder). Each is a *falsifier*: if it stays below target at N=10 / first cohort, the wedge hypothesis is weakening.

| # | KPI | Target | What it tests | Door-2 buildability (true-zero) |
|---|---|---|---|---|
| **K1** | **Time-to-first-aha** | **< 60s** (signup → first quiz from own material) | The TRY mechanism (magic moment) works on dense material | ⚠ **PROXY required — `quiz_attempts` = 0 ROWS (observed).** Use `live.learning_sessions.activities_completed ≥ 1` timed from `started_at`, anchored to `profiles.onboarding_completed_at`. The "first quiz" event itself is **not yet logged** — instrument it (see §9). |
| **K2** | **Upload-again-within-7d** | **> 40%** | The STAY mechanism — they came back to continue the PATH (the masterer fingerprint) | ✓ **Buildable now**: 2nd `live.sources` row for a `user_hash` within 7d of their 1st (`sources.created_at`). The 42-src/36-session user *is* this signal `observed`. |
| **K3** | **Refer-a-friend-by-week-2** | **> 15%** | The flywheel — a result legibly theirs → a share to a cohort-mate | ⚠ **Buildable mechanically but currently 0 organic**: `live.session_shares` exists (15 rows) but **all 15 are founder** (`observed`). First *non-founder* share = ignition. |
| **K4** | **Free→paid** | **> 5%** (rolling 30d) | The MONEY-MOMENT — they pay at the first hard limit with a live deadline (THE wedge bet) | ⚠ **Buildable but 0 real**: `live.profiles.subscription_status` (only 2 paid, both founder test cards — `observed`). This is **R1, the single unproven load-bearing number.** |

> **The honesty that makes this decision-grade:** of the four love-KPIs, **K2 is observable today and already shows the right shape** (sustained revisit beyond the founder). **K1, K3, K4 cannot be measured from existing logs** — K1 needs a first-quiz event that isn't instrumented, and K3/K4 have only founder data. **The wedge's truth therefore lives in instrumenting K1 + getting K3/K4 above zero at N=10.** Do not report K1/K3/K4 as "passing" until real (non-founder) rows exist. The empty `quiz_attempts`/`activity_results`/`flashcard_reviews` tables are not a data gap to paper over — they are *the reason the wedge is still a hypothesis.*

---

## 6. Win-vs-free-NotebookLM — the Blue Ocean move (ERRC + Strategy Canvas)

*Per Blue Ocean Strategy (Kim & Mauborgne): a real wedge is not "more features" — it is a **value curve that diverges** from the pack via deliberate Eliminate/Reduce/Raise/Create. NotebookLM is the shadow rival at 4 of 5 journey stages (`customer-journey.md` §6). We do NOT out-feature it on the spine it gives away free; we **change the axis of competition** to the multi-week mastery PATH.*

### 6.1 The Strategy Canvas (competing factors → divergence)

Competing factors for "AI study from your own documents," plotted Low→High:

| Competing factor | NotebookLM (free) | ChatGPT (free/$20) | Anki | **Ritsu (wedge)** |
|---|---|---|---|---|
| Doc → quiz / Q&A | **High** | Med | — | High *(table-stakes — not where we win)* |
| Source-grounded citations | High | Low | — | **High** (H2 trust) |
| Price (lower = better for user) | **Free** | Free/$20 | Free | $29 *(the gap to justify)* |
| **Difficulty-ordered multi-week PATH** | **None** | None | None | **High ← the CREATE** |
| **Concept-level mastery map (cross-session)** | Low (Apr-2026 basic) | None | Low | **High ← the CREATE/RAISE** |
| Activity-type variety | Low (quiz/flashcard/guide) | Low | Flashcard-only | **High (17 types) ← RAISE** |
| Learning-science authority / transparency | Med | Low | Med | **High ← RAISE (the preemptive POD)** |
| General-purpose chat breadth | High | **High** | — | **Low ← REDUCE (deliberately not a chatbot)** |

The Ritsu curve **diverges** precisely where NotebookLM is flat: the **PATH + cross-session mastery map + activity variety + learning-science authority.** It *converges* (table-stakes) on doc→quiz + citations, and deliberately sits *below* on chat-breadth and price.

### 6.2 The ERRC grid (Four Actions)

- **ELIMINATE:** the general-purpose chatbot frame. Ritsu is **not** "ChatGPT/NotebookLM with a skin" — it does not compete on open-ended chat. (`positioning.md` §9 anti-positioning.)
- **REDUCE:** breadth-of-source-Q&A as the *headline*. We have it (table-stakes) but do not lead with it — leading with "we also make quizzes" is the red-ocean trap.
- **RAISE:** learning-science rigor + transparent citations (the **preemptive** POD — `positioning.md` §6); activity-type depth (17 vs ~2-3); the concept-level mastery map above NotebookLM's basic tracking.
- **CREATE:** the **structured multi-week PATH** — the one factor *no* rival offers, the wedge core, the only one that requires the course timescale to deliver value.

> **The Blue-Ocean discipline that prevents the most likely strategic error:** a Create *without* an Eliminate/Reduce is just feature-creep on a red-ocean strategy (the framework's #1 pitfall). Ritsu's wedge is honest blue ocean only because it **eliminates the chatbot frame and reduces doc-Q&A-as-hero** to fund the PATH. **The marketing rule that falls directly out of this:** never message "we also make quizzes" — that competes on NotebookLM's free axis. Always message the **PATH + mastery + learning-science** — the axis where the curve diverges. (This is the single most-repeated instruction across `icp-summary.md` §8 R2, `positioning.md` §6, and `customer-journey.md` §6.3.)

### 6.3 The non-customer pool (where the demand is)

The largest demand pool is **not** NotebookLM's users to be won in a feature war — it is the masterer currently **doing nothing structured** (re-reading + the frankenstein Anki/Quizlet/ChatGPT stack, `persona-portrait.md` S12). They are non-customers of *any* mastery-path product because none exists. Ritsu's wedge converts them by **naming their pain** ("re-reading is passive — that's why it isn't sticking") and giving them the PATH — *then* the free-NotebookLM comparison is a head-to-head Ritsu can win on divergence, not a price war it loses.

---

## 7. How everything else composes around the wedge

The wedge is the load-bearing center; every other capability is **either an on-ramp to it or an amplifier of it.** This is the product-strategy map the backlog references.

```
                      ┌──────────────────────────────────────────┐
   ACQUISITION  ──►   │   THE WEDGE (stay-mechanism)              │  ──►  AMPLIFY
   (on-ramps)         │                                          │       (flywheel)
                      │   H1: structured multi-week PATH          │
  magic moment <60s   │      + concept-level mastery map          │   share-links (K3)
  (the TRY hook)      │   H2: source-grounded accuracy (gate)     │   → cohort referral
  universal ingest    │   H3: dense-input ingest (on-ramp width)  │   → loops to AWARE
  (H3, dense PDFs)    │                                          │
                      └──────────────────────────────────────────┘
                                        │
                         composes around (NOT the wedge itself):
                         • 7 tutoring modes  • 10 personalities (the HABIT hook)
                         • crosswords/diagrams etc. (breadth, NOT the spine)
                         • pricing tiers (the money-moment surface)
```

- **The magic moment (`product.md` §7)** is the **on-ramp**, not the wedge. It wins the *try*; the PATH wins the *stay*. Activation SOPs (`SOP-CUSTOMER-002`, `SOP-GTM-011`) serve the on-ramp.
- **The 17 activity types** are the *substance* of the PATH (the active-recall practice that fills it), not 17 independent features. They matter *as a path*, not as a feature list — to the skeptical masterer, "17 activities" reads as gimmick bloat *unless* framed as "one structured path to the final" (`customer-journey.md` A3).
- **The 10 emotional-AI personalities (`product.md` §6.5)** are the **habit hook** that keeps the masterer on the path day-to-day — they amplify retention but are explicitly **NOT** the wedge (they fail the masterer's rigor-respect test if led with; `persona-portrait.md` S10 ★11).
- **The 7 tutoring modes** are *how* the path adapts (recall vs application vs stretch) — an amplifier of H1, not a separate wedge.
- **Pricing tiers (`product.md` §10)** are the **money-moment surface** — the free 40-page/30-min/5-session caps are deliberately the wall the masterer hits *mid-PATH on dense material* (the K4 trigger). Pricing experiments (`SOP-PRODUCT-010`) tune *where* the wall sits relative to the masterer's course.
- **Share-links (`session_shares`)** are the **flywheel** — they only ignite if the link's destination *shows the PATH* (not a paywall, not a thin quiz NotebookLM also makes; `customer-journey.md` A5). The referral engine amplifies the wedge by carrying it into cohort Discords.
- **The marketing engine + the 9 situational workflows (`product.md` §8)** are **benefit entry-points to the wedge** — each homepage workflow ("ace your exam in 3 days," "break down a research paper") is a different door into the same PATH.

> **The composition rule for the whole company:** if a proposed feature/content/experiment does not *(a) widen the on-ramp to the PATH, (b) strengthen the PATH/mastery-map itself, or (c) amplify its referral/retention*, it is **off-wedge** and should be deprioritized pre-PMF. A document-summarizer feature, a general-chat feature, an edutainment-streak feature — all **fail** this test (and the `positioning.md` §2 mantra "active mastery, AI-leveraged"). This is the wedge acting as the prioritization filter.

---

## 8. What the wedge is NOT (anti-wedge discipline)

- **NOT "AI tutor for everything."** Too abstract; no stickiness; no defensible axis.
- **NOT "study smarter not harder."** Cliché; fails the substitution test.
- **NOT "ChatGPT for studying."** Wrong frame — ChatGPT *answers*; Ritsu *generates a practice path*. (ELIMINATE, §6.2.)
- **NOT "we also make quizzes."** This competes on NotebookLM's **free** axis — the red-ocean trap. The quiz is the on-ramp; the PATH is the wedge.
- **NOT the magic moment alone.** The `<60s` aha wins the *try*; without the PATH it is a novelty NotebookLM matches for free. A wedge built on the on-ramp churns.
- **NOT the one-shot exam-crammer's product.** The crammer converts then leaves (`icp-summary.md` §4) — building for them destroys the wedge by optimizing churn.
- **NOT the 10 personalities / crosswords / emotional AI.** Those are amplifiers/habit-hooks; led-with, they *repel* the rigor-respecting masterer (`persona-portrait.md` S10 ★11).

---

## 9. The N=10 watch — what canonizes this doc

This doc stays `draft-hypothesis` until `SOP-PRODUCT-002` (N=10 US strangers observed, *not* surveyed — and per `icp-summary.md` §4b, ideally a **parallel med/pre-med N=10** to settle the WTP question via med's already-proven study-tool spend). The watch must answer, in priority order:

1. **(K1, must instrument first)** Does the `<60s` aha fire on *dense* material? — **Requires instrumenting the first-quiz event** (currently `quiz_attempts` = 0 rows). Until then K1 is a proxy off `learning_sessions.activities_completed`.
2. **(H2 gate)** Is generation accurate + citation-grounded on dense PDFs/LaTeX/code with zero visible hallucinations? If not, fix before testing H1.
3. **(K2, observable now)** Do they **re-upload within 7d** / progress a PATH? (The masterer fingerprint — already `observed` in shape.)
4. **(H1, THE wedge test)** Does the **PATH + mastery-map change behavior** vs one-off quizzes — measurably more re-upload, more retention, more pay?
5. **(K4 = R1, the load-bearing unknown)** **Do they pay $29 at the first hard limit with a live deadline?** This is the one number the whole wedge rests on and the one never yet observed.
6. **(K3)** Does a **non-founder** share-link ever fire and convert a stranger? (Flywheel ignition; currently 0.)

**Falsification outcomes:**
- If **H1 fails** (PATH doesn't change behavior) → the wedge is wrong; re-discover via the watch. Likely fallback: the wedge collapses toward H2 (accuracy-as-trust) + the magic moment, and Ritsu must find a *different* stay-mechanism.
- If **K4 stays at 0** despite H1 succeeding → the *segment* may be soft-WTP reach, not paying-core; re-anchor to the med/pre-med co-beachhead (proven WTP, `icp-summary.md` §4b) or to a deadline-scoped pricing shape (`customer-journey.md` A4: one-week deadline-scoped unlock).
- If **K2 already passes but K1 can't be measured** → instrumentation is the blocker, not the product; ship the first-quiz event before any further claim.

**On canonization:** when N=10 returns observed pay-at-first-limit + re-upload + (ideally) one organic referral, this doc flips `status: draft-hypothesis → canonical`, the lead hypothesis H1 becomes a stated fact with its observed numbers, and `wedge.md` joins the auto-load identity layer. Until then, **treat every claim here as a bet to test, and the empty activity-outcome tables as the proof that the bet is still open.**

---

## 10. Coherence

- **Coheres with** `icp-summary.md` (same paying-core/reach split, same JOB-not-subject boundary §4b, same R1/R2 risks) · `positioning.md` (the PATH = the active-mastery belief §1; the learning-science authority = the preemptive POD §6; "never message we-also-make-quizzes" = the R2 rule) · `product.md` (the magic moment §7 = on-ramp; the Knowledge Map §6.4 = the wedge's mastery-map; accuracy §6.7 = H2) · `north-star.md` (the wedge's stay-mechanism produces "weekly retained paying learners who hit the mastery moment"; the 4 love-KPIs are the §1.3 leading ladder) · `01-marketing/icp/persona-portrait.md` + `customer-journey.md` (the WHO + the 5A flow this wedge serves).
- **The "WHAT trio" + this wedge:** `product.md` (what Ritsu IS) + `positioning.md` (what to SAY) + `icp-summary.md` (WHO) + **`wedge.md` (WHICH feature makes them STAY, and why)** must stay coherent on the same segment, the same NotebookLM-defense, and the same PATH-as-core thesis. If a feature decision contradicts the wedge, the contradiction is the signal — re-anchor to **H1: the multi-week mastery PATH is the stay-mechanism; everything else is on-ramp or amplifier.**

---

*This doc is the canonical answer to "which feature makes the deadline-bearing masterer STAY?" It is a **hypothesis** until `SOP-PRODUCT-002` (N=10) returns observed re-upload + pay-at-first-limit data. The wedge IS discovered, not declared — but the bet is now stated precisely enough to be falsified. The load-bearing unknowns are H1 (does the PATH change behavior) and K4/R1 (do they pay). The empty `quiz_attempts` / `activity_results` / `flashcard_reviews` tables are the honest reminder that the most important thing about the wedge is still untested.*
