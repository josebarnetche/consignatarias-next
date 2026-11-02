"""
Faena bovina mensual por categoría, peso medio de la res y producción de carne.

FUENTE
    MAGyP · Subsecretaría de Ganadería · Coordinación de Análisis Pecuario,
    "Informe MENSUAL de faena y producción de carne bovina" (PDF). Datos de
    SENASA (movimientos con destino a faena) y DNCCA (SIF-SIGICA). Es el mismo
    PDF de URL FIJA que ya usa scripts/scrape-faena-hembras-magyp.mjs: el
    organismo lo pisa cada mes con la edición nueva.

    Tomamos las tres tablas "Clasificación por sexo" (págs. 13-15 en la edición
    de septiembre 2026): cabezas, toneladas res con hueso y peso res (kg) por
    categoría y por MES, para el año anterior completo y el año en curso.

POR QUÉ ESTA Y NO OTRA
    - El dataset CKAN "indicadores-mensuales-sector-bovino" de datos.magyp.gob.ar
      quedó congelado en 2019-08 (igual que el de % hembras).
    - En la carpeta de informes de MAGyP NO hay una serie de faena en XLS/CSV:
      lo único tabular de bovinos es el stock (XLS/XLSX). El "Tablero de faena"
      y los "Indicadores bovinos" son PDF con un solo mes o con gráficos.
    - La API de series de tiempo (apis.datos.gob.ar, id 40.3_VC_0_M_15) trae solo
      el TOTAL de cabezas, con un mes más de rezago y valores con decimales
      (1.077.369,25) que no coinciden con el PDF: sirve como control, no como
      fuente de categorías.
    - CICCRA publica sobre los mismos datos oficiales, pero es una cámara privada
      y sus PDF no traen licencia abierta.

PROFUNDIDAD Y REZAGO
    Cada edición trae enero del año ANTERIOR hasta el último mes cerrado (entre
    13 y 24 meses). La historia más vieja no está en ningún archivo vivo: por eso
    `--actualizar` FUSIONA con el cache existente (la edición nueva pisa los
    meses que repite, porque son "datos provisorios, sujetos a revisión") y cada
    punto guarda de qué `edicion` salió. Sale ~10-13 días después del cierre del
    mes (la edición de septiembre 2026 tiene Last-Modified 13-10-2026).

LICENCIA
    El PDF no declara licencia propia. El pie de magyp.gob.ar remite a los
    Términos y Condiciones de Argentina.gob.ar, que licencian los contenidos con
    Creative Commons Atribución 4.0 (https://www.argentina.gob.ar/terminos-y-condiciones).
    Hay que citar: "MAGyP, Subsecretaría de Ganadería, en base a SENASA y DNCCA".

TRAMPAS
    - El PDF NO etiqueta el año de cada fila: el año sale de la fila "Total AAAA"
      (cierra el año anterior) y de "Acum AAAA" (cierra el año en curso). Las
      sumas se verifican contra esas filas: si no cierran, rompe.
    - `pdftotext -layout` desordena algunas filas (los valores quedan en columna,
      debajo del nombre del mes). Con `-raw` salen limpias: se usa `-raw`.
    - La edición repite el título con el número de página pegado
      ("Septiembre de 20262"): el año se toma con 4 dígitos exactos.
    - La clasificación es la de la Res. SAGyP 32/2018 (por dentición): NO hay
      categoría "terneros" (los terneros/as van dentro de novillito 2D y
      vaquillona 2D). MEJ = macho entero joven. "Toros" incluye 4D a >8D.
    - El "% Hembras" de la tabla de toneladas es participación en TONELADAS; acá
      solo se publica el de cabezas (`pct_hembras`), que es el que trae la fuente.
    - El peso res viene redondeado a kg entero; no se recalcula.
    - Requiere `pdftotext` (poppler) en el PATH o en /opt/homebrew/bin.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from fuentes_nuevas._base import (
    FormatoCambiado,
    Procedencia,
    SerieExterna,
    cargar_cache,
    descargar,
    exigir,
    guardar_cache,
    hoy,
    numero_ar,
    ruta_cache,
)

ID = "faena-bovina-mensual"
URL = (
    "https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/_archivos//"
    "000010=Faena%20y%20Producci%C3%B3n/000008_Informe_MENSUAL_de_faena_y_produccion_de_carne_bovina.pdf"
)
FUENTE = "MAGyP · Subsecretaría de Ganadería · Informe mensual de faena y producción de carne bovina (SENASA + DNCCA)"
LICENCIA = "CC BY 4.0 (Términos y Condiciones de Argentina.gob.ar, a los que remite magyp.gob.ar): https://www.argentina.gob.ar/terminos-y-condiciones"
REZAGO = "~10-13 días después del cierre del mes (PDF de URL fija que se pisa cada mes)"

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# Orden de columnas tal como las publica el PDF (después del rótulo de fila).
CATS_HEMBRA = ["vaquillonas", "vacas"]
CATS_MACHO = ["mej", "novillitos", "novillos", "toros"]
COLS_CAB = ["total", "vaquillonas", "vacas", "total_hembras", "mej", "novillitos",
            "novillos", "toros", "total_machos", "pct_hembras"]
COLS_TON = ["total", "vaquillonas", "vacas", "total_hembras", "mej", "novillitos",
            "novillos", "toros", "total_machos", "pct_hembras_t"]
COLS_PESO = ["total", "vaquillonas", "vacas", "total_hembras", "mej", "novillitos",
             "novillos", "toros", "total_machos"]

ENCABEZADO = ["clasificación", "vaquillonas", "vacas", "total", "hembras", "mej",
              "novillito", "novillo", "toros", "total", "machos"]

COLUMNAS = {
    "periodo": "mes AAAA-MM",
    "edicion": "mes de la edición del PDF de la que salió el punto (AAAA-MM)",
    "vaquillonas": "cabezas faenadas, vaquillonas (2D y 4D)",
    "vacas": "cabezas faenadas, vacas (6D, 8D y >8D)",
    "mej": "cabezas faenadas, macho entero joven (2D)",
    "novillitos": "cabezas faenadas, novillitos (2D y 4D); incluye terneros machos",
    "novillos": "cabezas faenadas, novillos (6D, 8D y >8D)",
    "toros": "cabezas faenadas, toros (4D a >8D)",
    "total_hembras": "cabezas, total hembras (publicado; = vaquillonas + vacas)",
    "total_machos": "cabezas, total machos (publicado; = mej + novillitos + novillos + toros)",
    "total": "cabezas, faena total del mes (publicado)",
    "pct_hembras": "% de hembras en cabezas, PUBLICADO por la fuente (1 decimal)",
    "peso_medio_res_kg": "kg res con hueso por cabeza, total (publicado, entero)",
    "produccion_t": "toneladas res con hueso, total (publicado)",
    "peso_res_kg_<categoria>": "kg res con hueso por cabeza de cada categoría (publicado, entero)",
}

_NUM = r"-?[\d.]+(?:,\d+)?%?"


# ─── PDF → texto ───────────────────────────────────────────────────────────────

def _pdftotext() -> str:
    for c in (shutil.which("pdftotext"), "/opt/homebrew/bin/pdftotext", "/usr/bin/pdftotext", "/usr/local/bin/pdftotext"):
        if c and Path(c).exists():
            return c
    raise RuntimeError("falta pdftotext (poppler-utils) para leer el PDF de MAGyP")


def a_texto(contenido: bytes) -> str:
    """PDF → texto con `pdftotext -raw`. Si ya es texto (fixture), lo decodifica."""
    if not contenido.startswith(b"%PDF"):
        try:
            return contenido.decode("utf-8")
        except UnicodeDecodeError as e:
            raise FormatoCambiado(f"no es PDF ni texto UTF-8: {e}") from e
    with tempfile.TemporaryDirectory() as d:
        pdf = Path(d) / "informe.pdf"
        pdf.write_bytes(contenido)
        r = subprocess.run([_pdftotext(), "-raw", "-enc", "UTF-8", str(pdf), "-"],
                           capture_output=True, timeout=120)
        if r.returncode != 0:
            raise FormatoCambiado(f"pdftotext falló: {r.stderr.decode(errors='replace')[:300]}")
        return r.stdout.decode("utf-8", errors="replace")


# ─── parseo de tablas ──────────────────────────────────────────────────────────

def _edicion(texto: str) -> str:
    cabeza = "\n".join(texto.splitlines()[:8])
    m = re.search(r"(?im)^\s*(" + "|".join(MESES) + r")\s+de\s+(20\d{2})", cabeza)
    exigir(m is not None, f"no encuentro 'Mes de AAAA' en el título; encontré: {cabeza[:200]!r}")
    return f"{m.group(2)}-{MESES.index(m.group(1).lower()) + 1:02d}"  # type: ignore[union-attr]


def _tabla(lineas: list[str], unidad: str, cols: list[str]) -> list[tuple[str, list[float | None]]]:
    """Ubica la tabla "Clasificación por sexo" de `unidad` y devuelve (rótulo, números)."""
    ini = None
    for i in range(len(lineas) - 1):
        if lineas[i].strip().lower() == unidad.lower() and lineas[i + 1].strip().lower().startswith("clasificación vaquillonas vacas"):
            ini = i + 1
            break
    exigir(ini is not None, f"no encuentro la tabla '{unidad}' + 'Clasificación Vaquillonas Vacas'")
    # Encabezado: hasta la primera fila de mes, en 1 a 5 líneas.
    j = ini
    enc: list[str] = []
    while j < len(lineas) and not re.match(r"(?i)^(" + "|".join(MESES) + r")\s", lineas[j].strip()):
        enc += lineas[j].lower().split()
        j += 1
        exigir(j - ini <= 6, f"tabla '{unidad}': encabezado demasiado largo: {enc}")
    enc = [t for t in enc if t not in ("%",)]
    esperado = ENCABEZADO + (["hembras"] if "pct_hembras" in cols[-1] else [])
    exigir(enc == esperado, f"tabla '{unidad}': encabezado esperado {esperado}, encontré {enc}")
    filas: list[tuple[str, list[float | None]]] = []
    patron = re.compile(r"^(" + "|".join(MESES) + r"|Total \d{4}|Acum \d{4}|Promedio \d{4})\s+((?:" + _NUM + r"\s*)+)$", re.I)
    while j < len(lineas):
        s = lineas[j].strip()
        j += 1
        if s.lower().startswith("diferencia"):
            break
        m = patron.match(s)
        exigir(m is not None, f"tabla '{unidad}': fila ilegible {s!r}")
        nums = [numero_ar(t.rstrip("%")) for t in m.group(2).split()]  # type: ignore[union-attr]
        exigir(len(nums) == len(cols), f"tabla '{unidad}': fila {s!r} tiene {len(nums)} números, esperaba {len(cols)}")
        filas.append((m.group(1), nums))  # type: ignore[union-attr]
    else:
        raise FormatoCambiado(f"tabla '{unidad}': no encontré la fila 'Diferencia' que la cierra")
    return filas


def _por_periodo(filas: list[tuple[str, list[float | None]]], cols: list[str], unidad: str,
                 sumar: bool) -> dict[str, dict[str, float | None]]:
    """Asigna año a cada mes con las filas 'Total AAAA' / 'Acum AAAA' y verifica sumas."""
    salida: dict[str, dict[str, float | None]] = {}
    pendientes: list[tuple[int, list[float | None]]] = []
    ultimo_n = 0
    for rot, nums in filas:
        r = rot.lower()
        if r in MESES:
            pendientes.append((MESES.index(r) + 1, nums))
            continue
        anio = rot.split()[1]
        if pendientes:
            meses = [m for m, _ in pendientes]
            exigir(meses == list(range(1, len(meses) + 1)),
                   f"tabla '{unidad}': meses fuera de orden antes de '{rot}': {meses}")
            if r.startswith("total"):
                exigir(len(meses) == 12, f"tabla '{unidad}': '{rot}' cierra {len(meses)} meses, no 12")
            for m, v in pendientes:
                exigir(f"{anio}-{m:02d}" not in salida, f"tabla '{unidad}': {anio}-{m:02d} repetido")
                salida[f"{anio}-{m:02d}"] = dict(zip(cols, v))
            filas_anio = [v for _, v in pendientes]
            ultimo_n = len(pendientes)
            pendientes = []
        else:
            # "Acum" del año anterior: suma de los mismos meses (ene..n) ya leídos de ese año.
            exigir(ultimo_n > 0, f"tabla '{unidad}': '{rot}' sin meses previos")
            claves = [f"{anio}-{m:02d}" for m in range(1, ultimo_n + 1)]
            exigir(all(k in salida for k in claves), f"tabla '{unidad}': '{rot}' pide meses que no están: {claves}")
            filas_anio = [[salida[k][c] for c in cols] for k in claves]
        if sumar and filas_anio:
            for c, idx in ((c, cols.index(c)) for c in cols if not c.startswith("pct")):
                s = sum(f[idx] or 0 for f in filas_anio)
                # La fuente redondea cada mes por separado: se tolera el redondeo
                # (máx. 0,01% o 3 unidades), no un mes faltante ni uno corrido.
                exigir(abs(s - (nums[idx] or 0)) <= max(3, 1e-4 * abs(nums[idx] or 0)),
                       f"tabla '{unidad}': '{rot}' {c} = {nums[idx]}, la suma de los meses da {s}")
    exigir(not pendientes, f"tabla '{unidad}': quedaron meses sin fila 'Total'/'Acum' que los cierre")
    exigir(bool(salida), f"tabla '{unidad}': sin meses")
    return salida


def parsear(contenido: bytes, url: str, fecha_observacion: str) -> SerieExterna:
    texto = a_texto(contenido)
    exigir("faena y producción de" in texto[:300].lower(),
           f"no parece el informe mensual de faena: arranca con {texto[:120]!r}")
    edicion = _edicion(texto)
    lineas = texto.splitlines()
    cab = _por_periodo(_tabla(lineas, "Cabezas", COLS_CAB), COLS_CAB, "Cabezas", sumar=True)
    ton = _por_periodo(_tabla(lineas, "Toneladas res", COLS_TON), COLS_TON, "Toneladas res", sumar=True)
    peso = _por_periodo(_tabla(lineas, "Peso res", COLS_PESO), COLS_PESO, "Peso res", sumar=False)
    exigir(set(cab) == set(ton) == set(peso),
           f"las tres tablas no cubren los mismos meses: {sorted(cab)} / {sorted(ton)} / {sorted(peso)}")
    exigir(max(cab) == edicion, f"el último mes de la tabla ({max(cab)}) no es el de la edición ({edicion})")

    puntos: list[dict[str, Any]] = []
    for p in sorted(cab):
        c, t, w = cab[p], ton[p], peso[p]
        total = c["total"] or 0
        exigir(500_000 <= total <= 2_000_000, f"{p}: faena total {total} fuera de 500k-2M cabezas")
        hem = sum(c[k] or 0 for k in CATS_HEMBRA)
        mac = sum(c[k] or 0 for k in CATS_MACHO)
        exigir(abs(hem - (c["total_hembras"] or 0)) <= 2 and abs(mac - (c["total_machos"] or 0)) <= 2
               and abs((c["total_hembras"] or 0) + (c["total_machos"] or 0) - total) <= 2,
               f"{p}: categorías no suman (hembras {hem} vs {c['total_hembras']}, machos {mac} vs {c['total_machos']}, total {total})")
        exigir(abs(hem / total * 100 - (c["pct_hembras"] or 0)) <= 0.06,
               f"{p}: % hembras publicado {c['pct_hembras']} no cuadra con {hem / total * 100:.2f}")
        exigir(150 <= (w["total"] or 0) <= 300, f"{p}: peso res {w['total']} fuera de 150-300 kg")
        for k in COLS_PESO:
            exigir(130 <= (w[k] or 0) <= 450, f"{p}: peso res {k} = {w[k]} fuera de 130-450 kg")
        prod = t["total"] or 0
        exigir(80_000 <= prod <= 500_000, f"{p}: producción {prod} t fuera de 80k-500k")
        exigir(abs(prod * 1000 / total - (w["total"] or 0)) <= 1.5,
               f"{p}: toneladas/cabezas = {prod * 1000 / total:.1f} kg no cuadra con el peso publicado {w['total']}")
        punto: dict[str, Any] = {"periodo": p, "edicion": edicion}
        for k in CATS_HEMBRA + CATS_MACHO + ["total_hembras", "total_machos", "total"]:
            punto[k] = int(c[k])  # type: ignore[arg-type]
        punto["pct_hembras"] = c["pct_hembras"]
        punto["peso_medio_res_kg"] = int(w["total"])  # type: ignore[arg-type]
        punto["produccion_t"] = int(prod)
        for k in CATS_HEMBRA + CATS_MACHO:
            punto[f"peso_res_kg_{k}"] = int(w[k])  # type: ignore[arg-type]
        puntos.append(punto)

    return SerieExterna(
        id=ID,
        unidad="cabezas (peso en kg res con hueso; producción en t res con hueso)",
        frecuencia="mensual",
        puntos=puntos,
        procedencia=Procedencia(
            fuente=FUENTE, url=url, fecha_observacion=fecha_observacion,
            fecha_dato=puntos[-1]["periodo"], rezago=REZAGO, licencia=LICENCIA,
            nota=(f"Edición {edicion}. Datos provisorios, sujetos a revisión. Clasificación Res. 32/2018 "
                  "(sin categoría terneros). Cada edición trae desde enero del año anterior."),
        ),
        columnas=COLUMNAS,
    )


def obtener() -> SerieExterna:
    return parsear(descargar(URL, timeout=180), URL, hoy())


def fusionar(nueva: SerieExterna, vieja: SerieExterna | None) -> SerieExterna:
    """La edición nueva pisa los meses que trae; los más viejos se conservan con su `edicion`."""
    if vieja is None:
        return nueva
    exigir(vieja.id == nueva.id, f"cache de otra serie: {vieja.id}")
    por = {p["periodo"]: p for p in vieja.puntos}
    por.update({p["periodo"]: p for p in nueva.puntos})
    nueva.puntos = [por[k] for k in sorted(por)]
    ediciones = sorted({p["edicion"] for p in nueva.puntos})
    if len(ediciones) > 1:
        nueva.procedencia.nota = (nueva.procedencia.nota or "") + f" Historia fusionada de las ediciones {', '.join(ediciones)}."
    return nueva


if __name__ == "__main__":
    serie = obtener()
    if "--actualizar" in sys.argv:
        ruta = ruta_cache(ID)
        vieja = cargar_cache(ID) if ruta.exists() else None
        serie = fusionar(serie, vieja)
        print(f"OK {guardar_cache(serie)} · {len(serie)} meses · {serie.puntos[0]['periodo']} a {serie.procedencia.fecha_dato}")
    else:
        for p in serie.puntos:
            print(p)
