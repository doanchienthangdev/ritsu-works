---
name: voice-adapter-elevenlabs
description: >
  The ElevenLabs TTS backend for /voice (--use=elevenlabs). Carries the Ritsu brand
  voice (KAI). Default model eleven_v3 — the only one that reads inline [audio tags],
  which is how emotion is steered here. Built 2026-07-29 by capability video-platform
  Sprint 1, because /video routes all narration through /voice.
---

# `/voice --use=elevenlabs`

The richest-sounding of the three backends and the one carrying **Ritsu's brand voice**.
Used for every narration line in the Ritsu launch film.

```bash
/voice "Your text here" --use=elevenlabs --voice=KAI
```

## What makes this adapter different

Three things break the pattern the other two backends share — get these wrong and the
output is silently worse:

| Concern | OpenAI / Gemini | **ElevenLabs** |
|---|---|---|
| Voice identity | a public name (`marin`, `Kore`) | an **opaque `voice_id`** in the URL path |
| Style / emotion | a separate `instructions` field / prompt prefix | **inline `[audio tags]` inside the text itself** |
| Auth header | `Authorization: Bearer …` | `xi-api-key` |

### Voices are env-resolved, not enumerated

Our key is scoped `text_to_speech` only — it cannot list voices (`voices_read` is absent),
and a `voice_id` is semi-private. So the catalog (`scripts/voice/lib/voices.cjs`) maps a
**friendly name → an env var holding the id**:

| Name | Env var | Character |
|---|---|---|
| **KAI** (default) | `KAI_VOICE_ID` | Warm, grounded narrator — the Ritsu brand voice |
| MAYA | `MAYA_VOICE_ID` | Bright, articulate alternate |

Ids live in `runtime/secrets/.env.local`, never in the repo. You may also pass a raw
`voice_id` directly and it is used as-is.

## Audio tags — the whole point of `eleven_v3`

`eleven_v3` is the **only** model that reads bracketed performance tags. They go *in the
text*, inline, where the delivery should change:

```
[sighs] You read the chapter. [tired] You watched the lecture. [pause]
And the night before the exam… it's still not yours.
```

Discipline that survived contact with a real 3-minute film:

- **One emotion tag per line, at the start.** Then let the words carry it. Over-tagging
  makes v3 *less* human and less stable.
- **Breathe.** `[sighs]` `[exhales]` `[inhales]` at real pause points is the single
  biggest "this sounds like a person" lever.
- **Hesitate with punctuation, not tags.** An ellipsis `…` is a caught thought; an
  em-dash `—` is a self-interrupt.
- **CAPS once per line, maximum** — the one word the sentence turns on.
- Documented-safe tags: `[sighs] [exhales] [inhales] [laughs softly] [whispers] [excited]
  [curious] [pause] [clears throat] [dramatic tone]`. Descriptive ones (`[warmly]
  [thoughtful] [reassuring] [gently] [confident] [emphatically]`) also work — but **test
  each and drop any the voice ignores.**

Switching to `eleven_multilingual_v2` makes tags inert; they will be read as literal text
or dropped. If you do not need tags it is the more stable choice.

## Parameters

| Flag | Behaviour |
|---|---|
| `--voice` | Catalog name (`KAI`/`MAYA`) or a raw `voice_id`. Default `KAI`. |
| `--model` | `eleven_v3` (default) · `eleven_multilingual_v2` · `eleven_turbo_v2_5` |
| `--format` | `mp3` and `pcm` are native; everything else is fetched as mp3 and transcoded by ffmpeg |
| `--instructions` | **Warned, not applied** — there is no instructions field on this API. Put the direction in audio tags. It is still recorded in the run sidecar for provenance. |
| `--pace` | **Warned, not applied** — pacing comes from punctuation and tags, not a speed knob |

## Loudness

Output lands around **−13…−15 LUFS**, which is *louder* than HeyGen avatar audio
(−15.8…−17.7). Mixing the two raw produces an audible jump at every cut — that is a real
bug we shipped once and had to fix.

Do not hand-roll a fix: `scripts/voice/lib/audio.cjs` already exports `measureLoudness` /
`normalizeLoudness` with `DEFAULT_LUFS = { i: -16, tp: -1.5 }`, and
`scripts/video/gates/check-loudness.cjs` gates it.

## Cost

Billed per character, out-of-band (subscription credits), so it is **invisible to the
in-session budget hook**. The per-run `--max-cost-usd` breaker is the real guard.
Roughly 2,800 characters ≈ one 3-minute narration.

## Failure modes worth recognising

| Symptom | Cause |
|---|---|
| `401 … missing permission` on `/v1/voices` or `/v1/user` | key is `text_to_speech`-only. **Generation still works** — only metadata reads fail. |
| Voice did not resolve to a voice_id | catalog name given but its env var is unset in `runtime/secrets/.env.local` |
| Tags read aloud as words | model is not `eleven_v3` |
| Output much louder than the rest of the film | normalisation step skipped — run the loudness gate |
