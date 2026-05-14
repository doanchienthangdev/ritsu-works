// Tests for makeVerifyDocClaimsHandler + parseDocClaimResponse (v1.2).
//
// Phase 1 — Code Analysis:
//   parseDocClaimResponse(text): branches:
//     - no { → null
//     - invalid JSON → null
//     - non-object → null
//     - missing match field → null
//     - missing/invalid confidence → null
//     - happy: returns DocClaimAiResponse
//
//   makeVerifyDocClaimsHandler(deps): branches:
//     - missing payload.invariant_id → fail no_retry
//     - unknown invariant id → fail no_retry
//     - invariant has no ai_check_prompt → fail no_retry
//     - loadDocSection returns null → deferred_no_doc_section
//     - consistency_checks insert error → retryable
//     - anthropic throws → row → failed, returns retryable per error class
//     - response unparseable → row failed, drift event emitted with raw preview
//     - happy passed → row updated state=passed
//     - happy failed (match=false) → row updated + event emitted (warn+critical)
//     - drift on info severity → row updated but NO event

import { describe, it, expect } from "vitest";

import {
  makeVerifyDocClaimsHandler,
  parseDocClaimResponse,
  type SbClient,
  type ScheduledRun,
  type AnthropicLike,
  type AnthropicMessagesResponse,
} from "../supabase/functions/_shared/worker.ts";
import type { Invariant } from "../supabase/functions/_shared/invariants.ts";

const INV: Invariant = {
  id: "orchestration-doc-tasks-state-machine",
  description: "tasks state machine doc must match DB",
  kind: "regex_match",
  source: { tier: 1, ref: "knowledge/orchestration-architecture.md", query: "marker:..." },
  target: { tier: 2, ref: "ops.tasks", query: "..." },
  severity: "warn",
  hitl_tier: "B",
  fix_strategy: "patch_md",
  layer: "L3",
  status: "live",
  ai_check_prompt:
    "Compare the doc's task state machine claim against the actual DB CHECK constraint. " +
    "Output JSON: {match: bool, drift_description: string, confidence: number 0..1}.",
};

const INV_INFO: Invariant = { ...INV, severity: "info", hitl_tier: "A" };
const INV_CRITICAL: Invariant = { ...INV, severity: "critical", hitl_tier: "C" };

function lookup(id: string): Invariant | null {
  if (id === INV.id) return INV;
  if (id === "info-inv") return INV_INFO;
  if (id === "critical-inv") return INV_CRITICAL;
  if (id === "no-prompt-inv") return { ...INV, id, ai_check_prompt: null };
  return null;
}

function runWithPayload(invariantId?: string): ScheduledRun & { payload?: { invariant_id?: string } } {
  return {
    id: "verify-tick",
    schedule_id: "verify-doc-claims-nightly",
    triggered_skill: "verify-doc-claims",
    fired_at: "2026-05-14T04:00:00Z",
    payload: invariantId ? { invariant_id: invariantId } : undefined,
  };
}

function makeMockAnthropic(response: AnthropicMessagesResponse | (() => never)): AnthropicLike {
  return {
    messages: {
      create: async () => {
        if (typeof response === "function") return response();
        return response;
      },
    },
  };
}

interface MockSbState {
  insertedRowId: string;
  inserts: { table: string; args: unknown }[];
  updates: { table: string; args: unknown; filter: { col: string; val: unknown } }[];
  insertError?: { message: string } | null;
}

