# Bài #17 — Multi-Surface + Multilingual Operations (DRAFT)

**Status:** DRAFT — derived from G7 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G7-multi-surface.md`
**Dependencies:** Bài #1, #2, #4, #6, #8 DRAFT, #9 DRAFT, #11 DRAFT, #12 DRAFT, #13 DRAFT, #16 DRAFT

## Why
~16 issues across content distribution + customer support + multilingual.

Ritsu key facts: 10 social channels, 10 languages supported. Phase A treats channels ad-hoc. Phase A.2 reveals: surfaces share concerns (auth, rate limit, format conversion, locale, compliance) — needs unified architecture.

Without Bài #17:
- Manual posting to 10 channels = founder bandwidth sink
- 10 channels × 10 locales = 100 ad-hoc variants (drift)
- Inbound signals lost (no unified ingestion)
- Per-surface compliance violations → permanent bans (WhatsApp, etc.)
- Cross-surface customer threads = fragmented experience

## Decisions (tentative)

### Axis 1 — Surface Adapter + Channel Registry
**Choice:** SurfaceAdapter interface + Tier 1 declarative knowledge/channels.yaml
- 13+ surfaces (10 social + email + telegram + dashboard + MCP)
- Common interface (publish, reply, poll_inbox, subscribe_webhook, health, rate_limit)
- Auth pattern per channel (oauth_2_0, bot_token, smtp_imap)
- Rate limits enforced at adapter level
- Compliance rules per surface

### Axis 2 — Format Converter + Variant Generation
**Choice:** Format converter library + content-variant-generator skill
- O(N) converters, not O(N × M) (channels × locales = exponential)
- Per-channel formatters (twitter-thread, linkedin-post, instagram-carousel, etc.)
- Deterministic conversions → ops.minion_jobs (Minions pattern)
- Judgment conversions (LinkedIn rephrasing) → subagent
- Multi-language workflow: source → translation → cultural adaptation → channel formatting

### Axis 3 — Inbound Signal Aggregation + Threading
**Choice:** Adapters → ops.events unified + ops.conversations threading
- Surface adapters poll/webhook → normalize → ops.external_events
- Deduplication across surfaces (same person, same content)
- ops.conversations table tracks cross-surface customer threads
- Customer matching via email/phone/handle

### Axis 4 — Locale Routing + Cultural Register + Compliance
**Choice:** knowledge/locales.yaml + brand_voice variants + surface-compliance.yaml
- 10 locales với formality + honorifics + cultural notes
- Brand voice variants per locale (inherit philosophy, adapt register)
- Per-surface compliance enforced before publish (fail-safe)

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES customers(id),
  primary_locale  text,
  state           text NOT NULL,
  state_since     timestamptz,
  created_at      timestamptz DEFAULT now(),
  last_message_at timestamptz,
  surface_thread_refs jsonb
);

CREATE TABLE ops.conversation_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ops.conversations(id),
  surface_id      text NOT NULL,
  surface_message_id text,
  direction       text NOT NULL,         -- 'inbound' | 'outbound'
  author_role     text,
  locale          text,
  content         text,
  metadata        jsonb,
  occurred_at     timestamptz NOT NULL
);

CREATE INDEX ON ops.conversations (customer_id, last_message_at DESC);
CREATE INDEX ON ops.conversation_messages (conversation_id, occurred_at);
```

## YAML schemas

```yaml
# knowledge/channels.yaml
channels:
  - id: <slug>
    name: <human readable>
    adapter: <adapter name>
    type: social | professional | messaging | direct | internal | api
    auth:
      kind: oauth_2_0 | bot_token | smtp_imap | api_key
      credential_ref: secrets/<key>
    formats_supported: [<format-list>]
    rate_limits:
      <metric>: <quota>
    inbound_kinds: [<kinds>]
    locale_support: all | [<locale-ids>]
    compliance:
      - rule: <rule-id>
```

```yaml
# knowledge/locales.yaml
locales:
  - id: <iso-code>
    name: <human readable>
    formality_default: casual | neutral | formal
    formality_options: [<options>]
    honorifics: [<list>]
    direction: ltr | rtl
    date_format: <format>
    cultural_notes: <markdown>
```

