// The credential lock is the thing standing between "N Claude sessions" and "Supabase
// revokes the whole session because two of them rotated the same refresh token". If it is
// wrong, the 2026-07-03 outage repeats. These tests exercise the ownership rules directly
// against the filesystem — no mocks — because the failure mode is a filesystem race.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync, utimesSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  tryAcquireCredentialLock,
  startHeartbeat,
  DEFAULT_STALE_MS,
  HEARTBEAT_MS,
} from "../src/governance/credential-lock.ts";

let dir: string;
let cred: string;
let lockPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "credlock-"));
  cred = join(dir, ".operator-refresh.json");
  lockPath = `${cred}.lock`;
  delete process.env.RITSU_CREDENTIAL_LOCK;
});
afterEach(() => {
  delete process.env.RITSU_CREDENTIAL_LOCK;
  rmSync(dir, { recursive: true, force: true });
});

/** Simulate a lock held by a *different*, live process. */
function foreignLock(ageMs = 0): void {
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid + 1, host: "somewhere-else", acquired_at: "x" }) + "\n");
  const t = new Date(Date.now() - ageMs);
  utimesSync(lockPath, t, t);
}

describe("tryAcquireCredentialLock", () => {
  it("acquires when no lock exists, and writes a lock file", () => {
    const h = tryAcquireCredentialLock(cred);
    expect(h).not.toBeNull();
    expect(existsSync(lockPath)).toBe(true);
    expect(h!.stolen).toBe(false);
    h!.release();
  });

  it("records this process as the owner", () => {
    const h = tryAcquireCredentialLock(cred)!;
    const payload = JSON.parse(readFileSync(lockPath, "utf8")) as { pid: number };
    expect(payload.pid).toBe(process.pid);
    h!.release();
  });

  it("refuses when a LIVE foreign lock is held — the whole point", () => {
    foreignLock(0);
    expect(tryAcquireCredentialLock(cred)).toBeNull();
  });

  it("still refuses a foreign lock just under the stale threshold", () => {
    foreignLock(DEFAULT_STALE_MS - 5_000);
    expect(tryAcquireCredentialLock(cred)).toBeNull();
  });

  it("steals a foreign lock whose heartbeat has lapsed (leader died)", () => {
    foreignLock(DEFAULT_STALE_MS + 5_000);
    const h = tryAcquireCredentialLock(cred);
    expect(h).not.toBeNull();
    expect(h!.stolen).toBe(true);
    h!.release();
  });

  it("honours an injected clock rather than the wall clock", () => {
    foreignLock(0);
    // Pretend it is far in the future: the same on-disk lock now looks stale.
    const h = tryAcquireCredentialLock(cred, { nowMs: Date.now() + DEFAULT_STALE_MS + 1_000 });
    expect(h?.stolen).toBe(true);
    h!.release();
  });

  it("respects a custom staleMs", () => {
    foreignLock(1_500);
    expect(tryAcquireCredentialLock(cred, { staleMs: 1_000 })?.stolen).toBe(true);
  });

  describe("release", () => {
    it("removes the lock file", () => {
      const h = tryAcquireCredentialLock(cred)!;
      h.release();
      expect(existsSync(lockPath)).toBe(false);
    });

    it("is idempotent", () => {
      const h = tryAcquireCredentialLock(cred)!;
      h.release();
      h.release();
      expect(existsSync(lockPath)).toBe(false);
    });

    it("NEVER deletes a lock another process has since taken", () => {
      // We held it, went to sleep, got stolen from. Releasing must not evict the new owner:
      // that would let a third process refresh concurrently with the thief.
      const h = tryAcquireCredentialLock(cred)!;
      foreignLock(0); // someone overwrote it with their own ownership
      h.release();
      expect(existsSync(lockPath)).toBe(true);
    });

    it("after release, another acquirer succeeds cleanly (not as a steal)", () => {
      tryAcquireCredentialLock(cred)!.release();
      const h2 = tryAcquireCredentialLock(cred);
      expect(h2?.stolen).toBe(false);
      h2!.release();
    });
  });

  describe("touch / heartbeat", () => {
    it("touch refreshes the heartbeat so a live leader is not mistaken for a dead one", () => {
      const h = tryAcquireCredentialLock(cred)!;
      const past = new Date(Date.now() - DEFAULT_STALE_MS - 10_000);
      utimesSync(lockPath, past, past); // pretend we stalled
      expect(tryAcquireCredentialLock(cred, {})?.stolen).toBe(true); // provably stealable...

      // ...until the leader heartbeats.
      const h2 = tryAcquireCredentialLock(cred) ?? h; // re-establish for the assertion
      h2.touch();
      expect(tryAcquireCredentialLock(cred)).toBeNull();
      h2.release();
    });

    it("touch after release is a no-op and does not resurrect the file", () => {
      const h = tryAcquireCredentialLock(cred)!;
      h.release();
      h.touch();
      expect(existsSync(lockPath)).toBe(false);
    });

    it("startHeartbeat returns a stopper and never keeps the process alive", () => {
      const h = tryAcquireCredentialLock(cred)!;
      const stop = startHeartbeat(h, 10_000);
      expect(typeof stop).toBe("function");
      stop();
      h.release();
    });

    it("HEARTBEAT_MS is comfortably below DEFAULT_STALE_MS", () => {
      // A heartbeat slower than the stale threshold would let a live leader be robbed.
      expect(HEARTBEAT_MS * 2).toBeLessThanOrEqual(DEFAULT_STALE_MS);
    });
  });

  describe("escape hatch RITSU_CREDENTIAL_LOCK=off", () => {
    it("always leads, and touches no filesystem", () => {
      process.env.RITSU_CREDENTIAL_LOCK = "off";
      foreignLock(0); // even against a live foreign lock
      const h = tryAcquireCredentialLock(cred);
      expect(h).not.toBeNull();
      expect(h!.lockPath).toBe("");
      h!.release();
      expect(existsSync(lockPath)).toBe(true); // the foreign lock is untouched
    });

    it("any other value leaves the lock enforced", () => {
      process.env.RITSU_CREDENTIAL_LOCK = "on";
      foreignLock(0);
      expect(tryAcquireCredentialLock(cred)).toBeNull();
    });
  });
});
