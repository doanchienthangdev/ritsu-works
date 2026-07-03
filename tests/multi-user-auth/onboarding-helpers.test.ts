// Tests for the co-founder onboarding helpers (capability multi-user-auth v0.2):
//   scripts/multi-user-auth/lib/session.cjs   (shared, DI'd toolkit)
//   scripts/multi-user-auth/mint.cjs          (owner mints a prefetch-proof enroll command)
//   scripts/multi-user-auth/reseed-owner.cjs  (owner reseeds their own credential file)
//   scripts/multi-user-auth/invite.cjs        (broker invite + auto-reseed of a stale owner token)
//
// Everything is exercised through injected fetch fakes + temp dirs — no live
// Supabase project, no network. Tokens in the fixtures are BUILT at runtime (never
// hard-coded long base64) so the fixtures carry no secret-shaped literals.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const cjsRequire = createRequire(import.meta.url);
const S = cjsRequire(resolve(__dirname, "../../scripts/multi-user-auth/lib/session.cjs"));
const { mintMain } = cjsRequire(resolve(__dirname, "../../scripts/multi-user-auth/mint.cjs"));
const { reseedMain } = cjsRequire(resolve(__dirname, "../../scripts/multi-user-auth/reseed-owner.cjs"));
const invite = cjsRequire(resolve(__dirname, "../../scripts/multi-user-auth/invite.cjs"));
const { enrollMain } = cjsRequire(resolve(__dirname, "../../scripts/multi-user-auth/enroll.cjs"));

const REF = "mntobbmieuoaxipnjaau";
const OPS_URL = `https://${REF}.supabase.co`;
// Anchor "now" to the real clock: the pure isAccessTokenStale tests pass NOW_SEC
// explicitly, while ensureOwnerToken/inviteMain use the production real-clock path
// (Date.now()). Anchoring to real-now keeps both in agreement (offsets are ≥10s /
// hours, so sub-second drift during a test is irrelevant).
const NOW_SEC = Math.floor(Date.now() / 1000);
const IS_WINDOWS = process.platform === "win32";

// ---- fixture builders (no long literals) -----------------------------------

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`;
}
function accessToken({ tier, email, exp }: { tier?: string; email?: string; exp?: number }): string {
  const p: Record<string, unknown> = { sub: "user-sub-1", exp: exp ?? NOW_SEC + 3600 };
  if (email) p.email = email;
  if (tier) p.app_metadata = { tier };
  return makeJwt(p);
}

interface FakeResp {
  ok: boolean;
  status: number;
  headers: { get(k: string): string | null };
  text(): Promise<string>;
}
function resp({ status = 200, body = "", location = null as string | null }): FakeResp {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === "location" ? location : null) },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

/** A fetch fake that routes by URL substring. `calls` records every request. */
function makeFetch(handlers: {
  genLink?: (email: string) => FakeResp;
  verify?: () => FakeResp;
  broker?: (body: Record<string, unknown>, callN: number) => FakeResp;
}) {
  const calls: Array<{ url: string; body: unknown }> = [];
  let brokerN = 0;
  const fetchImpl = async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    if (url.includes("/auth/v1/admin/generate_link")) {
      return handlers.genLink ? handlers.genLink((body as { email: string }).email) : resp({ status: 500 });
    }
    if (url.includes("/auth/v1/verify")) {
      return handlers.verify ? handlers.verify() : resp({ status: 500 });
    }
    if (url.includes("/functions/v1/operator-broker")) {
      return handlers.broker ? handlers.broker(body as Record<string, unknown>, brokerN++) : resp({ status: 500 });
    }
    return resp({ status: 404, body: "unrouted" });
  };
  return { fetchImpl, calls };
}

/** action_link that host-guards to ritsu-ops (the followMagicLink target). */
function actionLink(): string {
  return `${OPS_URL}/auth/v1/verify?token=abc&type=magiclink&redirect_to=http://localhost:3001/`;
}
/** a redirect Location whose fragment carries a fresh session. */
function verifyRedirect(tokens: { access: string; refresh: string }): FakeResp {
  return resp({
    status: 303,
    location: `http://localhost:3001/#access_token=${tokens.access}&refresh_token=${tokens.refresh}&expires_in=3600&token_type=bearer`,
  });
}

