---
name: prompt
description: |
  Umbrella for the prompt-platform capability — the `/prompt` command's brain.
  A direction-based prompt AUTHORING front door: `/prompt <direction> [build|enhance]
  "<idea>"`. Direction (image · video-stub) resolves from knowledge/prompt-directions.yaml,
  so a new direction plugs in WITHOUT command-side code change (mirrors image/dataviz:
  umbrella + directions/<id>/ + registry). v0.1 ships ONE real direction (image) running
  on the 28-parameter / 2264-value library in library/ plus REALISM-PLAYBOOK.md distilled
  from the AVB source lessons. Four modes (text · json · ref · smart), two verbs
  (build · enhance), five model profiles (gpt-image-2 default + photorealism keyword).
  Output goes to a terminal code block by default, or a markdown file / a published
  Artifact with real Copy buttons. Tier A — pure authoring, ZERO API spend, no secret;
  /image is what spends. Invoked by `.claude/commands/prompt.md`.
allowed-tools: [Read, Bash, Glob, Grep, AskUserQuestion, Write, Skill, Artifact]
disable-model-invocation: false
---

# prompt (umbrella) — capability `prompt-platform` v0.1

> The dispatcher behind `/prompt <direction> [build|enhance] [flags] "<input>"`.
> Resolves the direction from `knowledge/prompt-directions.yaml`, hands the craft to
> the direction skill, enforces the realism contract, renders the output.

**This skill never writes prompt prose itself.** It routes. The prose is written by
`directions/<id>/SKILL.md` under the discipline of `realism/SKILL.md`.

---

## 0. Cost & tier

Tier **A**. Everything here runs on the session model (subscription) plus pure-Node
helpers. **No API key, no external call, no spend.** The only way a `/prompt` run costs
money is `--generate`, which chains into `/image` — and that is announced before it runs.

---

## 1. Parse and resolve

```bash
node -e "console.log(JSON.stringify(require('./scripts/prompt/lib/params.cjs').parse(process.argv.slice(1)),null,2))" \
  <direction> [build|enhance] [flags...] "<input>"
```

> ### ⚠️ BEFORE parsing: attached images are refs too
>
> `params.cjs` is pure Node — it **cannot see the conversation**. Only you can. So:
>
> **If the founder attached one or more images to this turn and did not pass `--ref`,
> inject it yourself before parsing:** `--ref=attached` for one image,
> `--ref=attached:1,attached:2` for several.
>
> Do this whenever `--mode=ref` or a `requires_ref` type is in play — and also when the
> founder attached an image without asking for ref mode at all, because an attached image
> is almost always meant as a reference. In that case say what you inferred.
>
> Skipping this refuses a run where the founder genuinely supplied a reference — the gate
> was right about the contract and wrong about reality (observed 2026-07-30). Passing a
> path is still fully supported; the two forms mix freely in one call.

`params.cjs` returns `{ok, direction, type, refs, model, verb, input, flags, warnings, errors}`.

`refs` is the resolved list: `[{kind:'attached'|'path', value, index?, resolved?, exists}]`.
A `path` ref that does not exist on disk is a **refusal**, not a warning — v0.1 accepted a
typo'd path silently and the founder only discovered it from a wrong image.

- `errors.length > 0` → **refuse**, print each error verbatim. Never guess past a refusal.
- `warnings.length > 0` → **always surface them**, then continue. A registered flag the
  direction does not support is kept and warned, never silently dropped.
- `direction.status !== 'installed'` → refuse with `reason_not_built`. This is the
  registry proving itself: `/prompt video …` must fail with a clear sentence, not a
  hallucinated video prompt.

## 2. Route

| Verb | Skill | What it does |
|---|---|---|
| `build` | `directions/<id>/SKILL.md` | Author a new prompt from the idea |
| `build` + `--type` | `types/<id>/SKILL.md` | Fill the slots of a fixed-structure template, emitted verbatim |
| `enhance` | `enhance/SKILL.md` | Diagnose + repair an existing prompt |

Both then pass through `realism/SKILL.md` unless `--realism=off`.

When `--type` is set, the type skill takes over authoring: it reads `types/<id>/template.md`,
fills ONLY the declared slots, and emits everything else byte-identical. Do not paraphrase a
template — its exact wording is what makes it work. The type may waive a realism anchor;
`params.cjs` surfaces the waiver reason as a warning so the founder sees it.

