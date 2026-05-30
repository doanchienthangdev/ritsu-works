// Tests for scripts/cross-tier/validate-mcp-catalog-coherence.cjs
//
// Phase 1 analysis (subject: checkCoherence(mcpJson, toolsDoc) → string[]):
//   1A signature: 2 object params (parsed .mcp.json, parsed mcp-tools.yaml),
//      both nullable / shape-variable (come from JSON/YAML parse). Returns an
//      array of human-readable error strings (empty = coherent).
//   1B branches:
//      - liveServers = keys(mcpJson?.mcpServers || {})        [null/missing guard]
//      - tools = Array.isArray(toolsDoc?.tools) ? … : []      [null/non-array guard]
//      - skip entries with no id
//      - I1 double-prefix: server && id.startsWith(server+'__')
//      - I2 server-fidelity (live only): !server | !registered
//      - I3 status-coherence: planned && server registered
//      - non-live = planned|deprecated; deprecated is exempt from I2/I3
//   1C deps: none (pure).
//   1D classification: pure data-transform → property + contract + regression.
//      Inputs originate from parsed config files → runtime nulls are realistic.
//   1F regressions: the THREE historical drift bugs this validator exists to
//      catch — gbrain double-prefix+planned, supabase_ops hyphen-mangle,
//      planned-on-live-server — each gets a named case.
//
// Phase 2 edge map: null/empty mcpJson + toolsDoc; tools:null; entry w/o id;
//   every (status × server-registered × id-shape) combination that flips a branch.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const { checkCoherence } = cjsRequire(
  join(REPO, "scripts/cross-tier/validate-mcp-catalog-coherence.cjs"),
);

// A .mcp.json where both real servers are registered.
const MCP = { mcpServers: { "supabase-ops": {}, gbrain: {} } };

function tool(over: Record<string, unknown> = {}) {
  return { id: "search", server: "gbrain", status: "live", ...over };
}

describe("checkCoherence — happy path", () => {
  it("returns no errors for a bare-id live tool on a registered server", () => {
    expect(checkCoherence(MCP, { tools: [tool()] })).toEqual([]);
  });

  it("treats omitted status as live (no error when server registered)", () => {
    expect(checkCoherence(MCP, { tools: [tool({ status: undefined })] })).toEqual([]);
  });

  it("accepts status 'active' as live", () => {
    expect(checkCoherence(MCP, { tools: [tool({ status: "active" })] })).toEqual([]);
  });

  it("accepts a planned tool on an UNregistered (future) server", () => {
    expect(
      checkCoherence(MCP, { tools: [{ id: "future_tool", server: "not-yet", status: "planned" }] }),
    ).toEqual([]);
  });

  it("accepts a planned placeholder with no server (e.g. ritsu.* Phase 2)", () => {
    expect(
      checkCoherence(MCP, { tools: [{ id: "ritsu.kpi.snapshot", status: "planned" }] }),
    ).toEqual([]);
  });

  it("exempts deprecated tools from server-fidelity and status-coherence", () => {
    expect(
      checkCoherence(MCP, { tools: [{ id: "old_tool", server: "supabase_ops", status: "deprecated" }] }),
    ).toEqual([]);
  });
});

describe("checkCoherence — I1 bare-id / no-double-prefix", () => {
  it("flags an id that re-includes its server prefix", () => {
    const errs = checkCoherence(MCP, { tools: [tool({ id: "gbrain__search" })] });
    expect(errs.some((e) => e.includes("[I1 double-prefix]"))).toBe(true);
    expect(errs.some((e) => e.includes("rename to 'search'"))).toBe(true);
  });

  it("does NOT flag a bare id that merely contains '__' mid-name", () => {
    // server is 'gbrain'; id 'code_traversal_cache_clear' has no 'gbrain__' prefix.
    const errs = checkCoherence(MCP, { tools: [tool({ id: "code_traversal_cache_clear" })] });
    expect(errs.some((e) => e.includes("[I1"))).toBe(false);
  });

  it("does not crash on an entry with a server but no id (skipped)", () => {
    expect(checkCoherence(MCP, { tools: [{ server: "gbrain", status: "live" }] })).toEqual([]);
  });

  it("skips I1 when server is absent (no prefix to double)", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "unknown__weird", status: "planned" }] });
    expect(errs.some((e) => e.includes("[I1"))).toBe(false);
  });
});

