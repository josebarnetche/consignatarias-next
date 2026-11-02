"""
Exportaciones mensuales de carne bovina (INDEC · base usuario de comercio exterior).

FUENTE
    INDEC, Sistema de consulta de comercio exterior de bienes, "Descarga de bases
    de datos": un ZIP por año con las exportaciones mensuales por NCM (8 dígitos)
    y país de destino, peso neto en kg y valor FOB en dólares corrientes.
        https://comex.indec.gob.ar/files/zips/exports_AAAA_M.zip   (AAAA = 2002…)
    La lista de años disponibles la publica el propio sitio en
        https://comexbe.indec.gob.ar/public-api/staticData   (campo "zipFiles").
    Sin login, sin token: es el mismo archivo que baja el botón "Descargar" de
    https://comex.indec.gob.ar/ (sección Bases de datos).

QUÉ MIDE ESTE MÓDULO
    Carne bovina fresca, refrigerada o congelada: posiciones NCM 02.01 (enfriada)
    y 02.02 (congelada), todas sus aperturas a 8 dígitos. UNIDAD: toneladas PESO
    PRODUCTO (el "Pnet(kg)" de la Aduana dividido 1.000). NO es res con hueso: el
    INDEC no publica equivalente res con hueso y este módulo no lo estima (los
    coeficientes de conversión por corte no son oficiales del INDEC).
    `usd_por_t` es el cociente exacto FOB total / toneladas total del mes, nada más.

PROFUNDIDAD Y REZAGO
    Mensual desde 2002-01. El año en curso se reemplaza entero en cada difusión
    (~día 15–20 del mes siguiente, junto con el ICA). Al 2026-11-02 el último mes
    publicado es 2026-09. Los datos del último año son provisorios: el INDEC los
    revisa sin aviso por punto, así que `--actualizar` vuelve a bajar todo.

LICENCIA
    Material del sitio del INDEC bajo Creative Commons BY-SA 4.0
    (https://creativecommons.org/licenses/by-sa/4.0/deed.es); la Política de
    difusión (https://www.indec.gob.ar/ftp/cuadros/publicaciones/politica_difusion_indec.pdf)
    permite copiar y redistribuir "siempre que se acredite debidamente la obra, se
    cite la fuente primaria y se especifiquen cambios si los hubiere". Cambio que
    hacemos: sumamos NCM y pasamos kg→t y USD→millones de USD.

TRAMPAS (leer antes de comparar con IPCVA, MAGyP o la prensa)
    1. HUESOS. La NCM 0202.20.90 ("congelada, con hueso, los demás") incluye los
       huesos resultantes del desposte (posición SIM 0202.20.90.920) que se van
       sobre todo a China a precio bajo. El IPCVA los EXCLUYE y suma la carne
       procesada (16.02.50); por eso su tonelaje es ~15% menor y su US$/t más
       alto. Acá se informan aparte (`*_congelada_con_hueso`) para poder restarlos;
       la base no abre a 11 dígitos y no se pueden separar los huesos solos.
    2. SECRETO ESTADÍSTICO (desde 2018). Hay dos archivos: priorizando NCM
       (`exponmAA.csv`, el que usamos) y priorizando país. En el de NCM el total de
       cada NCM está completo, pero los países con pocos operadores aparecen como
       "s1"…"s10" (rango, no valor) y su monto va sumado en el país 999
       "Confidencial". Las filas "s" NO se suman (duplicarían el 999). Si una NCM
       entera tiene pocos operadores en un mes se enmascara bajo 99999999 y no se
       puede atribuir a carne: no pasó con 02.01/02.02 en 2002–2026 pero el parser
       no lo puede detectar (solo detecta un mes sin ninguna fila de carne).
    3. Hasta 2017 el archivo se llama `expomAA.csv` (sin secreto, sin 999) y los
       campos vienen rellenos con espacios (también en 2018-2021); el FOB se titula
       "FOB(u$s)" en los archivos viejos (al menos hasta 2021) y "FOB(USD)" en los
       nuevos (2025-2026): el parser acepta cualquier "FOB(…)". El CSV es Latin-1, `;` como separador y coma decimal.
    4. Control: cada ZIP trae `etot*.csv` con el total de kg y FOB del archivo; el
       parser exige que la suma de las filas numéricas lo iguale. Si no cierra,
       cambió la convención de confidencialidad y se rompe a propósito.

Uso:  python3 -m fuentes_nuevas.exportaciones --actualizar   (desde scripts/monthly-report)
"""

from __future__ import annotations

import re
import sys
import urllib.error
import zipfile
from dataclasses import dataclass, field
from datetime import date
from io import BytesIO
from typing import Iterable

