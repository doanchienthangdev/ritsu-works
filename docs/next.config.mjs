import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const config = {
  reactStrictMode: true,
  // NOTE on i18n: Next.js 14 App Router does NOT use the legacy `i18n` config
  // field (that's Pages Router). For Vietnamese-first content per Phase 1 Q1
  // of docs-engine spec, we rely on:
  //   - root `<html lang="vi">` in app/layout.tsx
  //   - default content language Vietnamese
  // Future English route /en/* will be implemented via App Router `[lang]`
  // dynamic segment + middleware (v1.0.1+).
  //
  // NOTE on output: `output: 'standalone'` was REMOVED — Vercel handles its
  // own serverless/edge optimization. Standalone mode produced a non-standard
  // build layout that Vercel couldn't route, causing edge 404s.
};

export default withMDX(config);
