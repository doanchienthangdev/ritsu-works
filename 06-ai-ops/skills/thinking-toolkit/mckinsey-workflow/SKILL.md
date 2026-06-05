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
2. **Produces persisted artifacts** (problem-statement → decomposition → workplan → analysis-log → one-day-answer → synthesis → communication) + the discipline ledgers (hitl-log, checkpoint-log, and **(v3.5) toolkit-log** — the recorded tool-selection method ledger). 10 artifacts total.
3. **Validates every datum** through a gate before it's allowed to move the answer.
4. **Asks the founder** for data only they hold (HITL) instead of guessing.
5. **Routes dynamically** — the one-day answer re-ranks remaining work after every analysis; porpoise back when the data reframes the problem.
6. **Stops on marginal analysis** — when no cheap, answer-moving analysis remains.
7. **Loads + selects the right tool** (v1.5) — for each sub-need it CLASSIFIEs (analytical vs design; causation vs prediction; formula vs typology vs checklist), LOADs candidates from the **dedicated registry** `knowledge/problem-solving-frameworks.yaml` (207 classified frameworks/models/heuristics — filterable by 4S step + type), then SELECTs + COMBINEs ≤3 complementary lenses, guarding against grabbing the familiar tool. See **Tool selection** below.
8. **Enforces its own discipline mechanically** (v1.6, +v1.8) — a deterministic helper (`scripts/thinking-toolkit/mckinsey-run.cjs`) scaffolds the run folder and *checks* it: the 6-column + status workplan, a provenance + degree(1-8) tag on every analysis-log datum, the product firewall on `source-of-data`, the stopping gate (no `open` row before Sell), and **(v1.8) the HITL receipt gate** — every `ask-user` datum must carry a `[H<n>]` tag resolving to a logged question+answer in `hitl-log.md`, else it fails. The discipline is no longer just prose you can drift away from — it's a gate. (Judgment stays yours; the helper guards the scaffolding around it. The receipt gate is **discipline, not proof** — it can't see the conversation, so it can't *prove* you asked; it makes *skipping* the ask, or faking an `ask-user` label without a logged exchange, a failure, and leaves the founder an auditable trail.)

> **The McKinsey rule that governs everything (Bulletproof Problem Solving, Ch 4):** *"We don't do any analysis for which we don't have a hypothesis."* Every data pull traces to a hypothesis it proves or disproves.

## ⓿ Operating model (v2.0) — modes · the 7 team sessions · the protocol

> The power of McKinsey is not a fast answer — it is the disciplined TEAM process. This engine runs as a sequence of **team problem-solving sessions** (checkpoints): at each, present what we have + how we're thinking + which frameworks we chose & why → **brainstorm as a team** → reach consensus → proceed. Never rush; always surface the thinking; produce a full artifact set + a final sell.

### Parameters (parse from the `/think mckinsey <problem> [flags]` invocation)

| Flag | Values | Default | Effect |
|---|---|---|---|
| `--mode` | `interactive` \| `auto` | `interactive` | the team-session interaction model (below) |
| `--depth` | `quick` \| `standard` \| `deep` | `standard` | accordion: quick = inline one-day answer, no folder/gate; deep = every checkpoint interactive |
| `--sell` | `<template-id>` \| `auto` | `auto` | the McKinsey deliverable template (`knowledge/mckinsey-templates.yaml`) |
| `--audience` | `receptive` \| `skeptical` | `skeptical` | grouping vs SCR/SCQA storyline |
| `--style` | `<design-system>` | none | brand the sell deliverable (reuse `/deepask`) |
| `--art-style` | `<genre>` | none | artistic genre for visual sell formats (reuse `/deepask`) |
| `--sources` | csv `internal,web,brain,analytics,wiki,deepask` \| `all` | `all` | scope/expand the data sweep |
| `--format` | a `/deepask` medium | template default | the sell rendering medium |
| `--workflow` | `off` \| `steps` \| `full` | `off` | run each high-leverage step as a dynamic multi-agent WORKFLOW (v2.1; see below) |

### The two modes

