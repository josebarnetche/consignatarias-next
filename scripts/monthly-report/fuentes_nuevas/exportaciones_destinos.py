"""
Exportaciones mensuales de carne bovina POR DESTINO (INDEC · base usuario NCM × país).

Mismo archivo que `exportaciones.py` (https://comex.indec.gob.ar/files/zips/exports_AAAA_M.zip,
sin login, CC BY-SA 4.0 citando «Fuente: INDEC»), mismas NCM (02.01 + 02.02), misma
unidad: toneladas PESO PRODUCTO y millones de US$ FOB. Mensual desde 2002-01; al
2026-11-02 el último mes es 2026-09. Leer ahí la licencia y las trampas generales.

QUÉ DEVUELVE
    Por mes, el total y una apertura en grupos DISJUNTOS que suman exacto el total:
        china · israel · estados_unidos · chile · ue27 · rusia · brasil · hong_kong ·
        canada · mexico · reino_unido · confidencial · resto
    `resto` = total − suma de los grupos anteriores (aritmética, no estimación).
    Además, como DETALLE DENTRO de ue27 (no sumar con ue27): alemania · paises_bajos · italia.

TRAMPAS PROPIAS DE LOS DESTINOS
    1. CONFIDENCIAL (país 999, desde 2018). Usamos el archivo que prioriza NCM: el
       total de carne está completo, pero el país con pocos exportadores en esa NCM y
       ese mes va al 999. Un país puede "desaparecer" un mes por secreto estadístico,
       no porque no se le vendió. Nunca se reparte el 999 entre países.
    2. CHINA INFLADA EN TONELADAS por los huesos de desposte (NCM 0202.20.90, a precio
       bajo): el US$/t de China no es comparable con el de Israel o la UE.
    3. UE27 = composición FIJA de los 27 miembros actuales (criterio Eurostat EU27_2020)
       para toda la serie: Reino Unido va aparte también antes del Brexit, y Croacia
       cuenta desde 2002 aunque entró en 2013.
    4. Zonas francas con código propio del INDEC: Iquique (260) y Punta Arenas (261) se
       suman a Chile; Manaos (291) a Brasil. 998 "Indeterminado (continente)" va a resto.
    5. Códigos de país del INDEC (no ISO): tabla en
       https://comexbe.indec.gob.ar/public-api/search/countries?i18n=es&term=

Uso:  python3 -m fuentes_nuevas.exportaciones_destinos --actualizar   (desde scripts/monthly-report)
"""

from __future__ import annotations

import sys

from ._base import Procedencia, SerieExterna, exigir, guardar_cache, hoy
from .exportaciones import (FUENTE, LICENCIA, PRIMER_ANIO, REZAGO, URL_PLANTILLA, BaseAnual,
                            bajar_anios, combinar, leer_zip)

ID = "exportaciones-carne-bovina-destinos"

UE27 = frozenset({405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 417, 419, 420, 423, 424, 425,
                  427, 429, 435, 438, 440, 441, 442, 447, 448, 449, 451})

# Grupos disjuntos, en orden de publicación. Códigos de país del INDEC.
GRUPOS: list[tuple[str, frozenset[int], str]] = [
    ("china", frozenset({310}), "China (310; Hong Kong va aparte)"),
    ("israel", frozenset({319}), "Israel (319)"),
    ("estados_unidos", frozenset({212}), "Estados Unidos (212)"),
    ("chile", frozenset({208, 260, 261}), "Chile (208) + zonas francas Iquique (260) y Punta Arenas (261)"),
    ("ue27", UE27, "Unión Europea, 27 miembros actuales, composición fija"),
    ("rusia", frozenset({444}), "Rusia (444)"),
    ("brasil", frozenset({203, 291}), "Brasil (203) + Manaos (291)"),
    ("hong_kong", frozenset({341}), "Hong Kong (341)"),
    ("canada", frozenset({204}), "Canadá (204)"),
    ("mexico", frozenset({218}), "México (218)"),
    ("reino_unido", frozenset({426}), "Reino Unido (426)"),
    ("confidencial", frozenset({999}), "País 999: destinos con pocos operadores, secreto estadístico"),
]
DETALLE_UE = [("alemania", 438), ("paises_bajos", 423), ("italia", 417)]

_todos = [c for _, cs, _ in GRUPOS for c in cs]
assert len(_todos) == len(set(_todos)), "GRUPOS no son disjuntos"


