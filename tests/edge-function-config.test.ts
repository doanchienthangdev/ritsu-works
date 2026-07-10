// Guards supabase/config.toml against the "function deployed without an explicit
// verify_jwt policy" class of bug.
//
// Incident 2026-07-10: analytics-sync-health had no [functions.*] block. Its original
// deploy used `--no-verify-jwt`, which the CLI does NOT persist. A later redeploy
// therefore fell back to the verify_jwt=true default, and the 12:00 UTC cron POST —
// which sends only `x-analytics-health-auth`, never `Authorization` — began 401'ing at
// the gateway. Net effect: the nightly sync alert went SILENT, the worst failure mode
// for a monitor. Same root shape as the pre-2026-05-14 v1.0c smoke-test bug.
//
// The invariant below is deliberately stronger than "analytics-sync-health is false":
// it fails for ANY new function that forgets to declare a policy, which is the actual
// trap. A function that genuinely wants gateway JWT verification declares `true`
// (operator-broker does) — the point is that the choice must be explicit and in git.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..");
const FUNCTIONS_DIR = join(REPO, "supabase", "functions");
const CONFIG = join(REPO, "supabase", "config.toml");

/** Function dirs that actually get deployed (`_shared` is a library, not a function). */
function deployedFunctions(): string[] {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name)
    .sort();
}

/** Minimal parse of `[functions.<name>] … verify_jwt = <bool>` blocks. */
function verifyJwtByFunction(toml: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  let current: string | null = null;
  for (const raw of toml.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const header = line.match(/^\[functions\.([A-Za-z0-9_-]+)\]$/);
    if (header) {
      current = header[1];
      continue;
    }
    if (line.startsWith("[")) {
      current = null; // some other table
      continue;
    }
    const kv = line.match(/^verify_jwt\s*=\s*(true|false)$/);
    if (kv && current) out[current] = kv[1] === "true";
  }
  return out;
}

describe("supabase/config.toml — edge function verify_jwt policy", () => {
  const toml = readFileSync(CONFIG, "utf8");
  const declared = verifyJwtByFunction(toml);
  const functions = deployedFunctions();

  it("finds at least the four known functions on disk", () => {
    expect(functions).toEqual(
      expect.arrayContaining([
        "analytics-sync-health",
        "minion-worker",
        "operator-broker",
        "scheduled-run-dispatcher",
      ]),
    );
  });

  it.each(deployedFunctions())(
    "declares an explicit verify_jwt for %s",
    (fn) => {
      expect(
        Object.prototype.hasOwnProperty.call(declared, fn),
        `supabase/config.toml is missing [functions.${fn}] with an explicit verify_jwt. ` +
          `Without it, 'supabase functions deploy' silently defaults to verify_jwt=true ` +
          `and any cron caller that sends only a shared-secret header will 401 at the gateway.`,
      ).toBe(true);
      expect(typeof declared[fn]).toBe("boolean");
    },
  );

  it("declares no block for a function that does not exist on disk", () => {
    for (const fn of Object.keys(declared)) {
      expect(
        existsSync(join(FUNCTIONS_DIR, fn)),
        `config.toml declares [functions.${fn}] but supabase/functions/${fn}/ is gone`,
      ).toBe(true);
    }
  });

  // ── pinned per-function policies (change these only with the matching caller change) ──

  it("regression (2026-07-10): analytics-sync-health is verify_jwt=false", () => {
    // Its cron caller (ops cron.job 'analytics-sync-health-daily', 0 12 * * *) sends
    // only x-analytics-health-auth. Flipping this to true silences the nightly alert.
    expect(declared["analytics-sync-health"]).toBe(false);
  });

  it.each([
    ["minion-worker", false],
    ["scheduled-run-dispatcher", false],
  ] as const)("cron-driven %s stays verify_jwt=%s", (fn, expected) => {
    expect(declared[fn]).toBe(expected);
  });

  it("operator-broker keeps gateway JWT verification on", () => {
    // Unlike the cron functions this one is called by a human's browser/CLI with a real
    // caller JWT, and re-verifies via getUser. It must NOT be lumped in with the above.
    expect(declared["operator-broker"]).toBe(true);
  });

  it("every cron-driven function authenticates at the application layer", () => {
    // A verify_jwt=false function is publicly reachable — it MUST check its own secret.
    for (const [fn, verifyJwt] of Object.entries(declared)) {
      if (verifyJwt) continue;
      const src = readFileSync(join(FUNCTIONS_DIR, fn, "index.ts"), "utf8");
      expect(
        /Deno\.env\.get\(["'][A-Z_]*SECRET["']\)/.test(src),
        `${fn} has verify_jwt=false but reads no *_SECRET from the environment — ` +
          `an unauthenticated public endpoint`,
      ).toBe(true);
    }
  });
});
