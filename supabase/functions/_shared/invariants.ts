// TypeScript port of scripts/lib/load-invariants.cjs for Edge Function runtime.
// The CJS lib reads from the working filesystem; this TS module reads from the
// invariants source baked into the Edge Function bundle at deploy time.
//
// Why baked, not fetched? Edge Functions don't have direct repo access at
// runtime. We snapshot the invariants source as a string constant at deploy
// time (or rely on the bundler to inline it). For v1.0b we hand-maintain a
// small TS struct matching the yaml.
//
// Future: generate `invariants.generated.ts` from the yaml via a bundler
// (similar to wave2-bundle-schedules.cjs). For v1.0b, the structural
// invariants the sweep skill cares about are listed inline here.
//
// Source of truth remains knowledge/cross-tier-invariants.yaml — this file
// must be regenerated when yaml changes (caught by L1 invariant in next slice).

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
  ai_check_prompt?: string | null;
  notes?: string;
}

// L3 invariants the sweep skill checks against live DB. These are the
// structural ones from cross-tier-invariants.yaml that benefit from running
// against the live state (not just migrations on disk).
//
// Currently a small bootstrap set. Extend as new L3 invariants are added in
// the yaml. Future: auto-generate this file from the yaml via a bundler.
export const L3_INVARIANTS: Invariant[] = [
  {
    id: "live-db-tables-match-manifest",
    description:
      "Every ops.* table in live DB must appear in manifest.tier2_operational.schemas.ops.tables",
    kind: "subset",
    source: {
      tier: 2,
      ref: "ops.*",
      query:
        "SELECT table_name FROM information_schema.tables WHERE table_schema='ops' ORDER BY table_name",
    },
    target: {
      tier: 1,
      ref: "knowledge/manifest.yaml",
      query: "$.tier2_operational.schemas.ops.tables[*].name",
    },
    severity: "critical",
    hitl_tier: "C",
    fix_strategy: "patch_yaml",
    layer: "L3",
  },
  {
    id: "live-db-tables-have-rls",
    description: "Every ops.* table in live DB should have RLS enabled",
    kind: "implies",
    source: {
      tier: 2,
      ref: "ops.*",
      query: "SELECT relname FROM pg_class WHERE relnamespace='ops'::regnamespace AND relkind='r'",
    },
    target: {
      tier: 2,
      ref: "ops.*",
      query:
        "SELECT relname FROM pg_class WHERE relnamespace='ops'::regnamespace AND relkind='r' AND relrowsecurity=true",
    },
    severity: "warn",
    hitl_tier: "B",
    fix_strategy: "add_migration",
    layer: "L3",
  },
];

export function getL3Invariants(): Invariant[] {
  return L3_INVARIANTS;
}

export function invariantById(id: string): Invariant | null {
  return L3_INVARIANTS.find((inv) => inv.id === id) ?? null;
}

// Severity → exit-on-fail rule for the sweep skill. Critical drift marks the
// run as a real failure; warn marks it as a soft finding.
export function isCriticalSeverity(sev: InvariantSeverity): boolean {
  return sev === "critical";
}
