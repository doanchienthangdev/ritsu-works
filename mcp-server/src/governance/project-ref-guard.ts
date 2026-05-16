/**
 * Per-call project_ref guard.
 *
 * The env loader already verifies SUPABASE_OPS_URL's project_ref at boot.
 * This module exists for defense in depth: per-call assertion that the
 * Supabase client we hold is still pointing at the allowlisted project.
 *
 * If both boot-time AND per-call checks pass, we have very strong confidence
 * that no operation reached non-ritsu-ops infra.
 */

import { ALLOWED_PROJECT_REFS, extractProjectRef } from "../lib/env.ts";

export class ProjectRefViolationError extends Error {
  constructor(
    public readonly observedUrl: string,
    public readonly observedRef: string | null,
  ) {
    super(
      `ProjectRefViolation: in-flight client URL ${observedUrl} (ref=${observedRef ?? "unknown"}) ` +
        `is NOT in ALLOWED_PROJECT_REFS. This call has been blocked. ` +
        `THIS IS A SECURITY EVENT — write an entry to ops.alerts with severity='critical' and rule_id='mcp_project_ref_violation'.`,
    );
    this.name = "ProjectRefViolationError";
  }
}

/**
 * Assert per-call that the URL we're about to use is allowlisted.
 * Throws ProjectRefViolationError on violation.
 */
export function assertProjectRefAllowed(url: string): void {
  const ref = extractProjectRef(url);
  if (!ref || !(ALLOWED_PROJECT_REFS as readonly string[]).includes(ref)) {
    throw new ProjectRefViolationError(url, ref);
  }
}
