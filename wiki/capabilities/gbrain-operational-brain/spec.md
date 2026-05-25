# Capability Spec: GBrain Operational Brain (Type 4 Semantic Memory Integration)

**Phase:** 5 (canonical capability spec — DRAFT pending Tier C approval)
**ID:** `gbrain-operational-brain`
**Version target:** `1.0.0` (Phase 8 promotes from current placeholder `0.1.0`)
**Selected option (from Phase 4):** **Option A — Brainstorm As-Is** + **Hard-cap Option B — Graceful degrade**
**HITL tier:** C — requires founder approval per `governance/HITL.md`
**Decision row:** `ops.decisions.id` = (pending insert at end of this Phase 5 cycle)
**Capability run id:** `ops.capability_runs[7b991380-ae11-4b80-be56-6bc3ca6bbdf1]`
**Generated:** 2026-05-24

---

## 1. Problem statement (carried from Phase 1)

> Make gbrain (Sydney Supabase Free project, installed 2026-05-23) a **governed Type 4 Semantic Memory** layer for the ritsu-works AI workforce, ship by **2026-09-30** with **6 WRITE-enabled roles + 20 READ-capable roles + ≥500 operational pages + ≤$100/mo cost**, **without weakening Tier 1 PR governance**.

(Full version + assumptions + scope: `.archives/cla/gbrain-operational-brain/problem.md`.)

## 2. Selected approach (carried from Phase 4)

**Option A — Brainstorm As-Is**: Single capability `gbrain-operational-brain v1.0`. 6 linear sprints across ~18 calendar weeks (4 weeks seed batch in parallel; 14 weeks for 6 sprints with Tier C governance slack). All 32 components in v1.0 — no v1.1 backlog overhang. Migration count REDUCED from brainstorm 4 → 1-2 per @cto callout (CTO-1: consistency_checks schema already supports L1/L2/L3 via `check_kind`; no enum migration needed).

**Hard-cap behavior**: Option B — Graceful degrade. When monthly cumulative gbrain cost ≥ $100, MCP load succeeds, READS continue, WRITES + dream cycle disabled, Tier C escalation alert sent. Consistent with `knowledge/economic-architecture.md` Axis 2 three-tier escalation (100% escalate; 150% hard-block).

## 3. Per-Bài-toán impact analysis

For each of 20 prior bài toán:

