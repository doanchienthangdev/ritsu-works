export const meta = {
  name: 'consulting-toolkit-reconstruct',
  description: 'Reconstruct consulting toolkits from clues → bundle-spec JSON (core + deck) on disk',
  phases: [
    { title: 'Reconstruct', detail: 'one agent per toolkit: clue → full executable process core' },
    { title: 'Deck', detail: 'one agent per toolkit: core → Domont-genre 16:9 deck' },
  ],
}

// args = { base, toolkits: [{num, slug, title, domain}] }  (tolerate string-encoded args)
const A = (typeof args === 'string') ? JSON.parse(args) : (args || {})
log(`args received: type=${typeof args}; toolkits=${(A.toolkits || []).length}; base=${A.base ? 'set' : 'MISSING'}`)
const BASE = A.base
const SKILL = `${BASE}/06-ai-ops/skills/consulting-toolkit`
const BRIEFS = `${BASE}/runtime/consulting-toolkit/briefs`
const SPECS = `${BASE}/runtime/consulting-toolkit/specs`
const toolkits = A.toolkits || []

function reconstructPrompt(tk) {
  return `You are a world-class ex-McKinsey/BCG management consultant AND a meticulous knowledge engineer. Reconstruct the FULL, executable process behind a consulting toolkit from a partial "clue" — to a standard a Fortune-100 executive could actually RUN, not merely recognize.

READ these files first (Read tool, absolute paths):
1. The clue (the partial source): ${BRIEFS}/${tk.slug}.md
2. The output contract: ${SKILL}/STRUCTURE.md  — §3 bundle-spec shape, §4 handbook section order, §5 the 6-part framework anatomy, §7 the quality checklist.

TASK: reconstruct toolkit "${tk.title}" (slug ${tk.slug}, domain ${tk.domain}, id ${tk.num}) and WRITE ONE JSON file — the "core" (everything EXCEPT the deck) — to:
  ${SPECS}/${tk.slug}.core.json

Required top-level keys (full shapes in STRUCTURE.md §3):
- id (${tk.num}), slug ("${tk.slug}"), title ("${tk.title}"), domain ("${tk.domain}")
- core_value, one_liner (<=25 words), when_to_use, audience (array)
- process: { model_name, model_rationale, phases: [ {n, name, goal, key_question, duration, steps:[{n,name,how,frameworks:[<slug>],input,output,owner}], frameworks:[<slug>], deliverable, kpis:[...], gate} ] }
- frameworks: [ {slug, name, category, what, origin, logic, visual:{kind,spec}, tutorial:[<step>...], example:{company,narrative,takeaway}, template:{instructions,fields:[...]}, pitfalls:[...], when_to_use, sources:[<key>]} ]
- document_md: the FULL handbook markdown, 3,500-6,000 words, section order per STRUCTURE.md §4 (action-title H2/H3 where natural)
- templates: [{name, format:"md"|"csv", content}], worked_example:{title, content_md}, sources:[{key,title,url,note}]
- self_grade: {coverage_pct (0-1), rigor_note, frameworks_count, phases_count}

NON-NEGOTIABLE RIGOR (this is the entire point of the exercise):
- EXECUTABILITY > enumeration. Every step must name: its goal + the tool/framework + a concrete HOW (2-4 sentences) + the input it consumes + the output it produces + the owner. NEVER just list framework names.
- COVER EVERYTHING in the clue: every phase, every sub-module, every named framework becomes real reconstructed content. Drop nothing. If the clue names "GE-McKinsey Matrix" or "Porter's 5 Forces", it MUST appear in frameworks[] with full anatomy.
- Per framework, ALL 6 anatomy parts (STRUCTURE.md §5): description+origin+logic; a visual SPEC (set visual.kind to one of matrix-2x2|staircase|funnel|value-chain|process-flow|tree|cycle|table|chart|kpi-tiles|comparison|none and put structured data in visual.spec); a NUMBERED, imperative, executable tutorial; a REAL named-company example; a fill-in template; pitfalls + when-to-use. The tutorial and template are what make it DO-able.
- Where a canonical method exists, NAME it and follow its real structure: DMAIC (Lean Six Sigma), SCOR (supply chain), ISO 31000 (risk), Ansoff / BCG / GE-McKinsey / Porter / 7S (strategy), ADKAR (change), the deal funnel (M&A), etc.
- GROUND it: you know these canonical frameworks deeply; you MAY use WebSearch/WebFetch (<=3 calls) to verify a framework's exact steps/origin and to find/verify REAL company examples. Record what you used in sources[]. NO fabricated data, NO fabricated citations. Original synthesis only — do NOT copy verbatim source-slide wording.
- SELF-CRITIQUE before finishing: re-read STRUCTURE.md §7 and fix every gap (missing phase? framework without a tutorial or template? step without how/input/output? no real example?).

WRITING METHOD — CRITICAL (a single tool call cannot output >32,000 tokens; a full core exceeds that and FAILS):
Do NOT emit the entire core JSON in one Write. Build the file incrementally:
1. First Write ${SPECS}/${tk.slug}.core.json with identity, core_value, one_liner, when_to_use, audience, process (full), templates, worked_example, sources, self_grade, document_md (full), and "frameworks": [] (empty).
2. Then add frameworks in BATCHES of ~5 using the Edit tool — Edit the file to grow the frameworks array one batch at a time (keep each Edit's new content under ~20,000 tokens of output). Repeat until all frameworks are present.
3. Finally Read the file and confirm it parses as valid JSON, every step.frameworks slug exists in frameworks[], and every framework has all 6 anatomy parts. If it does not parse, fix it.
Write VALID JSON only (no markdown fences, no prose around it).
Your FINAL message must be exactly one line: "OK ${tk.slug}: <phases>p <frameworks>f cov<pct> - <one-line note>"  (or "ERROR: <reason>").`
}

