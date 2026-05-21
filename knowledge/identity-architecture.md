# Identity & Interface Architecture

> Canonical reference for how Ritsu's AI workforce presents itself — internally to the founder, externally to customers — and how every action is attributed.

**Status:** v1.0 spec
**Last updated:** 2026-05-02
**Related:** `governance/IDENTITY.md`, `governance/SECRETS.md`, `00-core/brand_voice.md`, `00-core/transparency.md`, `_build/notes/problem-6-identity-interface.md`

---

## Why this document exists

Identity decisions interconnect: a persona name affects email "from" headers; an email "from" header affects customer trust; customer trust affects regulatory compliance; regulatory compliance affects audit attribution. Resolving these in isolation produces contradictions — same agent appearing as "Hana" in marketing copy and "growth-orchestrator-bot" in GitHub commits.

This document resolves all four sub-domains together so they remain consistent. If you change one, check the others.

## The four sub-domains

| Sub-domain | Question | v1.0 Decision |
|---|---|---|
| (A) Workforce Identity | What does each agent call itself internally? | Role-based names (no human personas) |
| (B) Founder Interface | How does founder control the workforce? | Telegram + GitHub PR (defer dashboard) |
| (C) External Identity | How does customer see Ritsu's AI? | "Ritsu Assistant" — single unified persona, EU AI Act compliant disclosure |
| (D) Auth & Attribution | How are agent actions attributed across systems? | Hybrid: per-role identity for external systems, shared for internal |

The combination is **A3 + B4 + C2 + D3** as decided in `_build/notes/problem-6-identity-interface.md`.

---

## Sub-domain A — Workforce Identity (internal personas)

### Rule

Agents use their **role slug** as their identity in all internal contexts:
- `gps`, `growth-orchestrator`, `support-agent`, `content-drafter`, `code-reviewer`, `etl-runner`, `trust-safety`, `backoffice-clerk`, `founder`

No human-style personas (no "Hana," "Linh"). No gendered names. No avatars in primary positions.

### Where this applies

- `ops.agent_runs.agent_role` column
- Telegram messages from agents to founder ("✅ growth-orchestrator completed task #42")
- Internal Slack channels (when activated)
- GitHub commit author (see sub-domain D for technical mapping)
- Subagent system prompts (agent introduces itself by role)

### What this is NOT

- This is NOT the customer-facing identity. Customers see "Ritsu Assistant" — see sub-domain C.
- This is NOT a brand voice. Brand voice is in `00-core/brand_voice.md`.

### Why no human personas

Three reasons:

1. **Persona bias risk** — research (Nojitter, Jan 2026) documents how named personas (especially gendered) embed perception bias. Users defer to or discount agents based on persona cues unrelated to actual capability.
2. **Honest by default** — "growth-orchestrator" is unambiguously a role slug. "Hana" implies a person, requiring explicit disclosure to correct.
3. **Maintenance overhead** — personas require voice tuning, persona docs, consistency enforcement. Role slugs require none.

### Future evolution

If a future version of Ritsu chooses to add personas (e.g., for a customer-facing brand campaign), the addition path is:

1. PR to this file documenting the persona's purpose, scope, and consent (founder approval)
2. PR to `00-core/brand_voice.md` with persona voice guidelines
3. PR to `governance/IDENTITY.md` mapping persona to role and to external service accounts
4. Disclosure update in `00-core/transparency.md`

The persona maps to an existing role; never creates a "new" agent without role.

---

## Sub-domain B — Founder Interface

### Rule (v1.0)

Two channels, no more:

1. **Telegram** — primary channel, all real-time interaction (HITL approvals, status queries, notifications)
2. **GitHub PR** — heavy-lift channel (Tier C+ with diff review, governance changes, brainstorm summaries)

A web dashboard ("Jarvis screen") is deferred to v1.x. Supabase dashboard UI is available as escape hatch for raw data inspection.

### Notification policy by tier

