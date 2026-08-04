---
description: |
  Install everything ritsu-works needs to run on THIS machine (macOS / Windows /
  Linux), auto-detecting the platform + package manager, with live progress.
  Installs dependencies, scaffolds runtime/secrets/.env.local, sets up git hooks,
  then guides you to fill credentials and run /test-ritsu-works. Capability
  local-install-platform v0.1 — thin orchestrator over scripts/local-install/.
argument-hint: "[--with-docs] [--dry-run]"
---

# /install-ritsu-works

You (Claude) are the install orchestrator. A co-founder has cloned `ritsu-works`
and wants it running locally. Drive the deterministic engine in
`scripts/local-install/`, handle the per-platform / privileged bits with
judgment, and **show progress at every step**.

> **Firewall rule (critical):** never put the literal database-CLI token in a
> Bash command — the product-firewall hook fails closed on it. The engine keeps
> that token inside its scripts. To install that CLI, use
> `node scripts/local-install/install.cjs --install-deps=supabase-cli --apply`
> (it runs the install internally). Everything else (`pnpm`, `node`, `git`,
> `gh`, `brew`, `apt`, `winget`) is fine to run directly.

## Tier
**A** — local, reversible, no money, no external publish, no Product Supabase, no
company-DB writes. Privileged installs (`sudo`, package managers) are surfaced to
the user; never silently escalate.

## Flow

### Step 0 — Ensure Node + pnpm (the only pre-Node bit)
The engine is Node, so Node must exist first.
1. Run `node --version`. If it errors or prints `< v20`:
   - Detect the platform package manager and install Node LTS:
     - macOS: `brew install node` (or guide to nvm/fnm if brew is absent)
     - Linux: `sudo apt-get install -y nodejs` / `sudo dnf install -y nodejs` / `sudo pacman -S --noconfirm nodejs npm` (if the packaged Node is < 20, use nvm/fnm)
     - Windows: `winget install -e --id OpenJS.NodeJS.LTS` (or choco/scoop)
   - Or, as a one-shot, run the preflight: `bash scripts/local-install/preflight.sh` (macOS/Linux) / `powershell -ExecutionPolicy Bypass -File scripts\local-install\preflight.ps1` (Windows).
2. Run `pnpm --version`. If missing: `corepack enable pnpm && corepack prepare pnpm@latest --activate` (fallback `npm install -g pnpm@latest`).

### Step 0.5 — Owner or co-founder? (multi-user)
Ask (or infer from `--profile`): **is this an OWNER install or a CO-FOUNDER (admin/user) install?**
- **Owner** (the founder's own machine): full keys incl. `service_role`. Profile `owner` (default).
- **Co-founder** (admin/user tier): a **per-human** install — they authenticate with a
  personal Supabase credential and NEVER get `service_role`/Stripe/bot tokens. Profile `per-human`.

A co-founder must FIRST be enrolled by an owner (3 helpers automate it):
1. **Owner** runs `/users add <email> --tier=admin|user` (the operators.yaml PR), then
   `node scripts/multi-user-auth/invite.cjs <email> --tier=admin` → creates their Supabase
   Auth identity + `ops.operators` row via the broker.
   - If `invite.cjs` fails with a stale/expired owner token (the token is refreshed only by
     the MCP booting per-human at the **main root**), it **auto-reseeds** a fresh owner session
     (needs `SUPABASE_SERVICE_KEY`; a new session is created, nothing is revoked). Force it up
     front with `--reseed` (or `--reseed=<your-owner-email>` if you have 2 owner mailboxes).
2. **Owner** then runs `node scripts/multi-user-auth/mint.cjs <email>` — the **DEFAULT,
   prefetch-proof delivery**. It writes a **0600 file containing a token-based enrollment
   COMMAND** (no url). `cat` it and send the single `node …enroll.cjs …` line to the co-founder
   through any channel.
   > **Why not just forward the magic-link?** Chat/email/SafeLinks previews auto-OPEN URLs to
   > build a link-preview, which CONSUMES the single-use magic-link → the co-founder's `enroll`
   > then sees `#error=access_denied` ("already used"). A token COMMAND has no url for a preview
   > to prefetch. The raw magic-link `invite.cjs` prints is a documented **FALLBACK** only.
3. **Co-founder** installs with `--profile=per-human` (Step 3), fills `SUPABASE_URL`+`ANON`
   (Step 4), then pastes the command they were sent:
   `node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<at>` → it seeds
   their credential file and redeems (invited→active) in one shot.
   (Fallback path: `enroll.cjs "<magic-link>"` — only if the owner forwarded a raw link.)

Carry the chosen profile into Steps 3–4 below. When unsure, ask; default to `owner`.

### Step 1 — Probe the machine
Run `node scripts/local-install/doctor.cjs`. This reports the platform, every
dependency (present/version/missing), workspace install state, and env wiring.
Show the user the report.

### Step 2 — Install missing system dependencies
For each **required** or **recommended** dep the doctor flagged missing:
- Run the per-platform install command the doctor printed (handle `sudo`
  password prompts by letting the user enter them; do not suppress prompts).
- For the **Supabase CLI** specifically (recommended), run it through the engine
  so the firewall isn't tripped:
  `node scripts/local-install/install.cjs --install-deps=supabase-cli --apply`
- **feature** deps (python/ffmpeg/bun) are optional — install only if the user
  wants the matching capability (PDF / /voice / gbrain). Mention them, don't force.

### Step 3 — Run the deterministic core
Run `node scripts/local-install/install.cjs --apply` (add `--with-docs` if the
user passed `--with-docs`; add **`--profile=per-human`** for a CO-FOUNDER install —
this scaffolds `.env.local` from `.env.per-human.example`, the god-key-free template,
instead of `.env.example`). This streams `[i/N]` progress for:
1. ensure pnpm  2. install root deps (frozen)  3. install supabase-ops MCP deps
4. install analytics MCP deps  5. scaffold `runtime/` + `.env.local`
6. **generate `.mcp.json`** (per-machine, portable — for per-human this WRITES an
   ops-only, shell-free, absolute-path config that boots on Windows; for owner it's
   left untouched if present)  7. husky  8. refresh resolver index.

Relay the progress to the user as it runs. If a workspace install fails,
re-run that workspace's `pnpm install` (the engine already falls back from
`--frozen-lockfile` to a loose install).

