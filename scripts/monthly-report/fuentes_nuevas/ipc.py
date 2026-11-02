"""
IPC — Índice de Precios al Consumidor de Argentina, nivel general, mensual.

Sirve para DEFLACTAR: llevar el precio nominal del novillito a pesos constantes
de un mes base ("el novillito real desde 2006: el más caro/barato en 20 años").

DOS SERIES
1. `ipc-nacional` — INDEC, IPC nacional base diciembre 2016 = 100.
   Fuente: el CSV que publica el propio INDEC,
       https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv
   (separador `;`, coma decimal, codificación latin-1, `NA` = sin dato; filas
   con Codigo "0" + Region "Nacional" son el nivel general). Trae el índice y la
   variación mensual publicada (`v_m_IPC`, redondeada a un decimal).
   Arranca en 2016-12. Se publica ~día 12-15 del mes siguiente (el de
   septiembre sale a mediados de octubre).
   El parser también acepta la misma serie desde la API de series de tiempo
   (apis.datos.gob.ar, id `148.3_INIVELNAL_DICI_M_26` + variación
   `145.3_INGNACUAL_DICI_M_38`), pero la API viene un mes más atrasada que el
   CSV de INDEC: el 02-11-2026 la API llegaba a 2026-08 y el CSV a 2026-09.

2. `ipc-empalmado-2006` — la nacional hacia atrás hasta 2006-01, EMPALMADA.
   No existe una serie oficial nacional confiable para 2007-2015: el IPC-GBA
   base abril 2008 de INDEC (2007-2013) y el IPCNu (2014-2015) son del período
   intervenido, y el propio INDEC declaró en 2016 que esas series deben tomarse
   "con reservas"; entre nov-2015 y mar-2016 directamente no hay IPC de INDEC.
   Durante esa emergencia estadística el INDEC publicó como "IPC alternativos"
   el de la Ciudad de Buenos Aires y el de San Luis. Por eso los tramos son:

     tramo          | serie                                              | fuente
     2006-01..2016-03 | IPC San Luis, base 2003=100 (197.1_NIVEL_GENERAL_2014_0_13) | Dir. Prov. de Estadística y Censos de San Luis
     2016-04..2016-11 | IPC-GBA INDEC, base dic 2016=100 (101.1_I2NG_2016_M_22)     | INDEC
     2016-12..hoy     | IPC nacional INDEC, base dic 2016=100                        | INDEC

   Los dos tramos viejos se bajan juntos de la API de series de tiempo:
       https://apis.datos.gob.ar/series/api/series/?ids=197.1_NIVEL_GENERAL_2014_0_13,101.1_I2NG_2016_M_22&start_date=2006-01-01&end_date=2016-12-01&limit=1000&format=json

   MÉTODO DE EMPALME (función `empalmar`, explícito): retropolación por
   variaciones. Se respeta la variación mes a mes de cada tramo viejo y se lo
   reescala para que coincida con el tramo nuevo en el mes de enlace:
       I(t) = I_nuevo(enlace) × I_viejo(t) / I_viejo(enlace)     para t < enlace
   Enlaces: 2016-12 (GBA → nacional) y 2016-04 (San Luis → GBA). Cada punto
   lleva `empalmada: true/false`, `fuente`, `serie_id` e `indice_original`
   (el valor tal cual lo publica su organismo). NO es una serie oficial: es
   nuestra composición de tres series oficiales, y así hay que decirlo al pie
   del gráfico.

   SALVEDADES: San Luis es UNA provincia (canasta y ponderaciones propias, base
   2003) y no el promedio del país; el tramo GBA es una región. Las comparaciones
   "el más caro en 20 años" que caen antes de 2016-12 descansan en San Luis.

LICENCIA
- INDEC: todo el material del sitio está bajo Creative Commons; el enlace de
  términos (https://www.indec.gob.ar/indec/web/Institucional-Indec-TerminosCondiciones)
  apunta a CC BY-SA 4.0 → se puede republicar citando a INDEC y compartiendo
  el derivado bajo la misma licencia.
- apis.datos.gob.ar: los datasets 145/148/101/197 del catálogo `sspm` declaran
  "Creative Commons Attribution 4.0" en sus metadatos.
- Por eso el cache de ambas series se publica con atribución y bajo CC BY-SA 4.0.

TRAMPAS
- 2007-2015: IPC de INDEC intervenido. Nunca usar `97.2_ING_2008_M_17` ni el
  IPCNu (`124.3_NGI_OCTU_0_20`) para deflactar.
- La API de datos.gob.ar va atrasada respecto del CSV de INDEC (y San Luis en la
  API se corta antes que en su fuente). Ver `fecha_dato`.
- El CSV de INDEC trae las 7 regiones y todas las divisiones mezcladas; solo
  sirve Codigo "0" + Region "Nacional".
- La `v_m_IPC` de INDEC viene redondeada a 1 decimal: no recalcular el índice
  con ella; el índice manda.
- `deflactar` NO devuelve punto para un mes sin IPC: ni estima ni arrastra.
"""

