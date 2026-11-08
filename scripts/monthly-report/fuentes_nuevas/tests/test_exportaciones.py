"""
Tests de exportaciones de carne bovina (INDEC, base usuario NCM × país).

Fixtures: recortes de los ZIP reales `exports_2026_M.zip` y `exports_2017_M.zip`
bajados el 2026-11-02 — meses 01 y 02, TODAS las filas 02.01/02.02, las filas
99999999/99980400 y 15 filas de otras NCM por mes. El `etot*.csv` de control se
recalculó sobre el recorte (por eso cierra). Los valores de carne coinciden con
los del archivo completo.
"""

import io
import unittest
import zipfile
from pathlib import Path

from fuentes_nuevas import exportaciones as E
from fuentes_nuevas import exportaciones_destinos as D
from fuentes_nuevas._base import FormatoCambiado

FIX = Path(__file__).parent / "fixtures" / "exportaciones"
URL26 = "https://comex.indec.gob.ar/files/zips/exports_2026_M.zip"
URL17 = "https://comex.indec.gob.ar/files/zips/exports_2017_M.zip"
OBS = "2026-11-02"


def _zip(nombre: str) -> bytes:
    return (FIX / nombre).read_bytes()


def _reescribir(contenido: bytes, transformar=None, control=None, sacar=None) -> bytes:
    """Copia el ZIP aplicando `transformar(lineas)->lineas` al CSV base y
    `control(lineas)->lineas` al etot. Si `control` es None, recalcula los totales."""
    z = zipfile.ZipFile(io.BytesIO(contenido))
    nombres = z.namelist()
    base = next(n for n in nombres if n.lower().startswith("expo"))
    ctl = next(n for n in nombres if n.lower().startswith("etot"))
    lineas = z.read(base).decode("latin-1").splitlines()
    if transformar:
        lineas = transformar(lineas)
    lc = z.read(ctl).decode("latin-1").splitlines()
    if control:
        lc = control(lc)
    else:
        kg = usd = 0.0
        for l in lineas[1:]:
            p = [c.strip() for c in l.split(";")]
            if p[4].lower().startswith("s") or p[5].lower().startswith("s"):
                continue
            kg += float(p[4].replace(",", ".") or 0)
            usd += float(p[5].replace(",", ".") or 0)
        c = lc[1].split(";")
        c[4], c[5] = f"{kg:.3f}".replace(".", ","), f"{usd:.2f}".replace(".", ",")
        lc[1] = ";".join(c)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as w:
        if sacar != base:
            w.writestr(base, "\r\n".join(lineas).encode("latin-1"))
        if sacar != ctl:
            w.writestr(ctl, "\r\n".join(lc).encode("latin-1"))
    return buf.getvalue()


class TestTotales(unittest.TestCase):
    def test_valores_conocidos_2026(self):
        s = E.parsear(_zip("exports_2026_M_recorte.zip"), URL26, OBS)
        self.assertEqual(s.id, "exportaciones-carne-bovina")
        self.assertEqual([p["periodo"] for p in s.puntos], ["2026-01", "2026-02"])
        ene = s.puntos[0]
        self.assertAlmostEqual(ene["toneladas_peso_producto"], 53192.841, places=3)
        self.assertAlmostEqual(ene["fob_musd"], 338.635429, places=6)
        self.assertAlmostEqual(ene["usd_por_t"], 6366.18, places=2)
        self.assertAlmostEqual(ene["toneladas_enfriada"], 9340.631, places=3)
        self.assertAlmostEqual(ene["toneladas_congelada"], 43852.209, places=3)
        self.assertAlmostEqual(ene["toneladas_congelada_con_hueso"], 13433.009, places=3)
        self.assertAlmostEqual(s.puntos[1]["fob_musd"], 312.843594, places=6)
        # enfriada + congelada = total
        for p in s.puntos:
            self.assertAlmostEqual(p["toneladas_enfriada"] + p["toneladas_congelada"],
                                   p["toneladas_peso_producto"], places=2)
        self.assertEqual(s.procedencia.fecha_dato, "2026-02")
        self.assertEqual(s.procedencia.url, URL26)
        self.assertIn("CC BY-SA 4.0", s.procedencia.licencia)
        self.assertIn("118 filas", s.procedencia.nota)  # filas "s" de carne, no sumadas

    def test_formato_viejo_2017(self):
        """expomAA.csv, campos con espacios, FOB(u$s), sin secreto estadístico."""
        s = E.parsear(_zip("exports_2017_M_recorte.zip"), URL17, OBS)
        self.assertAlmostEqual(s.puntos[0]["toneladas_peso_producto"], 15788.776, places=3)
        self.assertAlmostEqual(s.puntos[0]["fob_musd"], 97.483625, places=6)
        self.assertAlmostEqual(s.puntos[1]["usd_por_t"], 6034.38, places=2)

    def test_combinar_y_huecos(self):
        a = E.parsear(_zip("exports_2017_M_recorte.zip"), URL17, OBS)
        b = E.parsear(_zip("exports_2026_M_recorte.zip"), URL26, OBS)
        with self.assertRaises(FormatoCambiado):          # 2017-02 → 2026-01: hueco
            E.combinar([a, b], URL26, OBS, "n")
        with self.assertRaises(FormatoCambiado):          # período repetido
            E.combinar([b, b], URL26, OBS, "n")
        c = E.combinar([b], URL26, OBS, "n")
        self.assertEqual(len(c), 2)


