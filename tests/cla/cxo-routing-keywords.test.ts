// CLA Phase 2 (domain-analyst) auto-routes to a CxO based on keyword scan
// against knowledge/cla-routing-keywords.yaml. This test exercises the
// scan algorithm directly so we don't depend on LLM behavior.
//
// The scan logic is reproduced inline (it's small + deterministic). If the
// skill's spec changes the algorithm, this test must also change — that's
// the point.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

interface Route {
  keywords: string[];
  cxo: string;
  fallback_role: string;
  notes?: string;
}

interface RoutingConfig {
  version: string;
  routes: Record<string, Route>;
  ambiguous_fallback: string;
}

const REPO = resolve(__dirname, "..", "..");
const ROUTING_PATH = join(REPO, "knowledge", "cla-routing-keywords.yaml");

let config: RoutingConfig;

beforeAll(() => {
  const text = readFileSync(ROUTING_PATH, "utf8");
  config = yaml.load(text) as RoutingConfig;
});

// Mirror the scan algorithm spec'd in domain-analyst/SKILL.md.
function scan(problemText: string, cfg: RoutingConfig): {
  matches: Record<string, string[]>;
  decision: { kind: "single"; domain: string } | { kind: "ambiguous"; reason: string };
} {
  const lower = problemText.toLowerCase();
  const matches: Record<string, string[]> = {};
  for (const [domain, route] of Object.entries(cfg.routes)) {
    const hits: string[] = [];
    for (const kw of route.keywords) {
      if (lower.includes(kw.toLowerCase())) hits.push(kw);
    }
    if (hits.length) matches[domain] = hits;
  }
  const domains = Object.keys(matches);
  if (domains.length === 0) return { matches, decision: { kind: "ambiguous", reason: "no_match" } };
  if (domains.length === 1) return { matches, decision: { kind: "single", domain: domains[0] } };

  // Multiple matches: pick max-hit; if tied, ambiguous.
  const sorted = domains.sort((a, b) => matches[b].length - matches[a].length);
  if (matches[sorted[0]].length > matches[sorted[1]].length) {
    return { matches, decision: { kind: "single", domain: sorted[0] } };
  }
  return { matches, decision: { kind: "ambiguous", reason: "tie" } };
}

describe("CLA routing keyword scan", () => {
  it("yaml loads with the expected top-level shape", () => {
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.routes).toBeTypeOf("object");
    expect(config.ambiguous_fallback).toBe("muse_panel");
  });

  it("declares all 9 v1.0 routes", () => {
    const expected = [
      "growth",
      "product",
      "code",
      "customer",
      "marketing",
      "sales",
      "metrics",
      "finance",
      "trust_safety",
    ];
    for (const r of expected) {
      expect(config.routes[r]).toBeDefined();
    }
  });

  it("routes growth-flavored problem to cgo", () => {
    const r = scan("I need to acquire 10 new customers per day from the funnel.", config);
    expect(r.decision).toEqual({ kind: "single", domain: "growth" });
    expect(config.routes[(r.decision as { domain: string }).domain].cxo).toBe("cgo");
  });

  it("routes a product wedge problem to cpo", () => {
    const r = scan("Observed a stranger using the PRD's wedge feature; user interview shows...", config);
    expect(r.decision).toEqual({ kind: "single", domain: "product" });
    expect(config.routes[(r.decision as { domain: string }).domain].cxo).toBe("cpo");
  });

  it("routes a code/migration problem to cto", () => {
    const r = scan("Need to add a new MCP server and a schema migration for hooks.", config);
    expect(r.decision).toEqual({ kind: "single", domain: "code" });
    expect(config.routes[(r.decision as { domain: string }).domain].cxo).toBe("cto");
  });

  it("routes a finance/runway problem to cfo (with backoffice-clerk fallback)", () => {
    const r = scan("Cost concern: monthly invoice growing, runway impact.", config);
    expect(r.decision).toEqual({ kind: "single", domain: "finance" });
    expect(config.routes["finance"].cxo).toBe("cfo");
    expect(config.routes["finance"].fallback_role).toBe("backoffice-clerk");
  });

  it("falls back to muse_panel on no match", () => {
    // Avoid words that contain any keyword as substring; in v1.0 the scan
    // is case-insensitive substring match — so e.g. "problem" would match
    // the "PR" keyword (code route). Pick neutral words.
    const r = scan("Empty placeholder text without any tagged words.", config);
    expect(r.decision).toEqual({ kind: "ambiguous", reason: "no_match" });
  });

  it("falls back to muse_panel on tied matches", () => {
    // Pick keywords from two different routes with equal hit count.
    // 'feature' (product) + 'campaign' (marketing) → 1 hit each → tie.
    const r = scan("Plan a feature for the launch campaign.", config);
    expect(r.decision).toEqual({ kind: "ambiguous", reason: "tie" });
  });

  it("max-hit wins when match counts differ", () => {
    // Two product hits + one finance hit → product wins.
    const r = scan("The PRD describes a feature for the wedge; small revenue impact.", config);
    expect(r.decision).toEqual({ kind: "single", domain: "product" });
  });
});
