#!/usr/bin/env python3
"""scripts/thinking-toolkit/trace-build.py — capability thinking-toolkit v3.4.

Renders the Reasoning Trace as a narrated McKinsey ENGAGEMENT JOURNEY PDF: a
milestone-by-milestone walkthrough (one section per checkpoint), chart-rich, with
the client sign-off (nghiệm thu) at each milestone, in the accessible -vi-day-du
register. NOT a technical dump — a story a client can follow.

Reads from the run folder:
  - trace.json          (skeleton: checkpoints/analyses/workplan/hitl/tools — from trace-extract.cjs)
  - reasoning-trace.md  (the skill's walkthrough BODY, with inline ![cap](trace-charts/<name>.png) refs)
  - trace-charts.json   (the skill's narrative chart specs: { "<name>": {type, ...} })

Renders the AUTO charts (journey/receipts/tools from trace.json) + the SPEC'd charts
(from trace-charts.json), then compiles the markdown -> PDF (weasyprint, McKinsey CSS).
If reasoning-trace.md is absent it auto-generates a basic walkthrough so the PDF still works.

Local tool (matplotlib + weasyprint), like the report builder — NOT a CI dependency.
Run: DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /opt/anaconda3/bin/python3 \\
       scripts/thinking-toolkit/trace-build.py <slug-or-path>
"""
import sys, os, json, html, textwrap
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Rectangle

REPO_ROOT = Path(__file__).resolve().parents[2]
RUN_BASE = REPO_ROOT / ".archives" / "mckinsey"
INK = "#051C2C"; CYAN = "#00A9F4"; BLUE = "#034B6F"; GREY = "#9AA6B2"
LGREY = "#E3E8EC"; AMBER = "#E8A33D"; GREEN = "#1E8E5A"; RED = "#B5443B"; TEAL = "#0E6E9C"
ACT_COLOR = {"state": BLUE, "structure": CYAN, "solve": INK, "sell": TEAL}
ACT_NAME = {"state": "STATE", "structure": "STRUCTURE", "solve": "SOLVE", "sell": "SELL"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "figure.dpi": 150, "text.color": INK})


def resolve_run(arg):
    if not arg:
        return None
    p = Path(arg)
    if "/" in arg or os.sep in arg:
        p = p if p.is_absolute() else (REPO_ROOT / arg)
        return p if p.exists() else None
    p = RUN_BASE / arg
    return p if p.exists() else None


def _save(fig, out):
    fig.savefig(out, bbox_inches="tight", facecolor="white", dpi=150)
    plt.close(fig)


def _wrap(s, n):
    return "\n".join(textwrap.wrap(str(s), n)) if s else ""


# ============================ AUTO charts (from trace.json) ============================
def chart_journey(trace, out, override=None):
    """The journey map — the 7 milestones as stations along the 4S arc, each with its sign-off.
    `override` (optional, from trace-charts.json 'journey'.stations) supplies clean, in-register
    station captions {kind, decision} aligned 1:1 with checkpoints; the act-band stage always comes
    from trace.json so grouping stays correct."""
    cps = trace["checkpoints"]
    ov = override or []
    n = max(len(cps), 1)
    fig, ax = plt.subplots(figsize=(11.5, 4.4))
    x0, x1 = 0.06, 0.96
    xs = [x0 + (i + 0.5) * (x1 - x0) / n for i in range(len(cps))]
    # act bands (group consecutive checkpoints by stage)
    i = 0
    while i < len(cps):
        st = (cps[i].get("stage") or "").lower()
        j = i
        while j + 1 < len(cps) and (cps[j + 1].get("stage") or "").lower() == st:
            j += 1
        left = xs[i] - (x1 - x0) / n / 2 + 0.005
        right = xs[j] + (x1 - x0) / n / 2 - 0.005
        ax.add_patch(Rectangle((left, 0.30), right - left, 0.42, color=ACT_COLOR.get(st, GREY), alpha=0.08, zorder=0))
        ax.text((left + right) / 2, 0.745, ACT_NAME.get(st, st.upper()), ha="center", va="bottom",
                fontsize=9.5, fontweight="bold", color=ACT_COLOR.get(st, GREY), zorder=2)
        i = j + 1
    ax.plot([x0, x1], [0.51, 0.51], color=LGREY, lw=2.2, zorder=1)
    for i, c in enumerate(cps):
        st = (c.get("stage") or "").lower(); col = ACT_COLOR.get(st, GREY)
        x = xs[i]
        o = ov[i] if i < len(ov) else {}
        kind = o.get("kind") or c.get("kind", "")
        decision = o.get("decision") or c.get("decision") or ""
        ax.scatter(x, 0.51, s=420, color=col, edgecolor="white", lw=1.5, zorder=4)
        ax.text(x, 0.51, str(i + 1), color="white", ha="center", va="center", fontsize=10, fontweight="bold", zorder=5)
        ax.text(x, 0.63, kind, ha="center", va="bottom", fontsize=8.6, fontweight="bold", color=INK, zorder=5)
        ax.text(x, 0.45, _wrap("✓ " + decision[:80], 24), ha="center", va="top", fontsize=6.6, color="#3a4a55", zorder=5)
    # porpoise loop annotation
    pi = next((i for i, c in enumerate(cps) if "porpoise" in (c.get("kind") or "")), None)
    if pi is not None:
        ax.annotate("", xy=(xs[pi] - 0.018, 0.58), xytext=(xs[pi] + 0.018, 0.58),
                    arrowprops=dict(arrowstyle="-|>", color=AMBER, lw=1.5, connectionstyle="arc3,rad=0.9"), zorder=3)
        ax.text(xs[pi], 0.84, "↺ quay ngược", ha="center", fontsize=7.5, color=AMBER, fontweight="bold")
    ax.set_xlim(0, 1); ax.set_ylim(0.18, 0.92); ax.axis("off")
    ax.set_title("Bản đồ hành trình — 7 mốc, mỗi mốc đều dừng để khách hàng nghiệm thu (✓)",
                 loc="left", fontsize=12.5, fontweight="bold", color=INK, pad=10)
    _save(fig, out)


