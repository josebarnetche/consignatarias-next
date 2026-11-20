#!/usr/bin/env python3
"""
El Corredor v2 — armado del informe.

Lo arman `informe.py` y `publish.py`; con `--v1` sale el informe viejo, byte por
byte igual que antes. Este archivo no toca nada del v1; reusa sus utilidades (`esc`, `ficha`, `delta`, `hoja`,
`fuentes_embebidas` y los remates del mes que viene).

DESDE NOVIEMBRE DE 2026 ES EL INFORME POR DEFECTO (el v1 queda detrás de --v1).

QUÉ CAMBIA CONTRA EL V1
· Más historia: el novillito desde 2006, la estacionalidad (espagueti y mapa de
  calor) y la banda de cada categoría en el tiempo.
· Comparación fija: un semáforo con 1 semana, 4 semanas, interanual y contra el
  promedio de 5 años en dólares, con los años de cambio unificado (2016–2019 y
  2025): con brecha, el mismo kilo valía dos cifras en dólares.
· La Banda Consignatarias (amplitud = P90/P10 − 1) va primero y se compara
  siempre contra cuatro semanas antes.
· Cada gráfico lleva su fuente al pie con la forma "Fuente: X; cálculo propio",
  para que sirva suelto cuando alguien lo recorta y lo manda.
· Títulos que dicen el hecho del mes, no la conclusión.

LA REGLA DEL V1 SIGUE: un placeholder faltante rompe. La plantilla se llena con
`Template.substitute` y el contexto tiene que coincidir exacto con lo que pide.
Y la otra regla: si un dato falta, la página no va. No hay página de relleno.
"""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path
from string import Template

import datos as D
import datos_v2 as D2
import graficos as G
import graficos_v2 as G2
import informe as I

AQUI = Path(__file__).resolve().parent

URL_INFORME = "https://www.consignatarias.com.ar/el-corredor"
URL_LICENCIA = "https://www.consignatarias.com.ar/licencia-datos"
#: La herramienta de valuación del sitio (src/app/(terminal)/valuar-hacienda, indexable).
URL_VALUAR = "https://www.consignatarias.com.ar/valuar-hacienda"


# ─── utilidades ────────────────────────────────────────────────────────────────

BANDA = "Banda Consignatarias"
DEF_BANDA = "amplitud = P90/P10 − 1"


def cita(p: D.Paquete) -> str:
    """La línea de cita, la misma en el PDF y en cada pieza para redes."""
    return (f"El Corredor, {p.mes.etiqueta} — consignatarias.com.ar, el mercado ganadero "
            f"argentino, medido. consignatarias.com.ar/el-corredor")


def cita_banda() -> str:
    """Cómo se cita el número propio. Va debajo de la cita del informe."""
    return f"La amplitud de precio se cita como «{BANDA} (consignatarias.com.ar)»."


def fecha_ar(iso: str | None) -> str:
    """'2026-10-30' → '30/10/2026'."""
    return D2.fecha_ddmmaaaa(iso) if iso else "sin dato"


def ym_ar(ym: str) -> str:
    """'2026-07' → '07/2026'."""
    return f"{ym[5:7]}/{ym[:4]}"


def ym_largo(ym: str) -> str:
    """'2026-07' → 'julio de 2026'."""
    return f"{D.MESES[int(ym[5:7])]} de {ym[:4]}"


def pie(fuente: str, propio: bool = True, fecha: str | None = None, nota: str = "", dato: str = "") -> str:
    """
    El pie de cada figura. Va con la forma "Fuente: X; cálculo propio" porque es lo
    que sobrevive al recorte: el gráfico suelto, mandado por WhatsApp, se sigue
    pudiendo citar. `dato` es para las series mensuales o anuales de afuera, que no
    tienen día: "Dato a septiembre de 2026".
    """
    clase = "propio" if propio else "externo"
    calc = "; cálculo propio" if propio else ""
    f = f" Dato al {fecha_ar(fecha)}." if fecha else (f" Dato a {dato}." if dato else "")
    n = f" {I.esc(nota)}" if nota else ""
    return (f'<figcaption class="{clase}"><span class="marca-dato"></span>'
            f'Fuente: {I.esc(fuente)}{calc}.{f}{n} · consignatarias.com.ar</figcaption>')


def _signo(v: float, suf: str = "%", dec: int = 1) -> str:
    """Signo y número, sin flecha: con las dos cosas el dato se leía dos veces."""
    if round(v, dec) == 0:
        return f"{0:.{dec}f}".replace(".", ",") + suf
    return f"{v:+.{dec}f}".replace(".", ",") + suf


def flecha(v: float | None, suf: str = "%", color: bool = True, dec: int = 1) -> str:
    """Variación con signo. Sin color cuando el signo no tiene una lectura obvia."""
    if v is None:
        return '<span class="delta neutro">sin comparable</span>'
    clase = "neutro" if not color or v == 0 else ("sube" if v > 0 else "baja")
    return f'<span class="delta {clase}">{_signo(v, suf, dec)}</span>'


def _celda(v: float | None, color: bool) -> str:
    """Una celda del semáforo: verde o rojo SOLO si la fila tiene lectura de signo clara."""
    if v is None:
        return '<td class="num sd">—</td>'
    clase = ""
    if color and abs(v) >= 0.5:
        clase = " s-sube" if v > 0 else " s-baja"
    return f'<td class="num{clase}">{_signo(v)}</td>'


def _valor(fila: dict) -> str:
    if fila["unidad"] == "cabezas":
        return _miles(fila["ultimo"])
    if fila["unidad"] == "kg":
        return _miles(fila["ultimo"])
    return G.usd(fila["ultimo"]) if fila["unidad"].startswith("USD") else G.ars(fila["ultimo"])


def _d(v: float) -> str:
    """Un decimal con coma, como se escribe en Argentina."""
    return f"{v:.1f}".replace(".", ",")


def _pp(v: float) -> str:
    return f"{v:+.1f}".replace(".", ",") + " pp"


def _miles(n: float) -> str:
    return f"{round(n):,}".replace(",", ".")


def _verbo(v: float, sube: str = "subió", baja: str = "bajó") -> str:
    """"subió 26,8%" / "bajó 1,1%": el verbo lleva el signo, el número va sin él."""
    return f'{sube if v >= 0 else baja} {_d(abs(v))}%'


def _mediana(vals: list[float]) -> float:
    v = sorted(vals)
    n = len(v)
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2


def _dm(iso: str) -> str:
    d = date.fromisoformat(iso[:10])
    return f"{d.day}/{d.month}"


def _y(fechas: list[str]) -> str:
    f = [_dm(x) for x in fechas]
    return f[0] if len(f) == 1 else ", ".join(f[:-1]) + " y " + f[-1]


def ruedas_texto(p: D.Paquete, x: D2.Extra) -> str:
    """
    "13 ruedas; el MAG no publicó Índice Novillo en 2 (9/10 y 23/10, de bajo
    volumen)". Si a una rueda le falta la fila en la base (y no sabemos si el MAG
    publicó), el texto no lo explica: dice cuántas tienen índice y la corrida avisa.
    """
    ru = x.ruedas or {}
    con = len(p.ruedas_mes)
    if not ru:
        return f"{con} ruedas con Índice Novillo"
    n = len(ru["ruedas"])
    if n == con:
        return f"{n} ruedas"
    if ru["sin_fila"]:
        return f"{n} ruedas; Índice Novillo publicado en {con}"
    sin = ru["sin_indice_mag"]
    bajo = ", de bajo volumen" if ru.get("bajo_volumen") else ""
    return f"{n} ruedas; el MAG no publicó Índice Novillo en {len(sin)} ({_y(sin)}{bajo})"


def n_ruedas(p: D.Paquete, x: D2.Extra) -> int:
    return len((x.ruedas or {}).get("ruedas") or p.ruedas_mes)


def _base5(p: D.Paquete) -> list[int]:
    return D2.anios_base(p.mes.anio)


def ausencias(p: D.Paquete, x: D2.Extra) -> list[str]:
    """Lo que esta edición no midió, en palabras: la misma lista en la pág. 2, la 13 y el manifest."""
    nombres = {"SIO Carnes": "SIO Carnes (lo que se pagó por el novillo fuera de Cañuelas, por zona): sin dato del mes"}
    out = [nombres.get(f, f) for f in p.faltantes]
    return out + [f for f in x.faltantes if f not in out]


# ─── datos de una sola vez (para el PDF y las piezas) ──────────────────────────

def _eeuu(x: D2.Extra) -> dict | None:
    return next((q for q in x.internacional.get("paises") or [] if q["pais"] == "Estados Unidos"), None)


def cuatro_numeros(p: D.Paquete, x: D2.Extra) -> list[dict]:
    """
    Los 4 números del mes, los mismos en la tapa y en las piezas. Si uno no tiene
    dato, no se dibuja: la tapa queda con tres antes que con un número inventado.
    """
    out = []
    anterior = D.MESES[(p.mes.mes - 2) % 12 + 1]
    if p.promedio_usd:
        out.append({"et": "Novillo en dólares", "val": G.usd(p.promedio_usd),
                    "delta": flecha(p.variacion("usd_blue", 1)),
                    "nota": f"promedio de {p.mes.nombre} al blue · vs {anterior}"})
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        prev = p.liquidacion.puntos[-2] if len(p.liquidacion.puntos) > 1 else None
        out.append({"et": "Hembras operadas", "val": f'{_d(u["pct"])}%',
                    "delta": flecha(round(u["pct"] - prev["pct"], 1) if prev else None, " pp", color=False),
                    "nota": f'{ym_largo(u["ym"])} · Cañuelas · vs mes anterior'})
    act, prev, _ = D2.amplitud_contra(p, "NOVILLO")
    if act is not None:
        out.append({"et": f"{BANDA} · novillo", "val": f"{_d(act)}%",
                    "delta": flecha(round(act - prev, 1) if prev is not None else None, " pp", color=False),
                    "nota": f"{DEF_BANDA} · vs 4 semanas antes"})
    eeuu = _eeuu(x)
    if eeuu:
        out.append({"et": "Brecha con EE.UU.", "val": f'×{G2._num(eeuu["ratio"])}',
                    "delta": '<span class="delta neutro">primera medición: sin serie previa</span>',
                    "nota": f'EE.UU. {G.usd(eeuu["usd_kg_vivo"])} vs Argentina {G.usd(x.internacional["argentina"])} '
                            f'(cierre {fecha_ar(p.cierre["fecha"])}) por kg vivo'})
    return out


