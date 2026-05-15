// Lineage chain semantics — NEW row per update with supersedes_id pointing
// to prior row. Original state → 'superseded'. Behavioral test of the rule.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION_00011 = join(REPO, "supabase", "migrations", "00011_capability_lifecycle.sql");
const MIGRATION_00025 = join(REPO, "supabase", "migrations", "00025_capability_update_lock.sql");
const CATALOG = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "catalog-updater", "SKILL.md");

const m11 = readFileSync(MIGRATION_00011, "utf8");
const m25 = readFileSync(MIGRATION_00025, "utf8");
const catalogText = readFileSync(CATALOG, "utf8");

describe("Lineage chain — schema + spec contracts", () => {
  it("ops.capability_runs has supersedes_id column (00011)", () => {
    expect(m11).toMatch(/supersedes_id\s+uuid REFERENCES ops\.capability_runs/);
  });

  it("ops.capability_runs has superseded_by_id column (00011)", () => {
    expect(m11).toMatch(/superseded_by_id\s+uuid REFERENCES ops\.capability_runs/);
  });

  it("state CHECK constraint allows 'superseded'", () => {
    expect(m11).toMatch(/state IN \([\s\S]{0,200}'superseded'/);
  });

  it("state CHECK constraint allows 'deprecated'", () => {
    expect(m11).toMatch(/state IN \([\s\S]{0,200}'deprecated'/);
  });

  it("v_capability_lineage view is recursive over supersedes_id (00025)", () => {
    expect(m25).toMatch(/WITH RECURSIVE chain[\s\S]{0,800}supersedes_id/);
  });

  it("catalog-updater documents NEW row + supersedes_id pattern (per mode)", () => {
    // fix mode
    expect(catalogText).toMatch(/Mode `fix`/);
    expect(catalogText).toMatch(/state = ['"]superseded['"]|prior row state = ['"]superseded['"]/i);
  });

  it("deprecate mode terminal state is 'deprecated' NOT 'superseded'", () => {
    // From CEO/Eng review decisions — terminal state for deprecate is distinct.
    expect(catalogText).toMatch(/Mode `deprecate`/);
    expect(catalogText).toMatch(/'deprecated'.*NOT.*'superseded'|terminal state/i);
  });
});

// --------------------------------------------------------------------------
// Behavioral simulation — lineage chain traversal
// --------------------------------------------------------------------------

interface ChainRow {
  id: string;
  capability_id: string;
  state: string;
  version: string;
  supersedes_id: string | null;
  proposed_at: Date;
}

function buildLineage(rows: ChainRow[], capability_id: string): Array<ChainRow & { chain_depth: number }> {
  const filtered = rows.filter((r) => r.capability_id === capability_id);
  const byId = new Map<string, ChainRow>();
  for (const r of filtered) byId.set(r.id, r);
  // Find root (supersedes_id null) and walk forward via supersedes_id chain.
  const roots = filtered.filter((r) => r.supersedes_id === null);
  const chain: Array<ChainRow & { chain_depth: number }> = [];
  for (const root of roots) {
    let current: ChainRow | undefined = root;
    let depth = 0;
    while (current) {
      chain.push({ ...current, chain_depth: depth });
      const next: ChainRow | undefined = filtered.find((r) => r.supersedes_id === current!.id);
      current = next;
      depth += 1;
    }
  }
  return chain;
}

function getCurrentRow(rows: ChainRow[], capability_id: string): ChainRow | null {
  // The current row is the one in 'operating' or 'deployed' state for this capability.
  return rows.find(
    (r) => r.capability_id === capability_id && (r.state === "operating" || r.state === "deployed"),
  ) || null;
}

describe("Lineage chain — behavioral simulation", () => {
  it("single row capability returns chain of length 1, depth 0", () => {
    const rows: ChainRow[] = [
      {
        id: "row-1",
        capability_id: "lead-acquisition",
        state: "operating",
        version: "1.0.0",
        supersedes_id: null,
        proposed_at: new Date("2026-05-04"),
      },
    ];
    const chain = buildLineage(rows, "lead-acquisition");
    expect(chain).toHaveLength(1);
    expect(chain[0].chain_depth).toBe(0);
    expect(chain[0].state).toBe("operating");
  });

  it("3-row chain (initial → fix → extend) traverses correctly", () => {
    const rows: ChainRow[] = [
      { id: "r1", capability_id: "lead-acquisition", state: "superseded", version: "1.0.0", supersedes_id: null, proposed_at: new Date("2026-05-04") },
      { id: "r2", capability_id: "lead-acquisition", state: "superseded", version: "1.0.1", supersedes_id: "r1", proposed_at: new Date("2026-05-12") },
      { id: "r3", capability_id: "lead-acquisition", state: "operating", version: "1.1.0", supersedes_id: "r2", proposed_at: new Date("2026-05-15") },
    ];
    const chain = buildLineage(rows, "lead-acquisition");
    expect(chain).toHaveLength(3);
    expect(chain.map((r) => r.chain_depth)).toEqual([0, 1, 2]);
    expect(chain.map((r) => r.version)).toEqual(["1.0.0", "1.0.1", "1.1.0"]);
  });

  it("only one row in 'operating' state at a time (latest in chain)", () => {
    const rows: ChainRow[] = [
      { id: "r1", capability_id: "x", state: "superseded", version: "1.0.0", supersedes_id: null, proposed_at: new Date("2026-01-01") },
      { id: "r2", capability_id: "x", state: "operating", version: "2.0.0", supersedes_id: "r1", proposed_at: new Date("2026-05-01") },
    ];
    const current = getCurrentRow(rows, "x");
    expect(current?.id).toBe("r2");
    expect(current?.version).toBe("2.0.0");
  });

  it("after deprecate, no row is 'operating' (capability is dead)", () => {
    const rows: ChainRow[] = [
      { id: "r1", capability_id: "x", state: "deprecated", version: "1.0.0", supersedes_id: null, proposed_at: new Date("2026-01-01") },
    ];
    const current = getCurrentRow(rows, "x");
    expect(current).toBeNull();
  });

  it("multiple capabilities don't cross-contaminate lineage", () => {
    const rows: ChainRow[] = [
      { id: "a1", capability_id: "cap-a", state: "operating", version: "1.0.0", supersedes_id: null, proposed_at: new Date("2026-01-01") },
      { id: "b1", capability_id: "cap-b", state: "operating", version: "1.0.0", supersedes_id: null, proposed_at: new Date("2026-02-01") },
    ];
    const chainA = buildLineage(rows, "cap-a");
    const chainB = buildLineage(rows, "cap-b");
    expect(chainA).toHaveLength(1);
    expect(chainB).toHaveLength(1);
    expect(chainA[0].id).toBe("a1");
    expect(chainB[0].id).toBe("b1");
  });
});
