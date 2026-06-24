import { defineConfig } from "vitest/config";

// mcp-server runs its own vitest (its node_modules has @supabase/supabase-js and
// the package's tsconfig allows .ts-extension imports). Without this, `vitest run`
// walks up to the repo-root config whose `tests/**` globs don't match here.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
});