// A capturing logger.
function capture() {
  const lines: string[] = [];
  return { log: (...a: unknown[]) => lines.push(a.join(" ")), text: () => lines.join("\n"), lines };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mua-onboard-"));
});
afterEach(() => {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

// ===========================================================================
// session.cjs — parseEnvContent
// ===========================================================================
describe("session.parseEnvContent", () => {
  it("parses plain KEY=value", () => {
    expect(S.parseEnvContent("A=1\nB=two")).toStrictEqual({ A: "1", B: "two" });
  });
  it("honors an `export ` prefix", () => {
    expect(S.parseEnvContent("export FOO=bar")).toStrictEqual({ FOO: "bar" });
  });
  it("strips surrounding double and single quotes", () => {
    expect(S.parseEnvContent(`A="x y"\nB='z'`)).toStrictEqual({ A: "x y", B: "z" });
  });
  it("drops an inline # comment on unquoted values only", () => {
    expect(S.parseEnvContent("A=val # note\nB=\"keep # this\"")).toStrictEqual({ A: "val", B: "keep # this" });
  });
  it("is CRLF-safe (trailing \\r never leaks into a value)", () => {
    expect(S.parseEnvContent("A=1\r\nB=2\r\n")).toStrictEqual({ A: "1", B: "2" });
  });
  it("ignores blank lines, full-line comments, and non-KEY=val lines", () => {
    expect(S.parseEnvContent("\n# comment\n   \nnot an assignment\nA=1")).toStrictEqual({ A: "1" });
  });
  it("returns {} for non-string / empty input", () => {
    expect(S.parseEnvContent(undefined as unknown as string)).toStrictEqual({});
    expect(S.parseEnvContent("")).toStrictEqual({});
  });
  it("keeps a value containing '=' intact (only the first = splits)", () => {
    expect(S.parseEnvContent("URL=https://x?a=b&c=d")).toStrictEqual({ URL: "https://x?a=b&c=d" });
  });
});

// ===========================================================================
// session.cjs — repoRoot
// ===========================================================================
describe("session.repoRoot", () => {
  it("returns cwd unchanged when not in a worktree", () => {
    expect(S.repoRoot("/Users/x/ritsu-works")).toBe("/Users/x/ritsu-works");
  });
  it("collapses a .claude/worktrees/<name> path back to the main checkout", () => {
    expect(S.repoRoot("/Users/x/ritsu-works/.claude/worktrees/foo-bar")).toBe("/Users/x/ritsu-works");
    expect(S.repoRoot("/Users/x/ritsu-works/.claude/worktrees/foo/nested/deep")).toBe("/Users/x/ritsu-works");
  });
});

// ===========================================================================
// session.cjs — credentialFilePath
// ===========================================================================
describe("session.credentialFilePath", () => {
  it("uses the env override when set", () => {
    expect(S.credentialFilePath({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: "/abs/x.json" }, "/root")).toBe("/abs/x.json");
  });
  it("defaults to runtime/secrets/.operator-refresh.json under root", () => {
    expect(S.credentialFilePath({}, "/root")).toBe(path.join("/root", "runtime", "secrets", ".operator-refresh.json"));
  });
  it("tolerates a null env", () => {
    expect(S.credentialFilePath(null, "/root")).toBe(path.join("/root", "runtime", "secrets", ".operator-refresh.json"));
  });
});

// ===========================================================================
// session.cjs — decodeJwt
// ===========================================================================
describe("session.decodeJwt", () => {
  it("decodes email (lowercased), sub, exp, and app_metadata.tier", () => {
    const d = S.decodeJwt(accessToken({ tier: "owner", email: "Owner@Example.COM", exp: 42 }));
    expect(d.email).toBe("owner@example.com");
    expect(d.tier).toBe("owner");
    expect(d.sub).toBe("user-sub-1");
    expect(d.exp).toBe(42);
  });
  it("returns all-null for null/undefined/empty/non-string", () => {
    for (const t of [null, undefined, "", 123]) {
      expect(S.decodeJwt(t as unknown as string)).toStrictEqual({ email: null, tier: null, sub: null, exp: null, claims: null });
    }
  });
  it("returns all-null when the token is not 3 dot-separated parts", () => {
    expect(S.decodeJwt("a.b").tier).toBeNull();
    expect(S.decodeJwt("a.b.c.d").tier).toBeNull();
  });
  it("returns all-null when the payload is not valid base64url JSON", () => {
    expect(S.decodeJwt("aaa.!!!notb64!!!.sig").claims).toBeNull();
  });
  it("ignores a tier that is not one of owner|admin|user", () => {
    expect(S.decodeJwt(makeJwt({ app_metadata: { tier: "superuser" } })).tier).toBeNull();
  });
  it("yields tier=null when app_metadata is missing or not an object", () => {
    expect(S.decodeJwt(makeJwt({ email: "a@b.co" })).tier).toBeNull();
    expect(S.decodeJwt(makeJwt({ app_metadata: "x" })).tier).toBeNull();
  });
  it("yields exp=null when exp is absent or non-numeric", () => {
    expect(S.decodeJwt(makeJwt({ exp: "soon" })).exp).toBeNull();
  });
});

// ===========================================================================
// session.cjs — isAccessTokenStale
// ===========================================================================
describe("session.isAccessTokenStale", () => {
  it("is false for a token expiring comfortably in the future", () => {
    expect(S.isAccessTokenStale(accessToken({ exp: NOW_SEC + 3600 }), NOW_SEC)).toBe(false);
  });
  it("is true for an expired token", () => {
    expect(S.isAccessTokenStale(accessToken({ exp: NOW_SEC - 1 }), NOW_SEC)).toBe(true);
  });
  it("is true within the default 30s skew window (about to expire)", () => {
    expect(S.isAccessTokenStale(accessToken({ exp: NOW_SEC + 10 }), NOW_SEC)).toBe(true);
  });
  it("is true (fail-closed) for a token with no readable exp or a malformed token", () => {
    expect(S.isAccessTokenStale(makeJwt({ email: "a@b.co" }), NOW_SEC)).toBe(true);
    expect(S.isAccessTokenStale("garbage", NOW_SEC)).toBe(true);
    expect(S.isAccessTokenStale(null, NOW_SEC)).toBe(true);
  });
});

// ===========================================================================
// session.cjs — magic-link host guard + fragment extraction
// ===========================================================================
describe("session.hostIsRitsuOps", () => {
  it("accepts a URL on the exact ritsu-ops project host", () => {
    expect(S.hostIsRitsuOps(`${OPS_URL}/auth/v1/verify?x=1`)).toBe(true);
  });
  it("rejects a non-ritsu-ops host (confused-deputy guard)", () => {
    expect(S.hostIsRitsuOps("https://evil.example.com/auth/v1/verify")).toBe(false);
    expect(S.hostIsRitsuOps("https://other-project.supabase.co/x")).toBe(false);
  });
  it("rejects a substring-bypass host that merely CONTAINS the ref (exact-match guard)", () => {
    // an `includes(REF)` guard would wrongly accept both of these
    expect(S.hostIsRitsuOps(`https://${REF}.evil.com/#access_token=x&refresh_token=y`)).toBe(false);
    expect(S.hostIsRitsuOps(`https://evil-${REF}.supabase.co/x`)).toBe(false);
    expect(S.hostIsRitsuOps(`https://${REF}.supabase.co.evil.com/x`)).toBe(false);
  });
  it("rejects a non-URL string", () => {
    expect(S.hostIsRitsuOps("not a url")).toBe(false);
    expect(S.hostIsRitsuOps("")).toBe(false);
  });
});

describe("session.fragmentFromLocation", () => {
  it("returns the fragment after #", () => {
    expect(S.fragmentFromLocation("http://x/#a=1&b=2")).toBe("a=1&b=2");
  });
  it("returns '' when there is no fragment, null for no input", () => {
    expect(S.fragmentFromLocation("http://x/")).toBe("");
    expect(S.fragmentFromLocation(null)).toBeNull();
  });
});

describe("session.parseFragmentTokens", () => {
  it("extracts access + refresh from a normal fragment", () => {
    expect(S.parseFragmentTokens("access_token=AT&refresh_token=RT&expires_in=3600")).toStrictEqual({ access: "AT", refresh: "RT" });
  });
  it("throws a prefetch-aware error on error=access_denied", () => {
    expect(() => S.parseFragmentTokens("error=access_denied&error_code=otp_expired")).toThrow(/consumed|prefetch|mint/i);
  });
  it("throws on error_description even without error", () => {
    expect(() => S.parseFragmentTokens("error_description=Email+link+is+invalid+or+has+expired")).toThrow(/magic-link error/i);
  });
  it("throws when either token is missing", () => {
    expect(() => S.parseFragmentTokens("access_token=AT")).toThrow(/no \{access_token, refresh_token\}/);
    expect(() => S.parseFragmentTokens("refresh_token=RT")).toThrow();
    expect(() => S.parseFragmentTokens("")).toThrow();
  });
});

describe("session.followMagicLinkTokens", () => {
  it("refuses a link whose host is not ritsu-ops (before any fetch)", async () => {
    let fetched = false;
    await expect(
      S.followMagicLinkTokens("https://evil.example.com/#access_token=x&refresh_token=y", {
        fetchImpl: async () => {
          fetched = true;
          return resp({});
        },
      }),
    ).rejects.toThrow(/not the ritsu-ops project/);
    expect(fetched).toBe(false);
  });
  it("returns tokens from the redirect fragment on the happy path", async () => {
    const out = await S.followMagicLinkTokens(actionLink(), {
      fetchImpl: async () => verifyRedirect({ access: "AT", refresh: "RT" }),
    });
    expect(out).toStrictEqual({ access: "AT", refresh: "RT" });
  });
  it("throws when the link did not redirect (no Location)", async () => {
    await expect(
      S.followMagicLinkTokens(actionLink(), { fetchImpl: async () => resp({ status: 200 }) }),
    ).rejects.toThrow(/did not redirect/);
  });
  it("surfaces an error fragment (single-use link already consumed)", async () => {
    await expect(
      S.followMagicLinkTokens(actionLink(), {
        fetchImpl: async () => resp({ status: 303, location: "http://localhost/#error=access_denied&error_code=otp_expired" }),
      }),
    ).rejects.toThrow(/consumed|prefetch|mint/i);
  });
});

// ===========================================================================
// session.cjs — atomic credential writes
// ===========================================================================
describe("session.writeCredentialFile / readCredential", () => {
  it("writes {refresh_token, updated_at} with no access_token when access is omitted", () => {
    const file = path.join(tmp, "cred.json");
    S.writeCredentialFile({ file, refresh: "RT", now: "2026-07-03T00:00:00Z" });
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(j.refresh_token).toBe("RT");
    expect(j.updated_at).toBe("2026-07-03T00:00:00Z");
    expect("access_token" in j).toBe(false);
  });
  it("includes access_token when provided", () => {
    const file = path.join(tmp, "cred.json");
    S.writeCredentialFile({ file, refresh: "RT", access: "AT", now: "t" });
    expect(JSON.parse(fs.readFileSync(file, "utf8")).access_token).toBe("AT");
  });
  it("creates the parent directory if missing", () => {
    const file = path.join(tmp, "nested", "deep", "cred.json");
    S.writeCredentialFile({ file, refresh: "RT" });
    expect(fs.existsSync(file)).toBe(true);
  });
  it("writes the file 0600 (owner-only) and leaves no temp file behind", () => {
    const file = path.join(tmp, "cred.json");
    S.writeCredentialFile({ file, refresh: "RT" });
    if (!IS_WINDOWS) {
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    }
    expect(fs.readdirSync(tmp).filter((f) => f.includes(".tmp"))).toStrictEqual([]);
  });
  it("overwrites atomically (a second write replaces the first)", () => {
    const file = path.join(tmp, "cred.json");
    S.writeCredentialFile({ file, refresh: "RT1" });
    S.writeCredentialFile({ file, refresh: "RT2", access: "AT2" });
    const j = S.readCredential(file);
    expect(j.refresh_token).toBe("RT2");
    expect(j.access_token).toBe("AT2");
  });
  it("throws when refresh is missing", () => {
    expect(() => S.writeCredentialFile({ file: path.join(tmp, "x.json") })).toThrow(/refresh token required/);
  });
  it("readCredential returns null for a missing or corrupt file", () => {
    expect(S.readCredential(path.join(tmp, "nope.json"))).toBeNull();
    fs.writeFileSync(path.join(tmp, "bad.json"), "{not json");
    expect(S.readCredential(path.join(tmp, "bad.json"))).toBeNull();
  });
  it("readCredential nulls blank / wrong-typed fields", () => {
    const file = path.join(tmp, "c.json");
    fs.writeFileSync(file, JSON.stringify({ refresh_token: "", access_token: 5 }));
    expect(S.readCredential(file)).toStrictEqual({ refresh_token: null, access_token: null, updated_at: null });
  });
});

// ===========================================================================
// session.cjs — adminGenerateMagicLink
// ===========================================================================
describe("session.adminGenerateMagicLink", () => {
  const good = { url: OPS_URL, serviceKey: "svc", email: "a@b.co" };
  it("refuses a URL that is not the ritsu-ops project", async () => {
    await expect(S.adminGenerateMagicLink({ ...good, url: "https://other.supabase.co" })).rejects.toThrow(/not the ritsu-ops project/);
  });
  it("requires a service key (owner-only)", async () => {
    await expect(S.adminGenerateMagicLink({ ...good, serviceKey: "" })).rejects.toThrow(/service_role.*OWNER-only|OWNER-only/);
  });
  it("requires an email", async () => {
    await expect(S.adminGenerateMagicLink({ ...good, email: "", fetchImpl: async () => resp({}) })).rejects.toThrow(/email required/);
  });
  it("returns properties.action_link on success", async () => {
    const link = await S.adminGenerateMagicLink({ ...good, fetchImpl: async () => resp({ body: { properties: { action_link: actionLink() } } }) });
    expect(link).toContain(REF);
  });
  it("also accepts a top-level action_link", async () => {
    const link = await S.adminGenerateMagicLink({ ...good, fetchImpl: async () => resp({ body: { action_link: actionLink() } }) });
    expect(link).toContain("/auth/v1/verify");
  });
  it("throws with an 'invite first' hint when there is no action_link (user not found)", async () => {
    await expect(S.adminGenerateMagicLink({ ...good, fetchImpl: async () => resp({ body: {} }) })).rejects.toThrow(/invite\.cjs .* --tier/);
  });
  it("surfaces a non-2xx response body", async () => {
    await expect(
      S.adminGenerateMagicLink({ ...good, fetchImpl: async () => resp({ status: 422, body: { msg: "user not allowed" } }) }),
    ).rejects.toThrow(/generate_link failed \(422\).*user not allowed/);
  });
  it("sends the magiclink type + email in the POST body", async () => {
    let sent: Record<string, unknown> | undefined;
    await S.adminGenerateMagicLink({
      ...good,
      fetchImpl: async (_u: string, init: { body: string }) => {
        sent = JSON.parse(init.body);
        return resp({ body: { properties: { action_link: actionLink() } } });
      },
    });
    expect(sent).toMatchObject({ type: "magiclink", email: "a@b.co" });
  });
});

// ===========================================================================
// session.cjs — buildEnrollCommand / slug / formatEnrollCommandFile
// ===========================================================================
describe("session.buildEnrollCommand", () => {
  it("produces a token-based enroll command with NO url (nothing to prefetch)", () => {
    const cmd = S.buildEnrollCommand({ refresh: "RT", access: "AT" });
    expect(cmd).toBe("node scripts/multi-user-auth/enroll.cjs --refresh-token=RT --access-token=AT");
    expect(cmd).not.toMatch(/https?:\/\//);
  });
  it("requires both tokens", () => {
    expect(() => S.buildEnrollCommand({ refresh: "RT" })).toThrow(/both refresh and access/);
    expect(() => S.buildEnrollCommand({ access: "AT" })).toThrow();
  });
  it("refuses tokens containing shell metacharacters (corrupted paste / injection guard)", () => {
    expect(() => S.buildEnrollCommand({ refresh: "RT; rm -rf /", access: "AT" })).toThrow(/unexpected characters/);
    expect(() => S.buildEnrollCommand({ refresh: "RT", access: "AT`whoami`" })).toThrow();
    expect(() => S.buildEnrollCommand({ refresh: "R T", access: "AT" })).toThrow();
  });
  it("allowlist closes the gaps a denylist missed (backslash, glob, null byte, redirects, braces)", () => {
    for (const bad of ["RT\\x", "RT*", "RT?", "RT[a]", "RT>o", "RT<i", "RT{x}", "RT(x)", "RT~", "RT#c", "RT\x00", "RT="]) {
      expect(() => S.buildEnrollCommand({ refresh: bad, access: "AT" }), bad).toThrow(/unexpected characters/);
    }
  });
  it("accepts real JWT-shaped tokens (dots, dashes, underscores) — the only valid charset", () => {
    const at = accessToken({ tier: "admin", email: "a@b.co" });
    expect(() => S.buildEnrollCommand({ refresh: "v1.Mk_a-b", access: at })).not.toThrow();
  });
});

describe("session.slugForEmail", () => {
  it("slugifies an email to a safe filename fragment", () => {
    expect(S.slugForEmail("Tran.Ngoc+dev@Gmail.com")).toBe("tran-ngoc-dev-gmail-com");
  });
  it("falls back to 'cofounder' for empty / symbol-only input", () => {
    expect(S.slugForEmail("")).toBe("cofounder");
    expect(S.slugForEmail("@@@")).toBe("cofounder");
    expect(S.slugForEmail(null)).toBe("cofounder");
  });
});

describe("session.formatEnrollCommandFile", () => {
  it("embeds the enroll command and a prefetch/TTL explanation, no bare url", () => {
    const out = S.formatEnrollCommandFile({ email: "a@b.co", refresh: "RT", access: "AT", tier: "admin", now: "t" });
    expect(out).toContain("node scripts/multi-user-auth/enroll.cjs --refresh-token=RT --access-token=AT");
    expect(out).toContain("a@b.co");
    expect(out).toMatch(/expires in ~1 hour/i);
    expect(out).not.toMatch(/https?:\/\//);
  });
});

// ===========================================================================
// session.cjs — reseedOwnerCredential
// ===========================================================================
describe("session.reseedOwnerCredential", () => {
  it("mints an owner session and seeds the credential file (refresh + access)", async () => {
    const file = path.join(tmp, "owner.json");
    const at = accessToken({ tier: "owner", email: "owner@x.co" });
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "owner-rt" }),
    });
    const { decoded } = await S.reseedOwnerCredential({ url: OPS_URL, serviceKey: "svc", email: "owner@x.co", file, fetchImpl, now: "t" });
    expect(decoded.tier).toBe("owner");
    const cred = S.readCredential(file);
    expect(cred.refresh_token).toBe("owner-rt");
    expect(cred.access_token).toBe(at);
  });
  it("REFUSES to write a non-owner session into the owner credential file", async () => {
    const file = path.join(tmp, "owner.json");
    const at = accessToken({ tier: "admin", email: "adm@x.co" });
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "adm-rt" }),
    });
    await expect(S.reseedOwnerCredential({ url: OPS_URL, serviceKey: "svc", email: "adm@x.co", file, fetchImpl })).rejects.toThrow(
      /reseed refused.*not owner/i,
    );
    expect(fs.existsSync(file)).toBe(false); // nothing written
  });
});

