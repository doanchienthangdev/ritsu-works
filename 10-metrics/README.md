# 10-metrics — Metrics Pillar

> KPI registry + ownership map, dashboards, alerting rules, PMF instrumentation, experiment measurement. The consolidation layer that makes cross-pillar review possible. Without this, every pillar's KPIs scatter.

**Layer:** Evergreen
**Stage status:** DEEP
**Pillar code:** METRICS
**Owner role(s):** metrics-curator, alert-router, experiment-analyst
**HITL baseline:** B (routine dashboards = B; new alert rule = C)

---

## Scope

This pillar owns the **measurement layer**:

- **KPI registry** — canonical list of every KPI in the company, with formula, source, owner, target
- **PMF instrumentation** — Sean Ellis very-disappointed%, cohort retention, NPS, "100-paying-who-love" composite
- **Dashboards** — founder Monday dashboard (5 tiles single screen), cross-pillar weekly review, per-pillar health rollup
- **Alerting** — alert rule definitions, severity routing (P0 immediate Telegram → P1 daily digest), fatigue audit
- **Experiment measurement** — A/B test analysis, significance + lift calculation, stop-and-decide protocol
- **Revenue + cost views** — MRR/ARR/CAC/LTV + AI-Ops cost trends (read-only views over Finance + AI-Ops)

This pillar does NOT own:
- The STORAGE substrate (`ops.kpi_snapshots`, `ops.alerts`, `metrics.product_dau_snapshot`) → those tables live in AI-Ops infrastructure (see `supabase/migrations/`)
- The DOMAIN MEANING of metrics (each functional pillar owns its business interpretation)
- Decisions BASED on metrics (those happen in the owning pillar)

Metrics owns: definitions + dashboards + alerting routing. Like a small data team sitting between AI-Ops storage and operational pillars.

## Sub-pillars (DEEP build now)

```
10-metrics/
├── 01-kpi-registry/                         # Canonical metrics list + ownership
│   ├── sops/SOP-METRICS-001-kpi-definition-template/
│   ├── sops/SOP-METRICS-002-kpi-ownership-mapping/      # knowledge/kpi-ownership.yaml
│   └── sops/SOP-METRICS-003-kpi-deprecation-protocol/
├── 02-pmf-instrumentation/                  # The PMF numbers
│   ├── sops/SOP-METRICS-004-sean-ellis-very-disappointed-tracking/
│   ├── sops/SOP-METRICS-005-cohort-retention-week-1-week-4/
│   ├── sops/SOP-METRICS-006-nps-collection-and-aggregation/
│   └── sops/SOP-METRICS-007-100-paying-who-love-composite-metric/   # The singular tile
├── 03-dashboards/                           # Founder + cross-pillar views
│   ├── sops/SOP-METRICS-008-founder-monday-dashboard/   # 5-tile screen
│   ├── sops/SOP-METRICS-009-cross-pillar-weekly-review-board/
│   └── sops/SOP-METRICS-010-pillar-health-rollup/       # G/Y/R status per pillar
├── 04-alerting/                             # Rule definitions + routing
│   ├── sops/SOP-METRICS-011-alert-rule-yaml-format/     # leverages knowledge/alert-rules.yaml
│   ├── sops/SOP-METRICS-012-alert-routing-by-severity/  # P0 → Telegram; P1 → daily digest
│   └── sops/SOP-METRICS-013-alert-fatigue-audit/        # Monthly review
├── 05-experiment-measurement/               # A/B test rigor
│   ├── sops/SOP-METRICS-014-experiment-design-checklist/
│   ├── sops/SOP-METRICS-015-significance-and-lift-calculation/
│   └── sops/SOP-METRICS-016-experiment-stop-and-decide-protocol/  # ↔ 04-product/05-ab-test-discipline
└── 06-revenue-and-cost-views/               # Read-only views over Finance + AI-Ops
    ├── sops/SOP-METRICS-017-mrr-growth-rate-weekly/
    ├── sops/SOP-METRICS-018-blended-cac-ltv-by-channel/  # ↔ 03-gtm/03-distribution-engine
    ├── sops/SOP-METRICS-019-ai-ops-cost-per-task-trend/  # ↔ 06-ai-ops/05-cost-budget-architecture
    └── sops/SOP-METRICS-020-runway-projection-monthly/    # ↔ 08-finance
```

## SOPs

`sops/SOP-METRICS-NNN-<slug>/` — 20 SOPs scaffolded. Phase 5 implements:
- `SOP-METRICS-007-100-paying-who-love-composite-metric` — the singular PMF tile
- `SOP-METRICS-008-founder-monday-dashboard` — the screen displaying the composite tile + 4 supporting tiles

## Agents

- `metrics-curator` (home) — owns KPI registry, weekly dashboard refresh
- `alert-router` (under `04-alerting`) — receives `ops.alerts` rows, routes per rules
- `experiment-analyst` (under `05-experiment-measurement`) — A/B test analysis on demand

## KPIs owned (meta — KPIs about KPIs)

- KPI freshness (% of registered KPIs updated weekly)
- Dashboard load time
- Alert P0 → action latency
- Alert fatigue ratio (alerts dismissed without action / total alerts)
- Experiment turnaround time (test launched → decision made)

## Dependencies

- **Composes from:** `06-ai-ops/05-cost-budget-architecture/` (cost trend feed), `08-finance/` (MRR + Stripe data), Supabase tables `ops.kpi_snapshots`, `ops.alerts`, `metrics.product_dau_snapshot`
- **Composed by:** every operational pillar reads metrics for decisions; especially `03-gtm/05-pmf-instrumentation/` and `09-founder/04-weekly-review/`

## Critical PG gate

`SOP-METRICS-007-100-paying-who-love-composite-metric` is the **singular tile** — one number combining paying count + retention + NPS into a single PMF-progress score. Surfaces in the founder Monday dashboard (`SOP-METRICS-008`). **If this number doesn't move, nothing else matters.**

Inspired by PG's "weekly growth rate is the metric" — for Ritsu's stage, "100-paying-who-love progress %" is the equivalent.

## HITL baseline

- Routine dashboard refresh: Tier A
- New KPI registered: Tier B
- New alert rule (any severity): Tier C
- Alert routing change (eg moving P0 from Telegram to email): Tier C
- KPI deprecation (removing from registry): Tier C
- New SOP added: Tier C

## Entry conditions

Already DEEP. Future sub-pillars (post-1000-paying):
- `07-business-intelligence/` — deeper BI dashboards for board reporting
- `08-data-warehouse/` — if Supabase strain on direct queries
