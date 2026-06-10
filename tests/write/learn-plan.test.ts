import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const learn = require("../../scripts/write/learn/plan.cjs");
const { deriveBookSlug, classifyCoverage, buildBookEntry, enumerateBooks, plan, STAGE_REL } = learn;

// All-Edge-Cases-Test (global CLAUDE.md). plan.cjs = the deterministic book-stager
// for /write learn. deriveBookSlug is the parameter-rich pure function (map every
// branch: prefix-strip, separator-split, last-name extraction, budget truncation);
// classifyCoverage is the scanned-PDF guard; enumerateBooks + plan touch fs (temp
// fixtures, --no-extract so no pdftotext dependency in CI).

describe("deriveBookSlug — happy path", () => {
  it("extracts title + author last name from the canonical ' — ' pattern", () => {
    expect(deriveBookSlug("On Writing Well — William Zinsser.pdf")).toBe("on-writing-well-zinsser");
  });
  it("strips a leading 'N - ' order prefix", () => {
    expect(deriveBookSlug("5 - Made to Stick — Chip Heath & Dan Heath.pdf")).toBe("made-to-stick-heath");
  });
  it("strips a leading 'N. - ' order prefix", () => {
    expect(deriveBookSlug("1. - On Writing Well — William Zinsser.pdf")).toBe("on-writing-well-zinsser");
  });
  it("handles the double-hyphen ' -- ' separator (Schwartz filename shape)", () => {
    const s = deriveBookSlug("2 - Breakthrough Advertising -- Eugene M_ Schwartz, Eugene Schwartz.pdf");
    expect(s.startsWith("breakthrough-advertising")).toBe(true);
    expect(s.endsWith("schwartz")).toBe(true);
  });
  it("uses the FIRST author chunk before a comma list", () => {
    expect(deriveBookSlug("9 - Scientific Advertising — Claude C. Hopkins.pdf")).toBe("scientific-advertising-hopkins");
  });
});

describe("deriveBookSlug — input boundaries", () => {
  it("returns 'book' for empty string", () => {
    expect(deriveBookSlug("")).toBe("book");
  });
  it("returns 'book' for null", () => {
    expect(deriveBookSlug(null as any)).toBe("book");
  });
  it("returns 'book' for undefined", () => {
    expect(deriveBookSlug(undefined as any)).toBe("book");
  });
  it("returns 'book' for a non-string (number)", () => {
    expect(deriveBookSlug(123 as any)).toBe("book");
  });
  it("handles a filename with no extension", () => {
    expect(deriveBookSlug("Save the Cat — Blake Snyder")).toBe("save-the-cat-snyder");
  });
  it("handles a title with NO author separator (no last name appended)", () => {
    expect(deriveBookSlug("Story Substance and Structure.pdf")).toBe("story-substance-and-structure");
  });
  it("handles a bare number-only filename gracefully", () => {
    expect(deriveBookSlug("12.pdf")).toBe("book");
  });
  it("collapses punctuation and double spaces", () => {
    expect(deriveBookSlug("The   Elements,  of  Style!!! — Strunk.pdf")).toBe("the-elements-of-style-strunk");
  });
  it("strips combining diacritics from accented titles/authors", () => {
    expect(deriveBookSlug("Café Society — José Müller.pdf")).toMatch(/^cafe-society/);
  });
  it("truncates an extremely long title at a dash boundary within budget", () => {
    const long = "A".repeat(20) + " " + "B".repeat(20) + " " + "C".repeat(20) + " — Smith.pdf";
    const s = deriveBookSlug(long, 30);
    expect(s.length).toBeLessThanOrEqual(30);
    expect(s.endsWith("-smith")).toBe(true);
    expect(s.startsWith("-")).toBe(false);
    expect(s.endsWith("-")).toBe(false);
  });
  it("never returns leading/trailing dashes", () => {
    expect(deriveBookSlug("   ---  Weird   ---  .pdf")).not.toMatch(/^-|-$/);
  });
});

describe("deriveBookSlug — cross-parameter & idempotence", () => {
  it("is idempotent in spirit: slugging a slug returns the slug", () => {
    const once = deriveBookSlug("On Writing Well — William Zinsser.pdf");
    expect(deriveBookSlug(once + ".pdf")).toBe(once);
  });
  it("does NOT double-append the last name when the title already ends with it", () => {
    // 'Ogilvy on Advertising — David Ogilvy' → must not become 'ogilvy-on-advertising-ogilvy-ogilvy'
    const s = deriveBookSlug("Ogilvy on Advertising — David Ogilvy.pdf");
    expect(s).toBe("ogilvy-on-advertising-ogilvy");
    expect(s.match(/ogilvy/g)?.length).toBe(2);
  });
  it("respects a custom maxLen", () => {
    const s = deriveBookSlug("They Say I Say The Moves That Matter in Academic Writing — Graff.pdf", 25);
    expect(s.length).toBeLessThanOrEqual(25);
  });
});

