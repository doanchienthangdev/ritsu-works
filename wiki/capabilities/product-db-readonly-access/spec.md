# Capability spec — product-db-readonly-access (Door 2)

> **State: `operating`** since 2026-06-03 · pillar `06-ai-ops` · Tier-C decision `0647e301-4ad2-495f-806e-d17c3b130072`
> Promoted at Phase 8 from `.archives/cla/product-db-readonly-access/spec.md` (+ the local-only brainstorm `.archives/brainstorming/product-db-readonly-access-2026-06-02/`).

## 1. Problem

The Operating AI (`ritsu-works`) needs to answer behavioral and unit-economics questions about the product ("do paid users study more?", "model spend by tier", "activation by cohort") — but it must **never** touch the Product Supabase (`ritsu`) and must **never** see raw user PII. Read-only access to a production DB does **not** solve this: read-only protects integrity, not confidentiality, and a full read-replica clone would be a PII honeypot (`pseudonymized ≠ anonymized`; GDPR in-scope).

## 2. Architecture — "3 doors + a guard" (this capability = Door 2)

| Layer | What | Status |
|---|---|---|
| **L0 — guard** | `pre-tool-supabase-product` firewall-as-code: blocks any tool call targeting Product `ritsu`; treats `mcp__supabase-analytics__*` as `safe-mcp`. | enforced code (PR #204) |
| **Door 1** | bounded PII-stripping read **gateway** → read-replica (realtime KPIs). | future track |
| **Door 2** | **pseudonymized analytics copy** + read-only consumer MCP (broad diagnostics). | **operating (this capability)** |
| **Door 3** | action-MCP + HITL for all writes incl. blog. | future track |

The load-bearing principle: **the Operating AI literally cannot write to (or directly read) Product.** Even product-side setup (the `analytics_export.*` views, the salt, the export role) is applied by the **founder** (Tier D-MAX); `ritsu-works` only drafts the SQL. This is what makes the trust boundary real rather than honor-system.

## 3. Door 2 data path

```
Product `ritsu` (ixfvqxnohlmayzuesrrq)            ritsu-analytics (ddgbabvbfjrsznvzhizf, us-west-1)
─────────────────────────────────────             ────────────────────────────────────────────────
public.<table>                                     ext.<table>   (postgres_fdw foreign tables)
   │  analytics_export.<view>  ◄── founder D-MAX        │  IMPORT FOREIGN SCHEMA (analytics_export_ro)
   │  • uh(user_id) → user_hash (HMAC-SHA256,           ▼
   │    salt in analytics_secret.config, RLS-locked,  staging.<table>  (per-run landing)
   │    product-only, SECURITY DEFINER uh())            │  live.pii_canary() — array-aware, MUST = 0
   │  • enums ::text-cast in the view                   ▼  (else abort, keep last-good)
   │  • DROP email/name/content/free-text/JSONB       live.<table>   (atomic swap; re-GRANT to analytics_reader)
   ▼                                                    ▲
analytics_export_ro  (SELECT on the views only) ───────┘  nightly in-DB pg_cron `analytics-sync-nightly` 0 11 * * * UTC

Consumer:  ops role ──► mcp__supabase-analytics__{query,list_tables}  AS  analytics_reader (SELECT on live.* only)
```

Three properties never erode: **(a)** identity + content stay in Product forever (default-deny + `forbidden_content_tables` tripwire); **(b)** the salt is product-side only (forward-hash, never re-identify); **(c)** all actions/writes go through HITL (Door 3), never a raw Product write.

## 4. Components (as built)

- **C1 — consumer MCP** `mcp-server-analytics/` (separate package from `mcp-server/`; opposite security model — the **DB role is the boundary**). Connects as `analytics_reader` (LOGIN, SELECT on `live.*` only; read-only txn + statement_timeout at the role level). Tools: `query` (parameterized SELECT) + `list_tables`. Default-deny 6-role allowlist in `src/governance/role-allowlist.ts`.
- **C2 — dataset** 17 synced tables (PoC-3 + behavioral/billing/config core, brainstorm doc 17 §2). Canonical list = `knowledge/analytics-sync-contract.yaml` `synced_tables`. Content/identity tables excluded forever.
- **C3 — governance** `knowledge/analytics-sync-contract.yaml` (committed source of truth) + `governance/ROLES.md` (`analytics_reader` DB role + `analytics_affinity` allowlist) + `knowledge/manifest.yaml` (`etl_flows.analytics_sync_nightly`) + `external-sources.yaml` + `mcp-tools.yaml` + `.mcp.json` + `SOP-AIOPS-009-analytics-sync-contract`.
- **C4 — monitoring** `scripts/cross-tier/check-analytics-sync-health.cjs` (freshness + active canary → 2 KPIs + verdict + exit code) + 3 `alert-rules.yaml` rules. (Unattended delivery = infra follow-up; see §7.)
- **C5 — erasure** `SOP-CUSTOMER-023` `analytics_erasure_propagation` step (nightly full-replace auto-drop + force-resync).

## 5. Invariants (drift-protected)

`validate-analytics-readonly.cjs` (L2 critical, in `check-consistency.cjs` AND `.github` CI) enforces: **(1)** `synced_tables ∩ forbidden_content_tables = ∅`; **(2)** `consumer_allowlist == ANALYTICS_ALLOWED_ROLES` in `role-allowlist.ts`; **(3)** `mcp_server` registered in `.mcp.json`; **(4)** `read_surface_schema == 'live'` + both roles present. Plus the L3 `analytics-salt-product-only` (manual — product-side-enforced: salt never in an ops credential).

## 6. Sprints

| Sprint | What | PR |
|---|---|---|
| S1 | consumer MCP + `analytics_reader` role | #220 |
| S2 | governance registration (Tier C) | #221 |
| S3 | dataset 3 → 17 (founder D-MAX product views; array-aware canary; empty-safe sync) | #222 |
| S4 | monitoring + GDPR erasure | #223 |
| Phase 8 | this promotion → `operating` | (this PR) |

## 7. Scale, production-impact & monitoring

### 7.1 Sync mechanism at scale (the full-replace question)
`live.sync_one` is **full-replace** per table: pull the whole stripped view over FDW → canary → swap. `sync_all` runs in ONE transaction (pg_cron / single Management-API call), so all 17 swaps commit **atomically** — consumers never see a cross-table mix. The cost is **availability**: each table is `ACCESS EXCLUSIVE`-locked from its drop until the batch commit, so readers block for ~the sync duration (milliseconds now; minutes at scale).

Measured baseline (canonical machinery = `mcp-server-analytics/sql/analytics-machinery.sql`, real per-table timing via `_sync_runs.started_at`/`finished_at`): heaviest table `learning_units` (3.3k rows) ≈ **125ms**; whole batch ≈ 500ms; ~26k rows/s/table. Extrapolating, the heaviest table crosses a ~60–120s/table budget at ~1.6–3.2M rows ≈ **~15–25k users** — i.e. graduate **well before 100k users** (a naive linear extrapolation of full-replace to 100k users / ~35M rows gives **hours**, and would time out on free-tier).

**Roadmap (triggered by `_sync_runs` duration, not pre-built — avoid over-engineering at tiny scale):**
- **Tầng 0 (done / cheap, [A]):** real per-table duration in `_sync_runs` (the trigger signal). *Next-cheap:* a **view-indirection swap** (`live.<t>` = view over `live._data.<t>_vN`; build the new version lock-free, flip all 17 view pointers in one short txn) → atomic **and** non-blocking. Build when readers start to feel the lock.
- **Tầng 1 (at ~15–25k users):** **incremental** for the append-only logs (`ai_usage_logs`, `credit_transactions`, `learning_sessions`, `learning_units`) by `created_at`/`id` watermark + UPSERT; keep full-replace for small dims (`profiles`, config) = hybrid. Duration then scales with daily **change**, not total size. Caveat: incremental loses "erasure auto-drops" → add a periodic full-reconcile (anti-join drop vanished PKs) + keep the force-resync; update `SOP-CUSTOMER-023`. Canary unchanged (runs on the delta).
- **Tầng 2 (real scale):** managed ELT (dlt/Airbyte) or a warehouse + CDC. The security principles (stripped+hashed views, no content, salt product-side, contract-as-API, canary) carry over unchanged — only the plumbing swaps.

### 7.2 Production-DB impact
At current scale: **negligible** — each pull is a ~125ms `SELECT` on the stripped view (off-peak 11:00 UTC = US trough), `analytics_export_ro` is SELECT-only (can't write/lock-for-write), and a read takes only `ACCESS SHARE` (MVCC → does **not** block Product writes). At scale the concerns are (a) read CPU/IO + buffer-cache pressure, and (b) a long read transaction holding back Product VACUUM (xmin horizon → bloat). Mitigations: **incremental** (cuts the Product read to the daily delta — same fix as §7.1); the founder-applied **`statement_timeout` guard** on `analytics_export_ro` (`sprint4-product-side-guard.sql`, Tier D-MAX — caps a runaway scan, protects VACUUM); and eventually pointing the FDW at a Product **read-replica** so analytics never reads the primary (Door 1 territory).

### 7.3 Monitoring delivery (Bước 3 — Option 2, the Edge path)
`supabase/functions/analytics-sync-health/` (Deno) + `_shared/analytics-health.ts` (pure verdict logic, 15 unit tests): reads `live._sync_runs` AS the read-only `analytics_reader` (the canary already ran + logged during the sync), upserts the 2 KPIs to `ops.kpi_snapshots`, raises `ops.alerts` on breach, and posts the result **directly to Telegram every run** (a ✅/🟡/🔴 heartbeat — the alert-router backbone is unbuilt; direct delivery is the interim).

**DEPLOYED + LIVE (Gate B, 2026-06-03):** deployed to ritsu-ops (`--no-verify-jwt`; own `x-analytics-health-auth` header), secrets set (`ANALYTICS_READER_DB_URL` / `ANALYTICS_HEALTH_SECRET` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`), scheduled via **ops pg_cron + pg_net** `analytics-sync-health-daily @ 0 12 * * * UTC` (after the 11:00 UTC sync). **Verified end-to-end**: a fired `net.http_post` → function → fresh `ops.kpi_snapshots` rows. The cross-project read (ops Edge → analytics pooler as `analytics_reader`) works. Setup record: `.archives/.../sql/sprint4-gateB-cron.cjs`.

**ONE gap — Telegram delivery is dark until a real bot exists:** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `.env.local` were empty placeholders (`getMe` → token invalid). The function/cron/ops-writes all run; the `telegram()` send no-ops until the founder creates a bot via @BotFather + a channel, then sets the two secrets (`supabase secrets set --project-ref <ops> TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...`). Meanwhile, monitoring is fully recorded in `ops.kpi_snapshots`/`ops.alerts`; `check-analytics-sync-health.cjs` runs manually anytime.

### 7.4 Residuals
- **Same-org residual** — `ritsu-analytics` shares the Product org (free 2-project quota). Isolation pillars intact (separate project/DB/creds + product-side salt + pseudonymized + no content); account/org-level compromise is the residual. Flagged in the DPIA; revisit at scale.
- **Lawyer / DPIA** — founder-owned track (consulted directly).
- **Doors 1 & 3** — separate future capabilities.

## 8. References

- Contract: `knowledge/analytics-sync-contract.yaml` · Runtime: `SOP-AIOPS-009-analytics-sync-contract`
- Validator: `scripts/cross-tier/validate-analytics-readonly.cjs` · Health: `scripts/cross-tier/check-analytics-sync-health.cjs`
- Machinery (reproducible): `mcp-server-analytics/sql/analytics-machinery.sql` · Edge monitor: `supabase/functions/analytics-sync-health/` (+ `_shared/analytics-health.ts`, `tests/analytics-health.test.ts`)
- Product-side guard (founder D-MAX): `.archives/brainstorming/product-db-readonly-access-2026-06-02/sql/sprint4-product-side-guard.sql`
- Firewall: `.claude/hooks/runtime/{product-firewall.cjs,pre-tool-supabase-product.cjs}` (PR #204)
- Manifest: `knowledge/manifest.yaml` `etl_flows.analytics_sync_nightly` + `cross_cutting.tool_plane` `supabase-analytics`
- Brainstorm + all SQL (local-only): `.archives/brainstorming/product-db-readonly-access-2026-06-02/`
