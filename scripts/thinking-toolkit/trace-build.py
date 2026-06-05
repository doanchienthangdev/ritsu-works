#!/usr/bin/env python3
"""scripts/thinking-toolkit/trace-build.py — capability thinking-toolkit v3.3.

The LOCAL renderer for the Reasoning Trace ("McKinsey thinking journal"). Reads a
run folder's trace.json (built by trace-extract.cjs) + an optional reasoning-trace.md
narration (written by the thinking-toolkit/reasoning-trace skill), renders the 4S
flow/tree diagram + timeline + tool-usage chart (matplotlib, McKinsey palette), and
compiles a narrated PDF (weasyprint). If no narration is present it auto-generates a
baseline one from trace.json, so the PDF is always useful.

Local tool (weasyprint + matplotlib), like the playbook builder — NOT a CI dependency.
Run: DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /opt/anaconda3/bin/python3 \\
       scripts/thinking-toolkit/trace-build.py <slug-or-path>
"""
import sys, os, json, html, re
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

REPO_ROOT = Path(__file__).resolve().parents[2]
RUN_BASE = REPO_ROOT / ".archives" / "mckinsey"

INK = "#051C2C"; CYAN = "#00A9F4"; BLUE = "#034B6F"; GREY = "#9AA6B2"
LGREY = "#E3E8EC"; AMBER = "#E8A33D"; GREEN = "#1E8E5A"; RED = "#B5443B"
BAND_COLOR = {"state": BLUE, "structure": CYAN, "solve": INK, "sell": "#0E6E9C"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "figure.dpi": 150,
                     "text.color": INK, "axes.edgecolor": "#C7D0D6"})


def resolve_run(arg):
    if not arg:
        return None
    p = Path(arg)
    if "/" in arg or os.sep in arg:
        p = p if p.is_absolute() else (REPO_ROOT / arg)
        return p if p.exists() else None
    p = RUN_BASE / arg
    return p if p.exists() else None


# ---------- diagrams ----------
def draw_flow(trace, out):
    """4S flow/tree: 4 bands left→right, checkpoints listed, porpoise back-edge."""
    fig, ax = plt.subplots(figsize=(10, 4.6))
    bands = ["state", "structure", "solve", "sell"]
    titles = {"state": "STATE\nframe", "structure": "STRUCTURE\ndecompose",
              "solve": "SOLVE\nanalyse", "sell": "SELL\nsynthesize"}
    xs = [0.4, 2.9, 5.4, 7.9]; w = 2.2
    for band, x in zip(bands, xs):
        ax.add_patch(FancyBboxPatch((x, 3.3), w, 1.0, boxstyle="round,pad=0.03",
                     fc=BAND_COLOR[band], ec="none"))
        ax.text(x + w / 2, 3.8, titles[band], ha="center", va="center", color="white",
                fontsize=10, fontweight="bold")
        # checkpoints in this band
        cps = [e for e in trace["bands"].get(band, []) if e.get("kind") == "checkpoint"]
        for i, e in enumerate(cps):
            ax.add_patch(FancyBboxPatch((x + 0.1, 2.7 - i * 0.62), w - 0.2, 0.5,
                         boxstyle="round,pad=0.02", fc="white", ec=BAND_COLOR[band], lw=1.2))
            ax.text(x + w / 2, 2.95 - i * 0.62, e["label"], ha="center", va="center",
                    fontsize=8.6, color=INK, fontweight="bold")
        if band == "solve":
            na = len([e for e in trace["bands"]["solve"] if e.get("kind") == "analysis"])
            tools = ", ".join(f"{k}×{v}" for k, v in sorted(trace["tools_used"].items(),
                              key=lambda kv: -kv[1])[:4])
            ax.text(x + w / 2, 0.55, f"{na} data-pulls\n{tools}", ha="center", va="center",
                    fontsize=7.6, color=GREY, style="italic")
    # forward arrows
    for i in range(3):
        ax.add_patch(FancyArrowPatch((xs[i] + w, 3.8), (xs[i + 1], 3.8),
                     arrowstyle="-|>", mutation_scale=16, color=INK, lw=1.6))
    # porpoise back-edge (solve → structure)
    if trace["stats"].get("porpoises", 0) > 0:
        ax.add_patch(FancyArrowPatch((xs[2] + 0.3, 3.28), (xs[1] + w - 0.3, 3.28),
                     arrowstyle="-|>", mutation_scale=14, color=AMBER, lw=1.6,
                     connectionstyle="arc3,rad=-0.45", linestyle="--"))
        ax.text(5.25, 2.5, "porpoise\n(re-frame /\nre-cleave)",
                ha="center", color=AMBER, fontsize=7.5, fontweight="bold")
    ax.set_xlim(0, 10.4); ax.set_ylim(0, 4.6); ax.axis("off")
    ax.set_title("The 4S reasoning flow — checkpoints + the porpoise back-edge",
                 loc="left", fontsize=12, fontweight="bold", color=INK, pad=8)
    fig.savefig(out, bbox_inches="tight", facecolor="white", dpi=150); plt.close(fig)


