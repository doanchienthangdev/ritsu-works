// Tests for scripts/resolver-v3/mcp-runtime-reconcile.cjs pure helpers.
// The spawn/JSON-RPC path needs live servers (covered by the L3 cron + a manual
// run); here we test the deterministic, side-effect-free core.
//
// Phase 1 analysis:
//   expandEnvValue(val, baseEnv): replaces ${VAR} and ${VAR:-default}; non-string
//     returned as-is; unset-no-default → "". Branches: literal, ${VAR} set/unset,
//     ${VAR:-def} set/unset, empty-string-set treated as unset, mixed text.
//   reconcileServer(server, liveNames[], catalogued[{id,status}]): set diff →
//     {missing_from_catalog, misnamed (id == server__liveName), extra_in_catalog, clean}.
//     Branches: clean match; double-prefix → misnamed + missing; genuine extra;
//     missing-only; empty on both sides.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const { expandEnvValue, reconcileServer } = cjsRequire(
  join(REPO, "scripts/resolver-v3/mcp-runtime-reconcile.cjs"),
);

describe("expandEnvValue", () => {
  it("returns a literal unchanged", () => {
    expect(expandEnvValue("hello", {})).toBe("hello");
  });
  it("expands ${VAR} when set", () => {
    expect(expandEnvValue("${ROLE}", { ROLE: "founder" })).toBe("founder");
  });
  it("expands ${VAR} to empty when unset and no default", () => {
    expect(expandEnvValue("${MISSING}", {})).toBe("");
  });
  it("uses default for ${VAR:-default} when unset", () => {
    expect(expandEnvValue("${ROLE:-gps}", {})).toBe("gps");
  });
  it("prefers the set value over the default", () => {
    expect(expandEnvValue("${ROLE:-gps}", { ROLE: "founder" })).toBe("founder");
  });
  it("treats an empty-string env value as unset (falls to default)", () => {
    expect(expandEnvValue("${ROLE:-gps}", { ROLE: "" })).toBe("gps");
  });
  it("interpolates within surrounding text", () => {
    expect(expandEnvValue("gbrain.${MCP_CALLER_ROLE:-gps}", {})).toBe("gbrain.gps");
  });
  it("returns non-string input as-is", () => {
    expect(expandEnvValue(42 as unknown as string, {})).toBe(42);
  });
});

describe("reconcileServer", () => {
  it("clean when live names match bare catalog ids exactly", () => {
    const r = reconcileServer("gbrain", ["search", "put_page"], [
      { id: "search", status: "live" },
      { id: "put_page", status: "live" },
    ]);
    expect(r.clean).toBe(true);
    expect(r.missing_from_catalog).toEqual([]);
    expect(r.misnamed).toEqual([]);
    expect(r.extra_in_catalog).toEqual([]);
  });

  it("double-prefixed catalog id → misnamed (with rename hint) AND the bare name is missing", () => {
    const r = reconcileServer("gbrain", ["search"], [{ id: "gbrain__search", status: "planned" }]);
    expect(r.clean).toBe(false);
    expect(r.missing_from_catalog).toContain("search");
    expect(r.misnamed).toEqual([{ have: "gbrain__search", shouldBe: "search" }]);
    expect(r.extra_in_catalog).toEqual([]);
  });

  it("catalog id with no live counterpart and not a double-prefix → extra", () => {
    const r = reconcileServer("gbrain", ["search"], [
      { id: "search", status: "live" },
      { id: "update_page", status: "planned" }, // phantom: not live, not gbrain__<live>
    ]);
    expect(r.extra_in_catalog).toEqual(["update_page"]);
    expect(r.misnamed).toEqual([]);
    expect(r.missing_from_catalog).toEqual([]);
    expect(r.clean).toBe(false);
  });

  it("live tool absent from catalog → missing", () => {
    const r = reconcileServer("gbrain", ["search", "recall"], [{ id: "search", status: "live" }]);
    expect(r.missing_from_catalog).toEqual(["recall"]);
    expect(r.clean).toBe(false);
  });

  it("empty on both sides is clean", () => {
    const r = reconcileServer("gbrain", [], []);
    expect(r.clean).toBe(true);
    expect(r.live_count).toBe(0);
    expect(r.catalog_count).toBe(0);
  });

  it("reports accurate live/catalog counts", () => {
    const r = reconcileServer("supabase-ops", ["query", "insert"], [
      { id: "query", status: "live" },
      { id: "insert", status: "live" },
    ]);
    expect(r.live_count).toBe(2);
    expect(r.catalog_count).toBe(2);
  });
});
