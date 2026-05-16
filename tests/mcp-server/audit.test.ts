import { describe, it, expect, vi } from "vitest";
import { redactSecrets, writeAudit, writeProjectRefAlert } from "../../mcp-server/src/governance/audit.ts";
import { ProjectRefViolationError } from "../../mcp-server/src/governance/project-ref-guard.ts";
import { resolveRole } from "../../mcp-server/src/governance/role-resolver.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolResult } from "../../mcp-server/src/types.ts";

// Mock supabase client — captures insert calls.
// Supports `client.schema(s).from(t).insert(row)` pattern used by audit/insert.
function mockClient() {
  const inserts: { schema: string; table: string; row: Record<string, unknown> }[] = [];
  const buildFrom = (schema: string) => ({
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserts.push({ schema, table, row });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  });
  const client = {
    schema: (s: string) => buildFrom(s),
    from: (t: string) => buildFrom("public").from(t),
  };
  return { client: client as unknown as SupabaseClient, inserts };
}

function failingMockClient(errorMsg: string) {
  const buildFrom = () => ({
    from(_table: string) {
      return {
        insert(_row: Record<string, unknown>) {
          return Promise.resolve({ data: null, error: { message: errorMsg } });
        },
      };
    },
  });
  const client = {
    schema: () => buildFrom(),
    from: (_t: string) => buildFrom().from(_t),
  };
  return client as unknown as SupabaseClient;
}

describe("redactSecrets", () => {
  describe("happy path", () => {
    it("leaves a non-secret string untouched", () => {
      expect(redactSecrets("SELECT * FROM ops.tasks")).toBe("SELECT * FROM ops.tasks");
    });

    it("redacts an OpenAI-style key in a string", () => {
      const out = redactSecrets("Bearer sk-abcdefghijklmnopqrstuv1234567890");
      expect(out).not.toContain("sk-abcdefghijklmnopqrstuv");
      expect(out).toContain("[REDACTED]");
    });

    it("redacts a Stripe live key", () => {
      const out = redactSecrets("key: sk_live_abcdefghijklmnopqrstuv");
      expect(out).toContain("[REDACTED]");
    });

    it("redacts a JWT", () => {
      const jwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const out = redactSecrets(jwt) as string;
      expect(out).toBe("[REDACTED]");
    });
  });

  describe("nested structures", () => {
    it("redacts inside object values", () => {
      const out = redactSecrets({ key: "sk-abcdefghijklmnopqrstuv1234567890", safe: "hi" }) as Record<string, unknown>;
      expect(out.key).toBe("[REDACTED]");
      expect(out.safe).toBe("hi");
    });

    it("redacts inside arrays", () => {
      const out = redactSecrets(["normal", "sk-abcdefghijklmnopqrstuv1234567890"]) as string[];
      expect(out[0]).toBe("normal");
      expect(out[1]).toBe("[REDACTED]");
    });

    it("redacts deeply nested values", () => {
      const out = redactSecrets({
        outer: { inner: { secret: "sk-abcdefghijklmnopqrstuv1234567890" } },
      }) as { outer: { inner: { secret: string } } };
      expect(out.outer.inner.secret).toBe("[REDACTED]");
    });
  });

  describe("non-string passthroughs", () => {
    it("leaves numbers untouched", () => {
      expect(redactSecrets(42)).toBe(42);
    });

    it("leaves booleans untouched", () => {
      expect(redactSecrets(true)).toBe(true);
    });

    it("leaves null untouched", () => {
      expect(redactSecrets(null)).toBeNull();
    });
  });
});

