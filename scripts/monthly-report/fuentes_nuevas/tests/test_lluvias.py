"""Tests del parser de lluvias (CLIMAT del SMN vía DWD). Fixtures: archivos reales bajados el 02-11-2026."""

import unittest
from pathlib import Path

from fuentes_nuevas import lluvias
from fuentes_nuevas._base import FormatoCambiado

FIX = Path(__file__).resolve().parent / "fixtures" / "lluvias"
AZUL = (FIX / "87641.txt").read_bytes()
CERES = (FIX / "87257.txt").read_bytes()
CORRIENTES = (FIX / "87166.txt").read_bytes()
NORMALES = (FIX / "normales-1991_2020-recorte.txt").read_bytes()

EST = [("87257", "Ceres", "Santa Fe"), ("87641", "Azul", "Buenos Aires")]


def _serie(contenidos=None, normales=NORMALES, estaciones=EST):
    return lluvias.parsear(contenidos or {"87641": AZUL, "87257": CERES},
                           lluvias.URL_DIR, "2026-11-02", normales=normales, estaciones=estaciones)


def _punto(serie, wmo, periodo):
    return next(p for p in serie.puntos if p["wmo"] == wmo and p["periodo"] == periodo)


class TestValores(unittest.TestCase):
    def test_azul_septiembre_2026(self):
        p = _punto(_serie(), "87641", "2026-09")
        self.assertEqual(p["precipitacion_mm"], 55.0)
        self.assertEqual(p["normal_mm"], 67.5)
        self.assertEqual(p["anomalia_mm"], -12.5)
        self.assertEqual(p["pct_normal"], 81.5)
        self.assertEqual(p["estacion"], "Azul")

    def test_azul_marzo_2026_muy_lluvioso(self):
        p = _punto(_serie(), "87641", "2026-03")
        self.assertEqual(p["precipitacion_mm"], 365.0)
        self.assertEqual(p["pct_normal"], 320.5)

    def test_cero_es_dato_y_no_faltante(self):
        p = _punto(_serie(), "87257", "2026-05")
        self.assertEqual(p["precipitacion_mm"], 0.0)
        self.assertEqual(p["pct_normal"], 0.0)

    def test_celdas_vacias_no_se_completan(self):
        s = _serie()
        self.assertFalse(any(p["periodo"] >= "2026-10" for p in s.puntos))
        self.assertEqual(s.procedencia.fecha_dato, "2026-09")
        self.assertEqual(len(s), 2 * (24 + 9))

    def test_estacion_rala_sin_normal(self):
        s = _serie({"87166": CORRIENTES}, estaciones=[("87166", "Corrientes", "Corrientes")])
        self.assertEqual(len(s), 1)
        p = s.puntos[0]
        self.assertEqual((p["periodo"], p["precipitacion_mm"]), ("2025-09", 159.0))
        self.assertIsNone(p["normal_mm"])
        self.assertIsNone(p["pct_normal"])
        self.assertIn("Corrientes", s.procedencia.nota)

    def test_normal_con_hueco(self):
        n = lluvias.parsear_normales(NORMALES)
        self.assertIsNone(n["87637"][1])          # Coronel Suárez, febrero
        self.assertEqual(n["87641"][8], 67.5)

    def test_procedencia_y_licencia(self):
        s = _serie()
        self.assertEqual(s.id, "lluvias-corredor-ganadero")
        self.assertIn("CC BY 4.0", s.procedencia.licencia)
        self.assertEqual(s.procedencia.url, lluvias.URL_DIR)

    def test_lista_por_defecto(self):
        wmos = [w for w, _, _ in lluvias.ESTACIONES]
        self.assertEqual(len(wmos), len(set(wmos)))
        self.assertNotIn("87166", wmos)   # Corrientes: no transmite CLIMAT completo
        self.assertNotIn("87281", wmos)   # Mercedes (Ctes.): ídem


class TestFormatoCambiado(unittest.TestCase):
    def test_encabezado_traducido(self):
        malo = AZUL.replace(b"JAHR;Jan;Feb;Mrz", b"YEAR;Jan;Feb;Mar")
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": malo, "87257": CERES})

    def test_columnas_de_menos(self):
        malo = AZUL.replace(b"2025;38.0;", b"2025;")
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": malo, "87257": CERES})

    def test_lluvia_implausible(self):
        malo = AZUL.replace(b";365.0;", b";3650.0;")
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": malo, "87257": CERES})

    def test_lluvia_negativa(self):
        malo = AZUL.replace(b";55.0;", b";-999.0;")
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": malo, "87257": CERES})

    def test_anio_repetido(self):
        malo = AZUL + AZUL.splitlines(keepends=True)[-1]
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": malo, "87257": CERES})

    def test_normales_encabezado(self):
        with self.assertRaises(FormatoCambiado):
            _serie(normales=NORMALES.replace(b"Station;", b"Stat;"))

    def test_falta_una_estacion(self):
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": AZUL})

    def test_html_de_error(self):
        with self.assertRaises(FormatoCambiado):
            _serie({"87641": b"<html>404 Not Found</html>", "87257": CERES})


if __name__ == "__main__":
    unittest.main()
