"""
Stock bovino nacional por categoría — existencias al 31 de diciembre de cada año.

FUENTE
    MAGyP (hoy SAGyP, Ministerio de Economía) · Dirección Nacional de Producción
    Ganadera, sobre la base SIGSA del SENASA. Página "Informes" del área bovinos:
      https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/
    Archivo: "Serie stock Bovino por provincia al 31-12 (2007-2025).xlsx", carpeta
    `000001=Series de stock bovino y mapas/000000_Stock/`. Una hoja por año
    ("2007" … "2025") con la tabla por provincia y la fila "Total general", más
    una hoja "Serie 2007-2024" (el nombre miente: trae hasta 2025) en formato largo.

REZAGO
    Anual. El cierre al 31-12 se publica a principios de abril del año siguiente
    (el de 2025 figura "Publicación: (06-04-26)"). Al 2026-11-02 el último dato
    es 2025; el de 2026 no aparece antes de abril de 2027.

LICENCIA
    La página de magyp.gob.ar no declara licencia. El mismo ministerio publica
    las existencias bovinas SENASA en su portal de datos abiertos bajo Creative
    Commons Atribución 4.0 (dataset "SENASA - Existencias de bovinos",
    https://datos.magyp.gob.ar/dataset/senasa-existencias-bovinas), y los
    contenidos de argentina.gob.ar también son CC BY 4.0
    (https://www.argentina.gob.ar/terminos-y-condiciones). Se republica con
    atribución: "Fuente: SIGSA-SENASA, elaborado por DNPG-SAGyP".

TRAMPAS
    1. **No es "a marzo".** La serie tradicional se cortaba en marzo (campaña de vacunación); por
       Res. ex-MAGyP 105/2019 y Disp. ex-SSG 6/19 se recalculó al 31 de diciembre
       desde 2012 (nota metodológica 191206). La serie de marzo quedó congelada
       en 2008-2019 (CSV en datos.magyp.gob.ar) y sus valores NO empalman con
       estos: no mezclar. Por eso el período es "YYYY" con `fecha_corte`
       "YYYY-12-31", nunca "YYYY-03".
    2. **2007-2011 son estimados por la fuente** (el título de la hoja dice
       "(Estimado)") y vienen con decimales. Se redondean a cabeza entera y se
       marcan `estimado: True`. No es dato de registro.
    3. **Toritos** no se discriminaban antes de 2013: la fuente publica 0 en
       2007-2011 y 258 cabezas en 2012. Se deja lo publicado; el salto
       2012→2013 es de clasificación, no biológico.
    4. **La URL cambia cada año**: el prefijo (`251231_`) y el rango
       `(2007-2025)` van en el nombre, y el archivo del año anterior se borra
       (404). `obtener()` busca el enlace vigente en la página índice.
    5. Celdas con "-" (p. ej. bueyes de Tierra del Fuego 2025) son cero en la
       fila de totales; solo se tratan como cero al cruzar provincias vs total.
    6. El total de la tabla anual se cruza contra la suma de provincias de la
       hoja "Serie": si no cierra, el archivo cambió y se rompe.

`vacas_sobre_total` = vacas / total bovinos de la fila "Total general": cociente
exacto de dos columnas publicadas (sobre los valores sin redondear).
"""

from __future__ import annotations

import html
import re
import sys
import unicodedata
from typing import Any
from urllib.parse import quote, urljoin

try:
    from ._base import (FormatoCambiado, Procedencia, SerieExterna, descargar, exigir,
                        guardar_cache, hoy, leer_xlsx, numero_ar)
except ImportError:  # ejecutado como script suelto
    from fuentes_nuevas._base import (FormatoCambiado, Procedencia, SerieExterna,  # type: ignore
                                      descargar, exigir, guardar_cache, hoy, leer_xlsx, numero_ar)

ID = "stock-bovino-categorias"
PAGINA = "https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/"
URL = (PAGINA + "_archivos//000001=Series%20de%20stock%20bovino%20y%20mapas/000000_Stock/"
       "251231_Serie%20stock%20Bovino%20por%20provincia%20al%2031-12%20(2007-2025).xlsx")

CATEGORIAS = ["vacas", "vaquillonas", "novillos", "novillitos", "terneros",
              "terneras", "toros", "toritos", "bueyes"]
