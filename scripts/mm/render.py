#!/usr/bin/env python3
"""render.py — render a Mental-Model chapter (markdown) into a premium Claude-styled
book: PDF (WeasyPrint) + EPUB (ebooklib). Capability `/mm`.

  python render.py <chapter.md> --out=pdf+epub --out-dir=DIR [--name=slug]
                   [--fonts=DIR] [--repo-root=DIR]

Reuses scripts/translate/design.py for the Claude design tokens + bundled
Vietnamese-complete Source Serif 4 / Inter fonts, but builds its OWN book framing
appropriate for an ORIGINAL work (cover, epigraph, one-page map, callout boxes,
field card, glossary, sources) — no translation ("Bản dịch") chrome.

Input markdown contract:
  - YAML-ish frontmatter (--- ... ---): title, subtitle, series, model, voice_credit,
    lang (default vi), epigraph, epigraph_source, slug.
  - Body: standard Markdown + fenced custom boxes:
        ::: key          ::: pitfall      ::: exercise
        ::: map          ::: fieldcard    ::: quote      ::: figure
        ...inner markdown...
        :::
  - Top-level `## ` headings = sections (drive EPUB nav).
"""
import sys, os, re, json, html as H
from pathlib import Path

HERE = Path(__file__).resolve().parent

def _repo_root(cli):
    if cli:
        return Path(cli)
    cwd = Path.cwd()
    s = str(cwd)
    marker = "/.claude/worktrees/"
    if marker in s:
        return Path(s.split(marker)[0])
    # walk up for .git
    for p in [cwd, *cwd.parents]:
        if (p / ".git").exists():
            return p
    return cwd

def opts(argv):
    o = {}
    for a in argv:
        if a.startswith("--"):
            k, _, v = a[2:].partition("=")
            o[k] = v if v != "" else True
    return o

