---
description: |
  Produce a complete video — script → assets → composition → render → QC → publishing kit —
  plus its full artifact folder at video/projects/<slug>/. Type-driven front door with an
  extensible production-line registry (--type=explainer is line #1; --type=default is the
  fallback); adding a line is a registry edit, not a command change. Auto-generates everything
  a key exists for (narration via /voice, avatars + score via HeyGen) and HANDS OFF what it
  cannot (screen recording, live-action), then --resume picks up when those land. Tier A
  runtime; per-run --max-cost-usd breaker; artifacts to video/projects/<slug>/.
argument-hint: "[<brief>] [--type=<line>] [--script=<ref>] [--style=<ds>] [--stage=<s>] [--resume] [--dry-run]"
---

# /video

Thin orchestrator over the **`video`** umbrella skill (`06-ai-ops/skills/video/SKILL.md`).
Same family as `/image`, `/voice`, `/write`, `/translate`, `/dataviz`.

**It owns** the project contract, the asset-code system, pipeline state + resume, the
enforcement gates, and total cost accounting. **It delegates** everything else — see §Seam.
If you find yourself writing composition-authoring logic here, stop: that belongs to the
HyperFrames skills.

## Usage

```bash
/video "a 3-minute explainer for Ritsu" --type=explainer
/video --type=explainer --script=raw/launch-brief.md
/video --resume --slug=ritsu-product-launch
/video --stage=render --slug=my-film
/video --type=social-short --duration=30 --aspect=9:16     # once that line is built
```

### Parameters

| Flag | Default | Meaning |
|---|---|---|
| `--type=<id>` | `default` | Production line from `knowledge/video-types.yaml`. `explainer` is line #1. |
| `--script=<ref>` | *(absent)* | **Absent** → brainstorm the script with the founder. **Present** → ingest that source (file/URL/notes/deck) and TRANSFORM it into the standard `SCRIPT.md` shape. |
| `--slug=<s>` | derived | Project folder name under `video/projects/`. |
| `--style=<ds>` | type's default (`ritsu`) | Design system → `video/design-systems/<ds>/frame.md`. |
| `--duration=<s>` | type target | Target runtime. |
| `--aspect=<r>` | type default | `16:9` · `9:16` · `1:1`. |
| `--voice=<v>` | `KAI` | Narration voice (passed to `/voice`). |
| `--engine=<e>` | `elevenlabs` | TTS adapter. |
| `--avatar=<id\|none>` | `none` | HeyGen avatar for talking-head beats. |
| `--music=<q\|none>` | auto | Score query against the HeyGen catalog. |
| `--lang=<l>` | `en` | Narration language. |
| `--assets=<dir>` | — | Bring your own footage; the ledger ingests it instead of requesting it. |
| `--stage=<s>` | all | Run ONE stage: `script` · `assets` · `compose` · `render` · `qc` · `publish`. |
| `--resume` | — | Continue a parked production. **Re-probes the disk**; never trusts `run.json`. |
| `--dry-run` | — | Plan + costs only. No spend, no files written beyond the plan. |
| `--max-cost-usd=<n>` | `5` | **Refuses before spending.** Media generation is out-of-band, so this is the real guard. |
| `--publish` | — | Also emit the publishing kit (`YOUTUBE.md`). Posting stays Tier C — you post. |

## Pipeline

Deterministic Node spine; LLM skills only at the creative seams. `run.json` is the contract.

| Stage | Owner | Does |
|---|---|---|
| **0 · doctor** | `scripts/video/gates/selfcheck.cjs` | Fails LOUDLY if the toolchain can't run. Probes ffmpeg *filters* rather than assuming. |
| **1 · script** | skill `video/plan` (+ `/write`) | Brainstorm or transform → `SCRIPT.md`, beats, asset codes. |
| **2 · assets** | `scripts/video/` + `/voice`, `media-use`, `/image` | Generate what we hold keys for; **emit hand-off specs** for screen + live-action; ledger → `FOOTAGE.md` (checksummed). |
| **3 · compose** | skill `video/compose` (+ HyperFrames) | Author `index.html` against `frame.md`. |
| **4 · render** | `hyperframes render` | The mp4. |
| **5 · qc** | the three gates | Loudness · stage lint · **verify-render on the finished mp4**. |
| **6 · publish** | skill `video/publish` | `TIMELINE.*` + `YOUTUBE.md`. |

