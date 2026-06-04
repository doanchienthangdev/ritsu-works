#!/usr/bin/env node
/**
 * build-index-bundle.cjs — author + render the #0 "Master Index & Onboarding"
 * bundle (the library's meta-process: how to use the 19 reconstructed toolkits).
 * The 20th bundle. Content is authored (meta), not reconstructed. Runs main loop.
 * Usage: node build-index-bundle.cjs [--out <dir>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { TOOLKITS } = require('./lib/toolkits.cjs');

function arg(f, d) { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; }
const OUT = arg('--out', '/Users/doanchienthang/ritsu-works/raw/consultant/tookits');
const dir = path.join(OUT, '00-index');
fs.mkdirSync(dir, { recursive: true });

const mapRows = TOOLKITS.map((t) => [String(t.num), t.title, t.domain]);

const spec = {
  id: 0, slug: '00-index', title: 'Master Index & Onboarding', domain: 'meta',
  core_value: 'Find the right business-problem-solving process fast, then run it to a board-ready, decision-grade deliverable.',
  one_liner: 'The operating guide to a 19-toolkit library of executable consulting processes — choose, adapt, produce, present.',
  when_to_use: 'Start here. Read once to learn how the library is organized and how to turn any toolkit into your own deliverable.',
  audience: ['executive', 'consultant', 'founder', 'operator'],
  process: {
    model_name: 'The 4-step library operating loop',
    model_rationale: 'The toolkits are inputs; value comes from a repeatable loop that turns the right toolkit into a decided outcome — mirroring the consulting engagement itself (diagnose → solve → present → decide).',
    phases: [
      { n: 1, name: 'Choose the right toolkit', goal: 'Match your situation to the one process that fits.', key_question: 'What decision or outcome am I actually trying to reach?', duration: '10 min',
        steps: [
          { n: 1, name: 'Name the outcome', how: 'Write the decision/outcome you owe a stakeholder in one sentence (e.g. "Should we enter market X?"). This is your governing question.', frameworks: ['toolkit-anatomy'], input: 'a vague ask', output: 'a sharp governing question', owner: 'you' },
          { n: 2, name: 'Pick from the groups', how: 'Use the master INDEX groups (Diagnose & Strategize · Organize & Lead · Transform · Grow & Sell · Operate & Improve · Buy & Integrate · Fund/Measure/De-risk). Start at #5 Management Consulting if unsure — it is the operating system the others plug into.', frameworks: ['five-phase-os'], input: 'governing question', output: 'the chosen toolkit', owner: 'you' },
        ], frameworks: ['toolkit-anatomy', 'five-phase-os'], deliverable: 'the chosen toolkit + governing question', kpis: ['time-to-choose < 10 min'], gate: 'Is this the smallest toolkit that answers the question? If not, narrow.' },
      { n: 2, name: 'Adapt the process to your context', goal: 'Turn the generic process into your situation.', key_question: 'Which phases, frameworks and templates apply to me, and with what data?', duration: '1–3 days',
        steps: [
          { n: 1, name: 'Read the handbook', how: 'Read the toolkit\'s `<slug>-handbook.pdf` end to end. It is the full executable process: gated phases, and every framework with a how-to + template.', frameworks: ['toolkit-anatomy'], input: 'the toolkit', output: 'a mental model of the process', owner: 'you' },
          { n: 2, name: 'Fill the templates with your data', how: 'Copy the relevant `templates/` and `frameworks/` and fill them with your real numbers and facts. Skip phases that do not apply; never skip a gate.', frameworks: ['toolkit-anatomy'], input: 'your data', output: 'populated working artifacts', owner: 'you' },
        ], frameworks: ['toolkit-anatomy'], deliverable: 'populated frameworks + templates', kpis: ['every applicable framework populated with real data'], gate: 'Is each populated artifact backed by evidence, not assertion?' },
      { n: 3, name: 'Produce your deliverable', goal: 'Assemble the analysis into your own branded deck/doc.', key_question: 'What is the single answer, and what proves it?', duration: '1–2 days',
        steps: [
          { n: 1, name: 'Reuse the deck as a skeleton', how: 'Open `slides/deck.html` (or the deck PDF) and adapt the slide sequence to your story. Replace example data with yours; keep the action-title discipline.', frameworks: ['pyramid-principle', 'slide-customization'], input: 'populated artifacts', output: 'a draft deck', owner: 'you' },
          { n: 2, name: 'Re-style to your brand', how: 'Apply your fonts/colors (the source decks are fully editable; or re-render `bundle-spec.json` with `/toolkit render`). One message per slide; action-titles in sequence tell the whole story.', frameworks: ['slide-customization'], input: 'draft deck', output: 'branded deliverable', owner: 'you' },
        ], frameworks: ['pyramid-principle', 'slide-customization'], deliverable: 'your branded deck/handbook', kpis: ['an exec reading only the titles gets the full argument'], gate: 'Does slide 1 state the answer (not the journey)?' },
      { n: 4, name: 'Present & secure the decision', goal: 'Land the recommendation so the stakeholder decides and acts.', key_question: 'Did they decide, and who owns the next steps?', duration: '1 meeting',
        steps: [
          { n: 1, name: 'Open with the answer', how: 'Lead with the recommendation and the value at stake; walk the pyramid only as deep as the room needs. Pre-empt the three killer objections with evidence.', frameworks: ['pyramid-principle'], input: 'branded deliverable', output: 'a decision', owner: 'you' },
          { n: 2, name: 'Close on owners + dates', how: 'End by writing down the decision and the next-step owners and dates in the room. A deck that does not change a decision is a filed PDF.', frameworks: ['pyramid-principle'], input: 'a decision', output: 'committed actions', owner: 'you' },
        ], frameworks: ['pyramid-principle'], deliverable: 'a decision + owned next steps', kpis: ['decision made in the room', 'next-step owners + dates recorded'], gate: 'If deferred, the open objection is named and a follow-up is booked.' },
    ],
  },
  frameworks: [
    { slug: 'toolkit-anatomy', name: 'The Toolkit Anatomy', category: 'meta', what: 'Every toolkit bundle contains the same six asset types.', origin: 'Domont/Slidebooks toolkit model.', logic: 'A process is only usable if it ships the means to execute it, not just the theory.',
      visual: { kind: 'process-flow', spec: {} },
      tutorial: ['Read the handbook PDF for the full process.', 'Use frameworks/*.md for the how-to of each tool.', 'Fill templates/* with your data.', 'Steal the real-life examples as patterns.', 'Honor the best-practices/pitfalls.', 'Present the deck PDF.'],
      example: { company: 'This library', narrative: 'Each of the 19 bundles ships a handbook, a deck, process.yaml, frameworks/, templates/ and sources — the same anatomy every time.', takeaway: 'Consistency makes the library learnable once, usable everywhere.' },
      template: { instructions: 'For your deliverable, mirror the anatomy.', fields: ['Handbook (the process)', 'Deck (the pitch)', 'Frameworks (the tools)', 'Templates (the fill-ins)', 'Examples (the patterns)', 'Sources (the proof)'] },
      pitfalls: ['Grabbing a framework slide without reading the phase it sits in — you apply the right tool to the wrong question.'], when_to_use: 'Always — it is how to read any bundle.', sources: ['s1'] },
    { slug: 'five-phase-os', name: 'The 5-Phase Consulting Operating System (Toolkit #5)', category: 'meta', what: 'Business plan → proposal → diagnose → solve → present: the engagement spine the other toolkits plug into.', origin: 'Reconstructed in toolkit #5 Management Consulting.', logic: 'Most toolkits are a deep-dive on one phase of this spine; #5 is the through-line.',
      visual: { kind: 'staircase', spec: {} },
      tutorial: ['Treat #5 as the master loop.', 'Drop a domain toolkit into the phase it serves (e.g. #1 Strategy → "solve"; #7 M&A → "solve/decide").', 'Use #5\'s problem-identification phase before any solution toolkit.'],
      example: { company: 'McKinsey-style engagement', narrative: 'A growth question runs #5 phase III (diagnose) then pulls #1 Business Strategy and #9 Sales/Marketing into phase IV (solve).', takeaway: 'The toolkits compose; #5 sequences them.' },
      template: { instructions: 'Map your toolkit to the #5 phase it serves.', fields: ['Phase of #5 I am in: ___', 'Domain toolkit I am pulling in: ___'] },
      pitfalls: ['Jumping to a solution toolkit before diagnosing the real problem (skipping #5 phase III).'], when_to_use: 'When combining more than one toolkit.', sources: ['s1'] },
    { slug: 'pyramid-principle', name: 'The Pyramid Principle (for every deliverable)', category: 'communication', what: 'Answer first, then group supporting arguments MECE-ly beneath it.', origin: 'Barbara Minto, McKinsey.', logic: 'Executives decide from the top down; lead with the so-what so they can stop reading at any level.',
      visual: { kind: 'tree', spec: {} },
      tutorial: ['State the single governing answer.', 'Support it with 3–4 MECE arguments.', 'Back each argument with data.', 'Sequence slide action-titles so the titles alone tell the story.'],
      example: { company: 'Any board deck', narrative: '"Cut cost 10% via three levers" → outsource non-core / simplify process / renegotiate supply — each with a number.', takeaway: 'Title-only readers still get the full argument.' },
      template: { instructions: 'Draft your pyramid before building slides.', fields: ['Governing answer: ___', 'Argument 1/2/3: ___', 'Evidence under each: ___'] },
      pitfalls: ['Building the deck as a data tour that arrives at the answer on slide 40.'], when_to_use: 'Every deliverable, always.', sources: ['s1'] },
    { slug: 'slide-customization', name: 'Slide Customization Workflow', category: 'production', what: 'How to re-brand and re-format a toolkit deck to your organization.', origin: 'Domont onboarding guidance.', logic: 'The decks are fully editable; small, systematic changes make them yours.',
      visual: { kind: 'tutorial', spec: {} },
      tutorial: ['Copy the slides you need into your own presentation.', 'On paste, choose "Use destination theme" to adopt your formatting (or keep source).', 'Set your brand fonts via Slide Master → Fonts (or Replace Fonts across the deck).', 'Swap the navy/cyan palette for your brand colors.', 'For our bundles: edit `bundle-spec.json` and run `/toolkit render <slug>` to regenerate.'],
      example: { company: 'Your company', narrative: 'A user copies the 5-phase process map, applies their brand font + colors, and ships it in their own template in minutes.', takeaway: 'Reuse the structure; re-skin the style.' },
      template: { instructions: 'Brand checklist.', fields: ['Heading font: ___', 'Body font: ___', 'Primary color: ___', 'Accent color: ___', 'Logo placed: ___'] },
      pitfalls: ['Changing content and forgetting to update the source citation on data slides.'], when_to_use: 'When producing your branded deliverable (phase 3).', sources: ['s1'] },
  ],
  deck: { subtitle: 'How to use the toolkit library', slides: [
    { layout: 'cover' },
    { layout: 'exec-summary', title: 'A library of executable processes — and a loop to turn any of them into a decision',
      governing: 'Choose the right toolkit → adapt it to your context → produce your deliverable → present and secure the decision.',
      reasons: [
        { title: '19 reconstructed processes', body: 'Each a full handbook + board-ready deck + machine-readable spine + per-framework anatomy.' },
        { title: 'One operating loop', body: 'A repeatable 4-step loop turns the right toolkit into an owned outcome.' },
        { title: '#5 is the spine', body: 'The 5-phase consulting OS sequences the domain toolkits; start there if unsure.' },
        { title: 'Executable, not theoretical', body: 'Every framework ships a step-by-step tutorial + a fill-in template.' },
      ] },
    { layout: 'table', title: 'The library spans 19 toolkits across the management agenda', subtitle: 'Each maps to a phase of the work — diagnose, organize, transform, sell, operate, buy, fund',
      firstcol_head: true, headers: ['#', 'Toolkit', 'Domain'], rows: mapRows },
    { layout: 'process-map', title: 'Operating the library is a four-step loop, mirroring the engagement itself', active: 0,
      phases: [
        { n: 1, name: 'Choose', bullets: ['Name the outcome', 'Pick from the groups', { grp: 'Gate' }, 'Smallest toolkit that answers it'] },
        { n: 2, name: 'Adapt', bullets: ['Read the handbook', 'Fill templates with your data', { grp: 'Gate' }, 'Evidence, not assertion'] },
        { n: 3, name: 'Produce', bullets: ['Reuse the deck skeleton', 'Re-style to your brand', { grp: 'Gate' }, 'Slide 1 states the answer'] },
        { n: 4, name: 'Present', bullets: ['Open with the answer', 'Close on owners + dates', { grp: 'Gate' }, 'Decision made in the room'] },
      ] },
    { layout: 'process-flow', title: 'Every bundle ships the same six assets — read them in this order', boxes: [
      { label: 'Handbook', sub: 'the process' }, { label: 'Frameworks', sub: 'the tools' }, { label: 'Templates', sub: 'the fill-ins' }, { label: 'Examples', sub: 'the patterns' }, { label: 'Deck', sub: 'the pitch' },
    ], note: 'Plus process.yaml (the machine-readable spine) and sources.md (the proof).' },
    { layout: 'framework-desc', title: 'Toolkit #5 is the operating system the other 18 plug into', name: 'The 5-phase consulting OS',
      what: 'Business plan → proposal & legal → identify the problem → solve with world-class frameworks → present effectively.', origin: 'Reconstructed in toolkit #5.', logic: 'Most domain toolkits are a deep dive on one phase of this spine; #5 is the through-line that sequences them.',
      points: ['Diagnose (phase III) BEFORE pulling in any solution toolkit', '#1 Strategy, #9 Sales, #7 M&A all live in "solve"', 'Always present with the Pyramid Principle', 'Every phase ends at an explicit gate'] },
    { layout: 'tutorial', title: 'Re-brand any deck to your organization in five moves', steps: [
      { n: 1, title: 'Copy the slides you need', desc: 'Pull the process map, the framework slides and the example into your own deck.' },
      { n: 2, title: 'Adopt your theme on paste', desc: '"Use destination theme" to take your formatting, or keep source for ours.' },
      { n: 3, title: 'Set brand fonts', desc: 'Slide Master → Fonts, or Replace Fonts across the whole deck.' },
      { n: 4, title: 'Swap the palette', desc: 'Replace the navy/cyan/gold with your brand colors.' },
      { n: 5, title: 'Or re-render', desc: 'Edit bundle-spec.json and run /toolkit render <slug> to regenerate both PDFs.' },
    ] },
    { layout: 'close', title: 'Start here', message: 'Pick your highest-stakes open question, choose the toolkit that answers it, and run the four-step loop.',
      next_steps: ['Open the master INDEX.md and find your group', 'Read #5 Management Consulting to learn the spine', 'Run the loop on one real decision this week'] },
  ] },
  document_md: `# Master Index & Onboarding\n\n_The operating guide to a 19-toolkit library of executable consulting processes._\n\n## What this library is\n\nNineteen world-class business-problem-solving **processes**, reconstructed from consulting-toolkit clues into full, *executable* playbooks. Each toolkit is a bundle: a detailed **handbook PDF** (the process), a board-ready **16:9 deck** (the pitch), a machine-readable **process.yaml** (the spine), and **per-framework anatomy** files — each framework with a description, a visual, a step-by-step tutorial, a real example, a fill-in template, and pitfalls.\n\nThe library is original synthesis in the consulting-deck genre — it is not a copy of any source deck.\n\n## When to use this toolkit\n\nStart here. Read it once to learn how the library is organized and how to turn any toolkit into your own branded deliverable. Then return to the master \`INDEX.md\` to choose a toolkit whenever you face a real decision.\n\n## The process at a glance — the four-step library operating loop\n\n| Phase | Goal | Key question | Gate |\n|---|---|---|---|\n| 1 Choose | Match your situation to the one process that fits | What outcome do I owe a stakeholder? | Smallest toolkit that answers it |\n| 2 Adapt | Turn the generic process into your situation | Which phases/frameworks apply, with what data? | Evidence, not assertion |\n| 3 Produce | Assemble the analysis into your branded deliverable | What is the single answer, and what proves it? | Slide 1 states the answer |\n| 4 Present | Land the recommendation so they decide and act | Did they decide; who owns next steps? | Decision + owners recorded |\n\n## Phase 1 — Choose the right toolkit\n\nName the outcome you owe a stakeholder in one sentence — that is your governing question. Then pick from the master-index groups (Diagnose & Strategize · Organize & Lead · Transform & Build with Tech · Grow & Sell · Operate & Improve · Buy & Integrate · Fund/Measure/De-risk). If unsure, start at **#5 Management Consulting** — it is the 5-phase operating system the other 18 toolkits plug into. **Gate:** is this the smallest toolkit that answers the question?\n\n## Phase 2 — Adapt the process to your context\n\nRead the toolkit's handbook PDF end to end, then copy the relevant \`frameworks/\` and \`templates/\` and fill them with your real numbers and facts. Skip phases that do not apply; never skip a gate. **Gate:** is each populated artifact backed by evidence?\n\n## Phase 3 — Produce your deliverable\n\nReuse the toolkit deck as a skeleton (open \`slides/deck.html\` or the deck PDF), replace example data with yours, and keep the action-title discipline — one message per slide, titles in sequence telling the whole story. Re-style to your brand (fonts, colors), or edit \`bundle-spec.json\` and run \`/toolkit render <slug>\` to regenerate. **Gate:** does slide 1 state the answer, not the journey?\n\n## Phase 4 — Present & secure the decision\n\nOpen with the recommendation and the value at stake; walk the Pyramid only as deep as the room needs; pre-empt the three killer objections with evidence. Close by writing the decision and next-step owners and dates in the room. **Gate:** if deferred, the open objection is named and a follow-up booked.\n\n## The frameworks & tools\n\nSee \`frameworks/\` — the toolkit anatomy, the 5-phase operating system, the Pyramid Principle, and the slide-customization workflow.\n\n## The 19 toolkits\n\nSee the master \`INDEX.md\` for the grouped, linked list with each toolkit's process model, phase count and framework count.\n\n## Best practices\n\n- **Diagnose before you solve.** Run #5's problem-identification phase before reaching for a solution toolkit.\n- **The toolkits compose.** Most are a deep dive on one phase of #5; sequence them with #5 as the spine.\n- **Honor the gates.** Each phase ends at an explicit go/no-go — they exist to stop wasted work.\n- **Answer first.** Every deliverable leads with the recommendation (Pyramid Principle).\n\n## Sources\n\nReconstructed by the \`consulting-toolkit\` capability from the library's own structure + canonical management knowledge.\n`,
  templates: [{ name: 'Library operating loop worksheet', format: 'md', content: '# Library operating loop\n\n- Governing question: ___\n- Chosen toolkit: ___ (why: ___)\n- Phases that apply: ___\n- Data I will use: ___\n- The single answer: ___\n- 3 supporting arguments: ___\n- Decision sought: ___ / owners + dates: ___\n' }],
  worked_example: { title: 'Using the library on a real growth question', content_md: 'A founder asks "should we expand to the US?" → chooses #1 Business Strategy (entry) + #9 Sales/Marketing, runs them inside #5 phase IV (solve), produces a branded board deck led by the recommendation, and closes the board on a go decision with owners and dates.\n' },
  sources: [{ key: 's1', title: 'The library structure + canonical management knowledge', url: '', note: 'meta-bundle; see each toolkit bundle for its own sources' }],
  self_grade: { coverage_pct: 1.0, rigor_note: 'Meta/onboarding bundle — authored, not reconstructed.', frameworks_count: 4, phases_count: 4 },
};

const specPath = path.join(dir, 'bundle-spec.json');
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
const r = cp.spawnSync('node', [path.join(__dirname, 'render.cjs'), specPath, dir], { stdio: 'inherit' });
process.exit(r.status || 0);
