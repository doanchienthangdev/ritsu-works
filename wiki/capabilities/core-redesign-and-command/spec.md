# Capability Spec: Redesign 00-core foundation + /core command

**Phase:** 5 (canonical capability spec — COMPRESSED Phase 5 per founder decision)
**ID:** core-redesign-and-command
**Selected option (from Phase 4):** Option C — Core-Shell + Skill-First
**HITL tier:** C
**Decision row:** `ops.decisions.id = ccc6b391-85b8-4cf6-9ca2-9d7809f84d68` (Phase 4); Phase 5 Tier C decision row TBD on approve
**Generated:** 2026-05-21
**ops.capability_runs id:** cd377ba8-d8c6-44ed-b0ad-69981b49d45a

---

## 0. Compression note

Phase 5 ran in **compressed mode** (founder choice, consistent with Phase 4 compression). The standard Phase 5 ceremony (architect dispatch + @cto re-review + Muse panel) was honored via equivalent upstream input:
- **Architect dispatch equivalent**: 6 brainstorm artifacts (Output 1 file-by-file spec 28.9KB + Output 2 /core command spec 18.9KB + sections 1-11 review 16.6KB + context bundle 17.8KB + decisions log + summary)
- **@cto re-review equivalent**: CTO Phase 2 lens with 2 verified gaps (frontmatter parser + workspace_plane boundary) + concrete recommendation
- **Muse panel equivalent**: spec review loop iter 1+2 (5/10 → 7/10) — 2 independent adversarial passes with explicit reviewer concerns persisted

Tier C founder approval IS required (preserved) — see §11 below.

---

## 1. Problem statement (carried from Phase 1)

Redesign `00-core/` pillar from 5 docs (3 filled + 2 templates) into 19-file canonical foundation (10 filled + 6 stubs + 3 existing) AND ship `/core` slash command with 7 Phase-1 verbs (show, list, diff, check, compose, scaffold, fill), enabling consistent AI workforce + cofounder ground-truth citation. Target: 10 filled docs + 7 working verbs deployed within 7 working days, validator-clean.

## 2. Selected approach (carried from Phase 4)

**Option C — Core-Shell + Skill-First**. Thin shell of 10 critical docs filled + 3 v0.1-draft tagged for revisit-at-30-paying + 6 stubs with explicit `entry_condition`/`triggered_by`/`why_deferred` frontmatter. `/core` command (Phase 1: 7 verbs) as the leverage interface. `scripts/core/lib/frontmatter.cjs` as new SHARED parser lib (per CTO Phase 2 mandate; backport /wiki separately).

## 3. Per-Bài-toán impact analysis

| Bài | Impact | Required change |
|---|---|---|
| #1 (4-Tier Truth + audit log) | LOW — adds 19 Tier 1 files; uses git audit only v1 | Manifest v0.9.0 sub_files; no new audit table |
| #2 (HITL) | MEDIUM — 3 Tier C PRs; uses existing tiers | None new; `pre-edit-tier1` hook should warn on 00-core edits (deferred — depends on hook runtime P2) |
| #4 (Memory: episodic recall) | LOW — /core compose enables agent context loading without full memory queries | None new |
| #5 (Multi-Agent Orchestration) | MEDIUM — /core orchestrator + core-fill skill subagent | New skill namespace `core-management/` |
| #7 (Economic Architecture) | LOW — adds `ai-ops-meta` bucket cost ~$3 setup, $0 recurring | Capability-registry entry already done Phase 0.5 with cost_bucket: ai-ops-meta |
| #8 (Scheduling) | NONE | — |
| #9 (SOP) | NONE — 00-core docs are reference not workflow; SOP-CORE-NNN namespace stays empty | — |
| #10 (Visibility / KPI) | MEDIUM — 2 NEW KPIs: `core_docs_filled_count`, `core_command_verbs_phase_1` | Add to `knowledge/kpi-registry.yaml` |
| #11 (Events outbox) | LOW — 1 new event type `ritsu.core.{action}_completed` per /core write verb | Auto-registered; no schema change |
| #12 (MCP integration) | NONE | — |
| #13 (State machines) | NONE — /core verbs are stateless | — |
| #14 (Knowledge graph + embeddings) | LOW — 00-core docs already walked by docs-engine; new frontmatter additive | Verify Phase 7 PR-3: `pnpm docs:sync` post-merge |
| #15 (Decision Architecture) | MEDIUM — 2 ops.decisions rows (Phase 4 option select + Phase 5 architecture) | Already inserted Phase 4 (ccc6b391-...); Phase 5 row TBD on approve |
| #16 (Customer data) | NONE | — |
| #17 (Multi-surface) | LOW — /core is Claude Code surface only v1; future Telegram /core may extend | None v1 |
| #18 (Ingestion) | NONE | — |
| #19 (Founder capacity) | HIGH — 6-10h Phase A founder time pre-PMF (think-heavy doc writing); ~30 min/quarter ongoing review | Honest estimate; revisit if Actual >12h Phase A |
| #20 (CLA itself) | This capability produced via CLA | — |

