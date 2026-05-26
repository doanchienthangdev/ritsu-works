---
name: update
description: |
  Refresh any ritsu-works leaf entity (skill | command | agent | sop) from
  verified external information via citation-disciplined distill + K4
  quality ratchet. Third foundational write-loop alongside /cla (create)
  and /evolve (self-improve). Reads refs (files or wiki: refs), distills
  into structured proposed changes, founder reviews 0.6-0.85 bucket,
  applies via universal lock, generates tests, scores pre+post, auto-reverts
  on quality regression. See wiki/capabilities/update/spec.md (after Phase
  8 promotion) or draft .archives/cla/update/spec.md.
capability: update
version: 1.0.0
spec: wiki/capabilities/update/spec.md
sop: 06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/   # uses /cla lifecycle for major versions
role: entity-update-orchestrator
cost_bucket: entity-update-orchestrator
---

# /update

Project-scoped command for ritsu-works. Refs-driven entity refresh.
Capability: `update` (spec: `wiki/capabilities/update/spec.md` after Phase
8 promotion; draft `.archives/cla/update/spec.md`).

The command is a thin orchestrator façade. Phase logic lives in
`06-ai-ops/skills/entity-update/orchestrator/SKILL.md` which dispatches to
shared `eval-evo/` skills (distill-from-refs, review-extractions,
propose-improvement, install-improvement, score-{type}, test-gen).

The command:
- Parses argv (entity-type, entity-name, --refs, flags)
- Pre-flights drift + ref-source allowlist (agent type) + working-tree-clean
- Resolves refs (file paths + `wiki:` forms via scripts/update/refs-resolver.cjs)
- Dispatches to orchestrator skill
- Renders console UX
- Persists state to ops.* tables
- Handles Tier B (in-place) vs Tier C+ (PR) install routing
- Releases the universal entity-edit lock on completion/abort

## Subcommands

| Invocation | Purpose | HITL |
|---|---|---|
| `/update <type> <name> --refs=<csv>` | Refs-driven entity refresh | B for trivial; C for medium/--force-pr |
| `/update review [<run-id>]` | Founder review queue for pending_review extractions | B (per-extraction) |
| `/update status <run-id>` | Read-only run history viewer | A |
| `/update history <type> <name>` | Lineage chain across /update runs on an entity | A |
| `/update resume <run-id>` | Resume a paused run (awaiting_review or partial) | per phase |
| `/update reject <run-id> "<reason>"` | Founder negative signal → ops.corrections | A |
| `/update discard <run-id>` | Cleanup stash + run state | A |
| `/update list [--type=<t>] [--state=<s>]` | Browse /update runs | A |
| `/update cancel <run-id>` | Cancel an in-flight run (release lock; mark cancelled) | B |
| `/update force-unlock <type> <name>` | Break stuck universal lock | **D-Std** (magic-phrase) |

## Argv schema (primary form)

| Arg / Flag | Required | Validation |
|---|---|---|
| `<entity-type>` | yes | enum: skill, command, agent, sop **(v1.0)** + hook, pillar **(v1.1 Sprint 1)** + file **(v1.1 Sprint 2)** + folder, workflow **(v1.1 Sprint 3)** + tier1-file **(v1.1.1)** |
| `<entity-name>` | yes | slug `^[a-z0-9][a-z0-9-/]*$` (nested slash allowed; no `..`, no leading `/`). For `file` type: a path relative to repo root. |
| `--refs=<csv>` | yes | comma-separated ref list; may repeat flag; supports `wiki:` forms |
| `--force-pr` | no | Promote trivial/medium to PR-after-loop (Tier C audit override) |
| `--skip-drift-check` | no | Skip Phase 0 pnpm check (Tier C audit override) |
| `--allow-untrusted-refs` | no | (agent + hook types) Allow refs outside trusted prefixes (Tier C audit override) |
| `--force-tier=<B\|C>` | no | (file type only) Override path-classified tier; CANNOT downgrade C→B (refused); B→C upgrade allowed + audit |
| `--dry-run` | no | Run distill + propose; do NOT install |