| Bài | Impact | Required change |
|---|---|---|
| #1 4-tier Truth | gbrain extends Type 4 with second substrate (mid-governance vs wiki's loose-governance) | `knowledge/memory-architecture.md` v1.0 → v1.1 (PR-1) |
| #2 HITL | Adds 70 gbrain MCP tools with tier classification (35A/14B/6C/3D) + mass-purge >100 pages D-Std | `governance/HITL.md` append section (PR-3) |
| #4 Memory (Strategy E) | Strategy E v1.0 (3 types) → v1.1 (4 types with gbrain as second Type 4 substrate) | `knowledge/memory-architecture.md` (PR-1) |
| #5 Multi-Agent | 6 WRITE-enabled roles + 20 READ-capable roles; new gbrain-maintainer role | `governance/ROLES.md` (PR-2) |
| #7 Cost | New cost-bucket family `gbrain.<role>.<op>`; per-role hard caps; .mcp.json wrapper enforces | `knowledge/economic-architecture.md` (PR-4) + `scripts/pre-budget-check.sh` |
| #8 Schedule | 3 new cron jobs (crm-to-gbrain-mirror, gbrain-consistency-nightly, gbrain-dream-cycle) | `knowledge/schedules.yaml` + new handlers in `supabase/functions/_shared/worker.ts` |
| #9 SOP | 3 NEW SOPs under `06-ai-ops/gbrain/sops/` (write-discipline, promotion-workflow, dream-cycle-monitoring) | NEW sub-pillar |
| #10 Visibility (KPIs) | 5 NEW KPIs registered | `knowledge/kpi-registry.yaml` + `knowledge/kpi-ownership.yaml` |
| #11 Events | 4 NEW event types: `ritsu.gbrain.write_committed`, `ritsu.gbrain.promotion_pending`, `ritsu.gbrain.consistency_drift`, `ritsu.gbrain.budget_breach` | `knowledge/event-subscriptions.yaml` |
| #12 MCP | Register gbrain MCP server (~70 tools) with role allowlist | `knowledge/mcp-tools.yaml` + `knowledge/mcp-roles.yaml` + `.mcp.json` |
| #13 State machines | New state machine for gbrain page lifecycle (draft → published → archived → purged) | `knowledge/state-machines.yaml` |
| #14 Knowledge graph | Brain extends knowledge graph substrate; cross-link to wiki/ via promotion path | (no new column; reuses existing knowledge_pages.extracted_from_source pattern via `gbrain_promoted_from`) |
| #15 Decision | This spec is a Tier C decision (Muse panel attached at §10) | `ops.decisions` row (inserted at Tier C approval) |
| #16 Customer data | Brain `companies/` + `people/` pages must respect SOP-CUSTOMER-023 GDPR DSR | `05-customer/customer-data/sops/SOP-CUSTOMER-023` extend |
| #17 Multi-surface | gbrain is internal-only substrate; not surfaced externally | (no surface compliance change) |
| #18 Ingestion | gbrain → wiki/ promotion uses wiki-sync v4.0 source-grouped layout | (additive; no wiki-sync change needed) |
| #19 Founder capacity | ~12-18h setup + ~30 min/wk ongoing | `knowledge/founder-rhythm.yaml` capacity reservation entry |
| #20 CLA | This capability is itself produced by CLA. 7 CLA sub-skills get `## Brain context` Sprint 2 | Cross-capability coupling with `capability-lifecycle-architecture v1.1.0` |
| (Cross-tier consistency engine, SOP-AIOPS-002) | 5-8 NEW gbrain L1/L2/L3 invariants | `knowledge/cross-tier-invariants.yaml` (PR-5 companion) |
| (Resolver v2.2) | gbrain MCP already in `knowledge/recipients/external-sources.md`; Sprint 1 ensures consistency | (no recipients-catalog change needed) |

## 4. Component changes

### 4.1 New skills (Sprint 2)

| Skill | Path | Purpose |
|---|---|---|
| brain-write-discipline | `06-ai-ops/skills/brain-write-discipline/SKILL.md` | Template + guidance for `## Brain context` sections in other skills. Standardizes WHEN to read + WHEN to write + format of HITL Tier B notify. |
| brain-promotion | `06-ai-ops/skills/brain-promotion/SKILL.md` | gbrain → wiki/ promotion helper. Phase 2 v1.0 = manual aid (drafts the wiki/ source.md + asks founder Tier C); Phase 3 future capability = autonomous via `/promote` command. |

### 4.2 Extended skills (Sprint 2; ADDITIVE — `## Brain context` section)

13 brain-relevant skills per `refs/03-component-audit.md` Zone 3:

