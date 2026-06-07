#!/usr/bin/env node
'use strict';
/**
 * cli.cjs — orchestrator for the /translate capability.
 *
 *   node cli.cjs plan  <src> [flags]      ingest + structure + split -> workdir, plan.json, brief.md
 *   node cli.cjs build <workdir> [flags]  assemble translated units -> output files (pdf/epub/docx/pptx/md)
 *
 * The translation step itself (parallel per-unit) is launched by the /translate SKILL
 * as a Claude Code Workflow between `plan` and `build` (a Node script can't spawn one).
 * Heavy lifting is Python: engine.py (ingest/split/assemble), render.py (renderers),
 * fonts.py (font cache). PDF renders on the WeasyPrint host; others on anaconda.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { parseArgs, resolveConfig } = require('./lib/params.cjs');
const { detectFormat } = require('./lib/detect.cjs');

const ANACONDA = process.env.TRANSLATE_PY || '/opt/anaconda3/bin/python3';
const HOMEBREW = process.env.TRANSLATE_PY_WEASY || '/opt/homebrew/bin/python3';
const HERE = __dirname;

function repoRoot() {
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'package.json'))) return d;
    const up = path.dirname(d); if (up === d) break; d = up;
  }
  return path.resolve(HERE, '../..');
}
function run(bin, args, opts = {}) {
  const r = cp.spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    throw new Error(`${path.basename(bin)} ${args.join(' ')}\n${r.stdout || ''}${r.stderr || ''}`);
  }
  return r.stdout;
}

function cmdPlan(argv) {
  const { src, flags, warnings } = parseArgs(argv);
  const srcFormat = detectFormat(flags.src || src);
  const cfg = resolveConfig({ src, srcFormat, flags, cwd: process.cwd() });
  cfg.warnings = (cfg.warnings || []).concat(warnings);
  // resolve abs src (file) — URLs pass through
  if (!cfg.isUrl) cfg.src = path.resolve(process.cwd(), cfg.src);

  const root = repoRoot();
  const fontsDir = path.join(root, 'runtime', 'translate', 'fonts');
  const hash = crypto.createHash('sha1').update(cfg.src + JSON.stringify(cfg.out) + cfg.to.code).digest('hex').slice(0, 8);
  const wd = path.join(root, 'runtime', 'translate', `${cfg.slug}-${hash}`);
  fs.mkdirSync(wd, { recursive: true });

  // --preserve (Req 3): in-place translation, output = source format. v0.2 supports
  // docx/pptx; for other formats fall back to the reflow path with a warning.
  if (cfg.preserve && !['docx', 'pptx'].includes(cfg.srcFormat)) {
    cfg.warnings.push(`--preserve supports docx/pptx in v0.2 — using reflow for ${cfg.srcFormat}`);
    cfg.preserve = false;
  }
  if (cfg.preserve) {
    if (cfg.out.some((f) => f !== cfg.srcFormat)) {
      cfg.warnings.push(`--preserve writes only ${cfg.srcFormat}; ignoring other --out formats`);
    }
    cfg.out = [cfg.srcFormat];
  }
  fs.writeFileSync(path.join(wd, 'config.json'), JSON.stringify(cfg, null, 2));

  if (!cfg.preserve) run(ANACONDA, [path.join(HERE, 'fonts.py'), fontsDir]); // reflow renders need fonts
  const engine = cfg.preserve ? 'preserve.py' : 'engine.py';
  const out = run(ANACONDA, [path.join(HERE, engine), 'plan', wd]);
  const plan = JSON.parse(out.trim().split('\n').pop());
  const planFull = JSON.parse(fs.readFileSync(path.join(wd, 'plan.json'), 'utf8'));
  const tasks = planFull.units.map((u) => ({
    id: u.num, title: u.title, is_first: u.is_first,
    src: u.src_file, out: u.out_file,
  }));
  console.log(JSON.stringify({
    ok: true, workdir: wd, brief: path.join(wd, 'brief.md'),
    mode: plan.mode, title: plan.title, units: plan.units, total_words: plan.total_words,
    cost_estimate_usd: plan.cost_estimate_usd, outputs: cfg.out, to: cfg.to,
    fontsDir, warnings: cfg.warnings, tasks,
    dry_run: cfg.dryRun,
  }, null, 2));
}

function cmdBuild(argv) {
  const wd = argv[0];
  if (!wd || !fs.existsSync(path.join(wd, 'config.json'))) throw new Error('build: pass a valid workdir');
  const { flags } = parseArgs(argv.slice(1));
  const cfg = JSON.parse(fs.readFileSync(path.join(wd, 'config.json'), 'utf8'));
  if (flags.title && flags.title !== true) cfg.titleTranslated = String(flags.title);
  if (flags.subtitle && flags.subtitle !== true) cfg.subtitle = String(flags.subtitle);
  fs.writeFileSync(path.join(wd, 'config.json'), JSON.stringify(cfg, null, 2));

  const root = repoRoot();
  const fontsDir = path.join(root, 'runtime', 'translate', 'fonts');

  if (cfg.preserve) {
    // in-place: reinsert translated segments into a copy of the original (same format)
    const out = run(ANACONDA, [path.join(HERE, 'preserve.py'), 'build', wd]);
    const r = JSON.parse(out.trim().split('\n').pop());
    fs.mkdirSync(cfg.outDir, { recursive: true });
    console.log(JSON.stringify({ ok: !r.error, outputs: [r], outDir: cfg.outDir }, null, 2));
    return;
  }

  run(ANACONDA, [path.join(HERE, 'fonts.py'), fontsDir]);
  run(ANACONDA, [path.join(HERE, 'engine.py'), 'assemble', wd]);

  const results = [];
  for (const fmt of cfg.out) {
    const bin = fmt === 'pdf' ? HOMEBREW : ANACONDA;
    const a = [path.join(HERE, 'render.py'), wd, fmt,
      `--fonts=${fontsDir}`, `--repo-root=${root}`,
      `--name=${cfg.name}`, `--out-dir=${cfg.outDir}`];
    try {
      const out = run(bin, a);
      results.push(JSON.parse(out.trim().split('\n').pop()));
    } catch (e) {
      results.push({ fmt, error: String(e.message || e).slice(0, 400) });
    }
  }
  fs.mkdirSync(cfg.outDir, { recursive: true });
  console.log(JSON.stringify({ ok: results.every((r) => !r.error), outputs: results, outDir: cfg.outDir }, null, 2));
}

const [, , sub, ...rest] = process.argv;
try {
  if (sub === 'plan') cmdPlan(rest);
  else if (sub === 'build') cmdBuild(rest);
  else { console.error('usage: cli.cjs {plan|build} ...'); process.exit(2); }
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}
