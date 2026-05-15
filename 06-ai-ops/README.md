# 06-ai-ops — AI Operations Pillar

> The OS itself: SOP engine, MCP tooling, hooks, cost budgets, episodic memory, skill library, cross-tier consistency. This is the infrastructure that lets every other pillar's AI workforce actually run.

**Layer:** Evergreen
**Stage status:** DEEP (alive — partially built: `skills/`, `sops/`, `sop-engine/`)
**Pillar code:** AIOPS
**Owner role(s):** aiops-engineer, etl-runner, code-reviewer
**HITL baseline:** B (routine ETL = B; schema/runtime changes = C; secret-touching = D)

---

## Scope

This pillar owns the **AI workforce infrastructure**:

- **SOP engine** — how a `flow.yaml` becomes an actual SOP run (contract spec, runtime, validator)
- **Skill library** — composable reasoning units (`skills/`)
- **MCP tooling** — external system connections (Stripe, Telegram, GitHub, Supabase)
- **Hooks enforcement** — HITL gates, budget gates, role isolation
- **Cost budget architecture** — per-role caps, per-task soft caps, reconciliation
- **Episodic memory** — `ops.run_summaries` + `ops.corrections` pipeline (Strategy E)
- **Cross-tier consistency** — `check-drift` invariant runtime
- **Integrations** — Stripe/Telegram/GitHub/Supabase MCP wrappers (merged from former `08-integrations`)

This pillar does NOT own:
- Domain business logic (each functional pillar owns its own)
- The KPI definitions or dashboards → `10-metrics/`
- HITL POLICY (that's `governance/HITL.md`); AI-Ops owns the ENFORCEMENT mechanism

## Sub-pillars (DEEP build now)

```
06-ai-ops/
├── sop-engine/                       # NEW v1.0.1 — load-bearing
│   ├── SOP-AIOPS-003-sop-runtime-contract/  # Schema + validator (alive)
│   └── SOP-AIOPS-004-flow-yaml-smoke-test/  # CI gate (alive)
├── skill-library/                    # → existing skills/ dir
├── mcp/                              # MERGED v1.0.1 (was mcp-tooling + 08-integrations-as-mcp)
│   ├── server-management/
│   ├── per-pillar-server-grants/
│   ├── stripe-mcp-readonly/             # Folded from old 08-integrations
│   ├── github-mcp-scoped/
│   ├── telegram-mcp/
│   └── supabase-ops-mcp/
├── hooks-enforcement/                # → .claude/hooks/ implementations
├── cost-budget-architecture/         # Per knowledge/economic-architecture.md
├── episodic-memory-architecture/     # Per knowledge/memory-architecture.md
├── cross-tier-consistency/           # Extends current check-drift
└── workforce-personas/               # NEW v1.0.2 — C-suite façade layer (CEO/CTO/CGO/CPO Phase 1)
```

## Sub-pillar order (narrative)

1. **sop-engine** — load-bearing runtime contract + flow-yaml validator
2. **skill-library** — composable skills agents invoke (currently lives at `skills/`)
3. **mcp** — external system connections (merged from old mcp-tooling + integrations-as-mcp)
4. **hooks-enforcement** — HITL/budget/secret gates (implementations at `.claude/hooks/`)
5. **cost-budget-architecture** — per-role caps, per-task soft caps, reconciliation
6. **episodic-memory-architecture** — `ops.run_summaries` + `ops.corrections` pipeline
7. **cross-tier-consistency** — `check-drift` invariant runtime (locks conventions like sub-pillar numbering)
8. **workforce-personas** — C-suite façade layer (CEO/CTO/CGO/CPO Phase 1); binds personas to roles via `knowledge/workforce-personas.yaml`

**Existing assets preserved through rename:**
- `skills/` — composable skills agents invoke (`episodic-recall`, etc.)
- `sops/SOP-AIOPS-001-capability-lifecycle/` and `sops/SOP-AIOPS-002-cross-tier-consistency/` — pre-v1.0.1 SOPs; flagged for migration to flow-schema.yaml (TODOS.md)

## SOPs

Two namespaces coexist (transitional):
1. **Legacy flat namespace:** `sops/SOP-AIOPS-NNN-<slug>/` (existing, predates v1.0.1)
2. **Sub-pillar namespace:** `<sub-pillar>/SOP-AIOPS-NNN-<slug>/` (v1.0.1 going forward)

New SOPs go in the sub-pillar namespace. Legacy SOPs to be migrated per TODOS.md "Migrate 2 pre-contract SOPs to flow-schema.yaml conformance."

## Agents

- `aiops-engineer` (home) — builds + maintains the OS
- `etl-runner` (home) — sole holder of `SUPABASE_PRODUCT_READONLY_ETL_KEY`; runs scheduled ETL
- `code-reviewer` (home) — reviews PRs across repo, applied to OS changes

## KPIs owned

- SOP success rate (% of runs that complete vs fail)
- Agent-run cost trend (per role, per task-kind, per month)
- Recall hit rate (`ops.run_summaries` queries vs total recalls)
- Hook-block rate (with reasons — HITL block, budget block, secret-firewall block)
- Drift-check pass rate (`check-drift` runs over time)
- ETL freshness (`metrics.product_dau_snapshot` lag from product DB)

## Dependencies

- **Composes from:** none (foundation layer)
- **Composed by:** every other pillar (they all run on this infrastructure)

## Critical isolation

This pillar is the ONLY one that holds:
- `SUPABASE_PRODUCT_READONLY_ETL_KEY` (via `etl-runner` role)
- MCP server-management credentials
- Cross-pillar permission grants

This isolation is enforced via `.claude/hooks/secret-access-firewall` (planned, see `hooks-enforcement/`). Other roles request data through `metrics.*` tables populated by ETL; direct product DB access is forbidden.

## HITL baseline

- Routine ETL run: Tier A (logged, not gated)
- Schema migration: Tier C
- New MCP server added: Tier C
- New secret added: Tier D-Std
- Disabling any safety hook: Tier D-MAX

## Entry conditions

Already DEEP. Further sub-pillar splits happen organically (eg `08-evals` sub-pillar when LLM eval framework lands).
