---
name: deepask
description: Federated retrieval + capability-execution + cited synthesis over the ENTIRE internal IA. Zero-routing pure consumer of resolver-plan. Decompose → resolve → execute/fan-out → synthesize → completeness-critic → format. Returns a Pyramid, 100%-cited, authority-ranked, conflict-aware, freshness-tagged answer in 1 of 12 formats, OR an honest no-coverage gap + remedy. Internal-first (web leg delegated to deep-research). Tier A runtime (Tier-B+ legs surfaced, never auto-run).
argument-hint: "\"<question>\" [--format=<...>] [--style=<name>] [--orientation=landscape|portrait] [--img-quality=low|medium|high] [--max-slides=N] [--max-cost-usd=N] [--image-model=<id>] [--sources=<...>] [--depth=quick|standard|deep|exhaustive] [--dry-run]"
---

# /deepask

> Thin orchestrator over the `deepask/*` skill suite (`06-ai-ops/skills/deepask/`). Owns flag
> parsing; delegates ALL routing to `resolver-plan` (deepask has ZERO routing of its own — no
> parallel source-map, ever). Capability spec: `wiki/capabilities/deepask/spec.md` (Phase-8
> promotion target; current `.archives/cla/deepask/spec.md`). Tier C decision
> `ops.decisions[861f8eb4-6572-4df5-b1cc-44aac0a7b014]`.

## Implementation status (built incrementally per sprint-plan.md)

