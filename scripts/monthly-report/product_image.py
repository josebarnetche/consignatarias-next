#!/usr/bin/env python3
"""
Genera imágenes de producto para "El Corredor":
- og-1200x630.png  (OG / Twitter Card)
- square-1080.png  (Instagram / LinkedIn carousel)
- cover-portrait-768x1024.png (landing preview)

Uso:
    python product_image.py --month 2026-04
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
from pathlib import Path
from string import Template
from datetime import datetime

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "src" / "lib" / "data"
CACHE = HERE / "cache"
OUT = HERE / "output"
OUT.mkdir(parents=True, exist_ok=True)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


def fmt_ars(x: float, decimals: int = 0) -> str:
    s = f"{x:,.{decimals}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_pct(x: float, plus: bool = True) -> str:
    sign = "+" if (plus and x > 0) else ""
    return f"{sign}{x:.1f}%".replace(".", ",")


_MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME = os.environ.get("CHROME_BIN") or (_MAC_CHROME if Path(_MAC_CHROME).exists() else "google-chrome")

# Common stylesheet for product images
COMMON_STYLE = """
:root {
  --bg: #09090b;
  --panel: #18181b;
  --line: #27272a;
  --text: #fafafa;
  --muted: #a1a1aa;
  --muted-2: #71717a;
  --accent: #38bdf8;
  --pos: #10b981;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg);
  color: var(--text);
  font-family: 'SF Mono','Cascadia Code','JetBrains Mono','Fira Code',ui-monospace,Menlo,Consolas,monospace;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: 'tnum' 1;
}
.brandmark {
  display: flex;
  align-items: center;
  font-size: 18px;
  letter-spacing: 0.18em;
  color: var(--muted-2);
  text-transform: uppercase;
}
.pulse {
  width: 12px; height: 12px;
  background: var(--accent);
  border-radius: 50%;
  margin-right: 14px;
  box-shadow: 0 0 0 6px rgba(56,189,248,.18);
}
.brandmark strong { color: var(--text); margin-right: 14px; }
.brandmark .dot { color: var(--accent); margin: 0 12px; }
.eyebrow {
  color: var(--accent);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 600;
}
.brand-display {
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 0.92;
  text-transform: uppercase;
  color: var(--text);
}
.issue {
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 500;
}
.kpi {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 4px;
  padding: 24px;
}
.kpi-label {
  font-size: 16px;
  color: var(--muted-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
  font-weight: 500;
}
.kpi-value {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
}
.kpi-value.pos { color: var(--pos); }
.kpi-sub {
  margin-top: 10px;
  font-size: 14px;
  color: var(--muted);
}
.tagline {
  color: var(--muted);
  font-size: 18px;
  line-height: 1.55;
}
.foot {
  font-size: 14px;
  color: var(--muted-2);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.foot strong { color: var(--text); }
"""

# === SQUARE 1080x1080 ===
SQUARE_TEMPLATE = """<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>El Corredor — $issue_label</title>
<style>$common
.page-square {
  width: 1080px; height: 1080px;
  padding: 80px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.brand-display { font-size: 132px; }
.issue { font-size: 36px; }
.kpis-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
</style></head>
<body>
<div class="page-square">
  <div class="brandmark">
    <span class="pulse"></span>
    <strong>consignatarias.com</strong>
    <span class="dot">·</span>
    Mercado Decision Infrastructure
  </div>

  <div>
    <div class="eyebrow" style="font-size: 18px; margin-bottom: 28px;">Mesa de hacienda argentina · cierre mensual</div>
    <div class="brand-display">El<br/>Corredor</div>
    <div class="issue" style="margin-top: 24px;">$issue_label</div>
    <p class="tagline" style="margin-top: 32px; max-width: 800px;">
      Cierre mensual del mercado bovino argentino.
      INMAG en USD reales, comparable interanual, 18 buckets del MAG, lectura del ciclo y tesis del mes próximo.
    </p>
  </div>

  <div class="kpis-row">
    <div class="kpi">
      <div class="kpi-label">Cierre INMAG</div>
      <div class="kpi-value">$$${inmag_close}</div>
      <div class="kpi-sub">/kg vivo · $close_date_short</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Var. interanual USD oficial</div>
      <div class="kpi-value pos">$var_usd_yoy</div>
      <div class="kpi-sub">vs. mismo mes año previo</div>
    </div>
  </div>

  <div class="foot">
    <strong>Edición $edition_short</strong> · 12 páginas · PDF gratis con email
  </div>
</div>
</body></html>
"""

# === OG 1200x630 ===
OG_TEMPLATE = """<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>El Corredor — $issue_label</title>
<style>$common
.page-og {
  width: 1200px; height: 630px;
  padding: 56px 64px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}
.left { display: flex; flex-direction: column; justify-content: space-between; }
.brand-display { font-size: 96px; }
.issue { font-size: 24px; }
.right { display: flex; flex-direction: column; justify-content: center; gap: 16px; }
</style></head>
<body>
<div class="page-og">
  <div class="left">
    <div class="brandmark" style="font-size: 14px;">
      <span class="pulse" style="width: 9px; height: 9px;"></span>
      <strong>consignatarias.com</strong>
    </div>

    <div>
      <div class="eyebrow" style="font-size: 14px; margin-bottom: 18px;">Mesa de hacienda argentina · cierre mensual</div>
      <div class="brand-display">El Corredor</div>
      <div class="issue" style="margin-top: 18px;">$issue_label</div>
    </div>

    <div class="foot" style="font-size: 12px;">
      <strong>Edición $edition_short</strong> · 12 páginas · PDF gratis con email
    </div>
  </div>

  <div class="right">
    <div class="kpi">
      <div class="kpi-label" style="font-size: 12px;">Cierre INMAG</div>
      <div class="kpi-value" style="font-size: 36px;">$$${inmag_close}</div>
      <div class="kpi-sub" style="font-size: 12px;">/kg vivo · $close_date_short</div>
    </div>
    <div class="kpi">
      <div class="kpi-label" style="font-size: 12px;">Var. interanual USD oficial</div>
      <div class="kpi-value pos" style="font-size: 36px;">$var_usd_yoy</div>
      <div class="kpi-sub" style="font-size: 12px;">en términos reales</div>
    </div>
  </div>
</div>
</body></html>
"""

# === COVER PORTRAIT 768x1024 (landing preview) ===
PORTRAIT_TEMPLATE = """<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>El Corredor — $issue_label</title>
<style>$common
.page-portrait {
  width: 768px; height: 1024px;
  padding: 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--line);
  box-shadow: 0 32px 80px rgba(0,0,0,0.5);
}
.brand-display { font-size: 84px; }
.issue { font-size: 22px; }
</style></head>
<body>
<div class="page-portrait">
  <div class="brandmark" style="font-size: 13px;">
    <span class="pulse" style="width: 8px; height: 8px;"></span>
    <strong>consignatarias.com</strong>
    <span class="dot">·</span>
    Mercado Decision Infrastructure
  </div>

  <div>
    <div class="eyebrow" style="font-size: 12px; margin-bottom: 18px;">Mesa de hacienda argentina · cierre mensual</div>
    <div class="brand-display">El<br/>Corredor</div>
    <div class="issue" style="margin-top: 18px;">$issue_label</div>
    <p class="tagline" style="margin-top: 28px; font-size: 14px; max-width: 580px;">
      Cierre mensual del mercado bovino argentino. INMAG en USD reales, comparable interanual,
      18 buckets del MAG, lectura del ciclo y tesis del mes próximo.
    </p>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div class="kpi" style="padding: 16px;">
      <div class="kpi-label" style="font-size: 11px; margin-bottom: 8px;">Cierre INMAG</div>
      <div class="kpi-value" style="font-size: 28px;">$$${inmag_close}</div>
      <div class="kpi-sub" style="font-size: 11px;">/kg · $close_date_short</div>
    </div>
    <div class="kpi" style="padding: 16px;">
      <div class="kpi-label" style="font-size: 11px; margin-bottom: 8px;">Var. interanual USD</div>
      <div class="kpi-value pos" style="font-size: 28px;">$var_usd_yoy</div>
      <div class="kpi-sub" style="font-size: 11px;">real, sin inflación</div>
    </div>
  </div>

  <div class="foot" style="font-size: 11px;">
    <strong>Edición $edition_short</strong> · 12 páginas · PDF gratis
  </div>
</div>
</body></html>
"""


def render_image(html_content: str, w: int, h: int, out_path: Path, scale: float = 2.0) -> None:
    """Render HTML to PNG via Chrome headless."""
    tmp_html = out_path.with_suffix(".html")
    tmp_html.write_text(html_content)
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--window-size={w},{h}",
        f"--screenshot={out_path}",
        f"--force-device-scale-factor={scale}",
        f"file://{tmp_html.absolute()}",
    ]
    rc = subprocess.run(cmd, capture_output=True, text=True)
    if rc.returncode != 0:
        print(f"⚠ Chrome failed: {rc.stderr[:300]}")
    tmp_html.unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", default="2026-04", help="YYYY-MM")
    args = ap.parse_args()

    # Load data
    market = json.loads((DATA / "market-prices.json").read_text())
    usd_cache = json.loads((CACHE / "usd-monthly.json").read_text())

    y, m = map(int, args.month.split("-"))
    series = market["inmag"]["series"]
    days = [p for p in series if p["date"].startswith(args.month)]
    inmag_close = days[-1]["value"] if days else market["inmag"]["current"]
    close_date = days[-1]["date"] if days else market.get("lastUpdate", "")
    close_date_short = datetime.strptime(close_date, "%Y-%m-%d").strftime("%d/%m/%Y") if close_date else ""

    # Compute YoY USD
    prev_ym = f"{y - 1:04d}-{m:02d}"
    prev_days = [p for p in series if p["date"].startswith(prev_ym)]
    cur_usd = usd_cache["months"].get(args.month, {}).get("oficial", {}).get("venta_avg")
    prev_usd = usd_cache["months"].get(prev_ym, {}).get("oficial", {}).get("venta_avg")
    var_usd_yoy = "—"
    if days and prev_days and cur_usd and prev_usd:
        from statistics import mean
        cur_avg = mean(p["value"] for p in days)
        prev_avg = mean(p["value"] for p in prev_days)
        cur_usd_inmag = cur_avg / cur_usd
        prev_usd_inmag = prev_avg / prev_usd
        pct = (cur_usd_inmag - prev_usd_inmag) / prev_usd_inmag * 100
        var_usd_yoy = fmt_pct(pct)

    issue_label = f"{MONTHS_ES[m].title()} · {y}"
    edition_short = f"{m:02d}/{str(y)[2:]}"
    inmag_close_str = fmt_ars(inmag_close, 0)

    ctx = {
        "common": COMMON_STYLE,
        "issue_label": issue_label,
        "edition_short": edition_short,
        "inmag_close": inmag_close_str,
        "close_date_short": close_date_short,
        "var_usd_yoy": var_usd_yoy,
    }

    # Render each variant
    variants = [
        ("og-1200x630.png", 1200, 630, OG_TEMPLATE),
        ("square-1080x1080.png", 1080, 1080, SQUARE_TEMPLATE),
        ("cover-portrait-768x1024.png", 768, 1024, PORTRAIT_TEMPLATE),
    ]
    for filename, w, h, tpl in variants:
        out_path = OUT / f"el-corredor-{args.month}-{filename}"
        html = Template(tpl).safe_substitute(**ctx)
        render_image(html, w, h, out_path)
        if out_path.exists():
            print(f"✓ {out_path.name}  ({out_path.stat().st_size // 1024} KB)")
        else:
            print(f"✗ FAILED {filename}")


if __name__ == "__main__":
    main()