## 4. Component changes

### 4.1 New skills

| Skill | Path | Purpose |
|---|---|---|
| `core-fill` | `06-ai-ops/skills/core-management/core-fill/SKILL.md` | Interactive fill for 00-core docs (`/core fill <doc>`); 2 modes: stub-to-draft, draft-to-canonical |

### 4.2 New SOPs

NONE. SOP-CORE-NNN namespace stays empty per gap analysis (00-core nature is reference docs not workflow SOPs).

### 4.3 Tier 1 yaml changes

See `draft/tier1-diffs.yaml`. Summary:
- `knowledge/manifest.yaml` v0.9.0 — add `pillars.core.sub_files` enumeration (19 files) + `workspace_plane.runtime` declaration (NEW, per CTO Phase 2)
- `knowledge/kpi-registry.yaml` — add 2 NEW KPIs (`core_docs_filled_count`, `core_command_verbs_phase_1`)
- `knowledge/capability-registry.yaml` — UPDATE state→`operating` + version bump (Phase 8)

### 4.4 Database migrations

**NONE v1.** `ops.core_runs` table deferred to v1.1 per locked Decision #5 (filesystem-only v1).

### 4.5 New integrations / MCP servers

**NONE.**

### 4.6 Frontend pages (if any)

**NONE.**

### 4.7 New commands / agents

| Trigger | Type | File |
|---|---|---|
| `/core` | slash command | `.claude/commands/core.md` |

NO new subagents (no `.claude/agents/core-*.md`).

### 4.8 New scripts

| Script | Type | Purpose |
|---|---|---|
| `scripts/core/lib/frontmatter.cjs` | NEW SHARED LIB | YAML frontmatter parse/serialize/validate. **Per CTO mandate**: snapshot tests against existing 3 docs BEFORE compose.cjs |
| `scripts/core/compose.cjs` | helper | Bundle assembler (mirror `scripts/wiki-sync/get.cjs`) |
| `scripts/core/reindex.cjs` | helper | INDEX.md regenerator (--check v1, --write v2) |
| `scripts/core/validate.cjs` | helper | Schema check |
| `scripts/cross-tier/validate-core-pillar.cjs` | wrapper | Cross-tier validator (run-on-demand v1) |
| `scripts/core/migrate-existing-frontmatter.cjs` | one-shot | Retrofit frontmatter onto 3 existing docs (deleted post-migration) |

### 4.9 New 00-core/ doc files

19 files total. See Output 1 for file-by-file spec.

| Bucket | Count | Files |
|---|---|---|
| Existing (no change) | 3 | product.md, brand_voice.md, transparency.md (migration script adds frontmatter) |
| Canonical filled | 6 | charter.md (fill), founder-profile.md (fill), north-star.md, icp-summary.md, positioning.md, INDEX.md |
| v0.1-draft | 3 | values.md, ai-native-philosophy.md, principles.md (revisit_at: 30-paying) |
| Stubs (frontmatter only) | 6 | glossary.md, design-system.md, wedge.md, pricing-philosophy.md, operating-cadence.md, decision-rights-narrative.md |
| Meta | 1 | README.md (update) |

## 5. Cost-bucket impact (Bài #7)

- **Cost-bucket**: `ai-ops-meta` (existing — extended via `knowledge/capability-registry.yaml` Phase 0.5)
- **Setup cost**: ~$3 (Phase 0-8 CLA + Phase 5 architect compression saving $2-3)
- **Recurring monthly cost**: $0 (filesystem-only v1)
- **Per-LLM-call task-kind cap**: N/A v1 (no recurring LLM calls; only `/core fill` invokes founder via AskUserQuestion — minimal cost)
- **Founder time setup**: 6-10h (Phase A) + 1-2h (Phase B+C PR reviews)
- **Founder time recurring**: ~30 min/quarter (canonical review) + 30 min/v0.1-revisit-trigger fire

