// scheduled-run-dispatcher — Bài #8 (Scheduling) Edge Function entry point.
// Pure logic lives in ../_shared/dispatcher.ts so it can be unit-tested in Node.
//
// References:
//   knowledge/schedules.yaml         — schedule registry (Tier 1)
//   knowledge/feature-flags.yaml     — gating per skill
//   knowledge/phase-a2-extensions/bai-8-scheduling-architecture-DRAFT.md
//   supabase/migrations/00003_schedules_sops.sql — ops.scheduled_runs schema
//   supabase/functions/_shared/dispatcher.ts — testable pure logic
//   tests/dispatcher.test.ts                — unit tests
//
// SCHEDULES is bundled at build time from knowledge/schedules.yaml via
// scripts/wave2-bundle-schedules.cjs. Re-run `pnpm wave2:bundle-schedules`
// after editing schedules.yaml, then redeploy this function.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { processDispatchRequest } from "../_shared/dispatcher.ts";
import { SCHEDULES } from "../_shared/schedules.generated.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISPATCHER_SECRET = Deno.env.get("DISPATCHER_SECRET") ?? "";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

serve(async (req) => {
  let body: unknown = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "bad_json" }), { status: 400 });
    }
  }

  const result = await processDispatchRequest(
    {
      sb,
      schedules: SCHEDULES,
      dispatcherSecret: DISPATCHER_SECRET,
    },
    req.method,
    req.headers.get("x-dispatcher-auth"),
    body,
  );

  if (typeof result.body === "string") {
    return new Response(result.body, { status: result.status });
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
});
