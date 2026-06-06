// tests/dataviz/flow-render.test.ts
// Capability dataviz v0.5 — flow-graphviz renderer. The DOT BUILDER (specToDot/injectTheme)
// is PURE → unit-tested with toContain/toBe. The actual `dot` render is byte-UNSTABLE across
// Graphviz versions → NOT snapshot-tested; a guarded smoke test runs only when `dot` is present
// (so CI/dev without graphviz still passes — skip, never fail).
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const flow = require('../../scripts/dataviz/flow-render.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildTheme } = require('../../scripts/dataviz/lib/theme.cjs');
const { theme } = buildTheme(null, 'mckinsey');

const baseSpec = {
  rankdir: 'TB',
  title: 'Onboarding',
  clusters: [{ id: 'ph1', label: 'AWARE', color: '#034B6F' }],
  nodes: [
    { id: 'a', label: 'Start', role: 'start', cluster: 'ph1' },
    { id: 'b', label: 'Do work', role: 'step' },
    { id: 'd', label: 'Pay?', role: 'decision' },
    { id: 'win', label: 'Paid', role: 'success' },
    { id: 'x', label: 'Churn', role: 'risk' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'd' },
    { from: 'd', to: 'win', label: 'yes', color: 'green' },
    { from: 'd', to: 'x', label: 'no', color: 'red', style: 'dashed' },
  ],
};

describe('flow-render specToDot — happy path', () => {
  const dot = flow.specToDot(baseSpec, theme, {});
  it('produces a digraph with the theme preamble (graph/node/edge defaults)', () => {
    expect(dot.startsWith('digraph flow {')).toBe(true);
    expect(dot).toContain('graph [rankdir=TB');
    expect(dot).toContain('node  [shape=box');
    expect(dot).toContain('edge  [color=');
  });
  it('renders every node and every valid edge', () => {
    ['"a"', '"b"', '"d"', '"win"', '"x"'].forEach((n) => expect(dot).toContain(n));
    expect((dot.match(/->/g) || []).length).toBe(4);
  });
  it('maps roles to the brand vocabulary (diamond decision, green win, red risk)', () => {
    expect(dot).toMatch(/"d" \[[^\]]*shape="diamond"/);
    expect(dot).toContain('#E4F3E9'); // success fill
    expect(dot).toContain('#FBEAE7'); // risk fill
    expect(dot).toContain('#FCEBD2'); // decision (amber) fill
    expect(dot).toContain('#222222'); // start (ink) fill
  });
  it('a moment/highlight role uses the brand blue', () => {
    const d2 = flow.specToDot({ nodes: [{ id: 'm', label: 'Aha', role: 'moment' }], edges: [] }, theme, {});
    expect(d2).toContain('#005EB8');
  });
  it('emits a swimlane cluster: pale fill + accent label/border (not a saturated block)', () => {
    expect(dot).toContain('subgraph "cluster_ph1" {');
    expect(dot).toContain('label="AWARE"');
    expect(dot).toContain('fontcolor="#034B6F"');                                   // label uses the accent
    expect(dot).toMatch(/color="#034B6F"; fillcolor="#[0-9A-F]{6}"; penwidth=1\.2/); // accent border + a PALE fill
    expect(dot).not.toContain('fillcolor="#034B6F"');                               // the SATURATED accent is never the fill
  });
  it('clusters with no color get the harmonious auto-ramp (pale, not saturated)', () => {
    const d3 = flow.specToDot({ clusters: [{ id: 'z', label: 'Z' }], nodes: [{ id: 'a', label: 'A', cluster: 'z' }], edges: [] }, theme, {});
    expect(d3).toContain('fontcolor="#1F5C8B"');     // CLUSTER_RAMP[0] as the accent
    expect(d3).not.toContain('fillcolor="#1F5C8B"'); // fill is a pale tint, not the ramp accent
  });
  it('honors edge label, semantic color, and dashed style', () => {
    expect(dot).toMatch(/"d" -> "win" \[[^\]]*label="yes"/);
    expect(dot).toMatch(/"d" -> "x" \[[^\]]*style="dashed"/);
    expect(dot).toContain('#C0392B'); // red edge/risk color
  });
  it('sets the graph label from the title', () => {
    expect(dot).toContain('label="Onboarding";');
  });
});

describe('flow-render specToDot — rankdir + opts override', () => {
  it('opts.rankdir overrides spec.rankdir', () => {
    expect(flow.specToDot({ ...baseSpec, rankdir: 'TB' }, theme, { rankdir: 'LR' })).toContain('rankdir=LR');
  });
  it('invalid rankdir falls back to TB', () => {
    expect(flow.specToDot({ ...baseSpec, rankdir: 'SIDEWAYS' }, theme, {})).toContain('rankdir=TB');
  });
});

describe('flow-render specToDot — edge cases (never throws, always valid digraph)', () => {
  const cases: [string, any][] = [
    ['empty object', {}],
    ['null', null],
    ['no nodes', { edges: [{ from: 'a', to: 'b' }] }],
    ['no edges', { nodes: [{ id: 'a', label: 'A' }] }],
    ['node missing role → default step', { nodes: [{ id: 'a', label: 'A' }], edges: [] }],
    ['edge missing from/to → skipped', { nodes: [{ id: 'a' }], edges: [{ to: 'a' }, { from: 'a' }, {}] }],
    ['cluster with no nodes', { clusters: [{ id: 'c', label: 'C' }], nodes: [], edges: [] }],
    ['label with quotes + newline is escaped', { nodes: [{ id: 'a', label: 'He said "hi"\nbye' }], edges: [] }],
  ];
  cases.forEach(([name, spec]) => {
    it(`${name} → valid digraph, no throw`, () => {
      let dot = '';
      expect(() => { dot = flow.specToDot(spec, theme, {}); }).not.toThrow();
      expect(dot.startsWith('digraph flow {')).toBe(true);
      expect(dot.trim().endsWith('}')).toBe(true);
    });
  });
  it('escapes a quote in a label', () => {
    const dot = flow.specToDot({ nodes: [{ id: 'a', label: 'a"b' }], edges: [] }, theme, {});
    expect(dot).toContain('\\"');
  });
  it('skips exactly the malformed edges', () => {
    const dot = flow.specToDot({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ from: 'a', to: 'b' }, { to: 'a' }, {}] }, theme, {});
    expect((dot.match(/->/g) || []).length).toBe(1);
  });
});