def puntos_destinos(base: BaseAnual) -> list[dict]:
    acc: dict[int, dict[int, list[float]]] = {}
    for f in base.filas_carne:
        par = acc.setdefault(f.mes, {}).setdefault(f.pais, [0.0, 0.0])
        par[0] += f.kg
        par[1] += f.usd
    puntos = []
    for mes in base.meses:
        por_pais = acc.get(mes)
        periodo = f"{base.anio}-{mes:02d}"
        exigir(bool(por_pais), f"{base.archivo}: {periodo} sin filas de carne 02.01/02.02")
        tot_kg = sum(v[0] for v in por_pais.values())
        tot_usd = sum(v[1] for v in por_pais.values())
        p: dict = {"periodo": periodo,
                   "toneladas_total": round(tot_kg / 1000, 3),
                   "fob_musd_total": round(tot_usd / 1e6, 6)}
        sum_kg = sum_usd = 0.0
        for slug, codigos, _ in GRUPOS:
            kg = sum(v[0] for c, v in por_pais.items() if c in codigos)
            usd = sum(v[1] for c, v in por_pais.items() if c in codigos)
            sum_kg += kg
            sum_usd += usd
            p[f"toneladas_{slug}"] = round(kg / 1000, 3)
            p[f"fob_musd_{slug}"] = round(usd / 1e6, 6)
        resto_kg, resto_usd = tot_kg - sum_kg, tot_usd - sum_usd
        exigir(resto_kg >= -1e-6 and resto_usd >= -1e-6, f"{periodo}: resto negativo, grupos superpuestos")
        p["toneladas_resto"] = round(resto_kg / 1000, 3)
        p["fob_musd_resto"] = round(resto_usd / 1e6, 6)
        for slug, c in DETALLE_UE:
            kg, usd = por_pais.get(c, [0.0, 0.0])
            p[f"toneladas_{slug}"] = round(kg / 1000, 3)
            p[f"fob_musd_{slug}"] = round(usd / 1e6, 6)
        puntos.append(p)
    return puntos


def _columnas() -> dict[str, str]:
    col = {"periodo": "AAAA-MM",
           "toneladas_total": "t peso producto, NCM 02.01 + 02.02, todos los destinos",
           "fob_musd_total": "millones US$ FOB, todos los destinos"}
    for slug, _, desc in GRUPOS:
        col[f"toneladas_{slug}"] = f"t peso producto · {desc}"
        col[f"fob_musd_{slug}"] = f"millones US$ FOB · {desc}"
    col["toneladas_resto"] = "t · total menos los grupos anteriores (incluye 998 Indeterminado)"
    col["fob_musd_resto"] = "millones US$ FOB · total menos los grupos anteriores"
    for slug, c in DETALLE_UE:
        col[f"toneladas_{slug}"] = f"t · país {c}, DETALLE DE ue27 (no sumar con ue27)"
        col[f"fob_musd_{slug}"] = f"millones US$ FOB · país {c}, detalle de ue27"
    return col


def parsear(contenido: bytes, url: str, fecha_observacion: str) -> SerieExterna:
    """Un ZIP anual (exports_AAAA_M.zip) → destinos de ese año. Pura: no toca la red."""
    base = leer_zip(contenido)
    puntos = puntos_destinos(base)
    nota = (f"{base.archivo}: archivo priorizando NCM; {base.confidenciales_carne} filas país×NCM con 's' "
            "están dentro del país 999 (grupo `confidencial`).")
    return SerieExterna(id=ID, unidad="t peso producto · millones US$ FOB", frecuencia="mensual",
                        puntos=puntos, columnas=_columnas(),
                        procedencia=Procedencia(fuente=FUENTE + " · por destino", url=url,
                                                fecha_observacion=fecha_observacion,
                                                fecha_dato=puntos[-1]["periodo"], rezago=REZAGO,
                                                licencia=LICENCIA, nota=nota))


def obtener(desde: int = PRIMER_ANIO, archivos: list[tuple[int, str, bytes]] | None = None) -> SerieExterna:
    archivos = archivos if archivos is not None else bajar_anios(desde)
    obs = hoy()
    series = [parsear(c, u, obs) for _, u, c in archivos]
    nota = (f"Historia armada con {len(archivos)} ZIP anuales {URL_PLANTILLA.format(anio='AAAA')} "
            f"({archivos[0][0]}–{archivos[-1][0]}); `url` es el del último año.")
    s = combinar(series, archivos[-1][1], obs, nota)
    s.procedencia.fuente = FUENTE + " · por destino"
    return s


if __name__ == "__main__":
    if "--actualizar" in sys.argv:
        s = obtener()
        print(guardar_cache(s), len(s), "puntos, último", s.procedencia.fecha_dato)
    else:
        print(__doc__)