// ===========================================================================
// mint.cjs — mintMain
// ===========================================================================
describe("mint.cjs — mintMain", () => {
  const env = { SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc" };

  it("mints a co-founder session and writes a 0600 enroll-command file, printing NO token values", async () => {
    const at = accessToken({ tier: "admin", email: "tran@example.com" });
    const rt = "tran-refresh-unique-marker";
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: rt }),
    });
    const cap = capture();
    const out = await mintMain(["node", "mint.cjs", "tran@example.com"], { fetchImpl, root: tmp, env, log: cap.log });

    // file written under root/runtime/secrets, 0600, contains the command
    expect(out.tier).toBe("admin");
    expect(out.file).toBe(path.join(tmp, "runtime", "secrets", "enroll-command-tran-example-com.txt"));
    const content = fs.readFileSync(out.file, "utf8");
    expect(content).toContain(`--refresh-token=${rt} --access-token=${at}`);
    if (!IS_WINDOWS) expect(fs.statSync(out.file).mode & 0o777).toBe(0o600);

    // the narration NEVER prints token values (they live only in the 0600 file)
    expect(cap.text()).not.toContain(rt);
    expect(cap.text()).not.toContain(at);
    expect(cap.text()).toContain(out.file); // it prints the path + a cat instruction
    expect(cap.text()).toMatch(/cat /);
  });

  it("REFUSES to mint an owner as a co-founder (points at reseed-owner.cjs)", async () => {
    const at = accessToken({ tier: "owner", email: "owner@x.co" });
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "rt" }),
    });
    await expect(mintMain(["n", "m", "owner@x.co"], { fetchImpl, root: tmp, env, log: () => {} })).rejects.toThrow(/is an OWNER.*reseed-owner/s);
  });

  it("warns (but proceeds) when the minted session has no tier claim (not invited yet)", async () => {
    const at = accessToken({ email: "new@x.co" }); // no tier
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "rt" }),
    });
    const cap = capture();
    const out = await mintMain(["n", "m", "new@x.co"], { fetchImpl, root: tmp, env, log: cap.log });
    expect(out.tier).toBeNull();
    expect(cap.text()).toMatch(/no tier claim|invite\.cjs/);
    expect(fs.existsSync(out.file)).toBe(true);
  });

  it("errors on a missing email argument", async () => {
    await expect(mintMain(["n", "m"], { fetchImpl: async () => resp({}), root: tmp, env, log: () => {} })).rejects.toThrow(/usage: mint\.cjs/);
  });

  it("surfaces the 'invite first' error when the user does not exist", async () => {
    const { fetchImpl } = makeFetch({ genLink: () => resp({ body: {} }) }); // no action_link
    await expect(mintMain(["n", "m", "ghost@x.co"], { fetchImpl, root: tmp, env, log: () => {} })).rejects.toThrow(/invite\.cjs .* --tier/);
  });

  it("requires a service key (co-founder machines have none)", async () => {
    await expect(
      mintMain(["n", "m", "a@b.co"], { fetchImpl: async () => resp({}), root: tmp, env: { SUPABASE_URL: OPS_URL }, log: () => {} }),
    ).rejects.toThrow(/OWNER-only/);
  });
});

