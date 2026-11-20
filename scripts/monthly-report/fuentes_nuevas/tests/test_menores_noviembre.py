"""
Tres detalles del ensayo de noviembre 2026: el anexo decía «noviembre completo»
con el PDF bajado el 16/11 (datos al 13/11), y el gráfico de remates por
provincia graficaba «Sin dato 3» como si fuera una provincia.
"""

import unittest

import datos as D
import informe_v2 as I2

NOV = D.Mes.de("2026-11")
TITULO = "PRECIOS POR CATEGORIA RESOL-2018-32-APN-SGA#MPYT DESDE EL DOMINGO 01/11/2026 AL LUNES 30/11/2026"
RUEDAS = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-13"]


def _paquete(fecha_dato: str | None, ruedas: list[str] = RUEDAS, mes: D.Mes = NOV):
    sub = D.Serie([{"nombre": "NOVILLITOS", "cabezas": 4131, "kg_promedio": 358, "minimo": 3200,
                     "mediana": 4700, "promedio": 4649, "maximo": 5200}], "MAG", fecha_dato)
    return type("P", (), {"mes": mes, "subcategorias": sub, "ruedas_mes": [{"fecha": f} for f in ruedas]})()


class CorteCategorias(unittest.TestCase):
    def test_bajado_a_mitad_de_mes_el_corte_es_la_bajada_no_el_titulo(self):
        a = {"period_headline": TITULO, "fetched_at": "2026-11-16"}
        self.assertEqual(D.corte_categorias(a, NOV), "2026-11-16")

    def test_bajado_despues_del_cierre_es_el_fin_de_mes(self):
        a = {"period_headline": TITULO, "fetched_at": "2026-12-01"}
        self.assertEqual(D.corte_categorias(a, NOV), "2026-11-30")

    def test_sin_bajada_manda_el_titulo(self):
        a = {"period_headline": "DESDE EL MIï¿½RCOLES 01/07/2026 AL MIï¿½RCOLES 15/07/2026"}
        self.assertEqual(D.corte_categorias(a, D.Mes.de("2026-07")), "2026-07-15")


class PeriodoAnexo(unittest.TestCase):
    def test_noviembre_al_13(self):
        self.assertEqual(I2.periodo_anexo(_paquete("2026-11-16")), ("noviembre al 13/11", False))

    def test_mes_cerrado_es_completo(self):
        self.assertEqual(I2.periodo_anexo(_paquete("2026-11-30")), ("noviembre completo", True))

    def test_corte_en_el_ultimo_habil_es_completo(self):
        # octubre 2026 termina sábado: el viernes 30 es el último hábil
        p = _paquete("2026-10-30", ["2026-10-29", "2026-10-30"], D.Mes.de("2026-10"))
        self.assertEqual(I2.periodo_anexo(p), ("octubre completo", True))

    def test_sin_fecha_se_toma_el_mes_entero(self):
        self.assertEqual(I2.periodo_anexo(_paquete(None)), ("noviembre completo", True))

    def test_el_titulo_del_anexo_lleva_el_corte(self):
        html = I2.p_anexo(_paquete("2026-11-16"), None)
        self.assertIn("noviembre al 13/11</h2>", html)
        self.assertNotIn("completo</h2>", html)
        self.assertIn("acumulado de noviembre al 13/11", html)


class ProvinciasRemates(unittest.TestCase):
    RM = {"por_provincia": [("BUENOS AIRES", 114), ("SANTA FE", 27), ("SIN DATO", 3), ("CHACO", 4)]}

    def test_sin_dato_no_es_una_provincia(self):
        con, sin = I2.provincias_remates(self.RM)
        self.assertEqual([k for k, _ in con], ["BUENOS AIRES", "SANTA FE", "CHACO"])
        self.assertEqual(sin, 3)

    def test_la_pagina_lo_dice_al_pie_y_no_lo_grafica(self):
        rm = dict(self.RM, total=148, jornadas=20, firmas=30, cabezas_anunciadas=1000, con_cabezas=10,
                  por_tipo=[("invernada", 100)], fuente="Calendario propio")
        p = type("P", (), {"mes": NOV, "remates": {}})()
        x = type("X", (), {"remates_mes": rm})()
        html = I2.p_remates(p, x)
        self.assertNotIn(">Sin dato<", html)
        self.assertIn("3 sin dato de provincia: no se grafican.", html)
        self.assertIn("; 114 en Buenos Aires</h2>", html)


if __name__ == "__main__":
    unittest.main()
