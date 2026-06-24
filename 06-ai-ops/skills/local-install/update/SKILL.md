---
name: local-install/update
description: |
  The update verb of local-install-platform — drives
  scripts/local-install/update.cjs to pull the latest ritsu-works from GitHub
  (git fetch + fast-forward, refusing over a dirty tree) and re-sync workspace
  dependencies, cross-platform. Invoked by /update-ritsu-works. Tier A.
---

# local-install/update

> The updater brain. Bring a local checkout to the latest ritsu-works safely,
> then re-sync deps.

## Sequence
1. **Dry-run (default):** `node scripts/local-install/update.cjs` — fetches
   (read-only), shows branch + upstream + incoming commits, no pull. Relay it.
2. **Dirty tree:** the engine refuses to pull and lists changes. It already
   ignores the regenerated `_shared/*.generated.ts` bundles, the skillopt vendor
   submodule, and lockfiles. Help the user commit/stash the rest, then continue.
3. **Apply:** `node scripts/local-install/update.cjs --apply` (+`--with-docs`).
   Fast-forwards (`git pull --ff-only`) and re-runs the install core (deps may
   have changed). Relay the `[i/N]` progress.
4. **Hand off:** "Updated — run /test-ritsu-works to verify."

## Flags
`--apply` (execute; default is dry-run) · `--with-docs` · `--json`.

## Self-heal
- non-fast-forward / conflict → help reconcile (`git pull --rebase`, resolve), re-run.
- workspace re-install fails → engine falls back frozen→loose; else `pnpm install` + diagnose.

## Safety
`--ff-only` never creates surprise merge commits. Never pulls over a dirty tree.
Tier A (reversible, local).

Engine: `scripts/local-install/update.cjs`. Contract: `SOP-AIOPS-016`. Umbrella: `local-install`.
