// Tests for the analytics consumer role allowlist (default-deny).
//
// Phase 1: isRoleAllowedAnalytics(role) — Set membership, pure.
// Phase 2: every allowed role; representative denied roles; case sensitivity;
//   empty/garbage. The allowlist is the coarse per-capability gate on top of
//   the SELECT-only DB role.

import { describe, it, expect } from "vitest";
import {
  isRoleAllowedAnalytics,
  ANALYTICS_ALLOWED_ROLES,
} from "../../mcp-server-analytics/src/governance/role-allowlist.ts";

describe("isRoleAllowedAnalytics", () => {
  describe("allowed (spec C1 start set)", () => {
    for (const r of [
      "founder",
      "cofounder",
      "customer-lead",
      "product-orchestrator",
      "gtm-orchestrator",
      "feedback-aggregator",
    ]) {
      it(`allows ${r}`, () => expect(isRoleAllowedAnalytics(r)).toBe(true));
    }
    it("the allowlist set has exactly the 6 start roles", () => {
      expect(ANALYTICS_ALLOWED_ROLES.size).toBe(6);
    });
  });

  describe("denied (default-deny)", () => {
    for (const r of [
      "gps",
      "etl-runner",
      "content-drafter",
      "support-agent",
      "code-reviewer",
      "trust-safety",
      "backoffice-clerk",
      "metrics-curator",
      "unknown-role",
      "",
    ]) {
      it(`denies ${r || "(empty)"}`, () => expect(isRoleAllowedAnalytics(r)).toBe(false));
    }
  });

  describe("case sensitivity", () => {
    it("is case-sensitive (Founder ≠ founder)", () => {
      expect(isRoleAllowedAnalytics("Founder")).toBe(false);
      expect(isRoleAllowedAnalytics("CUSTOMER-LEAD")).toBe(false);
    });
  });
});
