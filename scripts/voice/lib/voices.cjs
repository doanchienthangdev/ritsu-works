// ============================================================================
// scripts/voice/lib/voices.cjs — per-adapter voice catalogs (pure data)
// ============================================================================
// Capability `voice-platform` v0.1. The single source of truth for which voices
// each TTS backend exposes, each voice's perceived GENDER and one-line CHARACTER.
// Consumed by:
//   - params.cjs        → --voice validation + --gender auto-pick
//   - gen.cjs           → adapter dispatch
//   - the command doc   → the full voice tables (kept in sync by a test)
//
// GENDER caveat: neither OpenAI nor the Gemini Developer API officially genders
// their voices. The labels here are the widely-reported listener perception
// (OpenAI) / the Cloud-TTS console split (Gemini). Treat as a convenience hint,
// not a contract. `descriptor` is the vendor's own published one-word character
// where one exists.
// ============================================================================

'use strict';

// OpenAI gpt-4o-mini-tts — 13 voices. marin + cedar are the newest, highest-fidelity
// (gpt-4o-mini-tts-only) and are the recommended quality picks.
const OPENAI_VOICES = Object.freeze([
  { name: 'alloy', gender: 'neutral', descriptor: 'Neutral, balanced, professional — the default workhorse' },
  { name: 'ash', gender: 'male', descriptor: 'Clear, precise, authoritative presenter' },
  { name: 'ballad', gender: 'male', descriptor: 'Smooth, melodic, emotive storyteller' },
  { name: 'coral', gender: 'female', descriptor: 'Warm, friendly, upbeat guide' },
  { name: 'echo', gender: 'male', descriptor: 'Resonant, clear, even-keeled' },
  { name: 'fable', gender: 'neutral', descriptor: 'Expressive, warm, narrative (British-leaning)' },
  { name: 'nova', gender: 'female', descriptor: 'Bright, energetic, conversational' },
  { name: 'onyx', gender: 'male', descriptor: 'Deep, authoritative, broadcast-grade' },
  { name: 'sage', gender: 'female', descriptor: 'Calm, thoughtful, measured' },
  { name: 'shimmer', gender: 'female', descriptor: 'Bright, cheerful, light' },
  { name: 'verse', gender: 'male', descriptor: 'Versatile, expressive, dynamic' },
  { name: 'marin', gender: 'female', descriptor: 'Fresh, natural, highest-fidelity (recommended)' },
  { name: 'cedar', gender: 'male', descriptor: 'Warm, grounded, highest-fidelity (recommended)' },
]);

// ElevenLabs — the founder's own cloned/selected voices. Unlike OpenAI/Gemini,
// ElevenLabs identifies a voice by an opaque voice_id, not a public name, and
// enumerating them needs the `voices_read` scope (our key is text_to_speech-only).
// So the catalog maps a FRIENDLY NAME → an env var holding that id. The id itself
// is semi-private and stays in runtime/secrets/.env.local — never in the repo.
const ELEVENLABS_VOICES = Object.freeze([
  { name: 'KAI', gender: 'male', descriptor: 'Warm, grounded narrator — the Ritsu brand voice', env: 'KAI_VOICE_ID' },
  { name: 'MAYA', gender: 'female', descriptor: 'Bright, articulate alternate', env: 'MAYA_VOICE_ID' },
]);