// ===========================================================================
// reseed-owner.cjs — reseedMain
// ===========================================================================
describe("reseed-owner.cjs — reseedMain", () => {
  const env = { SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc" };
  it("seeds the owner credential file at the default path", async () => {
    const at = accessToken({ tier: "owner", email: "owner@x.co" });
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "owner-rt" }),
    });
    const cap = capture();
    const out = await reseedMain(["n", "r", "owner@x.co"], { fetchImpl, root: tmp, env, log: cap.log });
    expect(out.file).toBe(path.join(tmp, "runtime", "secrets", ".operator-refresh.json"));
    expect(S.readCredential(out.file).refresh_token).toBe("owner-rt");
    expect(cap.text()).not.toContain("owner-rt"); // never prints tokens
  });
  it("honors RITSU_OPERATOR_REFRESH_TOKEN_FILE override", async () => {
    const file = path.join(tmp, "custom.json");
    const at = accessToken({ tier: "owner", email: "owner@x.co" });
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: at, refresh: "rt" }),
    });
    const out = await reseedMain(["n", "r", "owner@x.co"], { fetchImpl, root: tmp, env: { ...env, RITSU_OPERATOR_REFRESH_TOKEN_FILE: file }, log: () => {} });
    expect(out.file).toBe(file);
    expect(fs.existsSync(file)).toBe(true);
  });
  it("errors on a missing owner-email argument", async () => {
    await expect(reseedMain(["n", "r"], { fetchImpl: async () => resp({}), root: tmp, env, log: () => {} })).rejects.toThrow(/usage: reseed-owner/);
  });
});

