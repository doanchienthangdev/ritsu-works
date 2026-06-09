// ============================================================================
// scripts/write/humanize/scan.cjs — the deterministic AI-smell gate for /write
// ============================================================================
// Wraps the VENDORED detectors (MIT — see vendor/NOTICE.md) into one combined
// report + a pass/fail the orchestrator gates on before output:
//   - avoid-ai-writing/detector/patterns.js  → 0-100 score + classification + issues (always; pure JS)
//   - unslop/scripts/banned_phrase_scan.py    → banned-phrase violations (when python3 present)
//   - unslop/scripts/readability_metrics.py   → sentence-length variance / rhythm (when python3 present)
//
// CLI:  node scripts/write/humanize/scan.cjs <file>            (or pipe text on stdin)
//       node scripts/write/humanize/scan.cjs --text="..." [--context=marketing] [--threshold=25]
// Output: one line of JSON. Pure-ish: the JS detector is pure; python is the impure,
// OPTIONAL edge (graceful degrade — never throws on a missing interpreter).
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname;
// NOTE: vendored as `.cjs` (not the upstream `.js`) — this repo's package.json is
// `type: module`, so a `.js` would be treated as ESM and its CJS `module.exports`
// guard skipped. Content is byte-identical to upstream; only the extension changed.
const AIDetector = require(path.join(HERE, 'vendor', 'avoid-ai-writing', 'detector', 'patterns.cjs'));
const PY_DIR = path.join(HERE, 'vendor', 'unslop', 'scripts');

const DEFAULT_THRESHOLD = 25;   // final draft must score ≤ this to pass the gate

/** Run the always-available JS detector. @returns {object} analyzeText result */
function runDetector(text, contextMode = 'general') {
  return AIDetector.analyzeText(text || '', { contextMode });
}

/** Try a vendored python scanner over stdin; null if python3 absent or it errors. */
function runPython(scriptName, text) {
  const script = path.join(PY_DIR, scriptName);
  if (!fs.existsSync(script)) return null;
  const r = spawnSync('python3', [script], { input: text, encoding: 'utf8', timeout: 20000 });
  // NOTE: banned_phrase_scan.py exits non-zero (status 1) when it FINDS violations —
  // that's a linter convention, not a crash. So we ignore the exit code and rely on
  // whether stdout parses as JSON. Only a spawn `error` (e.g. no python3) or unparseable
  // output is a real failure.
  if (r.error || !r.stdout) return null;
  const out = r.stdout.trim();
  // The vendored scanners emit one pretty-printed JSON object (multi-line).
  try { return JSON.parse(out); } catch { /* fall through */ }
  // Defensive: a script that printed log lines before the JSON — grab the last {...} block.
  const m = out.match(/\{[\s\S]*\}\s*$/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  return null;
}

/**
 * Combined AI-smell scan + gate.
 * @param {string} text
 * @param {{contextMode?:string, threshold?:number, skipPython?:boolean}} [opts]
 * @returns {object} combined report
 */
function scan(text, opts = {}) {
  const contextMode = opts.contextMode || 'general';
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_THRESHOLD;
  const det = runDetector(text, contextMode);

  const issues = Array.isArray(det.issues) ? det.issues : [];
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const i of issues) {
    const s = (i.severity || 'low').toLowerCase();
    if (bySeverity[s] !== undefined) bySeverity[s] += 1;
  }
  const topIssues = issues.slice(0, 12).map((i) => ({
    type: i.type, severity: i.severity, text: i.text || i.match || i.snippet,
  }));

  let banned = null;
  let readability = null;
  if (!opts.skipPython) {
    banned = runPython('banned_phrase_scan.py', text);
    readability = runPython('readability_metrics.py', text);
  }

  const score = Number.isFinite(det.score) ? det.score : 0;
  const classification = det.classification || 'UNSCORED';
  const pass = score <= threshold && classification !== 'AI_ONLY' && !det.tooShort;

  return {
    ai_smell_score: score,                 // 0 (human) .. 100 (AI)
    classification,                        // HUMAN_ONLY | MIXED | AI_ONLY | UNSCORED
    confidence: det.confidence,
    threshold,
    pass,
    issues_by_severity: bySeverity,
    issue_count: issues.length,
    top_issues: topIssues,
    banned_phrases: banned ? {
      count: Number.isFinite(banned.total_violations) ? banned.total_violations : (banned.violations || banned.issues || []).length,
      by_severity: banned.by_severity || null,
      detail: banned,
    } : null,
    readability,
    too_short: !!det.tooShort,
    context_mode: contextMode,
    sources: ['avoid-ai-writing/patterns.js'].concat(banned || readability ? ['unslop/python-scanners'] : []),
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function readInput(argv) {
  const fileArg = argv.find((a) => a && !a.startsWith('--'));
  const textFlag = argv.find((a) => a && a.startsWith('--text='));
  if (textFlag) return textFlag.slice('--text='.length);
  if (fileArg && fs.existsSync(fileArg)) return fs.readFileSync(fileArg, 'utf8');
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const ctx = (argv.find((a) => a.startsWith('--context=')) || '').split('=')[1] || 'general';
  const thr = Number((argv.find((a) => a.startsWith('--threshold=')) || '').split('=')[1]) || DEFAULT_THRESHOLD;
  const text = readInput(argv);
  const out = scan(text, { contextMode: ctx, threshold: thr });
  process.stdout.write(JSON.stringify(out) + '\n');
}

module.exports = { scan, runDetector, DEFAULT_THRESHOLD };
