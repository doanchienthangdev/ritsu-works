---
name: voice
description: >
  Umbrella skill for the voice-platform capability — the brain behind /voice.
  Turn text, a file, or a folder of files into narrated audio with a pluggable TTS
  adapter layer (--use=<adapter>): gemini-tts-3.1-flash (default) + openai-tts
  (a.k.a. whisper). Reads the content in the context of a --type (ads/podcast/story/
  blog/educational/news/…), AUTHORS a content-aware voice-direction (tone, pace,
  emotion, pauses) + lightly marks up the script, then records out-of-band via the
  provider key and stitches the result. Small inputs run inline; long inputs / folders
  fan out through a Claude Code Workflow. Default mp3; mp3/wav/opus/aac/flac/m4a/ogg/pcm.
  Tier A; per-run --max-cost-usd breaker; artifacts to .archives/voice/<date>-<slug>/.
---

# voice — capability `voice-platform` v0.1

The `/voice` command loads this skill. It is the **orchestrator**: it parses flags,
resolves the input, runs the **preprocessing brain** (the `voice/preprocess` skill —
the part that makes the audio *good*), records audio out-of-band through the resolved
adapter, and stitches the result. The two real engines are **verified working**:
`gemini-tts-3.1-flash` (Gemini Developer API, 30 voices, returns PCM → WAV-wrapped)
and `openai-tts` / `whisper` (gpt-4o-mini-tts, 13 voices, native mp3).

