---
description: |
  Update this local ritsu-works checkout to the latest from GitHub and re-sync
  dependencies, cross-platform (macOS / Windows / Linux). Fetches, fast-forwards
  the current branch (refuses over a dirty tree), re-installs workspace deps,
  then points you to /test-ritsu-works. Capability local-install-platform v0.1.
argument-hint: "[--with-docs] [--dry-run]"
---

# /update-ritsu-works

You (Claude) drive the updater. Pull the latest ritsu-works safely and re-sync
deps, **showing progress**.

> **Firewall rule:** invoke only via `node scripts/local-install/update.cjs`.
> Never type the database-CLI token in a Bash command.

## Tier
**A** — `git pull --ff-only` (reversible, local) + local dep re-install. No
external action, no money, no Product Supabase.

## Flow

1. **Dry-run first (default safety):**
   ```
   node scripts/local-install/update.cjs
   ```
   This fetches (read-only), shows the current branch + upstream, and lists the
   incoming commits — without pulling. Relay it to the user.

2. **If the working tree is dirty:** the engine reports it and refuses to pull.
   Help the user commit or stash their changes first (the engine already ignores
   the regenerated `_shared/*.generated.ts` bundles, the skillopt vendor
   submodule, and lockfiles). Then continue.

3. **Apply the update:**
   ```
   node scripts/local-install/update.cjs --apply
   ```
   (add `--with-docs` to also refresh docs deps). This fast-forwards the branch
   and then re-runs the install core (workspace deps may have changed, plus
   scaffold + husky + index refresh). Relay the `[i/N]` progress.

4. **Hand off:**
   > ✅ Updated to the latest ritsu-works. Run **`/test-ritsu-works`** to verify
   > the system still passes end-to-end.

## Self-heal
- `git pull` fails (non-fast-forward / conflict) → the engine prints guidance;
  help the user reconcile (`git pull --rebase`, resolve conflicts), then re-run.
- A workspace re-install fails → the engine already falls back from frozen to a
  loose install; if it still fails, `pnpm install` in that workspace + diagnose.

## Engine reference
- `scripts/local-install/update.cjs --apply [--with-docs] [--json]`
- Contract: `06-ai-ops/sops/SOP-AIOPS-016-local-install-runtime-contract/flow.yaml`
