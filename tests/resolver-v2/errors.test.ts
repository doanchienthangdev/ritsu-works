// Resolver v2 — errors module test suite.
// Phase 1 analysis: 14 exception classes + 3 constant arrays + ResolverError base.
// All errors carry .code (stable identifier) and .kind (category).

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("errors.cjs", () => {
  describe("happy path", () => {
    it("exports all 14 named exception classes", () => {
      const expected = [
        "ResolverError",
        "InvalidTrigger", "TriggerTooLong", "InvalidKindFilter",
        "HallucinatedRecipient", "InvalidLlmResponse",
        "CatalogDown", "CatalogFileMissing", "CatalogParseError",
        "DuplicateRecipientId", "MissingRequiredField",
        "AuditWriteFailed", "SyncLocked", "WorkingTreeDirty",
      ];
      for (const name of expected) {
        expect(E[name]).toBeDefined();
        expect(typeof E[name]).toBe("function");
      }
    });

    it("exports VALID_KINDS, VALID_MODES, VALID_DECISIONS constants", () => {
      // v2.1: added workflow, schedule, hook (6→11 kinds)
      // v2.2: added page, view, metric, runbook, external-source (11→16 kinds)
      expect(E.VALID_KINDS).toEqual([
        "skill", "command", "agent", "persona", "mcp",
        "wiki", "sop", "capability", "workflow", "schedule", "hook",
        "page", "view", "metric", "runbook", "external-source",
      ]);
      expect(E.VALID_MODES).toEqual(["A", "B", "C"]);
      expect(E.VALID_DECISIONS).toEqual(["dispatch_silently", "surface_candidates", "no_match", "role_denied"]);
    });
  });

  describe("ResolverError base class", () => {
    it("has name, code, kind set correctly", () => {
      const e = new E.ResolverError("test", "TEST_CODE", "input");
      expect(e.name).toBe("ResolverError");
      expect(e.code).toBe("TEST_CODE");
      expect(e.kind).toBe("input");
      expect(e.message).toBe("test");
      expect(e).toBeInstanceOf(Error);
    });
  });

  describe("input errors", () => {
    it("InvalidTrigger has code=INVALID_TRIGGER, kind=input", () => {
      const e = new E.InvalidTrigger("reason");
      expect(e.code).toBe("INVALID_TRIGGER");
      expect(e.kind).toBe("input");
      expect(e.message).toBe("reason");
      expect(e).toBeInstanceOf(E.ResolverError);
    });

    it("TriggerTooLong carries lengths", () => {
      const e = new E.TriggerTooLong(2000, 1000);
      expect(e.code).toBe("TRIGGER_TOO_LONG");
      expect(e.actualLen).toBe(2000);
      expect(e.maxLen).toBe(1000);
    });

    it("InvalidKindFilter carries kind + valid list", () => {
      const e = new E.InvalidKindFilter("foobar", ["skill", "command"]);
      expect(e.kind).toBe("input");
      expect(e.code).toBe("INVALID_KIND_FILTER");
      expect(e.message).toContain("foobar");
      expect(e.message).toContain("skill, command");
    });

    it("HallucinatedRecipient carries recipient ID + count", () => {
      const e = new E.HallucinatedRecipient("ghost/notreal", ["a", "b", "c"]);
      expect(e.code).toBe("HALLUCINATED_RECIPIENT");
      expect(e.kind).toBe("validation");
      expect(e.recipientId).toBe("ghost/notreal");
      expect(e.availableCount).toBe(3);
    });

    it("InvalidLlmResponse truncates raw to 500 chars", () => {
      const big = "x".repeat(1000);
      const e = new E.InvalidLlmResponse("json parse fail", big);
      expect(e.raw.length).toBe(500);
    });

    it("InvalidLlmResponse handles null/undefined raw", () => {
      expect(new E.InvalidLlmResponse("x").raw).toBe("");
      expect(new E.InvalidLlmResponse("x", null).raw).toBe("");
    });
  });

  describe("state errors", () => {
    it("CatalogDown carries detail", () => {
      const e = new E.CatalogDown("/no/such/dir");
      expect(e.code).toBe("CATALOG_DOWN");
      expect(e.kind).toBe("state");
      expect(e.message).toContain("/no/such/dir");
    });

    it("CatalogFileMissing carries filePath", () => {
      const e = new E.CatalogFileMissing("/x/y/z.md");
      expect(e.filePath).toBe("/x/y/z.md");
    });

    it("CatalogParseError carries filePath + detail", () => {
      const e = new E.CatalogParseError("/x/file.md", "bad yaml");
      expect(e.filePath).toBe("/x/file.md");
      expect(e.detail).toBe("bad yaml");
      expect(e.message).toContain("/x/file.md");
      expect(e.message).toContain("bad yaml");
    });

    it("DuplicateRecipientId carries id + file list", () => {
      const e = new E.DuplicateRecipientId("skill/foo", ["/a.md", "/b.md"]);
      expect(e.id).toBe("skill/foo");
      expect(e.files).toEqual(["/a.md", "/b.md"]);
      expect(e.message).toContain("/a.md");
    });

    it("MissingRequiredField carries recipientId + field", () => {
      const e = new E.MissingRequiredField("skill/x", "Invoke");
      expect(e.recipientId).toBe("skill/x");
      expect(e.field).toBe("Invoke");
    });
  });

  describe("io errors", () => {
    it("AuditWriteFailed has kind=io", () => {
      const e = new E.AuditWriteFailed("db down");
      expect(e.kind).toBe("io");
    });

    it("SyncLocked carries lockAgeMs", () => {
      const e = new E.SyncLocked(5000);
      expect(e.lockAgeMs).toBe(5000);
      expect(e.message).toContain("5000");
    });

    it("WorkingTreeDirty has kind=io", () => {
      const e = new E.WorkingTreeDirty("M file.md");
      expect(e.kind).toBe("io");
      expect(e.message).toContain("file.md");
    });
  });

  describe("inheritance chain", () => {
    it("all errors extend ResolverError extend Error", () => {
      const samples = [
        new E.InvalidTrigger("x"),
        new E.TriggerTooLong(1, 0),
        new E.HallucinatedRecipient("x", []),
        new E.CatalogDown("x"),
        new E.AuditWriteFailed("x"),
      ];
      for (const e of samples) {
        expect(e).toBeInstanceOf(E.ResolverError);
        expect(e).toBeInstanceOf(Error);
        expect(typeof e.code).toBe("string");
        expect(typeof e.kind).toBe("string");
      }
    });
  });
});
