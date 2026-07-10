// Pins knowledge/analytics-sync-contract.yaml `per_human_tier_gate.denial_reasons`
// set-equal to the runtime ANALYTICS_DENIAL_REASONS constant.
//
// Why this exists: the yaml is a GOVERNANCE contract — operators and auditors read it to
// learn every way analytics can deny them. Before this test, it claimed to be "pinned by
// the invariant tests" and to be sourced from `CredentialReason`. Both claims were false:
// nothing read the yaml, it listed `tier_not_permitted` (which is not a CredentialReason)
// and omitted `role_not_allowlisted`. A contract that documents a security gate must not
// be able to drift from the gate in silence.
//
// Layering: TypeScript already forces ANALYTICS_DENIAL_REASONS to equal the
// AnalyticsDenialReason union (the AssertEqual in role-allowlist.ts). This test closes the
// remaining edge — code ↔ yaml — so the chain is union → constant → contract.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANALYTICS_DENIAL_REASONS } from "../src/governance/role-allowlist.ts";

const CONTRACT = resolve(__dirname, "..", "..", "knowledge", "analytics-sync-contract.yaml");

/**
 * Pull the `denial_reasons:` list items. Hand-parsed rather than pulling in js-yaml, which
 * this package does not depend on. Stops at the first line that is neither a list item nor
 * a comment nor blank — i.e. at the next key.
 */
function denialReasonsFromContract(yaml: string): string[] {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^\s*denial_reasons:\s*$/.test(l));
  if (start === -1) throw new Error("`denial_reasons:` key not found in the contract");

  const out: string[] = [];
  for (const raw of lines.slice(start + 1)) {
    if (/^\s*(#.*)?$/.test(raw)) continue; // blank or comment
    const item = raw.match(/^\s*-\s*([A-Za-z0-9_]+)/);
    if (!item) break; // next key → list is over
    out.push(item[1]);
  }
  return out;
}

describe("analytics-sync-contract.yaml ↔ ANALYTICS_DENIAL_REASONS", () => {
  const documented = denialReasonsFromContract(readFileSync(CONTRACT, "utf8"));

  it("parses a non-trivial list out of the contract", () => {
    // Guards the parser itself: a silent [] would make every assertion below vacuous.
    expect(documented.length).toBeGreaterThanOrEqual(10);
  });

  it("documents exactly the reasons the code can emit — no more, no less", () => {
    expect([...documented].sort()).toEqual([...ANALYTICS_DENIAL_REASONS].sort());
  });

  it("never documents `ok` — it is a CredentialReason but never a denial", () => {
    expect(documented).not.toContain("ok");
  });

  it("lists each reason once", () => {
    expect(new Set(documented).size).toBe(documented.length);
  });
});
