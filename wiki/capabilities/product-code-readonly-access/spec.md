# Capability Spec: product-code-readonly-access

> The CODE sibling of `product-db-readonly-access` (DATA). A governed, **read-only**
> mechanism that makes the Product source **code** repo (`github.com/doanchienthangdev/ritsu`)
> a first-class, resolver-registered **source-of-truth** that `/deepask` and
> `/think mckinsey` can ground product questions in.

- **Capability id:** `product-code-readonly-access`
- **Version:** 1.0.0 (v1 — live-read) · **State:** operating
- **Pillar:** 06-ai-ops · **Cost-bucket:** `ai-ops-skill-library` (zero recurring; reads are subscription/`gh`)
- **HITL:** Tier A runtime (read/synthesize). Tier C to land (touches `knowledge/` + firewall posture).
- **Decision:** `ops.decisions` slug `product-code-readonly-access-v1`.

## 1. Problem

The source-of-truth for "what the product actually IS" is `00-core/product.md` — hand-maintained, verified against the live **site**, and therefore **drifting** (it literally carries a `last_verified_live_site` date). The actual **code** is a stronger ground truth: real pricing logic, the real activity-type set, the real gating thresholds. But ritsu-works had **no governed mechanism** to read the product code, and **nothing in the resolver** pointed at it — only DATA paths (`supabase-product-readonly`, `ritsu-analytics-readonly`) and the `github-repo` entry (which is ritsu-**works**, not the product). Asked: "can we let ritsu-works read the ritsu GitHub repo and put it in the resolver?"

## 2. Why it's safe (and safer than the DATA path)

The firewall (`pre-tool-supabase-product`) blocks product **DATA/PII** (Supabase project `ritsu`); it does **not** — and need not — block reading product **code**. Source code has **no user PII**; the only sensitive content is **secrets**, and:

- Reading the **committed REMOTE tree** is **secret-free by construction** — secrets are gitignored, so they never reach GitHub. Verified 2026-06-04: of **2,413** committed files, the only secret-ish are `apps/{web,admin}/.env.example` **templates** (no real values).
- The **local clone** (`/Users/doanchienthang/omg/ritsu`) *does* carry real secrets (`apps/web/.env.local`) — so it is explicitly **out of bounds**; this source reads the remote only.

So this capability is **lower-risk than `product-db-readonly-access`** (which had to strip PII): here the safe surface exists by construction.

## 3. Selected approach — HYBRID, B-first

| | **v1 — live `gh`/`git grep`** (this ship) | **v1.1 — gbrain code-graph** (planned, cost-gated) |
|---|---|---|
| How deepask reads | `gh api` / `gh search code` / shallow read-only clone + `git grep` on the remote, at query time | `mcp__gbrain__{search,code_blast,code_flow,code_refs,code_def,callers,callees}` over a synced snapshot |
| Freshness | **live** (always current) | snapshot + freshness tag |
| Cost / risk | **zero** | embeddings + code-graph parse vs the `$100/mo` gbrain cap → **cost-gated** |
| Best for | exact current values, presence checks, keyword search | semantic + structural ("where is X computed", "what calls Y", trace a flow) |

**v1 ships the live mode** (zero-cost, always-fresh, registered, deepask-routable). **v1.1 (gbrain) is designed but NOT enabled** — ingestion is a gbrain WRITE + a cost event; it requires a founder-approved scoped dry-run.

Runtime: `/deepask "<product q>"` → decompose → resolver-plan routes a sub-need to `external-source/ritsu-product-source` → `deepask/execute` authors a **read-only** `gh`/`git grep` call → synthesize a cited answer (`file:line` + commit/freshness). Firewall unchanged: code-read OK, Supabase-DATA still blocked.

## 4. Component changes (v1)

- `knowledge/external-sources.yaml` — NEW `ritsu-product-source` (`source_type: code-repo-readonly`, read-only invoke, 6-role `role_scope`, secret-gate + read-only notes). → resolver recipient `external-source/ritsu-product-source` (catalog + INDEX regenerated).
- `knowledge/product-code-source-contract.yaml` — NEW committed contract (repo, `read_only`, `read_surface: committed-remote-tree`, `secret_denylist`, `read_modes`, `consumer_allowlist`, `deferred`).
- `scripts/cross-tier/validate-product-code-source.cjs` — NEW L2 validator (read-only invariant; secret-gate; external-source registered + `source_type` + status; `consumer_allowlist ↔ role_scope` no-drift; ≥1 live active mode). Wired into `check-consistency.cjs` **and** the CI workflow (two-edit rule).
- `tests/product-code-source.test.ts` — All-Edge on `validateContract`.
- `knowledge/capability-registry.yaml` — this entry. `wiki/capabilities/product-code-readonly-access/spec.md` (this file).

## 5. Acceptance

- `validate-product-code-source.cjs` green; `pnpm check` clean; CI green.
- `external-source/ritsu-product-source` discoverable in the resolver (deepask/mckinsey routable, default-deny 6-role scope).
- The contract's typed fields (`read_only`, `repo.write_forbidden`, `read_surface`, `secret_denylist`) are **validator-enforced** so the *contract* can't silently drift. **Honesty note:** this enforces the **declared policy**, not the **runtime act** — v1 does NOT machine-block a `git push` / `gh pr` to the product repo (the firewall blocks Supabase DATA only); the enforcing **hook write-block is deferred (§6.2)**. v1's read-only-ness rests on policy + the read-only invoke-patterns + `GITHUB_TOKEN` scope + role discipline, and crucially adds **no new write path**.
- No new DB table / migration. No safety-hook edit. No gbrain ingestion (no cost incurred).

## 6. Deferred (founder-gated — explicitly NOT in v1)

1. **gbrain v1.1 ingestion** — `sources_add` + `sync_brain` the committed tree (scoped to `apps/` + `packages/` + `supabase/`, secret-denylist applied) → enables the `gbrain-code-graph` read mode. **Gate:** scoped cost dry-run (1 package) + founder go (Tier B write + cost vs `$100/mo` cap). Back-of-envelope: ~2,413 files / ~9.8 MB; embeddings ≈ cents; code-graph parse cost **unmeasured** → hence the dry-run.
2. **Hook write-block hardening** — extend `pre-tool-supabase-product` (or a new pre-bash hook) to **BLOCK** any `git push` / `gh pr create|merge` / write `gh api` targeting `doanchienthangdev/ritsu`. v1 is safe without it (this capability adds only a READ source — no new write path), but the explicit block is the right hardening. **Gate:** editing a safety hook is Tier C/D-Std → founder.
3. **SOP-AIOPS-010** runtime contract (symmetric to SOP-AIOPS-009) — deferred to v1.1.

## 7. References

- Sibling: `product-db-readonly-access` (DATA, Door 2) — `wiki/capabilities/product-db-readonly-access/spec.md`.
- Firewall: `.claude/hooks/pre-tool-supabase-product.{md,runtime/*.cjs}` (DATA-only; code-read passes).
- Contract: `knowledge/product-code-source-contract.yaml`. Recipient: `knowledge/external-sources.yaml#ritsu-product-source`.
- Brainstorm/decision: in-session 2026-06-04; `.archives/cla/product-code-readonly-access/`.
