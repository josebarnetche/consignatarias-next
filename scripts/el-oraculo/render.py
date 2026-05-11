#!/usr/bin/env python3
"""
El Oráculo — render del manifiesto fundacional a PDF.

Inputs:
    docs/EL-ORACULO-MANIFIESTO.md   (escrito por agent 1)
    scripts/el-oraculo/data-pack.json (escrito por agent 3)
    scripts/el-oraculo/template.html  (este dir)

Output:
    scripts/el-oraculo/output/el-oraculo.html
    scripts/el-oraculo/output/el-oraculo.pdf
    public/el-oraculo/manifiesto.pdf  (si --publish)
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
from datetime import date
from pathlib import Path

try:
    import markdown as md_lib
except ImportError:
    md_lib = None

ROOT = Path(__file__).resolve().parent.parent.parent
HERE = Path(__file__).resolve().parent
DOCS = ROOT / "docs"
PUBLIC = ROOT / "public"
OUT = HERE / "output"
OUT.mkdir(parents=True, exist_ok=True)

VERSION = "1.0"


def fmt_ars(x: float, decimals: int = 0) -> str:
    s = f"{x:,.{decimals}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_int(x: int) -> str:
    return f"{x:,}".replace(",", ".")


def fmt_pct(x: float, plus: bool = True) -> str:
    sign = "+" if (plus and x > 0) else ""
    return f"{sign}{x:.1f}%".replace(".", ",")


def load_manifiesto() -> str:
    p = DOCS / "EL-ORACULO-MANIFIESTO.md"
    if not p.exists():
        return "# Placeholder manifiesto\n\n> Esperando agent 1 con el contenido.\n"
    return p.read_text()


def load_data_pack() -> dict:
    p = HERE / "data-pack.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text())


def kpi_card(label: str, value: str, sub: str = "", cls: str = "") -> str:
    return f'''<div class="kpi">
      <div class="kpi-label">{label}</div>
      <div class="kpi-value {cls}">{value}</div>
      {f'<div class="kpi-sub">{sub}</div>' if sub else ''}
    </div>'''


def build_cover_kpis(data: dict) -> str:
    """3 KPIs en el cover. Adaptables a lo que el data pack tenga."""
    cards = []

    # KPI 1 — INMAG today close
    inmag_today = data.get("inmag_today", {})
    close = inmag_today.get("close")
    if close:
        cards.append(kpi_card(
            "INMAG cierre",
            f"${fmt_ars(close, 0)}",
            sub=f"/kg vivo · {inmag_today.get('date', 's/d')}"
        ))

    # KPI 2 — Canales no-MAG
    channels = data.get("channels_split", {}).get("fauba_2018", {})
    if channels:
        mag_pct = channels.get("mag", 12)
        no_mag = 100 - mag_pct
        cards.append(kpi_card(
            "Mercado no-MAG",
            f"{no_mag}%",
            sub="del volumen físico nacional"
        ))

    # KPI 3 — años de archivo
    inmag_series = data.get("inmag_series", {})
    n_days = inmag_series.get("n_days_observed", 0)
    if n_days:
        cards.append(kpi_card(
            "Archivo INMAG",
            f"{fmt_int(n_days)}",
            sub="días hábiles observados"
        ))

    while len(cards) < 3:
        cards.append('<div class="kpi"><div class="kpi-label">—</div><div class="kpi-value">—</div></div>')

    return "".join(cards)


def md_to_html(text: str) -> str:
    """Convertir markdown a HTML editorial-style. Usa markdown lib si disponible,
    sino conversion mínima manual."""
    if md_lib:
        return md_lib.markdown(text, extensions=['tables', 'fenced_code', 'attr_list'])
    # Fallback simple
    html = text
    # Tablas no soportadas en fallback, dejar tal cual
    # Headers
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    # Bold/italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', html)
    # Paragraphs (very rough)
    parts = re.split(r'\n\s*\n', html)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if p.startswith('<h') or p.startswith('<ul') or p.startswith('<ol') or p.startswith('<table') or p.startswith('<blockquote') or p.startswith('<div'):
            out.append(p)
        else:
            out.append(f'<p>{p}</p>')
    return '\n'.join(out)


# Sectioning rules: each top-level "# " in the manifiesto becomes the cover (skipped),
# each "## " becomes a new <section class="page">, "### " stays inline.

ROMAN_NUMERALS = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
]


def split_into_sections(manifiesto_md: str) -> list[dict]:
    """Split manifiesto by ## headers (sections). The first '# ' line (title) is skipped
    — it's on the cover. Returns list of {label, title, sub, body_md}."""
    # Remove the first top-level heading
    lines = manifiesto_md.split("\n")
    out = []
    cur = None
    body: list[str] = []
    section_idx = 0

    for line in lines:
        m_h1 = re.match(r'^# (.+)$', line)
        m_h2 = re.match(r'^## (.+)$', line)
        if m_h1:
            continue  # skip top-level title
        if m_h2:
            # flush previous
            if cur is not None:
                cur["body_md"] = "\n".join(body).strip()
                out.append(cur)
                body = []
            section_idx += 1
            title = m_h2.group(1).strip()
            # Detect "I. Title" or "Roman. Title" — extract roman + clean title
            label = ROMAN_NUMERALS[section_idx - 1] if section_idx - 1 < len(ROMAN_NUMERALS) else str(section_idx)
            sub = ""
            cur = {"label": label, "title": title, "sub": sub, "body_md": ""}
            continue
        body.append(line)

    if cur is not None:
        cur["body_md"] = "\n".join(body).strip()
        out.append(cur)

    return out