(Per `governance/HITL.md`'s 4-tier taxonomy, mapped to channel behavior.)

| Tier | Channel | Push priority | Sound |
|---|---|---|---|
| A (autonomous) | log only, no notification | n/a | n/a |
| B (notify-after) | Telegram message | normal | none |
| C (approve-before) | Telegram inline buttons | high | default |
| D-Std (override) | Telegram + push priority | high | alert |
| D-MAX | Telegram + GitHub PR comment | critical | alert |
| Security alerts | Telegram + GitHub issue | critical | alert |

The Telegram bot is configured to set push priority based on the tier in the payload. Founder phone settings should map "high"/"critical" to bypass Do Not Disturb.

### Mute & batching

- **Tier A** never appears in Telegram. Available via Supabase dashboard if founder wants to inspect.
- **Tier B** can be batched into a daily digest (configurable per role). Default: real-time, but the `monthly-learning-review` skill (Bài #4) summarizes Tier B activity monthly.
- **Tier C+** never batched, always immediate.
- **Quiet hours** (founder-configured): only Tier C+ during configured hours. Tier B deferred to next active period.

### Why not a dashboard now

A web dashboard is built effort with limited v1.0 value because:
- Founder lives on phone for ad-hoc work; mobile dashboard = Telegram with extra steps
- Supabase dashboard UI provides raw data for power-user moments
- ops.tasks + task-status skill (Bài #5) renders structured status to Telegram already
- Building dashboard requires auth setup, hosting, UX iteration — non-trivial for solo founder

Revisit when Ritsu hires first operator (will need richer multi-user UI), or when Telegram message volume becomes overwhelming (likely > 50 actionable items/day).

### Channels NOT used in v1.0

Explicit "do not activate" list to avoid scope creep:
- Slack (workforce uses internal Slack only post-v1.0 when team grows)
- Email-to-founder (founder reads enough customer email; agents shouldn't add)
- SMS (Telegram covers mobile)
- Voice/phone (out of scope)
- Discord (out of scope)
- Mobile app for Ritsu workforce control (defer to v1.x; Telegram bot fills role)

---

## Sub-domain C — External-Facing Identity

### Rule

All customer-facing AI interactions identify themselves as **"Ritsu Assistant — an AI system"** at first contact, every conversation.

This is **not optional**. EU AI Act Article 50 (effective 2 August 2026) mandates AI disclosure in chatbot interactions. Failure to disclose is a regulatory violation, not a UX preference.

### Disclosure mechanics

#### 1. First-contact disclosure (mandatory)

Every conversation's first message from an AI agent to a customer includes one of these patterns:

**Email first reply:**
```
Hi {name},

I'm Ritsu Assistant — an AI system that helps with {topic}. {Body of reply.}

If you'd prefer a human, just reply with "human" and one of our team will follow up.

Best,
Ritsu Assistant
support@ritsu.ai
```

**Chat first message:**
```
👋 Hi! I'm Ritsu Assistant, an AI helper. How can I help you today?
```

**Voice (if voice channel ever activated):**
```
"Hi, this is Ritsu Assistant — I'm an AI helper for Ritsu. How can I help you today?"
```

#### 2. Persistent disclosure (every message)

Email signature footer (every email, not just first):
```
—
Sent by Ritsu Assistant — an AI system.
Reply STOP to opt out · Contact a human at help@ritsu.ai
```

Chat: small persistent label "AI Assistant" near message author name (whatever the chat platform supports).

#### 3. On-request disclosure (mandatory affirmative)

When a user asks "are you AI / a bot / a human / real / a person?", the agent MUST respond with explicit confirmation of AI nature. Hardcoded behavior; never deflect or roleplay-deny.

Example:
- User: "Wait — are you a real person?"
- Agent: "I'm an AI system — Ritsu Assistant. I can help with most things, but if you'd prefer a human, reply 'human' and we'll route you to our team."

This is enforced by the `ai-disclosure-check` skill (Bài #6) and `pre-tool-customer-message` hook.

#### 4. Escalation to human (mandatory available)

Every customer-facing AI interaction must surface a path to a human:
- Email: footer line "Contact a human at help@ritsu.ai"
- Chat: command/button "Talk to human"
- Auto-escalation: certain trigger phrases ("I want to speak to a person", "human please") immediately route to founder via Telegram

### What "Ritsu Assistant" is

A unified external persona that:
- Has no gender, no age, no implied human qualities
- Is consistently friendly, helpful, brand-aligned per `00-core/brand_voice.md`
- Is the public face for support, marketing replies, social interactions
- Maps internally to whatever specialist agent is handling the actual work (support-agent for tickets, growth-orchestrator for marketing replies, etc.)

The customer doesn't see the internal role differentiation. The customer sees one consistent "Ritsu Assistant" that happens to be capable across many topics.

### Compliance audit

Every outgoing customer message logs:
- `disclosure_present: true | false`
- `disclosure_type: first_contact | signature_only | on_request_response | none`
- `escalation_path_available: true | false`

The `pre-tool-customer-message` hook blocks any outgoing message where `disclosure_present: false` AND it's a first-contact message.

`monthly-learning-review` (Bài #4) includes a compliance section: "% of outgoing customer messages with proper disclosure" must be 100%. Any deviation triggers a security incident.

### Public transparency page

Ritsu maintains a public transparency page at `ritsu.ai/transparency` describing:
- That we use AI (Claude Opus and similar) for customer support and content
- What the AI can and cannot decide autonomously
- How to escalate to a human
- How to request data deletion
- Our data retention and training practices

Source for this page lives in `00-core/transparency.md`. Updates via PR (Tier C).

### Vietnam-specific note

Vietnam does not yet have a comprehensive AI disclosure law (as of May 2026), but Ministry of Information and Communications has draft guidelines requiring AI-generated content marking. Ritsu's regulatory-aligned approach (EU compliant) preemptively satisfies likely Vietnamese requirements. Re-check at each PR to this file.

---

## Sub-domain D — Authentication & Identity Mapping

### Rule

Two-tier strategy:

- **External attribution systems** (where audit + customer trust matter): one service identity per role
- **Internal-only systems** (where attribution is via `ops.agent_runs`): shared service identity acceptable

The categorization is below; the mapping is in `governance/IDENTITY.md`.

### System categorization

| System | Category | Identity strategy |
|---|---|---|
| GitHub (commits, PRs, issues) | External-attribution | Per role: `ritsu-{role-slug}-bot` GitHub accounts |
| Email send (transactional + marketing) | External-attribution | Per role: `{role-slug}@ritsu.ai` sending addresses |
| Slack (when activated) | External-attribution (workspace identity) | Per role: distinct Slack bots, same workspace |
| Stripe | Founder-only | No agent identity. Stripe access requires founder approval per Bài #2. |
| Supabase ops | Internal | Shared service key, scoped per role via RLS or separate keys per Bài #2 SECRETS.md |
| Supabase product (read-only ETL) | Internal | Single key for `etl-runner` only |
| Telegram (founder ↔ workforce) | Internal abstraction | Single bot. Founder talks to "the workforce" — bot relays to/from specific agents |
| Telegram (customer-facing if ever activated) | External-attribution | Single bot under "Ritsu Assistant" branding |
| Internal logs / observability | Internal | `ops.agent_runs.agent_role` is canonical |
| Anthropic API | Internal | Per-role API keys via secret manager (Bài #2) |

### Identity naming conventions

- **Email addresses (sending):** `{role-slug}@ritsu.ai`
  - Examples: `gps@ritsu.ai`, `support@ritsu.ai`, `growth@ritsu.ai`
  - All map to a real inbox monitored by founder (catch-all). Bounces and replies route to founder via Telegram.
- **GitHub bot accounts:** `ritsu-{role-slug}-bot`
  - Examples: `ritsu-gps-bot`, `ritsu-support-bot`, `ritsu-growth-bot`
  - Each has profile bio: "AI agent operating as part of Ritsu workforce. See ritsu.ai/transparency."
  - Founder owns each account; service tokens stored in secret manager per Bài #2 SECRETS.md.
- **Slack bots (when activated):** `Ritsu {Role} Bot`
  - Examples: "Ritsu GPS Bot", "Ritsu Support Bot"
  - Same workspace; distinct app entries.

### Customer-facing impersonation rule

A subtle but important constraint: even though the GitHub commits are by `ritsu-support-bot`, the customer-facing email signature reads "Ritsu Assistant." The role attribution exists for audit and authorization; the customer sees the unified external persona.

This works because:
- The audit attribution lives in `ops.agent_runs.agent_role`, not in customer-visible headers
- The "from" address (`support@ritsu.ai`) is functionally tied to support-agent, but the persona shown in body and signature is "Ritsu Assistant"
- This is consistent with how human-staffed support works: customer sees brand identity, internal records show specific staff member

### Authentication patterns

Per Bài #2 SECRETS.md, every service account uses the most-scoped credential possible:

- GitHub: fine-grained personal access tokens (scoped to specific repo, specific permissions)
- Email: SMTP credentials per sending address; SPF/DKIM configured per sub-address
- Slack: bot tokens scoped to specific channels
- Supabase: service keys with RLS-restricted access
- Anthropic API: per-role API keys (rotation cadence per SECRETS.md)

### Lifecycle: provisioning, rotation, decommission

When a new role is added (Tier C PR per Bài #2 ROLES.md change):
1. Founder creates GitHub bot account `ritsu-{new-role}-bot` (founder-only, agent cannot self-provision)
2. Founder creates email forwarder `{new-role}@ritsu.ai`
3. Founder generates service tokens, stores in secret manager
4. PR adds role to `governance/ROLES.md` (per Bài #2 schema) AND to `governance/IDENTITY.md` mapping
5. Hooks (`pre-tool-secrets`) automatically enforce per-role token scoping

When a role is deprecated:
1. Tokens revoked at secret manager
2. GitHub bot account archived (not deleted — preserves commit history)
3. Email forwarder disabled (existing emails route to founder)
4. ROLES.md entry marked `status: deprecated`
5. After 90 days, audit-clear removal (preserve evidence per data retention policy)

### Compliance with Bài #2 SECRETS.md

This sub-domain extends — does not contradict — the secrets governance from Bài #2:

- Every per-role service account's credentials live in secret manager per SECRETS.md
- Each role's `secrets:` list in ROLES.md includes role-specific identity tokens
- `pre-tool-secrets` hook enforces per-role usage at runtime
- Quarterly audit covers all per-role identities

Cross-reference table maintained in `governance/IDENTITY.md`.

---

## How identity interacts with prior bài-toán decisions

### With Bài #1 (manifest)

Identity claims are Tier 1 declarative knowledge. `governance/IDENTITY.md` is canonical. Schema cross-references in manifest.

### With Bài #2 (governance, HITL, ROLES, SECRETS)

- Per-role identities = additional secrets in SECRETS.md
- Cross-system attribution requires the per-role identity to exist before role can act on that system
- Customer-facing identity (sub-domain C) intersects with HITL: customer-facing send is always Tier C minimum

### With Bài #3 (context economics)

Each subagent knows its role slug from system prompt (Bài #3 lean prompt). Persona "Ritsu Assistant" is loaded only when subagent is doing customer-facing work — adds ~200 tokens to those specific contexts, not to internal sessions.

### With Bài #4 (memory & learning)

`ops.agent_runs.agent_role` is the foundation for episodic recall. Sub-domain D's "internal attribution always via ops.agent_runs" decision validates Bài #4's Strategy E (recall queries by role).

### With Bài #5 (multi-agent orchestration)

`ops.tasks.assignee_role` uses the same role slugs as identity. When GPS dispatches a task, the role identity flows: GPS reads role slug from task, spawns subagent with that role, subagent uses role-specific service accounts to act on external systems. End-to-end attribution preserved.

---

## Anti-patterns to refuse

- **"Let's give the support agent a friendly name like Hana for marketing copy."** No — see sub-domain A. If marketing wants persona, that's a sub-domain A change via PR with full impact analysis.
- **"Disclosure is implied — customers know AI exists in 2026."** No — EU AI Act mandates explicit disclosure. Implication ≠ compliance.
- **"Use one GitHub token for all bots, attribute via commit message."** No — commit message attribution is post-hoc and tamperable. Per-bot accounts are upfront and immutable.
- **"Add Slack notifications now, founder will use whatever they want."** No — channel sprawl. Telegram + GitHub PR for v1.0.
- **"Build the dashboard now, it'll be useful eventually."** No — defer. Build when need is concrete.
- **"Ritsu Assistant should sometimes feel like a different agent depending on context."** No — single unified external persona. Different *internal* agents → same *external* face.

## When this architecture changes

Triggers to revisit:

- Vietnam passes specific AI law (likely 2026-2027) — review disclosure compliance
- EU AI Act enforcement begins (Aug 2 2026) — audit Ritsu's compliance pre-deadline
- Ritsu hires first operator beyond founder — sub-domain B may need richer interface
- Customer feedback indicates persona helps engagement (rare; backed by data) — sub-domain A re-evaluation
- Compromise/audit incident — sub-domain D may need finer attribution

Any change is PR to this file plus relevant satellite files (IDENTITY.md, transparency.md, brand_voice.md).

---

*Identity is what allows everything else to be attributed. Get it wrong and audit, compliance, and trust all become unreachable. Get it right and they become structural.*