# ---------------------------------------------------------------- frontmatter
def split_front(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    meta = {}
    if m:
        block = m.group(1)
        for line in block.splitlines():
            mm = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
            if mm:
                k, v = mm.group(1), mm.group(2).strip()
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                meta[k] = v
        text = text[m.end():]
    return meta, text

# ---------------------------------------------------------------- box labels
BOX_LABELS = {
    "map": "BẢN ĐỒ MỘT TRANG", "key": "CỐT LÕI", "pitfall": "CẠM BẪY",
    "exercise": "THỬ NGAY", "fieldcard": "SỔ TAY", "figure": None, "quote": None,
}

def md_inline(text):
    import markdown
    return markdown.markdown(text, extensions=["extra", "sane_lists", "smarty", "tables"])

def transform_boxes_and_md(body):
    """Split body into box / plain segments, markdown-convert each, return HTML."""
    pat = re.compile(r"(?ms)^:::[ \t]*(\w+)[ \t]*\n(.*?)\n:::[ \t]*$")
    out = []
    pos = 0
    for m in pat.finditer(body):
        # plain text before the box
        plain = body[pos:m.start()]
        if plain.strip():
            out.append(md_inline(plain))
        btype = m.group(1).lower()
        inner_html = md_inline(m.group(2))
        label = BOX_LABELS.get(btype)
        if btype == "quote":
            out.append(f'<div class="mm-pull">{inner_html}</div>')
        elif btype == "figure":
            out.append(f'<div class="mm-figure">{inner_html}</div>')
        else:
            lab = f'<div class="mm-label">{H.escape(label)}</div>' if label else ""
            out.append(f'<div class="mm-box mm-{btype}">{lab}{inner_html}</div>')
        pos = m.end()
    tail = body[pos:]
    if tail.strip():
        out.append(md_inline(tail))
    return "\n".join(out)

# ---------------------------------------------------------------- EPUB section split
def split_sections(body):
    """Split body on top-level '## ' into (title, md) for EPUB nav. The lead-in before
    the first '## ' becomes the opening section."""
    parts = re.split(r"(?m)^##[ \t]+(.+)$", body)
    secs = []
    lead = parts[0]
    if lead.strip():
        secs.append(("Mở đầu", lead))
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        md = parts[i + 1] if i + 1 < len(parts) else ""
        secs.append((title, "## " + title + "\n" + md))
    return secs

# ---------------------------------------------------------------- CSS
def faces(fonts_dir):
    def f(fam, fn, w, st="normal"):
        p = Path(fonts_dir) / fn
        if not p.exists():
            return ""
        return (f"@font-face{{font-family:'{fam}';src:url('file://{p}');"
                f"font-weight:{w};font-style:{st};}}")
    return "\n".join(filter(None, [
        f("Source Serif 4", "SourceSerif4-Regular.ttf", 400),
        f("Source Serif 4", "SourceSerif4-SemiBold.ttf", 600),
        f("Source Serif 4", "SourceSerif4-Bold.ttf", 700),
        f("Source Serif 4", "SourceSerif4-Italic.ttf", 400, "italic"),
        f("Source Serif 4", "SourceSerif4-SemiBoldItalic.ttf", 600, "italic"),
        f("Inter", "Inter-Regular.ttf", 400),
        f("Inter", "Inter-Medium.ttf", 500),
        f("Inter", "Inter-SemiBold.ttf", 600),
        f("Inter", "Inter-Bold.ttf", 700),
    ]))

def book_css(t, fonts_dir):
    return faces(fonts_dir) + f"""
@page {{ size: 6in 9in; margin: 0.92in 0.82in 0.96in 0.82in; background:{t['background']};
  @bottom-center {{ content: counter(page); font-family:Inter; font-weight:600;
    font-size:8.5pt; color:{t['primary']}; letter-spacing:.2em; }} }}
@page plain {{ background:{t['background']}; @bottom-center{{content:none}} }}
@page :first {{ @bottom-center{{content:none}} }}
html {{ -weasy-hyphens:none; }}
body {{ font-family:'Source Serif 4',Georgia,serif; font-size:11pt; line-height:1.66;
  color:{t['foreground']}; hyphens:none; text-align:justify; }}

/* cover */
.cover {{ page:plain; break-after:page; height:7.0in; display:flex; flex-direction:column;
  align-items:center; text-align:center; }}
.cover-frame {{ border:1.5px solid {t['primary']}; padding:40pt 26pt 30pt; height:6.7in; width:100%;
  display:flex; flex-direction:column; align-items:center; box-sizing:border-box; }}
.cover-series {{ font-family:Inter; font-weight:700; font-size:9.5pt; letter-spacing:.42em;
  text-transform:uppercase; color:{t['primaryDeep']}; margin-top:8pt; }}
.cover-series-rule {{ width:42pt; height:1.5px; background:{t['primary']}; margin:14pt 0 0; }}
.cover-title {{ font-family:'Source Serif 4'; font-weight:700; font-size:40pt; line-height:1.04;
  color:{t['foreground']}; margin:auto 0 0; letter-spacing:-.015em; }}
.cover-sub {{ font-style:italic; font-size:13.5pt; color:{t['mutedForeground']}; margin:18pt 14pt 0;
  line-height:1.45; }}
.cover-mark {{ color:{t['primary']}; font-size:20pt; margin:auto 0 0; }}
.cover-credit {{ font-family:Inter; font-weight:500; font-size:10.5pt; color:{t['foreground']};
  margin:14pt 0 0; }}
.cover-foot {{ font-family:Inter; font-size:8.4pt; color:{t['mutedForeground']}; letter-spacing:.16em;
  text-transform:uppercase; margin:10pt 0 4pt; }}

/* epigraph */
.epigraph {{ page:plain; break-after:page; padding-top:2.6in; text-align:center; }}
.epi-text {{ font-family:'Source Serif 4'; font-style:italic; font-size:15pt; line-height:1.55;
  color:{t['foreground']}; margin:0 18pt; }}
.epi-src {{ font-family:Inter; font-size:9.5pt; letter-spacing:.04em; color:{t['mutedForeground']};
  margin-top:18pt; }}

/* body */
.body {{ }}
.body > p:first-of-type::first-letter, p.dropcap::first-letter {{
  font-family:'Source Serif 4'; font-weight:700; color:{t['primaryDeep']}; font-size:2.7em;
  line-height:1; padding-right:2pt; }}
p {{ margin:0; text-indent:1.3em; }}
h2 + p, h3 + p, .mm-box + p, blockquote + p, .mm-pull + p, p.noindent, .body > p:first-of-type {{ text-indent:0; }}
h2 {{ font-family:Inter; font-weight:700; font-size:10pt; letter-spacing:.16em; text-transform:uppercase;
  color:{t['primaryDeep']}; margin:2.1em 0 .2em; text-align:left; break-after:avoid; }}
h2::before {{ content:"✦"; color:{t['primary']}; font-size:11pt; display:block; margin-bottom:.5em;
  letter-spacing:0; }}
h3 {{ font-family:'Source Serif 4'; font-weight:700; font-size:13.5pt; color:{t['foreground']};
  margin:1.5em 0 .35em; break-after:avoid; }}
strong,b {{ font-weight:700; }} em,i {{ font-style:italic; }}
ul,ol {{ margin:.6em 0 .6em 1.25em; padding:0; }} li {{ margin:.3em 0; text-indent:0; }}
blockquote {{ font-family:'Source Serif 4'; font-style:italic; font-size:1.12em; line-height:1.5;
  color:{t['mutedForeground']}; border-left:2.5px solid {t['primary']}; margin:1.3em 0;
  padding:.15em 0 .15em 1.05em; }}
blockquote p {{ text-indent:0; margin:.2em 0; }}
a {{ color:{t['primaryDeep']}; text-decoration:none; }}
sup {{ font-family:Inter; font-weight:600; font-size:.62em; color:{t['primary']}; vertical-align:super; line-height:0; }}
hr {{ border:none; text-align:center; margin:1.6em 0; }}
hr::after {{ content:"✦ ✦ ✦"; color:{t['primary']}; letter-spacing:.5em; font-size:9pt; }}
table {{ width:100%; border-collapse:collapse; margin:1.1em 0; font-size:9.6pt; }}
th,td {{ border:1px solid {t['rule']}; padding:5pt 7pt; text-align:left; vertical-align:top; }}
th {{ background:{t['manilla']}; font-family:Inter; font-weight:600; }}
code {{ font-family:'SF Mono',Menlo,monospace; background:{t['muted']}; padding:1px 4px; border-radius:3px; font-size:.88em; }}
pre {{ background:{t['muted']}; border:1px solid {t['rule']}; border-radius:6px; padding:9pt 11pt;
  font-family:'SF Mono',Menlo,monospace; font-size:8.6pt; line-height:1.45; white-space:pre; overflow-wrap:normal; }}
pre code {{ background:none; padding:0; }}

/* callout boxes */
.mm-box {{ background:{t['paper']}; border:1px solid {t['rule']}; border-left:3px solid {t['primary']};
  border-radius:4px; padding:11pt 14pt 9pt; margin:1.4em 0; break-inside:avoid; }}
.mm-label {{ font-family:Inter; font-weight:700; font-size:8.2pt; letter-spacing:.18em;
  text-transform:uppercase; color:{t['primaryDeep']}; margin-bottom:6pt; }}
.mm-box p {{ text-indent:0; margin:.35em 0; font-size:10.2pt; }}
.mm-box ul,.mm-box ol {{ margin:.3em 0 .3em 1.15em; }} .mm-box li {{ font-size:10.2pt; }}
.mm-key {{ background:{t['manilla']}; border-left-color:{t['primaryDeep']}; }}
.mm-pitfall {{ border-left-color:#A6452B; background:#FBF3EF; }}
.mm-exercise {{ border-left-color:{t['primary']}; background:{t['paper']}; }}
.mm-map {{ break-before:page; break-after:page; border:1.5px solid {t['primary']}; border-left-width:1.5px;
  padding:18pt 20pt; margin:0; background:{t['paper']}; }}
.mm-map .mm-label {{ font-size:9pt; }}
.mm-fieldcard {{ break-before:page; border:1.5px solid {t['primary']}; border-left-width:1.5px;
  padding:16pt 18pt; background:{t['paper']}; }}
.mm-figure {{ background:{t['paper']}; border:1px solid {t['rule']}; border-radius:4px; padding:12pt 14pt;
  margin:1.4em 0; break-inside:avoid; }}
.mm-figure table {{ margin:.3em 0; }}
.mm-pull {{ font-family:'Source Serif 4'; font-style:italic; font-weight:600; font-size:16pt;
  line-height:1.42; color:{t['primaryDeep']}; text-align:center; margin:1.6em 8%; break-inside:avoid; }}
.mm-pull p {{ text-indent:0; margin:0; }}

/* back matter cue */
h2.backmatter {{ break-before:page; }}
"""

# ---------------------------------------------------------------- PDF
def render_pdf(meta, body_html, sections, out_path, tokens, fonts_dir):
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    title = meta.get("title", "—"); sub = meta.get("subtitle", "")
    series = meta.get("series", "MÔ HÌNH TƯ DUY")
    credit = meta.get("voice_credit", "")
    epigraph = meta.get("epigraph", ""); epi_src = meta.get("epigraph_source", "")
    cover = (f'<section class="cover"><div class="cover-frame">'
             f'<div class="cover-series">{H.escape(series)}</div>'
             f'<div class="cover-series-rule"></div>'
             f'<div class="cover-title">{H.escape(title)}</div>'
             + (f'<div class="cover-sub">{H.escape(sub)}</div>' if sub else '')
             + f'<div class="cover-mark">✦</div>'
             + (f'<div class="cover-credit">{H.escape(credit)}</div>' if credit else '')
             + f'<div class="cover-foot">Ritsu · Mental Models</div>'
             + '</div></section>')
    epi = ""
    if epigraph:
        epi = (f'<section class="epigraph"><div class="epi-text">{H.escape(epigraph)}</div>'
               + (f'<div class="epi-src">— {H.escape(epi_src)}</div>' if epi_src else '')
               + '</section>')
    html = ("<!doctype html><html lang='%s'><head><meta charset='utf-8'></head><body>%s</body></html>"
            % (meta.get("lang", "vi"), cover + epi + f'<section class="body">{body_html}</section>'))
    fc = FontConfiguration()
    HTML(string=html, base_url=os.getcwd()).write_pdf(
        out_path, stylesheets=[CSS(string=book_css(tokens, fonts_dir), font_config=fc)], font_config=fc)

# ---------------------------------------------------------------- cover png (epub)
def cover_png(meta, tokens, fonts_dir, dest):
    from PIL import Image, ImageDraw, ImageFont
    W, Hh = 1200, 1800
    img = Image.new("RGB", (W, Hh), tokens["background"]); d = ImageDraw.Draw(img)
    d.rectangle([64, 84, W - 64, Hh - 84], outline=tokens["primary"], width=4)
    def ft(fn, sz):
        for cand in [Path(fonts_dir) / fn, Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf")]:
            if Path(cand).exists():
                try: return ImageFont.truetype(str(cand), sz)
                except Exception: pass
        return ImageFont.load_default()
    serif = lambda s: ft("SourceSerif4-Bold.ttf", s)
    serI = lambda s: ft("SourceSerif4-Italic.ttf", s)
    sans = lambda s: ft("Inter-SemiBold.ttf", s)
    title = meta.get("title", "—")
    series = meta.get("series", "MÔ HÌNH TƯ DUY")
    # series kicker
    ks = series.upper()
    wk = d.textlength(ks, font=sans(34)); d.text(((W - wk) / 2, 230), ks, font=sans(34), fill=tokens["primaryDeep"])
    d.line([(W/2-40, 300), (W/2+40, 300)], fill=tokens["primary"], width=3)
    def wrap(text, font, maxw):
        words, lines, cur = text.split(), [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if d.textlength(t, font=font) <= maxw: cur = t
            else:
                if cur: lines.append(cur)
                cur = w
        if cur: lines.append(cur)
        return lines
    y = 560
    for ln in wrap(title, serif(100), W - 280):
        wl = d.textlength(ln, font=serif(100)); d.text(((W - wl) / 2, y), ln, font=serif(100), fill=tokens["foreground"]); y += 124
    sub = meta.get("subtitle", "")
    if sub:
        for ln in wrap(sub, serI(40), W - 360)[:3]:
            wl = d.textlength(ln, font=serI(40)); d.text(((W - wl) / 2, y + 24), ln, font=serI(40), fill=tokens["mutedForeground"]); y += 56
    d.text((W/2 - 16, Hh/2 + 220), "✦", font=serif(54), fill=tokens["primary"])
    credit = meta.get("voice_credit", "")
    if credit:
        wc = d.textlength(credit, font=sans(34)); d.text(((W - wc) / 2, Hh - 320), credit, font=sans(34), fill=tokens["foreground"])
    foot = "Ritsu · Mental Models"
    wf = d.textlength(foot, font=sans(28)); d.text(((W - wf) / 2, Hh - 250), foot, font=sans(28), fill=tokens["mutedForeground"])
    img.save(dest, "PNG")

def epub_css(t):
    f = ""
    for fam, fn, w, st in [
        ("Source Serif 4", "SourceSerif4-Regular.ttf", 400, "normal"),
        ("Source Serif 4", "SourceSerif4-SemiBold.ttf", 600, "normal"),
        ("Source Serif 4", "SourceSerif4-Bold.ttf", 700, "normal"),
        ("Source Serif 4", "SourceSerif4-Italic.ttf", 400, "italic"),
        ("Inter", "Inter-Regular.ttf", 400, "normal"),
        ("Inter", "Inter-SemiBold.ttf", 600, "normal"),
        ("Inter", "Inter-Bold.ttf", 700, "normal"),
    ]:
        f += f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:{st};src:url('../fonts/{fn}');}}\n"
    return f + f"""
body{{font-family:'Source Serif 4',Georgia,serif;color:{t['foreground']};background:{t['background']};
  line-height:1.66;margin:0 5%;text-align:justify;hyphens:none;}}
h1.ct{{font-family:'Source Serif 4',serif;font-weight:700;font-size:1.7em;line-height:1.16;text-align:left;margin:1.2em 0 .5em;color:{t['foreground']};}}
.orn{{color:{t['primary']};text-align:center;font-size:1.2em;margin:1em 0;}}
h2{{font-family:Inter,sans-serif;font-weight:700;font-size:.8em;letter-spacing:.15em;text-transform:uppercase;color:{t['primaryDeep']};margin:2em 0 .5em;}}
h3{{font-family:'Source Serif 4',serif;font-weight:700;font-size:1.15em;margin:1.3em 0 .3em;}}
p{{margin:0;text-indent:1.3em;}} h2 + p,h3 + p,blockquote + p,.mm-box + p,.mm-pull + p,p.first{{text-indent:0;}}
blockquote{{font-style:italic;font-size:1.1em;color:{t['mutedForeground']};border-left:2.5px solid {t['primary']};margin:1.2em 0;padding:.1em 0 .1em 1em;}}
blockquote p{{text-indent:0;margin:.2em 0;}}
em,i{{font-style:italic;}} strong,b{{font-weight:700;}}
ul,ol{{margin:.5em 0 .5em 1.3em;}} li{{margin:.3em 0;text-indent:0;}}
table{{width:100%;border-collapse:collapse;margin:1em 0;font-size:.9em;}} th,td{{border:1px solid {t['rule']};padding:.35em .55em;text-align:left;vertical-align:top;}} th{{background:{t['manilla']};font-family:Inter;font-weight:600;}}
sup{{font-family:Inter,sans-serif;font-weight:600;font-size:.62em;color:{t['primary']};}}
a{{color:{t['primaryDeep']};text-decoration:none;}}
hr{{border:none;text-align:center;}} hr:after{{content:"✦ ✦ ✦";color:{t['primary']};letter-spacing:.4em;font-size:.8em;}}
.mm-box{{background:{t['paper']};border:1px solid {t['rule']};border-left:3px solid {t['primary']};border-radius:4px;padding:.7em 1em;margin:1.3em 0;}}
.mm-label{{font-family:Inter,sans-serif;font-weight:700;font-size:.68em;letter-spacing:.16em;text-transform:uppercase;color:{t['primaryDeep']};margin-bottom:.4em;}}
.mm-box p{{text-indent:0;margin:.3em 0;}}
.mm-key{{background:{t['manilla']};border-left-color:{t['primaryDeep']};}}
.mm-pitfall{{border-left-color:#A6452B;background:#FBF3EF;}}
.mm-map,.mm-fieldcard{{border:1.5px solid {t['primary']};padding:1em 1.1em;background:{t['paper']};}}
.mm-figure{{background:{t['paper']};border:1px solid {t['rule']};border-radius:4px;padding:.7em 1em;margin:1.3em 0;}}
.mm-pull{{font-style:italic;font-weight:600;font-size:1.4em;line-height:1.4;color:{t['primaryDeep']};text-align:center;margin:1.4em 6%;}}
.mm-pull p{{text-indent:0;margin:0;}}
"""

def render_epub(meta, sections, out_path, tokens, fonts_dir, workdir):
    from ebooklib import epub
    title = meta.get("title", "—")
    book = epub.EpubBook()
    book.set_identifier("ritsu-mm-" + re.sub(r"\W+", "-", title.lower())[:48])
    book.set_title(title); book.set_language(meta.get("lang", "vi"))
    if meta.get("voice_credit"): book.add_author(meta["voice_credit"])
    book.add_metadata("DC", "publisher", "Ritsu · Mental Models")
    # cover
    cov = Path(workdir) / "cover.png"
    try:
        cover_png(meta, tokens, fonts_dir, cov)
        book.set_cover("cover.png", cov.read_bytes())
    except Exception:
        pass
    css = epub_css(tokens)
    style = epub.EpubItem(uid="style", file_name="style/book.css", media_type="text/css", content=css)
    book.add_item(style)
    for fn in ["SourceSerif4-Regular.ttf", "SourceSerif4-SemiBold.ttf", "SourceSerif4-Bold.ttf",
               "SourceSerif4-Italic.ttf", "Inter-Regular.ttf", "Inter-SemiBold.ttf", "Inter-Bold.ttf"]:
        p = Path(fonts_dir) / fn
        if p.exists():
            book.add_item(epub.EpubItem(uid="f_" + fn, file_name="fonts/" + fn,
                                        content=p.read_bytes(), media_type="font/ttf"))
    def page(uid, fn, ttl, inner):
        it = epub.EpubHtml(uid=uid, file_name=fn, title=ttl, lang=meta.get("lang", "vi"))
        it.add_item(style)
        it.content = ("<html xmlns='http://www.w3.org/1999/xhtml'><head><title>" + H.escape(ttl) +
                      "</title><link rel='stylesheet' href='../style/book.css'/></head><body>" + inner + "</body></html>")
        book.add_item(it); return it
    # title page
    sub = meta.get("subtitle", ""); credit = meta.get("voice_credit", "")
    epi = meta.get("epigraph", ""); epi_src = meta.get("epigraph_source", "")
    tp_inner = (f"<div style='text-align:center;padding-top:14%'>"
                f"<div style='font-family:Inter;font-weight:700;letter-spacing:.3em;color:{tokens['primaryDeep']};font-size:.8em'>{H.escape(meta.get('series','MÔ HÌNH TƯ DUY').upper())}</div>"
                f"<h1 class='ct' style='text-align:center;font-size:2.1em;margin:.6em 4%'>{H.escape(title)}</h1>"
                + (f"<p style='font-style:italic;color:{tokens['mutedForeground']};text-indent:0'>{H.escape(sub)}</p>" if sub else "")
                + f"<div class='orn'>✦</div>"
                + (f"<p style='font-family:Inter;font-weight:600;text-indent:0'>{H.escape(credit)}</p>" if credit else "")
                + "</div>"
                + (f"<div style='margin-top:3em;text-align:center'><p style='font-style:italic;text-indent:0'>{H.escape(epi)}</p>"
                   + (f"<p style='font-family:Inter;font-size:.8em;color:{tokens['mutedForeground']};text-indent:0'>— {H.escape(epi_src)}</p>" if epi_src else "")
                   + "</div>" if epi else ""))
    tp = page("tp", "text/000-title.xhtml", title, tp_inner)
    spine = ["nav", tp]; toc = []
    for i, (stitle, smd) in enumerate(sections, 1):
        inner_html = transform_boxes_and_md(re.sub(r"(?m)^##[ \t]+.+$", "", smd, count=1).strip())
        head = f"<div class='orn'>✦</div><h1 class='ct'>{H.escape(stitle)}</h1>"
        it = page(f"s{i}", f"text/{i:03d}-sec.xhtml", stitle, head + inner_html)
        spine.append(it); toc.append(epub.Link(f"text/{i:03d}-sec.xhtml", stitle, f"s{i}"))
    book.toc = tuple(toc); book.add_item(epub.EpubNcx()); book.add_item(epub.EpubNav()); book.spine = spine
    epub.write_epub(out_path, book)

# ---------------------------------------------------------------- main
def main():
    argv = sys.argv[1:]
    src = next((a for a in argv if not a.startswith("--")), None)
    o = opts(argv)
    repo_root = _repo_root(o.get("repo-root"))
    fonts_dir = o.get("fonts") or str(repo_root / "runtime" / "translate" / "fonts")
    out_dir = Path(o.get("out-dir") or os.path.dirname(os.path.abspath(src)))
    out_dir.mkdir(parents=True, exist_ok=True)
    name = o.get("name") or "mental-model"
    formats = (o.get("out") or "pdf+epub").split("+")

    # design tokens (Claude)
    sys.path.insert(0, str(repo_root / "scripts" / "translate"))
    try:
        import design
        tokens, _ = design.load_tokens("claude", str(repo_root))
    except Exception:
        tokens = {"primary": "#CC785C", "primaryDeep": "#B24A2E", "manilla": "#F2ECE1",
                  "background": "#FAF9F5", "paper": "#FFFFFF", "foreground": "#1A1915",
                  "muted": "#F1ECE2", "mutedForeground": "#6B665C", "rule": "#E4DDCF"}

    raw = Path(src).read_text(encoding="utf-8")
    meta, body = split_front(raw)
    # strip a leading H1 (rendered as cover/title) from body
    body = re.sub(r"^\s*#\s+.*\n", "", body.lstrip(), count=1)

    results = {"name": name, "files": [], "warnings": []}
    if "pdf" in formats:
        body_html = transform_boxes_and_md(body)
        out = str(out_dir / f"{name}.pdf")
        render_pdf(meta, body_html, None, out, tokens, fonts_dir)
        results["files"].append(out)
    if "epub" in formats:
        sections = split_sections(body)
        out = str(out_dir / f"{name}.epub")
        render_epub(meta, sections, out, tokens, fonts_dir, str(out_dir))
        results["files"].append(out)
    if "html" in formats:
        body_html = transform_boxes_and_md(body)
        html = ("<!doctype html><html lang='%s'><head><meta charset='utf-8'><style>%s</style></head><body><section class='body'>%s</section></body></html>"
                % (meta.get("lang", "vi"), book_css(tokens, fonts_dir), body_html))
        out = str(out_dir / f"{name}.html")
        Path(out).write_text(html, encoding="utf-8")
        results["files"].append(out)
    print(json.dumps(results, ensure_ascii=False))

if __name__ == "__main__":
    main()