def titulo_mes(p: D.Paquete) -> str:
    """El título-hecho de las piezas de los cuatro números."""
    v1 = p.variacion("usd_blue", 1)
    anterior = D.MESES[(p.mes.mes - 2) % 12 + 1]
    if v1 is None:
        return f'{p.mes.nombre.capitalize()} promedió {G.usd(p.promedio_usd)} el kilo vivo'
    comp = "menos" if v1 < 0 else "más"
    return (f'{p.mes.nombre.capitalize()} promedió {G.usd(p.promedio_usd)} el kilo vivo, '
            f'{_d(abs(v1))}% {comp} que {anterior}')


def contexto_cambiario(p: D.Paquete) -> str:
    """La brecha blue/oficial del mes y del mismo mes un año antes: de eso depende leer el interanual en dólares."""
    mb = {q["ym"]: q["valor"] for q in p.mensual("usd_blue")}
    mo = {q["ym"]: q["valor"] for q in p.mensual("usd_oficial")}
    ant = f"{p.mes.anio - 1:04d}-{p.mes.mes:02d}"
    partes = []
    for ym in (ant, p.mes.ym):
        if mb.get(ym) and mo.get(ym):
            b = 100 * (mo[ym] / mb[ym] - 1)  # el blue sobre el oficial, en %
            lado = "por encima" if b >= 0 else "por debajo"
            partes.append(f"{_d(abs(b))}% {lado} del oficial en {ym_largo(ym)}")
    if len(partes) < 2:
        return ""
    return f"Contexto cambiario: el dólar blue cotizó en promedio {partes[0]} y {partes[1]}."


def hechos(p: D.Paquete, x: D2.Extra) -> list[str]:
    """Los hechos de la página 2. Cada uno con el número y nada más."""
    out = []
    c = p.cierre
    v1, v12, vu12 = p.variacion("ars", 1), p.variacion("ars", 12), p.variacion("usd_blue", 12)
    if v1 is not None and v12 is not None:
        anterior = D.MESES[(p.mes.mes - 2) % 12 + 1]
        out.append(f'El Índice Novillo cerró el {fecha_ar(c["fecha"])} en <span class="fuerte">{G.ars(c["ars"])}</span> '
                   f'por kilo vivo; el promedio de {p.mes.nombre} ({G.ars(p.promedio_ars)}) {_verbo(v1)} contra '
                   f'{anterior} y {_verbo(v12)} en doce meses.')
    if vu12 is not None:
        out.append(f'En dólares, {p.mes.nombre} promedió <span class="fuerte">{G.usd(p.promedio_usd)}</span> al blue: '
                   f'{_verbo(vu12)} en doce meses.')
    act, prev, _ = D2.amplitud_contra(p, "NOVILLO")
    if act is not None and prev is not None:
        out.append(f'La {BANDA} del novillo ({DEF_BANDA}, cuánto se abre el precio de la misma categoría) midió '
                   f'<span class="fuerte">{_d(act)}%</span>, contra {_d(prev)}% cuatro semanas antes.')
    vaca = next((s for s in x.relativos.puntos if s["categoria"] == "VACA"), None)
    if vaca:
        a, b = vaca["puntos"][0], vaca["puntos"][-1]
        out.append(f'La vaca pasó de {G2._num(a["relacion"])} a <span class="fuerte">{G2._num(b["relacion"])}</span> '
                   f'del precio del novillo desde el {_dm(a["fecha"])} (mediana de cada categoría).')
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        vals = [q["pct"] for q in p.liquidacion.puntos]
        out.append(f'Las hembras fueron el <span class="fuerte">{_d(u["pct"])}%</span> de las cabezas operadas en Cañuelas; '
                   f'la mediana de los {len(vals)} meses medidos es {_d(_mediana(vals))}%.')
    eeuu = _eeuu(x)
    if eeuu:
        out.append(f'El kilo vivo vale <span class="fuerte">{G.usd(eeuu["usd_kg_vivo"])}</span> en Estados Unidos y '
                   f'{G.usd(x.internacional["argentina"])} en Argentina (cierre): {G2._num(eeuu["ratio"])} veces.')
    return out


def hechos_texto(p: D.Paquete, x: D2.Extra) -> list[str]:
    """Los mismos hechos sin HTML, para el manifest."""
    return [re.sub(r"<[^>]+>", "", h) for h in hechos(p, x)]


# ─── páginas ───────────────────────────────────────────────────────────────────

def p_tapa(p: D.Paquete, x: D2.Extra) -> str:
    c = p.cierre
    nums = cuatro_numeros(p, x)
    tarjetas = "".join(
        f'<div class="num4"><div class="et">{n["et"]}</div><div class="val">{n["val"]}</div>'
        f'<div>{n["delta"]}</div><div class="nota4">{I.esc(n["nota"])}</div></div>'
        for n in nums
    )
    spark = G.sparkline([q["valor"] for q in p.mensual("usd_blue")[-24:]], ancho_mm=80, alto_mm=14)
    return (
        f'<p class="rotulo" style="margin-top:12mm">Informe mensual del mercado ganadero argentino</p>'
        f'<h1 class="titulo-tapa">El Corredor</h1>'
        f'<p class="bajada">{p.mes.etiqueta.capitalize()} · {ruedas_texto(p, x)} · '
        f'edición del {G.fecha_larga_es(date.today().isoformat())}</p>'
        f'<div class="tapa-hero"><div><p class="rotulo">Índice Novillo al cierre del mes</p>'
        f'<div class="hero">{G.ars(c["ars"])}</div>'
        f'<div class="hero-sub">por kilo vivo · {G.usd(c["usd_blue"])} al blue · rueda del {G.fecha_larga_es(c["fecha"])}</div></div>'
        f'<div class="tapa-spark">{spark}<div class="nota">Promedio mensual en dólares (valores nominales), últimos 24 meses</div></div></div>'
        f'<p class="rotulo" style="margin-top:12mm">Los cuatro números del mes</p>'
        f'<div class="grid4">{tarjetas}</div>'
        f'<div class="cita-caja" style="margin-top:12mm"><div class="rotulo">Para citar este informe</div>'
        f'<div class="cita-txt">{I.esc(cita(p))}</div><div class="nota">{I.esc(cita_banda())}</div></div>'
        f'<p class="nota" style="position:absolute;bottom:16mm;left:15mm;right:15mm">Memola Medios SAS · '
        f'Cada número de este informe va con su fuente y su fecha. Lo que no tiene base suficiente, no se publica.</p>'
    )


def mes_en_numeros(p: D.Paquete, x: D2.Extra) -> str:
    """Las ruedas con índice en cuatro fichas: promedio, la más alta, la más baja y las cabezas."""
    r = p.ruedas_mes
    if not r:
        return ""
    alta = max(r, key=lambda q: q["ars"])
    baja = min(r, key=lambda q: q["ars"])
    cab = sum(q.get("cabezas") or 0 for q in r)
    return (
        f'<div class="fichas">'
        f'{I.ficha("Promedio del mes", G.ars(p.promedio_ars), f"<div class=delta>{len(r)} ruedas con índice</div>")}'
        f'{I.ficha("Rueda más alta", G.ars(alta["ars"]), f"<div class=delta>{G.fecha_es(alta['fecha'])}</div>")}'
        f'{I.ficha("Rueda más baja", G.ars(baja["ars"]), f"<div class=delta>{G.fecha_es(baja['fecha'])}</div>")}'
        f'{I.ficha("Cabezas del índice", _miles(cab), f"<div class=delta>suma de las {len(r)} ruedas con índice</div>")}'
        f'</div>'
    )


def p_resumen(p: D.Paquete, x: D2.Extra) -> str:
    filas = "".join(
        f'<tr><td>{I.esc(f["nombre"])}<span class="unidad">{f["unidad"]}</span></td>'
        f'<td class="num fuerte">{_valor(f)}</td>'
        f'{_celda(f["s1"], f["color"])}{_celda(f["s4"], f["color"])}{_celda(f["ia"], f["color"])}{_celda(f["p5"], f["color"])}</tr>'
        for f in x.semaforo
    )
    faltan = ausencias(p, x)
    aviso = (f'<div class="aviso">Lo que esta edición no midió: {I.esc("; ".join(faltan))}. '
             f'Se declara antes que completarlo con una estimación.</div>') if faltan else ""
    base = _base5(p)
    eb = D2.etiqueta_base(base)
    alt = [f for f in x.semaforo if f.get("p5_oficial_5") is not None]
    nota_alt = ""
    if alt:
        nota_alt = (" Si se toman los últimos cinco años corridos al dólar oficial, la comparación da " +
                    " y ".join(f'{_signo(f["p5_oficial_5"])} para {f["nombre"].lower() if f["nombre"] != "Índice Novillo" else "el Índice Novillo"}'
                               .replace("para novillito", "para el novillito") for f in alt) + ".")
    ctx = contexto_cambiario(p)
    nota_faena = fuente_faena = ""
    if x.faena:
        u = x.faena["u"]
        nota_faena = (f" Faena y peso medio de res (kg de res con hueso): dato de {ym_largo(u['periodo'])}, un mes de "
                      f"rezago; solo interanual.")
        fuente_faena = "; MAGyP (faena nacional)"
    return (
        f'<h2>Si sólo leés una página, es ésta</h2>'
        f'<ol class="lista-num compacta">' + "".join(f"<li>{h}</li>" for h in hechos(p, x)) + "</ol>"
        + (f'<p class="nota" style="font-size:8.5pt;line-height:12pt;margin:-2mm 0 4mm">{I.esc(ctx)}</p>' if ctx else "")
        + f'{mes_en_numeros(p, x)}'
        f'<h3 style="margin-top:2mm">Cuánto se movió cada precio</h3>'
        f'<table class="semaforo"><thead><tr><th>Serie</th><th>Cierre {_dm(p.cierre["fecha"])}</th><th>1 semana</th><th>4 semanas</th>'
        f'<th>Interanual</th><th>vs prom. {eb}</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">1 y 4 semanas: último dato del mes contra el último de 7 y 28 días antes. Interanual: promedio del '
        f'mes contra el mismo mes del año anterior. Promedio de 5 años, solo en dólares: el mismo mes de {eb}, los años '
        f'de cambio unificado; 2020–2024 quedan afuera porque la brecha cambiaria hacía que el mismo kilo valiera dos '
        f'cifras en dólares.{nota_alt} Verde y rojo solo en dólares; en pesos la inflación hace ambiguo el signo. Las '
        f'medianas de la {BANDA} tienen serie desde junio de 2026: solo ventanas cortas.{nota_faena} Fuente: MAG (Índice Novillo, '
        f'novillito, lotes) y dólar blue{fuente_faena}; cálculo propio · consignatarias.com.ar</p>'
        f'{aviso}'
    )