```yaml
# knowledge/surface-compliance.yaml
compliance_rules:
  <rule-id>:
    description: <markdown>
    requirements:
      - <requirement-1>
      - <requirement-2>
    enforced_by_adapter: <adapter name>
```

## TypeScript interface

```typescript
export interface SurfaceAdapter {
  channel_id: string;
  publish(content: NormalizedContent, options: PublishOptions): Promise<PublishResult>;
  reply(to_message_id: string, content: NormalizedContent): Promise<ReplyResult>;
  poll_inbox(since_ts: timestamp): Promise<NormalizedMessage[]>;
  subscribe_webhook(url: string): Promise<WebhookSubscription>;
  check_health(): Promise<HealthStatus>;
  rate_limit_status(): Promise<RateLimitStatus>;
}
```

## New components (25)

25 components — channel/locale registries (Tier 1) + 13+ adapters + format converters + 2 schemas + skills + brand voice variants + 4 cross-bài-toán updates.

## Initial 13 surfaces

Social: twitter, linkedin, facebook, instagram, tiktok, youtube, threads, reddit
Messaging: telegram, whatsapp, discord
Direct: email
Internal: dashboard, mcp

## Initial 10 locales

en, vi, jp, ko, zh-CN, zh-TW, es, fr, de, pt, id (10+ supported)

## Open questions

- OQ17.1: Voice surfaces (Twilio, phone)?
- OQ17.2: In-app messaging native chat?
- OQ17.3: API marketplace (Zapier, Make)?
- OQ17.4: Persona consistency across surfaces?
- OQ17.5: Cross-surface campaign attribution?
- OQ17.6: Group chat threading?
- OQ17.7: Encryption at rest for surface data?
- OQ17.8: Multi-account per surface?
- OQ17.9: Real-time vs polling per surface?

## Anti-patterns

- ❌ One skill per channel (drift)
- ❌ Per-channel auth in code (use credential refs)
- ❌ Direct API calls bypassing adapter
- ❌ Skip inbound aggregation (signals lost)
- ❌ Translate without cultural adaptation
- ❌ Single brand_voice.md across locales
- ❌ Skip per-surface compliance
- ❌ Hardcode rate limits in skills
- ❌ Conversation threading via memory only
- ❌ Same persona voice across all surfaces
- ❌ Customer matching via email only
- ❌ Skip surface health monitoring

## GBrain integration notes

- **Auto-link extraction** handles surface mentions in content
- **Compiled-truth + timeline** format adapts to per-surface posting log
- **Skillify pattern** applies to surface adapter testing
- **Minions pattern** — format converters mostly deterministic → minion queue

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Surface APIs | Various (Twitter API, LinkedIn API, etc.) |
| Auth | OAuth, API keys, bot tokens |
| Adapter framework | TypeScript |
| Storage | Postgres ops.conversations, ops.conversation_messages |
| Format conversion | TypeScript libraries |
| Health monitoring | Bài #10 dashboard |

## Ritsu adds (Outer Harness)

1. SurfaceAdapter interface + 13+ adapters
2. channels.yaml + locales.yaml + surface-compliance.yaml (Tier 1)
3. Format converter library
4. content-variant-generator skill
5. inbound-signal-aggregator skill
6. ops.conversations + ops.conversation_messages
7. Brand voice variants per locale
8. Surface health monitoring (Bài #10 integration)
9. MCP tools: ritsu.content.publish, ritsu.conversation.thread
10. Cross-bài-toán updates (#6, #9, #11, #16)

## Lessons captured

1. Surface = adapter pattern (common interface).
2. Channel registry as Tier 1 = single source of truth.
3. Format converter library = O(N) not O(N × M).
4. Locale ≠ language (formality, honorifics, cultural references).
5. Brand voice per locale.
6. Conversation threading across surfaces.
7. Per-surface compliance non-negotiable.
8. Inbound + outbound symmetric architecture.
9. Rate limit enforcement at adapter, not skill.
10. Deterministic vs judgment converter routing (Minions).
11. Surface health = first-class observability.
12. Cross-surface deduplication essential.
