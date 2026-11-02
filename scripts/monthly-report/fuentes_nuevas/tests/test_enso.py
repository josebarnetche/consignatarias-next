"""Tests del parser ENSO (ONI/RONI del CPC). Fixtures: recortes textuales de los archivos del 02-11-2026."""

import unittest
from pathlib import Path

from fuentes_nuevas import enso
from fuentes_nuevas._base import FormatoCambiado

FIX = Path(__file__).resolve().parent / "fixtures" / "enso"
ONI_97 = (FIX / "oni-1997.txt").read_bytes()
ONI_REC = (FIX / "oni-reciente.txt").read_bytes()
RONI_REC = (FIX / "roni-reciente.txt").read_bytes()


def _por_periodo(serie):
    return {p["periodo"]: p for p in serie.puntos}


class TestONI(unittest.TestCase):
    def test_valores_y_mes_central(self):
        s = enso.parsear(ONI_97, enso.URL_ONI, "2026-11-02")
        p = _por_periodo(s)
        self.assertEqual(p["1997-01"]["temporada"], "DJF")
        self.assertEqual(p["1997-01"]["oni"], -0.41)
        # NDJ 1997 = nov-97/ene-98 → mes central diciembre de 1997
        self.assertEqual(p["1997-12"]["temporada"], "NDJ")
        self.assertEqual(p["1997-12"]["oni"], 2.37)
        self.assertEqual(p["1998-01"]["temporada"], "DJF")
        self.assertIsNone(p["1997-12"]["roni"])
        self.assertEqual(p["1997-12"]["indice_fase"], "ONI")

    def test_episodio_nino_1997_confirmado(self):
        p = _por_periodo(enso.parsear(ONI_97, enso.URL_ONI, "2026-11-02"))
        self.assertEqual(p["1997-04"]["fase"], "Neutral")      # MAM 0,30
        self.assertEqual(p["1997-05"]["fase"], "Niño")         # AMJ 0,71
        self.assertEqual(p["1997-05"]["episodio"], "Niño")
        self.assertEqual(p["1997-12"]["episodio"], "Niño")

    def test_procedencia(self):
        s = enso.parsear(ONI_REC, enso.URL_ONI, "2026-11-02")
        self.assertEqual(s.id, "enso-oni")
        self.assertEqual(s.procedencia.fecha_dato, "2026-08")   # JAS 2026
        self.assertEqual(s.procedencia.fecha_observacion, "2026-11-02")
        self.assertIn("Dominio público", s.procedencia.licencia)
        self.assertEqual(len(s), 32)


class TestRONI(unittest.TestCase):
    def setUp(self):
        self.s = enso.parsear(ONI_REC, enso.URL_ONI, "2026-11-02",
                              contenido_roni=RONI_REC, url_roni=enso.URL_RONI)
        self.p = _por_periodo(self.s)

    def test_valores_conocidos(self):
        self.assertEqual(self.p["2026-08"]["oni"], 2.16)
        self.assertEqual(self.p["2026-08"]["roni"], 1.69)
        self.assertEqual(self.p["2026-08"]["indice_fase"], "RONI")

    def test_nina_2025_26_con_roni_y_no_con_oni(self):
        # Con RONI (oficial desde feb-2026) 2025-26 fue La Niña: JAS-25…JFM-26, 7 trimestres ≤ −0,5
        self.assertEqual(self.p["2025-11"]["episodio"], "Niña")
        self.assertEqual(self.p["2026-02"]["episodio"], "Niña")
        self.assertEqual(self.p["2026-03"]["episodio"], "Neutral")  # FMA −0,44
        # Con ONI, solo 3 trimestres ≤ −0,5 (SON/OND/NDJ 2025) → neutral
        solo_oni = _por_periodo(enso.parsear(ONI_REC, enso.URL_ONI, "2026-11-02"))
        self.assertEqual(solo_oni["2025-11"]["fase"], "Niña")
        self.assertEqual(solo_oni["2025-11"]["episodio"], "Neutral")

    def test_umbral_inclusivo(self):
        self.assertEqual(self.p["2025-04"]["roni"], -0.50)  # MAM 2025
        self.assertEqual(self.p["2025-04"]["fase"], "Niña")
        self.assertEqual(self.p["2025-04"]["episodio"], "Niña")

    def test_nino_2026_pendiente(self):
        # RONI ≥ 0,5 desde MJJ 2026: 3 trimestres al final de la serie → no decidible
        self.assertEqual(self.p["2026-05"]["fase"], "Neutral")  # AMJ 0,49
        for per in ("2026-06", "2026-07", "2026-08"):
            self.assertEqual(self.p[per]["fase"], "Niño")
            self.assertEqual(self.p[per]["episodio"], "pendiente")

    def test_racha_inicial_truncada_es_pendiente(self):
        # El archivo empieza en DJF 2024 en pleno Niño 2023-24: 2 trimestres, viene de antes
        self.assertEqual(self.p["2024-01"]["episodio"], "pendiente")


class TestEpisodios(unittest.TestCase):
    def test_faltante_corta_y_no_se_estima(self):
        v = [0.0, 0.6, 0.7, None, 0.8, 0.9, 0.0]
        self.assertEqual(enso.episodios(v),
                         ["Neutral", "pendiente", "pendiente", None, "pendiente", "pendiente", "Neutral"])

    def test_racha_corta_interior_es_neutral(self):
        v = [0.0, 0.6, 0.7, 0.8, 0.9, 0.0]
        self.assertEqual(enso.episodios(v)[1:5], ["Neutral"] * 4)


class TestFormatoCambiado(unittest.TestCase):
    def test_encabezado(self):
        malo = ONI_REC.replace(b"TOTAL", b"TOT", 1)
        with self.assertRaises(FormatoCambiado):
            enso.parsear(malo, enso.URL_ONI, "2026-11-02")

    def test_roni_con_encabezado_de_oni(self):
        with self.assertRaises(FormatoCambiado):
            enso.parsear(ONI_REC, enso.URL_ONI, "2026-11-02", contenido_roni=ONI_REC)

    def test_salto_de_temporada(self):
        lineas = ONI_REC.decode().splitlines()
        del lineas[5]
        with self.assertRaises(FormatoCambiado):
            enso.parsear("\n".join(lineas).encode(), enso.URL_ONI, "2026-11-02")

    def test_anomalia_implausible(self):
        malo = ONI_REC.replace(b"29.12   2.16", b"29.12  12.16")
        with self.assertRaises(FormatoCambiado):
            enso.parsear(malo, enso.URL_ONI, "2026-11-02")

    def test_temporada_desconocida(self):
        malo = ONI_REC.replace(b"JAS 2026", b"XYZ 2026")
        with self.assertRaises(FormatoCambiado):
            enso.parsear(malo, enso.URL_ONI, "2026-11-02")

    def test_html_en_vez_de_texto(self):
        with self.assertRaises(FormatoCambiado):
            enso.parsear(b"<html><body>Service unavailable</body></html>", enso.URL_ONI, "2026-11-02")


if __name__ == "__main__":
    unittest.main()
