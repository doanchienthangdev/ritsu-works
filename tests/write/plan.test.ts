import { describe, it, expect } from "vitest";
// @ts-ignore
const { buildPlan, renderBrief, sectionBudget } = require("../../scripts/write/plan.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). plan.cjs is the deterministic brief builder that
// ties the libs together (contract test: real registries). buildPlan takes a fixed dateStr so
// it's deterministic. No files are written here (we call buildPlan, not the CLI writePlan).

const OPTS = { dateStr: "2026-06-10" };

describe("sectionBudget", () => {
  it("returns count = body + intro + close, words/section derived", () => {
    const b = sectionBudget(1200);
    expect(b.count).toBeGreaterThanOrEqual(3);
    expect(b.words_per_section).toBeGreaterThan(0);
    expect(b.count * b.words_per_section).toBeGreaterThan(0);
  });
  it("clamps body sections (very long input doesn't explode)", () => {
    expect(sectionBudget(100000).count).toBeLessThanOrEqual(12);
  });
  it("a tiny target still yields >= 3 sections", () => {
    expect(sectionBudget(50).count).toBeGreaterThanOrEqual(3);
  });
});

describe("buildPlan", () => {
  it("resolves type + medium + length + author from the real registries", () => {
    const p = buildPlan(["Why active recall beats rereading", "--type=blog", "--medium=substack", "--author-style=seth-godin", "--length=1200w"], OPTS);
    expect(p.ok).toBe(true);
    expect(p.type.id).toBe("blog");
    expect(p.medium).toBe("substack");
    expect(p.length.words).toBe(1200);
    expect(p.author_style.slug).toBe("seth-godin");
    expect(p.out).toEqual(["default"]);
  });

  it("warns when an author is registered but not yet distilled", () => {
    const p = buildPlan(["x", "--author-style=seth-godin"], OPTS);
    // seth-godin is pending until the distill wave installs it; either way the field resolves
    expect(p.author_style.slug).toBe("seth-godin");
    if (!p.author_style.installed) {
      expect(p.warnings.join(" ")).toMatch(/not yet distilled|distill/);
    }
  });

  it("warns on an unknown author-style", () => {
    const p = buildPlan(["x", "--author-style=nobody-here"], OPTS);
    expect(p.author_style).toBeNull();
    expect(p.warnings.join(" ")).toMatch(/not in author-styles/);
  });

  it("auto enrichment derives image/dataviz from the type's recommends", () => {
    const p = buildPlan(["x", "--type=blog"], OPTS); // blog recommends image:auto, dataviz:auto
    expect(typeof p.enrich.image).toBe("boolean");
    expect(typeof p.enrich.dataviz).toBe("boolean");
  });

  it("explicit --image=off overrides the type recommendation", () => {
    const p = buildPlan(["x", "--type=blog", "--image=off"], OPTS);
    expect(p.enrich.image).toBe(false);
  });

  it("explicit --dataviz=on forces dataviz on a type that doesn't recommend it", () => {
    const p = buildPlan(["x", "--type=email", "--dataviz=on"], OPTS); // email recommends dataviz:false
    expect(p.enrich.dataviz).toBe(true);
  });

  it("unknown medium for a type warns + falls back to default", () => {
    const p = buildPlan(["x", "--type=blog", "--medium=billboard"], OPTS);
    expect(p.warnings.join(" ")).toMatch(/not a known medium/);
  });

  it("a freeform/unknown type still produces a plan (writer infers)", () => {
    const p = buildPlan(["x", "--type=zzz-unknown"], OPTS);
    expect(p.ok).toBe(true);
    expect(p.type.freeform).toBe(true);
    expect(p.warnings.join(" ")).toMatch(/not found in write-types/);
  });

  it("humanize is on by default and reflected in the plan", () => {
    expect(buildPlan(["x"], OPTS).humanize).toBe(true);
    expect(buildPlan(["x", "--humanize=off"], OPTS).humanize).toBe(false);
  });

  it("--out parses multiple formats", () => {
    expect(buildPlan(["x", "--out=md+pdf+docx"], OPTS).out).toEqual(["md", "pdf", "docx"]);
  });

  it("builds an out_dir under .archives/write with the date + slug", () => {
    const p = buildPlan(["Launch the exam feature"], OPTS);
    expect(p.out_dir).toMatch(/^\.archives\/write\/2026-06-10-/);
  });

  it("collects refs", () => {
    const p = buildPlan(["x", "--ref=a.md+b.md", "--ref=https://x.com"], OPTS);
    expect(p.refs).toEqual(["a.md", "b.md", "https://x.com"]);
  });
});

describe("renderBrief", () => {
  it("renders the assignment with voice + structure + humanize gate + output", () => {
    const p = buildPlan(["Test request", "--type=blog", "--author-style=seth-godin", "--length=medium"], OPTS);
    const brief = renderBrief(p);
    expect(brief).toMatch(/# Writing brief/);
    expect(brief).toMatch(/Test request/);
    expect(brief).toMatch(/Seth Godin|seth-godin/);
    expect(brief).toMatch(/Humanize gate/);
    expect(brief).toMatch(/Output/);
  });
  it("falls back to brand voice when no author-style", () => {
    const brief = renderBrief(buildPlan(["x", "--type=blog"], OPTS));
    expect(brief).toMatch(/brand_voice|neutral/);
  });
});

describe("framework selection (auto | explicit | free)", () => {
  it("defaults to AUTO and surfaces ranked candidates for the type", () => {
    const p = buildPlan(["ad for exam prep", "--type=ad"], OPTS);
    expect(p.framework.mode).toBe("auto");
    expect(Array.isArray(p.framework.candidates)).toBe(true);
    expect(p.framework.candidates.length).toBeGreaterThan(0);
    expect(p.framework.candidates.map((c: any) => c.id)).toContain("pas");
  });
  it("--framework=auto is explicitly the auto mode", () => {
    expect(buildPlan(["x", "--type=ad", "--framework=auto"], OPTS).framework.mode).toBe("auto");
  });
  it("an explicit id selects that framework", () => {
    const p = buildPlan(["x", "--type=ad", "--framework=pas"], OPTS);
    expect(p.framework.mode).toBe("explicit");
    expect(p.framework.selected.id).toBe("pas");
    expect(p.framework.selected.structure).toMatch(/Problem/);
  });
  it.each(["none", "free", "off", "no"])("--framework=%s forces free-style", (v) => {
    expect(buildPlan(["x", "--type=essay", `--framework=${v}`], OPTS).framework.mode).toBe("free");
  });
  it("an unknown framework id falls back to auto + warns", () => {
    const p = buildPlan(["x", "--type=ad", "--framework=zzz-nope"], OPTS);
    expect(p.framework.mode).toBe("auto");
    expect(p.warnings.join(" ")).toMatch(/falling back to auto-select/);
  });
  it("AUTO brief tells the writer to decide framework-or-free-style", () => {
    const brief = renderBrief(buildPlan(["a tweet", "--type=social-post"], OPTS));
    expect(brief).toMatch(/Framework: AUTO/);
    expect(brief).toMatch(/Not every piece needs one/);
  });
  it("explicit brief names the formula as the backbone", () => {
    const brief = renderBrief(buildPlan(["x", "--type=ad", "--framework=aida"], OPTS));
    expect(brief).toMatch(/Framework — AIDA/);
  });
});

describe("research + grounding + long-form (v0.4)", () => {
  it("research defaults to auto; --research=deep|off honored; unknown→auto", () => {
    expect(buildPlan(["x", "--type=blog"], OPTS).research).toBe("auto");
    expect(buildPlan(["x", "--research=deep"], OPTS).research).toBe("deep");
    expect(buildPlan(["x", "--research=off"], OPTS).research).toBe("off");
    expect(buildPlan(["x", "--research=turbo"], OPTS).research).toBe("auto");
  });
  it("grounding: default auto; explicit sources; all→3; off→[]", () => {
    expect(buildPlan(["x"], OPTS).grounding).toBe("auto");
    expect(buildPlan(["x", "--grounding=deepask+wiki"], OPTS).grounding).toEqual(["deepask", "wiki"]);
    expect(buildPlan(["x", "--grounding=all"], OPTS).grounding).toEqual(["deepask", "wiki", "brain"]);
    expect(buildPlan(["x", "--grounding=off"], OPTS).grounding).toEqual([]);
  });
  it("long-form auto-detects from the type", () => {
    expect(buildPlan(["x", "--type=novel"], OPTS).longform).toBe(true);
    expect(buildPlan(["x", "--type=research-paper"], OPTS).longform).toBe(true);
    expect(buildPlan(["x", "--type=blog"], OPTS).longform).toBe(false);
  });
  it("--longform=on|off overrides the type default", () => {
    expect(buildPlan(["x", "--type=blog", "--longform=on"], OPTS).longform).toBe(true);
    expect(buildPlan(["x", "--type=novel", "--longform=off"], OPTS).longform).toBe(false);
  });
  it("brief shows the research + grounding section, and long-form pipeline when long-form", () => {
    const lf = renderBrief(buildPlan(["a novel", "--type=novel"], OPTS));
    expect(lf).toMatch(/Research & grounding/);
    expect(lf).toMatch(/Long-form — consistency pipeline/);
    expect(lf).toMatch(/Lock the bible/);
    const blog = renderBrief(buildPlan(["a post", "--type=blog"], OPTS));
    expect(blog).toMatch(/Research & grounding/);
    expect(blog).not.toMatch(/Long-form — consistency pipeline/);
  });
});
