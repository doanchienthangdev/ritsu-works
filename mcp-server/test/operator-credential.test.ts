// All-Edge tests for the refresh-token persistence (Sprint 2 part 1.5).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readRefreshToken, persistRefreshToken } from "../src/governance/operator-credential.ts";
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
});
