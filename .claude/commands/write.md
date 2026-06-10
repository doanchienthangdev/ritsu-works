---
name: write
description: |
  Write any content type (27+: blog · social · ad · email · video-script · article ·
  research · paper · essay · memo · story · speech · …) for any medium, in any distilled
  author's voice (e.g. seth-godin, david-ogilvy), de-AI'd to read as a human wrote it,
  enriched with /image + /dataviz where they raise quality, rendered to md/html/pdf/docx,
  and optionally pushed (gdrive/notion/social). `/write distill` captures a new author's
  voice from reference sources into a reusable, github-shared artifact. Tier A; per-run
  --max-cost-usd breaker; thin orchestrator over the `write` umbrella skill.
argument-hint: "\"<request>\" [--type --medium --author-style --template --mode --length --out --image --dataviz --humanize --ref --push --style --lang --dry-run] | distill <slug> --ref-src=<refs> | authors | types | templates | humanize <text|file>"
---

# /write — capability `write-platform` v0.1

Front-end for the universal content-writing platform. Parses the subcommand + flags, drives the
`write` umbrella skill (`06-ai-ops/skills/write/SKILL.md`), reports the result.

## Usage
```
/write "<request>" [flags]                       # write content (default)
/write distill <author-slug> --ref-src=<refs>    # distill an author's voice
/write authors | types | templates | frameworks # list registries (read-only)
/write humanize <text|file>                      # run only the de-AI + voice pass
```

## Flags (universal — `scripts/write/lib/params.cjs`)

| Flag | Default | Notes |
|---|---|---|
| `<request>` | — | what to write (positional, or `--request=`) |
| `--type` | inferred | one of 27+ (`/write types`). Aliases accepted (e.g. `blog-post`→`blog`). |
| `--medium` | type default | per-type medium (e.g. blog→substack; ad→facebook; video-script→youtube-short). Unknown → type default + warn. |
| `--author-style` | brand/neutral | a distilled voice (`/write authors`): `seth-godin`, `david-ogilvy`, … |
| `--template` | type's structure | a registered template id OR a direct `.md` path. |
| `--framework` | `auto` | a writing **formula** to apply as the backbone. `auto` (default) = the writer picks the best-fit OR writes **free-style** (not every piece needs one). `none`/`free` = force free-style. `<id>` = a specific formula (`/write frameworks`): `pas`, `aida`, `feynman-technique`, `scqa`, `hook-retain-reward`, … (100 in `knowledge/write-frameworks.yaml`). Composes with `--type`/`--template`/`--author-style`. |
| `--mode` | `standard` | `standard \| deep-research` (factual spine via deep-research) `\| workflow` (parallel multi-agent for long pieces). |
| `--length` | `medium` | `short\|medium\|long\|very-long\|extremely-long`, or `1000w`, or `5p`. |
| `--out` | `default` | `default`(inline)`\|md\|html\|pdf\|docx`; `+` for multiple (e.g. `--out=md+pdf`). |
| `--style` | `ritsu` | design system for rendered output (`knowledge/design-systems.yaml`). |
| `--lang` | `en` | output language. |
| `--image` | `auto` | `auto\|on\|off` — generate illustration/cover via /image (auto = from the type). |
| `--dataviz` | `auto` | `auto\|on\|off` — generate charts via /dataviz where a number series tells the story. |
| `--humanize` | `on` | `on\|off` — the de-AI gate (the whole point; off not recommended). |
| `--ref` | — | reference materials: files/folders/URLs, `+`-joined or repeated. |
| `--push` | — | publish/save spec, e.g. `googledrive/12042026/post/facebook`. Public surface = HITL Tier C. |
| `--max-cost-usd` | `2.00` | per-run circuit breaker (enrichment is the only out-of-band spend). |
| `--dry-run` | off | plan only (brief + outline + cost), no content. |
| `--out-dir` | `.archives/write/<date>-<slug>/` | output dir (root `.archives`, local-only). |
| `--ref-src` | — | (distill only) the author's reference sources. |

Unknown flags WARN (forward-compat), never silently dropped.

## Flow (dispatches to the `write` umbrella skill)
1. Parse flags (`params.cjs`) → subcommand + options.
2. **write**: `node scripts/write/plan.cjs …` → read `brief.md` → load the voice
   (`author-styles/<slug>/voice-card.md`) → outline → **draft in voice** → enrich (`/image`+`/dataviz`)
   → **humanize gate** (`scripts/write/humanize/scan.cjs` until pass) → `render.cjs` → optional `push.cjs`.
3. **distill**: `node scripts/write/distill/plan.cjs …` stages sources → Workflow fan-out per the
   `_TEMPLATE` contract → assemble the 6 artifact files → register in `author-styles.yaml`.
4. Report `{ok, files[], type, medium, author_style, words, humanize{before→after,pass}, cost, warnings[]}` —
   always surface warnings; show the content inline.

## Examples
```
/write "Why active recall beats rereading for exams" --type=blog --medium=substack --author-style=seth-godin --length=1200w --out=md+pdf
/write "Ritsu turns any PDF into a tutor" --type=ad --medium=facebook --author-style=david-ogilvy --image
/write "Launch thread for our exam-in-3-days feature" --type=thread --medium=x --author-style=seth-godin
/write "Q3 retention readout" --type=memo --template=decision-memo --dataviz --out=docx
/write "Why active recall beats rereading" --type=ad --framework=pas --author-style=david-ogilvy --image
/write "Explain spaced repetition" --type=tutorial --framework=feynman-technique --lang=vi
/write distill paul-graham --ref-src=raw/write/paul-graham        # capture a new voice
/write "anything" --dry-run                                       # plan + cost, no content
/write humanize draft.md                                          # de-AI an existing draft
/write authors                                                    # list distilled voices
```

## Governance
Tier A (reversible, local writes, metered + capped). Drafting/humanizing = in-session/subscription;
`/image` + `/dataviz` = out-of-band (their own breakers). `--push` to a public/multi-recipient
surface escalates to Tier C per `governance/HITL.md` (surfaced for approval, never auto-sent).
Cost-bucket `ai-ops-write` (gps `per_task_kind_caps`: write-orchestration $0.50 · write-draft $1.50
advisory · write-distill $2.00 · write-humanize $0.20 · write-research $1.00). Runtime contract:
`06-ai-ops/sops/SOP-AIOPS-015-write-runtime-contract/flow.yaml`. Spec:
`wiki/capabilities/write-platform/spec.md`.