### v1.1 per-type ceremony (NEW)

**`hook` type** (v1.1 Sprint 1) — D-Std magic-phrase ceremony required PER INVOCATION:

```
1. /update hook <name> --refs=<csv>
2. Command prints:
   /update hook <name> requires D-Std authorization per governance/HITL.md.
   Reply with: override: <reason 5+ words> to proceed.
   Reply STOP to cancel.
3. Founder types: override: tighten pre-bash-dangerous block list for curl variants
4. Bot validates ≥ 5 words + lowercase 'override:'. Re-prompt on invalid.
5. Bot prints "Override registered. Executing in 30s. Reply STOP to cancel."
6. 30s timer. If STOP → abort. Else proceed with `was_override=true` in ops.agent_runs.
```

**`pillar` type** (v1.1 Sprint 1) — Tier C minimum (PR always). No magic-phrase. Resolver expands aliases:
- `marketing` → `01-marketing`
- `sales` → `02-sales`
- `gtm` → `03-gtm`
- `product` → `04-product`
- `customer` → `05-customer`
- `ai-ops` → `06-ai-ops`
- `trust-safety` → `07-trust-safety`
- `finance` → `08-finance`
- `founder` → `09-founder`
- `metrics` → `10-metrics`
- `core` → `00-core`
- Or pass the numeric form directly (e.g., `04-product`).
Sub-pillar paths (e.g., `05-customer/success`) REFUSED in v1.1 — use `/update file <path>/README.md` instead.

**`file` type** (v1.1 Sprint 2) — see §"v1.1 file mode" below.

**`folder` type** (v1.1 Sprint 3) — classifier dispatcher only; see §"v1.1 folder mode".

**`workflow` type** (v1.1 Sprint 3) — REFUSES at runtime until `workflows/` folder ships per `knowledge/manifest.yaml`.

**`tier1-file` type** (v1.1.1) — D-Std magic-phrase ceremony like hook. ALWAYS Tier C (PR; no in-place). Hardcoded allowlist:

```
ALLOWED with D-Std ceremony:
  00-core/**                              — identity docs (charter, brand voice, etc.)
  governance/HITL.md                      — HITL policy refinements
  governance/ROLES.md                     — role definitions
  governance/IDENTITY.md                  — identity doc
  governance/BUDGET.md                    — budget doc
  knowledge/manifest.yaml                 — content fixes (structural changes still /cla extend)
  knowledge/cross-tier-invariants.yaml    — invariant tweaks

REFUSED (require stricter ceremony):
  governance/SECRETS.md                   — D-MAX (hand-edit + PR)
  supabase/migrations/**                  — schema discipline (/cla propose)
  .mcp.json                               — D-MAX (hand-edit + PR)
```

Use case: founder has insight from /muse session and wants to refine 00-core/product.md or governance/HITL.md without going through full /cla extend ceremony, while still getting citation discipline + 3-way diff + audit trail.

## Ref grammar (same as /cla propose v1.1)

| Form | Resolution |
|---|---|
| `<file-path>` | Existing file path; copied to `runtime/cla/refs/<run_id>/` |
| `wiki:src=<spec>` | `/wiki get --src=<spec>` writes to `runtime/cla/refs/<run_id>/` |
| `wiki:query="<text>"` | Orchestrator-only — dispatches `mcp__supabase-ops__wiki_ask` then `scripts/wiki-sync/get.cjs` |
| `wiki:query="<text>":src=<src>` | Scoped query; same orchestrator dispatch path |

Multiple `--refs` flags + CSV combine via union (R8 regression covers this).

## Workflow

### Phase A — Pre-flight

