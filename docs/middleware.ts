import { createI18nMiddleware } from "fumadocs-core/i18n";
import { i18n } from "@/lib/i18n";

// Fumadocs v14: createI18nMiddleware is exported from `fumadocs-core/i18n`
// (v15+ moved it to `fumadocs-core/i18n/middleware`).
export default createI18nMiddleware(i18n);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
