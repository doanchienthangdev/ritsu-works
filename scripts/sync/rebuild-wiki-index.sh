#!/usr/bin/env bash
# scripts/sync/rebuild-wiki-index.sh — wrapper for /wiki index rebuild.
#
# Per spec.md v4.0 §0 B10 + sprint-plan.md Sprint 2. Invokes the
# `06-ai-ops/skills/wiki-sync/index-rebuild` skill via its CLI implementation
# at scripts/wiki-sync/rebuild-index.cjs.
#
# Designed for cron + CI use (Sprint 2: founder-triggered; cron entry deferred
# to v4.1 entry condition b in spec.md §8). Exit code 0 = success.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/wiki-sync/rebuild-index.cjs"

if [[ ! -f "$SCRIPT" ]]; then
  echo "ERROR: rebuild-index.cjs not found at $SCRIPT" >&2
  exit 1
fi

node "$SCRIPT" "$@"