from ._base import (FormatoCambiado, Procedencia, SerieExterna, descargar, exigir,
                    guardar_cache, hoy)

ID = "exportaciones-carne-bovina"
URL_PLANTILLA = "https://comex.indec.gob.ar/files/zips/exports_{anio}_M.zip"
URL_STATIC = "https://comexbe.indec.gob.ar/public-api/staticData"
PRIMER_ANIO = 2002
FUENTE = "INDEC · Comercio exterior de bienes, base usuario de exportaciones mensuales (NCM × país)"
LICENCIA = ("CC BY-SA 4.0, citar «Fuente: INDEC» y declarar cambios · "
            "https://creativecommons.org/licenses/by-sa/4.0/deed.es · "
            "https://www.indec.gob.ar/ftp/cuadros/publicaciones/politica_difusion_indec.pdf")
REZAGO = "~45-50 días: el mes M sale con el ICA hacia el día 15-20 de M+2"

PAIS_CONFIDENCIAL = 999

# Rangos plausibles por mes (carne 02.01 + 02.02). Observado 2002-2026: de 929 t y US$ 2,1 M
# (ene-2002, post aftosa) a ~74 mil t y ~US$ 526 M (ago-2026); US$/t de ~1.850 a ~10.750.
# Holgados a propósito: atrapan unidades corridas (kg↔t, USD↔miles), no récords.
RANGO_T = (100.0, 250_000.0)
RANGO_MUSD = (0.1, 3_000.0)
RANGO_USD_T = (500.0, 25_000.0)

_ENCABEZADO = ["mes", "ncm", "pdes", "pnet(kg)"]


@dataclass
class Fila:
    mes: int
    ncm: str
    pais: int
    kg: float
    usd: float


@dataclass
class BaseAnual:
    anio: int
    archivo: str
    filas_carne: list[Fila]
    confidenciales_carne: int = 0          # filas "s" de 02.01/02.02 (no sumables)
    meses: list[int] = field(default_factory=list)


def es_carne_bovina(ncm: str) -> bool:
    return ncm.startswith(("0201", "0202"))


def _num(campo: str, donde: str) -> float | None:
    t = campo.strip()
    if t == "":
        return None
    try:
        return float(t.replace(",", "."))
    except ValueError as e:
        raise FormatoCambiado(f"{donde}: número ilegible {campo!r}") from e


def leer_zip(contenido: bytes) -> BaseAnual:
    """
    Lee el ZIP anual del INDEC, valida encabezado y totales de control, y devuelve
    solo las filas de carne bovina (02.01/02.02) con valor numérico.
    """
    try:
        z = zipfile.ZipFile(BytesIO(contenido))
    except zipfile.BadZipFile as e:
        raise FormatoCambiado(f"no es un ZIP del INDEC: {e}") from e
    nombres = z.namelist()
    base = [n for n in nombres if re.fullmatch(r"expon?m\d\d\.csv", n, re.I)]
    exigir(len(base) == 1, f"esperaba un expomAA.csv o exponmAA.csv, encontré {nombres}")
    archivo = base[0]
    control = [n for n in nombres if re.fullmatch(r"etotn?m\d\d\.csv", n, re.I)
               and n.lower().startswith("etotn" if "expon" in archivo.lower() else "etotm")]
    exigir(len(control) == 1, f"esperaba el etot*.csv de control de {archivo}, encontré {nombres}")

    lineas = z.read(archivo).decode("latin-1").splitlines()
    exigir(len(lineas) > 1, f"{archivo}: vacío")
    cab = [c.strip().lower() for c in lineas[0].split(";")]
    exigir(len(cab) >= 6 and cab[1:5] == _ENCABEZADO and cab[5].startswith("fob("),
           f"{archivo}: encabezado esperado Año;Mes;NCM;Pdes;Pnet(kg);FOB(…), encontré {lineas[0]!r}")

    anio = None
    filas: list[Fila] = []
    conf = 0
    meses: set[int] = set()
    suma_kg = suma_usd = 0.0
    for i, linea in enumerate(lineas[1:], start=2):
        if not linea.strip():
            continue
        p = [c.strip() for c in linea.split(";")]
        exigir(len(p) >= 6, f"{archivo}:{i}: {len(p)} columnas, esperaba 6")
        a, m, ncm, pdes, skg, susd = p[:6]
        exigir(a.isdigit() and m.isdigit() and pdes.isdigit() and re.fullmatch(r"\d{8}", ncm) is not None,
               f"{archivo}:{i}: fila ilegible {linea[:60]!r}")
        if anio is None:
            anio = int(a)
        exigir(int(a) == anio, f"{archivo}:{i}: año {a} mezclado con {anio}")
        mes = int(m)
        exigir(1 <= mes <= 12, f"{archivo}:{i}: mes {m}")
        meses.add(mes)
        if skg.lower().startswith("s") or susd.lower().startswith("s"):
            if es_carne_bovina(ncm):
                conf += 1
            continue
        kg = _num(skg, f"{archivo}:{i}") or 0.0
        usd = _num(susd, f"{archivo}:{i}") or 0.0
        suma_kg += kg
        suma_usd += usd
        if es_carne_bovina(ncm):
            filas.append(Fila(mes, ncm, int(pdes), kg, usd))

    # totales de control
    lc = z.read(control[0]).decode("latin-1").splitlines()
    exigir(len(lc) >= 2, f"{control[0]}: sin fila de totales")
    cc = [c.strip() for c in lc[1].split(";")]
    exigir(len(cc) >= 6, f"{control[0]}: fila de totales con {len(cc)} columnas")
    tot_kg = _num(cc[4], control[0])
    tot_usd = _num(cc[5], control[0])
    exigir(tot_kg is not None and tot_usd is not None, f"{control[0]}: totales vacíos")
    exigir(abs(suma_kg - tot_kg) <= max(1.0, tot_kg * 1e-9) and abs(suma_usd - tot_usd) <= max(1.0, tot_usd * 1e-9),
           f"{archivo}: la suma de filas numéricas ({suma_kg:,.1f} kg / {suma_usd:,.2f} USD) no cierra con "
           f"{control[0]} ({tot_kg:,.1f} kg / {tot_usd:,.2f} USD): cambió la convención de confidencialidad")
    exigir(anio is not None, f"{archivo}: sin filas")
    return BaseAnual(anio=anio, archivo=archivo, filas_carne=filas, confidenciales_carne=conf,
                     meses=sorted(meses))


