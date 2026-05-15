# Capability Spec: cla-update-mechanism

**Phase:** 5 (canonical capability spec)
**ID:** cla-update-mechanism
**Selected option (from Phase 4):** Option B (5 sub-commands sharing core skills)
**HITL tier of approval:** C
**Decision row:** `ops.decisions.id = TBD` (written at Sprint 1 inline)
**Generated:** 2026-05-15
**Pillar owner:** 06-ai-ops
**Version:** 1.0.0 (this is the v1 spec; future revisions bump per `version-bumper`)

---

## 1. Problem statement (from Phase 1)

When an operating capability needs to evolve (bug fix / scope expansion / architecture revision / KPI re-tuning / deprecation), `/cla` v1.0 has no first-class workflow. Either drift accumulates via direct PRs, or full `<id>-v2` cycles waste ceremony on small changes. This capability adds 5 right-sized sub-flows + dependency-aware impact analysis + spec versioning + concurrency lock + lineage chain so capability evolution is auditable, lockable, and reversible.

## 2. Selected approach (from Phase 4)

Option B: 5 sub-commands sharing core skills via `mode` parameter.
- `/cla fix <id>` — bug fix (Tier B)
- `/cla extend <id>` — scope expansion (Tier B → C if spec.md changes)
- `/cla revise <id>` — architecture revision (Tier C, full ceremony)
- `/cla tune <id>` — KPI re-tuning (Tier B)
- `/cla deprecate <id>` — sunset (Tier C)
- `/cla history <id>` — read-only timeline (Tier A)
- `@cla` — subagent variant (Tier inherited per sub-command)

## 3. Per-Bài-toán impact analysis

| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth (4-tier model) | Tier 1 yaml schema bump | Add `version` field to `capability-registry.schema.json` |
| #2 HITL | New tier mappings per sub-flow | Document in HITL.md (no new tier) |
| #4 Memory | New `ops.run_summaries` per sub-flow invocation | None (auto by skill) |
| #5 Multi-Agent | New `@cla` subagent | New `.claude/agents/cla.md` |
| #7 Cost | Same `ai-ops-cla` cost-bucket; per-sub-command per-task-kind caps in ROLES.md | Optional governance/ROLES.md update (defer to founder) |
| #8 Schedule | None | None |
| #9 SOP | 5 new SOP folders | New `06-ai-ops/sops/SOP-AIOPS-001-{fix,extend,revise,tune,deprecate}/` |
| #10 Visibility | Lineage chain queryable via `/cla history`; new `ritsu.capability.<sub_flow>_completed` events | Event names: `ritsu.capability.fixed`, `.extended`, `.revised`, `.tuned`, `.deprecated` |
| #11 Events | New events as above | None (event bus accepts arbitrary names) |
| #12 MCP | None | None |
| #13 State machine | Lineage chain semantics: `superseded` state on prior row | Documented; existing constraint already includes `superseded` |
| #14 Knowledge graph | Capability dependencies edge (via `dependency-scanner`) | New skill output shape |
| #15 Decision | `:revise` and `:deprecate` write `ops.decisions` Tier C row | Reuse v1.0 architect skill pattern |
| #16 Customer data | None | None |
| #17 Multi-surface | Terminal only | None |
| #18 Ingestion | None | None |
| #19 Founder capacity | ~30 min per `:fix`, ~2-4h per `:extend`, ~1-2 weeks per `:revise` | Document expected time in command help |
| #20 CLA | This capability extends Bài #20 directly | Add v1.1 footnote to bai-20 DRAFT |

## 4. Component changes

### 4.1 New skills

| Skill | Path | Purpose |
|---|---|---|
| `dependency-scanner` | `06-ai-ops/skills/capability-lifecycle/dependency-scanner/SKILL.md` | Scans all `wiki/capabilities/*/spec.md` for cross-references to capability_id; returns reverse-dependency list. Used in Phase 3 of `:extend` and `:deprecate`. |
| `version-bumper` | `06-ai-ops/skills/capability-lifecycle/version-bumper/SKILL.md` | Computes next semver: patch++ for `:fix`, minor++ for `:extend`/`:tune`, major++ for `:revise`. Pure function. |

