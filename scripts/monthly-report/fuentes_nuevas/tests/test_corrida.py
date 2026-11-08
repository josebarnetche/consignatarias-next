"""
Tests de la corrida mensual (`fuentes_nuevas.corrida`). Sin red: cada `obtener` y
`bajar_anios` se reemplaza con mock.patch, y el cache va a un directorio temporal.
Los ZIP del INDEC se arman acá mismo, chicos y con su `etot*.csv` de control, porque
lo que se prueba es el empalme con el cache, no el parser (eso es test_exportaciones).
"""

import io
import tempfile
import unittest
import urllib.error
import zipfile
from pathlib import Path
from unittest import mock

from fuentes_nuevas import (corrida, enso, exportaciones, exportaciones_destinos, faena, ipc,
                            lluvias, stock)
from fuentes_nuevas._base import Procedencia, SerieExterna, cargar_cache, guardar_cache

ANIO = 2026
OBS_VIEJO = "2026-10-01"


def _serie(id_serie: str, periodos: list[str], obs: str = OBS_VIEJO, **extra) -> SerieExterna:
    puntos = [{"periodo": p, "valor": 1.0, **extra} for p in periodos]
    return SerieExterna(id=id_serie, unidad="u", frecuencia="mensual", puntos=puntos,
                        procedencia=Procedencia(fuente="prueba", url="https://ejemplo/x",
                                                fecha_observacion=obs, fecha_dato=periodos[-1],
                                                rezago="-", licencia="-"))


def _meses(desde: str, hasta: str) -> list[str]:
    a, m = map(int, desde.split("-"))
    out = []
    while f"{a}-{m:02d}" <= hasta:
        out.append(f"{a}-{m:02d}")
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return out


def _zip_indec(anio: int, meses: int) -> bytes:
    """ZIP anual mínimo con el formato de 2018+: exponmAA.csv + etotnmAA.csv."""
    aa = f"{anio % 100:02d}"
    lineas = ["Año;Mes;NCM;Pdes;Pnet(kg);FOB(USD)"]
    kg = usd = 0.0
    for m in range(1, meses + 1):
        for ncm, pais, k, u in (("02013000", 310, 5_000_000.0, 30_000_000.0),
                                ("02023000", 319, 1_000_000.0, 8_000_000.0),
                                ("10059010", 310, 9_000_000.0, 2_000_000.0)):
            lineas.append(f"{anio};{m:02d};{ncm};{pais};{k:.2f};{u:.2f}".replace(".", ","))
            kg += k
            usd += u
    control = ["Año;Mes;NCM;Pdes;Pnet(kg);FOB(USD)",
               f"{anio};;;;{kg:.2f};{usd:.2f}".replace(".", ",")]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(f"exponm{aa}.csv", "\r\n".join(lineas).encode("latin-1"))
        z.writestr(f"etotnm{aa}.csv", "\r\n".join(control).encode("latin-1"))
    return buf.getvalue()


def _archivo(anio: int, meses: int) -> tuple[int, str, bytes]:
    return anio, exportaciones.URL_PLANTILLA.format(anio=anio), _zip_indec(anio, meses)


