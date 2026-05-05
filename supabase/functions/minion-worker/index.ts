// minion-worker — Bài #5 Minions queue worker (Edge Function entry point).
// Pure logic lives in ../_shared/worker.ts so it can be unit-tested in Node.
//
// References:
//   knowledge/feature-flags.yaml — gating per skill (mode + requires_api).
//   supabase/migrations/00003_schedules_sops.sql — ops.scheduled_runs schema.
//   notes/wave-2-implementation-plan.md — Wave 2 state machine.
//   supabase/functions/_shared/worker.ts — testable pure logic.
//   tests/worker.test.ts — unit tests.
//
// Wave 2 status: SKILL_REGISTRY now includes synthesize-morning-brief
// (Anthropic-backed). LLM-backed skills are only registered when
// ANTHROPIC_API_KEY is set; otherwise the worker still serves heartbeat-ping
// and returns deferred_no_api_key for any unregistered skill.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.69.0";
import {
  makeHeartbeatPingHandler,
  makeSynthesizeMorningBriefHandler,
  processWorkerTick,
  SkillRegistry,
} from "../_shared/worker.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const SKILL_REGISTRY: SkillRegistry = {
  "heartbeat-ping": makeHeartbeatPingHandler(sb),
  ...(anthropic
    ? {
        "synthesize-morning-brief": makeSynthesizeMorningBriefHandler({ anthropic }),
      }
    : {}),
};

serve(async (req) => {
  const result = await processWorkerTick(
    {
      sb,
      registry: SKILL_REGISTRY,
      workerSecret: WORKER_SECRET,
      anthropicApiKey: ANTHROPIC_API_KEY,
    },
    req.method,
    req.headers.get("x-worker-auth"),
  );

  if (typeof result.body === "string") {
    return new Response(result.body, { status: result.status });
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
});
