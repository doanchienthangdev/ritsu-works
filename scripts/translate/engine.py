#!/usr/bin/env python3
"""engine.py — ingest + structure + split + assemble + plan + brief for /translate.
Subcommands:
  plan     <workdir>   read workdir/config.json -> ingest src, detect mode, split into
                       translatable units, write brief.md + plan.json + meta.json
  assemble <workdir>   read translated units_<lang>/ -> book_blocks.json (for render.py)
Multi-format ingest: pdf, docx, pptx, html/url, md, txt. Structure-aware (book / doc /
slides). Books auto-split into chapters; long chapters split at section boundaries.
"""
import sys, os, re, json, html as _html, collections, math
from pathlib import Path

CAP = 3500  # max source words per translation unit (keeps each parallel agent world-class)

# ----------------------------------------------------------------------------- utils
def slugify(s, n=48):
    s = re.sub(r"[^\w\s-]", "", (s or "").lower(), flags=re.U)
    s = re.sub(r"[\s_-]+", "-", s).strip("-")
    return (s[:n] or "untitled")

def wc(s): return len(re.findall(r"\w+", s, re.U))

def dehyph(lines):
    out = ""
    for t in lines:
        if out.endswith("-") and re.search(r"[^\W\d_]-$", out, re.U) and re.match(r"^[a-zà-ỹ]", t, re.I):
            out = out[:-1] + t.lstrip()
        else:
            out = (out + " " + t).strip() if out else t
    return re.sub(r"[ \t]+", " ", out).strip()

# ----------------------------------------------------------------------------- PDF
def ingest_pdf(path):
    import fitz
    doc = fitz.open(path)
    meta = {"title": (doc.metadata or {}).get("title") or "", "author": (doc.metadata or {}).get("author") or "",
            "format": "pdf", "n": doc.page_count}
    toc = doc.get_toc() or []
    # body font size = modal size weighted by char count
    sizes = collections.Counter()
    for p in doc:
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if s["text"].strip():
                        sizes[round(s["size"], 1)] += len(s["text"].strip())
    body = sizes.most_common(1)[0][0] if sizes else 10.0
    # repeating header/footer lines (same short text near top/bottom on many pages)
    edge = collections.Counter()
    for p in doc:
        h = p.rect.height
        for b in p.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                y = l["bbox"][1]
                txt = "".join(s["text"] for s in l["spans"]).strip()
                if txt and (y < h * 0.09 or y > h * 0.91) and len(txt) < 70:
                    edge[re.sub(r"\d+", "#", txt)] += 1
    strip = {k for k, v in edge.items() if v >= max(3, doc.page_count * 0.25)}

    # chapter start pages from TOC level-1
    toc_starts = {e[2] - 1: e[1] for e in toc if e[0] <= 1} if toc else {}

    out = []
    for pno, p in enumerate(doc):
        if pno in toc_starts:
            out.append(f"\n# {toc_starts[pno].strip()}\n")
        blocks = [b for b in p.get_text("dict")["blocks"] if "lines" in b]
        blocks.sort(key=lambda b: (round(b["bbox"][1] / 4), b["bbox"][0]))
        for b in blocks:
            infos = []
            for l in b["lines"]:
                spans = l["spans"]
                real = [s for s in spans if s["text"].strip()]
                if not real:
                    continue
                txt = ""
                for s in spans:
                    tx = s["text"]
                    if (s["flags"] & 1) and tx.strip().isdigit():
                        txt += f"<sup>{tx.strip()}</sup>"
                    else:
                        txt += tx
                dom = max(real, key=lambda s: len(s["text"]))
                infos.append({"t": txt, "raw": "".join(s["text"] for s in spans).strip(),
                              "sz": dom["size"], "bold": bool(dom["flags"] & 16)})
            infos = [i for i in infos if i["raw"] and re.sub(r"\d+", "#", i["raw"]) not in strip
                     and not re.fullmatch(r"\d{1,4}", i["raw"])]
            if not infos:
                continue
            mx = max(i["sz"] for i in infos)
            bold = all(i["bold"] for i in infos)
            text = dehyph([i["t"] for i in infos])
            short = len(i_raw := " ".join(i["raw"] for i in infos)) < 70
            if mx >= body * 1.7 and short and pno not in toc_starts:
                out.append(f"\n# {text}\n")
            elif mx >= body * 1.28 and short:
                out.append(f"\n## {text}\n")
            elif bold and short and mx >= body * 0.95:
                out.append(f"\n## {text}\n")
            else:
                out.append(text + "\n")
    md = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"
    n_h1 = len(re.findall(r"(?m)^# ", md))
    meta["is_book_hint"] = bool(len(toc) >= 3 or doc.page_count >= 40 or n_h1 >= 4)
    if not meta["title"]:
        m = re.search(r"(?m)^# (.+)$", md)
        meta["title"] = (m.group(1).strip() if m else Path(path).stem)
    return meta, md

