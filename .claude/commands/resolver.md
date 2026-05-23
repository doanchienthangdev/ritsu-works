---
description: Lookup PLATFORM v2 (LLM-Native Catalog) — find AI workforce recipients for natural-language triggers. v2 uses in-session ambient catalog (Mode A, preferred), explicit LLM query (Mode B, audit), or keyword fallback (Mode C, CRON only). Catalog auto-loaded via @knowledge/recipients/*.md.
argument-hint: "<query|list|validate|sync|explain> [args] [flags]"
capability: resolver-v2
version: 2.0.0
spec: .archives/cla/resolver-v2/spec.md
supersedes: resolver@1.0.0
---

# /resolver (v2)

Project-scoped command for ritsu-works. Front-end for capability `resolver-v2`
(`knowledge/recipients/`). This command is a thin orchestrator — engine logic
lives in `scripts/resolver-v2/*.cjs`.

**v2 key change vs v1:** Replaced keyword-matching engine with **LLM-native
catalog**. The ambient catalog (loaded via `@knowledge/recipients/*.md`
imports in `.claude/CLAUDE.md`) is the substrate; you reason naturally about
trigger→recipient instead of running search algorithms.

## Three modes

| Mode | When | Latency | Cost |
|---|---|---|---|
| **A — ambient** (preferred) | You're in Claude Code session; just reason naturally about catalog | 0ms | $0 |
| **B — explicit** (`/resolver query`) | Debug, audit, operator-facing | ~5-500ms | $0 in-session |
| **C — keyword fallback** | CRON/edge function (no LLM in loop) | <5ms | $0 |

## Subcommands

| Invocation | Purpose | HITL |
|---|---|---|
| `/resolver query "<trigger>" [--kind=<k>] [--json] [--mode=A\|B\|C]` | Find recipient + composition | A |
| `/resolver list [--kind=<k>] [--status=<s>] [--json]` | Enumerate catalog entries | A |
| `/resolver validate` | Run 4 v2 validators (schema, uniqueness, coverage, link-integrity) | A |
| `/resolver sync [--dry-run\|--apply\|--auto-pr] [--kind=<k>]` | Rebuild catalog from source frontmatter | A/B/C |
| `/resolver explain "<trigger>"` | Verbose match trace (which catalog files contributed, which IDs considered) | A |

## How to invoke (CLI direct)

```bash
# Mode B query — explicit LLM-mediated
node -e "const { loadCatalog } = require('./scripts/resolver-v2/catalog-loader.cjs'); console.log(loadCatalog().totalCount + ' recipients loaded')"

# Mode C fallback — keyword only
node -e "const { match } = require('./scripts/resolver-v2/keyword-fallback.cjs'); console.log(JSON.stringify(match({trigger: 'evolve a skill'}), null, 2))"

# Sync — rebuild catalog from frontmatter
node scripts/resolver-v2/sync.cjs --dry-run
node scripts/resolver-v2/sync.cjs --apply

# Validate (run all 4)
node scripts/cross-tier/validate-resolver-v2-schema.cjs
node scripts/cross-tier/validate-resolver-v2-uniqueness.cjs
node scripts/cross-tier/validate-resolver-v2-coverage.cjs
node scripts/cross-tier/validate-resolver-v2-link-integrity.cjs
```

## Mode A workflow (the common case)

You don't need to invoke this command. Just read the catalog naturally:

1. User asks: "Need to onboard the first 30 paying customers"
2. You scan ambient catalog (`@knowledge/recipients/skills.md`, etc.)
3. You identify:
   - **Primary:** `skill/customer-onboarding`
   - **Supporting:** `persona/cgo`, `mcp/supabase-ops__query`
4. You invoke directly: `Skill({skill: "customer-onboarding"})`
5. Optionally write audit row via `audit.cjs#buildRecord({mode: 'A', ...})`

## Mode B workflow (operator-facing)

```
$ /resolver query "onboard first 30 customers"

[Mode B — LLM-mediated]
Primary: skill/customer-onboarding
  Invoke: Skill({ skill: "customer-onboarding" })
  When: Onboarding a new paying customer (especially the first 30 high-touch
        Zoom onboardings)...

Supporting (composition):
  persona/cgo                  — Founder routing to GTM/customer ops
  mcp/supabase-ops__query      — Read customer profile state

Alternatives:
  skill/wedge-validation       — If still validating before onboarding
  command/cgo                  — If founder wants weekly customer session

Rationale: Customer onboarding is the primary action; CGO persona owns
GTM funnel orchestration; supabase-ops query needed for customer state.

Audit: run_id=<uuid> written to ops.resolver_decisions (mode='B')
```

## Mode C workflow (non-LLM consumer)

```bash
# Edge function / CRON job
node -e "
const { match } = require('./scripts/resolver-v2/keyword-fallback.cjs');
const r = match({ trigger: 'sync wiki' });
console.log(r.matched?.recipient.id || 'no match');
"
# → command/wiki
```

Recall acknowledged ~30% (keyword-only); use Mode A whenever possible.

## v1 → v2 migration

| v1 | v2 |
|---|---|
| `knowledge/resolvers/routes/*.yaml` | `knowledge/recipients/*.md` |
| `scripts/resolver/query.cjs` | DELETED (Mode A replaces) |
| `scripts/resolver/load-index.cjs` | DELETED |
| Keyword whole-word matching | LLM ambient context |
| 1832 LOC | ~600 LOC |
| Recall 30% | Recall ~80% (Mode A) |

## Defensive notes

- `/resolver sync --auto-pr` opens a PR via `gh` CLI; requires `gh auth login`
- Working tree must be clean for `--auto-pr`
- Concurrent `--apply` blocked by `.archives/resolver-v2-sync.lock` (10-min staleness)
- `/resolver query` Mode B writes audit row best-effort (failure non-blocking)
- Mode C is fallback; encourage migration to Mode A

## Pre-flight

- Capability state: `operating` v2.0.0 (Phase 8 promotion 2026-05-23)
- Drift: `pnpm check` should pass including 4 v2 resolver validators

## See also

- Spec: `.archives/cla/resolver-v2/spec.md`
- Catalog: `knowledge/recipients/*.md`
- Engine: `scripts/resolver-v2/`
- Validators: `scripts/cross-tier/validate-resolver-v2-*.cjs`
- Audit table: `ops.resolver_decisions` (+ migration 00035)
- v1 retrospective: `wiki/capabilities/resolver/retrospective.md`
- Consumer SKILL: `06-ai-ops/skills/resolver-query/SKILL.md`
