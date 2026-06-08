// ============================================================================
// scripts/voice/lib/chunk.cjs — content-preserving text splitter (pure)
// ============================================================================
// Capability `voice-platform` v0.1. Splits a long script into chunks each <=
// maxChars, so each chunk is one TTS request well under the engine input cap
// (OpenAI 4096 chars; Gemini ~16k chars / chunk-conservatively). Splits at the
// strongest available boundary — paragraph, then sentence, then word — and never
// drops or reorders content: join(chunks, '\n\n')-ish round-trips the words.
// ============================================================================

'use strict';

const DEFAULT_MAX_CHARS = 1800;

/** Split on sentence terminators while keeping the terminator attached to its sentence. */
function splitSentences(text) {
  const parts = text.match(/[^.!?…]+(?:[.!?…]+|$)/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : (text.trim() ? [text.trim()] : []);
}

/** Hard-split an over-long atom (a single huge sentence/word run) on whitespace, <= maxChars each. */
function hardSplit(atom, maxChars) {
  const out = [];
  const words = atom.split(/\s+/).filter(Boolean);
  let buf = '';
  for (const w of words) {
    const candidate = buf ? `${buf} ${w}` : w;
    if (candidate.length > maxChars && buf) { out.push(buf); buf = w; }
    else if (candidate.length > maxChars && !buf) { // a single word longer than the cap → slice it
      for (let i = 0; i < w.length; i += maxChars) out.push(w.slice(i, i + maxChars));
      buf = '';
    } else { buf = candidate; }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Split `text` into chunks each <= maxChars. Greedy accumulation at paragraph
 * granularity; paragraphs over the cap fall back to sentence granularity; a single
 * over-cap sentence falls back to word granularity. Empty input → [].
 * @param {string} text
 * @param {number} [maxChars]
 * @returns {string[]}
 */
function chunkText(text, maxChars = DEFAULT_MAX_CHARS) {
  const cap = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : DEFAULT_MAX_CHARS;
  const src = typeof text === 'string' ? text.trim() : '';
  if (!src) return [];
  if (src.length <= cap) return [src];

  const paragraphs = src.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';

  const flush = () => { if (buf) { chunks.push(buf); buf = ''; } };
  const addPiece = (piece, joiner) => {
    const candidate = buf ? `${buf}${joiner}${piece}` : piece;
    if (candidate.length <= cap) { buf = candidate; return; }
    flush();
    if (piece.length <= cap) { buf = piece; return; }
    // piece itself over the cap → break it down a level.
    flush();
    for (const sentence of splitSentences(piece)) {
      if (sentence.length <= cap) { addPiece(sentence, ' '); continue; }
      flush();
      for (const atom of hardSplit(sentence, cap)) addPiece(atom, ' ');
    }
  };

  for (const para of paragraphs) addPiece(para, '\n\n');
  flush();
  return chunks;
}

module.exports = { chunkText, splitSentences, hardSplit, DEFAULT_MAX_CHARS };