def chart_receipts(trace, out):
    """The 8 HITL receipts — 'we asked, not assumed'."""
    hl = trace["hitl"]
    fig, ax = plt.subplots(figsize=(9.6, max(2.4, 0.62 * len(hl) + 0.6)))
    for i, h in enumerate(hl):
        y = len(hl) - i - 1
        ax.text(0.005, y, "✓", color=GREEN, fontsize=11, fontweight="bold", va="center")
        q = _wrap((h.get("question") or "").split("?")[0][:60], 52)
        ax.text(0.04, y, q, fontsize=8.4, color=INK, va="center", fontweight="bold")
        a = _wrap("→ " + (h.get("answer") or "")[:70], 60)
        ax.text(0.55, y, a, fontsize=8.2, color="#34505f", va="center")
    ax.set_xlim(0, 1.0); ax.set_ylim(-0.6, len(hl) - 0.4); ax.axis("off")
    ax.set_title("8 điều chúng tôi HỎI (không đoán) — và bạn đã xác nhận",
                 loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=8)
    _save(fig, out)


def chart_tools(trace, out):
    items = sorted(trace["tools_used"].items(), key=lambda kv: kv[1]) or [("(none)", 0)]
    labels = [k for k, _ in items]; vals = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(7.4, max(2.2, 0.5 * len(items))))
    colors = [CYAN if ("analytics" in l or "ops" in l) else (AMBER if ("web" in l or "assumption" in l) else BLUE) for l in labels]
    ax.barh(range(len(items)), vals, color=colors, height=0.6)
    for i, v in enumerate(vals):
        ax.text(v + 0.06, i, str(v), va="center", fontsize=9, fontweight="bold", color=INK)
    ax.set_yticks(range(len(items))); ax.set_yticklabels(labels, fontsize=9)
    ax.set_xticks([]); ax.spines[["top", "right", "bottom"]].set_visible(False)
    ax.set_title("Bằng chứng đến từ đâu — số lần kéo dữ liệu theo công cụ",
                 loc="left", fontsize=11, fontweight="bold", color=INK, pad=8)
    _save(fig, out)


