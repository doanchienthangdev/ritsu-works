# Changelog — capability `thinking-toolkit`

> Versions v1.0–v1.6 are documented in detail in the registry notes
> (`knowledge/capability-registry.yaml`, `thinking-toolkit` entry) and `spec.md`.
> This file is the forward changelog from the point it was created (v1.7).

## v3.3.0 — 2026-06-05 — Reasoning Trace + Data Verification (auditable thinking + verified numbers)

**`/cla extend` (autonomous, founder away)** · running the engine on the 100-love-paying study, the founder surfaced three gaps in the workforce's primary problem-solver: the thinking JOURNEY is scattered across 9 artifacts (hard to study/audit); research numbers can be WRONG with no re-check mechanism; and deep-research/search are under-used for accurate reference numbers. v3.3 closes all three — a rigor + transparency upgrade. Proposal: `.archives/cla/reasoning-trace-and-verify/proposal.md`.

- **NEW `thinking-toolkit/reasoning-trace` (`/think trace <slug>`)** — turns a completed `mckinsey` run folder into a narrated **"McKinsey thinking journal" PDF**: a 4S **timeline + flow/tree graph** (porpoise back-edges drawn) + per-band narration (*what · which framework/toolkit chosen and WHY · the decision + its basis · the disconfirmation · any porpoise*) + a **data-provenance ledger** + the **decision log**. The *provenance of the thinking* — auditable + study-able — distinct from the `--sell` report (the answer). Pipeline: `scripts/thinking-toolkit/trace-extract.cjs` (pure-Node, run folder → `trace.json`, **15 tests**) → the skill writes the narration → `scripts/thinking-toolkit/trace-build.py` (local renderer: matplotlib diagrams + weasyprint PDF, like the report builder).
- **NEW `thinking-toolkit/data-verification` (`/think verify [claim]`)** — the re-check **mechanism**: a load-bearing EXTERNAL / degree-≥5 datum is triangulated across **≥2 independent web/deep-research sources** → a verification **status** (`verified-multi` / `single-source` / `conflicting` / `unverified`) + the sources, recorded in the analysis-log verdict. Turns the validation_gate's triangulation step from prose into a fired mechanism; mandates *active search* for accurate reference numbers (never bank a single recalled figure).
- **Engine wiring** — `mckinsey-workflow.yaml` → **3.2.0**: NEW `data_verification` + `reasoning_trace` top-level sections (additive, schema-safe); `data-verification` added to the Solve step; the deep-research routing note + the validation_gate triangulation check strengthened to mandate verification before a number moves the one-day answer. `/think` grows to **17 verbs**.

**Honest scope:** the trace is reconstructed from the persisted artifacts (not a live keystroke log) — as honest as the run folder the `mckinsey-run.cjs` gate already disciplines; verification makes a number's *trustworthiness explicit* (how many independent sources agree), not TRUE. No `mckinsey-run.cjs` gate change (its artifact-coherence kept intact); a mechanical verification gate is a clean v3.4 follow-up. `thinking-toolkit` → **v3.3.0**. Run record: `.archives/cla/reasoning-trace-and-verify/`.

## v3.2.0 — 2026-06-05 — institutionalize `/think mckinsey` as the workforce's PRIMARY problem-solver

**`/cla extend` (autonomous, founder away)** · the v3.1 audit found that "primary problem solver" is a **routing/institutional property, not a capability property** — and that layer was empty: no SOP triggered the engine, no persona invoked it (they used pyramid+so-what only), `/cla` didn't route through it, track record N≈1. The engine was a great tool *on the shelf*. v3.2 builds the layer that puts it to work.

