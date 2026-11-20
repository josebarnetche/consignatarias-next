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
import re
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


def lienzo(p: D.Paquete, tam: tuple[int, int], titulo: str, cuerpo: str, fuente: str, bajada: str = "",
           fecha: str | None = None, fecha_txt: str = "") -> str:
    from string import Template
    ancho, alto = tam
    css = Template(CSS).substitute(fuentes=I.fuentes_embebidas(), ancho=ancho, alto=alto)
    clase = "wa" if alto > ancho * 1.5 else "ig"
    b = f'<p class="bajada">{bajada}</p>' if bajada else ""
    # Las series mensuales de afuera no tienen día: "Dato a sep. 2026".
    dato = f" Dato a {fecha_txt}." if fecha_txt else f" Dato al {I2.fecha_ar(fecha or p.cierre['fecha'])}."
    return (
        f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>{css}</style></head>'
        f'<body class="{clase}"><div class="lienzo">'
        f'<div class="cab"><span class="marca">EL CORREDOR</span><span class="ed">{p.mes.etiqueta}</span></div>'
        f'<h1>{titulo}</h1>{b}<div class="cuerpo">{cuerpo}</div>'
        f'<div class="pie"><div class="fuente">Fuente: {I.esc(fuente)}.{dato}</div>'
        f'<div class="cita">{I.esc(I2.cita(p))}</div><div class="cita">{I.esc(I2.cita_banda())}</div>'
        f'<div class="url">consignatarias.com.ar</div></div>'
        f'</div></body></html>'
    )


def _p(titulo: str, html: str, bajada: str = "") -> dict:
    """Lo que devuelve cada pieza: el HTML y lo que el manifest necesita para listarla."""
    return {"titulo": re.sub(r"<[^>]+>", "", titulo), "texto": re.sub(r"<[^>]+>", "", bajada), "html": html}


# ─── las piezas ────────────────────────────────────────────────────────────────

def cuatro(p, x, tam):
    nums = I2.cuatro_numeros(p, x)
    if not nums:
        return None
    t = "".join(f'<div class="num4"><div class="et">{n["et"]}</div><div class="val">{n["val"]}</div>'
                f'<div>{n["delta"]}</div><div class="nota4">{I.esc(n["nota"])}</div></div>' for n in nums)
    titulo = I2.titulo_mes(p)
    bajada = (f'Índice Novillo, cierre del {I2.fecha_ar(p.cierre["fecha"])}: {G.ars(p.cierre["ars"])} por kilo vivo '
              f'({G.usd(p.cierre["usd_blue"])}). Los cuatro números del mes')
    return _p(titulo, lienzo(p, tam, titulo, f'<div class="grid4">{t}</div>',
                             "MAG (Índice Novillo y lotes), dólar blue, USDA AMS; cálculo propio", bajada=bajada), bajada)


def estacional(p, x, tam):
    titulo = I2.estacional_titulo(p)
    if not titulo:
        return None
    eb = D2.etiqueta_base(D2.anios_base(p.mes.anio))
    bajada = "Índice Novillo en dólares por kilo vivo (al blue, valores nominales), mes a mes"
    return _p(titulo, lienzo(p, tam, titulo,
                             G2.espagueti(p.mensual("usd_blue"), p.mes.anio, D2.anios_base(p.mes.anio), ancho_mm=120,
                                          alto_mm=68, rotulo_base=f"promedio\n{eb}"),
                             f"MAG (Índice Novillo) y dólar blue; cálculo propio. Gris: cada año desde 2015; gris oscuro: "
                             f"{p.mes.anio - 1}; punteado: promedio de {eb}, años de cambio unificado (sin 2020–2024, por la brecha)",
                             bajada=bajada), bajada)


def bandas(p, x, tam):
    if not len(x.bandas_hist):
        return None
    titulo = I2.banda_titulo(p)
    bajada = f"{I2.BANDA}: {I2.DEF_BANDA}. Área: P10 a P90 de cada ventana de 30 días; línea: mediana"
    return _p(titulo, lienzo(p, tam, titulo, G2.grilla_bandas(x.bandas_hist.puntos, ancho_mm=120, alto_mm=80),
                             "MAG, operaciones de lote (Valor de Referencia VR v1.0); cálculo propio",
                             bajada=bajada, fecha=x.bandas_hist.fecha_dato), bajada)


def relativos(p, x, tam):
    if not len(x.relativos):
        return None
    titulo = I2.relativos_titulo(x)
    bajada = "Mediana de cada categoría sobre la del novillo (1,00), misma escala en los tres paneles"
    return _p(titulo, lienzo(p, tam, titulo, G2.relativos_paneles(x.relativos.puntos, ancho_mm=130, alto_mm=84),
                             "MAG, operaciones de lote (mediana de la Banda Consignatarias sobre la del novillo); cálculo propio",
                             bajada=bajada, fecha=x.relativos.fecha_dato), bajada)


