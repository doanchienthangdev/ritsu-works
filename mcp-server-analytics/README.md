# mcp-server-analytics/ — `supabase-analytics` MCP (consumer)

> Stdio MCP server that exposes **read-only** `query` + `list_tables` over the
> **pseudonymized** ritsu-analytics dataset (`live.*`), connecting as the
> least-priv `analytics_reader` Postgres role.

**Capability:** `product-db-readonly-access` — **Sprint 1 (the value unlock)**
**Spec:** `.archives/cla/product-db-readonly-access/spec.md` (→ `wiki/capabilities/…` at Phase 8)
**Status:** built + tested; activation (role + `.mcp.json`) is founder-gated.

---

## What this is, in one paragraph

The Operating AI needs to answer growth/product/customer questions from
Product-derived data (retention, activation, unit-economics) **without ever
touching Product Supabase and without raw PII**. The `product-db-readonly-access`
capability solves that with Door 2: Product builds **PII-stripped, HMAC-hashed
views**; an isolated `ritsu-analytics` project pulls only those nightly into
`live.*` (identity never crosses; `user_hash` preserves joins). This server is
the **governed consumer** of that dataset — the thing skills/agents actually call.

It is deliberately the **mirror-image security model** of `../mcp-server/`
(supabase-ops): there, an app-layer guard fronts a `service_role` connection;
**here, the DB role itself is the boundary** — the connection is
`analytics_reader`, which has `SELECT` on `live.*` and nothing else.

## Security model (defense in depth, role-first)

| Layer | What it does |
|---|---|
| **DB role `analytics_reader`** (the real line) | `USAGE` on `live` + `SELECT` on `live.*` only. No writes, no `ext`/`staging`/FDW, no PII. A guard bypass still can't mutate or escape `live`. |
| **Boot firewall** (`src/lib/env.ts`) | Refuses to start unless the connection is `analytics_reader` on the analytics project. Hard-blocks any URL that resolves to (or contains) `PRODUCT_PROJECT_REF`. |
| **Role allowlist** (`src/governance/role-allowlist.ts`) | Default-deny; only `customer-lead`, `product-orchestrator`, `gtm-orchestrator`, `feedback-aggregator`, `founder`, `cofounder` may query. |
| **SQL guard** (`src/lib/sql-guard.ts`) | SELECT/WITH only, single statement, no `INTO`. Makes mistakes loud early. |
| **Connection** (`src/lib/pg-client.ts`) | `default_transaction_read_only=on` + `statement_timeout` set at connection start; small pool; SSL. |
| **L0 product firewall** (repo hook) | Already treats `mcp__supabase-analytics__*` as `safe-mcp` (v1.2). |

## Tools

- **`query`** — `{ sql: SELECT-only, params?: [], row_limit?: 1..1000=100 }` → `{ rows, row_count, truncated, query_ms }`. Tables under `live` (e.g. `live.profiles`, `live.learning_sessions`, `live.learning_progress`); join on `user_hash`.
- **`list_tables`** — no input → `{ tables: [{table_name, table_type}], count }`. Discovery; freshness is in `live._sync_runs`.

## Quick start

```bash
# 1. install
npm --prefix mcp-server-analytics install

# 2. the analytics_reader role + ANALYTICS_READER_DB_URL are created by
#    .archives/brainstorming/product-db-readonly-access-2026-06-02/sql/create-analytics-reader.cjs
#    (analytics-side only; writes the URL into runtime/secrets/.env.local)

# 3. prove the least-priv boundary end-to-end (connects AS analytics_reader)
npm --prefix mcp-server-analytics run smoke

# 4. typecheck
npm --prefix mcp-server-analytics run typecheck
```

Tests live at repo root (`tests/mcp-server-analytics/`, run by the root vitest):

```bash
npx vitest run tests/mcp-server-analytics/
```

## `.mcp.json` registration (founder, **D-MAX** — `.mcp.json` is security-critical)

Add under `mcpServers` in the repo-root `.mcp.json`, then **restart Claude Code**:

```jsonc
"supabase-analytics": {
  "command": "/bin/sh",
  "args": [
    "-c",
    "set -a; [ -f /Users/doanchienthang/ritsu-works/runtime/secrets/.env.local ] && . /Users/doanchienthang/ritsu-works/runtime/secrets/.env.local; set +a; exec npx -y tsx /Users/doanchienthang/ritsu-works/mcp-server-analytics/src/server.ts"
  ],
  "env": {
    "MCP_CALLER_ROLE": "${MCP_CALLER_ROLE:-gps}",
    "MCP_CALLER_SESSION_ID": "${MCP_CALLER_SESSION_ID:-}"
  }
}
```

The wrapper sources `.env.local` (which holds `ANALYTICS_READER_DB_URL`,
`PRODUCT_PROJECT_REF`, `ANALYTICS_PROJECT_REF`) so the boot firewall can verify
the connection is analytics-only. `MCP_CALLER_ROLE=gps` by default is
**denied** by the allowlist — set a caller role on the allowlist to query.

## What's NOT here (later sprints)

- **Audit to `ops.mcp_calls` / `ops.alerts` + canary→Telegram** → Sprint 4 (monitoring). Sprint 1 audits to stderr only, to keep this process's deps to `pg` + the MCP SDK (no ops service key inside the analytics reader).
- **Governance registration** (manifest/ROLES/SECRETS/external-sources/invariants/KPI/SOP) → Sprint 2.
- **Dataset expansion** (PoC-3 → ~10 behavioral/billing views) → Sprint 3.