describe('flow-render injectTheme — authored DOT', () => {
  it('injects the preamble right after the first {', () => {
    const out = flow.injectTheme('digraph g { a -> b }', theme, {});
    expect(out).toContain('digraph g {');
    expect(out).toContain('node  [shape=box');
    expect(out.indexOf('node  [shape=box')).toBeGreaterThan(out.indexOf('{'));
  });
  it('no opening brace → returned unchanged', () => {
    expect(flow.injectTheme('not a graph', theme, {})).toBe('not a graph');
  });
  it('preserves the author edges/nodes', () => {
    const out = flow.injectTheme('digraph g { "x" -> "y" }', theme, {});
    expect(out).toContain('"x" -> "y"');
  });
});

describe('flow-render run — input resolution + dry-run', () => {
  it('errors honestly with no input', () => {
    const r = flow.run(['--format=svg']);
    // (stdin in vitest may be empty → error; if a TTY supplies nothing, same.)
    expect(r.ok === false || r.outcome === 'error' || r.outcome === 'dry_run').toBe(true);
  });
  it('dry-run returns the plan + the built DOT (no file write)', () => {
    const r = flow.run([`--spec=${JSON.stringify(baseSpec)}`, '--dry-run']);
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe('dry_run');
    expect(r.dot).toContain('digraph flow {');
    expect(r.runJson.renderer).toBe('flow-graphviz');
  });
  it('invalid --spec JSON → typed error', () => {
    const r = flow.run(['--spec={not json', '--dry-run']);
    expect(r.ok).toBe(false);
    expect(String(r.error)).toMatch(/not valid JSON/);
  });
});

// guarded: only runs where Graphviz `dot` exists (local dev). Skips in CI without graphviz.
function hasDot(): boolean { try { execFileSync('dot', ['-V'], { stdio: 'ignore' }); return true; } catch { return false; } }
(hasDot() ? describe : describe.skip)('flow-render run — real dot render (smoke; skip-if-absent)', () => {
  it('renders the spec to a non-empty SVG with <svg', () => {
    const out = `/tmp/flow-render-test-${process.pid}.svg`;
    const r = flow.run([`--spec=${JSON.stringify(baseSpec)}`, `--out=${out}`, '--format=svg']);
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe('written');
    const fs = require('node:fs');
    const svg = fs.readFileSync(out, 'utf-8');
    expect(svg).toContain('<svg');
    try { fs.unlinkSync(out); fs.unlinkSync(out.replace(/\.svg$/, '.dot')); } catch { /* ignore */ }
  });
});
