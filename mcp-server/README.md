# mcp-server/ — MCP (Model Context Protocol) Server

> Bài #12 implementation. Exposes Agent OS internals to Claude Code (and other LLM clients) via MCP protocol.

**Status:** Scaffold (Wave 4 implementation)
**Wave:** 4 (Visibility + Access)
**Bài toán:** #12

---

## Purpose

Per Bài #12, MCP server exposes:
- **Read tools** — query KPIs, capabilities, customer data, audit log
- **Write tools** — propose capabilities (Bài #20), log attention (Bài #19), trigger SOPs
- **Search tools** — knowledge graph traversal (Bài #14)

Claude Code (founder's primary surface) calls these tools via MCP protocol thay vì direct Postgres queries.

## 2 deployment modes (per chương 29)

### Bước A: stdio mode (local-first)

Subprocess of Claude Code session. Spawned per session, communicates over stdio.

```bash
# claude_code .mcp.json config:
{
  "mcpServers": {
    "ritsu": {
      "command": "node",
      "args": ["mcp-server/dist/stdio.js"]
    }
  }
}
```

### Bước B: HTTP mode (production)

Long-running HTTP server tại `https://mcp.ritsu.ai`. OAuth + API key auth. Multiple clients.

```bash
# deployed via Docker on Hetzner VPS
docker run -d -p 443:443 ritsu/mcp-server
```

## Tools registry

Tools defined trong `knowledge/mcp-tools.yaml` (Tier 1).
Roles defined trong `knowledge/mcp-roles.yaml` (Tier 1 — who can call which tool).

Server reads these YAML at startup, registers tools dynamically.

## Recommended stack

- **Language:** TypeScript (Node.js 20+)
- **Framework:** [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- **DB client:** Supabase JS (service role key for backend operations)
- **Auth:** OAuth 2.1 (PKCE flow) + API key fallback
- **Deploy:** Docker on Hetzner VPS (Bước B)

## Folder structure (when implemented)

```
mcp-server/
├── README.md                        ← this file
├── package.json
├── tsconfig.json
├── src/
│   ├── stdio.ts                     ← stdio entrypoint (Bước A)
│   ├── http.ts                      ← HTTP entrypoint (Bước B)
│   ├── tools/                       ← tool implementations
│   │   ├── kpi-snapshot.ts
│   │   ├── capability-list.ts
│   │   ├── customer-360.ts
│   │   ├── hitl-pending.ts
│   │   └── ... (per mcp-tools.yaml)
│   ├── auth/
│   │   ├── oauth.ts
│   │   └── role-check.ts            ← per mcp-roles.yaml
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── audit.ts                 ← logs to ops.mcp_calls
│   └── tools-registry.ts            ← reads YAML, registers tools
├── tests/
└── Dockerfile
```

## Audit trail

Every tool call logs to `ops.mcp_calls` (per migration 00004):
- caller_kind, caller_id, caller_role
- tool_id, input_payload, output_payload
- role_check_passed, hitl_required
- state, error

Provides complete audit của Claude Code activity.

## Wave 4 implementation order

1. Stdio mode (Bước A first)
2. 5 read-only tools (KPI, capabilities, customer, audit, hitl-list)
3. 3 write tools (propose-capability, log-attention, decide-hitl)
4. HTTP mode (Bước B migration)
5. OAuth + role enforcement

## Cross-references

- Bài #12 DRAFT: `knowledge/phase-a2-extensions/bai-12-mcp-integration-DRAFT.md`
- Tier 1: `knowledge/mcp-tools.yaml` + `knowledge/mcp-roles.yaml`
- Audit: `ops.mcp_calls` table (migration 00004)
- Deployment: chương 29

---

*MCP server is Wave 4. Don't implement until Wave 1-3 foundation solid (skills + SOPs + Supabase tables exist to expose).*
