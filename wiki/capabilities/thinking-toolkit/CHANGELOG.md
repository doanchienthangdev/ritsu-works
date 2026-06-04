# Changelog — capability `thinking-toolkit`

> Versions v1.0–v1.6 are documented in detail in the registry notes
> (`knowledge/capability-registry.yaml`, `thinking-toolkit` entry) and `spec.md`.
> This file is the forward changelog from the point it was created (v1.7).

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
