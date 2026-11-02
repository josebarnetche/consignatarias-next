"""Tests de la faena bovina mensual (MAGyP, PDF mensual). Sin red ni pdftotext:
el fixture es la salida de `pdftotext -raw` de la edición de septiembre 2026,
recortada a la portada y las tres tablas "Clasificación por sexo"."""

import unittest
from pathlib import Path

from fuentes_nuevas._base import FormatoCambiado, Procedencia, SerieExterna
from fuentes_nuevas import faena

FIX = Path(__file__).resolve().parent / "fixtures" / "faena"
TXT = (FIX / "informe-2026-09-raw.txt").read_text(encoding="utf-8")


def _parsear(texto: str = TXT):
    return faena.parsear(texto.encode("utf-8"), faena.URL, "2026-11-02")


class TestFaena(unittest.TestCase):
    def test_valores_conocidos(self):
        s = _parsear()
        self.assertEqual(s.id, "faena-bovina-mensual")
        self.assertEqual(len(s), 21)  # ene-2025 a sep-2026
        self.assertEqual(s.puntos[0]["periodo"], "2025-01")
        self.assertEqual(s.procedencia.fecha_dato, "2026-09")
        p = {x["periodo"]: x for x in s.puntos}
        sep = p["2026-09"]
        self.assertEqual(sep["total"], 1_045_293)
        self.assertEqual(sep["vaquillonas"], 271_909)
        self.assertEqual(sep["vacas"], 188_692)
        self.assertEqual(sep["mej"], 18_152)
        self.assertEqual(sep["novillitos"], 467_650)
        self.assertEqual(sep["novillos"], 78_676)
        self.assertEqual(sep["toros"], 20_214)
        self.assertEqual(sep["pct_hembras"], 44.1)
        self.assertEqual(sep["peso_medio_res_kg"], 247)
        self.assertEqual(sep["produccion_t"], 258_238)
        self.assertEqual(sep["peso_res_kg_novillos"], 297)
        self.assertEqual(sep["edicion"], "2026-09")
        # Diciembre 2025: el año sale de la fila "Total 2025", no de un rótulo.
        self.assertEqual(p["2025-12"]["total"], 1_134_940)
        self.assertEqual(p["2025-12"]["produccion_t"], 260_573)

    def test_procedencia(self):
        s = _parsear()
        self.assertIn("argentina.gob.ar/terminos-y-condiciones", s.procedencia.licencia)
        self.assertTrue(s.procedencia.url.startswith("https://www.magyp.gob.ar/"))
        self.assertIn("pct_hembras", s.columnas)

    def test_encabezado_cambiado_rompe(self):
        roto = TXT.replace("MEJ NOVILLITO NOVILLO TOROS Total Machos % Hembras",
                           "MEJ NOVILLITO TERNEROS NOVILLO TOROS Total Machos % Hembras", 1)
        with self.assertRaises(FormatoCambiado):
            _parsear(roto)

    def test_mes_faltante_rompe(self):
        # Sacar marzo 2026 de cabezas: la suma ya no cierra contra "Acum 2026".
        lineas = TXT.splitlines()
        i = next(k for k, l in enumerate(lineas) if l.startswith("Marzo 1.031.655"))
        with self.assertRaises(FormatoCambiado):
            _parsear("\n".join(lineas[:i] + lineas[i + 1:]))

    def test_valor_fuera_de_rango_rompe(self):
        # Peso res total de septiembre 2026 a 347 kg (fuera de 150-300).
        roto = TXT.replace("Septiembre 247 202 255 224 238 257 297 364 266",
                           "Septiembre 347 202 255 224 238 257 297 364 266")
        with self.assertRaises(FormatoCambiado):
            _parsear(roto)

    def test_no_es_el_informe(self):
        with self.assertRaises(FormatoCambiado):
            _parsear("Informe de exportaciones\nSeptiembre de 2026\n")

    def test_fusion_conserva_historia_y_pisa_revisiones(self):
        nueva = _parsear()
        vieja = SerieExterna(
            id=faena.ID, unidad=nueva.unidad, frecuencia="mensual",
            puntos=[{"periodo": "2024-12", "edicion": "2025-12", "total": 1_100_000},
                    {"periodo": "2025-01", "edicion": "2025-12", "total": 1},],
            procedencia=Procedencia(fuente="x", url="u", fecha_observacion="2026-01-10",
                                    fecha_dato="2025-01", rezago="", licencia=""),
        )
        f = faena.fusionar(nueva, vieja)
        p = {x["periodo"]: x for x in f.puntos}
        self.assertEqual(p["2024-12"]["edicion"], "2025-12")       # se conserva
        self.assertEqual(p["2025-01"]["total"], 1_150_509)          # la edición nueva pisa
        self.assertEqual(f.puntos[0]["periodo"], "2024-12")


if __name__ == "__main__":
    unittest.main()
