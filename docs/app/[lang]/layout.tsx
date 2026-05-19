import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider";
import { I18nProvider } from "fumadocs-ui/i18n";
import { translations, locales } from "@/lib/layout.shared";
import "fumadocs-ui/style.css";

export const metadata = {
  title: "Ritsu Works — Operating Docs",
  description:
    "Live documentation engine for ritsu-works. Operator + AI runtime context bundle.",
};

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <I18nProvider
          locale={lang}
          locales={locales}
          translations={translations[lang] ?? {}}
        >
          <RootProvider>{children}</RootProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
