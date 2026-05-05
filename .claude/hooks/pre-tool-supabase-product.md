---
name: pre-tool-supabase-product
version: 0.2.0
type: pre-tool
tools: [
  supabase-product*,
  postgres-product*,
  *_supabase_product_*
]
default_decision: block
fail_mode: closed
---

# Hook: pre-tool-supabase-product

> The firewall. Operating AI must not write to Product Supabase. This hook enforces that boundary unconditionally.

## What it does

Inspects any tool call that targets the Product Supabase project (`ritsu`). Allows ONLY:

1. The `etl-runner` role
2. Read-only operations (SELECT statements, GET endpoints)
3. Operations against pre-approved read views

Blocks everything else, including writes by `etl-runner` itself.

## Why this hook is special

This is the **only hook that defaults to BLOCK** rather than allow or escalate. The reasoning:

- The boundary is structural, not procedural
- No business workflow should require `ritsu-works` to write Product data
- Need-based exceptions go through ETL design (which writes to `ritsu-ops` `metrics.*`, not Product)
- Mistakes here have the highest blast radius in the entire system

The hook never escalates. There is no "founder approval" path that opens this gate. If the founder genuinely needs Operating AI to affect Product, the correct procedure is:

1. Open a PR proposing the new ETL flow into `ritsu-ops`
2. Have the change implemented in the **product repo**, not here
3. Operating AI consumes the resulting metrics, never writes back

## Decision logic

```
function decide(payload):
    target = identify_target(payload)

    if target.project != "ritsu" (Product):
        return allow()  # not our concern

    # Target is the Product project
    if payload.agent_role != "etl-runner":
        alert_founder_security(payload)
        return block(reason="non-etl-runner role attempted Product Supabase access")

    # Role IS etl-runner; check operation
    operation = identify_operation(payload)

    if operation.type != "read":
        alert_founder_security(payload)
        return block(reason="etl-runner attempted non-read on Product Supabase")

    # Read operation by etl-runner
    if not target.view in PRE_APPROVED_VIEWS:
        return block(reason=f"read target '{target.view}' not in pre-approved view list")

    return allow()
```

## Pre-approved views

The list of views/tables `etl-runner` may read from Product Supabase. Maintained by the product team in coordination with this repo. v0.2 starting list (TBD when actual provisioning happens):

```yaml
pre_approved_views:
  - public.etl_user_metrics      # daily user counts, signup rates
  - public.etl_subscription_state # subscription tier counts (no PII)
  - public.etl_session_aggregates # aggregate engagement metrics
  - public.etl_content_stats      # content generation stats
```

These views are designed to:
- Strip PII (user emails, names) at view-definition level in Product DB
- Aggregate at the level Operating AI needs (no row-level user data)
- Be append-only / current-state-only (no history that could be reconstructed for re-identification)

Any expansion of this list is a Tier D-Std action (PR + ceremony).

## How to identify target

The `target` in tool_payload depends on the tool:

- For `supabase-product` MCP server: explicit project ref or URL
- For raw `postgres-*` tools: connection string includes project URL
- For Supabase JS SDK calls: the client constructor's URL

The hook resolves to canonical form: `(project_ref, schema, view_or_table, operation_type)`.

## Special cases

- **Cross-project queries (foreign data wrappers):** if `etl-runner` uses FDW from `ritsu-ops` to pull from `ritsu`, the read still goes through this hook because the underlying connection targets Product. ALLOW only if the FDW is configured against pre-approved views.
- **Misconfigured connection string:** if a non-`etl-runner` role somehow has a Product credential (which itself is a `pre-tool-secrets` violation), this hook is the second line of defense.
- **`schema = pg_catalog` or system schemas:** treat as read of system metadata. Allow only for `etl-runner` and only if not exposing user data via system tables.
- **`SELECT FROM auth.users`:** SPECIFIC BLOCK — auth.users is never on the pre-approved list, even by accident.

## Test cases

