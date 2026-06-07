import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { detectFormat, isUrl } = require('../../scripts/translate/lib/detect.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const params = require('../../scripts/translate/lib/params.cjs');
const { parseArgs, resolveConfig, resolveLang, parseOut, parseSplit } = params;

describe('detectFormat', () => {
  describe('happy path', () => {
    it.each([
      ['book.pdf', 'pdf'], ['deck.pptx', 'pptx'], ['report.docx', 'docx'],
      ['notes.md', 'md'], ['page.html', 'html'], ['raw.txt', 'txt'],
      ['a.MARKDOWN', 'md'], ['a.HTM', 'html'], ['a.Doc', 'docx'], ['a.PPT', 'pptx'],
    ])('detects %s -> %s', (input, want) => {
      expect(detectFormat(input)).toBe(want);
    });
    it('treats http(s) URLs as html', () => {
      expect(detectFormat('https://example.com/post')).toBe('html');
      expect(detectFormat('http://x.io')).toBe('html');
    });
    it('ignores query string and hash when reading extension', () => {
      expect(detectFormat('/a/b/file.pdf?v=2')).toBe('pdf');
      expect(detectFormat('file.docx#section')).toBe('docx');
    });
    it('uses the LAST extension on multi-dot names', () => {
      expect(detectFormat('archive.tar.md')).toBe('md');
    });
  });
  describe('input boundaries', () => {
    it.each([null, undefined, '', '   ', 42, {}, [], true])('returns null for non-usable input %s', (x) => {
      expect(detectFormat(x as any)).toBeNull();
    });
    it('returns null for unknown extension', () => {
      expect(detectFormat('file.xyz')).toBeNull();
      expect(detectFormat('noext')).toBeNull();
    });
    it('does not crash on a bare dotfile', () => {
      expect(detectFormat('.gitignore')).toBeNull();
    });
  });
  it('isUrl detects scheme, not bare paths', () => {
    expect(isUrl('https://a.com')).toBe(true);
    expect(isUrl('/tmp/a.pdf')).toBe(false);
    expect(isUrl(null as any)).toBe(false);
  });
});

describe('resolveLang', () => {
  it('defaults to Vietnamese when empty/null/true', () => {
    for (const x of [null, undefined, '', '  ', true]) {
      expect(resolveLang(x as any).code).toBe('vi');
    }
  });
  it('resolves codes and is case-insensitive', () => {
    expect(resolveLang('EN').code).toBe('en');
    expect(resolveLang('ja').name).toBe('Japanese');
  });
  it('resolves English + Vietnamese aliases', () => {
    expect(resolveLang('vietnamese').code).toBe('vi');
    expect(resolveLang('Tiếng Việt').code).toBe('vi');
    expect(resolveLang('nhật').code).toBe('ja');
    expect(resolveLang('pháp').code).toBe('fr');
  });
  it('passes unknown languages through honestly (flagged)', () => {
    const r = resolveLang('klingon');
    expect(r.unknown).toBe(true);
    expect(r.name).toBe('klingon');
    expect(r.code).toBe('klingon');
  });
  it('marks Arabic rtl', () => {
    expect(resolveLang('ar').rtl).toBe(true);
  });
});

describe('parseOut', () => {
  it('defaults to the source format when no spec', () => {
    expect(parseOut(undefined, 'pdf', [])).toEqual(['pdf']);
    expect(parseOut('', 'docx', [])).toEqual(['docx']);
    expect(parseOut(true, 'md' as any, [])).toEqual(['md']);
  });
  it('falls back to pdf when the source format is not itself an output target (e.g. epub-in)', () => {
    expect(parseOut(undefined, 'epub' as any, [])).toEqual(['pdf']);
  });
  it('html source with no --out defaults to pdf (cannot re-emit a webpage)', () => {
    expect(parseOut(undefined, 'html', [])).toEqual(['pdf']);
  });
  it('parses + separated specs and dedupes preserving order', () => {
    expect(parseOut('pdf+epub', 'pdf', [])).toEqual(['pdf', 'epub']);
    expect(parseOut('epub+pdf+epub', 'pdf', [])).toEqual(['epub', 'pdf']);
  });
  it('normalizes markdown alias and leading dots and case', () => {
    expect(parseOut('.PDF+Markdown', 'pdf', [])).toEqual(['pdf', 'md']);
  });
  it('warns and drops unknown formats, falling back if all unknown', () => {
    const w: string[] = [];
    expect(parseOut('pdf+xyz', 'pdf', w)).toEqual(['pdf']);
    expect(w.some((m) => m.includes('xyz'))).toBe(true);
    const w2: string[] = [];
    expect(parseOut('xyz+abc', 'docx', w2)).toEqual(['docx']); // fallback to source
    expect(w2.length).toBe(2);
  });
});

describe('parseSplit', () => {
  it('defaults to auto', () => {
    for (const x of [null, undefined, '', true]) expect(parseSplit(x as any, [])).toBe('auto');
  });
  it('accepts keyword modes case-insensitively', () => {
    expect(parseSplit('TOC', [])).toBe('toc');
    expect(parseSplit('none', [])).toBe('none');
    expect(parseSplit('heading', [])).toBe('heading');
  });
  it('parses count=N within range', () => {
    expect(parseSplit('count=12', [])).toEqual({ count: 12 });
  });
  it('rejects out-of-range / malformed counts with a warning -> auto', () => {
    const w: string[] = [];
    expect(parseSplit('count=1', w)).toBe('auto');
    expect(parseSplit('count=999', w)).toBe('auto');
    expect(parseSplit('weird', w)).toBe('auto');
    expect(w.length).toBe(3);
  });
});

describe('parseArgs', () => {
  it('separates the first positional as src from --flags', () => {
    const r = parseArgs(['book.pdf', '--to=vi', '--out=pdf+epub']);
    expect(r.src).toBe('book.pdf');
    expect(r.flags.to).toBe('vi');
    expect(r.flags.out).toBe('pdf+epub');
  });
  it('treats bare --flag as boolean true', () => {
    expect(parseArgs(['x.md', '--dry-run']).flags['dry-run']).toBe(true);
  });
  it('keeps = inside values (urls)', () => {
    const r = parseArgs(['--src=https://a.com/x?y=1', '--to=en']);
    expect(r.flags.src).toBe('https://a.com/x?y=1');
  });
  it('warns on extra positionals, never throws', () => {
    const r = parseArgs(['a.pdf', 'b.pdf']);
    expect(r.warnings.length).toBe(1);
  });
  it('handles empty/garbage argv without throwing', () => {
    expect(parseArgs([] as any).src).toBeNull();
    expect(parseArgs(undefined as any).src).toBeNull();
  });
});

describe('resolveConfig', () => {
  const base = { src: 'book.pdf', srcFormat: 'pdf', cwd: '/work' };

  describe('happy path + defaults', () => {
    it('applies all documented defaults', () => {
      const c = resolveConfig({ ...base, flags: {} });
      expect(c.to.code).toBe('vi');
      expect(c.out).toEqual(['pdf']);
      expect(c.style).toBe('claude');
      expect(c.mode).toBe('auto');
      expect(c.split).toBe('auto');
      expect(c.workflow).toBe('auto');
      expect(c.dryRun).toBe(false);
      expect(c.outDir).toBe('/work'); // dirname of /work/book.pdf
      expect(c.name).toBe('book');
      expect(c.slug).toBe('book');
    });
    it('honors the canonical example --out=pdf+epub', () => {
      const c = resolveConfig({ ...base, flags: { out: 'pdf+epub' } });
      expect(c.out).toEqual(['pdf', 'epub']);
    });
  });

  describe('language + style + mode', () => {
    it('resolves --to aliases', () => {
      expect(resolveConfig({ ...base, flags: { to: 'english' } }).to.code).toBe('en');
    });
    it('empty --style falls back to claude', () => {
      expect(resolveConfig({ ...base, flags: { style: '' } }).style).toBe('claude');
      expect(resolveConfig({ ...base, flags: { style: true } }).style).toBe('claude');
    });
    it('keeps a named style', () => {
      expect(resolveConfig({ ...base, flags: { style: 'ritsu' } }).style).toBe('ritsu');
    });
    it('invalid --mode warns and falls back to auto', () => {
      const c = resolveConfig({ ...base, flags: { mode: 'nonsense' } });
      expect(c.mode).toBe('auto');
      expect(c.warnings.some((w: string) => w.includes('mode'))).toBe(true);
    });
  });

  describe('workflow flag triplet', () => {
    it('--no-workflow disables', () => {
      expect(resolveConfig({ ...base, flags: { 'no-workflow': true } }).workflow).toBe(false);
    });
    it('--workflow enables', () => {
      expect(resolveConfig({ ...base, flags: { workflow: true } }).workflow).toBe(true);
      expect(resolveConfig({ ...base, flags: { workflow: 'false' } }).workflow).toBe(false);
    });
  });

  describe('out-dir + name + url', () => {
    it('--out-dir overrides, resolved against cwd', () => {
      expect(resolveConfig({ ...base, flags: { 'out-dir': 'sub' } }).outDir).toBe('/work/sub');
    });
    it('url source: name derived from last path segment, outDir = cwd', () => {
      const c = resolveConfig({ src: 'https://a.com/great-post', srcFormat: 'html', cwd: '/work', flags: {} });
      expect(c.isUrl).toBe(true);
      expect(c.name).toBe('great-post');
      expect(c.out).toEqual(['pdf']);
      expect(c.outDir).toBe('/work');
    });
    it('--from-format overrides detection', () => {
      const c = resolveConfig({ src: 'weirdfile', srcFormat: null as any, flags: { 'from-format': 'md' } });
      expect(c.srcFormat).toBe('md');
    });
  });

  describe('max-cost-usd', () => {
    it('accepts a positive number', () => {
      expect(resolveConfig({ ...base, flags: { 'max-cost-usd': '3.5' } }).maxCostUsd).toBe(3.5);
    });
    it('rejects garbage with a warning and keeps the default', () => {
      const c = resolveConfig({ ...base, flags: { 'max-cost-usd': 'free' } });
      expect(c.maxCostUsd).toBe(8.0);
      expect(c.warnings.some((w: string) => w.includes('max-cost'))).toBe(true);
    });
  });

  describe('unknown flags + warnings', () => {
    it('warns on unknown flags but does not throw', () => {
      const c = resolveConfig({ ...base, flags: { wat: '1', to: 'vi' } });
      expect(c.warnings.some((w: string) => w.includes('--wat'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws when no source is given', () => {
      expect(() => resolveConfig({ src: null as any, srcFormat: 'pdf', flags: {} }))
        .toThrow(/no source/);
    });
    it('throws when format cannot be detected and not forced', () => {
      expect(() => resolveConfig({ src: 'mystery', srcFormat: null as any, flags: {} }))
        .toThrow(/could not detect source format/);
    });
    it('throws on an unsupported source format', () => {
      expect(() => resolveConfig({ src: 'a.xls', srcFormat: 'xls' as any, flags: {} }))
        .toThrow(/unsupported source format/);
    });
  });
});