def p_historia(p: D.Paquete, x: D2.Extra) -> str:
    vu12 = p.variacion("usd_blue", 12)
    v12 = p.variacion("ars", 12)
    mens = D2.a_mensual(x.novillito.puntos, "usd_blue")
    nov_mens = [{"ym": m["ym"], "usd_blue": m["valor"]} for m in mens]
    ofi = {m["ym"]: m["valor"] for m in D2.a_mensual(x.novillito.puntos, "usd_oficial")}
    for m in nov_mens:
        m["usd_oficial"] = ofi.get(m["ym"])
    for ym, v in ofi.items():
        if ym not in {m["ym"] for m in nov_mens}:
            nov_mens.append({"ym": ym, "usd_oficial": v, "usd_blue": None})
    nov_mens.sort(key=lambda m: m["ym"])
    bloque_nov = ""
    con_b = [m for m in nov_mens if m.get("usd_blue")]
    actual = next((m for m in con_b if m["ym"] == p.mes.ym), None)
    if actual and len(con_b) > 24:
        rango = sorted(con_b, key=lambda m: m["usd_blue"], reverse=True).index(actual) + 1
        bloque_nov = (
            f'<h3>Novillito: {p.mes.nombre} promedió {G.usd(actual["usd_blue"])}, el {rango}.º promedio mensual más alto de '
            f'{len(con_b)} meses desde {con_b[0]["ym"][:4]}</h3>'
            f'<figure>{G2.novillito_largo(nov_mens, alto_mm=56)}'
            f'{pie("MAG, serie de novillito por rueda; dólar oficial (desde 2006) y blue (desde 2011)", fecha=x.novillito.fecha_dato, nota="Valores nominales: dólares corrientes, sin ajuste por inflación de EE.UU.")}</figure>'
        )
    titulo = (f'El novillo promedió {G.usd(p.promedio_usd)} en {p.mes.nombre}, {_d(abs(vu12))}% '
              f'{"más" if vu12 >= 0 else "menos"} que un año atrás'
              if vu12 is not None else "El novillo en dólares, desde 2015")
    anual: dict[str, list[float]] = {}
    for q in p.mensual("usd_blue"):
        anual.setdefault(q["ym"][:4], []).append(q["valor"])
    filas = "".join(
        f'<tr><td>{a}{"*" if len(v) < 12 else ""}</td><td class="num">{G.usd(sum(v) / len(v))}</td></tr>'
        for a, v in sorted(anual.items())[-8:]
    )
    t100 = (f'En doce meses el Índice Novillo {_verbo(v12)} en pesos y {_verbo(vu12)} en dólares'
            if v12 is not None and vu12 is not None else "Pesos y dólares, base 100")
    return (
        f'<h2>{titulo}</h2>'
        f'<figure>{G.linea_dolares(p.inmag.puntos, alto_mm=58)}'
        f'{pie("MAG (Índice Novillo), empalme Liniers→MAG y dólar blue y oficial", fecha=p.inmag.fecha_dato, nota="Valores nominales: dólares corrientes, sin ajuste por inflación de EE.UU. Área sombreada: brecha entre el blue y el oficial.")}</figure>'
        f'{bloque_nov}'
        f'<div class="dos"><div><h3>{t100}</h3>{G.base100(p.mensual("ars"), p.mensual("usd_blue"), p.mes.ym)}'
        f'<div class="nota">Pesos y dólares a base 100 doce meses atrás, valores nominales: la distancia entre las líneas es '
        f'cuánto de la suba fue en pesos. Fuente: MAG (Índice Novillo) y dólar blue; cálculo propio · consignatarias.com.ar</div></div>'
        f'<div><h3>Índice Novillo, promedio anual en dólares</h3><table class="chica"><thead><tr><th>Año</th><th>USD/kg (blue)</th></tr></thead>'
        f'<tbody>{filas}</tbody></table><div class="nota">Valores nominales. * Año incompleto: promedio de los meses con dato.</div></div></div>'
    )


def estacional_titulo(p: D.Paquete) -> str | None:
    """"Octubre promedió USD 2,65; el promedio de octubre en 2016–2019 y 2025 es USD 1,57" (al blue)."""
    por = {q["ym"]: q["valor"] for q in p.mensual("usd_blue")}
    base = _base5(p)
    vals = [por.get(f"{a:04d}-{p.mes.mes:02d}") for a in base]
    actual = por.get(p.mes.ym)
    if not actual or not vals or not all(vals):
        return None
    return (f'{p.mes.nombre.capitalize()} promedió {G.usd(p.promedio_usd)}; el promedio de {p.mes.nombre} en '
            f'{D2.etiqueta_base(base)} es {G.usd(sum(vals) / len(vals))}')


def p_estacional(p: D.Paquete, x: D2.Extra) -> str:
    est = x.estacional
    if not est.get("indice"):
        return ""
    idx = est["indice"]
    tip = idx.get(p.mes.mes)
    orden = sorted(idx, key=idx.get)
    baratos, caros = sorted(orden[:2]), sorted(orden[-2:])
    otros = {k: D2.estacionalidad(p.mensual(c))["indice"].get(p.mes.mes) for k, c in (("blue", "usd_blue"), ("pesos", "ars"))}
    base = _base5(p)
    eb = D2.etiqueta_base(base)
    titulo = estacional_titulo(p) or "La forma del año, en dólares"
    nota_otros = ""
    if all(otros.values()) and tip:
        nota_otros = (f" Al dólar blue {p.mes.nombre} daría {G2._num(otros['blue'], 3)} y en pesos "
                      f"{G2._num(otros['pesos'], 3)}: al blue, los años de brecha exageran el mes.")
    return (
        f'<h2>{titulo}</h2>'
        f'<p class="ancho">{D.MESES[baratos[0]].capitalize()} y {D.MESES[baratos[1]]} son los meses más baratos del año '
        f'(índice {G2._num(idx[baratos[0]], 3)} y {G2._num(idx[baratos[1]], 3)}); {D.MESES[caros[0]]} y '
        f'{D.MESES[caros[1]]}, los más caros ({G2._num(idx[caros[0]], 3)} y {G2._num(idx[caros[1]], 3)}). Índice típico de '
        f'{p.mes.nombre}: <span class="fuerte">{G2._num(tip, 3) if tip else "—"}</span> (1,000 = un mes cualquiera), '
        f'sobre {est["anios"]} años, al dólar oficial.</p>'
        f'<figure>{G2.espagueti(p.mensual("usd_blue"), p.mes.anio, base, alto_mm=74, rotulo_base=f"promedio\n{eb}")}'
        f'{pie("MAG (Índice Novillo) y dólar blue", fecha=p.inmag.fecha_dato, nota=f"Valores nominales. Gris: cada año completo desde 2015; gris oscuro: {p.mes.anio - 1}. Punteado: promedio de {eb}, los años de cambio unificado (2020–2024 quedan afuera por la brecha cambiaria).")}</figure>'
        f'<h3>Cuánto se apartó cada mes de su propio entorno, en %, al dólar oficial</h3>'
        f'<figure>{G2.mapa_calor(est["razon"], idx)}'
        f'{pie("MAG (Índice Novillo) y dólar oficial", nota="Razón sobre la media móvil centrada de 12 meses, la cuenta de la tool price_seasonality, calculada al dólar oficial." + nota_otros + " Los últimos seis meses no tienen celda: la media centrada necesita medio año por delante.")}</figure>'
    )


def banda_titulo(p: D.Paquete) -> str:
    act, prev, _ = D2.amplitud_contra(p, "NOVILLO")
    if act is None or prev is None:
        return f"La {BANDA} de cada categoría, en el tiempo"
    verbo = "se abrió" if act > prev else "se cerró"
    return f"La {BANDA} del novillo {verbo} a {_d(act)}%; cuatro semanas antes medía {_d(prev)}%"


def _vs4(p: D.Paquete, b: dict) -> str:
    act, prev, _ = D2.amplitud_contra(p, b["categoria"])
    return _signo(act - prev, " pp") if act is not None and prev is not None else "—"


def p_banda1(p: D.Paquete, x: D2.Extra) -> str:
    if not len(x.bandas_hist):
        return ""
    filas = "".join(
        f'<tr><td>{G2.nombre_cat(b["categoria"])}</td><td class="num">{G.ars(b["p10"])}</td>'
        f'<td class="num">{G.ars(b.get("mediana") or 0)}</td><td class="num">{G.ars(b["p90"])}</td>'
        f'<td class="num fuerte">{_d(b.get("amplitud_pct") or 0)}%</td>'
        f'<td class="num">{_vs4(p, b)}</td>'
        f'<td class="num">{_miles(b.get("lotes") or 0)}</td>'
        f'<td class="num">{_miles(b.get("cabezas") or 0)}</td></tr>'
        for b in sorted(p.bandas.puntos, key=lambda b: b.get("mediana") or 0, reverse=True)
    )
    return (
        f'<h2>{banda_titulo(p)}</h2>'
        f'<p class="ancho">La <span class="fuerte">{BANDA}</span> mide cuánto se abre el precio de una misma categoría: '
        f'es la distancia entre el lote barato y el caro, {DEF_BANDA}, con el P10 y el P90 de los lotes de los últimos 30 '
        f'días. Se compara siempre contra cuatro semanas antes. En los paneles, el área va del P10 al P90 y la línea es la '
        f'mediana; misma escala en los seis.</p>'
        f'<figure>{G2.grilla_bandas(x.bandas_hist.puntos, alto_mm=120)}'
        f'{pie("MAG, operaciones de lote (Valor de Referencia VR v1.0)", fecha=x.bandas_hist.fecha_dato, nota="Ventana móvil de 30 días: dos puntos vecinos comparten 29 días de lotes. Pesos corrientes.")}</figure>'
        f'<table><thead><tr><th>Categoría</th><th>P10</th><th>Mediana</th><th>P90</th><th>{BANDA}</th><th>vs 4 sem.</th>'
        f'<th>Lotes</th><th>Cabezas</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">Ventana de 30 días al {fecha_ar(p.bandas.fecha_dato)}. {BANDA}: {DEF_BANDA}. Con menos de 10 lotes '
        f'una categoría no se publica; con menos de 30 se marca como base fina.</p>'
    )


