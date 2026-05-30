# Capability Spec: deepask

**Phase:** 5 (canonical capability spec)
**ID:** deepask
**Selected option (from Phase 4):** Option B — Risk-first resequence
**HITL tier:** C
**Decision row:** `ops.decisions.id = 861f8eb4-6572-4df5-b1cc-44aac0a7b014` (slug `deepask-architecture-option-b`, state `decided`)
**Generated:** 2026-05-30
**Depends on:** capability `resolver-plan` (state `operating`)
**Full functional detail:** `refs/05-spec-deepask-v1.0.md` (brainstorm spec — this spec is canonical on DECISIONS + IMPACT; the brainstorm spec carries the exhaustive 5-stage/format/test detail).

---

## 1. Problem statement (carried from Phase 1)

Ship `/deepask "<q>" [--format][--sources][--depth][--dry-run]` — a **zero-routing** federated synthesizer that decomposes a question into MECE sub-needs, consumes a 2-axis `ResolverPlan v1` from `resolver-plan` per sub-need, fans out parallel reads + Tier-A capability runs across all 4 IA types, and returns a Pyramid-structured answer with **100% of claims cited**, authority-ranked, conflict-flagged, freshness-tagged, in one of **12 output formats** — OR an **honest no-coverage gap + remedy**. Never a hallucination; never silent partial.

## 2. Selected approach (carried from Phase 4 — Option B)

Locked architecture (F1–F4) + all 12 formats in v1, **resequenced** so the highest risk (resolver session-breaker exhaustion) is retired first: the **resolver-budget accountant** is an explicit Sprint-1 gating deliverable, and the full breaker-safe loop (read + run + synthesize + critic, with honest PARTIAL) is proven by end of Sprint 3 — *before* the two sprints of brittle, session-only format adapters. Canonical `answer.md` is always-on; rich formats degrade gracefully.