- **`interactive` (default)** — at each checkpoint **STOP and treat the founder as another McKinsey team member.** Present (1) **STATE** — what we have now (pulled data + the current one-day answer + degree tags); (2) **THINKING** — how you framed/analyzed it + **which thinking-tools you selected (from the per-step `thinking-tool-index/<step>.md`) and WHY** (latticework: 2–3 complementary lenses; debias: not the familiar tool) — present the `toolkit-log.md` rows for this step; the options + your read; (3) **PROPOSAL** — the next step / reframe / synthesis. Then **ASK — not "do we agree?" but "what would have to be true for this to be WRONG? what am I missing? challenge this."** Brainstorm via `AskUserQuestion`. Record consensus + any redirection to `checkpoint-log.md`, and the tool choices to `toolkit-log.md`.
- **`auto`** — run autonomously; **self-play the dialectic** (present STATE/THINKING/PROPOSAL + your own challenge + decision, logged to `checkpoint-log.md`). Escalate to a real `AskUserQuestion` only at the irreducible stops: **CP-PORPOISE, CP-PREWIRE, and any founder-only datum** (the v1.8 hitl receipt).

**Both modes REPORT per-step** — surface the thinking in the conversation as you go; never silently write files (the v1.8 failure was a silent run that emitted only artifacts).

### The 7 team sessions (checkpoints) — logged to `checkpoint-log.md` (`kind` column)

| # | kind | when | the session | gate |
|---|---|---|---|---|
| 1 | **frame** | end of State | align TOSCA + core question + day-one answer | warn |
| 2 | **hypothesize** | Frame→Structure | **generate ≥3 competing, mutually-exclusive candidate answers**; the day-one answer is the lead, alternatives explicit; route the workplan to **DISCONFIRM** each, not confirm the favorite | prose |
| 3 | **plan** | tree built | the MECE issue tree (cleaving — a distinct cognitive act) | prose |
| 4 | **prioritize** | the cut | impact×influence 2×2; **record what was DROPPED and why** | warn |
| 5 | **porpoise** | each Solve reframe | "data reframed X→Y; the rethink + revised workplan" | prose (founder-only facts → hitl receipt) |
| 6 | **dissent** | after Solve | **independently red-team the ANALYSIS**: name the one analysis that, if wrong, flips the answer; hunt disconfirming evidence (≠ pre-mortem, which attacks the *recommendation*; ≠ completeness, which attacks *coverage*) | **ERROR** |
| 7 | **pre-wire** | before Sell | final one-day answer + synthesis + the **completeness/coverage critic** + the pre-mortem; pre-wire | **ERROR** |

The gate (`mckinsey-run.cjs check <slug> --before-sell`) **blocks Sell** without a `pre-wire` AND a `dissent` session, and **warns** if `frame`/`prioritize` are missing. **Honest ceiling:** the gate can't prove a session happened or was good — it makes *skipping the closing sessions* a failure and leaves an auditable trail. (`--depth=quick` is the accordion escape hatch — inline answer, no folder, no gate.)

### The two EM moves that make a team (not a solo)

1. **so-what on every exhibit** — an observation is NOT an insight until it implies an action (`/think so-what`). Force it at every checkpoint.
2. **Ghost-exhibit first** — the workplan's `end-product` column IS the dummy exhibit (Exhibit 4.3): draw the chart you EXPECT before you have the data; if the *filled* exhibit wouldn't change the answer, the analysis wasn't worth running. The **action-titled storyline is built HERE at Structure** (to drive the workplan), NOT invented at Sell.

### Disconfirmation is the law (the single discipline that most prevents confident-wrong)

Every carried one-day answer must **name the single analysis that would prove it WRONG**, and that analysis must appear as a **workplan row**. *An answer no evidence could overturn isn't an answer — it's a belief.* CP-DISSENT red-teams exactly this. Carry the competing hypotheses you're disconfirming in `one-day-answer.md` (the `**Competing hypotheses**` + `**Disconfirmation**` lines).

### Thorough data sweep (never 1–2 shallow areas)

Sweep the relevant source **CLASSES** for real (route via the data-routing table): internal **deepask / wiki_ask / gbrain / supabase-ops / analytics** + external **deep-research / web** + **ask-user** for what only the founder holds. At CP-PREWIRE run the **completeness-critic** (mirrors `deepask/completeness-critic`): *"which source CLASS did we NOT consult? what's unverified? what gap needs founder input?"* → consult it, ask-user (a hitl receipt), or carry an explicit assumption + sensitivity. Write the **COVERAGE** statement into the CP-PREWIRE checkpoint row: `internal[deepask✓ wiki✓ brain✓ supabase✓ analytics✓] external[web ✓/—] gaps[…] → remedy`. `--sources` scopes the sweep.