> If `--dry-run` was passed, run `install.cjs` WITHOUT `--apply` first and show
> the plan; only proceed to `--apply` on confirmation.

### Step 4 — Guide the env (branch on profile)
The scaffold created `runtime/secrets/.env.local` from the profile's template (or
left an existing one untouched).

**OWNER install** — tell the user:
> **Edit `runtime/secrets/.env.local`** and fill at least:
> - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (your ritsu-ops project)
> - `MCP_CALLER_ROLE=founder` for interactive sessions
> - LLM keys are optional (subscription-only mode works without them)
>
> See `.env.example` for the full annotated list and the 3 access modes.

**CO-FOUNDER (per-human) install** — tell the user:
> **Edit `runtime/secrets/.env.local`** (scaffolded from `.env.per-human.example`) and:
> - Fill `SUPABASE_URL` + `SUPABASE_ANON_KEY` (public values — ask the owner). These are the ONLY Supabase values you need.
> - **Do NOT add `SUPABASE_SERVICE_KEY`** — you don't have one and don't need it (per-tier RLS is your access).
> - `RITSU_AUTH_MODE=per-human` is already set; leave `MCP_CALLER_ROLE` unset (ignored in per-human mode).
> - `RITSU_OPERATOR_REFRESH_TOKEN_FILE` was already pinned to your clone's absolute path by the installer — don't touch it.
>
> Then complete enrollment. The owner sends you ONE command line — the DEFAULT, prefetch-proof path. Paste it exactly (byte-for-byte; don't retype long tokens):
> ```
> node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<at>
> ```
> It seeds your credential file (`runtime/secrets/.operator-refresh.json`) and redeems (invited→active) in one shot. Run it **promptly** — the access token lives ~1h; if redeem 401s, start Claude Code once (the MCP refreshes the token) then re-run the printed follow-up command.
> Fallback (only if the owner forwarded a RAW magic-link): `node scripts/multi-user-auth/enroll.cjs "<magic-link>"` — do NOT open the link in a browser first (single-use). If it errors `access_denied`/"already used", a chat/email preview consumed it → ask the owner to run `mint.cjs` and send the token command instead.
> The installer already wrote a Windows-portable `.mcp.json` (ops-only, git skip-worktree). Finally: fully restart Claude Code and approve the MCP server.
>
> See `.env.per-human.example` + SOP-AIOPS-017 for the full enrollment flow.

### Step 5 — Hand off
Tell the user clearly:
> ✅ Install complete. Next:
> 1. Fill `runtime/secrets/.env.local` (above).
> 2. Run **`/test-ritsu-works`** — it runs the full system test suite and tells
>    you when ritsu-works is verified ready.

## Self-heal
If any step fails, diagnose from the engine's output and the doctor report, fix
the root cause (re-install a workspace, install a missing tool, fix PATH), and
re-run that step. Don't report success until Step 3 completes cleanly.

## Engine reference
- `scripts/local-install/doctor.cjs --json` — structured probe
- `scripts/local-install/install.cjs --apply [--with-docs] [--install-deps=<ids>] [--json]`
- Full design: `scripts/local-install/README.md`; contract: `06-ai-ops/sops/SOP-AIOPS-016-local-install-runtime-contract/flow.yaml`
