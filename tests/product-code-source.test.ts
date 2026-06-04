import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { validateContract, KNOWN_MODE_STATUS } = require("../scripts/cross-tier/validate-product-code-source.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Unit: validateContract(contract, ext)
// from scripts/cross-tier/validate-product-code-source.cjs (capability
// product-code-readonly-access — the read-only product CODE source-of-truth).
//
// Phase 1 — signature: (contract:any, ext:any) -> string[] (errors; []=valid).
//   Pure (no I/O). Branches: root not-mapping | version | external_source_id |
//   repo{mapping, owner, name, write_forbidden===true} | read_only===true |
//   read_surface==='committed-remote-tree' | secret_denylist non-empty + covers
//   '.env' | read_modes non-empty + entry{mapping,id,status∈KNOWN} + >=1 live
//   active | consumer_allowlist non-empty | ext.sources array | id registered |
//   source_type==='code-repo-readonly' | status==='active' | role_scope ==
//   consumer_allowlist (no drift).
// Phase 2N (contract): the REAL committed knowledge/product-code-source-contract.yaml
//   + external-sources.yaml must validate clean together.
// Skipped: security (operator-authored yaml, not user input); async (pure sync);
//   performance (tiny doc). No prior bugs → no regression block.
// ============================================================================

const REPO_ROOT = process.cwd();

function validDoc(over: Record<string, any> = {}) {
  return {
    version: "1.0.0",
    external_source_id: "ritsu-product-source",
    repo: { owner: "doanchienthangdev", name: "ritsu", write_forbidden: true },
    read_only: true,
    read_surface: "committed-remote-tree",
    secret_denylist: [".env", "*.key"],
    read_modes: [
      { id: "live-gh-grep", status: "active", freshness: "live" },
      { id: "gbrain-code-graph", status: "planned" },
    ],
    consumer_allowlist: ["founder", "product-orchestrator"],
    ...over,
  };
}
function validExt(over: Record<string, any> = {}) {
  return {
    sources: [
      { id: "ritsu-product-source", source_type: "code-repo-readonly", status: "active", role_scope: ["founder", "product-orchestrator"] },
      { id: "other", source_type: "api", status: "active" },
    ],
    ...over,
  };
}
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateContract — happy path", () => {
  it("a structurally valid contract + external-source returns no errors", () => {
    expect(validateContract(validDoc(), validExt())).toEqual([]);
  });
  it("exports the known mode-status set", () => {
    expect(KNOWN_MODE_STATUS).toContain("active");
    expect(KNOWN_MODE_STATUS).toContain("planned");
  });
});

describe("validateContract — specification / real-file conformance (Phase 2N)", () => {
  it("the committed contract + external-sources.yaml validate clean together", () => {
    const contract = yaml.load(fs.readFileSync(path.join(REPO_ROOT, "knowledge/product-code-source-contract.yaml"), "utf-8"));
    const ext = yaml.load(fs.readFileSync(path.join(REPO_ROOT, "knowledge/external-sources.yaml"), "utf-8"));
    expect(validateContract(contract, ext)).toEqual([]);
  });
});

describe("validateContract — root + shape", () => {
  it("null root", () => expect(validateContract(null, validExt())).toEqual(["root must be a mapping"]));
  it("array root", () => expect(validateContract([], validExt())).toEqual(["root must be a mapping"]));
  it("string root", () => expect(validateContract("x", validExt())).toEqual(["root must be a mapping"]));
  it("missing version", () => expect(has(validateContract(validDoc({ version: undefined }), validExt()), "version must be")).toBe(true));
  it("non-string version", () => expect(has(validateContract(validDoc({ version: 1 }), validExt()), "version must be")).toBe(true));
  it("missing external_source_id", () => expect(has(validateContract(validDoc({ external_source_id: undefined }), validExt()), "external_source_id must be")).toBe(true));
});

describe("validateContract — read-only invariant", () => {
  it("missing repo", () => expect(has(validateContract(validDoc({ repo: undefined }), validExt()), "repo must be a mapping")).toBe(true));
  it("repo without owner", () => expect(has(validateContract(validDoc({ repo: { name: "ritsu", write_forbidden: true } }), validExt()), "repo.owner must be")).toBe(true));
  it("repo without name", () => expect(has(validateContract(validDoc({ repo: { owner: "x", write_forbidden: true } }), validExt()), "repo.name must be")).toBe(true));
  it("write_forbidden not true -> error", () => expect(has(validateContract(validDoc({ repo: { owner: "x", name: "y", write_forbidden: false } }), validExt()), "repo.write_forbidden must be true")).toBe(true));
  it("write_forbidden missing -> error", () => expect(has(validateContract(validDoc({ repo: { owner: "x", name: "y" } }), validExt()), "repo.write_forbidden must be true")).toBe(true));
  it("read_only not true -> error", () => expect(has(validateContract(validDoc({ read_only: false }), validExt()), "read_only must be true")).toBe(true));
});