def p_banda2(p: D.Paquete, x: D2.Extra) -> str:
    if not len(p.por_peso):
        return ""
    novi = next((g for g in p.por_peso.puntos if g["categoria"] == "NOVILLITO"), None)
    titulo = "El precio del kilo según el peso del lote"
    if novi and len(novi["rangos"]) >= 2:
        a, b = novi["rangos"][0], novi["rangos"][-1]
        titulo = (f'Novillito: {G.ars(a["mediana"])} el kilo a {a["desde_kg"]}–{a["hasta_kg"]} kg, '
                  f'{G.ars(b["mediana"])} a {b["desde_kg"]}–{b["hasta_kg"]} kg')
    return (
        f'<h2>{titulo}</h2>'
        f'<p class="ancho">La {BANDA} por rango de 50 kg dentro de cada categoría: cuánto se castiga o se premia el kilo '
        f'a medida que el animal pesa más.</p>'
        f'<figure>{G2.escalera_pesos(p.por_peso.puntos, fila_h=13)}'
        f'{pie("MAG, operaciones de lote por rango de 50 kg (Valor de Referencia VR v1.0)", fecha=p.por_peso.fecha_dato, nota="Barra: P10 a P90. Punto: mediana. Barra hueca: menos de 30 lotes.")}</figure>'
    )


def relativos_titulo(x: D2.Extra) -> str:
    vaca = next((s for s in x.relativos.puntos if s["categoria"] == "VACA"), None)
    if not vaca:
        return "Cada categoría contra el novillo"
    a, b = vaca["puntos"][0], vaca["puntos"][-1]
    return (f'La vaca pasó de {G2._num(a["relacion"])} a {G2._num(b["relacion"])} del novillo desde '
            f'{D.MESES[int(a["fecha"][5:7])]}')


def p_relativos(p: D.Paquete, x: D2.Extra) -> str:
    if not len(x.relativos) and not x.maiz_vigente:
        return ""
    bloque_rel = ""
    if len(x.relativos):
        bloque_rel = (
            f'<h2>{relativos_titulo(x)}</h2>'
            f'<figure>{G2.relativos_paneles(x.relativos.puntos, alto_mm=58)}'
            f'{pie("MAG, operaciones de lote (mediana de la " + BANDA + " de cada categoría sobre la del novillo)", fecha=x.relativos.fecha_dato, nota="Misma escala en los tres paneles. Línea negra: 1,00, el precio del novillo. Punteada: promedio de la propia serie, que empieza en junio de 2026.")}</figure>'
        )
        nov = next((b for b in p.bandas.puntos if b["categoria"] == "NOVILLO"), None)
        if nov and nov.get("mediana"):
            filas = "".join(
                f'<tr><td>{G2.nombre_cat(b["categoria"])}</td><td class="num">{G.ars(b["mediana"])}</td>'
                f'<td class="num fuerte">{G2._num(b["mediana"] / nov["mediana"])}</td><td class="num">{_miles(b["lotes"])}</td></tr>'
                for b in sorted(p.bandas.puntos, key=lambda b: b.get("mediana") or 0, reverse=True) if b.get("mediana")
            )
            bloque_rel += (f'<table class="chica"><thead><tr><th>Categoría</th><th>Mediana $/kg</th><th>Sobre el novillo</th>'
                           f'<th>Lotes</th></tr></thead><tbody>{filas}</tbody></table>'
                           f'<p class="nota">Ventana de 30 días al {fecha_ar(p.bandas.fecha_dato)}. Fuente: MAG, operaciones de lote; cálculo propio · consignatarias.com.ar</p>')
    bloque_maiz = ""
    if x.maiz_vigente:
        m = p.maiz.puntos[-1]
        bloque_maiz = (
            f'<h3>Un kilo de novillo compró {_d(m["relacion"])} kg de maíz en {ym_largo(m["ym"])}</h3>'
            f'<figure>{G2.ratio_maiz(p.maiz.puntos, alto_mm=50)}'
            f'{pie("MAG (Índice Novillo), maíz FOB (MAGyP) y dólar blue", fecha=None, nota=f"Dato de {ym_largo(m['ym'])}. Línea punteada: mediana de la serie dibujada.")}</figure>'
        )
    return (
        f'{bloque_rel}{bloque_maiz}'
        f'<div class="aviso">No hay relación ternero/novillo en este informe. El Mercado Agroganadero no opera terneros, '
        f'así que cualquier precio de ternero sería un derivado del índice y la relación saldría circular.</div>'
    )


def p_ciclo(p: D.Paquete, x: D2.Extra) -> str:
    if not p.liquidacion.puntos:
        return ""
    u = p.liquidacion.puntos[-1]
    med = _mediana([q["pct"] for q in p.liquidacion.puntos])
    nac = x.nacional or {}
    bloque_nac = ""
    if x.faena:
        # La serie mensual del MAGyP (página siguiente) reemplaza al acumulado del año.
        fu = x.faena["u"]
        bloque_nac = (f'<div class="aviso">A nivel nacional, las hembras fueron el {_d(fu["pct_hembras"])}% de la faena '
                      f'de {ym_largo(fu["periodo"])} (MAGyP; la serie mes a mes va en la página de faena nacional). '
                      f'<strong>Las dos series no se grafican juntas</strong>: Cañuelas concentra venta de vientres y '
                      f'corre quince a veinte puntos por encima del país.</div>')
    elif nac.get("pct"):
        cuando = f'acumulado del año a {nac["mes_informe"].lower()}' if nac.get("mes_informe") else "acumulado del año"
        bloque_nac = (f'<div class="aviso">A nivel nacional, las hembras fueron el {_d(nac["pct"])}% de la faena '
                      f'({cuando}; {I.esc(nac.get("fuente"))}). <strong>Las dos series no se grafican juntas</strong>: '
                      f'Cañuelas concentra venta de vientres y corre quince a veinte puntos por encima del país.</div>')
    filas = "".join(
        f'<tr><td>{ym_ar(q["ym"])}</td><td class="num">{_d(q["pct"])}%</td><td class="num">{_miles(q["cabezas"])}</td>'
        f'<td class="num">{_miles(q["lotes"])}</td></tr>' for q in p.liquidacion.puntos[-6:]
    )
    liq = next((q for q in p.liquidacion.puntos if q["ym"] == p.mes.ym), None)
    base_comp = (f'sobre el mismo total que la tabla ({_miles(liq["cabezas"])} cabezas de {p.mes.nombre}); "otras" junta '
                 f'las categorías con menos de 10 lotes') if liq else "por categoría"
    return (
        f'<h2>Hembras: {_d(u["pct"])}% de lo operado en {D.MESES[int(u["ym"][5:])]}, {_pp(u["pct"] - med)} '
        f'contra la mediana propia</h2>'
        f'<figure>{G2.hembras_franja(p.liquidacion.puntos, alto_mm=72)}'
        f'{pie("MAG, cabezas operadas en Cañuelas por lote", fecha=p.liquidacion.fecha_dato, nota="Hembras = vacas y vaquillonas sobre todas las cabezas del mes. Meses con menos de 5.000 cabezas no se publican.")}</figure>'
        f'{bloque_nac}'
        f'<div class="dos"><div><h3>Hembras por mes</h3><table><thead><tr><th>Mes</th><th>Hembras</th><th>Cabezas</th><th>Lotes</th></tr></thead>'
        f'<tbody>{filas}</tbody></table></div>'
        f'<div><h3>Qué entró al mercado en {p.mes.nombre}</h3>{G2.barras_composicion(x.composicion)}'
        f'<div class="nota">Cabezas operadas por categoría, {base_comp}. Fuente: MAG, lotes; cálculo propio.</div></div></div>'
    )


def nombre_propio(s: str) -> str:
    """
    Nombres del calendario en forma de lectura: lo que viene en MAYÚSCULAS pasa a
    nombre propio (con S.A., SRL y SA intactos), y se arreglan las tildes que el
    scraping pierde. No se trunca: el corte con elipsis escondía la firma.
    """
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    if not s:
        return "sin dato"
    if s.upper() == s and any(c.isalpha() for c in s):
        menores = {"y", "de", "del", "la", "las", "los", "e"}
        siglas = {"S.A.", "SA", "SRL", "S.R.L.", "SAS", "S.A.S.", "SACIF", "SAIC", "UMC", "CIA.", "CÍA."}
        pal = []
        for i, w in enumerate(s.split(" ")):
            if w in siglas or w.rstrip(",") in siglas:
                pal.append(w.replace("CIA.", "Cía.").replace("CÍA.", "Cía."))
            elif i and w.lower() in menores:
                pal.append(w.lower())
            else:
                pal.append(w.capitalize())
        s = " ".join(pal)
    tildes = {"Autonoma": "Autónoma", "Cordoba": "Córdoba", "Entre Rios": "Entre Ríos", "Rio Negro": "Río Negro",
              "Neuquen": "Neuquén", "Tucuman": "Tucumán", "Canuelas": "Cañuelas", "Bahia Blanca": "Bahía Blanca",
              "Ciudad Autónoma De Buenos Aires": "Ciudad Autónoma de Buenos Aires", " De ": " de ", " Del ": " del "}
    for a, b in tildes.items():
        s = s.replace(a, b)
    partes = [x.strip() for x in s.split(",")]
    if len(partes) == 2 and partes[0] == partes[1]:
        s = partes[0]
    return s


