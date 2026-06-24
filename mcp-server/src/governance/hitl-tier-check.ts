/**
 * HITL tier-check enforcement.
 *
 * Loads `knowledge/mcp-tools.yaml` at server start. Per call, looks up the
 * tool's required tier (with per-role override) and compares against the
 * caller's `hitlMaxTier` from governance/ROLES.md.
 *
 * Phase 1: deny if tool's tier > caller's max. No escalation flow (Phase 2
 * adds Telegram approval ceremony via the hitl-router role).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import type { CallerContext, HitlTier } from "../types.ts";
import { TIER_RANK } from "../types.ts";

interface ToolRegistryEntry {
  id: string;
  server: string;
  description: string;
  tier_default: HitlTier;
  tier_per_role?: Record<string, HitlTier>;
  role_scope?: string[];
}

interface ToolRegistry {
  version: string;
  tools: ToolRegistryEntry[];
}

export class RegistryParseError extends Error {
  constructor(path: string, cause: unknown) {
    super(
      `RegistryParseError: failed to load ${path} — ${(cause as Error)?.message ?? String(cause)}`,
    );
    this.name = "RegistryParseError";
  }
}

export class UnknownToolError extends Error {
  constructor(toolId: string) {
    super(
      `UnknownTool: "${toolId}" is not registered in knowledge/mcp-tools.yaml. ` +
        `Either the skill is calling a tool that doesn't exist, or the registry is out of date.`,
    );
    this.name = "UnknownToolError";
  }
}

export class TierExceededError extends Error {
  constructor(
    public readonly toolId: string,
    public readonly required: HitlTier,
    public readonly role: string,
    public readonly callerMax: HitlTier,
  ) {
    super(
      `TierExceeded: tool "${toolId}" requires tier ${required} but role "${role}" max is ${callerMax}`,
    );
    this.name = "TierExceededError";
  }
}

export class ToolNotInRoleScopeError extends Error {
  constructor(
    public readonly toolId: string,
    public readonly role: string,
  ) {
    super(
      `ToolNotInRoleScope: tool "${toolId}" does not list role "${role}" in role_scope (knowledge/mcp-tools.yaml)`,
    );
    this.name = "ToolNotInRoleScopeError";
  }
}

let registryCache: ToolRegistry | null = null;
let registrySource: string | null = null;

/**
 * Load knowledge/mcp-tools.yaml from `repoRoot`. Cached for the process lifetime.
 *
 * Tests can call `resetRegistry()` between runs.
 */
export function loadRegistry(repoRoot: string): ToolRegistry {
  if (registryCache) return registryCache;
  const path = join(repoRoot, "knowledge", "mcp-tools.yaml");
  registrySource = path;
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    throw new RegistryParseError(path, err);
  }
  try {
    const parsed = yaml.load(raw) as ToolRegistry;
    if (!parsed?.tools || !Array.isArray(parsed.tools)) {
      throw new Error("expected top-level `tools:` array");
    }
    registryCache = parsed;
    return parsed;
  } catch (err) {
    throw new RegistryParseError(path, err);
  }
}

export function resetRegistry(): void {
  registryCache = null;
  registrySource = null;
}

export function getRegistrySource(): string | null {
  return registrySource;
}

/**
 * Find a tool entry by `id` for our `server`. The shim only serves `supabase-ops`
 * tools; tools registered against other servers are ignored.
 */
export function findTool(registry: ToolRegistry, toolId: string): ToolRegistryEntry | null {
  return (
    registry.tools.find(
      (t) => t.id === toolId && t.server === "supabase-ops",
    ) ?? null
  );
}

/**
 * Phase 1 enforcement: gate the call.
 *
 * Throws UnknownToolError, ToolNotInRoleScopeError, or TierExceededError on violation.
 * Returns the resolved required tier on success.
 */
export function enforceTier(
  registry: ToolRegistry,
  toolId: string,
  ctx: CallerContext,
): { requiredTier: HitlTier } {
  const tool = findTool(registry, toolId);
  if (!tool) throw new UnknownToolError(toolId);

  // role_scope is the AGENT-role allowlist (the service-key authority axis). In
  // per-human mode the authority is the verified JWT tier, and access is gated by
  // the tier's table-scope (canReadSchema/canWriteTable) + per-tier RLS — so the
  // agent-role allowlist does not apply. The HITL tier check below still runs
  // (against the tier's hitlMaxTier).
  if (ctx.authMode !== "per-human" && tool.role_scope && !tool.role_scope.includes(ctx.role)) {
    throw new ToolNotInRoleScopeError(toolId, ctx.role);
  }

  // tier_per_role is keyed by agent role; in per-human mode ctx.role is a tier,
  // so this naturally falls through to tier_default.
  const required = tool.tier_per_role?.[ctx.role] ?? tool.tier_default;

  if (TIER_RANK[required] > TIER_RANK[ctx.hitlMaxTier]) {
    throw new TierExceededError(toolId, required, ctx.role, ctx.hitlMaxTier);
  }

  return { requiredTier: required };
}
