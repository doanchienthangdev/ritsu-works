# /docs

Project-scoped command for ritsu-works. Front-end for the `docs-engine` capability.
Thin orchestrator — phase logic lives in skills under `06-ai-ops/skills/docs-engine/`.
Mirrors `/wiki` ergonomics 1:1 (per @cto Phase 2 lens).

This command operates the live Fumadocs documentation site at `docs/` (Next.js
subproject deployed on Vercel Hobby). The 9 source adapters convert
Tier 1 + `.claude/` runtime files into MDX pages. The site is read-only public
with build-time secret redaction (per founder Phase 1 Q4 answer).

**Audience:** founder + cofounder + AI workforce (per Phase 1 Q1).
**Vietnamese-first content;** English code identifiers + frontmatter keys.

## Subcommands

| Invocation | Purpose | HITL | Persistence |
|---|---|---|---|
| `/docs` | Show menu + current state (page count, drift status, last sync, last publish) | A | read-only |
| `/docs scaffold` | Idempotent scaffold of `docs/` Next.js + Fumadocs subproject. First-time only. | A | git changes under `docs/` |
| `/docs sync [--area=<a>] [--dry-run] [--force]` | Walk corpus → generate MDX. `--area` limits scope (commands\|skills\|agents\|hooks\|charter\|governance\|pillars\|sops\|tier1\|all). `--dry-run` previews diff without writing. `--force` bypasses source_hash dedup. | A (B if estimated cost > cap OR > 50% pages changed) | git changes under `docs/content/`; ops.kpi_snapshots |
| `/docs check` | Drift detection (source_hash mismatch + missing/orphan pages). Deterministic; no LLM. Records `docs_drift_count` KPI. | A | INSERT ops.kpi_snapshots; emits ritsu.docs.drift_detected if > 0 |
| `/docs check --tutorials` | Subset check: every tutorial's `tutorial_last_verified_at` must be < 60d old. (CPO mod, monthly via SOP-FOUNDER-013.) | A | Reports stale tutorial list |
| `/docs publish` | Trigger Vercel production deploy from latest `main`. Founder confirms. | **B** | INSERT ops.events ritsu.docs.published |
| `/docs nav` | Edit `docs/content/meta.json` (sidebar order, groups). Interactive prompts for pillar grouping. | A | git change under `docs/content/meta.json` |
| `/docs update <area>` | Refresh one content area (alias for `/docs sync --area=<a>`). | A | per-area changes |
| `/docs accept-mine <path>` | When `/docs sync` reports a 3-way diff conflict on `<path>`, this preserves the hand-edit and skips regen for that file. | B | flag in MDX frontmatter |
| `/docs status` | Show sync state, last drift report, page counts, Vercel deploy status. | A | read-only |
| `/docs list [--area=<a>]` | List all generated MDX pages by area. | A | read-only |

## Workflow

### `/docs scaffold` (first-time scaffold)

1. Verify `docs/` does not exist (or is empty).
2. Run `npx create-fumadocs-app docs/ --template next-mdx --lang vi` (or equivalent).
3. Customize `docs/source.config.ts` to pull from ritsu-works file system via the 9 adapter content sources.
4. Add `docs/lint-secrets.cjs` (3-layer fail-loud redactor).
5. Add `docs/app/api/raw/[...slug]/route.ts` (AI-runtime raw-MDX endpoint).
6. Add `docs/.vercelignore` to skip irrelevant directories.
7. First sync: run `/docs sync --area=all` automatically.
8. Emit `ritsu.docs.built` event.

**Cost:** ~$0.50 LLM (mostly the source.config.ts boilerplate generation). One-time per repo.

### `/docs sync` (the workhorse)

Dispatches to skill `docs-engine/sync` which orchestrates SOP-AIOPS-003 step 1-10:

