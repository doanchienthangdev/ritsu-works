// Universal entity-edit lock — migration 00039 contract test +
// behavioral simulation of ops.acquire_entity_edit_lock / release.
//
// Counterpart to tests/cla/update-lock.test.ts which covers the /cla
// capability_update_lock (a different lock keyed on capability_runs).
// This file covers the ENTITY lock keyed on (entity_type, entity_name)
// shared across /update, /evolve, /cla extend.
//
// Tests:
// 1. Migration 00039 SQL declares the lock table + helper functions
// 2. RLS policies declared for the writers + readers
// 3. evolve command honors the evolve_uses_universal_lock feature flag
// 4. Inline acquire/release helpers simulate atomic semantics:
//    - fresh insert
//    - held-by-active refusal
//    - 24h stale takeover
//    - REFUSE-when-awaiting-review safety
//    - idempotent release by holder run_id
//
// Capability: update v1.0 Sprint 1
// Acceptance criteria targeted: A21, A24 (partial), A31, R3

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00039_universal_entity_edit_lock.sql");
const EVOLVE_CMD = join(REPO, ".claude", "commands", "evolve.md");
const FEATURE_FLAGS = join(REPO, "knowledge", "feature-flags.yaml");
const PROPOSE_SKILL = join(REPO, "06-ai-ops", "skills", "eval-evo", "propose-improvement", "SKILL.md");
const INVARIANTS = join(REPO, "knowledge", "cross-tier-invariants.yaml");

const migrationText = readFileSync(MIGRATION, "utf8");
const evolveCmdText = readFileSync(EVOLVE_CMD, "utf8");
const featureFlagsText = readFileSync(FEATURE_FLAGS, "utf8");
const proposeSkillText = readFileSync(PROPOSE_SKILL, "utf8");
const invariantsText = readFileSync(INVARIANTS, "utf8");

describe("Migration 00039 — universal entity-edit lock structure", () => {
  it("creates ops.entity_edit_locks table with PK on (entity_type, entity_name)", () => {
    expect(migrationText).toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+ops\.entity_edit_locks/);
    expect(migrationText).toMatch(/PRIMARY KEY\s*\(entity_type,\s*entity_name\)/);
  });

  it("constrains entity_type to {skill, command, agent, sop, capability}", () => {
    expect(migrationText).toMatch(/entity_type[\s\S]{0,200}CHECK[\s\S]{0,200}'skill'[\s\S]{0,200}'command'[\s\S]{0,200}'agent'[\s\S]{0,200}'sop'[\s\S]{0,200}'capability'/);
  });

  it("constrains holder_kind to known writers (update/evolve/cla_*/manual_edit)", () => {
    expect(migrationText).toMatch(/holder_kind[\s\S]{0,200}CHECK[\s\S]{0,400}'update'[\s\S]{0,400}'evolve'[\s\S]{0,400}'cla_extend'/);
    expect(migrationText).toMatch(/'manual_edit'/);
  });

  it("indexes holder_run_id (for foreign-key-like reverse lookup)", () => {
    expect(migrationText).toMatch(/CREATE INDEX\s+IF NOT EXISTS\s+idx_entity_edit_locks_holder_run/);
  });

  it("creates acquire_entity_edit_lock function returning JSONB", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION\s+ops\.acquire_entity_edit_lock/);
    expect(migrationText).toMatch(/RETURNS\s+JSONB/);
  });

  it("acquire function uses ON CONFLICT DO NOTHING for atomic fresh-insert", () => {
    expect(migrationText).toMatch(/INSERT INTO ops\.entity_edit_locks[\s\S]{0,400}ON CONFLICT[\s\S]{0,200}DO NOTHING/);
  });

  it("acquire function defends against missing state_payload via COALESCE (@cto NIT 2)", () => {
    expect(migrationText).toMatch(/COALESCE\s*\(\s*ar\.state_payload->>'phase'/);
  });

  it("acquire function refuses takeover when prior phase IN ('reviewing', 'awaiting_review')", () => {
    expect(migrationText).toMatch(/v_prior_phase IN\s*\(\s*'reviewing'\s*,\s*'awaiting_review'/);
  });

  it("acquire function returns 'prior_awaiting_review' reason on refuse path", () => {
    expect(migrationText).toMatch(/'reason'\s*,\s*'prior_awaiting_review'/);
  });

  it("acquire function uses 24h stale threshold", () => {
    expect(migrationText).toMatch(/interval\s+'24 hours'/);
  });

  it("creates release_entity_edit_lock function returning BOOLEAN", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION\s+ops\.release_entity_edit_lock/);
    expect(migrationText).toMatch(/RETURNS\s+BOOLEAN/);
  });

  it("release function uses GET DIAGNOSTICS ROW_COUNT for idempotent semantics", () => {
    expect(migrationText).toMatch(/GET DIAGNOSTICS\s+v_deleted\s*=\s*ROW_COUNT/);
  });

  it("enables RLS on the lock table", () => {
    expect(migrationText).toMatch(/ALTER TABLE\s+ops\.entity_edit_locks\s+ENABLE ROW LEVEL SECURITY/);
  });

  it("declares RLS policy for founder + cofounder full access", () => {
    expect(migrationText).toMatch(/CREATE POLICY\s+entity_edit_locks_founder_all[\s\S]{0,400}'founder'[\s\S]{0,200}'cofounder'/);
  });

  it("declares RLS policy for entity-update + eval-evo writer roles", () => {
    expect(migrationText).toMatch(/CREATE POLICY\s+entity_edit_locks_writers_all[\s\S]{0,400}'entity-update-orchestrator'[\s\S]{0,200}'eval-evo-orchestrator'/);
  });

  it("declares RLS read policy for metrics-curator + code-reviewer", () => {
    expect(migrationText).toMatch(/CREATE POLICY\s+entity_edit_locks_readers[\s\S]{0,400}'code-reviewer'[\s\S]{0,200}'metrics-curator'/);
  });
});

