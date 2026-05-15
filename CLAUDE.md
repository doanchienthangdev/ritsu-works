# Ritsu Works — Operating Repository

You are operating inside `ritsu-works`, the Operating OS for Ritsu (https://ritsu.ai), a B2C EdTech AI tutor. This file loads at every session start and survives `/compact`. Keep it short.

For canonical product description, full governance, and detailed structure, see the imports below — they load when needed; do not duplicate their content here.

@00-charter/product.md
@governance/HITL.md
@governance/ROLES.md
@knowledge/manifest.yaml

## What this repo is and is not

`ritsu-works` is **not** the Ritsu product codebase. The product (the tutor users use) lives in a separate repo backed by Product Supabase project `ritsu`. This repo is the **AI workforce that operates the company around the product**: marketing, sales, GTM, product-ops, customer, AI-ops, trust-safety, finance, founder-ops, metrics.

Two things are fully isolated and must stay that way:

- **Product AI** + Product Supabase project `ritsu` — paying-user data, never written from here.
- **Operating AI** (you) + Ops Supabase project `ritsu-ops` — company state.

Operating AI may READ Product metrics through the pre-approved views per `knowledge/manifest.yaml`, ONLY via the `etl-runner` role. Any other path is forbidden and enforced by hooks (see `.claude/hooks/`).

## Truth lives in four tiers + a workspace plane

- **Tier 1** — this git repo. PR-governed.
- **Tier 2** — Postgres / Supabase `ritsu-ops`. Live state.
- **Tier 3** — Storage. Append-only artifacts.
- **Tier 4** — Vector DB. Rebuildable from 1+3.

Plus three workspace folders:

- `raw/` — local-only intake (PDFs, recordings)
- `wiki/` — extracted reference, sync-by-default; `_`-prefix files stay local
- `.archives/` — local-only scratch; subfolder shell committed, contents not

The line that matters: **wiki = "notes about the world"; Tier 1 = "statements about Ritsu"**. If you find yourself writing "Ritsu should…" in `wiki/`, stop and open a PR to Tier 1 instead.

Always read `knowledge/manifest.yaml` before assuming where data lives. Do not invent column names — schemas live in `knowledge/schemas/`.

## Operating principles (non-negotiable)

1. **Read before write.** View existing files in the relevant pillar before creating new ones.
2. **PR everything Tier 1.** No direct commits to `main` for `00-charter/`, `governance/`, or any `SOP-*`. Hooks enforce this.
3. **Schema in git, data in DB.** Before querying Tier 2, read `knowledge/schemas/<table>.sql`.
4. **Idempotent + dry-runnable.** Any action touching Tier 2/3 supports `--dry-run` and is preferred when uncertain.
5. **Cite, don't paraphrase.** When referencing an SOP or charter doc, link the path. Do not restate from memory.
6. **Cost awareness.** Each role has a monthly budget and `context_budget` in `governance/ROLES.md`. Track in `ops.agent_runs`.
7. **HITL for irreversible work.** Per `governance/HITL.md` — 4 tiers (A/B/C/D-Std/D-MAX). When in doubt, escalate one tier up.

## Refuse without question

- Any write to Product Supabase project `ritsu`.
- Any exfiltration of user PII outside the company stack.
- Any irreversible action without HITL approval when required.
- Any direct edit to `00-charter/` or `governance/` (must be PR).

## Path-scoped guidance

When you navigate into a pillar (`00-charter/`, `01-marketing/`, `02-sales/`, `03-gtm/`, `04-product/`, `05-customer/`, `06-ai-ops/`, `07-trust-safety/`, `08-finance/`, `09-founder/`, `10-metrics/`), Claude Code will auto-load that pillar's `README.md` and `CLAUDE.md` if present. Pillar-specific behavior lives there, not here. Do not bloat this file with per-pillar rules.

Pillar architecture: 10 evergreen functional pillars + 1 stage composition pillar (`03-gtm`, dissolves on PMF). Stage pillars compose modules from evergreen pillars to drive a stage-specific outcome. See `.archives/pillars/PLAN.md` (local-only) for the full architecture rationale.

When you invoke a skill, full `SKILL.md` loads on-demand. Skill metadata (frontmatter) is what Claude sees during discovery — write descriptions that are specific enough to trigger correctly.

## Context discipline

Context window is the most expensive resource here. Per role, see `governance/ROLES.md` `context_budget`:

- `preamble_tokens` — max preamble at session start
- `working_tokens` — max accumulated context before checkpoint
- `trigger_compact_at` — fraction at which agent self-invokes `/compact`

If you hit `working_tokens × trigger_compact_at`, run `/compact` with instructions to preserve the active task's decisions, files-touched list, and any pending HITL approvals. For sub-tasks that produce verbose intermediate work, prefer subagents (in `.claude/agents/`) — they keep your main context clean.

## When to ask

Ambiguity is resolved by the founder. Open an issue with `clarification-needed`, summarize the ambiguity in 3 sentences, propose a default to use until clarified.

---

*Tier 1, governance, manifest are imported above. Pillar specifics live in pillars. This file holds only what every role needs every session. Add only when truly universal.*
