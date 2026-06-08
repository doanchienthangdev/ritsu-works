# Capability spec — `voice-platform` v0.1 (`/voice`)

**State:** operating (2026-06-08) · **Pillar:** 06-ai-ops · **Owner role:** gps · **HITL:** Tier A · **Cost-bucket:** ai-ops-voice
**Built:** founder-proxy autonomous `/cla` build + ship (founder asleep; explicit "tự thực hiện, tự ship" mandate).

## 1. Problem

The founder needs to **record narration audio** from text, a file, or a folder of files —
for marketing (ads, social), product (lessons, explainers), and content (blog, podcast) —
across **different TTS engines and voices**, with delivery (speed, emotion, pauses,
intonation) **tuned to the content and its purpose**. Two providers have keys in
`runtime/secrets/.env.local`: OpenAI (`OPENAI_API_KEY`) and Gemini (`GEMINI_API_KEY`).

This is a **foundational, build-once-use-forever primitive** (like `/image`, `/translate`):
a model-agnostic front door with a pluggable adapter layer so new engines plug in without
command-side code change.

## 2. Architecture — the 4-stage pipeline

```
input ──▶ [1 resolve] ──▶ [2 PREPROCESS]    ──▶ [3 RECORD]       ──▶ [4 STITCH] ──▶ audio
  text/file/folder    voice/preprocess skill    scripts/voice/gen   scripts/voice/
                      (in-session, the value     (per chunk, OOB     run.cjs (inline)
                       Claude adds)              provider API)       or stitch.cjs (Workflow)
```

1. **Resolve** — inline text / a file → one audio; a folder → one audio per file, mirrored.
   `params.resolveInputSpec` auto-classifies a positional path.
2. **Preprocess** (in-session, subscription) — the `voice/preprocess` skill reads the content
   in the context of `--type` and **authors a content-aware voice-direction** (voice, tone,
   emotion, pace, volume, intonation, pronunciation, pauses) + lightly **marks up the script**
   for speech. This is the quality layer. Deterministic floor = `buildFallbackInstructions`.
3. **Record** (out-of-band) — `scripts/voice/gen.cjs` calls the provider TTS API per chunk.
4. **Stitch** — ffmpeg concat (`lib/audio.cjs`) → one file (single input) or mirrored tree (folder).

Small / single inputs run **inline** via `run.cjs` (chunk → gen → stitch, deterministic).
Long inputs / folders fan out through a **Claude Code Workflow** (preprocess → gen in parallel,
then stitch) — the founder-requested production path.

## 3. The pluggable adapter layer

Split-registry `knowledge/voice-adapters.yaml` (mirrors `image-adapters.yaml`), gated by the
L2-critical `scripts/cross-tier/validate-voice-adapters.cjs` (structural + `supports[] ⊆
UNIVERSAL_PARAMS` + `installed ⇒ generator-on-disk` + `preset_of ⇒ target`). Adding a backend
= drop `adapters/<id>/SKILL.md` + one registry row + one routing-table row + a `callX` in
`gen.cjs`. **No command-side change.**

| `--use` | status | model | voices | notes |
|---|---|---|---|---|
| `gemini-tts-3.1-flash` *(default)* | installed (LIVE-VERIFIED) | `gemini-3.1-flash-tts-preview` | 30 | PCM → WAV → ffmpeg |
| `openai-tts` / `whisper` | installed (LIVE-VERIFIED) | `gpt-4o-mini-tts` | 13 | native mp3 + `instructions` |
| `elevenlabs`, `azure-tts` | registered-not-built | — | — | prove the abstraction |

### Engine API facts (verified June 2026)
- **Gemini** (Developer API): `POST …/v1beta/models/<MODEL>:generateContent`, header `x-goog-api-key`. Body `contents[].parts[].text` + `generationConfig.responseModalities:["AUDIO"]` + `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` (case-sensitive). Returns **base64 PCM** (24kHz/16-bit/mono) in `candidates[0].content.parts[0].inlineData.data` → WAV-wrapped by `lib/audio.pcmToWav`. Style = natural-language prefix + inline `[tags]`; NO SSML / rate param. The founder's id `gemini-tts-3.1-flash` is mapped to the real `gemini-3.1-flash-tts-preview` by `gen.MODEL_ALIAS`.
- **OpenAI**: `POST https://api.openai.com/v1/audio/speech`, Bearer. Body `model`/`voice`/`input`/`instructions`/`response_format`. Returns **audio bytes** (mp3/wav/flac/opus/aac/pcm native). `instructions` (gpt-4o-mini-tts only, ≤4096 ch) steers tone/emotion/pacing. **Numeric `speed` is ignored by gpt-4o-mini-tts** → pace lives in `instructions`. Input ≤4096 chars.

