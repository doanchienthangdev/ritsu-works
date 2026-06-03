---
name: thinking-toolkit/mckinsey-workflow
description: |
  Use to run a CONSEQUENTIAL problem end-to-end as a world-class McKinsey study —
  a dynamic, data-driven ENGINE, not a brainstorm. Frame (TOSCA) → Structure
  (MECE tree + the 6-column workplan) → Solve (the analysis loop: route each
  hypothesis to a REAL data source, pull it, run it through the validation gate,
  update the living one-day answer, re-prioritize, porpoise) → Sell (pyramid +
  pre-wire). It pulls real data (deepask/wiki/brain/supabase-ops/deep-research),
  validates every datum, ASKS THE FOUNDER for data only they hold, and persists
  intermediate artifacts. It NEVER fabricates a fact.

  Trigger conditions: `/think mckinsey <problem>`; any high-stakes business /
  strategy / GTM / pricing / product decision worth a rigorous study; when you
  want a decision-ready recommendation backed by pulled-and-validated evidence,
  not opinion.

  Skip when: a quick lookup (use one `/think` skill, or `/deepask` directly);
  trivial / operational questions; a crisp bug. Accordion: compress for small
  problems — the one-day answer alone may suffice.

  Runs IN THE ACTIVE SESSION (it needs the conversation channel for HITL
  data-requests + owner checkpoints) — not a headless subagent. Reads its
  machine-readable spec from knowledge/mckinsey-workflow.yaml.
allowed-tools: [Read, Write, Bash, Skill, AskUserQuestion, mcp__supabase-ops__query, mcp__supabase-ops__wiki_ask, mcp__gbrain__search, mcp__gbrain__recall, mcp__gbrain__think]
disable-model-invocation: false
---

# McKinsey Workflow — the 4S problem-solving ENGINE

> Not a brainstorm. A data-driven engine: **frame → structure → workplan → analysis-loop (pull · validate · update · re-route) → synthesize → sell.** Pull real data, validate every datum, ask the founder for what only they hold, carry a living one-day answer, porpoise when the data reframes the problem.

This is the **spine** of the thinking-toolkit and the one skill that *orchestrates* the others + real data tools. The 11 atomic skills are the operations; this is the operating procedure that sequences them into a McKinsey-grade study. Distilled from *Bulletproof Problem Solving* (Conn & McLean — the 7-step) and *Cracked It!* (Garrette/Phelps/Sibony — the 4S). Its machine-readable spec is `knowledge/mckinsey-workflow.yaml` (validated by `scripts/cross-tier/validate-mckinsey-workflow.cjs`); this playbook executes it.

## What makes it an engine, not a brainstorm (the v1.6 contract)