def calendario(p: D.Paquete) -> str:
    """
    El calendario del mes que viene: una fila por jornada (el primer remate del día
    en el calendario) y cuántos hay ese día, así la nota y la tabla cuentan lo mismo.
    """
    r = p.remates or {}
    por_dia: dict[str, list[dict]] = {}
    for q in r.get("proximos") or []:
        por_dia.setdefault(str(q.get("date"))[:10], []).append(q)
    if not por_dia:
        return '<p class="nota">Sin remates cargados para el mes que viene al cierre de esta edición.</p>'
    filas = "".join(
        f'<tr><td>{I.esc(G.fecha_es(d))}</td><td>{I.esc(nombre_propio(qs[0].get("consignatariaName")))}</td>'
        f'<td>{I.esc(nombre_propio(qs[0].get("location")))}</td><td class="num">{len(qs)}</td></tr>'
        for d, qs in sorted(por_dia.items())
    )
    total = sum(len(v) for v in por_dia.values())
    mes = r.get("mes") or ""
    return (f'<table class="chica apretada"><thead><tr><th>Fecha</th><th>Primera firma del día</th><th>Lugar</th>'
            f'<th>Remates</th></tr></thead><tbody>{filas}</tbody></table>'
            f'<p class="nota">{total} remates convocados para {ym_largo(mes) if mes else "el mes que viene"} en {len(por_dia)} '
            f'jornadas al cierre de esta edición: una fila por jornada, con la primera firma del calendario y cuántos remates '
            f'hay ese día. El calendario completo está en consignatarias.com.ar/remates · {I.esc(r.get("fuente"))}.</p>')


def D2_prov(k: str) -> str:
    """Provincia en nombre propio: el calendario la guarda en mayúsculas y sin tildes."""
    tildes = {"CORDOBA": "Córdoba", "ENTRE RIOS": "Entre Ríos", "RIO NEGRO": "Río Negro", "NEUQUEN": "Neuquén",
              "TUCUMAN": "Tucumán", "SIN PROVINCIA": "Sin dato", "SIN DATO": "Sin dato", "CAPITAL FEDERAL": "CABA"}
    return tildes.get(k, k.title().replace(" Del ", " del ").replace(" De ", " de "))


def p_remates(p: D.Paquete, x: D2.Extra) -> str:
    rm = x.remates_mes
    if not rm:
        return ""
    prov = [(D2_prov(k), v, str(v)) for k, v in rm["por_provincia"][:10]]
    tipos = " · ".join(f"{k} {v}" for k, v in rm["por_tipo"])
    top = rm["por_provincia"][0]
    return (
        f'<h2>{rm["total"]} remates en {p.mes.nombre} en el calendario; {top[1]} en {D2_prov(top[0])}</h2>'
        f'<div class="fichas">'
        f'{I.ficha("Remates", str(rm["total"]), f"<div class=delta>{rm['jornadas']} jornadas</div>")}'
        f'{I.ficha("Firmas", str(rm["firmas"]), "<div class=delta>con al menos un remate</div>")}'
        f'{I.ficha("Cabezas anunciadas", _miles(rm["cabezas_anunciadas"]), f"<div class=delta>en {rm['con_cabezas']} de {rm['total']} remates</div>")}'
        f'</div>'
        f'<div class="dos"><div><h3>Remates por provincia</h3><figure>{G2.barras_ordenadas(prov, ancho_mm=87, titulo="Remates por provincia")}'
        f'{pie(rm["fuente"])}</figure></div>'
        f'<div><h3>Por tipo</h3><p class="nota" style="font-size:8.5pt;line-height:12pt">{I.esc(tipos)}.</p>'
        f'<p class="nota">El conteo es el del calendario, que crece a medida que se suman fuentes: no se compara contra '
        f'meses anteriores como si fuera actividad del mercado. Las cabezas son las que anuncia cada firma, no las vendidas.</p></div></div>'
        f'<h3>Los del mes que viene</h3>{calendario(p)}'
    )


def mundo_titulo(x: D2.Extra) -> str:
    eeuu = _eeuu(x)
    ar = x.internacional["argentina"]
    if not eeuu:
        return f"El kilo vivo de novillo: {G.usd(ar)} en Argentina"
    return f'El kilo vivo de novillo: {G.usd(ar)} en Argentina, {G.usd(eeuu["usd_kg_vivo"])} en Estados Unidos'


def _periodo(q: dict) -> str:
    if q.get("periodo") == "promedio semanal":
        return f'semana al {q["fecha_ar"]}'
    return q.get("periodo") or "—"


def p_mundo(p: D.Paquete, x: D2.Extra) -> str:
    intl = x.internacional
    if not intl:
        return ""
    ar = intl["argentina"]
    filas_g = [(q["pais"], q["usd_kg_vivo"], f'{G.usd(q["usd_kg_vivo"])} · ×{G2._num(q["ratio"])}') for q in intl["paises"]]
    filas_g.append(("Argentina", ar, f'{G.usd(ar)} · cierre {_dm(p.cierre["fecha"])}'))
    filas_g.sort(key=lambda f: f[1], reverse=True)
    tabla = "".join(
        f'<tr><td>{I.esc(q["pais"])}</td><td class="num">{G.usd(q["usd_kg_vivo"])}</td><td>{I.esc(q["nativo_ar"])}</td>'
        f'<td>{I.esc(_periodo(q))}</td><td>{I.esc(q["fecha_ar"])}</td><td>{I.esc(q["fuente"])}</td></tr>' for q in intl["paises"]
    )
    tabla += (f'<tr><td>Argentina</td><td class="num">{G.usd(ar)}</td><td>{G.ars(p.cierre["ars"])}/kg al blue</td>'
              f'<td>rueda del cierre</td><td>{fecha_ar(p.cierre["fecha"])}</td><td>MAG, Índice Novillo; dólar blue</td></tr>')
    atrib = sorted({q.get("atribucion") for q in intl["paises"] if q.get("atribucion")})
    return (
        f'<h2>{mundo_titulo(x)}</h2>'
        f'<figure>{G2.barras_ordenadas(filas_g, ancho_mm=180, fila_h=26, L=120, R=150, destacar="Argentina", titulo="Novillo en pie, USD por kilo vivo")}'
        f'{pie("USDA AMS, INAC y MLA; Argentina: Índice Novillo del MAG al dólar blue", fecha=p.cierre["fecha"], nota="Argentina: cierre del mes, la misma base en toda la página. Solo fuentes que publican peso vivo: no se estima rendimiento de carcasa en ningún país.")}</figure>'
        f'<h3>El novillo argentino de los últimos dos años, contra el nivel de hoy afuera</h3>'
        f'<figure>{G2.argentina_vs_niveles(p.mensual("usd_blue"), intl["paises"], p.cierre)}'
        f'{pie("Índice Novillo del MAG al dólar blue (línea: promedio mensual; punto: cierre); USDA AMS, INAC y MLA", fecha=p.cierre["fecha"], nota="Valores nominales. Las líneas punteadas son el último dato de cada país, no su serie.")}</figure>'
        f'<table class="chica"><thead><tr><th>País</th><th>USD/kg vivo</th><th>Dato nativo</th><th>Período</th><th>Fecha</th><th>Fuente</th></tr></thead><tbody>{tabla}</tbody></table>'
        f'<div class="aviso">Brasil no figura porque la licencia de CEPEA prohíbe retransmitir sus series.</div>'
        + (f'<p class="nota">{I.esc(" ".join(atrib))}</p>' if atrib else "")
    )


def tierra_con_renta(x: D2.Extra) -> list[dict]:
    """Las zonas que pasan el filtro completo: canon relevado en la zona, n ≥ 5 y dato de 12 meses o menos."""
    return [z for z in x.tierra.puntos if z["canon_relevado"]]


def p_tierra(p: D.Paquete, x: D2.Extra) -> str:
    if not len(x.tierra):
        return ""
    t = x.tierra.puntos
    top = t[0]

    def nombre(z: dict) -> str:
        return f'{z["provincia"]}{" — " + z["zona"] if z["zona"] else ""}'

    filas = "".join(
        f'<tr><td>{I.esc(nombre(z))}{"" if z["canon_relevado"] else " †"}</td>'
        f'<td class="num">{_miles(z["usd_ha"])}</td>'
        f'<td class="num">{_miles(z["p25"]) + "–" + _miles(z["p75"]) if z.get("p25") and z.get("p75") else "—"}</td><td class="num fuerte">{_miles(z["kg_novillo_ha"])}</td>'
        f'<td class="num">{_d(z["canon_kg_mes"]) if z["canon_kg_mes"] else "—"}</td>'
        f'<td class="num">{(_d(z["rendimiento_pct"]) + "%") if z["rendimiento_pct"] else "—"}</td>'
        f'<td class="num">{z["repago"] or "—"}</td><td class="num">{z.get("n")}</td><td>{I.esc(ym_ar(z["fecha"]) if len(str(z["fecha"])) >= 7 else z["fecha"])}</td></tr>'
        for z in t
    )
    barras = [(nombre(z), z["kg_novillo_ha"], f'{_miles(z["kg_novillo_ha"])} kg') for z in t]
    nom = f'{top["provincia"]}{" (" + top["zona"] + ")" if top["zona"] else ""}'
    return (
        f'<h2>La hectárea ganadera más cara con dato vigente, {I.esc(nom)}, cuesta {_miles(top["kg_novillo_ha"])} kg de novillo</h2>'
        f'<figure>{G2.barras_ordenadas(barras, ancho_mm=180, fila_h=15, L=230, R=70, titulo="Kilos de novillo por hectárea")}'
        f'{pie("Relevamiento propio y Compañía Argentina de Tierras; Índice Novillo del MAG al dólar blue", fecha=p.cierre["fecha"])}</figure>'
        f'<table class="chica apretada"><thead><tr><th>Zona</th><th>USD/ha</th><th>P25–P75</th><th>Kg novillo/ha</th><th>Canon kg/ha/mes</th>'
        f'<th>Renta anual</th><th>Repago (años)</th><th>n</th><th>Relev.</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">{I.esc(x.tierra.nota or "")} Entran solo zonas con {D2.TIERRA_N_MIN} observaciones o más y dato de '
        f'{D2.TIERRA_MESES_MAX} meses o menos. Kg de novillo por ha = USD/ha sobre el precio del novillo. Renta anual = canon '
        f'(kg/ha/mes × 12) × precio del novillo sobre el valor de la tierra; repago = 100 / renta. † Sin canon relevado en la '
        f'zona: va sin renta ni repago, no se estima ni se toma el de otra zona. Campo ganadero únicamente: la tierra agrícola '
        f'no se tasa con canon de hacienda. Fuente: relevamiento propio y Compañía Argentina de Tierras; cálculo propio · '
        f'consignatarias.com.ar</p>'
    )


