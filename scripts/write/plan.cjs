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

  // framework — auto (default) | none/free | <id>. A framework is a composable structure/formula.
  //   auto     → the orchestrator decides: pick the best-fit candidate OR write free-style
  //              (NOT every piece needs a framework — only when the task fits).
  //   none/free→ force free-style (use the type's structure_hint).
  //   <id>     → apply that specific framework.
  let framework = { mode: 'free' };
  {
    const fwVal = String(options.framework == null ? 'auto' : options.framework).trim().toLowerCase();
    let fwDoc = null;
    try { fwDoc = Frameworks.loadFrameworks(); } catch (e) { warnings.push(`frameworks registry: ${e.message}`); }
    const candidatesFor = () => ((fwDoc && type) ? Frameworks.frameworksForType(type.id, fwDoc).slice(0, 6)
      .map((f) => ({ id: f.id, name: f.name, structure: f.structure, when_to_use: f.when_to_use })) : []);
    if (['none', 'free', 'off', 'no'].includes(fwVal)) {
      framework = { mode: 'free' };
    } else if (fwVal === 'auto') {
      framework = { mode: 'auto', candidates: candidatesFor() };
    } else {
      const hit = fwDoc ? Frameworks.resolveFramework(fwVal, fwDoc) : null;
      if (hit) framework = { mode: 'explicit', selected: { id: hit.id, name: hit.name, family: hit.family, structure: hit.structure, when_to_use: hit.when_to_use } };
      else {
        warnings.push(`--framework "${options.framework}" not in write-frameworks.yaml → falling back to auto-select. (See /write frameworks)`);
        framework = { mode: 'auto', candidates: candidatesFor() };
      }
    }
  }

  // research depth (off | auto | deep) + Ritsu grounding (deepask/wiki/brain) + long-form
  const researchLevel = ['off', 'auto', 'deep'].includes(String(options.research || 'auto').toLowerCase())
    ? String(options.research || 'auto').toLowerCase() : 'auto';
  let grounding;
  {
    const g = (Array.isArray(options.grounding) ? options.grounding : []).map((s) => String(s).toLowerCase()).filter(Boolean);
    if (g.includes('off') || g.includes('none')) grounding = [];
    else if (g.length === 0 || g.includes('auto')) grounding = 'auto';
    else if (g.includes('all')) grounding = ['deepask', 'wiki', 'brain'];
    else { grounding = g.filter((s) => ['deepask', 'wiki', 'brain'].includes(s)); if (!grounding.length) { warnings.push(`--grounding "${options.grounding}" had no known source (deepask|wiki|brain|all|off) → auto`); grounding = 'auto'; } }
  }
  const lfVal = String(options.longform || 'auto').toLowerCase();
  const longform = (lfVal === 'on' || lfVal === 'true') ? true
    : (lfVal === 'off' || lfVal === 'false') ? false : Types.isLongform(type);
  // deep research / long-form lift the cost ceiling — note it (don't silently cap).
  if ((researchLevel === 'deep' || longform) && (options['max-cost-usd'] === undefined || options['max-cost-usd'] <= 2.0)) {
    warnings.push(`${longform ? 'long-form' : 'deep research'} is heavier — consider raising --max-cost-usd (default 2.00) if a run is truncated.`);
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
    framework,   // { mode: 'auto'|'explicit'|'free', selected?, candidates? }
    research: researchLevel,   // off | auto | deep
    grounding,                 // 'auto' | [] | ['deepask','wiki','brain'] subset
    longform,                  // boolean — bible + parallel-draft + continuity
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
  const fw = plan.framework || { mode: 'free' };
  if (fw.mode === 'explicit' && fw.selected) {
    L.push(`**Framework — ${fw.selected.name}** (\`${fw.selected.id}\`): ${fw.selected.structure}`);
    L.push(`_${fw.selected.when_to_use}_  Apply this formula as the backbone${plan.template && plan.template.exists ? ', inside the template below' : ''}.`);
  } else if (fw.mode === 'auto') {
    L.push(`**Framework: AUTO** — decide whether a writing formula fits this task. **Not every piece needs one** — use a framework when the task is persuasion / structured / marketing; write **free-style** when it's creative, personal, exploratory, or very short. State your choice (framework id or "free-style") + one-line why at the top of \`draft.md\` as a comment, then write.`);
    if (fw.candidates && fw.candidates.length) {
      L.push(`Best-fit candidates for type \`${plan.type ? plan.type.id : '(none)'}\` (ranked): ` + fw.candidates.map((c) => `\`${c.id}\` (${c.structure})`).join(' · '));
    } else {
      L.push(`No type-specific candidates loaded — if a framework fits, pick one from \`/write frameworks\`; else free-style.`);
    }
  } else {
    L.push(`**Free-style** (no framework). Follow the structure below.`);
  }
  if (plan.template && plan.template.exists) L.push(`Follow the template: \`${plan.template.path}\` (fill the beats, delete the guidance).`);
  else if (plan.type && plan.type.structure_hint) L.push(`${plan.type.structure_hint}`);
  else if (fw.mode === 'free') L.push(`Choose a structure that fits the request and medium.`);
  L.push('');
  L.push(`## Enrichment`);
  L.push(`- Image: ${plan.enrich.image ? 'YES — add an illustration/cover where it raises quality, via /image (scripts/deepask/image-route.cjs).' : 'no'}`);
  L.push(`- Dataviz: ${plan.enrich.dataviz ? 'YES — add a chart where a number series tells the story, via /dataviz (scripts/deepask/chart-embed.cjs).' : 'no'}`);
  L.push(`- Research: ${plan.enrich.research ? 'YES — ground claims in refs/' + (plan.mode === 'deep-research' ? ' + deep-research.' : ' sources; cite, don\'t assert.') : 'no'}`);
  if (plan.refs.length) { L.push(''); L.push(`## References (ground in these)`); for (const r of plan.refs) L.push(`- ${r}`); }
  L.push('');
  L.push(`## Research & grounding`);
  const grSrc = Array.isArray(plan.grounding) ? plan.grounding : (plan.grounding === 'auto' ? 'auto' : []);
  L.push(`- **External research (\`--research=${plan.research}\`):** ` + (
    plan.research === 'deep' ? 'DEEP — run the `deep-research` skill (fan-out web search → fetch → adversarially verify → cited synthesis) for the factual spine BEFORE writing; for long pieces this is a parallel Workflow.'
      : plan.research === 'off' ? 'OFF — model knowledge + provided refs only; no external search.'
      : 'AUTO — use `--ref` + light lookups; escalate to deep only if the topic clearly needs verified external facts.'));
  L.push(`- **Internal Ritsu grounding (\`--grounding\`):** ` + (
    grSrc === 'auto' ? 'AUTO — if the piece concerns Ritsu / its product / learning-science positioning, pull supporting material: `/deepask` (federated internal answer, cited), `mcp__supabase-ops__wiki_ask` (wiki RAG), `mcp__gbrain__search`/`think` (operational brain). Cite what you use; never fabricate Ritsu facts.'
      : grSrc.length ? grSrc.map((s) => s === 'deepask' ? '`/deepask`' : s === 'wiki' ? '`wiki_ask`' : '`gbrain`').join(' + ') + ' — query these for supporting material at the data-collection step; thread findings into the outline + cite.'
      : 'OFF.'));
  L.push(`  Gather at the **data-collection** step; let findings shape the **outline** (the plan), not just the prose.`);
  if (plan.longform) {
    L.push('');
    L.push(`## Long-form — consistency pipeline (REQUIRED for type \`${plan.type ? plan.type.id : ''}\`)`);
    L.push(`This is a long-form work. Do NOT write it in one pass. Follow \`06-ai-ops/skills/write/longform/SKILL.md\`:`);
    L.push(`1. **Lock the bible** (\`06-ai-ops/write/longform/bibles/${plan.type ? plan.type.id : 'TYPE'}.md\`) — the single source of truth (thesis/characters/world/timeline/terms/evidence/voice as applies). Fill + LOCK it before drafting a word.`);
    L.push(`2. **Outline parts/chapters** + per-part briefs derived from the bible.`);
    L.push(`3. **Draft parts in PARALLEL** via a Claude Code Workflow — each part-agent reads ONLY the bible + its part brief + adjacent-part summaries (never peer drafts).`);
    L.push(`4. **Continuity pass** — check the assembled draft against the bible (characters/world/timeline/terminology/thesis/evidence don't drift); fix.`);
    L.push(`5. **Assemble** + one unified **humanize** pass over the whole; render. See \`06-ai-ops/write/longform/LONGFORM.md\` for this type's mechanisms + checks.`);
  }
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
