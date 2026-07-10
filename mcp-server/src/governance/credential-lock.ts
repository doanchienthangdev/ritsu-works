/**
 * Cross-process lock over the per-human credential file (capability multi-user-auth).
 *
 * WHY THIS EXISTS. Supabase rotates refresh tokens on use: each refresh returns a new
 * token and revokes the old one outside a 10-second reuse window. Reuse *outside* that
 * window is treated as theft — Supabase then "regards the whole session as terminated
 * and marks all refresh tokens belonging to it as revoked."
 *
 * `.mcp.json` spawns one supabase-ops per Claude Code session, and every session points
 * at the SAME credential file. Before this module, each instance refreshed at boot AND
 * kept `autoRefreshToken: true`, so each held its own in-memory refresh token and rotated
 * it hourly. Two concurrent sessions were therefore enough to make one of them present a
 * token the other had already rotated — permanently killing the session for everyone.
 * That is exactly what happened on 2026-07-03 and went unnoticed for seven days.
 *
 * THE CONTRACT. Exactly one process — the LOCK HOLDER, the "leader" — ever calls refresh.
 * Everyone else is a follower: it reads the access token the leader persisted and never
 * touches the refresh token. `operator-credential.ts`'s own header already named this
 * ("concurrent sessions racing on the same file is a known limitation"); this closes it.
 *
 * STALENESS. A leader can die without releasing (SIGKILL, laptop sleep). The lock carries
 * a heartbeat timestamp; any process may steal a lock whose heartbeat is older than
 * `staleMs`. Two processes could in principle steal at the same instant and both refresh —
 * that is SAFE, because simultaneous refreshes land inside Supabase's 10s reuse interval
 * and return the same session. The danger is only refreshes *far apart* in time, which the
 * lock does prevent.
 *
 * Escape hatch: `RITSU_CREDENTIAL_LOCK=off` restores the old lock-free behaviour, in case
 * this module misbehaves on a machine we cannot reach.
 */

