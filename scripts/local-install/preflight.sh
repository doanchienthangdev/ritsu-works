#!/usr/bin/env bash
# ============================================================================
# scripts/local-install/preflight.sh  (macOS / Linux)
# ----------------------------------------------------------------------------
# The ONE pre-Node bootstrap: ensure Node >= 20 + pnpm exist, then hand off to
# the cross-platform Node engine (install.cjs). Everything past this point is
# Node, so this file stays tiny and shell-specific by necessity.
#
# Usage (from the repo root, before opening Claude Code if you prefer a manual
# bootstrap — otherwise just run /install-ritsu-works inside Claude Code):
#   bash scripts/local-install/preflight.sh
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

say() { printf '\033[36m▶\033[0m %s\n' "$1"; }
ok()  { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn(){ printf '\033[33m⚠\033[0m %s\n' "$1"; }

OS="$(uname -s)"
say "ritsu-works preflight — OS: $OS"

# ---- detect a package manager ---------------------------------------------
PM=""
if   command -v brew    >/dev/null 2>&1; then PM="brew"
elif command -v apt-get >/dev/null 2>&1; then PM="apt"
elif command -v dnf     >/dev/null 2>&1; then PM="dnf"
elif command -v pacman  >/dev/null 2>&1; then PM="pacman"
elif command -v zypper  >/dev/null 2>&1; then PM="zypper"
elif command -v apk     >/dev/null 2>&1; then PM="apk"
fi
[ -n "$PM" ] && ok "package manager: $PM" || warn "no package manager detected"

node_major() { node -v 2>/dev/null | sed 's/v//' | cut -d. -f1; }

# ---- ensure Node >= 20 -----------------------------------------------------
if command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge 20 ] 2>/dev/null; then
  ok "Node $(node -v) present"
else
  say "installing Node.js (LTS)…"
  case "$PM" in
    brew)   brew install node ;;
    apt)    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs ;;
    dnf)    sudo dnf install -y nodejs ;;
    pacman) sudo pacman -S --noconfirm nodejs npm ;;
    zypper) sudo zypper install -y nodejs ;;
    apk)    sudo apk add nodejs npm ;;
    *)      warn "Install Node >= 20 from https://nodejs.org (or use nvm/fnm), then re-run."; exit 1 ;;
  esac
  command -v node >/dev/null 2>&1 || { warn "Node still missing after install — install manually."; exit 1; }
  if [ "$(node_major)" -lt 20 ] 2>/dev/null; then
    warn "Installed Node is < 20 ($(node -v)). Use nvm/fnm to get LTS >= 20, then re-run."; exit 1
  fi
  ok "Node $(node -v) ready"
fi

# ---- ensure pnpm -----------------------------------------------------------
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm $(pnpm -v) present"
else
  say "enabling pnpm (corepack)…"
  if corepack enable pnpm 2>/dev/null && corepack prepare pnpm@latest --activate 2>/dev/null; then
    ok "pnpm ready (corepack)"
  else
    npm install -g pnpm@latest && ok "pnpm ready (npm -g)"
  fi
fi

# ---- hand off to the Node engine ------------------------------------------
say "running install engine…"
node scripts/local-install/install.cjs --apply

echo ""
ok "Preflight done. Next: fill runtime/secrets/.env.local, then run /test-ritsu-works inside Claude Code."
