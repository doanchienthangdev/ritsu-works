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
// (Anthropic-backed) and etl-product-dau-snapshot (Product Supabase-gated).
// LLM-backed skills are only registered when ANTHROPIC_API_KEY is set.
// The ETL skill is always registered: it returns deferred_no_product_supabase_key
// until SUPABASE_PRODUCT_URL + SUPABASE_PRODUCT_READONLY_ETL_KEY are
// provisioned (D-MAX per governance/HITL.md).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.69.0";
import {
  makeConsistencySweepHandler,
  makeDeferredStubHandler,
  makeDriftFixProposerHandler,
  makeEtlProductDauSnapshotHandler,
  makeHeartbeatPingHandler,
  makeSynthesizeMorningBriefHandler,
  processWorkerTick,
  SkillRegistry,
} from "../_shared/worker.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// Product Supabase read-only access for ETL. Only the etl-runner role's secret
// bundle should populate these. See governance/SECRETS.md.
const SUPABASE_PRODUCT_URL = Deno.env.get("SUPABASE_PRODUCT_URL") ?? "";
const SUPABASE_PRODUCT_READONLY_ETL_KEY =
  Deno.env.get("SUPABASE_PRODUCT_READONLY_ETL_KEY") ?? "";

// GitHub PAT for the consistency engine drift-fix-proposer (v1.1+).
// Scoped to contents:write + pull_requests:write on this repo only.
// 90-day rotation per governance/SECRETS.md. Founder provisions via D-Std.
const GITHUB_CONSISTENCY_BOT_TOKEN = Deno.env.get("GITHUB_CONSISTENCY_BOT_TOKEN") ?? "";
const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") ?? "doanchienthangdev";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "ritsu-works";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

const metricsSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "metrics" },
});

const productSb =
  SUPABASE_PRODUCT_URL && SUPABASE_PRODUCT_READONLY_ETL_KEY
    ? createClient(SUPABASE_PRODUCT_URL, SUPABASE_PRODUCT_READONLY_ETL_KEY, {
        auth: { persistSession: false },
      })
    : null;

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const githubConfig = GITHUB_CONSISTENCY_BOT_TOKEN
  ? { owner: GITHUB_OWNER, repo: GITHUB_REPO, token: GITHUB_CONSISTENCY_BOT_TOKEN }
  : null;

const SKILL_REGISTRY: SkillRegistry = {
  "heartbeat-ping": makeHeartbeatPingHandler(sb),
  "consistency-sweep": makeConsistencySweepHandler({ sb }),
  "drift-fix-proposer": makeDriftFixProposerHandler({
    sb,
    github: githubConfig,
    // generateRegenBundleFix is wired in a follow-up — v1.1 ships the skill
    // scaffold + GitHub PR pipeline. Until the generator is wired, the skill
    // reports "no handler" for every failed row and returns ok.
  }),
  "etl-product-dau-snapshot": makeEtlProductDauSnapshotHandler({
    metricsSb,
    opsSb: sb,
    productSb,
  }),
  // Deferred stubs — referenced by schedules.yaml but not yet implemented.
  // Tracked by cross-tier-invariants.yaml (schedules-skills-registered).
  // Replace each with a real handler when the skill ships.
  "stale-decision-detector": makeDeferredStubHandler("stale-decision-detector not implemented yet (Bài #15)"),
  "data-retention-scanner": makeDeferredStubHandler("data-retention-scanner not implemented yet (Bài #16)"),
  "ingestion-source-poller": makeDeferredStubHandler("ingestion-source-poller not implemented yet (Bài #18)"),
  "minion-queue-cleaner": makeDeferredStubHandler("minion-queue-cleaner not implemented yet"),
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
