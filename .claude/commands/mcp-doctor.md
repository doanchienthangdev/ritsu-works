---
description: |
  Diagnose supabase-ops MCP shim health. Verifies .mcp.json, env vars,
  project_ref allowlist, registry, role resolution, registered tools,
  Supabase connectivity, ops_run_select RPC presence, and today's audit
  row count. Output: HEALTHY | DEGRADED | UNHEALTHY plus a per-check
  table.
---

# /mcp-doctor

Run the supabase-ops MCP shim's diagnostic CLI and surface the result.

## What it does

Executes the diagnostic from `mcp-server/src/cli/doctor.ts`. Each check is one
of PASS / FAIL / WARN / SKIP. Failures point at the specific fix (missing env
var name, missing migration, etc).

## When to use

- Right after pulling main / switching worktrees — verifies your env is plumbed
- When a skill that uses `mcp__supabase-ops__*` tools fails — quickly
  triage whether the shim itself is healthy
- After applying migration 00026_mcp_query_rpc.sql — confirms the RPC is live
- Periodically (e.g. start of session) as a sanity check

## How to run

```bash
cd /Users/doanchienthang/ritsu-works   # or whatever the repo root is
npm --prefix mcp-server install         # one-time, if not already done
npm --prefix mcp-server run doctor
```

Or invoke this slash command in Claude Code — it will run the same bash and
return the rendered output.

## Sample healthy output

```
supabase-ops MCP doctor
──────────────────────────────────────────────────
[OK]   .mcp.json found
       /Users/doanchienthang/ritsu-works/.mcp.json
[OK]   env loaded
       url=https://mntobbmieuoaxipnjaau.supabase.co | project_ref=mntobbmieuoaxipnjaau | service_key=set(******) | anon_key=unset | role=gps | session=cc-xxxx | repo_root=/Users/.../ritsu-works
[OK]   project_ref allowlisted
       mntobbmieuoaxipnjaau ∈ [mntobbmieuoaxipnjaau]
[OK]   mcp-tools.yaml loaded
       version=1.1.0, tools=5
[OK]   role resolved
       role=gps, hitl_max=C
[OK]   tools registered
       query, insert
[OK]   supabase connectivity
       ops.mcp_calls row count: 47
[OK]   ops.ops_run_select RPC
       ping returned 1 row
[OK]   today's audit rows
       3 calls audited since 2026-05-16T00:00:00Z
──────────────────────────────────────────────────
Status: HEALTHY
```

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `env loaded FAIL — MissingEnv: SUPABASE_OPS_URL` | env var not exported | `export SUPABASE_OPS_URL=https://mntobbmieuoaxipnjaau.supabase.co` |
| `project_ref allowlisted FAIL` | URL points at Product Supabase | **STOP — this is a security event**. Verify URL is ritsu-ops, not ritsu |
| `mcp-tools.yaml loaded FAIL` | File missing or YAML parse error | check `knowledge/mcp-tools.yaml` syntax |
| `ops.ops_run_select RPC FAIL — not deployed` | migration 00026 not applied | `bash scripts/wave2-bootstrap-cron-secrets.sh` not relevant here — use `supabase db push --linked --yes` |
| `supabase connectivity FAIL — JWT expired` | service key rotated | rotate `SUPABASE_OPS_SERVICE_KEY` from project settings |

## Bash to execute

```bash
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || cd /Users/doanchienthang/ritsu-works
npm --prefix mcp-server run doctor 2>&1
```
