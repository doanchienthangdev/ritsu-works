#!/usr/bin/env python3
"""latexout.py — render a translated book_blocks.json to LaTeX (.tex) and, via
tectonic (XeLaTeX), to PDF. The headline STEM path: math ($...$, \\[..\\], equation
envs) passes through verbatim and compiles natively; images via \\includegraphics;
tables via tabular; Vietnamese via fontspec + the bundled Source Serif 4.
"""
import re, os, subprocess, shutil
from pathlib import Path

SPECIAL = {'&': r'\&', '%': r'\%', '#': r'\#', '_': r'\_',
           '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}'}

def _esc(s):
    s = s.replace('\\', r'\textbackslash{}')
    for k, v in SPECIAL.items():
        s = s.replace(k, v)
    return s

def _inline(text):
    """Convert inline markdown to LaTeX, protecting math + code from escaping."""
    stash = []
    def keep(m):
        stash.append(m.group(0)); return f"\x00{len(stash)-1}\x00"
    # protect: display+inline math, \(..\), inline code
    t = re.sub(r'\$\$.+?\$\$|\$[^$\n]+?\$|\\\(.+?\\\)|`[^`]+?`', keep, text, flags=re.S)
    t = _esc(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'\\textbf{\1}', t)
    t = re.sub(r'(?<!\\textbf)(?<!\*)\*(?!\*)([^*]+?)\*', r'\\textit{\1}', t)
    t = re.sub(r'<sup>(.+?)</sup>', r'\\textsuperscript{\1}', t)
    t = re.sub(r'\[(.+?)\]\((.+?)\)', r'\\href{\2}{\1}', t)  # links (rare)
    def restore(m):
        s = stash[int(m.group(1))]
        if s.startswith('`'):
            return r'\texttt{' + _esc(s.strip('`')) + '}'
        return s  # math verbatim
    return re.sub('\x00(\\d+)\x00', restore, t)

def _table(rows):
    # rows: list of markdown table lines (with pipes)
    cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    cells = [r for r in cells if not all(re.fullmatch(r'[-: ]*', c) for c in r)]  # drop separator
    if not cells:
        return ''
    ncol = max(len(r) for r in cells)
    spec = '|' + 'l|' * ncol
    out = [r'\begin{center}', r'\small', r'\begin{tabular}{' + spec + '}', r'\hline']
    for i, r in enumerate(cells):
        r = r + [''] * (ncol - len(r))
        out.append(' & '.join(_inline(c) for c in r) + r' \\ \hline')
        if i == 0:
            pass
    out += [r'\end{tabular}', r'\end{center}']
    return '\n'.join(out)

def _body(md, assets_dir):
    lines = md.splitlines()
    out, i = [], 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            out.append(''); i += 1; continue
        if ln.startswith('# '):
            i += 1; continue  # chapter title handled by caller
        if ln.startswith('## '):
            out.append(r'\section*{' + _inline(ln[3:].strip()) + '}'); i += 1; continue
        if ln.startswith('### '):
            out.append(r'\subsection*{' + _inline(ln[4:].strip()) + '}'); i += 1; continue
        # display math block $$..$$ spanning lines
        if ln.strip().startswith('$$'):
            blk = [ln]
            while not (ln.strip().endswith('$$') and (len(ln.strip()) > 2 or len(blk) > 1)) and i + 1 < len(lines):
                i += 1; ln = lines[i]; blk.append(ln)
            out.append('\n'.join(blk)); i += 1; continue
        # image
        m = re.match(r'!\[(.*?)\]\((.+?)\)', ln.strip())
        if m:
            alt, path = m.group(1), m.group(2)
            out += [r'\begin{figure}[h]', r'\centering',
                    r'\includegraphics[width=0.85\linewidth,height=0.5\textheight,keepaspectratio]{' + path + '}']
            if alt.strip():
                out.append(r'\caption*{' + _inline(alt) + '}')
            out.append(r'\end{figure}'); i += 1; continue
        # table block
        if ln.strip().startswith('|') and '|' in ln.strip()[1:]:
            tbl = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tbl.append(lines[i]); i += 1
            out.append(_table(tbl)); continue
        # blockquote (accepts bare '>' lines; a quote that wraps a $$…$$ block —
        # e.g. a reconstructed pseudocode/algorithm box — is rendered directly so the
        # display math + heading typeset instead of collapsing into the quote text)
        if ln.startswith('>'):
            q = []
            while i < len(lines) and lines[i].startswith('>'):
                s = lines[i][1:]
                q.append(s[1:] if s.startswith(' ') else s); i += 1
            inner = '\n'.join(q).strip()
            if '$$' in inner:
                out.append(_body(inner, assets_dir))
            else:
                out += [r'\begin{quote}\itshape', _inline(' '.join(x for x in q if x.strip())), r'\end{quote}']
            continue
        # lists
        if re.match(r'^\s*[-*] ', ln):
            items = []
            while i < len(lines) and re.match(r'^\s*[-*] ', lines[i]):
                items.append(lines[i].strip()[2:]); i += 1
            out.append(r'\begin{itemize}')
            out += [r'\item ' + _inline(it) for it in items]
            out.append(r'\end{itemize}'); continue
        if re.match(r'^\s*\d+\. ', ln):
            items = []
            while i < len(lines) and re.match(r'^\s*\d+\. ', lines[i]):
                items.append(re.sub(r'^\s*\d+\.\s*', '', lines[i])); i += 1
            out.append(r'\begin{enumerate}')
            out += [r'\item ' + _inline(it) for it in items]
            out.append(r'\end{enumerate}'); continue
        # paragraph
        out.append(_inline(ln)); out.append(''); i += 1
    return '\n'.join(out)

