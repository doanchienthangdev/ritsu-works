// resolver-plan v1.0 (Sprint 5) — find → plan CONTRACT-BOUNDARY consolidation.
//
// Why this test exists (the one genuine gap after S1-S4):
//   resolver-plan-schema.test.ts validates the ResolverPlan schema against
//   HAND-CRAFTED fixtures. resolver-find-axis.test.ts validates the find tool's
//   output. Neither crosses the SEAM between them: that a REAL mcp__resolver__find
//   match — with its deterministic `axis` + enrichment fields (S2) — partitioned
//   by the rule the resolver-plan skill documents (SKILL.md §Algorithm step 2:
//   axis==="content" → contentItem, axis==="capability" → capabilityItem), yields
//   items that satisfy the schema's contentItem/capabilityItem shapes (S3), and
//   that the plan-audit governance helper's B+ rule (S3) keeps the assembled plan
//   schema-valid. This is the All-Edge-Cases "Contract Boundaries (2N)" case:
//   the consumer (resolver-plan) reads the producer's (resolver_find) output, so
//   the test MUST drive the REAL upstream function, not a hand-mocked match.
//
// Subjects under test (all DETERMINISTIC — no LLM, no DB):
//   - upstream: handleResolverFind (real, mcp-server/src/tools/resolver-find.ts)
//   - the partition contract: find match (axis+enrichment) → schema axis-item
//   - downstream deterministic helpers: plan-audit.cjs governanceRequiresHitl +
//     buildPlanAuditRow (the parts of the resolver-plan skill that are CODE)
//   - the schema: knowledge/schemas/resolver-plan.schema.json (Ajv compile)
//
// NOT tested here (documented elsewhere / by design):
//   - the SESSION-MODEL SELECTION inside the skill (which candidates to keep, the
//     goal_metrics/primary_lens picks) — an LLM judgment, non-deterministic.
//     Skipped: session-assembly — covered conceptually by SKILL.md, not code.
//   The DETERMINISTIC mechanical transform (partition by the surfaced `axis` +
//   carry the enrichment fields the schema requires) IS deterministic and is what
//   this test pins.

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import type { ValidateFunction } from "ajv";
import {
  handleResolverFind,
  _resetSessionLimits,
} from "../../mcp-server/src/tools/resolver-find.ts";
import type { CallerContext } from "../../mcp-server/src/types.ts";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");

const SCHEMA_PATH = join(REPO, "knowledge/schemas/resolver-plan.schema.json");
const planAudit = cjsRequire(join(REPO, "scripts/resolver-v2/plan-audit.cjs"));
const { governanceRequiresHitl, buildPlanAuditRow, HITL_GOVERNANCE_RECIPIENT } =
  planAudit;

const FOUNDER_CTX: CallerContext = {
  role: "founder",
  sessionId: "test-find-to-plan",
  hitlMaxTier: "D-MAX",
} as any;

// Same stub Supabase surface the find-axis suite uses — no real DB.
function makeStubClient(): any {
  const inserted: any[] = [];
  return {
    _inserted: inserted,
    schema: (s: string) => ({
      from: (table: string) => ({
        insert: (payload: any) => ({
          select: (cols: string) => ({
            single: async () => {
              inserted.push({ table, schema: s, payload, cols });
              return {
                data: { run_id: "test-audit-id-" + inserted.length },
                error: null,
              };
            },
          }),
        }),
        select: (_cols: string) => ({
          in: (_col: string, _vals: string[]) => ({
            gte: (_c: string, _v: string) => ({
              order: (_c2: string, _opts: any) => ({
                limit: async (_n: number) => ({ data: [], error: null }),
              }),
            }),
          }),
          eq: () => ({ count: 0, data: [], error: null }),
          is: () => ({ data: [], error: null }),
        }),
      }),
    }),
  };
}

type Match = Record<string, unknown>;
function matchesOf(r: any): Match[] {
  return (r.output as any).matches as Match[];
}

