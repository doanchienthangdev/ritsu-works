// resolver-plan v1.0 (Sprint 3) — ResolverPlan v1 JSON Schema + plan-audit helper.
//
// Phase 1 analysis (what is under test — the DETERMINISTIC parts of Sprint 3):
//   A. knowledge/schemas/resolver-plan.schema.json — a draft-07 schema with a top-level
//      oneOf { single ResolverPlan | { plans:[...] } batch }. Branches to exercise:
//        single-vs-batch; every required key present/absent; each enum field
//        (schema_version const, ia_type_hint, authority, freshness, hitl_tier,
//        side_effect, no_coverage.reason); recipientId pattern (kind/slug); wrong types;
//        additionalProperties:false rejection; nullable grounding_ref/cost_bucket.
//   B. scripts/resolver-v2/plan-audit.cjs — pure helpers (no LLM, no DB):
//        governanceRequiresHitl(capabilityAxis): TRUE iff any item hitl_tier ∈ {B,C,D-Std,D-MAX}.
//          Branches: null/non-array → false; empty → false; all-A → false; one B+ → true;
//          unknown/missing tier → not-forcing.
//        planDecision(planOrBatch): maps to one of 4 audit `decision` enum values.
//          Branches: empty plans → no_match; no recipients → no_match; recipients + gap
//          → surface_candidates; recipients + no gap → dispatch_silently; batch normalization.
//        buildPlanAuditRow(args): assembles a row for ops.resolver_decisions.
//          Branches: missing args/plan/intent → throw; defaults (latency, role, normalized,
//          catalog_files_loaded); trigger truncation at 500; metadata counts; mode='A2';
//          plan_payload === plan; decision delegated to planDecision.
//   C. The governance-includes-HITL-when-B+ RULE encoded as a fixture check: the complete
//      valid fixture's governance_constraints MUST contain page/governance-HITL exactly
//      when governanceRequiresHitl(fixture.capability_axis) is true (contract 2N: the schema
//      fixture and the deterministic helper agree).
//
// NOT unit-tested here (documented): the SESSION-MODEL assembly itself (the skill reading
//   mcp__supabase-ops__resolver_find candidates and SELECTING/partitioning) — that is an LLM judgment,
//   not deterministic code. We test the schema it must satisfy + the deterministic helper
//   it calls. (Skipped: session-assembly — non-deterministic by design.)
//
// Phase 2 edge values: enum off-by-one (a near-miss value per enum), empty arrays on
//   required keys (allowed), missing required keys (rejected), wrong type per field,
//   recipientId boundary (bad kind, no slash, too short), 500-char trigger truncation,
//   null vs absent on optional nullable fields.

import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import type { ValidateFunction } from "ajv";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");

const SCHEMA_PATH = join(REPO, "knowledge/schemas/resolver-plan.schema.json");
const planAudit = cjsRequire(join(REPO, "scripts/resolver-v2/plan-audit.cjs"));
const {
  buildPlanAuditRow,
  governanceRequiresHitl,
  planDecision,
  plansOf,
  PLAN_AUDIT_MODE,
  HITL_GOVERNANCE_RECIPIENT,
  MAX_TRIGGER_LEN,
} = planAudit;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** A complete, valid single ResolverPlan with a side-effecting capability (so the
 *  B+ governance rule applies and page/governance-HITL is present). */
function completeValidPlan() {
  return {
    schema_version: "1.0",
    sub_need: "draft and send the weekly churn-reduction email to at-risk users",
    ia_type_hint: "C",
    primary_lens: ["persona/cgo"],
    content_axis: [
      {
        recipient: "metric/churn_rate_monthly",
        invoke:
          'mcp__supabase_ops__query against knowledge/kpi-ownership.yaml#churn_rate_monthly',
        authority: "SoR",
        freshness: "live",
        grounding_ref: "knowledge/kpi-ownership.yaml#churn_rate_monthly",
      },
      {
        recipient: "view/public-mv_customer_360",
        invoke:
          'mcp__supabase_ops__query({sql: "SELECT * FROM public.mv_customer_360 LIMIT 10"})',
        authority: "SoR",
        freshness: "hourly",
        grounding_ref: "supabase/migrations/00005_customer_entity.sql",
        columns_hint: ["customer_id", "email", "mrr"],
      },
    ],
    capability_axis: [
      {
        recipient: "skill/cost-report",
        invoke: 'Skill({skill:"cost-report"})',
        hitl_tier: "A",
        side_effect: "none",
        cost_bucket: null,
      },
      {
        // The side-effecting item — forces page/governance-HITL into governance_constraints.
        recipient: "sop/SOP-CUSTOMER-014-reactivation-email-on-7-day-silence",
        invoke:
          'Triggered by event subscriptions, or Read("05-customer/.../flow.yaml")',
        hitl_tier: "C",
        side_effect: "send",
      },
    ],
    governance_constraints: ["page/governance-HITL", "metric/churn_rate_monthly"],
    goal_metrics: ["metric/churn_rate_monthly"],
    no_coverage: [
      {
        facet: "per-user send-time optimization data",
        reason: "not_built",
        remedy: "build via /cla propose (send-time model not in catalog)",
      },
    ],
  };
}

