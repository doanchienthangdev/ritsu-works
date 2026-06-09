#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/push.cjs — /write distribution layer
// ============================================================================
// Parses a --push destination spec + reports a TYPED plan. Actual delivery to an
// external surface is HITL Tier C (public/multi-recipient) per governance/HITL.md
// and requires the destination's MCP to be connected. v0.1 ships destination
// PARSING + a typed `not_built` outcome for backends without a wired MCP — the
// repo's "registered-not-built" convention (mirrors image/voice stub adapters).
//
// Spec grammar:  <backend>/<path-segments...>
//   e.g. googledrive/12042026/post/facebook  → backend=googledrive, folders=[12042026, post, facebook]
//        notion/Marketing/Drafts             → backend=notion, path=[Marketing, Drafts]
//        x   facebook   linkedin   reddit     → social backends (publish = Tier C surface)
//
// CLI:  node scripts/write/push.cjs --push=googledrive/12042026/post/facebook --file=/path/out.pdf [--dry-run]
// Output: one line of JSON {ok, outcome, backend, target, hitl_tier, note}.
// ============================================================================

// Backends and their build status. `built` backends require their MCP to be connected
// at runtime (the orchestrator checks via ToolSearch); absent MCP → typed not_built.
const BACKENDS = Object.freeze({
  googledrive: { aliases: ['gdrive', 'drive', 'google-drive'], surface: 'storage', hitl: 'B', built: false, mcp: 'google-drive' },
  notion: { aliases: [], surface: 'storage', hitl: 'B', built: false, mcp: 'notion' },
  slack: { aliases: [], surface: 'message', hitl: 'B', built: false, mcp: 'slack' },
  x: { aliases: ['twitter'], surface: 'public-social', hitl: 'C', built: false, mcp: 'twitter' },
  facebook: { aliases: ['fb'], surface: 'public-social', hitl: 'C', built: false, mcp: 'facebook' },
  linkedin: { aliases: [], surface: 'public-social', hitl: 'C', built: false, mcp: 'linkedin' },
  reddit: { aliases: [], surface: 'public-social', hitl: 'C', built: false, mcp: 'reddit' },
  instagram: { aliases: ['ig'], surface: 'public-social', hitl: 'C', built: false, mcp: 'instagram' },
});

function resolveBackend(name) {
  const q = String(name || '').toLowerCase();
  if (BACKENDS[q]) return { id: q, ...BACKENDS[q] };
  for (const [id, b] of Object.entries(BACKENDS)) {
    if (b.aliases.includes(q)) return { id, ...b };
  }
  return null;
}

/** Parse a --push spec into {backend, segments, hitl_tier, surface}. Pure. */
function parsePush(spec) {
  if (!spec || typeof spec !== 'string') return { ok: false, error: 'empty --push spec' };
  const parts = spec.split('/').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { ok: false, error: 'empty --push spec' };
  const backend = resolveBackend(parts[0]);
  if (!backend) {
    return { ok: false, error: `unknown push backend "${parts[0]}" (have: ${Object.keys(BACKENDS).join(', ')})` };
  }
  return {
    ok: true,
    backend: backend.id,
    surface: backend.surface,
    hitl_tier: backend.hitl,
    segments: parts.slice(1),
    target: parts.slice(1).join('/') || '(root)',
    built: backend.built,
    mcp: backend.mcp,
  };
}

/** Plan a push (does NOT deliver — delivery is the orchestrator's HITL-gated step). */
function push(spec, opts = {}) {
  const parsed = parsePush(spec);
  if (!parsed.ok) return { ok: false, outcome: 'bad_spec', error: parsed.error };
  const note = parsed.built
    ? `Ready to publish via the ${parsed.mcp} MCP (HITL Tier ${parsed.hitl_tier} — surfaced for approval, never auto-sent).`
    : `Backend "${parsed.backend}" is registered-not-built in v0.1 (no wired ${parsed.mcp} MCP). The artifact is saved locally; connect the MCP + use /cla extend to wire delivery.`;
  return {
    ok: true,
    outcome: parsed.built ? 'planned' : 'not_built',
    backend: parsed.backend,
    target: parsed.target,
    surface: parsed.surface,
    hitl_tier: parsed.hitl_tier,
    file: opts.file || null,
    note,
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const spec = (argv.find((a) => a.startsWith('--push=')) || '').split('=')[1] || argv.find((a) => !a.startsWith('--'));
  const file = (argv.find((a) => a.startsWith('--file=')) || '').split('=')[1] || null;
  process.stdout.write(JSON.stringify(push(spec, { file })) + '\n');
}

module.exports = { parsePush, push, BACKENDS };