def p_metodologia(p: D.Paquete, x: D2.Extra) -> str:
    """Metodología, fuentes, ausencias, licencia, cita y contacto. El contacto queda al final, donde ya está la mano."""
    fuentes = [
        ("Índice Novillo", "MAG, diario, ponderado por volumen; se calcula con más de 300 novillos", "Empalme Liniers→MAG y dólares"),
        ("Novillito", "MAG, por rueda desde 2006", "Dólares y promedios mensuales"),
        (BANDA, "Lotes del MAG, 30 días", f"P10, mediana, P90; {DEF_BANDA}"),
        ("Estacionalidad", "Índice Novillo al dólar oficial", "Razón sobre media móvil de 12 meses"),
        ("Hembras", "Lotes del MAG", "Hembras sobre el total del mes"),
        ("Brecha internacional", "USDA AMS, INAC, MLA", "USD por kg vivo"),
        ("Tierra", "Relevamiento propio y CAT", "Kg de novillo; renta solo con canon de la zona"),
        ("Remates", "Calendario propio", "Conteo por provincia y tipo"),
        ("Faena y stock", "MAGyP y SENASA, CC BY 4.0", "Interanuales; stock desde 2012"),
        ("Exportaciones e IPC", "INDEC, CC BY-SA 4.0", "Sumas del año; precio real desde 2017"),
        ("Clima", "NOAA CPC (RONI); SMN vía CLIMAT/DWD", "% de la normal 1991–2020"),
    ]
    tabla = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in fuentes)
    faltan = ausencias(p, x)
    linea_aus = (f'<p class="ancho"><span class="fuerte">Ausencias de esta edición.</span> {I.esc("; ".join(faltan))}.</p>'
                 if faltan else '<p class="ancho"><span class="fuerte">Ausencias de esta edición.</span> Ninguna.</p>')
    contacto = I.p_metodologia(p)
    contacto = contacto[contacto.index('<section class="contacto">'):]
    return (
        f'<h2>Cómo se construye esto</h2>'
        f'<p class="ancho"><span class="fuerte">Lo propio y lo de terceros.</span> Los precios y los lotes los publica el '
        f'Mercado Agroganadero (MAG). Nuestros son el empalme, los dólares, la {BANDA}, la estacionalidad, las hembras, '
        f'los precios relativos y la cuenta de la tierra. Faena, stock, exportaciones, IPC y clima: organismos '
        f'públicos.</p>'
        f'<p class="ancho"><span class="fuerte">Lo que no está.</span> Precio de ternero: el MAG no opera terneros. Las '
        f'hembras de Cañuelas y la faena nacional no se grafican juntas. Ningún umbral de afuera para leer una serie '
        f'propia: se marca su mediana. Valores nominales, salvo el precio real. Índice de la carne de la FAO: su licencia no '
        f'permite republicarlo. Relación novillo/FOB: mezclaría kilo vivo y kilo de producto con un rendimiento estimado.</p>'
        f'{linea_aus}'
        f'<table class="chica apretada"><thead><tr><th>Dato</th><th>Origen</th><th>Lo que hacemos</th></tr></thead><tbody>{tabla}</tbody></table>'
        f'<div class="cita-caja"><div class="rotulo">Licencia y cita</div>'
        f'<p class="ancho" style="margin:1mm 0 2mm">Citar es libre y gratis; la atribución es la condición de uso. Republicar '
        f'nuestras compilaciones o usarlas en un producto propio requiere licencia: {URL_LICENCIA.replace("https://www.", "")}</p>'
        f'<div class="cita-txt">{I.esc(cita(p))}</div><div class="nota">{I.esc(cita_banda())}</div></div>'
        f'<p class="ancho" style="margin:0 0 1mm">Para valuar un lote con estos datos: {URL_VALUAR.replace("https://www.", "")}</p>'
        f'<p class="nota">Este informe es una referencia de mercado, no una tasación ni una recomendación de compra o venta.</p>'
        f'{contacto}'
    )


def p_anexo(p: D.Paquete, x: D2.Extra) -> str:
    """Anexo: las subcategorías del MAG del mes cerrado, la tabla completa."""
    if not len(p.subcategorias):
        return ""
    filas = "".join(
        f'<tr><td>{I.esc(s["nombre"])}</td><td class="num">{_miles(s["cabezas"])}</td>'
        f'<td class="num">{_miles(s["kg_promedio"]) if s["kg_promedio"] else "—"}</td><td class="num">{G.ars(s["minimo"] or 0)}</td>'
        f'<td class="num">{G.ars(s["mediana"] or 0)}</td><td class="num fuerte">{G.ars(s["promedio"] or 0)}</td>'
        f'<td class="num">{G.ars(s["maximo"] or 0)}</td></tr>'
        for s in p.subcategorias.puntos
    )
    return (f'<h2>Anexo · Las {len(p.subcategorias)} subcategorías del MAG, {p.mes.nombre} completo</h2>'
            f'<table class="chica apretada"><thead><tr><th>Subcategoría</th><th>Cabezas</th><th>Kg prom.</th><th>Mín.</th>'
            f'<th>Mediana</th><th>Promedio</th><th>Máx.</th></tr></thead><tbody>{filas}</tbody></table>'
            f'<p class="nota">Fuente: Mercado Agroganadero, informe por categoría (Resol. 32/2018) del mes cerrado · '
            f'consignatarias.com.ar. Precios en $/kg vivo. El promedio es el ponderado que publica el MAG; el kilo promedio '
            f'sale de dividir los kilos totales por las cabezas.</p>')


# ─── fuentes públicas nuevas: precio real, exportación, ciclo nacional, clima ──
#
# Cada página lee lo que `datos_v2.cargar` dejó en `x.real`, `x.expo`, `x.faena`,
# `x.stock` y `x.clima`; vacío = la página no va y queda en la línea de ausencias.
# El pie lleva el organismo y el MES del dato (son series mensuales o anuales con
# rezago: no tienen "dato al día").

def _mes_ym(ym: str) -> str:
    """'2026-09' → 'septiembre'."""
    return D.MESES[int(ym[5:7])]


def _musd(v: float) -> str:
    """Millones de dólares con un decimal: 492,7."""
    return G2.num_ar(v, 1)


def _var_ficha(v: float | None, suf: str = "%", detalle: str = "") -> str:
    if v is None:
        return '<div class="delta neutro">sin comparable</div>'
    return f'<div class="delta neutro">{_signo(v, suf)}{detalle}</div>'


def p_real(p: D.Paquete, x: D2.Extra) -> str:
    """
    El novillito y el Índice Novillo en pesos constantes, desde enero de 2017. Antes
    no hay IPC nacional del INDEC y el empalme con San Luis no se usa. El título
    dice el nivel y el interanual: ningún "récord", que dependería de la ventana.
    """
    r = x.real
    if not r:
        return ""
    base = r["base"]
    nov = r["novillito"]
    por = {q["ym"]: q for q in nov}
    u = nov[-1]
    a = por.get(D2._ym_menos(u["ym"], 12))
    v = D2._var(u["valor"], a and a["valor"])
    previos = [q["valor"] for q in nov if q["ym"][:4] < u["ym"][:4]]
    prom = sum(previos) / len(previos) if previos else None
    # Si el último mes con IPC es la base, decir los dos meses repite el mismo.
    cuando = (f'en {ym_largo(base)}' if u["ym"] == base
              else f'en {_mes_ym(u["ym"])}, en pesos de {ym_largo(base)}')
    titulo = (f'El novillito promedió {G.ars(u["valor"])} el kilo {cuando}: '
              f'{_d(abs(v))}% {"más" if v >= 0 else "menos"} que un año antes, descontada la inflación' if v is not None
              else f'El novillito en pesos de {ym_largo(base)}, desde 2017')
    series = [{"nombre": "novillito", "puntos": nov, "color": G.SERIE, "grosor": 1.75}]
    if len(r.get("inmag") or []) >= 24:
        series.append({"nombre": "Índice Novillo", "puntos": r["inmag"], "color": G.TINTA_3, "grosor": 1.25,
                       "guion": ' stroke-dasharray="5 3"'})
    anual: dict[str, dict[str, list[float]]] = {}
    for clave in ("novillito", "inmag"):
        for q in r.get(clave) or []:
            anual.setdefault(q["ym"][:4], {}).setdefault(clave, []).append(q["valor"])
    filas = "".join(
        f'<tr><td>{a_}{"*" if len(d.get("novillito", [])) < 12 else ""}</td>'
        f'<td class="num">{G.ars(sum(d["novillito"]) / len(d["novillito"])) if d.get("novillito") else "—"}</td>'
        f'<td class="num">{G.ars(sum(d["inmag"]) / len(d["inmag"])) if d.get("inmag") else "—"}</td></tr>'
        for a_, d in sorted(anual.items())
    )
    oct_ = (f' {p.mes.nombre.capitalize()} todavía no tiene IPC (el INDEC lo publica a mediados del mes que viene): '
            f'entra en la edición siguiente.' if base < p.mes.ym else "")
    proc = r["procedencia"]
    return (
        f'<h2>{titulo}</h2>'
        f'<div class="fichas">'
        f'{I.ficha(f"Novillito · {_mes_ym(u["ym"])}", G.ars(u["valor"]), _var_ficha(v, detalle=" contra un año antes"))}'
        f'{I.ficha(f"Promedio {nov[0]["ym"][:4]}–{int(u["ym"][:4]) - 1}", G.ars(prom) if prom else "—", "<div class=delta>mismos pesos constantes</div>")}'
        f'{I.ficha("Pesos de", ym_ar(base), "<div class=delta>último IPC publicado</div>")}'
        f'</div>'
        f'<figure>{G2.lineas_mensuales(series, alto_mm=70, leyenda=f"Promedio mensual, $ por kilo vivo en pesos de {ym_largo(base)}", R=120)}'
        f'{pie("MAG (novillito por rueda e Índice Novillo) deflactados por el IPC nacional del INDEC (nivel general, base dic-2016=100)", dato=ym_largo(base), nota="Precio real = nominal × IPC del mes base ÷ IPC del mes. Desde enero de 2017: antes no hay IPC nacional y no se usa ningún empalme.")}</figure>'
        f'<div class="dos"><div><h3>Promedio anual, en pesos de {ym_largo(base)}</h3>'
        f'<table class="chica apretada"><thead><tr><th>Año</th><th>Novillito</th><th>Índice Novillo</th></tr></thead>'
        f'<tbody>{filas}</tbody></table><div class="nota">* Año incompleto: promedio de los meses con IPC.</div></div>'
        f'<div><h3>Cómo se lee</h3><p class="nota" style="font-size:8.5pt;line-height:12pt">El precio en pesos de cada '
        f'mes se lleva a pesos de {ym_largo(base)} con el IPC nacional del INDEC. La serie arranca en enero de 2017 '
        f'porque el IPC nacional empieza en diciembre de 2016; para años anteriores la única serie disponible es un '
        f'empalme con el IPC de una sola provincia (San Luis), que este informe no usa.{oct_} El resto del informe va en '
        f'valores nominales.</p>'
        f'<p class="nota">IPC: {I.esc(proc.fuente)}. Licencia {I.esc(proc.licencia.split(" · ")[0])}. Bajado el '
        f'{fecha_ar(proc.fecha_observacion)}.</p></div></div>'
    )


