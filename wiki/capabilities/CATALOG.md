# Capability Catalog

> Index of all capabilities deployed via `/cla` (SOP-AIOPS-001, Bài #20).
> Auto-updated by Phase 8 (`catalog-updater` skill) when a capability reaches
> `operating` state.
>
> The canonical source of truth is `knowledge/capability-registry.yaml`. This
> catalog is the human-readable view that links into each capability's
> promoted spec + retrospective.

**Last updated:** 2026-05-15
**Total capabilities (operating):** 2
**Total capabilities (any state):** 2

---

## Operating

| ID | Name | Version | Pillar | Deployed | Spec | Retrospective |
|---|---|---|---|---|---|---|
| `capability-lifecycle-architecture` | Capability Lifecycle Architecture (Bài #20) | 1.0.0 | 06-ai-ops | 2026-05-04 | [Bài #20 DRAFT](../../knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md) | (meta — bootstrap) |
| `cla-update-mechanism` | CLA Update Sub-flows (v1.1) | 1.0.0 | 06-ai-ops | 2026-05-15 | [spec.md](cla-update-mechanism/spec.md) | [retrospective.md](cla-update-mechanism/retrospective.md) |

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
