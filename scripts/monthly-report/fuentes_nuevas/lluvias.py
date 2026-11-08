"""
Lluvia mensual vs. normal 1991-2020 en estaciones del corredor ganadero.

QUÉ TRAE
    Precipitación total mensual (mm) de 16 estaciones del SMN, tal como el SMN
    la informa al mundo en el mensaje **CLIMAT** de la OMM (el resumen mensual
    oficial que cada servicio meteorológico nacional transmite por el GTS), y la
    normal climatológica 1991-2020 de la misma estación, también reportada por
    el SMN a la OMM. El archivo lo publica y le hace control de calidad el
    Deutscher Wetterdienst (DWD, servicio meteorológico alemán), centro de la
    OMM para datos CLIMAT:

    - Lluvia, por estación (número OMM):
      https://opendata.dwd.de/climate_environment/CDC/observations_global/CLIMAT/monthly/qc/precipitation_total/recent/{wmo}.txt
    - Normales 1991-2020:
      https://opendata.dwd.de/climate_environment/CDC/observations_global/CLIMAT/multi_annual/precipitation_total/1991_2020.txt
    - Descripción: .../precipitation_total/recent/DESCRIPTION_obsglobal_monthly_qc_precipitation_total_recent_en.pdf

    Puntos (uno por estación y mes): {"periodo", "wmo", "estacion", "provincia",
    "precipitacion_mm", "normal_mm", "anomalia_mm", "pct_normal"}.
    `anomalia_mm` = lluvia − normal; `pct_normal` = 100 × lluvia / normal. Son
    cuentas sobre dos números publicados, no estimaciones. Sin normal publicada
    para ese mes y estación, ambas quedan en None.

POR QUÉ ESTA Y NO OTRA (ver el reporte de evaluación)
    - SMN (smn.gob.ar/descarga-de-datos): la página está detrás de un desafío de
      Cloudflare y su portal de datos abiertos (ssl.smn.gob.ar/dpd) solo ofrece
      datos horarios sin lluvia, temperaturas extremas, pronóstico y listado de
      estaciones. No hay precipitación mensual descargable.
    - SISSA / CRC-SAS (SPI por estación): el certificado TLS del sitio y de la
      API viene con la cadena incompleta (falla con cualquier cliente que
      verifique) y la API pide usuario. Descartada sin saltear nada.
    - INTA SIGA: el servidor corta la conexión; la descarga pide registro.
    - ORA: sin datos tabulares públicos (mapas).
    - NOAA GHCN-Daily (dominio público): para estas estaciones solo trae los días
      con lluvia que llegaron por SYNOP (fuente GSOD); en 2020-2026 casi ningún
      mes tiene los ~30 días. Sumarlo sería estimar. Descartada.
    El CLIMAT, en cambio, es el total mensual que calculó el propio SMN.

ESTACIONES (número OMM, del listado CLIMAT del DWD)
    Ver ESTACIONES abajo. Quedaron AFUERA, por no transmitir CLIMAT completo:
    Corrientes Aero (87166: solo sep-2025 en 2024-2026) y Mercedes Aero, Ctes.
    (87281: solo feb-2025, y sin normal publicada). El NEA queda cubierto por
    Reconquista, Ceres y Paraná; no hay serie mensual oficial usable para
    Corrientes por esta vía.

REZAGO
    El DWD actualiza los archivos ~4 semanas después del cierre del mes (el
    2-nov-2026 el último mes con dato es septiembre de 2026, archivos del
    28-oct-2026). No todas las estaciones llegan al mismo mes: `fecha_dato` es
    el último período con dato en AL MENOS una estación; mirar cada una.

TRAMPAS
    - El directorio "recent" es una ventana móvil (hoy 2024→): lo más viejo pasa
      a "historical/" ({wmo}_{desde}_{hasta}.txt, con QC completo). Este módulo
      solo lee "recent"; para más profundidad, sumar "historical" sin mezclar
      versiones de un mismo mes.
    - Los datos de "recent" NO pasaron el control de calidad completo del DWD
      (lo dice la descripción): pueden corregirse. Re-bajar siempre entero.
    - Celda vacía = el SMN no transmitió ese mes. NO es cero y NO se completa.
      Un 0.0 sí es "no llovió".
    - Encabezados en alemán (JAHR, Mrz, Mai, Okt, Dez): el parser los exige tal
      cual; si el DWD los traduce, rompe a propósito.
    - El archivo de normales tiene huecos (p.ej. Coronel Suárez no tiene normal
      de febrero) y viene con fin de línea CRLF.

LICENCIA
    Creative Commons BY 4.0 (DWD, "Terms of use", mayo 2024):
    https://opendata.dwd.de/climate_environment/CDC/Terms_of_use.txt ·
    https://www.dwd.de/copyright . Citar: "Fuente: SMN vía mensajes CLIMAT de la
    OMM, publicados por el Deutscher Wetterdienst (CC BY 4.0)".

Uso:
    python3 -m fuentes_nuevas.lluvias --actualizar   # baja 16 estaciones + normales y guarda el cache
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

ID = "lluvias-corredor-ganadero"
BASE = "https://opendata.dwd.de/climate_environment/CDC/observations_global/CLIMAT"
URL_DIR = f"{BASE}/monthly/qc/precipitation_total/recent/"
URL_NORMALES = f"{BASE}/multi_annual/precipitation_total/1991_2020.txt"
FUENTE = "SMN · mensajes CLIMAT (OMM), publicados por el Deutscher Wetterdienst"
LICENCIA = ("CC BY 4.0 · https://opendata.dwd.de/climate_environment/CDC/Terms_of_use.txt · "
            "citar «SMN vía CLIMAT/OMM, Deutscher Wetterdienst»")
REZAGO = "~4 semanas después del cierre del mes; no todas las estaciones llegan al mismo mes"

# (número OMM, nombre, provincia) — corredor ganadero de norte a sur
ESTACIONES: list[tuple[str, str, str]] = [
    ("87270", "Reconquista", "Santa Fe"),
    ("87257", "Ceres", "Santa Fe"),
    ("87374", "Paraná", "Entre Ríos"),
    ("87497", "Gualeguaychú", "Entre Ríos"),
    ("87467", "Marcos Juárez", "Córdoba"),
    ("87453", "Río Cuarto", "Córdoba"),
    ("87534", "Laboulaye", "Córdoba"),
    ("87548", "Junín", "Buenos Aires"),
    ("87544", "Pehuajó", "Buenos Aires"),
    ("87532", "General Pico", "La Pampa"),
    ("87623", "Santa Rosa", "La Pampa"),
    ("87640", "Bolívar", "Buenos Aires"),
    ("87641", "Azul", "Buenos Aires"),
    ("87648", "Dolores", "Buenos Aires"),
    ("87645", "Tandil", "Buenos Aires"),
    ("87688", "Tres Arroyos", "Buenos Aires"),
]

MESES_DWD = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
MAX_MM_MES = 1500.0  # récord argentino mensual ronda los 1000 mm; más es un error de archivo
MAX_MM_NORMAL = 5000.0  # el archivo de normales es MUNDIAL: Cherrapunji (42515) tiene 2608 mm en junio


def url_estacion(wmo: str) -> str:
    return f"{URL_DIR}{wmo}.txt"


def _lineas(contenido: bytes, nombre: str) -> list[list[str]]:
    try:
        texto = contenido.decode("ascii")
    except UnicodeDecodeError as e:
        raise FormatoCambiado(f"{nombre}: no es texto ASCII ({e})") from e
    lineas = [l.strip().split(";") for l in texto.splitlines() if l.strip()]
    exigir(bool(lineas), f"{nombre}: archivo vacío")
    return lineas


def _mm(celda: str, donde: str, maximo: float = MAX_MM_MES) -> float | None:
    celda = celda.strip()
    if celda == "":
        return None
    try:
        v = float(celda)
    except ValueError as e:
        raise FormatoCambiado(f"{donde}: número ilegible {celda!r}") from e
    exigir(0.0 <= v <= maximo, f"{donde}: lluvia implausible {v} mm")
    return v


def parsear_estacion(contenido: bytes, wmo: str) -> dict[str, float]:
    """Archivo `recent/{wmo}.txt` → {periodo: mm}. Las celdas vacías no aparecen. Pura."""
    nombre = f"estación {wmo}"
    lineas = _lineas(contenido, nombre)
    exigir(lineas[0] == ["JAHR", *MESES_DWD],
           f"{nombre}: esperaba encabezado JAHR;{';'.join(MESES_DWD)}, encontré {';'.join(lineas[0])}")
    salida: dict[str, float] = {}
    vistos: set[int] = set()
    for n, partes in enumerate(lineas[1:], start=2):
        exigir(len(partes) == 13, f"{nombre} línea {n}: esperaba 13 columnas, encontré {len(partes)}")
        try:
            anio = int(partes[0])
        except ValueError as e:
            raise FormatoCambiado(f"{nombre} línea {n}: año ilegible {partes[0]!r}") from e
        exigir(1900 <= anio <= 2100, f"{nombre} línea {n}: año fuera de rango {anio}")
        exigir(anio not in vistos, f"{nombre}: año {anio} repetido")
        vistos.add(anio)
        for m, celda in enumerate(partes[1:], start=1):
            v = _mm(celda, f"{nombre} {anio}-{m:02d}")
            if v is not None:
                salida[f"{anio:04d}-{m:02d}"] = v
    return salida


def parsear_normales(contenido: bytes) -> dict[str, list[float | None]]:
    """`1991_2020.txt` → {wmo: [12 normales mensuales o None]}. Pura."""
    lineas = _lineas(contenido, "normales 1991-2020")
    exigir(lineas[0] == ["Station", *MESES_DWD],
           f"normales: esperaba encabezado Station;{';'.join(MESES_DWD)}, encontré {';'.join(lineas[0])}")
    salida: dict[str, list[float | None]] = {}
    for n, partes in enumerate(lineas[1:], start=2):
        exigir(len(partes) == 13, f"normales línea {n}: esperaba 13 columnas, encontré {len(partes)}")
        wmo = partes[0].strip()
        exigir(wmo.isdigit() and len(wmo) == 5, f"normales línea {n}: número OMM raro {wmo!r}")
        salida[wmo] = [_mm(c, f"normal {wmo} mes {m}", MAX_MM_NORMAL) for m, c in enumerate(partes[1:], start=1)]
    return salida


def parsear(contenidos: dict[str, bytes], url: str, fecha_observacion: str,
            normales: bytes, estaciones: list[tuple[str, str, str]] | None = None) -> SerieExterna:
    """
    {wmo: bytes del archivo recent} + bytes de normales → SerieExterna. Pura.
    Difiere del contrato de una sola descarga porque la fuente es un archivo por
    estación; `url` es el directorio "recent" del DWD.
    """
    estaciones = estaciones or ESTACIONES
    norm = parsear_normales(normales)
    faltan = [w for w, _, _ in estaciones if w not in contenidos]
    exigir(not faltan, f"faltan archivos de estaciones: {faltan}")
    puntos: list[dict[str, Any]] = []
    for wmo, nombre, provincia in estaciones:
        normal_est = norm.get(wmo)
        for periodo, mm in sorted(parsear_estacion(contenidos[wmo], wmo).items()):
            normal = normal_est[int(periodo[5:]) - 1] if normal_est else None
            puntos.append({
                "periodo": periodo,
                "wmo": wmo,
                "estacion": nombre,
                "provincia": provincia,
                "precipitacion_mm": mm,
                "normal_mm": normal,
                "anomalia_mm": None if normal is None else round(mm - normal, 1),
                "pct_normal": None if not normal else round(100 * mm / normal, 1),
            })
    exigir(bool(puntos), "ninguna estación trajo datos")
    puntos.sort(key=lambda p: (p["periodo"], p["wmo"]))
    sin_normal = sorted({p["estacion"] for p in puntos if p["normal_mm"] is None})
    nota = ("Un punto por estación y mes; celda vacía en la fuente = mes no transmitido, "
            "no aparece (no se completa). anomalia_mm y pct_normal son cuentas contra la normal "
            "1991-2020 publicada para la misma estación. Datos 'recent': sin QC completo del DWD. "
            f"Normales: {URL_NORMALES}.")
    if sin_normal:
        nota += f" Sin normal publicada en algún mes: {', '.join(sin_normal)}."
    return SerieExterna(
        id=ID,
        unidad="mm de precipitación mensual",
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
            "periodo": "mes (YYYY-MM)",
            "wmo": "número de estación OMM",
            "estacion": "localidad de la estación del SMN",
            "provincia": "provincia",
            "precipitacion_mm": "lluvia total del mes, mm (CLIMAT del SMN)",
            "normal_mm": "normal 1991-2020 de ese mes, mm (None si no está publicada)",
            "anomalia_mm": "lluvia − normal, mm",
            "pct_normal": "lluvia / normal × 100",
        },
    )


def obtener() -> SerieExterna:
    contenidos = {w: descargar(url_estacion(w)) for w, _, _ in ESTACIONES}
    return parsear(contenidos, URL_DIR, hoy(), normales=descargar(URL_NORMALES))


if __name__ == "__main__":
    serie = obtener()
    ult = serie.procedencia.fecha_dato
    print(f"{serie.id}: {len(serie)} puntos, último período {ult}")
    for p in serie.puntos:
        if p["periodo"] == ult:
            print(f"  {p['estacion']:<14} {p['precipitacion_mm']:>6.1f} mm  "
                  f"normal {p['normal_mm']}  → {p['pct_normal']}%")
    if "--actualizar" in sys.argv:
        print("cache →", guardar_cache(serie))