class TestDestinos(unittest.TestCase):
    def test_valores_conocidos_y_cierre(self):
        s = D.parsear(_zip("exports_2026_M_recorte.zip"), URL26, OBS)
        self.assertEqual(s.id, "exportaciones-carne-bovina-destinos")
        ene = s.puntos[0]
        self.assertAlmostEqual(ene["toneladas_china"], 30547.605, places=3)
        self.assertAlmostEqual(ene["toneladas_israel"], 6532.936, places=3)
        self.assertAlmostEqual(ene["toneladas_estados_unidos"], 8157.687, places=3)
        self.assertAlmostEqual(ene["toneladas_ue27"], 3881.272, places=3)
        self.assertAlmostEqual(ene["toneladas_confidencial"], 1943.649, places=3)
        self.assertAlmostEqual(ene["toneladas_alemania"], 2055.586, places=3)
        disjuntos = [g for g, _, _ in D.GRUPOS] + ["resto"]
        for p in s.puntos:
            for u in ("toneladas", "fob_musd"):
                self.assertAlmostEqual(sum(p[f"{u}_{g}"] for g in disjuntos), p[f"{u}_total"], places=2)
        # el total de destinos es el mismo número que la serie de totales
        t = E.parsear(_zip("exports_2026_M_recorte.zip"), URL26, OBS)
        self.assertEqual(ene["toneladas_total"], t.puntos[0]["toneladas_peso_producto"])

    def test_2017_sin_confidencial(self):
        s = D.parsear(_zip("exports_2017_M_recorte.zip"), URL17, OBS)
        self.assertEqual(s.puntos[0]["toneladas_confidencial"], 0.0)
        self.assertAlmostEqual(s.puntos[0]["toneladas_china"], 6633.363, places=3)


class TestFormatoCambiado(unittest.TestCase):
    def setUp(self):
        self.ok = _zip("exports_2026_M_recorte.zip")

    def _rompe(self, contenido):
        for mod in (E, D):
            with self.assertRaises(FormatoCambiado):
                mod.parsear(contenido, URL26, OBS)

    def test_no_es_zip(self):
        self._rompe(b"<html>mantenimiento</html>")

    def test_falta_control(self):
        self._rompe(_reescribir(self.ok, sacar="etotnm26.csv"))

    def test_encabezado_cambiado(self):
        def f(l):
            return ["Anio;Mes;NCM;Pais;Peso;FOB(USD)"] + l[1:]
        self._rompe(_reescribir(self.ok, f))

    def test_columna_faltante(self):
        def f(l):
            return [l[0]] + [";".join(x.split(";")[:5]) for x in l[1:]]
        self._rompe(_reescribir(self.ok, f, control=lambda c: c))

    def test_control_no_cierra(self):
        """Si las filas 's' pasaran a ser sumables (o se agregaran filas), el control no cierra."""
        def ctl(c):
            p = c[1].split(";")
            p[4] = "1,000"
            return [c[0], ";".join(p)]
        self._rompe(_reescribir(self.ok, control=ctl))

    def test_unidad_corrida(self):
        """kg informados en gramos (×1000): fuera de rango aunque el control cierre."""
        def f(l):
            out = [l[0]]
            for x in l[1:]:
                p = x.split(";")
                if p[2].startswith(("0201", "0202")) and not p[4].startswith("s"):
                    p[4] = f"{float(p[4].replace(',', '.')) * 1000:.3f}".replace(".", ",")
                out.append(";".join(p))
            return out
        with self.assertRaises(FormatoCambiado):
            E.parsear(_reescribir(self.ok, f), URL26, OBS)

    def test_mes_sin_carne(self):
        """Un mes sin ninguna fila 02.01/02.02 (NCM enmascarada) se rompe, no queda en cero."""
        def f(l):
            return [l[0]] + [x for x in l[1:] if not (x.startswith("2026;02;020"))]
        self._rompe(_reescribir(self.ok, f))

    def test_meses_salteados(self):
        def f(l):
            return [l[0]] + [x.replace("2026;02;", "2026;03;", 1) for x in l[1:]]
        with self.assertRaises(FormatoCambiado):
            E.parsear(_reescribir(self.ok, f), URL26, OBS)

    def test_numero_ilegible(self):
        def f(l):
            out = [l[0]]
            for x in l[1:]:
                p = x.split(";")
                if p[2] == "02023000" and not p[4].startswith("s"):
                    p[4] = "12.345,6.7"
                out.append(";".join(p))
            return out
        self._rompe(_reescribir(self.ok, f, control=lambda c: c))


if __name__ == "__main__":
    unittest.main()
