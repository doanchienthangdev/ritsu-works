#!/usr/bin/env python3
"""design.py — resolve a design system into book CSS for /translate renderers.
Tokens (palette) come from a DESIGN.md (bundled `claude` default, or a repo design
system). Typography is the bundled, Vietnamese-complete Source Serif 4 + Inter
pairing for reliable long-form reading; the style supplies the COLOR identity.
"""
import re, os
from pathlib import Path

HERE = Path(__file__).parent
STYLES = HERE / "styles"

DEFAULT = {
    "primary": "#CC785C", "primaryDeep": "#B24A2E", "kraft": "#D4A27F",
    "manilla": "#F2ECE1", "background": "#FAF9F5", "paper": "#FFFFFF",
    "foreground": "#1A1915", "muted": "#F1ECE2", "mutedForeground": "#6B665C",
    "rule": "#E4DDCF",
}

def _frontmatter(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return {}
    block = m.group(1)
    try:
        import yaml
        return yaml.safe_load(block) or {}
    except Exception:
        # yaml-free fallback (the WeasyPrint host has no pyyaml): pull `name` + the
        # `colors:` map's `key: "#hex"` pairs by regex. Enough to drive the palette.
        out = {}
        nm = re.search(r"(?m)^name:\s*(.+)$", block)
        if nm:
            out["name"] = nm.group(1).strip().strip('"\'')
        colors = {}
        in_colors = False
        for line in block.splitlines():
            if re.match(r"^colors:\s*$", line):
                in_colors = True; continue
            if in_colors:
                if re.match(r"^\S", line):  # dedent -> end of colors block
                    in_colors = False
                else:
                    cm = re.match(r"\s+([A-Za-z0-9_]+):\s*[\"']?(#?[0-9A-Fa-f]{3,8})", line)
                    if cm:
                        colors[cm.group(1)] = cm.group(2)
        if colors:
            out["colors"] = colors
        return out

def _design_md_path(style, repo_root):
    """Resolve where a style's DESIGN.md lives. Returns (path|None, warning|None)."""
    s = (style or "claude").strip()
    bundled = STYLES / s / "DESIGN.md"
    if bundled.exists():
        return bundled, None
    if repo_root:
        for p in [Path(repo_root) / "00-core" / "design-system" / s / "DESIGN.md",
                  Path(repo_root) / "runtime" / "design-systems" / s / "DESIGN.md"]:
            if p.exists():
                return p, None
    if s != "claude":
        return STYLES / "claude" / "DESIGN.md", f"design system '{s}' not found — using bundled 'claude'"
    return None, f"bundled claude DESIGN.md missing — using built-in defaults"

def load_tokens(style="claude", repo_root=None):
    path, warn = _design_md_path(style, repo_root)
    tokens = dict(DEFAULT)
    name = "Claude"
    if path and path.exists():
        fm = _frontmatter(path.read_text(encoding="utf-8"))
        name = fm.get("name", name)
        cols = fm.get("colors", {}) or {}
        # map common token aliases so any DESIGN.md works
        alias = {"primary": ["primary"], "primaryDeep": ["primaryDeep", "accent", "primaryHover"],
                 "background": ["background"], "foreground": ["foreground"],
                 "mutedForeground": ["mutedForeground"], "rule": ["rule", "border"],
                 "manilla": ["manilla", "muted"], "paper": ["paper", "surface"]}
        for k, names in alias.items():
            for n in names:
                if cols.get(n):
                    v = str(cols[n])
                    if re.match(r"^#?[0-9A-Fa-f]{3,8}$", v.replace("#", "")) or v.startswith("#"):
                        tokens[k] = v if v.startswith("#") else "#" + v
                    break
    tokens["_name"] = name
    return tokens, warn


def _faces(fonts_dir):
    def f(fam, fn, w, st="normal"):
        return (f"@font-face{{font-family:'{fam}';src:url('file://{fonts_dir}/{fn}');"
                f"font-weight:{w};font-style:{st};}}")
    return "\n".join([
        f("Source Serif 4", "SourceSerif4-Regular.ttf", 400),
        f("Source Serif 4", "SourceSerif4-SemiBold.ttf", 600),
        f("Source Serif 4", "SourceSerif4-Bold.ttf", 700),
        f("Source Serif 4", "SourceSerif4-Italic.ttf", 400, "italic"),
        f("Source Serif 4", "SourceSerif4-SemiBoldItalic.ttf", 600, "italic"),
        f("Inter", "Inter-Regular.ttf", 400),
        f("Inter", "Inter-Medium.ttf", 500),
        f("Inter", "Inter-SemiBold.ttf", 600),
        f("Inter", "Inter-Bold.ttf", 700),
    ])


def book_css(tokens, fonts_dir):
    """Full WeasyPrint print stylesheet for a book/document (parameterized palette)."""
    t = tokens
    return _faces(fonts_dir) + f"""
@page {{ size: 5.5in 8.5in; margin: 0.82in 0.74in 0.86in 0.74in; background:{t['background']};
  @bottom-center {{ content: counter(page); font-family:Inter; font-weight:600;
    font-size:8.5pt; color:{t['primary']}; letter-spacing:.18em; }} }}
@page plain {{ background:{t['background']}; @bottom-center{{content:none}} }}
@page partpage {{ background:{t['manilla']}; @bottom-center{{content:none}} }}
@page :first {{ @bottom-center{{content:none}} }}
html {{ -weasy-hyphens:none; }}
body {{ font-family:'Source Serif 4',Georgia,serif; font-size:10.7pt; line-height:1.62;
  color:{t['foreground']}; hyphens:none; text-align:justify; }}
.cover {{ page:plain; break-after:page; height:100%; }}
.cover-frame {{ border:1.5px solid {t['primary']}; padding:46pt 30pt; height:6.6in; margin-top:6pt;
  display:flex; flex-direction:column; align-items:center; text-align:center; }}
.cover-kicker {{ font-family:Inter; font-weight:700; font-size:11pt; letter-spacing:.42em; color:{t['primaryDeep']}; margin:14pt 0 0; }}
.cover-title {{ font-family:'Source Serif 4'; font-weight:700; font-size:38pt; line-height:1.05; color:{t['foreground']}; margin:30pt 0 0; letter-spacing:-.01em; }}
.cover-sub {{ font-style:italic; font-size:13pt; color:{t['mutedForeground']}; margin:18pt 22pt 0; line-height:1.45; }}
.cover-mark {{ color:{t['primary']}; font-size:22pt; margin:auto 0 0; }}
.cover-author {{ font-family:Inter; font-weight:600; font-size:13pt; letter-spacing:.08em; color:{t['foreground']}; margin:16pt 0 0; }}
.cover-foot {{ font-family:Inter; font-size:8.6pt; color:{t['mutedForeground']}; letter-spacing:.04em; margin:10pt 0 14pt; }}
.colophon {{ page:plain; break-after:page; padding-top:1.5in; text-align:center; color:{t['foreground']}; }}
.colo-orig {{ font-family:Inter; font-size:8.5pt; letter-spacing:.3em; text-transform:uppercase; color:{t['mutedForeground']}; }}
.colo-origtitle {{ font-family:Inter; font-weight:700; letter-spacing:.2em; font-size:14pt; color:{t['foreground']}; margin-top:8pt; }}
.colo-origsub {{ font-style:italic; font-size:10pt; color:{t['mutedForeground']}; margin-top:8pt; }}
.colo-credits {{ font-size:10.5pt; line-height:1.9; margin-top:30pt; }}
.colo-note {{ font-size:9pt; color:{t['mutedForeground']}; line-height:1.6; margin:36pt 30pt 0; text-align:justify; }}
.colo-design {{ font-family:Inter; font-size:8.4pt; letter-spacing:.06em; color:{t['mutedForeground']}; margin-top:28pt; }}
.toc {{ page:plain; break-after:page; }}
.toc-h {{ font-family:'Source Serif 4'; font-weight:700; font-size:24pt; color:{t['foreground']}; margin:0.5in 0 24pt; text-align:left; }}
.toc ul {{ list-style:none; padding:0; margin:0; }}
.toc-part {{ font-family:Inter; font-weight:700; font-size:9pt; letter-spacing:.14em; text-transform:uppercase; color:{t['primaryDeep']}; margin:20pt 0 8pt; }}
.toc-ch a {{ display:block; color:{t['foreground']}; text-decoration:none; font-size:11.5pt; margin:5pt 0; }}
.toc-ch a::after {{ content: leader('.') target-counter(attr(href), page); color:{t['mutedForeground']}; font-family:Inter; font-size:9pt; }}
.part {{ page:partpage; break-before:page; break-after:page; text-align:center; padding-top:2.6in; }}
.part-numeral {{ font-family:'Source Serif 4'; font-weight:700; font-size:64pt; color:{t['primary']}; line-height:1; }}
.part-rule {{ width:54pt; height:2px; background:{t['primaryDeep']}; margin:22pt auto; }}
.part-title {{ font-family:Inter; font-weight:700; font-size:15pt; letter-spacing:.16em; text-transform:uppercase; color:{t['foreground']}; margin:0 40pt; line-height:1.5; }}
.chapter {{ break-before:page; }}
.ch-ornament {{ color:{t['primary']}; font-size:15pt; text-align:center; margin-top:0.7in; }}
.chapter-title {{ font-family:'Source Serif 4'; font-weight:700; font-size:25pt; line-height:1.12; color:{t['foreground']}; text-align:center; margin:12pt 24pt 4pt; letter-spacing:-.01em; }}
.ch-body {{ margin-top:26pt; }}
.ch-body > p:first-of-type {{ text-indent:0; }}
.ch-body > p:first-of-type::first-letter {{ font-weight:700; color:{t['primaryDeep']}; }}
p {{ margin:0; text-indent:1.3em; }}
h2 + p, blockquote + p, .ch-body > p:first-child {{ text-indent:0; }}
h2 {{ font-family:Inter; font-weight:700; font-size:9.6pt; letter-spacing:.15em; text-transform:uppercase; color:{t['primaryDeep']}; margin:1.9em 0 .7em; text-align:left; }}
h3 {{ font-family:'Source Serif 4'; font-weight:700; font-size:13pt; color:{t['foreground']}; margin:1.3em 0 .4em; }}
blockquote {{ font-family:'Source Serif 4'; font-style:italic; font-size:1.16em; line-height:1.5; color:{t['mutedForeground']}; border-left:2.5px solid {t['primary']}; margin:1.3em 0; padding:.15em 0 .15em 1.05em; }}
blockquote p {{ text-indent:0; margin:.2em 0; }}
sup {{ font-family:Inter; font-weight:600; font-size:.6em; color:{t['primary']}; vertical-align:super; line-height:0; }}
strong,b {{ font-weight:700; }} em,i {{ font-style:italic; }}
ul,ol {{ margin:.5em 0 .5em 1.2em; padding:0; }} li {{ margin:.25em 0; text-indent:0; }}
table {{ width:100%; border-collapse:collapse; margin:1em 0; font-size:9.5pt; }}
th,td {{ border:1px solid {t['rule']}; padding:5pt 7pt; text-align:left; }}
th {{ background:{t['manilla']}; font-family:Inter; font-weight:600; }}
a {{ color:{t['primaryDeep']}; text-decoration:none; }}
.ch-body.sources p, .ch-body.refs p {{ font-size:8.4pt; line-height:1.4; text-indent:0; margin:.25em 0; color:{t['mutedForeground']}; }}
.doc-h1 {{ font-family:'Source Serif 4'; font-weight:700; font-size:22pt; color:{t['foreground']}; margin:0.2in 0 16pt; }}
"""


def epub_css(tokens, fonts_rel="../fonts"):
    t = tokens
    faces = ""
    for fam, fn, w, st in [
        ("Source Serif 4", "SourceSerif4-Regular.ttf", 400, "normal"),
        ("Source Serif 4", "SourceSerif4-SemiBold.ttf", 600, "normal"),
        ("Source Serif 4", "SourceSerif4-Bold.ttf", 700, "normal"),
        ("Source Serif 4", "SourceSerif4-Italic.ttf", 400, "italic"),
        ("Inter", "Inter-Regular.ttf", 400, "normal"),
        ("Inter", "Inter-SemiBold.ttf", 600, "normal"),
        ("Inter", "Inter-Bold.ttf", 700, "normal"),
    ]:
        faces += f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:{st};src:url('{fonts_rel}/{fn}');}}\n"
    return faces + f"""
body{{font-family:'Source Serif 4',Georgia,serif;color:{t['foreground']};background:{t['background']};
  line-height:1.64;margin:0 4%;text-align:justify;hyphens:none;}}
h1.ct{{font-family:'Source Serif 4',serif;font-weight:700;font-size:1.7em;line-height:1.15;text-align:center;margin:1.4em 0 .2em;color:{t['foreground']};}}
.orn{{color:{t['primary']};text-align:center;font-size:1.2em;margin-top:1.2em;}}
h2{{font-family:Inter,sans-serif;font-weight:700;font-size:.82em;letter-spacing:.14em;text-transform:uppercase;color:{t['primaryDeep']};margin:2em 0 .7em;text-align:left;}}
h3{{font-weight:700;font-size:1.1em;margin:1.2em 0 .3em;}}
p{{margin:0;text-indent:1.3em;}} .ct + p,h2 + p,blockquote + p,p.first{{text-indent:0;}}
blockquote{{font-style:italic;font-size:1.12em;line-height:1.5;color:{t['mutedForeground']};border-left:2.5px solid {t['primary']};margin:1.2em 0;padding:.1em 0 .1em 1em;}}
blockquote p{{text-indent:0;margin:.2em 0;}}
sup{{font-family:Inter,sans-serif;font-weight:600;font-size:.62em;color:{t['primary']};}}
em,i{{font-style:italic;}} strong,b{{font-weight:700;}}
ul,ol{{margin:.5em 0 .5em 1.3em;}} li{{margin:.25em 0;text-indent:0;}}
table{{width:100%;border-collapse:collapse;margin:1em 0;font-size:.9em;}} th,td{{border:1px solid {t['rule']};padding:.3em .5em;}} th{{background:{t['manilla']};}}
a{{color:{t['primaryDeep']};text-decoration:none;}}
.part{{text-align:center;padding:26% 8% 0;}} .part .num{{font-family:'Source Serif 4',serif;font-weight:700;font-size:4em;color:{t['primary']};line-height:1;}}
.part .rule{{width:48px;height:2px;background:{t['primaryDeep']};margin:1em auto;}} .part .pt{{font-family:Inter,sans-serif;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}}
.sources p,.refs p{{font-size:.8em;line-height:1.45;text-indent:0;margin:.3em 0;color:{t['mutedForeground']};}}
.tp{{text-align:center;padding-top:16%;}} .tp .k{{font-family:Inter,sans-serif;font-weight:700;letter-spacing:.4em;color:{t['primaryDeep']};}}
.tp h1{{font-family:'Source Serif 4',serif;font-weight:700;font-size:2.3em;margin:.5em 5%;}} .tp .s{{font-style:italic;color:{t['mutedForeground']};margin:0 8%;}} .tp .a{{font-family:Inter;font-weight:600;margin-top:1.2em;}}
"""

if __name__ == "__main__":
    import json, sys
    tk, w = load_tokens(sys.argv[1] if len(sys.argv) > 1 else "claude",
                        sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps({"tokens": tk, "warning": w}, ensure_ascii=False, indent=2))
