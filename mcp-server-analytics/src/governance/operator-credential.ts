/**
 * Read-only per-human tier resolution for the analytics MCP (capability
 * multi-user-auth, Sprint 2).
 *
 * The analytics MCP is NOT the refresher of the operator's Supabase Auth token —
 * the supabase-ops MCP is (refreshing rotates the refresh token; a second
 * independent refresher would race + trip Supabase's reuse-detection → revoke).
 * The supabase-ops refresher persists the short-lived ACCESS token into the
 * shared credential file. Here we only READ that access token and decode the
 * operator's tier from it — no network call, no refresh, no race.
 *
 * Resolution is fail-closed: any miss (missing/corrupt file, no access_token, an
 * undecodable token, an expired token, no tier claim) yields a null tier → the
 * caller denies analytics. What CHANGED (2026-07-10): every one of those misses
 * now carries a distinct `reason` + remediation instead of collapsing into a
 * single, undiagnosable tier "unknown". The *decision* is byte-identical — only
 * the explanation improved. See knowledge/analytics-sync-contract.yaml
 * `per_human_tier_gate`.
 *
 * Source precedence:
 *   1. inline RITSU_OPERATOR_ACCESS_TOKEN (the live-validation / direct path), then
 *   2. the access_token persisted in RITSU_OPERATOR_REFRESH_TOKEN_FILE (production).
 *
 * Expiry IS enforced here (the analytics copy deliberately diverges from
 * supabase-ops's decode): supabase-ops sends the same token to the DB, where
 * Supabase re-verifies the signature + exp and per-tier RLS re-checks the tier
 * server-side — so there, a stale local decode is harmless (the DB is the real
 * gate). For analytics the operator token is NEVER transmitted (the connection is
 * the fixed analytics_reader role) and the local tier decode is the ONLY tier
 * gate, so a stale/expired token must NOT keep granting access. Requiring a
 * non-expired token caps the staleness/downgrade-lag window to the access-token
 * lifetime (~1h) rather than "until supabase-ops next persists" (unbounded if the
 * refresher is absent). The analytics_reader DB role (read-only, pseudonymized,
 * isolated) remains the real boundary regardless.
 */

import { readFileSync } from "node:fs";
import { decodeJwtClaims, decodeJwtPayload, type OperatorTier } from "./operator-identity.ts";
import type { AnalyticsServerEnv } from "../lib/env.ts";

/**
 * Why a per-human tier could (not) be established. `ok` means a tier was decoded
 * from a live token — it says nothing about whether that tier is *permitted*
 * (that is `isTierAllowedAnalytics`'s job, reported as `tier_not_permitted`).
 */
export type CredentialReason =
  | "ok"
  /** Neither an inline token nor a credential-file path is configured. */
  | "no_credential_source"
  /** A file path is configured but nothing is there — supabase-ops never persisted. */
  | "credential_file_missing"
  /** The file exists but cannot be read or is not valid JSON. */
  | "credential_file_unreadable"
  /** The file parsed but carries no `access_token` (cold start: refresh token only). */
  | "credential_file_no_access_token"
  /** The token is not a decodable 3-part JWT with an object payload. */
  | "token_undecodable"
  /** The token carries no (or a non-numeric) `exp` — undated tokens are refused. */
  | "token_no_exp"
  /** The token's `exp` is in the past. The refresher is dead or the clock is skewed. */
  | "token_expired"
  /** A live token, but no recognized `app_metadata.tier` claim. */
  | "token_no_tier_claim";

/** Which credential the tier was (attempted to be) resolved from. */
export type CredentialSource = "inline" | "file" | "none";

export interface OperatorCredential {
  /** The decoded tier, or null on any miss. Null ⇒ deny (fail-closed). */
  tier: OperatorTier | null;
  reason: CredentialReason;
  source: CredentialSource;
  /** JWT `exp` as epoch ms, when the token decoded and carried one. */
  expiresAtMs: number | null;
  /** How long the token has been expired, ms. Non-null only when `token_expired`. */
  expiredForMs: number | null;
  /** The credential file's `updated_at` — i.e. when supabase-ops last persisted. */
  persistedAt: string | null;
}

