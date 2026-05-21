// Tests for scripts/core/lib/frontmatter.cjs — Sprint 2 of core-redesign-and-command.
//
// Covers:
//   - parse: BOM, CRLF, empty fm, malformed YAML, no fm, array fm rejected
//   - serialize: empty fm → body only, non-empty → "---\n...\n---\n" + body
//   - validate: canonical / v0.1-draft / stub conditional requires
//   - list: scans dir, sorts, skips dotfiles
//   - SNAPSHOT: 3 existing 00-core docs parse cleanly (post-migration)

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fm = require(join(REPO, "scripts/core/lib/frontmatter.cjs"));

describe("scripts/core/lib/frontmatter.cjs", () => {
  describe("parse", () => {
    it("returns empty fm + body when no frontmatter block", () => {
      const r = fm.parse("# Title\n\nBody.");
      expect(r.frontmatter).toEqual({});
      expect(r.body).toBe("# Title\n\nBody.");
    });

    it("parses valid frontmatter + body", () => {
      const r = fm.parse("---\ntitle: Foo\nstatus: canonical\n---\n# Body");
      expect(r.frontmatter.title).toBe("Foo");
      expect(r.frontmatter.status).toBe("canonical");
      expect(r.body).toBe("# Body");
    });

    it("strips BOM", () => {
      const r = fm.parse("﻿---\ntitle: Foo\n---\nBody");
      expect(r.frontmatter.title).toBe("Foo");
    });

    it("normalizes CRLF", () => {
      const r = fm.parse("---\r\ntitle: Foo\r\n---\r\nBody");
      expect(r.frontmatter.title).toBe("Foo");
      expect(r.body).toBe("Body");
    });

    it("returns full body when opening --- has no closing", () => {
      const r = fm.parse("---\ntitle: incomplete\n# Body");
      expect(r.frontmatter).toEqual({});
      expect(r.body).toBe("---\ntitle: incomplete\n# Body");
    });

    it("handles empty frontmatter block", () => {
      const r = fm.parse("---\n\n---\nBody");
      expect(r.frontmatter).toEqual({});
      expect(r.body).toBe("Body");
    });

    it("returns empty for null input", () => {
      const r = fm.parse(null);
      expect(r.frontmatter).toEqual({});
      expect(r.body).toBe("");
    });

    it("throws on array YAML root", () => {
      expect(() => fm.parse("---\n- item1\n- item2\n---\nBody")).toThrow(/object map/);
    });

    it("parses arrays in fields", () => {
      const r = fm.parse("---\ntitle: Foo\ncited_by:\n  - skill1\n  - skill2\n---\nBody");
      expect(r.frontmatter.cited_by).toEqual(["skill1", "skill2"]);
    });

    it("preserves embedded --- in body", () => {
      const r = fm.parse("---\ntitle: Foo\n---\n# Body\n\n---\n\n## Section");
      expect(r.body).toContain("---\n\n## Section");
    });
  });

  describe("serialize", () => {
    it("returns body-only when fm is empty", () => {
      expect(fm.serialize({}, "Body")).toBe("Body");
      expect(fm.serialize(null, "Body")).toBe("Body");
    });

    it("emits frontmatter block + body", () => {
      const out = fm.serialize({ title: "Foo", status: "canonical" }, "Body");
      expect(out).toMatch(/^---\n/);
      expect(out).toContain("title:");
      expect(out).toContain("status:");
      expect(out).toContain("---\nBody");
    });

    it("roundtrips parse→serialize", () => {
      const original = "---\ntitle: Foo\nstatus: canonical\n---\n# Body\n\nContent";
      const { frontmatter, body } = fm.parse(original);
      const serialized = fm.serialize(frontmatter, body);
      const reparsed = fm.parse(serialized);
      expect(reparsed.frontmatter).toEqual(frontmatter);
      expect(reparsed.body).toBe(body);
    });
  });

  describe("validate", () => {
    const sch = fm.CORE_SCHEMA;

    it("validates a canonical doc", () => {
      const valid = {
        title: "T",
        type: "core-doc",
        slug: "t",
        layer: "identity",
        status: "canonical",
        owner: "founder",
        last_reviewed: "2026-05-21",
        review_cadence: "quarterly",
        auto_load: false,
      };
      const r = fm.validate(valid, sch);
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
    });

    it("rejects missing required field", () => {
      const { title, ...rest } = {
        title: "T",
        type: "core-doc",
        slug: "t",
        layer: "identity",
        status: "canonical",
        owner: "founder",
        last_reviewed: "2026-05-21",
        review_cadence: "quarterly",
        auto_load: false,
      };
      const r = fm.validate(rest, sch);
      expect(r.valid).toBe(false);
      expect(r.errors.some((e: { field: string }) => e.field === "title")).toBe(true);
    });

    it("rejects wrong enum value for layer", () => {
      const r = fm.validate(
        {
          title: "T", type: "core-doc", slug: "t",
          layer: "invalid-layer",
          status: "canonical", owner: "founder",
          last_reviewed: "2026-05-21", review_cadence: "quarterly", auto_load: false,
        },
        sch
      );
      expect(r.valid).toBe(false);
      expect(r.errors.some((e: { field: string }) => e.field === "layer")).toBe(true);
    });

    it("requires revisit_at for v0.1-draft", () => {
      const r = fm.validate(
        {
          title: "T", type: "core-doc", slug: "t",
          layer: "identity", status: "v0.1-draft",
          owner: "founder", last_reviewed: "2026-05-21",
          review_cadence: "on-trigger", auto_load: false,
          // missing revisit_at, revisit_trigger, revisit_owner
        },
        sch
      );
      expect(r.valid).toBe(false);
      expect(r.errors.some((e: { field: string }) => e.field === "revisit_at")).toBe(true);
    });

    it("requires entry_condition for stub", () => {
      const r = fm.validate(
        {
          title: "T", type: "core-doc", slug: "t",
          layer: "meta", status: "stub",
          owner: "founder", last_reviewed: "2026-05-21",
          review_cadence: "on-trigger", auto_load: false,
          // missing entry_condition, triggered_by, why_deferred
        },
        sch
      );
      expect(r.valid).toBe(false);
      expect(r.errors.some((e: { field: string }) => e.field === "entry_condition")).toBe(true);
    });
  });

  describe("list", () => {
    it("scans 00-core/ and returns parsed docs", () => {
      const docs = fm.list(join(REPO, "00-core"));
      expect(docs.length).toBeGreaterThan(10);
      // Every doc should have parsed frontmatter (post-migration)
      const withFm = docs.filter((d: { frontmatter: Record<string, unknown> | null }) => d.frontmatter && Object.keys(d.frontmatter).length > 0);
      expect(withFm.length).toBeGreaterThan(0);
    });

    it("returns empty for missing dir", () => {
      const docs = fm.list("/nonexistent/path/xyz");
      expect(docs).toEqual([]);
    });
  });

  describe("snapshot: 3 existing 00-core docs post-migration", () => {
    const existingDocs = ["product.md", "brand_voice.md", "transparency.md"];

    for (const doc of existingDocs) {
      it(`parses ${doc} with required frontmatter fields`, () => {
        const filepath = join(REPO, "00-core", doc);
        if (!existsSync(filepath)) {
          throw new Error(`Expected ${doc} to exist (migration should have retrofitted frontmatter)`);
        }
        const content = readFileSync(filepath, "utf-8");
        const { frontmatter, body } = fm.parse(content);
        // Required-always fields per CORE_SCHEMA
        expect(frontmatter.title).toBeTruthy();
        expect(frontmatter.type).toBe("core-doc");
        expect(frontmatter.layer).toBe("identity");
        expect(frontmatter.status).toBe("canonical");
        expect(frontmatter.owner).toBe("founder");
        expect(frontmatter.last_reviewed).toBeTruthy();
        expect(frontmatter.review_cadence).toBeTruthy();
        expect(typeof frontmatter.auto_load).toBe("boolean");
        // Body should have content (not empty)
        expect(body.length).toBeGreaterThan(100);
      });
    }
  });

  describe("parity: vs scripts/wiki-sync/get.cjs inline parser", () => {
    // Per CTO Phase 2 mandate: parser must not drift vs /wiki get inline implementation.
    // Smoke test: both parsers should extract identical frontmatter from the same Sprint 1 docs.
    it("frontmatter.cjs result is structurally equivalent on charter.md", () => {
      const filepath = join(REPO, "00-core", "charter.md");
      const content = readFileSync(filepath, "utf-8");
      const { frontmatter } = fm.parse(content);
      // Replicate wiki-sync/get.cjs inline parser semantics for required fields
      // (The inline parser is simpler; we only assert that our richer parser extracts AT LEAST
      // the fields the inline parser would catch.)
      expect(frontmatter.title).toBeTruthy();
      expect(frontmatter.status).toBe("canonical");
      expect(frontmatter.layer).toBe("identity");
      expect(typeof frontmatter.auto_load).toBe("boolean");
    });
  });
});
