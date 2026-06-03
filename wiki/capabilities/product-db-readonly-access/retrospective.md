# Retrospective — product-db-readonly-access (Door 2)

> v1.0.0 · `operating` 2026-06-03 · 4 sprints (#220 → #223) + Phase 8 · pillar `06-ai-ops`

## Outcome

Door 2 delivers what it set out to: the Operating AI can run broad, pseudonymized behavioral / unit-economics diagnostics over Product-derived data (17 tables, joined on `user_hash`) through a governed read-only MCP — **without ever touching Product and without raw PII**. Proven end-to-end on real data (e.g. "AI spend by tier": pro $20.02 / plus $2.73 / free $0.87 over pseudonymized hashes), per-table PII canary `0`, nightly self-refresh.

## What went well

- **PoC-first de-risked the hard parts on real data before the full build** — FDW egress through the pooler, hash-preserving joins, the salt-product-side `uh()`, the canary, the nightly cron. By the time `/cla` ran, the architecture risk was low.
- **The DB role as the security boundary.** `analytics_reader` (SELECT on `live.*` only) is the boundary — a mirror-image of `supabase-ops` (service_role + app-layer guard). Simpler to reason about than an app-layer allowlist alone.
- **Contract-as-API.** `analytics-sync-contract.yaml` + `validate-analytics-readonly.cjs` (in `check-consistency` AND CI) make the privacy-critical facts (no content synced, allowlist in lockstep, MCP registered) drift-proof and deterministically checkable from the ops repo.
- **Enums cast `::text` in the product view** (S3) cleanly solved `IMPORT FOREIGN SCHEMA` failing on product enum types — no enum replication, categorical labels analytically lossless.
- **The firewall held under pressure.** When asked to self-apply the product views via the management token, the agent correctly refused (charter "refuse-without-question: any write to Product") and printed the SQL for the founder to paste — preserving the exact boundary the capability exists to enforce.

## What was hard / surprising

- **The D1 identifier-leak guard over-flagged.** A schema-wide column blocklist designed for user tables flagged benign config columns (`description`, `provider_id` on `ai_models`/`ai_providers`/`command_model_configs`). Fixed → D1 v2 scopes the "soft" names to `user_hash`-bearing views via a CTE. Lesson: a tripwire's "0 = clean" contract is only as good as its precision — scope checks to the surface they're meant to protect.
- **The array-aware canary gap.** The original canary scanned only scalar text; S3 synced `text[]` columns (`objectives`, `keywords`, `explorations_visited`, `commands_used`). Fixed → `live.pii_canary()` now unnests text arrays. Lesson: the safety net must cover exactly what you sync, not what you first imagined syncing.
- **The empty-table abort.** The PoC `sync_one` aborted on 0 rows ("keep last-good") — correct for re-syncs, wrong for the FIRST sync of a legitimately-empty table. Fixed → only abort 0-rows when `live` already had rows.
- **`information_schema.foreign_tables` column names** (`foreign_table_name`/`foreign_table_schema`, not `table_name`) — caught by the analytics-side pre-flight, which by design aborts cleanly at the gate before touching `sync_all`.
- **Cross-DB monitoring delivery** is the genuinely unfinished edge: the sync self-runs (in-DB pg_cron) but unattended *alerting* needs the Deno `schedule-dispatcher` to reach `ritsu-analytics`. Shipped the health-check + alert-rules; flagged delivery honestly rather than faking it.

## Key decisions

- **Same-org `ritsu-analytics`** (free 2-project quota) over a separate paid org — accepted residual, isolation pillars intact, flagged in DPIA.
- **Founder owns the lawyer/DPIA track** directly; the agent proceeds on the technical track and surfaces the gate at each dataset broadening.
- **Phase-8 declared `operating` with the delivery follow-up documented** rather than gating the milestone on an alerting refinement — the core read path is fully operational.

## Lessons (portable)

1. **Read-only ≠ confidential.** Protect privacy by *absence* (strip + hash + exclude), not by *guarding* a full copy.
2. **The boundary must be un-bypassable by design** — a `REF !== PROD` tripwire in every script + the L0 firewall + "founder applies product-side" together make "the ops AI can't write to Product" structurally true, not a promise.
3. **Verify the safety net on real data** — the canary self-test on a real `text[]` column caught nothing wrong but proved the net actually fires.

## Follow-ups (tracked in the spec §7)

- Wire unattended alert delivery (schedule-dispatcher → ritsu-analytics).
- Doors 1 (read-gateway) and 3 (action-MCP) as separate capabilities.
- Revisit same-org residual at scale.
