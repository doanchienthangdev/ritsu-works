import type { Translations } from "fumadocs-ui/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

// Fumadocs v14: provide a partial `Translations` object directly (no defineI18nUI
// helper in v14 — that's v15+). RootProvider's `i18n` prop accepts
// `{ locale, locales, translations }`.

export const translations: Record<string, Partial<Translations>> = {
  vi: {
    search: "Tìm trong tài liệu",
    searchNoResult: "Không có kết quả",
    toc: "Trên trang này",
    tocNoHeadings: "Không có mục",
    lastUpdate: "Cập nhật gần nhất",
    chooseLanguage: "Ngôn ngữ",
    nextPage: "Trang sau",
    previousPage: "Trang trước",
    chooseTheme: "Giao diện",
    editOnGithub: "Sửa trên GitHub",
  },
  en: {},
};

export const locales = [
  { name: "Tiếng Việt", locale: "vi" },
  { name: "English", locale: "en" },
];

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: {
      title: "Ritsu Works Docs",
      url: locale === "vi" ? "/" : "/en",
    },
    githubUrl: "https://github.com/doanchienthangdev/ritsu-works",
    i18n: true,
  };
}
