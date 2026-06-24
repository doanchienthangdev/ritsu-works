import { describe, it, expect, beforeEach } from "vitest";
// vitest supports named imports from CommonJS module.exports.
import { Reporter, SYMBOLS, COLORS } from "../../scripts/local-install/lib/report.cjs";

// The literal ANSI escape character used by _color.
const ESC = "\x1b";

/**
 * Helper: build a Reporter with an injected write sink that pushes to `out`,
 * color explicitly off (clean assertions) unless overridden.
 */
function makeReporter(opts: Record<string, unknown> = {}) {
  const out: string[] = [];
  const write = (s: string) => {
    out.push(s);
  };
  const reporter = new Reporter({ write, color: false, ...opts });
  return { reporter, out, write };
}

describe("report.cjs exports", () => {
  it("exports Reporter as a constructable class", () => {
    expect(typeof Reporter).toBe("function");
    const r = new Reporter({ write: () => {}, color: false });
    expect(r).toBeInstanceOf(Reporter);
  });

  it("exports the SYMBOLS table with the expected glyphs", () => {
    expect(SYMBOLS).toStrictEqual({
      ok: "✓",
      fail: "✗",
      warn: "⚠",
      skip: "⊘",
      run: "▶",
      dot: "·",
      info: "ℹ",
    });
  });

  it("exports the COLORS table with the expected ANSI codes", () => {
    expect(COLORS).toStrictEqual({
      green: "32",
      red: "31",
      yellow: "33",
      gray: "90",
      cyan: "36",
      bold: "1",
    });
  });
});

describe("Reporter constructor", () => {
  it("defaults json to false when not provided", () => {
    const { reporter } = makeReporter();
    expect(reporter.json).toBe(false);
  });

  it("sets json to true only for strict boolean true", () => {
    const { reporter } = makeReporter({ json: true });
    expect(reporter.json).toBe(true);
  });

  it("treats a truthy non-true json value as false (=== true check)", () => {
    // json: "yes" is truthy but not === true → json stays false
    const { reporter } = makeReporter({ json: "yes" as unknown as boolean });
    expect(reporter.json).toBe(false);
  });

  it("respects explicit color:false override", () => {
    const { reporter } = makeReporter({ color: false });
    expect(reporter.useColor).toBe(false);
  });

  it("respects explicit color:true override", () => {
    const { reporter } = makeReporter({ color: true });
    expect(reporter.useColor).toBe(true);
  });

  it("starts with an empty captured lines buffer", () => {
    const { reporter } = makeReporter();
    expect(reporter.captured()).toBe("");
  });

  it("uses a default write sink (process.stdout) when none provided", () => {
    // We don't call write here; just assert the field is a function so the
    // default branch (opts.write || stdout) is exercised without real IO.
    const r = new Reporter({ color: false });
    expect(typeof r.write).toBe("function");
  });

  it("accepts an empty options object (all defaults)", () => {
    const r = new Reporter();
    expect(r.json).toBe(false);
    expect(typeof r.write).toBe("function");
    expect(r.captured()).toBe("");
  });
});

describe("Reporter color handling (_color via emitted output)", () => {
  it("emits NO ANSI escape characters when color:false", () => {
    const { reporter, out } = makeReporter({ color: false });
    reporter.ok("hello");
    expect(out.join("")).not.toContain(ESC);
  });

  it("emits ANSI escape characters when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.ok("hello");
    expect(out.join("")).toContain(ESC);
  });

  it("wraps text with the green code + reset when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.ok("done");
    // green code 32, reset 0 wrap the ok symbol
    expect(out.join("")).toContain(`${ESC}[32m${SYMBOLS.ok}${ESC}[0m`);
  });

  it("leaves text unwrapped (no codes) when color:false", () => {
    const { reporter, out } = makeReporter({ color: false });
    reporter.ok("done");
    expect(out.join("")).toBe(`  ${SYMBOLS.ok} done\n`);
  });
});

