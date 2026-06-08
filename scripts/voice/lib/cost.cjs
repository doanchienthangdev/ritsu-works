// ============================================================================
// scripts/voice/lib/cost.cjs — voice-platform cost estimator (pure)
// ============================================================================
// Capability `voice-platform` v0.1. Estimates USD for a TTS request from input
// character count. The breaker (gen.cjs) refuses BEFORE any spend when the
// estimate exceeds --max-cost-usd. Rates are per-MINUTE of generated audio
// (the dominant cost; input-text cost is negligible for prose) per the June-2026
// provider pricing pages (see SOP-AIOPS-014 + the research in the spec).
//
//   gpt-4o-mini-tts            $0.60/1M in + $12/1M audio-out ≈ $0.015/min
//   gemini-2.5-flash-preview   $0.50/1M in + $10/1M audio-out ≈ $0.015/min
//   gemini-3.1-flash-tts       $1.00/1M in + $20/1M audio-out ≈ $0.030/min
//   gemini-2.5-pro-preview     $1.00/1M in + $20/1M audio-out ≈ $0.030/min
// ============================================================================

'use strict';

// ~150 wpm * ~5.7 chars/word ≈ 850 chars/min spoken. Conservative-low so the
// minute (and therefore the cost) estimate runs slightly HIGH → the breaker errs safe.
const CHARS_PER_MINUTE = 850;

const RATE_PER_MIN = Object.freeze({
  'gpt-4o-mini-tts': 0.015,
  'gemini-2.5-flash-preview-tts': 0.015,
  'gemini-3.1-flash-tts-preview': 0.03,
  'gemini-2.5-pro-preview-tts': 0.03,
});
const DEFAULT_RATE_PER_MIN = 0.03; // conservative fallback for an unknown model id.

/** Resolve the $/min rate for a model id (substring-tolerant), else the safe default. */
function ratePerMinute(model) {
  if (typeof model === 'string') {
    if (RATE_PER_MIN[model] !== undefined) return RATE_PER_MIN[model];
    for (const [k, v] of Object.entries(RATE_PER_MIN)) if (model.includes(k)) return v;
  }
  return DEFAULT_RATE_PER_MIN;
}

/**
 * Estimate cost + duration for a chunk of text.
 * @param {{chars:number, model?:string}} args
 * @returns {{ usd:number, minutes:number, ratePerMin:number, isEstimate:true }}
 */
function estimateCost({ chars, model }) {
  const n = Number.isFinite(chars) && chars > 0 ? chars : 0;
  const minutes = n / CHARS_PER_MINUTE;
  const rate = ratePerMinute(model);
  const usd = Math.round(minutes * rate * 1e4) / 1e4;
  return { usd, minutes: Math.round(minutes * 100) / 100, ratePerMin: rate, isEstimate: true };
}

module.exports = { estimateCost, ratePerMinute, CHARS_PER_MINUTE, RATE_PER_MIN, DEFAULT_RATE_PER_MIN };