1. **Drift gate** — `pnpm check`. Abort if not clean.
2. **Walker** — per Phase 1 Q3 scope (~215 sources).
3. **Secret redaction layer 1** (walker-exclude check).
4. **Adapter dispatch** — 9 adapters render per source kind.
5. **Secret redaction layer 2** (MDX regex scrub).
6. **3-way diff** for any page with `<!-- generated-by -->` marker (CTO mod #1) — prevents overwriting hand-edits.
7. **Write MDX** to `docs/content/`.
8. **Coverage validator** — `pnpm check` (which now runs `validate-docs-coverage.cjs`).
9. **Emit events** — `ritsu.docs.synced` + maybe `ritsu.docs.drift_detected`.
10. **KPI snapshot** — `docs_drift_count`.

**Cost:** ~$0.40-1.00 per full sync (215 pages × adapter cost ÷ batching). Per-task-kind cap: $1.

### `/docs check`

Deterministic — no LLM. Compares filesystem inventory of walker scope against `docs/content/` MDX (via `source_path` frontmatter). Reports:
- Missing pages (source exists but no MDX) → `docs_drift_count` ++
- Orphan pages (MDX with no source) → `docs_drift_count` ++
- Stale source_hash (source changed but MDX not regenerated) → `docs_drift_count` ++

Exit non-zero if `docs_drift_count > 0`. Used by `.github/workflows/docs-check.yml` as soft PR gate (v1.0); hard gate in v1.1.

### `/docs publish` (Tier B)

1. Verify `docs_drift_count == 0`.
2. Verify `pnpm check` clean on `main`.
3. Show preview URL of latest commit.
4. **AskUserQuestion**: confirm publish to production Vercel.
5. Trigger Vercel production deploy (via Vercel CLI or webhook).
6. Wait for deploy to succeed (poll up to 120s).
7. Emit `ritsu.docs.published` with Vercel deploy ID.

## State persistence

Every `/docs` invocation writes:
- `ops.agent_runs` row (with `cost_bucket = 'ai-ops-docs'`)
- `ops.events` row per emitted event (`ritsu.docs.*`)
- `ops.kpi_snapshots` row for `docs_drift_count` (sync + check verbs)
- `ops.cost_attributions` row per LLM call

## Drift gates

| Verb | Gate | What fails the gate |
|---|---|---|
| `scaffold` | `pnpm check` before AND after | Any L1 / critical L2 drift |
| `sync` | `pnpm check` before AND after | Same |
| `check` | itself | Surfaces drift to KPI; doesn't fail |
| `publish` | requires drift_count == 0 + `pnpm check` clean | Both must pass |

## HITL discipline

Per verb:
- **A** — sync, check, nav, update, status, list, scaffold (after first time)
- **B** — publish, accept-mine, sync if estimated cost > cap or > 50% changed pages

`/docs publish` Tier B uses `AskUserQuestion` with preview URL — founder visually confirms before production deploy.

## Defensive notes

- `docs/` is a Next.js subproject — has its OWN `package.json`, distinct from root.
- Vercel `rootDirectory=docs` keeps the operating repo's identity unpolluted.
- The 3-way diff on regen (step 6) is mandatory — without it, founder hand-edits get silently overwritten on next sync (Week-4 biter per @cto Phase 2 lens).
- Secret redaction is fail-loud across 3 layers — never scrub silently.
- `governance/SECRETS.md` and `runtime/secrets/**` are EXCLUDED at layer 1 (walker scope) — they NEVER enter the MDX corpus, regardless of regex matches.
- `00-charter/founder-profile.md` is in the walker exclude list (PII concern per Phase 3).
- Vietnamese as primary content language; Fumadocs `defaultLanguage: 'vi'` + `hideLocale: 'default-locale'`.

## See also

- Skills: `06-ai-ops/skills/docs-engine/` (16 sub-skills: 7 verbs + 9 adapters)
- SOP: `06-ai-ops/sops/SOP-AIOPS-003-docs-sync/flow.yaml`
- Capability registry: `knowledge/capability-registry.yaml` (search `id: docs-engine`)
- Spec: `wiki/capabilities/docs-engine/spec.md` (after Phase 8 promotion)
- Sibling: `.claude/commands/wiki.md` (closest sibling; pattern source)
- Cross-tier invariants: `docs-page-has-source` (L1), `docs-source-has-page` (L2)
