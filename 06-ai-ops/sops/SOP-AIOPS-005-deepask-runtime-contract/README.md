# SOP-AIOPS-005 — /deepask Runtime Contract

> The runtime contract for the `/deepask` supercommand (capability `deepask` v1.0).
> Authoritative flow: [`flow.yaml`](flow.yaml). Front-ends: `.claude/commands/deepask.md`
> + `06-ai-ops/skills/deepask/orchestrator/SKILL.md`.

## What this SOP governs

Every `/deepask "<q>"` invocation runs once through the **5-stage loop**:

1. **Stage 0 — budget pre-flight** — the resolver-budget accountant (`scripts/deepask/breaker-budget.cjs`) reserves the critic follow-up and degrades to an honest PARTIAL instead of a fabricated `no_coverage`.
2. **decompose** → MECE sub-needs, IA-type tagged.
3. **resolve** → one `ResolverPlan v1` per sub-need from `resolver-plan` (deepask has **zero routing of its own**).
4. **execute** → read `content_axis`; run `capability_axis` gated (`capability-gate.cjs`: auto-run Tier-A / surface Tier-B+ / refuse D-MAX); delegate the web leg to `deep-research`.
5. **synthesize** → Pyramid, **zero uncited claims** (`citation-audit.cjs`), authority-ranked, conflict-flagged, freshness-tagged.
6. **completeness-critic** → coverage matrix + live-probe → **COMPLETE | PARTIAL-with-honest-gaps**.
7. **format** → IR → artifact (`deepask/format` dispatch table; `format-select.cjs` smartauto) → `.archives/deepask/<date>-<slug>/`.
8. **observe** → `ops.deepask_runs` + `ops.deepask_coverage`.

## HITL

Tier **A** (read + synthesize). The only non-A surface is a **Tier-B+ capability leg**, which is **surfaced** for founder approval and **never auto-run**; a **D-MAX** capability is **refused** (deepask is not a create/modify surface).

## Always-on guards
Product-Supabase firewall (`metrics.*` only) · gbrain $100/mo cap · resolver 20-find/4h breaker · subscription billing · `--dry-run` = plan-only (still consumes breaker budget, labeled honestly).

## KPIs
`deepask.complete_verdict_rate` · `deepask.uncited_claim_rate` (target 0) · `deepask.breaker_trip_rate` (see `knowledge/kpi-registry.yaml`).