Stages are **idempotent and content-addressed** — a stage whose recorded input checksum still
matches is skipped.

## Hand-off and resume

Two things `/video` cannot do: **record your screen** and **generate live-action** (no Veo API).
It emits exact record specs + ready-to-paste prompts, marks those slots `requested`, and parks.

```bash
/video --resume --slug=my-film
#   assets  18/22 present, 4 missing
#      screen   missing: SC-07, SC-11, SC-14, SC-19
#   (record specs re-emitted below)
```

Because media is gitignored, **resume reconciles by probing the disk and comparing checksums**.
A fresh clone correctly reports everything missing rather than claiming it is composed.

## Output — `video/projects/<slug>/`

```
SCRIPT.md  FOOTAGE.md  TIMELINE.md  TIMELINE.html  YOUTUBE.md  index.html  run.json   ← committed
assets/{screen,footage,voice,avatar,music,sfx,brand,mg}/  build/  out/                ← local
out/filmstrip.jpg                                                                     ← committed (QC evidence)
```

## The seam — what `/video` does NOT do

| Concern | Delegate | Never |
|---|---|---|
| compose / check / snapshot / render | `hyperframes-cli` | wrap the CLI and drift from its flags |
| loudness measure/normalise/stitch | `scripts/voice/lib/audio.cjs` (`DEFAULT_LUFS` is already `{i:-16,tp:-1.5}`) | reimplement it |
| narration TTS | `/voice` | call ElevenLabs directly — forks the lane, breaks metering |
| BGM / SFX / stock / logo | `media-use` | write a HeyGen-catalog client |
| stills / thumbnails | `/image` | hand-roll one |
| script craft | `/write --type=video-script` | restate its structure in the registry |
| brand tokens / motion | `video/design-systems/<ds>/frame.md` | hardcode a hex anywhere |

## Guardrails — enforced, not documented

Every one is a script with a non-zero exit code. Each cost real debugging time on the first film.

1. **Loudness** — all narration to −16 LUFS / −1.5 dBTP. Avatar audio arrives 2–4.6 LU quieter
   than TTS; unfixed, the film jumps at every cut.
2. **Blank render** — multiple `<video>` in one stage must be `position:absolute`.
   `check` **and** `snapshot` both pass while the render is broken; only the mp4 tells the truth.
3. **QC evidence** — a filmstrip is mandatory and committed.
4. **Descenders** — mask-rise `overflow:hidden` needs padding compensation.
5. **Framing** — screen captures sit at ~1.0× or ≥1.26×, never the slice band between.
6. **No invented figures** — every on-screen numeric cites an asset code resolving to a
   `FOOTAGE.md` row. Use what the product actually shows.
7. **Environment** — probe ffmpeg filters; mute stock ambient beds.

## Adding a production line

Edit `knowledge/video-types.yaml` + drop `06-ai-ops/skills/video/types/<id>/SKILL.md`.
**Zero command change.** The L2 validator pins the loudness floor and render gates so a new
line cannot silently opt out.

## Cost + HITL

Tier **A** runtime. Media spend is out-of-band (invisible to the budget hook) → the per-run
`--max-cost-usd` breaker refuses *before* spending. Cost-bucket `ai-ops-video`; per-stage caps in
`governance/ROLES.md`. **Publishing publicly is Tier C** — `/video` produces the kit, you post.

Runtime contract: `06-ai-ops/sops/SOP-AIOPS-018-video-runtime-contract/flow.yaml`.
