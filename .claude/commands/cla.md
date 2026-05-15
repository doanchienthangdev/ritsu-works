---
description: |
  Capability Lifecycle Architecture — interactive 8-phase workflow that takes
  any business problem from idea → integrated capability on Agent OS,
  end-to-end. Front-end orchestrator for SOP-AIOPS-001 (Bài #20). Dispatches
  to skills in 06-ai-ops/skills/capability-lifecycle/, routes to CxOs per
  knowledge/cla-routing-keywords.yaml, persists state in ops.capability_runs.
argument-hint: "[propose <problem> | resume <id> | status <id> | list | cancel <id>]"
---

# /cla

Project-scoped command for ritsu-works. Front-end for the Capability Lifecycle
Architecture (Bài #20 playbook chapter, knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md).

This command is a **thin orchestrator**. Phase logic lives in the 8 skills under
`06-ai-ops/skills/capability-lifecycle/`. The command:
- Parses the subcommand,
- Reads `06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/flow.yaml`,
- For each phase: invokes the corresponding skill, manages the HITL gate,
  persists state to `ops.capability_runs`,
- Routes to CxOs in Phases 2/4/5 per `knowledge/cla-routing-keywords.yaml`,
- Runs `pnpm check` at gates 0, 3, 5, 8.

## Subcommands

| Invocation | Purpose | HITL | Persistence |
|---|---|---|---|
| `/cla` | Show menu + active capabilities | A | read-only |
| `/cla propose "<problem>" [--refs <files>]` | Start new capability at Phase 0 | per phase | INSERT ops.capability_runs |
| `/cla resume <id>` | Pick up at last incomplete phase | per phase | UPDATE |
| `/cla status <id>` | Show full state of one capability | A | read-only |
| `/cla list [--state=<filter>]` | List all capabilities + age | A | read-only |
| `/cla cancel <id>` | Mark capability as deprecated without deploying | B | UPDATE state→deprecated |

`/cla propose` is the primary entry point. Other subcommands are for managing
in-flight or completed runs.

## Workflow

### Phase 0 — Drift Pre-Flight (NEW v1.0, inline)

Before any LLM-driven phase runs:

1. **Run `pnpm check`** (~3s). If non-zero exit, ABORT with the validator
   output and tell the founder: "Repo has drift before starting CLA — fix
   first, then re-run."
2. **Generate slug** from the problem statement (kebab-case, ≤ 6 words). If
   the slug already exists in `knowledge/capability-registry.yaml`,
   ask: "Resume existing run, append `-v2`, or pick a new slug?"
3. **Create the working folder**: copy
   `/Users/doanchienthang/ritsu-works/.archives/cla/_TEMPLATE/`
   → `/Users/doanchienthang/ritsu-works/.archives/cla/<slug>/`.
   **Always write to root `.archives/`, never to the worktree's `.archives/`** —
   worktree scratch gets orphaned (memory: archives_location_root_not_worktree).
4. **INSERT row** into `ops.capability_runs` (via supabase MCP):
   - `capability_id = <slug>`
   - `capability_name = <one-line title>`
   - `pillar_owner = 06-ai-ops` (refined in Phase 3)
   - `state = 'proposed'`, `current_phase = 1`, `phases_completed = ARRAY[]`
   - `triggered_by_kind = 'cla_command'`
   - `triggered_by_payload = { source: '/cla propose', refs: <list> }`
5. **Append placeholder** to `knowledge/capability-registry.yaml` under
   `capabilities:` with `state: proposed`, `proposed_at: <today>`,
   `spec_path: wiki/capabilities/<slug>/spec.md` (target path).
6. **Optionally**: copy any `--refs` files into
   `.archives/cla/<slug>/refs/`.
7. **Confirm to founder** — print summary; auto-advance to Phase 1 unless
   founder cancels.

**HITL:** A (auto-advance unless founder cancels)

### Phase 1 — Problem Framing
Skill: `capability-lifecycle/problem-framer`. Invokes the skill, presents
clarifying questions via `AskUserQuestion` (max 4 per call), writes
`.archives/cla/<id>/problem.md`. State: `proposed → analyzing`. HITL A.

### Phase 2 — Domain Deep-Dive
Skill: `capability-lifecycle/domain-analyst`. Scans the problem text against
`knowledge/cla-routing-keywords.yaml`, dispatches to `@<cxo>` in parallel with
the skill. If a route's CxO persona is `status: planned`, dispatch to its
`fallback_role` instead. Synthesizes both outputs into
`.archives/cla/<id>/domain-analysis.md`. State: `analyzing` (continued). HITL A.

### Phase 3 — System Inventory
Skill: `capability-lifecycle/system-inventory-scanner`. Runs `pnpm check`,
parses output, enumerates existing skills/SOPs/Tier 1 yamls/MCPs/deployed
capabilities, identifies gaps. Deterministic — no LLM call. Writes
`.archives/cla/<id>/gap-analysis.md`. State: `analyzing → architecting`. HITL A.

### Phase 4 — Options Generation
Skill: `capability-lifecycle/options-generator`. Generates 3-5 options with
component lists + cost projections + recommendation strength. Identifies the
top 2 options, fans out parallel `@<cxo>` polling (max 3 chiefs per option) for
second opinions. Synthesizes into `.archives/cla/<id>/options.md`. Founder picks
via `AskUserQuestion`. State: `architecting` (continued). **HITL B.**

### Phase 5 — Architecture Design
Skill: `capability-lifecycle/architect`. Per-Bài-toán impact analysis for the
selected option. Writes `.archives/cla/<id>/spec.md` + populates
`.archives/cla/<id>/draft/` (migrations/, skills/, commands/, agents/, sops/,
mcp-configs/, frontend/, tier1-diffs.yaml). Runs `pnpm check` as a dry-run on
the draft `tier1-diffs.yaml`. Invokes `@cto` for migration + tier1-diff sanity
review. Invokes Muse panel `high-stakes-decision-panel`. Writes `ops.decisions`
row. Founder approves via Tier C ceremony per `governance/HITL.md`. State:
`architecting → planning`. **HITL C.**

### Phase 6 — Sprint Planning
Skill: `capability-lifecycle/sprint-planner`. Breaks Phase 5 spec into 2-week
sprints with acceptance criteria + Wave alignment. Writes
`.archives/cla/<id>/sprint-plan.md`. Founder approves via `AskUserQuestion`.
State: `planning → implementing`. HITL B.

### Phase 7 — Implementation (multi-session)
Skill: `capability-lifecycle/implementation-coordinator`. For each sprint:
delegates to `@cto` for code work, opens one PR per sprint, husky `pre-commit`
runs `pnpm check`, CI runs L2 validators. Founder reviews + merges per PR.
State persisted to `ops.capability_runs.state_payload.completed_sprints` array
so `/cla resume <id>` can pick up at first incomplete sprint. State:
`implementing → deployed` (when all sprints merged + final test passes).
HITL B per PR.

### Phase 8 — Catalog Update + Promotion
Skill: `capability-lifecycle/catalog-updater`. Updates
`knowledge/capability-registry.yaml` (state, actuals). **Promotes**
`.archives/cla/<id>/spec.md` → `wiki/capabilities/<id>/spec.md` and
`.archives/cla/<id>/retrospective.md` → `wiki/capabilities/<id>/retrospective.md`.
Updates `wiki/capabilities/CATALOG.md`. Appends boilerplate-extractable
patterns to `notes/boilerplate-candidates.md` if any. Final `pnpm check` —
must be clean to advance. State: `deployed → operating`. HITL A.

## Resume semantics

`/cla resume <id>`:
1. Read `ops.capability_runs WHERE capability_id = <id>` for current state.
2. Re-run Phase 0 drift check (state may have changed since last session).
3. Validate `.archives/cla/<id>/` folder + draft consistency.
4. Jump to first incomplete phase (per `phases_completed` array).
5. If `main` has moved significantly since the architect drafts (Phase 5),
   warn the founder and offer to re-run Phase 5.
6. If `state_since` is > 7 days old, prompt for staleness check.

## State persistence

Every phase invocation writes:
- `ops.agent_runs` row (with `persona_slug` if invoked through a CxO,
  `agent_slug = capability-lifecycle/<skill-name>`).
- `ops.run_summaries` row (~150 tokens, post-hoc).
- `ops.capability_phase_events` row (state transition log).
- `ops.events` row (`ritsu.capability.<phase>_completed`).
- `ops.cost_attributions` row (cost-bucket: `ai-ops-cla` for the orchestration,
  `<capability-id>` for capability-specific spend later).

`/cla list` reads `ops.v_capability_pipeline` (the view defined in migration
00011) for live state. If the view is empty (first run), it merges with
entries from `knowledge/capability-registry.yaml` so the pre-existing
`capability-lifecycle-architecture` meta entry still appears.

`/cla status <id>` queries `ops.v_capability_pipeline WHERE capability_id = <id>`
and prints state, current_phase, phase_progress_pct, hours_in_current_state,
plus the file list under `.archives/cla/<id>/`.

## Drift gates (per phase)

| Phase | Gate | What fails the gate |
|---|---|---|
| 0 | `pnpm check` mandatory before INSERT | any L1 / critical L2 drift |
| 3 | `pnpm check` parsed for inventory (informational) | — |
| 5 | dry-run `pnpm check` on draft tier1-diffs | validator errors on draft yaml |
| 7 | `pnpm check` per commit (husky) | standard L1 enforcement |
| 8 | final `pnpm check` before `deployed → operating` | any drift after registry update |

## CxO routing (Phases 2, 4, 5)

The command reads `knowledge/cla-routing-keywords.yaml` and matches the
problem text against `routes.<domain>.keywords` (case-insensitive substring).
- **1 match** → dispatch to that route's `cxo` (or `fallback_role` if the
  persona is `status: planned`).
- **0 or > 1 matches** → use `ambiguous_fallback` (default: muse_panel).

In Phase 4, fan out the top 2 options × max 3 chiefs in parallel.
In Phase 5, always invoke `@cto` for migration review regardless of routing.

## HITL discipline

Per phase, the HITL tier comes from `flow.yaml` (`steps.<phase>.hitl`):
- **A** — auto-advance, log only.
- **B** — `AskUserQuestion` gate; founder confirms before advancing.
- **C** — full ceremony per `governance/HITL.md` (dry-run preview; founder
  approves). Phase 5 is the only Tier C in the standard workflow.
- **D-Std / D-MAX** — should not occur in standard CLA flow; if a phase
  somehow proposes a D-tier action, refuse and surface to founder per HITL.md.

## Defensive notes

- All writes to `.archives/cla/<id>/` use the **root** repo path
  (`/Users/doanchienthang/ritsu-works/.archives/cla/<id>/`), not the
  worktree's `.archives/`. Worktree scratch is orphaned across sessions.
- Phase 4 (Options) and Phase 5 (Architecture) MUST run in order — the
  skills enforce this (Phase 5 refuses if no `options.md` exists).
- Phase 8 MUST have a `retrospective.md` to advance state to `operating`.
- `/cla cancel <id>` is the only safe abort — never delete the
  `ops.capability_runs` row, only set `state = 'deprecated'`.
- Each skill is independently testable: invoke directly via the Skill tool
  for dry-run scenarios.
- Bài #20 (`knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`)
  is the authoritative spec for phase content; this command is its front-end.