## 4. Parameter surface (`scripts/voice/lib/params.cjs`)

`UNIVERSAL_PARAMS` is the single source of truth (the validator asserts every adapter's
`supports[]` is a subset). Surface: `--type` (11 values) · `--pace` (5) · `--voice` · `--gender`
· `--format` (mp3/wav/opus/aac/flac/m4a/ogg/pcm) · `--use` · `--model` · `--instructions` ·
`--lang` · `--chunk-chars` · `--concurrency` · `--max-cost-usd` · `--dry-run` · `--out` ·
`--stitch`. Unsupported params **WARN, never silently drop** (`computeWarnings`).

## 5. Code inventory

```
scripts/voice/
  gen.cjs       atomic: one chunk → one audio (OOB provider call, breaker, dry-run, run sidecar)
  run.cjs       single input → one stitched audio (chunk → gen-per-chunk pool → stitch + manifest)
  stitch.cjs    CLI over audio.stitchAudio (the Workflow's final concat step)
  lib/
    params.cjs  UNIVERSAL_PARAMS + parse + normalize + resolveInputSpec + resolveVoice + pace + warn
    voices.cjs  per-adapter voice catalogs (name · gender · descriptor) — 13 + 30
    chunk.cjs   content-preserving splitter (paragraph → sentence → word)
    cost.cjs    chars → audio-minutes → USD (per-model $/min)
    audio.cjs   pcmToWav (pure) + ffmpeg convert/stitch (edge)
    env.cjs     GEMINI/OPENAI key loader (worktree→main-root hop; key never printed)
06-ai-ops/skills/voice/{SKILL.md, preprocess/, adapters/gemini-tts-3.1-flash/, adapters/openai-tts/}
.claude/commands/voice.md     (full 30+13 voice catalogs with gender + character)
06-ai-ops/sops/SOP-AIOPS-014-voice-runtime-contract/flow.yaml
knowledge/voice-adapters.yaml + knowledge/schemas/voice-adapters.schema.json
scripts/cross-tier/validate-voice-adapters.cjs (L2; wired into check-consistency + CI)
tests/voice/*.test.ts (99 All-Edge-Cases tests)
```

## 6. Governance

Tier A (reversible, local writes, metered + capped). **Recording = provider key out-of-band**
(compliant with the api-key-vs-subscription policy — Claude can't synthesize speech, same lane
as text-embedding-3-small / gpt-image-2). **Preprocessing = in-session/subscription** (the value
Claude adds). gps `per_task_kind_caps`: `voice-gen` $0.50 (advisory) / `voice-preprocess` $0.10
(hook-enforced). Per-run `--max-cost-usd` breaker (default $1) refuses BEFORE any spend — the
real guard. Keys never printed. Local `.archives/` artifacts only; never touches Product Supabase.

## 7. Observability (Option A+ lean)

Per-run `run.json` + per-chunk `NNN.run.json` (local, full audit rows) + the breaker. `run.json`
columns are a forward-compat superset of a future `ops.voice_runs` (Option B = `/cla extend`).

## 8. Live verification (2026-06-08)

- Gemini 3.1 flash TTS → valid 6.24s mp3 (PCM → WAV → mp3). ✅
- OpenAI gpt-4o-mini-tts (marin) → valid 5.0s mp3. ✅
- `run.cjs` 3-chunk parallel → stitched 16.24s mp3 (ffprobe-confirmed). ✅
- 99 unit tests pass; `check-consistency` clean.

## 9. Future `/cla extend`

ElevenLabs / Azure backends · multi-speaker dialogue (Gemini `multiSpeakerVoiceConfig`) ·
`ops.voice_runs` + KPIs (gen_count / cost_usd_monthly / warn_rate) · voice cloning ·
SRT/subtitle sidecars · deepask → /voice delegation (audio answers).
