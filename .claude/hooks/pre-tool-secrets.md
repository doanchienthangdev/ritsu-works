---
name: pre-tool-secrets
version: 0.2.0
type: pre-tool
tools: [*]  # runs on every tool call that resolves a secret
default_decision: allow
fail_mode: closed
---

# Hook: pre-tool-secrets

> Enforces the role-secret allowlist in `governance/SECRETS.md` and `governance/ROLES.md`. A role can only USE the secrets explicitly granted to it.

## What it does

Before a tool call resolves any secret-backed environment variable, the hook verifies:

1. The agent's role HAS an entry in `governance/ROLES.md`
2. The secret being resolved IS in that role's `secrets` list
3. The secret IS in `governance/SECRETS.md` `used_by` list for this role
4. The role is currently active (not deprecated)

Any mismatch → block.

## Why two-sided check (ROLES + SECRETS)

The check looks at BOTH files because they can drift:

- ROLES.md says role X uses secret Y, but SECRETS.md doesn't list role X under Y → fail (drift)
- SECRETS.md lists role X under Y, but ROLES.md doesn't list Y under role X → fail (drift)

Either drift is a governance bug. The hook fails closed and forces resolution by humans.

## Decision logic

```
function decide(payload):
    role = payload.agent_role
    resolved_secrets = inspect_payload_for_secrets(payload)

    if not resolved_secrets:
        return allow()  # no secrets in this call

    # Load policy (cached, mtime-checked)
    roles_md = load_roles_yaml()
    secrets_md = load_secrets_md()

    role_def = roles_md.find(role)
    if not role_def:
        return block(reason=f"role '{role}' not defined in ROLES.md")
    if role_def.status == 'deprecated':
        return block(reason=f"role '{role}' is deprecated")

    role_allowed_secrets = set(role_def.secrets)

    for secret_name in resolved_secrets:
        # Check 1: ROLES.md says this role can use this secret
        if secret_name not in role_allowed_secrets:
            alert_security(payload, secret_name, role)
            return block(reason=f"role '{role}' not allowed secret '{secret_name}'")

        # Check 2: SECRETS.md says this secret is used by this role
        secret_def = secrets_md.find(secret_name)
        if not secret_def:
            return block(reason=f"secret '{secret_name}' not defined in SECRETS.md")
        if role not in secret_def.used_by:
            alert_security(payload, secret_name, role, kind="drift")
            return block(reason=f"drift: ROLES.md grants '{secret_name}' to '{role}' but SECRETS.md disagrees")

    return allow()
```

## Inspecting the payload for secrets

The hook needs to know which secrets a tool call uses. Approaches:

**Approach 1 — Static configuration (preferred for v0.2):**

Each MCP server in `mcp/servers.yaml` declares which env-var names it consumes:

```yaml
email_sender:
  command: ...
  env_uses:
    - RESEND_PROD_TRANSACTIONAL_KEY
    - RESEND_PROD_MARKETING_KEY
```

The hook reads this declaration and treats all listed env vars as "secrets potentially used by this tool call."

**Approach 2 — Runtime inspection (more accurate, more complex):**

Hook intercepts the env-var resolution layer of the secret manager (1Password CLI, Doppler CLI, etc.) and gets the actual list of fetched secrets for this call.

v0.2 spec uses Approach 1. v1.x may upgrade to Approach 2.

## Special cases

- **Secrets accessed by hooks themselves:** hooks need their own secrets sometimes (e.g. Telegram bot token to send security alerts). Hooks are NOT subject to this check — they're trusted runtime infrastructure. Document which secrets each hook uses in its spec frontmatter.

- **Secret rotation in flight:** during rotation, both old and new secret may be valid for ~5 minutes. The allowlist check uses the secret NAME, not value, so rotation doesn't affect the check.

- **Founder role:** `founder` has `"*"` in secrets list per ROLES.md. The hook treats `"*"` as "any defined secret" — but the secret still must exist in SECRETS.md. No phantom secrets.

- **Newly-added role:** if a PR adds a role + secret usage but the deployed allowlist hasn't been refreshed yet, the hook blocks based on stale config. Operator must redeploy or wait for cache TTL.

## Test cases

