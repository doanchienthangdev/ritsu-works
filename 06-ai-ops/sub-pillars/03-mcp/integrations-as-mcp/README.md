# 08-integrations — External Integrations Pillar

> Trụ cột "Tích hợp": webhook receivers, external APIs, MCP server hosting, third-party data ETL.

**Status:** Scaffold (Wave 4-6 implementation)
**Pillar code:** INTEGRATIONS
**Bài toán reference:** Bài #11 (events), Bài #12 (MCP), Bài #17 (surfaces), Bài #18 (ingestion)

---

## Scope

Pillar 08-integrations chịu trách nhiệm:

- **Webhook receivers** — Stripe, GitHub, Telegram, social platforms
- **External API integrations** — 3rd-party services
- **MCP server hosting** — exposing internal tools (Bài #12)
- **ETL pipelines** — external data → internal schemas
- **Surface adapter implementations** — Bài #17
- **Ingestion adapter implementations** — Bài #18
- **Event source registrations** — Bài #11

## Folder structure

```
webhooks/
├── stripe-webhook/             ← Stripe payment events
├── github-webhook/             ← Code push, deploy events
├── telegram-webhook/           ← Bot message events
├── twitter-webhook/            ← Twitter mentions, DMs
└── ...

sops/
├── SOP-INT-001-webhook-stripe-process/
├── SOP-INT-002-mcp-tool-execution/
├── SOP-INT-003-external-api-fallback/
└── ...
```

## Cross-pillar dependencies

- **knowledge/event-subscriptions.yaml** (Bài #11) — webhook → SOP routing
- **knowledge/mcp-tools.yaml** + **mcp-roles.yaml** (Bài #12) — MCP server config
- **knowledge/channels.yaml** (Bài #17) — surface adapter mapping
- **knowledge/ingestion-sources.yaml** (Bài #18) — ingestion adapter mapping
- **05-ai-ops/surface-adapters/** + **ingestion-adapters/** — adapter implementations

## Webhook architecture pattern

Each external service:

```
External service (Stripe, GitHub, etc.)
  ↓ webhook POST
Bước A: Supabase Edge Function          Bước B: VPS endpoint
  ↓                                       ↓
Verify signature                        Verify signature
  ↓                                       ↓
INSERT INTO ops.events (outbox)         INSERT INTO ops.events
  ↓                                       ↓
event-dispatcher (Bài #11)              event-dispatcher (Bài #11)
  ↓                                       ↓
Triggers SOPs per event-subscriptions.yaml
```

## MCP server hosting

Bước A: stdio mode (subprocess of Claude Code)
Bước B: HTTP server tại `mcp.ritsu.ai` với OAuth/API key auth

```
mcp-server/
├── stdio-server.ts              ← used in Bước A
├── http-server.ts                ← used in Bước B
└── tools-registry.ts            ← reads mcp-tools.yaml
```

## Ritsu-specific integrations

Critical integrations (in priority order):

1. **Telegram bot** (Wave 2-3) — founder primary surface
2. **Stripe webhooks** (Wave 5) — payment events
3. **GitHub webhooks** (Wave 4) — auto-deploy + code events
4. **Email IMAP/SMTP** (Wave 6) — Bài #18 ingestion
5. **YouTube API** (Wave 6) — content publishing
6. **Twitter API** (Wave 6) — content publishing
7. **MCP HTTP server** (Wave 4) — Claude Code remote access
8. **Supabase Realtime** (Wave 4) — dashboard subscriptions

## Wave 4-6 implementation tasks

### Wave 4 (Visibility + Access):
- [ ] MCP server (stdio + HTTP)
- [ ] mcp-tools.yaml + mcp-roles.yaml populated
- [ ] First 5 read-only MCP tools
- [ ] Supabase Realtime integration

### Wave 5 (Privacy + Webhooks):
- [ ] Stripe webhook receiver
- [ ] GitHub webhook receiver (auto-deploy)
- [ ] Webhook signature verification
- [ ] event-dispatcher (per Bài #11)

### Wave 6 (Multi-Surface + Ingestion):
- [ ] First 3 SurfaceAdapters (Telegram, Email, Twitter)
- [ ] First 3 IngestionAdapters (Article, Voice, Podcast)
- [ ] Format converter library (Twitter thread, LinkedIn post)

---

*Pillar 08-integrations scaffolded by Agent OS Boilerplate. External service integrations are project-specific.*