def p_exportacion(p: D.Paquete, x: D2.Extra) -> str:
    """
    Exportaciones de carne bovina del INDEC: toneladas en PESO PRODUCTO, US$ FOB y
    US$/t por mes, y los destinos del año contra el mismo período del anterior. No
    hay relación novillo/FOB: compararía kilo vivo con kilo de producto y pediría un
    rendimiento estimado, que este informe no usa.
    """
    e = x.expo
    if not e:
        return ""
    u, a = e["u"], e["ant"]
    mes, anio = _mes_ym(u["periodo"]), e["anio"]
    proc = e["procedencia"]
    titulo = (f'En {mes} se exportaron {_miles(u["toneladas_peso_producto"])} t de carne bovina por USD '
              f'{_musd(u["fob_musd"])} millones FOB, {_d(abs(e["var_fob"]))}% {"más" if e["var_fob"] >= 0 else "menos"} '
              f'en dólares que un año antes' if e["var_fob"] is not None else
              f'En {mes} se exportaron {_miles(u["toneladas_peso_producto"])} t de carne bovina')
    ant_txt = f" vs {D2.mes_corto(a['periodo'])}" if a else ""
    fichas = (
        f'<div class="fichas">'
        f'{I.ficha("Toneladas", _miles(u["toneladas_peso_producto"]), _var_ficha(e["var_t"], detalle=ant_txt))}'
        f'{I.ficha("USD millones FOB", _musd(u["fob_musd"]), _var_ficha(e["var_fob"], detalle=ant_txt))}'
        f'{I.ficha("USD por tonelada", _miles(u["usd_por_t"]), _var_ficha(e["var_usd_t"], detalle=ant_txt))}'
        + (f'{I.ficha("USD/t sin 0202.20", _miles(e["usd_t_sin"]), _var_ficha(D2._var(e["usd_t_sin"], e["usd_t_sin_ant"]), detalle=ant_txt))}'
           if e.get("usd_t_sin") else "")
        + '</div>'
    )
    m36 = e["mensual"][-36:]
    usd_t = [{"nombre": "total", "puntos": [{"ym": q["ym"], "valor": q["usd_t"]} for q in m36], "color": G.SERIE},
             {"nombre": "sin 0202.20", "puntos": [{"ym": q["ym"], "valor": q["usd_t_sin"]} for q in m36 if q["usd_t_sin"]],
              "color": G.TINTA_3, "grosor": 1.25, "guion": ' stroke-dasharray="5 3"'}]
    bloque_dest = ""
    if e.get("destinos"):
        n = e["mes"]
        per = f'ene–{D2.MESES_AB_ES[n]}' if n > 1 else "ene"
        filas = [{"nombre": d["nombre"], "v": d["t"], "v_ant": d["t_ant"],
                  "rot": f'{_miles(d["t"])} t · {_signo(d["var_t"]) if d["var_t"] is not None else "—"} · USD {_miles(d["fob"])} M'}
                 for d in e["destinos"]]
        china = next((d for d in e["destinos"] if d["clave"] == "china"), None)
        h3 = (f'Destinos, {per} {anio} contra {per} {anio - 1}: China llevó el {_d(china["share"])}% de las toneladas'
              if china and china.get("share") else f'Destinos, {per} {anio} contra {per} {anio - 1}')
        bloque_dest = (
            f'<h3>{h3}</h3>'
            f'<figure>{G2.barras_pareadas(filas, fila_h=19, et_actual=f"{per} {anio}", et_anterior=f"{per} {anio - 1}")}'
            f'{pie("INDEC, exportaciones por país de destino (NCM 02.01 + 02.02)", dato=ym_largo(u["periodo"]), nota="Toneladas en peso producto, acumuladas en el año. Unión Europea: los 27 miembros actuales, composición fija; Chile incluye las zonas francas de Iquique y Punta Arenas; Brasil, Manaos. Ordenado por toneladas del año.")}</figure>'
        )
    return (
        f'<h2>{titulo}</h2>{fichas}'
        f'<div class="dos"><div><h3>Toneladas por mes</h3>{G2.columnas_exportacion(e["mensual"])}'
        f'<div class="nota">Peso producto. Parte hueca: partida 0202.20 (congelada con hueso), que incluye huesos de '
        f'desposte con destino a China. Fuente: INDEC; cálculo propio · consignatarias.com.ar</div></div>'
        f'<div><h3>USD FOB por tonelada</h3>{G2.lineas_mensuales(usd_t, ancho_mm=87, alto_mm=56, fmt=_miles, extremos=False, R=118, leyenda="USD FOB corrientes por t")}'
        f'<div class="nota">"Sin 0202.20": FOB y toneladas descontando esa partida, cociente propio sobre columnas '
        f'publicadas. Dólares corrientes (valores nominales). Fuente: INDEC; cálculo propio · consignatarias.com.ar</div></div></div>'
        f'{bloque_dest}'
        f'<div class="aviso">Toneladas en <strong>peso producto</strong> (lo que declara la Aduana), no en res con hueso: no '
        f'se comparan con la producción de la página de faena. Desde 2018 rige el secreto estadístico: los envíos de '
        f'destinos con pocos exportadores van al país 999 ("confidencial"), así que un destino puede no figurar un mes '
        f'sin haber dejado de comprar. {anio} es provisorio: el INDEC lo reemplaza entero cada mes. Fuente: INDEC '
        f'(CC BY-SA 4.0); las sumas por grupo de países y por año son cálculo propio.</div>'
    )


STOCK_CATS = [("total", "Total"), ("vacas", "Vacas"), ("vaquillonas", "Vaquillonas"), ("terneros", "Terneros"),
              ("terneras", "Terneras"), ("novillitos", "Novillitos"), ("novillos", "Novillos"),
              ("toros+toritos", "Toros y toritos")]


def p_ciclo_nacional(p: D.Paquete, x: D2.Extra) -> str:
    """
    La faena nacional del MAGyP (mes a mes, con un mes de rezago) y el stock al
    31/12 de SENASA. Va en página propia, después de la de Cañuelas: las dos series
    de hembras no se grafican juntas.
    """
    fm, st = x.faena, x.stock
    if not fm and not st:
        return ""
    partes = []
    if fm:
        u = fm["u"]
        ant = fm["ant"]
        mes = ym_largo(u["periodo"])
        vs = f" vs {D2.mes_corto(ant['periodo'])}" if ant else ""
        titulo = (f'Faena nacional de {mes}: {_miles(u["total"])} cabezas, {_d(abs(fm["var_total"]))}% '
                  f'{"más" if fm["var_total"] >= 0 else "menos"} que un año antes; las hembras, {_d(u["pct_hembras"])}%'
                  if fm["var_total"] is not None else f'Faena nacional de {mes}: {_miles(u["total"])} cabezas')
        filas = "".join(
            f'<tr><td>{G2.nombre_cat(f["cat"].upper() if f["cat"] == "mej" else f["cat"])}</td>'
            f'<td class="num fuerte">{_miles(f["cab"])}</td><td class="num">{_miles(f["cab_ant"]) if f["cab_ant"] else "—"}</td>'
            f'<td class="num">{_signo(f["var"]) if f["var"] is not None else "—"}</td><td class="num">{_d(f["share"])}%</td>'
            f'<td class="num">{f["peso"] or "—"}</td><td class="num">{f["peso_ant"] or "—"}</td></tr>'
            for f in fm["filas"]
        )
        ca = D2.mes_corto(u["periodo"])
        cb = D2.mes_corto(ant["periodo"]) if ant else "año anterior"
        partes.append(
            f'<h2>{titulo}</h2>'
            f'<div class="fichas">'
            f'{I.ficha("Faena", _miles(u["total"]), _var_ficha(fm["var_total"], detalle=vs))}'
            f'{I.ficha("Hembras", f"{_d(u["pct_hembras"])}%", _var_ficha(fm["pp_hembras"], " pp", detalle=vs))}'
            f'{I.ficha("Peso medio de res", f"{u["peso_medio_res_kg"]} kg", _var_ficha(fm["var_peso"], detalle=vs))}'
            f'{I.ficha("Producción", f"{_miles(u["produccion_t"])} t", _var_ficha(fm["var_prod"], detalle=vs))}'
            f'</div>'
            f'<h3>Hembras sobre la faena nacional, mes a mes</h3>'
            f'<figure>{G2.hembras_franja(fm["serie"], alto_mm=50)}'
            f'{pie(fm["procedencia"].fuente, propio=False, dato=mes, nota="% de hembras en cabezas, publicado por la fuente. Datos provisorios: cada edición revisa los meses anteriores.")}</figure>'
            f'<table class="chica apretada"><thead><tr><th>Categoría</th><th>Cabezas {ca}</th><th>{cb}</th><th>Var.</th>'
            f'<th>% del total</th><th>Kg res {ca}</th><th>{cb}</th></tr></thead><tbody>{filas}</tbody></table>'
            f'<p class="nota">Clasificación por dentición (Res. 32/2018): no hay columna de terneros, que entran en '
            f'novillito y vaquillona. Kg de res con hueso por cabeza. Fuente: MAGyP (SENASA + DNCCA), CC BY 4.0; '
            f'variaciones: cálculo propio · consignatarias.com.ar</p>'
        )
    if st:
        u, a = st["u"], st["ant"]
        vac = 100 * u["vacas_sobre_total"]
        partes.append(
            f'<h3 style="margin-top:3mm">Stock al 31/12/{u["periodo"]}: {_miles(u["total"])} cabezas, '
            f'{_d(abs(st["var_total"]))}% {"más" if st["var_total"] >= 0 else "menos"} que un año antes; las vacas, '
            f'{_d(vac)}% del total</h3>'
            f'<figure>{G2.stock_paneles(st["puntos"], STOCK_CATS, alto_mm=60)}'
            f'{pie(st["procedencia"].fuente, propio=False, dato=f"31/12/{u["periodo"]}", nota="Millones de cabezas. Cada panel tiene su propia escala: se leen los números escritos, no la pendiente. " + (f"{st["fuera"][0]}–{st["fuera"][-1]} no se grafican: la fuente los marca estimados. " if st["fuera"] else "") + "Toritos discriminados recién desde 2013 (cambio de clasificación).")}</figure>'
        )
    return "".join(partes)


