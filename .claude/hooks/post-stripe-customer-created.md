---
name: post-stripe-customer-created
version: 0.1.0
type: post-event
tools: [mcp__gbrain__put_page, mcp__supabase-ops__insert]
default_decision: allow
fail_mode: closed
---

# Hook: post-stripe-customer-created

> When Stripe webhook reports `customer.created`, write a draft gbrain `companies/<slug>` page with PII placeholder + emit Tier B notify to `customer-lead` for confirmation.

Capability: `gbrain-operational-brain` v1.0 (Sprint 4).

## What it does

On every `stripe.customer.created` event received by the Edge Function webhook handler:

1. **Derive slug** from Stripe customer name. `slug = slugify(customer.name)` or `customer.metadata.company_slug` if present.

2. **Check existing page** via `mcp__gbrain__get_page companies/<slug>`. If exists → SKIP (idempotent; webhook may retry).

3. **Write draft page** via `mcp__gbrain__put_page`:
   ```yaml
   page_type: company
   slug: companies/<slug>
   state: draft
   frontmatter:
     stripe_customer_id: <id>
     stripe_created_at: <ts>
     contact_email: "<<EMAIL_PLACEHOLDER>>"        # NEVER include real email here
     contact_name: <name or "<<NAME_PLACEHOLDER>>">
     billing_tier: <metadata.tier>
     auto_created_by_hook: post-stripe-customer-created
     pii_confirmed: false
   body: |
     # <Customer name>

     Auto-created by Stripe webhook. Founder must Tier B confirm to replace
     PII placeholders with real values. See `governance/HITL.md` Appendix A
     PII-bearing tools section.
   ```

4. **Emit event** `ritsu.gbrain.write_committed` with payload:
   ```jsonc
   {
     "page_slug": "companies/<slug>",
     "page_type": "company",
     "auto_created": true,
     "pii_placeholder": true,
     "stripe_customer_id": "<id>"
   }
   ```

5. **`hitl-router`** picks up the event, queues a Tier B notify for `customer-lead` role to confirm in next daily Telegram digest.

## Why PII placeholder

The hook runs AUTONOMOUSLY (outside founder session). Per `governance/HITL.md` Appendix A "PII-bearing tools" section, `put_page` touching `companies/` MUST NOT include real PII in the page body when invoked autonomously. Pattern:

- Hook writes placeholder
- Founder Tier B confirms in daily digest → replaces placeholder with real email/name
- L3 invariant `gbrain-l3-pii-email-placeholder-confirmed-7d` (cross-tier-invariants.yaml from PR #100) catches placeholders sitting unconfirmed >7d and re-pings customer-lead

## Failure modes

| Failure | Detection | Handling |
|---|---|---|
| Stripe webhook signature invalid | Edge Function pre-check | Reject webhook 401; do not invoke this hook |
| gbrain MCP unreachable | MCP call timeout | Queue for retry; webhook returns 200 (don't trigger Stripe retry storm) |
| Slug collision (Stripe race condition) | Step 2 check | SKIP; webhook is idempotent |
| Budget cap reached (Hard-cap Option B) | pre-budget-check.sh on next gbrain call | Hook write blocked; alert customer-lead via fallback path (ops.tasks insert) |

## Cost

~$0.02 per invocation (gbrain.post-stripe-hook.put_page).

## Status

Spec-only Sprint 4. Real handler (Edge Function endpoint + MCP wiring) lands when Stripe webhook infrastructure ships — likely Sprint 5 or v1.1 follow-up. For Sprint 4 v1.0, the schedule yaml + handler stub satisfy the L2 schedules ↔ skill registry validator; actual invocation is deferred.

## References

- `governance/HITL.md` Appendix A — gbrain PII-bearing tools section
- `knowledge/cross-tier-invariants.yaml` — `gbrain-l3-pii-email-placeholder-confirmed-7d`
- `wiki/capabilities/gbrain-operational-brain/spec.md` §4.9 — Sprint 4 hook spec
- `06-ai-ops/skills/brain-write-discipline/SKILL.md` — write-discipline contract
- `governance/ROLES.md` v1.1 — `customer-lead` role mcp_servers grant for gbrain
