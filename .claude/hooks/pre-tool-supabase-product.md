---
name: pre-tool-supabase-product
version: 1.3.0
type: pre-tool
status: active
runtime: .claude/hooks/runtime/pre-tool-supabase-product.cjs
engine: .claude/hooks/runtime/lib/product-firewall.cjs
tests: tests/product-firewall.test.ts
matchers:
  - Bash
  - mcp__supabase-product.*
  - mcp__postgres.*
default_decision: block
fail_mode: closed
---

# Hook: pre-tool-supabase-product

> The firewall. Operating AI must **never touch the Product Supabase project (`ritsu`) directly.** This
> hook enforces that boundary unconditionally, as code, fail-closed.

**v1.0.0 (2026-06-02)** — promoted from spec → **enforced code** as Phase 0 of capability
`product-db-readonly-access` (brainstorm: `.archives/brainstorming/product-db-readonly-access-2026-06-02/`,
esp. `07` Phase 0, `05` §7/§9). Closes **Finding 1** (firewall was honor-system). Implements the chosen
3-door architecture (`10`/`04`): the AI never walks into the house; it talks through guarded doors.

**v1.3.0 (2026-06-04)** — + **product CODE repo write-block** (capability `product-code-readonly-access` v1.1). git/gh WRITES to `doanchienthangdev/ritsu` (`git push` · `gh pr create|merge|edit|close` · write `gh api` · `gh release|repo|secret|workflow` writes) are blocked (matchRule `product-repo-write`); the slug is word-boundaried so our own `ritsu-works` repo is unaffected; READS (`gh api` GET · `gh search code` · `git grep|clone`) pass. The product source code is a READ-ONLY source-of-truth. See `SOP-AIOPS-010` + `knowledge/product-code-source-contract.yaml`.

## What it does

A Claude Code `PreToolUse` hook (wired in `.claude/settings.json` on the matchers above). It reads the tool
payload, delegates to the pure decision engine (`runtime/lib/product-firewall.cjs`), and:

- **allow** → exit 0 (tool proceeds).
- **block** → exit 2 + reason on stderr (Claude Code refuses the tool and feeds the reason back) + a
  structured `permissionDecision: "deny"` on stdout + a high-severity log line to
  `runtime/product-firewall-events.jsonl`.

The hook **never escalates.** There is no founder-approval path that opens this gate from within a session.
Product access happens only through the sanctioned doors (below), each provisioned via the D-MAX ceremony in
`governance/HITL.md`.

## The two laws (never bend)

1. **No PII reaches ops** — identity is stripped at the Product boundary, before anything crosses.
2. **No ops query hits the Product primary; no ops write hits Product** — reads run through a *bounded
   gateway* or *sanctioned door*, never raw SQL; writes go through a *product-owned action*, never raw DB.

## The doors (what the firewall allows vs blocks)

| Surface | Tool shape | Decision |
|---|---|---|
| Our own DBs | `mcp__supabase-ops__*`, `mcp__gbrain__*`, `mcp__supabase-analytics__*` | **allow** (ritsu-ops / ritsu-brain / ritsu-analytics are not Product; analytics holds only pseudonymized data — `05` §7) |
| 🪟 Door 1 read-gateway | `mcp__supabase-product-readonly__*` | **allow** for allowed roles, SELECT-only, target ∈ pre-approved set or a named intent; the gateway strips identity + k-anon internally (`04` §3) |
| 🧾 Door 3 action-MCP | `mcp__supabase-product-action__*` | **allow** the specific named action for allowed roles; per-action HITL enforced by the action layer (`04` §5) |
| Raw / direct | `Bash` (psql, pg_dump, connection strings), `mcp__postgres__*`, generic supabase MCP | **block** if it targets Product or an unprovable DB; **allow** if it targets a known-safe ref or no DB |

## Decision model (engine: `runtime/lib/product-firewall.cjs`)

```
decide(input):
  cls = classifyTool(toolName)
  if cls == 'other'      → allow            # not a DB-reaching tool
  if cls == 'safe-mcp'   → allow            # ritsu-ops / ritsu-brain / ritsu-analytics
  if cls == 'gateway'    → role? write? forbidden-schema? view∈pre_approved? → allow/block
  if cls == 'action'     → role? → allow/block
  # raw-bash | raw-mcp:
  if classifyProductRepoWrite(text) → block (product-repo-write)   # v1.3.0: git/gh WRITE to doanchienthangdev/ritsu (read-only code source; ritsu-works unaffected)
  target = classifyRawTarget(text)          # scans the WHOLE payload
    'none'        → allow                    # no DB connection in the command
    'safe'        → allow                    # ref ∈ {ritsu-ops, ritsu-brain, ritsu-analytics}
    'product'     → block (raw-product-access)        # product ref / product-only artifact
    'unknown-db'  → block (fail-closed-unknown-db)     # a DB target we cannot PROVE safe
```

