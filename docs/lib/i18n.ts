import type { I18nConfig } from "fumadocs-core/i18n";

// docs-engine v1.1 — bilingual VI + EN
// Fumadocs v14 i18n: config is a plain object (no defineI18n helper; that's v15+).
// - defaultLanguage='vi' per Phase 1 Q1 of docs-engine spec ("Vietnamese-first")
// - languages=['vi','en'] — covers founder + cofounder + AI workforce
// - hideLocale='default-locale' — VI URLs stay clean (/docs/agents/cto, not /vi/docs/agents/cto)
//   EN URLs get /en/ prefix (/en/docs/agents/cto)
// - parser='dot' — file naming `<slug>.vi.mdx` + `<slug>.en.mdx` (matches walker output)

export const i18n: I18nConfig = {
  defaultLanguage: "vi",
  languages: ["vi", "en"],
  hideLocale: "default-locale",
  // v14 has no `parser` field — file naming is fixed to `.{lang}.mdx`
  // (dot parser is the only convention). Walker already outputs this format.
};