# ----------------------------------------------------------------------------- DOCX
def ingest_docx(path):
    import docx
    d = docx.Document(path)
    meta = {"title": (d.core_properties.title or ""), "author": (d.core_properties.author or ""),
            "format": "docx", "n": len(d.paragraphs)}
    def runs_md(p):
        s = ""
        for r in p.runs:
            t = r.text
            if not t:
                continue
            if r.bold and r.italic: t = f"***{t}***"
            elif r.bold: t = f"**{t}**"
            elif r.italic: t = f"*{t}*"
            s += t
        return s.strip() or p.text.strip()
    out = []
    for p in d.paragraphs:
        st = (p.style.name or "").lower()
        txt = runs_md(p)
        if not txt:
            out.append("")
            continue
        if st.startswith("title"): out.append(f"# {txt}")
        elif st.startswith("heading 1"): out.append(f"# {txt}")
        elif st.startswith("heading 2"): out.append(f"## {txt}")
        elif st.startswith("heading"): out.append(f"### {txt}")
        elif "quote" in st: out.append(f"> {txt}")
        elif "list" in st or st.startswith("bullet"): out.append(f"- {txt}")
        else: out.append(txt)
    md = re.sub(r"\n{3,}", "\n\n", "\n\n".join(out)).strip() + "\n"
    n_h1 = len(re.findall(r"(?m)^# ", md))
    meta["is_book_hint"] = bool(n_h1 >= 4 or wc(md) >= 7000)
    if not meta["title"]:
        m = re.search(r"(?m)^#+ (.+)$", md); meta["title"] = (m.group(1).strip() if m else Path(path).stem)
    return meta, md

# ----------------------------------------------------------------------------- PPTX
def ingest_pptx(path):
    from pptx import Presentation
    prs = Presentation(path)
    meta = {"title": "", "author": "", "format": "pptx", "n": len(prs.slides)}
    out = []
    for i, slide in enumerate(prs.slides, 1):
        title = ""
        try:
            if slide.shapes.title and slide.shapes.title.text.strip():
                title = slide.shapes.title.text.strip()
        except Exception:
            pass
        out.append(f"\n## Slide {i}" + (f" — {title}" if title else ""))
        for sh in slide.shapes:
            if not sh.has_text_frame:
                continue
            if title and sh == slide.shapes.title:
                continue
            for para in sh.text_frame.paragraphs:
                t = "".join(r.text for r in para.runs).strip() or para.text.strip()
                if t:
                    out.append(("- " if para.level or len(para.runs) else "") + t if t.startswith(("•", "-")) is False else t)
        if i == 1 and title:
            meta["title"] = title
    md = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"
    meta["is_book_hint"] = False
    meta["is_slides"] = True
    if not meta["title"]:
        meta["title"] = Path(path).stem
    return meta, md

# ----------------------------------------------------------------------------- HTML / URL
def ingest_html(src, is_url):
    from bs4 import BeautifulSoup
    if is_url:
        import urllib.request
        req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0 (translate-bot)"})
        with urllib.request.urlopen(req, timeout=45) as r:
            raw = r.read().decode("utf-8", "replace")
    else:
        raw = Path(src).read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, "html.parser")
    title = (soup.title.string.strip() if soup.title and soup.title.string else "")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "noscript"]):
        tag.decompose()
    main = soup.find("article") or soup.find("main") or soup.body or soup
    out = []
    for el in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "blockquote", "pre"]):
        t = el.get_text(" ", strip=True)
        if not t:
            continue
        nm = el.name
        if nm == "h1": out.append(f"\n# {t}\n")
        elif nm == "h2": out.append(f"\n## {t}\n")
        elif nm in ("h3", "h4"): out.append(f"\n### {t}\n")
        elif nm == "li": out.append(f"- {t}")
        elif nm == "blockquote": out.append(f"> {t}")
        else: out.append(t + "\n")
    md = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"
    if not title:
        m = re.search(r"(?m)^# (.+)$", md); title = m.group(1).strip() if m else "Webpage"
    meta = {"title": title, "author": "", "format": "html", "n": wc(md),
            "is_book_hint": len(re.findall(r"(?m)^# ", md)) >= 4}
    return meta, md

# ----------------------------------------------------------------------------- MD / TXT
def ingest_md(path):
    md = Path(path).read_text(encoding="utf-8", errors="replace")
    m = re.search(r"(?m)^#\s+(.+)$", md)
    meta = {"title": (m.group(1).strip() if m else Path(path).stem), "author": "",
            "format": "md", "n": wc(md),
            "is_book_hint": len(re.findall(r"(?m)^# ", md)) >= 4 or wc(md) >= 8000}
    return meta, md.strip() + "\n"