def render_section_page(sec: dict, version: str) -> str:
    """Render one <section class="page"> from a section dict."""
    body_html = md_to_html(sec["body_md"])
    return f'''
<section class="page">
  <div class="chrome">
    <div><span class="brand">consignatarias.com</span><span class="dot">·</span>El Oráculo<span class="dot" style="margin: 0 6px">·</span><span style="color: var(--muted)">§ {sec["label"]}</span></div>
    <div>v{version}</div>
  </div>

  <div class="section-roman">
    <div class="roman-num">{sec["label"]}</div>
    <div>
      <div class="section-heading">{sec["title"]}</div>
      {f'<div class="section-sub">{sec["sub"]}</div>' if sec["sub"] else ''}
    </div>
  </div>

  <div class="editorial">
    {body_html}
  </div>

  <div class="footer">
    <div>El Oráculo · Manifiesto fundacional</div>
    <div class="right">§ {sec["label"]} · v{version}</div>
  </div>
</section>
'''


def render() -> tuple[Path, Path]:
    template = (HERE / "template.html").read_text()
    manifiesto = load_manifiesto()
    data = load_data_pack()

    sections = split_into_sections(manifiesto)
    body_html = "".join(render_section_page(s, VERSION) for s in sections)
    cover_kpis = build_cover_kpis(data)

    html = template.replace("{{ today }}", date.today().strftime("%d/%m/%Y"))
    html = html.replace("{{ version }}", VERSION)
    html = html.replace("{{ cover_kpis }}", cover_kpis)
    html = html.replace("{{ body }}", body_html)

    out_html = OUT / "el-oraculo.html"
    out_html.write_text(html)
    print(f"✓ HTML: {out_html}")

    out_pdf = OUT / "el-oraculo.pdf"
    chrome_candidates = []
    if os.environ.get("CHROME_BIN"):
        chrome_candidates.append(os.environ["CHROME_BIN"])
    chrome_candidates.extend([
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "google-chrome", "chromium",
    ])
    for chrome in chrome_candidates:
        if Path(chrome).exists() or os.system(f"command -v {chrome} >/dev/null 2>&1") == 0:
            cmd = (
                f'"{chrome}" --headless=new --disable-gpu --no-sandbox --disable-dev-shm-usage '
                f'--no-pdf-header-footer '
                f'--print-to-pdf="{out_pdf}" "file://{out_html.absolute()}"'
            )
            rc = os.system(cmd)
            if rc == 0:
                print(f"✓ PDF:  {out_pdf}")
                return out_html, out_pdf
    print("⚠ No se pudo renderizar PDF (Chrome no encontrado)")
    return out_html, None


def publish_to_public(out_pdf: Path):
    """Copy rendered PDF to public/el-oraculo/manifiesto.pdf."""
    target_dir = PUBLIC / "el-oraculo"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "manifiesto.pdf"
    import shutil
    shutil.copy2(out_pdf, target)
    print(f"✓ Published: {target}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--publish", action="store_true", help="Copiar PDF a public/el-oraculo/")
    args = ap.parse_args()

    _, out_pdf = render()

    if args.publish and out_pdf and out_pdf.exists():
        publish_to_public(out_pdf)


if __name__ == "__main__":
    main()
