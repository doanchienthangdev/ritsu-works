---
name: pre-tool-gbrain-tier
version: 0.1.0
type: pre-tool
tools: [mcp__gbrain__*]
default_decision: allow
fail_mode: closed
capability: multi-user-auth
---

# Hook: pre-tool-gbrain-tier

> Per-human tier gate for gbrain (capability multi-user-auth, Sprint 2). In `RITSU_AUTH_MODE=per-human` it BLOCKS every `mcp__gbrain__*` tool call for a `user`-tier operator (admin + owner allowed), reading the operator's verified tier from the access token supabase-ops persists to the credential file. Service-key mode is a no-op.

## Why this hook (the architecture decision)

gbrain is an **external bun binary** (`gbrain serve`, run from `runtime/brain/` via `.mcp.json`) with its **own auth model** — it does NOT understand the Supabase Auth JWT. So unlike the ops DB (per-tier RLS) or the operator-broker (server-verified identity), gbrain cannot be gated server-side by the per-human credential without a much larger effort (a hosted broker, or gbrain-side auth — both out of scope for closing Sprint 2). The founder chose **Option 1: a pre-tool hook** — local enforcement of the `knowledge/operator-tiers.yaml` contract.

**Honest framing (load-bearing):** a hook runs on the **untrusted laptop**. So this is **least-privilege / non-malicious gating** + it closes the broader "local tool-tier enforcement" gap — it is **NOT** a cryptographic boundary. The decode is signature-unverified (no JWT secret lives on the laptop), and gbrain is the **one** per-human surface with **no server-side backstop**: unlike supabase-ops / analytics — where a forged local token is caught by Supabase signature verification + per-tier RLS, so tampering "gets nothing server-side" — the gbrain MCP has no tier check (the `.mcp.json` spawn runs only the cost-cap script). This PreToolUse hook is therefore the **sole** per-call gate, and the **easiest** way around it is not even editing the hook: a `user` who writes `{app_metadata:{tier:"owner"}}` into their own unsigned token in `.env.local` will pass it. That is **accepted** — the REAL gbrain bounds remain:
- the **$100/mo cost cap** (`scripts/pre-budget-check.sh`, graceful-degrade), and
- gbrain holds **no money / Product / secret credentials** — a bypass (forged token, disabled hook, or locally-edited `operator-tiers.yaml`) reaches only the operational brain (bounded, recoverable), never money/Product/secrets.

A real server-side boundary for gbrain (a hosted broker, or gbrain-side per-human auth) is the deferred Option 2/3 — out of scope for closing Sprint 2.

## The contract enforced

`knowledge/operator-tiers.yaml` (mirrors `governance/ROLES.md` `brain_affinity`):

| tier | gbrain |
|---|---|
| **owner** | all (`mcp: read/write: ["*"]`) → allowed |
| **admin** | read + write (`gbrain` in `mcp.read` + `mcp.write`) → allowed |
| **user** | none (`mcp.read = []`) → **blocked** |
| null / unknown / expired token | **blocked** (fail-closed) |

No tier is "gbrain read-only", so the gate is binary ("may this tier use gbrain at all?"). Per-tool read-vs-write HITL (gbrain writes are Tier B per `governance/HITL.md` Appendix A) is a separate, existing concern — not this hook's job.

## Tier resolution (race-free)

The hook reads the **access token** that the supabase-ops MCP persists to the shared per-human credential file (`RITSU_OPERATOR_REFRESH_TOKEN_FILE`, ITEM A), and decodes `app_metadata.tier`. It **never refreshes** the token (supabase-ops is the sole refresher; Supabase rotates refresh tokens on use, so a second refresher would race + trip reuse-detection). `exp` is enforced (like the analytics gate): a stale/expired token yields no tier → fail-closed.

The hook self-configures from `runtime/secrets/.env.local` (it does not inherit the shell env in Claude Desktop — the MCP wrappers source `.env.local`, so the hook reads it directly).

**Worktree resolution (fixed 2026-07-10).** `runtime/` is local-only and absent from git worktrees, so resolving `.env.local` relative to the hook file put it at `<worktree>/runtime/secrets/.env.local` — which never exists. `readEnvLocal()` returned `{}`, `RITSU_AUTH_MODE` fell back to its `service-key` default, and **the gate silently no-opped for every gbrain call made from a worktree session** — a fail-OPEN on the one per-human surface with no server-side backstop. The hook now walks out of `.claude/worktrees/<name>/` to the main root (mirroring `scripts/cross-tier/check-analytics-sync-health.cjs`) before reading `.env.local`. A machine with no per-human install (fresh clone / CI) still no-ops exactly as before. Pinned by `tests/multi-user-auth/gbrain-hook-worktree.test.ts`.

