// operator-broker — capability multi-user-auth, Sprint 2.
//
// The SERVER-SIDE holder of privilege for operator lifecycle. A co-founder's
// laptop never holds service_role; it sends ONLY its own Supabase Auth JWT. This
// function verifies that JWT (getUser — signature checked), derives the caller's
// tier from the verified app_metadata.tier (NEVER a client-sent tier), and only
// then performs privileged ops with the auto-injected service_role:
//   - whoami            (any authenticated caller)
//   - invite/revoke/list (OWNER only, enforced here in core)
//
// Pure decision logic + gating lives in ../_shared/operator-broker-core.ts
// (unit-tested in Node). config.toml sets verify_jwt = true so the gateway also
// rejects unauthenticated requests before this code runs.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { handleBrokerAction, type BrokerDeps } from "../_shared/operator-broker-core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// service_role client — privileged, server-side only (never on a laptop).
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// deno-lint-ignore no-explicit-any
async function findAuthUser(email: string): Promise<any | null> {
  // small operator set → one page is enough
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return (data.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
}

const deps: BrokerDeps = {
  async findUserByEmail(email) {
    const u = await findAuthUser(email);
    if (!u) return null;
    const t = (u.app_metadata ?? {}).tier;
    return { id: u.id, tier: typeof t === "string" ? t : null };
  },
  async createUser(email, tier) {
    const { data, error } = await admin.auth.admin.createUser({
      email, email_confirm: true, app_metadata: { tier, ritsu_role: "operator", provisioned_by: "operator-broker" },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    return data.user.id;
  },
  async setUserTier(userId, tier) {
    // MERGE app_metadata (Supabase REPLACES it on update) so existing markers +
    // claims survive a re-tier. RT-high-4.
    const { data: cur } = await admin.auth.admin.getUserById(userId);
    const existingMeta = (cur?.user?.app_metadata ?? {}) as Record<string, unknown>;
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...existingMeta, tier } });
    if (error) throw new Error(`setUserTier failed: ${error.message}`);
  },
  async banUser(userId) {
    // ban for ~100 years (offboarding) + invalidate refresh tokens
    await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" } as never);
  },
  async generateMagicLink(email) {
    const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    return data?.properties?.action_link ?? null;
  },
  async upsertOperator(row) {
    // EXACT email match (emails are lowercased in core) — never a LIKE wildcard. RT-high-2.
    const ops = admin.schema("ops").from("operators");
    const { data: upd } = await ops.update(row).eq("email", String(row.email)).select("email");
    if (!upd || upd.length === 0) await ops.insert(row);
  },
  async patchOperator(email, patch) {
    await admin.schema("ops").from("operators").update(patch).eq("email", email);
  },
  async listOperators() {
    const { data } = await admin.schema("ops").from("operators").select("email,tier,status");
    return data ?? [];
  },
  async writeAudit(entry) {
    // service_role bypasses RLS; ops.audit_log is INSERT-only (UPDATE/DELETE blocked
    // by the §4 triggers) → an immutable forensic spine for operator lifecycle. RT-med.
    await admin.schema("ops").from("audit_log").insert({
      actor_kind: "human", actor_id: entry.actorId ?? "unknown", action: entry.action,
      target_kind: "operator", target_id: entry.targetId,
      payload: { ...entry.payload, actor_tier: entry.actorTier, via: "operator-broker" },
    });
  },
  now() {
    return new Date().toISOString();
  },
};

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // 1. verify the CALLER's identity server-side (signature-checked).
  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "missing_bearer_token" });
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u?.user) return json(401, { error: "invalid_token", detail: ue?.message });

  const meta = (u.user.app_metadata ?? {}) as Record<string, unknown>;
  const caller = {
    email: (u.user.email ?? "").toLowerCase() || null,
    tier: typeof meta.tier === "string" ? meta.tier : null, // VERIFIED, server-set
    sub: u.user.id,
  };

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "bad_json" });
  }

  try {
    const result = await handleBrokerAction(deps, caller, body);
    return json(result.status, result.body);
  } catch (e) {
    return json(500, { error: "broker_internal", detail: (e as Error).message });
  }
});
