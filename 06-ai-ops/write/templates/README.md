# Writing templates for `/write`

Structure skeletons the writer can follow with `/write --template=<id>`. A template is a
*shape*, not content — a hook map, the section beats, a checklist. The voice comes from
`--author-style`; the structure comes from here.

Indexed in [`knowledge/write-templates.yaml`](../../../knowledge/write-templates.yaml) and
resolved by `scripts/write/lib/templates.cjs`.

## Layout

Templates live in **category subfolders** (the founder's "folder con chứa các tập hợp templates"):

```
templates/
  blog/            standard-blog-post · listicle
  social/          single-post · x-thread
  ads/             direct-response-ad
  email/           cold-outreach
  video-script/    youtube-short
  article/         feature-article
  research/        research-note
  business/        decision-memo
  …                (add categories freely)
```

## Using a template

```
/write "..." --template=standard-blog-post        # by registered id
/write "..." --template=06-ai-ops/write/templates/blog/listicle.md   # or by direct path
```

If `--template` is omitted, the orchestrator uses the `structure_hint` from the resolved
`--type` (see `knowledge/write-types.yaml`) — every type has a sane default shape.

## Adding a template

1. Drop a `.md` skeleton under the right category subfolder.
2. Add one row to `knowledge/write-templates.yaml` (`id`, `category`, `path`, `description`, `applies_to_types`).
3. `pnpm check` (the write-registries validator confirms the path exists).

Keep templates **terse and imperative** — beats + guidance, not prose. The writer deletes the
guidance as it fills the beats.