### 4.2 New SOPs

| SOP | Path | Trigger | Phases | HITL |
|---|---|---|---|---|
| `SOP-AIOPS-001-fix` | `06-ai-ops/sops/SOP-AIOPS-001-fix/flow.yaml` | `/cla fix <id>` | 0, 1-delta, 7, 8-light | B |
| `SOP-AIOPS-001-extend` | `06-ai-ops/sops/SOP-AIOPS-001-extend/flow.yaml` | `/cla extend <id>` | 0, 1-delta, 3+deps, 5-delta, 6, 7, 8 | B → C |
| `SOP-AIOPS-001-revise` | `06-ai-ops/sops/SOP-AIOPS-001-revise/flow.yaml` | `/cla revise <id>` | 0, 1-delta, 3+deps, 4, 5, 6, 7, 8 | C |
| `SOP-AIOPS-001-tune` | `06-ai-ops/sops/SOP-AIOPS-001-tune/flow.yaml` | `/cla tune <id>` | 0, 1-delta, 8-tune | B |
| `SOP-AIOPS-001-deprecate` | `06-ai-ops/sops/SOP-AIOPS-001-deprecate/flow.yaml` | `/cla deprecate <id>` | 0, 1-delta, 3-deps, 8-deprecate | C |

### 4.3 Tier 1 yaml changes

See `draft/tier1-diffs.yaml` for full diffs. Summary:
- `knowledge/capability-registry.yaml` — add `cla-update-mechanism` capability entry
- `knowledge/schemas/capability-registry.schema.json` — add `version` field (default "1.0.0")
- `knowledge/manifest.yaml` — add reference to update sub-flows + new skills

### 4.4 Database migrations

| Migration | Purpose |
|---|---|
| `supabase/migrations/00022_capability_update_lock.sql` | Add `update_lock_session_id`, `update_lock_acquired_at`, `version` columns to `ops.capability_runs` + CHECK constraint + partial index |

### 4.5 New integrations / MCP servers

None.

### 4.6 Frontend pages

None (terminal only).

### 4.7 New commands / agents

| Trigger | Type | File |
|---|---|---|
| `/cla fix <id>` | slash subcommand | `.claude/commands/cla.md` (extend existing parser) |
| `/cla extend <id>` | slash subcommand | same |
| `/cla revise <id>` | slash subcommand | same |
| `/cla tune <id>` | slash subcommand | same |
| `/cla deprecate <id>` | slash subcommand | same |
| `/cla history <id>` | slash subcommand | same |
| `/cla force-unlock <id>` | slash subcommand (Tier D-Std) | same |
| `@cla` | subagent | `.claude/agents/cla.md` |

## 5. Cost-bucket impact (Bài #7)

- Cost-bucket: `ai-ops-cla` (shared with parent capability `capability-lifecycle-architecture`)
- Monthly budget cap: inherited from parent (no separate cap)
- Per-LLM-call task-kind caps (recommended, deferred to optional ROLES.md PR):
  - `phase-1-delta-fix`: $0.05
  - `phase-1-delta-extend`: $0.10
  - `phase-1-delta-revise`: $0.20
  - `phase-3-dependency-scan`: $0.05 (deterministic + small LLM synthesis)
  - `phase-5-architect-revise`: $1.50 (same as v1.0 architect)
  - `phase-8-tune`: $0.05
  - `phase-8-deprecate`: $0.20
- Alert at 80%, escalate at 100%, hard-block at 150% per existing ROLES.md

## 6. Acceptance criteria (per phase)

### Phase 7 (Implementation = Sprint 1-3 PRs)
- [ ] All migrations applied; `supabase db push` clean
- [ ] All new skills runnable in dry-run mode
- [ ] All new SOPs trigger and complete (per test fixtures)
- [ ] All new commands invocable from `/cla` parser
- [ ] `pnpm check` clean per PR (husky pre-commit)
- [ ] All 11 new test files pass

### Phase 8 (Catalog)
- [ ] `capability-registry.yaml` updated with `cla-update-mechanism` operating + actuals
- [ ] `wiki/capabilities/cla-update-mechanism/spec.md` promoted from .archives
- [ ] `wiki/capabilities/cla-update-mechanism/retrospective.md` written
- [ ] `wiki/capabilities/CATALOG.md` row added under Operating
- [ ] Bài #20 DRAFT v1.1 footnote added
- [ ] Final `pnpm check` clean