from __future__ import annotations

import json
import sys
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
    from fuentes_nuevas._base import (FormatoCambiado, Procedencia, SerieExterna,  # type: ignore
                                      descargar, exigir, guardar_cache, hoy, numero_ar)
else:
    from ._base import (FormatoCambiado, Procedencia, SerieExterna, descargar, exigir,
                        guardar_cache, hoy, numero_ar)

ID_NACIONAL = "ipc-nacional"
ID_EMPALMADO = "ipc-empalmado-2006"

URL_INDEC_CSV = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv"
API = "https://apis.datos.gob.ar/series/api/series/"
SERIE_API_NACIONAL = "148.3_INIVELNAL_DICI_M_26"
SERIE_API_VAR_NACIONAL = "145.3_INGNACUAL_DICI_M_38"
SERIE_SAN_LUIS = "197.1_NIVEL_GENERAL_2014_0_13"
SERIE_GBA_2016 = "101.1_I2NG_2016_M_22"
URL_API_NACIONAL = f"{API}?ids={SERIE_API_NACIONAL},{SERIE_API_VAR_NACIONAL}&limit=5000&format=json"
URL_API_TRAMOS = (f"{API}?ids={SERIE_SAN_LUIS},{SERIE_GBA_2016}"
                  "&start_date=2006-01-01&end_date=2016-12-01&limit=1000&format=json")

ENCABEZADO_INDEC = ["Codigo", "Descripcion", "Clasificador", "Periodo",
                    "Indice_IPC", "v_m_IPC", "v_i_a_IPC", "Region"]
DESDE_EMPALME = "2006-01"
ENLACE_GBA = "2016-04"       # primer mes del IPC-GBA INDEC normalizado
ENLACE_NACIONAL = "2016-12"  # primer mes del IPC nacional

LICENCIA_INDEC = ("CC BY-SA 4.0 · INDEC (https://www.indec.gob.ar/indec/web/"
                  "Institucional-Indec-TerminosCondiciones). Citar: INDEC, IPC.")
LICENCIA_API = ("Creative Commons Attribution 4.0 (metadatos del catálogo sspm de "
                "apis.datos.gob.ar, https://datos.gob.ar)")
REZAGO = "~día 12-15 del mes siguiente (INDEC); la API de datos.gob.ar suma ~1 mes más"

FUENTE_NACIONAL = "INDEC · IPC nacional, nivel general, base dic-2016=100"
FUENTE_GBA = "INDEC · IPC-GBA, nivel general, base dic-2016=100"
FUENTE_SAN_LUIS = "Dir. Prov. de Estadística y Censos de San Luis · IPC San Luis, base 2003=100"

# rangos plausibles: deflación mensual > -5% o inflación > 30% mensual = algo se rompió
VAR_MIN, VAR_MAX = -5.0, 30.0


# ─── utilidades ────────────────────────────────────────────────────────────────

def _mes_siguiente(p: str) -> str:
    a, m = int(p[:4]), int(p[5:7])
    return f"{a + (m == 12)}-{m % 12 + 1:02d}"


def _validar_continua(puntos: list[dict[str, Any]], nombre: str) -> None:
    """Meses ordenados, sin duplicados ni huecos, índices > 0 y variaciones plausibles."""
    for a, b in zip(puntos, puntos[1:]):
        exigir(b["periodo"] == _mes_siguiente(a["periodo"]),
               f"{nombre}: esperaba {_mes_siguiente(a['periodo'])} después de {a['periodo']}, encontré {b['periodo']}")
        var = (b["indice"] / a["indice"] - 1) * 100
        exigir(VAR_MIN < var < VAR_MAX,
               f"{nombre}: variación {var:.1f}% en {b['periodo']} fuera de [{VAR_MIN}, {VAR_MAX}]")
    for p in puntos:
        exigir(isinstance(p["indice"], float) and 0 < p["indice"] < 1e9,
               f"{nombre}: índice implausible en {p['periodo']}: {p['indice']!r}")