class _ConCache(unittest.TestCase):
    """Directorio de cache temporal y todas las fuentes mockeadas a una serie sana."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)
        sanas = {
            (faena, "obtener"): lambda: _serie(faena.ID, _meses("2025-01", "2026-09"), obs="2026-11-02",
                                               edicion="2026-09"),
            (stock, "obtener"): lambda: _serie(stock.ID, ["2024", "2025"], obs="2026-11-02"),
            (ipc, "obtener"): lambda: _serie(ipc.ID_NACIONAL, _meses("2016-12", "2026-09"), obs="2026-11-02"),
            (enso, "obtener"): lambda: _serie(enso.ID, _meses("2026-01", "2026-09"), obs="2026-11-02"),
            (lluvias, "obtener"): lambda: _serie(lluvias.ID, _meses("2026-01", "2026-09"), obs="2026-11-02"),
            (exportaciones, "bajar_anios"): lambda desde, hasta: [_archivo(a, 12 if a < ANIO else 9)
                                                                  for a in range(desde, hasta + 1)],
        }
        self.mocks = {}
        for (mod, attr), fn in sanas.items():
            p = mock.patch.object(mod, attr, side_effect=fn)
            self.mocks[(mod.__name__.rsplit(".", 1)[-1], attr)] = p.start()
            self.addCleanup(p.stop)

    def ruta(self, id_serie: str) -> Path:
        return self.dir / f"externa-{id_serie}.json"

    def correr(self) -> list[str]:
        return corrida.actualizar_todas(log=lambda _: None, cache_dir=self.dir, anio=ANIO)


class TestTolerancia(_ConCache):
    def test_una_fuente_que_falla_no_corta_las_otras_y_deja_el_cache_intacto(self):
        guardar_cache(_serie(faena.ID, _meses("2025-01", "2026-08"), edicion="2026-08"), self.ruta(faena.ID))
        antes = self.ruta(faena.ID).read_bytes()
        self.mocks[("faena", "obtener")].side_effect = RuntimeError("pdftotext no está instalado")

        notas = self.correr()

        self.assertEqual(self.ruta(faena.ID).read_bytes(), antes)
        self.assertEqual(len(notas), 1)
        self.assertIn("faena nacional (MAGyP): no se actualizó", notas[0])
        self.assertIn("pdftotext no está instalado", notas[0])
        # la nota dice de cuándo es el cache y hasta qué mes llega
        self.assertIn(f"se usa el cache del {OBS_VIEJO} con dato a 2026-08", notas[0])
        # las demás se escribieron igual
        for i in (stock.ID, ipc.ID_NACIONAL, enso.ID, lluvias.ID,
                  exportaciones.ID, exportaciones_destinos.ID):
            self.assertTrue(self.ruta(i).exists(), i)
        self.assertFalse(list(self.dir.glob("*.tmp")))

    def test_sin_cache_la_pagina_se_omite(self):
        self.mocks[("enso", "obtener")].side_effect = urllib.error.URLError("timed out")
        notas = self.correr()
        self.assertEqual(notas, ["ENSO · ONI/RONI (NOAA): no se actualizó (URLError: <urlopen error "
                                 "timed out>); sin cache, la página se omite"])
        self.assertFalse(self.ruta(enso.ID).exists())

    def test_todo_bien_no_devuelve_notas(self):
        self.assertEqual(self.correr(), [])

    def test_faena_fusiona_con_el_cache_viejo(self):
        # El cache tiene 2024 (de una edición vieja) que la edición nueva ya no trae.
        guardar_cache(_serie(faena.ID, _meses("2024-01", "2026-08"), edicion="2026-08"), self.ruta(faena.ID))
        self.assertEqual(self.correr(), [])
        s = cargar_cache(faena.ID, self.ruta(faena.ID))
        self.assertEqual(s.puntos[0]["periodo"], "2024-01")
        self.assertEqual(s.puntos[-1]["periodo"], "2026-09")
        self.assertEqual({p["edicion"] for p in s.puntos if p["periodo"] >= "2025-01"}, {"2026-09"})

    def test_cache_ilegible_cuenta_como_ausente(self):
        self.ruta(enso.ID).write_text("{no es json", encoding="utf-8")
        self.mocks[("enso", "obtener")].side_effect = RuntimeError("caído")
        notas = self.correr()
        self.assertEqual(len(notas), 1)
        self.assertIn("sin cache, la página se omite", notas[0])


class TestNoPisarConAlgoMasViejo(_ConCache):
    def test_serie_que_termina_antes_que_el_cache_no_se_guarda(self):
        guardar_cache(_serie(enso.ID, _meses("2026-01", "2026-10")), self.ruta(enso.ID))
        antes = self.ruta(enso.ID).read_bytes()
        notas = self.correr()  # el mock devuelve hasta 2026-09
        self.assertEqual(self.ruta(enso.ID).read_bytes(), antes)
        self.assertEqual(notas, [f"ENSO · ONI/RONI (NOAA): no se actualizó (la serie bajada termina en "
                                 f"2026-09, antes que el cache); se usa el cache del {OBS_VIEJO} con dato a 2026-10"])

    def test_misma_fecha_si_se_pisa(self):
        guardar_cache(_serie(enso.ID, _meses("2026-01", "2026-09")), self.ruta(enso.ID))
        self.assertEqual(self.correr(), [])
        self.assertEqual(cargar_cache(enso.ID, self.ruta(enso.ID)).procedencia.fecha_observacion, "2026-11-02")


class TestExportaciones(_ConCache):
    def _cache_viejo(self, hasta: str) -> None:
        # Valores marcados (valor=1.0) para distinguir lo heredado de lo recién parseado.
        guardar_cache(_serie(exportaciones.ID, _meses("2002-01", hasta)), self.ruta(exportaciones.ID))
        guardar_cache(_serie(exportaciones_destinos.ID, _meses("2002-01", hasta)),
                      self.ruta(exportaciones_destinos.ID))

    def test_combina_cache_viejo_con_los_dos_ultimos_anios_sin_hueco(self):
        self._cache_viejo("2026-08")
        self.assertEqual(self.correr(), [])
        # una sola descarga, del año anterior al en curso
        self.mocks[("exportaciones", "bajar_anios")].assert_called_once_with(2025, 2026)
        for i in (exportaciones.ID, exportaciones_destinos.ID):
            s = cargar_cache(i, self.ruta(i))
            per = [p["periodo"] for p in s.puntos]
            self.assertEqual(per, _meses("2002-01", "2026-09"), i)
            por = {p["periodo"]: p for p in s.puntos}
            self.assertIn("valor", por["2024-12"])          # heredado del cache
            self.assertNotIn("valor", por["2025-01"])       # recién parseado
            self.assertEqual(s.procedencia.fecha_dato, "2026-09")
            self.assertEqual(s.procedencia.url, exportaciones.URL_PLANTILLA.format(anio=2026))
            nota = s.procedencia.nota
            self.assertIn("2 ZIP anuales", nota)
            self.assertIn("(2025, 2026)", nota)
            self.assertIn(f"2002-01 a 2024-12 vienen del cache anterior (observado el {OBS_VIEJO})", nota)
        s_tot = cargar_cache(exportaciones.ID, self.ruta(exportaciones.ID))
        s_des = cargar_cache(exportaciones_destinos.ID, self.ruta(exportaciones_destinos.ID))
        self.assertEqual(s_tot.procedencia.fuente, exportaciones.FUENTE)
        self.assertEqual(s_des.procedencia.fuente, exportaciones.FUENTE + " · por destino")
        self.assertAlmostEqual(s_tot.puntos[-1]["toneladas_peso_producto"], 6000.0)
        self.assertAlmostEqual(s_des.puntos[-1]["toneladas_china"], 5000.0)
        # las columnas son las del parser vigente, no las del cache
        self.assertIn("usd_por_t", s_tot.columnas)

    def test_cache_corto_baja_desde_su_ultimo_anio(self):
        self._cache_viejo("2023-12")
        self.assertEqual(self.correr(), [])
        self.mocks[("exportaciones", "bajar_anios")].assert_called_once_with(2023, 2026)
        s = cargar_cache(exportaciones.ID, self.ruta(exportaciones.ID))
        self.assertEqual([p["periodo"] for p in s.puntos], _meses("2002-01", "2026-09"))

    def test_en_enero_sin_zip_del_anio_en_curso(self):
        self._cache_viejo("2025-10")
        self.mocks[("exportaciones", "bajar_anios")].side_effect = lambda d, h: [_archivo(2025, 11)]
        self.assertEqual(self.correr(), [])
        s = cargar_cache(exportaciones.ID, self.ruta(exportaciones.ID))
        self.assertEqual(s.procedencia.fecha_dato, "2025-11")
        self.assertIn("1 ZIP anuales", s.procedencia.nota)
        self.assertIn("(2025)", s.procedencia.nota)

    def test_sin_cache_baja_todo(self):
        self.mocks[("exportaciones", "bajar_anios")].side_effect = (
            lambda d, h: [_archivo(a, 12 if a < ANIO else 9) for a in range(2024, h + 1)])
        notas = self.correr()
        self.mocks[("exportaciones", "bajar_anios")].assert_called_once_with(exportaciones.PRIMER_ANIO, 2026)
        self.assertEqual(notas, [])
        s = cargar_cache(exportaciones.ID, self.ruta(exportaciones.ID))
        self.assertNotIn("cache anterior", s.procedencia.nota)

    def test_hueco_no_se_tapa_y_el_cache_queda(self):
        # El mock "pierde" 2025: entre el cache (hasta 2024-12) y 2026 queda un hueco.
        self._cache_viejo("2026-08")
        antes = self.ruta(exportaciones.ID).read_bytes()
        self.mocks[("exportaciones", "bajar_anios")].side_effect = lambda d, h: [_archivo(2026, 9)]
        notas = self.correr()
        self.assertEqual(self.ruta(exportaciones.ID).read_bytes(), antes)
        self.assertEqual(len(notas), 2)
        self.assertIn("exportaciones de carne bovina (INDEC): no se actualizó (FormatoCambiado: "
                      "combinar: hueco antes de 2026-01)", notas[0])
        self.assertIn("con dato a 2026-08", notas[0])

    def test_falla_la_descarga_anota_las_dos_series(self):
        self._cache_viejo("2026-08")
        self.mocks[("exportaciones", "bajar_anios")].side_effect = TimeoutError("The read operation timed out")
        notas = self.correr()
        self.assertEqual(len(notas), 2)
        self.assertTrue(notas[0].startswith("exportaciones de carne bovina (INDEC): no se actualizó (TimeoutError: The read"))
        self.assertTrue(notas[1].startswith("exportaciones de carne bovina por destino (INDEC)"))


if __name__ == "__main__":
    unittest.main()
