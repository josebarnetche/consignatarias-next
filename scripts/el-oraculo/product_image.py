#!/usr/bin/env python3
"""
El Oráculo — imágenes de producto (OG + cuadrado + portrait).

Uso:
    python scripts/el-oraculo/product_image.py
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
from pathlib import Path
from string import Template
from datetime import date

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DATA = ROOT / "src" / "lib" / "data"
OUT = HERE / "output"
OUT.mkdir(parents=True, exist_ok=True)

_MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME = os.environ.get("CHROME_BIN") or (_MAC_CHROME if Path(_MAC_CHROME).exists() else "google-chrome")


def fmt_ars(x: float, decimals: int = 0) -> str:
    s = f"{x:,.{decimals}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


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
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-weight: 600;
}
.brand-display {
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 0.9;
  text-transform: uppercase;
  color: var(--text);
}
.tagline {
  color: var(--muted);
  line-height: 1.45;
  letter-spacing: -0.005em;
}
.kpi-row { display: flex; gap: 24px; }
.kpi {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 4px;
  padding: 22px 28px;
  flex: 1;
}
.kpi-label {
  font-size: 13px;
  color: var(--muted-2);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
  font-weight: 500;
}
.kpi-value {
  font-size: 38px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
}
.kpi-sub {
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted);
}
.foot {
  font-size: 13px;
  color: var(--muted-2);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.foot strong { color: var(--text); }
"""

SQUARE_TEMPLATE = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>El Oráculo</title>
<style>$common
.page-square {
  width: 1080px; height: 1080px;
  padding: 80px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.brand-display { font-size: 156px; }
.tagline { font-size: 24px; max-width: 800px; margin-top: 28px; }
</style></head>
<body><div class="page-square">
  <div class="brandmark">
    <span class="pulse"></span>
    <strong>consignatarias.com</strong>
    <span class="dot">·</span>
    Manifiesto fundacional
  </div>
  <div>
    <div class="eyebrow" style="font-size: 22px; margin-bottom: 36px;">Mesa de mercado · documento abierto</div>
    <div class="brand-display">El<br/>Oráculo</div>
    <p class="tagline">El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.</p>
  </div>
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">INMAG cierre</div>
      <div class="kpi-value">$$$close</div>
      <div class="kpi-sub">/kg vivo · $close_date</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Mercado no-MAG</div>
      <div class="kpi-value">88%</div>
      <div class="kpi-sub">del volumen físico</div>
    </div>
  </div>
  <div class="foot"><strong>16 páginas</strong> · PDF abierto · sin email · sin tarjeta</div>
</div></body></html>
"""

OG_TEMPLATE = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>El Oráculo</title>
<style>$common
.page-og {
  width: 1200px; height: 630px;
  padding: 56px 64px;
  display: grid; grid-template-columns: 1.4fr 1fr; gap: 48px;
}
.left { display: flex; flex-direction: column; justify-content: space-between; }
.brand-display { font-size: 116px; }
.tagline { font-size: 17px; max-width: 460px; margin-top: 18px; }
.right { display: flex; flex-direction: column; justify-content: center; gap: 18px; }
</style></head>
<body><div class="page-og">
  <div class="left">
    <div class="brandmark" style="font-size: 13px;">
      <span class="pulse" style="width: 9px; height: 9px;"></span>
      <strong>consignatarias.com</strong>
    </div>
    <div>
      <div class="eyebrow" style="font-size: 14px; margin-bottom: 16px;">Manifiesto fundacional</div>
      <div class="brand-display">El Oráculo</div>
      <p class="tagline">El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.</p>
    </div>
    <div class="foot" style="font-size: 11px;"><strong>16 páginas</strong> · PDF abierto · sin email</div>
  </div>
  <div class="right">
    <div class="kpi">
      <div class="kpi-label" style="font-size: 11px;">INMAG cierre</div>
      <div class="kpi-value" style="font-size: 38px;">$$$close</div>
      <div class="kpi-sub" style="font-size: 11px;">/kg vivo · $close_date</div>
    </div>
    <div class="kpi">
      <div class="kpi-label" style="font-size: 11px;">Mercado no-MAG</div>
      <div class="kpi-value" style="font-size: 38px;">88%</div>
      <div class="kpi-sub" style="font-size: 11px;">del volumen físico</div>
    </div>
  </div>
</div></body></html>
"""

PORTRAIT_TEMPLATE = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>El Oráculo</title>
<style>$common
.page-portrait {
  width: 768px; height: 1024px;
  padding: 56px;
  display: flex; flex-direction: column; justify-content: space-between;
  border: 1px solid var(--line);
  box-shadow: 0 32px 80px rgba(0,0,0,.5);
}
.brand-display { font-size: 102px; }
.tagline { font-size: 14px; margin-top: 18px; max-width: 580px; }
</style></head>
<body><div class="page-portrait">
  <div class="brandmark" style="font-size: 13px;">
    <span class="pulse" style="width: 8px; height: 8px;"></span>
    <strong>consignatarias.com</strong>
    <span class="dot">·</span>
    Manifiesto fundacional
  </div>
  <div>
    <div class="eyebrow" style="font-size: 12px; margin-bottom: 18px;">Mesa de mercado · documento abierto</div>
    <div class="brand-display">El<br/>Oráculo</div>
    <p class="tagline">El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.</p>
  </div>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div class="kpi" style="padding: 16px;">
      <div class="kpi-label" style="font-size: 11px;">INMAG cierre</div>
      <div class="kpi-value" style="font-size: 28px;">$$$close</div>
      <div class="kpi-sub" style="font-size: 11px;">$close_date</div>
    </div>
    <div class="kpi" style="padding: 16px;">
      <div class="kpi-label" style="font-size: 11px;">Mercado no-MAG</div>
      <div class="kpi-value" style="font-size: 28px;">88%</div>
      <div class="kpi-sub" style="font-size: 11px;">del volumen físico</div>
    </div>
  </div>
  <div class="foot" style="font-size: 11px;"><strong>16 páginas</strong> · PDF abierto</div>
</div></body></html>
"""


def render_image(html_content: str, w: int, h: int, out_path: Path, scale: float = 2.0) -> None:
    tmp_html = out_path.with_suffix(".html")
    tmp_html.write_text(html_content)
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
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
    ap.add_argument("--data-pack", default=str(HERE / "data-pack.json"))
    args = ap.parse_args()

    # Load data pack for current INMAG
    market = json.loads((DATA / "market-prices.json").read_text())
    close = market["inmag"]["current"]
    close_date = market.get("lastUpdate", date.today().strftime("%Y-%m-%d"))
    try:
        close_date_short = "/".join(reversed(close_date.split("-")))
        close_date_short = close_date_short.replace("//", "/")
    except Exception:
        close_date_short = close_date

    ctx = {
        "common": COMMON_STYLE,
        "close": fmt_ars(close, 0),
        "close_date": close_date_short,
    }

    variants = [
        ("og-1200x630.png", 1200, 630, OG_TEMPLATE),
        ("square-1080x1080.png", 1080, 1080, SQUARE_TEMPLATE),
        ("portrait-768x1024.png", 768, 1024, PORTRAIT_TEMPLATE),
    ]
    for filename, w, h, tpl in variants:
        out_path = OUT / f"el-oraculo-{filename}"
        html = Template(tpl).safe_substitute(**ctx)
        render_image(html, w, h, out_path)
        if out_path.exists():
            print(f"✓ {out_path.name}  ({out_path.stat().st_size // 1024} KB)")
        else:
            print(f"✗ FAILED {filename}")


if __name__ == "__main__":
    main()
