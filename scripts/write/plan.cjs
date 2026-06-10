#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/plan.cjs — /write deterministic planner (the brief builder)
// ============================================================================
// Resolves a /write invocation into a concrete plan + a human/LLM-readable brief.
// DETERMINISTIC: no LLM, no network. The orchestrator skill calls this first, then
// drafts FROM brief.md; `--dry-run` stops here and shows the plan + cost estimate.
//
// CLI:  node scripts/write/plan.cjs "<request>" --type=blog --author-style=seth-godin ...
// Output: one line of JSON {ok, plan, briefPath, planPath, warnings}. The brief.md +
// plan.json are written under the artifact dir.
// ============================================================================

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO_ROOT = path.resolve(HERE, '..', '..');
const P = require('./lib/params.cjs');
const Len = require('./lib/length.cjs');
const Types = require('./lib/types.cjs');
const Authors = require('./lib/authors.cjs');
const Templates = require('./lib/templates.cjs');
const Frameworks = require('./lib/frameworks.cjs');
const AP = require('./lib/artifact-path.cjs');

/** Rough section budget from a word target. */
function sectionBudget(words) {
  // intro + body sections + close. ~250 words/section, min 3, max 12 sections.
  const bodyN = Math.max(1, Math.min(10, Math.round(words / 350)));
  const count = bodyN + 2; // + intro + close
  return { count, words_per_section: Math.max(60, Math.round(words / count)) };
}

function todayISO(dateStr) {
  return dateStr || new Date().toISOString().slice(0, 10);
}

