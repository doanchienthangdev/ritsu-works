---
description: |
  Capability Lifecycle Architecture — interactive 8-phase workflow that takes
  any business problem from idea → integrated capability on Agent OS,
  end-to-end. Front-end orchestrator for SOP-AIOPS-001 (Bài #20). Dispatches
  to skills in 06-ai-ops/skills/capability-lifecycle/, routes to CxOs per
  knowledge/cla-routing-keywords.yaml, persists state in ops.capability_runs.
argument-hint: "[propose <problem> | resume <id> | status <id> | list | cancel <id> | fix <id> | extend <id> | revise <id> | tune <id> | deprecate <id> | history <id> | force-unlock <id>]"
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

### Creation (v1.0)
| Invocation | Purpose | HITL | Persistence |
|---|---|---|---|
| `/cla` | Show menu + active capabilities | A | read-only |
| `/cla propose "<problem>" [--refs <ref1>[,<ref2>...]] [--refs ...]` | Start new capability at Phase 0. Each ref is one of: **file path** (existing — copied to `.archives/cla/<slug>/refs/`); **`wiki:src=<spec>`** (v1.1) → calls `/wiki get --src=<spec>`; **`wiki:query="<text>"`** (v1.1) → calls `/wiki get --query=<text>`; **`wiki:query="<text>":src=<source>`** (v1.1) → scoped query. Wiki-resolved files land in `runtime/cla/refs/<slug>/` (local-only). | per phase | INSERT ops.capability_runs |
| `/cla resume <id>` | Pick up at last incomplete phase | per phase | UPDATE |
| `/cla status <id>` | Show full state of one capability | A | read-only |
| `/cla list [--state=<filter>]` | List all capabilities + age | A | read-only |
| `/cla cancel <id>` | Mark capability as deprecated without deploying | B | UPDATE state→deprecated |

### Evolution (v1.1, capability `cla-update-mechanism`)
| Invocation | Purpose | HITL | SOP folder |
|---|---|---|---|
| `/cla fix <id>` | Bug fix — light delta workflow | B | `SOP-AIOPS-001-fix/` |
| `/cla extend <id>` | Scope expansion — adds new components | B → C if spec.md changes | `SOP-AIOPS-001-extend/` |
| `/cla revise <id>` | Architecture revision — full ceremony | C | `SOP-AIOPS-001-revise/` |
| `/cla tune <id>` | KPI re-tuning — registry edit only | B | `SOP-AIOPS-001-tune/` |
| `/cla deprecate <id>` | Sunset capability + cleanup | C | `SOP-AIOPS-001-deprecate/` |
| `/cla history <id>` | Show full lineage chain | A | (read-only — `ops.v_capability_lineage` view) |
| `/cla force-unlock <id>` | Break stuck update lock (>24h or known-dead session) | **D-Std** | (lock break — magic phrase per HITL.md) |

`/cla propose` is the primary entry point for NEW capabilities. The 5 evolution
sub-flows (`/cla fix/extend/revise/tune/deprecate`) operate on EXISTING capabilities
in `state IN ('operating', 'deployed')`.

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
6. **Resolve `--refs` arguments** (v1.1 NEW — `wiki:` form support):

   Each `--refs <args>` value may be a comma-separated list. Each item:
   - **File path** (existing): `raw/notes.md`, `wiki/competitors/foo.md`, etc.
   - **Wiki spec** (v1.1 NEW): `wiki:src=<spec>` → calls `/wiki get --src=<spec>`
   - **Wiki query** (v1.1 NEW): `wiki:query="<text>"` → calls `/wiki get --query="<text>"`
   - **Wiki spec+query** (v1.1 NEW): `wiki:query="<text>":src=<source-slug>` → calls `/wiki get --query="<text>" --src=<source>`

   For each `wiki:` ref:
   a. Create `runtime/cla/refs/<slug>/` (gitignored — `runtime/` is local-only per `.gitignore`).
   b. Compute auto-filename: `<ordinal>-wiki-<slugified-spec-or-query>.md` where slug is max 60 chars.
      - `wiki:src=marketing-management-kotler/chapter-14` → `01-wiki-marketing-management-kotler-chapter-14.md`
      - `wiki:query="customer segmentation strategies"` → `02-wiki-query-customer-segmentation-strategies.md`
   c. Invoke `/wiki get` with appropriate args + `--to=runtime/cla/refs/<slug>/<auto-filename>` (orchestrator uses query mode flow if `:query=` set — see `.claude/commands/wiki.md` §Mode 2).
   d. Add resolved filepath to refs list.

   **Helper script**: `node scripts/cla/resolve-refs.cjs --slug=<slug> --refs=<csv>`
   handles deterministic refs (file paths + `wiki:src=`). For `wiki:query=` it
   returns `kind: "wiki-query-pending"` with intended filepath — the orchestrator
   (this Claude session) MUST then call MCP wiki_ask → resolve entity list →
   invoke `node scripts/wiki-sync/get.cjs --entities=<csv> --query-context-header="<text>" --to=<intended_path>`
   to fulfill the pending wiki-query refs. JSON output of the helper enumerates
   each ref's kind + status.

   For each file-path ref:
   - Copy into `.archives/cla/<slug>/refs/` as before (existing behavior).

   For `wiki:` refs:
   - Files live in `runtime/cla/refs/<slug>/` (NOT `.archives/`). Reason: `.archives/` is committable-shell-only; `runtime/` is fully local-only. Wiki-resolved bundles can be re-generated deterministically from source, so they don't need to persist in archives.

   Multiple `--refs` flags may be passed; values combine.

7. **Confirm to founder** — print summary including:
   - File refs copied to `.archives/cla/<slug>/refs/` (N files)
   - Wiki refs resolved to `runtime/cla/refs/<slug>/` (N files, each w/ source spec or query annotation)
   - Total ref context: ~X KB across N files

   Auto-advance to Phase 1 unless founder cancels.

**HITL:** A (auto-advance unless founder cancels)

**Examples:**

```
/cla propose "Build email lifecycle engine for Ritsu free→paid"
  --refs raw/founder-email-thoughts.md
  --refs wiki:src=marketing-management-kotler/chapter-14
  --refs wiki:query="email marketing channels"

/cla propose "Customer segmentation overhaul"
  --refs wiki:query="customer segmentation strategies":src=principles-of-marketing-kotler
  --refs wiki:src=principles-of-marketing-kotler/chapter-7

/cla propose "Pricing experiment redesign"
  --refs raw/competitor-pricing-screenshots.md,wiki:src=marketing-management-kotler/chapter-11
```

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

## Evolution sub-flows (v1.1)

The 5 evolution subcommands all share Phase 0 drift pre-flight + lock
acquisition + lineage chain semantics. Per-sub-flow phase lists below
(sub-flow yamls live at `06-ai-ops/sops/SOP-AIOPS-001-{flow}/flow.yaml`).

### Common pre-flight (all 5 sub-flows)
1. **Drift gate**: `pnpm check` clean. Else ABORT.
2. **Lock acquire** (atomic): call `ops.capability_acquire_update_lock(<id>, <session_id>)`.
   - NULL return → `LockHeld` error with held-by + age. Founder waits or `/cla force-unlock <id>`.
   - UUID return → lock acquired; proceed.
3. **State check**: capability must be in `state IN ('operating', 'deployed')`. Else ABORT.
4. **Insert NEW row** in `ops.capability_runs`:
   - `capability_id = <id>` (same as parent — multiple rows per capability)
   - `state = 'implementing'`, `current_phase = 1`
   - `supersedes_id = <prior row id>`
   - `state_payload = jsonb_build_object('update_mode', '<fix|extend|revise|tune|deprecate>', 'session_id', '<uuid>', 'parent_version', '<X.Y.Z>')`
   - `update_lock_session_id`, `update_lock_acquired_at` set by acquire
5. **Skill invocation** with `mode` parameter passed via state_payload.

### `/cla fix <id>` — bug fix (HITL B)
Phases: 0 (preflight) → 1-delta (problem-framer in fix mode — what's broken?) → 7 (implementation, single PR via @cto) → 8-light (registry version bump patch++, no spec promotion).
Time: ~30 min. Cost: ~$0.50.
Spec.md NOT changed (unless bug was a spec bug — in that case escalate to `:revise`).

### `/cla extend <id>` — scope expansion (HITL B → C)
Phases: 0 → 1-delta (what's new?) → 3 (system inventory + dependency-scanner) → 5-delta (architect produces spec.md diff; if diff substantial, escalate Tier C) → 6 (sprint plan) → 7 (multi-PR) → 8 (registry minor++, spec.md promotion w/ archive of prior).
Time: ~2-4h. Cost: ~$1.50-3.

### `/cla revise <id>` — architecture revision (HITL C)
Phases: 0 → 1-delta (what fundamentally changes?) → 3 (inventory + deps) → 4 (options regenerate) → 5 (full architect + @cto + Muse panel) → 6 → 7 → 8 (registry major++, spec.md promotion).
Time: ~1-2 weeks (multi-session). Cost: ~$3-5.
**This is the heaviest sub-flow.** Use only when fundamental architecture changes (e.g., re-platforming).

### `/cla tune <id>` — KPI re-tuning (HITL B)
Phases: 0 → 1-delta (which KPI? new target?) → 8-tune (registry edit only — no spec change, no skill change).
Time: ~10 min. Cost: ~$0.10.
Spec.md NOT changed. Version patch++ for tracking.

### `/cla deprecate <id>` — sunset (HITL C)
Phases: 0 → 1-delta (why deprecate?) → 3-deps (dependency-scanner — block if dependents) → 8-deprecate (state→`deprecated`, cancel any scheduled SOPs, move CATALOG.md row to Deprecated section).
Time: ~30 min. Cost: ~$0.30.
**Irreversible.** Confirms via founder Tier C ceremony per HITL.md. No version bump (state transition only).

### `/cla history <id>` — read-only timeline (HITL A)
Queries `ops.v_capability_lineage WHERE capability_id = <id>`. Outputs chronological table:

```
chain_depth | version | state       | proposed_at         | sub_flow  | cost  | duration
------------|---------|-------------|---------------------|-----------|-------|--------
0           | 1.0.0   | superseded  | 2026-05-04 12:00    | (initial) | $4.20 | 8 days
1           | 1.0.1   | superseded  | 2026-05-12 09:00    | fix       | $0.45 | 2 hours
2           | 1.1.0   | operating   | 2026-05-15 14:00    | extend    | $2.10 | 2 days
```

### `/cla force-unlock <id>` — break stuck lock (HITL D-Std)
**This is a Tier D-Std action per `governance/HITL.md`.** Requires magic phrase
`override: <reason 5+ words>` from founder. Should only be used when:
- Lock is older than 24h (auto-expired but not cleared)
- Known dead session (Claude Code process killed mid-cycle)
- Founder explicitly resolved any in-flight state externally

Releases the lock by setting `update_lock_session_id = NULL` + `update_lock_acquired_at = NULL`. Logs to `ops.audit_log` with override reason.

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