describe("Reporter json suppression", () => {
  it("does NOT call write when json:true", () => {
    const out: string[] = [];
    const reporter = new Reporter({
      write: (s: string) => out.push(s),
      color: false,
      json: true,
    });
    reporter.ok("suppressed");
    reporter.fail("also suppressed");
    expect(out).toStrictEqual([]);
  });

  it("still captures the lines when json:true (suppressed write, still captured)", () => {
    const reporter = new Reporter({ write: () => {}, color: false, json: true });
    reporter.ok("a");
    reporter.fail("b");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.ok} a\n  ${SYMBOLS.fail} b`.replace(/\n/, "\n"));
  });

  it("captured() returns joined lines independent of write when json:true", () => {
    const reporter = new Reporter({ write: () => {}, color: false, json: true });
    reporter.plain("one");
    reporter.plain("two");
    expect(reporter.captured()).toBe("one\ntwo");
  });

  it("calls write for every emitted line when json:false", () => {
    const { reporter, out } = makeReporter({ json: false });
    reporter.plain("x");
    reporter.plain("y");
    expect(out).toStrictEqual(["x\n", "y\n"]);
  });
});

describe("Reporter.captured()", () => {
  it("equals the joined written lines (minus trailing newlines) when not json", () => {
    const { reporter, out } = makeReporter();
    reporter.plain("alpha");
    reporter.plain("beta");
    reporter.plain("gamma");
    // out has each line with a trailing newline; captured() joins without trailing newline
    const fromWrite = out.join("").replace(/\n$/, "");
    expect(reporter.captured()).toBe(fromWrite);
    expect(reporter.captured()).toBe("alpha\nbeta\ngamma");
  });

  it("returns empty string before anything is emitted", () => {
    const { reporter } = makeReporter();
    expect(reporter.captured()).toBe("");
  });

  it("joins a single line with no newline added", () => {
    const { reporter } = makeReporter();
    reporter.plain("solo");
    expect(reporter.captured()).toBe("solo");
  });

  it("preserves empty lines in the joined output", () => {
    const { reporter } = makeReporter();
    reporter.plain("");
    reporter.plain("after-blank");
    expect(reporter.captured()).toBe("\nafter-blank");
  });
});

describe("Reporter.banner", () => {
  it("emits a leading blank line then the padded banner", () => {
    const { reporter } = makeReporter();
    reporter.banner("Setup");
    const lines = reporter.captured().split("\n");
    expect(lines[0]).toBe("");
    expect(lines[1].startsWith("══ Setup ")).toBe(true);
  });

  it("pads the banner line to length 64 with no color", () => {
    const { reporter } = makeReporter();
    reporter.banner("X");
    const lines = reporter.captured().split("\n");
    expect(lines[1].length).toBe(64);
  });

  it("emits the banner with ANSI codes when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.banner("Colored");
    expect(out.join("")).toContain(ESC);
  });
});

describe("Reporter.header", () => {
  it("emits a leading blank line then the dashed header", () => {
    const { reporter } = makeReporter();
    reporter.header("Section");
    expect(reporter.captured()).toBe("\n── Section");
  });

  it("emits no escapes when color:false", () => {
    const { reporter, out } = makeReporter();
    reporter.header("Section");
    expect(out.join("")).not.toContain(ESC);
  });
});

describe("Reporter.startStep", () => {
  it("prints the bracket counter i/total with the run symbol", () => {
    const { reporter } = makeReporter();
    reporter.startStep(3, 9, "compiling");
    expect(reporter.captured()).toBe(`[3/9] ${SYMBOLS.run} compiling`);
  });

  it("prints counter 1/1 for a single-step run", () => {
    const { reporter } = makeReporter();
    reporter.startStep(1, 1, "only step");
    expect(reporter.captured()).toBe(`[1/1] ${SYMBOLS.run} only step`);
  });

  it("renders the bracket and label without escapes when color:false", () => {
    const { reporter, out } = makeReporter();
    reporter.startStep(2, 5, "x");
    expect(out.join("")).not.toContain(ESC);
  });

  it("includes the gray counter code when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.startStep(2, 5, "x");
    expect(out.join("")).toContain(`${ESC}[90m[2/5]${ESC}[0m`);
  });

  it("handles a label that is an empty string", () => {
    const { reporter } = makeReporter();
    reporter.startStep(4, 4, "");
    expect(reporter.captured()).toBe(`[4/4] ${SYMBOLS.run} `);
  });
});

describe("Reporter.endStep status symbols", () => {
  it("uses the ok symbol for status ok", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 3, "ok", "label");
    expect(reporter.captured()).toBe(`[1/3] ${SYMBOLS.ok} label`);
  });

  it("uses the warn symbol for status warn", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 3, "warn", "label");
    expect(reporter.captured()).toBe(`[1/3] ${SYMBOLS.warn} label`);
  });

  it("uses the skip symbol for status skip", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 3, "skip", "label");
    expect(reporter.captured()).toBe(`[1/3] ${SYMBOLS.skip} label`);
  });

  it("uses the fail symbol for status fail", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 3, "fail", "label");
    expect(reporter.captured()).toBe(`[1/3] ${SYMBOLS.fail} label`);
  });

  it("falls back to the fail symbol for an unknown status", () => {
    const { reporter } = makeReporter();
    reporter.endStep(2, 4, "weird-status", "label");
    expect(reporter.captured()).toBe(`[2/4] ${SYMBOLS.fail} label`);
  });

  it("falls back to the fail symbol when status is undefined", () => {
    const { reporter } = makeReporter();
    reporter.endStep(2, 4, undefined as unknown as string, "label");
    expect(reporter.captured()).toBe(`[2/4] ${SYMBOLS.fail} label`);
  });

  it("ok/warn/skip/fail produce four different symbols", () => {
    const symbols = new Set<string>();
    for (const status of ["ok", "warn", "skip", "fail"]) {
      const { reporter } = makeReporter();
      reporter.endStep(1, 1, status, "l");
      // the symbol is the second whitespace-delimited token after the counter
      const captured = reporter.captured();
      const sym = captured.split(" ")[1];
      symbols.add(sym);
    }
    expect(symbols.size).toBe(4);
    expect(symbols).toStrictEqual(
      new Set([SYMBOLS.ok, SYMBOLS.warn, SYMBOLS.skip, SYMBOLS.fail])
    );
  });
});

describe("Reporter.endStep detail tail", () => {
  it("appends the detail when provided", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 2, "ok", "label", "took 5ms");
    expect(reporter.captured()).toBe(`[1/2] ${SYMBOLS.ok} label  took 5ms`);
  });

  it("omits the tail entirely when detail is undefined", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 2, "ok", "label", undefined);
    expect(reporter.captured()).toBe(`[1/2] ${SYMBOLS.ok} label`);
  });

  it("omits the tail when detail is an empty string (falsy)", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 2, "ok", "label", "");
    expect(reporter.captured()).toBe(`[1/2] ${SYMBOLS.ok} label`);
  });

  it("omits the tail when detail is null (falsy)", () => {
    const { reporter } = makeReporter();
    reporter.endStep(1, 2, "ok", "label", null as unknown as string);
    expect(reporter.captured()).toBe(`[1/2] ${SYMBOLS.ok} label`);
  });

  it("wraps the detail tail in gray code when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.endStep(1, 2, "ok", "label", "info");
    expect(out.join("")).toContain(`${ESC}[90m  info${ESC}[0m`);
  });
});

describe("Reporter simple level methods", () => {
  it("ok prints two-space indent + ok symbol + text", () => {
    const { reporter } = makeReporter();
    reporter.ok("good");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.ok} good`);
  });

  it("fail prints two-space indent + fail symbol + text", () => {
    const { reporter } = makeReporter();
    reporter.fail("bad");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.fail} bad`);
  });

  it("warn prints two-space indent + warn symbol + text", () => {
    const { reporter } = makeReporter();
    reporter.warn("careful");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.warn} careful`);
  });

  it("skip prints two-space indent + skip symbol + text", () => {
    const { reporter } = makeReporter();
    reporter.skip("skipped");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.skip} skipped`);
  });

  it("info prints two-space indent + dot symbol + text", () => {
    const { reporter } = makeReporter();
    reporter.info("note");
    expect(reporter.captured()).toBe(`  ${SYMBOLS.dot} note`);
  });

  it("note prints four-space indent + text (no symbol)", () => {
    const { reporter } = makeReporter();
    reporter.note("indented");
    expect(reporter.captured()).toBe(`    indented`);
  });

  it("plain prints the text verbatim with no indent or symbol", () => {
    const { reporter } = makeReporter();
    reporter.plain("raw line");
    expect(reporter.captured()).toBe("raw line");
  });

  it("ok/fail/warn/skip/info use four distinct symbols (info reuses dot)", () => {
    const seen: string[] = [];
    for (const method of ["ok", "fail", "warn", "skip", "info"] as const) {
      const { reporter } = makeReporter();
      (reporter as any)[method]("t");
      // symbol is the first token after the two-space indent
      const sym = reporter.captured().trim().split(" ")[0];
      seen.push(sym);
    }
    expect(seen).toStrictEqual([
      SYMBOLS.ok,
      SYMBOLS.fail,
      SYMBOLS.warn,
      SYMBOLS.skip,
      SYMBOLS.dot,
    ]);
  });
});

describe("Reporter.verdict", () => {
  it("emits a blank line, a separator, then the verdict text for ok", () => {
    const { reporter } = makeReporter();
    reporter.verdict("ok", "All good");
    const lines = reporter.captured().split("\n");
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("─".repeat(64));
    expect(lines[2]).toBe(`${SYMBOLS.ok} All good`);
  });

  it("uses the warn symbol for kind warn", () => {
    const { reporter } = makeReporter();
    reporter.verdict("warn", "Some warnings");
    const lines = reporter.captured().split("\n");
    expect(lines[2]).toBe(`${SYMBOLS.warn} Some warnings`);
  });

  it("uses the fail symbol for kind fail", () => {
    const { reporter } = makeReporter();
    reporter.verdict("fail", "Failed");
    const lines = reporter.captured().split("\n");
    expect(lines[2]).toBe(`${SYMBOLS.fail} Failed`);
  });

  it("falls back to the fail symbol for an unknown kind", () => {
    const { reporter } = makeReporter();
    reporter.verdict("mystery", "Weird");
    const lines = reporter.captured().split("\n");
    expect(lines[2]).toBe(`${SYMBOLS.fail} Weird`);
  });

  it("emits a separator of exactly 64 dashes", () => {
    const { reporter } = makeReporter();
    reporter.verdict("ok", "x");
    const lines = reporter.captured().split("\n");
    expect(lines[1].length).toBe(64);
  });

  it("produces ANSI codes around the verdict text when color:true", () => {
    const { reporter, out } = makeReporter({ color: true });
    reporter.verdict("ok", "Win");
    // green-wrapped, bold-wrapped text contains escapes
    expect(out.join("")).toContain(ESC);
    expect(out.join("")).toContain("Win");
  });

  it("ok/warn/fail verdicts emit three distinct symbols", () => {
    const symbols = new Set<string>();
    for (const kind of ["ok", "warn", "fail"]) {
      const { reporter } = makeReporter();
      reporter.verdict(kind, "msg");
      const lines = reporter.captured().split("\n");
      symbols.add(lines[2].split(" ")[0]);
    }
    expect(symbols).toStrictEqual(
      new Set([SYMBOLS.ok, SYMBOLS.warn, SYMBOLS.fail])
    );
  });
});

describe("Reporter integration sequences", () => {
  let reporter: any;
  let out: string[];

  beforeEach(() => {
    const made = makeReporter();
    reporter = made.reporter;
    out = made.out;
  });

  it("captures a full step lifecycle in order", () => {
    reporter.banner("Install");
    reporter.startStep(1, 2, "deps");
    reporter.endStep(1, 2, "ok", "deps", "1.2s");
    reporter.startStep(2, 2, "build");
    reporter.endStep(2, 2, "fail", "build");
    reporter.verdict("fail", "Install failed");

    const captured = reporter.captured();
    expect(captured).toContain(`[1/2] ${SYMBOLS.run} deps`);
    expect(captured).toContain(`[1/2] ${SYMBOLS.ok} deps  1.2s`);
    expect(captured).toContain(`[2/2] ${SYMBOLS.run} build`);
    expect(captured).toContain(`[2/2] ${SYMBOLS.fail} build`);
    expect(captured).toContain(`${SYMBOLS.fail} Install failed`);
  });

  it("captured() and write content agree (minus trailing newline) for mixed output", () => {
    reporter.header("Phase");
    reporter.ok("step a");
    reporter.warn("step b");
    const fromWrite = out.join("").replace(/\n$/, "");
    expect(reporter.captured()).toBe(fromWrite);
  });

  it("two independent reporters do not share state", () => {
    const a = makeReporter();
    const b = makeReporter();
    a.reporter.plain("only-a");
    expect(a.reporter.captured()).toBe("only-a");
    expect(b.reporter.captured()).toBe("");
  });
});
