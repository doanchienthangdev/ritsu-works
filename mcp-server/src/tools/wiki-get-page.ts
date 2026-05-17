/**
 * `wiki_get_page` tool — fetch a single wiki page by slug.
 *
 * Added Sprint 3 / PR5 of wiki-sync-from-refs v2.0.0. Returns the
 * ops.knowledge_pages row + (optionally) the raw Markdown file contents.
 *
 * Read-only; deterministic; no LLM dependency. Powers agent-side
 * citation discipline (agent fetches the actual page after listing or
 * vector-searching, so it can quote real wiki content rather than
 * paraphrasing from memory).
 *
 * Cross-references slug discipline (v2.0 Hybrid B/A):
 *   - global UNIQUE slug; single-file slugs share namespace with chapter
 *     children (<book>__chapter-NN-<chapter>) and folder children
 *     (<col>__<file>)
 *   - this tool returns whichever row matches the literal slug
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const wikiGetPageDescription = `Fetch a single wiki page by slug. \
Inputs: { slug: string (required; global UNIQUE), include_content?: boolean (default true; reads the Markdown file) }. \
Output: { row: {id, slug, page_type, title, file_path, file_hash, frontmatter, source_kind, source_ref, source_hash, created_at, updated_at}, content?: string (Markdown body if include_content=true) }. \
Returns 'not_found' state if slug doesn't exist. Read-only; tier A.`;

export const wikiGetPageInputSchema = {
  type: "object",
  required: ["slug"],
  properties: {
    slug: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description:
        "Global-unique slug (v2.0). Chapter children use '<book>__chapter-NN-<chapter>'; folder children use '<col>__<file>'.",
    },
    include_content: {
      type: "boolean",
      default: true,
      description: "If true, also read the wiki/<file_path>.md file and return its contents.",
    },
  },
} as const;

interface WikiGetPageInput {
  slug: string;
  include_content?: boolean;
}

function parseInput(raw: unknown): WikiGetPageInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "wiki_get_page: input must be an object with `slug`");
  }
  const obj = raw as Record<string, unknown>;
  const slug = obj.slug;
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    throw new MCPToolError("invalid_input", "wiki_get_page: `slug` (1..200 chars) is required");
  }
  const includeContent = obj.include_content === undefined ? true : Boolean(obj.include_content);
  return { slug, include_content: includeContent };
}

// REPO_ROOT detection: this file lives at mcp-server/src/tools/wiki-get-page.ts.
// The MCP server may be run from various cwd; resolve repo root from this file's location.
function getRepoRoot(): string {
  // import.meta.url is the Deno/Node ESM way; fall back to process.cwd if unavailable
  try {
    const url = new URL(import.meta.url);
    const filePath = url.pathname;
    // .../ritsu-works/mcp-server/src/tools/wiki-get-page.ts → .../ritsu-works
    return path.resolve(path.dirname(filePath), "..", "..", "..");
  } catch {
    return process.cwd();
  }
}

export async function handleWikiGetPage(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const args = parseInput(input);
  if (!canReadSchema(ctx, "ops")) {
    throw new MCPToolError(
      "permission_denied",
      `role '${ctx.role}' does not have read access to schema 'ops'`,
    );
  }

  const startMs = Date.now();
  const { data, error } = await client
    .schema("ops")
    .from("knowledge_pages")
    .select(
      "id, slug, page_type, title, file_path, file_hash, frontmatter, source_kind, source_ref, source_hash, created_at, updated_at",
    )
    .eq("slug", args.slug)
    .maybeSingle();

  const queryMs = Date.now() - startMs;

  if (error) {
    throw new MCPToolError("sql_execution_error", error.message);
  }

  if (!data) {
    return {
      state: "completed",
      output: {
        row: null,
        not_found: true,
        slug: args.slug,
        query_ms: queryMs,
      },
    };
  }

  let content: string | undefined;
  if (args.include_content && data.file_path) {
    try {
      const repoRoot = getRepoRoot();
      const absPath = path.isAbsolute(data.file_path)
        ? data.file_path
        : path.join(repoRoot, data.file_path);
      content = fs.readFileSync(absPath, "utf8");
    } catch (e) {
      // File missing on disk — return row metadata + error rather than failing the whole call
      content = undefined;
      return {
        state: "completed",
        output: {
          row: data,
          content_error: `file_read_failed: ${(e as Error).message}`,
          query_ms: queryMs,
        },
      };
    }
  }

  return {
    state: "completed",
    output: {
      row: data,
      content,
      query_ms: queryMs,
    },
  };
}