def brecha(p, x, tam):
    intl = x.internacional
    if not intl:
        return None
    ar = intl["argentina"]
    filas = [(q["pais"], q["usd_kg_vivo"], f'{G.usd(q["usd_kg_vivo"])} · ×{G2._num(q["ratio"])}') for q in intl["paises"]]
    filas.append(("Argentina", ar, f'{G.usd(ar)} · cierre'))
    filas.sort(key=lambda f: f[1], reverse=True)
    titulo = I2.mundo_titulo(x)
    bajada = "Novillo en pie, dólares por kilo vivo. Argentina: cierre del mes"
    wa = tam[1] > tam[0] * 1.5
    return _p(titulo, lienzo(p, tam, titulo,
                             G2.barras_ordenadas(filas, ancho_mm=120, fila_h=56 if wa else 46, L=150, R=150,
                                                 destacar="Argentina", barra=30 if wa else 24, letra=11),
                             "USDA AMS, INAC, MLA; Argentina: Índice Novillo del MAG al dólar blue; cálculo propio. "
                             "Peso vivo en todos los países", bajada=bajada), bajada)


def tierra(p, x, tam):
    t = I2.tierra_con_renta(x)
    if len(t) < 3:
        print(f"  · ig-6-tierra: {len(t)} zona(s) con canon relevado en la zona, n ≥ 5 y dato vigente; hacen falta 3")
        return None
    t = t[:8]
    filas = [(f'{z["provincia"]}{" — " + z["zona"] if z["zona"] else ""} (n={z["n"]}, {I2.ym_ar(z["fecha"])})',
              z["kg_novillo_ha"], f'{I2._miles(z["kg_novillo_ha"])} kg') for z in t]
    top = t[0]
    titulo = (f'Una hectárea ganadera en {top["provincia"]}{" (" + top["zona"] + ")" if top["zona"] else ""} '
              f'cuesta {I2._miles(top["kg_novillo_ha"])} kg de novillo')
    bajada = f'Con el novillo a {G.usd(x.internacional.get("argentina") or 0)} por kilo vivo' if x.internacional else ""
    return _p(titulo, lienzo(p, tam, titulo, G2.barras_ordenadas(filas, ancho_mm=140, fila_h=26, L=260, R=62),
                             "Relevamiento propio y Compañía Argentina de Tierras; Índice Novillo del MAG al blue; cálculo propio",
                             bajada=bajada), bajada)


def semaforo(p, x, tam):
    if not x.semaforo:
        return None
    filas = "".join(
        f'<tr><td>{I.esc(f["nombre"])}<span class="unidad">{f["unidad"]}</span></td>'
        f'<td class="fuerte">{I2._valor(f)}</td>{I2._celda(f["s4"], f["color"])}{I2._celda(f["ia"], f["color"])}</tr>'
        for f in x.semaforo
    )
    v12, vu12 = p.variacion("ars", 12), p.variacion("usd_blue", 12)
    titulo = (f'El Índice Novillo {I2._verbo(v12)} en doce meses en pesos y {I2._verbo(vu12).split(" ", 1)[1]} en dólares'
              if v12 is not None and vu12 is not None and (v12 >= 0) == (vu12 >= 0)
              else f'Cuánto se movió cada precio en {p.mes.nombre}')
    bajada = f"Cierre del {I2.fecha_ar(p.cierre['fecha'])} contra 4 semanas antes, y promedio del mes contra un año atrás"
    return _p(titulo, lienzo(p, tam, titulo,
                             f'<table><thead><tr><th>Serie</th><th>Cierre</th><th>4 sem.</th><th>Interanual</th></tr></thead>'
                             f'<tbody>{filas}</tbody></table>',
                             "MAG (Índice Novillo, novillito, lotes) y dólar blue; cálculo propio. Color solo en dólares",
                             bajada=bajada), bajada)


def escalera(p, x, tam):
    if not len(p.por_peso):
        return None
    novi = next((g for g in p.por_peso.puntos if g["categoria"] == "NOVILLITO"), None)
    t = "El precio del kilo según el peso del lote"
    if novi and len(novi["rangos"]) >= 2:
        a, b = novi["rangos"][0], novi["rangos"][-1]
        t = (f'Novillito: {G.ars(a["mediana"])} el kilo a {a["desde_kg"]}–{a["hasta_kg"]} kg, '
             f'{G.ars(b["mediana"])} a {b["desde_kg"]}–{b["hasta_kg"]} kg')
    bajada = f"{I2.BANDA} por rango de 50 kg. Barra: P10 a P90. Punto: mediana"
    return _p(t, lienzo(p, tam, t, G2.escalera_pesos(p.por_peso.puntos, ancho_mm=130, fila_h=18, letra=1.3),
                        "MAG, operaciones de lote por rango de 50 kg (Valor de Referencia VR v1.0); cálculo propio",
                        bajada=bajada, fecha=p.por_peso.fecha_dato), bajada)


