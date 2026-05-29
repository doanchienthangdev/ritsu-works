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
  makeVerifyDocClaimsHandler,
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
  // === Wiki-sync cron handler stubs ===
  // Registered to satisfy the L2 paired-handler validator.
  //   wiki-embeddings-backfill: the CLI scripts/sync/backfill-wiki-embeddings.cjs
  //     is now v0.2 (real OpenAI text-embedding-3-small backfill; founder/CI
  //     runnable). The Edge cron handler stays deferred for an architectural
  //     reason, NOT laziness: Supabase Edge has no repo filesystem AND
  //     ops.knowledge_pages.compiled_truth is NULL for derived entities, so a
  //     Deno handler cannot read page bodies the way the Node CLI does.
  //     Activating cron needs a vehicle decision (GitHub-fetch in Deno OR a
  //     GitHub-Actions runner that checks out the repo) PLUS OPENAI_API_KEY
  //     provisioned into Edge env. Tracked in /cla fix wiki-sync-from-refs v4.4.1.
  //   wiki-review-queue-digest: founder runs `/wiki review` interactively
  "wiki-embeddings-backfill": makeDeferredStubHandler("wiki-embeddings-backfill: CLI scripts/sync/backfill-wiki-embeddings.cjs is v0.2 (real backfill, runnable now). Edge handler deferred — Edge has no repo FS + knowledge_pages.compiled_truth is NULL; needs a GitHub-fetch/GH-Actions vehicle + OPENAI_API_KEY in Edge env. Run the CLI manually meanwhile."),
  "wiki-review-queue-digest": makeDeferredStubHandler("wiki-review-queue-digest stub: needs Telegram bot wiring. Founder runs /wiki review interactively in the meantime."),
  // docs-engine drift detection (Sprint 1 PR-3). Real implementation is
  // deterministic (scripts/validate-docs-coverage.cjs + scripts/docs-sync.cjs --dry-run);
  // when the worker tick infrastructure is wired (Sprint 2+), this handler will
  // shell out to those scripts. Until then, schedule fires + worker returns
  // deferred — founder may run `node scripts/validate-docs-coverage.cjs` manually.
  // Naming: registry key is flat-hyphenated (L2 validator regex requirement).
  // Sub-skill umbrella in 06-ai-ops/skills/docs-engine/check/ remains `docs-engine/check`.
  "docs-engine-check": makeDeferredStubHandler("docs-engine-check stub: deterministic logic in scripts/validate-docs-coverage.cjs. Worker-side shell-out wiring lands in Sprint 2+. Founder may run manually: `node scripts/validate-docs-coverage.cjs`."),
  // eval-evo v1.0 day-30 falsifiable efficacy gate (capability `evolve`).
  // Wraps scripts/eval-evo/calibrate-efficacy.cjs. Cron fires daily; script
  // short-circuits to INSUFFICIENT_DATA if <10 /evolve runs available. Real
  // PAUSE-RECOMMENDED path runs at most once (founder retro then resolves).
  // Real Edge Function wrapper deferred to v1.1 — for v1.0, founder invokes
  // manually: `node scripts/eval-evo/calibrate-efficacy.cjs`.
  "eval-evo-calibrate-efficacy": makeDeferredStubHandler("eval-evo-calibrate-efficacy stub: founder runs `node scripts/eval-evo/calibrate-efficacy.cjs` manually for v1.0. Wired to cron via knowledge/schedules.yaml. Real Edge Function wrapper deferred to v1.1."),
  // capability evolve v1.1 (SkillOpt integration) Sprint 4 — monthly
  // Spearman correlation cron. Wraps scripts/eval-evo/skillopt-synth-prod-correlation.cjs.
  // Real Edge Function dispatch deferred to Sprint 5 (when first /evolve
  // skillopt run produces held-out + post-install data). Until then,
  // founder runs handler manually: `node scripts/eval-evo/skillopt-synth-prod-correlation.cjs`.
  "skillopt-synth-prod-correlation": makeDeferredStubHandler("skillopt-synth-prod-correlation stub: founder runs `node scripts/eval-evo/skillopt-synth-prod-correlation.cjs` manually for v1.1. Wired to cron via knowledge/schedules.yaml (monthly). Real Edge Function dispatch deferred to Sprint 5+."),
  // ==========================================================================
  // gbrain integration cron handlers (capability gbrain-operational-brain
  // v1.0 Sprint 4). All deferred-stub until Sprint 5 wires .mcp.json gbrain
  // entry + Sprint 6 lands the runbook for handler infra. Founder may run
  // gbrain CLI manually in the meantime.
  // ==========================================================================
  "crm-to-gbrain-mirror": makeDeferredStubHandler("crm-to-gbrain-mirror stub (capability gbrain-operational-brain v1.0): nightly ETL of public.companies billing fields → gbrain companies/<slug> frontmatter via mcp__gbrain__put_page. Needs gbrain MCP available — lands Sprint 5 (.mcp.json wrapper). Founder may run `gbrain serve` + manual sync in the meantime."),
  "gbrain-consistency-nightly": makeDeferredStubHandler("gbrain-consistency-nightly stub (capability gbrain-operational-brain v1.0): nightly L1+L2+L3 invariant sweep on gbrain pages → inserts ops.consistency_checks rows + emits ritsu.gbrain.consistency_drift event on fail. Needs gbrain MCP + invariant handlers (Sprint 6) — for v1.0 deferred."),
  "gbrain-dream-cycle": makeDeferredStubHandler("gbrain-dream-cycle stub (capability gbrain-operational-brain v1.0): nightly dedup + citation fix + contradiction detection + synthesis run by gbrain-maintainer role ($30/mo cap; Hard-cap Option B graceful degrade at $100 global). Needs gbrain MCP + persona_slug='gbrain-maintainer' invocation infra — lands Sprint 5+6. Founder may invoke manually via `gbrain dream-cycle` CLI in the meantime."),
  // resolver-v3 hourly health-check (capability resolver-v3-jit-loading v3.0.0 Sprint 4).
  // Hourly canary invokes mcp__resolver__find({intent:"canary test query", limit:1}).
  // Logs ops.events resolver.health_check. After 3 consecutive failures: emits
  // resolver.health_degraded → Tier B Telegram alert (catches silent MCP boot failure
  // post-CLAUDE.md-cutover). Active only post-cutover (RESOLVER_JIT_ENABLED gate).
  "resolver-v3-health-check": makeDeferredStubHandler("resolver-v3-health-check stub (capability resolver-v3-jit-loading v3.0.0): hourly mcp__resolver__find canary call. Real handler shells out to MCP server. Active only after CLAUDE.md Tier C cutover ceremony lands. Founder may invoke MCP tool manually for diagnostic in meantime: `echo '{intent:\"canary\"}' | claude mcp call resolver_find`."),
  ...(anthropic
    ? {
        "synthesize-morning-brief": makeSynthesizeMorningBriefHandler({ anthropic }),
        // verify-doc-claims: AI semantic check. Dormant until a doc-section
        // bundler ships (v1.2.1) — loadDocSection always returns null in v1.2
        // production, so the skill returns deferred_no_doc_section. Wiring
        // the bundler activates it without registry changes.
        "verify-doc-claims": makeVerifyDocClaimsHandler({
          sb,
          anthropic,
          loadDocSection: async () => null,
        }),
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
