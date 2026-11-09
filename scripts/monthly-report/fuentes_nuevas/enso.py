"""
Estado ENSO (El Niño / La Niña) mensual — NOAA Climate Prediction Center.

QUÉ TRAE
    El índice oceánico del Niño en sus dos versiones que publica el CPC:
    - **ONI** (Oceanic Niño Index): media móvil de 3 meses de la anomalía de
      temperatura del mar en la región Niño 3.4 (ERSSTv5), contra una base de
      30 años que se corre cada 5. Es el índice "clásico".
      https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
    - **RONI** (Relative ONI): la misma anomalía Niño 3.4 menos la anomalía
      media del cinturón tropical 20°S–20°N, reescalada. **Es el índice OFICIAL
      del CPC desde el 1 de febrero de 2026** (NWS PNS 26-05); el CPC lo
      recalculó hacia atrás hasta 1950 y sigue actualizando el ONI "por
      continuidad".
      https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt
      Aviso: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/announcement.php

    Puntos: {"periodo": "YYYY-MM" (mes central del trimestre), "temporada":
    "DJF"…"NDJ", "oni", "roni", "fase", "episodio", "indice_fase"}.

TRIMESTRE MÓVIL → PERÍODO
    El dato "JAS 2026" es el promedio jul-ago-sep 2026 y se fecha en el mes
    central: "2026-08". "NDJ 1997" (nov-97/ene-98) es "1997-12": en el archivo
    del CPC el año de NDJ es el de diciembre, y el de DJF el de enero.

FASE Y EPISODIO (dos cosas distintas, no confundirlas)
    - `fase`: umbral del MES, nada más. "Niño" si el índice ≥ +0,5 °C, "Niña"
      si ≤ −0,5 °C, "Neutral" en el medio. Se aplica sobre el valor publicado
      (dos decimales), no sobre el redondeado a un decimal de la tabla web.
    - `episodio`: la regla OFICIAL del CPC — hay episodio Niño (Niña) cuando el
      umbral se cumple en al menos **5 trimestres móviles consecutivos**. Cada
      trimestre de esa racha se marca "Niño"/"Niña"; el resto, "Neutral".
      Si la racha toca el FINAL del archivo y todavía no llega a 5, el episodio
      no se puede decidir hoy: se marca "pendiente" (no se adivina). Lo mismo si
      toca el PRINCIPIO del archivo (la racha puede venir de antes): "pendiente".
    - `indice_fase` dice sobre qué índice se calcularon `fase` y `episodio`:
      "RONI" si se pasó el archivo RONI (lo normal en `obtener()`), "ONI" si no.
      OJO: con RONI, 2024-25 y 2025-26 fueron La Niña; con ONI, neutrales.

REZAGO
    El CPC actualiza ambos archivos en la primera semana hábil de cada mes
    (junto con el "ENSO Diagnostic Discussion", segundo jueves). El 2-nov-2026
    el último trimestre publicado es JAS 2026 (período "2026-08"): el rezago
    efectivo es de ~1 mes después del cierre del trimestre.

TRAMPAS
    - **NOAA revisa los valores recientes.** La base climatológica del ONI se
      corre cada 5 años y ERSSTv5 se reprocesa: los últimos meses (y a veces
      años) cambian entre una descarga y la siguiente. Siempre re-bajar el
      archivo entero; nunca "anexar" el mes nuevo a un cache viejo.
    - El ONI y el RONI tienen columnas distintas: ONI = SEAS YR TOTAL ANOM;
      RONI = SEAS YR ANOM. El parser exige cada encabezado exacto.
    - El pronóstico probabilístico (IRI/CPC) NO viene acá: el IRI dejó de
      publicar los datos ("We are no longer providing forecast data") y el CPC
      lo publica solo como imagen y texto. Ver el reporte de evaluación.

LICENCIA
    Producto del gobierno federal de EE.UU. (NOAA/NWS): dominio público
    (17 U.S.C. §105). Política de NWS: https://www.weather.gov/disclaimer
    Se cita "NOAA Climate Prediction Center" como fuente.

Uso:
    python3 -m fuentes_nuevas.enso --actualizar   # baja ONI + RONI y guarda el cache
"""

from __future__ import annotations

import sys
from typing import Any

try:
    from ._base import (FormatoCambiado, Procedencia, SerieExterna, descargar,
                        exigir, guardar_cache, hoy)
except ImportError:  # ejecutado como script suelto
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
    from fuentes_nuevas._base import (FormatoCambiado, Procedencia, SerieExterna,  # type: ignore
                                      descargar, exigir, guardar_cache, hoy)