def ingest_txt(path):
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    paras = [p.strip().replace("\n", " ") for p in re.split(r"\n\s*\n", raw) if p.strip()]
    md = "\n\n".join(paras)
    meta = {"title": Path(path).stem, "author": "", "format": "txt", "n": wc(md),
            "is_book_hint": wc(md) >= 8000}
    return meta, md + "\n"

def ingest(cfg):
    fmt, src = cfg["srcFormat"], cfg["src"]
    if fmt == "pdf": return ingest_pdf(src)
    if fmt == "docx": return ingest_docx(src)
    if fmt == "pptx": return ingest_pptx(src)
    if fmt == "html": return ingest_html(src, cfg["isUrl"])
    if fmt == "md": return ingest_md(src)
    if fmt == "txt": return ingest_txt(src)
    raise SystemExit(f"unsupported source format: {fmt}")

# ----------------------------------------------------------------------------- split
def split_units(md, meta, mode):
    """Return list of units [{id,title,is_first,part,md,words}]."""
    lines = md.splitlines()
    # find H1 boundaries (chapters). If none, the whole doc is one chapter.
    h1 = [i for i, l in enumerate(lines) if l.startswith("# ")]
    chapters = []
    if mode in ("book",) and len(h1) >= 2:
        bounds = h1 + [len(lines)]
        for k in range(len(h1)):
            seg = lines[bounds[k]:bounds[k + 1]]
            title = seg[0][2:].strip()
            chapters.append((title, "\n".join(seg).strip()))
    else:
        # doc / slides / book-without-H1: one chapter = whole doc (title from meta)
        title = meta["title"]
        body = md if md.lstrip().startswith("# ") else f"# {title}\n\n{md}"
        chapters.append((title, body.strip()))

    units = []
    for ci, (title, cmd) in enumerate(chapters, 1):
        words = wc(cmd)
        nparts = max(1, math.ceil(words / CAP))
        clines = cmd.splitlines()
        if nparts == 1:
            units.append({"num": f"{ci:02d}", "title": title, "is_first": True, "part": "",
                          "md": cmd, "words": words})
            continue
        sec = [i for i, l in enumerate(clines) if l.startswith("## ")]
        cum, run = [], 0
        for l in clines:
            run += wc(l); cum.append(run)
        cuts = []
        for kk in range(1, nparts):
            tgt = words * kk / nparts
            if sec:
                best = min(sec, key=lambda i: abs(cum[i] - tgt))
                if 0 < best < len(clines) and best not in cuts:
                    cuts.append(best)
        cuts = sorted(set(cuts)); bnd = [0] + cuts + [len(clines)]
        letters = "abcdefghijklmnop"
        for pi in range(len(bnd) - 1):
            chunk = "\n".join(clines[bnd[pi]:bnd[pi + 1]]).strip()
            if pi > 0:
                chunk = re.sub(r"^#\s+.*\n?", "", chunk)  # continuation: drop stray H1
                chunk = f"{chunk}"
            units.append({"num": f"{ci:02d}{letters[pi]}", "title": title,
                          "is_first": pi == 0, "part": letters[pi], "md": chunk, "words": wc(chunk)})
    return units

# ----------------------------------------------------------------------------- brief
def write_brief(workdir, cfg):
    to = cfg["to"]; lang = to["name"]; endo = to.get("endonym", lang)
    frm = (cfg.get("from") or {}).get("name", "the source language")
    gloss = ""
    if cfg.get("glossary") and Path(cfg["glossary"]).exists():
        gloss = "\n\n## Project glossary (use consistently)\n\n" + Path(cfg["glossary"]).read_text(encoding="utf-8")
    brief = f"""# Translator brief — into {lang} ({endo})

You are a **world-class literary/non-fiction translator into {lang}** — the caliber a
top publishing house hires. Translate the given unit from {frm} into **{lang}**. The
result must be **faithful AND beautiful** — it should read as if originally written in
{lang}, never as a machine translation.

## Iron rules
1. **Faithful, not literal.** Convey meaning, nuance, tone, and rhythm. Recast syntax
   into natural {lang} word order; split/merge sentences where {lang} flows better.
   Add nothing; omit nothing of substance.
2. **Native fluency.** Idioms → {lang} equivalents, never calques. Read it in your head:
   it must sound like a gifted {lang} writer. Maintain a consistent register and a
   consistent voice for each speaker.
3. **Preserve every bit of structure (markdown):**
   - `#`, `##`, `###` headings → translate the text, keep the level.
   - `>` blockquotes → translate, keep as blockquote.
   - `**bold**`, `*italic*`, lists (`-`, `1.`), and tables → keep the markup.
   - **`<sup>N</sup>` footnote markers → keep VERBATIM**, attached to the preceding word.
4. **Proper nouns & terms:** keep personal names, brands, and product names in their
   original form (e.g. Tesla, SpaceX). Localize only well-established place names per
   {lang} convention. Keep numbers, units, dates, and currency as-is.
5. **Consistency:** translate recurring key terms the same way throughout.{gloss}

## This unit
{("This is the FIRST part of the chapter — begin your output with the H1 line you are given (translated), then the body."
  if True else "")}
- If you are told this is a CONTINUATION part, do NOT repeat the chapter title; begin
  directly with the first translated section/paragraph.

## Output
Return **ONLY** the translated {lang} markdown — no preamble, no code fences, no source
text, no notes. Preserve every `<sup>N</sup>`. Make it sing.
"""
    Path(workdir, "brief.md").write_text(brief, encoding="utf-8")