| Skill | Brain ops added |
|---|---|
| `capability-lifecycle/problem-framer` | READ search + WRITE ideas/&lt;cap&gt;-proposal (Phase 1, Tier B notify) |
| `capability-lifecycle/domain-analyst` | READ per persona + WRITE concepts/&lt;cap&gt;-domain-analysis (Phase 2, Tier B) |
| `capability-lifecycle/options-generator` | READ patterns + WRITE concepts/&lt;cap&gt;-options (Phase 4, Tier B) |
| `capability-lifecycle/architect` | READ heavy traverse + WRITE concepts/&lt;cap&gt;-architecture + cross-link spec.md (Phase 5, Tier C + B) |
| `capability-lifecycle/sprint-planner` | READ past sprints + WRITE concepts/&lt;cap&gt;-sprint-plan (Phase 6, Tier B) |
| `capability-lifecycle/implementation-coordinator` | READ per-sprint context + WRITE meetings/&lt;date&gt;-&lt;cap&gt;-sprint-N-review (Phase 7, Tier B notify-first-then-batch) |
| `capability-lifecycle/catalog-updater` | READ full run history + WRITE concepts/&lt;cap&gt;-retro-v&lt;v&gt; + cross-link wiki/retrospective (Phase 8, Tier B + C) |
| `episodic-recall` | Combine `ops.run_summaries` + gbrain `concepts/` search for cross-system recall |
| `monthly-learning-review` | Query gbrain `concepts/` for related thinking patterns |
| `synthesize-morning-brief` | Query gbrain `meetings/` + `people/` for today's prep |
| `task-decompose` | Query gbrain for affected entities before decomposition |
| `task-status` | Query gbrain for entity-related pending threads |
| `capability-lifecycle` (parent SKILL.md) | Documents the umbrella brain-integration pattern |

**SKIP (8 skills — domain-irrelevant per audit):** cost-optimization-review, cost-report, ai-disclosure-check, docs-engine, eval-evo, wiki-sync, resolver-query, core-management.

### 4.3 New SOPs (Sprint 1-2)

| SOP | Path | Trigger |
|---|---|---|
| SOP-AIOPS-GBRAIN-001-write-discipline | `06-ai-ops/gbrain/sops/SOP-AIOPS-GBRAIN-001-write-discipline/flow.yaml` | Any role-initiated gbrain `put_page` (Tier B notify-first-then-batch per agent) |
| SOP-AIOPS-GBRAIN-002-promotion-workflow | `06-ai-ops/gbrain/sops/SOP-AIOPS-GBRAIN-002-promotion-workflow/flow.yaml` | Weekly: founder reviews gbrain mature pages for promotion to wiki/; Quarterly: founder + cofounder review wiki/ pages for 00-core/ amendment |
| SOP-AIOPS-GBRAIN-003-dream-cycle-monitoring | `06-ai-ops/gbrain/sops/SOP-AIOPS-GBRAIN-003-dream-cycle-monitoring/flow.yaml` | gbrain-maintainer nightly run completes → check ops.agent_runs success rate + alert if degraded |

### 4.4 Tier 1 yaml changes

See `draft/tier1-diffs.yaml` for exact diffs. 10 Sprint 1 PR-equivalent diffs covering:
- knowledge/memory-architecture.md (v1.0 → v1.1)
- governance/ROLES.md (+1 role, +brain_affinity field, +mcp grants)
- governance/HITL.md (append gbrain section)
- knowledge/economic-architecture.md (cost_bucket + hard cap)
- knowledge/manifest.yaml (gbrain MCP + sub-pillar)
- knowledge/mcp-roles.yaml (gbrain-maintainer)
- knowledge/mcp-tools.yaml (~70 entries)
- knowledge/cross-tier-invariants.yaml (~5-8 entries)
- knowledge/kpi-registry.yaml + knowledge/kpi-ownership.yaml (5 KPIs)
- knowledge/event-subscriptions.yaml (4 NEW event types)
- knowledge/state-machines.yaml (gbrain page lifecycle)
- knowledge/schedules.yaml (3 cron jobs)

### 4.5 Database migrations (Sprint 3)

See `draft/migrations/` for SQL files (drafts produced in Phase 7). Apply order:
1. `0XXXX_gbrain_cla_cross_links.sql` — 3 NEW NULL-able TEXT columns (`ops.capability_runs.gbrain_proposal_slug`, `ops.capability_phase_events.gbrain_meeting_slug`, `ops.decisions.gbrain_concept_slug`) + 3 partial indexes (~30 LOC)
2. `0XXXX_metrics_gbrain_cost_daily_view.sql` — NEW VIEW `metrics.gbrain_cost_daily` aggregating ops.cost_attributions (~15 LOC; optional but bundle for Sprint 3)