- **NEW `thinking-toolkit/problem-triage` (`/think triage <problem>`)** — the router that makes mckinsey the primary solver **without over-applying it**. Two axes (CONSEQUENCE = stakes × reversibility · SHAPE = known/lookup vs needs-synthesis) → four weights: ① direct answer · ② `/deepask` · ③ a single `/think` atom · ④ `/think mckinsey` (the full 4S engine). Route ④ ONLY when all three hold (consequential + ambiguous + multi-source); else a lighter route + say why (anti–anxious-parade-of-knowledge). The 13th `/think` skill / 15th verb.
- **NEW `SOP-AIOPS-012-consequential-problem-solving`** — the institutional mandate: a consequential decision (Tier-C/D framing · weekly review question · founder strategic question · `/cla` problem-framing · pillar strategic decision) → triage → (route ④ → run the engine) → the `.archives/mckinsey/<slug>/` run-folder IS the decision record (linked to `ops.decisions`) → act only after the `--before-sell` gate clears AND the decision's own HITL ceremony. Two guards: anti-over-application + thinking-not-deciding.
- **The @ceo/@cgo/@cpo routing reflex** — `.claude/agents/{ceo,cgo,cpo}.md` now mandate: before a Tier-3/4 (CEO) / strategic-wedge-funnel-build (CGO/CPO) decision, TRIAGE first; route ④ → run the full engine and let its data-grounded study back the recommendation — a strategic call is no longer shipped on pyramid+so-what alone. (Previously the personas referenced only the output atoms.)

**Honest status:** this makes the engine the *designated* primary solver and wires the reflex; the *track record* (≥5 diverse real studies) accumulates only by being invoked — which is exactly what this layer now causes. `thinking-toolkit` → **v3.2.0**. Run record: `.archives/mckinsey-rigor-fix-2026-06-05/05-primary-solver-institutionalization.md`.

## v3.1.0 — 2026-06-05 — restore the 4S-diagram topology + close the coherence gap + enforce the gate

**`/cla fix`+`extend` (autonomous, founder away)** · a deep audit of `/think mckinsey` against the canonical 4S diagram (*Cracked It!* Fig 3.1) scored it **6.2/10**: the thinking content is excellent (it exceeds the bare diagram) but the one thing McKinsey's power depends on — rigorous, ENFORCED process adherence — had three gaps. This release fixes all three.

**G1 — enforcement was honor-system → now auto-run + deeper.**
- NEW hook `.claude/hooks/runtime/pre-write-mckinsey-gate.cjs` (+ spec `.claude/hooks/pre-write-mckinsey-gate.md`, wired into `.claude/settings.json` Write+Edit). It **auto-runs** the `mckinsey-run.cjs --before-sell` gate the moment a Sell artifact (`.archives/mckinsey/<slug>/communication.md`) is written, logging `mckinsey.sell_gate_failed` + a stderr advisory when an ungated Sell ships. **Observation-only** (never blocks; `BLOCK_ON_FAIL=false`) — matches the repo hook philosophy + is unattended-safe.
- `mckinsey-run.cjs` gains 3 deeper `--before-sell` checks: **workplan ≥2 data rows** (MECE minimum — the decomposition lives in the workplan), a **non-trivial `**Disconfirmation:**` line** (empty → ERROR; absent/old-format → WARNING), and **≥1 real pulled source** (not all ask-user/assumption → WARNING).

**G2 — the diagram topology was flattened → restored as first-class catalog sections.** `knowledge/mckinsey-workflow.yaml` (2.0.0 → 3.1.0) gains `paths` (the 3 paths — hypothesis-driven / issue-driven / design-thinking — each with `entry_condition` = its decision diamond + `band_staging`, crucially staging **design-thinking across State=Empathize → Structure=Ideate → Solve=Prototype**, not buried in Solve), `decision_gates` (the 5 diamonds + YES/NO routing), and `tool_library` (the full v3.0 631-tool / 20-process pool reconciled into the spec). `validate-mckinsey-workflow.cjs` enforces the 3 canonical paths + gate-route integrity + tool_library counts. The mckinsey SKILL §STATE/§STRUCTURE/§SOLVE now make the gates explicit.

**G3 — count drift was CI-invisible → now a falsifiable invariant.** The hand docs stated `460 consulting frameworks → 667 tools + 19 processes`; the real registries are `424 → 631 + 20`. NEW `scripts/cross-tier/validate-mckinsey-coherence.cjs` (wired into `check-consistency.cjs` + a CI job) asserts every stated count in SKILL.md / command / index README equals the actual registry entry counts. SKILL.md + `think.md` + the index README + the `build-thinking-os.cjs` generator corrected to 424/631/20; version aligned to **v3.1.0** across command / yaml / registry / spec.