// ===========================================================================
// invite.cjs — helpers
// ===========================================================================
describe("invite.cjs — ownerAccessToken", () => {
  it("prefers RITSU_OPERATOR_ACCESS_TOKEN over the credential file", () => {
    const file = path.join(tmp, "c.json");
    S.writeCredentialFile({ file, refresh: "RT", access: "FILE_AT" });
    expect(invite.ownerAccessToken({ RITSU_OPERATOR_ACCESS_TOKEN: "ENV_AT" }, file)).toBe("ENV_AT");
  });
  it("falls back to the credential file's access_token", () => {
    const file = path.join(tmp, "c.json");
    S.writeCredentialFile({ file, refresh: "RT", access: "FILE_AT" });
    expect(invite.ownerAccessToken({}, file)).toBe("FILE_AT");
  });
  it("returns null when neither is present", () => {
    expect(invite.ownerAccessToken({}, path.join(tmp, "missing.json"))).toBeNull();
  });
});

describe("invite.cjs — resolveOwnerEmailForReseed", () => {
  const ownerTok = accessToken({ tier: "owner", email: "owner@x.co" });
  it("prefers an explicit --reseed=<email> (lowercased)", () => {
    expect(invite.resolveOwnerEmailForReseed({ reseedVal: "Owner2@X.CO", env: {}, credAccessToken: ownerTok, root: tmp })).toBe("owner2@x.co");
  });
  it("then RITSU_OWNER_EMAIL", () => {
    expect(invite.resolveOwnerEmailForReseed({ reseedVal: null, env: { RITSU_OWNER_EMAIL: "env@x.co" }, credAccessToken: ownerTok, root: tmp })).toBe("env@x.co");
  });
  it("then the (possibly expired) credential token's own email claim", () => {
    expect(invite.resolveOwnerEmailForReseed({ reseedVal: null, env: {}, credAccessToken: ownerTok, root: tmp })).toBe("owner@x.co");
  });
  it("then a SOLE active owner from the registry", () => {
    expect(invite.resolveOwnerEmailForReseed({ reseedVal: null, env: {}, credAccessToken: null, root: tmp, owners: ["solo@x.co"] })).toBe("solo@x.co");
  });
  it("is ambiguous (null) when ≥2 owners and no hint", () => {
    expect(invite.resolveOwnerEmailForReseed({ reseedVal: null, env: {}, credAccessToken: null, root: tmp, owners: ["a@x.co", "b@x.co"] })).toBeNull();
  });
});

