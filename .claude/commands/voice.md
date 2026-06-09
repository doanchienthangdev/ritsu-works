---
name: voice
description: |
  Turn text, a file, or a folder of files into narrated audio — a model-agnostic
  front door with a pluggable TTS adapter layer (--use=<adapter>). Default engine
  gemini-tts-3.1-flash (Gemini Developer API, 30 voices); also openai-tts / whisper
  (gpt-4o-mini-tts, 13 voices). Reads the content in the context of a --type
  (ads/podcast/story/blog/educational/news/…), AUTHORS a content-aware voice-direction
  (tone, pace, emotion, pauses) + marks up the script, records out-of-band, and stitches.
  Single text/file → one audio file; a folder → one per file. Default mp3 (+ wav/opus/
  aac/flac/m4a/ogg/pcm). Long inputs / folders fan out via a Claude Code Workflow.
  Tier A; per-run --max-cost-usd breaker; provider keys out-of-band; artifacts to
  .archives/voice/<date>-<slug>/. Thin orchestrator over the `voice` umbrella skill.
---

# /voice — capability `voice-platform` v0.3

> **v0.3 (/cla extend) — long-form CONSISTENCY:** splitting a long file / folder into many chunks made each chunk drift in voice, tone, pace, and **volume** ("lúc to lúc nhỏ") — because each TTS request is independent and has no memory of the others. Two locked-in fixes: **(1)** the voice + all parameters + a **uniformity voice-direction** are locked *before* splitting and applied identically to every chunk (auto-injected for any multi-chunk run); **(2)** every chunk is **loudness-normalized to one target** (EBU R128 `loudnorm`, default **−16 LUFS**) before stitching — the deterministic cure for volume drift. New flags `--normalize` (default ON) and `--target-lufs`.
>
> **v0.2:** the `--type` register vocabulary grew 11 → **23** (`film`, `conversation`, `language-learning`, `public-speaking`, `audiobook`, `asmr`, `sports`, `documentary`, `customer-support`, `character`, `poetry`, `comedy`).

Front-end for the voice-platform capability. Parses flags, drives the `voice` umbrella
skill (`06-ai-ops/skills/voice/SKILL.md`), reports the result. **Both engines are
verified working end-to-end.**

## Usage
```
/voice "<text>" [flags]
/voice --file=<path> [flags]
/voice --folder=<dir> [flags]
```
A positional argument is auto-classified: an existing directory → folder mode; an
existing file → file mode; otherwise inline text.

## Flags (universal vocabulary — `scripts/voice/lib/params.cjs`)

### Input & engine
| Flag | Default | Notes |
|---|---|---|
| `<text>` / `--text=` / `--file=` / `--folder=` | — | the input. Folder → one audio per file, mirrored. |
| `--use` | `gemini-tts-3.1-flash` | adapter id. Also `openai-tts`, `whisper` (= openai-tts). `elevenlabs`/`azure-tts` = not-built stubs. |
| `--model` | adapter default | override the engine model (e.g. `--model=gemini-2.5-flash` = cheaper + free tier). |

### Voice shaping (the point of the command)
| Flag | Default | Values |
|---|---|---|
| `--type` | `default` | **23 registers** — `default · ads · podcast · story · blog · educational · news · narration · conversational · meditation · announcement` **+ v0.2:** `film · conversation · language-learning · public-speaking · audiobook · asmr · sports · documentary · customer-support · character · poetry · comedy`. Drives the authored voice-direction. (`conversation` = a scripted multi-speaker dialogue/scene, distinct from the solo `conversational`.) Full per-register recipes: `06-ai-ops/skills/voice/preprocess`. |
| `--pace` | `normal` | `very-low · low · normal · fast · very-fast` (steered through spoken-style words — numeric speed is ignored by both engines). |
| `--voice` | adapter default | a named voice (see catalogs below; case-insensitive). |
| `--gender` | `any` | `male · female` → auto-picks the adapter's default voice of that gender. |
| `--instructions` | authored | power-user override of the voice-direction block. |
| `--lang` | `auto` | language hint (both engines are multilingual). |

### Output & operations
| Flag | Default | Notes |
|---|---|---|
| `--format` | `mp3` | `mp3 · wav · opus · aac · flac · m4a · ogg · pcm` (ffmpeg-converted from the engine output). |
| `--chunk-chars` | engine cap | max chars per TTS request (OpenAI ≤3800, Gemini ≤6000); long inputs auto-split + stitch. |
| `--concurrency` | `4` | parallel chunk/file workers. |
| `--max-cost-usd` | `1.00` | per-run circuit breaker — refuses BEFORE any spend (the real guard). |
| `--dry-run` | off | author + chunk + write the script/instruction sidecars, **no API spend**. |
| `--out` | `.archives/voice/<date>-<slug>/` | output dir (root `.archives`, local-only). |
| `--stitch` | on | merge a single input's chunks into one file (off → keep parts). |
| `--normalize` | **on** | *(v0.3)* loudness-normalize every chunk to one target before stitching (EBU R128 `loudnorm`) — uniform volume across the whole output. `--normalize=false` to keep raw per-chunk levels. |
| `--target-lufs` | `-16` | *(v0.3)* the integrated-loudness target (audiobook/podcast standard −16; use −18/−19 for a quieter master). |

Warn-only on the current engines (no native mapping → never silently dropped): `--speed`
(use `--pace`), `--multi-speaker` (Gemini-stretch), `--markup` (Gemini-only), `--style`.

## Consistency on long / multi-file content (v0.3)

A long file or a folder is split into many chunks, and **each TTS request is independent** — it
has no memory of the others, so left alone the chunks drift in voice, tone, pace, and volume.
`/voice` locks consistency on two axes:

