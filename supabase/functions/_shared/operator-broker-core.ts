// Pure, dependency-injected core of the operator-broker Edge Function
// (capability multi-user-auth, Sprint 2). Lives in _shared/ so it is unit-tested
// in Node (tests/operator-broker-core.test.ts) while index.ts wires the Deno +
// supabase-js specifics.
//
// The broker is the SERVER-SIDE holder of privilege: a co-founder's laptop never
// holds service_role. The Edge Function verifies the CALLER's Supabase Auth JWT
// (signature-checked by getUser), and THIS core gates every privileged action on
// the verified app_metadata.tier — never a tier the client sends. Owner-only
// actions (invite/revoke/list) require caller.tier === 'owner'.
//
// Hardened per the Sprint-2 red-team:
//   - invite may NOT re-tier an existing OWNER (would demote/strand the root of
//     trust) — owner lifecycle needs joint authority + a governance PR. (RT-high-1/4)
//   - revoke refuses the last active owner + 404s an unknown target. (RT-med)
//   - every invite/revoke writes an immutable ops.audit_log row. (RT-med)
//   - the index uses exact .eq() (not wildcard .ilike) + merges app_metadata. (RT-high-2/4)

export interface BrokerCaller {
  email: string | null;
  tier: string | null; // verified app_metadata.tier ('owner'|'admin'|'user'|null)
  sub: string | null;
}

export interface OperatorRow {
  email: string;
  tier: string;
  status: string;
}

export interface AuditEntry {
  actorId: string | null; // caller email (verified)
  actorTier: string | null;
  action: string; // 'operator.invite' | 'operator.revoke'
  targetId: string; // target email
  payload: Record<string, unknown>;
}

export interface BrokerDeps {
  /** Find an auth user by email (lowercased): { id, tier } or null. */
  findUserByEmail(email: string): Promise<{ id: string; tier: string | null } | null>;
  /** Create an auth user (email-confirmed, magic-link only) with the tier claim; returns its id. */
  createUser(email: string, tier: string): Promise<string>;
  /** Set app_metadata.tier on an existing user, MERGING (not replacing) app_metadata. */
  setUserTier(userId: string, tier: string): Promise<void>;
  /** Ban an auth user (offboarding). */
  banUser(userId: string): Promise<void>;
  /** Generate a single-use magic-link for the email. */
  generateMagicLink(email: string): Promise<string | null>;
  /** Upsert an ops.operators row (service_role; EXACT email match). */
  upsertOperator(row: Record<string, unknown>): Promise<void>;
  /** Patch an ops.operators row by EXACT email. */
  patchOperator(email: string, patch: Record<string, unknown>): Promise<void>;
  /** List ops.operators rows. */
  listOperators(): Promise<OperatorRow[]>;
  /** Append an immutable ops.audit_log row. */
  writeAudit(entry: AuditEntry): Promise<void>;
  /** ISO timestamp (injected so tests are deterministic). */
  now(): string;
}

export interface BrokerResult {
  status: number;
  body: Record<string, unknown>;
}

const VALID_INVITE_TIERS = ["admin", "user"]; // owner-tier minting/demoting needs joint authority + governance PR

function normEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