describe("knowledge/feature-flags.yaml — evolve_uses_universal_lock", () => {
  it("declares the feature flag with enabled: false default (staged migration)", () => {
    expect(featureFlagsText).toMatch(/evolve_uses_universal_lock:[\s\S]{0,300}enabled:\s*false/);
  });

  it("documents the staged_migration steps (lock + refactor + flip)", () => {
    expect(featureFlagsText).toMatch(/staged_migration:[\s\S]{0,800}step_1[\s\S]{0,200}step_2[\s\S]{0,200}step_3/);
  });

  it("references @cto NIT 4 in the rationale", () => {
    expect(featureFlagsText).toMatch(/@cto NIT 4/);
  });

  it("documents the rollback path (flip flag back to false)", () => {
    expect(featureFlagsText).toMatch(/Rollback strategy: flip back to false/);
  });
});

describe(".claude/commands/evolve.md — feature-flag-staged concurrent-run check", () => {
  it("preserves the legacy WHERE agent_slug='evolve' SELECT branch", () => {
    expect(evolveCmdText).toMatch(/SELECT id FROM ops\.agent_runs[\s\S]{0,200}agent_slug\s*=\s*'evolve'/);
  });

  it("adds the new universal-lock acquire branch", () => {
    expect(evolveCmdText).toMatch(/ops\.acquire_entity_edit_lock/);
  });

  it("branches behavior on the evolve_uses_universal_lock feature flag", () => {
    expect(evolveCmdText).toMatch(/If\s+`evolve_uses_universal_lock=true`/);
    expect(evolveCmdText).toMatch(/If\s+`evolve_uses_universal_lock=false`/);
  });

  it("documents ConcurrentRunError surfaces holder context", () => {
    expect(evolveCmdText).toMatch(/result\.holder/);
  });

  it("releases the lock at Tier B completion (Phase C)", () => {
    expect(evolveCmdText).toMatch(/Lock release[\s\S]{0,200}ops\.release_entity_edit_lock/);
  });

  it("releases the lock at Tier C+ completion (Phase C)", () => {
    // Tier C+ should also release. Match the second mention after the Tier C+ heading.
    const tierCIdx = evolveCmdText.indexOf("**Tier C+:**");
    expect(tierCIdx).toBeGreaterThan(0);
    const afterTierC = evolveCmdText.slice(tierCIdx);
    expect(afterTierC).toMatch(/Lock release/);
  });

  it("releases the lock on error/abort paths", () => {
    expect(evolveCmdText).toMatch(/On error\/abort path[\s\S]{0,400}release_entity_edit_lock/);
  });
});