function buildPlan(argv, opts = {}) {
  const warnings = [];
  const { subcommand, options, provided } = P.parseWriteArgs(argv);
  warnings.push(...P.computeWarnings(provided));

  // resolve type (explicit; inference is the orchestrator/LLM's job when omitted)
  let typesDoc = null;
  try { typesDoc = Types.loadTypes(); } catch (e) { warnings.push(`types registry: ${e.message}`); }
  let type = options.type && typesDoc ? Types.resolveType(options.type, typesDoc) : null;
  if (options.type && !type) warnings.push(`--type "${options.type}" not found in write-types.yaml → the writer will infer or treat as freeform`);

  // medium
  const med = Types.resolveMedium(type, options.medium);
  warnings.push(...med.warnings);

  // author-style
  let authorsDoc = null;
  let author = null;
  let authorInstalled = false;
  try {
    authorsDoc = Authors.loadAuthors();
    if (options['author-style']) {
      author = Authors.resolveAuthor(options['author-style'], authorsDoc);
      if (!author) warnings.push(`--author-style "${options['author-style']}" not in author-styles.yaml → using neutral/brand voice. (See /write authors)`);
      else { authorInstalled = Authors.isInstalled(author); if (!authorInstalled) warnings.push(`--author-style "${author.slug}" is registered but not yet distilled (status=${author.status}) → voice will be approximate. Run /write distill ${author.slug}.`); }
    }
  } catch (e) { warnings.push(`authors registry: ${e.message}`); }

  // template
  let template = null;
  if (options.template) {
    let tplDoc = null;
    try { tplDoc = Templates.loadTemplates(); } catch (e) { warnings.push(`templates registry: ${e.message}`); }
    template = Templates.resolveTemplate(options.template, tplDoc);
    if (template && !template.exists) warnings.push(`--template "${options.template}" did not resolve to a file → using the type's structure_hint`);
  }

  // framework (a composable structure/formula — knowledge/write-frameworks.yaml)
  let framework = null;
  if (options.framework) {
    try {
      const fwDoc = Frameworks.loadFrameworks();
      framework = Frameworks.resolveFramework(options.framework, fwDoc);
      if (!framework) warnings.push(`--framework "${options.framework}" not in write-frameworks.yaml → ignored. (See /write frameworks)`);
    } catch (e) { warnings.push(`frameworks registry: ${e.message}`); }
  }

  // length
  const presets = typesDoc && typesDoc.length_presets
    ? Object.fromEntries(Object.entries(typesDoc.length_presets).map(([k, v]) => [k, v.words]))
    : undefined;
  const length = Len.parseLength(options.length, presets);
  warnings.push(...length.warnings);

  // out formats
  const outRes = P.normalizeOut(options.out);
  warnings.push(...outRes.warnings);

  // enrichment resolution (auto → from type.recommends)
  function resolveEnrich(flag, key) {
    const v = options[flag];
    if (v === 'on') return true;
    if (v === 'off') return false;
    // auto
    const rec = type && type.recommends ? type.recommends[key] : undefined;
    return rec === true || rec === 'on' || rec === 'auto';
  }
  const useImage = resolveEnrich('image', 'image');
  const useDataviz = resolveEnrich('dataviz', 'dataviz');
  const useResearch = options.mode === 'deep-research' || (type && type.recommends && (type.recommends.research === true || type.recommends.research === 'on'));

  const mode = P.normalizeMode(options.mode);
  const dateStr = todayISO(opts.dateStr);
  const slugSource = options.request || (author && author.slug) || (type && type.id) || 'untitled';
  const outDir = options['out-dir'] || AP.buildArtifactDir(dateStr, slugSource);
  const budget = sectionBudget(length.words);

  const refs = Array.isArray(options.ref) ? options.ref : [];

  const plan = {
    ok: true,
    subcommand,
    request: options.request || null,
    type: type ? { id: type.id, category: type.category, structure_hint: type.structure_hint, recommends: type.recommends || {} } : (options.type ? { id: options.type, freeform: true } : null),
    medium: med.medium,
    author_style: author ? { slug: author.slug, full_name: author.full_name, installed: authorInstalled, voice_card: `${author.path}voice-card.md`, one_line: author.one_line || null } : null,
    template: template ? { id: template.id, path: template.path, exists: template.exists } : null,
    framework: framework ? { id: framework.id, name: framework.name, family: framework.family, structure: framework.structure, when_to_use: framework.when_to_use } : null,
    length: { words: length.words, pages: length.pages, label: length.label, kind: length.kind },
    section_budget: budget,
    mode,
    lang: options.lang,
    out: outRes.formats,
    style: options.style,
    enrich: { image: useImage, dataviz: useDataviz, research: !!useResearch },
    humanize: options.humanize !== 'off',
    refs,
    push: options.push || null,
    out_dir: outDir,
    max_cost_usd: options['max-cost-usd'],
    dry_run: !!options['dry-run'],
    cost: {
      drafting: 'session-subscription (in-session; metered to ops.cost_attributions, not API-billed)',
      enrichment_breaker_usd: options['max-cost-usd'],
      note: 'Only /image + /dataviz enrichment is out-of-band spend, each capped by its own --max-cost-usd.',
    },
    warnings: warnings.filter(Boolean),
  };
  return plan;
}