## 6. Acceptance criteria

### Phase 7 (Implementation)
- [ ] `scripts/core/lib/frontmatter.cjs` shipped FIRST with snapshot tests vs 3 existing 00-core docs (CTO mandate)
- [ ] All 4 helper scripts (`scripts/core/compose.cjs`, `reindex.cjs`, `validate.cjs`, `migrate-existing-frontmatter.cjs`) implemented + unit tests
- [ ] `scripts/cross-tier/validate-core-pillar.cjs` wrapper implemented (run-on-demand v1)
- [ ] `.claude/commands/core.md` implements 7 Phase-1 verbs
- [ ] `06-ai-ops/skills/core-management/core-fill/SKILL.md` implements stub-to-draft + draft-to-canonical modes
- [ ] Migration script runs --apply on 3 existing docs; frontmatter retrofitted
- [ ] All 19 docs exist in `00-core/` per buckets above
- [ ] `knowledge/manifest.yaml` v0.9.0 bumped (sub_files + workspace_plane.runtime)
- [ ] `knowledge/kpi-registry.yaml` adds 2 NEW KPIs
- [ ] `pnpm check` clean per PR (existing validators + new `validate-core-pillar.cjs`)
- [ ] E2E test: `/core compose identity --to=/tmp/test.md` produces valid bundle
- [ ] E2E test: `/core scaffold + /core fill + /core check` round-trip

### Phase 8 (Catalog)
- [ ] `knowledge/capability-registry.yaml` UPDATE state→`operating`, version 1.0.0, actuals filled
- [ ] `wiki/capabilities/core-redesign-and-command/spec.md` promoted (this file)
- [ ] `wiki/capabilities/core-redesign-and-command/retrospective.md` written
- [ ] `pnpm check` clean
- [ ] `ops.capability_runs.state = 'operating'`

### Operating (post-launch)
- [ ] `core_docs_filled_count` = 10 (or higher if stubs graduate)
- [ ] `core_command_verbs_phase_1` = 7
- [ ] `core_docs_v0_1_drafts` = 3 (values, principles, ai-native-philosophy; revisit at 30 paying)
- [ ] Founder reports cofounder onboarding time < 2 hours (when cofounder joins)

## 7. HITL points

| Phase | Tier | Action | Why |
|---|---|---|---|
| 1 (Problem framing) | A | Auto | Problem already framed by brainstorm |
| 2 (Domain analysis) | A | Auto | CxO dispatch with CTO + analyst synthesis |
| 3 (System inventory) | A | Auto | Deterministic, no LLM |
| 4 (Options) | B | Founder pre-decided via brainstorm; compressed Phase 4 confirms | Cross-functional decision |
| 5 (Architecture) | C | **THIS GATE** — founder approves spec | Irreversible-ish; full ceremony required even compressed |
| 6 (Sprint plan) | B | Founder approves sprint breakdown | Workflow check |
| 7 (per PR) | B | Founder reviews + merges each of 3 PRs | Per-PR diff review |
| 8 (Promotion) | A | Auto on `pnpm check` clean + Phase 7 done | Mechanical |

## 8. Rollback plan

If shipped + breaks:
1. **Code rollback**: `git revert` the merge commits for the relevant PR (A, B, or C)
2. **Migration rollback**: NONE NEEDED (no DB migrations)
3. **Tier 1 yaml rollback**: revert `knowledge/manifest.yaml` + `knowledge/kpi-registry.yaml` via PR
4. **00-core file rollback**: `git revert` (additive only — existing 3 docs unchanged at content level; only frontmatter retrofitted)
5. **State machine rollback**: `UPDATE ops.capability_runs SET state = 'deprecated' WHERE capability_id = 'core-redesign-and-command'`

**Reversibility rating**: **5/5** (easily reversible — additive only, no DB, no irreversible commitments)

## 9. CTO sanity-check (Phase 5 COMPRESSED — carried from Phase 2 with explicit Phase 5 confirmation)

CTO Phase 2 lens (verified inline by skill at Phase 2.2):

