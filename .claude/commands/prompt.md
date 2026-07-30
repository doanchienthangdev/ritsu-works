---
name: prompt
description: |
  Author a generation prompt — direction-based front door: `/prompt <direction>
  [build|enhance] "<idea>"`. v0.1 ships direction `image` (video registered-not-built),
  running on a 28-parameter / 2264-value library plus a realism playbook distilled from
  the AVB lessons. Four modes (--mode text|json|ref|smart), two verbs (build authors,
  enhance diagnoses+repairs), five model profiles (gpt-image-2 default, auto-appends
  `photorealism`). Enforces the three anti-AI anchors — plastic skin, impossible studio
  lighting, too-perfect camera/background — and never emits the framework's banned
  phrases. Output: terminal code block by default, or --output=markdown|artifact (real
  Copy buttons). Tier A, ZERO API spend; only --generate (chains to /image) costs money.
  Thin orchestrator over the `prompt` umbrella skill.
argument-hint: "<direction> [build|enhance] [--type] [--mode] [--output] [--model] [--count] [--ar] [--ref] [--realism] \"<input>\""
---

# /prompt — capability `prompt-platform` v0.1

Front-end for the prompt-platform capability. Parses flags, drives the `prompt` umbrella
skill (`06-ai-ops/skills/prompt/SKILL.md`), renders the result.

**What it is:** the layer that was missing in front of `/image`. `/image` generates from a
prompt that is already good; `/prompt` is what makes the prompt good.

## Usage

```
/prompt <direction> [build|enhance] [flags] "<input>"
```

`<direction>` is the **first argument and required**. New directions are added by dropping
a skill and one registry row — no change to this command.

| Direction | Status |
|---|---|
| `image` | ✅ installed (aliases: `img`, `photo`, `picture`) |
| `video` | registered-not-built — refuses with a reason |

## Verbs

| Verb | Does |
|---|---|
| `build` *(default)* | Authors a NEW prompt from your idea |
| `enhance` | Diagnoses an EXISTING prompt against the 6-part framework, repairs it, and prints the diff |

## Flags

| Flag | Default | Values |
|---|---|---|
| `--type` | — | a fixed-structure template with slots, instead of a prompt assembled from the library. v0.1: `character-turnaround` (aliases `character-sheet`, `turnaround`, `model-sheet`) |
| `--mode` | `text` | `text` long prose · `json` full object · `ref` preserve/change vs a reference image · `smart` shortest prompt that still lands |
| `--output` | `default` | `default` fenced code block **in the reply itself** · `markdown` file · `artifact` HTML page with real Copy buttons. `pdf`/`docx`/`excel` registered → warn + fall back |
| `--model` | `gpt-image-2` | `gpt-image-2` · `nano-banana-pro` · `midjourney` · `flux` · `generic` |
| `--count` | `1` | 1–20. With `>1`, prompts vary along **one** deliberate axis, labelled |
| `--ar` | *(inferred)* | `W:H`. Inferred from platform when you name one; asked when unknowable |
| `--ref` | — | reference image(s), comma-separated. Either a **file path** or **`attached`** (`attached:2` for the 2nd attached image) when you dragged the image into the chat. Required by `--mode=ref` and by `--type`s that need one. A path that does not exist is refused, not ignored |
| `--preserve` / `--change` | *(inferred)* | ref mode: what to keep / what to alter |
| `--realism` | `max` | `max` all 3 anchors · `balanced` commercial · `off` anime/3D/illustration |
| `--lang` | `en` | language of the **prompt** (explanation is always in your language) |
| `--out` | `.archives/prompt/runs/<date>-<slug>/` | output dir for file outputs |
| `--generate` | off | after authoring, chain into `/image` — **this is the only flag that spends** |
| `--dry-run` | off | show the parameter plan + warnings, render nothing |

Registered-but-unsupported flags **warn and are kept** — never silently dropped.

## Flow

1. `node scripts/prompt/lib/params.cjs` parses + validates against
   `knowledge/prompt-directions.yaml`. Errors refuse; warnings surface and continue.