def draw_timeline(trace, out):
    """Horizontal timeline of the team-session checkpoints."""
    cps = trace["checkpoints"]
    fig, ax = plt.subplots(figsize=(10, 2.6))
    n = max(len(cps), 1)
    ax.axhline(0.5, color=LGREY, lw=2, zorder=1)
    for i, c in enumerate(cps):
        x = (i + 0.5) / n
        band = (c.get("stage") or "").lower()
        col = BAND_COLOR.get(band, GREY)
        ax.scatter(x, 0.5, s=180, color=col, zorder=3, edgecolor="white")
        ax.text(x, 0.5, str(i + 1), color="white", ha="center", va="center", fontsize=8, fontweight="bold", zorder=4)
        ax.text(x, 0.78, c.get("kind", ""), ha="center", va="bottom", fontsize=8.4, fontweight="bold", color=INK)
        dec = (c.get("decision") or "")[:46]
        ax.text(x, 0.22, dec, ha="center", va="top", fontsize=6.8, color=GREY, wrap=True)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    ax.set_title("Timeline — the 7 McKinsey team-session checkpoints, in order",
                 loc="left", fontsize=12, fontweight="bold", color=INK, pad=6)
    fig.savefig(out, bbox_inches="tight", facecolor="white", dpi=150); plt.close(fig)


def draw_tools(trace, out):
    """Tool-usage bar — which data tools the Solve loop routed to."""
    items = sorted(trace["tools_used"].items(), key=lambda kv: kv[1])
    if not items:
        items = [("(no data pulls)", 0)]
    labels = [k for k, _ in items]; vals = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(7.2, max(2.2, 0.5 * len(items))))
    colors = [CYAN if "analytics" in l or "ops" in l else (AMBER if "web" in l or "assumption" in l else BLUE) for l in labels]
    ax.barh(range(len(items)), vals, color=colors, height=0.62)
    for i, v in enumerate(vals):
        ax.text(v + 0.05, i, str(v), va="center", fontsize=9, color=INK, fontweight="bold")
    ax.set_yticks(range(len(items))); ax.set_yticklabels(labels, fontsize=9)
    ax.set_xticks([]); ax.spines[["top", "right", "bottom"]].set_visible(False)
    ax.set_title("Where the analysis got its data — tool routing tally",
                 loc="left", fontsize=11.5, fontweight="bold", color=INK, pad=8)
    fig.savefig(out, bbox_inches="tight", facecolor="white", dpi=150); plt.close(fig)