## 3. The library is loaded ON DEMAND, never wholesale

The parameter library is ~450 KB. Do **not** read `00-MASTER-REFERENCE.md` in full.
Query it:

```bash
node scripts/prompt/lib/library.cjs list                 # 28 params + counts + required tier
node scripts/prompt/lib/library.cjs tiers                # always / recommended / optional
node scripts/prompt/lib/library.cjs values lighting      # every value of one param
node scripts/prompt/lib/library.cjs get 19               # one param, full record
node scripts/prompt/lib/library.cjs search "neon"        # free-text across all 2264 values
```

Read the per-parameter file (`library/19-lighting.md`) only when you need the
*"Lưu ý khi viết"* craft notes for that specific parameter.

## 4. Values are a starting point, not a menu

The library is **suggestive, not restrictive**. For any parameter you may:
- take a listed value verbatim,
- **combine two or three** listed values,
- **invent a value that is not listed** when the situation calls for it.

What matters is that the choice is *optimal for this brief*, not that it appears in the
catalogue. A prompt built only from dropdown values reads like a form; a prompt built by
someone who knows the vocabulary reads like direction.

## 5. Ask, do not invent

If a parameter would **materially change the output** and the user's input does not
settle it, ask with `AskUserQuestion` (max 4 questions) before writing. Typical cases:

- subject is a person but age/gender/casting is unstated **and** the brief implies a
  specific market,
- platform is unstated so aspect ratio is unknowable,
- `--mode=ref` with no `--preserve`/`--change` and the intent is ambiguous,
- the brief implies a real brand, product, or living person.

Do **not** ask about things a competent director would just decide (lens choice, exact
mood word, bokeh character). Decide those, and explain them in the rationale line.

## 6. Render

`render.cjs` owns the output surface — this skill never hand-formats.

```bash
node scripts/prompt/render.cjs --input=<payload.json> --output=<default|markdown|artifact> --out=<dir>
```

| `--output` | Surface |
|---|---|
| `default` | one fenced code block per prompt, **reproduced by YOU in the reply** |
| `markdown` | a `.md` file, one fenced block per prompt + the parameter table |
| `artifact` | a published HTML page with a real **Copy** button per prompt |

> ### ⛔ `--output=default`: Bash stdout does NOT reach the user
>
> In Claude Code, the output of a Bash call is shown to **you**, not reliably to the
> founder. Running `render.cjs --output=default` and then writing "the prompt is above"
> leaves the founder staring at an empty screen. This happened on a real run; it is the
> single easiest way to make `/prompt` look broken.
>
> **The contract:** `render.cjs --output=default` produces the markdown; **you must then
> paste that markdown into your own assistant reply**, verbatim, fenced block and all.
> The renderer formats; the reply delivers. Never point at Bash output.
>
> Cheapest safe route: skip Bash entirely for `default` and write the fenced block
> straight into your reply. Use `render.cjs` when you want the exact same formatting the
> file surfaces produce, or when `--count>1` makes hand-formatting error-prone.
>
> `markdown` and `artifact` are unaffected — they write a real file / publish a real page,
> and you report the path or the URL.

For `artifact`, load the `artifact-design` skill first, write the HTML, then call the
`Artifact` tool. Keep the same file path across redeploys so the URL is stable.

## 7. Always end with the rationale line

After the prompt(s), print 1–3 sentences: which parameters carry the weight and why.
The founder must be able to disagree with a *decision*, not reverse-engineer one.

Then, if any cross-check in `realism/SKILL.md` §4 fired, say what you changed.

## 8. Chaining

`--generate` → after rendering, invoke `/image "<the prompt>" --use=<model> --ar=<ar>`.
Announce the spend first. With `--count>1` this runs N times — say so before starting.

## Sub-skills

| Skill | Role |
|---|---|
| `directions/image` | The photographer's + director's eye. The craft. |
| `realism` | The anti-AI contract. Runs on every non-`off` run. |
| `enhance` | Diagnose an existing prompt against the 6-part framework and repair it. |
| `types/character-turnaround` | Six-column model sheet. The identity anchor for every later avatar scene. |

## Registry

`knowledge/prompt-directions.yaml` — directions, modes, outputs, verbs, realism levels,
the three pinned realism anchors, and the banned-phrase list.
Gate: `scripts/cross-tier/validate-prompt-directions.cjs` (L2 critical).