describe("checkCoherence — I2 server-fidelity (live tools)", () => {
  it("flags a live tool with NO server", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "orphan", status: "live" }] });
    expect(errs.some((e) => e.includes("[I2 server-fidelity]") && e.includes("declares no 'server'"))).toBe(true);
  });

  it("flags a live tool whose server is not a .mcp.json key", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "query", server: "supabase_ops", status: "live" }] });
    expect(errs.some((e) => e.includes("[I2 server-fidelity]") && e.includes("supabase_ops"))).toBe(true);
  });

  it("does not flag I2 for planned tools on unregistered servers", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "x", server: "ghost", status: "planned" }] });
    expect(errs.some((e) => e.includes("[I2"))).toBe(false);
  });
});

describe("checkCoherence — I3 status-coherence", () => {
  it("flags a planned tool whose server is LIVE in .mcp.json", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "search", server: "gbrain", status: "planned" }] });
    expect(errs.some((e) => e.includes("[I3 status-coherence]") && e.includes("LIVE in .mcp.json"))).toBe(true);
  });
});

describe("checkCoherence — input boundaries (null / empty / malformed)", () => {
  it("handles null mcpJson (no registered servers)", () => {
    // A live tool with a server → server not registered → I2.
    const errs = checkCoherence(null, { tools: [tool()] });
    expect(errs.some((e) => e.includes("[I2"))).toBe(true);
  });

  it("handles mcpJson without mcpServers key", () => {
    const errs = checkCoherence({}, { tools: [tool()] });
    expect(errs.some((e) => e.includes("[I2"))).toBe(true);
  });

  it("handles null toolsDoc", () => {
    expect(checkCoherence(MCP, null)).toEqual([]);
  });

  it("handles toolsDoc.tools = null", () => {
    expect(checkCoherence(MCP, { tools: null })).toEqual([]);
  });

  it("handles empty tools array", () => {
    expect(checkCoherence(MCP, { tools: [] })).toEqual([]);
  });

  it("skips null / id-less entries without throwing", () => {
    expect(checkCoherence(MCP, { tools: [null, {}, { id: "" }] })).toEqual([]);
  });
});

describe("checkCoherence — regressions (the 3 historical drift bugs)", () => {
  it("regression: gbrain double-prefix + planned (id gbrain__search) → I1 AND I3", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "gbrain__search", server: "gbrain", status: "planned" }] });
    expect(errs.some((e) => e.includes("[I1"))).toBe(true);
    expect(errs.some((e) => e.includes("[I3"))).toBe(true);
  });

  it("regression: supabase_ops hyphen-mangle (live tool, underscore server) → I2", () => {
    const errs = checkCoherence(MCP, { tools: [{ id: "query", server: "supabase_ops", status: "live" }] });
    expect(errs.some((e) => e.includes("[I2"))).toBe(true);
  });

  it("regression: 41 gbrain tools left planned after server went live → I3 each", () => {
    const planned = ["search", "get_page", "put_page", "think"].map((n) => ({
      id: n, server: "gbrain", status: "planned",
    }));
    const errs = checkCoherence(MCP, { tools: planned });
    const i3 = errs.filter((e) => e.includes("[I3"));
    expect(i3.length).toBe(4);
  });
});

describe("checkCoherence — integration: the LIVE repo must stay coherent", () => {
  it("real .mcp.json × mcp-tools.yaml produces zero violations", () => {
    const mcpJson = JSON.parse(readFileSync(join(REPO, ".mcp.json"), "utf-8"));
    // Parse the yaml the same way the validator does, via its own js-yaml.
    const yaml = cjsRequire("js-yaml");
    const toolsDoc = yaml.load(readFileSync(join(REPO, "knowledge/mcp-tools.yaml"), "utf-8"));
    expect(checkCoherence(mcpJson, toolsDoc)).toEqual([]);
  });
});