### Operating
- [ ] First real-world dogfood: `/cla fix capability-lifecycle-architecture` for some small fix succeeds end-to-end within 2 weeks of ship
- [ ] Lock acquisition correctness validated (no concurrent corruption observed)
- [ ] Lineage chain traversable for first updated capability

## 7. HITL points

| Phase | Tier | Action | Why |
|---|---|---|---|
| Sprint 1 PR | B | Founder reviews + merges | Per-PR diff review |
| Sprint 2 PR | B | Founder reviews + merges | Per-PR diff review |
| Sprint 3 PR | B | Founder reviews + merges | Per-PR diff review |
| Meta-cycle Phase 5 (this doc) | C | Founder approves architecture | Tier C ceremony per HITL.md |
| Per-`:revise` invocation | C | Founder approves spec change | Standard CLA Tier C |
| Per-`:deprecate` invocation | C | Founder approves sunset | Irreversible action |
| `/cla force-unlock` invocation | D-Std | Magic phrase per HITL.md | Lock break = potential corruption |

## 8. Rollback plan

If shipped + breaks:

1. **Code rollback:** `git revert` the 3 PRs in reverse order (#3, #2, #1).
2. **Migration rollback:** `00022` is additive only (3 new columns, 1 CHECK, 1 partial index). Drop columns:
   ```sql
   ALTER TABLE ops.capability_runs
     DROP COLUMN update_lock_session_id,
     DROP COLUMN update_lock_acquired_at,
     DROP COLUMN version;
   ```
   Safe pre-PMF (no production data using these columns yet).
3. **Tier 1 yaml rollback:** revert `capability-registry.yaml` and schema via PR.
4. **State machine rollback:** any `ops.capability_runs` rows created via update flow stay; mark `cla-update-mechanism` `state='deprecated'`.

**Reversibility rating:** **4/5** (everything is reversible; only DB column drop has minor coordination cost).

## 9. CTO sanity-check (Phase 5)

(see `domain-analysis.md` § @cto lens — 200-word review, verdict APPROVE with lock test as gating criterion)

Key concerns addressed in spec:
- Lock semantics: atomic `UPDATE ... WHERE update_lock_session_id IS NULL RETURNING id` (Section 11 of this spec)
- Mode parameter > new skill files: confirmed (Section 4.1 reuses 8 existing skills)
- Sub-flow files separate: confirmed (Section 4.2 lists 5 separate flow.yaml files)
- Lock test as gating criterion: confirmed (Sprint 3 § `tests/cla/update-lock.test.ts`)

## 10. Muse panel synthesis (Phase 5)

(per CEO review § Phase 4 cabinet review and `options.md` § Cabinet review)

- **cynic:** "5 commands pre-PMF — really?" — addressed by per-command HITL tier discipline (semantic precision pays back).
- **optimist:** "5 commands compound as more capabilities ship" — accepted.
- **ethical-compass:** "Per-tier HITL per command better than auto-classification" — accepted.
- **data-pragmatist:** "Cost projections estimates only; per-task-kind caps are right control" — accepted (caps deferred to optional ROLES.md PR).
- **time-honest:** "4.5h CC time fits this week" — confirmed.

**Consensus:** **4/5 agree.** Cynic dissents but acknowledges discipline alignment.

## 11. Tier C decision record

Stored in `ops.decisions WHERE id = TBD` (written inline at Sprint 1 via supabase MCP).

- **Decision kind:** `capability_architecture`
- **Capability run id:** TBD (created at Sprint 1)
- **Approved by:** founder (explicit — message "thực hiện như recommendation (phương án E)")
- **Approved at:** 2026-05-15 (this session)
- **Method:** Claude Code inline approval

## 12. Concurrency model — the lock

**Acquire (Phase 0 of every update sub-flow):**
```sql
UPDATE ops.capability_runs
SET update_lock_session_id = $session_id,
    update_lock_acquired_at = now()
WHERE capability_id = $cap_id
  AND (update_lock_session_id IS NULL
       OR update_lock_acquired_at < now() - interval '24 hours')
RETURNING id, update_lock_session_id, update_lock_acquired_at;
```

If 0 rows returned → lock held by another live session. Skill returns `LockHeld` error with held-by session id + age. Founder can either wait or run `/cla force-unlock <id>` (Tier D-Std).

**Session ID generation:**
- Use a UUID generated at Phase 0; store in skill state for the duration of the update cycle.
- Survives multi-session (Phase 7 multi-PR) — re-acquire on resume by passing same session_id.

**Release (Phase 8 success or any abort):**
```sql
UPDATE ops.capability_runs
SET update_lock_session_id = NULL,
    update_lock_acquired_at = NULL
WHERE capability_id = $cap_id
  AND update_lock_session_id = $session_id;
```

**24h auto-expiry on read** (no cron needed pre-PMF).

## 13. Lineage chain

Each update creates a NEW `ops.capability_runs` row with `supersedes_id` pointing to prior. Original row state advances to `'superseded'`.

```
v1.0 row (state=operating)
  ↓ /cla fix run starts
  ├─ NEW v1.0.1 row (state=implementing, supersedes_id → v1.0)
  ↓ Phase 8 completes
  ├─ v1.0 row (state=superseded)
  └─ v1.0.1 row (state=operating)
```

**Query for current row of a capability:**
```sql
SELECT * FROM ops.capability_runs
WHERE capability_id = $id
  AND state IN ('operating', 'deployed')
ORDER BY proposed_at DESC LIMIT 1;
```

**Query for full history (`/cla history <id>`):**
```sql
WITH RECURSIVE chain AS (
  SELECT * FROM ops.capability_runs WHERE capability_id = $id AND supersedes_id IS NULL
  UNION ALL
  SELECT cr.* FROM ops.capability_runs cr
  JOIN chain c ON cr.supersedes_id = c.id
)
SELECT * FROM chain ORDER BY proposed_at;
```

## 14. Spec versioning

- `wiki/capabilities/<id>/spec.md` is **always-current** (latest version).
- On Phase 8 of any update cycle (except `:tune` which doesn't bump spec), archive previous spec to `wiki/capabilities/<id>/spec-v<X.Y.Z>.md`.
- `version-bumper` skill rules:
  - `:fix` → patch++ (1.0.0 → 1.0.1)
  - `:tune` → patch++ (no spec change but bumps for tracking)
  - `:extend` → minor++ (1.0.0 → 1.1.0)
  - `:revise` → major++ (1.0.0 → 2.0.0)
  - `:deprecate` → no bump; state transition only

## 15. Operating notes

(populated as the capability runs in production)

- **Trigger interface:**
  - `/cla fix <id>` — bug fix sub-flow
  - `/cla extend <id>` — scope expansion sub-flow
  - `/cla revise <id>` — architecture revision sub-flow
  - `/cla tune <id>` — KPI re-tuning sub-flow
  - `/cla deprecate <id>` — sunset sub-flow
  - `/cla history <id>` — read-only timeline
  - `/cla force-unlock <id>` — Tier D-Std lock break
  - `@cla` — subagent variant
- **First fired:** TBD (after v1.1 ship, founder dogfood)
- **Drift since deploy:** TBD
- **Cost actuals (last 30d):** TBD
- **KPI trend:** TBD (no KPI defined yet for infrastructure capability)

## 16. Related artifacts

- Working folder (local): `.archives/cla/cla-update-mechanism/`
- Promoted spec: `wiki/capabilities/cla-update-mechanism/spec.md` (Phase 8)
- Promoted retrospective: `wiki/capabilities/cla-update-mechanism/retrospective.md` (Phase 8)
- Sprint plan: `.archives/cla/cla-update-mechanism/sprint-plan.md`
- Capability registry entry: `knowledge/capability-registry.yaml` § `capabilities[]` matching `id: cla-update-mechanism`
- Parent capability: `capability-lifecycle-architecture` (v1.0)
- Bài #20 DRAFT (v1.1 footnote): `knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`
- CEO review: this implementation session (above)
- Eng review: this implementation session (above)
