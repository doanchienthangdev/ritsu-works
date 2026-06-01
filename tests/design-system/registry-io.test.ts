import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const {
  readRegistry,
  findSystem,
  validateEntry,
  upsertSystem,
  writeRegistry,
  VALID_ORIGINS,
  VALID_STATUSES,
  RegistryError,
} = require("../../scripts/design-system/registry-io.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Module: registry-io (I/O over design-systems.yaml).
// Phase 1: readRegistry(path), findSystem(name,path), validateEntry(entry), upsertSystem(entry,path), writeRegistry(reg,path).
//   Branches = file missing→throw | malformed YAML→throw | root not-mapping→throw | list not-array→throw |
//   list missing→[] | entry validation (name pattern·origin enum·source·path·status enum) | upsert insert vs merge.
// Phase 2: temp-file fixtures (valid/empty/malformed/array-root/list-missing); entry boundary set;
//   upsert roundtrip persistence. Phase 2N contract: findSystem output shape consumed by resolve-style.
// Skipped: security (path is operator-supplied repo path, not user input); state-sequences (covered by upsert roundtrip).

let tmp: string;
let reg: string;
const writeReg = (yaml: string) => fs.writeFileSync(reg, yaml, "utf-8");

const VALID_ENTRY = {
  name: "ritsu",
  origin: "owned",
  source: "built-from-repo",
  path: "00-core/design-system/ritsu/DESIGN.md",
  status: "pending",
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ds-reg-"));
  reg = path.join(tmp, "design-systems.yaml");
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("readRegistry", () => {
  it("reads a valid registry", () => {
    writeReg(`version: "1.0.0"\ndesign_systems:\n  - name: ritsu\n    origin: owned\n    source: built-from-repo\n    path: 00-core/design-system/ritsu/DESIGN.md\n    status: pending\n`);
    const r = readRegistry(reg);
    expect(r.version).toBe("1.0.0");
    expect(r.design_systems).toHaveLength(1);
    expect(r.design_systems[0].name).toBe("ritsu");
  });

  it("throws RegistryError when the file is missing", () => {
    expect(() => readRegistry(path.join(tmp, "nope.yaml"))).toThrow(RegistryError);
  });

  it("throws on malformed YAML", () => {
    writeReg(`version: "1.0.0"\n  : : :\n\tbad`);
    expect(() => readRegistry(reg)).toThrow(/YAML parse error/);
  });

  it("throws when the root is an array, not a mapping", () => {
    writeReg(`- a\n- b\n`);
    expect(() => readRegistry(reg)).toThrow(/root must be a mapping/);
  });

  it("throws when design_systems is present but not an array", () => {
    writeReg(`version: "1.0.0"\ndesign_systems: not-an-array\n`);
    expect(() => readRegistry(reg)).toThrow(/must be an array/);
  });

  it("defaults design_systems to [] when omitted", () => {
    writeReg(`version: "1.0.0"\n`);
    expect(readRegistry(reg).design_systems).toEqual([]);
  });

  it("defaults version + schema when omitted", () => {
    writeReg(`design_systems: []\n`);
    const r = readRegistry(reg);
    expect(r.version).toBe("1.0.0");
    expect(r.schema).toContain("design-systems.schema.json");
  });
});

describe("findSystem", () => {
  beforeEach(() => {
    writeReg(`version: "1.0.0"\ndesign_systems:\n  - name: ritsu\n    origin: owned\n    source: built-from-repo\n    path: 00-core/design-system/ritsu/DESIGN.md\n    status: pending\n`);
  });
  it("finds an existing system by exact name", () => {
    expect(findSystem("ritsu", reg)?.origin).toBe("owned");
  });
  it("returns null for an unknown name", () => {
    expect(findSystem("stripe", reg)).toBeNull();
  });
  it.each([["", "empty"], [null, "null"], [undefined, "undefined"], [123, "number"]])(
    "returns null for a non-usable name (%s)",
    (name) => {
      expect(findSystem(name as any, reg)).toBeNull();
    },
  );
});

describe("validateEntry", () => {
  it("accepts a fully valid entry", () => {
    expect(validateEntry(VALID_ENTRY)).toEqual([]);
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "x"],
    ["number", 1],
  ])("rejects a non-object entry (%s)", (_l, e) => {
    expect(validateEntry(e as any)).toContain("entry must be an object");
  });

  it.each([
    ["", "empty"],
    ["Ritsu", "capital"],
    ["1ritsu", "leading digit"],
    ["a/b", "slash"],
    [123, "number"],
  ])("flags an invalid name (%s)", (name) => {
    const errs = validateEntry({ ...VALID_ENTRY, name });
    expect(errs.some((e: string) => e.includes("name invalid"))).toBe(true);
  });

  it("flags an invalid origin", () => {
    expect(validateEntry({ ...VALID_ENTRY, origin: "borrowed" }).some((e: string) => e.includes("origin"))).toBe(true);
  });
  it("flags an invalid status", () => {
    expect(validateEntry({ ...VALID_ENTRY, status: "live" }).some((e: string) => e.includes("status"))).toBe(true);
  });
  it.each([["source"], ["path"]])("flags a missing %s", (field) => {
    const e = { ...VALID_ENTRY } as any;
    delete e[field];
    expect(validateEntry(e).some((x: string) => x.includes(field))).toBe(true);
  });

  it("the enum exports are the documented sets", () => {
    expect(VALID_ORIGINS).toEqual(["owned", "downloaded", "built-from-repo"]);
    expect(VALID_STATUSES).toContain("pending");
    expect(VALID_STATUSES).toContain("installed");
    expect(VALID_STATUSES).toContain("vendored");
  });
});

describe("upsertSystem + writeRegistry (roundtrip persistence)", () => {
  beforeEach(() => writeReg(`version: "1.0.0"\ndesign_systems: []\n`));

  it("inserts a new entry and persists it", () => {
    upsertSystem(VALID_ENTRY, reg);
    expect(findSystem("ritsu", reg)?.status).toBe("pending");
  });

  it("merges (updates) an existing entry by name", () => {
    upsertSystem(VALID_ENTRY, reg);
    upsertSystem({ ...VALID_ENTRY, status: "installed", last_synced: "2026-06-01" }, reg);
    const e = findSystem("ritsu", reg);
    expect(e?.status).toBe("installed");
    expect(e?.last_synced).toBe("2026-06-01");
    expect(readRegistry(reg).design_systems).toHaveLength(1); // merged, not duplicated
  });

  it("throws on an invalid entry (does not write)", () => {
    expect(() => upsertSystem({ ...VALID_ENTRY, origin: "borrowed" }, reg)).toThrow(RegistryError);
    expect(readRegistry(reg).design_systems).toHaveLength(0);
  });

  it("writeRegistry then readRegistry is a faithful roundtrip", () => {
    writeRegistry({ version: "1.0.0", design_systems: [VALID_ENTRY] }, reg);
    expect(readRegistry(reg).design_systems[0]).toMatchObject(VALID_ENTRY);
  });

  it("writeRegistry throws when design_systems is not an array", () => {
    expect(() => writeRegistry({ version: "1.0.0", design_systems: "x" } as any, reg)).toThrow(RegistryError);
  });
});
