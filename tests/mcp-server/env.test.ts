import { describe, it, expect } from "vitest";
import {
  ALLOWED_PROJECT_REFS,
  KNOWN_ROLES,
  InvalidRoleError,
  MissingEnvError,
  ProjectRefMismatchError,
  extractProjectRef,
  loadEnv,
  summarizeEnv,
} from "../../mcp-server/src/lib/env.ts";

// Helper: build a fully-valid env object so tests can mutate one field
function validEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = {
    SUPABASE_OPS_URL: "https://mntobbmieuoaxipnjaau.supabase.co",
    SUPABASE_OPS_SERVICE_KEY: "service-key-xxxxx",
    MCP_CALLER_ROLE: "gps",
    MCP_CALLER_SESSION_ID: "test-session",
    RITSU_REPO_ROOT: "/tmp/ritsu-test",
  };
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete base[k];
    else base[k] = v;
  }
  return base;
}

describe("extractProjectRef", () => {
  describe("happy path", () => {
    it("extracts ref from a valid Supabase URL", () => {
      expect(extractProjectRef("https://mntobbmieuoaxipnjaau.supabase.co")).toBe(
        "mntobbmieuoaxipnjaau",
      );
    });

    it("ignores path and query", () => {
      expect(
        extractProjectRef(
          "https://mntobbmieuoaxipnjaau.supabase.co/rest/v1/?key=value",
        ),
      ).toBe("mntobbmieuoaxipnjaau");
    });
  });

  describe("input boundaries", () => {
    it("returns null for empty string", () => {
      expect(extractProjectRef("")).toBeNull();
    });

    it("returns null for non-URL input", () => {
      expect(extractProjectRef("not a url")).toBeNull();
    });

    it("returns null for non-supabase domain", () => {
      expect(extractProjectRef("https://example.com")).toBeNull();
    });

    it("returns null for malformed ref (too short)", () => {
      expect(extractProjectRef("https://short.supabase.co")).toBeNull();
    });

    it("accepts uppercase URL — Node normalizes hostname to lowercase, matching Supabase behavior", () => {
      // Documenting behavior: URL hostname is case-insensitive per RFC 3986.
      // Supabase REST API accepts either case.
      expect(extractProjectRef("https://MNTOBBMIEUOAXIPNJAAU.supabase.co")).toBe(
        "mntobbmieuoaxipnjaau",
      );
    });

    it("returns null for subdomain attack (project-ref as path)", () => {
      expect(
        extractProjectRef("https://attacker.com/mntobbmieuoaxipnjaau.supabase.co"),
      ).toBeNull();
    });
  });
});