def to_latex(data, fonts_dir, assets_dir, tokens):
    meta = data['meta']; blocks = data['blocks']; mode = data.get('mode', 'book')
    title = meta.get('title_translated') or meta.get('title_src') or 'Document'
    author = meta.get('author', '')
    doclass = 'book' if (mode == 'book' and len([b for b in blocks if b['type'] == 'chapter']) > 1) else 'article'
    clay = tokens['primary'].lstrip('#'); deep = tokens['primaryDeep'].lstrip('#'); ink = tokens['foreground'].lstrip('#')
    # paths are used verbatim in the .tex — the caller stages fonts/assets either
    # inside the compile tree (absolute, for tectonic) or relative (portable .tex).
    fp = str(fonts_dir).rstrip('/')
    gp = (str(assets_dir).rstrip('/') + '/') if assets_dir else ''
    pre = [
        f"\\documentclass[11pt]{{{doclass}}}",
        r"\usepackage{fontspec}",
        # explicit filename (staged TTF is SourceSerif4-*.ttf — no spaces). XeTeX dislikes
        # the instanced Inter, so headings use the serif (full Vietnamese coverage) bold.
        f"\\setmainfont{{SourceSerif4-Regular.ttf}}[Path={fp}/, BoldFont=SourceSerif4-Bold.ttf, ItalicFont=SourceSerif4-Italic.ttf, BoldItalicFont=SourceSerif4-SemiBoldItalic.ttf]",
        r"\usepackage{amsmath,amssymb,amsfonts,mathtools}",
        r"\usepackage{graphicx}" + (f"\\graphicspath{{{{{gp}}}}}" if gp else ""),
        r"\usepackage[table]{xcolor}",
        f"\\definecolor{{clay}}{{HTML}}{{{clay}}}\\definecolor{{claydeep}}{{HTML}}{{{deep}}}\\definecolor{{ink}}{{HTML}}{{{ink}}}",
        r"\usepackage[margin=1in]{geometry}",
        r"\usepackage{titlesec}\usepackage{booktabs}\usepackage{caption}\captionsetup{font=it,labelformat=empty}",
        r"\usepackage[hidelinks]{hyperref}",
        r"\setlength{\parindent}{1.2em}\setlength{\parskip}{0.2em}",
        r"\titleformat{\section}{\bfseries\color{claydeep}\large}{}{0pt}{}",
        r"\titleformat{\subsection}{\bfseries\color{ink}}{}{0pt}{}",
        (r"\titleformat{\chapter}[display]{\bfseries\color{ink}}{\centering\Large\color{clay}\thechapter}{6pt}{\centering\Huge}" if doclass == 'book' else ""),
        r"\color{ink}",
        f"\\title{{\\bfseries {_inline(title)}}}",
        f"\\author{{{_inline(author)}}}" if author else r"\author{}",
        r"\date{}",
        r"\begin{document}\maketitle",
    ]
    if doclass == 'book':
        pre.append(r"\tableofcontents")
    body = []
    for b in blocks:
        if b['type'] != 'chapter':
            continue
        head = r'\chapter{' if doclass == 'book' else r'\section{'
        body.append(head + _inline(b['title']) + '}')
        body.append(_body(b['md'], assets_dir))
    return '\n'.join(pre) + '\n' + '\n'.join(body) + '\n\\end{document}\n'

def compile_pdf(tex_path, out_pdf):
    """Compile .tex -> PDF with tectonic (XeLaTeX). Returns (ok, message)."""
    tectonic = shutil.which('tectonic')
    if not tectonic:
        return False, 'no LaTeX engine (install tectonic) — .tex emitted, PDF skipped'
    tex_path = Path(tex_path)
    # Run with cwd = the tex's directory and a RELATIVE input name, so tectonic's
    # sandbox permits reading the staged fonts/ + assets/ (it forbids absolute opens).
    try:
        r = subprocess.run([tectonic, '-X', 'compile', '--outdir', '.', '--keep-logs', tex_path.name],
                           capture_output=True, text=True, timeout=600, cwd=str(tex_path.parent))
    except Exception as e:
        return False, f'tectonic error: {e}'
    produced = tex_path.with_suffix('.pdf')
    if produced.exists():
        if str(produced) != str(out_pdf):
            shutil.move(str(produced), out_pdf)
        return True, 'ok'
    return False, (r.stderr or r.stdout or 'compile failed')[-600:]