describe("invite.cjs — ensureOwnerToken", () => {
  const url = OPS_URL;
  const base = { url, root: tmp, log: () => {} };

  it("returns a fresh token unchanged (no reseed, no fetch)", async () => {
    const file = path.join(tmp, "c.json");
    const fresh = accessToken({ tier: "owner", email: "o@x.co", exp: NOW_SEC + 3600 });
    S.writeCredentialFile({ file, refresh: "RT", access: fresh });
    let fetched = false;
    const r = await invite.ensureOwnerToken({
      ...base,
      env: {},
      credFile: file,
      serviceKey: "svc",
      reseedVal: null,
      forceReseed: false,
      fetchImpl: async () => {
        fetched = true;
        return resp({});
      },
    });
    expect(r.token).toBe(fresh);
    expect(r.reseeded).toBe(false);
    expect(fetched).toBe(false);
  });

  it("auto-reseeds when the token is stale and a service key is present", async () => {
    const file = path.join(tmp, "c.json");
    const stale = accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC - 10 });
    S.writeCredentialFile({ file, refresh: "old-rt", access: stale });
    const freshAt = accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC + 3600 });
    const { fetchImpl, calls } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: freshAt, refresh: "fresh-rt" }),
    });
    const r = await invite.ensureOwnerToken({ ...base, env: {}, credFile: file, serviceKey: "svc", reseedVal: null, forceReseed: false, fetchImpl });
    expect(r.token).toBe(freshAt);
    expect(r.reseeded).toBe(true);
    expect(S.readCredential(file).refresh_token).toBe("fresh-rt");
    // reseed target came from the stale token's own email claim
    expect(calls.find((c) => (c.body as { email?: string })?.email)?.body).toMatchObject({ email: "owner@x.co" });
  });

  it("throws (no destructive fallback) when the token is missing and there is no service key", async () => {
    await expect(
      invite.ensureOwnerToken({ ...base, env: {}, credFile: path.join(tmp, "none.json"), serviceKey: "", reseedVal: null, forceReseed: false, fetchImpl: async () => resp({}) }),
    ).rejects.toThrow(/no owner access token.*no SUPABASE_SERVICE_KEY|reseed-owner\.cjs/s);
  });

  it("warns but proceeds with a stale token when no service key (can't reseed)", async () => {
    const file = path.join(tmp, "c.json");
    const stale = accessToken({ tier: "owner", email: "o@x.co", exp: NOW_SEC - 10 });
    S.writeCredentialFile({ file, refresh: "RT", access: stale });
    const cap = capture();
    const r = await invite.ensureOwnerToken({ ...base, log: cap.log, env: {}, credFile: file, serviceKey: "", reseedVal: null, forceReseed: false, fetchImpl: async () => resp({}) });
    expect(r.token).toBe(stale);
    expect(r.reseeded).toBe(false);
    expect(cap.text()).toMatch(/stale/i);
  });

  it("throws a clear error when reseed is needed but the owner mailbox is ambiguous", async () => {
    // no token at all → no email claim; empty registry read → null
    await expect(
      invite.ensureOwnerToken({
        ...base,
        root: tmp, // operators.yaml not present under tmp → registry read yields []
        env: {},
        credFile: path.join(tmp, "none.json"),
        serviceKey: "svc",
        reseedVal: null,
        forceReseed: false,
        fetchImpl: async () => resp({}),
      }),
    ).rejects.toThrow(/which owner mailbox to reseed.*--reseed=/s);
  });
});

