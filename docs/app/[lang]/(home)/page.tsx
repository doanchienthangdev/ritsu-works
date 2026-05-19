import { redirect } from "next/navigation";

// v1.1: homepage redirects to /<lang>/docs (per founder Phase 4 ask).
// Default-locale (vi) homepage `/` → `/docs`. EN homepage `/en` → `/en/docs`.
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const target = lang === "vi" ? "/docs" : `/${lang}/docs`;
  redirect(target);
}
