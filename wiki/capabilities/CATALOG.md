# Capability Catalog

> Index of all capabilities deployed via `/cla` (SOP-AIOPS-001, Bài #20).
> Auto-updated by Phase 8 (`catalog-updater` skill) when a capability reaches
> `operating` state.
>
> The canonical source of truth is `knowledge/capability-registry.yaml`. This
> catalog is the human-readable view that links into each capability's
> promoted spec + retrospective.

**Last updated:** 2026-05-18
**Total capabilities (operating):** 3
**Total capabilities (any state):** 3 (1 with v3.0 pending promotion)

---

## Operating

| ID | Name | Version | Pillar | Deployed | Spec | Retrospective |
|---|---|---|---|---|---|---|
| `capability-lifecycle-architecture` | Capability Lifecycle Architecture (Bài #20) | 1.0.0 | 06-ai-ops | 2026-05-04 | [Bài #20 DRAFT](../../knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md) | (meta — bootstrap) |
| `cla-update-mechanism` | CLA Update Sub-flows (v1.1) | 1.0.0 | 06-ai-ops | 2026-05-15 | [spec.md](cla-update-mechanism/spec.md) | [retrospective.md](cla-update-mechanism/retrospective.md) |
| `wiki-sync-from-refs` | Wiki Sync from External Refs (v2.0 Cách C folder + chapter splitter) | 2.0.0 | 06-ai-ops | 2026-05-17 | [spec-v2.md](wiki-sync-from-refs/spec-v2.md) | [retrospective-v2.0.0.md](wiki-sync-from-refs/retrospective-v2.0.0.md) |

## Implementing (PR review pending)

| ID | Target version | Pillar | Status | Spec (target) | Retro (target) |
|---|---|---|---|---|---|
| `wiki-sync-from-refs` | **3.0.0** | 06-ai-ops | Code complete on `feat/wiki-sync-v3-distill-extract` branch (5 commits). **Pending founder action**: (a) review + merge PR, (b) apply migration 00031 via `supabase db push`, (c) run acceptance corpus (`/wiki sync tests/wiki-sync/fixtures/growth-playbook-fixture.md`). On merge + apply, state transitions to `operating` and v2.0 row in ops moves to `superseded`. | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v3.0.0.md](wiki-sync-from-refs/retrospective-v3.0.0.md) |

### Wiki-sync version history (lineage chain)

| Version | State | Operating range | Spec | Retrospective |
|---|---|---|---|---|
| 1.0.0 | superseded | 2026-05-16 → 2026-05-17 | (never promoted) | (never promoted) |
| 2.0.0 | **operating** (current) | 2026-05-17 → present | [spec-v2.md](wiki-sync-from-refs/spec-v2.md) | [retrospective-v2.0.0.md](wiki-sync-from-refs/retrospective-v2.0.0.md) |
| 3.0.0 | **implementing — PR review pending** | (will start when PR merges + migration applies) | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v3.0.0.md](wiki-sync-from-refs/retrospective-v3.0.0.md) |

## Implementing / Architecting / Analyzing

(none yet)

## Deprecated / Superseded

(none yet)

---

## How this catalog is maintained

- **Phase 8 of `/cla`** (the `catalog-updater` skill) appends a new row when a
  capability transitions `deployed → operating`.
- **Manual updates** to add notes are fine — but state changes MUST come
  from `/cla` so `ops.capability_runs` and `knowledge/capability-registry.yaml`
  stay consistent.
- **Source of truth:** `knowledge/capability-registry.yaml` (Tier 1, schema-validated).
- **Naming:** the file is `CATALOG.md` (not `_CATALOG.md`) so it commits — per
  the wiki/ workspace plane convention, leading-underscore files stay local.

## Related

- Front-end: `.claude/commands/cla.md` (`/cla` command)
- SOP: `06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/`
- Skills: `06-ai-ops/skills/capability-lifecycle/`
- Playbook: `knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`
- Routing: `knowledge/cla-routing-keywords.yaml`
