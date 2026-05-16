import { describe, it, expect } from "vitest";
import { handleInsert } from "../../mcp-server/src/tools/insert.ts";
import { resolveRole } from "../../mcp-server/src/governance/role-resolver.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

interface InsertCall {
  schema: string;
  table: string;
  rows: unknown[];
  selectCols?: string;
}

function mockClient(
  responder: () => { data: unknown; error: unknown } = () => ({ data: null, error: null }),
) {
  const calls: InsertCall[] = [];
  const buildSchema = (schema: string) => ({
    from(table: string) {
      const builder = {
        insert(rows: unknown[]) {
          const call: InsertCall = { schema, table, rows };
          calls.push(call);
          const inner = {
            select(cols: string) {
              call.selectCols = cols;
              return Promise.resolve(responder());
            },
            then(onfulfilled: (v: { data: unknown; error: unknown }) => unknown) {
              return Promise.resolve(responder()).then(onfulfilled);
            },
          };
          return inner;
        },
      };
      return builder;
    },
  });
  const client = {
    schema: (s: string) => buildSchema(s),
    from: (t: string) => buildSchema("public").from(t),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("handleInsert — happy path", () => {
  it("inserts a row into an allowed table", async () => {
    const ctx = resolveRole("gps", "x");
    const { client, calls } = mockClient(() => ({ data: [{ id: "abc-123" }], error: null }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ task_type: "test" }], returning: ["id"] },
      ctx,
      client,
    );
    expect(result.state).toBe("completed");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.schema).toBe("ops");
    expect(calls[0]!.table).toBe("tasks");
    expect(calls[0]!.selectCols).toBe("id");
    const out = result.output as { inserted_count: number; returned_rows: unknown[] };
    expect(out.inserted_count).toBe(1);
    expect(out.returned_rows).toEqual([{ id: "abc-123" }]);
  });

  it("handles multi-row insert", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient();
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ task_type: "a" }, { task_type: "b" }, { task_type: "c" }] },
      ctx,
      client,
    );
    expect(result.state).toBe("completed");
    const out = result.output as { inserted_count: number };
    expect(out.inserted_count).toBe(3);
  });
});

describe("handleInsert — permission denials", () => {
  it("denies when role lacks write to the table", async () => {
    const ctx = resolveRole("content-drafter", "x"); // no write to ops.tasks
    const { client, calls } = mockClient();
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{}] },
      ctx,
      client,
    );
    expect(result.state).toBe("denied");
    expect(result.errorCode).toBe("table_not_allowed");
    expect(calls).toHaveLength(0); // never reaches the DB
  });

  it("allows founder to write to anything", async () => {
    const ctx = resolveRole("founder", "x");
    const { client } = mockClient();
    const result = await handleInsert(
      { table: "public.customers", rows: [{ name: "Acme" }] },
      ctx,
      client,
    );
    expect(result.state).toBe("completed");
  });
});

describe("handleInsert — input validation", () => {
  it("rejects malformed table name", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient();
    const result = await handleInsert(
      { table: "tasks", rows: [{}] },
      ctx,
      client,
    ).catch((e) => ({ state: "failed", errorCode: "thrown", errorDetail: (e as Error).message } as const));
    // parseInput throws MCPToolError which the dispatcher catches; here we get the throw
    expect(result.state).toBe("failed");
  });

  it("rejects empty rows array", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient();
    const result = await handleInsert(
      { table: "ops.tasks", rows: [] },
      ctx,
      client,
    ).catch((e) => ({ state: "failed", errorCode: "thrown", errorDetail: (e as Error).message } as const));
    expect(result.state).toBe("failed");
  });

  it("rejects more than 100 rows", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient();
    const rows = Array.from({ length: 101 }, () => ({ task_type: "x" }));
    const result = await handleInsert({ table: "ops.tasks", rows }, ctx, client).catch(
      (e) => ({ state: "failed", errorCode: "thrown", errorDetail: (e as Error).message } as const),
    );
    expect(result.state).toBe("failed");
  });

  it("rejects rows containing non-objects", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient();
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ ok: true }, "string-not-obj"] },
      ctx,
      client,
    ).catch((e) => ({ state: "failed", errorCode: "thrown", errorDetail: (e as Error).message } as const));
    expect(result.state).toBe("failed");
  });
});

describe("handleInsert — error mapping", () => {
  it("maps unique_violation (23505) to error when on_conflict=error", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient(() => ({
      data: null,
      error: { code: "23505", message: "dup" },
    }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ task_type: "x" }] },
      ctx,
      client,
    );
    expect(result.state).toBe("failed");
    expect(result.errorCode).toBe("unique_violation");
  });

  it("maps unique_violation to skipped count when on_conflict=ignore", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient(() => ({
      data: null,
      error: { code: "23505", message: "dup" },
    }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ task_type: "x" }], on_conflict: "ignore" },
      ctx,
      client,
    );
    expect(result.state).toBe("completed");
    const out = result.output as { inserted_count: number; skipped: number };
    expect(out.inserted_count).toBe(0);
    expect(out.skipped).toBe(1);
  });

  it("maps not_null_violation (23502)", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient(() => ({
      data: null,
      error: { code: "23502", message: "null in column 'foo'" },
    }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{ task_type: "x" }] },
      ctx,
      client,
    );
    expect(result.state).toBe("failed");
    expect(result.errorCode).toBe("not_null_violation");
  });

  it("maps permission_denied (42501) to denied state", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient(() => ({
      data: null,
      error: { code: "42501", message: "RLS denied" },
    }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{}] },
      ctx,
      client,
    );
    expect(result.state).toBe("denied");
    expect(result.errorCode).toBe("permission_denied");
  });

  it("maps unknown pg errors to generic insert_error", async () => {
    const ctx = resolveRole("gps", "x");
    const { client } = mockClient(() => ({
      data: null,
      error: { code: "42P01", message: "table does not exist" },
    }));
    const result = await handleInsert(
      { table: "ops.tasks", rows: [{}] },
      ctx,
      client,
    );
    expect(result.state).toBe("failed");
    expect(result.errorCode).toBe("insert_error");
  });
});
