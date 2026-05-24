# Resolver v2 — Adapter Plugin Contract (SKELETON)

**Status:** v2.2 specs the contract; runtime auto-discovery deferred to v2.4+.

This folder is the future home of **external-source adapters** — plugin
modules that fetch recipient entries from systems outside `ritsu-works`
(third-party SaaS, partner APIs, federated catalogs, runtime probes against
live MCP servers).

In v2.2, only the **contract** lives here. There are no `*.adapter.cjs`
files yet. Concrete external sources are declared in `knowledge/external-sources.yaml`
and projected into `knowledge/recipients/external-sources.md` by
`scripts/resolver-v2/catalog-generator.cjs#generateExternalSources()`.

The adapter plugin runtime activates in **v2.4** when the first third-party
integration ships a real adapter and the YAML-only path stops scaling.

---

## Why this skeleton exists in v2.2

Decision recorded in `.archives/cla/resolver-v2.2-context-sources/00-scoping-brainstorm.md`
§Decision 3 — "Adapter plugin pattern (skeleton only in v2.2)". Goal: plant
the seed so v2.4 doesn't need an architectural re-think; concretely, the
contract below is what v2.4's auto-discovery loop will look for.

---

## Adapter contract (v0.1 — subject to revision in v2.4)

A v2.4 adapter is a Node module living at
`scripts/resolver-v2/adapters/<source-id>.adapter.cjs` and exporting:

```js
module.exports = {
  // REQUIRED — stable identity
  kind: 'external-source',           // resolver v2 kind this adapter produces
  namespace: '<source-id>',          // e.g. 'github', 'linear', 'gbrain-page'

  // REQUIRED — provenance + auth declaration
  source: {
    type: 'api' | 'db-readonly' | 'llm-api' | 'messaging'
        | 'deployment' | 'payments-api' | 'knowledge-graph-mcp'
        | '<custom>',
    auth_env: 'NAME_OF_ENV_VAR',     // never the value
    endpoint: 'https://...',         // optional, for HTTP sources
    ttl_seconds: 3600,               // optional, cache lifetime
  },

  // REQUIRED — production of recipient entries
  // Should be deterministic given the same upstream state.
  // Must return an array of objects conforming to the v2 catalog schema
  // (see scripts/resolver-v2/catalog-loader.cjs REQUIRED_FIELDS).
  generate: async function ({ secrets }) {
    // Read env vars from `secrets` (NOT process.env — adapters do not
    // touch process.env directly; the host loader injects them).
    // Return: Recipient[] — each entry will be merged into
    // knowledge/recipients/external-<namespace>.md by the host.
    return [
      {
        id: `external-source/<namespace>/<sub-slug>`,
        kind: 'external-source',
        when_to_use: '...',
        invoke: '...',
        role_scope: ['*'],
        status: 'active',
        disambiguator: `source_type: ${this.source.type}`,
      },
    ];
  },
};
```

---

## Discovery (v2.4+ runtime)

When the runtime ships, `scripts/resolver-v2/sync.cjs` will walk this folder:

1. Load every `*.adapter.cjs` matching the pattern above.
2. Validate the module's frontmatter — fail-fast if `auth_env` references
   an env var not in the role's `governance/SECRETS.md` allowlist.
3. Group by `kind`. Call `generate()` per adapter (parallel-safe; adapters
   declare their own concurrency bound).
4. Merge results into `knowledge/recipients/external-<namespace>.md`,
   preserving manual overrides inside `<!-- override-start -->` markers.

Adapters must be **side-effect-free** during `generate()` — read only, no
writes, no side-effect on the host. Side effects belong in skills, not
adapter loaders.

---

## Why not just put external sources in YAML forever?

YAML works fine when entries are static + few (v2.2's 8 entries). It
stops scaling when:

- Entries must reflect upstream state (e.g. list of active GitHub PRs).
- Auth varies per entry (e.g. one per customer org).
- Refresh cadence varies (every 5min for live status; hourly for catalogs).
- Entries are dynamically discovered (e.g. enumerate all rooms in a Slack
  workspace).

Each of those needs a programmatic adapter. The contract above leaves
room for all of them.

---

## When you're ready to add the first adapter

1. Copy this README's contract into a new file `<source-id>.adapter.cjs`.
2. Implement `generate({ secrets })`.
3. Add a unit test under `tests/resolver-v2/adapters/<source-id>.test.ts`.
4. Open PR to this folder + update `knowledge/external-sources.yaml` to
   reference the adapter (the YAML entry becomes the static fallback for
   when the adapter is offline).
5. Bump resolver capability minor version (`/cla extend resolver-v2.X`).

Until step 1 happens, this folder stays a skeleton.

---

## References

- Brainstorm: `.archives/cla/resolver-v2.2-context-sources/00-scoping-brainstorm.md`
- Active spec: `.archives/cla/resolver-v2.2-context-sources/spec.md`
  (written in Phase 5 of this capability run)
- Sibling registries: `knowledge/external-sources.yaml`,
  `knowledge/recipients/external-sources.md`
- Prior art: docs-engine adapters at
  `06-ai-ops/skills/docs-engine/adapters/*-adapter/` (different problem
  domain — those go internal→docs, these go external→catalog).
