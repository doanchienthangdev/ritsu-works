# Retrospective: resolver-plan v1.0

**Phase:** 8
**Generated:** 2026-05-30
**State transition:** `planning → operating` (no separate `deployed` dwell — Sprints 1-4 merged to `main`, Sprint 5 = docs + promotion)
**CLA run:** `dbdf2d14-7a4e-462d-b56f-37abd3a41e2d`
**Tier C decision:** `ops.decisions` slug `resolver-plan-architecture-option-a`

> Promoted alongside `wiki/capabilities/resolver-plan/spec.md`. This retrospective
> is the human record of what shipped, what was repaired, and the deviations.

---

## What shipped (5 sprints / 5 PRs)

| Sprint | PR | Theme | Key artifacts |
|---|---|---|---|
| 1 | [#157](https://github.com/doanchienthangdev/ritsu-works/pull/157) | Axis tag + enrichment + **audit-repair migration** | `scripts/resolver-v2/axis-map.cjs`, `enrichment.cjs`; `catalog-generator.cjs` emits `Axis` + per-kind enrichment; migration `00044` (widen `mode` + reconcile CHECK + `plan_payload`) |
| 2 | [#158](https://github.com/doanchienthangdev/ritsu-works/pull/158) | `mcp__supabase-ops__resolver_find` axis + enrichment + `axis` filter | `mcp-server/src/tools/resolver-find.ts` (deterministic, NO LLM); NEW `validate-resolver-axis-tags.cjs` (CRITICAL, content-compare); coverage validator extended 5 → 16 kinds |
| 3 | [#159](https://github.com/doanchienthangdev/ritsu-works/pull/159) | `resolver-plan` skill + schema + `/resolver plan` + plan audit | NEW `06-ai-ops/skills/resolver-plan/SKILL.md`; `knowledge/schemas/resolver-plan.schema.json` (ResolverPlan v1); `scripts/resolver-v2/plan-audit.cjs`; `/resolver plan` subcommand |
| 4 | [#160](https://github.com/doanchienthangdev/ritsu-works/pull/160) | Nightly catalog auto-sync + coverage WARN→CRITICAL | `.github/workflows/resolver-catalog-sync.yml` (**GitHub Action** — deviation, see below); `sync.cjs --draft`; coverage gate promoted to CRITICAL |
| 5 | *this PR* | `context_recipe` → first-class docs + test consolidation + Phase 8 promotion | `resolver-query/SKILL.md` + `.claude/commands/resolver.md` (`context_recipe` first-class); `tests/resolver-v3/find-to-plan-contract.test.ts` (contract-boundary seam); promoted spec + this retrospective; CATALOG + registry → `operating` |

**The contract object** — `ResolverPlan v1` (a populated, first-class `context_recipe`):
two axes — `content_axis` (READ; `authority`/`freshness`/`grounding_ref`/`columns_hint`)
+ `capability_axis` (RUN; `hitl_tier`/`side_effect`/`cost_bucket`), plus
`governance_constraints` (ALWAYS `page/governance-HITL` when any capability is HITL
tier B+), `goal_metrics`, optional `primary_lens`, and an honest `no_coverage`.
Consumed directly by `/deepask` (Capability 2) with zero routing of its own.

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Recurring cost | ~$0/mo | ~$0/mo (session-model planning = subscription; nightly Action ≈ one `sync.cjs` run) | 0 |
| Founder time (setup) | ~5 PR reviews (+1 Tier C architecture) | 5 PR reviews + Tier C architecture | on plan |
| Migrations | 1 (additive) | 1 (`00044`, additive + a live repair) — **APPLIED to ritsu-ops** | on plan |
| Tests added | "All-Edge-Cases across S1-S5" | ~263 across S1-S4 + 7 in S5 (find→plan contract) | + |
| PRs | 5 (one per sprint) | 5 (#157-#160 + this) | on plan |
| Reversibility | 5/5 | 5/5 (every change additive/backward-compatible; only stateful change = additive nullable column) | on plan |

## What went well

- **Additive discipline held end-to-end.** Every sprint was backward-compatible:
  `catalog-loader.cjs` ignores unknown `**Field:**` lines, v2/v3 validators ignore
  extras, the ResolverPlan is a strict superset of the optional `context_recipe`.
  Rollback stays `git revert` + drop one nullable column.
- **The NO-LLM invariant survived the find extension.** `mcp__supabase-ops__resolver_find`
  stays deterministic (axis + enrichment are generator-emitted; session-model
  assembly lives in the `resolver-plan` skill, subscription billing). A `fetch`
  tripwire test + a source-scan test re-assert it after the Sprint-2 edits.
- **@cto's live-DB review caught a real, pre-existing bug** and we repaired it as
  a first-class deliverable instead of working around it (see Surprises).
- **Honest gating sequencing.** Coverage was extended to all 16 kinds (S2) and only
  THEN promoted WARN→CRITICAL (S4), after the nightly Action existed — so the gate
  never gave false "no invisible component" confidence.

## What was harder than expected

- **The catalog loader silently dropped enrichment fields.** Surfaced in Sprint 2:
  the generator emitted `Axis`/`Authority`/`Freshness`/`Grounding`/`Columns`, but
  `catalog-loader.cjs` (and therefore `mcp__supabase-ops__resolver_find`) wasn't exposing them
  on each parsed recipient. Fixed by extending the loader's field parse +
  renaming `Grounding`/`Columns` to the consumer-facing `grounding_ref`/`columns_hint`
  on the match (with `catalog-loader-enrichment.test.ts` pinning the round-trip).
- **The cron couldn't be a `schedules.yaml` entry.** The sprint-plan assumed a
  Supabase-Edge minion handler, but Edge functions cannot run `git`/`gh` to open a
  PR. Resolved by a founder-approved deviation to a GitHub Action (see Surprises).
- **Changing the registry `state` ripples into the catalog.** The
  `capability/resolver-plan` recipient's `**Status:**` line is generated from
  `cap.state`, so promotion (`planning → operating`) required regenerating
  `capabilities.md` + `INDEX.md` and re-running the now-CRITICAL coverage gate —
  a "docs-only" change that still touches generated Tier 1.

## Surprises

- **`ops.resolver_decisions.mode` was `char(1)` — the resolver audit had been
  silently broken since the v3 cutover.** @cto queried the live `ritsu-ops` DB at
  Phase 5 and found that `mode:'A2'` inserts overflow `char(1)` and the
  fire-and-forget `catch` in `resolver-find.ts` swallowed the error — so the
  resolver had been writing **no** audit rows for the entire v3 era (live: 2 rows,
  newest 2026-05-23). Two conflicting CHECK constraints compounded it
  (`_mode_valid (A,B,C)` from 00035 never dropped, vs `_mode_check (A,B,C,A2)`
  from 00038). **Migration `00044` repairs all of this as a first-class Sprint-1
  deliverable** (`ALTER COLUMN mode TYPE varchar(8)` + drop both constraints +
  re-add a single `CHECK (mode IN ('A','B','C','A2'))`) and adds `plan_payload`.
  A regression test asserts an `'A2'` find-audit row AND a plan row now PERSIST
  (round-trip). The capability that was *meant* to add plan auditing ended up
  fixing the audit path it depends on.
- **Per @cto, no new `'PLAN'` mode token.** Plan rows reuse `mode='A2'` (the find
  call that backs them) and are discriminated by `plan_payload IS NOT NULL` — fewer
  enum values to reconcile, and the CHECK stays `(A,B,C,A2)`.

## Deviations from the plan (as-built)

1. **Nightly cron = GitHub Action, NOT a `knowledge/schedules.yaml` entry**
   (founder-approved). The sprint-plan §Sprint-4 wording specified a `schedules.yaml`
   minion handler, but a Supabase Edge handler cannot `git`/`gh` to regenerate the
   catalog and open a PR. The as-built is
   `.github/workflows/resolver-catalog-sync.yml`: nightly `cron 30 3 * * *` (+
   `workflow_dispatch`), least-privilege `contents:write` + `pull-requests:write`,
   runs `sync.cjs --apply` + `pnpm resolver:index`, detects drift via
   `git status --porcelain knowledge/recipients/`, and opens a **draft** PR only on
   drift (no-op when fresh). `resolver-catalog-sync` is therefore deliberately
   **absent** from `schedules.yaml`. Same outcome (self-fresh catalog, Tier-A draft
   surface on drift), correct mechanism.

## Pre-existing test failures (NOT caused by this capability)

Two resolver-v2 tests fail on `main` for reasons predating this capability; they are
documented so a future reader does not attribute them to resolver-plan:

1. `tests/resolver-v2/v21-new-kinds.test.ts` — the SOP-ID regex
   `sop/SOP-{PILLAR}-NNN-{name}` rejects the two-segment pillar id
   `SOP-AIOPS-GBRAIN-001` (a gbrain SOP added after the v2.1 regex was written).
2. `tests/resolver-v2/v22-context-sources.test.ts` — asserts `CLAUDE.md` still
   `@import`s the 16 per-kind catalogs; **obsoleted by resolver-v3 (PR #114)**,
   which collapsed the 16 `@import`s into the single `INDEX.md`.

Both are stale-assertion failures in older suites, orthogonal to resolver-plan's
S1-S5 surface. Candidate cleanup: a `/cla fix resolver-v3-jit-loading` (or a
resolver-v2 test-maintenance pass) — out of scope for this capability.

## Boilerplate-extractable patterns (chương 31)

- **`grounding_ref`/`columns_hint` catalog enrichment** — the pattern of parsing a
  view's columns at catalog-generation time so a downstream consumer can author a
  grounded SELECT without reading the full DDL. Reusable for any "route to data +
  carry just enough schema to query it" need.
- **GitHub-Action-as-cron-for-repo-writes** — when a scheduled job must `git`/`gh`
  (regenerate + auto-PR), an Action is the right vehicle, not a Supabase-Edge
  minion handler. Worth a note in the schedules/cron guidance (the wiki-sync
  embeddings-backfill cron hit the same Edge-cannot-read-repo wall).
- **Deterministic-substrate + session-model-assembly split** — keep the MCP
  subprocess deterministic (no API key) and do the LLM judgment in a skill on the
  subscription session. Generalizes to any "cheap deterministic candidates →
  session-model selection" planner.

## Lessons for next CLA run

- **Query the LIVE DB at Phase 5, not just the migrations.** @cto's live check is
  what caught the `char(1)` breakage — the migrations alone (00035 + 00038) read as
  if A2 were already storable. A spec that touches an existing table should verify
  the deployed column types + constraints, not infer them.
- **A "docs-only" promotion can still touch generated Tier 1.** Because the
  `capability` recipient's status derives from `cap.state`, a state bump requires a
  catalog + INDEX regen. Budget the regen + the now-CRITICAL gate into Phase 8.
- **Name the cron vehicle in the sprint plan.** "Nightly cron" is under-specified
  when the job needs repo write access — decide Edge-handler vs GitHub-Action up
  front (the constraint is "can it run `git`/`gh`?").
- **Test the contract SEAM with the real upstream.** The one genuine S5 test gap
  was the find→plan boundary: hand-crafted plan fixtures (schema test) + a find
  tool test (find test) never proved that *real* find output partitions into a
  *schema-valid* plan. The S5 consolidating test drives the REAL `handleResolverFind`
  → partition → schema validate (All-Edge-Cases §2N contract boundary).

## Trigger interfaces deployed

| Trigger | Type | Path |
|---|---|---|
| `/resolver plan "<intent>"` (+ batch, `--sources`, `--json`) | slash subcommand | `.claude/commands/resolver.md` |
| `resolver-plan` skill | skill (session-model assembly) | `06-ai-ops/skills/resolver-plan/SKILL.md` |
| `mcp__supabase-ops__resolver_find` (axis + enrichment + `axis` filter) | MCP tool | `mcp-server/src/tools/resolver-find.ts` |
| nightly catalog auto-sync (draft-PR on drift) | GitHub Action | `.github/workflows/resolver-catalog-sync.yml` |

## Promotion confirmed

- [x] `spec.md` promoted to `wiki/capabilities/resolver-plan/spec.md` (with As-built notes)
- [x] `retrospective.md` promoted to `wiki/capabilities/resolver-plan/retrospective.md` (this file)
- [x] `knowledge/capability-registry.yaml` updated (`state: operating`, `deployed_at` + `operating_since` 2026-05-30)
- [x] `wiki/capabilities/CATALOG.md` index updated (Operating row)
- [x] Catalog regenerated (`capabilities.md` status `planning → operating`) + `INDEX.md` regenerated
- [x] Final `pnpm check` clean (modulo documented known items)
- [x] State advanced to `operating`

## Future work / open questions

- **Capability 2 — `deepask`.** Now unblocked: `resolver-plan` is `operating` and
  emits `ResolverPlan v1`. Propose via `/cla` PROMPT 2
  (`.archives/brainstorming/deepask/06-cla-prompts.md`). deepask hard-depends on
  this capability and consumes the plan with zero routing.
- **Optional KPIs deferred to `/cla tune`** (per spec §3 #10):
  `resolver_catalog_coverage_pct`, `resolver_plan_calls`.
- **Resolver-v2 stale-test cleanup** (the 2 pre-existing failures above) — a
  separate maintenance pass.
- **`ops.capability_runs.state` reconciliation** — lags at an earlier phase because
  the supabase-ops MCP is INSERT-only (Phase 1.5). Authoritative progress =
  `ops.capability_phase_events` + this registry entry. A privileged
  `SELECT ops.capability_advance_phase(...)` can reconcile when convenient.
