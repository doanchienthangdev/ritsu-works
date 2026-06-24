# ============================================================================
# scripts/local-install/preflight.ps1  (Windows / PowerShell)
# ----------------------------------------------------------------------------
# The ONE pre-Node bootstrap on Windows: ensure Node >= 20 + pnpm exist, then
# hand off to the cross-platform Node engine (install.cjs).
#
# Usage (from the repo root, in PowerShell):
#   powershell -ExecutionPolicy Bypass -File scripts\local-install\preflight.ps1
# (or just run /install-ritsu-works inside Claude Code).
# ============================================================================
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

function Say($m)  { Write-Host "▶ $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "✓ $m" -ForegroundColor Green }
function Warn($m) { Write-Host "⚠ $m" -ForegroundColor Yellow }

Say "ritsu-works preflight — Windows"

function Have($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# ---- detect a package manager ---------------------------------------------
$pm = $null
if     (Have winget) { $pm = "winget" }
elseif (Have choco)  { $pm = "choco" }
elseif (Have scoop)  { $pm = "scoop" }
if ($pm) { Ok "package manager: $pm" } else { Warn "no package manager (winget/choco/scoop) detected" }

# ---- ensure Node >= 20 -----------------------------------------------------
$nodeOk = $false
if (Have node) {
  $major = (node -v).TrimStart("v").Split(".")[0] -as [int]
  if ($major -ge 20) { Ok "Node $(node -v) present"; $nodeOk = $true }
  else { Warn "Node $(node -v) is < 20 — upgrading" }
}
if (-not $nodeOk) {
  Say "installing Node.js (LTS)…"
  switch ($pm) {
    "winget" { winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements }
    "choco"  { choco install nodejs-lts -y }
    "scoop"  { scoop install nodejs-lts }
    default  { Warn "Install Node >= 20 from https://nodejs.org, then re-run."; exit 1 }
  }
  Warn "If 'node' is not found in this session, open a NEW terminal (PATH refresh), then re-run."
  if (-not (Have node)) { exit 1 }
  Ok "Node $(node -v) ready"
}

# ---- ensure pnpm -----------------------------------------------------------
if (Have pnpm) {
  Ok "pnpm $(pnpm -v) present"
} else {
  Say "enabling pnpm (corepack)…"
  try { corepack enable pnpm; corepack prepare pnpm@latest --activate; Ok "pnpm ready (corepack)" }
  catch { npm install -g pnpm@latest; Ok "pnpm ready (npm -g)" }
}

# ---- hand off to the Node engine ------------------------------------------
Say "running install engine…"
node scripts/local-install/install.cjs --apply

Write-Host ""
Ok "Preflight done. Next: fill runtime\secrets\.env.local, then run /test-ritsu-works inside Claude Code."