describe("06-ai-ops/skills/eval-evo/propose-improvement/SKILL.md — extractions_context input", () => {
  it("declares OPTIONAL extractions_context field in input contract", () => {
    expect(proposeSkillText).toMatch(/extractions_context.*OPTIONAL/);
  });

  it("documents null semantics for /evolve (unchanged behavior)", () => {
    // The SKILL.md may put '/evolve' before or after 'null'; accept either ordering.
    const aPattern = /null[\s\S]{0,300}\/evolve[\s\S]{0,300}unchanged/i;
    const bPattern = /\/evolve[\s\S]{0,300}null[\s\S]{0,300}unchanged/i;
    expect(aPattern.test(proposeSkillText) || bPattern.test(proposeSkillText)).toBe(true);
  });

  it("documents non-empty array semantics for /update", () => {
    expect(proposeSkillText).toMatch(/\/update[\s\S]{0,300}founder-accepted/);
  });

  it("requires citing extraction_id in rationale when extractions are applied", () => {
    expect(proposeSkillText).toMatch(/cite\s+extraction_id/);
  });
});

describe("knowledge/cross-tier-invariants.yaml — 3 new invariants", () => {
  it("declares entity-edit-locks-holder-run-references-valid (L2 live)", () => {
    expect(invariantsText).toMatch(/id:\s+entity-edit-locks-holder-run-references-valid[\s\S]{0,400}layer:\s+L2[\s\S]{0,200}status:\s+live/);
  });

  it("declares evolve-extractions-review-state-machine-valid (L1, live as of Sprint 2 migration)", () => {
    expect(invariantsText).toMatch(/id:\s+evolve-extractions-review-state-machine-valid[\s\S]{0,400}status:\s+live/);
  });

  it("declares entity-update-runs-role-attribution-correct (L2 live, vacuously true until first run)", () => {
    expect(invariantsText).toMatch(/id:\s+entity-update-runs-role-attribution-correct[\s\S]{0,400}layer:\s+L2[\s\S]{0,200}status:\s+live/);
  });
});

// ----------------------------------------------------------------------------
// Behavioral simulation — JS-side replica of the SQL acquire/release semantics
// for unit testing without a DB round-trip. Mirrors the COALESCE +
// awaiting_review refusal + 24h stale takeover logic in migration 00039.
// ----------------------------------------------------------------------------

interface LockRow {
  entity_type: string;
  entity_name: string;
  holder_kind: "update" | "evolve" | "cla_propose" | "cla_extend" | "cla_revise" | "cla_fix" | "cla_tune" | "cla_deprecate" | "manual_edit";
  holder_run_id: string | null;
  acquired_at: Date;
  session_id: string | null;
}

interface AgentRunRow {
  id: string;
  state_payload?: { phase?: string };
}

interface AcquireResult {
  acquired: boolean;
  method?: "fresh_insert" | "stale_takeover";
  reason?: "held_by_active_run" | "prior_awaiting_review";
  holder?: LockRow;
  prior_holder?: LockRow;
  prior_phase?: string;
  hint?: string;
}

