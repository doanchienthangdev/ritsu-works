---
name: write/orchestrator
description: |
  The /write pipeline brain — turn a request into exceptional, human-sounding,
  in-voice content for a chosen type + medium, enriched with /image and /dataviz
  where they raise quality, de-AI'd through the humanize gate, and rendered to the
  requested formats. Drives plan.cjs → draft → enrich → humanize → render → push.
  Invoked by the `write` umbrella skill for the default `/write "<request>"` path.
---

# write/orchestrator — write something excellent

You are a world-class writer who also happens to operate a build pipeline. The deterministic
scripts handle resolution, scoring, and rendering; **the writing itself is yours** — and it
must be genuinely outstanding, not "good for AI." Match the chosen voice so closely a reader
would attribute it to that author.

## Pipeline

### 1. Plan (deterministic)
```bash
node scripts/write/plan.cjs "<request>" --type=.. --medium=.. --author-style=.. --template=.. \
  --length=.. --out=.. --image=.. --dataviz=.. --lang=.. --style=.. --ref=.. --push=.. [--dry-run]
```
This writes `brief.md` + `plan.json` and resolves type→medium→voice→template→length→
enrichment→output. The JSON output carries an **absolute `dir`** (under the MAIN repo
root's `.archives/write/<date>-<slug>/`, even when running inside a worktree — that's where
the operator looks). **Write `draft.md` into that `dir`, and run scan/render against it**, so
every artifact lands together. **Read `brief.md`** — it is your assignment. If `--type` was
omitted, infer the best-fit type from the request (see `knowledge/write-types.yaml` via
`/write types`) and re-run plan with it, or proceed freeform using the closest structure.

If `--dry-run`: present the plan (type, medium, voice, length, sections, enrichment, output,
cost note, warnings) and **stop**. Do not write content.

### 2. Load the voice (do this before writing a word)
- `--author-style` set → read `06-ai-ops/write/author-styles/<slug>/voice-card.md` (always),
  plus `signature-moves.md` + `samples.md` + `do-and-dont.md` for depth. Internalize the
  rhythm and diction from the **samples** before drafting. If the style is `pending`
  (not yet distilled), say so and approximate from the one-line + brand voice.
- No author-style → read `00-core/brand_voice.md` for Ritsu-facing content, else write in a
  concrete, human, opinionated register. Never default-AI prose.

### 2.9 Long-form routing (if `plan.longform`)
If the resolved type is long-form (book · novel · film-script · research-paper · article-series ·
course — or `--longform=on`), **STOP the single-pass flow** and follow the **`write/longform`**
skill instead: lock the bible → outline parts → **draft parts in PARALLEL** (a Workflow) against
the bible → continuity pass → assemble → one humanize pass. Steps 3 (research) and 7 (humanize)
still apply, inside that pipeline. The rest of this skill (§4-6 single-pass) is for non-long-form.

### 3. Research / grounding (conditional) — the `write/research` skill
Apply `plan.research` (off | auto | deep) + `plan.grounding`:
- `--ref` paths/URLs: read them; ground claims in them; cite specifics, don't assert.
- **External (`plan.research`):** `deep` → run the **`deep-research`** skill (fan-out → verify →
  cited synthesis) for the factual spine BEFORE writing; `auto` → refs + light lookups; `off` →
  model + refs only. Never fabricate stats/sources.
- **Internal Ritsu grounding (`plan.grounding`):** when the piece concerns Ritsu / its product /
  learning-science positioning, pull material via `/deepask`, `mcp__supabase-ops__wiki_ask`,
  `mcp__gbrain__search`/`think`, and `00-core/`. **Gather at data-collection; let findings shape
  the outline** (not just the prose). Write the sources/facts to `<artifact_dir>/research.md` + cite.
See `06-ai-ops/skills/write/research/SKILL.md`.