ID = "enso-oni"
URL_ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
URL_RONI = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
FUENTE = "NOAA Climate Prediction Center · ONI y RONI (Niño 3.4, ERSSTv5)"
LICENCIA = ("Dominio público (gobierno federal de EE.UU., 17 U.S.C. §105) · "
            "https://www.weather.gov/disclaimer")
REZAGO = "~1 mes después del cierre del trimestre móvil (actualiza la 1.ª semana de cada mes)"

TEMPORADAS = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ",
              "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]
UMBRAL = 0.5
TRIMESTRES_EPISODIO = 5
ENCABEZADO_ONI = ["SEAS", "YR", "TOTAL", "ANOM"]
ENCABEZADO_RONI = ["SEAS", "YR", "ANOM"]


# ─── lectura de los archivos ───────────────────────────────────────────────────

def _filas(contenido: bytes, encabezado: list[str], nombre: str) -> list[tuple[str, int, list[float]]]:
    """Valida encabezado, continuidad y rangos. Devuelve [(temporada, año, valores)]."""
    try:
        texto = contenido.decode("ascii")
    except UnicodeDecodeError as e:
        raise FormatoCambiado(f"{nombre}: no es texto ASCII ({e})") from e
    lineas = [l.split() for l in texto.splitlines() if l.strip()]
    exigir(bool(lineas), f"{nombre}: archivo vacío")
    exigir(lineas[0] == encabezado,
           f"{nombre}: esperaba encabezado {encabezado}, encontré {lineas[0]}")
    filas: list[tuple[str, int, list[float]]] = []
    previo: tuple[int, int] | None = None
    for n, partes in enumerate(lineas[1:], start=2):
        exigir(len(partes) == len(encabezado),
               f"{nombre} línea {n}: esperaba {len(encabezado)} columnas, encontré {partes}")
        temporada, anio_txt, *nums = partes
        exigir(temporada in TEMPORADAS, f"{nombre} línea {n}: temporada desconocida {temporada!r}")
        try:
            anio = int(anio_txt)
            valores = [float(x) for x in nums]
        except ValueError as e:
            raise FormatoCambiado(f"{nombre} línea {n}: número ilegible en {partes}") from e
        exigir(1950 <= anio <= 2100, f"{nombre} línea {n}: año fuera de rango {anio}")
        anom = valores[-1]
        exigir(-4.0 <= anom <= 4.5, f"{nombre} línea {n}: anomalía implausible {anom}")
        if len(valores) == 2:  # ONI trae la temperatura absoluta del mar
            exigir(20.0 <= valores[0] <= 32.0, f"{nombre} línea {n}: TOTAL implausible {valores[0]} °C")
        mes = TEMPORADAS.index(temporada) + 1
        actual = (anio, mes)
        if previo is not None:
            esperado = (previo[0] + (previo[1] == 12), previo[1] % 12 + 1)
            exigir(actual == esperado,
                   f"{nombre} línea {n}: salto en la serie, esperaba "
                   f"{TEMPORADAS[esperado[1] - 1]} {esperado[0]} y encontré {temporada} {anio}")
        previo = actual
        filas.append((temporada, anio, valores))
    exigir(bool(filas), f"{nombre}: sin filas de datos")
    return filas


def _periodo(temporada: str, anio: int) -> str:
    return f"{anio:04d}-{TEMPORADAS.index(temporada) + 1:02d}"


def parsear_roni(contenido: bytes) -> dict[str, float]:
    """RONI.ascii.txt → {periodo: roni}. Pura."""
    return {_periodo(t, a): v[-1] for t, a, v in _filas(contenido, ENCABEZADO_RONI, "RONI")}


# ─── clasificación ─────────────────────────────────────────────────────────────

def fase_mes(valor: float | None) -> str | None:
    """Umbral del mes: ≥ +0,5 Niño · ≤ −0,5 Niña · si no, Neutral. Sin valor → None."""
    if valor is None:
        return None
    if valor >= UMBRAL:
        return "Niño"
    if valor <= -UMBRAL:
        return "Niña"
    return "Neutral"


