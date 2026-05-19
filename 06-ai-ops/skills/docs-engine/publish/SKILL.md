---
name: docs-engine/publish
description: |
  Trigger Vercel production deploy from latest `main`. Tier B HITL (founder
  visually confirms preview URL before production). Wraps the Vercel CLI or
  webhook trigger; emits `ritsu.docs.published` event with deploy ID.
---

# docs-engine/publish

## When to use

- `/docs publish` command (founder-initiated production deploy).

## Inputs

- (None — uses `main` HEAD.)

## Process

1. Verify `docs_drift_count == 0` (query latest `ops.kpi_snapshots`).
2. Verify `pnpm check` clean on current HEAD.
3. Fetch latest Vercel preview URL for HEAD.
4. **AskUserQuestion** (Tier B): show preview URL; founder confirms publish.
5. Trigger Vercel production deploy (CLI `vercel --prod` or webhook).
6. Poll deploy status up to 120s.
7. Emit `ritsu.docs.published` with `{deploy_id, deploy_url, status}`.

## Outputs

- `ops.events` row `ritsu.docs.published`.
- `ops.hitl_runs` row (Tier B confirmation).

## HITL

**Tier B.** Founder confirms via `AskUserQuestion` with preview URL.

## Failure modes

- Drift present → refuse to publish; surface drift report.
- Vercel deploy times out → emit event with `status: timeout`; founder investigates manually.
- Vercel API auth fails → surface; check `VERCEL_TOKEN` env (governance/SECRETS.md).

## Cost estimate

$0 LLM. Per-task-kind cap: `docs-publish` ≤ $0.10 (essentially just the AskUserQuestion overhead).

## See also

- Vercel CLI docs: https://vercel.com/docs/cli
- Command: `.claude/commands/docs.md` (`/docs publish`)