// Gemini TTS — 30 prebuilt voices. Available on every gemini-*-tts model.
const GEMINI_VOICES = Object.freeze([
  { name: 'Zephyr', gender: 'female', descriptor: 'Bright' },
  { name: 'Puck', gender: 'male', descriptor: 'Upbeat' },
  { name: 'Charon', gender: 'male', descriptor: 'Informative' },
  { name: 'Kore', gender: 'female', descriptor: 'Firm' },
  { name: 'Fenrir', gender: 'male', descriptor: 'Excitable' },
  { name: 'Leda', gender: 'female', descriptor: 'Youthful' },
  { name: 'Orus', gender: 'male', descriptor: 'Firm' },
  { name: 'Aoede', gender: 'female', descriptor: 'Breezy' },
  { name: 'Callirrhoe', gender: 'female', descriptor: 'Easy-going' },
  { name: 'Autonoe', gender: 'female', descriptor: 'Bright' },
  { name: 'Enceladus', gender: 'male', descriptor: 'Breathy' },
  { name: 'Iapetus', gender: 'male', descriptor: 'Clear' },
  { name: 'Umbriel', gender: 'male', descriptor: 'Easy-going' },
  { name: 'Algieba', gender: 'male', descriptor: 'Smooth' },
  { name: 'Despina', gender: 'female', descriptor: 'Smooth' },
  { name: 'Erinome', gender: 'female', descriptor: 'Clear' },
  { name: 'Algenib', gender: 'male', descriptor: 'Gravelly' },
  { name: 'Rasalgethi', gender: 'male', descriptor: 'Informative' },
  { name: 'Laomedeia', gender: 'female', descriptor: 'Upbeat' },
  { name: 'Achernar', gender: 'female', descriptor: 'Soft' },
  { name: 'Alnilam', gender: 'male', descriptor: 'Firm' },
  { name: 'Schedar', gender: 'male', descriptor: 'Even' },
  { name: 'Gacrux', gender: 'female', descriptor: 'Mature' },
  { name: 'Pulcherrima', gender: 'female', descriptor: 'Forward' },
  { name: 'Achird', gender: 'male', descriptor: 'Friendly' },
  { name: 'Zubenelgenubi', gender: 'male', descriptor: 'Casual' },
  { name: 'Vindemiatrix', gender: 'female', descriptor: 'Gentle' },
  { name: 'Sadachbia', gender: 'male', descriptor: 'Lively' },
  { name: 'Sadaltager', gender: 'male', descriptor: 'Knowledgeable' },
  { name: 'Sulafat', gender: 'female', descriptor: 'Warm' },
]);

// Per-adapter catalog + the adapter's default voice (a high-fidelity, neutral-ish pick).
const CATALOG = Object.freeze({
  'openai-tts': { voices: OPENAI_VOICES, default: 'marin', defaultByGender: { female: 'marin', male: 'cedar', neutral: 'alloy' } },
  'gemini-tts-3.1-flash': { voices: GEMINI_VOICES, default: 'Kore', defaultByGender: { female: 'Kore', male: 'Charon', neutral: 'Charon' } },
  elevenlabs: { voices: ELEVENLABS_VOICES, default: 'KAI', defaultByGender: { female: 'MAYA', male: 'KAI', neutral: 'KAI' } },
});

/**
 * Resolve an ElevenLabs voice to its opaque voice_id.
 * Accepts a friendly catalog name (KAI/MAYA → its env var) or a raw voice_id
 * passed straight through. Returns null when the name is unknown or the env
 * var holding the id is not set.
 */
function resolveElevenVoiceId(voiceName, env = process.env) {
  if (typeof voiceName !== 'string' || !voiceName.trim()) return null;
  const raw = voiceName.trim();
  const hit = ELEVENLABS_VOICES.find((v) => v.name.toLowerCase() === raw.toLowerCase());
  if (hit) return env[hit.env] ? String(env[hit.env]).trim() : null;
  // Not a catalog name — treat it as a literal voice_id (ElevenLabs ids are opaque).
  return /^[A-Za-z0-9_-]{16,}$/.test(raw) ? raw : null;
}

/** Return the catalog entry for an adapter id, falling back to a preset's target via aliasMap. */
function catalogFor(adapterId, aliasMap = {}) {
  const resolved = aliasMap[adapterId] || adapterId;
  return CATALOG[resolved] || null;
}

/** Case-insensitive voice lookup within an adapter; returns the canonical voice record or null. */
function findVoice(adapterId, voiceName, aliasMap = {}) {
  const cat = catalogFor(adapterId, aliasMap);
  if (!cat || typeof voiceName !== 'string') return null;
  const needle = voiceName.trim().toLowerCase();
  return cat.voices.find((v) => v.name.toLowerCase() === needle) || null;
}

module.exports = {
  OPENAI_VOICES, GEMINI_VOICES, ELEVENLABS_VOICES,
  CATALOG, catalogFor, findVoice, resolveElevenVoiceId,
};
