// /cla history <id> — read-only timeline query test.
// Verifies v_capability_lineage view definition + /cla command documents
// the history subcommand.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00025_capability_update_lock.sql");
const CMD = join(REPO, ".claude", "commands", "cla.md");
const AGENT = join(REPO, ".claude", "agents", "cla.md");

const migrationText = readFileSync(MIGRATION, "utf8");
const cmdText = readFileSync(CMD, "utf8");
const agentText = readFileSync(AGENT, "utf8");

describe("/cla history <id> — view + command contract", () => {
  it("v_capability_lineage view exists in migration 00025", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE VIEW[\s\S]{0,80}v_capability_lineage/);
  });

  it("view uses recursive CTE for chain traversal", () => {
    expect(migrationText).toMatch(/WITH RECURSIVE chain/);
    expect(migrationText).toMatch(/UNION ALL/);
  });

  it("view includes chain_depth column for traversal order", () => {
    expect(migrationText).toMatch(/chain_depth/);
  });

  it("view orders by capability_id + chain_depth", () => {
    expect(migrationText).toMatch(/ORDER BY capability_id,\s*chain_depth/);
  });

  it("/cla command documents history subcommand under Evolution table", () => {
    expect(cmdText).toMatch(/\/cla history <id>/);
    // History is read-only, Tier A
    expect(cmdText).toMatch(/history[\s\S]{0,80}A.*read-only|read-only.*history/i);
  });

  it("/cla command shows expected history output format example", () => {
    // Per spec, history outputs a chronological table with version, state,
    // proposed_at, sub_flow, cost, duration columns.
    expect(cmdText).toMatch(/chain_depth.*version.*state/);
  });

  it("@cla subagent allows history verb (Tier A)", () => {
    expect(agentText).toMatch(/@cla history/);
  });

  it("@cla subagent classifies history as Tier A (pure read)", () => {
    expect(agentText).toMatch(/history[\s\S]{0,80}A|history.*read-only/i);
  });
});
