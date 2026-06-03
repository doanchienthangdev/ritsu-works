// Tests for the supabase-analytics env loader (the boot-time firewall).
//
// Phase 1: parseConnString(url) — pooler "<role>.<ref>" | direct "db.<ref>." |
//   other (ref null). loadEnv(env) — gates: missing url (MissingEnv), bad url
//   (MissingEnv), wrong DB role (WrongDbRole), product ref by parsed-ref OR
//   substring (ProductRefInUrl), analytics-ref mismatch (ProductRefInUrl),
//   unknown caller role (InvalidRole); defaults (gps, generated session, ssl off).
// Phase 2: fabricated 20-char refs (no real product ref committed); url-encoded
//   password; cross-param product-vs-analytics precedence; summarizeEnv redaction.
// SECURITY-CRITICAL: a credential that reads product-derived data must never
// resolve to Product — these tests pin that.

import { describe, it, expect } from "vitest";
import {
  loadEnv,
  parseConnString,
  summarizeEnv,
  MissingEnvError,
  WrongDbRoleError,
  ProductRefInUrlError,
  InvalidRoleError,
} from "../../mcp-server-analytics/src/lib/env.ts";

const ANALYTICS = "aaaaaaaaaaaaaaaaaaaa"; // fabricated 20-char analytics ref
const PRODUCT = "pppppppppppppppppppp"; // fabricated 20-char product ref
const POOLER = "aws-1-us-west-1.pooler.supabase.com";
const PWD = "deadbeef";

function poolerUrl(role = "analytics_reader", ref = ANALYTICS, pwd = PWD): string {
  return `postgresql://${role}.${ref}:${pwd}@${POOLER}:5432/postgres?sslmode=require`;
}
function directUrl(role = "analytics_reader", ref = ANALYTICS): string {
  return `postgresql://${role}:${PWD}@db.${ref}.supabase.co:5432/postgres`;
}

describe("parseConnString", () => {
  it("extracts role+ref from a pooler URL (<role>.<ref>)", () => {
    const p = parseConnString(poolerUrl());
    expect(p).toEqual({ dbRole: "analytics_reader", ref: ANALYTICS, host: POOLER });
  });
  it("extracts role+ref from a direct host URL (db.<ref>.supabase.co)", () => {
    const p = parseConnString(directUrl());
    expect(p.dbRole).toBe("analytics_reader");
    expect(p.ref).toBe(ANALYTICS);
    expect(p.host).toBe(`db.${ANALYTICS}.supabase.co`);
  });
  it("returns ref=null for a non-Supabase host", () => {
    const p = parseConnString("postgresql://analytics_reader:pw@my.db.example.com:5432/postgres");
    expect(p.ref).toBeNull();
    expect(p.dbRole).toBe("analytics_reader");
  });
  it("decodes a percent-encoded password without confusing the role", () => {
    const p = parseConnString(`postgresql://analytics_reader.${ANALYTICS}:p%40ss%3Aword@${POOLER}:5432/postgres`);
    expect(p.dbRole).toBe("analytics_reader");
    expect(p.ref).toBe(ANALYTICS);
  });
});

