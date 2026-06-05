// Tests for scripts/thinking-toolkit/trace-extract.cjs (capability thinking-toolkit
// v3.3 Reasoning Trace — the pure run-folder → trace.json extractor).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { extractTrace, toolOf, resolveRunDir } = require('../../scripts/thinking-toolkit/trace-extract.cjs');

describe('toolOf — provenance/source → data-tool bucket classification', () => {
  it('classifies ask-user (with or without hyphen)', () => {
    expect(toolOf('ask-user (founder) [H1]')).toBe('ask-user');
    expect(toolOf('ask user')).toBe('ask-user');
  });
  it('classifies supabase-analytics (Door-2 live.* schema)', () => {
    expect(toolOf('supabase-analytics live.profiles+payments')).toBe('supabase-analytics');
    expect(toolOf('live.learning_sessions')).toBe('supabase-analytics');
  });
  it('classifies supabase-ops (ops.* / metrics.*)', () => {
    expect(toolOf('supabase-ops ops.capability_runs')).toBe('supabase-ops');
    expect(toolOf('metrics.product_dau_snapshot')).toBe('supabase-ops');
  });
  it('classifies external web/deep-research (the numbers to verify)', () => {
    expect(toolOf('WebSearch (Pathmonk/FirstPageSage)')).toBe('web/deep-research');
    expect(toolOf('/deepask + deep-research')).toBe('web/deep-research');
    expect(toolOf('https://businessofapps.com')).toBe('web/deep-research');
  });
  it('classifies wiki_ask, gbrain, /think, assumption, repo', () => {
    expect(toolOf('wiki icp-summary')).toBe('wiki_ask');
    expect(toolOf('gbrain search')).toBe('gbrain');
    expect(toolOf('/think driver-tree model')).toBe('/think');
    expect(toolOf('external benchmark (assumption)')).toBe('assumption/benchmark');
    expect(toolOf('.mcp.json + manifest.yaml + ROLES.md')).toBe('repo');
  });
  it('handles empty / unknown gracefully (no throw)', () => {
    expect(toolOf('')).toBe('other');
    expect(toolOf(null as unknown as string)).toBe('other');
    expect(toolOf('something nobody recognizes')).toBe('other');
  });
});

describe('extractTrace — run folder → structured trace', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-test-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const writeCheckpoint = () =>
    fs.writeFileSync(
      path.join(dir, 'checkpoint-log.md'),
      `# Checkpoint log\n\n| id | stage | kind | presented | team input / consensus | decision |\n|---|---|---|---|---|---|\n| C1 | state | frame | framed TOSCA | founder confirmed | proceed |\n| C2 | solve | porpoise | data reframed X | no reframe | hold |\n`
    );
  const writeAnalysis = () =>
    fs.writeFileSync(
      path.join(dir, 'analysis-log.md'),
      `# Analysis log\n\n| hypothesis | data pulled | provenance | degree | validation verdict |\n|---|---|---|---|---|\n| state heartbeat | 25 users | supabase-analytics live.profiles | 2 | validated |\n| free->paid bench | edtech 2-4% | WebSearch (Pathmonk) | 5 | external benchmark |\n`
    );
  const writeWorkplan = () =>
    fs.writeFileSync(
      path.join(dir, 'workplan.md'),
      `# Workplan\n\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| A1 activation | strangers dont activate | proxy | supabase-analytics live.* | founder | funnel exhibit | validated |\n`
    );
  const writeHitl = () =>
    fs.writeFileSync(
      path.join(dir, 'hitl-log.md'),
      `# HITL log\n\n| id | stage | question asked | founder answer | feeds datum | assumption-if-unanswered |\n|---|---|---|---|---|---|\n| H1 | state | who are the accounts? | mostly me/test | identity | assume mixed |\n`
    );

  it('extracts checkpoints, analyses, workplan, hitl with correct counts', () => {
    writeCheckpoint(); writeAnalysis(); writeWorkplan(); writeHitl();
    const t = extractTrace(dir);
    expect(t.stats.checkpoints).toBe(2);
    expect(t.stats.analyses).toBe(2);
    expect(t.stats.workplan_rows).toBe(1);
    expect(t.stats.hitl_receipts).toBe(1);
    expect(t.slug).toBe(path.basename(dir));
  });

  it('counts porpoises from the checkpoint kind column', () => {
    writeCheckpoint();
    expect(extractTrace(dir).stats.porpoises).toBe(1);
  });

  it('detects external numbers (web/deep-research) as the verification targets', () => {
    writeAnalysis();
    const t = extractTrace(dir);
    expect(t.stats.external_numbers).toBe(1);
    expect(t.external_data[0].tool).toBe('web/deep-research');
    expect(t.external_data[0].degree_num).toBe(5);
  });

  it('tallies tools_used across analyses', () => {
    writeAnalysis();
    const t = extractTrace(dir);
    expect(t.tools_used['supabase-analytics']).toBe(1);
    expect(t.tools_used['web/deep-research']).toBe(1);
  });

  it('groups checkpoints into 4S bands; analyses land in solve', () => {
    writeCheckpoint(); writeAnalysis();
    const t = extractTrace(dir);
    expect(t.bands.state.some((e: any) => e.label === 'frame')).toBe(true);
    expect(t.bands.solve.some((e: any) => e.kind === 'analysis')).toBe(true);
  });

  it('parses degree as a number, leaving non-numeric as null', () => {
    writeAnalysis();
    const t = extractTrace(dir);
    expect(t.analyses[0].degree_num).toBe(2);
  });

  it('is empty-safe when artifacts are missing (no throw, zero counts)', () => {
    const t = extractTrace(dir); // empty dir
    expect(t.stats).toEqual({
      checkpoints: 0, analyses: 0, hitl_receipts: 0, workplan_rows: 0, porpoises: 0, external_numbers: 0,
    });
    expect(t.checkpoints).toEqual([]);
    expect(t.bands.solve).toEqual([]);
  });
});

describe('resolveRunDir', () => {
  it('returns null for a missing arg or non-existent path', () => {
    expect(resolveRunDir(undefined)).toBeNull();
    expect(resolveRunDir('/no/such/path/xyz')).toBeNull();
    expect(resolveRunDir('definitely-not-a-real-slug-xyz')).toBeNull();
  });
  it('resolves an existing absolute path', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-resolve-'));
    try { expect(resolveRunDir(d)).toBe(d); } finally { fs.rmSync(d, { recursive: true, force: true }); }
  });
});