### Dynamic workflows (`--workflow`) — orchestrate each step as a multi-agent fan-out (v2.1)

When `--workflow=steps|full`, the high-leverage steps run as a **Claude Code dynamic Workflow** (the Workflow tool — a script that orchestrates many subagents in parallel), pushing each step's quality far above a single-agent pass. **Setting `--workflow` IS the explicit opt-in the Workflow tool requires.**

**The load-bearing constraint (from the workflow runtime):** a workflow takes **NO mid-run user input** — *"for sign-off between stages, run each stage as its own workflow."* This composes exactly with the checkpoint model: each **STEP runs as its own workflow** (heavy parallel work, no HITL inside); the **CHECKPOINTS between steps stay in the active session**, where the main agent presents the workflow's output and (interactive mode) brainstorms with the founder. **Workflow output is EVIDENCE, not a decision** — run it through the validation gate like any datum; a fan-out judge-panel must NOT launder a verdict past the gate (the `evidence-not-decider` discipline already applied to `/deepask`).

**Per-step workflow patterns** (author the workflow INLINE via the Workflow tool per the shape below; pre-baked saved `.claude/workflows/` scripts are a v2.2 follow-up once exercised on real runs):
- **CP-HYPOTHESIZE → judge-panel of competing hypotheses.** `parallel()` N agents, each generating a candidate answer from a different angle (MVP-first / risk-first / contrarian / customer-first); dedup; keep ≥3 mutually-exclusive, each routed to disconfirm.
- **Solve data-sweep → multi-modal sweep + adversarial verify.** `parallel()` one agent per source CLASS (deepask / wiki / brain / supabase / analytics / web); then per datum a `parallel()` adversarial-verify panel runs the validation gate (knock-out → degree → causation → sensitivity → triangulation) and votes — mirrors `/deep-research`'s cross-check-and-vote.
- **CP-DISSENT → perspective-diverse red-team.** `parallel()` N independent agents each try to REFUTE the answer (find the falsifier); if ≥majority refute → the answer is fragile → back to Solve.
- **Sell → judge-panel of drafts.** `parallel()` draft N deliverables (different templates/angles); judge against the McKinsey-template `rules`; synthesize from the winner, grafting the best of the runners-up.

**Levels + cost.** `off` (default) = solo agent (no workflow). `steps` = workflows at hypothesize / solve-sweep / dissent / sell. `full` = every step that benefits. `--depth` scales the fan-out (`quick` skips workflows; `deep` ⇒ `full`). Workflows spawn many agents (16 concurrent / 1000 max per run) → use only when `--workflow` is set; gauge cost on a small slice first.

