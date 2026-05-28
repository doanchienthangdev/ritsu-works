#!/usr/bin/env bash
#
# Playbook PDF builder — env preset + invocation
#
# Wraps the proper Python interpreter + DYLD_FALLBACK_LIBRARY_PATH env var
# so build_pdf.py can find WeasyPrint native libs. Single source of truth
# for the playbook build environment (captured 2026-05-28 after manual
# v4.2 rebuild surfaced the discovery cost).
#
# Composed by: 06-ai-ops/skills/playbook-builder/build (Step 6)
# Direct invocation: bash scripts/playbook/build.sh (manual debug)
#
# Env overrides:
#   PLAYBOOK_PYTHON — path to Python with WeasyPrint installed (default /opt/anaconda3/bin/python3)
#   PLAYBOOK_BREW_LIB — path to brew libs dir (default /opt/homebrew/lib)
#

set -euo pipefail

PYTHON="${PLAYBOOK_PYTHON:-/opt/anaconda3/bin/python3}"
BREW_LIB="${PLAYBOOK_BREW_LIB:-/opt/homebrew/lib}"
PLAYBOOK_ROOT=".archives/ritsu-handoff-bundle/playbook"

# Sanity checks
if [ ! -x "$PYTHON" ]; then
  echo "[playbook] PYTHON not found at $PYTHON" >&2
  echo "[playbook] Install anaconda3 (https://www.anaconda.com/download) OR set PLAYBOOK_PYTHON to a Python with WeasyPrint" >&2
  exit 2
fi

if [ ! -d "$BREW_LIB" ]; then
  echo "[playbook] Brew libs dir missing at $BREW_LIB" >&2
  echo "[playbook] Install: brew install pango cairo gdk-pixbuf glib harfbuzz libffi" >&2
  exit 2
fi

if [ ! -f "$PLAYBOOK_ROOT/build_pdf.py" ]; then
  echo "[playbook] build_pdf.py missing at $PLAYBOOK_ROOT" >&2
  echo "[playbook] Expected file: $PLAYBOOK_ROOT/build_pdf.py" >&2
  echo "[playbook] If you cloned fresh, .archives/ is gitignored — the playbook bundle is local-only" >&2
  exit 2
fi

# Export DYLD BEFORE importing WeasyPrint (WeasyPrint dlopens native libs at import time).
# This is the env captured 2026-05-28 after manual v4.2 rebuild surfaced the discovery cost.
export DYLD_FALLBACK_LIBRARY_PATH="${BREW_LIB}:${DYLD_FALLBACK_LIBRARY_PATH:-}"

# Verify WeasyPrint importable in this Python (with DYLD set)
if ! "$PYTHON" -c 'import weasyprint' 2>/dev/null; then
  echo "[playbook] WeasyPrint not importable in $PYTHON" >&2
  echo "[playbook] Install: $PYTHON -m pip install weasyprint markdown" >&2
  echo "[playbook] Or check brew libs at $BREW_LIB are installed: brew install pango cairo gdk-pixbuf glib harfbuzz" >&2
  exit 2
fi

cd "$PLAYBOOK_ROOT"

echo "[playbook] Building PDF with $PYTHON..."
"$PYTHON" build_pdf.py