function acquireEntityEditLock(
  locks: LockRow[],
  agentRuns: AgentRunRow[],
  p: { entity_type: string; entity_name: string; holder_kind: LockRow["holder_kind"]; holder_run_id: string; session_id: string },
  now: Date = new Date(),
): AcquireResult {
  const existing = locks.find((l) => l.entity_type === p.entity_type && l.entity_name === p.entity_name);

  // Fast path: fresh insert (no prior row).
  if (!existing) {
    locks.push({
      entity_type: p.entity_type,
      entity_name: p.entity_name,
      holder_kind: p.holder_kind,
      holder_run_id: p.holder_run_id,
      acquired_at: now,
      session_id: p.session_id,
    });
    return { acquired: true, method: "fresh_insert" };
  }

  const isStale = existing.acquired_at.getTime() < now.getTime() - 24 * 60 * 60 * 1000;
  if (!isStale) {
    return { acquired: false, reason: "held_by_active_run", holder: existing };
  }

  // Stale path: check prior holder's phase if /update or /evolve.
  let priorPhase: string | undefined;
  if (existing.holder_kind === "update" || existing.holder_kind === "evolve") {
    const run = agentRuns.find((r) => r.id === existing.holder_run_id);
    // COALESCE replicate: undefined / null → 'unknown'.
    priorPhase = run?.state_payload?.phase ?? "unknown";
    if (priorPhase === "reviewing" || priorPhase === "awaiting_review") {
      return {
        acquired: false,
        reason: "prior_awaiting_review",
        holder: existing,
        prior_phase: priorPhase,
        hint: "Use /update cancel or /update review on prior run before re-acquiring",
      };
    }
  }

  // Stale takeover OK.
  const priorSnapshot = { ...existing };
  existing.holder_kind = p.holder_kind;
  existing.holder_run_id = p.holder_run_id;
  existing.session_id = p.session_id;
  existing.acquired_at = now;
  return { acquired: true, method: "stale_takeover", prior_holder: priorSnapshot, prior_phase: priorPhase };
}

function releaseEntityEditLock(
  locks: LockRow[],
  p: { entity_type: string; entity_name: string; holder_run_id: string },
): boolean {
  const idx = locks.findIndex((l) => l.entity_type === p.entity_type && l.entity_name === p.entity_name && l.holder_run_id === p.holder_run_id);
  if (idx === -1) return false;
  locks.splice(idx, 1);
  return true;
}