// ===========================================================================
// invite.cjs — inviteMain (end-to-end with fakes)
// ===========================================================================
describe("invite.cjs — inviteMain", () => {
  function ownerEnvWithFreshToken() {
    const file = path.join(tmp, "runtime", "secrets", ".operator-refresh.json");
    S.writeCredentialFile({ file, refresh: "RT", access: accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC + 3600 }) });
    return { SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc" };
  }

  it("refuses when SUPABASE_URL is not the ritsu-ops project", async () => {
    await expect(
      invite.inviteMain(["n", "i", "a@b.co"], { fetchImpl: async () => resp({}), root: tmp, env: { SUPABASE_URL: "https://other.supabase.co" }, log: () => {} }),
    ).rejects.toThrow(/not the ritsu-ops project/);
  });

  it("invites a co-founder and recommends the mint (prefetch-proof) default path", async () => {
    const env = ownerEnvWithFreshToken();
    const { fetchImpl } = makeFetch({
      broker: (body) => {
        if (body.action === "whoami") return resp({ body: { caller: { tier: "owner", email: "owner@x.co" } } });
        if (body.action === "invite") return resp({ body: { ok: true, invited: body.email, tier: body.tier, magic_link: `${OPS_URL}/auth/v1/verify?token=zzz` } });
        return resp({ status: 400 });
      },
    });
    const cap = capture();
    const code = await invite.inviteMain(["n", "i", "tran@example.com", "--tier=admin"], { fetchImpl, root: tmp, env, log: cap.log });
    expect(code).toBe(0);
    expect(cap.text()).toContain("invited tran@example.com as admin");
    expect(cap.text()).toMatch(/mint\.cjs tran@example\.com/); // default path
    expect(cap.text()).toMatch(/FALLBACK.*magic-link|fragile/is); // fallback labeled
  });

  it("rejects a --tier other than admin|user (owner cannot be minted via the broker)", async () => {
    const env = ownerEnvWithFreshToken();
    await expect(invite.inviteMain(["n", "i", "a@b.co", "--tier=owner"], { fetchImpl: async () => resp({}), root: tmp, env, log: () => {} })).rejects.toThrow(
      /--tier must be admin or user/,
    );
  });

  it("errors clearly when the broker says the caller is not owner", async () => {
    const env = ownerEnvWithFreshToken();
    const { fetchImpl } = makeFetch({ broker: () => resp({ body: { caller: { tier: "admin" } } }) });
    await expect(invite.inviteMain(["n", "i", "a@b.co", "--tier=admin"], { fetchImpl, root: tmp, env, log: () => {} })).rejects.toThrow(
      /you are tier="admin", not owner/,
    );
  });

  it("--whoami prints the caller and returns 0", async () => {
    const env = ownerEnvWithFreshToken();
    const { fetchImpl } = makeFetch({ broker: () => resp({ body: { caller: { tier: "owner" } } }) });
    const cap = capture();
    const code = await invite.inviteMain(["n", "i", "--whoami"], { fetchImpl, root: tmp, env, log: cap.log });
    expect(code).toBe(0);
    expect(cap.text()).toContain('"tier": "owner"');
  });

  it("auto-reseeds a STALE owner token before inviting (self-healing), then succeeds", async () => {
    // credential file holds an expired owner token
    const file = path.join(tmp, "runtime", "secrets", ".operator-refresh.json");
    S.writeCredentialFile({ file, refresh: "old-rt", access: accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC - 10 }) });
    const env = { SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc" };
    const freshOwner = accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC + 3600 });
    let reseeded = false;
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => {
        reseeded = true;
        return verifyRedirect({ access: freshOwner, refresh: "fresh-rt" });
      },
      broker: (body) => {
        if (body.action === "whoami") return resp({ body: { caller: { tier: "owner", email: "owner@x.co" } } });
        if (body.action === "invite") return resp({ body: { ok: true, invited: body.email, tier: body.tier, magic_link: "x" } });
        return resp({ status: 400 });
      },
    });
    const cap = capture();
    const code = await invite.inviteMain(["n", "i", "tran@example.com", "--tier=admin"], { fetchImpl, root: tmp, env, log: cap.log });
    expect(code).toBe(0);
    expect(reseeded).toBe(true);
    expect(cap.text()).toMatch(/reseed/i);
    expect(S.readCredential(file).refresh_token).toBe("fresh-rt");
  });

  it("retries ONCE with a reseed when the broker rejects a seemingly-fresh token (401)", async () => {
    const file = path.join(tmp, "runtime", "secrets", ".operator-refresh.json");
    // token looks fresh by exp, but the server will 401 it (dead session)
    S.writeCredentialFile({ file, refresh: "RT", access: accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC + 3600 }) });
    const env = { SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc" };
    const freshOwner = accessToken({ tier: "owner", email: "owner@x.co", exp: NOW_SEC + 7200 });
    let brokerCalls = 0;
    const { fetchImpl } = makeFetch({
      genLink: () => resp({ body: { properties: { action_link: actionLink() } } }),
      verify: () => verifyRedirect({ access: freshOwner, refresh: "fresh-rt" }),
      broker: (body) => {
        brokerCalls++;
        // first whoami 401s; after reseed, whoami+invite succeed
        if (body.action === "whoami" && brokerCalls === 1) return resp({ status: 401, body: { error: "invalid_jwt" } });
        if (body.action === "whoami") return resp({ body: { caller: { tier: "owner", email: "owner@x.co" } } });
        if (body.action === "invite") return resp({ body: { ok: true, invited: body.email, tier: body.tier, magic_link: "x" } });
        return resp({ status: 400 });
      },
    });
    const code = await invite.inviteMain(["n", "i", "tran@example.com", "--tier=admin"], { fetchImpl, root: tmp, env, log: () => {} });
    expect(code).toBe(0);
    expect(S.readCredential(file).refresh_token).toBe("fresh-rt"); // reseed happened on the 401
  });
});