> **Billing:** speech synthesis is OUT-OF-BAND (Claude can't synthesize speech) → it
> uses `GEMINI_API_KEY` / `OPENAI_API_KEY` exactly like text-embedding / gpt-image-2,
> per the api-key-vs-subscription policy. The **preprocessing** (reading + script
> authoring) is the in-session/subscription work — that's the value Claude adds.

## The pipeline (what every /voice run does)

```
input ──▶ [1 resolve] ──▶ [2 PREPROCESS]  ──▶ [3 RECORD]      ──▶ [4 STITCH] ──▶ audio
  text/file/folder    voice/preprocess skill   scripts/voice/    scripts/voice/
                      authors instructions +    gen.cjs (per      run.cjs (inline) or
                      marks up the script       chunk, OOB API)   stitch.cjs (Workflow)
```

### 1 — Resolve the input
- inline **text** (positional or `--text=`) → one audio file
- a **file** (`--file=` or a positional path) → one audio file
- a **folder** (`--folder=` or a positional dir) → **one audio file per source file**, mirroring the tree under `out/`
Auto-detection: a positional token that is an existing dir → folder; existing file → file; else inline text. `scripts/voice/lib/params.cjs#resolveInputSpec` does this deterministically.

### 2 — Preprocess (the brain — do this WELL)
**Always** invoke the `voice/preprocess` skill for the input (or per chunk/file). It:
- reads the content **in the context of `--type`** (an ad is punchy + persuasive; a meditation is slow + soft; news is crisp + neutral; a story has an emotional arc);
- authors a **voice-direction block** (the OpenAI `instructions` field / the Gemini natural-language style prefix) covering **voice, tone, emotion, pace, volume, intonation, pronunciation, and pauses** — tuned to *this* content;
- lightly **rewrites/marks up the script** for speech: pauses via punctuation/ellipses/paragraph breaks (both engines) and inline `[bracket]` audio tags (`[pause]`, `[excited]`, `[whispers]`, `[very slow]` — Gemini only; strip for OpenAI);
- folds in `--pace` (very-low…very-fast) as a spoken-pace directive (numeric speed is ignored by both engines — pace lives in the words).
Write the authored direction to `<run>/instructions.txt` and the marked-up script to the run dir, then hand the paths to the recorder. **Do not skip this** — a styleless read is the floor (`buildFallbackInstructions`), not the goal.

### 3 — Record (out-of-band)
- **Small / single input** → `node scripts/voice/run.cjs` does chunk → gen-per-chunk → stitch in one deterministic call. This is the default path.
- **Long input or a folder** → drive a **Claude Code Workflow** (see template below) so chunks/files preprocess + record in PARALLEL, then stitch. This is the foundational production path the founder asked for.

### 4 — Stitch (loudness-leveled + equalized)
`run.cjs` stitches in-process; the Workflow path calls `scripts/voice/stitch.cjs` after the parallel gen jobs land. Single input → one file in `out/`; folder → mirrored files. **v0.3.1:** stitching **dynamically levels** every part (compressor → `dynaudnorm`, bringing quiet passages up — `--level`, default ON) *then* normalizes to one target (`--target-lufs`, default −16 LUFS) before concatenating, so the whole output plays at a steady volume *and* every passage is the same level (not just every chunk's average). Use `stitch.cjs --in-dir=parts --out=book.mp3` (leveling/normalize default ON; `--no-level`/`--no-normalize` to opt out).

### Consistency on LONG / MULTI-FILE content (v0.3 — do this)
Independent TTS requests drift in voice/tone/pace/volume. **Lock the voice profile BEFORE splitting** and apply it identically to every chunk:
- Choose the voice (one `--voice`) + model + pace ONCE. For a folder, also audition 2–3 candidate voices first (cheap) and pick one.
- Author ONE voice-direction that emphasizes **uniformity**: "one continuous reading; the SAME single narrator, the same steady volume, pace, and even tone for every part; do NOT dramatize or re-characterize per passage." `params.withConsistency()` injects this clause automatically for any multi-chunk `run.cjs` render; in the Workflow path, write it into the shared `instructions.txt` once and pass it to every `gen.cjs` call.
- Keep markup **minimal and identical** across chunks (punctuation pauses only; no per-chunk creative `[tags]`).
- Prefer **fewer/larger chunks** (Gemini ~6k chars/chunk) and a calm register (`audiobook`/`narration`) to minimize seams.
- **Stitch with `--normalize` ON** (default) so loudness is uniform — `stitch.cjs --in-dir=parts --out=book.mp3` already normalizes. The loudness fix is deterministic; the voice/tone consistency is best-effort (the model has no cross-request memory).

## Adapter routing table (`knowledge/voice-adapters.yaml`)

| `--use` | engine / model | voices | style control | output |
|---|---|---|---|---|
| **`gemini-tts-3.1-flash`** *(default)* | Gemini Developer API → `gemini-3.1-flash-tts-preview` | 30 | natural-language prefix + `[tags]` | PCM → WAV → any |
| `openai-tts` / `whisper` | `gpt-4o-mini-tts` | 13 (`marin`/`cedar` best) | `instructions` field (≤4096 ch) | native mp3/wav/opus/aac/flac/pcm |
| `elevenlabs`, `azure-tts` | — | — | — | **registered-not-built** stubs |

`--model` overrides the engine model (e.g. `--model=gemini-2.5-flash` → the cheaper `gemini-2.5-flash-preview-tts` with a free tier). `--voice` picks a named voice; `--gender=male|female` auto-picks the adapter's default for that gender. Full voice tables (name · gender · character) are in the `/voice` command doc + `scripts/voice/lib/voices.cjs`.

## Inline invocation (small / single input)

```bash
# after authoring instructions.txt for the input:
node scripts/voice/run.cjs \
  --file="path/to/script.md" --use=gemini-tts-3.1-flash \
  --type=podcast --pace=normal --voice=Charon --format=mp3 \
  --instructions-file="<run>/instructions.txt" \
  --out="<run>" --name="episode-1" --max-cost-usd=1.00
# → { ok, file, chunks, cost_usd, parts[], warnings[] }
```

## Workflow invocation (long input / folder — the parallel production path)

When the input is large (many chunks) or a folder (many files), use a **Workflow** so
preprocessing + recording run concurrently. Pattern: pipeline each unit through
`preprocess → gen`, then stitch. (Workflow requires the founder's opt-in, which the
`/voice` request implies for batch work.)

```js
export const meta = {
  name: 'voice-batch',
  description: 'Preprocess + record + stitch a long script / a folder of scripts in parallel',
  phases: [{ title: 'Preprocess+Record' }, { title: 'Stitch' }],
}
// `args` = { units: [{ id, text|file, type, pace, voice, use, format, outDir }], ... }
const results = await pipeline(
  args.units,
  // stage 1 — author the voice-direction for this unit, then record its chunks
  async (unit) => {
    const direction = await agent(
      `You are voice/preprocess. Read this ${unit.type} script and write ONLY the voice-direction block ` +
      `(voice, tone, emotion, pace=${unit.pace}, pauses) tuned to it. Script:\n\n${unit.text}`,
      { label: `preprocess:${unit.id}`, phase: 'Preprocess+Record' }
    )
    // write direction to disk + run the deterministic recorder for this unit
    return { unit, direction }
  },
  // stage 2 is the stitch — but run.cjs already stitches per unit, so the per-unit
  // result IS the finished file; this stage just collects. For a SINGLE long input
  // split across units, call scripts/voice/stitch.cjs --in-dir=<parts> here instead.
  (r) => r
)
return results
```

In practice the orchestrator writes each unit's `instructions.txt`, then calls
`node scripts/voice/run.cjs --file=<unit> --instructions-file=<…> --out=<…>` (one
finished file per unit), OR for ONE long input: many `gen.cjs --name=NNN` jobs into a
shared `parts/` dir followed by one `stitch.cjs --in-dir=parts --out=final.mp3`.

## Output layout

```
.archives/voice/<date>-<slug>/
  instructions.txt          # the authored voice-direction (shared across the input's chunks)
  parts/NNN.<fmt> NNN.run.json   # per-chunk audio + sidecars
  out/<slug>.<fmt>          # single input → one stitched file
  out/<relpath>.<fmt> …     # folder input → mirrored tree
  run.json                  # top-level manifest
```

## Governance

Tier A (reversible, local writes, metered + capped). Recording = provider key
out-of-band (compliant); preprocessing = in-session/subscription. Per-run
`--max-cost-usd` breaker refuses BEFORE any spend (the real guard). Cost-bucket
`ai-ops-voice` (gps). Runtime contract: `SOP-AIOPS-014-voice-runtime-contract`.
Always surface `warnings[]`; on `not_built|breaker_refusal|api_error|input_error`,
report the typed reason.