2. Umbrella skill routes: `build` → `directions/image`, `enhance` → `enhance`.
3. The direction skill reads the brief, decides parameters in build order, and queries the
   library **on demand** (`scripts/prompt/lib/library.cjs`) — never loading all 450 KB.
4. `realism/SKILL.md` enforces the three anchors + the banned-phrase guard.
5. Four cross-checks run before printing: light plausibility · detail-budget placement ·
   the 7 conflict pairs · anchor coverage.
6. `scripts/prompt/render.cjs` emits the chosen surface — and for `--output=default` the
   fenced block is **reproduced in the reply itself**, never left in Bash stdout (which
   Claude Code shows to the agent, not to you).
7. A **rationale line** always follows: which parameters carry the weight, and what any
   cross-check changed.

## Types — when the exact wording IS the deliverable

Most prompts are assembled from the 28-parameter library. Some are not: a turnaround
sheet, a storyboard, a product spin — their value lies in an exact layout spec whose
wording must not be paraphrased. Those are **types**: a template file with slots, emitted
verbatim, with only the slots filled.

| Type | What it produces | Needs |
|---|---|---|
| `character-turnaround` | Six-column model sheet — 0° front · 45° left · 90° left profile · 90° right profile · 45° right · 180° back, each column a full-body view above a rotation-matched portrait | `--ref` (a base character image) |

A type brings its own defaults (`--ar=16:9`, `--model=gpt-image-2`, `--realism=balanced`)
and may **waive a realism anchor with a stated reason** — the turnaround sheet waives
"imperfect camera/background" because a neutral studio is the *correct* answer for a
technical reference. Anything you pass explicitly still wins.

Adding a type later is one registry row + `types/<id>/{template.md,SKILL.md}` — no change
to this command.

## Values are suggestive, not restrictive

The library is a vocabulary, not a dropdown. For any parameter the skill may take a listed
value, **combine several**, or **invent one** that fits better. The goal is the optimal
choice for the brief.

## Ask, don't invent

When a parameter would materially change the output and your input does not settle it
(platform ⇒ ratio, casting for a specific market, ambiguous reference intent), `/prompt`
asks before writing rather than guessing.

## Examples

```
/prompt image "nữ influencer fitness 24 tuổi selfie ở gym, ad TikTok"
/prompt image --mode=smart --model=midjourney "quán ramen Tokyo nửa đêm, chủ quán mệt"
/prompt image --count=3 --ar=4:5 "serum dưỡng da chai thuỷ tinh hổ phách trên đá cẩm thạch"
/prompt image --mode=ref --ref=attached --preserve="face,hair,outfit" "đi bộ về nhà trên đường tối, đèn đường hắt xuống"   # ảnh kéo vào chat
/prompt image --mode=ref --ref=avatar.png --preserve="face,hair,skin tone" --change="outfit" "áo khoác lông thú màu đỏ, sảnh khách sạn"
/prompt image enhance "a cool photo of a girl, cinematic lighting, hyper-detailed"
/prompt image --mode=json --output=markdown --count=5 "bộ ảnh lookbook streetwear mùa đông"
/prompt image --output=artifact --count=4 "thumbnail YouTube về học tiếng Anh"
/prompt image --realism=off --mode=text "nhân vật anime nữ, thành phố mưa neon"
/prompt image --type=character-turnaround --ref=base.png "cô gái 24 tuổi, travel creator"   # model sheet 6 cột
/prompt image --type=turnaround --ref=base.png --change="áo khoác da đen" "giữ nguyên mặt, đổi outfit"
/prompt video "bất kỳ"            # → refuse: registered-not-built, with the reason
```

## Chaining

`--generate` runs `/image` with the authored prompt after printing it. Cost is announced
before the call; with `--count>1` it chains N runs and says so first.

## Registry & gate

`knowledge/prompt-directions.yaml` (directions · modes · outputs · verbs · realism levels ·
the 3 pinned anchors · banned phrases) ·
`scripts/cross-tier/validate-prompt-directions.cjs` (L2 critical) ·
`06-ai-ops/sops/SOP-AIOPS-019-prompt-runtime-contract/flow.yaml`.
