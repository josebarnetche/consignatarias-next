#!/usr/bin/env python3
"""
El Corredor v2 — piezas para compartir (Instagram 1080×1350 y estados de
WhatsApp 1080×1920).

POR QUÉ NO SE USA `product_image.py`
Aquella genera las imágenes de tapa con otra estética (oscura, monoespaciada,
"Mercado Decision Infrastructure") y calcula su propio interanual contra el dólar
oficial: publicaba +20,2 % cuando el PDF del mismo mes decía +19,5 % al blue.
Una pieza que contradice al informe que la acompaña es peor que no tenerla.

Acá cada pieza se arma con los MISMOS datos (`datos_v2.cargar`), los MISMOS
gráficos (`graficos.py` / `graficos_v2.py`) y las MISMAS frases (`informe_v2`)
que el PDF: fondo blanco, Inter, el azul de marca. Lo único que cambia es el
lienzo. Y cada una lleva la línea de cita y consignatarias.com.ar, porque es lo
que sobrevive cuando la imagen circula sola.

Sin datos para una pieza, la pieza no se genera (y se avisa), igual que una
página del PDF.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

import datos as D  # noqa: E402
import datos_v2 as D2  # noqa: E402
import graficos as G  # noqa: E402
import graficos_v2 as G2  # noqa: E402
import informe as I  # noqa: E402
import informe_v2 as I2  # noqa: E402

IG = (1080, 1350)
WA = (1080, 1920)

CSS = """
$fuentes
html, body { margin: 0; padding: 0; background: #fff; }
body { width: ${ancho}px; height: ${alto}px; overflow: hidden; font-family: Inter, system-ui, sans-serif;
       color: #18181b; -webkit-font-smoothing: antialiased; }
.lienzo { box-sizing: border-box; width: 100%; height: 100%; padding: 72px 72px 64px; display: flex; flex-direction: column; }
.cab { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #18181b;
       padding-bottom: 18px; margin-bottom: 40px; }
.cab .marca { font-size: 26px; font-weight: 600; letter-spacing: .02em; }
.cab .ed { font-size: 22px; color: #71717a; }
h1 { font-size: 54px; line-height: 62px; font-weight: 600; margin: 0 0 28px; letter-spacing: -0.01em; }
.wa h1 { font-size: 62px; line-height: 72px; }
.bajada { font-size: 28px; line-height: 40px; color: #52525b; margin: 0 0 28px; }
.cuerpo { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.cuerpo svg { width: 100%; height: auto; display: block; }
.grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.wa .grid4 { grid-template-columns: 1fr; gap: 22px; }
.num4 { border: 2px solid #d4d4d8; border-radius: 12px; padding: 26px 28px; }
.num4 .et { font-size: 20px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #71717a; }
.num4 .val { font-size: 76px; line-height: 1.1; font-weight: 600; margin: 10px 0 6px; letter-spacing: -0.01em; }
.num4 .delta { font-size: 28px; font-weight: 600; }
.num4 .nota4 { font-size: 20px; color: #71717a; margin-top: 8px; }
.sube { color: #065f46; } .baja { color: #b91c1c; } .neutro { color: #52525b; }
table { width: 100%; border-collapse: collapse; font-size: 27px; font-variant-numeric: tabular-nums; }
th { font-size: 18px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #52525b;
     text-align: right; padding: 12px 10px; border-bottom: 2px solid #a1a1aa; }
th:first-child, td:first-child { text-align: left; }
td { padding: 16px 10px; border-bottom: 2px solid #e4e4e7; text-align: right; }
td .unidad { color: #71717a; font-size: 18px; margin-left: 8px; }
.s-sube { color: #065f46; background: #ecfdf5; font-weight: 600; }
.s-baja { color: #b91c1c; background: #fef2f2; font-weight: 600; }
.sd { color: #a1a1aa; }
.fuerte { font-weight: 600; }
.pie { border-top: 2px solid #18181b; padding-top: 20px; margin-top: 32px; }
.fuente { font-size: 19px; line-height: 27px; color: #71717a; margin-bottom: 12px; }
.cita { font-family: 'JetBrains Mono', monospace; font-size: 19px; line-height: 27px; color: #18181b; }
.url { font-size: 30px; font-weight: 600; color: #1d4ed8; margin-top: 14px; }
"""


def lienzo(p: D.Paquete, tam: tuple[int, int], titulo: str, cuerpo: str, fuente: str, bajada: str = "") -> str:
    from string import Template
    ancho, alto = tam
    css = Template(CSS).substitute(fuentes=I.fuentes_embebidas(), ancho=ancho, alto=alto)
    clase = "wa" if alto > ancho * 1.5 else "ig"
    b = f'<p class="bajada">{bajada}</p>' if bajada else ""
    return (
        f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>{css}</style></head>'
        f'<body class="{clase}"><div class="lienzo">'
        f'<div class="cab"><span class="marca">EL CORREDOR</span><span class="ed">{p.mes.etiqueta}</span></div>'
        f'<h1>{titulo}</h1>{b}<div class="cuerpo">{cuerpo}</div>'
        f'<div class="pie"><div class="fuente">Fuente: {I.esc(fuente)}</div>'
        f'<div class="cita">{I.esc(I2.cita(p))}</div><div class="url">consignatarias.com.ar</div></div>'
        f'</div></body></html>'
    )


# ─── las piezas ────────────────────────────────────────────────────────────────

def cuatro(p, x, tam):
    nums = I2.cuatro_numeros(p, x)
    if not nums:
        return None
    t = "".join(f'<div class="num4"><div class="et">{n["et"]}</div><div class="val">{n["val"]}</div>'
                f'<div>{n["delta"]}</div><div class="nota4">{I.esc(n["nota"])}</div></div>' for n in nums)
    return lienzo(p, tam, f'Los cuatro números de {p.mes.nombre}', f'<div class="grid4">{t}</div>',
                  "MAG (Índice Novillo y lotes), dólar blue, USDA AMS; cálculo propio",
                  bajada=f'Índice Novillo al cierre: {G.ars(p.cierre["ars"])} por kilo vivo ({G.usd(p.cierre["usd_blue"])})')


def estacional(p, x, tam):
    mens = p.mensual("usd_blue")
    por = {q["ym"]: q["valor"] for q in mens}
    base = [por.get(f"{p.mes.anio - k:04d}-{p.mes.mes:02d}") for k in range(1, D2.ANIOS_PROMEDIO + 1)]
    actual = por.get(p.mes.ym)
    if not actual or not all(base):
        return None
    prom5 = sum(base) / len(base)
    return lienzo(p, tam,
                  f'{p.mes.nombre.capitalize()} cerró en {G.usd(actual)}; el promedio de {p.mes.nombre} '
                  f'{p.mes.anio - D2.ANIOS_PROMEDIO}–{str(p.mes.anio - 1)[2:]} es {G.usd(prom5)}',
                  G2.espagueti(mens, p.mes.anio, ancho_mm=120, alto_mm=86),
                  "MAG (Índice Novillo) y dólar blue; cálculo propio. Gris: cada año desde 2015; punteado: promedio de 5 años",
                  bajada="Índice Novillo en dólares por kilo vivo, mes a mes")


def bandas(p, x, tam):
    if not len(x.bandas_hist):
        return None
    return lienzo(p, tam, "Lo que se paga barato y lo que se paga caro, por categoría",
                  G2.grilla_bandas(x.bandas_hist.puntos, ancho_mm=120, alto_mm=94),
                  "MAG, operaciones de lote (Valor de Referencia VR v1.0); cálculo propio",
                  bajada="Banda P10–P90 de cada ventana de 30 días; la línea es la mediana")


def relativos(p, x, tam):
    if not len(x.relativos):
        return None
    vaca = next((s for s in x.relativos.puntos if s["categoria"] == "VACA"), None)
    t = (f'La vaca vale {G2._num(vaca["puntos"][-1]["relacion"])} del novillo' if vaca
         else "Cada categoría contra el novillo")
    return lienzo(p, tam, t, G2.relativos_paneles(x.relativos.puntos, ancho_mm=130, alto_mm=84),
                  "MAG, operaciones de lote (mediana de la banda VR sobre la del novillo); cálculo propio",
                  bajada="Precio de cada categoría sobre el del novillo, desde junio de 2026")


def brecha(p, x, tam):
    intl = x.internacional
    if not intl:
        return None
    ar = intl["argentina"]
    filas = [(q["pais"], q["usd_kg_vivo"], f'{G.usd(q["usd_kg_vivo"])} · ×{G2._num(q["ratio"])}') for q in intl["paises"]]
    filas.append(("Argentina", ar, G.usd(ar)))
    filas.sort(key=lambda f: f[1], reverse=True)
    eeuu = intl["paises"][0]
    return lienzo(p, tam,
                  f'Un novillo de 450 kg: USD {I2._miles(ar * 450)} en Argentina, USD {I2._miles(eeuu["usd_kg_vivo"] * 450)} en {eeuu["pais"]}',
                  G2.barras_ordenadas(filas, ancho_mm=120, fila_h=34, L=96, R=118, destacar="Argentina"),
                  "USDA AMS, INAC, MLA; Argentina: Índice Novillo del MAG al dólar blue; cálculo propio. Peso vivo en todos los países",
                  bajada="Novillo en pie, dólares por kilo vivo")


def tierra(p, x, tam):
    if not len(x.tierra):
        return None
    t = x.tierra.puntos[:8]
    filas = [(f'{z["provincia"]}{" — " + z["zona"] if z["zona"] else ""}', z["kg_novillo_ha"],
              f'{I2._miles(z["kg_novillo_ha"])} kg') for z in t]
    return lienzo(p, tam, "Lo que cuesta una hectárea ganadera, en kilos de novillo",
                  G2.barras_ordenadas(filas, ancho_mm=140, fila_h=26, L=230, R=62, corte=34),
                  "Relevamiento propio y Compañía Argentina de Tierras; Índice Novillo del MAG al blue; cálculo propio",
                  bajada=f'Con el novillo a {G.usd(x.internacional.get("argentina") or 0)} por kilo vivo' if x.internacional else "")


def semaforo(p, x, tam):
    if not x.semaforo:
        return None
    filas = "".join(
        f'<tr><td>{I.esc(f["nombre"])}<span class="unidad">{f["unidad"]}</span></td>'
        f'<td class="fuerte">{I2._valor(f)}</td>{I2._celda(f["s4"], f["color"])}{I2._celda(f["ia"], f["color"])}</tr>'
        for f in x.semaforo
    )
    return lienzo(p, tam, f'Cuánto se movió cada precio en {p.mes.nombre}',
                  f'<table><thead><tr><th>Serie</th><th>Último</th><th>4 sem.</th><th>Interanual</th></tr></thead>'
                  f'<tbody>{filas}</tbody></table>',
                  "MAG (Índice Novillo, novillito, lotes) y dólar blue; cálculo propio. Color solo en dólares",
                  bajada="Variación contra 4 semanas antes y contra el mismo mes del año pasado")


def escalera(p, x, tam):
    if not len(p.por_peso):
        return None
    novi = next((g for g in p.por_peso.puntos if g["categoria"] == "NOVILLITO"), None)
    t = "El precio del kilo según el peso del lote"
    if novi and len(novi["rangos"]) >= 2:
        a, b = novi["rangos"][0], novi["rangos"][-1]
        t = (f'Novillito: {G.ars(a["mediana"])} el kilo a {a["desde_kg"]}–{a["hasta_kg"]} kg, '
             f'{G.ars(b["mediana"])} a {b["desde_kg"]}–{b["hasta_kg"]} kg')
    return lienzo(p, tam, t, G2.escalera_pesos(p.por_peso.puntos, ancho_mm=120, fila_h=14),
                  "MAG, operaciones de lote por rango de 50 kg (Valor de Referencia VR v1.0); cálculo propio",
                  bajada="Barra: P10 a P90. Punto: mediana")


PIEZAS = [
    ("ig-1-cuatro-numeros", IG, cuatro), ("ig-2-estacionalidad", IG, estacional), ("ig-3-bandas", IG, bandas),
    ("ig-4-relativos", IG, relativos), ("ig-5-brecha", IG, brecha), ("ig-6-tierra", IG, tierra),
    ("wa-1-cuatro-numeros", WA, cuatro), ("wa-2-semaforo", WA, semaforo), ("wa-3-escalera-pesos", WA, escalera),
    ("wa-4-brecha", WA, brecha),
]


def a_png(html_path: Path, png_path: Path, tam: tuple[int, int]) -> bool:
    candidatos = [os.environ.get("CHROME_BIN"), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                  "google-chrome", "chromium", "chromium-browser"]
    for c in candidatos:
        if not c:
            continue
        try:
            subprocess.run(
                [c, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                 "--force-device-scale-factor=1", f"--window-size={tam[0]},{tam[1]}",
                 f"--screenshot={png_path}", html_path.as_uri()],
                check=True, capture_output=True, timeout=120,
            )
            return png_path.exists()
        except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            continue
    return False


def generar(p: D.Paquete, x: D2.Extra, salida: Path, png: bool = True) -> list[Path]:
    salida.mkdir(parents=True, exist_ok=True)
    hechas = []
    for nombre, tam, fn in PIEZAS:
        html = fn(p, x, tam)
        if not html:
            print(f"  ⚠ {nombre}: sin dato, no se genera")
            continue
        base = salida / f"el-corredor-{p.mes.ym}-{nombre}"
        hp = base.with_suffix(".html")
        hp.write_text(html, encoding="utf-8")
        if png:
            pp = base.with_suffix(".png")
            if not a_png(hp, pp, tam):
                print(f"  ✗ {nombre}: no se pudo rasterizar (¿chromium?)")
                continue
            hechas.append(pp)
            print(f"  {pp.name} ({pp.stat().st_size // 1024} KB)")
        else:
            hechas.append(hp)
    return hechas


def main() -> int:
    ap = argparse.ArgumentParser(description="El Corredor v2 — piezas para redes")
    ap.add_argument("--mes", default="auto", help="YYYY-MM o 'auto' (el mes anterior)")
    ap.add_argument("--salida", default=None, help="carpeta de salida (default: output/)")
    ap.add_argument("--sin-png", action="store_true", help="solo el HTML de cada pieza")
    a = ap.parse_args()
    if a.mes == "auto":
        hoy = date.today()
        ym = f"{hoy.year - (hoy.month == 1)}-{(hoy.month - 1) or 12:02d}"
    else:
        ym = a.mes
    print(f"El Corredor v2 · piezas · {ym}")
    p, x = D2.cargar(ym)
    hechas = generar(p, x, Path(a.salida) if a.salida else I.SALIDA, png=not a.sin_png)
    return 0 if hechas else 1


if __name__ == "__main__":
    raise SystemExit(main())
