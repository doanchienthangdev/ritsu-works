# ritsu-works

Operating OS for [Ritsu](https://ritsu.ai) — the AI-Native company that runs around the Ritsu product.

This repo is **not** the Ritsu product. The product (the AI tutor users talk to) lives in a separate repository. This repo is the workforce that operates the company: marketing, sales, content, customer success, finance, compliance, and the AI workforce itself.

> **If you are an AI agent:** start with [`CLAUDE.md`](./CLAUDE.md) and then [`knowledge/manifest.yaml`](./knowledge/manifest.yaml). Do not search anywhere else first.
>
> **If you are a human:** start with [`00-charter/product.md`](./00-charter/product.md) to align on what Ritsu is, then read `CLAUDE.md` to understand how the workforce operates.

## Status

**v0 scaffold — May 2026.** Three files exist: the agent context (`CLAUDE.md`), the knowledge contract (`knowledge/manifest.yaml`), and the product charter (`00-charter/product.md`). Everything else is planned.

The next iterations will add:
1. `governance/` — ROLES, HITL, BUDGET, SECRETS
2. `00-charter/` — vision, mission, values, brand_voice, glossary
3. `05-ai-ops/` — first because it builds the workforce that builds everything else
4. `01-growth/`, `02-product/`, `03-delivery/`, `04-backoffice/`, `06-trust-safety/`
5. `skills/`, `.claude/agents/`, `workflows/`, `mcp/`
6. `knowledge/schemas/` — first migrations

## Architecture in one diagram

Four tiers of canonical company truth, plus a workspace plane for transient material:

```
Tier 1 — Canonical          → git (this repo)        → identity, strategy, SOPs
Tier 2 — Operational        → Supabase (ritsu-ops)   → live state
Tier 3 — Events & Artifacts → Supabase Storage       → append-only logs
Tier 4 — Derived            → Vector DB + caches     → rebuildable

Workspace plane (transient):
  raw/        → local-only intake (PDFs, recordings, exports)
  wiki/       → extracted reference knowledge (synced; underscore = local)
  .archives/  → local-only scratch (shell committed, contents ignored)
```

Operating Supabase (`ritsu-ops`) is **separate** from Product Supabase (`ritsu`). The Operating AI cannot harm a paying user.

The full contract lives in [`knowledge/manifest.yaml`](./knowledge/manifest.yaml).

## How to work in this repo

Every change to Tier 1 (this repo) goes through a PR. Direct commits to `main` are reserved for trivial fixes by the founder. Agents open PRs; humans (or other agents with reviewer privileges) merge them.

Branch protection, required reviews, and HITL rules will be formalized in `governance/HITL.md`.

## License

Private. Do not fork or redistribute.
