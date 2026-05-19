/**
 * AI-runtime raw-MDX endpoint.
 *
 * Returns the raw MDX content (frontmatter + body) for a docs page so AI agents
 * can fetch it as runtime context without HTML stripping.
 *
 * Phase 2 analyst surfaced this as a P0 — without it, the AI-runtime journey
 * (Claude Code subagent fetches role/skill context from docs site) is broken.
 *
 * Per analysis: Fumadocs does not ship `?format=raw` out of the box;
 * we implement a custom route handler that reads the source MDX file directly.
 *
 * URL pattern: GET /api/raw/<slug>[/<sub>...]
 * Example:     GET /api/raw/agents/cto
 * Response:    200 text/markdown; charset=utf-8
 *              404 if slug not found
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_ROOT = path.resolve(process.cwd(), "content", "docs");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!Array.isArray(slug) || slug.length === 0) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  // Defensive: refuse path traversal attempts (slug must be alphanumeric + dash only)
  for (const segment of slug) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(segment)) {
      return NextResponse.json(
        { error: "invalid slug segment", segment },
        { status: 400 }
      );
    }
  }

  // Try <slug>.mdx then <slug>/index.mdx
  const slugPath = slug.join("/");
  const candidates = [
    path.join(CONTENT_ROOT, `${slugPath}.mdx`),
    path.join(CONTENT_ROOT, slugPath, "index.mdx"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) continue;
      // Confine to CONTENT_ROOT (defense-in-depth)
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(CONTENT_ROOT + path.sep)) {
        return NextResponse.json({ error: "out of root" }, { status: 403 });
      }
      const body = await fs.readFile(resolved, "utf8");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      });
    } catch {
      // try next candidate
    }
  }

  return NextResponse.json({ error: "not found", slug }, { status: 404 });
}
