// Invariants module — types + helpers + executor for the Cross-Tier
// Consistency Engine. The DATA lives in invariants.generated.ts (auto-built
// from knowledge/cross-tier-invariants.yaml by
// scripts/wave2-bundle-invariants.cjs). This file owns the API + behavior.

export type InvariantKind =
  | "subset"
  | "equal"
  | "implies"
  | "exists"
  | "regex_match"
  | "header_match";
export type InvariantSeverity = "info" | "warn" | "critical";
export type InvariantHitlTier = "A" | "B" | "C" | "D-Std" | "D-MAX";
export type InvariantLayer = "L1" | "L2" | "L3";
export type InvariantStatus = "live" | "deferred";
export type FixStrategy =
  | "patch_yaml"
  | "patch_md"
  | "regen_bundle"
  | "add_migration"
  | "open_pr"
  | "manual_only";

export interface InvariantEndpoint {
  tier: 1 | 2 | 3 | 4;
  ref: string;
  query?: string;
}

export interface Invariant {
  id: string;
  description: string;
  kind: InvariantKind;
  source: InvariantEndpoint;
  target: InvariantEndpoint;
  severity: InvariantSeverity;
  hitl_tier: InvariantHitlTier;
  fix_strategy: FixStrategy;
  layer?: InvariantLayer;
  status?: InvariantStatus;
  ai_check_prompt?: string | null;
  notes?: string;
}

// Re-export the bundled lists so consumers import a single module.
import {
  ALL_INVARIANTS,
  L3_INVARIANTS_LIVE,
} from "./invariants.generated.ts";

export { ALL_INVARIANTS, L3_INVARIANTS_LIVE };

export function getL3Invariants(): Invariant[] {
  return L3_INVARIANTS_LIVE;
}

export function invariantById(id: string): Invariant | null {
  return ALL_INVARIANTS.find((inv) => inv.id === id) ?? null;
}

export function isCriticalSeverity(sev: InvariantSeverity): boolean {
  return sev === "critical";
}

// ============================================================================
// Executor — runs an L3 invariant against live state. v1.0c supports two
// invariant ids (live-db-tables-match-manifest, live-db-tables-have-rls).
// Unknown invariants are reported as `executor_not_implemented`.
//
// The executor is dependency-injected to keep it testable: pass a sb-like
// client + a manifest-tables reader. Production wires real Supabase RPC +
// a baked manifest table list (also from a bundler — but for v1.0c we hard-
// code the manifest list here since manifest.yaml doesn't change often).
// ============================================================================

export interface CheckResult {
  passed: boolean;
  drift_description?: string;
  target_path?: string;
  evidence?: Record<string, unknown>;
}

export interface ExecutorDeps {
  // RPC executor. Returns rows from the named ops.get_* function.
  // Production: (name) => sb.rpc(name).then(r => r.data).
  callRpc: (name: string) => Promise<unknown[]>;
  // Manifest table list (declared in knowledge/manifest.yaml). Production
  // bundles this from yaml; tests inject directly.
  getManifestOpsTables: () => Promise<string[]>;
}

export async function executeInvariant(
  inv: Invariant,
  deps: ExecutorDeps,
): Promise<CheckResult> {
  if (inv.id === "live-db-tables-match-manifest") {
    const rows = await deps.callRpc("get_ops_tables");
    const live = new Set(
      rows.map((r) => (r as { table_name?: string }).table_name ?? "").filter(Boolean),
    );
    const declared = new Set(await deps.getManifestOpsTables());
    if (declared.size === 0) {
      return {
        passed: false,
        drift_description: "manifest ops table list is empty (bundler may be misconfigured)",
      };
    }
    const undeclared: string[] = [];
    for (const t of live) {
      if (!declared.has(t)) undeclared.push(t);
    }
    if (undeclared.length === 0) {
      return { passed: true };
    }
    return {
      passed: false,
      target_path: "knowledge/manifest.yaml",
      drift_description: `${undeclared.length} live ops.* table(s) not declared in manifest: ${undeclared.join(", ")}`,
      evidence: { undeclared, live_count: live.size, declared_count: declared.size },
    };
  }

  if (inv.id === "live-db-tables-have-rls") {
    const rows = await deps.callRpc("get_ops_rls_state");
    const noRls = rows
      .filter((r) => (r as { rls_enabled?: boolean }).rls_enabled === false)
      .map((r) => (r as { table_name?: string }).table_name ?? "")
      .filter(Boolean);
    if (noRls.length === 0) {
      return { passed: true };
    }
    return {
      passed: false,
      drift_description: `${noRls.length} ops.* table(s) without RLS: ${noRls.join(", ")}`,
      evidence: { without_rls: noRls },
    };
  }

  return {
    passed: false,
    drift_description: `executor_not_implemented: invariant id=${inv.id} (v1.0c handles 2 invariants; extend executeInvariant for more)`,
  };
}

// Manifest ops tables list — bundled from knowledge/manifest.yaml by
// scripts/wave2-bundle-manifest-tables.cjs. Pre-commit hook regenerates
// when manifest.yaml changes. No more hand-maintained drift.
//
// Re-exported here under a stable name so consumers don't reach into the
// generated module directly.
import {
  MANIFEST_OPS_TABLES as GEN_MANIFEST_OPS_TABLES,
  MANIFEST_METRICS_TABLES as GEN_MANIFEST_METRICS_TABLES,
} from "./manifest-tables.generated.ts";

export const MANIFEST_OPS_TABLES: readonly string[] = GEN_MANIFEST_OPS_TABLES;
export const MANIFEST_METRICS_TABLES: readonly string[] = GEN_MANIFEST_METRICS_TABLES;

// Backwards-compat alias for v1.0c callers — TODO remove after v1.0e refactor.
export const MANIFEST_OPS_TABLES_V1_0C: readonly string[] = GEN_MANIFEST_OPS_TABLES;
