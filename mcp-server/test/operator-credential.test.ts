// All-Edge tests for the refresh-token persistence (Sprint 2 part 1.5).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readRefreshToken, persistRefreshToken, readAccessToken } from "../src/governance/operator-credential.ts";
import type { ServerEnv } from "../src/lib/env.ts";

const env = (over: Partial<ServerEnv>): ServerEnv => ({
  url: "https://mntobbmieuoaxipnjaau.supabase.co", projectRef: "mntobbmieuoaxipnjaau",
  serviceKey: null, anonKey: "anon", callerRole: "founder", callerSessionId: "s", repoRoot: "/tmp",
  authMode: "per-human", perHumanAccessToken: null, perHumanRefreshToken: null, perHumanRefreshTokenFile: null,
  ...over,
});

describe("operator-credential", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "mua-cred-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  describe("persistRefreshToken + readRefreshToken round-trip", () => {
    it("persisted token is read back from the file", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "REFRESH-2", "2026-06-25T00:00:00Z");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f }))).toBe("REFRESH-2");
    });
    it("a rotated token overwrites the prior one (atomic)", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "R-1", "t1");
      persistRefreshToken(f, "R-2", "t2");
      persistRefreshToken(f, "R-3", "t3");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f }))).toBe("R-3");
      expect(JSON.parse(readFileSync(f, "utf8")).updated_at).toBe("t3");
      expect(existsSync(`${f}.tmp`)).toBe(false); // temp cleaned up by rename
    });
  });

  describe("readRefreshToken source precedence (file is source of truth; inline seeds)", () => {
    it("file present → file token wins over the inline seed", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "FROM-FILE", "t");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f, perHumanRefreshToken: "INLINE-SEED" }))).toBe("FROM-FILE");
    });
    it("file MISSING → falls back to the inline seed (first boot)", () => {
      const f = join(dir, "does-not-exist.json");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f, perHumanRefreshToken: "INLINE-SEED" }))).toBe("INLINE-SEED");
    });
    it("file CORRUPT → falls back to the inline seed", () => {
      const f = join(dir, "corrupt.json");
      persistRefreshToken(f, "x", "t");
      // clobber with junk
      require("node:fs").writeFileSync(f, "{ not json");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f, perHumanRefreshToken: "INLINE-SEED" }))).toBe("INLINE-SEED");
    });
    it("file with no refresh_token field → falls back to seed", () => {
      const f = join(dir, "empty.json");
      require("node:fs").writeFileSync(f, JSON.stringify({ updated_at: "t" }));
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f, perHumanRefreshToken: "SEED" }))).toBe("SEED");
    });
    it("no file path → uses the inline token", () => {
      expect(readRefreshToken(env({ perHumanRefreshToken: "INLINE" }))).toBe("INLINE");
    });
    it("neither file nor inline → null (fail-closed upstream)", () => {
      expect(readRefreshToken(env({}))).toBeNull();
    });
  });

  describe("access-token persistence (Sprint 2 — gbrain/analytics per-human)", () => {
    it("persists the access token alongside the refresh token; readAccessToken reads it", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "R-1", "t1", "ACCESS-JWT-1");
      const raw = JSON.parse(readFileSync(f, "utf8"));
      expect(raw.refresh_token).toBe("R-1");
      expect(raw.access_token).toBe("ACCESS-JWT-1");
      expect(readAccessToken(f)).toBe("ACCESS-JWT-1");
    });
    it("a rotated pair overwrites both fields atomically", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "R-1", "t1", "A-1");
      persistRefreshToken(f, "R-2", "t2", "A-2");
      expect(readRefreshToken(env({ perHumanRefreshTokenFile: f }))).toBe("R-2");
      expect(readAccessToken(f)).toBe("A-2");
    });
    it("omitting the access token writes a refresh-only file (back-compat) — readAccessToken → null", () => {
      const f = join(dir, "cred.json");
      persistRefreshToken(f, "R-1", "t1"); // legacy 3-arg call
      expect(JSON.parse(readFileSync(f, "utf8")).access_token).toBeUndefined();
      expect(readAccessToken(f)).toBeNull();
    });
    it("readAccessToken fail-closed on missing file, corrupt file, and null path", () => {
      expect(readAccessToken(join(dir, "nope.json"))).toBeNull();
      const f = join(dir, "corrupt.json");
      require("node:fs").writeFileSync(f, "{ not json");
      expect(readAccessToken(f)).toBeNull();
      expect(readAccessToken(null)).toBeNull();
      expect(readAccessToken(undefined)).toBeNull();
    });
    it("readAccessToken ignores a non-string access_token field (fail-closed)", () => {
      const f = join(dir, "weird.json");
      require("node:fs").writeFileSync(f, JSON.stringify({ refresh_token: "R", access_token: 12345 }));
      expect(readAccessToken(f)).toBeNull();
    });
  });
});