# ---------- auto-narration (used only if reasoning-trace.md is absent) ----------
def auto_narration(trace):
    out = ["# Hành trình tư duy (tự sinh từ trace) — narration mẫu\n",
           "> Đây là bản tường thuật cơ sở do renderer tự sinh từ `trace.json`. ",
           "Skill `reasoning-trace` có thể viết đè `reasoning-trace.md` để tường thuật sâu hơn.\n"]
    BANDS = [("state", "STATE — Đóng khung"), ("structure", "STRUCTURE — Phân rã + kế hoạch"),
             ("solve", "SOLVE — Vòng phân tích"), ("sell", "SELL — Tổng hợp + kể")]
    cps = {c["id"]: c for c in trace["checkpoints"]}
    for band, title in BANDS:
        out.append(f"\n## {title}\n")
        for e in trace["bands"].get(band, []):
            if e.get("kind") == "checkpoint":
                c = cps.get(e["id"], {})
                out.append(f"- **{e['label']}** — {c.get('decision','')}")
        if band == "solve":
            out.append(f"\n*{trace['stats']['analyses']} phân tích · "
                       f"{trace['stats']['external_numbers']} số liệu ngoài · "
                       f"{trace['stats']['porpoises']} lần porpoise.*")
    return "\n".join(out)


def md_to_html(md):
    try:
        import markdown
        return markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists"]).convert(md)
    except Exception:
        return "<pre>" + html.escape(md) + "</pre>"


def ledger_html(trace):
    rows = []
    for a in trace["analyses"]:
        deg = a.get("degree_num") or a.get("degree") or ""
        rows.append(f"<tr><td>{html.escape(a.get('hypothesis','')[:70])}</td>"
                    f"<td>{html.escape(a.get('tool',''))}</td><td>{deg}</td>"
                    f"<td>{html.escape((a.get('verdict','') or '')[:90])}</td></tr>")
    return ("<table><tr><th>Giả thuyết / datum</th><th>Công cụ</th><th>Độ</th><th>Kết luận kiểm chứng</th></tr>"
            + "".join(rows) + "</table>")


def decision_html(trace):
    rows = []
    for c in trace["checkpoints"]:
        rows.append(f"<tr><td>{html.escape(c.get('id',''))}</td><td>{html.escape(c.get('kind',''))}</td>"
                    f"<td>{html.escape((c.get('decision','') or '')[:120])}</td></tr>")
    return ("<table><tr><th>#</th><th>Phiên (kind)</th><th>Quyết định + cơ sở</th></tr>"
            + "".join(rows) + "</table>")


CSS = """
@page { size: A4; margin: 20mm 18mm 18mm 18mm;
  @top-right { content: "Ritsu · Reasoning Trace — Nhật ký tư duy 4S"; font-family:'DejaVu Sans'; font-size:8pt; color:#9AA6B2; }
  @bottom-center { content: counter(page); font-family:'DejaVu Sans'; font-size:9pt; color:#6B7785; } }
@page :first { @top-right { content:""; } @bottom-center { content:""; } }
body { font-family:'DejaVu Sans',sans-serif; line-height:1.5; color:#14222B; font-size:10.5pt; }
.cover { background:linear-gradient(150deg,#051C2C,#034B6F); color:#EAF2F7; padding:30mm 16mm 16mm; margin:-20mm -18mm 8mm; }
.cover .rule { width:36mm; height:3pt; background:#00A9F4; margin-bottom:9mm; }
.cover h1 { font-family:'DejaVu Serif',serif; font-size:27pt; margin:0 0 5mm; color:#fff; line-height:1.15; }
.cover .sub { font-family:'DejaVu Serif',serif; font-style:italic; font-size:12.5pt; color:#BFD6E6; }
.cover .meta { font-size:8.5pt; color:#8FAEC2; margin-top:8mm; border-top:1px solid #18465F; padding-top:4mm; }
.stat { display:inline-block; margin:0 6mm 2mm 0; font-size:9pt; color:#BFD6E6; }
.stat b { color:#00A9F4; font-size:14pt; }
h1 { font-family:'DejaVu Serif',serif; font-size:17pt; color:#051C2C; border-bottom:2.2px solid #00A9F4; padding-bottom:3mm; margin:7mm 0 4mm; }
h2 { font-size:12.5pt; color:#034B6F; margin:5mm 0 2mm; }
img { display:block; width:100%; max-width:172mm; margin:4mm auto; border:1px solid #E1E8EC; }
table { border-collapse:collapse; width:100%; font-size:8.3pt; margin:3mm 0; page-break-inside:avoid; }
th,td { border:0.8px solid #D4DCE2; padding:1.5mm 2.2mm; text-align:left; vertical-align:top; }
th { background:#051C2C; color:#fff; font-size:8.2pt; }
tr:nth-child(even) td { background:#F2F7FA; }
blockquote { border-left:3px solid #00A9F4; background:#EAF7FD; padding:2.5mm 5mm; margin:3mm 0; color:#0B2A3A; }
strong { color:#051C2C; }
.section { page-break-before: always; }
"""