# ============================ SPEC charts (from trace-charts.json) ============================
def chart_funnel(spec, out):
    stages = spec.get("stages", [])
    fig, ax = plt.subplots(figsize=(8.6, max(2.6, 0.98 * len(stages) + 0.8)))
    maxv = max([abs(s.get("value", 1)) for s in stages] + [1])
    import math
    for i, s in enumerate(stages):
        v = max(abs(s.get("value", 1)), 1)
        # width floored at 0.46 so even the narrowest stage holds a (wrapped) label without clipping
        w = 0.46 + 0.54 * (math.log10(v) / math.log10(maxv) if maxv > 1 else 1)
        y = len(stages) - i - 1
        col = [BLUE, CYAN, INK, TEAL, GREEN][i % 5]
        ax.add_patch(FancyBboxPatch(((1 - w) / 2, y + 0.12), w, 0.74, boxstyle="round,pad=0.01", fc=col, ec="none"))
        label = f"{s.get('label','')}  ·  {s.get('display', s.get('value',''))}"
        chars = max(int(w * 52), 16)                       # wrap budget scales with the box width
        fs = 10.5 if len(label) <= chars else 9.2          # shrink a touch for the long ones
        ax.text(0.5, y + 0.49, _wrap(label, chars), ha="center", va="center", color="white", fontsize=fs, fontweight="bold")
        if s.get("note"):
            ax.text(0.5, y + 0.045, _wrap(s["note"], 64), ha="center", va="top", fontsize=7.2, color=GREY, style="italic")
    ax.set_xlim(0, 1); ax.set_ylim(0, len(stages)); ax.axis("off")
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=10)
    _save(fig, out)


def chart_kept_dropped(spec, out):
    kept = spec.get("kept", []); dropped = spec.get("dropped", [])
    rows = max(len(kept), len(dropped), 1)
    fig, ax = plt.subplots(figsize=(10.2, max(2.6, 0.62 * rows + 1.0)))
    ax.text(0.02, rows + 0.2, "GIỮ LẠI", fontsize=10.5, fontweight="bold", color=GREEN)
    ax.text(0.52, rows + 0.2, "ĐÃ BỎ (và vì sao)", fontsize=10.5, fontweight="bold", color=RED)
    for i, k in enumerate(kept):
        y = rows - i - 1
        ax.add_patch(FancyBboxPatch((0.02, y + 0.1), 0.45, 0.62, boxstyle="round,pad=0.01", fc="#E9F8F0", ec=GREEN, lw=1.1))
        ax.text(0.045, y + 0.41, "✓ " + _wrap(k, 44), fontsize=8.4, color=INK, va="center", fontweight="bold")
    for i, d in enumerate(dropped):
        y = rows - i - 1
        it = d.get("item", d) if isinstance(d, dict) else d
        rs = d.get("reason", "") if isinstance(d, dict) else ""
        ax.add_patch(FancyBboxPatch((0.52, y + 0.1), 0.46, 0.62, boxstyle="round,pad=0.01", fc="#F4F6F8", ec=GREY, lw=1.0))
        ax.text(0.54, y + 0.5, "✗ " + str(it), fontsize=8.4, color="#5a6b76", va="center", fontweight="bold")
        ax.text(0.54, y + 0.24, _wrap(rs, 58), fontsize=7.2, color=GREY, va="center", style="italic")
    ax.set_xlim(0, 1); ax.set_ylim(0, rows + 0.5); ax.axis("off")
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=12)
    _save(fig, out)


def chart_line_band(spec, out):
    wk = spec.get("weeks", []); low = spec.get("low", []); high = spec.get("high", [])
    target = spec.get("target")
    fig, ax = plt.subplots(figsize=(8.4, 3.4))
    if wk and low and high:
        ax.fill_between(wk, low, high, color=CYAN, alpha=0.15)
        ax.plot(wk, low, "-o", color=BLUE, lw=2, ms=5, label=spec.get("low_label", "Kỳ vọng"))
        ax.plot(wk, high, "--o", color=CYAN, lw=2, ms=5, label=spec.get("high_label", "Stretch"))
    if target is not None:
        ax.axhline(target, color=INK, lw=1, ls=":")
        ax.text(wk[0] if wk else 0, target * 1.03, spec.get("target_label", f"{target}"), color=INK, fontsize=8.5)
    if spec.get("window"):
        ax.axvspan(0, spec["window"], color=AMBER, alpha=0.09)
    ax.set_xlabel(spec.get("x_label", "Tuần")); ax.set_ylabel(spec.get("y_label", ""))
    ax.legend(frameon=False, fontsize=8.5, loc="upper left")
    ax.spines[["top", "right"]].set_visible(False)
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11, fontweight="bold", color=INK, pad=8)
    _save(fig, out)