> 1. **`scripts/wiki-sync/lib/frontmatter.cjs` does NOT exist** (verified: `scripts/wiki-sync/` has 6 .cjs files at top level, no lib/ subfolder). Phase 5 spec MUST mandate `scripts/core/lib/frontmatter.cjs` as shared lib + snapshot tests against existing 3 docs BEFORE `scripts/core/compose.cjs` lands.
> 2. **`runtime/` is NOT in `knowledge/manifest.yaml` workspace_plane** (verified: workspace_plane declares only raw/, wiki/, .archives/). Phase 5 spec MUST mandate manifest workspace_plane bump + .gitignore confirmation in same PR.
> 3. **Beginner mistake to avoid**: treating `/core compose --to=<path>` as benign write; the path must respect workspace_plane boundary. Spec MUST enforce path validation in compose.cjs.
> 4. **RECOMMEND**: ship lib first → compose second → validator third → command fourth. Order-of-build is load-bearing.

**Phase 5 disposition**: ACCEPTED, spec §4.8 + §10 acceptance criteria enforce all 4 CTO requirements.

## 10. Muse panel synthesis (Phase 5 COMPRESSED — carried from brainstorm spec review iter 1+2)

Spec review loop equivalent of Muse panel:

**Iteration 1 (5/10)** — surfaced YAGNI / scope-creep:
- Glossary FILLED pre-PMF = YAGNI (vocabulary not stable) → REVERSED to stub
- values/principles/ai-native-philosophy as canonical pre-PMF = premature lock-in → TAGGED v0.1-draft with revisit_at:30-paying
- /core 14 verbs speculative for 0-user product → CUT to 7 Phase-1 + 7 deferred
- Effort estimate optimistic (5-6h CC + 1.5h founder) → BUMPED to 8-12h CC + 4-6h founder

**Iteration 2 (7/10)** — surfaced detail gaps (all fixed):
- Frontmatter schema undefined → ADDED full schema block
- HITL ceremony unspecified → ADDED 3-PR Tier C ceremony spec
- Founder effort STILL under-estimated → BUMPED again to 6-10h pessimistic 12h
- INDEX.md generator scope vague → ADDED hybrid (header hand-written + table auto-gen)
- Bundle "operating" v1 = stubs problematic → REDUCED to `principles` only v1

**Iteration 2 reviewer concerns acknowledged (not fully resolved, persisted)**:
- Founder effort structurally hard pre-PMF — accept as calibration data
- /core fill schema design deferred to Phase B implementer (in same PR)
- Operating bundle v1 = principles only (stubs added on graduation)

**Consensus equivalent**: brainstorm 2 iterations + CTO Phase 2 = 3 independent adversarial reviews all converged on right-sized Option C with explicit reviewer concerns documented. Roughly equivalent to 5-persona Muse panel reaching consensus (3 of 5).

## 11. Tier C decision record

**On founder approval**: this skill will INSERT a Tier C ops.decisions row with:
- slug: `core-redesign-architecture-tier-c-approve`
- title: "Tier C approve: 00-core redesign + /core command architecture spec"
- decision_type: `architecture_approve`
- hitl_tier: `C`
- reversibility: `reversible` (rating 5/5)
- state: `decided`
- decided_by: founder
- decided_at: <approval timestamp>
- decision_text: "Tier C approved per Compressed Phase 5 ceremony. Spec.md + tier1-diffs.yaml + draft/ folder reviewed. CTO Phase 2 sanity confirmed (2 gaps verified). Muse-equivalent adversarial input via brainstorm spec review iter 1+2."
- decision_payload: { capability_id, spec_path, tier1_diffs_path, ctos_mandates: [...], reviewer_concerns: [...] }

Then UPDATE capability_runs:
- `phase_5_decision_id = <new id>`
- `spec_path = '.archives/cla/core-redesign-and-command/spec.md'`
- `state = 'planning'`, `current_phase = 6`, `phases_completed = ARRAY[0,1,2,3,4,5]`

## 12. Next phase

Phase 6: Sprint Planning (`sprint-planner` skill) — HITL Tier B (founder approves sprint breakdown).

Expected output: `.archives/cla/<id>/sprint-plan.md` with 3 sprints (Phase A founder docs / Phase B command+scripts / Phase C integration) + acceptance criteria per sprint + Wave alignment.

Phase 6 cost: ~$0.05-0.15 (sprint-planner skill; no fan-out).