# ─── parsers puros ─────────────────────────────────────────────────────────────

def _parsear_indec_csv(contenido: bytes) -> list[dict[str, Any]]:
    texto = contenido.decode("latin-1")
    lineas = [l for l in texto.splitlines() if l.strip()]
    exigir(bool(lineas), "CSV INDEC vacío")
    enc = [c.strip().strip('"') for c in lineas[0].split(";")]
    exigir(enc == ENCABEZADO_INDEC, f"encabezado INDEC: esperaba {ENCABEZADO_INDEC}, encontré {enc}")
    puntos: list[dict[str, Any]] = []
    for nro, l in enumerate(lineas[1:], start=2):
        c = [x.strip().strip('"') for x in l.split(";")]
        exigir(len(c) == 8, f"línea {nro}: esperaba 8 columnas, encontré {len(c)}")
        if c[0] != "0" or c[7] != "Nacional":
            continue
        exigir(c[1].upper() == "NIVEL GENERAL", f"línea {nro}: Codigo 0 no es NIVEL GENERAL: {c[1]!r}")
        exigir(len(c[3]) == 6 and c[3].isdigit(), f"línea {nro}: Periodo no es YYYYMM: {c[3]!r}")
        periodo = f"{c[3][:4]}-{c[3][4:]}"
        indice = numero_ar(c[4])
        exigir(indice is not None, f"línea {nro}: índice vacío en {periodo}")
        p: dict[str, Any] = {"periodo": periodo, "indice": indice}
        if c[5] not in ("NA", ""):
            p["var_mensual_pct"] = numero_ar(c[5])
        puntos.append(p)
    exigir(bool(puntos), "CSV INDEC sin filas de nivel general Nacional")
    puntos.sort(key=lambda p: p["periodo"])
    exigir(puntos[0]["periodo"] == "2016-12" and abs(puntos[0]["indice"] - 100) < 1e-6,
           f"INDEC: esperaba 2016-12 = 100 (base), encontré {puntos[0]['periodo']} = {puntos[0]['indice']}")
    # la variación publicada (1 decimal) tiene que cerrar con el índice
    for a, b in zip(puntos, puntos[1:]):
        if "var_mensual_pct" in b:
            calc = (b["indice"] / a["indice"] - 1) * 100
            exigir(abs(calc - b["var_mensual_pct"]) <= 0.06,
                   f"INDEC {b['periodo']}: v_m_IPC {b['var_mensual_pct']} no cierra con el índice ({calc:.2f})")
    return puntos