## Decision logic

```
authMode != per-human (no .env.local at the MAIN ROOT: fresh clone / CI)  → allow (no-op)
tool is not mcp__gbrain__*                                                → allow
per-human + mcp__gbrain__* :
  access token missing / undated / EXPIRED                → BLOCK (fail-closed)
  token has no app_metadata.tier                          → BLOCK (fail-closed)
  tier may use gbrain (owner / admin)                     → allow
  tier may NOT use gbrain (user)                          → BLOCK (tier-denied)
  internal error (e.g. locally-corrupted tiers.yaml)      → BLOCK (fail-closed)
```

Note the first line reads **main root**, not "cwd": running from a worktree on a per-human
machine now gates, exactly as running from the main root does.

Fast, safe exits (allow) cover service-key / non-gbrain / no-config so default installs are byte-identical and a hook bug can't brick non-gbrain work. Once committed to a per-human gbrain call, every error path **fails closed** so a user-corrupted local `operator-tiers.yaml` cannot become a bypass. A genuine cold-start (a gbrain call firing before supabase-ops has *completed* its boot persist — stacking guarantees the writer exists, but the two MCPs spawn in parallel with no ordering guarantee, so the first interactive call could momentarily see no `access_token`) transiently blocks the owner and **self-resolves on retry** — gbrain calls are interactive, well after the ~sub-second persist. This is the fail-closed trade: a transient owner retry in exchange for never letting a user through on an unresolved tier.

## Block contract

Claude Code `PreToolUse`: **exit 2** + the reason on stderr blocks the tool and feeds the reason to the model; a structured decision is also written to stdout. Allow: **exit 0**. Every block appends a `security.gbrain_tier_block` line to `runtime/gbrain-tier-gate-events.jsonl` (gitignored; a future cron batches to `ops.events` / `alert-router`, like the Product firewall).

## Wiring

- Engine (pure, testable): `.claude/hooks/runtime/lib/gbrain-tier-gate.cjs` (`decideGbrainTier`).
- Wrapper (I/O): `.claude/hooks/runtime/pre-tool-gbrain-tier.cjs`.
- Registered in `.claude/settings.json` under `PreToolUse` with matcher `mcp__gbrain.*`.
- Reuses `effectiveTier` from `scripts/local-install/lib/operator-tier.cjs` against `knowledge/operator-tiers.yaml`.

## Test cases

| # | mode / tool / tier | Expected |
|---|---|---|
| 1 | service-key, any gbrain tool | allow (no-op) |
| 2 | per-human, non-gbrain tool | allow |
| 3 | per-human, `mcp__gbrain__search`, owner | allow |
| 4 | per-human, `mcp__gbrain__put_page`, admin | allow |
| 5 | per-human, `mcp__gbrain__search`, user | BLOCK (tier-denied) |
| 6 | per-human, gbrain, no access token | BLOCK (unresolved-or-expired) |
| 7 | per-human machine, hook invoked from a **worktree** | BLOCK — resolves `.env.local` at the main root (was: silent allow) |
| 8 | fresh clone / CI, no `.env.local` anywhere | allow (no-op) — unchanged |
| 7 | per-human, gbrain, EXPIRED owner token | BLOCK (unresolved-or-expired) |
| 8 | per-human, gbrain, token without tier claim | BLOCK (no-tier) |
| 9 | per-human, gbrain, unknown tier string | BLOCK (no-tier) |
| 10 | per-human, gbrain, corrupt operator-tiers.yaml | BLOCK (hook-error-fail-closed) |

## Belt-and-suspenders (optional, founder-applied)

A load-time gate can additionally refuse to even SPAWN gbrain for a `user`-tier operator by chaining a tier check before `gbrain serve` in the `.mcp.json` gbrain wrapper. That edits `.mcp.json` (a **D-MAX** file) and is left to the founder; this hook (which blocks every gbrain tool call) is the complete gate on its own.

---

*gbrain is the one per-human surface that can't be gated server-side this sprint. This hook is the honest, local best-effort; the cost cap + credential-less brain are the real bounds.*
