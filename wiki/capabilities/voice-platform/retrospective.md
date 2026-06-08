# Retrospective — `voice-platform` v0.1

**Shipped:** 2026-06-08, single autonomous `/cla`-style session (founder asleep; "tự thực hiện, tự ship").

## What shipped
A foundational `/voice` TTS primitive: text/file/folder → narrated audio, two live-verified
engines (gemini-tts-3.1-flash default + openai-tts/whisper), content-aware preprocessing,
chunk→gen→ffmpeg-stitch, parallel Workflow path for batch. Mirrors the image-platform
umbrella-skill + split-registry + L2-validator + out-of-band-generation pattern exactly.

## What went well
- **Mirror an operating precedent.** Cloning `image-platform`'s shape (registry/schema/validator/
  gen.cjs/params.cjs/SOP/ROLES caps/registry entry/resolver regen) made the build fast and
  coherent. The two-edit validator rule (check-consistency + CI) and resolver catalog regen were
  the known gotchas — both handled up front.
- **Research-then-build.** Two parallel research agents nailed the exact API shapes before any
  code. This caught the load-bearing trap: the founder's `gemini-tts-3.1-flash` is NOT a real API
  id — the real one is `gemini-3.1-flash-tts-preview` (mapped via `MODEL_ALIAS`), and Gemini
  returns raw PCM (must WAV-wrap), while OpenAI's `speed` param is silently ignored (pace → words).
- **Live-verify before documenting.** Both engines + the multi-chunk stitch were proven with real
  API calls (valid mp3, ffprobe-confirmed) BEFORE writing the docs/spec — so the default
  (`gemini-tts-3.1-flash`) is a verified default, not a hopeful one.
- **Split impure edges.** Pure param/chunk/cost/voice layer (99 unit tests) + isolated fetch
  (gen.cjs) and ffmpeg (audio.cjs) edges → fully testable without mocking the network.

## Decisions
1. **Default engine = `gemini-tts-3.1-flash`** (the founder's headline), verified working; `openai-tts`
   the robust alternative; `whisper` a preset alias honoring the founder's mnemonic (with a doc note
   that "Whisper" proper is OpenAI's STT, this is TTS).
2. **Preprocessing in-session, recording out-of-band.** The voice-direction authoring is the value
   Claude adds (subscription); the synthesis is genuinely external (provider key) — clean policy split.
3. **ffmpeg as the stitch/convert engine** (installed during the build). Gemini PCM and OpenAI's
   non-native formats both route through it; OpenAI native formats skip it.
4. **Option A+ lean observability** — `run.json` superset of a future `ops.voice_runs` (no Tier-2
   migration in v0.1).

## Honest limitations (v0.1)
- Pace is **model-steered** (words in the instruction), not a hard numeric guarantee — because both
  engines ignore numeric speed. Documented; a future `--enforce-pace` (ffmpeg atempo) could add a
  hard guarantee at some quality cost.
- Multi-speaker (Gemini) is registered but not wired into the command surface (single voice per input).
- ElevenLabs / Azure are stubs.
- No `ops.voice_runs` table yet (run.json is the audit substrate).

## Next
`/cla extend voice-platform` for: ElevenLabs/Azure backends, multi-speaker dialogue,
`ops.voice_runs` + KPIs, voice cloning, subtitle sidecars.