def chart_assumptions(spec, out):
    rows = spec.get("rows", [])
    fig, ax = plt.subplots(figsize=(10.2, max(2.6, 1.1 * len(rows) + 0.8)))
    for i, r in enumerate(rows):
        y = len(rows) - i - 1
        ax.add_patch(FancyBboxPatch((0.01, y + 0.08), 0.32, 0.82, boxstyle="round,pad=0.01", fc="#EAF7FD", ec=CYAN, lw=1.1))
        ax.text(0.025, y + 0.5, _wrap(r.get("assumption", ""), 30), fontsize=8.0, va="center", color=INK, fontweight="bold")
        ax.text(0.35, y + 0.62, "Phép thử: " + _wrap(r.get("test", ""), 52), fontsize=7.6, va="center", color="#34505f")
        ax.text(0.35, y + 0.30, "Nếu sai → " + _wrap(r.get("kill", ""), 52), fontsize=7.6, va="center", color=RED)
        ax.annotate("", xy=(0.345, y + 0.5), xytext=(0.33, y + 0.5), arrowprops=dict(arrowstyle="-|>", color=GREY, lw=1))
    ax.set_xlim(0, 1); ax.set_ylim(0, len(rows)); ax.axis("off")
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=10)
    _save(fig, out)


def chart_bars(spec, out):
    items = spec.get("items", [])
    fig, ax = plt.subplots(figsize=(8.0, max(2.2, 0.55 * len(items) + 0.6)))
    labels = [it.get("label", "") for it in items]; vals = [it.get("value", 0) for it in items]
    colors = [CYAN if it.get("highlight") else BLUE for it in items]
    ax.barh(range(len(items)), vals, color=colors, height=0.6)
    for i, it in enumerate(items):
        ax.text(it.get("value", 0) + max(vals + [1]) * 0.01, i, it.get("display", str(it.get("value", ""))),
                va="center", fontsize=8.6, fontweight="bold", color=INK)
    ax.set_yticks(range(len(items))); ax.set_yticklabels(labels, fontsize=8.8)
    ax.set_xticks([]); ax.spines[["top", "right", "bottom"]].set_visible(False); ax.invert_yaxis()
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11, fontweight="bold", color=INK, pad=8)
    _save(fig, out)


def chart_twobytwo(spec, out):
    fig, ax = plt.subplots(figsize=(7.6, 5.4))
    ax.axvline(0.5, color="#CDD6DC", lw=1); ax.axhline(0.5, color="#CDD6DC", lw=1)
    for it in spec.get("items", []):
        kept = it.get("kept"); col = CYAN if kept else GREY
        ax.scatter(it.get("x", 0.5), it.get("y", 0.5), s=360 if kept else 200, color=col, edgecolor="white", zorder=3)
        ax.annotate(it.get("label", ""), (it.get("x", 0.5), it.get("y", 0.5)), xytext=(7, 6),
                    textcoords="offset points", fontsize=8.4, color=INK, fontweight="bold" if kept else "normal")
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.set_xlabel(spec.get("x_label", "")); ax.set_ylabel(spec.get("y_label", ""))
    ax.set_xticks([]); ax.set_yticks([]); ax.spines[["top", "right"]].set_visible(False)
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=8)
    _save(fig, out)


def chart_callout(spec, out):
    tiles = spec.get("tiles", [])
    fig, ax = plt.subplots(figsize=(10.0, 2.2))
    n = max(len(tiles), 1)
    for i, t in enumerate(tiles):
        x = (i + 0.5) / n
        ax.text(x, 0.62, str(t.get("number", "")), ha="center", va="center", fontsize=26, fontweight="bold", color=CYAN)
        ax.text(x, 0.22, _wrap(t.get("label", ""), 22), ha="center", va="center", fontsize=8.6, color=INK)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    if spec.get("title"):
        ax.set_title(spec["title"], loc="left", fontsize=11, fontweight="bold", color=INK, pad=6)
    _save(fig, out)


SPEC_RENDERERS = {"funnel": chart_funnel, "kept_dropped": chart_kept_dropped, "line_band": chart_line_band,
                  "assumptions": chart_assumptions, "bars": chart_bars, "twobytwo": chart_twobytwo, "callout": chart_callout}


def md_to_html(md):
    try:
        import markdown
        return markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "attr_list"]).convert(md)
    except Exception:
        return "<pre>" + html.escape(md) + "</pre>"