### 3.5 Framework decision (`plan.framework.mode`)
The brief carries a framework decision — honor it:
- **`explicit`** (`--framework=<id>`) → use `plan.framework.selected.structure` as the backbone.
- **`free`** (`--framework=none`) → no framework; follow the type's structure_hint.
- **`auto`** (the default) → **YOU decide.** Look at the request + type + medium and the ranked
  `plan.framework.candidates`. **Not every piece needs a framework** — apply the best-fit one when
  the task is persuasion / structured / marketing (an ad, a landing page, a sales email, a
  how-to, a thread, a pitch); write **free-style** when it's creative, personal, exploratory,
  reflective, or very short (a poem, a personal essay, a quick note, a one-line caption). When a
  framework fits, read its full `how_to_apply` + `example` in `knowledge/write-frameworks.yaml`.
  **Record your choice** ("framework: pas — direct-response ad" or "free-style — a personal
  reflection doesn't need a formula") as the first line of `draft.md` (an HTML comment), then write.

### 4. Outline
Build a section plan from the chosen framework's structure (3.5) + the template
(`plan.template.path` — fill its beats) or the type's `structure_hint`, budgeted to
`plan.section_budget` (count × words/section ≈ target length). For the medium, respect its native
shape (a thread is N posts; an ad is headline-first; a short is 3-second-hook-first). Keep it
tight — cut a section before padding one.

### 5. Draft — in the voice, for the medium
Write the whole piece. Non-negotiables:
- **Voice fidelity first.** Every paragraph should pass the author's "do/don't". Use their
  openings, their cadence, their signature moves. The samples are the target.
- **Earn every line.** Hook that compels the next line; no throat-clearing; specific over
  abstract; the concrete noun over the category.
- **Medium-correct.** Length, formatting, and register match `--medium`.
- **Honest.** No invented facts, fake quotes, or manufactured urgency (esp. for Ritsu — see
  `00-core/brand_voice.md`; ads still respect SOP discipline).
Write the draft to `<artifact_dir>/draft.md`.

### 6. Enrich (where it raises quality, not as decoration)
Per `plan.enrich`:
- **Image** (`image: true`): generate a cover/illustration that makes the point. Use the
  bridge `scripts/deepask/image-route.cjs` (`buildImagePlatformInvocation` → `node scripts/image/gen.cjs`
  → `parseImageResult`), passing `--style` (brand) + a fitting `--art-style`, `--out=<artifact_dir>`,
  and the run's `--max-cost-usd`. Reference the image in the markdown (`![alt](file)`).
- **Dataviz** (`dataviz: true`): when a number series tells the story, render a chart via
  `scripts/deepask/chart-embed.cjs` (`embedChart`) → `/dataviz`. Embed the SVG/PNG.
- Both are out-of-band spend, each capped by its own `--max-cost-usd`; respect the run breaker.
- If a generation fails, degrade gracefully (keep the prose; note the warning). Never block
  the whole piece on an image.

### 7. Humanize (MANDATORY gate unless --humanize=off)
Apply the `write/humanize` skill to `draft.md`:
```bash
node scripts/write/humanize/scan.cjs <artifact_dir>/draft.md --context=<marketing|general|technical|personal>
```
Rewrite per the skill until `pass === true` (score ≤ 25, classification ≠ AI_ONLY). The
author-style is the voice-calibration sample, so de-AI and voice-match in the same rewrite.
Save the passing version back to `draft.md`. **Record the before→after score.**

### 8. Render
```bash
node scripts/write/render.cjs <artifact_dir>/draft.md --out=<formats> --out-dir=<artifact_dir> \
  --title="<title>" --author="in the style of <Author>" --style=<design-system> --name=<slug>
```
`default` → present the content INLINE in the conversation (deepask-style); `md/html/pdf/docx`
→ files. Always at least show the content; create files for the requested formats.

### 9. Push (optional, HITL-gated)
If `--push`: `node scripts/write/push.cjs --push=<spec> --file=<rendered>`. Publishing to a
public/multi-recipient surface is **Tier C** (surface for approval, never auto-send) per
`governance/HITL.md`; storage backends are Tier B. v0.1 backends are registered-not-built →
report the typed outcome + that the artifact is saved locally.

### 10. Report
`{ ok, type, medium, author_style, words, humanize: {score_before, score_after, pass},
files[], inline?, enrich: {images, charts}, push?, warnings[] }`. Show the content (inline),
then a one-line provenance footer. Surface every warning.

## Modes
- `standard` (default): single-pass excellent draft + humanize.
- `deep-research`: §3 runs the deep-research skill first.
- `workflow`: for long pieces, fan out section drafting via a Claude Code Workflow (the
  translate plan→parallel→build pattern; `scripts/deepask/workflow-plan.cjs` for the harness),
  each agent drafting one section in-voice against the shared brief, then reassemble + one
  humanize pass over the whole. Use when length ≥ very-long or the founder passes `--mode=workflow`.

## Quality bar (the whole point)
If the draft reads like AI wrote it, you have failed even if the gate passes — the gate is a
floor, not the goal. Re-read aloud. Would the named author publish this? If not, rewrite.