| # | Role | Operation | Target | Expected |
|---|---|---|---|---|
| 1 | etl-runner | SELECT | `public.etl_user_metrics` | allow |
| 2 | etl-runner | SELECT | `public.users` (raw) | block (not pre-approved) |
| 3 | etl-runner | INSERT | `public.etl_user_metrics` | block (write attempt) |
| 4 | etl-runner | UPDATE | `public.users` | block (write + non-approved) |
| 5 | etl-runner | DELETE | anything in Product | block |
| 6 | etl-runner | DROP TABLE | anything in Product | block |
| 7 | gps | SELECT | `public.etl_user_metrics` | block (not etl-runner role) |
| 8 | growth-orchestrator | SELECT | anything in Product | block |
| 9 | etl-runner | SELECT | `auth.users` | block (auth schema never approved) |
| 10 | etl-runner | SELECT | view `public.etl_subscription_state` | allow |
| 11 | etl-runner | SELECT | `pg_catalog.pg_tables` | allow (system metadata, read only) |
| 12 | etl-runner | SELECT * FROM ritsu_ops.ops.tasks | allow (target is ritsu-ops, not ritsu) |
| 13 | etl-runner | (RPC) call function `public.dangerous_function()` | block (functions can mutate) |
| 14 | code-reviewer | accidentally configured with Product creds, attempts SELECT | block (role mismatch) |

## Performance notes

- Identifying target requires parsing the tool payload — keep parser simple (regex on URL plus schema/table extraction)
- Pre-approved view list is a small static set; check is O(1)

## Observability

EVERY block by this hook generates a security alert to the founder. This is unusual — normal hooks just log. This hook, because of its blast radius, requires immediate awareness:

1. Log to `ops.agent_runs.hook_events` (standard)
2. Send Telegram alert with severity "high"
3. Open a GitHub issue tagged `security-incident` if 2+ blocks in same session (potential compromise indicator)

False positives in this hook are very rare. If they happen, fix the root cause (usually a misconfigured tool or role), don't relax the hook.

## Integration with other hooks

This hook works with `pre-tool-secrets` as defense-in-depth:

- `pre-tool-secrets` ensures only `etl-runner` HOLDS the Product credential
- This hook ensures even if a credential leaked, the operation gets blocked

Both hooks must pass for Product Supabase access. Either failing blocks the call.

## Implementation reference

```python
PRE_APPROVED_VIEWS = {
    'public.etl_user_metrics',
    'public.etl_subscription_state',
    'public.etl_session_aggregates',
    'public.etl_content_stats',
}

PRODUCT_PROJECT_REF = 'XXXXXXXX'  # from manifest.yaml after Phase B

def identify_target(payload):
    """Parse target project, schema, table from any supported tool format."""
    # ...
    return {'project': '...', 'schema': '...', 'view': '...', 'op': '...'}

def decide(payload):
    target = identify_target(payload)
    if target['project'] != PRODUCT_PROJECT_REF:
        return {'decision': 'allow', 'reason': 'not Product project'}

    role = payload['agent_role']
    if role != 'etl-runner':
        alert_security(payload, 'non_etl_role_attempted_product_access')
        return {'decision': 'block',
                'reason': f"role '{role}' has no Product access"}

    op_type = target['op'].lower()
    if op_type not in ('select', 'read'):
        alert_security(payload, 'etl_runner_attempted_write')
        return {'decision': 'block',
                'reason': f"operation '{op_type}' is not read"}

    full_path = f"{target['schema']}.{target['view']}"
    if full_path not in PRE_APPROVED_VIEWS:
        # check if it's a system schema read
        if target['schema'] in ('pg_catalog', 'information_schema'):
            return {'decision': 'allow', 'reason': 'system metadata read'}
        return {'decision': 'block',
                'reason': f"view '{full_path}' not pre-approved"}

    return {'decision': 'allow', 'reason': 'etl-runner read of pre-approved view'}
```

---

*This hook is the most important safety boundary in the entire repo. The cost of a false positive is small. The cost of a false negative could be every paying user's data compromised.*
