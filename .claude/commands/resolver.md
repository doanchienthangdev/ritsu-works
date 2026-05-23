---
description: Lookup PLATFORM that maps natural-language triggers to AI workforce recipients (skills, commands, agents, MCP tools, knowledge, SOPs, capabilities, personas). Background-layer consumption primary; this command surfaces build/manage/introspect verbs. 5 subcommands. See wiki/capabilities/resolver/spec.md.
argument-hint: "<query|list|validate|sync|explain> [args] [flags]"
capability: resolver
version: 1.0.0
spec: wiki/capabilities/resolver/spec.md
---

# /resolver

Project-scoped command for ritsu-works. Front-end for capability `resolver` v1.0
(`knowledge/resolvers/`). This command is a thin orchestrator — engine logic
lives in `scripts/resolver/*.cjs` (CommonJS, no third-party deps).

The command:
- Parses argv (subcommand + flags),
- Dispatches to the corresponding skill or directly invokes
  `scripts/resolver/*.cjs`,
- Renders output (human-readable default; `--json` machine-readable).

## Subcommands (5 verbs)

| Invocation | Purpose | HITL |
|---|---|---|
| `/resolver query "<trigger>" [--semantic] [--plan] [--json] [--role=<r>] [--kind=<k>]` | Look up best match for trigger | A |
| `/resolver list [--kind=<k>] [--pillar=<p>] [--role=<r>] [--status=<s>] [--json]` | Enumerate routes (filtered) | A |
| `/resolver validate [<file>]` | Run 4 validators (schema, routes, trigger-uniqueness, coverage) | A |
| `/resolver sync [--dry-run] [--apply] [--auto-pr] [--kind=<k>]` | Auto-derive routes from recipient frontmatter | A/B/C |
| `/resolver explain "<trigger>" [--semantic]` | Verbose match trace (debugging) | A |

DROPPED per architect simplification (per spec §6.1):
- `/resolver add` wizard → founder edits `knowledge/resolvers/overrides/*.yaml` directly
- `/resolver test` → folded into `/resolver explain`

## Argv schema (per verb)

```
/resolver query "<trigger>" [flags]
  positional:
    <trigger>            required; trigger string to match
  flags:
    --semantic           opt-in semantic fallback (v1.1; v1.0 returns SemanticUnavailable)
    --plan               return composition.plan if route has one (CP-2)
    --json               machine-readable output
    --role=<r>           override caller role (default: $MCP_CALLER_ROLE)
    --kind=<k>           restrict to specific recipient kind

/resolver list [flags]
  flags:
    --kind=<k>           skill | command | agent | mcp | wiki | sop | capability | persona
    --pillar=<p>         0X-pillar name
    --role=<r>           filter by role_scope
    --status=<s>         active | stub | deprecated
    --json               machine-readable

/resolver validate [<file>]
  positional:
    <file>               optional; specific routes file. Omit for all.
  flags:
    --verbose            full output (default: terse pass/fail)

/resolver sync [flags]
  flags:
    --dry-run            (default per D-2) print proposed diff; write nothing
    --apply              write changes to local working tree
    --auto-pr            apply + commit to branch + open PR (Tier C)
    --kind=<k>           limit to specific recipient kind (skill | command | agent)

/resolver explain "<trigger>" [flags]
  Always verbose. Shows: tokenization, keyword hits per route, semantic
  scores (if --semantic), role filter outcome, final decision.
  flags:
    --semantic           include semantic match attempt (v1.1)
```

## How to invoke

Run the underlying Node scripts in the project root:

```bash
# query
node -e "const q = require('./scripts/resolver/query.cjs'); console.log(JSON.stringify(q.query({trigger: 'evolve a skill'}), null, 2))"

# explain
node -e "const q = require('./scripts/resolver/query.cjs'); console.log(JSON.stringify(q.explain({trigger: 'evolve'}), null, 2))"

# list — read knowledge/resolvers/routes/<kind>.yaml directly OR via loader
node -e "const l = require('./scripts/resolver/load-index.cjs'); const idx = l.loadIndex(); console.log(idx.routes.map(r => r.id).join('\\n'))"

# validate — run the 4 cross-tier validators directly
node scripts/cross-tier/validate-resolver-schema.cjs
node scripts/cross-tier/validate-resolver-routes.cjs
node scripts/cross-tier/validate-resolver-trigger-uniqueness.cjs
node scripts/cross-tier/validate-resolver-coverage.cjs

# sync
node scripts/resolver/sync.cjs --dry-run
node scripts/resolver/sync.cjs --apply
node scripts/resolver/sync.cjs --auto-pr
```

Convenience shortcuts in `package.json` (added Sprint 4):
- `pnpm resolver:query "<trigger>"`
- `pnpm resolver:list`
- `pnpm resolver:validate`
- `pnpm resolver:sync` (dry-run by default)
- `pnpm resolver:explain "<trigger>"`

## Output

### Default (human-readable)

```
$ /resolver query "evolve a skill"
[dispatch_silently] skill/evolve  conf=0.9  latency=2ms
  alternatives:
    skill/eval-evo/orchestrator  conf=0.9
    skill/eval-evo/score-skill   conf=0.9
  invocation: skill_tool(skill="evolve")
```

### --json

```json
{
  "trigger": "evolve a skill",
  "trigger_normalized": "evolve a skill",
  "decision": "dispatch_silently",
  "matched": {"route": {"id": "skill/evolve", ...}, "confidence": 0.9, ...},
  "alternatives": [...],
  "latency_ms": 2,
  "perf": {"load_ms": 1, "match_count": 3, "filtered_count": 3},
  ...
}
```

## When to invoke explicitly

This command's verbs are operator-facing (build/manage/introspect). The
PRIMARY consumption mode for resolver is BACKGROUND-LAYER (skills/agents
invoke `resolver-query` SKILL or `mcp__supabase-ops__resolver_query` MCP
tool transparently).

Use explicit `/resolver query` when:
- You want to see what would be dispatched without actually dispatching
- You're curating overrides and need to test a trigger
- You're debugging why an agent's lookup picked a particular recipient
- Onboarding (e.g. `/resolver list` to see all routes)

## Defensive notes

- `/resolver sync --auto-pr` opens a PR via `gh` CLI; requires `gh auth login` first
- Working tree must be clean (no unrelated changes) for `--auto-pr`
- Concurrent `/resolver sync --apply` blocked by lock file (.archives/resolver-sync.lock; 10min staleness)
- `/resolver query` is read-only; safe for any role
- `/resolver validate` runs the 4 validators as standalone scripts; same as `pnpm check`'s resolver section

## Pre-flight (run before any subcommand)

- Resolver capability state: `proposed` → `operating` after Phase 8 (currently `proposed` v1.0 in deployment)
- Drift: `pnpm check` should pass

## See also

- Spec: `wiki/capabilities/resolver/spec.md` (after Phase 8 promotion; pre-promotion at `.archives/cla/resolver/spec.md`)
- Routes: `knowledge/resolvers/`
- Engine: `scripts/resolver/`
- Validators: `scripts/cross-tier/validate-resolver-*.cjs`
- Audit: `ops.resolver_decisions` table
- Architect findings: `.archives/brainstorming/resolver/17-outside-voice.md`
