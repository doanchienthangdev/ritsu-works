export const meta = {
  name: 'thinking-os-enrich',
  description: 'Tag toolkit frameworks with McKinsey selection axes + author process routing cards',
  phases: [{ title: 'Enrich', detail: 'one agent per toolkit: precision selection tags + routing card' }],
}

const A = (typeof args === 'string') ? JSON.parse(args) : (args || {})
const BASE = A.base
const ENRICH = `${BASE}/runtime/thinking-os/enrich`
const OUT = `${BASE}/runtime/thinking-os/enriched`
const toolkits = A.toolkits || []
log(`Enriching ${toolkits.length} toolkits`)

function prompt(tk) {
  return `You are an ex-McKinsey engagement manager and a knowledge engineer. Tag each framework of a consulting toolkit on the McKinsey problem-solving axes so the /think mckinsey engine can SELECT the most-correct tool at any checkpoint. Precision is the whole point.

READ: ${ENRICH}/${tk.slug}.md  (the toolkit's framework list with category, phase, what, when-to-use).

For EACH framework listed, assign these tags (read its what/when/phase context — do NOT guess from the name alone):
- fours_step: ONE of frame | structure | solve | sell | cross
    frame = define/scope/frame the problem (TOSCA, problem-definition, success-criteria)
    structure = decompose / plan the analysis / build the workplan / prioritize what to analyze
    solve = analyze, diagnose, model, decide, choose, design the answer (most analytical frameworks)
    sell = synthesize, recommend, communicate, present, get buy-in
    cross = genuinely used across stages (e.g. a governance cadence, a maturity model)
- cognitive_moves: 1-3 of [frame, diagnose, structure, analyze, prioritize, decide, design, prototype, forecast, value(quantify), synthesize, communicate] — what THINKING this tool performs.
- select_when: a SHARP trigger phrase (<=14 words) — the situation in which an EM would reach for THIS tool over its neighbors. The disambiguator. (e.g. for Porter's Five Forces: "assessing whether an industry's structure is attractive before entry/investment")
- checkpoint_fit: 1-3 of [frame, hypothesize, plan, prioritize, solve-analyze, porpoise, dissent, synthesize, sell] — the /think mckinsey checkpoint(s) where this tool is the right call.

ALSO author the toolkit's process ROUTING CARD — when a McKinsey study should pull THIS WHOLE domain process as its structuring spine:
- trigger: the problem signature that should invoke this domain playbook (<=20 words)
- plugs_into: which 4S stage the process attaches at (usually "structure" — it becomes the issue-tree/workplan spine for that domain)
- value: 1 line — what running this inherited process gives you over an ad-hoc tree
- key_question: the core question this domain process answers

WRITE valid JSON to ${OUT}/${tk.slug}.json:
{ "toolkit": "${tk.slug}",
  "frameworks": [ {"slug": "...", "fours_step": "...", "cognitive_moves": ["..."], "select_when": "...", "checkpoint_fit": ["..."]}, ... (one per framework) ],
  "routing_card": { "trigger": "...", "plugs_into": "...", "value": "...", "key_question": "..." } }

Build the file incrementally if large (Write skeleton with frameworks:[], then Edit to add framework batches) to stay under the 32k single-response output limit. Read it back to confirm it parses and has one entry per framework.
Final message: one line "OK ${tk.slug}: <N> frameworks tagged" (or "ERROR: <reason>").`
}

const results = await parallel(toolkits.map((tk) => () =>
  agent(prompt(tk), { label: `enrich:${tk.slug}`, phase: 'Enrich', model: 'sonnet' })
    .then((ack) => ({ slug: tk.slug, ack: String(ack).slice(0, 120) }))
))
return results.filter(Boolean)
