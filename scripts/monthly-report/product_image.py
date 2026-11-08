#!/usr/bin/env python3
"""
Imágenes de producto de El Corredor, con la estética del v2 (papel blanco, Inter,
el azul de marca) y los MISMOS números que el PDF:

  · el-corredor-YYYY-MM-cover-portrait-768x1024.png  → tapa en la página del informe
  · el-corredor-YYYY-MM-og-1200x630.png              → OG / tarjeta de Twitter
  · el-corredor-YYYY-MM-square-1080x1080.png         → cuadrado para redes

Los nombres son los que `publish.py` copia a public/el-corredor/ (cover-, og- y
square-<mes-año>.png) y los que el manifest ya espera.

POR QUÉ SE REEMPLAZÓ EL ANTERIOR (hoy `product_image_v1.py`, solo para `--v1`):
tenía estética de terminal oscura y calculaba su propio interanual al dólar
oficial, así que la tarjeta decía +20,2 % mientras el PDF del mismo mes decía
+19,5 % al blue. Acá los números salen de `informe_v2.cuatro_numeros()` y de
`Paquete.variacion()`, las mismas funciones que imprime el PDF.

Uso:
    python product_image.py --month 2026-10 [--salida carpeta]
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path
from string import Template

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

import datos as D  # noqa: E402
import datos_v2 as D2  # noqa: E402
import graficos as G  # noqa: E402
import informe as I  # noqa: E402
import informe_v2 as I2  # noqa: E402
import piezas as P  # noqa: E402

CSS = """
$fuentes
html, body { margin: 0; padding: 0; background: #fff; }
body { width: ${ancho}px; height: ${alto}px; overflow: hidden; font-family: Inter, system-ui, sans-serif;
       color: #18181b; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
.l { box-sizing: border-box; width: 100%; height: 100%; padding: ${pad}px; display: flex; flex-direction: column; }
.cab { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #18181b;
       padding-bottom: ${u}px; margin-bottom: ${u2}px; }
.cab .marca { font-size: ${f1}px; font-weight: 600; letter-spacing: .02em; }
.cab .ed { font-size: ${f1}px; color: #71717a; }
.rot { font-size: ${f0}px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #71717a; margin: 0 0 ${u}px; }
.hero { font-size: ${fh}px; line-height: 1; font-weight: 600; color: #1d4ed8; letter-spacing: -0.02em; }
.sub { font-size: ${f1}px; color: #52525b; margin-top: ${u}px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: ${u}px; margin-top: ${u2}px; }
.n { border: 2px solid #d4d4d8; border-radius: 10px; padding: ${u}px; }
.n .et { font-size: ${f0}px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #71717a; }
.n .val { font-size: ${fv}px; line-height: 1.1; font-weight: 600; margin-top: 6px; }
.n .delta { font-size: ${f0}px; font-weight: 600; }
.sube { color: #065f46; } .baja { color: #b91c1c; } .neutro { color: #52525b; }
.flex { flex: 1; }
.pie { border-top: 2px solid #18181b; padding-top: ${u}px; display: flex; justify-content: space-between;
       align-items: baseline; gap: ${u}px; }
.pie .f { font-size: ${f0}px; color: #71717a; line-height: 1.35; }
.pie .url { font-size: ${f1}px; font-weight: 600; color: #1d4ed8; white-space: nowrap; }
"""


def _html(p: D.Paquete, x: D2.Extra, ancho: int, alto: int, escala: float, con_numeros: int) -> str:
    """Una sola plantilla para los tres tamaños: cambia la escala y cuántos de los cuatro números entran."""
    e = escala
    css = Template(CSS).substitute(
        fuentes=I.fuentes_embebidas(), ancho=ancho, alto=alto, pad=round(56 * e), u=round(14 * e), u2=round(26 * e),
        f0=round(17 * e), f1=round(22 * e), fh=round(96 * e), fv=round(48 * e))
    c = p.cierre
    nums = I2.cuatro_numeros(p, x)[:con_numeros]
    tarjetas = "".join(f'<div class="n"><div class="et">{n["et"]}</div><div class="val">{n["val"]}</div>'
                       f'<div>{n["delta"]}</div></div>' for n in nums)
    grid = f'<div class="grid">{tarjetas}</div>' if nums else ""
    return (
        f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>{css}</style></head><body><div class="l">'
        f'<div class="cab"><span class="marca">EL CORREDOR</span><span class="ed">{p.mes.etiqueta}</span></div>'
        f'<p class="rot">Índice Novillo al cierre del mes</p>'
        f'<div class="hero">{G.ars(c["ars"])}</div>'
        f'<div class="sub">por kilo vivo · {G.usd(c["usd_blue"])} al blue · rueda del {I2.fecha_ar(c["fecha"])}</div>'
        f'{grid}<div class="flex"></div>'
        f'<div class="pie"><div class="f">Informe mensual del mercado ganadero argentino. Fuente: MAG y dólar blue; '
        f'cálculo propio. Dato al {I2.fecha_ar(c["fecha"])}.</div><div class="url">consignatarias.com.ar</div></div>'
        f'</div></body></html>'
    )


#: (sufijo del archivo, ancho, alto, escala tipográfica, cuántos de los cuatro números)
VARIANTES = [
    ("cover-portrait-768x1024", 768, 1024, 0.95, 4),
    ("og-1200x630", 1200, 630, 1.0, 2),
    ("square-1080x1080", 1080, 1080, 1.25, 4),
]


def generar(p: D.Paquete, x: D2.Extra, salida: Path) -> list[Path]:
    salida.mkdir(parents=True, exist_ok=True)
    hechas = []
    for sufijo, w, h, esc, n in VARIANTES:
        base = salida / f"el-corredor-{p.mes.ym}-{sufijo}"
        hp = base.with_suffix(".html")
        hp.write_text(_html(p, x, w, h, esc, n), encoding="utf-8")
        pp = base.with_suffix(".png")
        if P.a_png(hp, pp, (w, h)):
            print(f"  ✓ {pp.name} ({pp.stat().st_size // 1024} KB)")
            hechas.append(pp)
        else:
            print(f"  ✗ {pp.name}: no se pudo rasterizar (¿chromium?)")
        hp.unlink(missing_ok=True)
    return hechas


def main() -> int:
    ap = argparse.ArgumentParser(description="El Corredor — imágenes de producto (tapa, OG, cuadrado)")
    ap.add_argument("--month", default="auto", help="YYYY-MM o 'auto' (el mes anterior)")
    ap.add_argument("--salida", default=None, help="carpeta de salida (default: output/)")
    a = ap.parse_args()
    if a.month == "auto":
        hoy = date.today()
        ym = f"{hoy.year - (hoy.month == 1)}-{(hoy.month - 1) or 12:02d}"
    else:
        ym = a.month
    p, x = D2.cargar(ym)
    return 0 if generar(p, x, Path(a.salida) if a.salida else I.SALIDA) else 1


if __name__ == "__main__":
    raise SystemExit(main())
