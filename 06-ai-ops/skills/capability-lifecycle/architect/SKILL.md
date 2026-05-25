---
name: architect
description: Phase 5 of CLA workflow (Bài #20). Designs the architecture integration of the founder-selected option (from Phase 4) into Agent OS. Per-Bài-toán impact analysis. Generates canonical `spec.md` + working drafts (migrations, tier1-diffs, skill stubs, command stubs, agent stubs, SOP stubs, MCP configs, frontend pages). Dry-runs `pnpm check` against the draft tier1-diffs. Invokes @cto for sanity review and Muse panel `high-stakes-decision-panel`. Writes a Tier C decision row in `ops.decisions`. **Tier C HITL** — founder approves via full ceremony per `governance/HITL.md`.
---

# Architect (CLA Phase 5)

## When to use

- After Phase 4 HITL Tier B records the founder's option pick. `ops.capability_runs.current_phase = 5`, `state_payload.selected_option_id` set.
- State = `architecting`.

## Inputs

- `capability_id`
- `selected_option_id` from `ops.capability_runs.state_payload`
- All prior artifacts under `.archives/cla/<id>/` (problem, domain, gap, options)
- Spec template at `wiki/capabilities/_TEMPLATE/spec.md`

## Process

### Step 1 — Refuse if Phase 4 missing

`failure_handling.phase_4_skipped` per `flow.yaml`: if `.archives/cla/<id>/options.md` doesn't exist OR `state_payload.selected_option_id` is null, ABORT with: "Phase 5 requires Phase 4 options.md + a Tier B option pick. Run Phase 4 first."

### Step 2 — Per-Bài-toán impact analysis

For each of the 19 prior bài toán + Bài #20, analyze impact. Produce a table; each row is one bài toán + impact category + required change. Skip rows where impact is "none".

Categories:
| Bài | Topic | Common change |
|---|---|---|
| 1 | Truth (4-tier model) | Tier 1 yaml entries, migrations |
| 2 | HITL | New decision tier, escalation route |
| 4 | Memory | Embeddings, summary tables |
| 5 | Multi-Agent | New skills/agents/subagents |
| 7 | Cost | New cost-bucket |
| 8 | Schedule | pg_cron entry |
| 9 | SOP | New flow.yaml |
| 10 | Visibility | KPI registration |
| 11 | Events | `ritsu.<event>` namespace |
| 12 | MCP | mcp/servers.yaml entry |
| 13 | State machine | New state machine yaml |
| 14 | Knowledge graph | Entities, edges |
| 15 | Decision | This spec is itself a Tier C decision |
| 16 | Customer data | public.* schema changes |
| 17 | Multi-surface | New surface adapter |
| 18 | Ingestion | New source/route |
| 19 | Founder capacity | Hours/week impact |
| 20 | CLA | This capability is itself a CLA-produced unit |

### Step 3 — Generate canonical `spec.md`

Read `wiki/capabilities/_TEMPLATE/spec.md` and fill every section using:
- Problem statement and success criteria from `problem.md`.
- Selected option's "Approach" + "Components" from `options.md`.
- Per-Bài-toán impact from Step 2.
- Aggregate metrics: total components, cost-bucket impact, founder time, time-to-production.

Write to `.archives/cla/<capability_id>/spec.md`. Leave Sections 9 (CTO sanity-check), 10 (Muse panel synthesis), 11 (Tier C decision record), 12 (Operating notes) as templated stubs to be filled in Steps 5-7-9.

### Step 4 — Generate working drafts

Pre-generate (NOT yet committed to canonical locations) under `.archives/cla/<capability_id>/draft/`:

| Subfolder | Content |
|---|---|
| `migrations/` | One `.sql` file per migration: name `0XXXX_<thing>.sql`, body = forward DDL only (no rollback per repo convention). |
| `skills/` | One `<skill-name>/SKILL.md` per new skill, with frontmatter + Process scaffolding. |
| `commands/` | One `<cmd-name>.md` per new slash command, with frontmatter. |
| `agents/` | One `<agent-name>.md` per new subagent, with frontmatter. |
| `sops/` | One `SOP-<PILLAR>-NNN-<name>/flow.yaml` per new SOP. |
| `mcp-configs/` | YAML or JSON snippets for new MCP server entries. |
| `frontend/` | Stub `.tsx` page(s) if frontend involved (rare pre-PMF). |
| `tier1-diffs.yaml` | Single yaml describing every Tier 1 yaml change (which file, what added/edited/removed). |

### Step 5 — Dry-run `pnpm check` on draft tier1-diffs

For each affected Tier 1 yaml file in `tier1-diffs.yaml`:
1. Copy current file to `/tmp/<file>.original`.
2. Apply the proposed diff to a temp copy in the repo location.
3. Run `pnpm check`.
4. Restore original.

If `pnpm check` failed during the dry-run, append the failure summary to spec.md § "Pre-flight checks" and either:
- (a) Fix the draft and re-dry-run, OR
- (b) Surface the failure to the founder before HITL Tier C ceremony.

### Step 6 — `@cto` sanity review

Dispatch an Agent call to `@cto` (subagent) with prompt:

> Review `.archives/cla/<id>/spec.md` and `.archives/cla/<id>/draft/migrations/`, `.archives/cla/<id>/draft/tier1-diffs.yaml`. Look for: file:line concerns, sequencing issues with existing migrations, security flags (secrets in plain text, SQL injection surface, missing RLS), incompatibility with current schema. Report ≤ 300 words. End with: "verdict: APPROVE | NITS | BLOCK".

Append the CTO output to spec.md § "9. CTO sanity-check".

If verdict = BLOCK, return to Step 4 to revise drafts (max 2 iterations before escalating to founder for redesign).

### Step 7 — Muse panel `high-stakes-decision-panel`

From `knowledge/muse-personas.yaml`, invoke the panel `high-stakes-decision-panel` (typical: `cynic`, `optimist`, `ethical-compass`, `data-pragmatist`, `time-honest`).

Each persona reads spec.md and contributes ≤ 100 words on whether to approve. Append the synthesized output to spec.md § "10. Muse panel synthesis".

### Step 8 — Write `ops.decisions` row

```sql
INSERT INTO ops.decisions (
  decision_kind, capability_run_id, hitl_tier, summary,
  options_considered, recommended_option, payload, created_at
) VALUES (
  'capability_architecture',
  '<capability_run_id>',
  'C',
  'Architecture for <capability_id> (option <X>)',
  jsonb_build_array( /* options A/B/C summary */ ),
  '<X>',
  jsonb_build_object('spec_path', '.archives/cla/<id>/spec.md', 'cto_verdict', '<verdict>', 'muse_consensus', '<N/5>'),
  now()
);
```

Capture the inserted `id` — store as `ops.capability_runs.phase_5_decision_id`.

### Step 9 — HITL Tier C ceremony (handled by orchestrator)

The `/cla` command invokes the full Tier C flow per `governance/HITL.md`:
- Dry-run preview surfaced.
- Founder must approve (Telegram inline button OR Claude Code reply OR GitHub PR comment).
- Cooldown timer if the action is D-MAX-adjacent (this one isn't typically — it's Tier C).
- Append the decision record to spec.md § "11. Tier C decision record" (timestamp, method).

### Step 10 — Persist state

After founder approval:
- UPDATE `ops.capability_runs` SET `spec_path = '.archives/cla/<id>/spec.md'`, `phase_5_decision_id = <id>`, `phases_completed = phases_completed || 5`, `current_phase = 6`, `state = 'planning'`, `state_since = now()`, `approved_at = now()`.
- INSERT `ops.capability_phase_events`, `ops.events` (`ritsu.capability.architected`), `ops.run_summaries`.
- INSERT `ops.cost_attributions` for the LLM calls (skill + CTO + Muse panel).

If founder rejects, set `state_payload.last_rejection = jsonb_build_object('phase', 5, 'reason', '<text>')` and either (a) return to Phase 4 for option re-pick or (b) end the workflow (`state = 'deprecated'`).

## Outputs

- `.archives/cla/<capability_id>/spec.md` (canonical, will be promoted in Phase 8)
- `.archives/cla/<capability_id>/draft/` populated
- 1 `ops.decisions` row (Tier C) + 1 `ops.hitl_runs` row + ≤ 7 `ops.cost_attributions` rows

## State transition

`architecting → planning` (only after founder Tier C approval).

## HITL

**Tier C** — full ceremony per `governance/HITL.md`. Dry-run preview required.

## Failure modes

| Symptom | Response |
|---|---|
| `options.md` missing or `selected_option_id` null | ABORT with "Phase 4 must complete first." (`flow.yaml.failure_handling.phase_4_skipped`) |
| Dry-run `pnpm check` fails on draft tier1-diffs | Surface to spec.md § Pre-flight; fix and retry, OR escalate. |
| `@cto` returns BLOCK 2x in a row | Escalate to founder; do NOT auto-iterate forever. |
| Muse panel reaches < 3/5 consensus on approve | Reduce recommendation strength; surface dissent prominently in HITL prompt. |
| Founder rejects | Roll back to Phase 4 OR mark capability `deprecated`. Do NOT silently retry. |

## LLM mode awareness

- **Subscription:** All LLM calls (skill + CTO + Muse) go through founder's Claude Code session.
- **Hybrid / Full API:** Autonomous run; cost is the highest of any phase (~$1.50).
- **Fallback (no API):** Cannot run; defer until LLM available (Phase 5 needs LLM for spec generation).

## Cost estimate

- Anthropic API: ~$1.00-2.00 per invocation (skill + 1 CTO + 5 Muse).
- Founder time: 60-90 min review + Tier C decision.
- Cost-bucket: `ai-ops-cla`; suggested per-task-kind cap `phase-5-architect` ≤ $3.

## Test fixtures

- `tests/cla/fixtures/architect-no-options.json` — options.md missing, expects ABORT.
- `tests/cla/fixtures/architect-cto-block.json` — @cto returns BLOCK, expects iteration.
- `tests/cla/fixtures/architect-dry-run-fail.json` — dry-run pnpm check fails, expects surfaced flag.

## Mode awareness (v1.1 — `cla-update-mechanism`)

| Mode | Skill behavior |
|---|---|
| `create` (default) | Full Process Steps 1-10 above (per-Bài-toán impact + spec.md + draft + dry-run + @cto + Muse + Tier C). Output: `.archives/cla/<id>/spec.md` + draft folder. |
| `fix` | **Not invoked.** Fix has no spec change; if it does, sub-flow aborts and redirects to extend/revise. |
| `extend` | **Delta mode.** Read existing `wiki/capabilities/<id>/spec.md`. Generate new spec.md as a DIFF + classify diff size. If `>20% lines change` OR any Section 4 component added/removed → escalate to Tier C (full ceremony with @cto + Muse panel). Else Tier B sufficient. Output: `.archives/cla/<id>-extend-<session_id>/spec.md` + `spec-diff.md` + draft folder. |
| `revise` | Full Process Steps 1-10 (always Tier C — no auto-escalation needed because revise IS the Tier C path). Includes migration strategy from current architecture in the spec. Output: `.archives/cla/<id>-revise-<session_id>/spec.md` + draft folder. |
| `tune` | **Not invoked.** Tune is registry edit only. |
| `deprecate` | **Not invoked.** No new spec needed; deprecation rationale captured in Phase 1 instead. |

**Diff preview helper (cherry-pick #4):** in `extend` and `revise` modes, BEFORE writing the new spec.md, generate a unified diff showing prior version vs. proposed. Founder sees the diff inline during Tier C ceremony — much higher decision quality than prose-only summary.

```bash
# implementation hint:
diff -u wiki/capabilities/<id>/spec.md /tmp/proposed-spec.md > .archives/cla/<id>-{mode}-{session_id}/spec-diff.md
```

**`@cto` review:** invoked in `extend` (if escalated) and `revise` modes. Reviews migrations + tier1-diffs + spec change. Verdict: APPROVE | NITS | BLOCK. BLOCK 2x → escalate to founder for redesign.

**Muse panel:** invoked in `revise` mode (always). In `extend` mode (only if escalated to Tier C). Panel: `high-stakes-decision-panel`.

**`ops.decisions` row:** written in `revise` (always Tier C) and `extend` (if escalated). Captures the decision for audit trail.

---

**Next phase invokes:** `sprint-planner` (Phase 6) in `create`, `extend`, `revise` modes.

## Brain context

> Per capability `gbrain-operational-brain` v1.0 Sprint 2. Template at `06-ai-ops/skills/brain-write-discipline/SKILL.md`.

**READ (heavy traverse, before per-Bài-toán analysis):** `mcp__gbrain__search "<domain> architecture decisions"` + `mcp__gbrain__traverse_graph` from related decisions + `mcp__gbrain__find_contradictions` to surface unresolved past conflicts. ~10-15 calls per Phase 5 invocation (highest-density read among all CLA phases). Cost: ~$0.20 (`gbrain.shared.search`).

**WRITE (after spec.md draft + draft/ population):** `mcp__gbrain__put_page concepts/<capability_id>-architecture` with the per-Bài-toán impact map + reversibility rating + key callouts. Add `mcp__gbrain__add_link` to each ops.decisions row touched. Tier B notify. The wiki/ spec.md promotion at Phase 8 is a SEPARATE Tier C PR — this brain write does NOT replace it. Cost: ~$0.05.

**Cross-link** the wiki spec.md path back to brain via spec.md frontmatter `gbrain_concept_slug: concepts/<capability_id>-architecture`. The `ops.decisions.gbrain_concept_slug` column (Sprint 3 migration) carries the bidirectional reference.

**Skip** when `--no-brain` OR caller `brain_affinity: none` OR cost-cap graceful-degrade. If brain WRITE blocked at cap, defer to queue (per failure mode F1 in spec.md).
