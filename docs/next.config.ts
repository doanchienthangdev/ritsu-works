import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const config = {
  reactStrictMode: true,
  // Vietnamese-first per Phase 1 Q1 of docs-engine spec. Reserve `en` route for future translation.
  i18n: {
    defaultLocale: "vi",
    locales: ["vi", "en"],
  },
  // Vercel deploys with rootDirectory=docs (per CTO Phase 2 architectural call).
  output: "standalone",
};

export default withMDX(config);