describe("loadEnv", () => {
  describe("happy path", () => {
    it("returns a populated ServerEnv when all required vars set", () => {
      const env = loadEnv(validEnv());
      expect(env.projectRef).toBe("mntobbmieuoaxipnjaau");
      expect(env.callerRole).toBe("gps");
      expect(env.serviceKey).toBe("service-key-xxxxx");
      expect(env.anonKey).toBeNull();
      expect(env.repoRoot).toBe("/tmp/ritsu-test");
    });

    it("accepts anon key when service key absent", () => {
      const env = loadEnv(
        validEnv({ SUPABASE_OPS_SERVICE_KEY: undefined, SUPABASE_OPS_ANON_KEY: "anon-xxx" }),
      );
      expect(env.serviceKey).toBeNull();
      expect(env.anonKey).toBe("anon-xxx");
    });

    it("defaults role to gps when MCP_CALLER_ROLE unset", () => {
      const env = loadEnv(validEnv({ MCP_CALLER_ROLE: undefined }));
      expect(env.callerRole).toBe("gps");
    });

    it("generates a synthetic session id when MCP_CALLER_SESSION_ID unset", () => {
      const env = loadEnv(validEnv({ MCP_CALLER_SESSION_ID: undefined }));
      expect(env.callerSessionId).toMatch(/^cc-\d+-[a-z0-9]+$/);
    });

    it("falls back to cwd when RITSU_REPO_ROOT unset", () => {
      const env = loadEnv(validEnv({ RITSU_REPO_ROOT: undefined }));
      expect(env.repoRoot).toBe(process.cwd());
    });

    it("falls back to generic SUPABASE_URL when SUPABASE_OPS_URL unset", () => {
      // Matches existing runtime/secrets/.env.local convention
      const env = loadEnv(
        validEnv({
          SUPABASE_OPS_URL: undefined,
          SUPABASE_URL: "https://mntobbmieuoaxipnjaau.supabase.co",
        }),
      );
      expect(env.url).toBe("https://mntobbmieuoaxipnjaau.supabase.co");
      expect(env.projectRef).toBe("mntobbmieuoaxipnjaau");
    });

    it("falls back to generic SUPABASE_SERVICE_KEY when SUPABASE_OPS_SERVICE_KEY unset", () => {
      const env = loadEnv(
        validEnv({
          SUPABASE_OPS_SERVICE_KEY: undefined,
          SUPABASE_SERVICE_KEY: "fallback-service-key-xxxx",
        }),
      );
      expect(env.serviceKey).toBe("fallback-service-key-xxxx");
    });

    it("falls back to generic SUPABASE_ANON_KEY", () => {
      const env = loadEnv(
        validEnv({
          SUPABASE_OPS_SERVICE_KEY: undefined,
          SUPABASE_ANON_KEY: "fallback-anon-key-xxxx",
        }),
      );
      expect(env.anonKey).toBe("fallback-anon-key-xxxx");
      expect(env.serviceKey).toBeNull();
    });

    it("SUPABASE_OPS_* takes precedence over generic SUPABASE_*", () => {
      const env = loadEnv(
        validEnv({
          SUPABASE_OPS_URL: "https://mntobbmieuoaxipnjaau.supabase.co",
          SUPABASE_URL: "https://aaaaaaaaaaaaaaaaaaaa.supabase.co", // different ref
          SUPABASE_OPS_SERVICE_KEY: "ops-key",
          SUPABASE_SERVICE_KEY: "generic-key",
        }),
      );
      expect(env.url).toContain("mntobbmieuoaxipnjaau");
      expect(env.serviceKey).toBe("ops-key");
    });

    it("project_ref guard still rejects Product URL even via generic SUPABASE_URL fallback", () => {
      expect(() =>
        loadEnv(
          validEnv({
            SUPABASE_OPS_URL: undefined,
            SUPABASE_URL: "https://ixfvqxnohlmayzuesrrq.supabase.co", // Product!
          }),
        ),
      ).toThrowError(ProjectRefMismatchError);
    });
  });

  describe("error handling", () => {
    it("throws MissingEnvError when SUPABASE_OPS_URL absent", () => {
      expect(() => loadEnv(validEnv({ SUPABASE_OPS_URL: undefined }))).toThrowError(
        MissingEnvError,
      );
    });

    it("throws MissingEnvError when URL doesn't match supabase pattern", () => {
      expect(() =>
        loadEnv(validEnv({ SUPABASE_OPS_URL: "https://garbage.io" })),
      ).toThrowError(MissingEnvError);
    });

    it("throws ProjectRefMismatchError when URL points at non-allowlisted project", () => {
      // Use a syntactically-valid but non-allowlisted ref
      expect(() =>
        loadEnv(
          validEnv({
            SUPABASE_OPS_URL: "https://ixfvqxnohlmayzuesrrq.supabase.co", // ← Product Supabase!
          }),
        ),
      ).toThrowError(ProjectRefMismatchError);
    });

    it("error message for ProjectRefMismatchError mentions both observed and allowed", () => {
      try {
        loadEnv(
          validEnv({
            SUPABASE_OPS_URL: "https://aaaaaaaaaaaaaaaaaaaa.supabase.co",
          }),
        );
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ProjectRefMismatchError);
        const msg = (err as Error).message;
        expect(msg).toContain("aaaaaaaaaaaaaaaaaaaa");
        expect(msg).toContain("mntobbmieuoaxipnjaau");
      }
    });

    it("throws MissingEnvError when both keys absent", () => {
      expect(() =>
        loadEnv(
          validEnv({
            SUPABASE_OPS_SERVICE_KEY: undefined,
            SUPABASE_OPS_ANON_KEY: undefined,
          }),
        ),
      ).toThrowError(MissingEnvError);
    });

    it("throws InvalidRoleError when MCP_CALLER_ROLE is not in KNOWN_ROLES", () => {
      expect(() =>
        loadEnv(validEnv({ MCP_CALLER_ROLE: "phantom-role" })),
      ).toThrowError(InvalidRoleError);
    });
  });

  describe("invariants", () => {
    it("ALLOWED_PROJECT_REFS contains ritsu-ops and ONLY ritsu-ops", () => {
      // This is the most important invariant in the whole codebase.
      // If this test ever fails because someone added Product Supabase, REVERT THE COMMIT.
      expect(ALLOWED_PROJECT_REFS).toEqual(["mntobbmieuoaxipnjaau"]);
      expect(ALLOWED_PROJECT_REFS).not.toContain("ixfvqxnohlmayzuesrrq");
    });

    it("KNOWN_ROLES includes gps and founder", () => {
      expect(KNOWN_ROLES).toContain("gps");
      expect(KNOWN_ROLES).toContain("founder");
    });
  });
});

describe("summarizeEnv", () => {
  it("never includes actual key material", () => {
    const env = loadEnv(validEnv({ SUPABASE_OPS_SERVICE_KEY: "DO-NOT-LEAK" }));
    const summary = summarizeEnv(env);
    expect(summary).not.toContain("DO-NOT-LEAK");
    expect(summary).toContain("set(******)");
  });

  it("includes the project_ref so boot logs are useful for debugging", () => {
    const env = loadEnv(validEnv());
    expect(summarizeEnv(env)).toContain("project_ref=mntobbmieuoaxipnjaau");
  });
});
