#!/usr/bin/env python3
"""fonts.py — ensure the bundled reading fonts (Source Serif 4 + Inter, full
Vietnamese coverage) exist as static TTFs in a gitignored runtime cache. On first
run, downloads the variable fonts and instances them to the needed weights.
Idempotent; network only on cold cache."""
import sys, urllib.request
from pathlib import Path

STATICS = [
    "SourceSerif4-Regular.ttf", "SourceSerif4-SemiBold.ttf", "SourceSerif4-Bold.ttf",
    "SourceSerif4-Italic.ttf", "SourceSerif4-SemiBoldItalic.ttf",
    "Inter-Regular.ttf", "Inter-Medium.ttf", "Inter-SemiBold.ttf", "Inter-Bold.ttf",
]
SS4 = "https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf"
SS4I = "https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4-Italic%5Bopsz%2Cwght%5D.ttf"
INTER = "https://github.com/rsms/inter/raw/master/docs/font-files/InterVariable.woff2"


def _dl(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=90) as r, open(dest, "wb") as f:
        f.write(r.read())


def ensure_fonts(dest):
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    if all((dest / s).exists() for s in STATICS):
        return dest
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    tmp = dest / "_var"
    tmp.mkdir(exist_ok=True)
    _dl(SS4, tmp / "ss4.ttf"); _dl(SS4I, tmp / "ss4i.ttf"); _dl(INTER, tmp / "inter.woff2")

    def inst(src, axes, out):
        f = TTFont(src)
        instantiateVariableFont(f, axes, inplace=True)
        f.save(out)

    for w, name in [(400, "Regular"), (600, "SemiBold"), (700, "Bold")]:
        inst(tmp / "ss4.ttf", {"wght": w, "opsz": 11 if w < 700 else 18}, dest / f"SourceSerif4-{name}.ttf")
    for w, name in [(400, "Italic"), (600, "SemiBoldItalic")]:
        inst(tmp / "ss4i.ttf", {"wght": w, "opsz": 11}, dest / f"SourceSerif4-{name}.ttf")
    for w, name in [(400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")]:
        inst(tmp / "inter.woff2", {"wght": w}, dest / f"Inter-{name}.ttf")
    for p in tmp.glob("*"):
        p.unlink()
    tmp.rmdir()
    return dest


if __name__ == "__main__":
    d = ensure_fonts(sys.argv[1])
    print("fonts ready:", d)