/** A minimal valid plan: all REQUIRED keys present, all arrays empty, no optionals. */
function minimalValidPlan() {
  return {
    schema_version: "1.0",
    sub_need: "x",
    content_axis: [],
    capability_axis: [],
    governance_constraints: [],
    goal_metrics: [],
    no_coverage: [],
  };
}

// ---------------------------------------------------------------------------
// A. Schema validation
// ---------------------------------------------------------------------------

describe("resolver-plan.schema.json", () => {
  let validate: ValidateFunction;

  beforeAll(() => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    // strict:false matches scripts/validate-tier1.cjs; no ajv-formats needed (no `format`).
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  });

  describe("happy path", () => {
    it("accepts a complete valid single ResolverPlan", () => {
      const ok = validate(completeValidPlan());
      expect(validate.errors).toBeNull();
      expect(ok).toBe(true);
    });

    it("accepts a minimal valid plan (all required keys, empty arrays)", () => {
      expect(validate(minimalValidPlan())).toBe(true);
    });

    it("accepts the batch wrapper { plans: [...] }", () => {
      const batch = { plans: [completeValidPlan(), minimalValidPlan()] };
      const ok = validate(batch);
      expect(validate.errors).toBeNull();
      expect(ok).toBe(true);
    });

    it("accepts a content item with grounding_ref null and no columns_hint", () => {
      const p = minimalValidPlan();
      p.content_axis = [
        {
          recipient: "page/core-pricing",
          invoke: 'Read("00-core/pricing-philosophy.md")',
          authority: "SoR",
          freshness: "static",
          grounding_ref: null,
        },
      ] as any;
      expect(validate(p)).toBe(true);
    });
  });

  describe("missing required keys (rejected)", () => {
    const required = [
      "schema_version",
      "sub_need",
      "content_axis",
      "capability_axis",
      "governance_constraints",
      "goal_metrics",
      "no_coverage",
    ];
    for (const key of required) {
      it(`rejects a plan missing required key "${key}"`, () => {
        const p: Record<string, unknown> = completeValidPlan();
        delete p[key];
        expect(validate(p)).toBe(false);
      });
    }

    it("rejects a batch wrapper with no plans key", () => {
      expect(validate({ notplans: [] } as any)).toBe(false);
    });

    it("rejects a batch wrapper with an empty plans array (minItems 1)", () => {
      expect(validate({ plans: [] })).toBe(false);
    });
  });

  describe("bad enum / const values (rejected)", () => {
    it("rejects schema_version other than 1.0", () => {
      const p = completeValidPlan();
      (p as any).schema_version = "2.0";
      expect(validate(p)).toBe(false);
    });

    it("rejects an ia_type_hint outside A|B|C|D", () => {
      const p = completeValidPlan();
      (p as any).ia_type_hint = "E";
      expect(validate(p)).toBe(false);
    });

    it("rejects an invalid content authority", () => {
      const p = completeValidPlan();
      p.content_axis[0].authority = "trustme" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects an invalid content freshness", () => {
      const p = completeValidPlan();
      p.content_axis[0].freshness = "soon" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects an invalid capability hitl_tier", () => {
      const p = completeValidPlan();
      p.capability_axis[0].hitl_tier = "Z" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects an invalid capability side_effect", () => {
      const p = completeValidPlan();
      p.capability_axis[0].side_effect = "explode" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects a no_coverage reason outside the enum", () => {
      const p = completeValidPlan();
      p.no_coverage[0].reason = "dunno" as any;
      expect(validate(p)).toBe(false);
    });
  });

  describe("recipientId pattern (rejected)", () => {
    it("rejects a recipient with an unknown kind prefix", () => {
      const p = completeValidPlan();
      p.content_axis[0].recipient = "gadget/foo" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects a recipient with no slash separator", () => {
      const p = completeValidPlan();
      p.capability_axis[0].recipient = "costreport" as any;
      expect(validate(p)).toBe(false);
    });

    it("rejects a governance_constraints entry that is not a recipientId", () => {
      const p = completeValidPlan();
      p.governance_constraints = ["not a recipient"] as any;
      expect(validate(p)).toBe(false);
    });
  });

  describe("wrong types (rejected)", () => {
    it("rejects sub_need as a number", () => {
      const p = completeValidPlan();
      (p as any).sub_need = 42;
      expect(validate(p)).toBe(false);
    });

    it("rejects content_axis as an object instead of array", () => {
      const p = completeValidPlan();
      (p as any).content_axis = {};
      expect(validate(p)).toBe(false);
    });

    it("rejects a content item missing its required invoke", () => {
      const p = completeValidPlan();
      delete (p.content_axis[0] as any).invoke;
      expect(validate(p)).toBe(false);
    });

    it("rejects a capability item missing its required hitl_tier", () => {
      const p = completeValidPlan();
      delete (p.capability_axis[0] as any).hitl_tier;
      expect(validate(p)).toBe(false);
    });

    it("rejects an unknown extra property (additionalProperties:false)", () => {
      const p = completeValidPlan();
      (p as any).surprise = true;
      expect(validate(p)).toBe(false);
    });

    it("rejects an unknown extra property on a content item", () => {
      const p = completeValidPlan();
      (p.content_axis[0] as any).extra = 1;
      expect(validate(p)).toBe(false);
    });

    it("rejects an empty columns_hint array (minItems 1 when present)", () => {
      const p = completeValidPlan();
      (p.content_axis[1] as any).columns_hint = [];
      expect(validate(p)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// B. plan-audit.cjs deterministic helpers
// ---------------------------------------------------------------------------

describe("plan-audit.governanceRequiresHitl", () => {
  it("returns false for a null/undefined axis", () => {
    expect(governanceRequiresHitl(null)).toBe(false);
    expect(governanceRequiresHitl(undefined)).toBe(false);
  });

  it("returns false for a non-array", () => {
    expect(governanceRequiresHitl({} as any)).toBe(false);
  });

  it("returns false for an empty axis", () => {
    expect(governanceRequiresHitl([])).toBe(false);
  });

  it("returns false when every capability is Tier A", () => {
    expect(
      governanceRequiresHitl([
        { hitl_tier: "A" },
        { hitl_tier: "A" },
      ]),
    ).toBe(false);
  });

  it.each(["B", "C", "D-Std", "D-MAX"])(
    "returns true when any capability is tier %s",
    (tier) => {
      expect(
        governanceRequiresHitl([{ hitl_tier: "A" }, { hitl_tier: tier }]),
      ).toBe(true);
    },
  );

  it("treats a missing/unknown tier as NOT-forcing (not B+)", () => {
    expect(governanceRequiresHitl([{}, { hitl_tier: "A" }])).toBe(false);
    expect(governanceRequiresHitl([{ hitl_tier: "unknown" }])).toBe(false);
  });
});

describe("plan-audit.planDecision", () => {
  it("returns no_match for an empty batch", () => {
    expect(planDecision({ plans: [] })).toBe("no_match");
  });

  it("returns no_match when a single plan resolved zero recipients", () => {
    expect(planDecision(minimalValidPlan())).toBe("no_match");
  });

  it("returns dispatch_silently when recipients resolved and no gap", () => {
    const p = completeValidPlan();
    p.no_coverage = [];
    expect(planDecision(p)).toBe("dispatch_silently");
  });

  it("returns surface_candidates when recipients resolved BUT a gap remains", () => {
    expect(planDecision(completeValidPlan())).toBe("surface_candidates");
  });

  it("normalizes a batch: any plan with a recipient + any gap → surface_candidates", () => {
    const batch = { plans: [minimalValidPlan(), completeValidPlan()] };
    expect(planDecision(batch)).toBe("surface_candidates");
  });

  it("returns dispatch_silently for a batch where every plan is covered", () => {
    const a = completeValidPlan();
    a.no_coverage = [];
    const b = completeValidPlan();
    b.no_coverage = [];
    expect(planDecision({ plans: [a, b] })).toBe("dispatch_silently");
  });
});

describe("plan-audit.plansOf", () => {
  it("wraps a single plan into a one-element array", () => {
    const p = minimalValidPlan();
    expect(plansOf(p)).toEqual([p]);
  });

  it("returns the inner plans array for a batch", () => {
    const batch = { plans: [minimalValidPlan()] };
    expect(plansOf(batch)).toBe(batch.plans);
  });

  it("returns [] for null", () => {
    expect(plansOf(null)).toEqual([]);
  });
});

describe("plan-audit.buildPlanAuditRow", () => {
  it("throws when args is missing", () => {
    expect(() => buildPlanAuditRow(undefined)).toThrow(/args object is required/);
  });

  it("throws when plan is missing", () => {
    expect(() => buildPlanAuditRow({ intent: "x" })).toThrow(/`plan`.*required/);
  });

  it("throws when intent is missing or empty", () => {
    expect(() => buildPlanAuditRow({ plan: minimalValidPlan() })).toThrow(
      /`intent`.*required/,
    );
    expect(() =>
      buildPlanAuditRow({ plan: minimalValidPlan(), intent: "" }),
    ).toThrow(/`intent`.*required/);
  });

  it("builds a row with mode 'A2' and plan_payload === the plan", () => {
    const plan = completeValidPlan();
    const row = buildPlanAuditRow({
      plan,
      intent: plan.sub_need,
      callerRole: "founder",
      latencyMs: 123,
      findCalls: 1,
    });
    expect(row.mode).toBe(PLAN_AUDIT_MODE);
    expect(row.mode).toBe("A2");
    expect(row.plan_payload).toBe(plan);
    expect(row.caller_role).toBe("founder");
    expect(row.latency_ms).toBe(123);
    expect(row.matched_route_id).toBeNull();
    expect(row.confidence).toBeNull();
    expect(row.semantic_used).toBe(false);
  });

  it("sets decision from planDecision (surface_candidates for a plan with a gap)", () => {
    const plan = completeValidPlan();
    const row = buildPlanAuditRow({ plan, intent: plan.sub_need });
    expect(row.decision).toBe("surface_candidates");
  });

  it("derives trigger_normalized (lowercased, whitespace-collapsed) when not given", () => {
    const row = buildPlanAuditRow({
      plan: minimalValidPlan(),
      intent: "  Find  The   MRR  ",
    });
    expect(row.trigger_normalized).toBe("find the mrr");
  });

  it("defaults latency_ms to 0 (column is NOT NULL) and rounds fractional ms", () => {
    const zero = buildPlanAuditRow({ plan: minimalValidPlan(), intent: "x" });
    expect(zero.latency_ms).toBe(0);
    const rounded = buildPlanAuditRow({
      plan: minimalValidPlan(),
      intent: "x",
      latencyMs: 12.7,
    });
    expect(rounded.latency_ms).toBe(13);
  });

  it("defaults catalog_files_loaded to the find marker", () => {
    const row = buildPlanAuditRow({ plan: minimalValidPlan(), intent: "x" });
    expect(row.catalog_files_loaded).toEqual([
      "recipients/*.md (via mcp__supabase-ops__resolver_find)",
    ]);
  });

  it("records sub_need_count + no_coverage_count + find_calls in metadata", () => {
    const batch = { plans: [completeValidPlan(), minimalValidPlan()] };
    const row = buildPlanAuditRow({
      plan: batch,
      intent: "batch root intent",
      findCalls: 2,
    });
    expect(row.metadata.kind).toBe("resolver-plan");
    expect(row.metadata.sub_need_count).toBe(2);
    expect(row.metadata.no_coverage_count).toBe(1); // complete plan has 1 gap, minimal has 0
    expect(row.metadata.find_calls).toBe(2);
  });

  it("truncates an over-long trigger to MAX_TRIGGER_LEN", () => {
    const longIntent = "a".repeat(MAX_TRIGGER_LEN + 250);
    const row = buildPlanAuditRow({ plan: minimalValidPlan(), intent: longIntent });
    expect(row.trigger.length).toBe(MAX_TRIGGER_LEN);
  });

  it("produces a decision that is one of the audit CHECK enum values", () => {
    const valid = new Set([
      "dispatch_silently",
      "surface_candidates",
      "no_match",
      "role_denied",
    ]);
    for (const plan of [completeValidPlan(), minimalValidPlan()]) {
      const row = buildPlanAuditRow({ plan, intent: "x" });
      expect(valid.has(row.decision)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// C. Contract: schema fixture ⇆ deterministic governance rule agree
// ---------------------------------------------------------------------------

describe("contract: governance-includes-HITL-when-B+ (fixture ⇆ helper)", () => {
  let validate: ValidateFunction;
  beforeAll(() => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  });

  it("the complete fixture has a B+ capability AND includes page/governance-HITL", () => {
    const p = completeValidPlan();
    // The fixture is schema-valid...
    expect(validate(p)).toBe(true);
    // ...its capability axis IS side-effecting (tier C send)...
    expect(governanceRequiresHitl(p.capability_axis)).toBe(true);
    // ...so the load-bearing rule REQUIRES page/governance-HITL in governance_constraints.
    expect(p.governance_constraints).toContain(HITL_GOVERNANCE_RECIPIENT);
  });

  it("a plan whose capability axis is all Tier-A need NOT include page/governance-HITL", () => {
    const p = completeValidPlan();
    // Drop the side-effecting SOP, keep only the Tier-A skill.
    p.capability_axis = p.capability_axis.filter((c) => c.hitl_tier === "A");
    p.governance_constraints = []; // allowed: no B+ capability → no HITL gate required
    expect(validate(p)).toBe(true);
    expect(governanceRequiresHitl(p.capability_axis)).toBe(false);
  });
});
