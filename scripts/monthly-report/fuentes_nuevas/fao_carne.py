"""
Índice de Precios de la Carne de la FAO, con el subíndice bovino.

QUÉ ES
La FAO publica todos los meses el FAO Food Price Index (FFPI) y sus cinco
subíndices (carne, lácteos, cereales, aceites, azúcar), base 2014-2016 = 100,
en dólares corrientes. El de carne, a su vez, se abre en cuatro subíndices:
aviar, porcina, BOVINA y ovina. Ese desglose no viene en el CSV del FFPI: está
en un XLSX aparte que publica la página del Meat Price Index.

    · Página:  https://www.fao.org/markets-and-trade/commodities-overview/basic-foods/fao-meat-price-index/en
    · XLSX:    .../marketsandtradelibraries/default-document-library/fao-meat-price-indices_<mes>-<aa>.xlsx
               hoja "Meat Price Indices": Date | Meat Price Index | Poultry Meat |
               Pig Meat | Bovine Meat | Ovine Meat, mensual desde 1990-01.
    · CSV FFPI (opcional, para la columna "alimentos"):
               https://www.fao.org/media/docs/worldfoodsituationlibraries/wfs-library/food_price_indices_data.csv

El nombre del XLSX cambia con cada publicación (lleva el mes: "_oct-26"), así
que `obtener()` primero lee la página y saca de ahí el link vigente. Si el link
no aparece, se rompe: no adivinamos nombres de archivo.

OJO CON LO QUE MIDE EL BOVINO
El subíndice bovino de la FAO se arma con precios de exportación de Australia
(90CL deshuesado FOB a EE.UU.), Estados Unidos y Brasil (valores unitarios de
exportación). Argentina NO entra en la canasta. Sirve como termómetro del
precio internacional de la carne vacuna, no como precio del novillo argentino.

DATO PROVISORIO — LA FAO REVISA
A diferencia de los otros grupos, la mayoría de los precios de la carne no
están disponibles cuando sale el índice: los últimos meses se calculan con una
mezcla de precios proyectados y observados, y la FAO los revisa (a veces
bastante) en las publicaciones siguientes. Regla de uso en El Corredor: los
últimos ~3 meses de la serie son provisorios; cada actualización REEMPLAZA la
serie completa, nunca se pega un mes nuevo sobre una serie vieja.

PUBLICACIÓN
Primer viernes del mes, aprox. (2026: 9 ene, 6 feb, 6 mar, 3 abr, 8 may, 5 jun,
3 jul, 7 ago, 4 sep, 2 oct, 6 nov, 4 dic), con el dato del mes anterior.

LICENCIA
Estos archivos están en la web de la FAO, no en una de sus "corporate
statistical databases" (FAOSTAT, AMIS, FPMA... que van con CC BY 4.0). Rigen
los Términos y Condiciones de reutilización del contenido web
(https://www.fao.org/contact-us/terms/en/): copia y descarga para estudio,
investigación, enseñanza y productos o servicios NO comerciales, con cita a la
FAO; el uso comercial requiere pedir permiso a copyright@fao.org. Además, los
subíndices se calculan con precios de terceros (MLA, USDA, Comex Stat, AgriHQ,
Comisión Europea). Por eso NO se versiona el cache en el repo público: se
genera localmente con `--actualizar` y la fixture de tests es mínima.
"""

from __future__ import annotations

import csv
import io
import re
import sys
from datetime import date
from typing import Any

from fuentes_nuevas._base import (
    FormatoCambiado,
    Procedencia,
    SerieExterna,
    descargar,
    exigir,
    guardar_cache,
    hoy,
    leer_xlsx,
    serial_a_fecha,
)

ID = "fao-indice-carne"
URL_PAGINA = "https://www.fao.org/markets-and-trade/commodities-overview/basic-foods/fao-meat-price-index/en"
URL_FFPI_CSV = ("https://www.fao.org/media/docs/worldfoodsituationlibraries/wfs-library/"
                "food_price_indices_data.csv")