def _r(x: float, nd: int) -> float:
    return round(x, nd)


def puntos_mensuales(base: BaseAnual) -> list[dict]:
    acc: dict[int, dict[str, float]] = {}
    for f in base.filas_carne:
        a = acc.setdefault(f.mes, {k: 0.0 for k in (
            "kg", "usd", "kg_e", "usd_e", "kg_c", "usd_c", "kg_ch", "usd_ch")})
        a["kg"] += f.kg
        a["usd"] += f.usd
        if f.ncm.startswith("0201"):
            a["kg_e"] += f.kg
            a["usd_e"] += f.usd
        else:
            a["kg_c"] += f.kg
            a["usd_c"] += f.usd
            if f.ncm.startswith("020220"):
                a["kg_ch"] += f.kg
                a["usd_ch"] += f.usd
    puntos = []
    for mes in base.meses:
        a = acc.get(mes)
        exigir(a is not None and a["kg"] > 0,
               f"{base.archivo}: {base.anio}-{mes:02d} sin ninguna fila de carne 02.01/02.02 "
               "(¿NCM enmascarada como 99999999?)")
        t = a["kg"] / 1000
        musd = a["usd"] / 1e6
        usd_t = a["usd"] / t
        periodo = f"{base.anio}-{mes:02d}"
        exigir(RANGO_T[0] <= t <= RANGO_T[1], f"{periodo}: {t:,.0f} t fuera de {RANGO_T}")
        exigir(RANGO_MUSD[0] <= musd <= RANGO_MUSD[1], f"{periodo}: {musd:,.1f} MUSD fuera de {RANGO_MUSD}")
        exigir(RANGO_USD_T[0] <= usd_t <= RANGO_USD_T[1], f"{periodo}: {usd_t:,.0f} USD/t fuera de {RANGO_USD_T}")
        puntos.append({
            "periodo": periodo,
            "toneladas_peso_producto": _r(t, 3),
            "fob_musd": _r(musd, 6),
            "usd_por_t": _r(usd_t, 2),
            "toneladas_enfriada": _r(a["kg_e"] / 1000, 3),
            "fob_musd_enfriada": _r(a["usd_e"] / 1e6, 6),
            "toneladas_congelada": _r(a["kg_c"] / 1000, 3),
            "fob_musd_congelada": _r(a["usd_c"] / 1e6, 6),
            "toneladas_congelada_con_hueso": _r(a["kg_ch"] / 1000, 3),
            "fob_musd_congelada_con_hueso": _r(a["usd_ch"] / 1e6, 6),
        })
    exigir(base.meses == list(range(1, len(base.meses) + 1)),
           f"{base.archivo}: meses no consecutivos desde enero: {base.meses}")
    return puntos


