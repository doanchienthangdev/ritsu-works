// All-Edge-Cases tests for scripts/cross-tier/validate-operators.cjs (validateOperators core).
//
// Phase 1 — Analysis: validateOperators(operatorsDoc, tiersDoc) -> {ok, errors[]}.
// Pure (no I/O). Branches: doc-not-object, missing version, operators-not-array,
// per-operator shape (email/tier/status/added_by/added_at/github_login), dup email
// (case-insensitive), secret canary, added_by-is-owner (+ genesis exception),
// ≥1 active owner. Fail-closed: any violation → ok:false.

import { describe, it, expect } from "vitest";
import { validateOperators, VALID_STATUSES } from "../../scripts/cross-tier/validate-operators.cjs";

const TIERS = { tiers: { user: {}, admin: {}, owner: {} } };
const owner = (over = {}) => ({ email: "o@x.com", tier: "owner", status: "active", added_by: "o@x.com", added_at: "2026-06-24", ...over });
const admin = (over = {}) => ({ email: "a@x.com", tier: "admin", status: "active", added_by: "o@x.com", added_at: "2026-06-24", ...over });
const doc = (ops: any[], over = {}) => ({ version: "1.0.0", operators: ops, ...over });

describe("validateOperators", () => {
  describe("happy path", () => {
    it("a single genesis owner is valid", () => {
      const r = validateOperators(doc([owner()]), TIERS);
      expect(r.ok).toBe(true);
      expect(r.errors).toStrictEqual([]);
    });
    it("owner + admin (added_by the owner) is valid", () => {
      const r = validateOperators(doc([owner(), admin()]), TIERS);
      expect(r.ok).toBe(true);
    });
    it("multiple active owners are valid", () => {
      const r = validateOperators(doc([owner(), owner({ email: "o2@x.com", added_by: "o@x.com" })]), TIERS);
      expect(r.ok).toBe(true);
    });
    it("derives valid tiers from tiersDoc (custom tier set)", () => {
      const r = validateOperators(doc([owner()]), { tiers: { user: {}, admin: {}, owner: {}, superowner: {} } });
      expect(r.ok).toBe(true);
    });
    it("falls back to default tiers when tiersDoc is null", () => {
      const r = validateOperators(doc([owner()]), null);
      expect(r.ok).toBe(true);
    });
  });

  describe("root-of-trust invariant (≥1 active owner)", () => {
    it("empty operators array → fail (no active owner)", () => {
      const r = validateOperators(doc([]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/active owner/i);
    });
    it("only admin/user (no owner) → fail", () => {
      const r = validateOperators(doc([admin(), { email: "u@x.com", tier: "user", status: "active", added_by: "o@x.com", added_at: "2026-06-24" }]), TIERS);
      // admin's added_by 'o@x.com' is not an owner here either, but the active-owner check must fire
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/active owner/i);
    });
    it("owner present but status=invited → fail (not ACTIVE)", () => {
      const r = validateOperators(doc([owner({ status: "invited" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/active owner/i);
    });
    it("owner revoked → fail", () => {
      const r = validateOperators(doc([owner({ status: "revoked" })]), TIERS);
      expect(r.ok).toBe(false);
    });
  });

  describe("per-operator shape", () => {
    it("missing email → error", () => {
      const r = validateOperators(doc([owner(), { tier: "admin", status: "active", added_by: "o@x.com", added_at: "2026-06-24" }]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/missing\/invalid `email`/);
    });
    it("unknown tier → error", () => {
      const r = validateOperators(doc([owner(), admin({ tier: "superuser" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/unknown tier "superuser"/);
    });
    it("unknown status → error", () => {
      const r = validateOperators(doc([owner({ status: "active" }), admin({ status: "pending" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/unknown status "pending"/);
    });
    it("every VALID_STATUSES value is accepted shape-wise", () => {
      for (const s of VALID_STATUSES) {
        const r = validateOperators(doc([owner(), admin({ email: `a-${s}@x.com`, status: s })]), TIERS);
        // shape ok for the admin; overall ok depends only on the active owner (present)
        expect(r.errors.join(" ")).not.toMatch(/unknown status/);
      }
    });
    it("missing added_by → error", () => {
      const r = validateOperators(doc([owner(), admin({ added_by: undefined })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/missing `added_by`/);
    });
    it("missing added_at → error", () => {
      const r = validateOperators(doc([owner({ added_at: "" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/missing `added_at`/);
    });
    it("non-string github_login → error", () => {
      const r = validateOperators(doc([owner({ github_login: 123 as any })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/github_login` must be a string/);
    });
    it("a non-object operator entry → error", () => {
      const r = validateOperators(doc([owner(), "nope" as any]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/is not an object/);
    });
  });

  describe("duplicate email (case-insensitive)", () => {
    it("A@x.com and a@x.com → duplicate error", () => {
      const r = validateOperators(doc([owner({ email: "A@x.com" }), admin({ email: "a@x.com" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/duplicate email/i);
    });
    it("whitespace + case both normalized for dedup", () => {
      const r = validateOperators(doc([owner({ email: " O@x.com " }), admin({ email: "o@x.com" })]), TIERS);
      expect(r.errors.join(" ")).toMatch(/duplicate email/i);
    });
  });

  describe("added_by must be an owner (genesis exception)", () => {
    it("genesis self-root (added_by===email, tier owner) is allowed", () => {
      const r = validateOperators(doc([owner({ email: "g@x.com", added_by: "g@x.com" })]), TIERS);
      expect(r.ok).toBe(true);
    });
    it("admin added_by a non-owner email → error", () => {
      const r = validateOperators(doc([owner(), admin({ added_by: "random@x.com" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/is not an owner in this registry/);
    });
    it("admin added_by an actual owner → ok", () => {
      const r = validateOperators(doc([owner({ email: "boss@x.com", added_by: "boss@x.com" }), admin({ added_by: "BOSS@x.com" })]), TIERS);
      expect(r.ok).toBe(true); // case-insensitive owner match
    });
    it("a non-owner cannot self-root (added_by===email but tier=admin) → error", () => {
      const r = validateOperators(doc([owner(), admin({ email: "self@x.com", added_by: "self@x.com" })]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/is not an owner/);
    });
  });

  describe("secret canary (no credentials in the registry)", () => {
    // Fake values are hyphenated so they trip the registry's \S{12,} canary but
    // NOT the husky pre-commit's [a-zA-Z0-9]{20,} consecutive-run secret detector.
    it("a token-looking value → error", () => {
      const r = validateOperators(doc([owner({ token: "tok-aaaa-bbbb-cccc-dddd" } as any)]), TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/looks like it contains a secret/);
    });
    it("a password field with a long value → error", () => {
      const r = validateOperators(doc([owner({ password: "pw-aaaa-bbbb-cccc-dd" } as any)]), TIERS);
      expect(r.ok).toBe(false);
    });
    it("a short benign note does NOT trip the canary", () => {
      const r = validateOperators(doc([owner({ note: "founder" })]), TIERS);
      expect(r.ok).toBe(true);
    });
  });

  describe("malformed top-level input", () => {
    it("null doc → fail", () => {
      const r = validateOperators(null as any, TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/did not parse to an object/);
    });
    it("operators not an array → fail", () => {
      const r = validateOperators({ version: "1.0.0", operators: {} as any }, TIERS);
      expect(r.ok).toBe(false);
      expect(r.errors.join(" ")).toMatch(/must be an array/);
    });
    it("missing version → flagged (but still validates operators)", () => {
      const r = validateOperators({ operators: [owner()] } as any, TIERS);
      expect(r.errors.join(" ")).toMatch(/missing\/invalid `version`/);
    });
  });
});