/**
 * The DETERMINISTIC core of the resolver-plan skill's algorithm step 2:
 * partition real find matches into the two schema axis-items by their surfaced
 * `axis`, carrying exactly the enrichment fields the schema requires. This is
 * the mechanical transform the skill performs before any session-model selection.
 * Mirrors SKILL.md §Algorithm step 2 + the contentItem/capabilityItem shapes.
 */
function partitionMatchesToAxes(matches: Match[]): {
  content_axis: any[];
  capability_axis: any[];
} {
  const content_axis: any[] = [];
  const capability_axis: any[] = [];
  for (const m of matches) {
    if (m.axis === "content") {
      const item: any = {
        recipient: m.id,
        invoke: m.invoke,
        authority: m.authority,
        freshness: m.freshness,
      };
      // grounding_ref is nullable+optional; columns_hint optional with minItems 1.
      if (m.grounding_ref !== undefined) item.grounding_ref = m.grounding_ref;
      if (Array.isArray(m.columns_hint) && (m.columns_hint as string[]).length > 0) {
        item.columns_hint = m.columns_hint;
      }
      content_axis.push(item);
    } else if (m.axis === "capability") {
      const item: any = {
        recipient: m.id,
        invoke: m.invoke,
        hitl_tier: m.hitl_tier,
        side_effect: m.side_effect,
      };
      if (m.cost_bucket !== undefined) item.cost_bucket = m.cost_bucket;
      capability_axis.push(item);
    }
    // axis === "meta" → neither read nor run; intentionally dropped (SKILL.md step 2).
  }
  return { content_axis, capability_axis };
}

/** Assemble the deterministic skeleton of a ResolverPlan from real find output.
 *  governance_constraints is filled by the SAME helper the skill uses, so the
 *  schema-valid plan and the audit decision agree (contract 2N closure). */
function assemblePlanFromMatches(subNeed: string, matches: Match[]): any {
  const { content_axis, capability_axis } = partitionMatchesToAxes(matches);
  const governance_constraints = governanceRequiresHitl(capability_axis)
    ? [HITL_GOVERNANCE_RECIPIENT]
    : [];
  return {
    schema_version: "1.0",
    sub_need: subNeed,
    content_axis,
    capability_axis,
    governance_constraints,
    goal_metrics: [], // session-model populated downstream; empty is schema-valid
    no_coverage: [], // honest gaps are session-model populated; empty is schema-valid
  };
}

