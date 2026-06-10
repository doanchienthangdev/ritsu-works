---
name: write
description: |
  The /write content-writing platform — write any of 27+ content types for any
  medium, in any distilled author's voice, de-AI'd to read as human, enriched with
  /image + /dataviz, rendered to md/html/pdf/docx, and optionally pushed. Umbrella
  dispatcher over write/orchestrator (write), write/distill (capture a voice), and
  write/humanize (de-AI). Capability write-platform v0.1. Tier A.
---

# write — the universal content-writing platform

The single front door for producing content in `ritsu-works`. Model-agnostic, voice-driven,
humanizer-gated. This umbrella parses the subcommand and dispatches; the work lives in the
sub-skills.

## Dispatch

| Invocation | Skill | What it does |
|---|---|---|
| `/write "<request>" [flags]` | `write/orchestrator` | Write content. The default path. |
| `/write distill <slug> --ref-src=<refs>` | `write/distill` | Distill an author's voice into a reusable artifact. |
| `/write humanize <text\|file>` | `write/humanize` | Run only the de-AI + voice pass on existing text. |
| `/write authors` | (this skill) | List distilled author styles (`knowledge/author-styles.yaml`). |
| `/write types` | (this skill) | List content types + their mediums (`knowledge/write-types.yaml`). |
| `/write templates` | (this skill) | List structure templates (`knowledge/write-templates.yaml`). |
| `/write frameworks` | (this skill) | List the 100 writing formulas (`knowledge/write-frameworks.yaml`; reference `06-ai-ops/write/FRAMEWORKS.md`). |

For the listing subcommands, read the registry and print a compact table (id · category ·
one-line · mediums/status). They are read-only (Tier A).

**`--framework=<id>`** applies a writing FORMULA (e.g. `pas`, `aida`, `feynman-technique`,
`scqa`) as the structural backbone — composable with `--type`/`--template`/`--author-style`.
`plan.cjs` resolves it into `brief.md`; the orchestrator writes to that structure. The 100
are ranked by fit to Ritsu (learning-science core) + the GTM content engine.

**Research + grounding** (v0.4): `--research=off|auto|deep` (external — `deep` = the
`deep-research` skill, web fan-out → verify → cited) and `--grounding=auto|off|deepask|wiki|brain|all`
(internal Ritsu material via `/deepask`, wiki RAG, gbrain). Both run at the data-collection step
and **shape the outline**, not just the prose. See `write/research`.

**Long-form** (v0.4): the types **book · novel · film-script · research-paper · article-series ·
course** (`longform: true`) are NOT written in one pass — they run the `write/longform` pipeline:
lock a **consistency bible** (single source of truth) → outline parts → **draft in PARALLEL**
(a Workflow, parts blind to each other) → **continuity pass** → assemble → one humanize pass. This
keeps characters/world/timeline/terminology/thesis/evidence/voice consistent across the whole work.
Per-type bibles + mechanisms: `06-ai-ops/write/longform/`.

## The model (why it's built this way)

- **Type → medium → voice → structure → length** are resolved deterministically from three
  split registries (`scripts/write/plan.cjs` ties them into a `brief.md` the writer drafts from).
- **Voice** is a reusable, github-shared artifact (`06-ai-ops/write/author-styles/<slug>/`),
  distilled once and replayed forever — and it doubles as the humanizer's voice-calibration sample.
- **De-AI is a deterministic gate**, not a vibe: `scripts/write/humanize/scan.cjs` scores the
  draft (vendored 44-type detector + banned-phrase + readability); the draft that ships passes.
- **Enrichment + output + push reuse existing platforms** (`/image`, `/dataviz`, translate's
  renderer) — no duplicate spend paths.

## Governance
Tier A runtime. Drafting + humanizing are in-session (subscription). Only `/image` + `/dataviz`
enrichment is out-of-band spend, each capped by its own breaker; the run's `--max-cost-usd`
(default 2.00) is the overall guard. `--push` to a public surface is HITL Tier C (surfaced, not
auto-sent). Cost-bucket `ai-ops-write`. Runtime contract:
`06-ai-ops/sops/SOP-AIOPS-015-write-runtime-contract/flow.yaml`. Spec:
`wiki/capabilities/write-platform/spec.md` (after Phase 8 promotion).
