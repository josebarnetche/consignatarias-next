"""
Tests del parser de stock bovino por categoría (SAGyP/SIGSA-SENASA, al 31-12).

La fixture es un recorte del XLSX real ("Serie stock Bovino por provincia al
31-12 (2007-2025)", bajado el 2026-11-02): hojas 2011 (estimada), 2024, 2025 y
la hoja "Serie" con solo esos años. Los valores son verbatim.
"""

from __future__ import annotations

import io
import unittest
import zipfile
from pathlib import Path

from fuentes_nuevas import stock
from fuentes_nuevas._base import FormatoCambiado

FIXTURE = Path(__file__).parent / "fixtures" / "stock" / "serie-stock-provincia-31-12-recorte.xlsx"
OBS = "2026-11-02"


def _alterar(contenido: bytes, viejo: str, nuevo: str, hoja: int | None = None,
             archivo: str | None = None) -> bytes:
    """Reemplaza texto dentro de las hojas del XLSX (todas, la n-ésima, o `archivo`)."""
    entrada = zipfile.ZipFile(io.BytesIO(contenido))
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED) as z:
        for item in entrada.infolist():
            datos = entrada.read(item.filename)
            es_hoja = item.filename.startswith("xl/worksheets/sheet")
            if archivo is not None:
                if item.filename == archivo:
                    datos = datos.decode("utf-8").replace(viejo, nuevo).encode("utf-8")
            elif es_hoja and (hoja is None or item.filename == f"xl/worksheets/sheet{hoja}.xml"):
                datos = datos.decode("utf-8").replace(viejo, nuevo).encode("utf-8")
            z.writestr(item, datos)
    return salida.getvalue()


class TestParsearStock(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contenido = FIXTURE.read_bytes()
        cls.serie = stock.parsear(cls.contenido, stock.URL, OBS)
        cls.por_anio = {p["periodo"]: p for p in cls.serie.puntos}

    def test_fixture_chica(self) -> None:
        self.assertLess(FIXTURE.stat().st_size, 50_000)

    def test_metadatos(self) -> None:
        s = self.serie
        self.assertEqual(s.id, "stock-bovino-categorias")
        self.assertEqual(s.frecuencia, "anual")
        self.assertEqual(s.unidad, "cabezas")
        self.assertEqual(s.procedencia.fecha_dato, "2025-12")
        self.assertEqual(s.procedencia.fecha_observacion, OBS)
        self.assertIn("CC BY 4.0", s.procedencia.licencia)
        self.assertEqual([p["periodo"] for p in s.puntos], ["2011", "2024", "2025"])

    def test_cierre_2025_coincide_con_el_informe_oficial(self) -> None:
        # "El stock bovino cerró el año 2025 en 50.920.790 cabezas totales." (informe 251231)
        p = self.por_anio["2025"]
        self.assertEqual(p["total"], 50_920_790)
        self.assertEqual(p["fecha_corte"], "2025-12-31")
        self.assertEqual(p["vacas"], 21_559_623)
        self.assertEqual(p["vaquillonas"], 6_888_264)
        self.assertEqual(p["novillos"], 2_111_782)
        self.assertEqual(p["novillitos"], 4_691_941)
        self.assertEqual(p["terneros"], 7_213_843)
        self.assertEqual(p["terneras"], 7_191_179)
        self.assertEqual(p["toros"], 913_152)
        self.assertEqual(p["toritos"], 347_242)
        self.assertEqual(p["bueyes"], 3_764)
        self.assertFalse(p["estimado"])
        # terneros + terneras = 14.405.022 (mismo informe)
        self.assertEqual(p["terneros"] + p["terneras"], 14_405_022)

    def test_2024(self) -> None:
        p = self.por_anio["2024"]
        self.assertEqual(p["total"], 51_624_909)
        self.assertEqual(p["vacas"], 22_080_149)

    def test_vacas_sobre_total_es_cociente_exacto(self) -> None:
        p = self.por_anio["2025"]
        self.assertAlmostEqual(p["vacas_sobre_total"], 21_559_623 / 50_920_790, places=6)

    def test_anio_estimado_se_marca(self) -> None:
        p = self.por_anio["2011"]
        self.assertTrue(p["estimado"])
        self.assertEqual(p["total"], 50_714_153)
        self.assertEqual(p["toritos"], 0)  # la fuente no discriminaba toritos antes de 2013

    def test_suma_de_categorias_da_el_total(self) -> None:
        for p in self.serie.puntos:
            suma = sum(p[c] for c in stock.CATEGORIAS)
            self.assertLessEqual(abs(suma - p["total"]), 5, p["periodo"])

    def test_nunca_periodo_marzo(self) -> None:
        for p in self.serie.puntos:
            self.assertNotIn("-03", p["periodo"])


class TestFormatoCambiado(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contenido = FIXTURE.read_bytes()

    def test_encabezado_renombrado(self) -> None:
        malo = _alterar(self.contenido, ">Vaquillonas<", ">Vientres<")
        with self.assertRaises(FormatoCambiado):
            stock.parsear(malo, stock.URL, OBS)

    def test_titulo_con_otra_fecha_de_corte(self) -> None:
        malo = _alterar(self.contenido, "31/12/2025", "31/03/2025")
        with self.assertRaises(FormatoCambiado):
            stock.parsear(malo, stock.URL, OBS)

    def test_total_fuera_de_rango(self) -> None:
        # total 2025 de 50.920.790 → 509.207.900 (un cero de más)
        malo = _alterar(self.contenido, "<v>50920790.0</v>", "<v>509207900.0</v>", hoja=3)
        with self.assertRaises(FormatoCambiado):
            stock.parsear(malo, stock.URL, OBS)

    def test_total_no_cierra_con_las_categorias(self) -> None:
        malo = _alterar(self.contenido, "<v>50920790.0</v>", "<v>50920000.0</v>", hoja=3)
        with self.assertRaises(FormatoCambiado):
            stock.parsear(malo, stock.URL, OBS)

    def test_sin_hoja_serie(self) -> None:
        malo = _alterar(self.contenido, 'name="Serie 2007-2024"', 'name="Hoja1"', archivo="xl/workbook.xml")
        with self.assertRaises(FormatoCambiado):
            stock.parsear(malo, stock.URL, OBS)

    def test_no_es_xlsx(self) -> None:
        with self.assertRaises(FormatoCambiado):
            stock.parsear(b"<html>Error 404</html>", stock.URL, OBS)


class TestDescubrirUrl(unittest.TestCase):
    # Fragmento verbatim de la página de informes (2026-11-02) + un enlace viejo inventado.
    HTML = (
        "<div style='' title='142Kb - Publicación: (06-04-26)'><img src='/sitio/_img/_xlsx.gif'/> "
        "<a target='_blank' href='_archivos//000001=Series de stock bovino y mapas/000000_Stock/"
        "251231_Serie stock Bovino por provincia al 31-12 (2007-2025).xlsx'>Serie stock \n"
        "Bovino por provincia al 31-12 (2007-2025)</a></div>"
        "<a href='_archivos//000001=Series de stock bovino y mapas/000000_Stock/"
        "241231_Serie stock Bovino por provincia al 31-12 (2007-2024).xlsx'>viejo</a>"
    )

    def test_elige_el_rango_mas_nuevo_y_respeta_la_url(self) -> None:
        self.assertEqual(stock.descubrir_url(self.HTML), stock.URL)

    def test_sin_enlace_rompe(self) -> None:
        with self.assertRaises(FormatoCambiado):
            stock.descubrir_url("<html><body>Informes</body></html>")


if __name__ == "__main__":
    unittest.main()
