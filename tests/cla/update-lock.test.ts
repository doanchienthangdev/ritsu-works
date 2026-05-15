// Update lock semantics — migration 00025 contract test + behavioral simulation.
//
// Tests:
// 1. Migration 00025 SQL declares the lock columns + helper functions
// 2. capability_runs schema has lock-pair CHECK constraint
// 3. Inline acquireLock() helper simulates the atomic UPDATE semantics
// 4. 24h auto-expiry behavior

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00025_capability_update_lock.sql");
const CMD = join(REPO, ".claude", "commands", "cla.md");
const SPEC = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "catalog-updater", "SKILL.md");

const migrationText = readFileSync(MIGRATION, "utf8");
const cmdText = readFileSync(CMD, "utf8");
const catalogText = readFileSync(SPEC, "utf8");

describe("Migration 00025 — lock columns + helper functions", () => {
  it("adds update_lock_session_id column", () => {
    expect(migrationText).toMatch(/ADD COLUMN\s+update_lock_session_id/);
  });

  it("adds update_lock_acquired_at column", () => {
    expect(migrationText).toMatch(/ADD COLUMN\s+update_lock_acquired_at/);
  });

  it("adds version column with semver default '1.0.0'", () => {
    expect(migrationText).toMatch(/ADD COLUMN\s+version[\s\S]{0,200}DEFAULT\s+'1\.0\.0'/);
  });

  it("adds CHECK constraint enforcing lock-pair atomicity", () => {
    expect(migrationText).toMatch(/CHECK\s*\([\s\S]{0,400}update_lock_session_id IS NULL[\s\S]{0,200}update_lock_acquired_at IS NULL/);
  });

  it("adds CHECK constraint validating semver format", () => {
    expect(migrationText).toMatch(/CHECK\s*\([\s\S]{0,200}version\s*~/);
  });

  it("adds partial index on locked rows (NOT NULL)", () => {
    expect(migrationText).toMatch(/CREATE INDEX[\s\S]{0,200}idx_capability_runs_update_lock[\s\S]{0,200}WHERE update_lock_session_id IS NOT NULL/);
  });

  it("creates capability_acquire_update_lock function (atomic)", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION[\s\S]{0,200}capability_acquire_update_lock/);
    expect(migrationText).toMatch(/RETURNS uuid/);
    // Uses the magic atomic UPDATE pattern.
    expect(migrationText).toMatch(/UPDATE ops\.capability_runs[\s\S]{0,400}WHERE[\s\S]{0,200}update_lock_session_id IS NULL/);
  });

  it("creates capability_release_update_lock function", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION[\s\S]{0,200}capability_release_update_lock/);
    expect(migrationText).toMatch(/RETURNS boolean/);
  });

  it("acquire helper enforces 24h auto-expiry on read", () => {
    expect(migrationText).toMatch(/interval '24 hours'/);
  });

  it("creates v_capability_lineage view (recursive supersedes_id chain)", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE VIEW[\s\S]{0,200}v_capability_lineage/);
    expect(migrationText).toMatch(/WITH RECURSIVE chain/);
    expect(migrationText).toMatch(/UNION ALL/);
  });
});

// --------------------------------------------------------------------------
// Behavioral simulation — acquireLock semantics in pure JS
// --------------------------------------------------------------------------

interface LockRow {
  id: string;
  capability_id: string;
  state: string;
  update_lock_session_id: string | null;
  update_lock_acquired_at: Date | null;
}

function acquireLock(rows: LockRow[], capability_id: string, session_id: string, now: Date = new Date()): string | null {
  const expiry = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  for (const row of rows) {
    if (row.capability_id !== capability_id) continue;
    if (row.state !== "operating" && row.state !== "deployed") continue;
    const isUnlocked = row.update_lock_session_id === null;
    const isExpired = row.update_lock_acquired_at !== null && row.update_lock_acquired_at < expiry;
    if (isUnlocked || isExpired) {
      row.update_lock_session_id = session_id;
      row.update_lock_acquired_at = now;
      return row.id;
    }
  }
  return null; // already locked by live session
}

function releaseLock(rows: LockRow[], capability_id: string, session_id: string): boolean {
  for (const row of rows) {
    if (row.capability_id !== capability_id) continue;
    if (row.update_lock_session_id !== session_id) continue;
    row.update_lock_session_id = null;
    row.update_lock_acquired_at = null;
    return true;
  }
  return false;
}

describe("Lock acquire/release behavioral simulation", () => {
  let rows: LockRow[];

  beforeEach(() => {
    rows = [
      {
        id: "row-1",
        capability_id: "lead-acquisition",
        state: "operating",
        update_lock_session_id: null,
        update_lock_acquired_at: null,
      },
    ];
  });

  it("acquire succeeds on unlocked operating capability", () => {
    const result = acquireLock(rows, "lead-acquisition", "session-A");
    expect(result).toBe("row-1");
    expect(rows[0].update_lock_session_id).toBe("session-A");
    expect(rows[0].update_lock_acquired_at).not.toBeNull();
  });

  it("second acquire on same capability returns null (lock held)", () => {
    acquireLock(rows, "lead-acquisition", "session-A");
    const result = acquireLock(rows, "lead-acquisition", "session-B");
    expect(result).toBeNull();
    // Original lock holder unchanged
    expect(rows[0].update_lock_session_id).toBe("session-A");
  });

  it("acquire returns null when capability not in operating/deployed state", () => {
    rows[0].state = "implementing";
    const result = acquireLock(rows, "lead-acquisition", "session-A");
    expect(result).toBeNull();
  });

  it("expired lock (>24h old) is auto-released on next acquire", () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    rows[0].update_lock_session_id = "old-session";
    rows[0].update_lock_acquired_at = oldDate;

    const result = acquireLock(rows, "lead-acquisition", "session-B");
    expect(result).toBe("row-1");
    expect(rows[0].update_lock_session_id).toBe("session-B");
  });

  it("release succeeds when called by lock owner", () => {
    acquireLock(rows, "lead-acquisition", "session-A");
    const released = releaseLock(rows, "lead-acquisition", "session-A");
    expect(released).toBe(true);
    expect(rows[0].update_lock_session_id).toBeNull();
  });

  it("release returns false when called by non-owner", () => {
    acquireLock(rows, "lead-acquisition", "session-A");
    const released = releaseLock(rows, "lead-acquisition", "session-B");
    expect(released).toBe(false);
    // Original lock unchanged
    expect(rows[0].update_lock_session_id).toBe("session-A");
  });

  it("release returns false when no lock held", () => {
    const released = releaseLock(rows, "lead-acquisition", "session-A");
    expect(released).toBe(false);
  });
});

describe("/cla command — lock semantics in command spec", () => {
  it("Phase 0 documentation describes lock acquisition", () => {
    expect(cmdText).toMatch(/(Lock acquire|capability_acquire_update_lock|update_lock_session_id)/);
  });

  it("documents /cla force-unlock as Tier D-Std", () => {
    expect(cmdText).toMatch(/force-unlock/);
    expect(cmdText).toMatch(/D-Std/);
  });

  it("catalog-updater documents lock release timing (after state transition, before final pnpm check)", () => {
    expect(catalogText).toMatch(/(Release lock|capability_release_update_lock)/);
  });
});

// vitest fn import (above acquireLock simulation needs beforeEach)
import { beforeEach } from "vitest";