1. **Lock the voice profile *before* splitting.** The voice, model, pace, and a **uniformity
   voice-direction** ("one continuous reading; same narrator, same steady tone/pace/volume; do
   NOT dramatize per passage") are chosen once and applied **byte-identical to every chunk**.
   For any multi-chunk run the uniformity clause is injected automatically (`params.withConsistency`);
   keep markup minimal + identical across chunks (no per-chunk creative tags).
2. **Equalize loudness deterministically.** Every chunk is normalized to one target loudness
   (`--target-lufs`, default −16) with two-pass `loudnorm` before concatenation — the only reliable
   cure for the "lúc to lúc nhỏ" volume drift the model produces. (Measured: raw chunks spanned
   ~−20…−23 LUFS → all converge to ~−16 ±1.)

> Inherent limit (honest): chunked TTS still can't perfectly match *timbre/intonation* across a
> seam, because the model has no cross-request state. The uniformity direction + same voice + same
> prompt minimize it; loudnorm removes the volume component entirely. For the tightest result, prefer
> fewer/larger chunks and a calm, even register (`audiobook`/`narration`).

## Flow (dispatches to the `voice` umbrella skill)
1. Parse flags (`params.cjs`); resolve input (text/file/folder); resolve `--use` against `knowledge/voice-adapters.yaml`.
2. **Preprocess** (`voice/preprocess` skill) — read the content in the context of `--type`; author a content-aware voice-direction (voice, tone, emotion, `--pace`, pauses, intonation) → `instructions.txt`; lightly mark up the script (pauses; Gemini `[tags]`).
3. **Record** — small/single input → `node scripts/voice/run.cjs` (chunk → `gen.cjs` per chunk → stitch). Long input / folder → a **Claude Code Workflow** fans out `preprocess → gen` in parallel, then `stitch.cjs`.
4. Report `{ok, file, chunks, cost_usd, model, voice, warnings[]}` — always surface warnings; on `not_built|breaker_refusal|api_error|input_error`, give the typed reason.

## Examples
```
/voice "Master any subject in days, not weeks. Try Ritsu free." --type=ads --pace=fast --voice=Puck
/voice --file=blog/active-learning.md --type=blog --voice=marin --format=mp3
/voice --file=lesson.md --type=educational --pace=low --gender=female --use=gemini-tts-3.1-flash
/voice --folder=scripts/episodes/ --type=podcast --voice=Charon   # one mp3 per file, mirrored
/voice "A bedtime tale…" --type=story --use=openai-tts --voice=ballad --format=wav
/voice "anything" --dry-run                      # author + cost estimate, no spend
/voice "x" --use=elevenlabs                       # → not_built (proves the registry)
```

## Voice catalogs (name · gender · character)

> Gender is the widely-reported perception, not an official vendor contract (neither OpenAI
> nor Gemini officially genders voices). `--gender=female|male` resolves to the adapter
> default of that gender. Source of truth: `scripts/voice/lib/voices.cjs`.

### `gemini-tts-3.1-flash` — 30 voices (Gemini Developer API). Default `Kore`.

| Voice | Gender | Character | Voice | Gender | Character |
|---|---|---|---|---|---|
| **Kore** *(default)* | female | Firm | Puck | male | Upbeat |
| Zephyr | female | Bright | Charon *(male default)* | male | Informative |
| Fenrir | male | Excitable | Leda | female | Youthful |
| Orus | male | Firm | Aoede | female | Breezy |
| Callirrhoe | female | Easy-going | Autonoe | female | Bright |
| Enceladus | male | Breathy | Iapetus | male | Clear |
| Umbriel | male | Easy-going | Algieba | male | Smooth |
| Despina | female | Smooth | Erinome | female | Clear |
| Algenib | male | Gravelly | Rasalgethi | male | Informative |
| Laomedeia | female | Upbeat | Achernar | female | Soft |
| Alnilam | male | Firm | Schedar | male | Even |
| Gacrux | female | Mature | Pulcherrima | female | Forward |
| Achird | male | Friendly | Zubenelgenubi | male | Casual |
| Vindemiatrix | female | Gentle | Sadachbia | male | Lively |
| Sadaltager | male | Knowledgeable | Sulafat | female | Warm |

### `openai-tts` / `whisper` — 13 voices (gpt-4o-mini-tts). Default `marin`. `marin`/`cedar` = highest fidelity.

| Voice | Gender | Character |
|---|---|---|
| **marin** *(default, female)* | female | Fresh, natural, highest-fidelity (recommended) |
| **cedar** *(male default)* | male | Warm, grounded, highest-fidelity (recommended) |
| alloy | neutral | Neutral, balanced, professional — the default workhorse |
| ash | male | Clear, precise, authoritative presenter |
| ballad | male | Smooth, melodic, emotive storyteller |
| coral | female | Warm, friendly, upbeat guide |
| echo | male | Resonant, clear, even-keeled |
| fable | neutral | Expressive, warm, narrative (British-leaning) |
| nova | female | Bright, energetic, conversational |
| onyx | male | Deep, authoritative, broadcast-grade |
| sage | female | Calm, thoughtful, measured |
| shimmer | female | Bright, cheerful, light |
| verse | male | Versatile, expressive, dynamic |

## Governance
Tier A (reversible, local writes, metered + capped). Recording = `GEMINI_API_KEY` /
`OPENAI_API_KEY` out-of-band (compliant with the api-key-vs-subscription policy);
preprocessing = in-session/subscription. Cost-bucket `ai-ops-voice` (gps):
`voice-gen` $0.50 (advisory — out-of-band; the `--max-cost-usd` breaker is the real
guard), `voice-preprocess` $0.10 (in-session). Runtime contract:
`SOP-AIOPS-014-voice-runtime-contract`.