def episodios(valores: list[float | None]) -> list[str | None]:
    """
    Regla oficial del CPC: ≥ 5 trimestres móviles consecutivos sobre el umbral.
    Las rachas que tocan un borde de la serie (o un faltante) y no llegan a 5 → "pendiente".
    Un valor faltante corta la racha y queda en None (no se estima).
    """
    fases = [fase_mes(v) for v in valores]
    salida: list[str | None] = list(fases)
    i = 0
    while i < len(fases):
        f = fases[i]
        if f not in ("Niño", "Niña"):
            i += 1
            continue
        j = i
        while j < len(fases) and fases[j] == f:
            j += 1
        largo = j - i
        # borde = principio/fin de la serie o un faltante: la racha puede seguir del otro lado
        toca_borde = i == 0 or j == len(fases) or fases[i - 1] is None or fases[j] is None
        if largo >= TRIMESTRES_EPISODIO:
            etiqueta = f
        elif toca_borde:
            etiqueta = "pendiente"
        else:
            etiqueta = "Neutral"
        for k in range(i, j):
            salida[k] = etiqueta
        i = j
    return salida


# ─── serie ─────────────────────────────────────────────────────────────────────

def parsear(contenido: bytes, url: str, fecha_observacion: str,
            contenido_roni: bytes | None = None, url_roni: str | None = None) -> SerieExterna:
    """
    oni.ascii.txt (+ opcional RONI.ascii.txt) → SerieExterna. Pura: no toca la red.
    Con RONI, `fase` y `episodio` se calculan sobre el RONI (índice oficial
    desde feb-2026); sin RONI, sobre el ONI. `indice_fase` lo declara.
    """
    filas = _filas(contenido, ENCABEZADO_ONI, "ONI")
    roni = parsear_roni(contenido_roni) if contenido_roni is not None else None
    puntos: list[dict[str, Any]] = []
    for temporada, anio, valores in filas:
        periodo = _periodo(temporada, anio)
        puntos.append({
            "periodo": periodo,
            "temporada": temporada,
            "oni": valores[1],
            "roni": None if roni is None else roni.get(periodo),
        })
    if roni is not None:
        sobrantes = sorted(set(roni) - {p["periodo"] for p in puntos})
        exigir(not sobrantes or all(s > puntos[-1]["periodo"] for s in sobrantes),
               f"RONI trae períodos que el ONI no tiene en el medio de la serie: {sobrantes[:5]}")
    indice = "RONI" if roni is not None else "ONI"
    clave = indice.lower()
    serie_idx = [p[clave] for p in puntos]
    for p, ep in zip(puntos, episodios(serie_idx)):
        p["fase"] = fase_mes(p[clave])
        p["episodio"] = ep
        p["indice_fase"] = indice

    nota = ("Trimestre móvil fechado en el mes central. `fase` = solo umbral ±0,5 °C del mes; "
            "`episodio` = regla oficial CPC de 5 trimestres consecutivos ('pendiente' si la racha "
            f"toca el borde de la serie y no llega a 5). Clasificación sobre {indice}. "
            "NOAA revisa los valores recientes en cada actualización.")
    if roni is not None:
        nota += f" RONI: {url_roni or URL_RONI} (índice oficial del CPC desde el 01-02-2026)."
    return SerieExterna(
        id=ID,
        unidad="°C de anomalía (Niño 3.4, trimestre móvil)",
        frecuencia="mensual",
        puntos=puntos,
        procedencia=Procedencia(
            fuente=FUENTE,
            url=url,
            fecha_observacion=fecha_observacion,
            fecha_dato=puntos[-1]["periodo"],
            rezago=REZAGO,
            licencia=LICENCIA,
            nota=nota,
        ),
        columnas={
            "periodo": "mes central del trimestre móvil (YYYY-MM)",
            "temporada": "trimestre móvil tal como lo publica el CPC (DJF…NDJ)",
            "oni": "ONI, °C de anomalía Niño 3.4 (base móvil de 30 años)",
            "roni": "RONI, °C de anomalía relativa (índice oficial CPC desde feb-2026); None si no se bajó",
            "fase": "umbral del mes sobre indice_fase: Niño ≥ +0,5 · Niña ≤ −0,5 · Neutral",
            "episodio": "regla CPC de 5 trimestres consecutivos: Niño/Niña/Neutral/pendiente",
            "indice_fase": "índice usado para fase y episodio (RONI u ONI)",
        },
    )


def obtener() -> SerieExterna:
    return parsear(descargar(URL_ONI), URL_ONI, hoy(),
                   contenido_roni=descargar(URL_RONI), url_roni=URL_RONI)


if __name__ == "__main__":
    serie = obtener()
    ult = serie.puntos[-1]
    print(f"{serie.id}: {len(serie)} puntos, último {ult}")
    if "--actualizar" in sys.argv:
        print("cache →", guardar_cache(serie))