**fail_mode: closed, scoped correctly.** The firewall fails closed for *the thing it guards* — a DB-shaped
call whose target cannot be proven safe is blocked (`05` §7: "on parser uncertainty → block"). It does **not**
fail closed for non-DB calls (an empty/garbled payload or a plain `ls` is allowed — a bug in the firewall
must not brick every tool in the session). On an internal exception the wrapper blocks only if the call looks
DB-shaped.

## Known-safe project refs (the only DB targets we can PROVE are not Product)

- `ritsu-ops` — `mntobbmieuoaxipnjaau` (manifest.yaml)
- `ritsu-brain` — `qqlggvkcynhjiwgomgma` (gbrain)
- `ritsu-analytics` — injected via env `ANALYTICS_PROJECT_REF` at provisioning (`15` K3); holds no raw PII.

The Product ref is **deliberately absent** from the committed code. It is configured via env
`PRODUCT_PROJECT_REF`. **Until it is known, fail-closed already covers Product** (any unknown supabase DB
target is blocked) — so the firewall is safe to ship before the ref is known. Extra safe refs may be added
via `PRODUCT_FIREWALL_EXTRA_SAFE_REFS`.

**v1.1 self-config (2026-06-02):** the hook reads `runtime/secrets/.env.local` (`loadEnvFileRefs`) and lifts
`PRODUCT_PROJECT_REF` + `ANALYTICS_PROJECT_REF` (the latter auto-derived from `RITSU_ANALYTICS_DB_URL` if not
explicit) — only those firewall keys, never the rest of the secrets file. This makes the firewall **precise**
(explicit Product block + security alert; analytics recognized as safe) instead of relying on fail-closed
alone. Absent file (worktree / CI) → `{}` → fail-closed still holds. `process.env` overrides the file.
Real refs live in `.env.local` (local-only), never in the committed code.

## Pre-approved read views (Finding 2 — single source of truth)

The pre-approved set lives in **one place**: `PRE_APPROVED_VIEWS` in `runtime/lib/product-firewall.cjs`. It
**MUST equal the contract views the ETL / gateway actually reads.**

```
PRE_APPROVED_VIEWS = { public.v_ops_dau_export }   # the real ETL contract view (worker.ts / manifest)
```

> **Finding 2 fix:** the v0.2 spec listed four `etl_*` views (`etl_user_metrics`, `etl_subscription_state`,
> `etl_session_aggregates`, `etl_content_stats`) that the ETL **never reads** — the handler reads
> `v_ops_dau_export` (`worker.ts`). If enforced as-written, v0.2 would have blocked the real ETL. Those four
> names are removed; the set now reflects reality. A regression test
> (`tests/product-firewall.test.ts` → "Finding-2") guards this. Expanding the set is **Tier D-Std**.

System-metadata reads (`pg_catalog`, `information_schema`) are allowed on the sanctioned read path.
Identity/system schemas (`auth`, `storage`, `vault`) are **never** approved, even by accident.

## Supabase Management API (v1.2)

`api.supabase.com/v1/projects/<ref>/database/query` can run arbitrary SQL on a project — a path that bypasses
psql/connection-string detection. The firewall gates Management-API calls by the `/projects/<ref>/` segment:
Product ref → block, safe ref (ops/brain/analytics) → allow, unknown ref → fail-closed block; account-level
metadata (`/v1/projects` list, `/v1/organizations`, no project DB target) → allow. `decide()` scans `other`
tool payloads too, so a script's out-of-band guard catches a Product-targeting Management-API call even
though the tool isn't `Bash`. (Note: a call whose URL lives only *inside* a script — not in the command
text — is invisible to the session hook; such scripts must self-guard with `assertProductAccessAllowed`.)

## Out-of-band callers (`05` §9.3)

A session `PreToolUse` hook does **not** constrain a background worker (CRON / Edge Function / MCP
subprocess). Two layers cover them:

1. **Primary (provisioning):** the Product read credential is physically **SELECT-only on the stripped
   `analytics_export` views** (product-side, D-MAX). Key scoping is the real out-of-band enforcement.