/** Render the brief.md the writer drafts from. */
function renderBrief(plan) {
  const L = [];
  L.push(`# Writing brief`);
  L.push('');
  L.push(`**Request:** ${plan.request || '(none — see refs)'}`);
  const t = plan.type;
  L.push(`**Type:** ${t ? (t.id + (t.freeform ? ' (freeform)' : `  ·  category: ${t.category}`)) : '(infer)'}    **Medium:** ${plan.medium || '(default)'}    **Language:** ${plan.lang}`);
  L.push(`**Length:** ~${plan.length.words} words (${plan.length.label}, ≈${plan.length.pages} pages) → plan ~${plan.section_budget.count} sections (~${plan.section_budget.words_per_section} words each).`);
  L.push('');
  if (plan.author_style) {
    L.push(`## Voice — write AS ${plan.author_style.full_name} (${plan.author_style.slug})`);
    if (plan.author_style.one_line) L.push(`> ${plan.author_style.one_line}`);
    L.push(`Load and apply: \`${plan.author_style.voice_card}\` (+ signature-moves.md, samples.md, do-and-dont.md as needed). ${plan.author_style.installed ? '' : '**(not yet distilled — voice will be approximate)**'}`);
    L.push(`The author-style artifact is ALSO the humanizer voice-calibration sample — "sound like the author" and "remove AI tells" are one pass.`);
  } else {
    L.push(`## Voice`);
    L.push(`No --author-style. Use Ritsu brand voice (read \`00-core/brand_voice.md\`) or a neutral, human, concrete register. Never generic AI prose.`);
  }
  L.push('');
  L.push(`## Structure`);
  if (plan.framework) {
    L.push(`**Framework — ${plan.framework.name}** (\`${plan.framework.id}\`): ${plan.framework.structure}`);
    L.push(`_${plan.framework.when_to_use}_  Apply this formula as the backbone${plan.template && plan.template.exists ? ', inside the template below' : ''}.`);
  }
  if (plan.template && plan.template.exists) L.push(`Follow the template: \`${plan.template.path}\` (fill the beats, delete the guidance).`);
  else if (plan.type && plan.type.structure_hint) L.push(`${plan.type.structure_hint}`);
  else if (!plan.framework) L.push(`Choose a structure that fits the request and medium.`);
  L.push('');
  L.push(`## Enrichment`);
  L.push(`- Image: ${plan.enrich.image ? 'YES — add an illustration/cover where it raises quality, via /image (scripts/deepask/image-route.cjs).' : 'no'}`);
  L.push(`- Dataviz: ${plan.enrich.dataviz ? 'YES — add a chart where a number series tells the story, via /dataviz (scripts/deepask/chart-embed.cjs).' : 'no'}`);
  L.push(`- Research: ${plan.enrich.research ? 'YES — ground claims in refs/' + (plan.mode === 'deep-research' ? ' + deep-research.' : ' sources; cite, don\'t assert.') : 'no'}`);
  if (plan.refs.length) { L.push(''); L.push(`## References (ground in these)`); for (const r of plan.refs) L.push(`- ${r}`); }
  L.push('');
  L.push(`## Humanize gate`);
  L.push(plan.humanize
    ? `REQUIRED. After drafting, run \`node scripts/write/humanize/scan.cjs <draft>\` and apply the \`humanize\` skill until it PASSES (score ≤ 25, classification ≠ AI_ONLY). The draft that ships is the humanized one.`
    : `Disabled (--humanize=off). Not recommended for anything customer-facing.`);
  L.push('');
  L.push(`## Output`);
  L.push(`Formats: ${plan.out.join(', ')} → \`${plan.out_dir}/\`. ${plan.push ? 'Then push to: ' + plan.push : ''}`);
  if (plan.warnings.length) { L.push(''); L.push(`## Warnings`); for (const w of plan.warnings) L.push(`- ${w}`); }
  return L.join('\n') + '\n';
}

function writePlan(plan, opts = {}) {
  // Resolve the relative out_dir against the MAIN repo root (not the worktree) so
  // artifacts land where the operator looks — see scripts/write/lib/artifact-path.cjs.
  const absDir = path.isAbsolute(plan.out_dir) ? plan.out_dir : path.join(opts.repoRoot || AP.MAIN_ROOT, plan.out_dir);
  fs.mkdirSync(absDir, { recursive: true });
  const briefPath = path.join(absDir, 'brief.md');
  const planPath = path.join(absDir, 'plan.json');
  fs.writeFileSync(briefPath, renderBrief(plan));
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  return { briefPath, planPath, dir: absDir };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const plan = buildPlan(argv);
  let written = {};
  try { written = writePlan(plan); } catch (e) { plan.warnings.push(`write plan: ${e.message}`); }
  // `dir` is the ABSOLUTE artifact dir (under the MAIN repo root) — the orchestrator should
  // write draft.md + run scan/render against this, so outputs land where the operator looks.
  process.stdout.write(JSON.stringify({ ok: plan.ok, plan, dir: written.dir, briefPath: written.briefPath, planPath: written.planPath, warnings: plan.warnings }) + '\n');
}

module.exports = { buildPlan, renderBrief, writePlan, sectionBudget };