1. Validate argv per schema. Else: `UsageError` with usage hint.
2. **Drift gate** — run `pnpm check`. If non-zero exit AND `--skip-drift-check`
   not set, ABORT. If `--skip-drift-check=true`, INSERT
   `ops.audit_log` event `update_skip_drift_check_audit` with Tier C audit
   payload + proceed.
3. **Resolve entity path** (matches /evolve pattern):
   - `skill` → `06-ai-ops/skills/<name>/SKILL.md` (or nested)
   - `command` → `.claude/commands/<name>.md`
   - `agent` → `.claude/agents/<name>.md`
   - `sop` → `06-ai-ops/sops/<name>/`
4. If entity doesn't exist, suggest closest via glob. Exit.
5. **Working-tree check**: `git diff --quiet -- <entity-file>`. If dirty, error.
6. **Ref-source allowlist** (agent type only) — invoke
   `scripts/update/ref-source-allowlist.cjs --entity-type=agent --refs=...
   [--allow-untrusted-refs]`. If refused → ABORT. If `--allow-untrusted-refs`
   override → INSERT `ops.audit_log` event `update_allow_untrusted_refs_audit`
   Tier C.
7. **INSERT ops.agent_runs** row with `agent_slug='update'`,
   `state='running'`, `state_payload={ entity_type, entity_slug, run_id, phase: 'pre_flight' }`,
   `triggered_by_kind='founder'`, `state_payload.role='entity-update-orchestrator'`
   (per cross-tier invariant `entity-update-runs-role-attribution-correct`).

### Phase B — Loop (dispatch to orchestrator skill)

Pass to `entity-update/orchestrator/SKILL.md` via Skill tool with input:
```json
{
  "entity_type": "<type>",
  "entity_name": "<name>",
  "entity_path": "<resolved-path>",
  "refs": [<resolved-refs>],
  "run_id": "<uuid>",
  "session_id": "<claude-session-id>",
  "tier": "<B or C>",
  "force_pr": <bool>,
  "skip_drift_check": <bool>,
  "allow_untrusted_refs": <bool>,
  "dry_run": <bool>
}
```

Orchestrator returns final state JSON (see SKILL.md output contract).

### Phase C — Post-loop

**Tier B (trivial in-place):**
- Working tree contains the kept diff (or no diff if reverted).
- Print final summary to console.
- UPDATE `ops.agent_runs.state='completed'`.
- Lock auto-released by orchestrator.

**Tier C+ (medium / --force-pr):**
- Working tree contains the accumulated diff.
- Orchestrator already invoked `gh pr create`; PR URL returned.
- UPDATE `ops.agent_runs.state='pr-open'`.
- Print PR URL.

**On abort (any reason):**
- UPDATE `ops.agent_runs.state='failed'` with `error`, `error_at_step`.
- Print abort reason + recovery hint.
- Lock released by orchestrator.

## Subcommand: review

```
/update review [<run-id>]
```

Without run-id: show all pending_review extractions across runs (founder picks
which run to process). With run-id: process that run's queue. Dispatches to
`eval-evo/review-extractions/SKILL.md` which surfaces extractions one at a
time via AskUserQuestion.

## Subcommand: status

```
/update status <run-id>
```

Reads `ops.agent_runs WHERE id=<run-id>` + joined `ops.evolve_extractions`
counts. Prints:
- Run-id, started_at, completed_at, entity, scores pre→post, total_cost
- ASCII spark line of distill+propose+score phases
- Last 3 ops.corrections rows for this entity

## Subcommand: history

```
/update history <type> <name>
```

Reads `ops.v_entity_update_lineage` view (Sprint 4 deliverable) for chronological
list of /update runs on this entity. Columns: run_id, started_at, scores delta,
outcome (kept|reverted|aborted), classification, diff_id.

## Subcommand: resume

```
/update resume <run-id>
```

For runs in `awaiting_review` or other paused states. Re-dispatches to the
orchestrator with the same run_id; orchestrator re-acquires the lock (or
detects it still held by this session) and picks up at the next phase.

