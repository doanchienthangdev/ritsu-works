#!/usr/bin/env node
'use strict';
/**
 * scripts/prompt/render.cjs — capability `prompt-platform` v0.1
 *
 * Owns the OUTPUT SURFACE of /prompt so no skill ever hand-formats a result.
 * Pure Node, zero API, zero secret.
 *
 *   --output=default   → fenced code blocks on stdout (the terminal surface)
 *   --output=markdown  → a .md file, one fenced block per prompt + a parameter table
 *   --output=artifact  → a self-contained .html file with a real Copy button per prompt
 *                        (the caller then publishes it with the Artifact tool)
 *
 * Input is a payload JSON — from --input=<file> or stdin:
 *   { direction, verb, mode, model, ar?, realism, input, rationale?,
 *     prompts: [ { label?, text, params?, note? } ],
 *     warnings?: [], changes?: [] }
 *
 * Always writes run.json next to file outputs — the forward-compatible superset of a
 * future ops.prompt_runs table (Option A+: no Tier-2 table in v0.1).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const VALID_OUTPUTS = ['default', 'markdown', 'artifact'];

function parseArgv(argv) {
  const out = {};
  for (const tok of argv) {
    if (!tok.startsWith('--')) continue;
    const eq = tok.indexOf('=');
    if (eq === -1) out[tok.slice(2)] = true;
    else out[tok.slice(2, eq)] = tok.slice(eq + 1);
  }
  return out;
}

function slugify(s, max = 48) {
  return String(s || 'prompt')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'prompt';
}

function validatePayload(p) {
  const errs = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['payload must be an object'];
  if (!p.direction) errs.push('payload.direction is required');
  if (!Array.isArray(p.prompts) || p.prompts.length === 0) errs.push('payload.prompts must be a non-empty array');
  else {
    p.prompts.forEach((x, i) => {
      if (!x || typeof x !== 'object') errs.push(`payload.prompts[${i}] must be an object`);
      else if (typeof x.text !== 'string' || x.text.trim().length === 0) errs.push(`payload.prompts[${i}].text is required`);
    });
  }
  return errs;
}

/** Fence width that survives prompts containing backticks. */
function fenceFor(text, lang = '') {
  let n = 3;
  const m = String(text).match(/`{3,}/g);
  if (m) n = Math.max(3, ...m.map((s) => s.length)) + 1;
  const f = '`'.repeat(n);
  return { open: `${f}${lang}`, close: f };
}

function metaLine(p) {
  const bits = [`direction: ${p.direction}`, `verb: ${p.verb || 'build'}`, `mode: ${p.mode || 'text'}`];
  if (p.model) bits.push(`model: ${p.model}`);
  if (p.ar) bits.push(`ar: ${p.ar}`);
  if (p.realism) bits.push(`realism: ${p.realism}`);
  return bits.join(' · ');
}

function labelFor(pr, i, total) {
  if (pr.label) return pr.label;
  return total > 1 ? `Prompt ${i + 1}` : 'Prompt';
}

// ── default (terminal) ──────────────────────────────────────────────────────
function renderDefault(p) {
  const lang = (p.mode === 'json') ? 'json' : 'text';
  const lines = [];
  lines.push(metaLine(p));
  lines.push('');
  p.prompts.forEach((pr, i) => {
    lines.push(`### ${labelFor(pr, i, p.prompts.length)}`);
    if (pr.note) lines.push(`_${pr.note}_`);
    const f = fenceFor(pr.text, lang);
    lines.push(f.open, pr.text.trim(), f.close);
    lines.push('');
  });
  if (Array.isArray(p.changes) && p.changes.length) {
    lines.push('**Đã đổi:**');
    p.changes.forEach((c) => lines.push(`- ${c}`));
    lines.push('');
  }
  if (Array.isArray(p.warnings) && p.warnings.length) {
    lines.push('**Cảnh báo:**');
    p.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push('');
  }
  if (p.rationale) lines.push(`**Vì sao:** ${p.rationale}`);
  return lines.join('\n');
}

// ── markdown ────────────────────────────────────────────────────────────────
function renderMarkdown(p) {
  const lang = (p.mode === 'json') ? 'json' : 'text';
  const lines = [];
  lines.push(`# Prompts — ${p.input ? String(p.input).slice(0, 80) : p.direction}`);
  lines.push('');
  lines.push(`> ${metaLine(p)}`);
  if (p.input) { lines.push('>'); lines.push(`> **Input:** ${p.input}`); }
  lines.push('');
  if (p.prompts.length > 1) {
    lines.push('| # | Biến thể |');
    lines.push('|---|---|');
    p.prompts.forEach((pr, i) => lines.push(`| ${i + 1} | ${labelFor(pr, i, p.prompts.length)} |`));
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  p.prompts.forEach((pr, i) => {
    lines.push(`## ${labelFor(pr, i, p.prompts.length)}`);
    lines.push('');
    if (pr.note) { lines.push(`*${pr.note}*`); lines.push(''); }
    const f = fenceFor(pr.text, lang);
    lines.push(f.open, pr.text.trim(), f.close);
    lines.push('');
    if (pr.params && typeof pr.params === 'object') {
      lines.push('<details><summary>Tham số đã chọn</summary>');
      lines.push('');
      lines.push('| Tham số | Giá trị |');
      lines.push('|---|---|');
      for (const [k, v] of Object.entries(pr.params)) {
        if (v === null || v === undefined || v === '') continue;
        lines.push(`| \`${k}\` | ${Array.isArray(v) ? v.join(' · ') : String(v).replace(/\|/g, '\\|')} |`);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  });
  if (Array.isArray(p.changes) && p.changes.length) {
    lines.push('---', '', '## Đã đổi', '');
    p.changes.forEach((c) => lines.push(`- ${c}`));
    lines.push('');
  }
  if (Array.isArray(p.warnings) && p.warnings.length) {
    lines.push('---', '', '## Cảnh báo', '');
    p.warnings.forEach((w) => lines.push(`- ${w}`));
    lines.push('');
  }
  if (p.rationale) { lines.push('---', '', '## Vì sao chọn như vậy', '', p.rationale, ''); }
  return lines.join('\n');
}

// ── artifact (HTML with real Copy buttons) ──────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderArtifact(p) {
  const title = `Prompts — ${p.input ? String(p.input).slice(0, 60) : p.direction}`;
  const cards = p.prompts.map((pr, i) => `
    <article class="card">
      <header>
        <h2>${esc(labelFor(pr, i, p.prompts.length))}</h2>
        <button class="copy" data-i="${i}" type="button">Copy</button>
      </header>
      ${pr.note ? `<p class="note">${esc(pr.note)}</p>` : ''}
      <pre id="p${i}">${esc(pr.text.trim())}</pre>
    </article>`).join('\n');

  return `<title>${esc(title)}</title>
<style>
  :root { --bg:#fff; --fg:#1a1a1a; --mut:#6b6b6b; --line:#e5e5e5; --card:#fafafa; --accent:#CC785C; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#141414; --fg:#ededed; --mut:#a0a0a0; --line:#2c2c2c; --card:#1c1c1c; }
  }
  :root[data-theme="dark"] { --bg:#141414; --fg:#ededed; --mut:#a0a0a0; --line:#2c2c2c; --card:#1c1c1c; }
  :root[data-theme="light"] { --bg:#fff; --fg:#1a1a1a; --mut:#6b6b6b; --line:#e5e5e5; --card:#fafafa; }
  body { background:var(--bg); color:var(--fg); font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; margin:0; padding:2rem 1rem 4rem; }
  .wrap { max-width:52rem; margin:0 auto; }
  h1 { font-size:1.5rem; line-height:1.3; margin:0 0 .4rem; }
  .meta { color:var(--mut); font-size:.85rem; margin:0 0 2rem; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:.6rem; padding:1rem 1.1rem; margin:0 0 1.25rem; }
  .card header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:.6rem; }
  .card h2 { font-size:.95rem; margin:0; font-weight:600; }
  .note { color:var(--mut); font-size:.85rem; margin:0 0 .6rem; font-style:italic; }
  pre { white-space:pre-wrap; word-break:break-word; overflow-x:auto; background:transparent; margin:0; font:14px/1.65 ui-monospace,"SF Mono",Menlo,Consolas,monospace; }
  button.copy { flex:none; cursor:pointer; border:1px solid var(--line); background:var(--bg); color:var(--fg); border-radius:.4rem; padding:.35rem .8rem; font-size:.8rem; font-weight:600; }
  button.copy:hover { border-color:var(--accent); color:var(--accent); }
  button.copy.done { border-color:var(--accent); color:var(--accent); }
  section.extra { border-top:1px solid var(--line); margin-top:2rem; padding-top:1.25rem; }
  section.extra h3 { font-size:.9rem; margin:0 0 .5rem; }
  section.extra ul { margin:0; padding-left:1.2rem; color:var(--mut); font-size:.9rem; }
  .why { color:var(--mut); font-size:.9rem; }
</style>
<div class="wrap">
  <h1>${esc(title)}</h1>
  <p class="meta">${esc(metaLine(p))}</p>
  ${cards}
  ${(Array.isArray(p.changes) && p.changes.length) ? `<section class="extra"><h3>Đã đổi</h3><ul>${p.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
  ${(Array.isArray(p.warnings) && p.warnings.length) ? `<section class="extra"><h3>Cảnh báo</h3><ul>${p.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>` : ''}
  ${p.rationale ? `<section class="extra"><h3>Vì sao chọn như vậy</h3><p class="why">${esc(p.rationale)}</p></section>` : ''}
</div>
<script>
document.querySelectorAll('button.copy').forEach(function (b) {
  b.addEventListener('click', function () {
    var el = document.getElementById('p' + b.dataset.i);
    var text = el ? el.textContent : '';
    var done = function () { b.textContent = 'Copied'; b.classList.add('done'); setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { b.textContent = 'Press Ctrl+C'; });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { b.textContent = 'Press Ctrl+C'; }
      document.body.removeChild(ta);
    }
  });
});
</script>`;
}

function render(payload, output) {
  if (output === 'markdown') return renderMarkdown(payload);
  if (output === 'artifact') return renderArtifact(payload);
  return renderDefault(payload);
}

function main() {
  const args = parseArgv(process.argv.slice(2));
  const output = args.output || 'default';
  if (!VALID_OUTPUTS.includes(output)) {
    console.error(`[FAIL] --output must be one of ${VALID_OUTPUTS.join('|')} (got "${output}")`);
    process.exit(1);
  }

  let raw;
  if (args.input) {
    const abs = path.isAbsolute(args.input) ? args.input : path.join(process.cwd(), args.input);
    if (!fs.existsSync(abs)) { console.error(`[FAIL] --input not found: ${args.input}`); process.exit(1); }
    raw = fs.readFileSync(abs, 'utf-8');
  } else {
    try { raw = fs.readFileSync(0, 'utf-8'); } catch (e) { raw = ''; }
  }
  if (!raw.trim()) { console.error('[FAIL] no payload — pass --input=<file.json> or pipe JSON on stdin'); process.exit(1); }

  let payload;
  try { payload = JSON.parse(raw); } catch (e) { console.error(`[FAIL] payload is not valid JSON: ${e.message}`); process.exit(1); }

  const errs = validatePayload(payload);
  if (errs.length) { console.error(`[FAIL] payload: ${errs.length} error(s):`); errs.forEach((m) => console.error(`  - ${m}`)); process.exit(1); }

  const body = render(payload, output);

  if (output === 'default') { process.stdout.write(body + '\n'); process.exit(0); }

  const stamp = args.date || new Date(fs.statSync(__filename).mtime).toISOString().slice(0, 10);
  const dir = args.out
    ? (path.isAbsolute(args.out) ? args.out : path.join(REPO_ROOT, args.out))
    : path.join(REPO_ROOT, '.archives', 'prompt', 'runs', `${stamp}-${slugify(payload.input || payload.direction)}`);
  fs.mkdirSync(dir, { recursive: true });

  const ext = output === 'markdown' ? 'md' : 'html';
  const file = path.join(dir, `prompts.${ext}`);
  fs.writeFileSync(file, body, 'utf-8');

  // run.json — forward-compatible superset of a future ops.prompt_runs row.
  const runJson = {
    capability: 'prompt-platform',
    version: '0.1.0',
    direction: payload.direction,
    verb: payload.verb || 'build',
    mode: payload.mode || 'text',
    model: payload.model || null,
    ar: payload.ar || null,
    realism: payload.realism || null,
    input: payload.input || null,
    prompt_count: payload.prompts.length,
    output,
    artifact_path: path.relative(REPO_ROOT, file),
    warnings: payload.warnings || [],
    changes: payload.changes || [],
    rationale: payload.rationale || null,
  };
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(runJson, null, 2), 'utf-8');

  console.log(JSON.stringify({ ok: true, file, run_json: path.join(dir, 'run.json'), output, prompt_count: payload.prompts.length }, null, 2));
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  VALID_OUTPUTS,
  slugify,
  fenceFor,
  validatePayload,
  metaLine,
  labelFor,
  renderDefault,
  renderMarkdown,
  renderArtifact,
  render,
};