import { writeFileSync, readFileSync, unlinkSync, utimesSync, statSync, renameSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";

/** Heartbeat cadence. Must be comfortably below `staleMs`. */
export const HEARTBEAT_MS = 30_000;
/** A lock whose heartbeat is older than this may be stolen. */
export const DEFAULT_STALE_MS = 120_000;

export interface LockHandle {
  readonly lockPath: string;
  readonly stolen: boolean;
  /** Do we still own the lock on disk? False once someone has stolen it from us. */
  isOwned(): boolean;
  /**
   * Refresh the heartbeat. Returns FALSE when the lock is no longer ours — a stolen-from
   * leader must learn this, because it is still holding an auto-refreshing session and is
   * one tick away from rotating the shared refresh token concurrently with the new leader.
   * Blindly touching a lock we do not own also keeps the NEW owner's lock artificially
   * alive, which is how a zombie starves everyone.
   */
  touch(): boolean;
  /** Idempotent. Only removes the lock if this process still owns it. */
  release(): void;
}

interface LockPayload {
  pid: number;
  host: string;
  acquired_at: string;
}

const lockPathFor = (credentialPath: string) => `${credentialPath}.lock`;

/** Heartbeat age in ms, or Infinity when the lock file is unreadable/absent. */
function heartbeatAgeMs(lockPath: string, nowMs: number): number {
  try {
    return nowMs - statSync(lockPath).mtimeMs;
  } catch {
    return Infinity;
  }
}

function ownedByUs(lockPath: string): boolean {
  try {
    const p = JSON.parse(readFileSync(lockPath, "utf8")) as Partial<LockPayload>;
    return p.pid === process.pid && p.host === hostname();
  } catch {
    return false;
  }
}

function create(lockPath: string, stolen: boolean): LockHandle {
  const payload: LockPayload = { pid: process.pid, host: hostname(), acquired_at: new Date().toISOString() };
  // `wx` = O_CREAT|O_EXCL: fails if another process won the race.
  writeFileSync(lockPath, JSON.stringify(payload) + "\n", { mode: 0o600, flag: "wx" });

  let released = false;
  const handle: LockHandle = {
    lockPath,
    stolen,
    isOwned() {
      return !released && ownedByUs(lockPath);
    },
    touch() {
      if (released) return false;
      // Ownership guard: without it a stolen-from leader keeps bumping the mtime of the
      // NEW owner's lock file, so that lock never looks stale and nobody can ever recover.
      if (!ownedByUs(lockPath)) return false;
      try {
        const now = new Date();
        utimesSync(lockPath, now, now);
        return true;
      } catch {
        // best-effort: a failed touch only risks being stolen, never corruption
        return true;
      }
    },
    release() {
      if (released) return;
      released = true;
      // Never unlink a lock some other process now owns (we may have been stolen from).
      if (ownedByUs(lockPath)) {
        try {
          unlinkSync(lockPath);
        } catch {
          /* already gone */
        }
      }
    },
  };
  return handle;
}

/**
 * Non-blocking. Returns a handle if this process is the leader, or `null` if another
 * live process holds the lock. Steals a lock whose heartbeat exceeds `staleMs`.
 *
 * `nowMs` is injectable so tests need no wall clock.
 */
export function tryAcquireCredentialLock(
  credentialPath: string,
  opts: { staleMs?: number; nowMs?: number } = {},
): LockHandle | null {
  if ((process.env.RITSU_CREDENTIAL_LOCK ?? "").trim() === "off") {
    // Escape hatch: pretend we always lead. Restores pre-fix behaviour exactly.
    return { lockPath: "", stolen: false, isOwned: () => true, touch: () => true, release() {} };
  }

  const lockPath = lockPathFor(credentialPath);
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const nowMs = opts.nowMs ?? Date.now();

  try {
    return create(lockPath, false);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }

  // Someone holds it. Alive?
  if (heartbeatAgeMs(lockPath, nowMs) <= staleMs) return null;

  // Stale → steal.
  //
  // The obvious `unlinkSync` + `create(...,'wx')` is a TOCTOU: thief B's unlink can delete
  // the fresh lock thief A just created under O_EXCL, and then B's own create succeeds too.
  // Both processes come away believing they lead, which is precisely the two-refreshers
  // state that revokes the session. The naked unlink defeats the exclusivity `wx` provides.
  //
  // `rename` is the exclusive primitive: exactly one process can rename an existing path
  // away. The loser gets ENOENT and yields. Only the winner then races for the fresh lock.
  const tomb = `${lockPath}.dead.${randomBytes(4).toString("hex")}`;
  try {
    renameSync(lockPath, tomb);
  } catch {
    // A peer stole it first (ENOENT), or it vanished. Either way we are not the thief.
    return null;
  }
  try {
    unlinkSync(tomb);
  } catch {
    /* leftover tombstone is inert */
  }
  try {
    return create(lockPath, true);
  } catch {
    // A brand-new process (not a thief) took the now-free lock. Fine — one leader.
    return null;
  }
}

/**
 * Start a heartbeat for a held lock. The timer is `unref`'d so it never keeps the process
 * alive, and the returned stopper is idempotent.
 *
 * `onLost` fires the moment the lock is no longer ours — we lapsed (laptop sleep, a blocked
 * event loop) and were legitimately stolen from. The caller MUST stop refreshing when this
 * fires: a stolen-from leader that keeps its auto-refresh ticker running is a second,
 * unsanctioned refresher, which is exactly what revokes the whole session.
 */
export function startHeartbeat(
  handle: LockHandle,
  everyMs: number = HEARTBEAT_MS,
  onLost?: () => void,
): () => void {
  const t = setInterval(() => {
    if (!handle.touch()) {
      clearInterval(t);
      onLost?.();
    }
  }, everyMs);
  t.unref?.();
  return () => clearInterval(t);
}