function makeMockSb(state: MockSbState): SbClient {
  return {
    from(table: string) {
      return {
        insert(args: unknown) {
          state.inserts.push({ table, args });
          if (table === "events") return Promise.resolve({ error: null });
          return {
            select(_cols: string) {
              return {
                single() {
                  if (state.insertError) {
                    return Promise.resolve({ data: null, error: state.insertError });
                  }
                  return Promise.resolve({ data: { id: state.insertedRowId }, error: null });
                },
              };
            },
          };
        },
        update(args: unknown) {
          return {
            eq(col: string, val: unknown) {
              state.updates.push({ table, args, filter: { col, val } });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

// ============================================================================
// parseDocClaimResponse — pure function
// ============================================================================

describe("parseDocClaimResponse", () => {
  it("parses a clean JSON response", () => {
    const r = parseDocClaimResponse('{"match":true,"confidence":0.9}');
    expect(r).not.toBeNull();
    expect(r!.match).toBe(true);
    expect(r!.confidence).toBe(0.9);
  });

  it("extracts JSON from prose-wrapped response", () => {
    const text = `Here is the result:\n\n{"match": false, "drift_description": "x", "confidence": 0.7}\n\nDone.`;
    const r = parseDocClaimResponse(text);
    expect(r).not.toBeNull();
    expect(r!.match).toBe(false);
    expect(r!.drift_description).toBe("x");
  });

  it("returns null when no { found", () => {
    expect(parseDocClaimResponse("no json here")).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    expect(parseDocClaimResponse("{ this is not json }")).toBeNull();
  });

  it("returns null when match field missing", () => {
    expect(parseDocClaimResponse('{"confidence": 0.5}')).toBeNull();
  });

  it("returns null when confidence missing or invalid", () => {
    expect(parseDocClaimResponse('{"match": true}')).toBeNull();
    expect(parseDocClaimResponse('{"match": true, "confidence": "high"}')).toBeNull();
    expect(parseDocClaimResponse('{"match": true, "confidence": -0.1}')).toBeNull();
    expect(parseDocClaimResponse('{"match": true, "confidence": 1.5}')).toBeNull();
  });

  it("accepts confidence at boundaries 0 and 1", () => {
    expect(parseDocClaimResponse('{"match": true, "confidence": 0}')).not.toBeNull();
    expect(parseDocClaimResponse('{"match": true, "confidence": 1}')).not.toBeNull();
  });
});

// ============================================================================
// makeVerifyDocClaimsHandler — handler
// ============================================================================

describe("makeVerifyDocClaimsHandler", () => {
  function makeDeps(opts: {
    response?: AnthropicMessagesResponse | (() => never);
    insertError?: { message: string } | null;
    docSection?: { doc_path: string; content: string } | null;
  } = {}) {
    const state: MockSbState = {
      insertedRowId: "row-1",
      inserts: [],
      updates: [],
      insertError: opts.insertError ?? null,
    };
    const sb = makeMockSb(state);
    const anthropic = makeMockAnthropic(
      opts.response ?? {
        content: [{ type: "text", text: '{"match":true,"confidence":0.9}' }],
      },
    );
    return {
      sb,
      anthropic,
      lookupInvariant: lookup,
      loadDocSection: async () => opts.docSection === undefined
        ? { doc_path: "knowledge/orchestration-architecture.md", content: "doc text" }
        : opts.docSection,
      state,
    };
  }

  describe("guards", () => {
    it("fails when run.payload.invariant_id missing", async () => {
      const deps = makeDeps();
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload());
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/requires run\.payload\.invariant_id/);
    });

    it("fails when invariant id unknown", async () => {
      const deps = makeDeps();
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload("nope"));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string };
      expect(fail.error).toMatch(/unknown invariant: nope/);
    });

    it("fails when invariant has no ai_check_prompt", async () => {
      const deps = makeDeps();
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload("no-prompt-inv"));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string };
      expect(fail.error).toMatch(/no ai_check_prompt/);
    });

    it("returns deferred_no_doc_section when loader returns null", async () => {
      const deps = makeDeps({ docSection: null });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string };
      expect(fail.error).toMatch(/^deferred_no_doc_section/);
    });
  });

  describe("happy paths", () => {
    it("transitions to passed when AI says match=true", async () => {
      const deps = makeDeps();
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(true);
      const update = deps.state.updates.find((u) =>
        u.table === "consistency_checks" && (u.args as { state?: string }).state === "passed"
      );
      expect(update).toBeDefined();
      // No drift event emitted on pass.
      const eventInserts = deps.state.inserts.filter((i) => i.table === "events");
      expect(eventInserts).toHaveLength(0);
    });

    it("transitions to failed + emits drift event on match=false (warn severity)", async () => {
      const deps = makeDeps({
        response: {
          content: [{
            type: "text",
            text: '{"match":false,"drift_description":"state machine mismatch","confidence":0.85}',
          }],
        },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(true);
      const update = deps.state.updates.find((u) =>
        u.table === "consistency_checks" && (u.args as { state?: string }).state === "failed"
      );
      expect(update).toBeDefined();
      const args = update?.args as { drift_description: string; proposed_fix_confidence: number };
      expect(args.drift_description).toBe("state machine mismatch");
      expect(args.proposed_fix_confidence).toBe(0.85);
      const eventInserts = deps.state.inserts.filter((i) => i.table === "events");
      expect(eventInserts).toHaveLength(1);
    });

    it("does NOT emit drift event for info severity (too noisy)", async () => {
      const deps = makeDeps({
        response: {
          content: [{ type: "text", text: '{"match":false,"confidence":0.5}' }],
        },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload("info-inv"));
      expect(result.ok).toBe(true);
      // Row update happened with state=failed
      const update = deps.state.updates.find((u) =>
        u.table === "consistency_checks" && (u.args as { state?: string }).state === "failed"
      );
      expect(update).toBeDefined();
      // But NO event
      expect(deps.state.inserts.filter((i) => i.table === "events")).toHaveLength(0);
    });

    it("honors drift_severity_override from AI", async () => {
      const deps = makeDeps({
        response: {
          content: [{
            type: "text",
            text: '{"match":false,"drift_description":"x","drift_severity_override":"critical","confidence":0.9}',
          }],
        },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      await handler(runWithPayload("info-inv"));
      // Severity should be bumped to critical, so event SHOULD now emit
      // (info → critical bump per drift_severity_override)
      const eventInserts = deps.state.inserts.filter((i) => i.table === "events");
      expect(eventInserts).toHaveLength(1);
      const evt = eventInserts[0].args as { payload: { severity: string } };
      expect(evt.payload.severity).toBe("critical");
    });
  });

  describe("error handling", () => {
    it("retries on retryable anthropic error (5xx)", async () => {
      const deps = makeDeps({
        response: () => { throw new Error("503 service unavailable"); },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/^anthropic: 503/);
      expect(fail.retryable).toBe(true);
    });

    it("does NOT retry on non-retryable anthropic error (400)", async () => {
      const deps = makeDeps({
        response: () => { throw new Error("400 invalid request"); },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.retryable).toBe(false);
    });

    it("marks row failed with ai_response_unparseable + emits diagnostic event", async () => {
      const deps = makeDeps({
        response: {
          content: [{ type: "text", text: "this is not json at all" }],
        },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const out = result.output as { passed: boolean; reason: string };
      expect(out.passed).toBe(false);
      expect(out.reason).toBe("ai_response_unparseable");
      // Event emitted with the preview
      const eventInserts = deps.state.inserts.filter((i) => i.table === "events");
      expect(eventInserts).toHaveLength(1);
      const evt = eventInserts[0].args as { payload: { drift_description: string } };
      expect(evt.payload.drift_description).toBe("ai_response_unparseable");
    });

    it("returns retryable failure on consistency_checks insert error", async () => {
      const deps = makeDeps({ insertError: { message: "RLS denied" } });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/consistency_checks insert: RLS denied/);
      expect(fail.retryable).toBe(true);
    });
  });

  describe("output shape", () => {
    it("returns invariant_id + passed + confidence in output", async () => {
      const deps = makeDeps({
        response: {
          content: [{ type: "text", text: '{"match":true,"confidence":0.95}' }],
        },
      });
      const handler = makeVerifyDocClaimsHandler(deps);
      const result = await handler(runWithPayload(INV.id));
      if (!result.ok) throw new Error("expected ok");
      expect(result.output).toMatchObject({
        kind: "verify_doc_claims",
        invariant_id: INV.id,
        passed: true,
        confidence: 0.95,
      });
    });
  });
});