**Audit annotation.** When a step used a workflow, tag its `checkpoint-log.md` row `workflow:<step>` (e.g. `workflow:dissent`) — an auditable trail of where the heavy orchestration ran (discipline-not-proof, like the `[H<n>]` receipt; NOT gated, since the run folder can't see the Workflow runtime).

## Run setup

For a substantial problem, **scaffold the run folder mechanically** — don't hand-create it:
```bash
node scripts/thinking-toolkit/mckinsey-run.cjs scaffold <slug>   # creates .archives/mckinsey/<slug>/ with 7 artifact templates (idempotent)
```
```
.archives/mckinsey/<slug>/
  problem-statement.md   decomposition.md   workplan.md
  analysis-log.md        hitl-log.md        checkpoint-log.md   one-day-answer.md
  synthesis.md           communication.md
```
`one-day-answer.md` is the **living state** — **seeded in STATE as the day-one hypothesis** ("if forced to answer today, we'd say X"; Bulletproof Ch 1), then rewritten after every analysis (situation → observation → resolution). It is *not* born at Solve; Solve only sharpens it. `hitl-log.md` is the **HITL receipt ledger** — also seeded in STATE and appended through Solve; every real `AskUserQuestion` you put to the founder gets a row (`H1`, `H2`, …) with the verbatim one-line answer (see §SOLVE + the receipt rule below). `synthesis.md` (step 6, the logic) and `communication.md` (step 7, the story) are distinct Sell products. For a small problem, the accordion compresses: keep the one-day answer inline and skip the folder.

**The discipline gate (run during + before Sell):**
```bash
node scripts/thinking-toolkit/mckinsey-run.cjs check <slug>                 # runs every iteration — includes the v1.8 HITL receipt gate
node scripts/thinking-toolkit/mckinsey-run.cjs check <slug> --before-sell   # additionally enforces the stopping gate
```
fails if the workplan is missing its 6+status columns, a status value is invalid, a `source-of-data` references `product.*` (firewall), an analysis-log datum lacks provenance or a degree(1-8), an **`ask-user` datum has no `[H<n>]` receipt resolving to a row in `hitl-log.md`** (v1.8), or (with `--before-sell`) any workplan row is still `open` **OR `checkpoint-log.md` lacks a `pre-wire` session AND a `dissent` session** (v2.0; it also WARNS if `frame`/`prioritize` are missing). **You may not move to Sell while it fails.** It checks *structure + discipline-presence*, never your judgment — and both the receipt gate and the checkpoint gate are **discipline, not proof** (a checker can't see the conversation; they make *skipping* the ask / the closing sessions a failure and leave an auditable trail).

---

## ① STATE — frame the problem  ·  artifact: `problem-statement.md`

Fill **TOSCA** (run `/think tosca`): **T**rouble (gap as a symptom, not a diagnosis; pass "Why now?") · **O**wner (whose problem + who judges "good enough") · **S**uccess criteria (time-bound + quantified; *never* defined as the proposed solution) · **C**onstraints (provisional — revisit during Solve) · **A**ctors. Then write the **Core Question** and run the **5-check** (does it address Trouble / from Owner's view / meet Success / recognize Constraints / consider Actors?).

**HITL here (hard gate, v1.8):** where a TOSCA slot needs input only the founder holds — the real success threshold, a fixed constraint, strategic intent — you **MUST emit a real `AskUserQuestion` and log it to `hitl-log.md` as `H<n>` before seeding the day-one answer; do not fabricate it** (the v1.3 worked example *invented* `Success = 8%→15%`; the engine asks, logs the receipt, and only then seeds). Iterate with the owner until they agree "answering this question solves my problem."

**Then seed the day-one answer** (`one-day-answer.md`): the moment framing is done, write the provisional hypothesis — *"if forced to answer today, we'd say X, because Y."* It will be wrong; that's the point — it's the spine Structure + Solve sharpen, and it re-ranks the workplan. Skipping it (waiting to "have the data first") is the classic non-McKinsey move.

**Path gate 1 — the 4S diagram's FIRST diamond (`decision_gates.know-enough-to-state`):** *"Do you know enough to STATE the problem?"* If you genuinely **can't frame it** (no clear Trouble/Owner; the problem is ill-defined or human-centered / desirability-led), do NOT force TOSCA — enter the **design-thinking path** and **EMPATHIZE first (Cracked It! Ch 8)** to (re)discover the real problem (POV / How-Might-We), then come back to define it. **Design-thinking is staged across ALL three bands** — Empathize=State, Ideate=Structure, Prototype&test=Solve (`paths.design-thinking.band_staging` in the catalog) — it is NOT a Solve-only detour. (The three paths + five diamonds of Fig 3.1 are first-class in `knowledge/mckinsey-workflow.yaml` → `paths` + `decision_gates`.)

*(Boundary: a problem with no clear owner / irreconcilable owners is a wicked problem — TOSCA doesn't fit; say so.)*

## ② STRUCTURE — disaggregate + build the workplan  ·  artifacts: `tree.md`, `workplan.md`

**Choose the path — the 4S diagram's Structure diamonds** (`decision_gates`; the 3 paths' full band-staging in the catalog `paths`):
- **Gate 2 — `have-candidate-solution`:** *"Do you have a good candidate solution?"* (a strong prior, or time-starved). **YES → the hypothesis-driven path** — Build the Hypothesis Pyramid (governing hypothesis → MECE sub-hypotheses) and route the workplan to DISCONFIRM the lead. **NO → Gate 3.**
- **Gate 3 — `can-build-issue-tree`:** *"Can you build an issue tree?"* **YES (the DEFAULT) → the issue-driven path** — Build the Issue Tree. **NO → the design-thinking path** — IDEATE (diverge→converge; Ch 9), then prototype & test (Solve) until Desirability×Feasibility×Viability.

(The diagram's Empathize→Ideate→Prototype design-thinking column threads State→Structure→Solve — see `paths.design-thinking`; here at Structure you are at its **Ideate** band if you took the NO-NO route.)

**Pull an inherited domain process if one fits (v3.0) — don't reinvent the tree.** Check `knowledge/thinking-tool-index/processes.md` (the domain-process router). If the problem signature matches a row (strategy / operating-model / digital / change / HR / M&A / PMI / sales-pricing / supply-chain / Lean-Six-Sigma / risk / business-case / dashboards / leadership / FP&A / data-AI / personal-finance), **load that inherited ex-McKinsey process** (`wiki/consulting-toolkits/<slug>/process.md`, full spine in `knowledge/consulting-processes.yaml`) and use its **gated phase spine + frameworks-per-phase as your issue-tree/workplan skeleton** — then adapt it to THIS problem (it is a starting structure refined by real data, not a script to follow blindly; you still cleave, prioritize, and porpoise). This is the "inherited from people who did the work at McKinsey" leverage: a proven, complete decomposition for the domain instead of an ad-hoc one. If no process matches (a novel/cross-domain problem), build the MECE tree from scratch as below.

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
2. **PULL** the data — a real tool call. If it's founder-only → **emit a real `AskUserQuestion`, write the question + the founder's verbatim (one-line) answer to `hitl-log.md` as `H<n>`, and tag the analysis-log row `ask-user (founder) [H<n>]`.** You may NOT write `ask-user` provenance without a logged receipt — the gate fails it. If you choose not to ask, the only honest provenance is `assumption` (degree ≥6 + a sensitivity line). **Never assert a fact you didn't fetch, and never let a degree-3 "likely" inference pass as a fact without a receipt.**
3. **VALIDATE** through the gate (below); tag the datum's degree-of-certainty (1–8).
4. **WRITE** to `analysis-log.md`: hypothesis · data pulled (which tool) · result · validation verdict · degree.
5. **UPDATE** `one-day-answer.md` (S→O→R).
6. **MARK** the row `validated` or `knocked-out`; if it spawned deeper sub-analyses, append them as `open` rows and mark this one `spawned`.
7. **RE-ROUTE** per the dynamic rules — re-prioritize the remaining `open` rows against the *new* one-day answer / porpoise / switch direction / pick a different tool.

Loop until the **stopping criterion** holds → Sell. **You may NOT move to Sell with any `open` row still above the knock-out bar** — an open high-value row means the answer can still change (this is the explicit guard against the v1.3 drift: narrating opinions while rows silently go stale).

> **Worked micro-loop (real pulls, not fabricated):** *Hypothesis:* "free→paid is gated by the 7-day inactivity cliff, not price." *Analysis:* cohort conversion, returners vs non-returners. *Source:* `mcp__supabase-ops__query` on `metrics.product_dau_snapshot` — **or, if that ETL is empty, `AskUserQuestion` to the founder for the cohort number** (don't invent it). *Validate:* knock-out (does it move the answer? yes) → degree-2 hard number → correlation≠causation (triangulate with a second cut: do 7-day-returners differ in source/plan?) → sensitivity. *Update one-day answer:* returners convert 4×. *Re-route:* cliff confirmed → knock out the pricing branch, double down on reactivation.

### Tool selection — load + select the RIGHT framework (`tool_selection` in the catalog)

*Routing* (next table) answers **where to get the data**. *Selection* answers **which framework / model / analysis to apply** — the v1.5 mechanism, **expanded in v3.0 to the full consulting thinking-tool library**. The candidate pool is now UNIFIED:
- **207 book frameworks** — `knowledge/problem-solving-frameworks.yaml` (distilled from *Bulletproof* + *Cracked It!*; classified by `fours_step` + `type`).
- **424 consulting-toolkit frameworks** — `knowledge/consulting-frameworks.yaml` (reconstructed from the 20 ex-McKinsey domain toolkits; each richly tagged `fours_step` · `cognitive_moves` · `domains` · **`select_when`** (the disambiguator) · `checkpoint_fit`, pointing to a `wiki/consulting-toolkits/.../concepts/<slug>.md` page).
- **20 inherited domain PROCESSES** — `knowledge/consulting-processes.yaml` (the gated phase-spine playbooks; see STRUCTURE below).

= **631 tools + 20 processes.** Three stages:

**1 · CLASSIFY the sub-need** (source decision-trees decide what *kind* of tool fits):
- **solve_mode** — *analytical* (a right answer exists → hypothesis + workplan loop) vs **design** (ill-defined / human / innovation → the **design-thinking branch**: empathize → reframe (HMW) → ideate → prototype → test, until desirability×feasibility×viability). [`five-phases-of-design-thinking`]
- **analysis_mode** — *description* (summary stats) vs *causation* (experiment / natural-experiment / regression) vs *prediction* (ML / Monte-Carlo). **Heuristics before big guns** — escalate only when a cheap tool can't move the answer. [`analytics-tool-selection-decision-tree`]
- **framework_shape** — a *formula* (compute a number) vs a *typology* (2×2 / segmentation) vs a *checklist* (factors to cover). Match the shape to the job. [`three-styles-of-frameworks`]

**2 · LOAD candidates — the FAST per-checkpoint map (v3.0; the "load fast, no context-lost" guard):** do **NOT** load the whole 631-tool registry into context. **Load ONLY the per-4S-step map for your current step** — `knowledge/thinking-tool-index/{frame|structure|solve|sell|cross}.md` — a compact 1-line-per-tool slice (`tool · select-when · moves · domains · checkpoint · → page`). Then **filter that map** by your `domain` + `cognitive_move` + scan the **`select when`** column (the disambiguator that separates neighbours — e.g. Porter's Five Forces *"is this industry structurally attractive before entry/investment"* vs Value Driver Tree *"which lever actually moves the economics"*). That is your shortlist. (Still `resolver_find` for matching `/think` skills + `wiki_ask`/the registries for a long-tail concept the map doesn't carry.) **READ each finalist's wiki page before applying** — the map is a pointer; the page is the executable how-to (tutorial + template). See `knowledge/thinking-tool-index/README.md`.

**3 · SELECT + COMBINE:** Munger **latticework** — combine 2–3 *complementary* lenses (e.g. a typology to map options + a causal analysis to test the driver), never one [`multiple-frameworks-discipline`]. **Debias:** don't grab the framework you know best and bend the problem to fit — match tool to problem; a familiar tool as the *only* candidate is a smell → widen the load [`framework-mental-model-danger` / Maslow's hammer].

**4 · RECORD (v3.5) — write the choice down; a selection isn't real until it's logged.** Append a `toolkit-log.md` row for the sub-need: the CLASSIFY tags · the candidates LOADed · the ≤3 SELECTED (slug + why-fit) · the REJECTED (+ why-not / debias). The McKinsey crux is *recorded* tool use, not silent tool use — the `--before-sell` gate REQUIRES ≥1 selection row, and a choice you didn't record can't be surfaced in the Sell report's Method section or the reasoning-trace's `toolkit_map` / `issue_tree`. At each interactive checkpoint, PRESENT the toolkit-log rows for that step (the "which frameworks + why" the team sees), so tool-selection is a live, auditable part of the session, not an afterthought.

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
5. **Triangulation / dissent:** has a *second, independent* read agreed? Generate + test one alternative interpretation before accepting the convenient one. (Pair `/think debias`.) **v3.3 — for a load-bearing EXTERNAL / degree-≥5 number this is a MECHANISM, not a vibe:** fire `data-verification` (≥2 independent web/deep-research sources → a verification status: `verified-multi` / `single-source` / `conflicting` / `unverified`), recorded in the analysis-log verdict. *Actively search* for accurate reference numbers — never bank a single recalled figure.
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

**The receipt gate (v1.8) — what "ask" mechanically means.** Each of the triggers above is now *gated*: when you ask, you **log the question + the founder's verbatim one-line answer to `hitl-log.md`** as `H<n>` and tag the analysis-log datum `ask-user (founder) [H<n>]`. A bare `ask-user` with no receipt **fails `mckinsey-run.cjs check`**. The most dangerous miss is a **porpoise resting on a founder-only fact**: before you reframe on "these accounts are the founder's own," "the power-user is internal," "the real budget is X" — **STOP and confirm.** A degree-3 *"likely internal"* inference may **not** be promoted to an asserted fact (and drive the whole strategy) without a logged receipt — that exact failure (the 2026-06-04 run) is why this gate exists. Honest alternative if you won't ask: keep provenance `assumption`, degree ≥6, with a sensitivity note — never relabel a guess as an answer. **The gate is discipline, not proof:** it can't watch the conversation, so it can't *prove* you asked; it makes *not asking* (or faking the label) a failure and leaves the founder an auditable trail to spot-check.

### Stopping criterion (Solve → Sell — `stopping_criterion`; the diagram's gates 4-5)

This IS the 4S diagram's Solve diamonds — `candidate-solution-confirmed` (hypothesis path) / `satisfactory-solution` (issue + design paths). **NO → porpoise back to Structure** (sibling MECE branch / re-cleave / re-ideate-prototype), never patch the dead branch. **YES →** Sell. Stop when ALL hold: central hypothesis **proven by an adversarial test** + one-day answer stable; **marginal** — no remaining analysis is cheap+powerful enough to move the answer; **robust to sensitivity**; residual uncertainty **labeled** as judgment calls. One-line test: *"proven + robust, and no cheap answer-moving analysis remains?"*

## ④ SELL — synthesize THEN communicate (two distinct moves)  ·  artifacts: `synthesis.md`, `communication.md`

Bulletproof separates step 6 from step 7; don't conflate them.

**(6) SYNTHESIZE the LOGIC** (`synthesis.md`) — build the argument so it stands on its own *before* any telling. Run `/think pyramid` + `/think so-what`: **governing thought first** (the recommendation as one crisp sentence) → **MECE key line** → support, from the final one-day answer + analysis-log. If the logic doesn't hold as a bare pyramid, no storytelling will save it.

**(7) COMMUNICATE the STORY** (`communication.md`) — render that logic for THIS audience. Choose **grouping** (receptive) vs **argument/SCR/SCQA** (skeptical). **Action titles** (each section a full declarative sentence; read aloud = the storyline). **Pre-wire** the owner so the final answer isn't a surprise.

> **APK guard (anxious-parade-of-knowledge):** lead with the *answer*, not the journey. Do NOT dump everything you found or tell the **story-of-the-search** (problem → all the analyses we ran → … → answer). The reader wants the answer first; the analysis is support, surfaced only as needed.

---

## ⑤ TRACE — the thinking journal (v3.3) · `/think trace <slug>`

After a substantial run, **`/think trace <slug>`** turns the run folder into a narrated **McKinsey thinking journal** — a 4S **timeline + flow/tree graph** (with the porpoise back-edges drawn) + per-band narration (*what · which framework/toolkit was chosen and WHY · the decision + its basis · the disconfirmation · any porpoise*) + a **data-provenance ledger** (each datum's tool + degree + verification status) + the **decision log** → **PDF**. Pipeline: `scripts/thinking-toolkit/trace-extract.cjs` (run folder → `trace.json`) → the `reasoning-trace` skill writes the narration → `scripts/thinking-toolkit/trace-build.py` renders the diagrams + compiles the PDF. It is the **provenance of the thinking** — auditable, study-able — distinct from the `--sell` report (which carries the *answer*). See `thinking-toolkit/reasoning-trace`.

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
Machine-readable spec + per-step concept bindings: `knowledge/mckinsey-workflow.yaml` + `knowledge/schemas/mckinsey-workflow.schema.json`.

**The thinking-tool library (v3.0 — the candidate pool for Selection):**
- `knowledge/problem-solving-frameworks.yaml` — **207** book frameworks (filter by `fours_step` + `type`).
- `knowledge/consulting-frameworks.yaml` — **424** consulting-toolkit frameworks, reconstructed from 20 ex-McKinsey domain toolkits, tagged `fours_step`·`cognitive_moves`·`domains`·`select_when`·`checkpoint_fit` → `wiki/consulting-toolkits/<toolkit>/concepts/<slug>.md`.
- `knowledge/consulting-processes.yaml` — **20** inherited domain process playbooks (gated spines) + routing cards.
- `knowledge/thinking-tool-index/{frame,structure,solve,sell,cross}.md` — the **fast per-4S-step maps** (unify all 631 tools; load ONLY the current step's map at a checkpoint — the no-context-lost guard) + `processes.md` (the domain-process router) + `README.md`. Built by `scripts/consulting-toolkit/build-thinking-os.cjs`; the toolkit knowledge layer is `wiki/consulting-toolkits/`. Concepts beyond the maps stay reachable per-step via `wiki_ask` + the registries.

## Anti-claims

- This is NOT a brainstorm and NOT deterministic code — it's a judgment-heavy operating procedure an intelligent agent executes with real tools.
- It does NOT fabricate facts — every datum is pulled or asked-for, and validated.
- 4S is NOT a rigid waterfall — it porpoises; the one-day answer is the living state, not an end-of-run summary.
- It is NOT mandatory for every question — the accordion compresses for small problems; a single `/think` skill or `/deepask` is often enough.