describe("classifyCoverage", () => {
  it("flags near-zero text as low (scanned PDF)", () => {
    expect(classifyCoverage(0, 300)).toBe("low");
    expect(classifyCoverage(4 * 1024, 300)).toBe("low");
  });
  it("flags thin text (< 0.4KB/page) as partial", () => {
    expect(classifyCoverage(30 * 1024, 300)).toBe("partial"); // 0.1 KB/page
  });
  it("treats healthy text as full", () => {
    expect(classifyCoverage(500 * 1024, 300)).toBe("full"); // ~1.7 KB/page
  });
  it("is full when pages unknown (0) but text is substantial", () => {
    expect(classifyCoverage(500 * 1024, 0)).toBe("full");
  });
  it("boundary: exactly 5KB is not low", () => {
    expect(classifyCoverage(5 * 1024, 0)).toBe("full");
  });
  it("boundary: exactly 0.4KB/page is not partial", () => {
    expect(classifyCoverage(120 * 1024, 300)).toBe("full"); // 0.4 KB/page exactly
  });
});

describe("buildBookEntry — shape", () => {
  it("returns the documented manifest shape with derived fields", () => {
    const e = buildBookEntry("/x/Foo — Bar.pdf", "foo-bar", { pages: 100, textBytes: 200 * 1024, title: "Foo" });
    expect(e).toMatchObject({
      slug: "foo-bar",
      file: "Foo — Bar.pdf",
      title: "Foo",
      pages: 100,
      text_bytes: 200 * 1024,
      text_kb: 200,
      coverage: "full",
    });
    expect(e.staged_path).toBe(path.join(STAGE_REL, "foo-bar", "text.txt"));
  });
  it("defaults missing facts to zero/null", () => {
    const e = buildBookEntry("/x/Y.pdf", "y", {});
    expect(e.text_bytes).toBe(0);
    expect(e.text_kb).toBe(0);
    expect(e.coverage).toBe("low");
    expect(e.title).toBeNull();
  });
});

describe("enumerateBooks + plan — fs (temp fixtures, --no-extract)", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "learn-test-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("enumerates only .pdf files, skipping dotfiles and non-pdf", () => {
    fs.writeFileSync(path.join(dir, "1 - A — X.pdf"), "");
    fs.writeFileSync(path.join(dir, "2 - B — Y.pdf"), "");
    fs.writeFileSync(path.join(dir, ".DS_Store"), "");
    fs.writeFileSync(path.join(dir, "notes.txt"), "");
    const found = enumerateBooks(dir);
    expect(found.length).toBe(2);
    expect(found.every((f: string) => f.endsWith(".pdf"))).toBe(true);
  });

  it("sorts a directory by leading number (1,2,…,10) not lexically", () => {
    fs.writeFileSync(path.join(dir, "10 - Ten — Z.pdf"), "");
    fs.writeFileSync(path.join(dir, "2 - Two — Y.pdf"), "");
    fs.writeFileSync(path.join(dir, "1 - One — X.pdf"), "");
    const found = enumerateBooks(dir).map((f: string) => path.basename(f));
    expect(found[0]).toMatch(/^1 /);
    expect(found[1]).toMatch(/^2 /);
    expect(found[2]).toMatch(/^10 /);
  });

  it("accepts a single .pdf file as src", () => {
    const f = path.join(dir, "Solo — Author.pdf");
    fs.writeFileSync(f, "");
    expect(enumerateBooks(f)).toEqual([f]);
  });

  it("plan: returns ok=false for a missing src", () => {
    const r = plan(path.join(dir, "nope"), { noExtract: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/);
  });

  it("plan: returns ok=false when a folder has no PDFs", () => {
    fs.writeFileSync(path.join(dir, "readme.md"), "");
    const r = plan(dir, { noExtract: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no PDF/);
  });

  it("plan: de-collides duplicate slugs deterministically (-2)", () => {
    // two files that slugify to the same base
    fs.writeFileSync(path.join(dir, "1 - Influence — Cialdini.pdf"), "");
    fs.writeFileSync(path.join(dir, "2 - Influence — Cialdini.pdf"), "");
    const r = plan(dir, { noExtract: true });
    expect(r.ok).toBe(true);
    const slugs = r.books.map((b: any) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length); // all unique
    expect(slugs.some((s: string) => s.endsWith("-2"))).toBe(true);
  });

  it("plan: --books filter restricts to the named slug", () => {
    fs.writeFileSync(path.join(dir, "1 - Alpha — One.pdf"), "");
    fs.writeFileSync(path.join(dir, "2 - Beta — Two.pdf"), "");
    const r = plan(dir, { noExtract: true, books: ["beta-two"] });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
    expect(r.books[0].slug).toBe("beta-two");
  });

  it("plan: --books filter that matches nothing returns ok=false with the available slugs", () => {
    fs.writeFileSync(path.join(dir, "1 - Alpha — One.pdf"), "");
    const r = plan(dir, { noExtract: true, books: ["does-not-exist"] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/matched none/);
  });

  it("plan: --no-extract yields a manifest with staged_rel + per-book staged_path", () => {
    fs.writeFileSync(path.join(dir, "1 - Alpha — One.pdf"), "");
    const r = plan(dir, { noExtract: true });
    expect(r.ok).toBe(true);
    expect(r.staged_rel).toBe(STAGE_REL);
    expect(r.books[0].staged_path).toBe(path.join(STAGE_REL, "alpha-one", "text.txt"));
  });
});