A brainstorm narrates opinions in four stages. This engine:
1. **Pulls real data** for every hypothesis (never asserts a number it didn't fetch).
2. **Produces persisted artifacts** (problem-statement → decomposition → workplan → analysis-log → one-day-answer → synthesis → communication).
3. **Validates every datum** through a gate before it's allowed to move the answer.
4. **Asks the founder** for data only they hold (HITL) instead of guessing.
5. **Routes dynamically** — the one-day answer re-ranks remaining work after every analysis; porpoise back when the data reframes the problem.
6. **Stops on marginal analysis** — when no cheap, answer-moving analysis remains.
7. **Loads + selects the right tool** (v1.5) — for each sub-need it CLASSIFIEs (analytical vs design; causation vs prediction; formula vs typology vs checklist), LOADs candidates from the **dedicated registry** `knowledge/problem-solving-frameworks.yaml` (207 classified frameworks/models/heuristics — filterable by 4S step + type), then SELECTs + COMBINEs ≤3 complementary lenses, guarding against grabbing the familiar tool. See **Tool selection** below.
8. **Enforces its own discipline mechanically** (v1.6) — a deterministic helper (`scripts/thinking-toolkit/mckinsey-run.cjs`) scaffolds the run folder and *checks* it: the 6-column + status workplan, a provenance + degree(1-8) tag on every analysis-log datum, the product firewall on `source-of-data`, and the stopping gate (no `open` row before Sell). The discipline is no longer just prose you can drift away from — it's a gate. (Judgment stays yours; the helper guards the scaffolding around it.)

> **The McKinsey rule that governs everything (Bulletproof Problem Solving, Ch 4):** *"We don't do any analysis for which we don't have a hypothesis."* Every data pull traces to a hypothesis it proves or disproves.

## Run setup

For a substantial problem, **scaffold the run folder mechanically** — don't hand-create it:
```bash
node scripts/thinking-toolkit/mckinsey-run.cjs scaffold <slug>   # creates .archives/mckinsey/<slug>/ with 7 artifact templates (idempotent)
```
```
.archives/mckinsey/<slug>/
  problem-statement.md   decomposition.md   workplan.md
  analysis-log.md        one-day-answer.md
  synthesis.md           communication.md
```
`one-day-answer.md` is the **living state** — **seeded in STATE as the day-one hypothesis** ("if forced to answer today, we'd say X"; Bulletproof Ch 1), then rewritten after every analysis (situation → observation → resolution). It is *not* born at Solve; Solve only sharpens it. `synthesis.md` (step 6, the logic) and `communication.md` (step 7, the story) are distinct Sell products. For a small problem, the accordion compresses: keep the one-day answer inline and skip the folder.

**The discipline gate (run before Sell):**
```bash
node scripts/thinking-toolkit/mckinsey-run.cjs check <slug> --before-sell
```
fails if the workplan is missing its 6+status columns, a status value is invalid, a `source-of-data` references `product.*` (firewall), an analysis-log datum lacks provenance or a degree(1-8), or any workplan row is still `open`. **You may not move to Sell while it fails.** It checks *structure + discipline-presence*, never your judgment.

---

## ① STATE — frame the problem  ·  artifact: `problem-statement.md`

Fill **TOSCA** (run `/think tosca`): **T**rouble (gap as a symptom, not a diagnosis; pass "Why now?") · **O**wner (whose problem + who judges "good enough") · **S**uccess criteria (time-bound + quantified; *never* defined as the proposed solution) · **C**onstraints (provisional — revisit during Solve) · **A**ctors. Then write the **Core Question** and run the **5-check** (does it address Trouble / from Owner's view / meet Success / recognize Constraints / consider Actors?).

**HITL here:** where a TOSCA slot needs input only the founder holds — the real success threshold, a fixed constraint, strategic intent — **`AskUserQuestion`; do not fabricate it** (the v1.3 worked example *invented* `Success = 8%→15%`; the engine asks). Iterate with the owner until they agree "answering this question solves my problem."

**Then seed the day-one answer** (`one-day-answer.md`): the moment framing is done, write the provisional hypothesis — *"if forced to answer today, we'd say X, because Y."* It will be wrong; that's the point — it's the spine Structure + Solve sharpen, and it re-ranks the workplan. Skipping it (waiting to "have the data first") is the classic non-McKinsey move.

*(Boundary: a problem with no clear owner / irreconcilable owners is a wicked problem — TOSCA doesn't fit; say so.)*

## ② STRUCTURE — disaggregate + build the workplan  ·  artifacts: `tree.md`, `workplan.md`

**Choose the path** (`hypothesis-driven-vs-issue-driven`): **issue tree by default**; **hypothesis pyramid** only with a strong prior or under time starvation; **design-thinking path** when the problem is ill-defined/human-centered (empathize→HMW→prototype→test until Desirability-Feasibility-Viability).

**Decompose** into a **MECE** tree (run `/think mece` + `/think driver-tree`); find the right cleaving point; try multiple cleaves (anti-availability-bias); each leaf = a **falsifiable hypothesis**. **Prioritize** with the impact × influence 2×2 (knock-out); prune the immovable + the low-impact.

**Build the 6-column WORKPLAN** — the data-routing spine (Bulletproof Exhibit 4.3, verbatim columns):

| issue | hypothesis | analysis | source-of-data | owner | end-product | status |
|---|---|---|---|---|---|---|
| (the leaf) | (falsifiable claim) | (what proves/disproves it) | **(which tool — see routing table)** | (who) | (the dummy exhibit) | `open` → `pulled` → `validated` / `knocked-out` / `spawned` |

One row per surviving leaf. The **source-of-data** column is the data-pull instruction — route it via the table below. The **status** column is the ledger the Solve loop rewrites each iteration — it's what keeps a long run from drifting back into opinion-narration (the v1.3 failure). Order rows **knock-out-first** (the analyses that can kill the answer fastest). Keep it **chunky** (the few most important analyses; revise constantly), not encyclopedic.

## ③ SOLVE — the analysis loop  ·  artifacts: `analysis-log.md`, `one-day-answer.md`

The run-loop is **status-driven** — the workplan's `status` column is the ledger; an LLM drifts away from prose instructions over a long loop, but not from a column it must re-read and rewrite. **Heuristics before big guns.** Each iteration:

0. **RE-READ** the workplan `status` column; pick the highest-priority `open` row (knock-out order).
1. **ROUTE** its source-of-data to a tool (table below); mark the row `pulled`.
2. **PULL** the data — a real tool call. If it's founder-only → `AskUserQuestion`. **Never assert a fact you didn't fetch.**
3. **VALIDATE** through the gate (below); tag the datum's degree-of-certainty (1–8).
4. **WRITE** to `analysis-log.md`: hypothesis · data pulled (which tool) · result · validation verdict · degree.
5. **UPDATE** `one-day-answer.md` (S→O→R).
6. **MARK** the row `validated` or `knocked-out`; if it spawned deeper sub-analyses, append them as `open` rows and mark this one `spawned`.
7. **RE-ROUTE** per the dynamic rules — re-prioritize the remaining `open` rows against the *new* one-day answer / porpoise / switch direction / pick a different tool.

Loop until the **stopping criterion** holds → Sell. **You may NOT move to Sell with any `open` row still above the knock-out bar** — an open high-value row means the answer can still change (this is the explicit guard against the v1.3 drift: narrating opinions while rows silently go stale).

> **Worked micro-loop (real pulls, not fabricated):** *Hypothesis:* "free→paid is gated by the 7-day inactivity cliff, not price." *Analysis:* cohort conversion, returners vs non-returners. *Source:* `mcp__supabase-ops__query` on `metrics.product_dau_snapshot` — **or, if that ETL is empty, `AskUserQuestion` to the founder for the cohort number** (don't invent it). *Validate:* knock-out (does it move the answer? yes) → degree-2 hard number → correlation≠causation (triangulate with a second cut: do 7-day-returners differ in source/plan?) → sensitivity. *Update one-day answer:* returners convert 4×. *Re-route:* cliff confirmed → knock out the pricing branch, double down on reactivation.

### Tool selection — load + select the RIGHT framework (`tool_selection` in the catalog)

*Routing* (next table) answers **where to get the data**. *Selection* answers **which framework / model / analysis to apply** — the v1.5 mechanism. The candidate pool is a dedicated registry: **`knowledge/problem-solving-frameworks.yaml`** — 207 frameworks/models/heuristics/techniques/biases distilled from the two books, each classified by `fours_step` + `type`. Three stages:

**1 · CLASSIFY the sub-need** (source decision-trees decide what *kind* of tool fits):
- **solve_mode** — *analytical* (a right answer exists → hypothesis + workplan loop) vs **design** (ill-defined / human / innovation → the **design-thinking branch**: empathize → reframe (HMW) → ideate → prototype → test, until desirability×feasibility×viability). [`five-phases-of-design-thinking`]
- **analysis_mode** — *description* (summary stats) vs *causation* (experiment / natural-experiment / regression) vs *prediction* (ML / Monte-Carlo). **Heuristics before big guns** — escalate only when a cheap tool can't move the answer. [`analytics-tool-selection-decision-tree`]
- **framework_shape** — a *formula* (compute a number) vs a *typology* (2×2 / segmentation) vs a *checklist* (factors to cover). Match the shape to the job. [`three-styles-of-frameworks`]

**2 · LOAD candidates** (the ritsu JIT pull): FILTER the registry `WHERE fours_step ∈ {current-step, cross} AND type matches` (framework/model/heuristic/technique to *apply*; bias/antipattern feed the validation gate). Then `resolver_find` for matching `/think` skills + `wiki_ask` for any long-tail concept. **Read each finalist's `wiki_path` before applying** — `type` is only a filter hint.

**3 · SELECT + COMBINE:** Munger **latticework** — combine 2–3 *complementary* lenses (e.g. a typology to map options + a causal analysis to test the driver), never one [`multiple-frameworks-discipline`]. **Debias:** don't grab the framework you know best and bend the problem to fit — match tool to problem; a familiar tool as the *only* candidate is a smell → widen the load [`framework-mental-model-danger` / Maslow's hammer].

> Quick filter (no tool needed): *"What step am I in, and is this analytical or design? Causation or prediction?"* → the registry rows for that step + type are your shortlist.

### Data routing table (pull real data — `data_routing` in the catalog)

| Need | Tool | Invoke | HITL |
|---|---|---|---|
| Broad internal evidence across pillars/ops/wiki/brain | **deepask** | `/deepask "<q>"` (`--dry-run` first) | A (B+ legs surfaced) |
| A framework / concept / definition | **wiki_ask** | `/wiki ask "<q>"` or `mcp__supabase-ops__wiki_ask` | A |
| A person / company / past decision / relationship / history | **gbrain** | `/brain search` → `recall` → `think` (only if needed) | A |
| A current metric / number / KPI / count | **supabase-ops query** | `mcp__supabase-ops__query({sql, schema:'metrics'\|'ops'\|'public'})` | A |
| External market / competitor / benchmark | **deep-research** | `/deepask "<q>"` (repo-native; delegates the web leg to deep-research) or `Skill({skill:"deep-research", args:"<q>"})` | A (research only) |
| Structuring the analysis itself | **/think skills** | `/think driver-tree\|mece\|hypothesis\|root-cause\|pyramid\|so-what` | A |
| **Data only the founder holds** | **ask-user** | `AskUserQuestion` — show where it changes the answer + a default | human |

Cheapest-sufficient-source first (a number → supabase-ops; a definition → wiki_ask; an entity → gbrain `search`/`recall`). Reserve `/deepask` for genuinely cross-source synthesis, `deep-research` for genuinely external questions, `/brain think` for when search/recall is insufficient.

### Validation gate (run on EVERY datum — `validation_gate`)

A datum must clear a **trust** test (is it true?) and a **relevance** test (does it matter?). Fail any → re-source, downgrade weight, or knock it out.
1. **Knock-out (first, cheapest):** does this realistically move the answer? (importance × influence × EV). If not → abandon now.
2. **Degree-of-certainty (1–8):** given-fact … judgment-call. Reliability falls as the number rises; discount degree-6 forecasts + degree-7 expert input for incentive bias.
3. **Correlation ≠ causation:** reverse-causation? confounder? If causation is load-bearing → demand an experiment/regression, else downgrade to "associated with."
4. **Sensitivity:** by how much must assumptions change for the conclusion to flip? Tiny → fragile (gather more / hedge). Correct for overprecision.
5. **Triangulation / dissent:** has a *second, independent* read agreed? Generate + test one alternative interpretation before accepting the convenient one. (Pair `/think debias`.)
6. **Honesty-label:** tag the surviving datum with its degree; label judgment calls *as* judgment calls — never let a judgment pass as a fact.

### Dynamic routing — IF → THEN (after each validated analysis — `routing_rules` + `back_edges`)

- **Always:** update the one-day answer; re-derive whether the top-line still holds.
- Result **contradicts** the one-day answer → revise the governing thought; re-prioritize against the *new* answer.
- Result **confirms** it → suspicion, not relief: was the test adversarial? If not, route to an independent challenge.
- Analysis **moved** the answer → double down (it's in the high-value 20%). **Didn't move** it + low sensitivity → knock the branch out, reallocate.
- Central hypothesis **fails** → route to the sibling MECE branch (the pre-built alternative), not a patch.
- **Porpoise (back-edges):** data shows the problem is mis-framed → return to STATE (rewrite the problem statement, re-cleave). A result opens a new avenue or kills a branch → rewrite the workplan (STRUCTURE).

### When to ask the founder for data (HITL — `hitl_triggers`)

Stop and `AskUserQuestion` when: the input is a **degree-6 internal plan/target only they hold**; an **irreducible judgment about their world** (risk appetite, intent, success threshold); a **sensitivity test flips on an unverifiable assumption**; or **scope has drifted** (fire an intermediary checkpoint). **Frame the ask decision-relevantly:** lead with the one-day answer so far → show where this datum changes it → state your interim assumption. Don't disguise an assumption as a fact.

### Stopping criterion (Solve → Sell — `stopping_criterion`)

Stop when ALL hold: central hypothesis **proven by an adversarial test** + one-day answer stable; **marginal** — no remaining analysis is cheap+powerful enough to move the answer; **robust to sensitivity**; residual uncertainty **labeled** as judgment calls. One-line test: *"proven + robust, and no cheap answer-moving analysis remains?"*

## ④ SELL — synthesize THEN communicate (two distinct moves)  ·  artifacts: `synthesis.md`, `communication.md`

Bulletproof separates step 6 from step 7; don't conflate them.

**(6) SYNTHESIZE the LOGIC** (`synthesis.md`) — build the argument so it stands on its own *before* any telling. Run `/think pyramid` + `/think so-what`: **governing thought first** (the recommendation as one crisp sentence) → **MECE key line** → support, from the final one-day answer + analysis-log. If the logic doesn't hold as a bare pyramid, no storytelling will save it.

**(7) COMMUNICATE the STORY** (`communication.md`) — render that logic for THIS audience. Choose **grouping** (receptive) vs **argument/SCR/SCQA** (skeptical). **Action titles** (each section a full declarative sentence; read aloud = the storyline). **Pre-wire** the owner so the final answer isn't a surprise.

> **APK guard (anxious-parade-of-knowledge):** lead with the *answer*, not the journey. Do NOT dump everything you found or tell the **story-of-the-search** (problem → all the analyses we ran → … → answer). The reader wants the answer first; the analysis is support, surfaced only as needed.

---

## When to use / NOT

- **Use:** a real, consequential problem worth a rigorous study (capability bet, pricing/GTM/funnel decision, "why is X happening and what do we do").
- **Don't:** quick lookups (one `/think` skill, or `/deepask`); trivial/operational; crisp bugs. Don't run the full engine when one analysis answers it — that's the accordion compressing.

## Composition + guards

- **With the atomic `/think` skills:** this engine *invokes* them — `tosca` (State), `mece`/`driver-tree`/`hypothesis` (Structure), `root-cause`/`design-thinking`/`pre-mortem`/`debias`/`2x2` (Solve), `pyramid`/`so-what` (Sell).
- **With `/deepask` — composing a heavyweight sub-capability (`composition_guards`, v1.7):** the Solve loop routes a cross-source workplan row to `/deepask`, but under 3 disciplines. **(1) Anti-recursion** — one way only (`mckinsey → deepask → /think micro-frameworks`); deepask never re-enters this engine (the deepask `capability-gate` `RECURSION_DENYLIST` refuses `/think mckinsey` even at Tier-A). **(2) Cost-valve** — `/deepask` is a *big gun* (multi-subagent, resolver-breaker-bounded 20 finds/4h); fire the full loop ONLY on a knock-out-surviving, genuinely multi-source row (`--dry-run` first; budget the breaker across the run — a single number → `supabase-ops`, a concept → `wiki_ask`, an entity → gbrain `search`/`recall`). **(3) Evidence-not-decider** — deepask returns cited evidence + a COMPLETE/PARTIAL verdict you run through the validation gate like any datum; a PARTIAL is a data-blocked branch (→ `ask-user` or carry an explicit assumption with a sensitivity note), and the synthesize→recommend call stays with you (Sell) + the founder. Same shape for `deep-research` + gbrain `think`.
- **With `/cla propose`:** CLA's phases mirror 4S; this engine is the disciplined way to think *inside* a proposal.
- **Firewall:** company/product data only via `metrics.*` (never `product.*`). **HITL:** all data READS are Tier A; never auto-run a WRITE or a publish — surface it. **Cost:** prefer gbrain `search`/`recall` over `think`; `/deepask` is resolver-breaker-bounded; in-session = subscription billing.
- **Runs in the active session** (HITL + checkpoints need the conversation channel) — not a fire-and-forget subagent.

## References

Primary (in `raw/mckinsey/`): **Conn & McLean (2018), *Bulletproof Problem Solving*** — 7-step, the 6-column workplan (Ch 4, Exhibit 4.3), one-day answer (Ch 1), porpoising (Ch 2), heuristics-before-big-guns + analytics decision tree (Ch 5), dialectic (Ch 4). **Garrette, Phelps & Sibony (2018), *Cracked It!*** — 4S (Ch 3), TOSCA (Ch 4), analysis plan + eight degrees of analysis + sensitivity (Ch 5/7), pyramid/SCR/pre-wire (Ch 10), design-thinking path (Ch 8-9).
Machine-readable spec + per-step concept bindings: `knowledge/mckinsey-workflow.yaml` + `knowledge/schemas/mckinsey-workflow.schema.json`. The full candidate pool — **207 classified frameworks/models/heuristics** — is the dedicated registry `knowledge/problem-solving-frameworks.yaml` (filter by `fours_step` + `type`; seeded by `scripts/thinking-toolkit/gen-frameworks-registry.cjs`, extensible as more concepts sync in). Concepts beyond the registry stay reachable per-step via each step's `retrieval` recipe + `wiki_ask`.

## Anti-claims

- This is NOT a brainstorm and NOT deterministic code — it's a judgment-heavy operating procedure an intelligent agent executes with real tools.
- It does NOT fabricate facts — every datum is pulled or asked-for, and validated.
- 4S is NOT a rigid waterfall — it porpoises; the one-day answer is the living state, not an end-of-run summary.
- It is NOT mandatory for every question — the accordion compresses for small problems; a single `/think` skill or `/deepask` is often enough.
