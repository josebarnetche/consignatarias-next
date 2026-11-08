"""
Corrida mensual de las fuentes externas de El Corredor: refresca los caches que lee
el informe v2, una fuente a la vez, sin que una caída corte a las demás.

QUÉ ACTUALIZA
    faena (fusionada con el cache viejo, porque cada edición del PDF trae solo desde
    enero del año anterior), stock, exportaciones + exportaciones por destino (un
    mismo ZIP por año sirve para las dos), IPC nacional, ENSO y lluvias.
    NO actualiza:
      - la FAO: la licencia no deja republicarla y su cache no va al repo;
      - el IPC empalmado: es una composición propia que se regenera a mano
        (`python3 -m fuentes_nuevas.ipc --actualizar`), no un dato que cambie solo.

POR QUÉ TOLERANTE A FALLO
    El informe sale el día 1 aunque un organismo tenga el sitio caído o haya cambiado
    el formato. Si una fuente falla (red, `FormatoCambiado`, lo que sea), su cache
    anterior queda INTACTO y la corrida devuelve una nota legible que el render suma
    a los avisos. Un cache se escribe a un temporal y se renombra: nunca queda a medias.

VALIDACIÓN ANTES DE PISAR
    La serie nueva no puede terminar en un período anterior al del cache viejo. Pasa
    cuando un organismo republica un archivo viejo o el parser agarra el link
    equivocado: preferimos el dato que ya teníamos y lo anotamos.

EXPORTACIONES, INCREMENTAL
    La historia completa son 25 ZIP (~100 MB). Mes a mes alcanza con el año en curso y
    el anterior (el INDEC reemplaza el año en curso entero y revisa el anterior): se
    bajan esos y lo previo sale del cache del repo. `combinar` rechaza huecos, así que
    si el cache quedó corto (no se corrió en más de un año) se baja desde el año del
    último punto del cache. Sin cache, se baja todo desde `PRIMER_ANIO`.
    Por eso el cache de exportaciones TIENE que commitearse: es parte de la serie.

Uso:  python3 -m fuentes_nuevas.corrida   (desde scripts/monthly-report)
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable

from . import enso, exportaciones, exportaciones_destinos, faena, ipc, lluvias, stock
from ._base import CACHE, SerieExterna, cargar_cache, guardar_cache, hoy, ruta_cache

# Cómo se nombra cada serie en las notas: lo lee una persona en el log del workflow.
NOMBRES = {
    faena.ID: "faena nacional (MAGyP)",
    stock.ID: "stock bovino por categoría (MAGyP/SENASA)",
    exportaciones.ID: "exportaciones de carne bovina (INDEC)",
    exportaciones_destinos.ID: "exportaciones de carne bovina por destino (INDEC)",
    ipc.ID_NACIONAL: "IPC nacional (INDEC)",
    enso.ID: "ENSO · ONI/RONI (NOAA)",
    lluvias.ID: "lluvias del corredor (SMN vía DWD)",
}

Viejas = dict[str, "SerieExterna | None"]
Resultado = dict[str, "SerieExterna | BaseException"]


@dataclass(frozen=True)
class _Tarea:
    """Una descarga que produce una o más series (exportaciones: un ZIP, dos series)."""
    ids: tuple[str, ...]
    correr: Callable[[Viejas, int], Resultado]


# ─── tareas ────────────────────────────────────────────────────────────────────

def _faena(viejas: Viejas, anio: int) -> Resultado:
    # Igual que el __main__ de faena: la edición nueva pisa los meses que repite
    # (son provisorios) y lo anterior a su ventana sale del cache.
    return {faena.ID: faena.fusionar(faena.obtener(), viejas[faena.ID])}


def _simple(id_serie: str, obtener: Callable[[], SerieExterna]) -> Callable[[Viejas, int], Resultado]:
    def correr(viejas: Viejas, anio: int) -> Resultado:
        return {id_serie: obtener()}
    return correr


def _desde_incremental(vieja: SerieExterna | None, anio: int) -> int:
    """Primer año a bajar: el anterior al en curso, o antes si el cache quedó corto."""
    if vieja is None:
        return exportaciones.PRIMER_ANIO
    ultimo = int(vieja.puntos[-1]["periodo"][:4])
    return max(exportaciones.PRIMER_ANIO, min(anio - 1, ultimo))


def _combinar_incremental(parsear: Callable[[bytes, str, str], SerieExterna], fuente: str,
                          vieja: SerieExterna | None, archivos: list[tuple[int, str, bytes]],
                          desde: int, obs: str) -> SerieExterna:
    propios = [a for a in archivos if a[0] >= desde]
    if not propios:
        raise RuntimeError(f"no se bajó ningún ZIP desde {desde}")
    series = [parsear(c, u, obs) for _, u, c in propios]
    anios = ", ".join(str(a) for a, _, _ in propios)
    nota = (f"{len(propios)} ZIP anuales {exportaciones.URL_PLANTILLA.format(anio='AAAA')} "
            f"bajados el {obs} ({anios})")
    corte = f"{desde}-01"
    heredados = [p for p in vieja.puntos if p["periodo"] < corte] if vieja else []
    if heredados:
        # La serie parseada va primera: `combinar` toma unidad y columnas de la
        # primera, y tienen que ser las del parser vigente, no las del cache.
        series.append(SerieExterna(id=vieja.id, unidad=vieja.unidad, frecuencia=vieja.frecuencia,
                                   puntos=heredados, procedencia=vieja.procedencia,
                                   columnas=vieja.columnas))
        nota += (f"; {heredados[0]['periodo']} a {heredados[-1]['periodo']} vienen del cache "
                 f"anterior (observado el {vieja.procedencia.fecha_observacion}), armado con "
                 f"los mismos ZIP desde {exportaciones.PRIMER_ANIO}")
    nota += ". `url` es el del último año bajado."
    s = exportaciones.combinar(series, propios[-1][1], obs, nota)
    # `combinar` arma la procedencia con la FUENTE de exportaciones; la de destinos
    # lleva su sufijo (igual que hace exportaciones_destinos.obtener).
    s.procedencia.fuente = fuente
    return s


def _exportaciones(viejas: Viejas, anio: int) -> Resultado:
    pares = [
        (exportaciones.ID, exportaciones.parsear, exportaciones.FUENTE),
        (exportaciones_destinos.ID, exportaciones_destinos.parsear,
         exportaciones.FUENTE + " · por destino"),
    ]
    desde = {i: _desde_incremental(viejas[i], anio) for i, _, _ in pares}
    # Una sola descarga para las dos series: bajar_anios tolera el 404 del año en
    # curso (en enero el ZIP todavía no existe).
    archivos = exportaciones.bajar_anios(min(desde.values()), anio)
    obs = hoy()
    out: Resultado = {}
    for i, parsear, fuente in pares:
        try:
            out[i] = _combinar_incremental(parsear, fuente, viejas[i], archivos, desde[i], obs)
        except Exception as e:  # una serie rota no tira a la otra
            out[i] = e
    return out


TAREAS: list[_Tarea] = [
    _Tarea((faena.ID,), _faena),
    _Tarea((stock.ID,), _simple(stock.ID, lambda: stock.obtener())),
    _Tarea((exportaciones.ID, exportaciones_destinos.ID), _exportaciones),
    _Tarea((ipc.ID_NACIONAL,), _simple(ipc.ID_NACIONAL, lambda: ipc.obtener())),
    _Tarea((enso.ID,), _simple(enso.ID, lambda: enso.obtener())),
    _Tarea((lluvias.ID,), _simple(lluvias.ID, lambda: lluvias.obtener())),
]
# Los lambdas resuelven `modulo.obtener` en cada corrida (no al importar): así los
# tests pueden reemplazarlo con mock.patch.


# ─── corrida ───────────────────────────────────────────────────────────────────

def _ruta(id_serie: str, cache_dir: Path) -> Path:
    return cache_dir / ruta_cache(id_serie).name


def _fin(s: SerieExterna) -> str:
    return s.procedencia.fecha_dato or str(s.puntos[-1].get("periodo", ""))


def _error_corto(e: BaseException) -> str:
    texto = (str(e).strip().splitlines() or [""])[0]
    texto = f"{type(e).__name__}: {texto}" if texto else type(e).__name__
    return texto if len(texto) <= 160 else texto[:157] + "…"


def _nota(id_serie: str, motivo: str, vieja: SerieExterna | None) -> str:
    nombre = NOMBRES.get(id_serie, id_serie)
    if vieja is None:
        return f"{nombre}: no se actualizó ({motivo}); sin cache, la página se omite"
    return (f"{nombre}: no se actualizó ({motivo}); se usa el cache del "
            f"{vieja.procedencia.fecha_observacion} con dato a {_fin(vieja)}")


def _guardar_atomico(serie: SerieExterna, ruta: Path) -> None:
    tmp = ruta.with_name(ruta.name + ".tmp")
    try:
        guardar_cache(serie, tmp)
        os.replace(tmp, ruta)
    finally:
        if tmp.exists():
            tmp.unlink()


def actualizar_todas(log: Callable[[str], None] = print, cache_dir: Path | None = None,
                     anio: int | None = None) -> list[str]:
    """
    Refresca los caches de todas las fuentes que usa el informe. Nunca levanta por una
    fuente: devuelve una nota por cada serie que no se pudo actualizar (lista vacía si
    anduvo todo). `cache_dir` y `anio` existen para los tests; en producción van por
    defecto (`cache/` del informe y el año de hoy).
    """
    cache_dir = cache_dir or CACHE
    anio = anio or date.today().year
    notas: list[str] = []
    for tarea in TAREAS:
        viejas: Viejas = {}
        for i in tarea.ids:
            ruta = _ruta(i, cache_dir)
            try:
                viejas[i] = cargar_cache(i, ruta) if ruta.exists() else None
            except Exception as e:
                # Un cache ilegible no sirve de respaldo: se trata como ausente.
                log(f"  ⚠ cache ilegible de {i} ({_error_corto(e)}): se ignora")
                viejas[i] = None
        try:
            resultado = tarea.correr(viejas, anio)
        except Exception as e:
            resultado = {i: e for i in tarea.ids}
        for i in tarea.ids:
            nueva = resultado.get(i, RuntimeError("la tarea no devolvió la serie"))
            vieja = viejas[i]
            if isinstance(nueva, BaseException):
                notas.append(_nota(i, _error_corto(nueva), vieja))
                continue
            if vieja is not None and _fin(nueva) < _fin(vieja):
                notas.append(_nota(i, f"la serie bajada termina en {_fin(nueva)}, antes que el cache", vieja))
                continue
            try:
                _guardar_atomico(nueva, _ruta(i, cache_dir))
            except Exception as e:
                notas.append(_nota(i, f"no se pudo escribir el cache: {_error_corto(e)}", vieja))
                continue
            log(f"  ✓ {NOMBRES.get(i, i)}: {len(nueva)} puntos, último {_fin(nueva)}")
    return notas


if __name__ == "__main__":
    for n in actualizar_todas():
        print(f"  ⚠ {n}")
