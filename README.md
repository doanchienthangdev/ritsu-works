# ritsu-works

Operating OS for [Ritsu](https://ritsu.ai) — the AI-Native company that runs around the Ritsu product.

This repo is **not** the Ritsu product. The product (the AI tutor users talk to) lives in a separate repository. This repo is the workforce that operates the company across 11 pillars: charter, marketing, sales, GTM (stage), product-ops, customer, AI-ops, trust-safety, finance, founder, metrics.

> **If you are an AI agent:** start with [`CLAUDE.md`](./CLAUDE.md) and then [`knowledge/manifest.yaml`](./knowledge/manifest.yaml). Do not search anywhere else first.
>
> **If you are a human:** start with [`00-charter/product.md`](./00-charter/product.md) to align on what Ritsu is, then read `CLAUDE.md` to understand how the workforce operates.

## Status

**v0.2 — May 2026 (post pillar architecture v1.0.1 restructure).** Foundation in place: agent context (`CLAUDE.md`), knowledge contract (`knowledge/manifest.yaml`), product charter (`00-charter/product.md`), governance (`governance/HITL.md`, `governance/ROLES.md`), AI-Ops infrastructure (`06-ai-ops/skills/`, `06-ai-ops/sops/`).

Pillar structure (11 pillars, 6 DEEP at this stage, 3 LITE, 2 skeleton):

```
00-charter/      — vision, brand voice, founder profile           [maintenance]
01-marketing/    — brand, content engine, ICP                      [LITE]
02-sales/        — pricing, conversion funnel, free→paid           [LITE]
03-gtm/          — STAGE pillar: customer funnel to PMF (100 paying who love) [DEEP]
04-product/      — build loop, user-listening, wedge discovery     [DEEP]
05-customer/     — success, onboarding, support, retention, feedback, data [DEEP]
06-ai-ops/       — the OS itself (SOP engine, MCP, hooks, memory)  [DEEP]
07-trust-safety/ — DMCA, GDPR, hallucination triage                [skeleton]
08-finance/      — Stripe, runway, invoicing                       [skeleton]
09-founder/      — cognition, charter, HITL flow, weekly review, health, learning [DEEP]
10-metrics/      — KPI registry, dashboards, alerting, PMF instrumentation [DEEP]
placeholders/    — i18n, enterprise-sales, vn-compliance, IR, people-ops [files only]
```

Next iterations: SOP runtime contract (`06-ai-ops/01-sop-engine/`), first 7 operational SOPs (Phase 5), Telegram HITL bot.

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