describe("acquireEntityEditLock — behavioral simulation", () => {
  it("fresh insert when no prior row exists", () => {
    const locks: LockRow[] = [];
    const result = acquireEntityEditLock(locks, [], {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      session_id: "sess-1",
    });
    expect(result.acquired).toBe(true);
    expect(result.method).toBe("fresh_insert");
    expect(locks.length).toBe(1);
  });

  it("refuses when held by active run (< 24h old)", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      acquired_at: oneHourAgo,
      session_id: "sess-1",
    }];
    const result = acquireEntityEditLock(locks, [], {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(false);
    expect(result.reason).toBe("held_by_active_run");
    expect(result.holder?.holder_run_id).toBe("run-1");
  });

  it("stale takeover when prior > 24h old and prior_phase is benign", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const longAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      acquired_at: longAgo,
      session_id: "sess-1",
    }];
    const agentRuns: AgentRunRow[] = [{ id: "run-1", state_payload: { phase: "running" } }];
    const result = acquireEntityEditLock(locks, agentRuns, {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(true);
    expect(result.method).toBe("stale_takeover");
    expect(result.prior_holder?.holder_run_id).toBe("run-1");
    expect(locks[0].holder_run_id).toBe("run-2");
  });

  it("REFUSES stale takeover when prior_phase is 'awaiting_review' (A21 / R3)", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const longAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-1",
      acquired_at: longAgo,
      session_id: "sess-1",
    }];
    const agentRuns: AgentRunRow[] = [{ id: "run-1", state_payload: { phase: "awaiting_review" } }];
    const result = acquireEntityEditLock(locks, agentRuns, {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(false);
    expect(result.reason).toBe("prior_awaiting_review");
    expect(result.prior_phase).toBe("awaiting_review");
    expect(result.hint).toMatch(/cancel|review/);
    // Lock not mutated by failed acquire.
    expect(locks[0].holder_run_id).toBe("run-1");
  });

  it("REFUSES stale takeover when prior_phase is 'reviewing' (A21 / R3)", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const longAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-1",
      acquired_at: longAgo,
      session_id: "sess-1",
    }];
    const agentRuns: AgentRunRow[] = [{ id: "run-1", state_payload: { phase: "reviewing" } }];
    const result = acquireEntityEditLock(locks, agentRuns, {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(false);
    expect(result.reason).toBe("prior_awaiting_review");
  });

  it("COALESCE replicate: stale takeover proceeds when state_payload is missing (defensive default)", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const longAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      acquired_at: longAgo,
      session_id: "sess-1",
    }];
    // Agent run exists but state_payload is empty → defensive COALESCE → 'unknown' → not awaiting_review → proceed.
    const agentRuns: AgentRunRow[] = [{ id: "run-1", state_payload: {} }];
    const result = acquireEntityEditLock(locks, agentRuns, {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(true);
    expect(result.method).toBe("stale_takeover");
    expect(result.prior_phase).toBe("unknown");
  });

  it("manual_edit holder skips the awaiting_review safety check (only update/evolve are checked)", () => {
    const now = new Date("2026-05-26T12:00:00Z");
    const longAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "manual_edit",
      holder_run_id: null,
      acquired_at: longAgo,
      session_id: "sess-1",
    }];
    const result = acquireEntityEditLock(locks, [], {
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "update",
      holder_run_id: "run-2",
      session_id: "sess-2",
    }, now);
    expect(result.acquired).toBe(true);
    expect(result.method).toBe("stale_takeover");
  });
});

describe("releaseEntityEditLock — behavioral simulation", () => {
  it("returns true and removes the lock when holder_run_id matches", () => {
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      acquired_at: new Date(),
      session_id: "sess-1",
    }];
    const result = releaseEntityEditLock(locks, { entity_type: "skill", entity_name: "test/foo", holder_run_id: "run-1" });
    expect(result).toBe(true);
    expect(locks.length).toBe(0);
  });

  it("idempotent: returns false when no matching row (already released or never existed)", () => {
    const locks: LockRow[] = [];
    const result = releaseEntityEditLock(locks, { entity_type: "skill", entity_name: "test/foo", holder_run_id: "run-1" });
    expect(result).toBe(false);
  });

  it("refuses release by wrong holder_run_id (lock remains intact)", () => {
    const locks: LockRow[] = [{
      entity_type: "skill",
      entity_name: "test/foo",
      holder_kind: "evolve",
      holder_run_id: "run-1",
      acquired_at: new Date(),
      session_id: "sess-1",
    }];
    const result = releaseEntityEditLock(locks, { entity_type: "skill", entity_name: "test/foo", holder_run_id: "run-WRONG" });
    expect(result).toBe(false);
    expect(locks.length).toBe(1);
    expect(locks[0].holder_run_id).toBe("run-1");
  });

  it("scopes by (entity_type, entity_name) — releasing one entity doesn't affect another", () => {
    const locks: LockRow[] = [
      { entity_type: "skill", entity_name: "test/foo", holder_kind: "evolve", holder_run_id: "run-1", acquired_at: new Date(), session_id: "sess-1" },
      { entity_type: "command", entity_name: "test/foo", holder_kind: "evolve", holder_run_id: "run-1", acquired_at: new Date(), session_id: "sess-1" },
    ];
    const result = releaseEntityEditLock(locks, { entity_type: "skill", entity_name: "test/foo", holder_run_id: "run-1" });
    expect(result).toBe(true);
    expect(locks.length).toBe(1);
    expect(locks[0].entity_type).toBe("command");
  });
});