def destinos(p, x, tam):
    """Destinos de la exportación del año contra el mismo período del anterior (INDEC)."""
    e = x.expo
    if not e or not e.get("destinos"):
        return None
    n, anio = e["mes"], e["anio"]
    per = f'ene–{D2.MESES_AB_ES[n]}' if n > 1 else "ene"
    filas = [{"nombre": d["nombre"].replace(" (país 999)", ""), "v": d["t"], "v_ant": d["t_ant"],
              "rot": f'{I2._miles(d["t"])} t'} for d in e["destinos"] if d["t"] >= 1000 or d["clave"] in ("confidencial", "resto")]
    china = next((d for d in e["destinos"] if d["clave"] == "china"), None)
    titulo = (f'China se llevó el {I2._d(china["share"])}% de la carne bovina exportada en {per} {anio}'
              if china and china.get("share") else f'Destinos de la carne bovina exportada, {per} {anio}')
    bajada = (f'Toneladas en peso producto, {per} {anio} (azul) contra {per} {anio - 1} (gris). '
              f'Los destinos con menos de 1.000 t en el año no figuran')
    wa = tam[1] > tam[0] * 1.5
    return _p(titulo, lienzo(p, tam, titulo,
                             G2.barras_pareadas(filas, ancho_mm=120, fila_h=44 if wa else 30, L=150, R=105,
                                                et_actual=f"{per} {anio}", et_anterior=f"{per} {anio - 1}", letra=10),
                             "INDEC, exportaciones por destino (NCM 02.01 + 02.02), CC BY-SA 4.0; sumas del año: cálculo "
                             "propio. «Confidencial»: país 999, secreto estadístico",
                             bajada=bajada, fecha_txt=D2.mes_corto(e["u"]["periodo"])), bajada)


def hembras_nacional(p, x, tam):
    """El % de hembras en la faena nacional, mes a mes (MAGyP)."""
    fm = x.faena
    if not fm or len(fm["serie"]) < 6:
        return None
    u = fm["u"]
    titulo = f'Hembras: {I2._d(u["pct_hembras"])}% de la faena nacional de {I2.ym_largo(u["periodo"])}'
    if fm.get("pp_hembras") is not None:
        titulo += f', {I2._d(abs(fm["pp_hembras"]))} puntos {"más" if fm["pp_hembras"] >= 0 else "menos"} que un año antes'
    bajada = "% de hembras (vacas y vaquillonas) sobre las cabezas faenadas en todo el país, mes a mes"
    return _p(titulo, lienzo(p, tam, titulo, G2.hembras_franja(fm["serie"], ancho_mm=130, alto_mm=62),
                             "MAGyP, informe mensual de faena (SENASA + DNCCA), CC BY 4.0. Datos provisorios",
                             bajada=bajada, fecha_txt=D2.mes_corto(u["periodo"])), bajada)


#: (nombre, tamaño, función, tipo para el manifest)
PIEZAS = [
    ("ig-1-cuatro-numeros", IG, cuatro, "ig"), ("ig-2-estacionalidad", IG, estacional, "ig"),
    ("ig-3-bandas", IG, bandas, "ig"), ("ig-4-relativos", IG, relativos, "ig"), ("ig-5-brecha", IG, brecha, "ig"),
    ("ig-6-tierra", IG, tierra, "ig"), ("ig-7-destinos", IG, destinos, "ig"),
    ("ig-8-hembras-nacional", IG, hembras_nacional, "ig"),
    ("wa-1-cuatro-numeros", WA, cuatro, "estado"), ("wa-2-semaforo", WA, semaforo, "estado"),
    ("wa-3-escalera-pesos", WA, escalera, "estado"), ("wa-4-brecha", WA, brecha, "estado"),
]


def a_png(html_path: Path, png_path: Path, tam: tuple[int, int]) -> bool:
    return I.chrome(["--hide-scrollbars", "--force-device-scale-factor=1", f"--window-size={tam[0]},{tam[1]}",
                     f"--screenshot={png_path}"], png_path, html_path, 120)


def generar(p: D.Paquete, x: D2.Extra, salida: Path, png: bool = True) -> list[dict]:
    """
    Genera las piezas y devuelve una entrada por pieza hecha:
    {nombre, tipo ('ig'|'estado'), titulo, texto, archivo}. Una pieza sin dato no se
    genera y se avisa; una que rompe tampoco corta las demás.
    """
    salida.mkdir(parents=True, exist_ok=True)
    hechas = []
    for nombre, tam, fn, tipo in PIEZAS:
        try:
            r = fn(p, x, tam)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {nombre}: {e}")
            continue
        if not r:
            print(f"  ⚠ {nombre}: sin dato, no se genera")
            continue
        base = salida / f"el-corredor-{p.mes.ym}-{nombre}"
        hp = base.with_suffix(".html")
        hp.write_text(r["html"], encoding="utf-8")
        archivo = hp
        if png:
            pp = base.with_suffix(".png")
            if not a_png(hp, pp, tam):
                print(f"  ✗ {nombre}: no se pudo rasterizar (¿chromium?)")
                continue
            archivo = pp
            print(f"  {pp.name} ({pp.stat().st_size // 1024} KB)")
        hechas.append({"nombre": nombre, "tipo": tipo, "titulo": r["titulo"], "texto": r["texto"], "archivo": archivo})
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