TRIMESTRE = {1: ("diciembre", "febrero"), 2: ("enero", "marzo"), 3: ("febrero", "abril"), 4: ("marzo", "mayo"),
             5: ("abril", "junio"), 6: ("mayo", "julio"), 7: ("junio", "agosto"), 8: ("julio", "septiembre"),
             9: ("agosto", "octubre"), 10: ("septiembre", "noviembre"), 11: ("octubre", "diciembre"),
             12: ("noviembre", "enero")}
ORDINAL = {1: "primer", 2: "segundo", 3: "tercer", 4: "cuarto", 5: "quinto"}


def p_clima(p: D.Paquete, x: D2.Extra) -> str:
    """
    ENSO con el índice con el que clasifica el CPC (RONI desde el 01-02-2026) y la
    lluvia del último mes contra la normal 1991–2020 en las estaciones del corredor.
    Sin pronóstico: no hay uno descargable, y no se dibuja uno a ojo.
    """
    c = x.clima
    if not c or (not c.get("enso") and not c.get("lluvias")):
        return ""
    partes = []
    if c.get("enso"):
        u = c["enso_u"]
        m = int(u["periodo"][5:7])
        desde, hasta = TRIMESTRE[m]
        racha = c.get("enso_racha_nino") or 0
        val = f'{u["roni"]:+.2f}'.replace(".", ",")
        if racha:
            cola = (f', el {ORDINAL.get(racha, f"{racha}.º")} trimestre seguido por encima del umbral de El Niño'
                    if racha > 1 else ", por encima del umbral de El Niño")
        else:
            cola = ""
        proc = c["enso_procedencia"]
        partes.append(
            f'<h2>El RONI de {desde}–{hasta} de {u["periodo"][:4]} midió {val} °C{cola}</h2>'
            f'<p class="ancho">Desde el 1 de febrero de 2026 el Centro de Predicción Climática de la NOAA (CPC) clasifica '
            f'El Niño y La Niña con el <span class="fuerte">RONI</span> (índice relativo del Niño Oceánico, aviso NWS PNS '
            f'26-05), no con el ONI: el ONI va como comparación. Un episodio oficial pide cinco trimestres seguidos del '
            f'mismo lado del umbral de ±0,5 °C; '
            + (f'van {racha}, así que el CPC todavía no lo da por establecido.' if 0 < racha < 5 else
               'la serie lo cumple.' if racha >= 5 else 'hoy no hay racha en curso.')
            + f' Dato del CPC actualizado al trimestre {u["temporada"]} {u["periodo"][:4]}, bajado el '
            f'{fecha_ar(proc.fecha_observacion)}; los últimos valores se revisan cada mes.</p>'
            f'<figure>{G2.enso_barras(c["enso"], alto_mm=58)}'
            f'{pie("NOAA Climate Prediction Center, RONI y ONI (Niño 3.4, ERSSTv5)", propio=False, dato=f"{desde}–{hasta} de {u["periodo"][:4]}", nota="Dominio público. Cada columna es un trimestre móvil fechado en su mes central.")}</figure>'
        )
    if c.get("lluvias"):
        mes = c["lluvias_mes"]
        tres = c["lluvias_tres"]
        filas, sin = [], []
        from fuentes_nuevas.lluvias import ESTACIONES
        orden = [w for w, _, _ in ESTACIONES]
        for e in sorted(c["lluvias"], key=lambda e: orden.index(e["wmo"]) if e["wmo"] in orden else 99):
            q = e["meses"].get(mes)
            nombre = f'{e["estacion"]} ({e["provincia"]})'
            if not q or q.get("pct_normal") is None:
                sin.append(nombre)
                continue
            rot = f'{_miles(q["pct_normal"])}% · {_miles(q["precipitacion_mm"])} de {_miles(q["normal_mm"])} mm'
            tr = [e["meses"].get(m_) for m_ in tres]
            if len(tres) == 3 and all(t_ and t_.get("normal_mm") for t_ in tr):
                acum = 100 * sum(t_["precipitacion_mm"] for t_ in tr) / sum(t_["normal_mm"] for t_ in tr)
                rot += f' · trim. {_miles(acum)}%'
            filas.append({"nombre": nombre, "pct": q["pct_normal"], "rot": rot})
        abajo = sum(1 for f_ in filas if f_["pct"] < 100)
        proc = c["lluvias_procedencia"]
        tri = f'{D2.MESES_AB_ES[int(tres[0][5:7])]}–{D2.MESES_AB_ES[int(tres[-1][5:7])]}' if len(tres) == 3 else ""
        partes.append(
            f'<h3 style="margin-top:2mm">Lluvia de {ym_largo(mes)}: {abajo} de {len(filas)} estaciones por debajo de su '
            f'normal 1991–2020</h3>'
            f'<figure>{G2.barras_lluvia(filas, fila_h=16)}'
            f'{pie("SMN vía mensajes CLIMAT de la OMM, publicados por el Deutscher Wetterdienst; normal 1991–2020 de cada estación", dato=ym_largo(mes), nota=f"Estaciones de norte a sur. % de la normal = lluvia del mes ÷ normal del mes. " + (f"«trim.»: {tri} sumados contra la suma de sus normales. " if tri else "") + "CC BY 4.0 (DWD). Datos sin el control de calidad completo del DWD: pueden corregirse.")}</figure>'
            f'<div class="aviso">El NEA casi no tiene cobertura: Corrientes y Mercedes (Ctes.) no transmiten el CLIMAT '
            f'completo, así que no figuran; lo más cercano son Reconquista, Ceres y Paraná. Un mes no transmitido no es '
            f'un cero: no aparece.'
            + (f' Sin dato de {ym_largo(mes)}: {I.esc(", ".join(sin))}.' if sin else "") + '</div>'
        )
    return "".join(partes)


# ─── armado ────────────────────────────────────────────────────────────────────

#: El orden de la edición. La Banda, que es el número propio, va primero; después
#: los gráficos largos en dólares, el precio real, la brecha contra el mundo y la
#: exportación; el ciclo (Cañuelas y después el nacional, en páginas separadas) y el
#: clima; los remates; metodología y contacto, y al final el
#: anexo. Con todas las fuentes, 17 páginas (el tope es 18). La planilla para completar
#: a mano ("Tu lote, tu cuenta") se sacó por pedido de José: en su lugar, la
#: metodología manda a la herramienta de valuación del sitio.
PAGINAS = [
    (p_tapa, True), (p_resumen, False), (p_banda1, False), (p_banda2, False), (p_historia, False),
    (p_real, False), (p_estacional, False), (p_mundo, False), (p_exportacion, False), (p_relativos, False),
    (p_ciclo, False), (p_ciclo_nacional, False), (p_clima, False), (p_tierra, False),
    (p_remates, False), (p_metodologia, False), (p_anexo, False),
]

NOMBRE_PAGINA = {
    "p_banda1": f"{BANDA} en el tiempo", "p_banda2": f"{BANDA} por peso", "p_historia": "serie larga en dólares",
    "p_estacional": "estacionalidad", "p_mundo": "brecha internacional", "p_relativos": "precios relativos",
    "p_ciclo": "proporción de hembras", "p_tierra": "valor de la tierra", "p_remates": "remates del mes",
    "p_anexo": "anexo de subcategorías",
    "p_real": "precio real (IPC)", "p_exportacion": "exportación", "p_ciclo_nacional": "faena y stock nacional",
    "p_clima": "clima",
}


def construir(p: D.Paquete, x: D2.Extra) -> tuple[str, list[str]]:
    """
    Devuelve el HTML y la lista de páginas que no fueron por falta de dato. Una
    página sin dato devuelve "" y se saca: el folio se numera con las que quedan, y
    la página se anota en la línea de ausencias (págs. 2 y 13). Una página que
    rompe por un error de datos tampoco corta la edición: se omite y se anota.
    """
    def armar(fn) -> str:
        try:
            return fn(p, x)
        except Exception as e:  # noqa: BLE001 — una página accesoria no tira la edición
            if fn in (p_tapa, p_resumen, p_metodologia):
                raise
            print(f"  ⚠ {fn.__name__} se omite: {e}")
            return ""

    ventana = (f"{fecha_ar(p.mes.desde)} → {fecha_ar(p.mes.hasta)} · {n_ruedas(p, x)} ruedas"
               + (f" ({len(p.ruedas_mes)} con índice)" if n_ruedas(p, x) != len(p.ruedas_mes) else ""))
    hechas = {fn: armar(fn) for fn, _ in PAGINAS if fn not in (p_resumen, p_metodologia)}
    sin_dato = [fn.__name__ for fn, html in hechas.items() if not html]
    for n in sin_dato:
        etiqueta = f"página de {NOMBRE_PAGINA.get(n, n)}: sin dato"
        if etiqueta not in x.faltantes:
            x.faltantes.append(etiqueta)
    hechas[p_resumen] = p_resumen(p, x)
    hechas[p_metodologia] = p_metodologia(p, x)
    orden = [(fn, tapa) for fn, tapa in PAGINAS if hechas.get(fn)]
    total = len(orden)
    cuerpo = "".join(I.hoja(hechas[fn], i + 1, total, ventana, tapa) for i, (fn, tapa) in enumerate(orden))

    plantilla = (AQUI / "plantilla_v2.html").read_text(encoding="utf-8")
    ctx = {"cuerpo": cuerpo, "fuentes": I.fuentes_embebidas(), "mes_etiqueta": p.mes.etiqueta}
    esperadas = set(re.findall(r"\$(\w+)", plantilla))
    if esperadas - set(ctx):
        raise RuntimeError(f"la plantilla pide claves que el contexto no trae: {esperadas - set(ctx)}")
    if set(ctx) - esperadas:
        raise RuntimeError(f"el contexto trae claves muertas: {set(ctx) - esperadas}")
    return Template(plantilla).substitute(ctx), sin_dato