describe("loadEnv", () => {
  describe("missing / malformed", () => {
    it("throws MissingEnvError when ANALYTICS_READER_DB_URL is absent", () => {
      expect(() => loadEnv({})).toThrow(MissingEnvError);
    });
    it("throws MissingEnvError when the URL is unparseable", () => {
      expect(() => loadEnv({ ANALYTICS_READER_DB_URL: "not a url" })).toThrow(MissingEnvError);
    });
  });

  describe("DB role gate", () => {
    it("throws WrongDbRoleError when connecting as postgres", () => {
      expect(() => loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl("postgres") })).toThrow(
        WrongDbRoleError,
      );
    });
    it("throws WrongDbRoleError when connecting as service_role-like name", () => {
      expect(() => loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl("supabase_admin") })).toThrow(
        WrongDbRoleError,
      );
    });
  });

  describe("product-ref firewall (SECURITY)", () => {
    it("blocks when the parsed ref equals PRODUCT_PROJECT_REF", () => {
      expect(() =>
        loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl("analytics_reader", PRODUCT), PRODUCT_PROJECT_REF: PRODUCT }),
      ).toThrow(ProductRefInUrlError);
    });
    it("blocks even if the role name is analytics_reader but the ref is Product", () => {
      // The classic misconfig: right role, wrong project.
      expect(() =>
        loadEnv({ ANALYTICS_READER_DB_URL: directUrl("analytics_reader", PRODUCT), PRODUCT_PROJECT_REF: PRODUCT }),
      ).toThrow(ProductRefInUrlError);
    });
    it("blocks when the product ref appears as a substring (ref unresolved host)", () => {
      const url = `postgresql://analytics_reader:pw@host-${PRODUCT}.example.com:5432/postgres`;
      expect(() => loadEnv({ ANALYTICS_READER_DB_URL: url, PRODUCT_PROJECT_REF: PRODUCT })).toThrow(
        ProductRefInUrlError,
      );
    });
    it("blocks when the resolved ref is neither product NOR the configured analytics ref", () => {
      expect(() =>
        loadEnv({
          ANALYTICS_READER_DB_URL: poolerUrl("analytics_reader", "bbbbbbbbbbbbbbbbbbbb"),
          ANALYTICS_PROJECT_REF: ANALYTICS,
          PRODUCT_PROJECT_REF: PRODUCT,
        }),
      ).toThrow(ProductRefInUrlError);
    });
    it("product check takes precedence over analytics-match check", () => {
      // ref == product AND analytics configured → product error, not a generic mismatch.
      try {
        loadEnv({
          ANALYTICS_READER_DB_URL: poolerUrl("analytics_reader", PRODUCT),
          ANALYTICS_PROJECT_REF: ANALYTICS,
          PRODUCT_PROJECT_REF: PRODUCT,
        });
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ProductRefInUrlError);
        expect((e as Error).message).toContain(PRODUCT);
      }
    });
  });

  describe("caller role", () => {
    it("throws InvalidRoleError for an unknown role", () => {
      expect(() =>
        loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), MCP_CALLER_ROLE: "wizard" }),
      ).toThrow(InvalidRoleError);
    });
    it("defaults caller role to gps when unset", () => {
      const e = loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl() });
      expect(e.callerRole).toBe("gps");
    });
    it("accepts a known caller role", () => {
      const e = loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), MCP_CALLER_ROLE: "customer-lead" });
      expect(e.callerRole).toBe("customer-lead");
    });
  });

  describe("happy path", () => {
    it("loads a valid analytics_reader pooler URL", () => {
      const e = loadEnv({
        ANALYTICS_READER_DB_URL: poolerUrl(),
        ANALYTICS_PROJECT_REF: ANALYTICS,
        PRODUCT_PROJECT_REF: PRODUCT,
        MCP_CALLER_ROLE: "product-orchestrator",
      });
      expect(e.dbRole).toBe("analytics_reader");
      expect(e.projectRef).toBe(ANALYTICS);
      expect(e.host).toBe(POOLER);
      expect(e.callerRole).toBe("product-orchestrator");
      expect(e.sslStrict).toBe(false);
    });
    it("loads a valid direct-host URL (ref from host)", () => {
      const e = loadEnv({ ANALYTICS_READER_DB_URL: directUrl(), PRODUCT_PROJECT_REF: PRODUCT });
      expect(e.projectRef).toBe(ANALYTICS);
    });
    it("passes when product ref is set but the URL is the analytics project", () => {
      expect(() =>
        loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), PRODUCT_PROJECT_REF: PRODUCT }),
      ).not.toThrow();
    });
    it("honors a provided session id", () => {
      const e = loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), MCP_CALLER_SESSION_ID: "sess-42" });
      expect(e.callerSessionId).toBe("sess-42");
    });
    it("generates a session id when unset", () => {
      const e = loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl() });
      expect(e.callerSessionId).toMatch(/^cc-/);
    });
  });

  describe("sslStrict flag", () => {
    it('is true for "1"', () => {
      expect(loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), ANALYTICS_READER_SSL_STRICT: "1" }).sslStrict).toBe(true);
    });
    it('is true for "true"', () => {
      expect(loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), ANALYTICS_READER_SSL_STRICT: "true" }).sslStrict).toBe(true);
    });
    it("is false by default", () => {
      expect(loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl() }).sslStrict).toBe(false);
    });
    it('is false for other values like "yes"', () => {
      expect(loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), ANALYTICS_READER_SSL_STRICT: "yes" }).sslStrict).toBe(false);
    });
  });
});

describe("summarizeEnv", () => {
  it("never includes the password or the raw URL", () => {
    const e = loadEnv({ ANALYTICS_READER_DB_URL: poolerUrl(), MCP_CALLER_ROLE: "founder" });
    const s = summarizeEnv(e);
    expect(s).not.toContain(PWD);
    expect(s).not.toContain("postgresql://");
    expect(s).toContain("db_role=analytics_reader");
    expect(s).toContain(`project_ref=${ANALYTICS}`);
  });
});