ENCABEZADO = ["provincia", *CATEGORIAS, "total bovinos"]
ENCABEZADO_SERIE = ["al 31 de diciembre de", "provincia", "region", *CATEGORIAS, "total bovinos"]
TOTAL_MIN, TOTAL_MAX = 40_000_000, 60_000_000
CATEG_MAX = 30_000_000
ANIO_MIN = 2007

LICENCIA = ("Sin licencia declarada en magyp.gob.ar; el mismo dato SENASA está en "
            "datos.magyp.gob.ar bajo CC BY 4.0 "
            "(https://datos.magyp.gob.ar/dataset/senasa-existencias-bovinas). "
            "Citar: SIGSA-SENASA, elaborado por DNPG-SAGyP.")


def _norm(s: Any) -> str:
    t = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", t).strip().lower()


def _cabezas(v: Any, donde: str) -> float:
    n = numero_ar(v)
    exigir(n is not None, f"{donde}: celda vacía donde se esperaba un número de cabezas ({v!r})")
    exigir(0 <= n <= CATEG_MAX, f"{donde}: {n} cabezas fuera de rango plausible (0–{CATEG_MAX})")  # type: ignore[operator]
    return float(n)  # type: ignore[arg-type]


def _tabla_anual(nombre: str, filas: list[list[Any]]) -> dict[str, Any]:
    anio = int(nombre)
    idx_titulo = next((i for i, f in enumerate(filas)
                       if f and isinstance(f[0], str)
                       and "existencias bovinas por categoria" in _norm(f[0])), None)
    exigir(idx_titulo is not None,
           f"hoja {nombre}: no encontré el título 'Distribución de Existencias Bovinas por Categoría'")
    titulo = _norm(filas[idx_titulo][0])  # type: ignore[index]
    exigir(f"31/12/{anio}" in titulo,
           f"hoja {nombre}: el título no dice 31/12/{anio}: {filas[idx_titulo][0]!r}")  # type: ignore[index]
    enc = [_norm(c) for c in filas[idx_titulo + 1][:len(ENCABEZADO)]]  # type: ignore[operator]
    exigir(enc == ENCABEZADO, f"hoja {nombre}: encabezado esperado {ENCABEZADO}, encontré {enc}")
    total = None
    for f in filas[idx_titulo + 2:]:  # type: ignore[operator]
        if f and isinstance(f[0], str) and _norm(f[0]).startswith("total"):
            total = f
            break
    exigir(total is not None, f"hoja {nombre}: no encontré la fila 'Total general'")
    valores = {c: _cabezas(total[1 + i], f"{nombre}/{c}") for i, c in enumerate(CATEGORIAS)}  # type: ignore[index]
    tot = numero_ar(total[1 + len(CATEGORIAS)])  # type: ignore[index]
    exigir(tot is not None and TOTAL_MIN <= tot <= TOTAL_MAX,
           f"hoja {nombre}: total {tot} fuera del rango plausible {TOTAL_MIN}–{TOTAL_MAX}")
    suma = sum(valores.values())
    exigir(abs(suma - tot) <= 2,  # type: ignore[operator]
           f"hoja {nombre}: la suma de categorías ({suma:.0f}) no da el total publicado ({tot:.0f})")
    return {"anio": anio, "valores": valores, "total": float(tot),  # type: ignore[arg-type]
            "estimado": "estimado" in titulo}


def _totales_serie(filas: list[list[Any]]) -> dict[int, float]:
    exigir(bool(filas), "hoja Serie vacía")
    enc = [_norm(c) for c in filas[0][:len(ENCABEZADO_SERIE)]]
    exigir(enc == ENCABEZADO_SERIE, f"hoja Serie: encabezado esperado {ENCABEZADO_SERIE}, encontré {enc}")
    tot: dict[int, float] = {}
    for f in filas[1:]:
        if not f or f[0] is None:
            continue
        anio = int(numero_ar(f[0]))  # type: ignore[arg-type]
        v = numero_ar(f[len(ENCABEZADO_SERIE) - 1])
        tot[anio] = tot.get(anio, 0.0) + (v or 0.0)
    return tot