**Tests:** `tests/mckinsey-workflow.test.ts` (+paths/gates/tool_library cases), `tests/mckinsey-run.test.ts` (+the 3 deeper gates), NEW `tests/pre-write-mckinsey-gate.test.ts`, NEW `tests/mckinsey-coherence.test.ts`. Run record + re-audit: `.archives/mckinsey-rigor-fix-2026-06-05/`.

## v3.0.1 — 2026-06-05 — 20th toolkit (#18 CX & Design Thinking) folded into the library

The founder supplied the late-arriving **#18 Customer Experience Strategy & Design Thinking** toolkit. Reconstructed + integrated identically to the other 19 (incremental run on the proven pipelines). Net effect on the thinking-tool library:
- Unified toolkit registry **374 → 424 deduped frameworks** (`consulting-frameworks.yaml`); domain processes **19 → 20** (`consulting-processes.yaml`, +the 9-phase CX-strategy + Design-Thinking spine). Per-4S-step maps + the unified pool now **631 tools** (424 toolkit + 207 book).
- **Especially fills the design-thinking gap:** the engine already had a design-thinking BRANCH but few tagged design-thinking TOOLS; #18 adds ~50 (empathy maps, personas, journey maps, HMW, Crazy 8s, design sprint, MVP, usability/A-B/accessibility testing, …) tagged with the `design`/`prototype`/`diagnose` cognitive-moves and `solve`/`structure` 4S steps.
- Wiki: `wiki/consulting-toolkits/` grows to 20 process pages + **514 concept pages**. No `/think mckinsey` SKILL change needed — the integration is data-driven (the maps + registries the engine already reads now include #18).

## v3.0.0 — 2026-06-05 — the consulting thinking-tool LIBRARY + fast checkpoint tool-selection

**`/cla` (autonomous, founder away)** · the founder's thesis: *"the pinnacle of McKinsey thinking is selecting the most-correct thinking tool at each checkpoint,"* backed by inherited ex-McKinsey processes. This release makes `/think mckinsey`'s tool-selection draw from the full reconstructed consulting library (the `consulting-toolkit` capability's 19 domain toolkits) and adds a fast, precise, no-context-lost checkpoint selector. Built with two bounded Workflows (reconstruction reuse + a 19-agent enrichment-tagging pass).

**Part 1 — the knowledge layer (ask 1).** The 19 reconstructed toolkits are ingested into `wiki/consulting-toolkits/` (1 wiki source · 19 `process.md` · **460 framework concept pages**) — the searchable knowledge behind selection. (DB rows + embeddings = backfill follow-up; the engine runs in-session and reads the files + registry directly.)

**Part 2 — the unified registry (ask 2).** Faithful extension of the existing CLASSIFY→LOAD→SELECT mechanism. The candidate pool grows from **207 book frameworks** to a UNIFIED **667 tools** (207 books + `knowledge/consulting-frameworks.yaml`'s **374 deduped toolkit frameworks**, each tagged `fours_step`·`cognitive_moves`·`domains`·**`select_when`** (the disambiguator)·`checkpoint_fit` → its wiki page) + **19 inherited domain PROCESSES** (`knowledge/consulting-processes.yaml`, gated phase-spine playbooks + routing cards).

**Part 3 — fast + precise checkpoint selection (ask 3).** `knowledge/thinking-tool-index/{frame,structure,solve,sell,cross}.md` = compact per-4S-step maps (1 line/tool) — the engine loads ONLY the current step's map at a checkpoint (the **no-context-lost guard**), filters by domain + cognitive-move + `select_when`, picks 2-3 complementary lenses, then reads the finalist's wiki page. `processes.md` is the **domain-process router**: at STRUCTURE, a domain problem pulls its inherited process as the issue-tree/workplan spine instead of an ad-hoc tree.

**Engine integration** — `mckinsey-workflow/SKILL.md` §Tool-selection (LOAD now uses the per-step maps) + §STRUCTURE (domain-process pull) + References updated. **Guards:** L1 schemas for both new registries (`validate-tier1`); L2 `validate-thinking-os.cjs` (every framework `wiki_path` exists · valid `fours_step` · processes ↔ wiki pages · maps present) registered in `pnpm check` AND CI. Build: `scripts/consulting-toolkit/{to-wiki-and-registry,build-thinking-os}.cjs`.

## v2.2.0 — 2026-06-04 — primary-source genre matrix + /dataviz integration

**`/cla extend thinking-toolkit`** · the founder's two upgrades: report presentation *"đạt tầm vóc mckinsey"* + integrate the new `/dataviz` capability. Grounded by the **`mckinsey-grounding-research` workflow** (the founder asked to "tạo workflows") reading **3 REAL local McKinsey PDFs end-to-end** ([SIG] sustainable-growth-2025, [AI25] state-of-AI-2025, [B2B26] b2b-economics-2026).

**Part 1 — primary-source genre matrix.** Rebuilt `mckinsey-deliverable-anatomy.md` from the 3 primary reports (v2.1 used blog deconstructions). **Key finding: McKinsey has NO single house format — it is a GENRE-KEYED format system** (brand/impact · survey/data · thought-leadership-POV · decision-memo), each with its own front-matter device, header style, close, and methodology placement. `mckinsey-sell` now **classifies the genre FIRST**; added pull-quote/Pro-tip elements + the two verbatim source-footer forms; re-anchored `grounded_in` to the 3 primaries (templates 1.1.0 → 1.2.0).

**Part 2 — `/dataviz` integration.** The new `/dataviz` capability (CLA A, PR #235) is consumed at Sell: `mckinsey-sell` renders **every exhibit via `/dataviz`** (the exhibit action-title = the chart `--message`+caption; the source line = the footer `/dataviz` mandates; `--style` flows the brand). McKinsey is exhibit-led; the deliverable now ships genuine McKinsey-grade charts, not prose-described ones.

**Changed:** `mckinsey-deliverable-anatomy.md` (rewritten) + `mckinsey-sell`/`mckinsey-workflow` SKILL.md + `mckinsey-templates.yaml` (1.1.0 → 1.2.0). No new gate, no schema change. Decision: `ops.decisions` slug `thinking-toolkit-v2.2-real-grounding-and-dataviz`. Reversibility 5/5.

## v2.1.0 — 2026-06-04 — grounded sell templates + dynamic-workflow orchestration

**`/cla extend thinking-toolkit`** · MINOR (additive; `--workflow` defaults off → v2.0 preserved) · @cto APPROVE-WITH-NITS (4 fixes integrated). Two upgrades the founder asked for: sell *"đúng chuẩn McKinsey ngoài đời thực chứ không đoán"* + dynamic workflows at the important points.

**Part 1 — ground the sell templates in REAL McKinsey reports.** A `researcher` fetched real McKinsey deliverables (MGI *AI: The Next Digital Frontier* + verbatim deconstructions of *Women in the Workplace 2022*, *State of Fashion 2026*, …). v2.0 templates were "guessed from principles" and MISSED the real furniture: the boxed **IN BRIEF**, action titles on **EXHIBIT CAPTIONS** + a **source footer**, the named **"where to start"** block, the **methodology/appendix + survey-N**, the **city-tagged author box**; and a BUG — "every header is an action title" mis-fits trend/survey pieces (topic-labels are correct there). Fix: NEW grounding reference `mckinsey-sell/mckinsey-deliverable-anatomy.md` (9 components + per-type skeletons + citations); refined the 6 + added 3 real types (`mgi-research-report`, `insights-article`, `executive-briefing`) = **9 templates**; NEW **required `grounded_in`** citation field (schema + validator) — the mechanical "not guessed" anchor.

**Part 2 — `--workflow=off`(default)`|steps|full`.** Run each high-leverage step as a Claude Code dynamic **Workflow** (many subagents in parallel). The load-bearing constraint (no mid-run user input → "run each stage as its own workflow") composes with the checkpoints: each STEP = its own workflow (heavy fan-out, no HITL inside); the CHECKPOINTS between stay in-session for founder consensus; workflow output = **evidence through the validation gate**, not a decision. Per-step patterns documented (hypothesize→judge-panel; solve→multi-modal sweep + adversarial-verify; dissent→red-team; sell→judge-panel of drafts); pre-baked `.claude/workflows/` scripts deferred to v2.2. A `workflow:<step>` annotation leaves an auditable trail.

**Changed:** `mckinsey-templates.yaml` (1.0.0→1.1.0; 6→9 + `grounded_in`) + schema + validator + NEW `mckinsey-deliverable-anatomy.md` + `mckinsey-sell`/`mckinsey-workflow` SKILL.md + `think.md` + resolver page regen. **Tests:** +6 `mckinsey-templates`. No DB table, no migration, no new `/think` verb. Decision: `ops.decisions` slug `thinking-toolkit-v2.1-grounding-and-workflows`. Reversibility 5/5.

## v2.0.0 — 2026-06-04 — the McKinsey TEAM operating model

**`/cla extend thinking-toolkit`** · MAJOR · panel: **@cto** request-changes (4 must-fixes integrated) + an **ex-McKinsey EM** faithful-with-gaps (6 gaps integrated) · founder self-ship.

**Why:** founder thesis — *"the power of McKinsey is the disciplined TEAM process, not a fast answer; value is created in team problem-solving SESSIONS at milestones (re-frame, analyze, propose, verify, brainstorm, pick the right frameworks for the next step) with a concrete output + owner consensus at each."* v1.4-v1.8 gave the engine the substance; v2.0 adds the team OPERATING MODEL.

**Three additions on top of the v1.4-v1.8 engine:**

1. **Modes + 7 team sessions.** `--mode=interactive`(default)`|auto`. Seven checkpoints (frame/hypothesize/plan/prioritize/porpoise/dissent/pre-wire) logged to a NEW `checkpoint-log.md` artifact; a `--before-sell` gate REQUIRES a `pre-wire` + `dissent` session (WARNS `frame`/`prioritize`). `interactive` treats the founder as a team member (present STATE/THINKING-which-frameworks-+-WHY/PROPOSAL → ask *"what would have to be true for this to be WRONG?"*); `auto` self-plays the dialectic, escalating only at porpoise/pre-wire/founder-only-data. The EM substance: **competing hypotheses** (≥3, routed to disconfirm), **cleave ≠ prioritize**, a **dedicated dissent** that red-teams the ANALYSIS, **ghost-exhibit at Structure**, and the law that **every answer names the analysis that would falsify it**.
2. **Sell formatter.** NEW skill `thinking-toolkit/mckinsey-sell` + NEW registry `knowledge/mckinsey-templates.yaml` (6 templates) + schema + validator. **Composes** `deepask/format` (does NOT rebuild): builds the McKinsey-template-structured synthesis IR → renders via `deepask/format` with `--style`/`--art-style` as orthogonal design context (a template carries STRUCTURE prose only — `FORBIDDEN_BRAND_KEYS` guard — so it can't shadow the resolved `--style`).
3. **Thorough data sweep.** Sweep all source CLASSES + a completeness-critic at CP-PREWIRE writing a COVERAGE statement; `--sources` scopes it.

**Params:** `--mode --depth --sell --audience --style --art-style --sources --format`. **Changed:** `mckinsey-workflow.yaml` (1.7.0→2.0.0; +`checkpoint-log` + sell.skills `mckinsey-sell`) + schema + run-helper (checkpoint gate, robust like the v1.8 hitl gate) + validator ARTIFACTS + `mckinsey-templates.yaml`/schema/validator + validate-tier1 + check-consistency + CI job + SKILL.md + think.md + resolver regen. **Tests:** +9 `mckinsey-run`, +1 `mckinsey-workflow`, +24 `mckinsey-templates` (NEW). No DB table, no migration, no new `/think` verb. Decision: `ops.decisions` slug `thinking-toolkit-v2.0-mckinsey-team-mode`. Reversibility 5/5 (backward-compatible; gates fire only `--before-sell`).

## v1.8.0 — 2026-06-04 — the `/think mckinsey` HITL hard-gate

**`/cla extend thinking-toolkit`** · Tier C · @cto review APPROVE-WITH-NITS (3 must-fix integrated) · founder approve gate.

**Why:** founder ran `/think mckinsey` on a real problem and reported it *"không dừng lại tương tác từng bước; output không thể hiện rõ quá trình chạy."* The engine *described* HITL (`hitl_triggers`) but nothing **forced** a real `AskUserQuestion`, and the only mechanical gate (`mckinsey-run.cjs check`) validated artifact STRUCTURE only — a `ask-user (founder)` provenance row passed identically to a real pulled datum. In the run, the load-bearing porpoise (*"25 accounts = founder's own test emails; power-user = the founder"*) was lifted from a degree-3 `"likely internal"` inference to an asserted fact with no confirmation checkpoint.

**What changed — `ask-user` becomes a verifiable RECEIPT, not an honor-system label.** Every `analysis-log` datum with `/ask-user/i` provenance MUST carry a `[H<n>]` tag resolving to a row in a NEW `hitl-log.md` artifact (the question asked + the founder's verbatim one-line answer). No receipt → the gate fails; the honest no-ask path is provenance `assumption` (degree ≥6 + sensitivity note). **Discipline, not proof:** the gate can't see the conversation, so it can't *prove* the ask fired — it makes *skipping* it a failure + leaves an auditable trail (a true runtime force needs a harness hook; deferred).

**Changed:** `mckinsey-workflow.yaml` (1.7.0 → 1.8.0; +`hitl-log` artifact + `state`/`solve` produces + `hitl_triggers` `gate:` notes) + schema (`produces` enum += `hitl-log`) + `validate-mckinsey-workflow.cjs` (`ARTIFACTS` += `hitl-log`, set-equal to run-helper) + `mckinsey-run.cjs` (`ARTIFACTS` + `TEMPLATES['hitl-log.md']` + a one-way reconciliation gate in `checkRun`; anchored `/^H\d+$/` on `isDataRow` rows so the pristine `<H1>` template can't sneak in; provenance read via decoy-proof `colIndex`) + mckinsey `SKILL.md` (HITL prose → hard contract + honest framing).
**Tests:** +12 `mckinsey-run` (the `HITL receipt gate (v1.8)` describe), +1 `mckinsey-workflow`. No DB table, no migration, no new `/think` verb. Decision: `ops.decisions` slug `thinking-toolkit-v1.8-hitl-hard-gate`. Reversibility 5/5 (backward-compatible — runs with no `ask-user` rows are unaffected).

## v1.7.0 — 2026-06-04 — `/think mckinsey` ↔ `/deepask` composition contract

**`/cla extend thinking-toolkit`** · Tier C · autonomous overnight ship (founder pre-auth).

Hardens the (already-present since v1.4) `/deepask` ↔ McKinsey-engine integration into a
first-class, validated **`composition_guards`** engine section in
`knowledge/mckinsey-workflow.yaml` — 3 disciplines:

1. **Anti-recursion (one-way layering)** — `mckinsey → deepask → /think micro-frameworks`;
   deepask never re-enters the engine. Enforced deterministically by
   `scripts/deepask/capability-gate.cjs` `RECURSION_DENYLIST` (refuses
   `thinking-toolkit/mckinsey-workflow` even at Tier-A; optional `recipient_id` →
   backward-compatible).
2. **Cost-valve** — full `/deepask` only on a knock-out-surviving, multi-source workplan
   row (`--dry-run` first; budget the resolver breaker). Heuristics before big guns.
3. **Evidence-not-decider** — deepask returns cited evidence + COMPLETE/PARTIAL; the
   synthesize→recommend judgment stays with Sell + the founder; a PARTIAL is a
   data-blocked branch (→ `ask-user`, never fabricate).

**Changed:** `mckinsey-workflow.yaml` (1.6.0 → 1.7.0) + schema + validator
(`ENGINE_SECTIONS += composition_guards`) + `capability-gate.cjs` (+`RECURSION_DENYLIST`)
+ mckinsey `SKILL.md` + `deepask.md` Boundary + `deepask/execute` `SKILL.md`.
**Tests:** +5 `mckinsey-workflow`, +6 `deepask/capability-gate`. No DB table, no migration,
no new `/think` verb. Decision: `ops.decisions` slug
`thinking-toolkit-v1.7-deepask-composition-contract`. Reversibility 5/5.