NOT needed (brainstorm error caught in domain-analysis):
- ~~consistency_checks enum migration~~ (existing `check_kind` constraint supports L1/L2/L3)
- ~~cost_attributions comment-only migration~~ (no DDL needed)

### 4.6 New integrations / MCP servers (Sprint 5)

| Integration | Type | Config |
|---|---|---|
| gbrain MCP (ritsu-brain Supabase project, Sydney) | stdio MCP via `gbrain serve` binary | `.mcp.json` gbrain entry with shell wrapper: sources `runtime/secrets/.env.local`, invokes `scripts/pre-budget-check.sh gbrain` (graceful-degrade Option B: exit 0 to allow MCP load even at cap; per-tool checks block WRITES), cd into `runtime/brain/`, exec `gbrain serve`. Env: `MCP_CALLER_ROLE`, `GBRAIN_COST_BUCKET=gbrain.${MCP_CALLER_ROLE}`. |

### 4.7 Frontend pages (if any)

None. Brain is internal substrate; no end-user surface.

### 4.8 New commands / agents (Sprint 1-2)

| Trigger | Type | File |
|---|---|---|
| `@gbrain-maintainer` (subagent + cron handler) | autonomous agent | `.claude/agents/gbrain-maintainer.md` (Phase 7 draft) |
| (no new slash command in v1.0; `/promote` deferred to Phase 3 future capability) | — | — |

### 4.9 New hooks (Sprint 4)

| Hook | Trigger | Action |
|---|---|---|
| post-stripe-customer-created | Stripe webhook event | `mcp__gbrain__put_page companies/<slug>` Tier B notify customer-lead. Email PII placeholder, founder fills in at confirmation. |
| post-tier1-rename | Tier 1 PR merge with file rename detected | Scan gbrain references for stale path, Tier B notify founder with diff |

### 4.10 New cron jobs (Sprint 4)

| Cron | Schedule | Handler |
|---|---|---|
| crm-to-gbrain-mirror | `0 2 * * *` (02:00 UTC daily) | ETL `public.companies` billing fields → gbrain `companies/<slug>` frontmatter. Idempotent. |
| gbrain-consistency-nightly | `0 3 * * *` (03:00 UTC daily) | Run L1+L2+L3 invariants on gbrain; write results to `ops.consistency_checks` |
| gbrain-dream-cycle | `0 4 * * *` (04:00 UTC daily) | gbrain-maintainer role runs native gbrain dream phases (dedup, citation fix, contradiction detection, synthesis). Cost-capped to $30/mo budget. |

## 5. Cost-bucket impact (Bài #7)