describe("writeAudit", () => {
  it("writes a row to ops.mcp_calls with mapped columns", async () => {
    const { client, inserts } = mockClient();
    const ctx = resolveRole("gps", "test-session");
    const result: ToolResult = {
      state: "completed",
      output: { row_count: 3 },
      resultSummary: { row_count: 3, query_ms: 42 },
    };
    await writeAudit(client, {
      toolId: "query",
      callerCtx: ctx,
      input: { sql: "SELECT 1" },
      result,
      startedAt: new Date("2026-05-16T00:00:00Z"),
      completedAt: new Date("2026-05-16T00:00:00.042Z"),
      requiredTier: "A",
    });

    expect(inserts).toHaveLength(1);
    const r = inserts[0]!.row;
    expect(inserts[0]!.schema).toBe("ops");
    expect(inserts[0]!.table).toBe("mcp_calls");
    expect(r.tool_id).toBe("query");
    expect(r.caller_kind).toBe("claude_code");
    expect(r.caller_id).toBe("test-session");
    expect(r.caller_role).toBe("gps");
    expect(r.state).toBe("completed");
    expect(r.role_check_passed).toBe(true);
    expect(r.hitl_required).toBe(false); // A tier
  });

  it("sets hitl_required=true for B+ tiers", async () => {
    const { client, inserts } = mockClient();
    const ctx = resolveRole("gps", "test");
    await writeAudit(client, {
      toolId: "insert",
      callerCtx: ctx,
      input: {},
      result: { state: "completed", output: {} },
      startedAt: new Date(),
      completedAt: new Date(),
      requiredTier: "B",
    });
    expect(inserts[0]!.row.hitl_required).toBe(true);
  });

  it("sets role_check_passed=false when result.state=denied", async () => {
    const { client, inserts } = mockClient();
    const ctx = resolveRole("gps", "test");
    await writeAudit(client, {
      toolId: "insert",
      callerCtx: ctx,
      input: {},
      result: {
        state: "denied",
        output: { error: "table_not_allowed" },
        errorCode: "table_not_allowed",
        errorDetail: "denied",
      },
      startedAt: new Date(),
      completedAt: new Date(),
      requiredTier: "B",
    });
    expect(inserts[0]!.row.role_check_passed).toBe(false);
    expect(inserts[0]!.row.error).toBe("denied");
  });

  it("redacts secrets in input_payload", async () => {
    const { client, inserts } = mockClient();
    const ctx = resolveRole("gps", "test");
    await writeAudit(client, {
      toolId: "query",
      callerCtx: ctx,
      input: { sql: "SELECT 1", note: "Bearer sk-abcdefghijklmnopqrstuv1234567890" },
      result: { state: "completed", output: {} },
      startedAt: new Date(),
      completedAt: new Date(),
      requiredTier: "A",
    });
    const payload = inserts[0]!.row.input_payload as Record<string, string>;
    expect(payload.note).toContain("[REDACTED]");
    expect(payload.note).not.toContain("sk-abcdefghijklmnopqrstuv");
  });

  it("throws if the insert fails (caller wraps in .catch for fail-open)", async () => {
    const client = failingMockClient("connection refused");
    const ctx = resolveRole("gps", "test");
    await expect(
      writeAudit(client, {
        toolId: "query",
        callerCtx: ctx,
        input: {},
        result: { state: "completed", output: {} },
        startedAt: new Date(),
        completedAt: new Date(),
        requiredTier: "A",
      }),
    ).rejects.toThrow(/mcp_calls insert failed/);
  });
});

describe("writeProjectRefAlert", () => {
  it("writes a critical alert with rule_id=mcp_project_ref_violation", async () => {
    const { client, inserts } = mockClient();
    const ctx = resolveRole("gps", "test");
    const err = new ProjectRefViolationError(
      "https://osyhcsgpmtmwosueegml.supabase.co",
      "osyhcsgpmtmwosueegml",
    );
    await writeProjectRefAlert(client, ctx, "query", err);

    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.schema).toBe("ops");
    expect(inserts[0]!.table).toBe("alerts");
    const row = inserts[0]!.row;
    expect(row.rule_id).toBe("mcp_project_ref_violation");
    expect(row.severity).toBe("critical");
    const payload = row.payload as Record<string, string>;
    expect(payload.tool_id).toBe("query");
    expect(payload.caller_role).toBe("gps");
    expect(payload.observed_ref).toBe("osyhcsgpmtmwosueegml");
  });
});