HOJA = "Meat Price Indices"
ENCABEZADO = ["Date", "Meat Price Index", "Poultry Meat", "Pig Meat", "Bovine Meat", "Ovine Meat"]
ENCABEZADO_CSV = ["Date", "Food Price Index", "Meat", "Dairy", "Cereals", "Oils", "Sugar"]
RANGO = (40.0, 200.0)      # plausible para carne, bovina y FFPI general desde 1990
PRIMER_PERIODO = "1990-01"
LICENCIA = ("© FAO. Términos de reutilización de contenido web de la FAO "
            "(https://www.fao.org/contact-us/terms/en/): uso no comercial con cita; "
            "uso comercial requiere permiso (copyright@fao.org). Incluye precios de terceros.")
_RE_LINK = re.compile(r'href="([^"]*fao-meat-price-indices[^"]*?\.xlsx)[^"]*"', re.I)


def _periodo(celda: Any) -> str:
    if isinstance(celda, float):
        d = serial_a_fecha(celda)
        exigir(d.day == 1, f"fecha {d} no es primero de mes: ¿cambió la convención de la columna Date?")
        return f"{d.year:04d}-{d.month:02d}"
    t = str(celda).strip()
    exigir(bool(re.fullmatch(r"\d{4}-\d{2}", t)), f"período ilegible: {celda!r} (esperaba AAAA-MM o fecha Excel)")
    return t


def _indice(celda: Any, que: str, periodo: str) -> float:
    exigir(isinstance(celda, (int, float)), f"{que} {periodo}: esperaba número, encontré {celda!r}")
    v = float(celda)
    exigir(RANGO[0] <= v <= RANGO[1], f"{que} {periodo}: {v:.2f} fuera del rango plausible {RANGO}")
    return round(v, 2)


def _siguiente(p: str) -> str:
    a, m = int(p[:4]), int(p[5:])
    return f"{a + m // 12:04d}-{m % 12 + 1:02d}"


def parsear_ffpi_csv(contenido: bytes) -> dict[str, float]:
    """CSV del FFPI → {periodo: índice general de alimentos}. Valida encabezado y rango."""
    filas = list(csv.reader(io.StringIO(contenido.decode("utf-8-sig"))))
    i = next((k for k, f in enumerate(filas[:10]) if f and f[0].strip() == "Date"), None)
    exigir(i is not None, "CSV FFPI: no encontré la fila de encabezado 'Date'")
    enc = [c.strip() for c in filas[i][:7]]
    exigir(enc == ENCABEZADO_CSV, f"CSV FFPI: encabezado {enc} != {ENCABEZADO_CSV}")
    exigir(any("2014-2016=100" in "".join(f) for f in filas[:i]), "CSV FFPI: no declara base 2014-2016=100")
    out: dict[str, float] = {}
    for f in filas[i + 1:]:
        if not f or not f[0].strip():
            continue
        p = _periodo(f[0])
        exigir(p not in out, f"CSV FFPI: período repetido {p}")
        try:
            v = float(f[1])
        except ValueError as e:
            raise FormatoCambiado(f"CSV FFPI {p}: índice ilegible {f[1]!r}") from e
        out[p] = _indice(v, "FFPI", p)
    exigir(bool(out), "CSV FFPI: sin filas de datos")
    return out


