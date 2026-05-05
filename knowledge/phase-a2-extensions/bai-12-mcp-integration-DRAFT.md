# Bài #12 — MCP Integration Architecture (DRAFT)

**Status:** DRAFT — derived from G6 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G6-mcp.md`
**Dependencies:** Bài #1, #2, #5, #6, #7, #8 DRAFT, #9 DRAFT, #10 DRAFT, #11 DRAFT

## Why
~15 issues directly + many indirect (every founder Claude Code interaction touches MCP).

Phase A: manifest slot only, no architecture. Founder uses Claude Code daily → MCP critical interface.

Without Bài #12:
- Founder copy-paste between Claude Code and Supabase/HubSpot/Slack
- No skill orchestration via Claude Code
- No governance on tool execution
- No observability on AI client interactions

## Decisions (tentative)

### Axis 1 — Server Architecture
**Choice:** Dual-mode (stdio + HTTP), single codebase
- Stdio: local, founder primary mode (Claude Code, Cursor, Windsurf)
- HTTP: OAuth-protected, mcp.ritsu.ai (Claude Desktop, ChatGPT, mobile, future operators)
- Single TypeScript codebase, shared tool implementations, transport-specific entry points
- npm package `@ritsu/mcp-server` for stdio
- Vercel deployment for HTTP
- Use Anthropic Supabase MCP + GitHub MCP cho generic data ops; build domain-specific only

### Axis 2 — Tool Catalog
**Choice:** knowledge/mcp-tools.yaml Tier 1 + auto-discovery
- Static curated for stable LLM-facing interface
- Auto-discovery from manifest.yaml.skills + per-pillar SOPs
- Naming convention: ritsu.<resource>.<action>
- Schema validation per tool input/output
- Tool descriptions are LLM-consumed product copy (rich examples)

### Axis 3 — Role-Scoped Access + Authorization
**Choice:** knowledge/mcp-roles.yaml Tier 1 + per-tool HITL gate
- Stdio mode: founder only (trusted local socket)
- HTTP mode: OAuth 2.1, token → role lookup
- Role tools: array of glob patterns
- Rate limits per role
- Cost buckets per role
- HITL gate before execution for Tier B/C/D tools
- PII redaction per role (operator-ops sees no customer email)

### Axis 4 — Observability + Governance
**Choice:** ops.mcp_calls audit + dashboard + cost integration
- Every call audited (caller, tool, inputs hash, status, duration, cost)
- Dashboard /operations/mcp page (Bài #10)
- Cost attribution to bucket (Bài #7)
- Tool call emits ritsu.mcp.tool_called event (Bài #11)
- Testing framework: unit + integration + routing-eval

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.mcp_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       text NOT NULL,
  caller_client   text NOT NULL,
  tool_id         text NOT NULL,
  inputs_hash     text,
  inputs          jsonb,                 -- redacted PII
  status          text NOT NULL,         -- success | error | denied | hitl_pending | hitl_denied
  status_detail   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     int,
  cost_usd        numeric,
  hitl_run_id     uuid REFERENCES ops.hitl_runs(id),
  result_summary  text,
  error           text
);

CREATE INDEX ON ops.mcp_calls (caller_id, started_at DESC);
CREATE INDEX ON ops.mcp_calls (tool_id, started_at DESC);
CREATE INDEX ON ops.mcp_calls (status, started_at DESC) WHERE status IN ('error', 'denied');
```

## YAML schemas

```yaml
# knowledge/mcp-tools.yaml
tools:
  - id: ritsu.<resource>.<action>
    description: <markdown, LLM-consumed, examples-rich>
    inputs:
      - name: <param>
        type: <type>
        required: true | false
        validation: <regex or ref>
    outputs:
      type: <type>
      schema: <ref>
    role_scope: [<roles>]
    requires_hitl: false | A | B | C | D-Std | D-Atom | per_sop
    cost_bucket: <bucket-id>
    rate_limit: <override per tool>
    
auto_discovery:
  - source: manifest.yaml.skills
    template: <jinja>
  - source: knowledge/<pillar>/sops/SOP-*.yaml
    template: <jinja>
```

```yaml
# knowledge/mcp-roles.yaml
roles:
  founder:
    tools: ["ritsu.*"]
    rate_limit: unlimited
    cost_bucket: founder
    
  operator-ops:
    tools: ["ritsu.ops.*", "ritsu.alerts.*"]
    rate_limit: 1000/hour
    cost_bucket: operator-ops
    excludes_pii: true
```

## Server architecture