2. **Defense-in-depth (code):** out-of-band Node callers `require()` the engine and call
   `assertProductAccessAllowed(input)` before any Product-reaching op; it throws on block. (The ETL worker
   reading `v_ops_dau_export` as `etl-runner` passes; reading anything else throws.)

## Identify target

The engine scans the **entire** tool payload (tool name + full JSON of `tool_input` + every string value),
so the allow-list cannot be bypassed by hiding a target in an unexpected field (`{view:"public.users"}` is
caught just like `from public.users`). It extracts: Supabase project refs (host / pooler `postgres.<ref>` /
`--project-ref` / payload field), connection indicators (psql, `postgresql://`, supabase, pooler host,
pg_dump), write keywords (word-boundary matched, so `created_at` is not mistaken for `CREATE`), forbidden
schemas, and product-only artifacts (`analytics_export`, `analytics_export_ro`, `app.analytics_salt`,
`auth.users`, `service_role`, `supabase_product`).

## Caller role

From `process.env.MCP_CALLER_ROLE` (same convention as the other runtime hooks + the MCP servers).
`etl-runner` is the sole standing Product-read role; `founder`/`cofounder` may use the doors. Raw access is
blocked for **all** roles, including `etl-runner` and `founder` — even the founder must use the doors / the
D-MAX ceremony, never raw session SQL.

## Test cases

Authoritative, executable cases live in **`tests/product-firewall.test.ts`** (57 cases). They cover the 14
original spec cases (adapted to the 3-door model), the Finding-2 regression, raw-product blocks, fail-closed
on unknown DBs, gateway/action role + write + view gating, out-of-band guard, input boundaries, and the
runtime hook end-to-end (exit-0 allow / exit-2 deny). The original 14:

| # | Role | Op | Target | Modeled via | Expected |
|---|---|---|---|---|---|
| 1 | etl-runner | SELECT | `public.v_ops_dau_export` | gateway | allow |
| 2 | etl-runner | SELECT | `public.users` (raw) | gateway | block (not pre-approved) |
| 3 | etl-runner | INSERT | pre-approved view | gateway | block (write) |
| 4 | etl-runner | UPDATE | `public.users` | gateway | block (write) |
| 5 | etl-runner | DELETE | anything | gateway | block (write) |
| 6 | etl-runner | DROP | anything | gateway | block (write) |
| 7 | gps | SELECT | pre-approved view | gateway | block (role) |
| 8 | growth-orchestrator | SELECT | anything | gateway | block (role) |
| 9 | etl-runner | SELECT | `auth.users` | gateway | block (forbidden schema) |
| 10 | etl-runner | SELECT | named intent | gateway | allow |
| 11 | etl-runner | SELECT | `pg_catalog.pg_tables` | gateway | allow (system metadata) |
| 12 | etl-runner | SELECT | `ops.tasks` (ritsu-ops) | supabase-ops MCP | allow (not Product) |
| 13 | etl-runner | RPC | `get_credit_statistics()` (leaks email) | gateway | block |
| 14 | code-reviewer | SELECT | Product (misconfigured creds) | raw Bash | block (raw / role) |

## Observability

Every block writes a high-severity line to `runtime/product-firewall-events.jsonl`
(`event_type: security.product_firewall_block`, `match_rule`, hashed session). A separate cron batches these
to `ops.events` → Telegram via `alert-router`; 2+ blocks in a session → GitHub `security-incident`. (The
batch cron + ops wiring land with the rest of the capability's PR, `11` §6 step 7.) False positives are cheap
by design; a false negative could expose every paying user's data — when one happens, fix the root cause, do
not relax the hook.

## Integration with other hooks (defense in depth)

`pre-tool-secrets` ensures only `etl-runner` *holds* a Product credential; this hook ensures even a leaked
credential cannot perform the operation. Both must pass; either failing blocks. **Finding 3** (the
`SUPABASE_PRODUCT_READONLY_ETL_KEY` vs `SUPABASE_PRODUCT_READ_KEY` name drift) is a `pre-tool-secrets` /
governance concern, tracked separately — it touches `governance/SECRETS.md` (D-MAX) + `ROLES.md` /
`external-sources.yaml` (Tier C) and must be fixed in its own ceremony before provisioning.

---

*This hook is the most important safety boundary in the entire repo. The cost of a false positive is small.
The cost of a false negative could be every paying user's data compromised.*
