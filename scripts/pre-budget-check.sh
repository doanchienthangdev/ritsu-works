#!/bin/bash
# ============================================================================
# scripts/pre-budget-check.sh
#
# Capability: gbrain-operational-brain v1.0 (Sprint 5 / Tier C)
# Tier C decision: ops.decisions[5014456d-7526-4ba2-9c58-005166193864]
# Hard-cap Option B (graceful degrade) per founder Phase 4 selection 2026-05-24.
#
# Pre-MCP-load budget gate. Invoked by .mcp.json gbrain entry BEFORE
# `gbrain serve` runs.
#
# Behavior matrix:
#   spend < $80      → exit 0; load MCP normally
#   $80  <= spend < $100  → exit 0; load MCP + log alert (cron emits
#                            ritsu.gbrain.budget_breach Tier B)
#   $100 <= spend < $150  → exit 0; load MCP with GBRAIN_BUDGET_MODE=read_only
#                            env var set; gbrain MCP server reads this and
#                            blocks WRITE tools (put_page, add_link,
#                            update_page, dream_cycle_manual, etc). READS
#                            continue. (Hard-cap Option B core behavior.)
#                            Cron emits ritsu.gbrain.budget_breach Tier C.
#   spend >= $150    → exit 1; MCP load FAILS entirely. Founder PR to
#                            governance/ROLES.md to raise gbrain-maintainer
#                            cap OR wait until next month rollover.
#
# Fail-open on transient errors: if the cost query fails (DB unreachable,
# network blip, missing env), exit 0 without setting GBRAIN_BUDGET_MODE.
# Rationale: brain READS are zero marginal cost after first embedding; we'd
# rather over-allow READs than block legit operations on transient failures.
# WRITE-side enforcement still kicks in if the .mcp.json wrapper sees the
# env var on next invocation.
#
# Reversibility: trivial — delete this script + revert .mcp.json gbrain entry.
# ============================================================================

set -uo pipefail

# Defaults — override via env if needed
GBRAIN_BUDGET_CAP="${GBRAIN_BUDGET_CAP:-100}"
GBRAIN_BUDGET_ALERT_THRESHOLD="${GBRAIN_BUDGET_ALERT_THRESHOLD:-80}"
GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD="${GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD:-150}"
RITSU_OPS_URL="${RITSU_OPS_URL:-}"
RITSU_OPS_SERVICE_KEY="${RITSU_OPS_SERVICE_KEY:-}"

# Diagnostic log destination (stderr; gbrain serve will capture in MCP logs)
log() {
  echo "[pre-budget-check] $*" >&2
}

# --- Fail-open path: missing env ---
if [ -z "$RITSU_OPS_URL" ] || [ -z "$RITSU_OPS_SERVICE_KEY" ]; then
  log "WARN: RITSU_OPS_URL or RITSU_OPS_SERVICE_KEY not set; fail-open (allow MCP load)"
  exit 0
fi

# --- Query rolling 30d gbrain spend via metrics.sum_gbrain_cost_rolling RPC ---
# RPC + underlying view created by supabase/migrations/00037_metrics_gbrain_cost_daily_view.sql
# (Sprint 3 PR #102; hotfixed in v1.0.1 patch for actual column names —
# ops.cost_attributions uses task_kind LIKE 'gbrain.%' convention, not cost_bucket).
SPEND_RESPONSE="$(curl -fsS \
  -X POST \
  -H "apikey: ${RITSU_OPS_SERVICE_KEY}" \
  -H "Authorization: Bearer ${RITSU_OPS_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -H "Content-Profile: metrics" \
  -d '{"days_back": 30}' \
  "${RITSU_OPS_URL}/rest/v1/rpc/sum_gbrain_cost_rolling" \
  2>/dev/null || echo "")"

# Extract spend; fail-open on parse error
SPEND="$(echo "$SPEND_RESPONSE" | grep -oE '[0-9]+\.?[0-9]*' | head -1)"
if [ -z "$SPEND" ]; then
  log "WARN: failed to query rolling 30d spend (response='$SPEND_RESPONSE'); fail-open"
  exit 0
fi

log "rolling 30d gbrain spend: \$${SPEND}; cap: \$${GBRAIN_BUDGET_CAP}; hard-block: \$${GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD}"

# --- Tier matrix ---
# Use awk for float comparison (bash builtins only handle integers)
if awk -v s="$SPEND" -v c="$GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD" 'BEGIN{exit !(s >= c)}'; then
  # >= $150: hard block
  log "BLOCK: spend \$${SPEND} >= hard-block threshold \$${GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD}; MCP load FAILS"
  log "       Founder must open governance/ROLES.md PR to raise cap OR wait for month rollover"
  exit 1
elif awk -v s="$SPEND" -v c="$GBRAIN_BUDGET_CAP" 'BEGIN{exit !(s >= c)}'; then
  # $100 <= spend < $150: graceful degrade (read-only mode)
  log "READ-ONLY MODE: spend \$${SPEND} >= cap \$${GBRAIN_BUDGET_CAP}; setting GBRAIN_BUDGET_MODE=read_only"
  log "                WRITES blocked: put_page/add_link/update_page/dream_cycle_manual/etc"
  log "                READS continue: search/get_page/list_pages/traverse_graph/etc"
  export GBRAIN_BUDGET_MODE=read_only
  exit 0
elif awk -v s="$SPEND" -v c="$GBRAIN_BUDGET_ALERT_THRESHOLD" 'BEGIN{exit !(s >= c)}'; then
  # $80 <= spend < $100: alert + allow
  log "ALERT: spend \$${SPEND} >= alert threshold \$${GBRAIN_BUDGET_ALERT_THRESHOLD}; allowing MCP load"
  log "       Tier B alert emitted by nightly cron (gbrain-consistency-nightly)"
  exit 0
else
  # spend < $80: normal
  log "OK: spend \$${SPEND} < alert threshold \$${GBRAIN_BUDGET_ALERT_THRESHOLD}; allowing MCP load"
  exit 0
fi
