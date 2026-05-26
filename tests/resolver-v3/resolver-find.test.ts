import { describe, it, expect, beforeEach } from "vitest";
import { handleResolverFind, _resetSessionLimits } from "../../mcp-server/src/tools/resolver-find.ts";
import type { CallerContext, ToolResult } from "../../mcp-server/src/types.ts";

// Stub Supabase client — minimal surface to satisfy resolver-find's needs.
// Returns empty data for all queries (no actual DB call in unit tests).
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
              return { data: { run_id: "test-audit-id-" + inserted.length }, error: null };
            },
          }),
        }),
        select: (cols: string, opts?: any) => ({
          in: (col: string, vals: string[]) => ({
            gte: (c: string, v: string) => ({
              order: (c: string, opts: any) => ({
                limit: async (n: number) => {
                  return { data: [], error: null };
                },
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

const FOUNDER_CTX: CallerContext = {
  role: "founder",
  sessionId: "test-session-founder",
  hitlMaxTier: "D-MAX",
  canReadOps: true,
  canReadMetrics: true,
  canReadPublic: true,
  tier2WritesAllowed: {} as any,
} as any;

const GPS_CTX: CallerContext = {
  ...FOUNDER_CTX,
  role: "gps",
  sessionId: "test-session-gps",
  hitlMaxTier: "C",
} as any;

describe("resolver_find — input validation", () => {
  beforeEach(() => _resetSessionLimits());

  it("rejects missing intent", async () => {
    const r = await handleResolverFind({}, FOUNDER_CTX, makeStubClient());
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("rejects empty intent string", async () => {
    const r = await handleResolverFind({ intent: "" }, FOUNDER_CTX, makeStubClient());
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("rejects intent > 500 chars", async () => {
    const longIntent = "a".repeat(501);
    const r = await handleResolverFind({ intent: longIntent }, FOUNDER_CTX, makeStubClient());
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("rejects unknown kind", async () => {
    const r = await handleResolverFind(
      { intent: "test", kind: "bogus" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("unknown_kind");
  });

  it("rejects limit > 20", async () => {
    const r = await handleResolverFind(
      { intent: "test", limit: 21 },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("rejects limit < 1", async () => {
    const r = await handleResolverFind(
      { intent: "test", limit: 0 },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("accepts non-object input via wrapper validation", async () => {
    const r = await handleResolverFind("not-an-object", FOUNDER_CTX, makeStubClient());
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });

  it("accepts null input as invalid", async () => {
    const r = await handleResolverFind(null, FOUNDER_CTX, makeStubClient());
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("invalid_input");
  });
});

describe("resolver_find — happy paths", () => {
  beforeEach(() => _resetSessionLimits());

  it("returns matches for common intent", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect(r.output).toHaveProperty("intent");
    expect(r.output).toHaveProperty("caller_role");
    expect(r.output).toHaveProperty("mode", "A2");
    expect(r.output).toHaveProperty("matches");
    expect(r.output).toHaveProperty("ranking_method", "keyword");
    expect(Array.isArray((r.output as any).matches)).toBe(true);
  });

  it("respects kind filter", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding", kind: "skill" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<{ kind: string }>;
    for (const m of matches) {
      expect(m.kind).toBe("skill");
    }
  });

  it("respects per-role filter (cherry-pick #12)", async () => {
    const stub = makeStubClient();
    const r = await handleResolverFind(
      { intent: "telegram bot routing" },
      GPS_CTX,
      stub,
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<{ role_scope: string[] }>;
    // Any returned match must include 'gps' or '*'
    for (const m of matches) {
      const inScope = m.role_scope.includes("*") || m.role_scope.includes("gps");
      expect(inScope).toBe(true);
    }
  });

  it("returns no_match_reason when no matches", async () => {
    const r = await handleResolverFind(
      { intent: "absolutely-no-such-keyword-xyzqwerty12345" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect((r.output as any).matches).toEqual([]);
    expect(r.output).toHaveProperty("no_match_reason");
    expect((r.output as any).no_match_reason).toContain("absolutely-no-such-keyword");
  });

  it("respects limit parameter", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding customer", limit: 3 },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as unknown[];
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("returns full when_to_use (not truncated)", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<{ when_to_use: string }>;
    if (matches.length > 0) {
      // Should be longer than the INDEX 1-line summary (>100 chars)
      // OR exactly the full source text — depends on entry
      expect(typeof matches[0].when_to_use).toBe("string");
      expect(matches[0].when_to_use.length).toBeGreaterThan(0);
    }
  });

  it("includes composes_with when include_composition=true (default)", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<{ composes_with?: string[] }>;
    if (matches.length > 0) {
      expect(matches[0]).toHaveProperty("composes_with");
    }
  });

  it("omits composes_with when include_composition=false", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding", include_composition: false },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<{ composes_with?: string[] }>;
    for (const m of matches) {
      expect(m.composes_with).toBeUndefined();
    }
  });

  it("uses caller role override when provided", async () => {
    const r = await handleResolverFind(
      { intent: "test", role: "support-agent" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect((r.output as any).caller_role).toBe("support-agent");
  });

  it("falls back to ctx.role when no role param", async () => {
    const r = await handleResolverFind(
      { intent: "test" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect((r.output as any).caller_role).toBe("founder");
  });
});

describe("resolver_find — circuit breaker (cherry-pick #11)", () => {
  beforeEach(() => _resetSessionLimits());

  it("allows first 20 finds in same session", async () => {
    const stub = makeStubClient();
    const ctx = { ...FOUNDER_CTX, sessionId: "test-cb-1" };
    for (let i = 0; i < 20; i++) {
      const r = await handleResolverFind({ intent: `query ${i}` }, ctx, stub);
      expect(r.state).toBe("completed");
    }
  });

  it("rejects 21st find in same 4h window", async () => {
    const stub = makeStubClient();
    const ctx = { ...FOUNDER_CTX, sessionId: "test-cb-2" };
    for (let i = 0; i < 20; i++) {
      await handleResolverFind({ intent: `query ${i}` }, ctx, stub);
    }
    const r = await handleResolverFind({ intent: "21st query" }, ctx, stub);
    expect(r.state).toBe("denied");
    expect(r.errorCode).toBe("session_cap_exceeded");
    expect((r.output as any).session_finds_count).toBe(21);
  });

  it("includes session_warning at calls 15+", async () => {
    const stub = makeStubClient();
    const ctx = { ...FOUNDER_CTX, sessionId: "test-cb-warn" };
    for (let i = 0; i < 14; i++) {
      await handleResolverFind({ intent: `q${i}` }, ctx, stub);
    }
    const r = await handleResolverFind({ intent: "15th" }, ctx, stub);
    expect(r.state).toBe("completed");
    expect(r.output).toHaveProperty("session_warning");
    expect((r.output as any).session_finds_count).toBe(15);
  });

  it("does NOT include session_warning at calls < 15", async () => {
    const stub = makeStubClient();
    const ctx = { ...FOUNDER_CTX, sessionId: "test-cb-nowarn" };
    const r = await handleResolverFind({ intent: "first" }, ctx, stub);
    expect(r.state).toBe("completed");
    expect((r.output as any).session_warning).toBeUndefined();
  });

  it("isolates session counters across different sessionIds", async () => {
    const stub = makeStubClient();
    const ctx1 = { ...FOUNDER_CTX, sessionId: "test-cb-iso-1" };
    const ctx2 = { ...FOUNDER_CTX, sessionId: "test-cb-iso-2" };
    for (let i = 0; i < 20; i++) {
      await handleResolverFind({ intent: `q${i}` }, ctx1, stub);
    }
    // ctx1 is now capped; ctx2 should still work
    const r = await handleResolverFind({ intent: "first" }, ctx2, stub);
    expect(r.state).toBe("completed");
    expect((r.output as any).session_finds_count).toBe(1);
  });
});

describe("resolver_find — output schema", () => {
  beforeEach(() => _resetSessionLimits());

  it("includes session_finds_count even on successful find", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.output).toHaveProperty("session_finds_count");
    expect((r.output as any).session_finds_count).toBeGreaterThanOrEqual(1);
  });

  it("includes latency_ms", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.output).toHaveProperty("latency_ms");
    expect(typeof (r.output as any).latency_ms).toBe("number");
  });

  it("includes total_candidates_considered", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.output).toHaveProperty("total_candidates_considered");
  });

  it("includes audit_run_id from stubbed insert", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.output).toHaveProperty("audit_run_id");
    expect((r.output as any).audit_run_id).toMatch(/^test-audit-id-/);
  });

  it("writes audit row to ops.resolver_decisions with mode=A2", async () => {
    const stub = makeStubClient();
    await handleResolverFind({ intent: "onboarding" }, FOUNDER_CTX, stub);
    expect(stub._inserted.length).toBeGreaterThan(0);
    const auditRow = stub._inserted[0];
    expect(auditRow.schema).toBe("ops");
    expect(auditRow.table).toBe("resolver_decisions");
    expect(auditRow.payload.mode).toBe("A2");
    expect(auditRow.payload).toHaveProperty("trigger");
    expect(auditRow.payload).toHaveProperty("decision");
  });

  it("matches have keyword_score (not 'score' or 'llm_ranked')", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = (r.output as any).matches as Array<Record<string, unknown>>;
    if (matches.length > 0) {
      expect(matches[0]).toHaveProperty("keyword_score");
      expect(matches[0]).not.toHaveProperty("llm_ranked");
    }
  });
});

describe("resolver_find — policy alignment", () => {
  it("does NOT import anthropic SDK (iter4 — no API key in subprocess)", async () => {
    // Static check — resolver-find.ts source must not contain anthropic import
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "mcp-server/src/tools/resolver-find.ts"),
      "utf-8",
    );
    expect(src).not.toContain("@anthropic-ai/sdk");
    expect(src).not.toContain("ANTHROPIC_API_KEY");
    expect(src).not.toContain("from \"anthropic\"");
  });

  it("does NOT import openai SDK", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "mcp-server/src/tools/resolver-find.ts"),
      "utf-8",
    );
    expect(src).not.toContain("import OpenAI");
    expect(src).not.toContain("OPENAI_API_KEY");
  });
});