def main():
    run = resolve_run(sys.argv[1] if len(sys.argv) > 1 else None)
    if not run:
        print(f"[FAIL] run folder not found: {sys.argv[1:] or '(missing arg)'}"); sys.exit(1)
    tj = run / "trace.json"
    if not tj.exists():
        print(f"[FAIL] {tj} missing — run trace-extract.cjs first."); sys.exit(1)
    trace = json.loads(tj.read_text())
    dd = run / "trace-diagrams"; dd.mkdir(exist_ok=True)
    draw_flow(trace, dd / "flow.png")
    draw_timeline(trace, dd / "timeline.png")
    draw_tools(trace, dd / "tools.png")

    narr_path = run / "reasoning-trace.md"
    narration = narr_path.read_text() if narr_path.exists() else auto_narration(trace)
    s = trace["stats"]

    body = f"""<div class="cover"><div class="rule"></div>
      <h1>Nhật ký tư duy 4S — Reasoning Trace</h1>
      <div class="sub">Hành trình phân tích / lựa chọn / ra quyết định của engine /think mckinsey<br/>cho run: <b>{html.escape(trace['slug'])}</b></div>
      <div class="meta">
        <span class="stat"><b>{s['checkpoints']}</b> checkpoint</span>
        <span class="stat"><b>{s['analyses']}</b> phân tích</span>
        <span class="stat"><b>{s['hitl_receipts']}</b> HITL receipt</span>
        <span class="stat"><b>{s['porpoises']}</b> porpoise</span>
        <span class="stat"><b>{s['external_numbers']}</b> số liệu ngoài</span>
        <br/>Ritsu · ritsu-works · /think mckinsey · thinking-toolkit v3.3 reasoning-trace
      </div></div>
      <h1>1 · Sơ đồ luồng tư duy 4S</h1>
      <img src="trace-diagrams/flow.png"/>
      <h1>2 · Dòng thời gian các phiên</h1>
      <img src="trace-diagrams/timeline.png"/>
      <h1>3 · Công cụ đã dùng để lấy dữ liệu</h1>
      <img src="trace-diagrams/tools.png"/>
      <div class="section"><h1>4 · Tường thuật hành trình (theo 4S)</h1>{md_to_html(narration)}</div>
      <div class="section"><h1>5 · Sổ truy xuất dữ liệu (provenance ledger)</h1>{ledger_html(trace)}</div>
      <h1>6 · Nhật ký quyết định</h1>{decision_html(trace)}
    """
    htmldoc = f"<!DOCTYPE html><html lang='vi'><head><meta charset='utf-8'></head><body>{body}</body></html>"
    (run / "reasoning-trace.html").write_text(htmldoc, encoding="utf-8")
    try:
        from weasyprint import HTML, CSS as WCSS
        from weasyprint.text.fonts import FontConfiguration
        fc = FontConfiguration()
        out = run / "reasoning-trace.pdf"
        HTML(string=htmldoc, base_url=str(run)).write_pdf(str(out), stylesheets=[WCSS(string=CSS, font_config=fc)], font_config=fc)
        print(f"[OK] reasoning-trace.pdf → {out} ({out.stat().st_size // 1024} KB)")
    except Exception as e:
        print(f"[OK] reasoning-trace.html written; PDF step skipped ({e.__class__.__name__}: {e}). "
              f"Install weasyprint or print the HTML.")


if __name__ == "__main__":
    main()
