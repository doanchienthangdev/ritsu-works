// Tests for scripts/wave2-bundle-schedules.cjs
//
// Phase 1 — Code Analysis:
//   bundle({yamlPath, outPath, now}): orchestrator
//     branches: file-missing → throw
//               yaml-parse-fail → throw
//               top-level-not-object → throw
//               missing schedules array → throw
//               entry-not-object → throw
//               entry-missing-id → throw
//               entry-empty-id → throw
//               duplicate-id → throw
//               happy → write file, return {count, ids, outPath}
//
// Classification: file I/O (write to disk) → tmp-fs tests required.
//                 produces TS source consumed downstream → contract test required
//                 (output must import cleanly into dispatcher's runtime).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// CJS module — vitest can require() through createRequire shim provided by node interop.
import { createRequire } from "node:module";
const require_ = createRequire(import.meta.url);
const { bundle, DEFAULT_YAML, DEFAULT_OUT } = require_("../scripts/wave2-bundle-schedules.cjs");

function mktmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ritsu-bundle-test-"));
}

function writeYaml(dir: string, content: string): string {
  const p = path.join(dir, "schedules.yaml");
  fs.writeFileSync(p, content);
  return p;
}

function outPathIn(dir: string): string {
  return path.join(dir, "out.generated.ts");
}

const FIXED_NOW = "2026-05-05T00:00:00.000Z";

const VALID_YAML = `version: "1.0.0"
timezone: Asia/Ho_Chi_Minh
schedules:
  - id: alpha
    cron: "0 5 * * *"
    description: "first"
    skill: skill-alpha
  - id: beta
    cron: "*/15 * * * *"
    description: "second"
    skill: skill-beta
    enabled_when_mode: [hybrid]
    requires_api: anthropic
`;

let tmp: string;
beforeEach(() => {
  tmp = mktmp();
});
afterEach(() => {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ============================================================================
// happy path
// ============================================================================

describe("bundle — happy path", () => {
  it("writes generated TS file with all schedules", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);

    const result = bundle({ yamlPath, outPath, now: FIXED_NOW });

    expect(result.count).toBe(2);
    expect(result.ids).toEqual(["alpha", "beta"]);
    expect(result.outPath).toBe(outPath);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it("output contains import of ScheduleEntry type", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain('import type { ScheduleEntry } from "./dispatcher.ts"');
  });

  it("output contains the SCHEDULES record with expected ids as keys", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toMatch(/export const SCHEDULES: Record<string, ScheduleEntry>/);
    expect(out).toContain('"alpha"');
    expect(out).toContain('"beta"');
    expect(out).toContain('"skill-alpha"');
    expect(out).toContain('"skill-beta"');
  });

  it("output contains SCHEDULE_IDS sorted array", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain('export const SCHEDULE_IDS');
    expect(out).toContain('["alpha","beta"]');
  });

  it("preserves enabled_when_mode and requires_api fields", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain('"enabled_when_mode"');
    expect(out).toContain('"hybrid"');
    expect(out).toContain('"requires_api"');
    expect(out).toContain('"anthropic"');
  });

  it("uses provided `now` for the generated timestamp banner", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain(`Generated at:    ${FIXED_NOW}`);
  });

  it("creates parent directory if missing", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const nested = path.join(tmp, "nested", "deep", "out.generated.ts");
    bundle({ yamlPath, outPath: nested, now: FIXED_NOW });
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("accepts an empty schedules array (count: 0)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules: []
`,
    );
    const outPath = outPathIn(tmp);
    const result = bundle({ yamlPath, outPath, now: FIXED_NOW });
    expect(result.count).toBe(0);
    expect(result.ids).toEqual([]);

    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain("export const SCHEDULES: Record<string, ScheduleEntry> = {}");
  });
});

// ============================================================================
// error paths — Phase 2J error propagation
// ============================================================================

describe("bundle — error paths", () => {
  it("throws when yamlPath does not exist", () => {
    const yamlPath = path.join(tmp, "nope.yaml");
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /not found/,
    );
  });

  it("throws on malformed yaml", () => {
    // mismatched flow-style brackets — js-yaml definitely rejects this
    const yamlPath = writeYaml(tmp, "{[}");
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /yaml parse failed/,
    );
  });

  it("throws when top-level is not an object", () => {
    const yamlPath = writeYaml(tmp, "just a plain string");
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /must be an object/,
    );
  });

  it("throws when schedules key is missing", () => {
    const yamlPath = writeYaml(tmp, `version: "1.0.0"\ntimezone: UTC\n`);
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /missing `schedules` array/,
    );
  });

  it("throws when schedules is not an array (object)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"\ntimezone: UTC\nschedules:\n  foo: bar\n`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /missing `schedules` array/,
    );
  });

  it("throws when an entry is missing id", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - cron: "0 5 * * *"
    skill: x
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /missing string id/,
    );
  });

  it("throws when an entry has empty-string id", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - id: ""
    cron: "0 5 * * *"
    skill: x
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /missing string id/,
    );
  });

  it("throws when an entry id is not a string (number)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - id: 42
    cron: "0 5 * * *"
    skill: x
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /missing string id/,
    );
  });

  it("throws on duplicate id", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - id: dup
    cron: "0 5 * * *"
    skill: x
  - id: dup
    cron: "0 6 * * *"
    skill: y
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /duplicate id "dup"/,
    );
  });

  it("throws when an entry is null (non-object)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - null
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /entry is not an object/,
    );
  });

  it("throws when an entry is a plain string (non-object)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - "just-a-string"
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /entry is not an object/,
    );
  });

  it("throws when an entry is a number (non-object)", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - 42
`,
    );
    expect(() => bundle({ yamlPath, outPath: outPathIn(tmp), now: FIXED_NOW })).toThrow(
      /entry is not an object/,
    );
  });

  it("does NOT write the output file when an error is thrown", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"\ntimezone: UTC\nschedules:\n  - {cron: x, skill: y}\n`,
    );
    const outPath = outPathIn(tmp);
    expect(() => bundle({ yamlPath, outPath, now: FIXED_NOW })).toThrow();
    expect(fs.existsSync(outPath)).toBe(false);
  });
});