- New cost-bucket family: `gbrain.<role>.<op>` (e.g., `gbrain.customer-lead.put_page`, `gbrain.gbrain-maintainer.dream_cycle`)
- Shared buckets: `gbrain.shared.search` (cross-role search reads), `gbrain.shared.embedding` (text-embedding-3-small calls)
- Monthly budget cap (rollup across all gbrain.*): **$100 HARD CAP**
- Per-role allocations (sum ≤ $100):
  - founder: unlimited (no allocation; subject to global cap)
  - gbrain-maintainer: $30 (dream cycle)
  - customer-lead: $10
  - feedback-aggregator: $15
  - gtm-orchestrator: $10
  - cs-coach: $10
  - product-orchestrator: $15
  - eval-evo-orchestrator: $5
  - founder-coach: $3 (READ-only)
  - 16 other READ-capable roles: $3 each = $48
  - **Total allocated: ~$146** (exceeds $100 cap; founder's actual spend will throttle individual roles via shared budget)
  - Note: per-role caps are SOFT advisories; HARD cap is the global $100 enforced by pre-budget-check.sh wrapper
- Alert at 80% ($80), escalate at 100% ($100), hard-block at 150% ($150) per `knowledge/economic-architecture.md` Axis 2
- **Hard-cap Option B (graceful degrade)** at 100%: MCP load succeeds, READS continue, WRITES + dream cycle disabled

## 6. Acceptance criteria (per phase)

### Phase 7 (Implementation)
- [ ] All Sprint 1 Tier C PRs merged (10 PRs)
- [ ] Sprint 2: 2 new skills + 13 brain-relevant skill extensions merged; pnpm check clean per PR
- [ ] Sprint 3: 1-2 migrations applied to ritsu-ops without lock contention
- [ ] Sprint 4: 2 new hooks + 3 new cron jobs registered; cron jobs fire successfully on first run
- [ ] Sprint 5: `.mcp.json` gbrain entry loads; smoke test verifies founder can `mcp__gbrain__search` + write a test page
- [ ] Sprint 6: 2 NEW L2 validators added; SOP-CUSTOMER-023 extension PR merged; docs-engine walker exclude confirmed

### Phase 8 (Catalog)
- [ ] `knowledge/capability-registry.yaml` updated (placeholder → 1.0.0)
- [ ] `wiki/capabilities/gbrain-operational-brain/spec.md` promoted (this file)
- [ ] `wiki/capabilities/gbrain-operational-brain/retrospective-v1.0.0.md` written
- [ ] `pnpm check` clean

### Operating
- [ ] 6 WRITE-enabled roles each have ≥1 Tier B-gated write logged in ops.agent_runs (within 30 days of Sprint 6 promotion)
- [ ] 20 READ-capable roles each have ≥1 brain READ call logged in ops.agent_runs (within 30 days)
- [ ] gbrain `pages` table ≥ 500 entries by 2026-09-30
- [ ] Cost-bucket actuals: monthly gbrain.* sum ≤ $100 (rolling 30d)
- [ ] 0 chronic gbrain L1/L2/L3 invariant fails (>7 days unresolved) by 2026-09-30
- [ ] gbrain-maintainer dream cycle success rate ≥ 95% rolling 7-day

## 7. HITL points

| Phase | Tier | Action | Why |
|---|---|---|---|
| 4 (Options) | B | Founder picked Option A + Hard-cap B | ✓ DONE 2026-05-24 |
| 5 (Architecture, this spec) | C | Founder approves spec.md | Tier C ceremony per HITL.md — dry-run preview + approval window |
| 6 (Sprint planning) | B | Founder confirms sprint sequence + acceptance criteria | Tier B founder gate |
| 7 (per PR, 6 sprints × ~1-3 PRs each = ~10-15 PRs total) | B (most) + C (Sprint 1 PRs 1-5) | Founder reviews + merges | Per-PR diff review; Tier 1 governance PRs (Sprint 1 + Sprint 6 SOP-CUSTOMER-023 extension) are Tier C |
| 8 (Promotion) | A + 2× C | catalog-updater promotes; wiki/ promotion + registry update are Tier C PRs | Phase 8 standard |
| Operating (ongoing) | B (per write) + C (monthly promotion PRs) | gbrain WRITES are Tier B notify-first-then-batch; gbrain→wiki promotion is Tier C PR | Standard governance |

## 8. Rollback plan

If shipped + breaks:

1. **Code rollback:** `git revert` the merge commits for affected Sprint.
2. **Migration rollback:**
   - Migration A (cross-links): `ALTER TABLE … DROP COLUMN gbrain_proposal_slug` etc. Safe — NULL-able columns can be dropped without data loss (only loses cross-link metadata).
   - Migration B (cost view): `DROP VIEW metrics.gbrain_cost_daily`. Trivial.
3. **Tier 1 yaml rollback:** Revert via PR. All 10 Sprint 1 PRs are reversible (additions, no destructive edits).
4. **State machine rollback:** Mark `ops.capability_runs[7b991380-…].state = 'deprecated'`. Brain stays installed (it's a separate Supabase project; pause via Supabase dashboard if needed).
5. **.mcp.json rollback:** Revert the gbrain entry. MCP server stops loading; gbrain pages remain in DB (data preserved).
6. **gbrain DB rollback:** If a corrupt write contaminates brain, restore from Supabase Free's daily backup (7-day retention). Acceptable downtime: 1-2h.

**Reversibility rating:** 4/5 (mostly reversible; only the gbrain DB itself is hard-revert if data corruption — but Supabase backups mitigate)

## 9. CTO sanity-check (Phase 5)

(Synthesized from `refs/01-PLAN-consolidated.md` + `domain-analysis.md` @cto lens. Live `@cto` subagent invocation deferred — brainstorm covers; founder may request explicit `@cto review .archives/cla/gbrain-operational-brain/spec.md` during Tier C approval window.)

**CTO-1 (gap caught):** Brainstorm proposed extending `ops.consistency_checks` schema with a new enum migration. **Inspection shows the schema already supports L1/L2/L3 via existing `check_kind` CHECK constraint.** No migration needed — new invariants register via `knowledge/cross-tier-invariants.yaml` rows. Saves 1 migration; Sprint 3 budget recovered.

**CTO-2 (confirmed):** Cross-link columns on `ops.capability_runs`, `ops.capability_phase_events`, `ops.decisions` ARE needed. One migration (`0XXXX_gbrain_cla_cross_links.sql`) covers all three. Recommended: 3 separate NULL-able TEXT columns over single `jsonb gbrain_refs` for query simplicity.

**CTO-3 (install state contradiction):** Install record D6 claims `.mcp.json` gbrain entry was added 2026-05-23. **Current `.mcp.json` only has `supabase-ops`.** Sprint 5 adds gbrain entry from scratch with wrapper. NEW L2 validator (Sprint 6) prevents future drift.

**CTO-4 (dual-pool nuance):** gbrain dual-pool routing (transaction:6543 + session:5432 via `GBRAIN_DIRECT_DATABASE_URL` env var) must be documented in `06-ai-ops/gbrain/runbooks/runbook-gbrain-doctor-failure.md`. /check-drift extension covers env var presence.

**Overall:** PASS. Migration count REDUCED from brainstorm's 4 → 1-2. Architecture sound. Wrapper pattern matches supabase-ops precedent.

## 10. Muse panel synthesis (Phase 5)

(Synthesized from brainstorm corpus 14 files — 10 Q&A documents already invoked Muse-equivalent thinking across personas. Live `high-stakes-decision-panel` invocation deferred — founder may request explicit `muse:debate gbrain-shipping vs gbrain-delay` during Tier C approval window.)

- **cynic (synthesized from Q4 lifecycle rules + Q5 cross-store consistency thinking):** "What's the failure mode if gbrain doesn't pay off operationally? You'd have 70 MCP tools, a $30/mo dream-cycle role, 32 components landed, and ~12-18h founder setup — but if no one writes to it consistently, it becomes a dead substrate. **Mitigation:** Sprint 6 acceptance criteria requires ≥1 write per WRITE-enabled role within 30 days; if not met, Phase 6 sprint-planner reduces v1.0 scope to 3 roles minimum."
- **optimist (synthesized from Q3 v2 decentralized-read decision):** "This is the leverage move. Every existing CLA capability adds brain context for free with Sprint 2's per-skill `## Brain context` pattern. Six months from now, founder thinks once and the workforce has the answer."
- **ethical-compass (synthesized from Q4 lifecycle + trust-safety lens):** "PII handling clean: SOP-CUSTOMER-023 extension lands in v1.0 (not deferred); docs-engine walker excludes runtime/brain/; pre-Stripe-hook PII placeholder pattern protects against autonomous PII writes."
- **data-pragmatist (synthesized from Q10 cost model):** "Hard cap $100/mo with graceful degrade is the right knob. Per-role caps are advisory; global cap enforced. 5 NEW KPIs registered = measurable acceptance."
- **time-honest (synthesized from Q7 + brainstorm timeline):** "18 weeks calendar = honest. 6 sprints × 2-3 weeks each accounting for Tier C PR review cycles. Don't claim 4-6 weeks like the dev estimate — that's calendar fantasy."

**Consensus:** 5/5 — proceed with Option A + Hard-cap B as specified.

## 11. Tier C decision record

To be stored in `ops.decisions` row at Tier C approval. Pre-insert placeholder:

```yaml
decision_kind: capability_architecture
decision_summary: "Approve gbrain-operational-brain v1.0 spec.md: Option A (Brainstorm As-Is) + Hard-cap Option B (graceful degrade); 32 components in 6 sprints / ~18 weeks; cost cap $100/mo HARD"
decision_rationale: "Cross-cutting capability covering 6 WRITE-enabled roles, 20 READ-capable roles, 13 skill extensions, 2 new skills, 3 new SOPs, 1-2 migrations, 2 new hooks, 3 new cron jobs, new gbrain-maintainer role, new 06-ai-ops/gbrain sub-pillar. Option A matches 2026-09-30 deadline with slack; Option B hard-cap behavior consistent with economic-architecture Axis 2."
muse_personas_consulted: [cynic, optimist, ethical-compass, data-pragmatist, time-honest]  # synthesized from brainstorm
cto_review_status: pass_with_4_callouts
expires_at: null  # not time-limited
linked_capability_run_id: 7b991380-ae11-4b80-be56-6bc3ca6bbdf1
```

- **Approved by:** _pending founder approval at Tier C ceremony_
- **Approved at:** _pending_
- **Method:** _pending — Claude Code inline approval OR Telegram magic phrase OR GitHub PR `/founder-approved-irreversible` per HITL.md_

## 12. Next phase

**Phase 6: Sprint Planning** (`sprint-planner` skill) — Tier B. Breaks this spec into 2-week sprint windows with per-sprint acceptance criteria + Wave alignment. Writes `.archives/cla/gbrain-operational-brain/sprint-plan.md`. Founder approves via AskUserQuestion.

State after Phase 6: `architecting` → `planning`. Then Phase 7 (Implementation, multi-session per PR).

---

## Open items for Tier C approval

Before approving, founder should verify:

1. **Migration count** — accept @cto's reduction from brainstorm's 4 to 1-2? (Architect recommends YES; CTO-1 callout shows brainstorm error.)
2. **Per-role budget allocation** — accept the soft cap model ($146 nominal vs $100 hard)? Alternative is enforced per-role caps that would prevent any single role from exceeding its allocation even when global cap has headroom.
3. **Live @cto + Muse panel invocation** — accept that this spec used synthesis-from-brainstorm rather than fresh subagent invocations? If founder wants extra rigor, can request explicit live `@cto` review or `muse:debate` session before approving.
4. **Sprint 6 inclusions** — accept including SOP-CUSTOMER-023 extension + docs-engine walker exclude in v1.0 (not deferred to v1.1)?
5. **Seed batch (40-60 pages) timing** — accept that Phase 1 seed prep runs PARALLEL to Sprint 1-2 (4 weeks), not as separate workflow?

Default for all 5: YES (architect recommends). Founder approves with explicit YES or with named modifications.

---

*Generated by `capability-lifecycle/architect` skill via `/cla propose` orchestrator, 2026-05-24. Tier C — awaiting founder approval. Per /cla protocol: live @cto subagent + Muse panel invocations deferred to founder discretion (brainstorm corpus already contains equivalent thinking, citation: refs/01-PLAN-consolidated.md + refs/02-Q7-cla-integration-deep-dive.md + refs/03-component-audit.md). Founder may request explicit live invocations before approving by replying with `@cto review .archives/cla/gbrain-operational-brain/spec.md` or `/muse:debate ship-now-vs-add-rigor` and re-invoking /cla resume.*