COLUMNAS = {
    "periodo": "AAAA-MM",
    "toneladas_peso_producto": "t peso producto (peso neto Aduana), NCM 02.01 + 02.02",
    "fob_musd": "millones de US$ FOB corrientes, NCM 02.01 + 02.02",
    "usd_por_t": "US$ FOB por t peso producto = fob / toneladas (cociente exacto, incluye huesos)",
    "toneladas_enfriada": "t, NCM 02.01 (fresca o refrigerada)",
    "fob_musd_enfriada": "millones US$ FOB, NCM 02.01",
    "toneladas_congelada": "t, NCM 02.02 (congelada)",
    "fob_musd_congelada": "millones US$ FOB, NCM 02.02",
    "toneladas_congelada_con_hueso": "t, NCM 0202.20 (congelada con hueso; INCLUYE huesos de desposte)",
    "fob_musd_congelada_con_hueso": "millones US$ FOB, NCM 0202.20",
}


def _procedencia(url: str, fecha_observacion: str, fecha_dato: str | None, nota: str | None) -> Procedencia:
    return Procedencia(fuente=FUENTE, url=url, fecha_observacion=fecha_observacion,
                       fecha_dato=fecha_dato, rezago=REZAGO, licencia=LICENCIA, nota=nota)


def parsear(contenido: bytes, url: str, fecha_observacion: str) -> SerieExterna:
    """Un ZIP anual (exports_AAAA_M.zip) → la serie de ese año. Pura: no toca la red."""
    base = leer_zip(contenido)
    puntos = puntos_mensuales(base)
    nota = (f"{base.archivo}: suma de NCM 02.01/02.02 con valor numérico; "
            f"{base.confidenciales_carne} filas país×NCM con 's' quedan dentro del país 999 (no se suman aparte).")
    return SerieExterna(id=ID, unidad="t peso producto · millones US$ FOB", frecuencia="mensual",
                        puntos=puntos, columnas=dict(COLUMNAS),
                        procedencia=_procedencia(url, fecha_observacion, puntos[-1]["periodo"], nota))


def combinar(series: Iterable[SerieExterna], url: str, fecha_observacion: str, nota: str) -> SerieExterna:
    """Une series anuales del mismo id. Rechaza períodos repetidos y huecos entre años."""
    series = list(series)
    exigir(bool(series), "combinar: no hay series")
    vistos: dict[str, dict] = {}
    for s in series:
        for p in s.puntos:
            exigir(p["periodo"] not in vistos, f"combinar: período repetido {p['periodo']}")
            vistos[p["periodo"]] = p
    orden = sorted(vistos)
    a0, m0 = map(int, orden[0].split("-"))
    for i, per in enumerate(orden):
        a, m = divmod(a0 * 12 + m0 - 1 + i, 12)
        exigir(per == f"{a}-{m + 1:02d}", f"combinar: hueco antes de {per}")
    s0 = series[0]
    return SerieExterna(id=s0.id, unidad=s0.unidad, frecuencia=s0.frecuencia,
                        puntos=[vistos[k] for k in orden], columnas=s0.columnas,
                        procedencia=_procedencia(url, fecha_observacion, orden[-1], nota))


def bajar_anios(desde: int = PRIMER_ANIO, hasta: int | None = None) -> list[tuple[int, str, bytes]]:
    """Baja los ZIP anuales. El del año en curso puede no existir todavía en enero."""
    hasta = hasta or date.today().year
    out = []
    for anio in range(desde, hasta + 1):
        url = URL_PLANTILLA.format(anio=anio)
        try:
            out.append((anio, url, descargar(url, timeout=180)))
        except urllib.error.HTTPError as e:
            if anio == hasta and e.code == 404:
                continue
            raise
    return out


def obtener(desde: int = PRIMER_ANIO, archivos: list[tuple[int, str, bytes]] | None = None) -> SerieExterna:
    archivos = archivos if archivos is not None else bajar_anios(desde)
    obs = hoy()
    series = [parsear(c, u, obs) for _, u, c in archivos]
    ultimo = archivos[-1][1]
    nota = (f"Historia armada con {len(archivos)} ZIP anuales {URL_PLANTILLA.format(anio='AAAA')} "
            f"({archivos[0][0]}–{archivos[-1][0]}); `url` es el del último año.")
    return combinar(series, ultimo, obs, nota)


if __name__ == "__main__":
    if "--actualizar" in sys.argv:
        s = obtener()
        print(guardar_cache(s), len(s), "puntos, último", s.procedencia.fecha_dato)
    else:
        print(__doc__)
