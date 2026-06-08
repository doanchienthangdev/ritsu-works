// ============================================================================
// scripts/voice/lib/env.cjs — voice-platform secret loader
// ============================================================================
// Capability `voice-platform` v0.1. Generalizes the proven deepask/image-gen.cjs
// key-loading pattern to ANY env var (OPENAI_API_KEY for openai-tts, GEMINI_API_KEY
// for gemini-tts) — TTS generation is OUT-OF-BAND external API work (Claude can't
// synthesize speech), so it legitimately uses provider keys, exactly like
// text-embedding-3-small / gpt-image-2.
//
// runtime/ is local-only and is NOT copied into git worktrees, so when we run from
// `<root>/.claude/worktrees/<name>/` the secrets live in the MAIN repo root — both
// candidates are resolved. The key VALUE is never printed (per the never-leak rule).
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Candidate `.env.local` paths, in priority order. Override the whole search with
 * RITSU_ENV_LOCAL. The worktree→main-root hop is what lets a worktree session find
 * the local-only secrets.
 * @returns {string[]} de-duplicated absolute candidate paths.
 */
function envLocalCandidates() {
  const cands = [];
  if (process.env.RITSU_ENV_LOCAL) cands.push(process.env.RITSU_ENV_LOCAL);
  cands.push(path.join(REPO_ROOT, 'runtime', 'secrets', '.env.local'));
  const marker = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  const idx = REPO_ROOT.indexOf(marker);
  if (idx !== -1) {
    const mainRoot = REPO_ROOT.slice(0, idx);
    cands.push(path.join(mainRoot, 'runtime', 'secrets', '.env.local'));
  }
  return [...new Set(cands)];
}

/**
 * Load a single named key from the first readable `.env.local` candidate into
 * process.env if absent. Returns true once the key is present. No value is logged.
 * @param {string} keyName e.g. 'OPENAI_API_KEY' | 'GEMINI_API_KEY'
 * @returns {boolean}
 */
function ensureKey(keyName) {
  if (process.env[keyName]) return true;
  const re = new RegExp(`^\\s*(?:export\\s+)?${keyName}\\s*=\\s*(.*?)\\s*$`);
  for (const file of envLocalCandidates()) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      for (const line of raw.split('\n')) {
        const m = re.exec(line);
        if (m) {
          let v = m[1].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          if (v) {
            process.env[keyName] = v;
            return true;
          }
        }
      }
    } catch (_e) {
      /* try next candidate */
    }
  }
  return Boolean(process.env[keyName]);
}

module.exports = { ensureKey, envLocalCandidates, REPO_ROOT };
