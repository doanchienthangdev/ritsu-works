'use strict';
// Smoke test: a synthetic bundle-spec exercising every layout + the md engine.
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const OUT = process.argv[2] || '/Users/doanchienthang/ritsu-works/.claude/worktrees/epic-jennings-6198c5/runtime/consulting-toolkit/_test';
fs.mkdirSync(OUT, { recursive: true });
const spec = {
  id: 99, slug: 'smoke', title: 'Smoke Test Toolkit', domain: 'test',
  core_value: 'Prove every layout renders.', one_liner: 'A synthetic toolkit exercising all 19 deck layouts and the markdown engine.',
  when_to_use: 'Only for pipeline validation.', audience: ['renderer'],
  process: { model_name: '3-phase test', model_rationale: 'arbitrary', phases: [
    { n: 1, name: 'Frame', goal: 'Define the problem.', key_question: 'What are we solving?', duration: '1 wk', deliverable: 'Problem statement', gate: 'Sponsor sign-off', kpis: ['clarity'],
      steps: [{ n: 1, name: 'Scope', how: 'Use TOSCA to frame.', frameworks: ['tosca'], input: 'brief', output: 'frame', owner: 'Lead' }], frameworks: ['tosca'] },
    { n: 2, name: 'Analyze', goal: 'Find the driver.', key_question: 'Why?', duration: '2 wk', deliverable: 'Diagnosis', gate: 'Insight validated', kpis: ['evidence'],
      steps: [{ n: 1, name: 'Decompose', how: 'Driver tree.', frameworks: ['driver-tree'], input: 'data', output: 'tree', owner: 'Analyst' }], frameworks: ['driver-tree'] },
    { n: 3, name: 'Decide', goal: 'Choose.', key_question: 'Which option?', duration: '1 wk', deliverable: 'Recommendation', gate: 'Approved', kpis: ['NPV'],
      steps: [{ n: 1, name: 'Evaluate', how: 'Score options.', frameworks: ['tosca'], input: 'options', output: 'choice', owner: 'Lead' }], frameworks: ['tosca'] },
  ] },
  frameworks: [
    { slug: 'tosca', name: 'TOSCA Framing', category: 'diagnosis', what: 'A 5-part problem-framing lens.', origin: 'McKinsey-style', logic: 'Frame before solving to avoid solving the wrong problem.',
      visual: { kind: 'matrix-2x2', spec: {} }, tutorial: ['Write the Trouble.', 'Name the Owner.', 'Set Success criteria.', 'List Constraints.', 'Identify Actors.'],
      example: { company: 'Acme', narrative: 'Acme framed its churn problem with TOSCA and found the real owner was Product, not Support.', takeaway: 'Right owner → right fix.' },
      template: { instructions: 'Fill each TOSCA element.', fields: ['Trouble: ___', 'Owner: ___', 'Success: ___', 'Constraints: ___', 'Actors: ___'] },
      pitfalls: ['Skipping the owner → orphaned problem.'], when_to_use: 'At the start of any ambiguous problem.', sources: ['s1'] },
    { slug: 'driver-tree', name: 'Driver Tree', category: 'analysis', what: 'Decomposes a metric into levers.', origin: 'Classic', logic: 'Math identities make causality explicit.',
      visual: { kind: 'tree', spec: {} }, tutorial: ['Pick the metric.', 'Decompose by identity.', 'Go 3 levels deep.'], example: { company: 'Beta', narrative: 'Beta decomposed revenue into traffic×CVR×AOV.', takeaway: 'CVR was the lever.' },
      template: { instructions: 'Decompose your metric.', fields: ['Metric: ___', 'Level 1: ___'] }, pitfalls: ['Mixing additive and multiplicative.'], when_to_use: 'Any KPI problem.', sources: ['s1'] },
  ],
  deck: { subtitle: 'Smoke deck', slides: [
    { layout: 'cover' },
    { layout: 'exec-summary', title: 'You can finally run this engagement end-to-end', governing: 'Frame → Analyze → Decide, with a named tool at every step.', reasons: [{ title: 'Framed', body: 'TOSCA stops you solving the wrong problem.' }, { title: 'Evidenced', body: 'Driver trees expose the real lever.' }, { title: 'Decided', body: 'Options scored on NPV.' }] },
    { layout: 'process-map', title: 'A 3-phase process with a gate at each exit', active: 1, phases: [
      { n: 1, name: 'Frame', bullets: ['Scope', 'TOSCA', { grp: 'Gate' }, 'Sponsor sign-off'] },
      { n: 2, name: 'Analyze', bullets: ['Driver tree', 'Hypothesize', 'Test'] },
      { n: 3, name: 'Decide', bullets: ['Options', 'Score', 'Recommend'] } ] },
    { layout: 'section', title: 'Phase 1', n: 1, name: 'Frame', goal: 'Define the problem precisely before any analysis.', active: 1, phases: ['Frame', 'Analyze', 'Decide'] },
    { layout: 'content', title: 'Three reasons framing matters', body: ['Framing is the cheapest leverage in the whole engagement.', { sub: 'Why', bullets: ['Avoids rework', 'Aligns sponsor', { text: 'Sets scope', sub: ['in', 'out'] }] }], takeaways: ['Frame first, always.'] },
    { layout: 'two-col', title: 'What vs Who', left: { title: 'What', body: ['The deliverable is a problem statement.'] }, right: { title: 'Who', body: ['The sponsor owns the outcome.'] } },
    { layout: 'framework-desc', title: 'TOSCA: a 5-part framing lens', name: 'TOSCA', what: 'Trouble, Owner, Success, Constraints, Actors.', origin: 'McKinsey-style', logic: 'Make the implicit explicit.', points: ['Trouble', 'Owner', 'Success criteria', 'Constraints', 'Actors'] },
    { layout: 'matrix-2x2', title: 'Prioritize on impact vs effort', x_label: 'Effort →', y_label: 'Impact →', quadrants: [
      { pos: 'tl', label: 'Quick wins?', desc: 'High impact, high effort', strategy: 'Plan', color: 'gold' },
      { pos: 'tr', label: 'Do now', desc: 'High impact, low effort', strategy: 'Execute', color: 'green' },
      { pos: 'bl', label: 'Avoid', desc: 'Low impact, high effort', strategy: 'Drop', color: 'red' },
      { pos: 'br', label: 'Fill-ins', desc: 'Low impact, low effort', strategy: 'Defer', color: 'amber' } ] },
    { layout: 'staircase', title: 'Capability compounds step by step', steps: [{ n: 1, label: 'Base', desc: 'Today' }, { n: 2, label: 'Adjacent' }, { n: 3, label: 'New market' }, { n: 4, label: 'New arena' }] },
    { layout: 'process-flow', title: 'The value chain flows left to right', boxes: [{ label: 'Source', sub: 'inputs' }, { label: 'Make', sub: 'transform' }, { label: 'Deliver', sub: 'to customer' }], note: 'Each link adds margin.' },
    { layout: 'tutorial', title: 'Apply TOSCA in five steps', steps: [{ n: 1, title: 'Trouble', desc: 'State the pain.' }, { n: 2, title: 'Owner', desc: 'Name who owns it.' }, { n: 3, title: 'Success', desc: 'Define done.' }, { n: 4, title: 'Constraints', desc: 'List the limits.' }, { n: 5, title: 'Actors', desc: 'Who must act.' }] },
    { layout: 'table', title: 'The phases, goals and gates', firstcol_head: true, headers: ['Phase', 'Goal', 'Gate'], rows: [['Frame', 'Define problem', 'Sponsor sign-off'], ['Analyze', 'Find driver', 'Insight validated'], ['Decide', 'Choose', 'Approved']] },
    { layout: 'comparison', title: 'Red ocean vs blue ocean', columns: [{ title: 'Red ocean', color: 'red', rows: ['Compete in existing space', 'Beat the competition', 'Exploit demand'] }, { title: 'Blue ocean', color: 'green', rows: ['Create new space', 'Make rivals irrelevant', 'Create demand'] }] },
    { layout: 'kpi-tiles', title: 'The toolkit at a glance', tiles: [{ value: '3', label: 'phases' }, { value: '2', label: 'frameworks' }, { value: '100%', label: 'cited' }] },
    { layout: 'chart', title: 'Revenue has grown at a healthy CAGR', source: 'Illustrative', chart_type: 'column', categories: ['2021', '2022', '2023', '2024'], series: [{ name: 'Revenue ($M)', values: [10, 14, 19, 26] }], key_takeaways: ['~37% CAGR', 'Acceleration in 2024'] },
    { layout: 'chart', title: 'Two series compare cleanly', source: 'Illustrative', chart_type: 'line', categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Plan', values: [5, 7, 9, 12] }, { name: 'Actual', values: [4, 8, 8, 14] }] },
    { layout: 'example', title: 'How Acme used the process', company: 'Acme Corp', narrative: 'Acme ran all three phases in six weeks and cut churn by 22%.', data: [{ label: 'Churn before', value: '9%' }, { label: 'Churn after', value: '7%' }] },
    { layout: 'quote', title: '', text: 'Frame the problem before you solve it — the cheapest leverage there is.', attribution: 'Consulting maxim' },
    { layout: 'close', title: 'Next steps', message: 'Run the 3-phase process on your highest-stakes open question.', next_steps: ['Pick the question', 'Frame with TOSCA', 'Book the sponsor gate'] },
  ] },
  document_md: `# Smoke Test Toolkit\n\n_A synthetic toolkit to validate the handbook renderer._\n\n## When to use this toolkit\nUse it **only** to test rendering. It exercises *italics*, **bold**, \`code\`, and [a link](https://example.com).\n\n## The process at a glance\n\n| Phase | Goal | Key question | Gate |\n|---|---|---|---|\n| Frame | Define the problem | What are we solving? | Sponsor sign-off |\n| Analyze | Find the driver | Why? | Insight validated |\n| Decide | Choose | Which option? | Approved |\n\n## Phase 1 — Frame\nThe goal is to define the problem precisely.\n\n1. Scope the question.\n2. Apply TOSCA.\n   - Trouble\n   - Owner\n3. Get sponsor sign-off.\n\n> Framing is the cheapest leverage in the whole engagement.\n\n## The frameworks & tools\nSee \`frameworks/\` for full anatomy.\n\n---\n\n## Sources\nIllustrative only.\n`,
  templates: [{ name: 'TOSCA worksheet', format: 'md', content: '# TOSCA worksheet\n\n- Trouble: ___\n- Owner: ___\n- Success: ___\n- Constraints: ___\n- Actors: ___\n' }],
  worked_example: { title: 'Acme end-to-end', content_md: 'Acme ran the full process...\n' },
  sources: [{ key: 's1', title: 'Illustrative source', url: 'https://example.com', note: 'smoke test' }],
  self_grade: { coverage_pct: 1.0, rigor_note: 'synthetic', frameworks_count: 2, phases_count: 3 },
};
const specPath = path.join(OUT, 'bundle-spec.input.json');
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
console.log('wrote', specPath);
const r = cp.spawnSync('node', [path.join(__dirname, 'render.cjs'), specPath, OUT], { stdio: 'inherit' });
process.exit(r.status || 0);
