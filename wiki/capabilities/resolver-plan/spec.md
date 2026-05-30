# Capability Spec: resolver-plan v1.0

**Capability:** `resolver-plan`
**Version:** 1.0.0
**State:** operating (promoted 2026-05-30 — Phase 8; Sprints 1-4 merged #157-#160, Sprint 5 = docs + promotion)
**Phase (at authoring):** 5 (canonical capability spec) — **Option A**, balanced gating
**HITL tier:** C (architecture); B per implementation PR
**Decision row:** `ops.decisions` slug `resolver-plan-architecture-option-a`
**CLA run:** `dbdf2d14-7a4e-462d-b56f-37abd3a41e2d`
**Generated:** 2026-05-30 · **Promoted:** 2026-05-30

> Authoritative architecture, promoted from `.archives/cla/resolver-plan/spec.md`.
> The functional detail + ResolverPlan v1 contract live in the archive
> `refs/04-spec-resolver-plan-v1.0.md` + `refs/03-design-decisions.md` (carried
> verbatim there; the ResolverPlan v1 shape is mirrored in §3 of this spec and is
> canonically the JSON Schema `knowledge/schemas/resolver-plan.schema.json`).
> **§13 "As-built notes" records the deviations between this spec text and what
> actually shipped** — read it before trusting any mechanism detail below.

## 1. Problem statement (from Phase 1)

`mcp__supabase-ops__resolver_find` returns a flat ranked list; the 2-axis `context_recipe` plan
was optional and never populated; coverage was WARN-only and sync was manual. To let
`/deepask` (Capability 2) be a pure consumer with zero routing, resolver must
(a) make the content/capability axis first-class, (b) emit a populated
directly-consumable plan, (c) keep its catalog auto-fresh.

## 2. Selected approach (Option A, from Phase 4)

Build the entire `04-spec` in 5 sprints. **Locks:** batch planning form IN v1;
catalog-freshness cron ships FIRST, then `validate-resolver-v2-coverage` promoted
WARN→CRITICAL after one clean nightly cycle; axis surfaced in the INDEX header
legend only (frugal — INDEX at ~12K/15K). All changes additive +
backward-compatible; no LLM in `mcp__supabase-ops__resolver_find`; session-model (subscription)
assembly in the `resolver-plan` skill.

## 3. The contract object — `ResolverPlan v1`

The skill returns one `ResolverPlan` per sub-need (or a `{ plans: [...] }` batch).
This IS a populated `context_recipe`, extended for execution. Canonical schema:
`knowledge/schemas/resolver-plan.schema.json`.

```yaml
schema_version: "1.0"
sub_need: "<sub-question text>"
ia_type_hint: "A|B|C|D"                  # OPTIONAL coarse IA-type
primary_lens: ["persona/<id>"]            # OPTIONAL cognitive framing
content_axis:                             # READ these (where the answer lives) — REQUIRED key (may be [])
  - recipient: "page/core-pricing"
    invoke: 'Read("00-core/pricing-philosophy.md")'
    authority: "SoR|SoR-external|derived-memory|scratch"
    freshness: "static|hourly|daily|live|unknown"
    grounding_ref: "<migration/kpi-id/file> | null"   # OPTIONAL: schema/contract to READ before authoring a query
    columns_hint: ["col_a","col_b"]                   # OPTIONAL (view/metric); minItems 1 when present
capability_axis:                          # RUN these (HITL-gated) — REQUIRED key (may be [])
  - recipient: "skill/cost-report"
    invoke: 'Skill({skill:"cost-report"})'
    hitl_tier: "A|B|C|D-Std|D-MAX"
    side_effect: "none|write|send|money|publish"
    cost_bucket: "gbrain.<role>.<op> | null"          # OPTIONAL
governance_constraints: ["page/governance-HITL", "metric/<id>"]   # REQUIRED — MUST include page/governance-HITL when any capability is HITL tier B+
goal_metrics: ["metric/<id>"]             # REQUIRED key (may be [])
no_coverage:                              # HONEST gaps — REQUIRED key (may be [])
  - { facet: "<unresolved facet>", reason: "no_match|stale|empty|not_built",
      remedy: "ingest via /wiki sync | wire MCP <x> | build via /cla propose" }
```

**Field provenance:** `axis` = deterministic kind→axis map; `authority`/`freshness`
derived from kind/source; `hitl_tier`/`side_effect` from `knowledge/mcp-tools.yaml` +
skill/SOP frontmatter + `governance/HITL.md` Appendix A; `governance_constraints` /
`goal_metrics` / `primary_lens` = session-model selection; `no_coverage` populated on
find `no_match` / stale / empty / not-built.

**Division of labor:** `resolver-plan` supplies **WHICH recipient + the interface + a
grounding pointer**, NOT the literal SQL/params/prompt. The consumer's execute stage
(e.g. `/deepask`, session model) authors the concrete invocation, grounded in
`grounding_ref`/`columns_hint` (reads DDL/KPI def first; never invents column names —
CLAUDE.md operating principle 3). `mcp__supabase-ops__query` is read-only by contract;
the firewall hook keeps product data to `metrics.*`.

## 4. Component changes

### 4.1 New skills
| Skill | Path | Purpose |
|---|---|---|
| resolver-plan | `06-ai-ops/skills/resolver-plan/SKILL.md` | session-model assembly of a populated `ResolverPlan v1` (= first-class `context_recipe`) per intent + batch |

### 4.2 New SOPs
None.

### 4.3 Tier 1 changes (as-built)
- `knowledge/recipients/*.md` regenerated with `Axis` + enrichment (generator-driven).
- `knowledge/schemas/resolver-plan.schema.json` — NEW (ResolverPlan v1, draft-07).
- `.claude/commands/resolver.md` — `plan` subcommand added; `context_recipe`
  documented optional→**first-class** (Sprint 5).
- `06-ai-ops/skills/resolver-query/SKILL.md` — cross-links the first-class
  `context_recipe` / `resolver-plan` (Sprint 5).
- **Nightly catalog-sync = a GitHub Action**, `.github/workflows/resolver-catalog-sync.yml`
  — **NOT** a `knowledge/schedules.yaml` entry (deviation; see §13). The spec's
  original §4.3 wording said `schedules.yaml += resolver-catalog-sync`; that was
  superseded because a Supabase-Edge handler cannot `git`/`gh`.

### 4.4 Database migrations
`supabase/migrations/00044_resolver_decisions_plan_payload.sql` does TWO things
(per @cto Phase-5 review), and is **APPLIED to ritsu-ops**:
**(1) REPAIR** the pre-existing broken resolver audit — `ALTER COLUMN mode TYPE
varchar(8)` + drop the conflicting `resolver_decisions_mode_valid` (00035, never
dropped) and `_mode_check` (00038) constraints and re-add a single
`CHECK (mode IN ('A','B','C','A2'))`, so `'A2'` find-audits stop silently failing.
**(2) ADD** `plan_payload jsonb` + a partial index for plan-mode audit (plan rows =
`mode='A2' AND plan_payload IS NOT NULL`; **no `'PLAN'` token** per @cto). Safe:
widening + nullable column; no data loss.

### 4.5 New integrations / MCP servers
None new. Extended the existing `resolver_find` tool in the `supabase-ops` server
(deterministic only — axis + enrichment + an `axis` filter).

### 4.6 Frontend pages
None.

### 4.7 New commands / agents
`/resolver plan "<intent>"` (+ batch) — a **subcommand** of the existing `/resolver`
command (not a new command file). No new agent.

## 5. Cost-bucket impact (Bài #7)
- Build cost-bucket: `ai-ops-cla` (the CLA orchestration). No NEW runtime $ cap.
- Runtime: `resolver-plan` calls = Claude Code subscription (session model; no API key,
  per `external-source/anthropic-api` policy). Nightly Action ≈ one `sync.cjs` run
  (negligible). gbrain untouched.

## 6. Acceptance criteria

### Phase 7 (Implementation) — MET
- [x] `mcp__supabase-ops__resolver_find` returns deterministic `axis` on every match; no LLM in subprocess (test asserts no `fetch`/API).
- [x] catalog entries carry enrichment (capability: `hitl_tier`/`side_effect`; content: `authority`/`freshness`/`grounding_ref`/`columns_hint`); regenerated via generator.
- [x] `resolver-plan` skill returns schema-valid `ResolverPlan v1` (single + batch); `governance_constraints` includes `page/governance-HITL` whenever any capability is tier B+; honest `no_coverage`.
- [x] `/resolver plan "<intent>"` renders a plan; `resolver-plan.schema.json` validates.
- [x] `validate-resolver-axis-tags.cjs` CRITICAL (content-compare, not mtime); `resolver-catalog-sync` opens a **draft** PR (`sync.cjs --draft`) only on drift, no-op when fresh; coverage extended to ALL 16 kinds, then promoted WARN→CRITICAL.
- [x] **Audit repair (first-class):** migration 00044 applied; regression test asserts an `'A2'` find-audit row AND a plan row PERSIST (round-trip SELECT) — proving the char(1) breakage is fixed.
- [x] additive/backward-compatible (existing parsers ignore new fields); `pnpm check` clean per PR; All-Edge-Cases tests pass (modulo 2 documented pre-existing failures, §13).

> **Cron-registration acceptance — superseded.** The original criteria
> "`resolver-catalog-sync` registered in minion-worker SKILL_REGISTRY +
> `schedules.generated.ts` regenerated" do NOT apply to the as-built: the cron is a
> GitHub Action, not a minion schedule (§13).

### Phase 8 (Catalog) — MET
- [x] `capability-registry.yaml` updated (state → `operating`, actuals).
- [x] `wiki/capabilities/resolver-plan/spec.md` promoted; `retrospective.md` written.
- [x] `pnpm check` clean.

### Operating
- [x] `/deepask` (Capability 2) can consume `ResolverPlan v1` directly with zero routing of its own (contract `ResolverPlan v1` is stable + schema-pinned).
- [ ] nightly Action keeps catalog coverage at 100% (no silent invisible components) — verified over the first operating week.

## 7. HITL points
| Phase | Tier | Action |
|---|---|---|
| 4 Options | B | founder picked Option A ✓ |
| 5 Architecture | C | founder approved this spec ✓ |
| 7 per PR | B | founder reviewed + merged #157-#160 ✓ |
| 8 Promotion | B | this PR |

## 8. Rollback plan
1. **Code:** `git revert` the sprint merge commits — clean because all changes are additive + backward-compatible.
2. **Migration:** `ADD COLUMN plan_payload` is harmless if unused (`DROP COLUMN` to revert). The `mode char(1)→varchar(8)` widening is a safe non-lossy repair; the CHECK reconciliation is idempotent. Net: cleanly reversible.
3. **Tier 1:** revert via PR (recipients regenerate from the generator; the GitHub Action workflow file is removable).
4. **Coverage-gate:** if the WARN→CRITICAL promotion causes friction, revert the one-line placement in `check-consistency.cjs` — independent of the rest.
5. **State:** `ops.capability_runs.state = 'deprecated'`.

**Reversibility rating:** 5/5 — every change is additive/backward-compatible; the only "stateful" change is an additive nullable column.

## 9. CTO sanity-check (Phase 5)

**@cto verdict: BLOCK-as-written → architecture (Option A) APPROVED; spec text
corrected before Phase 7.** @cto queried the LIVE `ritsu-ops` DB and found 3 concrete
factual defects (all mechanical, fixed in the drafts + shipped):

| # | Finding (verified live) | Resolution (shipped) |
|---|---|---|
| B1 | `ops.resolver_decisions.mode` is **`char(1)`** → `'A2'` inserts silently fail (overflow swallowed by fire-and-forget catch). Resolver audit **broken since v3 cutover** (2 rows, newest 2026-05-23). | Migration 00044 `ALTER COLUMN mode TYPE varchar(8)` — repairs the A2-audit path as a **first-class deliverable**. Plan rows = `mode='A2' AND plan_payload IS NOT NULL`. |
| B2 | Two conflicting CHECK constraints: `_mode_valid (A,B,C)` (00035, never dropped) + `_mode_check (A,B,C,A2)` (00038). `_valid` rejects A2. | 00044 drops BOTH, re-adds a single `_mode_check CHECK (mode IN ('A','B','C','A2'))`. |
| B3 | `schedules.yaml` cron fragment was **not schema-valid** and an Edge handler can't `git`/`gh`. | **Superseded entirely** by the GitHub Action `.github/workflows/resolver-catalog-sync.yml` (§13) — the cron is NOT a schedules.yaml entry. |
| S1 | `sync.cjs --auto-pr` had **no `--draft`** → ready-for-review PR (Tier B), not the Tier-A draft the spec claims. | Added `sync.cjs --draft`; the Action uses it to open a **draft** PR. |
| S2 | `validate-resolver-v2-coverage` only checked **5 of 16 kinds**. | Extended expected-set to all 16 kinds (S2) **before** the WARN→CRITICAL promotion (S4). |

**Confirmed OK by @cto:** the "NO LLM in `mcp__supabase-ops__resolver_find`" invariant holds
(deterministic axis + generator-emitted enrichment; session-model assembly in the
skill, subscription billing — no API-key leak); backward-compat is safe
(`catalog-loader.cjs` ignores unknown `**Field:**` lines; v2/v3 validators ignore
extras — watch-items: keep `Columns:` in the list/inline-comma convention, no second
`:` in field labels); content-compare validator is feasible (no mtime).

## 10. Muse panel synthesis (Phase 5)

**Proportionality call (documented):** resolver-plan is a **reversible (5/5), additive,
backward-compatible infra extension** with no money/user/irreversible surface. Per
CLAUDE.md cost-awareness + HITL proportionality, the full 6-persona
`high-stakes-decision-panel` is disproportionate here. Instead: @cto substantive review
(§9) + a structured adversarial self-review. Founder may request the full panel if
desired.

**Adversarial self-review (what could go wrong → mitigation):**
- *Coverage-gate blocks unrelated PRs* → cron-first; promote only after one clean cycle.
- *`hitl_tier` mis-derivation → unsafe auto-run downstream* → unknown defaults to B (surfaced, never auto-run); deepask never auto-runs B+.
- *axis mis-classification* → deterministic static map + CRITICAL validator; a wrong kind→axis entry is a one-line fix caught by tests.
- *INDEX token bloat* → axis in header legend only; body unchanged.
- *worktree mtime false-positive recurs in new validator* → validator compares CONTENT not mtime (explicit acceptance criterion).

## 11. Tier C decision record
Approved by founder. Method: Claude Code inline. `ops.decisions` slug
`resolver-plan-architecture-option-a`.

## 12. Program context
First of a two-capability program: **resolver-plan (this) → deepask** (Capability 2,
proposed after this reaches `operating`). deepask hard-depends on `ResolverPlan v1`.

## 13. As-built notes (deviations between this spec and what shipped)

This section is the authoritative record of where the implementation differs from the
spec text above. Read it before trusting any mechanism detail.

1. **Nightly catalog-sync is a GitHub Action, NOT a `schedules.yaml` entry**
   (founder-approved deviation). The spec's §4.3/§4.4 (Bài #8) wording, and the
   Sprint-4 acceptance line "registered in minion-worker SKILL_REGISTRY +
   `schedules.generated.ts` regenerated", are **superseded**. The reason: a Supabase
   Edge minion handler cannot run `git`/`gh` to regenerate the catalog and open a PR.
   **As-built:** `.github/workflows/resolver-catalog-sync.yml` — nightly
   `cron 30 3 * * *` (+ `workflow_dispatch`), least-privilege `contents:write` +
   `pull-requests:write`, runs `scripts/resolver-v2/sync.cjs --apply` +
   `pnpm resolver:index`, detects drift via `git status --porcelain knowledge/recipients/`,
   and opens a **draft** PR only on drift (no-op when fresh). `resolver-catalog-sync`
   is therefore deliberately **absent** from `knowledge/schedules.yaml`. Same outcome
   (self-fresh catalog + Tier-A draft surface on drift), correct vehicle.

2. **Migration 00044 also REPAIRED a live, pre-existing audit bug.** Beyond adding
   `plan_payload`, the applied migration fixed the `mode char(1)` overflow that had
   silently broken the resolver audit since the v3 cutover (see §9 B1/B2). The
   capability that was meant to ADD plan auditing ended up fixing the audit path it
   depends on. The migration is **APPLIED to ritsu-ops**.

3. **Two pre-existing test failures persist on `main`, unrelated to this capability:**
   - `tests/resolver-v2/v21-new-kinds.test.ts` — the SOP-ID regex
     `sop/SOP-{PILLAR}-NNN-{name}` rejects the two-segment `SOP-AIOPS-GBRAIN-001`.
   - `tests/resolver-v2/v22-context-sources.test.ts` — asserts `CLAUDE.md` still
     `@import`s 16 per-kind catalogs; obsoleted by resolver-v3 (PR #114) which
     collapsed them into `INDEX.md`.
   Both are stale assertions in older suites; cleanup is out of scope for resolver-plan
   (candidate: a resolver-v3 / resolver-v2 test-maintenance pass).

4. **Promotion regenerates the catalog.** The `capability/resolver-plan` recipient's
   `**Status:**` line derives from `cap.state`, so the Phase-8 state bump
   (`planning → operating`) regenerated `knowledge/recipients/capabilities.md` +
   `knowledge/recipients/INDEX.md` and re-ran the now-CRITICAL coverage gate.

5. **Test consolidation (Sprint 5).** The All-Edge-Cases surface was already covered by
   S1-S4 (axis-map, enrichment, find-axis, plan-schema, sprint4-cron). The one genuine
   gap — the **find→plan contract boundary** (§2N: real `mcp__supabase-ops__resolver_find` output
   partitioning into a schema-valid `ResolverPlan`) — is closed by
   `tests/resolver-v3/find-to-plan-contract.test.ts` (drives the REAL find tool → the
   documented `axis` partition → schema validation + the governance B+ rule).

## 14. Implementation history
| Sprint | PR | Theme |
|---|---|---|
| 1 | [#157](https://github.com/doanchienthangdev/ritsu-works/pull/157) | axis tag + enrichment + audit-repair migration 00044 |
| 2 | [#158](https://github.com/doanchienthangdev/ritsu-works/pull/158) | `mcp__supabase-ops__resolver_find` axis/enrichment (no LLM) + axis-tags validator + coverage→16 kinds |
| 3 | [#159](https://github.com/doanchienthangdev/ritsu-works/pull/159) | `resolver-plan` skill + ResolverPlan v1 schema + `/resolver plan` + plan audit |
| 4 | [#160](https://github.com/doanchienthangdev/ritsu-works/pull/160) | nightly catalog-sync GitHub Action + `sync.cjs --draft` + coverage WARN→CRITICAL |
| 5 | *this PR* | `context_recipe` first-class docs + find→plan contract test + Phase 8 promotion |

## 15. See also
- Skill: `06-ai-ops/skills/resolver-plan/SKILL.md`
- Companion skill: `06-ai-ops/skills/resolver-query/SKILL.md`
- Command: `.claude/commands/resolver.md` (`/resolver plan`)
- Schema (ResolverPlan v1): `knowledge/schemas/resolver-plan.schema.json`
- Find tool: `mcp-server/src/tools/resolver-find.ts`
- Plan-audit helper: `scripts/resolver-v2/plan-audit.cjs`
- Migration: `supabase/migrations/00044_resolver_decisions_plan_payload.sql`
- Nightly Action: `.github/workflows/resolver-catalog-sync.yml`
- Retrospective: `wiki/capabilities/resolver-plan/retrospective.md`
- Governance: `governance/HITL.md` (tier classification); `governance/ROLES.md` (role_scope)
- Policy: `knowledge/recipients/external-sources.md` entry `external-source/anthropic-api`
- Program: `.archives/brainstorming/deepask/` (Capability 2 = deepask)
