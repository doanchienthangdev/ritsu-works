# mcp-server/ — supabase-ops MCP shim server (Bài #12, Phase 1)

> Stdio MCP server that exposes governed `query` + `insert` tools against the Operating Supabase (`ritsu-ops`) only. It is the single chokepoint through which agent skills read and write Operating state.

**Status:** Phase 1 active (post-2026-05-16)
**Plan:** `.archives/plans/2026-05-16-mcp-ritsu-ops-integration/` (founder-canonical) + `~/.gstack/projects/doanchienthangdev-ritsu-works/ceo-plans/2026-05-16-mcp-ritsu-ops-integration.md` (gstack mirror)
**Bài toán:** #12

---

## What this is, in one paragraph

7 production skills under [`06-ai-ops/skills/`](../06-ai-ops/skills/) reference MCP tool names `mcp__supabase-ops__query` and `mcp__supabase-ops__insert`. Without a server actually registered under the name `supabase-ops`, those skills are broken. This package is that server. It also enforces 4 hard rules every call goes through: **project_ref allowlist** (you can never talk to Product Supabase), **HITL tier check** (per `governance/HITL.md`), **role permissions** (per `governance/ROLES.md`), and **audit logging** (every call → `ops.mcp_calls`).

This is **Phase 1**: a thin shim with 2 tools and stdio transport. **Phase 2** (later) replaces internals with the full Bài #12 server (semantic tools + HTTP/OAuth + auto-discovery). Skill API stays unchanged across both phases — that's the whole point of the shim.

---

## Quick start (founder)

### 1. One-time setup

```bash
# from repo root
npm --prefix mcp-server install
```

### 2. Set env (export in your shell or Claude Code env config)

```bash
export SUPABASE_OPS_URL="https://mntobbmieuoaxipnjaau.supabase.co"
export SUPABASE_OPS_SERVICE_KEY="<service-role-key>"    # OR ANON key
export MCP_CALLER_ROLE="gps"                            # default; any role from governance/ROLES.md
```

> The service key bypasses RLS. Phase 1 uses it because we trust the founder + the shim's own guards. Phase 2 will offer a per-tool anon-key path with RLS doing the gating.

### 3. Verify

```bash
# in Claude Code at this repo (or any worktree of it):
/mcp-doctor
```

### 4. Use

Invoke any of the 7 production skills:

```
/episodic-recall
/cost-report
/task-status
/task-decompose
/cost-optimization-review
/monthly-learning-review
/synthesize-morning-brief
```

They will now succeed (Phase 1 was specifically about unblocking these).

---

## How it routes a call

```
   Claude Code session
        │  MCP stdio (JSON-RPC)
        ▼
   src/server.ts (dispatcher)
        │
        ├─ (1) role-resolver: MCP_CALLER_ROLE → KnownRole
        ├─ (2) hitl-tier-check: tool's required tier ≤ role's hitl_max_tier?
        ├─ (3) project-ref-guard: target URL's ref ∈ ALLOWED_PROJECT_REFS?  (boot-time AND per-call)
        ├─ (4) tool handler runs (query → sql-guard, insert → table-allowlist)
        ├─ (5) supabase-js call against ritsu-ops only
        ├─ (6) audit.ts: fire-and-forget INSERT INTO ops.mcp_calls
        └─ (7) return MCP response

   ✕ NEVER reaches Supabase ritsu Product (ixfvqxnohlmayzuesrrq).
     Enforced at boot AND per-call.
```

---

## Phase 1 tool surface

| Tool | What | Tier (default) | Output |
|---|---|---|---|
| `query` | Parameterized SELECT against `ops.*`, `metrics.*`, `public.*` per caller's read scope (`governance/ROLES.md`) | A (read-only) | `{ rows, row_count, truncated, query_ms }` |
| `insert` | INSERT rows into a table the caller's role may write | B (notify-after by default; per-role overrides in `knowledge/mcp-tools.yaml`) | `{ inserted_count, returned_rows, query_ms }` |

UPDATE / UPSERT / DELETE deferred to **Phase 1.5**. See `02-implementation-checklist.md` in the plan dir.

---

## Layout

```
mcp-server/
├── package.json
├── tsconfig.json
├── README.md                       (this file)
├── src/
│   ├── server.ts                   MCP stdio entry — Unit 2
│   ├── lib/
│   │   ├── env.ts                  ✓ Unit 1 — typed env loader, fail-fast on bad config
│   │   ├── supabase-client.ts      Unit 2
│   │   └── sql-guard.ts            Unit 3
│   ├── governance/
│   │   ├── role-resolver.ts        Unit 2
│   │   ├── hitl-tier-check.ts      Unit 2
│   │   ├── project-ref-guard.ts    Unit 2 (env.ts handles boot-time; this handles per-call)
│   │   └── audit.ts                Unit 4
│   ├── tools/
│   │   ├── index.ts                Unit 2
│   │   ├── query.ts                Unit 3
│   │   └── insert.ts               Unit 4
│   └── cli/
│       └── doctor.ts               Unit 6
└── (tests live under ../tests/mcp-server/ — matches repo's vitest layout)
```

---

## Security boundaries that MUST stay intact

1. `src/lib/env.ts` `ALLOWED_PROJECT_REFS` contains exactly `["mntobbmieuoaxipnjaau"]`. Adding Product (`ixfvqxnohlmayzuesrrq`) is a D-MAX violation per `governance/HITL.md`. The test `env.test.ts:"ALLOWED_PROJECT_REFS contains ritsu-ops and ONLY ritsu-ops"` is load-bearing — never disable.
2. The `query` tool's `sql-guard.ts` rejects any non-`SELECT` first keyword and any multi-statement.
3. The `insert` tool's table allowlist is derived from `governance/ROLES.md` + `knowledge/mcp-tools.yaml`. Bypassing requires a PR to BOTH files.
4. The audit writer is fire-and-forget but logs failures to stderr. Long-running audit failures must trigger founder attention (deferred to Phase 2 monitoring).

---

## Running tests

```bash
npm --prefix mcp-server install     # one-time, deps for tsx/vitest
npm test                            # from repo root, runs vitest on tests/**/*.test.ts
                                    # (includes tests/mcp-server/*)
```

Integration tests against the real `ritsu-ops` project are gated on `SUPABASE_OPS_TEST_URL` + `SUPABASE_OPS_TEST_SERVICE_KEY` env vars. Without those, integration tests skip.

---

## Future (Phase 2 — see CEO plan §3 "NOT IN SCOPE — Phase 1")

- Semantic tools (`ritsu.kpi.snapshot`, `ritsu.sop.execute`, …) wrapping query+insert with business semantics
- Auto-discovery of tools from skill frontmatter (currently manual in `mcp-server/src/tools/index.ts`)
- HTTP transport + OAuth (only when operator #2 added)
- Per-role rate limiting
- PII redaction per role (when operator-ops role exists)
- Per-tool RLS-aware anon-key path (instead of service-key everywhere)
