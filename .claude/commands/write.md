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
argument-hint: "\"<request>\" [--type --medium --author-style --template --mode --length --out --image --dataviz --humanize --ref --push --style --lang --dry-run] | distill <slug> --ref-src=<refs> | learn <book|folder> [--dry-run --no-voice --books=] | authors | types | templates | frameworks | humanize <text|file>"
---

# /write — capability `write-platform` v0.1

Front-end for the universal content-writing platform. Parses the subcommand + flags, drives the
`write` umbrella skill (`06-ai-ops/skills/write/SKILL.md`), reports the result.

## Usage
```
/write "<request>" [flags]                       # write content (default)
/write distill <author-slug> --ref-src=<refs>    # distill an author's voice
/write learn <book|folder> [--dry-run --no-voice --books=]  # distill a master book → wiki + enrich /write
/write authors | types | templates | frameworks # list registries (read-only)
/write humanize <text|file>                      # run only the de-AI + voice pass
```

## Flags (universal — `scripts/write/lib/params.cjs`)

| Flag | Default | Notes |
|---|---|---|
| `<request>` | — | what to write (positional, or `--request=`) |
| `--request-file` | — | read `<request>` from a file — for a long brief you don't want to shell-quote. An inline request (positional/`--request=`) wins and the file is reported as ignored. Unreadable/empty file = hard error, never a contentless run. |
| `--type` | inferred | one of 27+ (`/write types`). Aliases accepted (e.g. `blog-post`→`blog`). |
| `--medium` | type default | per-type medium (e.g. blog→substack; ad→facebook; video-script→youtube-short). Unknown → type default + warn. |
| `--author-style` | brand/neutral | a distilled voice (`/write authors`): `seth-godin`, `david-ogilvy`, … |
| `--template` | type's structure | a registered template id OR a direct `.md` path. |
| `--framework` | `auto` | a writing **formula** to apply as the backbone. `auto` (default) = the writer picks the best-fit OR writes **free-style** (not every piece needs one). `none`/`free` = force free-style. `<id>` = a specific formula (`/write frameworks`): `pas`, `aida`, `feynman-technique`, `scqa`, `hook-retain-reward`, … (100 in `knowledge/write-frameworks.yaml`). Composes with `--type`/`--template`/`--author-style`. |
| `--mode` | `standard` | `standard \| workflow` (parallel multi-agent). (For research depth use `--research`.) |
| `--research` | `auto` | external research depth: `off` (model + refs) · `auto` (refs + light lookups) · `deep` (the `deep-research` skill — web fan-out → adversarially verify → cited synthesis). |
| `--grounding` | `auto` | internal **Ritsu** sources to pull supporting material from: `auto` · `off` · `deepask` · `wiki` · `brain` · `all` (combine with `+`). Gathered at data-collection + shapes the outline; cited. |
| `--longform` | `auto` | `auto` (detect from type) · `on` · `off`. Long-form types (**book · novel · film-script · research-paper · article-series · course**) run the **bible → parallel-draft → continuity** pipeline for consistency. |
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
3b. **learn**: `node scripts/write/learn/plan.cjs --src=<book|folder>` stages book text(s) → Workflow
   fan-out (1 analyst per book) → main-thread routes the distilled craft into 4 lanes (wiki package ·
   `write-frameworks.yaml` · `06-ai-ops/write/CRAFT.md` · selective `author-styles/`), deduped + validated.
   See `06-ai-ops/skills/write/learn/SKILL.md`. PR-governed (Tier C) since it edits Tier-1 registries.
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
/write "State of retrieval-practice research" --type=research-paper --research=deep --grounding=wiki
/write "How Ritsu compares to Anki for med students" --type=blog --grounding=deepask+wiki --research=auto
/write "A novel about a student and an AI tutor" --type=novel --author-style=seth-godin --out=pdf+epub  # long-form: bible→parallel→continuity
/write "Learning-science book: why testing beats rereading" --type=book --research=deep --out=pdf+docx
/write "5-part series on active recall" --type=article-series --grounding=wiki
/write distill paul-graham --ref-src=raw/write/paul-graham        # capture a new voice
/write learn raw/write/books/                                     # distill a whole shelf of masters → enrich /write
/write learn "raw/write/books/9 - Scientific Advertising — Hopkins.pdf"  # learn one book
/write learn raw/write/books/ --dry-run                           # which books + which lanes, no writes
/write "anything" --dry-run                                       # plan + cost, no content
/write humanize draft.md                                          # de-AI an existing draft
/write authors                                                    # list distilled voices
```

## Governance
Tier A (reversible, local writes, metered + capped). Drafting/humanizing = in-session/subscription;
`/image` + `/dataviz` = out-of-band (their own breakers). `--push` to a public/multi-recipient
surface escalates to Tier C per `governance/HITL.md` (surfaced for approval, never auto-sent).
Cost-bucket `ai-ops-write` (gps `per_task_kind_caps`: write-orchestration USD 0.50 · write-draft USD 1.50
advisory · write-distill USD 2.00 · write-humanize USD 0.20 · write-research USD 1.00). Runtime contract:
`06-ai-ops/sops/SOP-AIOPS-015-write-runtime-contract/flow.yaml`. Spec:
`wiki/capabilities/write-platform/spec.md`.
