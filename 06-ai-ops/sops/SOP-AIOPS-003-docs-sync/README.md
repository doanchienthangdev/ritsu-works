# SOP-AIOPS-003 — Docs Sync Pipeline

**Status:** Scaffold (Phase 7 Sprint 1 PR-2 — skill markdown + SOP + command stubs only; live walker code lands in PR-3)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Capability:** `docs-engine`
**Sibling SOP:** `SOP-INGEST-001-wiki-sync` (external → wiki/); this one is internal → docs/.

## Purpose

Drive the `/docs` lifecycle (build/sync/check/publish/nav/update) for the live Fumadocs documentation site at `docs/`. Walks Tier 1 + `.claude/` runtime sources via 9 adapters, generates MDX into `docs/content/`, runs 3-layer fail-loud secret redaction, detects drift via `source_hash`, emits events + KPI snapshots.

**Without this SOP:** docs would be a one-off hand-write that rots within weeks as the codebase evolves.

**With this SOP:** docs and codebase stay in sync — every merge to `main` touching documented sources triggers a Vercel preview deploy within 5 minutes; drift is detected nightly via `docs-drift-nightly` cron (deferred to PR-3).

## How it works (10 steps; see flow.yaml)

```
1. drift_preflight     — pnpm check; abort if not clean
2. walk_sources        — walker scope per Phase 1 Q3 (~215 sources)
3. secret_redact_l1    — walker-exclude check (governance/SECRETS, founder-profile, runtime/secrets)
4. adapter_dispatch    — 9 adapters per source-kind (skill/agent/hook/command/charter/governance/pillar-readme/sop-flow/tier1-yaml)
5. secret_redact_l2    — MDX regex scrub (magic phrases, project_refs, API keys)
6. three_way_diff      — CTO mod #1: prevent overwriting hand-edits on <!-- generated-by --> marked pages
7. write_mdx           — flush new MDX to docs/content/
8. run_pnpm_check      — final drift validator (scripts/validate-docs-coverage.cjs)
9. emit_events         — ritsu.docs.synced / drift_detected / built / published
10. record_kpi_snapshot — docs_drift_count → ops.kpi_snapshots
```

## Invocation

Triggered by:
- `/docs <verb>` command (founder-initiated; HITL Tier A; `publish` is Tier B)
- `docs-drift-nightly` cron (deferred to Sprint 1 PR-3; needs `docs-engine/check` skill in minion-worker SKILL_REGISTRY first per L2 validator)
- `ritsu.docs.*` events (deferred subscribers v1.1)

## HITL tier

Tier A by default. Escalates to Tier B when:
- `verb == 'publish'` (Vercel production deploy — founder confirms preview URL)
- estimated_cost_usd > per_task_kind_cap (`docs-sync-full-walk` ≤ $1)
- `docs_drift_count > 10` sustained 24h

## Cost-bucket

`ai-ops-docs` (NEW; registered in `knowledge/capability-registry.yaml`).

## Cross-Bài-toán integration

Bài #5 (multi-agent skills), #7 (cost-bucket), #8 (cron schedule), #9 (this SOP), #10 (KPI), #11 (events), #15 (Tier C architecture decision), #17 (vercel-docs surface), #19 (founder time), #20 (CLA-produced).

## References

- Capability spec: `wiki/capabilities/docs-engine/spec.md` (after Phase 8 promotion; currently at `.archives/cla/docs-engine/spec.md`)
- Command: `.claude/commands/docs.md`
- Skills: `06-ai-ops/skills/docs-engine/` (16 sub-skills: umbrella + 6 verbs + 9 adapters)
- Cross-tier invariants: `docs-page-has-source` (L1), `docs-source-has-page` (L2) — both `status: deferred` until PR-3 ships the walker validator
- Sibling: `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`

## Acceptance (Phase 7 Sprint 1)

- [ ] PR-2 merged: 16 SKILL.md + SOP flow.yaml + `/docs` command in canonical paths.
- [ ] `pnpm check` clean.
- [ ] PR-3 merged: Next.js + Fumadocs scaffold + walker + 9 adapter implementations + secret redactor + raw-MDX endpoint + `scripts/validate-docs-coverage.cjs` + `docs-drift-nightly` cron (with `docs-engine/check` in SKILL_REGISTRY).
- [ ] First `/docs sync --area=all` generates ≥ 200 MDX pages.
- [ ] `/docs check` returns clean.
