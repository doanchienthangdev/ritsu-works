import { notFound } from "next/navigation";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { source } from "@/lib/source";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  // Fumadocs 14 API: page.data has `body` (default MDX export) and `toc`.
  // Cast through `any` here because the generated types from fumadocs-mdx
  // don't always re-export the runtime fields cleanly. v1.0 pragmatic;
  // v1.0.1 can refine when stable Fumadocs APIs land.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = page.data as any;
  const MDX = data.body;

  return (
    <DocsPage toc={data.toc}>
      <DocsBody>
        <h1>{data.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = page.data as any;
  return {
    title: data.title,
    description: data.description,
  };
}
