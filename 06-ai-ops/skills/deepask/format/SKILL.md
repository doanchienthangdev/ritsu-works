---
name: format
description: deepask Format Engine — renders the format-agnostic synthesis IR into the requested --format artifact by REUSING existing renderer skills (no bespoke renderers). Dispatch-table architecture: each format = one row mapping to its reuse-skill (adding a format = a new row + reuse pointer). smartauto picks the best available format via scripts/deepask/format-select.cjs. Always writes canonical answer.md; rich formats degrade gracefully to answer.md + a note when a session skill is unavailable.
---

# deepask/format (capability `deepask` v1.0)

> The Format Engine. Consumes the synthesis IR (from `deepask/synthesize`, spec §5.1) and
> produces the artifact for `--format`. **Reuses existing skills — never rebuilds a renderer.**
>
> **Structure note (deviation from spec §4.1):** the spec drafted 12 *per-format* adapter
> folders. To stay under the resolver INDEX token hard-cap (~14k/15k; +12 catalog entries
> would breach it) and for maintainability, this is ONE umbrella skill with a **dispatch
> table**. Extensibility is preserved — adding a format = one new row + a reuse pointer.
> To be reconciled at Phase-8 promotion.

## When to use
- Called by `deepask/orchestrator` (final stage) after `completeness-critic` sets the IR verdict.

## Inputs
- The synthesis IR (verdict + sections/claims/tables/charts/diagrams/conflicts/coverage/sources).
- `--format` (one of the 12, or `smartauto`), `--depth`, the run slug.

## Process

### 1. Resolve the target format
- Explicit `--format=<x>` → use `<x>` directly.
- `--format=smartauto` (default) → `scripts/deepask/format-select.cjs` `selectFormat({intent}, DOC_FAMILY)` (classify `intent` from the question + IR; `available` = the formats built in this release — DOC_FAMILY through S4, ALL_FORMATS after S5). Returns `{format, reason, fellBack}`; record `reason` in `plan.json`.

### 2. Dispatch (doc family — Sprint 4)
| `--format` | reuse | how |
|---|---|---|
| `text` | native | flatten the IR (exec_summary + sections→claims, each with its citation) to plain text |
| `article` | native Markdown | the **canonical `answer.md`** — Pyramid prose, every claim with inline `[source-ref]`, a Conflicts section, a Freshness note, and a Coverage/Gaps section if PARTIAL. Always written regardless of `--format`. |
| `pdf` | `anthropic-skills:pdf` (portable) or `playbook-builder` (WeasyPrint, Mac-local) | render the article MD → PDF |
| `docx` | `anthropic-skills:docx` | IR sections/tables → Word |
| `pptx` | `anthropic-skills:pptx` | exec_summary → title; each section → a slide; tables/charts as slide objects |
| `xlsx` | `anthropic-skills:xlsx` | IR `tables[]` + metric rows → sheets (best for data/metric-heavy answers) |
| _visual: mermaid · chart · dashboard · html · interactive · canvas_ | _Sprint 5_ | _added as rows then_ |

deepask AUTHORS the concrete invocation of each reuse-skill (frames its inputs from the IR); the reuse-skill does the rendering.

### 3. Artifact layout (always)
Write to `.archives/deepask/<YYYY-MM-DD>-<slug>/`:
- **`answer.md`** — the canonical cited article (ALWAYS, regardless of `--format`).
- **`plan.json`** — decomposition + ResolverPlans + coverage matrix + smartauto `reason`.
- **`sources.json`** — the citation ledger (every `source-ref` with recipient_id, axis, authority, freshness, retrieved_at).
- **`<artifact>.<ext>`** — the rendered `--format` output (when not `text`/`article`).

### 4. Graceful degradation
If a reuse-skill is unavailable in the session (e.g., `anthropic-skills:pdf` absent, or Mac-local WeasyPrint missing), DO NOT fail the run: write `answer.md` + a note in `plan.json` (`format_degraded: {requested, reason, delivered: 'article'}`) and tell the operator "rendered as Markdown; <format> adapter unavailable this session." The canonical answer is never lost.

## Constraints
- **Reuse only** — no bespoke rendering engine. New format = new dispatch row + reuse pointer (+ add it to `format-select` availability when built).
- `answer.md` is always written (the durable, portable answer).
- No new content/claims at render time — the Format Engine only *re-presents* the IR (which already passed `citation-audit`); it never adds an uncited claim.

## HITL / cost
Tier A (rendering is local/in-session). Cost-bucket `ai-ops-deepask`. PDF/docx/pptx/xlsx via session skills (subscription).

## Tests (per spec §10)
`scripts/deepask/format-select.cjs` unit-tested (`tests/deepask/format-select.test.ts`, 23 cases — every intent × availability, fallback flag, validation). Skill-level (land per sprint): each doc adapter renders the IR → a valid artifact; **smartauto picks a sane format per intent**; **`answer.md` is always written**; the artifact dir layout is correct; **graceful-degrade path** writes answer.md + a note when a reuse-skill is missing.
