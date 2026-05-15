---
name: version-bumper
description: Pure semver helper. Computes next version from current version + sub-flow type. Rules deterministic per /cla evolution sub-flow contract. Used by Phase 8 of every update sub-flow except :deprecate. Reads current version from knowledge/capability-registry.yaml; writes next version back. No LLM, no side effects beyond the registry edit.
---

# Version Bumper (CLA v1.1)

## When to use

- Phase 8 of `/cla fix` — patch++
- Phase 8 of `/cla extend` — minor++
- Phase 8 of `/cla revise` — major++
- Phase 8 of `/cla tune` — patch++
- NOT used by `/cla deprecate` (state transition only; no version bump)

## Inputs

- `capability_id` — the capability being bumped
- `sub_flow` — `fix` | `extend` | `revise` | `tune`

## Process — DETERMINISTIC, no LLM

### Step 1 — Read current version

```yaml
# knowledge/capability-registry.yaml § capabilities[]
- id: <capability_id>
  version: "<current>"  # e.g., "1.0.0"
```

If `version` field missing (capability predates v1.1), default to `"1.0.0"`.

### Step 2 — Compute next version

Parse current as `<major>.<minor>.<patch>` per regex `^(\d+)\.(\d+)\.(\d+)$`.

| Sub-flow | Bump rule | Example |
|---|---|---|
| `fix` | patch++ | 1.0.0 → 1.0.1 |
| `tune` | patch++ | 1.0.0 → 1.0.1 |
| `extend` | minor++, patch=0 | 1.0.5 → 1.1.0 |
| `revise` | major++, minor=0, patch=0 | 1.5.3 → 2.0.0 |

### Step 3 — Idempotency check

Pre-bump query: is there already a NEW capability_runs row in state `'implementing'` for this capability_id with a different version than current?

- Yes → another bump in flight (concurrent scenario; should have been blocked by lock). Surface error `VersionBumpConflict`.
- No → safe to proceed.

### Step 4 — Write next version to registry

Edit `knowledge/capability-registry.yaml`. Update only the `version` field of the matching capability entry. Don't touch other fields (catalog-updater handles those separately).

Validate yaml after edit; if invalid, roll back.

### Step 5 — Write next version to ops.capability_runs

UPDATE `ops.capability_runs SET version = $next_version WHERE id = $current_run_id`.

(The current run row is the NEW row created at Phase 0 of the sub-flow; the bumped version is its identity for this update cycle.)

### Step 6 — Output

Returns `{old: <X.Y.Z>, new: <X.Y.Z>, changed: [registry, ops.capability_runs]}`.

No artifact file (this is a helper, not a Phase output). Caller (catalog-updater) records the version change in CHANGELOG.md.

## Outputs

- Updated `knowledge/capability-registry.yaml` (1 field changed)
- Updated `ops.capability_runs` (1 row, `version` column)
- No `ops.cost_attributions` (deterministic)
- No new file

## State transition

None directly. Caller advances state.

## HITL

A. Pure computation; no founder approval needed.

## Failure modes

| Symptom | Response |
|---|---|
| Current version not parseable | Surface `InvalidVersion` error with current value. Don't bump. Founder fixes registry. |
| `version` field missing in registry | Default to "1.0.0", proceed. (Backward compat for v1.0 capabilities.) |
| Idempotency conflict | `VersionBumpConflict` — another bump in flight. Should not happen if locks correct; if it does, surface for investigation. |
| Yaml invalid post-edit | Roll back. Surface `RegistryYamlBroken`. |
| Major version > 99 | Sanity check; surface `UnreasonableVersion` (defensive). |

## LLM mode awareness

N/A — pure deterministic. Same behavior in all modes.

## Cost estimate

- Anthropic API: $0
- Compute: < 1s
- Cost-bucket: not charged

## Examples

| Capability | Sub-flow | Current | Next |
|---|---|---|---|
| lead-acquisition | fix | 1.0.0 | 1.0.1 |
| lead-acquisition | tune | 1.0.1 | 1.0.2 |
| lead-acquisition | extend | 1.0.2 | 1.1.0 |
| lead-acquisition | extend | 1.1.0 | 1.2.0 |
| lead-acquisition | revise | 1.2.0 | 2.0.0 |

## Test fixtures

- `tests/cla/fixtures/version-bumper-fix.json` — 1.0.0 → 1.0.1
- `tests/cla/fixtures/version-bumper-extend.json` — 1.5.3 → 1.6.0 (patch reset)
- `tests/cla/fixtures/version-bumper-revise.json` — 1.5.3 → 2.0.0 (minor + patch reset)
- `tests/cla/fixtures/version-bumper-missing-version.json` — version field absent; defaults to 1.0.0; bumps to 1.0.1
- `tests/cla/fixtures/version-bumper-invalid-version.json` — current version "abc"; surface InvalidVersion error

---

**Used by:** `catalog-updater` skill (Phase 8) of all update sub-flows except `:deprecate`.
