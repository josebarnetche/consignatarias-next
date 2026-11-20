"""
La Banda con una sola fecha de corte (`datos_v2.hasta_corte`). Las tablas leen
vr-bandas.json y los paneles vr_bandas_history: si la historia sigue después del
corte del JSON, la misma página da dos medianas y dos amplitudes distintas.
"""

import unittest
from datetime import date, timedelta

import datos as D
import datos_v2 as V


def _serie(cat: str, desde: str, dias: int, amplitud: float = 30.0) -> dict:
    d0 = date.fromisoformat(desde)
    return {"categoria": cat, "puntos": [
        {"fecha": (d0 + timedelta(days=i)).isoformat(), "amplitud": amplitud + i / 10, "mediana": 4000 + i}
        for i in range(dias)]}


class HastaCorte(unittest.TestCase):
    def test_recorta_y_mueve_la_fecha(self):
        s = D.Serie([_serie("NOVILLO", "2026-10-01", 45)], "VR", "2026-11-14", propia=True)
        r = V.hasta_corte(s, "2026-11-10")
        self.assertEqual(r.puntos[0]["puntos"][-1]["fecha"], "2026-11-10")
        self.assertEqual(r.fecha_dato, "2026-11-10")
        self.assertTrue(r.propia)
        self.assertEqual(len(s.puntos[0]["puntos"]), 45, "no toca la serie original")

    def test_cae_la_categoria_con_menos_de_10_puntos(self):
        s = D.Serie([_serie("NOVILLO", "2026-10-01", 45), _serie("MEJ", "2026-11-05", 10)], "VR", "2026-11-14")
        r = V.hasta_corte(s, "2026-11-10")
        self.assertEqual([x["categoria"] for x in r.puntos], ["NOVILLO"])

    def test_el_previo_de_amplitud_contra_cuenta_desde_el_corte(self):
        amp = V.hasta_corte(D.Serie([_serie("NOVILLO", "2026-09-01", 75)], "VR", None), "2026-11-10")
        bandas = D.Serie([{"categoria": "NOVILLO", "amplitud_pct": 30.0}], "VR", "2026-11-10")
        p = type("P", (), {"amplitud": amp, "bandas": bandas})()
        _, _, fecha_previa = V.amplitud_contra(p, "NOVILLO", 28)
        self.assertEqual(fecha_previa, "2026-10-13")


if __name__ == "__main__":
    unittest.main()
