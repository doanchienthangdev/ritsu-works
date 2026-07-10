// Ownership rules for the credential lock, added after an adversarial review of PR #327
// found two ways the first draft reopened the very outage it was written to close.
//
//  P1 — the steal path did `unlinkSync` then `create(…, "wx")`. Thief B's unlink can delete
//       the fresh lock thief A just created under O_EXCL, after which B's own create also
//       succeeds. Two leaders. `rename` is now the exclusive step: exactly one process can
//       rename an existing path away; the loser gets ENOENT and yields.
//
//  P2 — `touch()` bumped the mtime with no ownership check, so a stolen-from leader kept
//       the NEW owner's lock artificially alive, and nobody could ever recover from it.
//
// The heartbeat now reports loss instead of beating blindly, which is what lets a lapsed
// leader stop refreshing before it becomes a second, unsanctioned refresher.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, writeFileSync, utimesSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const renameSpy = vi.hoisted(() => ({ fail: false }));

vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  return {
    ...real,
    default: real,
    renameSync: (from: string, to: string) => {
      if (renameSpy.fail) {
        const e = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
        e.code = "ENOENT";
        throw e;
      }
      return real.renameSync(from, to);
    },
  };
});

const { tryAcquireCredentialLock, startHeartbeat, DEFAULT_STALE_MS } = await import(
  "../src/governance/credential-lock.ts"
);

let dir: string;
let cred: string;
let lockPath: string;

beforeEach(() => {
  renameSpy.fail = false;
  dir = mkdtempSync(join(tmpdir(), "lockown-"));
  cred = join(dir, ".operator-refresh.json");
  lockPath = `${cred}.lock`;
  delete process.env.RITSU_CREDENTIAL_LOCK;
});
afterEach(() => {
  delete process.env.RITSU_CREDENTIAL_LOCK;
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** A lock held by another pid, aged `ageMs` past its last heartbeat. */
function foreignLock(ageMs = 0): void {
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid + 1, host: "elsewhere", acquired_at: "x" }) + "\n");
  const t = new Date(Date.now() - ageMs);
  utimesSync(lockPath, t, t);
}
const STALE = () => foreignLock(DEFAULT_STALE_MS + 5_000);

describe("isOwned", () => {
  it("is true for a lock we just took", () => {
    const h = tryAcquireCredentialLock(cred)!;
    expect(h.isOwned()).toBe(true);
    h.release();
  });

  it("goes false the moment someone overwrites the lock with their own ownership", () => {
    const h = tryAcquireCredentialLock(cred)!;
    foreignLock(0); // a thief took it while we lapsed
    expect(h.isOwned()).toBe(false);
    h.release();
  });

  it("is false after our own release", () => {
    const h = tryAcquireCredentialLock(cred)!;
    h.release();
    expect(h.isOwned()).toBe(false);
  });

  it("is false when the lock file vanished entirely", () => {
    const h = tryAcquireCredentialLock(cred)!;
    rmSync(lockPath);
    expect(h.isOwned()).toBe(false);
  });
});

describe("touch — the ownership guard", () => {
  it("returns true and advances the mtime while we own the lock", () => {
    const h = tryAcquireCredentialLock(cred)!;
    const before = statSync(lockPath).mtimeMs;
    const past = new Date(Date.now() - 10_000);
    utimesSync(lockPath, past, past);
    expect(h.touch()).toBe(true);
    expect(statSync(lockPath).mtimeMs).toBeGreaterThan(before - 10_001);
    h.release();
  });

  it("returns FALSE once the lock is someone else's", () => {
    const h = tryAcquireCredentialLock(cred)!;
    foreignLock(0);
    expect(h.touch()).toBe(false);
    h.release();
  });

  it("does NOT bump the new owner's mtime — a zombie must not keep a live lock alive", () => {
    const h = tryAcquireCredentialLock(cred)!;
    foreignLock(DEFAULT_STALE_MS + 1_000); // new owner, already looking stale
    const before = statSync(lockPath).mtimeMs;
    h.touch();
    expect(statSync(lockPath).mtimeMs).toBe(before);
    // ...so a third process can still rescue the situation.
    const rescuer = tryAcquireCredentialLock(cred);
    expect(rescuer?.stolen).toBe(true);
    rescuer!.release();
  });

  it("returns false after release", () => {
    const h = tryAcquireCredentialLock(cred)!;
    h.release();
    expect(h.touch()).toBe(false);
  });
});

describe("startHeartbeat — reporting loss", () => {
  it("calls onLost and stops beating once the lock is taken from us", async () => {
    const h = tryAcquireCredentialLock(cred)!;
    const onLost = vi.fn();
    startHeartbeat(h, 5, onLost);
    foreignLock(0); // stolen
    await new Promise((r) => setTimeout(r, 40));
    expect(onLost).toHaveBeenCalled();
    const callsAfterLoss = onLost.mock.calls.length;
    await new Promise((r) => setTimeout(r, 40));
    expect(onLost.mock.calls.length).toBe(callsAfterLoss); // interval cleared, fires once
    h.release();
  });

  it("does not call onLost while the lock stays ours", async () => {
    const h = tryAcquireCredentialLock(cred)!;
    const onLost = vi.fn();
    const stop = startHeartbeat(h, 5, onLost);
    await new Promise((r) => setTimeout(r, 40));
    expect(onLost).not.toHaveBeenCalled();
    stop();
    h.release();
  });
});

describe("steal — rename is the exclusive step (the TOCTOU fix)", () => {
  it("a thief that loses the rename yields instead of double-leading", () => {
    STALE();
    renameSpy.fail = true; // a peer renamed it away first → our rename gets ENOENT
    expect(tryAcquireCredentialLock(cred)).toBeNull();
  });

  it("the loser leaves the winner's lock untouched", () => {
    STALE();
    const winner = JSON.parse(require("node:fs").readFileSync(lockPath, "utf8")) as { pid: number };
    renameSpy.fail = true;
    tryAcquireCredentialLock(cred);
    const after = JSON.parse(require("node:fs").readFileSync(lockPath, "utf8")) as { pid: number };
    expect(after.pid).toBe(winner.pid);
  });

  it("the winner takes the lock and leaves no tombstone behind", () => {
    STALE();
    const h = tryAcquireCredentialLock(cred);
    expect(h?.stolen).toBe(true);
    expect(readdirSync(dir).filter((f) => f.includes(".dead."))).toEqual([]);
    h!.release();
  });

  it("repeated steal attempts against one stale lock yield exactly one leader", () => {
    STALE();
    const handles = [tryAcquireCredentialLock(cred), tryAcquireCredentialLock(cred), tryAcquireCredentialLock(cred)];
    expect(handles.filter(Boolean)).toHaveLength(1);
    handles.forEach((h) => h?.release());
  });

  it("a fresh foreign lock is never stolen, rename or not", () => {
    foreignLock(0);
    expect(tryAcquireCredentialLock(cred)).toBeNull();
    expect(existsSync(lockPath)).toBe(true);
  });
});
