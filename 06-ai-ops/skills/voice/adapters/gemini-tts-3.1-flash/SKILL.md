---
name: voice/adapters/gemini-tts-3.1-flash
description: >
  The default /voice TTS adapter — Google Gemini TTS via the Gemini Developer API.
  Founder-facing id "gemini-tts-3.1-flash" maps to the real model gemini-3.1-flash-tts-preview.
  30 prebuilt voices; style via a natural-language prefix + inline [bracket] audio tags;
  returns raw PCM (24kHz/16-bit/mono) → WAV-wrapped → ffmpeg-converted to --format.
  Wired in scripts/voice/gen.cjs (callGemini). Auth: GEMINI_API_KEY, out-of-band.
---

# voice/adapters/gemini-tts-3.1-flash

The default backend, **verified working**. Implemented by `scripts/voice/gen.cjs#callGemini`.

## API shape (Gemini Developer API)
- `POST https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent`
- Auth header `x-goog-api-key: $GEMINI_API_KEY`; `Content-Type: application/json`.
- Body: `contents[].parts[].text` + `generationConfig.responseModalities:["AUDIO"]` + `generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` (**case-sensitive**).
- Response: base64 **PCM** at `candidates[0].content.parts[0].inlineData.data` (mime `audio/L16;rate=24000`). No container → `gen.cjs` wraps it (`lib/audio.cjs#pcmToWav`, 24kHz/16-bit/mono) then converts.

## Models (`--model` override)
| friendly | real id | cost ($/1M out) | note |
|---|---|---|---|
| `gemini-tts-3.1-flash` *(default)* | `gemini-3.1-flash-tts-preview` | $20 | newest, expressive `[tags]` |
| `gemini-2.5-flash` | `gemini-2.5-flash-preview-tts` | $10 | cheaper, free tier, most-tested |
| `gemini-2.5-pro` | `gemini-2.5-pro-preview-tts` | $20 | highest quality, no free tier |

## Style control
- **No SSML, no rate/pitch param.** The entire control surface is the text: `gen.cjs` prepends the authored voice-direction as a natural-language prefix, then the script.
- **Inline audio tags** (honored, expressive on 3.1): `[whispers] [laughs] [sighs] [excited] [sarcastic] [very slow] [extremely fast] [pause]`. The `voice/preprocess` skill emits these for Gemini and strips them for OpenAI.

## Supports / warns
- supports: `voice, pace, instructions, lang, format, markup, multi-speaker`
- warns (no native mapping): `speed` (use pace words), `style` (fold into instructions)

## Voices
30 prebuilt voices — full table (name · gender · descriptor) in the `/voice` command doc and `scripts/voice/lib/voices.cjs#GEMINI_VOICES`. Default `Kore` (female, Firm); `--gender=male` → `Charon`.

## Limits
- Chunk under ~6,000 chars/request (`run.cjs` GEMINI_INPUT_CAP); ~10.9 min audio max per request on 3.1 (output truncates beyond). All preview models → make the model id config, retry on 429.
