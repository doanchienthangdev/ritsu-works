# Runbook: gbrain doctor failure / connection / dual-pool / budget

> What to do when `gbrain doctor` reports unhealthy, MCP fails to load, or operations error out mid-session. Capability `gbrain-operational-brain` v1.0.

## Symptom matrix

### S1 — `mcp__gbrain__*` tools missing from Claude Code session

**Cause:** Either `.mcp.json` doesn't have the gbrain entry, OR the wrapper script failed during Claude Code startup, OR gbrain binary path changed.

**Diagnostic:**
```bash
# Check .mcp.json has gbrain entry
grep -A 6 '"gbrain"' /Users/doanchienthang/ritsu-works/.mcp.json

# Check binary path
ls -la ~/.bun/bin/gbrain

# Run wrapper standalone
/Users/doanchienthang/ritsu-works/scripts/pre-budget-check.sh
echo "exit code: $?"
```

**Resolution:**
- Wrapper exit 1 → cap breached (>$150); check `metrics.gbrain_cost_daily` view + open PR to raise cap
- Wrapper exit 0 + GBRAIN_BUDGET_MODE=read_only → cap reached ($100-150); WRITES disabled until cap raised or month rollover
- Binary missing → reinstall: `bun install -g github:garrytan/gbrain`
- Full restart: ⌘Q Claude Code → re-launch

### S2 — `gbrain doctor` reports unhealthy

**Common causes (per install record D7):**

| Issue | Cause | Resolution |
|---|---|---|
| ECONNREFUSED IPv6 | Direct DB host IPv6-only; founder's machine has no IPv6 route | Set `GBRAIN_DIRECT_DATABASE_URL` env var to session pooler URL (port 5432); see install record D3 |
| "tenant/user not found" | Pooler URL host prefix wrong (e.g. aws-0 instead of aws-1) | Query Supabase Management API for actual project pooler config; sed-replace in `.env.local` |
| Schema version mismatch | gbrain schema migrated upstream | `gbrain migrate up` (Tier C — schema_migrate is Tier C per HITL Appendix A) |
| RLS event trigger missing | Manual SQL bypassed gbrain init | `gbrain init` (re-runs setup; idempotent) |
| Embedding provider failing | OPENAI_API_KEY missing/invalid | Verify `runtime/secrets/.env.local` has OPENAI_API_KEY; never log the key (see install record Issue 1 lesson) |

### S3 — Mid-session write returns error from gbrain MCP

**Cause:** Wrapper allowed MCP load when cost was <$100, but cost crossed $100 during the session AND a runtime per-tool check kicked in.

**Diagnostic:**
```sql
-- Check current rolling 30d spend
SELECT SUM(spend_usd) AS total
FROM metrics.gbrain_cost_daily
WHERE day > current_date - interval '30 days';
```

**Resolution:**
- If >$100: legit graceful degrade; wait month rollover OR founder PR raises cap
- If <$100 but still erroring: false positive in runtime check; restart MCP server (`⌘Q` + re-launch) to re-read wrapper output

### S4 — Dream cycle fails

**Cause:** `gbrain-maintainer` cron handler returned error.

**Diagnostic:**
```sql
SELECT id, state, error, state_payload
FROM ops.agent_runs
WHERE persona_slug = 'gbrain-maintainer'
  AND started_at > now() - interval '7 days'
ORDER BY started_at DESC;
```

**Resolution per failure mode:**
- `budget_exhausted`: dream cycle paused for the month; resume next month
- `mcp_unreachable`: check gbrain serve process; resolve via S1/S2
- `schema_mismatch`: Tier C ceremony to migrate (`gbrain migrate up`)
- `partial_completion`: dream cycle completed some phases; remaining phases run next night (idempotent)

### S5 — L1/L2/L3 invariant fails

**Cause:** Drift between Tier 1 declarations and Tier 4 brain state (or between cross-link columns in Tier 2 and brain pages).

**Resolution:** Per `SOP-AIOPS-002-cross-tier-consistency` standard flow:
1. Check `ops.consistency_checks WHERE invariant_id LIKE 'gbrain%' AND state='failed'`
2. For each, inspect `drift_description` + `proposed_fix_diff` (if auto-fix available)
3. Apply fix via Tier B PR (per `hitl_tier` in cross-tier-invariants.yaml)

### S6 — Supabase project paused (Free tier 7-day inactive)

**Cause:** Per install record D2, Sydney project pauses after 7 days no activity.

**Resolution:**
- Open Supabase dashboard https://supabase.com/dashboard/project/qqlggvkcynhjiwgomgma
- Click "Restore project"
- ~2 min downtime; no data loss
- Resume `gbrain serve`

## Escalation

If runbook resolutions fail OR symptom not listed:
1. Capture `gbrain doctor` full output
2. Capture last 20 lines of `~/.bun/bin/gbrain` stderr if process running
3. Capture `ops.agent_runs` rows for `gbrain-maintainer` from last 7d
4. Emit `ritsu.gbrain.consistency_drift` event with payload + Telegram founder alert (Tier C)

## References

- Install record (canonical setup state): `.archives/brainstorming/gbrain-integration-2026-05-23/02-install-record.md`
- Wrapper script: `scripts/pre-budget-check.sh`
- gbrain CLI source: https://github.com/garrytan/gbrain
- Supabase project: `ritsu-brain` ref `qqlggvkcynhjiwgomgma` region `ap-southeast-2`