The 5-stage runtime loop (full detail: `refs/05-spec-deepask-v1.0.md` §3):
**① decompose** (MECE sub-needs, IA-type A/B/C/D tags, depth-bounded ≤6/≤12) → **② resolve** (one `ResolverPlan v1` per sub-need via `resolver-plan`; deepask issues ZERO routing) → **③ execute/fan-out** (parallel subagents READ `content_axis` + RUN Tier-A `capability_axis` only; surface Tier-B+; delegate web leg to `deep-research`; **authors the concrete read-only SQL / `wiki_ask` question / skill params itself, grounded in the plan's `grounding_ref`/`columns_hint` — never invents column names**) → **④ synthesize** (Pyramid; every claim cited; authority-ranked SoR>memory for facts, memory>SoR for judgement; conflicts flagged; freshness tagged; adversarial-verify key claims depth-scaled; emits format-agnostic IR) → **⑤ completeness-critic** (coverage matrix + MECE re-check + live-probe; COMPLETE or PARTIAL-WITH-HONEST-GAPS + remedy; ≤1 bounded follow-up resolve→execute round).

## 3. Per-Bài-toán impact analysis

| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth (4-tier) | READS all 4 IA types; WRITES only Tier-2 (`ops.deepask_*`) + scratch (`.archives/deepask/`) | migration 00045; no Tier-1 truth change |
| #2 HITL | deepask runtime = **Tier A** (read/synthesize); Tier-B+ capability legs **surfaced**, never auto-run | no new tier; reuse `governance/HITL.md` |
| #4 Memory | reads gbrain (derived-memory) as a content source; `ops.deepask_runs`/`coverage` + `ops.corrections` = the learning substrate (future `/evolve` target) | no new embeddings table |
| #5 Multi-Agent | **NEW** orchestrator + 5 core skills + parallel per-sub-need execute fan-out (ephemeral subagents) | skill suite `06-ai-ops/skills/deepask/*` + `/deepask` command |
| #7 Cost | orchestration = subscription (in-session); per-run logged to `ops.cost_attributions` + `ops.deepask_runs.cost_usd`; gbrain reads under existing $100/mo cap | NEW cost-bucket `ai-ops-deepask` |
| #8 Schedule | none — deepask is on-demand; benefits from resolver-plan's existing nightly catalog-sync | no new cron |
| #9 SOP | runtime contract worth codifying (analogous to `SOP-AIOPS-004-evolve`) | **NEW (light) `SOP-AIOPS-005-deepask-runtime-contract`** (Sprint 6) — *founder confirm at Tier C* |
| #10 Visibility | **3** NEW KPIs | `deepask.complete_verdict_rate`, `deepask.uncited_claim_rate`, `deepask.breaker_trip_rate` (panel-added) → `kpi-registry.yaml` + `kpi-ownership.yaml` |
| #11 Events | optional event emission | `ritsu.deepask.{run_completed, coverage_gap}` → `ops.events` |
| #12 MCP | **no new MCP server**; reuses supabase-ops (query/insert/wiki_*/resolver_find), gbrain (read), mermaid MCP (format) | none |
| #13 State machine | run verdict COMPLETE\|PARTIAL is single-shot, tracked in `ops.deepask_runs.verdict` | no formal state-machine yaml |
| #14 Knowledge graph | READS wiki/gbrain graph; does NOT write to it (answers → `.archives` + ops) | none |
| #15 Decision | **this spec IS the Tier C decision** (Muse panel attached §10) | `ops.decisions` row |
| #16 Customer data | may READ `public.mv_customer_360` + `metrics.*` mirror; **NEVER `product.*` direct** (firewall) | none (read-only via approved views) |
| #17 Multi-surface | CLI `/deepask`; the 12-format artifacts ARE the multi-surface output | format engine (no new surface adapter) |
| #18 Ingestion | none — reads already-ingested knowledge | none |
| #19 Founder capacity | ~1–2h design review + per-PR review ×6 sprints; **runtime SAVES founder time** (1 command vs manual multi-surface querying) | — |
| #20 CLA | this capability is CLA-produced (run `46bec9c9-a094-4979-a62f-614943e64c6a`) | — |
| #20.1 Brain integration | **READ-only** (see §5.X) | reuse existing gbrain read tools + $100/mo cap |

### 5.X Brain integration decision (architect Step 2.5)

**Decision: `READ-only`.**
- **Q1 READ = YES** — deepask reads gbrain as one of its **content-axis** sources at runtime (IA type B, derived-memory): `mcp__gbrain__{search,recall,think,traverse}`, routed by `resolver-plan`'s `content_axis`, **preferring cheap `search`/`recall` over `think`**, under the global $100/mo HARD cap (`pre-budget-check.sh`) + the caller role's per-role gbrain budget (`governance/ROLES.md` v1.1 matrix).
- **Q2 WRITE = NO** — deepask is read+synthesize, not a brain-writer; answers/plans/sources go to `.archives/deepask/` + `ops.deepask_*` (non-goal: "not a create/modify surface"). No `put_page`/`add_link`.
- **Q3 COST** — managed by the **existing** gbrain caps; deepask inherits the caller role's gbrain budget and does NOT add a new per-task-kind gbrain cap. (The NEW `ai-ops-deepask` cost-bucket in §5 covers deepask's *subscription* orchestration cost, separately from gbrain.)
- The **architect's own** brain-write (`concepts/deepask-architecture`) is **deferred/skipped** this run — INSERT-only MCP (Phase 1.5) can't set the `ops.decisions.gbrain_concept_slug` cross-link via UPDATE, and the founder is in-session; the wiki spec promotion at Phase 8 is the durable record. (Consistent with the Phase-1 gbrain-write skip.)

## 4. Component changes

### 4.1 New skills (`06-ai-ops/skills/deepask/`)

