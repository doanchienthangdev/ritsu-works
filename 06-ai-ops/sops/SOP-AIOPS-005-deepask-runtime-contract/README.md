# SOP-AIOPS-005 — /deepask Runtime Contract

> The runtime contract for the `/deepask` supercommand (capability `deepask` v1.0).
> Authoritative flow: [`flow.yaml`](flow.yaml). Front-ends: `.claude/commands/deepask.md`
> + `06-ai-ops/skills/deepask/orchestrator/SKILL.md`.

## What this SOP governs

Every `/deepask "<q>"` invocation runs once through the **5-stage loop**:

1. **Stage 0 — budget pre-flight** — the resolver-budget accountant (`scripts/deepask/breaker-budget.cjs`) reserves the critic follow-up and degrades to an honest PARTIAL instead of a fabricated `no_coverage`.
2. **decompose** → MECE sub-needs, IA-type tagged.
3. **resolve** → one `ResolverPlan v1` per sub-need from `resolver-plan` (deepask has **zero routing of its own**).
4. **execute** → read `content_axis`; run `capability_axis` gated (`capability-gate.cjs`: auto-run Tier-A / surface Tier-B+ / refuse D-MAX); delegate the web leg to `deep-research`.
5. **synthesize** → Pyramid, **zero uncited claims** (`citation-audit.cjs`), authority-ranked, conflict-flagged, freshness-tagged.
6. **completeness-critic** → coverage matrix + live-probe → **COMPLETE | PARTIAL-with-honest-gaps**.
7. **format** → IR → artifact (`deepask/format` dispatch table; `format-select.cjs` smartauto) → `.archives/deepask/<date>-<slug>/`.
8. **observe** → `ops.deepask_runs` + `ops.deepask_coverage`.

## HITL

Tier **A** (read + synthesize). The only non-A surface is a **Tier-B+ capability leg**, which is **surfaced** for founder approval and **never auto-run**; a **D-MAX** capability is **refused** (deepask is not a create/modify surface).

## Always-on guards
Product-Supabase firewall (`metrics.*` only) · gbrain $100/mo cap · resolver 20-find/4h breaker · subscription billing · `--dry-run` = plan-only (still consumes breaker budget, labeled honestly).

## KPIs
`deepask.complete_verdict_rate` · `deepask.uncited_claim_rate` (target 0) · `deepask.breaker_trip_rate` (see `knowledge/kpi-registry.yaml`).

## v1.1 — image formats (gpt-image-2)
Two additional `--format` values render via OpenAI image generation: **`infographics`** (1 poster; `--orientation=landscape|portrait`) and **`img-slide`** (a **16:9** deck — `slides/NN-*.png` folder + combined `slides.pdf`). Pipeline: `deepask/image-compose` (IR → slide/poster plan → per-piece gpt-image-2 prompts, re-presenting only cited IR content) → `image-gen.cjs` → `slide-deck.cjs` (Pillow → 16:9 PDF). New flags: `--orientation`, `--img-quality` (cost dial), `--image-model` (default `gpt-image-2`), `--max-slides`, **`--max-cost-usd`** (cost circuit-breaker — REFUSE up front if the pre-gen estimate exceeds it; mirror of the resolver breaker). Image formats are **explicit-only** (never selected by `smartauto` — they spend OpenAI $). **Billing:** gpt-image-2 is outside the Claude subscription → `OPENAI_API_KEY` (out-of-subscription, like embeddings); logged to `ops.deepask_runs.metadata.image_gen` + `cost_usd`; gps soft cap `deepask-image-gen` (`governance/ROLES.md`). The canonical `answer.md` is always written alongside.

## v1.1.1 — extraordinary aesthetic + logo embed
Every visual artifact (code-rendered AND image-gen) clears the **`deepask/aesthetic`** bar (references omgkit `/design:good` as floor, exceeds it). Code-rendered visual formats embed the `--style` brand logo + favicon as base64 **data URIs** via `scripts/design-system/style-asset.cjs` (never a sibling-file path). See `SOP-AIOPS-007-design-system-runtime-contract`.