describe("find → plan contract boundary (2N): real find output assembles a schema-valid plan", () => {
  let validate: ValidateFunction;

  beforeAll(() => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    // strict:false mirrors validate-tier1.cjs + resolver-plan-schema.test.ts.
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  });

  beforeEach(() => _resetSessionLimits());

  it("partitions a REAL content-axis find result into schema-valid contentItems", async () => {
    const r = await handleResolverFind(
      { intent: "pricing kpi metric customer", axis: "content" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0); // real content recipients exist

    const plan = assemblePlanFromMatches("what is our pricing + key customer KPIs?", matches);
    // Every content match landed in content_axis; none in capability_axis.
    expect(plan.content_axis.length).toBe(matches.length);
    expect(plan.capability_axis).toEqual([]);
    // The assembled plan (built from REAL enrichment fields) is schema-valid.
    const ok = validate(plan);
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });

  it("partitions a REAL capability-axis find result into schema-valid capabilityItems", async () => {
    const r = await handleResolverFind(
      { intent: "cost report review onboarding", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);

    const plan = assemblePlanFromMatches("run the cost report", matches);
    expect(plan.capability_axis.length).toBe(matches.length);
    expect(plan.content_axis).toEqual([]);
    expect(validate(plan)).toBe(true);
  });

  it("a mixed (unfiltered) find result assembles into a schema-valid two-axis plan", async () => {
    const r = await handleResolverFind(
      { intent: "pricing cost report customer onboarding metric" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);

    const plan = assemblePlanFromMatches(
      "what's our pricing, and run the cost report",
      matches,
    );
    // content + capability items account for every non-meta match.
    const nonMeta = matches.filter((m) => m.axis !== "meta").length;
    expect(plan.content_axis.length + plan.capability_axis.length).toBe(nonMeta);
    expect(validate(plan)).toBe(true);
  });

  it("REAL view match's grounding_ref + columns_hint survive into a schema-valid contentItem", async () => {
    // At least one real view carries grounding_ref + columns_hint (S2 rename test).
    const r = await handleResolverFind(
      {
        intent: "cost daily view gbrain capability lineage customer",
        kind: "view",
      },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    const withCols = matches.find((m) => Array.isArray((m as any).columns_hint));
    expect(withCols).toBeDefined(); // a real columns-bearing view exists

    const plan = assemblePlanFromMatches("read the cost-daily view", matches);
    expect(validate(plan)).toBe(true);
    // The columns_hint round-tripped intact into the plan's content item.
    const planned = plan.content_axis.find(
      (c: any) => c.recipient === (withCols as any).id,
    );
    expect(planned).toBeDefined();
    expect(planned.columns_hint).toEqual((withCols as any).columns_hint);
    expect(typeof planned.grounding_ref).toBe("string");
  });

  it("plan-audit row built from a real-derived plan carries mode 'A2' + the plan as plan_payload", async () => {
    const r = await handleResolverFind(
      { intent: "cost report", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    const plan = assemblePlanFromMatches("run the cost report", matches);

    const row = buildPlanAuditRow({
      plan,
      intent: plan.sub_need,
      callerRole: "founder",
      latencyMs: 42,
      findCalls: 1,
    });
    // The plan-audit discriminator the migration 00044 repair enables: mode='A2'
    // AND plan_payload IS NOT NULL. (Pre-repair this insert silently failed —
    // char(1) overflow. The round-trip persistence is asserted in the find suite.)
    expect(row.mode).toBe("A2");
    expect(row.plan_payload).toBe(plan);
    expect(row.metadata.kind).toBe("resolver-plan");
    expect(row.metadata.find_calls).toBe(1);
  });
});

describe("find → plan contract boundary: governance B+ rule holds end-to-end on real output", () => {
  let validate: ValidateFunction;
  beforeAll(() => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  });
  beforeEach(() => _resetSessionLimits());

  it("INV-2: whenever a real capability axis is B+, page/governance-HITL is in governance_constraints", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding customer reactivation support", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);

    const plan = assemblePlanFromMatches("handle an at-risk customer", matches);
    expect(validate(plan)).toBe(true);

    // The load-bearing safety invariant: the assembled governance_constraints
    // agrees EXACTLY with the deterministic helper on REAL capability output.
    if (governanceRequiresHitl(plan.capability_axis)) {
      expect(plan.governance_constraints).toContain(HITL_GOVERNANCE_RECIPIENT);
    } else {
      expect(plan.governance_constraints).not.toContain(HITL_GOVERNANCE_RECIPIENT);
    }
  });

  it("a real all-Tier-A capability axis does NOT force page/governance-HITL", async () => {
    // cost-report is Tier A (read/compute) — a pure-A capability plan needs no HITL gate.
    const r = await handleResolverFind(
      { intent: "cost report budget spend", axis: "capability", kind: "skill" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    const aOnly = matches.filter((m) => m.hitl_tier === "A");
    // Build a plan from ONLY the Tier-A subset (the deterministic auto-runnable slice).
    const plan = assemblePlanFromMatches("run the cost report", aOnly);
    expect(validate(plan)).toBe(true);
    expect(governanceRequiresHitl(plan.capability_axis)).toBe(false);
    expect(plan.governance_constraints).toEqual([]);
  });
});
