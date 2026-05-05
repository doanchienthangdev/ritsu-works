# minion-worker (Bài #5 Minions queue worker)

Wave 2 Edge Function. Polls `ops.scheduled_runs` for pending rows, claims one,
invokes the resolved skill, marks it completed/failed.

## Status

**SCAFFOLD** — atomic claim + dispatch loop wired. Skill registry has only
`heartbeat-ping` (no LLM dependency). LLM-backed skills return
`deferred_no_api_key` until `ANTHROPIC_API_KEY` is set.

## Wiring (when ready)

```bash
# 1. Reuse DISPATCHER_SECRET as WORKER_SECRET, or generate a fresh one
supabase secrets set WORKER_SECRET="$(openssl rand -hex 32)"

# 2. Deploy
supabase functions deploy minion-worker --no-verify-jwt

# 3. Schedule via pg_cron — every 1 minute
SELECT cron.schedule(
  'minion-worker-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/minion-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Worker-Auth', current_setting('app.worker_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Concurrency

Two parallel invocations both run `claimNextRun()`:
1. Both `SELECT` the same oldest pending row (read-after-read is fine).
2. Both run `UPDATE ... WHERE id = X AND state = 'pending'`.
3. Postgres serializes UPDATEs on the same row. The second `.eq("state","pending")`
   filter no longer matches → returns null → second worker moves on.

## Skill registry extension

To register a new skill:

```ts
SKILL_REGISTRY["my-skill-name"] = async (run) => {
  // … do work, optionally calling Anthropic API via ANTHROPIC_API_KEY …
  return { ok: true, output: { ... } };
};
```

Long-term, skills live as TypeScript modules under `05-ai-ops/skills/<name>/`
and are bundled at deploy time. The Wave 2 scaffold inlines them for clarity.

## File map

```
supabase/functions/minion-worker/
├── index.ts          # entry point; serve POST → loop claim/execute/finalize
└── README.md         # this file
```
