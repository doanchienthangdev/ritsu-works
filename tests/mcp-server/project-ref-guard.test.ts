import { describe, it, expect } from "vitest";
import {
  assertProjectRefAllowed,
  ProjectRefViolationError,
} from "../../mcp-server/src/governance/project-ref-guard.ts";

describe("assertProjectRefAllowed", () => {
  describe("happy path", () => {
    it("passes for the ritsu-ops URL", () => {
      expect(() =>
        assertProjectRefAllowed("https://mntobbmieuoaxipnjaau.supabase.co"),
      ).not.toThrow();
    });

    it("passes for any path on the ritsu-ops domain", () => {
      expect(() =>
        assertProjectRefAllowed("https://mntobbmieuoaxipnjaau.supabase.co/rest/v1/tasks"),
      ).not.toThrow();
    });
  });

  describe("THE security boundary — must reject Product Supabase", () => {
    it("throws ProjectRefViolationError for Product Supabase URL", () => {
      // ixfvqxnohlmayzuesrrq is the Product Supabase project ref (ritsu, West US — confirmed via `supabase projects list` 2026-05-16).
      // If this test ever fails, REVERT THE COMMIT.
      expect(() =>
        assertProjectRefAllowed("https://ixfvqxnohlmayzuesrrq.supabase.co"),
      ).toThrowError(ProjectRefViolationError);
    });

    it("error mentions the violating URL in its message", () => {
      try {
        assertProjectRefAllowed("https://ixfvqxnohlmayzuesrrq.supabase.co");
        expect.fail("should have thrown");
      } catch (err) {
        expect((err as Error).message).toContain("ixfvqxnohlmayzuesrrq");
        expect((err as Error).message).toContain("SECURITY EVENT");
      }
    });
  });

  describe("rejection cases", () => {
    it("throws for non-supabase domain", () => {
      expect(() => assertProjectRefAllowed("https://example.com")).toThrowError(
        ProjectRefViolationError,
      );
    });

    it("throws for empty url", () => {
      expect(() => assertProjectRefAllowed("")).toThrowError(ProjectRefViolationError);
    });

    it("throws for arbitrary 20-char ref not in allowlist", () => {
      expect(() =>
        assertProjectRefAllowed("https://aaaaaaaaaaaaaaaaaaaa.supabase.co"),
      ).toThrowError(ProjectRefViolationError);
    });
  });
});
