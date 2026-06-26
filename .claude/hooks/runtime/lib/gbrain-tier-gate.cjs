'use strict';
/**
 * .claude/hooks/runtime/lib/gbrain-tier-gate.cjs
 *
 * Pure decision engine for the per-human gbrain tier gate (capability
 * multi-user-auth, Sprint 2 — ITEM B). gbrain is an external bun binary with its
 * own auth that does NOT understand the Supabase JWT, so it cannot be gated by
 * RLS or a per-human DB identity. This hook is the local enforcement of the
 * tier→gbrain contract in knowledge/operator-tiers.yaml: user = NO gbrain;
 * admin = gbrain read+write; owner = all.
 *
 * HONESTY: a hook lives on the UNTRUSTED laptop. It is least-privilege /
 * non-malicious gating + closes the "local tool-tier enforcement" gap; it is NOT a
 * cryptographic boundary. The tier decode is signature-UNVERIFIED (no JWT secret on
 * the laptop), and gbrain is the ONE per-human surface with no server-side backstop
 * (unlike supabase-ops/analytics, where a forged local token is caught by Supabase
 * signature + RLS). So the easiest bypass isn't even disabling the hook — a user can
 * write tier:owner into their own unsigned token. That is ACCEPTED: the real gbrain
 * bounds stay the $100/mo cost cap (scripts/pre-budget-check.sh) + gbrain holding no
 * money/Product/secret credentials — a bypass reaches only the operational brain
 * (bounded + recoverable), never money/Product/secrets.
 *
 * Tier resolution is RACE-FREE: it reads the access token the supabase-ops MCP
 * persists to the shared credential file (ITEM A) and decodes app_metadata.tier —
 * it NEVER refreshes the token, so it cannot race supabase-ops's rotation.
 *
 * This module is PURE + TOTAL (never throws): inputs injected, returns a decision.
 * The thin wrapper (../pre-tool-gbrain-tier.cjs) does the I/O.
 */

const { effectiveTier } = require('../../../../scripts/local-install/lib/operator-tier.cjs');

const GBRAIN_TIER_GATE_VERSION = '0.1.0';
const GBRAIN_TOOL_RE = /^mcp__gbrain__/;

/** base64url → utf8. */
function decodeBase64Url(seg) {
  const pad = seg.length % 4 === 0 ? '' : '='.repeat(4 - (seg.length % 4));
  return Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}

/**
 * Decode app_metadata.tier + exp from a JWT (no signature verification — advisory;
 * port of the analytics/supabase-ops decodeJwtClaims). Fail-closed: returns
 * { tier: null, exp: null } on any malformed/missing input.
 */
function decodeTierClaims(token) {
  const empty = { tier: null, exp: null };
  if (!token || typeof token !== 'string') return empty;
  const parts = token.split('.');
  if (parts.length !== 3) return empty;
  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return empty;
  }
  if (!payload || typeof payload !== 'object') return empty;
  const exp = typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null;
  let tier = null;
  const am = payload.app_metadata;
  if (
    am &&
    typeof am === 'object' &&
    typeof am.tier === 'string' &&
    ['owner', 'admin', 'user'].includes(am.tier)
  ) {
    tier = am.tier;
  }
  return { tier, exp };
}

function listHasGbrain(list) {
  return Array.isArray(list) && (list.includes('*') || list.includes('gbrain'));
}

/**
 * Does this tier grant gbrain at all (read or write)? Contract-driven via
 * effectiveTier(operator-tiers.yaml): owner mcp.read=['*'], admin includes
 * 'gbrain', user=[]. No tier is gbrain-read-only, so a binary "may use gbrain"
 * gate is faithful (read-vs-write HITL is a separate, existing concern).
 */
function tierMayUseGbrain(tier, tiersDoc) {
  const eff = effectiveTier(tier, tiersDoc);
  if (!eff || !eff.mcp) return false;
  return listHasGbrain(eff.mcp.read) || listHasGbrain(eff.mcp.write);
}

/**
 * The pure decision. Inputs injected for testability.
 * @param {{toolName:string, authMode:string, accessToken:string|null, tiersDoc:object, nowMs:number}} p
 * @returns {{decision:'allow'|'block', reason:string, matchRule:string, tier:(string|null)}}
 */
function decideGbrainTier(p) {
  const { toolName, authMode, accessToken, tiersDoc, nowMs } = p || {};

  // service-key (or anything not per-human) → no-op. The hook enforces ONLY in
  // per-human mode; default installs / CI / worktrees (no per-human creds) are
  // unaffected.
  if (authMode !== 'per-human') {
    return { decision: 'allow', reason: 'service-key mode — gbrain tier gate is a no-op', matchRule: 'service-key', tier: null };
  }
  // Defense-in-depth: only gate gbrain tools (the settings matcher already scopes this).
  if (!GBRAIN_TOOL_RE.test(toolName || '')) {
    return { decision: 'allow', reason: 'not a gbrain tool', matchRule: 'not-gbrain', tier: null };
  }

  const { tier, exp } = decodeTierClaims(accessToken);

  // Fail-closed: no token / undated / EXPIRED → cannot establish a current tier.
  // exp is enforced (like the analytics gate) so a stale token can't keep granting.
  // No clock-skew grace by design: a fresh token has ~1h runway + supabase-ops
  // auto-refreshes/re-persists before expiry, so only a >1h-fast local clock or a
  // >1h-dead refresher reads it expired — both are genuine unresolvable-tier, not skew.
  if (exp == null || exp * 1000 < nowMs) {
    return {
      decision: 'block',
      matchRule: 'unresolved-or-expired',
      tier: null,
      reason:
        "per-human: the operator tier could not be established (no / undated / expired access token). " +
        "The supabase-ops MCP persists the access token after it authenticates — make sure it is running, then retry. Fail-closed.",
    };
  }
  if (!tier) {
    return {
      decision: 'block',
      matchRule: 'no-tier',
      tier: null,
      reason: 'per-human: the access token carries no app_metadata.tier — fail-closed.',
    };
  }
  if (tierMayUseGbrain(tier, tiersDoc)) {
    return { decision: 'allow', reason: `operator tier '${tier}' may use gbrain`, matchRule: 'tier-allowed', tier };
  }
  return {
    decision: 'block',
    matchRule: 'tier-denied',
    tier,
    reason:
      `operator tier '${tier}' may not use gbrain (per knowledge/operator-tiers.yaml: ` +
      `the 'user' tier has no gbrain grant; admin + owner do).`,
  };
}

module.exports = {
  GBRAIN_TIER_GATE_VERSION,
  GBRAIN_TOOL_RE,
  decodeTierClaims,
  tierMayUseGbrain,
  decideGbrainTier,
};