def parsear(contenido: bytes, url: str, fecha_observacion: str) -> SerieExterna:
    hojas = leer_xlsx(contenido)
    anuales = sorted((n for n in hojas if re.fullmatch(r"\d{4}", n.strip())), key=int)
    exigir(len(anuales) >= 2, f"esperaba una hoja por año (2007…); encontré {list(hojas)}")
    exigir(int(anuales[0]) >= ANIO_MIN, f"hoja de año {anuales[0]} anterior a {ANIO_MIN}")
    serie_hoja = next((n for n in hojas if _norm(n).startswith("serie")), None)
    exigir(serie_hoja is not None, f"no está la hoja 'Serie …' en formato largo; hojas: {list(hojas)}")
    cruce = _totales_serie(hojas[serie_hoja])  # type: ignore[index]

    puntos: list[dict[str, Any]] = []
    for nombre in anuales:
        t = _tabla_anual(nombre.strip(), hojas[nombre])
        anio = t["anio"]
        exigir(anio in cruce, f"{anio}: la hoja Serie no trae ese año")
        exigir(abs(cruce[anio] - t["total"]) <= 2,
               f"{anio}: total de la tabla ({t['total']:.0f}) ≠ suma de provincias en Serie ({cruce[anio]:.0f})")
        p: dict[str, Any] = {"periodo": str(anio), "fecha_corte": f"{anio}-12-31"}
        p.update({c: int(round(v)) for c, v in t["valores"].items()})
        p["total"] = int(round(t["total"]))
        p["vacas_sobre_total"] = round(t["valores"]["vacas"] / t["total"], 6)
        p["estimado"] = t["estimado"]
        puntos.append(p)

    return SerieExterna(
        id=ID,
        unidad="cabezas",
        frecuencia="anual",
        puntos=puntos,
        procedencia=Procedencia(
            fuente="SAGyP (ex MAGyP) · Serie stock bovino por provincia al 31-12 · base SIGSA-SENASA",
            url=url,
            fecha_observacion=fecha_observacion,
            fecha_dato=f"{puntos[-1]['periodo']}-12",
            rezago="anual; el cierre al 31-12 se publica a principios de abril del año siguiente (~3 meses)",
            licencia=LICENCIA,
            nota=("Existencias al 31 de diciembre, NO a marzo (Res. ex-MAGyP 105/2019). "
                  "2007-2011 estimados por la fuente. Toritos sin discriminar antes de 2013."),
        ),
        columnas={
            "periodo": "año del cierre",
            "fecha_corte": "fecha de las existencias (31-12)",
            **{c: f"{c}, cabezas" for c in CATEGORIAS},
            "total": "total bovinos, cabezas",
            "vacas_sobre_total": "vacas / total bovinos (cociente de columnas publicadas)",
            "estimado": "la fuente marca el año como estimado",
        },
    )


_ENLACE = re.compile(r"""href=['"]([^'"]*Serie stock Bovino por provincia al 31-12[^'"]*\.xlsx)['"]""",
                     re.IGNORECASE)


def descubrir_url(pagina_html: str) -> str:
    """Del HTML de la página de informes, la URL del XLSX vigente (el de rango más nuevo)."""
    hrefs = {html.unescape(h) for h in _ENLACE.findall(pagina_html)}
    exigir(bool(hrefs), "la página de informes ya no enlaza 'Serie stock Bovino por provincia al 31-12 … .xlsx'")

    def fin_rango(h: str) -> int:
        m = re.search(r"\((\d{4})-(\d{4})\)", h)
        return int(m.group(2)) if m else 0

    href = max(hrefs, key=fin_rango)
    if "%" not in href:
        href = quote(href, safe="/=()_-.:")
    # Concatenar y no `urljoin`: urljoin colapsa el "//" que la página publica en el enlace.
    if href.startswith(("http://", "https://", "/")):
        return urljoin(PAGINA, href)
    return PAGINA + href


def obtener() -> SerieExterna:
    url = descubrir_url(descargar(PAGINA).decode("utf-8", errors="replace"))
    return parsear(descargar(url), url, hoy())


if __name__ == "__main__":
    serie = obtener()
    print(f"{serie.id}: {len(serie)} puntos, último {serie.procedencia.fecha_dato} "
          f"({serie.puntos[-1]['total']:,} cabezas)")
    if "--actualizar" in sys.argv:
        print("cache →", guardar_cache(serie))
