"""
Tests de fuentes_nuevas.fao_carne.

Fixture mínima (cita breve, licencia FAO no comercial): 4 meses reales
(2026-06 a 2026-09) del XLSX oficial "FAO Meat Price Indices" de la
publicación de octubre 2026, y las mismas 4 filas del CSV del FFPI.
"""

from __future__ import annotations

import io
import unittest
import zipfile
from pathlib import Path

from fuentes_nuevas._base import FormatoCambiado
from fuentes_nuevas import fao_carne

FX = Path(__file__).resolve().parent / "fixtures" / "fao"
XLSX = (FX / "meat-price-indices-min.xlsx").read_bytes()
CSV = (FX / "ffpi-min.csv").read_bytes()
URL = "https://www.fao.org/media/docs/marketsandtradelibraries/default-document-library/fao-meat-price-indices_oct-26.xlsx"


def _xlsx_alterado(reemplazos: list[tuple[str, str]], parte: str = "xl/worksheets/sheet1.xml") -> bytes:
    """Copia la fixture cambiando texto dentro de una parte del ZIP (las celdas son inlineStr)."""
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(XLSX)) as zin, zipfile.ZipFile(out, "w") as zout:
        for n in zin.namelist():
            data = zin.read(n)
            if n == parte:
                s = data.decode()
                for a, b in reemplazos:
                    assert a in s, a
                    s = s.replace(a, b, 1)
                data = s.encode()
            zout.writestr(n, data)
    return out.getvalue()


class TestParsear(unittest.TestCase):
    def setUp(self) -> None:
        self.s = fao_carne.parsear(XLSX, URL, "2026-11-02", ffpi_csv=CSV)

    def test_valores_conocidos(self) -> None:
        self.assertEqual([p["periodo"] for p in self.s.puntos], ["2026-06", "2026-07", "2026-08", "2026-09"])
        sep = self.s.puntos[-1]
        self.assertEqual(sep["carne"], 127.86)       # FAO: "averaged 127.9 points in September"
        self.assertEqual(sep["bovina"], 147.92)
        self.assertEqual(sep["alimentos"], 136.0)
        self.assertEqual(self.s.puntos[0]["bovina"], 154.59)

    def test_procedencia_y_unidad(self) -> None:
        p = self.s.procedencia
        self.assertEqual(self.s.id, "fao-indice-carne")
        self.assertEqual(self.s.frecuencia, "mensual")
        self.assertIn("2014-2016=100", self.s.unidad)
        self.assertEqual(p.fecha_dato, "2026-09")
        self.assertEqual(p.url, URL)
        self.assertIn("provisorio", p.nota)
        self.assertIn("no comercial", p.licencia)

    def test_sin_csv_no_hay_alimentos(self) -> None:
        s = fao_carne.parsear(XLSX, URL, "2026-11-02")
        self.assertNotIn("alimentos", s.puntos[0])
        self.assertNotIn("alimentos", s.columnas)

    def test_csv_parcial_no_estima(self) -> None:
        csv = b"\n".join(l for l in CSV.splitlines() if not l.startswith(b"2026-09")) + b"\n"
        s = fao_carne.parsear(XLSX, URL, "2026-11-02", ffpi_csv=csv)
        self.assertNotIn("alimentos", s.puntos[-1])
        self.assertIn("2026-09", s.procedencia.nota)


class TestFormatoCambiado(unittest.TestCase):
    def test_columna_renombrada(self) -> None:
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(_xlsx_alterado([("Bovine Meat", "Beef")]), URL, "2026-11-02")

    def test_hoja_renombrada(self) -> None:
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(_xlsx_alterado([('name="Meat Price Indices"', 'name="Indices"')], "xl/workbook.xml"),
                              URL, "2026-11-02")

    def test_fuera_de_rango(self) -> None:
        # bovina de 2026-09 cambiada a 1479.2 (corrimiento de coma)
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(_xlsx_alterado([("<v>147.92019741441644</v>", "<v>1479.2019741441644</v>")]),
                              URL, "2026-11-02")

    def test_mes_faltante(self) -> None:
        # 2026-08 (serial 46235) pasa a 2026-10 (46296): hueco en la serie
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(_xlsx_alterado([("<v>46235.0</v>", "<v>46296.0</v>")]), URL, "2026-11-02")

    def test_no_es_xlsx(self) -> None:
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(b"<html>no</html>", URL, "2026-11-02")

    def test_csv_encabezado_alterado(self) -> None:
        with self.assertRaises(FormatoCambiado):
            fao_carne.parsear(XLSX, URL, "2026-11-02", ffpi_csv=CSV.replace(b"Food Price Index,Meat", b"FFPI,Meat"))


class TestLink(unittest.TestCase):
    def test_saca_link_vigente(self) -> None:
        html = (b'<a href="https://www.fao.org/media/docs/marketsandtradelibraries/default-document-library/'
                b'fao-meat-price-indices_oct-26.xlsx?sfvrsn=c22f6719_1">Excel</a>')
        self.assertEqual(fao_carne.link_xlsx(html), URL)

    def test_sin_link_rompe(self) -> None:
        with self.assertRaises(FormatoCambiado):
            fao_carne.link_xlsx(b"<html>sin enlaces</html>")


if __name__ == "__main__":
    unittest.main()
