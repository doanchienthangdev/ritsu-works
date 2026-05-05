#!/usr/bin/env bash
# scripts/wave2-bootstrap-cron-secrets.sh
#
# Re-creates the `minion-worker-tick` pg_cron job with the worker secret
# inlined into `cron.job.command`. Required on hosted Supabase because the
# `postgres` role lacks SUPERUSER and cannot run
# `ALTER DATABASE postgres SET app.worker_secret = '<value>'` — neither from
# the SQL editor nor from `supabase db query --linked`.
#
# Run after:
#   1. `supabase db push --linked --yes` (applies migration 00014)
#   2. Any rotation of WORKER_SECRET in runtime/secrets/.env.local
#   3. Any `supabase db reset` against the linked project
#
# Idempotent: safely cancels and re-creates the named cron job.
#
# Reads:
#   - runtime/secrets/.env.local                                 → WORKER_SECRET
#   - /Users/doanchienthang/omg/ritsu/apps/web/.env.local        → SUPABASE_ACCESS_TOKEN
#
# Writes:
#   - cron.job row 'minion-worker-tick' on linked project (Management API)
#
# This script does NOT modify source files and never prints the secret value.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_LOCAL="$REPO_ROOT/runtime/secrets/.env.local"
PAT_SOURCE="/Users/doanchienthang/omg/ritsu/apps/web/.env.local"
PROJECT_REF="mntobbmieuoaxipnjaau"
PROJECT_URL="https://${PROJECT_REF}.supabase.co"
JOBNAME="minion-worker-tick"
CRON_EXPR='* * * * *'

if [ ! -f "$ENV_LOCAL" ]; then
  echo "✗ env file missing: $ENV_LOCAL" >&2
  exit 2
fi
if [ ! -f "$PAT_SOURCE" ]; then
  echo "✗ access-token source missing: $PAT_SOURCE" >&2
  exit 2
fi

WORKER_SECRET="$(grep -E '^WORKER_SECRET=' "$ENV_LOCAL" | cut -d= -f2-)"
if [ -z "$WORKER_SECRET" ]; then
  echo "✗ WORKER_SECRET unset in $ENV_LOCAL" >&2
  exit 2
fi

SUPABASE_ACCESS_TOKEN="$(grep -E '^SUPABASE_ACCESS_TOKEN=' "$PAT_SOURCE" | cut -d= -f2-)"
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "✗ SUPABASE_ACCESS_TOKEN unset in $PAT_SOURCE" >&2
  exit 2
fi
export SUPABASE_ACCESS_TOKEN

TMPFILE="$(mktemp /tmp/ritsu-cron-bootstrap.XXXXXX.sql)"
chmod 600 "$TMPFILE"
trap 'rm -f "$TMPFILE"' EXIT

# Quoting note: outer dollar-quote tag is $cmd$, must not collide with any
# token in the inner SQL. The secret value is interpolated by the shell
# (single-quoted in the produced SQL) before pg_cron stores the command.
cat > "$TMPFILE" <<EOF
-- Drop existing job if present (no-op if first run).
DO \$bootstrap\$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = '${JOBNAME}') THEN
    PERFORM cron.unschedule('${JOBNAME}');
  END IF;
END
\$bootstrap\$;

-- Re-create with the worker secret inlined into the command.
SELECT cron.schedule(
  '${JOBNAME}',
  '${CRON_EXPR}',
  \$cmd\$
  SELECT net.http_post(
    url     := '${PROJECT_URL}/functions/v1/minion-worker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'X-Worker-Auth', '${WORKER_SECRET}'
    ),
    body    := '{}'::jsonb
  );
  \$cmd\$
);
EOF

echo "→ Re-creating cron job '${JOBNAME}' on ${PROJECT_REF} (secret never printed)..."
~/bin/supabase db query --linked --file "$TMPFILE" >/dev/null 2>&1 \
  || { echo "✗ supabase db query failed — re-run with --debug if needed" >&2; exit 1; }

# Verify (cmd_len printed; the secret value is NEVER printed)
echo "→ Verifying registered cron entry:"
~/bin/supabase db query --linked --output table \
  "SELECT jobid, jobname, schedule, active, length(command) AS cmd_len FROM cron.job WHERE jobname = '${JOBNAME}';" \
  2>&1 | grep -v "^Initialising\|^untrusted\|^Run with\|^$" || true

echo "✓ Bootstrap complete. Cron job will tick every minute and authenticate"
echo "  against minion-worker using the inlined secret. Test by inserting a"
echo "  pending row into ops.scheduled_runs and waiting ≤90 seconds."
