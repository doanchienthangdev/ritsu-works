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

## 7. Honest follow-ups / residuals

- **Unattended alert delivery** — the `schedule-dispatcher` Edge Function (Deno) needs `ritsu-analytics` access (creds in the Edge env, a founder D-MAX-ish provisioning) to fire `check-analytics-sync-health.cjs` daily + raise `ops.alerts` → Telegram. Until then, run the health-check manually; the `alert-rules` arm automatically once KPI values flow to `ops.kpi_snapshots`.
- **Same-org residual** — `ritsu-analytics` shares the Product org (free 2-project quota). Isolation pillars intact (separate project/DB/creds + product-side salt + pseudonymized + no content); account/org-level compromise is the residual. Flagged in the DPIA; revisit at scale.
- **Lawyer / DPIA** — founder-owned track (consulted directly).
- **Doors 1 & 3** — separate future capabilities.

## 8. References

- Contract: `knowledge/analytics-sync-contract.yaml` · Runtime: `SOP-AIOPS-009-analytics-sync-contract`
- Validator: `scripts/cross-tier/validate-analytics-readonly.cjs` · Health: `scripts/cross-tier/check-analytics-sync-health.cjs`
- Firewall: `.claude/hooks/runtime/{product-firewall.cjs,pre-tool-supabase-product.cjs}` (PR #204)
- Manifest: `knowledge/manifest.yaml` `etl_flows.analytics_sync_nightly` + `cross_cutting.tool_plane` `supabase-analytics`
- Brainstorm + all SQL (local-only): `.archives/brainstorming/product-db-readonly-access-2026-06-02/`