| Skill | Path | Purpose |
|---|---|---|
| orchestrator | `deepask/orchestrator/SKILL.md` | runs the 5-stage loop; owns depth/sources/dry-run; **resolver-budget accountant** (reads `session_finds_count`, reserves critic follow-up, degrades to honest PARTIAL) |
| decompose | `deepask/decompose/SKILL.md` | question → MECE sub-needs + IA-type tags (reuses `thinking-toolkit/{tosca,mece,driver-tree}`); depth-bounds ≤6/≤12 |
| execute | `deepask/execute/SKILL.md` | parallel fan-out; reads content; runs Tier-A; surfaces Tier-B+; firewall + gbrain-cap aware; **authors concrete SQL/wiki_ask/params grounded in `grounding_ref`/`columns_hint`, never invents columns**; deep-research delegation; bounded self-correct (re-read schema → retry once → honest no_coverage) |
| synthesize | `deepask/synthesize/SKILL.md` | Pyramid + citation + authority-rank + conflict + freshness + adversarial-verify (reuses `thinking-toolkit/{pyramid,so-what,2x2}`); emits format-agnostic IR |
| completeness-critic | `deepask/completeness-critic/SKILL.md` | coverage matrix + MECE re-check + live-probe + honest no-coverage + ≤1 bounded follow-up |
| format/* (12 adapters + smartauto) | `deepask/format/{text,article,pdf,docx,pptx,xlsx,mermaid,chart,dashboard,html,interactive,canvas,smartauto}/SKILL.md` | thin IR→artifact bridges reusing `anthropic-skills:{pdf,docx,pptx,xlsx,canvas-design}`, mermaid MCP, `design:*`/`frontend-design`, `playbook-builder`; graceful degrade to `answer.md` |

### 4.2 New SOPs

| SOP | Path | Trigger |
|---|---|---|
| SOP-AIOPS-005-deepask-runtime-contract (light) | `06-ai-ops/sops/SOP-AIOPS-005-deepask-runtime-contract/flow.yaml` | on-demand `/deepask` (documents the 5-stage contract + read-vs-run rule + firewall/cap/breaker guards). **Founder confirm at Tier C.** |

### 4.3 Tier 1 yaml changes

See `draft/tier1-diffs.yaml`. Summary: `capability-registry.yaml` (✅ done Phase 0), `recipients/*`+`INDEX.md` (✅ done Phase 0), `manifest.yaml` (+2 tables), `kpi-registry.yaml`+`kpi-ownership.yaml` (+2 KPIs). **No new role; no new HITL tier.**

### 4.4 Database migrations

`draft/migrations/00045_deepask_observability.sql` — `ops.deepask_runs` + `ops.deepask_coverage` (mirrors `ops.resolver_decisions` 00034 RLS: founder + etl-runner full, others own caller_role). Forward-only (repo convention).

### 4.5 New integrations / MCP servers

**None.** No new MCP server, external service, or secret.

### 4.6 Frontend pages

**None** (CLI capability).

### 4.7 New commands / agents

| Trigger | Type | File |
|---|---|---|
| `/deepask` | slash command | `.claude/commands/deepask.md` |
| (execute fan-out) | ephemeral parallel subagents (Task) | no new named `.claude/agents/` file |

## 5. Cost-bucket impact (Bài #7)

- **New cost-bucket:** `ai-ops-deepask` (runtime orchestration — subscription/in-session; logged to `ops.cost_attributions` + `ops.deepask_runs.cost_usd`).
- **gbrain reads:** under the existing global $100/mo HARD cap + per-role gbrain budget (no new gbrain cap).
- **No per-task-kind $ cap** required for v1 (runs under caller role; founder unlimited). `--dry-run` surfaces a cost estimate before any spend. Alert/escalate/hard-block per `governance/ROLES.md` defaults if a soft cap is later added.

## 6. Acceptance criteria

### Per-sprint (Phase 7, Option B sequence)
- **S1** — `/deepask` + orchestrator with **resolver-budget accountant** (reserves follow-up round; honest PARTIAL when budget short; **MUST populate `ops.deepask_runs.resolver_find_calls`** — @cto NIT-1, so breaker usage + `deepask.breaker_trip_rate` are auditable) + decompose + resolve(consume resolver-plan) + execute(read-only legs) + migration 00045 + honest-PARTIAL path observable in `ops.deepask_coverage` (incl. `gap_reason='breaker_budget'`). `pnpm check` clean.
- **S2** — synthesize (zero uncited claims; authority rank; conflict; freshness) + completeness-critic + live-probe + adversarial-verify (depth-scaled). Negative test: no-coverage Q → honest gap, not hallucination.
- **S3** — capability-run leg (Tier-A auto + Tier-B+ surface) + gbrain-cap respect + deep-research delegation + HITL wiring. **Full loop end-to-end + breaker-safe.**
- **S4** — Format Engine IR + doc adapters (text·article·pdf·docx·pptx·xlsx) + smartauto. Canonical `answer.md` always written.
- **S5** — visual adapters (mermaid·chart·dashboard·html·interactive·canvas); graceful degrade when a session skill is absent.
- **S6** — observability/learning-loop polish + corrections + 2 KPIs + `SOP-AIOPS-005` + docs page + Phase-8 catalog promotion.

### Operating (acceptance — brainstorm spec §13)
- [ ] Hard cross-pillar Q → Pyramid, fully-cited, authority-ranked, conflict-aware, freshness-tagged answer + artifact in `.archives/deepask/<date>-<slug>/`.
- [ ] No-internal-coverage Q → honest gap + remedy (never hallucination).
- [ ] **Zero routing in deepask** (verifiable in `plan.json`).
- [ ] Tier-B+ surfaced, never auto-run; `product.*` never touched; gbrain cap + resolver breaker respected.
- [ ] All 12 `--format` produce a valid artifact; smartauto sane; `--dry-run` executes nothing (beyond the resolve-plan it transparently labels).
- [ ] `ops.deepask_runs` + `ops.deepask_coverage` populated; `pnpm check` clean; all tests pass.

## 7. HITL points

| Phase | Tier | Action |
|---|---|---|
| 4 Options | B | Founder picked Option B ✅ |
| 5 Architecture | C | Founder approves this spec (ceremony below) |
| 7 per PR | B | Founder reviews + merges each sprint PR |
| **Runtime** | **A** | deepask reads/synthesizes autonomously; **any Tier-B+ capability leg surfaced for approval, never auto-run** |

### Resolved design questions (carried from Phase 4)
- **`--dry-run` semantics:** dry-run **DOES** call `resolver-plan` (to show *real* ResolverPlans + predicted coverage + cost estimate) but performs **zero** content-reads / capability-runs / writes. It therefore **consumes resolver-breaker budget** (one find per sub-need) — this cost is **labeled honestly** in the dry-run output. (Resolves the @cto Phase-2 nuance + spec §7 "executes nothing" = executes no reads/runs/writes.)
- **SOP-AIOPS-005:** recommend YES (light runtime-contract SOP, Sprint 6) — founder confirm.
- **Adversarial-verify depth:** quick=0 votes, standard=1, deep=2, exhaustive=3 skeptics per key claim (tunable; brainstorm spec §10).

## 8. Rollback plan

1. **Code:** `git revert` the Sprint-N merge commit(s) — purely additive, no existing behavior touched.
2. **Migration 00045:** forward-only; if needed, `DROP TABLE ops.deepask_runs, ops.deepask_coverage` (pre-PMF data-loss acceptable).
3. **Tier-1 yaml:** revert via PR (registry/catalog/manifest/KPIs).
4. **State:** `ops.capability_runs.state = 'deprecated'`.
**Reversibility rating:** **4/5** (additive; clean revert; only the migration is mildly sticky).

## 9. CTO sanity-check (Phase 5)

**verdict: NITS** (approve with minor nits — no BLOCK).

- ✅ **Migration slot 00045** correct (00044 latest). ✅ **RLS/index parity** faithful to `00034_resolver_decisions.sql` (jwt-claims role gate; `GRANT SELECT,INSERT TO authenticated`). The `deepask_coverage_read_own_role` EXISTS-subquery is a correct extension (resolver had no child table); coverage inherits parent role gate. ✅ **FK `ON DELETE CASCADE`** on `coverage.run_id` correct; rollback DROPs coverage first.
- ✅ **Security clean** — no plaintext secrets; INSERT-only grant (no UPDATE/DELETE injection surface); `CHECK (verdict IN …)` passes on NULL while running (SQL-standard, intended); no dynamic SQL (execute authors parameterized reads).
- ✅ **manifest↔migrations** — confirmed via `validate-manifest-db.cjs:69-75`: landing migration 00045 WITHOUT the manifest entry in the **same PR** FAILS the gate (reverse direction enforced). The tier1-diffs `phase-7` co-PR sequencing is **sound and necessary**.
- ✅ **Breaker-accountant feasible** — `session_finds_count` IS returned on success (`resolver-find.ts:574`), warn (`:585`), degraded (`:504`), AND cap-exceeded (`:471`) paths; `SESSION_HARD_CAP=20` shared session-wide, 4h idle reset (`:43,45,74`) — exactly as the accountant assumes.
- **NIT-1 (resolved):** `resolver_find_calls` has no NOT NULL — the orchestrator MUST populate it for the breaker KPI to be auditable → **promoted to an explicit S1 acceptance criterion** (§6 S1) + S1 PR-review check.
- **NIT-2 (cosmetic, not ours):** the on-disk `00034_resolver_decisions.sql` has a stale "Migration 00033" in its *own* header; our cross-ref to filename **00034** is correct. No action (pre-existing typo in 00034, out of scope).

## 10. Muse panel synthesis (Phase 5)

`high-stakes-decision-panel` — **CONSENSUS 4/5 APPROVE** (min_consensus 3/5 → passes).

- **cynic (HOLD):** likely failure = breaker still trips in real bursts (counter shared session-wide; siblings spend it) → fake `no_coverage`; the 12 adapters bridge session-only skills → "9 of 12 ship as theater" via graceful-degrade; 6 PRs = reviewer fatigue.
- **optimist (APPROVE):** highest-leverage internal surface — one command replaces manual cross-tier querying, fully cited; makes resolver-plan pay off; additive + 4/5 reversible; useful `answer.md` exists by end of S3.
- **ethical-compass (APPROVE):** the two harm vectors are genuinely wired into acceptance, not aspiration — firewall (`metrics.*` only, hook-enforced) + citation-honesty (zero-uncited + negative no-coverage test). "Don't lie, don't leak" is an acceptance gate.
- **data-pragmatist (APPROVE):** observability sound + patterned (mirrors `ops.resolver_decisions`); the 2 KPIs measure the two things that matter. **Gap: no first-class breaker-trip-rate / latency KPI** → "fake no_coverage" frequency inferable but not surfaced.
- **time-honest (APPROVE):** "all 12 in v1" is the scope-creep flag — but it's a founder *choice* (Option C offered + rejected), not a bad estimate; format breadth is the most-parallelizable labor isolated to the soft tail (S4–S5) behind always-on `answer.md`. 6 sprints defensible.

**Panel-driven change (resolves cynic + data-pragmatist):** add a **3rd KPI `deepask.breaker_trip_rate`** (runs whose PARTIAL carried `gap_reason='breaker_budget'` ÷ total) — makes the #1 risk first-class observable. The cynic's two HOLD concerns (breaker burst, format theater) are exactly Option B's mitigations (S1 accountant + honest-PARTIAL; always-on `answer.md` + explicit graceful-degrade) — acknowledged risks with wired mitigations, not blockers.

## 11. Tier C decision record

- **Decision:** `ops.decisions` id `861f8eb4-6572-4df5-b1cc-44aac0a7b014` (slug `deepask-architecture-option-b`), state `decided`.
- **Approved by:** founder · **Method:** Claude Code inline approval (AskUserQuestion, per `governance/HITL.md` Tier C). · **Date:** 2026-05-30.
- **What was approved:** Option B architecture per this spec + migration 00045 + tier1-diffs; @cto NITS (resolved); Muse panel 4/5 APPROVE.
- **Note:** `ops.capability_runs.phase_5_decision_id` not set (INSERT-only MCP, Phase 1.5); the capability↔decision link is carried in `ops.decisions.decision_payload.capability_run_id` + this record.

## 12. Next phase

Phase 6: Sprint Planning (`sprint-planner` skill) — finalize the Option-B 6-sprint plan with acceptance criteria + Wave alignment.