describe("validateContract — secret-gate", () => {
  it("read_surface = local clone -> error (must be committed-remote-tree)", () => {
    expect(has(validateContract(validDoc({ read_surface: "local-clone" }), validExt()), "read_surface must be 'committed-remote-tree'")).toBe(true);
  });
  it("secret_denylist empty -> error", () => expect(has(validateContract(validDoc({ secret_denylist: [] }), validExt()), "secret_denylist must be a non-empty array")).toBe(true));
  it("secret_denylist missing -> error", () => expect(has(validateContract(validDoc({ secret_denylist: undefined }), validExt()), "secret_denylist must be a non-empty array")).toBe(true));
  it("secret_denylist without .env -> error", () => expect(has(validateContract(validDoc({ secret_denylist: ["*.key", "secrets/"] }), validExt()), "must cover '.env'")).toBe(true));
});

describe("validateContract — read modes", () => {
  it("read_modes empty -> error", () => expect(has(validateContract(validDoc({ read_modes: [] }), validExt()), "read_modes must be a non-empty array")).toBe(true));
  it("read_modes entry not a mapping -> error", () => expect(has(validateContract(validDoc({ read_modes: ["x"] }), validExt()), "must be a mapping")).toBe(true));
  it("unknown mode status -> error", () => expect(has(validateContract(validDoc({ read_modes: [{ id: "m", status: "live-ish", freshness: "live" }] }), validExt()), "unknown status")).toBe(true));
  it("no live+active mode -> error (only a planned mode)", () => {
    expect(has(validateContract(validDoc({ read_modes: [{ id: "gbrain", status: "planned", freshness: "snapshot" }] }), validExt()), "active' mode with freshness 'live'")).toBe(true);
  });
  it("an active mode that isn't 'live' freshness does NOT satisfy the live requirement", () => {
    expect(has(validateContract(validDoc({ read_modes: [{ id: "m", status: "active", freshness: "snapshot" }] }), validExt()), "active' mode with freshness 'live'")).toBe(true);
  });
});

describe("validateContract — external-source registration + no-drift", () => {
  it("consumer_allowlist empty -> error", () => expect(has(validateContract(validDoc({ consumer_allowlist: [] }), validExt()), "consumer_allowlist must be a non-empty array")).toBe(true));
  it("ext has no sources array -> error", () => expect(has(validateContract(validDoc(), {}), "no sources array")).toBe(true));
  it("external_source_id not registered -> error", () => {
    expect(has(validateContract(validDoc({ external_source_id: "ghost-source" }), validExt()), "is NOT registered")).toBe(true);
  });
  it("registered source with wrong source_type -> error", () => {
    const ext = validExt({ sources: [{ id: "ritsu-product-source", source_type: "api", status: "active", role_scope: ["founder", "product-orchestrator"] }] });
    expect(has(validateContract(validDoc(), ext), "source_type must be 'code-repo-readonly'")).toBe(true);
  });
  it("registered source not active -> error", () => {
    const ext = validExt({ sources: [{ id: "ritsu-product-source", source_type: "code-repo-readonly", status: "planned", role_scope: ["founder", "product-orchestrator"] }] });
    expect(has(validateContract(validDoc(), ext), "status must be 'active'")).toBe(true);
  });
  it("allowlist DRIFT vs external-source role_scope -> error", () => {
    const ext = validExt({ sources: [{ id: "ritsu-product-source", source_type: "code-repo-readonly", status: "active", role_scope: ["founder"] }] });
    expect(has(validateContract(validDoc(), ext), "consumer_allowlist DRIFT")).toBe(true);
  });
  it("allowlist order-insensitive match is accepted (no false drift)", () => {
    const ext = validExt({ sources: [{ id: "ritsu-product-source", source_type: "code-repo-readonly", status: "active", role_scope: ["product-orchestrator", "founder"] }] });
    expect(validateContract(validDoc(), ext)).toEqual([]);
  });
});
