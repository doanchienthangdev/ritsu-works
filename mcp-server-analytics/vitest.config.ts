import { defineConfig } from "vitest/config";

// mcp-server-analytics runs its own vitest (its package tsconfig allows .ts-extension
// imports). Without this, `vitest run` walks up to the repo-root config whose
// `tests/**` globs don't match here. Mirrors mcp-server/vitest.config.ts.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
});