// ============================================================================
// security — Phase 2K (yaml content treated as data, not code)
// ============================================================================

describe("bundle — security", () => {
  it("preserves but does not execute strings containing template syntax", () => {
    // a malicious yaml entry containing JS template-string-like content
    // should appear as a literal string, never evaluated.
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - id: with-templates
    cron: "0 5 * * *"
    skill: \${process.exit(1)}
    description: "\${this is just text}"
`,
    );
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });
    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain('"${process.exit(1)}"');
    // Ensure no backtick-template-literal slipped through
    expect(out).not.toContain('`${process');
  });

  it("escapes embedded double quotes in string fields via JSON.stringify", () => {
    const yamlPath = writeYaml(
      tmp,
      `version: "1.0.0"
timezone: UTC
schedules:
  - id: quoted
    cron: "0 5 * * *"
    skill: x
    description: 'has "double" quotes'
`,
    );
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });
    const out = fs.readFileSync(outPath, "utf8");
    expect(out).toContain('has \\"double\\" quotes');
  });
});

// ============================================================================
// contract boundary — Phase 2N (downstream consumer must parse output)
// ============================================================================

describe("bundle — contract with dispatcher", () => {
  it("output JSON.parse-able after stripping the TS scaffolding", () => {
    const yamlPath = writeYaml(tmp, VALID_YAML);
    const outPath = outPathIn(tmp);
    bundle({ yamlPath, outPath, now: FIXED_NOW });

    const out = fs.readFileSync(outPath, "utf8");
    const match = out.match(/export const SCHEDULES: Record<string, ScheduleEntry> = (\{[\s\S]*?\});/);
    expect(match).not.toBeNull();
    if (!match) return;
    const parsed = JSON.parse(match[1]);
    expect(parsed.alpha.id).toBe("alpha");
    expect(parsed.alpha.cron).toBe("0 5 * * *");
    expect(parsed.beta.skill).toBe("skill-beta");
    expect(parsed.beta.enabled_when_mode).toEqual(["hybrid"]);
  });
});

// ============================================================================
// real-world contract — runs against the actual repo schedules.yaml
// ============================================================================

describe("bundle — real repo schedules.yaml", () => {
  it("processes the live knowledge/schedules.yaml without error", () => {
    const outPath = outPathIn(tmp);
    const result = bundle({ yamlPath: DEFAULT_YAML, outPath, now: FIXED_NOW });
    expect(result.count).toBeGreaterThan(0);
    expect(result.ids).toContain("morning-brief-assembly");
  });
});

// ============================================================================
// CLI entry point — `if (require.main === module)` block
// ============================================================================
//
// Subprocess test: spawn the script as a child process to exercise the
// top-level CLI handler (lines 110-119 of the script). Two paths:
//   1. happy → exit 0, prints success line + each id
//   2. error → exit 1, prints '✗ <message>' on stderr

describe("bundle — CLI entry point (subprocess)", () => {
  it("exits 0 and prints success when run against the real repo schedules.yaml", () => {
    const r = require_("node:child_process").spawnSync(
      "node",
      ["scripts/wave2-bundle-schedules.cjs"],
      {
        cwd: require_("node:path").resolve(__dirname, ".."),
        encoding: "utf8",
      },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/✓ Bundled \d+ schedule\(s\)/);
    expect(r.stdout).toContain("morning-brief-assembly");
  });

  it("exits 1 with error printed when the bundler throws (subprocess catch arm)", () => {
    // To exercise the script's CLI catch arm we must run the script as
    // node's MAIN module (so `require.main === module` is true). We use
    // node's `-r` flag to preload a tiny patcher that replaces the js-yaml
    // module with one whose load() throws. The script then runs as main,
    // imports patched js-yaml, and trips its own catch arm.
    const path = require_("node:path");
    const fs = require_("node:fs");
    const child_process = require_("node:child_process");
    const os = require_("node:os");
    const scriptAbs = path.resolve(__dirname, "..", "scripts", "wave2-bundle-schedules.cjs");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ritsu-cli-error-"));
    const patcher = path.join(tmp, "patch.cjs");
    fs.writeFileSync(
      patcher,
      `
const Module = require('module');
const origLoad = Module._load;
Module._load = function (id) {
  if (id === 'js-yaml') {
    return { load: () => { throw new Error('synthetic yaml-parse failure'); } };
  }
  return origLoad.apply(this, arguments);
};
`,
    );
    const r = child_process.spawnSync("node", ["-r", patcher, scriptAbs], { encoding: "utf8" });
    fs.rmSync(tmp, { recursive: true, force: true });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/✗ yaml parse failed: synthetic yaml-parse failure/);
  });
});