/** What a read of the credential file yielded. Distinguishes each failure mode. */
type CredentialFileRead =
  | { state: "ok"; accessToken: string; updatedAt: string | null }
  | { state: "missing" }
  | { state: "unreadable" }
  | { state: "no_access_token"; updatedAt: string | null };

/** The remediation to print alongside each denial. Keyed by the reason. */
const REFRESHER_HINT =
  "The supabase-ops MCP is the sole refresher: it exchanges the refresh token and persists a " +
  "fresh access_token to the credential file. Analytics only reads it. Check that supabase-ops " +
  "started (its stderr boot log). If it died with `Invalid Refresh Token: Already Used`, the " +
  "stored refresh token is spent (Supabase rotates on use) — re-enroll with " +
  "`node scripts/multi-user-auth/enroll.cjs \"<magic-link>\"`, then restart the MCP clients.";

export const CREDENTIAL_REMEDIATION: Record<CredentialReason, string> = {
  ok: "",
  no_credential_source:
    "RITSU_AUTH_MODE=per-human but neither RITSU_OPERATOR_REFRESH_TOKEN_FILE nor " +
    "RITSU_OPERATOR_ACCESS_TOKEN is set. Set the credential file path in runtime/secrets/.env.local.",
  credential_file_missing:
    `The credential file does not exist. ${REFRESHER_HINT}`,
  credential_file_unreadable:
    "The credential file exists but is unreadable or not valid JSON. Inspect its permissions " +
    "(it should be 0600) and contents, or delete it and re-enroll with " +
    '`node scripts/multi-user-auth/enroll.cjs "<magic-link>"`.',
  credential_file_no_access_token:
    `The credential file has no access_token yet (cold start — supabase-ops persisted only the ` +
    `refresh token). Retry in a moment. ${REFRESHER_HINT}`,
  token_undecodable:
    "The access token is not a decodable JWT. Delete the credential file and re-enroll with " +
    '`node scripts/multi-user-auth/enroll.cjs "<magic-link>"`.',
  token_no_exp:
    "The access token carries no `exp` claim. Undated tokens are refused (they could grant " +
    "forever). Re-enroll to obtain a real Supabase Auth access token.",
  token_expired:
    `The access token expired and nothing refreshed it. ${REFRESHER_HINT} ` +
    "(Also check for a local clock more than ~1h fast.)",
  token_no_tier_claim:
    "The access token has no `app_metadata.tier`. An owner must set your tier: " +
    "`/users retier <email> --tier=admin`, then re-enroll.",
};

/** Read the credential file, distinguishing missing / unreadable / no-token / ok. */
export function readCredentialFile(filePath: string | null | undefined): CredentialFileRead {
  if (!filePath) return { state: "missing" };
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    return (err as NodeJS.ErrnoException)?.code === "ENOENT"
      ? { state: "missing" }
      : { state: "unreadable" };
  }
  let parsed: { access_token?: unknown; updated_at?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { state: "unreadable" };
  }
  // null / number / string / array are valid JSON but not a credential object.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { state: "unreadable" };
  }
  const updatedAt = typeof parsed.updated_at === "string" ? parsed.updated_at : null;
  if (typeof parsed.access_token === "string" && parsed.access_token) {
    return { state: "ok", accessToken: parsed.access_token, updatedAt };
  }
  return { state: "no_access_token", updatedAt };
}

/**
 * Read the persisted access token from the credential file. Fail-closed on any miss.
 * Thin wrapper over `readCredentialFile` — kept for call sites that only need the token.
 */
export function readAccessTokenFromFile(filePath: string | null | undefined): string | null {
  const read = readCredentialFile(filePath);
  return read.state === "ok" ? read.accessToken : null;
}

/**
 * Resolve the operator's per-human credential: the tier plus WHY, so a denial can
 * name its cause instead of reporting tier "unknown" for four different faults.
 *
 * Fail-closed on every miss. Note the inline token takes precedence on the raw
 * STRING's truthiness, not on whether it decodes: a present-but-undecodable (or
 * expired) inline token is used, yields a null tier, and is NOT masked by a valid
 * file token. Intentional; pinned by tests.
 */
