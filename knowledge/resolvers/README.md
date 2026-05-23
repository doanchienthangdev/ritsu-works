# knowledge/resolvers/ — Resolver Routing Tables

Per capability `resolver` v1.0 (see `wiki/capabilities/resolver/spec.md` after
Phase 8 promotion; pre-promotion at `.archives/cla/resolver/spec.md`).

This folder is the source-of-truth for natural-language-trigger → AI-workforce-
recipient routing. Consumed transparently at background-layer by skills /
agents / workflows via:

- `resolver-query` SKILL (agent-to-agent invocation)
- `mcp__supabase-ops__resolver_query` MCP tool (runtime agent use)
- `/resolver` slash-command (operator-facing introspect/build)
- Programmatic Node.js API: `require('scripts/resolver/query.cjs').query(...)`

## Element schema (founder-stated, locked v1.0)

Every routing element is exactly: `(trigger, activated_entity, path_or_method_to_get)`.

YAML form per `knowledge/schemas/resolver-route.schema.json`:

```yaml
- id: <kind>/<slug>
  status: active | stub | deprecated
  triggers:
    keywords: [<word_or_phrase>, ...]
  recipient:
    kind: skill | command | agent | mcp | wiki | sop | capability | persona
    slug: <recipient-identifier>
    path: <filesystem-path>
  invocation:
    mechanism: skill_tool | slash | subagent | mcp_call | wiki_query | shell
    args: { ... }
  role_scope: ["*"] | [<role>, ...]
  composition: { plan: [...] }      # optional (CP-2)
  metadata: { ... }
```

## Folder structure

```
knowledge/resolvers/
├── README.md                      # this file
├── registry.yaml                  # top-level index + config
├── routes/                        # AUTO-DERIVED from recipient frontmatter
│   ├── skills.yaml
│   ├── commands.yaml
│   ├── agents.yaml
│   ├── personas.yaml              # via adapter
│   ├── mcp.yaml                   # via adapter
│   ├── wiki.yaml                  # curated + fallback to wiki_ask
│   ├── sops.yaml
│   ├── capabilities.yaml
│   └── personal.yaml              # founder hand-overrides
├── overrides/                     # HAND-AUTHORED, takes precedence
│   ├── skills.yaml
│   ├── commands.yaml
│   └── ...
└── adapters/                      # READ-ONLY translators for legacy YAMLs
    ├── cla-routing-adapter.yaml
    ├── mcp-tools-adapter.yaml
    └── workforce-personas-adapter.yaml
```

## How to add a route

### Auto-derive (recommended)

Edit the recipient's frontmatter (e.g. add keywords or update description in
`06-ai-ops/skills/<name>/SKILL.md`). Then run:

```bash
/resolver sync --dry-run        # preview
/resolver sync --apply          # write to working tree
/resolver sync --auto-pr        # write + open PR (Tier C)
```

### Hand-author override

Edit `overrides/<kind>.yaml` directly. Adds (or supersedes) a route. The
override takes precedence over the derived route at runtime.

## How to look up

```bash
/resolver query "<trigger>"        # find best match
/resolver query "<trigger>" --plan # also surface composition plan if any
/resolver list --kind=mcp          # enumerate
/resolver explain "<trigger>"      # verbose trace (debugging)
```

Programmatic:

```javascript
const { query } = require('./scripts/resolver/query.cjs')
const result = query({ trigger: '...', flags: {} })
```

## Drift integration

- `pnpm check` runs 4 resolver validators (L1 schema + L1 routes + L1
  uniqueness + L2 coverage)
- Failures block commit (per `.husky/pre-commit`)
- /check-drift flag `--resolver-sync` (Sprint 4) opens auto-PR for orphan
  recipients

## INVARIANTS

1. **Resolver MUST NOT execute recipients.** It returns plans; callers execute.
2. **Resolver MUST NOT mutate recipients.** Sync writes route stubs only.
3. **Zero LLM in hot path.** Semantic fallback opt-in via flag (v1.1).
4. **Adapters READ-ONLY** w.r.t. source YAMLs.
5. **routes/ AUTHORITATIVE at runtime** during legacy coexistence window.

Full invariant list + test enforcement: `wiki/capabilities/resolver/spec.md` §2.A.

## See also

- Capability spec: `wiki/capabilities/resolver/spec.md` (Phase 8 promoted)
- Architecture brainstorm: `.archives/brainstorming/resolver/06-architecture.md`
- Architect findings: `.archives/brainstorming/resolver/17-outside-voice.md`
- Sprint plan: `.archives/cla/resolver/sprint-plan.md`
- Migration: `supabase/migrations/00033_resolver_decisions.sql`
- Validators: `scripts/cross-tier/validate-resolver-*.cjs`
- Engine: `scripts/resolver/*.cjs`
