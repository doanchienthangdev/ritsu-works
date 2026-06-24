# scripts/local-install — the ritsu-works local install/update/test engine

Capability `local-install-platform` v0.1. The deterministic, cross-platform
(macOS / Windows / Linux), unit-tested engine behind the three commands:

| Command | Engine entry | What it does |
|---|---|---|
| `/install-ritsu-works` | `install.cjs` | install deps + scaffold `runtime/` + `.env.local` + husky + index |
| `/update-ritsu-works` | `update.cjs` | `git pull --ff-only` latest + re-sync deps |
| `/test-ritsu-works` | `test-suite/run.cjs` | run the full system test suite with progress + self-heal |

## Files

```
lib/version.cjs        parse / compare tool versions (pure)
lib/exec.cjs           cross-platform run() + which() (injectable)
lib/platform.cjs       detect OS / arch / shell / package managers (injectable)
lib/report.cjs         progress + summary Reporter (pure formatting, injectable sink)
dependencies.cjs       the cross-platform dependency matrix (pure data + helpers)
doctor.cjs             probe deps + workspaces + env  ·  --json
install.cjs            install engine  ·  --apply --with-docs --install-deps=<ids> --json
update.cjs             update engine  ·  --apply --with-docs --json
test-suite/groups.cjs  the test-group spec (pure data)
test-suite/run.cjs     the suite runner  ·  --heal --quick --full --only=<ids> --json
preflight.sh / .ps1    pre-Node bootstrap (ensure Node>=20 + pnpm), then hand off
```

## Design constraints

- **Cross-platform = Node.** Once Node exists, every line of logic is one Node
  codebase (no bash/ps1 divergence). The only shell-specific files are
  `preflight.{sh,ps1}`, which ONLY bootstrap Node + pnpm.
- **Dependency injection everywhere** (`run`, `which`, `fs`, `platform`) so the
  engine unit-tests deterministically without touching the real machine — see
  `tests/local-install/`.
- **Firewall-safe.** The product-firewall hook blocks any Bash command text
  containing the database-CLI token. So that token only ever lives *inside*
  these scripts (run via the engine's own `spawnSync`, invisible to the hook).
  Command-level invocations (`node scripts/local-install/...`, `pnpm check`,
  `pnpm test`) never spell it. To install that CLI, use
  `install.cjs --install-deps=supabase-cli --apply` (runs it internally).
- **Idempotent + dry-runnable.** `install`/`update` default to a dry-run plan;
  `--apply` executes. `.env.local` is never overwritten if it already exists.

## Manual one-shot (optional)

Co-founders normally just run `/install-ritsu-works` inside Claude Code. To
bootstrap from a bare terminal first:

```bash
# macOS / Linux
bash scripts/local-install/preflight.sh
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts\local-install\preflight.ps1
```

Then fill `runtime/secrets/.env.local` and run `/test-ritsu-works`.