export function resolveOperatorCredential(
  env: AnalyticsServerEnv,
  nowMs: number = Date.now(),
): OperatorCredential {
  const base = { tier: null, expiresAtMs: null, expiredForMs: null } as const;

  let token: string;
  let source: CredentialSource;
  let persistedAt: string | null = null;

  if (env.perHumanAccessToken) {
    token = env.perHumanAccessToken;
    source = "inline";
  } else if (env.perHumanRefreshTokenFile) {
    source = "file";
    const read = readCredentialFile(env.perHumanRefreshTokenFile);
    if (read.state === "missing") {
      return { ...base, reason: "credential_file_missing", source, persistedAt };
    }
    if (read.state === "unreadable") {
      return { ...base, reason: "credential_file_unreadable", source, persistedAt };
    }
    if (read.state === "no_access_token") {
      return {
        ...base,
        reason: "credential_file_no_access_token",
        source,
        persistedAt: read.updatedAt,
      };
    }
    token = read.accessToken;
    persistedAt = read.updatedAt;
  } else {
    return { ...base, reason: "no_credential_source", source: "none", persistedAt };
  }

  // Undecodable garbage vs. a real JWT missing a claim — decodeJwtClaims alone
  // collapses both to all-null, so parse the payload first to tell them apart.
  if (!decodeJwtPayload(token)) {
    return { ...base, reason: "token_undecodable", source, persistedAt };
  }
  const id = decodeJwtClaims(token);

  if (id.exp == null) {
    return { ...base, reason: "token_no_exp", source, persistedAt };
  }
  const expiresAtMs = id.exp * 1000;
  if (expiresAtMs < nowMs) {
    return {
      tier: null,
      reason: "token_expired",
      source,
      expiresAtMs,
      expiredForMs: nowMs - expiresAtMs,
      persistedAt,
    };
  }
  if (!id.tier) {
    return { ...base, reason: "token_no_tier_claim", source, expiresAtMs, persistedAt };
  }
  return {
    tier: id.tier,
    reason: "ok",
    source,
    expiresAtMs,
    expiredForMs: null,
    persistedAt,
  };
}

/**
 * Resolve just the tier. Returns null — the caller denies — when no tier can be
 * established OR the token is expired/undated. Retained as the narrow API for
 * callers that don't need the diagnosis.
 */
export function resolveOperatorTier(env: AnalyticsServerEnv): OperatorTier | null {
  return resolveOperatorCredential(env).tier;
}

const hours = (ms: number) => `${Math.round((ms / 3_600_000) * 10) / 10}h`;

/** One human sentence explaining a credential's state. Pure; used in denials + logs. */
export function describeCredential(cred: OperatorCredential): string {
  const from =
    cred.source === "inline"
      ? "the inline RITSU_OPERATOR_ACCESS_TOKEN"
      : cred.source === "file"
        ? "the credential file (RITSU_OPERATOR_REFRESH_TOKEN_FILE)"
        : "no configured credential source";
  const persisted = cred.persistedAt
    ? ` supabase-ops last persisted it at ${cred.persistedAt}.`
    : "";

  switch (cred.reason) {
    case "ok":
      return `Operator tier "${cred.tier}" resolved from ${from}.`;
    case "no_credential_source":
      return "No per-human credential source is configured.";
    case "credential_file_missing":
      return `The credential file is missing — supabase-ops has never persisted an access token.`;
    case "credential_file_unreadable":
      return `The credential file is unreadable or malformed JSON.`;
    case "credential_file_no_access_token":
      return `The credential file holds no access_token (cold start).${persisted}`;
    case "token_undecodable":
      return `The access token from ${from} is not a decodable JWT.${persisted}`;
    case "token_no_exp":
      return `The access token from ${from} carries no exp claim (undated).${persisted}`;
    case "token_expired":
      return (
        `The access token from ${from} expired ${hours(cred.expiredForMs ?? 0)} ago ` +
        `(exp ${new Date(cred.expiresAtMs ?? 0).toISOString()}).${persisted}`
      );
    case "token_no_tier_claim":
      return `The access token from ${from} carries no app_metadata.tier claim.${persisted}`;
  }
}
