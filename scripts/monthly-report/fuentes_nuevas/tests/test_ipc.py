"""Tests del IPC (INDEC nacional + empalme San Luis / IPC-GBA). Sin red."""

import json
import unittest
from pathlib import Path

from fuentes_nuevas._base import FormatoCambiado
from fuentes_nuevas import ipc

FIX = Path(__file__).resolve().parent / "fixtures" / "ipc"
CSV = (FIX / "serie_ipc_divisiones_recorte.csv").read_bytes()
TRAMOS = (FIX / "api_tramos_2015_2016.json").read_bytes()


def _nacional():
    return ipc.parsear(CSV, ipc.URL_INDEC_CSV, "2026-11-02")


class TestIPCNacional(unittest.TestCase):
    def test_valores_conocidos(self):
        s = _nacional()
        self.assertEqual(s.id, "ipc-nacional")
        p = {x["periodo"]: x for x in s.puntos}
        self.assertEqual(s.puntos[0]["periodo"], "2016-12")
        self.assertEqual(p["2016-12"]["indice"], 100.0)
        self.assertNotIn("var_mensual_pct", p["2016-12"])  # INDEC publica NA
        self.assertAlmostEqual(p["2017-01"]["indice"], 101.5859)
        self.assertEqual(p["2017-01"]["var_mensual_pct"], 1.6)
        self.assertEqual(s.procedencia.fecha_dato, "2018-12")
        self.assertEqual(len(s), 25)  # solo Nacional + nivel general: ignora GBA y la división 01

    def test_encabezado_cambiado(self):
        malo = CSV.replace(b"Indice_IPC", b"Indice", 1)
        with self.assertRaises(FormatoCambiado):
            ipc.parsear(malo, ipc.URL_INDEC_CSV, "2026-11-02")

    def test_hueco_en_la_serie(self):
        lineas = CSV.split(b"\r\n")
        sin_mes = b"\r\n".join(l for l in lineas if b";201706;" not in l or b";Nacional" not in l
                               or not l.startswith(b"0;"))
        with self.assertRaises(FormatoCambiado):
            ipc.parsear(sin_mes, ipc.URL_INDEC_CSV, "2026-11-02")

    def test_variacion_que_no_cierra(self):
        malo = CSV.replace(b";201701;101,5859;1,6;", b";201701;101,5859;9,6;")
        with self.assertRaises(FormatoCambiado):
            ipc.parsear(malo, ipc.URL_INDEC_CSV, "2026-11-02")

    def test_api_columnas_distintas(self):
        with self.assertRaises(FormatoCambiado):
            ipc.parsear(TRAMOS, ipc.URL_API_NACIONAL, "2026-11-02")


class TestEmpalme(unittest.TestCase):
    def setUp(self):
        self.tramos = ipc.parsear_tramos(TRAMOS, desde="2015-10")
        self.emp = ipc.empalmar(_nacional(), self.tramos, ipc.URL_API_TRAMOS, "2026-11-02")
        self.p = {x["periodo"]: x for x in self.emp.puntos}

    def test_tramos_y_marcas(self):
        self.assertEqual(self.emp.id, "ipc-empalmado-2006")
        self.assertEqual(self.emp.puntos[0]["periodo"], "2015-10")
        self.assertTrue(self.p["2016-03"]["empalmada"])
        self.assertEqual(self.p["2016-03"]["serie_id"], ipc.SERIE_SAN_LUIS)
        self.assertEqual(self.p["2016-04"]["serie_id"], ipc.SERIE_GBA_2016)
        self.assertTrue(self.p["2016-11"]["empalmada"])
        self.assertFalse(self.p["2016-12"]["empalmada"])
        self.assertEqual(self.p["2016-12"]["indice"], 100.0)

    def test_retropolacion_respeta_variaciones(self):
        # tramo GBA: base dic-2016 = 100 igual que la nacional → factor 1
        self.assertAlmostEqual(self.p["2016-04"]["indice"], 85.5254)
        self.assertEqual(self.p["2016-04"]["indice_original"], 85.5254)
        # tramo San Luis: dic-2015 +6,5% (el "IPC alternativo" que difundió INDEC) se conserva
        var = self.p["2015-12"]["indice"] / self.p["2015-11"]["indice"] - 1
        self.assertAlmostEqual(var, 1027.54 / 964.96 - 1, places=12)
        self.assertAlmostEqual(self.p["2016-03"]["indice"], 85.5254 * 1132.39 / 1170.83, places=9)
        self.assertEqual(self.p["2016-03"]["indice_original"], 1132.39)

    def test_tramos_formato_cambiado(self):
        d = json.loads(TRAMOS)
        d["meta"][1]["field"]["id"] = "otra_serie"
        with self.assertRaises(FormatoCambiado):
            ipc.parsear_tramos(json.dumps(d).encode(), desde="2015-10")
        with self.assertRaises(FormatoCambiado):
            ipc.parsear_tramos(b"<html>mantenimiento</html>", desde="2015-10")


class TestDeflactar(unittest.TestCase):
    def test_mes_faltante_no_se_estima(self):
        s = _nacional()
        precios = [{"periodo": "2016-11", "valor": 30.0},   # sin IPC nacional
                   {"periodo": "2017-01", "valor": 40.0},
                   {"periodo": "2017-02", "valor": None},   # sin precio
                   {"periodo": "2018-12", "valor": 60.0},
                   {"periodo": "2019-01", "valor": 61.0}]   # fuera del IPC del fixture
        r = ipc.deflactar(precios, s, base="2018-12")
        self.assertEqual([x["periodo"] for x in r], ["2017-01", "2018-12"])
        ipc_dic18 = next(p["indice"] for p in s.puntos if p["periodo"] == "2018-12")
        self.assertAlmostEqual(r[0]["valor"], 40.0 * ipc_dic18 / 101.5859)
        self.assertEqual(r[0]["valor_nominal"], 40.0)
        self.assertEqual(r[1]["valor"], 60.0)
        self.assertFalse(r[0]["ipc_empalmado"])

    def test_base_sin_ipc(self):
        with self.assertRaises(ValueError):
            ipc.deflactar([{"periodo": "2017-01", "valor": 1.0}], _nacional(), base="2030-01")

    def test_marca_empalme(self):
        emp = ipc.empalmar(_nacional(), ipc.parsear_tramos(TRAMOS, desde="2015-10"),
                           ipc.URL_API_TRAMOS, "2026-11-02")
        r = ipc.deflactar([{"periodo": "2016-01", "valor": 20.0}, {"periodo": "2017-01", "valor": 40.0}],
                          emp, base="2016-12")
        self.assertTrue(r[0]["ipc_empalmado"])
        self.assertFalse(r[1]["ipc_empalmado"])


if __name__ == "__main__":
    unittest.main()