def auto_narration(trace):
    """Basic fallback walkthrough if the skill has not written reasoning-trace.md."""
    s = trace["stats"]
    out = ["# Hành trình tư duy (bản tự sinh)\n",
           "> Renderer tự sinh tường thuật cơ sở từ `trace.json`. Skill `reasoning-trace` nên viết đè `reasoning-trace.md` để có bản tường thuật từng-chặng-có-nghiệm-thu đầy đủ.\n",
           "![Bản đồ hành trình](trace-charts/journey.png)\n",
           "![Điều đã hỏi](trace-charts/receipts.png)\n"]
    ACTS = [("state", "STATE — Đóng khung"), ("structure", "STRUCTURE — Phân rã"),
            ("solve", "SOLVE — Phân tích"), ("sell", "SELL — Tổng hợp + kể")]
    for band, title in ACTS:
        out.append(f"\n## {title}\n")
        for c in trace["checkpoints"]:
            if (c.get("stage") or "").lower() == band:
                out.append(f"- **{c.get('kind','')}** — ✓ {c.get('decision','')}")
    out.append("\n![Bằng chứng](trace-charts/tools.png)\n")
    out.append(f"\n*{s['analyses']} phân tích · {s['external_numbers']} số liệu ngoài (đã verify) · {s['porpoises']} porpoise.*")
    return "\n".join(out)


CSS = """
@page { size: A4; margin: 20mm 18mm 18mm 18mm;
  @top-right { content: "Ritsu · Hành trình tư duy (Reasoning Trace) — Nội bộ"; font-family:'DejaVu Sans'; font-size:8pt; color:#9AA6B2; }
  @bottom-center { content: counter(page); font-family:'DejaVu Sans'; font-size:9pt; color:#6B7785; } }
@page :first { margin:0; @top-right { content:""; } @bottom-center { content:""; } }
@page cover { margin:0; @top-right { content:""; } @bottom-center { content:""; } }
html { font-size: 10.7pt; }
body { font-family:'DejaVu Sans',sans-serif; line-height:1.52; color:#14222B; hyphens:auto; }
.cover { page:cover; page-break-after:always; width:210mm; height:297mm; margin:0; padding:54mm 26mm 24mm; box-sizing:border-box;
  background:linear-gradient(155deg,#051C2C 0%,#052B40 55%,#034B6F 100%); color:#EAF2F7; display:flex; flex-direction:column; }
.cover .rule { width:40mm; height:3pt; background:#00A9F4; margin-bottom:15mm; }
.cover .eyebrow { font-size:10pt; letter-spacing:3.5pt; color:#6FCBF7; margin-bottom:13mm; }
.cover h1 { font-family:'DejaVu Serif',serif; font-size:36pt; font-weight:700; line-height:1.12; margin:0 0 10mm; color:#fff; }
.cover .sub { font-family:'DejaVu Serif',serif; font-style:italic; font-size:13.5pt; line-height:1.5; color:#BFD6E6; }
.cover .fill { flex:1; }
.cover .meta { font-size:9pt; color:#8FAEC2; line-height:1.7; border-top:1px solid #18465F; padding-top:6mm; }
.cover .stat { display:inline-block; margin:0 7mm 2mm 0; font-size:9pt; color:#BFD6E6; }
.cover .stat b { color:#00A9F4; font-size:14pt; }
.cover .meta b { color:#CFE2EF; }
h1 { font-family:'DejaVu Serif',serif; font-size:19pt; color:#051C2C; border-bottom:2.5px solid #00A9F4; padding-bottom:3.5mm; margin:8mm 0 5mm; page-break-after:avoid; }
h2 { font-size:13pt; color:#034B6F; font-weight:700; margin:6mm 0 2.5mm; page-break-after:avoid; }
h3 { font-size:11pt; color:#051C2C; font-weight:700; margin:4mm 0 1.5mm; page-break-after:avoid; }
p { margin:0 0 3mm; text-align:justify; orphans:3; widows:3; }
ul, ol { margin:2mm 0 3.5mm 4mm; padding-left:5mm; }
li { margin:0 0 1.6mm; line-height:1.5; }
strong { font-weight:700; color:#051C2C; }
blockquote { border-left:4px solid #00A9F4; background:#EAF7FD; padding:3mm 6mm; margin:4mm 0; color:#0B2A3A; page-break-inside:avoid; }
blockquote.signoff { border-left-color:#1E8E5A; background:#E9F8F0; }
blockquote.signoff strong { color:#14724a; }
table { border-collapse:collapse; width:100%; font-size:8.6pt; margin:3mm 0; page-break-inside:avoid; }
th,td { border:0.8px solid #D4DCE2; padding:1.7mm 2.4mm; text-align:left; vertical-align:top; }
th { background:#051C2C; color:#fff; font-size:8.5pt; }
tr:nth-child(even) td { background:#F2F7FA; }
img { display:block; width:100%; max-width:170mm; margin:4mm auto 1mm; border:1px solid #E1E8EC; border-radius:2px; page-break-inside:avoid; }
.act { page-break-before:always; }
hr { border:none; border-top:1px solid #D4DCE2; margin:6mm 0; }
"""