| # | Role | Tool calling | Resolved secret | Expected |
|---|---|---|---|---|
| 1 | etl-runner | postgres-product | SUPABASE_PRODUCT_READONLY_ETL_KEY | allow |
| 2 | growth-orchestrator | postgres-product | SUPABASE_PRODUCT_READONLY_ETL_KEY | block (role not in used_by) |
| 3 | gps | telegram-bot | TELEGRAM_BOT_FOUNDER | allow |
| 4 | content-drafter | email-sender | RESEND_PROD_TRANSACTIONAL_KEY | block (role can't publish) |
| 5 | growth-orchestrator | email-sender | RESEND_PROD_MARKETING_KEY | allow |
| 6 | growth-orchestrator | stripe-charge | STRIPE_PROD_SECRET_KEY | block (role not allowed any Stripe secret beyond read) |
| 7 | backoffice-clerk | stripe-read | STRIPE_PROD_READ_ONLY_KEY | allow |
| 8 | nonexistent-role | anything | anything | block (role not in ROLES.md) |
| 9 | gps (deprecated test variant) | anything | anything | block (deprecated role) |
| 10 | etl-runner | postgres-ops | SUPABASE_OPS_FULL_SERVICE_KEY | allow |
| 11 | gps | postgres-ops | SUPABASE_OPS_FULL_SERVICE_KEY | block (gps gets ANON only) |
| 12 | gps | postgres-ops | SUPABASE_OPS_ANON_KEY | allow |
| 13 | (drift test) ROLES grants GROWTH_TOKEN to growth-orch but SECRETS doesn't list growth-orch under GROWTH_TOKEN | block (drift detected) |
| 14 | hook itself | telegram-alerts | TELEGRAM_BOT_FOUNDER (used to send security alert) | allow (hooks bypass) |

## Performance notes

- ROLES.md and SECRETS.md are parsed once per process and cached
- Cache invalidation on file mtime change
- Secret-name lookup is O(1) hashmap
- Drift detection adds one extra lookup, still O(1)

## Observability

Every block from this hook generates a security event:

- Telegram alert to founder
- GitHub issue tagged `security-incident` if 3+ blocks in same session
- Quarterly audit (per SECRETS.md): query `ops.agent_runs.hook_events` for this hook's blocks → review for missed drift

## Defense in depth

This hook is one layer. Other layers:

- Secret manager scopes service accounts to specific vaults (not all secrets visible to all callers)
- MCP servers themselves verify scopes upstream (a Stripe restricted key still won't allow refunds even if leaked)
- Audit log catches abuse retrospectively even if real-time block fails

A determined attacker who has obtained a service account token could still bypass this hook in some scenarios. The mitigation is fast rotation (per SECRETS.md cadence) plus the audit/alerting layers.

## Implementation reference

```python
import yaml
from functools import lru_cache
from pathlib import Path

@lru_cache(maxsize=1)
def _load_roles(mtime: float):
    return yaml.safe_load(Path('governance/ROLES.md').read_text())

def load_roles():
    mt = Path('governance/ROLES.md').stat().st_mtime
    return _load_roles(mt)

# Similar for SECRETS.md ...

def decide(payload):
    role = payload['agent_role']
    secrets = inspect_payload_for_secrets(payload)
    if not secrets:
        return {'decision': 'allow', 'reason': 'no secrets in call'}

    roles = load_roles()
    role_def = next((r for r in roles if r['slug'] == role), None)
    if not role_def:
        return {'decision': 'block', 'reason': f"role '{role}' not defined"}

    allowed = set(role_def.get('secrets', []))
    if '*' in allowed:
        # founder; all defined secrets allowed
        defined_secrets = set_of_all_secrets_in_secrets_md()
        unknown = [s for s in secrets if s not in defined_secrets]
        if unknown:
            return {'decision': 'block', 'reason': f"unknown secrets: {unknown}"}
        return {'decision': 'allow', 'reason': "founder full access"}

    for s in secrets:
        if s not in allowed:
            alert_security(payload, s, role)
            return {'decision': 'block',
                    'reason': f"role '{role}' not allowed '{s}'"}
        # drift check: SECRETS.md must agree
        if not secrets_md_grants(s, role):
            alert_security(payload, s, role, kind="drift")
            return {'decision': 'block',
                    'reason': f"drift: ROLES grants {s} to {role} but SECRETS doesn't"}

    return {'decision': 'allow', 'reason': 'all checks passed'}
```

---

*ROLES.md and SECRETS.md are policy. Without this hook, they're documentation. With this hook, they're enforcement.*
