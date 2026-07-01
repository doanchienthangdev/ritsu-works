// Tests for scripts/local-install/lib/gen-mcp-json.cjs — the portable, per-machine
// .mcp.json generator (capability local-install-platform: co-founder onboarding).

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const { generateMcpJson, renderMcpJson } = cjsRequire(
  resolve(__dirname, "../../scripts/local-install/lib/gen-mcp-json.cjs"),
);

const ROOT = "/home/dev/ritsu-works";

describe("generateMcpJson — per-human (co-founder) profile", () => {
  const cfg = generateMcpJson({ repoRoot: ROOT, profile: "per-human", platformOs: "windows" });

  it("emits ONLY supabase-ops (no gbrain / analytics)", () => {
    expect(Object.keys(cfg.mcpServers)).toStrictEqual(["supabase-ops"]);
  });
  it("supabase-ops uses a shell-free, cross-platform npx tsx launch", () => {
    const s = cfg.mcpServers["supabase-ops"];
    expect(s.command).toBe("npx");
    expect(s.args).toStrictEqual(["-y", "tsx", `${ROOT}/mcp-server/src/server.ts`]);
    expect(s.command).not.toBe("/bin/sh");
    expect(JSON.stringify(s)).not.toContain("/bin/sh");
  });
  it("carries RITSU_REPO_ROOT so the server finds the registry + self-loads .env.local", () => {
    expect(cfg.mcpServers["supabase-ops"].env.RITSU_REPO_ROOT).toBe(ROOT);
  });
  it("contains NO secret material (no service_role / anon key / tokens in .mcp.json)", () => {
    const s = JSON.stringify(cfg);
    expect(s).not.toMatch(/SERVICE_KEY|SUPABASE_ANON_KEY|refresh_token|access_token|STRIPE/i);
  });
  it("per-human is identical regardless of platform (ops-only, portable)", () => {
    const mac = generateMcpJson({ repoRoot: ROOT, profile: "per-human", platformOs: "macos" });
    expect(Object.keys(mac.mcpServers)).toStrictEqual(["supabase-ops"]);
  });
});

describe("generateMcpJson — owner profile", () => {
  it("on macOS/Linux emits all 3 servers, with gbrain + analytics via /bin/sh", () => {
    const cfg = generateMcpJson({ repoRoot: ROOT, profile: "owner", platformOs: "macos" });
    expect(Object.keys(cfg.mcpServers).sort()).toStrictEqual(["gbrain", "supabase-analytics", "supabase-ops"]);
    expect(cfg.mcpServers["gbrain"].command).toBe("/bin/sh");
    expect(cfg.mcpServers["supabase-analytics"].command).toBe("/bin/sh");
    // supabase-ops stays portable even for the owner
    expect(cfg.mcpServers["supabase-ops"].command).toBe("npx");
  });
  it("on Windows skips gbrain + analytics (POSIX-only) — supabase-ops only", () => {
    const cfg = generateMcpJson({ repoRoot: ROOT, profile: "owner", platformOs: "windows" });
    expect(Object.keys(cfg.mcpServers)).toStrictEqual(["supabase-ops"]);
  });
  it("defaults to owner when profile is omitted / invalid", () => {
    const cfg = generateMcpJson({ repoRoot: ROOT, platformOs: "macos" });
    expect(Object.keys(cfg.mcpServers)).toContain("gbrain");
    const cfg2 = generateMcpJson({ repoRoot: ROOT, profile: "root" as never, platformOs: "macos" });
    expect(Object.keys(cfg2.mcpServers)).toContain("gbrain");
  });
});

describe("generateMcpJson — path handling", () => {
  it("normalizes a Windows-style repoRoot to forward slashes (no backslashes in output)", () => {
    const cfg = generateMcpJson({ repoRoot: "C:\\Users\\tran\\ritsu-works", profile: "per-human", platformOs: "windows" });
    const out = JSON.stringify(cfg);
    expect(out).not.toContain("\\\\"); // no escaped backslashes
    expect(cfg.mcpServers["supabase-ops"].args[2]).toBe("C:/Users/tran/ritsu-works/mcp-server/src/server.ts");
    expect(cfg.mcpServers["supabase-ops"].env.RITSU_REPO_ROOT).toBe("C:/Users/tran/ritsu-works");
  });
  it("throws when repoRoot is missing", () => {
    expect(() => generateMcpJson({} as never)).toThrow(/repoRoot/);
  });

  it("owner /bin/sh wrapper double-quotes paths so a repo root with a space still sources + cds", () => {
    const cfg = generateMcpJson({ repoRoot: "/Users/a b/ritsu-works", profile: "owner", platformOs: "macos" });
    const gbrainCmd = cfg.mcpServers["gbrain"].args[1] as string;
    // env sourcing + cd must be quoted (no bare `. /Users/a b/...` that the shell would word-split)
    expect(gbrainCmd).toContain('. "/Users/a b/ritsu-works/runtime/secrets/.env.local"');
    expect(gbrainCmd).toContain('cd "/Users/a b/ritsu-works/runtime/brain"');
    expect(gbrainCmd).toContain('"/Users/a b/ritsu-works/scripts/pre-budget-check.sh"');
    const analyticsCmd = cfg.mcpServers["supabase-analytics"].args[1] as string;
    expect(analyticsCmd).toContain('"/Users/a b/ritsu-works/mcp-server-analytics/src/server.ts"');
  });
});

describe("renderMcpJson", () => {
  it("returns valid JSON with a trailing newline", () => {
    const text = renderMcpJson({ repoRoot: ROOT, profile: "per-human", platformOs: "windows" });
    expect(text.endsWith("\n")).toBe(true);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).$schema).toContain("mcp-config.schema.json");
  });
});