def _api_columnas(contenido: bytes, esperadas: list[str]) -> list[list[Any]]:
    try:
        d = json.loads(contenido.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise FormatoCambiado(f"API series: no es JSON: {e}") from e
    exigir(isinstance(d, dict) and "data" in d and "meta" in d, "API series: faltan 'data'/'meta'")
    ids = [m.get("field", {}).get("id") for m in d["meta"][1:]]
    exigir(ids == esperadas, f"API series: esperaba columnas {esperadas}, encontré {ids}")
    for fila in d["data"]:
        exigir(isinstance(fila, list) and len(fila) == len(esperadas) + 1,
               f"API series: fila con forma inesperada: {fila!r}")
        exigir(isinstance(fila[0], str) and len(fila[0]) == 10 and fila[0].endswith("-01"),
               f"API series: fecha inesperada: {fila[0]!r}")
    return d["data"]


def _parsear_api_nacional(contenido: bytes) -> list[dict[str, Any]]:
    filas = _api_columnas(contenido, [SERIE_API_NACIONAL, SERIE_API_VAR_NACIONAL])
    puntos = []
    for f in filas:
        if f[1] is None:
            continue
        p: dict[str, Any] = {"periodo": f[0][:7], "indice": float(f[1])}
        if f[2] is not None:
            p["var_mensual_pct"] = float(f[2]) * 100  # la API la da como fracción
        puntos.append(p)
    exigir(bool(puntos), "API nacional sin datos")
    exigir(puntos[0]["periodo"] == "2016-12" and abs(puntos[0]["indice"] - 100) < 1e-6,
           f"API nacional: esperaba 2016-12 = 100, encontré {puntos[0]['periodo']} = {puntos[0]['indice']}")
    return puntos


def parsear(contenido: bytes, url: str, fecha_observacion: str) -> SerieExterna:
    """IPC nacional (`ipc-nacional`) desde el CSV de INDEC o desde la API de series."""
    if "apis.datos.gob.ar" in url:
        puntos, fuente, licencia = (_parsear_api_nacional(contenido),
                                    f"{FUENTE_NACIONAL} (vía apis.datos.gob.ar, id {SERIE_API_NACIONAL})",
                                    LICENCIA_API)
    else:
        puntos, fuente, licencia = _parsear_indec_csv(contenido), FUENTE_NACIONAL, LICENCIA_INDEC
    _validar_continua(puntos, ID_NACIONAL)
    return SerieExterna(
        id=ID_NACIONAL, unidad="índice dic-2016=100", frecuencia="mensual", puntos=puntos,
        procedencia=Procedencia(
            fuente=fuente, url=url, fecha_observacion=fecha_observacion,
            fecha_dato=puntos[-1]["periodo"], rezago=REZAGO, licencia=licencia,
            nota="Arranca en 2016-12. Para 2006-2016 usar ipc-empalmado-2006 (ver docstring)."),
        columnas={"indice": "IPC nivel general nacional, dic-2016=100",
                  "var_mensual_pct": "variación mensual % publicada por la fuente (INDEC: 1 decimal)"},
    )


def parsear_tramos(contenido: bytes, desde: str = DESDE_EMPALME) -> dict[str, list[dict[str, Any]]]:
    """
    Tramos históricos desde la API (columnas San Luis y GBA-2016, en ese orden).
    Devuelve {"san_luis": [...], "gba": [...]} con los índices TAL CUAL los publica
    cada organismo (sin reescalar). Puro.
    """
    filas = _api_columnas(contenido, [SERIE_SAN_LUIS, SERIE_GBA_2016])
    sl = [{"periodo": f[0][:7], "indice": float(f[1])} for f in filas
          if f[1] is not None and f[0][:7] >= desde]
    gba = [{"periodo": f[0][:7], "indice": float(f[2])} for f in filas if f[2] is not None]
    exigir(bool(sl) and sl[0]["periodo"] == desde,
           f"San Luis: esperaba arrancar en {desde}, encontré {sl[0]['periodo'] if sl else 'nada'}")
    exigir(bool(gba) and gba[0]["periodo"] == ENLACE_GBA,
           f"IPC-GBA: esperaba arrancar en {ENLACE_GBA}, encontré {gba[0]['periodo'] if gba else 'nada'}")
    exigir(any(p["periodo"] == ENLACE_NACIONAL and abs(p["indice"] - 100) < 1e-6 for p in gba),
           f"IPC-GBA: esperaba {ENLACE_NACIONAL} = 100 (base dic-2016)")
    exigir(any(p["periodo"] == ENLACE_GBA for p in sl), f"San Luis: falta el mes de enlace {ENLACE_GBA}")
    _validar_continua(sl, "San Luis")
    _validar_continua(gba, "IPC-GBA")
    return {"san_luis": sl, "gba": gba}


# ─── empalme explícito ─────────────────────────────────────────────────────────

def _retropolar(viejo: list[dict[str, Any]], enlace: str, valor_enlace: float,
                fuente: str, serie_id: str) -> list[dict[str, Any]]:
    """Puntos de `viejo` anteriores a `enlace`, reescalados para valer `valor_enlace` en `enlace`."""
    base = next((p["indice"] for p in viejo if p["periodo"] == enlace), None)
    exigir(base is not None, f"{serie_id}: falta el mes de enlace {enlace}")
    return [{"periodo": p["periodo"], "indice": valor_enlace * p["indice"] / base,
             "empalmada": True, "fuente": fuente, "serie_id": serie_id,
             "indice_original": p["indice"], "enlace": enlace}
            for p in viejo if p["periodo"] < enlace]


def empalmar(nacional: SerieExterna, tramos: dict[str, list[dict[str, Any]]],
             url_tramos: str, fecha_observacion: str) -> SerieExterna:
    """
    Arma `ipc-empalmado-2006` = San Luis (..2016-03) → IPC-GBA (2016-04..2016-11) →
    IPC nacional (2016-12..). Retropolación por variaciones en cada enlace (ver
    docstring del módulo). Pura: no baja nada.
    """
    nac = {p["periodo"]: p for p in nacional.puntos}
    exigir(ENLACE_NACIONAL in nac, f"IPC nacional sin {ENLACE_NACIONAL}")
    tramo_nac = [{"periodo": p["periodo"], "indice": p["indice"], "empalmada": False,
                  "fuente": FUENTE_NACIONAL, "serie_id": ID_NACIONAL, "indice_original": p["indice"],
                  **({"var_mensual_pct": p["var_mensual_pct"]} if "var_mensual_pct" in p else {})}
                 for p in nacional.puntos if p["periodo"] >= ENLACE_NACIONAL]
    tramo_gba = _retropolar(tramos["gba"], ENLACE_NACIONAL, nac[ENLACE_NACIONAL]["indice"],
                            FUENTE_GBA, SERIE_GBA_2016)
    exigir(bool(tramo_gba) and tramo_gba[0]["periodo"] == ENLACE_GBA,
           f"IPC-GBA: el tramo empalmado tiene que arrancar en {ENLACE_GBA}")
    tramo_sl = _retropolar(tramos["san_luis"], ENLACE_GBA, tramo_gba[0]["indice"],
                           FUENTE_SAN_LUIS, SERIE_SAN_LUIS)
    puntos = tramo_sl + tramo_gba + tramo_nac
    _validar_continua(puntos, ID_EMPALMADO)
    return SerieExterna(
        id=ID_EMPALMADO, unidad="índice dic-2016=100 (empalmado)", frecuencia="mensual",
        puntos=puntos,
        procedencia=Procedencia(
            fuente=(f"Empalme de El Corredor: {FUENTE_SAN_LUIS} (2006-01..2016-03) + "
                    f"{FUENTE_GBA} (2016-04..2016-11) + {FUENTE_NACIONAL} (2016-12..)"),
            url=f"{url_tramos} + {nacional.procedencia.url}",
            fecha_observacion=fecha_observacion,
            fecha_dato=puntos[-1]["periodo"], rezago=REZAGO,
            licencia=f"{LICENCIA_INDEC} · tramos viejos: {LICENCIA_API}",
            nota=("NO es serie oficial: empalme por retropolación de variaciones en 2016-12 y "
                  "2016-04. Antes de 2016-04 refleja el IPC de San Luis, no el nacional. "
                  "El IPC de INDEC 2007-2015 (intervenido) no se usa.")),
        columnas={"indice": "índice empalmado, dic-2016=100",
                  "empalmada": "true si el punto viene de un tramo reescalado",
                  "fuente": "organismo y serie del tramo",
                  "serie_id": "id de la serie de origen",
                  "indice_original": "índice tal cual lo publica la fuente del tramo",
                  "enlace": "mes en que el tramo se pegó al siguiente",
                  "var_mensual_pct": "solo tramo nacional: variación publicada por INDEC"},
    )


# ─── deflactor ─────────────────────────────────────────────────────────────────

def deflactar(puntos_precio: list[dict[str, Any]], ipc: SerieExterna, base: str) -> list[dict[str, Any]]:
    """
    Precios nominales mensuales [{"periodo": "YYYY-MM", "valor": x}] → pesos constantes
    del mes `base`:  valor_real = valor × IPC(base) / IPC(periodo).
    Un mes sin IPC (o sin precio) NO aparece en la salida: no se estima ni se arrastra.
    Si el punto del IPC está empalmado, la salida lo dice (`ipc_empalmado: true`).
    """
    idx = {p["periodo"]: p for p in ipc.puntos if p.get("indice") is not None}
    if base not in idx:
        raise ValueError(f"no hay IPC para el mes base {base} en {ipc.id} (último: {ipc.procedencia.fecha_dato})")
    ipc_base = idx[base]["indice"]
    salida = []
    for p in puntos_precio:
        q = idx.get(p.get("periodo"))
        if q is None or p.get("valor") is None:
            continue
        salida.append({"periodo": p["periodo"], "valor": p["valor"] * ipc_base / q["indice"],
                       "valor_nominal": p["valor"], "base": base,
                       "ipc_empalmado": bool(q.get("empalmada", False))})
    return salida


# ─── red ───────────────────────────────────────────────────────────────────────

def obtener() -> SerieExterna:
    return parsear(descargar(URL_INDEC_CSV), URL_INDEC_CSV, hoy())


def obtener_empalmado(nacional: SerieExterna | None = None) -> SerieExterna:
    nacional = nacional or obtener()
    return empalmar(nacional, parsear_tramos(descargar(URL_API_TRAMOS)), URL_API_TRAMOS, hoy())


if __name__ == "__main__":
    if "--actualizar" in sys.argv:
        n = obtener()
        print(guardar_cache(n), len(n), n.procedencia.fecha_dato)
        e = obtener_empalmado(n)
        print(guardar_cache(e), len(e), e.puntos[0]["periodo"], "→", e.procedencia.fecha_dato)
    else:
        print(__doc__)