function deckPrompt(tk) {
  return `You are a McKinsey-grade presentation designer. Turn a reconstructed consulting process into a board-ready 16:9 deck in the Domont consulting-deck genre (clean navy/cyan/gold, action-titled, one message per slide).

READ:
1. The reconstructed core (your source material — the process, frameworks, examples): ${SPECS}/${tk.slug}.core.json
2. The deck grammar: ${SKILL}/domont-deliverable-anatomy.md — §3 the layout catalog + EXACT field shapes, §5 the deck spine.

PRODUCE the deck and WRITE it as JSON to:
  ${SPECS}/${tk.slug}.deck.json
Shape: { "subtitle": "<short>", "slides": [ {layout, title, ...fields}, ... ] }

Build 22-32 slides following the §5 spine:
1) cover  (layout:"cover")
2) exec-summary — the core value as a 'governing' thought + 3-4 reason tiles
3) process-map — the FULL phase chevron (the spine), sub-bullets per phase (use a {grp:"Gate"} bullet to mark each phase's exit gate)
4) for EACH phase: a 'section' divider (phases:[all phase names], active:N) + 1-2 'content'/'table' slides covering its steps (how/input/output)
5) >=4 SIGNATURE frameworks — for each: 'framework-desc' + its visual layout (pick matrix-2x2 / staircase / process-flow / table / comparison / chart to match the framework's visual.kind) + a 'tutorial' slide + an 'example' slide (real company)
6) a worked end-to-end 'example'
7) 'close' with concrete next steps

RULES (anatomy §3 — follow field shapes EXACTLY):
- Every non-cover slide has an ACTION-TITLE: a claim/sentence, not a label ("Revenue grew 37% as Product A scaled" not "Revenue"). Keep titles <=14 words (1-2 lines).
- One message per slide. Prefer structured layouts; use layout:"html" ONLY when nothing else fits (raw Domont-styled inline HTML).
- DENSITY: keep any single content slide to <=8 bullets total (group with sub-heads); if a phase has more steps, split across 2 content slides rather than cramming one.
- Allowed layouts ONLY: cover, toc, process-map, section, exec-summary, content, two-col, framework-desc, matrix-2x2, staircase, process-flow, tutorial, table, comparison, kpi-tiles, chart, example, quote, close, html.
- matrix-2x2 → quadrants:[{pos:"tl|tr|bl|br", label, desc, strategy, color:"green|gold|red|amber|navy"}], x_label, y_label.
- chart → {chart_type:"column|bar|line|stacked-column", categories:[...], series:[{name,values:[...]}], source, key_takeaways:[...]}.
- content blocks: a block is a string (paragraph) OR {sub:"<subhead>", bullets:[...]} OR {bullets:[...]} (bullets may be strings or {text,sub:[...]} for nesting).
- Use REAL content from the core (real framework names, real example companies, real steps). No lorem/placeholder.

Write VALID JSON only (no fences). Read it back to confirm it parses.
Your FINAL message must be exactly one line: "OK ${tk.slug}: <n> slides"  (or "ERROR: <reason>").`
}

log(`Reconstructing ${toolkits.length} toolkit(s): ${toolkits.map((t) => t.slug).join(', ')}`)

const coreOpts = (tk) => Object.assign({ label: `core:${tk.slug}`, phase: 'Reconstruct' }, A.coreModel ? { model: A.coreModel } : {})
const results = await pipeline(
  toolkits,
  (tk) => agent(reconstructPrompt(tk), coreOpts(tk)),
  (coreAck, tk) => agent(deckPrompt(tk), { label: `deck:${tk.slug}`, phase: 'Deck', model: A.deckModel || 'sonnet' })
    .then((deckAck) => ({ slug: tk.slug, num: tk.num, core: String(coreAck).slice(0, 200), deck: String(deckAck).slice(0, 120) })),
)

const ok = results.filter(Boolean)
log(`Done: ${ok.length}/${toolkits.length} pipelines completed`)
return ok