```
05-ai-ops/mcp-server/
├── package.json              # @ritsu/mcp-server, MCP SDK dep
├── src/
│   ├── server.ts             # main entry, dual-mode bootstrap
│   ├── stdio.ts              # stdio transport
│   ├── http.ts               # HTTP transport with OAuth
│   ├── tools/                # tool definitions (one file per resource)
│   ├── auth/
│   │   ├── oauth.ts
│   │   └── role-resolver.ts
│   ├── governance/
│   │   ├── hitl-gate.ts
│   │   ├── budget-gate.ts
│   │   └── audit.ts
│   └── lib/
│       ├── supabase.ts
│       └── tool-registry.ts  # auto-discovery
├── test/
│   ├── tools/                # contract tests
│   ├── fixtures/             # synthetic data
│   ├── integration/          # E2E
│   └── eval/                 # LLM routing evals
└── docs/
    ├── claude-code.md
    ├── cursor.md
    ├── windsurf.md
    └── chatgpt.md            # OAuth flow
```

## New components (24)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN12.1 | 05-ai-ops/mcp-server/ | Code package | D |
| CN12.2 | knowledge/mcp-tools.yaml | Tier 1 | A.2 |
| CN12.3 | knowledge/mcp-roles.yaml | Tier 1 | A.2 |
| CN12.4 | ops.mcp_calls | Tier 2 | B |
| CN12.5 | Stdio transport | Runtime | D |
| CN12.6 | HTTP transport + OAuth | Runtime | D |
| CN12.7 | OAuth 2.1 module | Auth | D |
| CN12.8 | Role resolver | Governance | D |
| CN12.9 | HITL gate | Governance | D |
| CN12.10 | Budget gate | Governance | D |
| CN12.11 | Auto-discovery | Build-time | D |
| CN12.12 | Test framework | Meta | A.2 |
| CN12.13 | Dashboard /operations/mcp | Frontend | D |
| CN12.14 | npm @ritsu/mcp-server | Distribution | D |
| CN12.15 | mcp.ritsu.ai Vercel | Infra | D |
| CN12.16 | ritsu-cli auth issue | CLI | D |
| CN12.17 | Recipe add-mcp-tool.md | Meta | A.2 |
| CN12.18 | Recipe add-mcp-role.md | Meta | A.2 |
| CN12.19 | Checklist mcp-tool-pre-publish.md | Meta | A.2 |
| CN12.20 | Update Bài #6 sub-domain B | Update | A.2 |
| CN12.21 | Update Bài #7 cost_bucket per call | Update | A.2 |
| CN12.22 | Update Bài #11 emit tool_called event | Update | A.2 |
| CN12.23 | Multi-client docs | Docs | A.2 |
| CN12.24 | Brainstorm problem-12 | Meta | A.2 |

## Open questions

- OQ12.1: Hot-reload tool schemas?
- OQ12.2: Tool deprecation flow?
- OQ12.3: Tool aliases?
- OQ12.4: Streaming responses?
- OQ12.5: Tool composition?
- OQ12.6: Per-customer scoped tools (B2B)?
- OQ12.7: MCP marketplace publishing?
- OQ12.8: Webhook tools?

## Anti-patterns

- ❌ Hardcode tool list (use auto-discovery + curation)
- ❌ Skip tool testing (LLM picks wrong tool silently)
- ❌ No role scoping
- ❌ No HITL gate at MCP layer
- ❌ No audit trail
- ❌ Stdio-only or HTTP-only
- ❌ Tool description as afterthought
- ❌ No schema validation
- ❌ No rate limiting
- ❌ No cost attribution
- ❌ PII in responses without redaction
- ❌ Synchronous HITL block (use async pending pattern)

## GBrain integration notes

- **Reference architecture:** GBrain stdio + HTTP + OAuth pattern proven (Claude Code, Cursor, Windsurf, ChatGPT, Claude Desktop, Cowork, Perplexity supported)
- **Minions pattern in tool implementation:** deterministic tools = direct execution, judgment-spawning tools = subagent
- **Tool description quality:** GBrain RESOLVER.md style — examples-rich, "when to use" + "what it returns" + sample I/O
- **Skillify discipline:** Tool tests + routing-eval mandatory before publish

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| MCP SDK | @anthropic/mcp-sdk |
| Stdio transport | MCP SDK |
| HTTP transport | Vercel + Supabase Edge Functions |
| OAuth 2.1 | Custom (or auth0 if simpler) |
| Schema validation | Zod |
| DB | Supabase (existing) |
| Distribution | npm registry + Vercel |

## Ritsu adds (Outer Harness)

1. mcp-tools.yaml registry (Tier 1)
2. mcp-roles.yaml role scoping (Tier 1)
3. ops.mcp_calls audit
4. Dual-mode server (stdio + HTTP)
5. Auto-discovery from skills/SOPs
6. HITL + budget gate integration
7. Multi-client config docs (4+ clients)
8. /operations/mcp dashboard page
9. Cost attribution per MCP call
10. Tool testing framework

## Lessons captured

1. MCP is interface layer, not infrastructure layer.
2. Dual-mode single codebase essential.
3. Tool descriptions matter as much as implementations.
4. Auto-discovery + curation hybrid.
5. Role-scoped tools = privacy + safety.
6. HITL gate at MCP layer crucial.
7. Tool versioning needs explicit strategy.
8. Multi-client = multi-quirk, test all paths.
9. GBrain MCP architecture is reference-quality.
10. MCP layer = audit trail goldmine.