def main():
    run = resolve_run(sys.argv[1] if len(sys.argv) > 1 else None)
    if not run:
        print(f"[FAIL] run folder not found: {sys.argv[1:] or '(missing arg)'}"); sys.exit(1)
    tj = run / "trace.json"
    if not tj.exists():
        print(f"[FAIL] {tj} missing — run trace-extract.cjs first."); sys.exit(1)
    trace = json.loads(tj.read_text())
    dd = run / "trace-charts"; dd.mkdir(exist_ok=True)

    # skill-authored chart specs (read first — 'journey' may override the auto journey captions)
    specs = {}
    sc = run / "trace-charts.json"
    if sc.exists():
        try:
            specs = json.loads(sc.read_text())
        except Exception as e:
            print(f"[warn] trace-charts.json parse error: {e}")
    journey_spec = specs.pop("journey", None)  # not a SPEC_RENDERER type; handled by chart_journey

    # auto charts (always available to the narration by canonical name)
    chart_journey(trace, dd / "journey.png", override=(journey_spec or {}).get("stations"))
    chart_receipts(trace, dd / "receipts.png")
    chart_tools(trace, dd / "tools.png")

    # spec charts authored by the skill
    rendered = []
    for name, spec in specs.items():
        r = SPEC_RENDERERS.get(spec.get("type"))
        if r:
            try:
                r(spec, dd / f"{name}.png"); rendered.append(name)
            except Exception as e:
                print(f"[warn] chart '{name}' ({spec.get('type')}) failed: {e}")
        else:
            print(f"[warn] chart '{name}': unknown type '{spec.get('type')}'")

    narr_path = run / "reasoning-trace.md"
    narration = narr_path.read_text() if narr_path.exists() else auto_narration(trace)
    s = trace["stats"]
    cover = f"""<div class="cover"><div class="rule"></div>
      <div class="eyebrow">REASONING TRACE · HÀNH TRÌNH TƯ DUY · TIẾNG VIỆT</div>
      <h1>Cách chúng tôi đã nghĩ<br/>để đi đến câu trả lời</h1>
      <div class="sub">Hành trình một đội McKinsey đi qua 4 chặng (State → Structure → Solve → Sell)<br/>và {s['checkpoints']} mốc — mỗi mốc dừng lại để bạn nghiệm thu. Run: <b>{html.escape(trace['slug'])}</b>.</div>
      <div class="fill"></div>
      <div class="meta">
        <span class="stat"><b>{s['checkpoints']}</b> mốc</span>
        <span class="stat"><b>{s['analyses']}</b> phân tích</span>
        <span class="stat"><b>{s['hitl_receipts']}</b> điều đã hỏi</span>
        <span class="stat"><b>{s['porpoises']}</b> porpoise</span>
        <span class="stat"><b>{s['external_numbers']}</b> số liệu ngoài (đã verify)</span>
        <br/>Ritsu · ritsu-works · /think mckinsey · thinking-toolkit v3.4 reasoning-trace
      </div></div>"""
    body = md_to_html(narration)
    htmldoc = f"<!DOCTYPE html><html lang='vi'><head><meta charset='utf-8'></head><body>{cover}{body}</body></html>"
    (run / "reasoning-trace.html").write_text(htmldoc, encoding="utf-8")
    try:
        from weasyprint import HTML, CSS as WCSS
        from weasyprint.text.fonts import FontConfiguration
        fc = FontConfiguration()
        out = run / "reasoning-trace.pdf"
        HTML(string=htmldoc, base_url=str(run)).write_pdf(str(out), stylesheets=[WCSS(string=CSS, font_config=fc)], font_config=fc)
        print(f"[OK] reasoning-trace.pdf → {out} ({out.stat().st_size // 1024} KB) · charts: journey, receipts, tools" + (", " + ", ".join(rendered) if rendered else ""))
    except Exception as e:
        print(f"[OK] reasoning-trace.html written; PDF skipped ({e.__class__.__name__}: {e}).")


if __name__ == "__main__":
    main()