## Subcommand: reject

```
/update reject <run-id> "<reason>"
```

Validates run-id exists in `ops.agent_runs`. Founder reason ≥ 5 words.
INSERT `ops.corrections (run_id, corrected_by='founder', correction_kind='reject',
correction_note='<reason>', ts=now())`. Next /update invocation on the same
entity loads this row as negative-signal context.

## Subcommand: discard

```
/update discard <run-id>
```

Cleans up specific run-id (drops stash entries from that run via
`git stash list | grep "<run-id>" | xargs git stash drop`) + UPDATE
`ops.agent_runs.state='discarded'`. Releases lock if still held.

## Subcommand: list

```
/update list [--type=<t>] [--state=<s>]
```

Reads `ops.agent_runs WHERE agent_slug='update'` with optional filters.
Default: last 20 runs sorted by started_at DESC.

## Subcommand: cancel

```
/update cancel <run-id>
```

Cancel an in-flight run. UPDATE `ops.agent_runs.state='cancelled'`,
release lock, drop stash. Use when founder wants to abandon a paused
awaiting_review queue.

## Subcommand: force-unlock

```
/update force-unlock <type> <name>
```

**Tier D-Std** — magic-phrase ceremony per `governance/HITL.md`.
Founder issues:
```
override: <reason 5+ words>
```
Then bot replies "Override registered. Executing in 30s. Reply STOP to cancel."
After 30s: invokes a direct DELETE on `ops.entity_edit_locks` for the
named entity. Use when a /update or /evolve session crashed mid-run and
the 24h auto-expiry hasn't kicked in yet.

## Console UX

### Pre-iter banner
```
/update: <type>/<name>
─────────────────────────────────────
Refs: <N files / wiki refs>; size estimate: <KB> → <diff_loc> diff lines, $<cost>
Past /update runs on this entity (M found):
  · <date>: <scores delta> kept / reverted [<one-line summary>]
  · ...
Negative-signal corrections (K found):
  · <date>: "<reason>"
  · ...
Tier: <B or C+>  Lock: acquired  Run-id: <uuid>

Phase 1 [running]: distill (model=<m>)...
```

### Per-phase display
```
Phase 1 [done]: distill → <auto>/<pending>/<rejected> bucket; $<cost>
Phase 2 [running]: score pre (judge=<persona>)...
Phase 2 [done]: composite=<score>; sub-scores [<C1..C10>]
Phase 3 [skip/done]: review queue (founder reviewed N/M)
Phase 4 [running]: propose-improvement (extractions=<N accepted>)...
Phase 4 [done]: diff produced (<L> lines)
Phase 5 [done]: classify → <trivial|medium|structural>
Phase 6 [running]: 3-way diff + install...
Phase 6 [done]: <fast_forward|merge_ok|conflict>; marker written
Phase 7 [running]: test-gen...
Phase 7 [done]: wrote <N> tests at <path>; <P> phases covered
Phase 8 [done]: score post=<score> (delta=<d>) → <kept|reverted (K4)>
Phase 9 [done]: finalize; lock released; PR=<url|in-place>
```

### Post-loop display
```
═══════════════════════════════════════
/update result for <type>/<name>
═══════════════════════════════════════
Classification: <trivial|medium|structural>
Extractions: <auto>/<pending>/<rejected> (founder-reviewed: <fa>/<fr>/<fe>)
Score: <pre> → <post> (delta=<d>); K4 outcome: <kept|reverted>
Tests: <N> generated at <test-dir>/<diff-id>.test.cjs (run via vitest)
Diff: <in-place|PR <url>>
Marker written: <updated-by: /update v1.0 <run-id> @ <ts>>
Cost: $<actual> of $1.50 budget
Drift: <clean|skipped>
Run-id: <uuid>
```

## Mental model: /update vs /evolve vs /cla extend