// Reject anything that isn't a normal email shape, plus LIKE metachars / control
// chars (defense-in-depth even though the index now uses exact .eq()). '_' '+'
// '.' '-' are kept (valid in real emails); '%' '\' and control chars are not.
function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 254) return false;
  if (/[%\\\x00-\x1f\x7f]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleBrokerAction(
  deps: BrokerDeps,
  caller: BrokerCaller,
  body: Record<string, unknown>,
): Promise<BrokerResult> {
  const action = typeof body.action === "string" ? body.action : "";
  const isOwner = caller.tier === "owner";

  // whoami — any authenticated caller may see their own verified identity.
  if (action === "whoami") {
    return { status: 200, body: { caller } };
  }

  // ---- owner-only actions below ----
  if (action === "invite" || action === "revoke" || action === "list") {
    if (!isOwner) {
      return { status: 403, body: { error: "owner_only", detail: `caller tier '${caller.tier}' may not ${action}` } };
    }
  }

  if (action === "invite") {
    const email = normEmail(body.email);
    const tier = typeof body.tier === "string" ? body.tier : "";
    if (!isValidEmail(email)) return { status: 400, body: { error: "bad_email" } };
    if (!VALID_INVITE_TIERS.includes(tier)) {
      return { status: 400, body: { error: "bad_tier", detail: "tier must be admin|user; owner needs joint authority + governance PR" } };
    }
    const existing = await deps.findUserByEmail(email);
    // RT-high: the broker must NOT re-tier (demote) an existing OWNER — that would
    // strand the root of trust. Owner lifecycle changes need the joint-authority +
    // governance-PR path, never the invite verb.
    if (existing && existing.tier === "owner") {
      return { status: 409, body: { error: "owner_immutable", detail: "target is currently an owner; demoting/re-tiering an owner is not permitted via the broker (joint authority + governance PR required)" } };
    }
    const userId = existing ? (await deps.setUserTier(existing.id, tier), existing.id) : await deps.createUser(email, tier);
    await deps.upsertOperator({
      email, tier, status: "invited", supabase_user_id: userId,
      added_by: caller.email, invited_at: deps.now(), updated_at: deps.now(),
    });
    await deps.writeAudit({
      actorId: caller.email, actorTier: caller.tier, action: "operator.invite", targetId: email,
      payload: { tier, prior_tier: existing?.tier ?? null, supabase_user_id: userId },
    });
    const magicLink = await deps.generateMagicLink(email);
    return {
      status: 200,
      body: {
        ok: true, invited: email, tier,
        magic_link: magicLink,
        note: "No email sender configured — forward this single-use magic-link to the invitee. They click it (proves their mailbox), then their session's refresh token goes into THEIR .env.local credential file (RITSU_OPERATOR_REFRESH_TOKEN_FILE). Their tier is set server-side and cannot be self-edited.",
      },
    };
  }

  if (action === "revoke") {
    const email = normEmail(body.email);
    if (!isValidEmail(email)) return { status: 400, body: { error: "bad_email" } };
    const ops = await deps.listOperators();
    const target = ops.find((o) => o.email.toLowerCase() === email);
    if (!target) {
      return { status: 404, body: { error: "operator_not_found", detail: `no operator with email ${email}` } };
    }
    const activeOwners = ops.filter((o) => o.tier === "owner" && o.status === "active");
    // root-of-trust guard: never strand the system ownerless
    if (target.tier === "owner" && target.status === "active" && activeOwners.length <= 1) {
      return { status: 409, body: { error: "last_owner", detail: "refusing to revoke the last active owner" } };
    }
    const user = await deps.findUserByEmail(email);
    if (user) await deps.banUser(user.id);
    await deps.patchOperator(email, { status: "revoked", revoked_at: deps.now(), updated_at: deps.now() });
    await deps.writeAudit({
      actorId: caller.email, actorTier: caller.tier, action: "operator.revoke", targetId: email,
      payload: { prior_tier: target.tier, prior_status: target.status },
    });
    return {
      status: 200,
      body: {
        ok: true, revoked: email,
        warning: "Revocation bans the refresh token immediately, but an already-issued access token stays valid until it expires (~1h). For instant lockout of a compromised operator, also rotate the project JWT secret. (red-team RT-high-3 — DB-side instant revocation is Sprint-3 hardening.)",
      },
    };
  }

  // redeem — SELF-SERVICE: an authenticated invitee (who just clicked their
  // magic-link, proving their mailbox) flips THEIR OWN ops.operators row from
  // 'invited' to 'active'. Not owner-gated; a caller can only redeem the row
  // matching their server-verified email. Completes the enrollment lifecycle.
  if (action === "redeem") {
    if (!caller.email) return { status: 401, body: { error: "no_identity" } };
    const ops = await deps.listOperators();
    const mine = ops.find((o) => o.email.toLowerCase() === caller.email);
    if (!mine) return { status: 404, body: { error: "not_invited", detail: "no operator record for your verified identity — an owner must /users add you first" } };
    if (mine.status === "active") return { status: 200, body: { ok: true, already_active: true, tier: mine.tier } };
    if (mine.status !== "invited") return { status: 409, body: { error: "not_invitable", detail: `your status is '${mine.status}'` } };
    await deps.patchOperator(caller.email, { status: "active", redeemed_at: deps.now(), last_seen_at: deps.now(), updated_at: deps.now() });
    await deps.writeAudit({ actorId: caller.email, actorTier: caller.tier, action: "operator.redeem", targetId: caller.email, payload: { tier: mine.tier } });
    return { status: 200, body: { ok: true, redeemed: caller.email, tier: mine.tier } };
  }

  if (action === "list") {
    const ops = await deps.listOperators();
    return { status: 200, body: { operators: ops } };
  }

  return { status: 400, body: { error: "unknown_action", actions: ["whoami", "invite", "redeem", "revoke", "list"] } };
}