// ===========================================================================
// enroll.cjs — enrollMain (the co-founder's live path — token form + magic-link)
// ===========================================================================
describe("enroll.cjs — enrollMain", () => {
  const env = { SUPABASE_URL: OPS_URL };
  const credAt = path.join("runtime", "secrets", ".operator-refresh.json");

  it("token form: seeds the credential file (refresh only) and redeems", async () => {
    const at = accessToken({ tier: "admin", email: "tran@example.com" });
    const { fetchImpl, calls } = makeFetch({ broker: () => resp({ body: { ok: true, redeemed: "tran@example.com", tier: "admin" } }) });
    const out = await enrollMain(["n", "e", `--refresh-token=RT`, `--access-token=${at}`], { fetchImpl, root: tmp, env, log: () => {} });
    expect(out).toStrictEqual({ file: path.join(tmp, credAt), redeemed: true });
    const cred = S.readCredential(out.file);
    expect(cred.refresh_token).toBe("RT");
    expect(cred.access_token).toBeNull(); // enroll writes refresh only; the MCP fills access on first boot
    expect((calls.at(-1)!.body as { action: string }).action).toBe("redeem");
  });

  it("magic-link form: follows the link, seeds the file, redeems", async () => {
    const at = accessToken({ tier: "admin", email: "tran@example.com" });
    const { fetchImpl } = makeFetch({
      verify: () => verifyRedirect({ access: at, refresh: "link-rt" }),
      broker: () => resp({ body: { ok: true } }),
    });
    const out = await enrollMain(["n", "e", actionLink()], { fetchImpl, root: tmp, env, log: () => {} });
    expect(out.redeemed).toBe(true);
    expect(S.readCredential(out.file).refresh_token).toBe("link-rt");
  });

  it("refuses to overwrite an existing DIFFERENT refresh token without --force (rotation footgun)", async () => {
    const file = path.join(tmp, credAt);
    S.writeCredentialFile({ file, refresh: "LIVE_RT", access: "AT" });
    await expect(
      enrollMain(["n", "e", "--refresh-token=OLD_RT", "--access-token=x"], { fetchImpl: async () => resp({}), root: tmp, env, log: () => {} }),
    ).rejects.toThrow(/already exists.*refusing to overwrite/s);
  });

  it("--force overwrites the existing refresh token", async () => {
    const file = path.join(tmp, credAt);
    S.writeCredentialFile({ file, refresh: "LIVE_RT" });
    const at = accessToken({ tier: "admin", email: "t@x.co" });
    const { fetchImpl } = makeFetch({ broker: () => resp({ body: { ok: true } }) });
    await enrollMain(["n", "e", "--refresh-token=NEW_RT", `--access-token=${at}`, "--force"], { fetchImpl, root: tmp, env, log: () => {} });
    expect(S.readCredential(file).refresh_token).toBe("NEW_RT");
  });

  it("no access token: seeds the file and stops before redeem (returns redeemed:false)", async () => {
    let brokerCalled = false;
    const { fetchImpl } = makeFetch({
      broker: () => {
        brokerCalled = true;
        return resp({ body: {} });
      },
    });
    const out = await enrollMain(["n", "e", "--refresh-token=RT"], { fetchImpl, root: tmp, env, log: () => {} });
    expect(out.redeemed).toBe(false);
    expect(brokerCalled).toBe(false);
    expect(S.readCredential(out.file).refresh_token).toBe("RT");
  });

  it("redeem 404 → actionable not_invited error (credential file stays seeded)", async () => {
    const at = accessToken({ tier: "admin", email: "t@x.co" });
    const { fetchImpl } = makeFetch({ broker: () => resp({ status: 404, body: { error: "not_invited" } }) });
    await expect(enrollMain(["n", "e", "--refresh-token=RT", `--access-token=${at}`], { fetchImpl, root: tmp, env, log: () => {} })).rejects.toThrow(
      /not_invited.*invite\.cjs/s,
    );
    expect(S.readCredential(path.join(tmp, credAt)).refresh_token).toBe("RT");
  });

  it("redeem 401 → actionable expired-access guidance", async () => {
    const at = accessToken({ tier: "admin", email: "t@x.co" });
    const { fetchImpl } = makeFetch({ broker: () => resp({ status: 401, body: { error: "invalid_jwt" } }) });
    await expect(enrollMain(["n", "e", "--refresh-token=RT", `--access-token=${at}`], { fetchImpl, root: tmp, env, log: () => {} })).rejects.toThrow(
      /unauthorized \(401\).*expired/s,
    );
  });

  it("refuses when SUPABASE_URL is not the ritsu-ops project", async () => {
    await expect(
      enrollMain(["n", "e", "--refresh-token=RT"], { fetchImpl: async () => resp({}), root: tmp, env: { SUPABASE_URL: "https://other.supabase.co" }, log: () => {} }),
    ).rejects.toThrow(/not the ritsu-ops project/);
  });

  it("errors with usage when neither a token nor a link is given", async () => {
    await expect(enrollMain(["n", "e"], { fetchImpl: async () => resp({}), root: tmp, env, log: () => {} })).rejects.toThrow(/usage: enroll\.cjs/);
  });
});