| Sprint | Status | Surface |
|---|---|---|
| S1 | merged (#165) | command + `orchestrator` (resolver-budget accountant) + `decompose` + `execute` (READ-only legs) + migration 00045 |
| S2 | merged (#166) | `synthesize` (Pyramid + citation guardrail + authority + conflict + freshness + adversarial-verify) + `completeness-critic` (coverage matrix + MECE + live-probe + honest-gap verdict) |
| S3 | merged (#167) | `execute` capability-RUN leg via `capability-gate.cjs` (Tier-A auto / Tier-B+ surface / D-MAX refuse) + gbrain-cap + `deep-research` delegation → **full 5-stage loop end-to-end** |
| S4 | merged (#168) | Format Engine (`deepask/format` umbrella + dispatch table) — **doc family** (text·article·pdf·docx·pptx·xlsx) + `smartauto` via `format-select.cjs` |
| S5 | merged (#169) | Format Engine — **visual adapters** (mermaid·chart·dashboard·html·interactive·canvas); `smartauto` default flipped to `ALL_FORMATS`; `artifact-path.cjs` layout helper → **all 12 formats live** |
| **S6** | **merged** | 3 KPIs (`complete_verdict_rate`/`uncited_claim_rate`/`breaker_trip_rate`) + `SOP-AIOPS-005-deepask-runtime-contract` + `ai-ops-deepask` cost-bucket + **Phase-8 promotion → `operating`** (spec/retro → `wiki/capabilities/deepask/`) |
| **v1.1 (extend)** | **merged** | 2 image formats `infographics` + `img-slide` (gpt-image-2, `--style`-aware) — new skill `deepask/image-compose` + helpers `scripts/deepask/{image-spec,image-cost,image-gen,slide-deck}.cjs`; new flags `--orientation`/`--img-quality`/`--image-model`/`--max-slides`/`--max-cost-usd`. No migration (image params + cost in `metadata` jsonb). `/cla extend deepask`. |
| **v1.1.1 (extend)** | **this PR** | **EXTRAORDINARY aesthetic bar** across ALL visual outputs — new skill `deepask/aesthetic` (references omgkit `/design:good` as floor, exceeds it; art-direction block for image-gen + polish checklist for code-render) wired into `deepask/format` §2.6 + `deepask/image-compose`. **+ LOGO FIX:** new `scripts/design-system/style-asset.cjs` embeds the `--style` brand logo as a base64 **data URI** (fixes `--format=html --style=ritsu` missing-logo / path bug). `/cla extend deepask`. |

**deepask is `operating` as of 2026-05-30** (capability-registry `state: operating`). Full 5-stage loop + 12-format engine, breaker-safe + citation-disciplined, a zero-routing consumer of resolver-plan. Runtime contract: `SOP-AIOPS-005-deepask-runtime-contract`.

## Flags

| Flag | Values | Effect |
|---|---|---|
| `--format` | **inline** (default) · text·article·pdf·docx·pptx·xlsx·mermaid·chart·dashboard·html·interactive·canvas·**infographics**·**img-slide**·smartauto | **Omitted → `inline`:** rendered **straight into the conversation** (no files). **Any explicit value** (incl. `smartauto`) → **file mode**: artifact dir (`answer.md` + `plan.json` + `sources.json` + rendered artifact). **`infographics`** (v1.1) → ONE poster PNG (gpt-image-2). **`img-slide`** (v1.1) → a **16:9** deck: `slides/NN-*.png` folder **+** combined `slides.pdf`. Image formats are **explicit-only** (never picked by `smartauto` — they spend OpenAI $). |
| `--style` | `<design-system name>` · **omitted → plain (no style)** | render in a named DESIGN.md design system (capability `design-system-styling`). **ORTHOGONAL to `--format`**. Visual + **image** formats → tokens drive the look (for image formats the style coupling is strongest: tokens + DESIGN.md prose → the brand "style block" injected into every gpt-image-2 prompt by `deepask/image-compose`); non-visual (inline/text/article/xlsx) → honest no-op. **Brand logo** is embedded into code-rendered visual artifacts as a base64 **data URI** via `scripts/design-system/style-asset.cjs` (self-contained — no broken paths). Resolved via `scripts/design-system/resolve-style.cjs`; non-interactive cache-miss hard-fails. Every visual output clears the **EXTRAORDINARY** `deepask/aesthetic` bar. E.g. `--format=img-slide --style=ritsu`. See `SOP-AIOPS-007`. |
| `--orientation` | `landscape` (default) · `portrait` | **infographics only** — poster canvas (landscape 3:2 = 1536×1024, portrait 2:3 = 1024×1536). `img-slide` ignores it (always 16:9). |
| `--img-quality` | `low` · **medium** (default) · `high` · `auto` | **image formats only** — gpt-image `quality` = the **primary cost dial** (low ≈ $0.01–0.02/img, medium ≈ $0.04–0.06, high ≈ $0.17–0.25; estimates — verify at platform.openai.com/pricing). |
| `--max-slides` | int (default `8`) | **img-slide only** — deck size cap (cost control); overflow sections recorded in `image-plan.json.dropped[]`, never silently dropped. |
| `--max-cost-usd` | number (default `1.00`) | **image formats only** — cost **circuit-breaker**: if the pre-gen estimate exceeds it, REFUSE up front (mirror of the resolver breaker), report estimate-vs-cap + suggest lowering `--img-quality`/`--max-slides`. |
| `--image-model` | model id (default `gpt-image-2`) | **image formats only** — the OpenAI image model (parameterized for robustness). |
| `--sources` | csv of {pillars,ops,metrics,wiki,brain,external,scratch} · **auto** (default) | constrain which IA types deepask may touch (passed to resolver-plan as a filter) |
| `--depth` | quick·**standard** (default)·deep·exhaustive | sub-need bound (≤6 standard / ≤12 deep) + parallel fan-out + adversarial-verify votes (0/1/2/3) |
| `--dry-run` | flag | show decomposition + **real** ResolverPlans + predicted coverage + cost estimate; perform zero reads/runs/writes EXCEPT one `ops.deepask_runs` dry-run row. For image formats, `--dry-run` ALSO composes the `image-plan.json` + writes per-piece prompt sidecars (`*.prompt.txt`) but makes **NO** gpt-image API call (no spend). NB: dry-run DOES call resolver-plan → consumes resolver-breaker budget → labeled honestly. |

## Dispatch (the 5-stage loop)

0. **Pre-flight (orchestrator):** the **resolver-budget accountant** — read the latest `session_finds_count`, call `scripts/deepask/breaker-budget.cjs` `computeBreakerBudget({sessionFindsCount, subNeedCount, ...})`; if not viable → emit honest PARTIAL up front (`gap_reason='breaker_budget'`), never a fabricated `no_coverage`; if `capped_to_budget` → reduce depth and tell the operator.
1. `deepask/decompose` — question → MECE sub-needs (≤6/≤12), IA-type A/B/C/D tags.
2. `deepask/orchestrator` → per sub-need call `resolver-plan` (`/resolver plan` / `mcp__supabase-ops__resolver_find`) → `ResolverPlan v1`.
3. `deepask/execute` — parallel subagents: **READ** `content_axis` (S1); **RUN** Tier-A `capability_axis` + surface Tier-B+ + delegate web→`deep-research` (S3). Authors the concrete read-only SQL / `wiki_ask` question / skill params, **grounded in `grounding_ref`/`columns_hint`; never invents column names**.
4. `deepask/synthesize` (S2) — Pyramid + citation + authority + conflict + freshness + adversarial-verify → format-agnostic IR.
5. `deepask/completeness-critic` (S2) — coverage matrix + MECE + live-probe → COMPLETE | PARTIAL+remedy; ≤1 bounded follow-up.
6. Format → **`inline` (default, no `--format`):** render the answer **into the conversation** (Pyramid + inline citations + Sources list; no files). **File mode (explicit `--format`):** artifact in `.archives/deepask/<YYYY-MM-DD>-<slug>/` (`answer.md` + `plan.json` + `sources.json` + rendered artifact). **`--style=<name>` (if given):** resolve once via `design-system` (`resolve-style.cjs`) and pass the tokens as **design context** into the format's renderer — no new dispatch row; non-visual formats → no-op (see `06-ai-ops/skills/deepask/format/SKILL.md` §1.5 + `SOP-AIOPS-007`).
   - **Image branch (`infographics` · `img-slide`, v1.1):** `deepask/image-compose` turns the IR + the resolved `--style` tokens into an `image-plan.json` (per-piece gpt-image-2 prompts carrying the brand style block + the EXACT cited IR text). The orchestrator runs `image-cost.estimateRunCost` → `checkCostBudget(--max-cost-usd)` (REFUSE up front if over; always show the estimate), then `scripts/deepask/image-gen.cjs` per piece → `images/`/`slides/` PNGs, and for `img-slide` `scripts/deepask/slide-deck.cjs` → `slides.pdf` (cropped to true 16:9). `answer.md` is ALWAYS written alongside (the image artifact never replaces the cited text). Flow: **analyze IR → split into slides/poster → compose per-piece prompts per --style → run gen → assemble PDF.**
7. **Observe** → `ops.deepask_runs` (1) + `ops.deepask_coverage` (N) — written in **both** modes (DB audit/learning rows are not "output files"; `artifact_path` is NULL in inline mode); founder edit/reject → `ops.corrections`.

## Guards (always-on)
- **Firewall:** product data only via `metrics.*` (hook `pre-tool-supabase-product`); never `product.*`.
- **gbrain:** reads under the $100/mo cap; prefer `search`/`recall` over `think`.
- **resolver breaker:** 20-find/4h/session — budgeted by the accountant (Stage 0).
- **Billing:** subscription in-session; OpenAI API key for out-of-band/embeddings **and image generation** (gpt-image-2 is outside Claude's subscription — same legitimate use as `text-embedding-3-small`; key in `runtime/secrets/.env.local`). Image spend is estimated + gated by `--max-cost-usd`, logged to `ops.deepask_runs.metadata.image_gen` + `cost_usd` (cost-bucket `ai-ops-deepask`).
- **HITL:** runtime = Tier A (read/synthesize); any Tier-B+ capability leg is **surfaced**, never auto-run.

## Boundary
`/deepask` federates + **composes** `/brain` (gbrain) + `/wiki ask` + supabase-query + `/think` frameworks, delegating the web leg to `deep-research`. It does NOT route (that's `resolver-plan`) and does NOT create/modify (that's `/cla` · `/evolve` · `/update`). Internal-first.
