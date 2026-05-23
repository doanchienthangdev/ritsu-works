# knowledge/resolvers/overrides/ — Hand-Authored Route Overrides

Per capability `resolver` v1.0 spec §11.1.

This folder is where **the founder hand-curates** resolver routes that need
richer triggers than what auto-derive (`scripts/resolver/sync.cjs`)
generates from recipient frontmatter.

## When to add an override

- The auto-derived stub uses only the slug as trigger; you want natural-
  language variants
- You want to disambiguate between two recipients that share keywords
- You want to enforce a specific confidence via `metadata.disambiguator`
- You want to pin a `composition.plan[]` for multi-hop routing (CP-2)

## How

Edit `overrides/<kind>.yaml` directly. Schema same as routes/ (per
`knowledge/schemas/resolver-route.schema.json`).

Tag overrides with `metadata.derived: false` so adapter precedence
validator (architect T-1 fix) recognises them as authoritative.

Example:

```yaml
routes:
  - id: skill/muse:all
    status: active
    triggers:
      keywords:
        - "brainstorm"
        - "ideate"
        - "explore options"
        - "think through"
    recipient:
      kind: skill
      slug: muse:all
    invocation:
      mechanism: skill_tool
      args: { skill: "muse:all" }
    role_scope: ["*"]
    metadata:
      derived: false
      pillar: 06-ai-ops
      disambiguator: "founder's primary brainstorm entry point"
```

## Precedence

`overrides/<kind>.yaml` has priority 100; routes/<kind>.yaml has 50;
adapter outputs have 30. Higher wins on ID collision.

## v1.0 starter

Files exist as empty placeholders. Add entries as you discover which
auto-derived stubs need enrichment. Run `/resolver explain "<trigger>"`
to see why your trigger matched (or didn't).