def parsear(contenido: bytes, url: str, fecha_observacion: str,
            ffpi_csv: bytes | None = None) -> SerieExterna:
    """XLSX 'FAO Meat Price Indices' (+ CSV FFPI opcional) → SerieExterna. Pura: no toca la red."""
    hojas = leer_xlsx(contenido)
    exigir(HOJA in hojas, f"falta la hoja {HOJA!r}; hojas: {list(hojas)}")
    filas = hojas[HOJA]
    i = next((k for k, f in enumerate(filas[:10]) if f and f[0] == "Date"), None)
    exigir(i is not None, f"hoja {HOJA!r}: no encontré la fila de encabezado 'Date'")
    enc = [(c or "").strip() if isinstance(c, str) or c is None else c for c in filas[i][:6]]
    exigir(enc == ENCABEZADO, f"hoja {HOJA!r}: encabezado {enc} != {ENCABEZADO}")

    puntos: list[dict[str, Any]] = []
    for f in filas[i + 1:]:
        if not f or f[0] is None:
            continue
        p = _periodo(f[0])
        f = f + [None] * (6 - len(f))
        if puntos:
            exigir(p == _siguiente(puntos[-1]["periodo"]),
                   f"serie no consecutiva: {puntos[-1]['periodo']} → {p}")
        puntos.append({"periodo": p,
                       "carne": _indice(f[1], "carne", p),
                       "bovina": _indice(f[4], "bovina", p)})
    exigir(bool(puntos), f"hoja {HOJA!r}: sin filas de datos")

    nota = ("Base 2014-2016=100, USD corrientes. Los últimos ~3 meses son provisorios: la FAO "
            "los calcula con precios proyectados y los revisa en cada publicación. "
            "Bovino = precios de exportación de Australia, EE.UU. y Brasil (Argentina no integra la canasta).")
    if ffpi_csv is not None:
        ffpi = parsear_ffpi_csv(ffpi_csv)
        for pt in puntos:
            if pt["periodo"] in ffpi:
                pt["alimentos"] = ffpi[pt["periodo"]]
        faltan = [pt["periodo"] for pt in puntos if "alimentos" not in pt]
        if faltan:
            nota += f" FFPI general ausente en el CSV para: {', '.join(faltan[-6:])}."

    ultimo = puntos[-1]["periodo"]
    columnas = {
        "carne": "FAO Meat Price Index (2014-2016=100)",
        "bovina": "Subíndice Bovine Meat del FAO Meat Price Index (2014-2016=100)",
    }
    if ffpi_csv is not None:
        columnas["alimentos"] = "FAO Food Price Index general (2014-2016=100)"
    return SerieExterna(
        id=ID,
        unidad="índice 2014-2016=100 (USD corrientes)",
        frecuencia="mensual",
        puntos=puntos,
        procedencia=Procedencia(
            fuente="FAO · Meat Price Index (subíndices) + Food Price Index",
            url=url,
            fecha_observacion=fecha_observacion,
            fecha_dato=ultimo,
            rezago="~1 mes: sale el primer viernes del mes con el dato del mes anterior; últimos meses provisorios",
            licencia=LICENCIA,
            nota=nota,
        ),
        columnas=columnas,
    )


def link_xlsx(pagina_html: bytes, base: str = URL_PAGINA) -> str:
    """Saca de la página del Meat Price Index el link vigente al XLSX (el nombre cambia cada mes)."""
    m = _RE_LINK.search(pagina_html.decode("utf-8", "replace"))
    exigir(m is not None, f"no encontré el link 'fao-meat-price-indices*.xlsx' en {base}")
    href = m.group(1).replace("&amp;", "&")  # type: ignore[union-attr]
    if href.startswith("/"):
        href = "https://www.fao.org" + href
    exigir(href.startswith("https://www.fao.org/"), f"link a XLSX fuera de fao.org: {href}")
    return href


def obtener() -> SerieExterna:
    url = link_xlsx(descargar(URL_PAGINA))
    return parsear(descargar(url), url, hoy(), ffpi_csv=descargar(URL_FFPI_CSV))


if __name__ == "__main__":
    if "--actualizar" in sys.argv:
        s = obtener()
        print(f"{s.id}: {len(s)} meses, {s.puntos[0]['periodo']} → {s.procedencia.fecha_dato}")
        print(f"cache LOCAL (no versionar, ver licencia): {guardar_cache(s)}")
    else:
        print(__doc__)
