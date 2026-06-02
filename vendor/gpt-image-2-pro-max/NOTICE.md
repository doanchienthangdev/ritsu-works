# NOTICE — vendored third-party: `gpt-image-2-pro-max`

This directory vendors the **MIT-licensed** Claude skill
[`therichardngai-code/gpt-image-2-pro-max`](https://github.com/therichardngai-code/gpt-image-2-pro-max),
integrated into the `image-platform` capability as the `/image --use=pro-max` backend
(capability `image-platform` v0.4.0, `/cla extend`, 2026-06-02).

## What this is

A **retrieval-augmented prompt-engineering** skill: the `media-designer` agent
(`.claude/agents/media-designer.md`) diagnoses an image brief, searches a **hosted
community-prompt corpus** (7,405 prompts / 9,903 reference images, BM25 + 10 facet
vocabularies) via `scripts/search.py`, picks a mood-aligned base, and refactors it into
a parameterised, resolved prompt — **with mandatory author attribution**.

The backend is **hosted, free, and key-less**: `https://gpt-image-2-prompts.goclawoffice.com`
(`/search`, `/vocab/<facet>`). The corpus is NOT vendored — only the thin client + the
methodology are.

## License

Per upstream `README.md`:
- **Skill code is MIT.** (`search.py`, `media-designer.md`, `SKILL.md` — vendored here verbatim.)
- **Prompt content belongs to the original authors** (Twitter/X handles in each record).
  The `media-designer` methodology makes attribution **mandatory** in every output, and
  ritsu-works honors this: `/image --use=pro-max` records the chosen base's `@author` +
  `tweet_url` into `run.json.pro_max.base` and surfaces it in the report.
- Corpus seeded by the **[EvoLinkAI/awesome-gpt-image-2-prompts](https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts)**
  community — credit + thanks to them and to the original prompt authors.

## What ritsu-works added / changed (NOT upstream)

- `scripts/image/pro-max/search.cjs` — a **Node** re-implementation of the thin
  `search.py` client (same hosted backend, same query contract), so the `/image`
  pipeline has no Python runtime dependency. The vendored `search.py` remains the
  canonical reference + attribution source (and can still be run directly).
- The `media-designer` `diagnose → search → pick → refactor → resolve` loop is adapted
  into the in-session `06-ai-ops/skills/image/enhance` skill's **pro-max mode**, which
  then composes with ritsu-works' own BRAND (`--style`) + GENRE (`--art-style`) blocks
  and the corner logo-overlay — features that are NOT part of upstream.
- We do **NOT** vendor or use the upstream `media-tools/` companion (its ChatGPT-OAuth /
  multi-provider generator). Generation stays on ritsu-works' governed `gpt-image-2`
  (`OPENAI_API_KEY`, out-of-band), per the locked capability decision.

## Governance

- The hosted backend is registered in `knowledge/external-sources.yaml`
  (`gpt-image-2-prompts-backend`): read-only, no API key, free, rate-limited per IP.
- **Only non-sensitive creative briefs** (image descriptions) are sent to it — never PII,
  user data, or secrets.
- Graceful degradation: if the backend (or Python, for the vendored client) is
  unreachable, `--use=pro-max` falls back to the generic in-session `--enhance` + a warning.