# ----------------------------------------------------------------------------- plan
def cmd_plan(workdir):
    wd = Path(workdir)
    cfg = json.loads((wd / "config.json").read_text())
    meta, md = ingest(cfg)
    (wd / "normalized.md").write_text(md, encoding="utf-8")
    mode = cfg["mode"]
    if mode == "auto":
        mode = "slides" if meta.get("is_slides") else ("book" if meta.get("is_book_hint") else "doc")
    units = split_units(md, meta, mode)
    usrc = wd / "units"; usrc.mkdir(exist_ok=True)
    for u in units:
        head = f"# {u['title']}\n\n" if u["is_first"] and not u["md"].lstrip().startswith("# ") else ""
        body = u["md"] if not head else head + re.sub(r"^#\s+.*\n?", "", u["md"].lstrip(), count=1)
        (usrc / f"{u['num']}-{slugify(u['title'])}.src.md").write_text(
            (body if u["is_first"] else u["md"]).strip() + "\n", encoding="utf-8")
        u["slug"] = slugify(u["title"])
        u["src_file"] = str((usrc / f"{u['num']}-{u['slug']}.src.md").resolve())
        u["out_file"] = str((wd / f"units_{cfg['to']['code']}" / f"{u['num']}-{u['slug']}.tr.md").resolve())
    (wd / f"units_{cfg['to']['code']}").mkdir(exist_ok=True)
    write_brief(wd, cfg)
    total = sum(u["words"] for u in units)
    plan = {"mode": mode, "meta": meta, "units": units, "total_words": total,
            "cost_estimate_usd": round(total / 1000 * 0.06, 2), "outputs": cfg["out"],
            "to": cfg["to"], "style": cfg["style"], "brief": str((wd / "brief.md").resolve())}
    (wd / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    (wd / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"mode": mode, "title": meta["title"], "units": len(units),
                      "total_words": total, "cost_estimate_usd": plan["cost_estimate_usd"],
                      "outputs": cfg["out"], "to": cfg["to"]["name"], "workdir": str(wd.resolve())},
                     ensure_ascii=False))

# ----------------------------------------------------------------------------- assemble
def cmd_assemble(workdir):
    wd = Path(workdir)
    cfg = json.loads((wd / "config.json").read_text())
    plan = json.loads((wd / "plan.json").read_text())
    meta = plan["meta"]; code = cfg["to"]["code"]
    udir = wd / f"units_{code}"
    # group split parts (NNa,NNb) back into chapters by the 2-digit chapter number
    bychap = collections.OrderedDict()
    for u in plan["units"]:
        chap = u["num"][:2]
        f = udir / f"{u['num']}-{u['slug']}.tr.md"
        txt = f.read_text(encoding="utf-8").strip() if f.exists() else ""
        bychap.setdefault(chap, {"title": u["title"], "parts": []})["parts"].append(txt)
    blocks = []
    for chap, c in bychap.items():
        md = "\n\n".join(p for p in c["parts"] if p)
        if not md.lstrip().startswith("# "):
            md = f"# {c['title']}\n\n{md}"
        blocks.append({"type": "chapter", "num": chap, "id": f"ch{chap}",
                       "title": c["title"], "md": md})
    out = {"meta": {"title_src": meta.get("title", ""), "author": meta.get("author", ""),
                    "format": meta.get("format"), "to": cfg["to"], "style": cfg["style"],
                    "title_translated": cfg.get("titleTranslated") or meta.get("title", ""),
                    "subtitle": cfg.get("subtitle", "")},
           "mode": plan["mode"], "blocks": blocks}
    (wd / "book_blocks.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"chapters": len(blocks), "mode": plan["mode"]}))

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    wd = sys.argv[2] if len(sys.argv) > 2 else "."
    if cmd == "plan": cmd_plan(wd)
    elif cmd == "assemble": cmd_assemble(wd)
    else: raise SystemExit("usage: engine.py {plan|assemble} <workdir>")