| Mechanism | When | Cost | Discipline |
|---|---|---|---|
| Hand-edit | Sub-10-LOC tweaks | Free | None |
| `/update` | Mid-weight refs-driven refresh | ~$0.70/run | Citation + K4 ratchet + audit |
| `/cla extend` | Structural change (>100 LOC; new components) | $1.50-3 | Full ceremony |
| `/evolve` | Self-improvement (no refs) | ~$0.50/run | K4 strict (no ±5pt slack) |

## v1.0 scope + v1.1 additions

**v1.0 (operating since 2026-05-26):** skill, command, agent, sop.

**v1.1 (operating since 2026-05-26 — same day extend):** hook, pillar, folder, workflow, file.
- `hook` — D-Std magic-phrase ceremony per invocation; ALL Tier C minimum (PR always); structural detector for `hitl_tier:`/`block:`/`denied_patterns:`/`requires:`/`tier_override_authority:` changes
- `pillar` — Tier C minimum; allowed paths = `<pillar>/README.md` + `<pillar>/CLAUDE.md` ONLY; sub-pillars refused
- `file` — path-tier classifier (see `knowledge/update-file-paths.yaml`); REFUSE for Tier 1 paths; founder AskUserQuestion at install for Tier B
- `folder` — classifier-dispatcher (routes to /update pillar / /update skill / /update sop / /update file / /wiki sync)
- `workflow` — REFUSED at runtime until workflows/ folder ships

**Still deferred to v1.2+:**
- mass-update (`/update bulk --type=skill --filter=...`)
- cross-entity transactional
- sub-pillar deep handler
- webhook/cron-driven auto-fire
- auto-call outside-voice
- founder-trust learning (auto-approve buckets per entity-type)

## v1.1 file mode

```
/update file <path> --refs=<csv>
  [--force-tier=<B|C>]
  [--allow-untrusted-refs]
  [--skip-drift-check]
  [--dry-run]
```

Path is classified via `knowledge/update-file-paths.yaml`:
- **REFUSE** for Tier 1 paths (00-core/, governance/, supabase/migrations/, .mcp.json, knowledge/manifest.yaml, etc.) → forward to `/cla extend` or PR
- **Tier C** for pillar docs, wiki/, knowledge/*.yaml — opens PR
- **Tier B** for tests/, scripts/, docs/, .claude/agents,commands/ — in-place with founder confirmation

No K4 ratchet for file mode (no playbook → no scoring rubric). Replaced with:
- Per-extraction founder review (existing review-extractions skill)
- Per-diff founder AskUserQuestion at install time (Tier B) OR PR review (Tier C)

`--force-tier=C` upgrade allowed (audit-logged). `--force-tier=B` downgrade REFUSED.

## v1.1 folder mode

```
/update folder <path>
```

Classifies `<path>` and dispatches:
- Pillar (depth 1, `^[0-9]{2}-[a-z][a-z-]*$`) → `/update pillar <name>`
- Skill folder (`06-ai-ops/skills/<name>/`) → `/update skill <name>`
- SOP folder (`*/sops/SOP-XXX-NNN-<name>/`) → `/update sop <full-sop-id>`
- Wiki collection (`wiki/<slug>/`) → REFUSED with "Run: /wiki sync wiki/<slug>/"
- Single-README folder → `/update file <path>/README.md`
- Sub-pillar (depth 2) → REFUSED (use `/update file <path>/README.md`)
- Other multi-file folder → REFUSED with explicit forward
- `raw/`, `runtime/`, `.archives/`, `node_modules/` → REFUSED
- Path traversal (`../X`) → REFUSED

## Capability run ID

This command is the runtime façade for capability `update` v1.0.
`ops.capability_runs[16720cb5-f2fe-47f0-9d47-beaeca5f05e1]` is the
capability lifecycle row that delivered this command (CLA workflow Phase 7).
