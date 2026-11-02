#!/usr/bin/env python3
"""
El Corredor v2 — armado del informe.

Va detrás del flag `--v2` de `informe.py` y `publish.py`: sin el flag, la
corrida del 1 de cada mes sigue siendo la del v1, byte por byte. Este archivo no
toca nada del v1; reusa sus utilidades (`esc`, `ficha`, `delta`, `hoja`,
`fuentes_embebidas`, la planilla y los remates del mes que viene).

QUÉ CAMBIA CONTRA EL V1
· Más historia: el novillito desde 2006, la estacionalidad (espagueti y mapa de
  calor) y la banda de cada categoría en el tiempo.
· Comparación fija: un semáforo con 1 semana, 4 semanas, interanual y contra el
  promedio de 5 años, que es lo que separa a los informes de referencia.
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


# ─── utilidades ────────────────────────────────────────────────────────────────

def cita(p: D.Paquete) -> str:
    """La línea de cita, la misma en el PDF y en cada pieza para redes."""
    return (f"El Corredor, {p.mes.etiqueta} — consignatarias.com.ar, el mercado ganadero "
            f"argentino, medido. consignatarias.com.ar/el-corredor")


def pie(fuente: str, propio: bool = True, fecha: str | None = None, nota: str = "") -> str:
    """
    El pie de cada figura. Va con la forma "Fuente: X; cálculo propio" porque es lo
    que sobrevive al recorte: el gráfico suelto, mandado por WhatsApp, se sigue
    pudiendo citar.
    """
    clase = "propio" if propio else "externo"
    calc = "; cálculo propio" if propio else ""
    f = f" Dato al {fecha}." if fecha else ""
    n = f" {I.esc(nota)}" if nota else ""
    return (f'<figcaption class="{clase}"><span class="marca-dato"></span>'
            f'Fuente: {I.esc(fuente)}{calc}.{f}{n} · consignatarias.com.ar</figcaption>')


def flecha(v: float | None, suf: str = "%", color: bool = True, dec: int = 1) -> str:
    """Flecha + variación. Sin color cuando el signo no tiene una lectura obvia."""
    if v is None:
        return '<span class="delta neutro">sin comparable</span>'
    f = "↑" if v > 0 else ("↓" if v < 0 else "→")
    clase = "neutro" if not color or v == 0 else ("sube" if v > 0 else "baja")
    num = f"{v:+.{dec}f}".replace(".", ",")
    return f'<span class="delta {clase}">{f} {num}{suf}</span>'


def _celda(v: float | None, color: bool) -> str:
    """Una celda del semáforo: verde o rojo SOLO si la fila tiene lectura de signo clara."""
    if v is None:
        return '<td class="num sd">—</td>'
    clase = ""
    if color and abs(v) >= 0.5:
        clase = " s-sube" if v > 0 else " s-baja"
    f = "↑" if v > 0 else ("↓" if v < 0 else "→")
    return f'<td class="num{clase}">{f} {G.pct(v)}</td>'


def _valor(fila: dict) -> str:
    return G.usd(fila["ultimo"]) if fila["unidad"].startswith("USD") else G.ars(fila["ultimo"])


def _d(v: float) -> str:
    """Un decimal con coma, como se escribe en Argentina (el `_f` del v1 deja el punto)."""
    return G._f(v).replace(".", ",")


def _pp(v: float) -> str:
    return f"{v:+.1f}".replace(".", ",") + " pp"


def _miles(n: float) -> str:
    return f"{round(n):,}".replace(",", ".")


# ─── datos de una sola vez (para el PDF y las piezas) ──────────────────────────

def cuatro_numeros(p: D.Paquete, x: D2.Extra) -> list[dict]:
    """
    Los 4 números del mes, los mismos en la tapa y en las piezas. Si uno no tiene
    dato, no se dibuja: la tapa queda con tres antes que con un número inventado.
    """
    out = []
    if p.promedio_usd:
        out.append({"et": "Novillo en dólares", "val": G.usd(p.promedio_usd),
                    "delta": flecha(p.variacion("usd_blue", 1)), "nota": "promedio del mes al blue · vs mes anterior",
                    "texto_delta": p.variacion("usd_blue", 1)})
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        prev = p.liquidacion.puntos[-2] if len(p.liquidacion.puntos) > 1 else None
        out.append({"et": "Hembras operadas", "val": f'{_d(u["pct"])}%',
                    "delta": flecha(round(u["pct"] - prev["pct"], 1) if prev else None, " pp", color=False),
                    "nota": f'{u["ym"]} · Cañuelas · vs mes anterior', "texto_delta": None})
    act, prev, _ = D2.amplitud_contra(p, "NOVILLO")
    if act is not None:
        out.append({"et": "Banda del novillo", "val": f"{_d(act)}%",
                    "delta": flecha(round(act - prev, 1) if prev is not None else None, " pp", color=False),
                    "nota": "amplitud P10–P90 · vs 4 semanas antes", "texto_delta": None})
    intl = x.internacional
    eeuu = next((q for q in intl.get("paises") or [] if q["pais"] == "Estados Unidos"), None)
    if eeuu:
        out.append({"et": "Brecha con EE.UU.", "val": f'×{G2._num(eeuu["ratio"])}',
                    "delta": '<span class="delta neutro">primera medición: sin serie previa</span>',
                    "nota": f'EE.UU. {G.usd(eeuu["usd_kg_vivo"])} vs Argentina {G.usd(intl["argentina"])} por kg vivo',
                    "texto_delta": None})
    return out


def hechos(p: D.Paquete, x: D2.Extra) -> list[str]:
    """Los cinco hechos de la página 2. Cada uno con el número y nada más."""
    out = []
    c = p.cierre
    v1, v12, vu12 = p.variacion("ars", 1), p.variacion("ars", 12), p.variacion("usd_blue", 12)
    if v1 is not None and v12 is not None:
        anterior = D.MESES[(p.mes.mes - 2) % 12 + 1]
        out.append(f'El Índice Novillo cerró en <span class="fuerte">{G.ars(c["ars"])}</span> por kilo vivo; '
                   f'el promedio del mes {"subió" if v1 > 0 else "bajó"} {G.pct(abs(v1)).lstrip("+")} contra {anterior} '
                   f'y {G.pct(v12)} en doce meses.')
    if vu12 is not None:
        out.append(f'En dólares el promedio fue <span class="fuerte">{G.usd(p.promedio_usd)}</span>, '
                   f'{G.pct(vu12)} interanual.')
    act, prev, _ = D2.amplitud_contra(p, "NOVILLO")
    if act is not None and prev is not None:
        out.append(f'La banda del novillo midió <span class="fuerte">{_d(act)}%</span> entre P10 y P90, '
                   f'contra {_d(prev)}% cuatro semanas antes.')
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        vals = sorted(q["pct"] for q in p.liquidacion.puntos)
        med = vals[len(vals) // 2] if len(vals) % 2 else (vals[len(vals) // 2 - 1] + vals[len(vals) // 2]) / 2
        out.append(f'Las hembras fueron el <span class="fuerte">{_d(u["pct"])}%</span> de las cabezas operadas en Cañuelas; '
                   f'la mediana de los {len(vals)} meses medidos es {_d(med)}%.')
    eeuu = next((q for q in x.internacional.get("paises") or [] if q["pais"] == "Estados Unidos"), None)
    if eeuu:
        out.append(f'El kilo vivo vale <span class="fuerte">{G.usd(eeuu["usd_kg_vivo"])}</span> en Estados Unidos y '
                   f'{G.usd(x.internacional["argentina"])} en Argentina: ×{G2._num(eeuu["ratio"])}.')
    return out[:5]


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
        f'<p class="bajada">{p.mes.etiqueta.capitalize()} · {len(p.ruedas_mes)} ruedas del Mercado Agroganadero · '
        f'edición del {G.fecha_larga_es(date.today().isoformat())}</p>'
        f'<div class="tapa-hero"><div><p class="rotulo">Índice Novillo al cierre del mes</p>'
        f'<div class="hero">{G.ars(c["ars"])}</div>'
        f'<div class="hero-sub">por kilo vivo · {G.usd(c["usd_blue"])} al blue · rueda del {G.fecha_larga_es(c["fecha"])}</div></div>'
        f'<div class="tapa-spark">{spark}<div class="nota">Promedio mensual en dólares, últimos 24 meses</div></div></div>'
        f'<p class="rotulo" style="margin-top:12mm">Los cuatro números del mes</p>'
        f'<div class="grid4">{tarjetas}</div>'
        f'<div class="cita-caja" style="margin-top:12mm"><div class="rotulo">Para citar este informe</div>'
        f'<div class="cita-txt">{I.esc(cita(p))}</div></div>'
        f'<p class="nota" style="position:absolute;bottom:16mm;left:15mm;right:15mm">Memola Medios SAS · '
        f'Cada número de este informe va con su fuente y su fecha. Lo que no tiene base suficiente, no se publica.</p>'
    )


def mes_en_numeros(p: D.Paquete) -> str:
    """Las ruedas del mes en cuatro fichas: promedio, la más alta, la más baja y las cabezas."""
    r = p.ruedas_mes
    if not r:
        return ""
    alta = max(r, key=lambda q: q["ars"])
    baja = min(r, key=lambda q: q["ars"])
    cab = sum(q.get("cabezas") or 0 for q in r)
    return (
        f'<div class="fichas">'
        f'{I.ficha("Promedio del mes", G.ars(p.promedio_ars), f"<div class=delta>{len(r)} ruedas</div>")}'
        f'{I.ficha("Rueda más alta", G.ars(alta["ars"]), f"<div class=delta>{G.fecha_es(alta['fecha'])}</div>")}'
        f'{I.ficha("Rueda más baja", G.ars(baja["ars"]), f"<div class=delta>{G.fecha_es(baja['fecha'])}</div>")}'
        f'{I.ficha("Cabezas del índice", _miles(cab), "<div class=delta>suma de las ruedas</div>")}'
        f'</div>'
    )


def p_resumen(p: D.Paquete, x: D2.Extra) -> str:
    filas = "".join(
        f'<tr><td>{I.esc(f["nombre"])}<span class="unidad">{f["unidad"]}</span></td>'
        f'<td class="num fuerte">{_valor(f)}</td>'
        f'{_celda(f["s1"], f["color"])}{_celda(f["s4"], f["color"])}{_celda(f["ia"], f["color"])}{_celda(f["p5"], f["color"])}</tr>'
        for f in x.semaforo
    )
    # SIO Carnes no es página del v2 (se saca hasta que haya datos), así que no se
    # declara como algo que faltó: no se prometió.
    faltan = [f for f in p.faltantes if not f.startswith("SIO")] + x.faltantes
    aviso = (f'<div class="aviso">Lo que esta edición no pudo medir: {I.esc(", ".join(faltan))}. '
             f'Se declara antes que completarlo con una estimación.</div>') if faltan else ""
    base5 = f"{p.mes.anio - D2.ANIOS_PROMEDIO}–{p.mes.anio - 1}"
    return (
        f'<h2>Si sólo leés una página, es ésta</h2>'
        f'<ol class="lista-num compacta">' + "".join(f"<li>{h}</li>" for h in hechos(p, x)) + "</ol>"
        f'{mes_en_numeros(p)}'
        f'<h3 style="margin-top:2mm">Cuánto se movió cada precio</h3>'
        f'<table class="semaforo"><thead><tr><th>Serie</th><th>Último</th><th>1 semana</th><th>4 semanas</th>'
        f'<th>Interanual</th><th>vs prom. {base5}</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">1 y 4 semanas: último dato del mes contra el último dato de 7 y 28 días antes. Interanual y '
        f'promedio de 5 años: promedio del mes contra el mismo mes de cada año. Verde y rojo solo en dólares, donde '
        f'subir quiere decir que el kilo vale más; en pesos la inflación hace ambiguo el signo, y contra cinco años no '
        f'se compara. Las medianas de la banda VR tienen serie desde junio de 2026: solo ventanas cortas. Fuente: MAG '
        f'(Índice Novillo, novillito, lotes) y dólar blue; cálculo propio · consignatarias.com.ar</p>'
        f'{aviso}'
    )


def p_historia(p: D.Paquete, x: D2.Extra) -> str:
    vu12 = p.variacion("usd_blue", 12)
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
            f'<h3>Novillito: {G.usd(actual["usd_blue"])} en {p.mes.nombre}, el {rango}.º valor más alto de '
            f'{len(con_b)} meses desde {con_b[0]["ym"][:4]}</h3>'
            f'<figure>{G2.novillito_largo(nov_mens, alto_mm=56)}'
            f'{pie("MAG, serie de novillito por rueda; dólar oficial (desde 2006) y blue (desde 2011)", fecha=x.novillito.fecha_dato, nota="Sin ajuste por inflación de EE.UU.: es dólar corriente.")}</figure>'
        )
    titulo = (f'El novillo promedió {G.usd(p.promedio_usd)} en {p.mes.nombre}, {G.pct(vu12)} contra un año atrás'
              if vu12 is not None else "El novillo en dólares, desde 2015")
    anual: dict[str, list[float]] = {}
    for q in p.mensual("usd_blue"):
        anual.setdefault(q["ym"][:4], []).append(q["valor"])
    filas = "".join(
        f'<tr><td>{a}{"*" if len(v) < 12 else ""}</td><td class="num">{G.usd(sum(v) / len(v))}</td></tr>'
        for a, v in sorted(anual.items())[-8:]
    )
    return (
        f'<h2>{titulo}</h2>'
        f'<figure>{G.linea_dolares(p.inmag.puntos, alto_mm=58)}'
        f'{pie("MAG (Índice Novillo), empalme Liniers→MAG y dólar blue y oficial", fecha=p.inmag.fecha_dato, nota="Área sombreada: brecha entre el blue y el oficial.")}</figure>'
        f'{bloque_nov}'
        f'<div class="dos"><div>{G.base100(p.mensual("ars"), p.mensual("usd_blue"), p.mes.ym)}'
        f'<div class="nota">Pesos y dólares a base 100 doce meses atrás: la distancia entre las líneas es cuánto de la suba '
        f'fue nominal. Fuente: MAG (Índice Novillo) y dólar blue; cálculo propio · consignatarias.com.ar</div></div>'
        f'<div><h3>Índice Novillo, promedio anual en dólares</h3><table class="chica"><thead><tr><th>Año</th><th>USD/kg (blue)</th></tr></thead>'
        f'<tbody>{filas}</tbody></table><div class="nota">* Año incompleto: promedio de los meses con dato.</div></div></div>'
    )


def p_estacional(p: D.Paquete, x: D2.Extra) -> str:
    mens = p.mensual("usd_blue")
    est = x.estacional
    if not est.get("indice"):
        return ""
    idx = est["indice"]
    tip = idx.get(p.mes.mes)
    barato = min(idx, key=idx.get)
    caro = max(idx, key=idx.get)
    por = {q["ym"]: q["valor"] for q in mens}
    base = [por.get(f"{p.mes.anio - k:04d}-{p.mes.mes:02d}") for k in range(1, D2.ANIOS_PROMEDIO + 1)]
    prom5 = sum(base) / len(base) if all(base) else None
    actual = por.get(p.mes.ym)
    titulo = (f'{p.mes.nombre.capitalize()} cerró en {G.usd(actual)}; el promedio de {p.mes.nombre} '
              f'{p.mes.anio - D2.ANIOS_PROMEDIO}–{str(p.mes.anio - 1)[2:]} es {G.usd(prom5)}'
              if actual and prom5 else "La forma del año, en dólares")
    return (
        f'<h2>{titulo}</h2>'
        f'<p class="ancho">Índice típico de {p.mes.nombre}: <span class="fuerte">{G2._num(tip, 3) if tip else "—"}</span> '
        f'(1,000 = un mes cualquiera). El mes más barato del año suele ser {D.MESES[barato]} ({G2._num(idx[barato], 3)}) y el '
        f'más caro {D.MESES[caro]} ({G2._num(idx[caro], 3)}), sobre {est["anios"]} años.</p>'
        f'<figure>{G2.espagueti(mens, p.mes.anio, alto_mm=74)}'
        f'{pie("MAG (Índice Novillo) y dólar blue", fecha=p.inmag.fecha_dato, nota="Gris: cada año completo desde 2015. Punteado: promedio de los últimos cinco años completos.")}</figure>'
        f'<h3>Cuánto se apartó cada mes de su propio entorno, en %</h3>'
        f'<figure>{G2.mapa_calor(est["razon"], idx)}'
        f'{pie("MAG (Índice Novillo) y dólar blue", nota="Razón sobre la media móvil centrada de 12 meses, la cuenta de la tool price_seasonality. Los últimos seis meses no tienen celda: la media centrada necesita medio año por delante.")}</figure>'
    )


def p_banda1(p: D.Paquete, x: D2.Extra) -> str:
    if not len(x.bandas_hist):
        return ""
    nov = next((s for s in x.bandas_hist.puntos if s["categoria"] == "NOVILLO"), None)
    if nov and nov["puntos"][0].get("amplitud") is not None:
        a0, a1 = nov["puntos"][0]["amplitud"], nov["puntos"][-1]["amplitud"]
        f0 = date.fromisoformat(nov["puntos"][0]["fecha"])
        titulo = (f'La banda del novillo pasó de {_d(a0)}% a {_d(a1)}% de amplitud desde el '
                  f'{f0.day} de {D.MESES[f0.month]}')
    else:
        titulo = "La banda de precio de cada categoría, en el tiempo"
    filas = "".join(
        f'<tr><td>{I.esc(b["categoria"].capitalize())}</td><td class="num">{G.ars(b["p10"])}</td>'
        f'<td class="num">{G.ars(b.get("mediana") or 0)}</td><td class="num">{G.ars(b["p90"])}</td>'
        f'<td class="num">{_d(b.get("amplitud_pct") or 0)}%</td><td class="num">{b.get("lotes")}</td>'
        f'<td class="num">{_miles(b.get("cabezas") or 0)}</td></tr>'
        for b in sorted(p.bandas.puntos, key=lambda b: b.get("mediana") or 0, reverse=True)
    )
    return (
        f'<h2>{titulo}</h2>'
        f'<p class="ancho">Lo que se paga barato y lo que se paga caro por la misma categoría, en cada ventana de 30 días '
        f'desde que existe la serie. El área va del percentil 10 al 90 de los lotes; la línea es la mediana. Misma escala '
        f'en los seis paneles.</p>'
        f'<figure>{G2.grilla_bandas(x.bandas_hist.puntos, alto_mm=128)}'
        f'{pie("MAG, operaciones de lote (Valor de Referencia VR v1.0)", fecha=x.bandas_hist.fecha_dato, nota="Ventana móvil de 30 días: dos puntos vecinos comparten 29 días de lotes.")}</figure>'
        f'<table><thead><tr><th>Categoría</th><th>P10</th><th>Mediana</th><th>P90</th><th>Amplitud</th><th>Lotes</th><th>Cabezas</th></tr></thead>'
        f'<tbody>{filas}</tbody></table>'
        f'<p class="nota">Ventana de 30 días al {p.bandas.fecha_dato}. Con menos de 10 lotes una categoría no se publica; con menos de 30 se marca como base fina.</p>'
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
    sub = ""
    if len(p.subcategorias):
        filas = "".join(
            f'<tr><td>{I.esc(s["nombre"])}</td><td class="num">{_miles(s["cabezas"])}</td>'
            f'<td class="num">{s["kg_promedio"] or "—"}</td><td class="num">{G.ars(s["minimo"] or 0)}</td>'
            f'<td class="num">{G.ars(s["mediana"] or 0)}</td><td class="num fuerte">{G.ars(s["promedio"] or 0)}</td>'
            f'<td class="num">{G.ars(s["maximo"] or 0)}</td></tr>'
            for s in p.subcategorias.puntos
        )
        sub = (f'<h3>Las {len(p.subcategorias)} subcategorías del MAG, mes cerrado</h3>'
               f'<table class="chica apretada"><thead><tr><th>Subcategoría</th><th>Cabezas</th><th>Kg prom.</th><th>Mín.</th>'
               f'<th>Mediana</th><th>Promedio</th><th>Máx.</th></tr></thead><tbody>{filas}</tbody></table>'
               f'<p class="nota">Fuente: Mercado Agroganadero, informe por categoría (Resol. 32/2018) del mes cerrado · '
               f'consignatarias.com.ar. El promedio es el ponderado que publica el MAG; el kilo promedio sale de dividir los '
               f'kilos totales por las cabezas.</p>')
    return (
        f'<h2>{titulo}</h2>'
        f'<figure>{G2.escalera_pesos(p.por_peso.puntos, fila_h=12)}'
        f'{pie("MAG, operaciones de lote por rango de 50 kg (Valor de Referencia VR v1.0)", fecha=p.por_peso.fecha_dato, nota="Barra: P10 a P90. Punto: mediana. Barra hueca: menos de 30 lotes.")}</figure>'
        f'{sub}'
    )


def p_relativos(p: D.Paquete, x: D2.Extra) -> str:
    if not len(p.maiz) and not len(x.relativos):
        return ""
    bloque_rel = ""
    if len(x.relativos):
        vaca = next((s for s in x.relativos.puntos if s["categoria"] == "VACA"), None)
        tit = (f'La vaca vale {G2._num(vaca["puntos"][-1]["relacion"])} del novillo'
               if vaca else "Cada categoría contra el novillo")
        bloque_rel = (
            f'<h3>{tit}</h3>'
            f'<figure>{G2.relativos_paneles(x.relativos.puntos, alto_mm=58)}'
            f'{pie("MAG, operaciones de lote (mediana de la banda VR de cada categoría sobre la del novillo)", fecha=x.relativos.fecha_dato, nota="Línea punteada: promedio de la propia serie, que empieza en junio de 2026.")}</figure>'
        )
        nov = next((b for b in p.bandas.puntos if b["categoria"] == "NOVILLO"), None)
        if nov and nov.get("mediana"):
            filas = "".join(
                f'<tr><td>{G2.nombre_cat(b["categoria"])}</td><td class="num">{G.ars(b["mediana"])}</td>'
                f'<td class="num fuerte">{G2._num(b["mediana"] / nov["mediana"])}</td><td class="num">{b["lotes"]}</td></tr>'
                for b in sorted(p.bandas.puntos, key=lambda b: b.get("mediana") or 0, reverse=True) if b.get("mediana")
            )
            bloque_rel += (f'<table class="chica"><thead><tr><th>Categoría</th><th>Mediana $/kg</th><th>Sobre el novillo</th>'
                           f'<th>Lotes</th></tr></thead><tbody>{filas}</tbody></table>'
                           f'<p class="nota">Ventana de 30 días al {p.bandas.fecha_dato}. Fuente: MAG, operaciones de lote; cálculo propio · consignatarias.com.ar</p>')
    m = p.maiz.puntos[-1] if p.maiz.puntos else None
    titulo = (f'Un kilo de novillo compró {_d(m["relacion"])} kg de maíz en {m["ym"]}'
              if m else "Precios relativos")
    return (
        f'<h2>{titulo}</h2>'
        f'<figure>{G.ratio_maiz(p.maiz.puntos, alto_mm=56)}'
        f'{pie("MAG (Índice Novillo), maíz FOB (MAGyP) y dólar blue", fecha=p.maiz.fecha_dato, nota="Por encima de 12 el grano es barato contra la hacienda.")}</figure>'
        f'{bloque_rel}'
        f'<div class="aviso">No hay relación ternero/novillo en este informe. El Mercado Agroganadero no opera terneros, '
        f'así que cualquier precio de ternero sería un derivado del índice y la relación saldría circular.</div>'
    )


def p_ciclo(p: D.Paquete, x: D2.Extra) -> str:
    if not p.liquidacion.puntos:
        return ""
    u = p.liquidacion.puntos[-1]
    vals = sorted(q["pct"] for q in p.liquidacion.puntos)
    n = len(vals)
    med = vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2
    nac = p.nacional or {}
    bloque_nac = ""
    if nac.get("pct"):
        bloque_nac = (f'<div class="aviso">A nivel nacional, las hembras fueron el {_d(nac["pct"])}% de la faena '
                      f'(acumulado del año; {I.esc(nac.get("fuente"))}). <strong>No se compara con la serie de arriba</strong>: '
                      f'Cañuelas concentra venta de vientres y corre quince a veinte puntos por encima del país.</div>')
    filas = "".join(
        f'<tr><td>{q["ym"]}</td><td class="num">{_d(q["pct"])}%</td><td class="num">{_miles(q["cabezas"])}</td>'
        f'<td class="num">{_miles(q["lotes"])}</td></tr>' for q in p.liquidacion.puntos[-6:]
    )
    return (
        f'<h2>Hembras: {_d(u["pct"])}% de lo operado en {D.MESES[int(u["ym"][5:])]}, {_pp(u["pct"] - med)} '
        f'contra la mediana propia</h2>'
        f'<figure>{G2.hembras_franja(p.liquidacion.puntos, alto_mm=72)}'
        f'{pie("MAG, cabezas operadas en Cañuelas por lote", fecha=p.liquidacion.fecha_dato, nota="Hembras = vacas y vaquillonas sobre todas las cabezas del mes. Meses con menos de 5.000 cabezas no se publican.")}</figure>'
        f'{bloque_nac}'
        f'<div class="dos"><div><h3>Hembras por mes</h3><table><thead><tr><th>Mes</th><th>Hembras</th><th>Cabezas</th><th>Lotes</th></tr></thead>'
        f'<tbody>{filas}</tbody></table></div>'
        f'<div><h3>Qué entró al mercado en el mes</h3>{G.barras_composicion(p.composicion.puntos)}'
        f'<div class="nota">Cabezas operadas por categoría. Fuente: MAG, lotes; cálculo propio.</div></div></div>'
    )


def p_remates(p: D.Paquete, x: D2.Extra) -> str:
    rm = x.remates_mes
    if not rm:
        return ""
    prov = [(D2_prov(k), v, str(v)) for k, v in rm["por_provincia"][:10]]
    tipos = " · ".join(f"{k} {v}" for k, v in rm["por_tipo"])
    tabla = calendario_compacto(p)
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
        f'<h3>Los del mes que viene</h3>{tabla}'
    )


def calendario_compacto(p: D.Paquete, maximo: int = 16) -> str:
    """
    El calendario del mes que viene, uno por jornada. La tabla del v1 toma hasta dos
    por día y ocupa una página entera; acá comparte página con el mes cerrado.
    """
    r = p.remates or {}
    vistos: set[str] = set()
    filas = []
    for q in r.get("proximos") or []:
        d = str(q.get("date"))[:10]
        if d in vistos:
            continue
        vistos.add(d)
        filas.append(f'<tr><td>{I.esc(G.fecha_es(d))}</td><td>{I.esc(G._corto(str(q.get("consignatariaName") or ""), 34))}</td>'
                     f'<td>{I.esc(G._corto(str(q.get("location") or "—"), 40))}</td></tr>')
        if len(filas) >= maximo:
            break
    if not filas:
        return '<p class="nota">Sin remates cargados para el mes que viene al cierre de esta edición.</p>'
    return (f'<table class="chica apretada"><thead><tr><th>Fecha</th><th>Firma</th><th>Lugar</th></tr></thead>'
            f'<tbody>{"".join(filas)}</tbody></table>'
            f'<p class="nota">{len(r.get("proximos") or [])} remates convocados para {I.esc(r.get("mes"))} en '
            f'{len(r.get("por_dia") or {})} jornadas al cierre de esta edición; se muestra uno por jornada. El calendario '
            f'completo está en consignatarias.com.ar/remates · {I.esc(r.get("fuente"))}.</p>')


def D2_prov(k: str) -> str:
    """Provincia en nombre propio: el calendario la guarda en mayúsculas y sin tildes."""
    tildes = {"CORDOBA": "Córdoba", "ENTRE RIOS": "Entre Ríos", "RIO NEGRO": "Río Negro", "NEUQUEN": "Neuquén",
              "TUCUMAN": "Tucumán", "SIN PROVINCIA": "Sin provincia", "CAPITAL FEDERAL": "CABA"}
    return tildes.get(k, k.title().replace(" Del ", " del ").replace(" De ", " de "))


def p_mundo(p: D.Paquete, x: D2.Extra) -> str:
    intl = x.internacional
    if not intl:
        return ""
    ar = intl["argentina"]
    filas_g = [(q["pais"], q["usd_kg_vivo"], f'{G.usd(q["usd_kg_vivo"])} · ×{G2._num(q["ratio"])}') for q in intl["paises"]]
    filas_g.append(("Argentina", ar, G.usd(ar)))
    filas_g.sort(key=lambda f: f[1], reverse=True)
    eeuu = intl["paises"][0]
    tabla = "".join(
        f'<tr><td>{I.esc(q["pais"])}</td><td class="num">{G.usd(q["usd_kg_vivo"])}</td><td>{I.esc(q["nativo"])}</td>'
        f'<td>{I.esc(q["fecha"])}</td><td>{I.esc(q["fuente"])}</td></tr>' for q in intl["paises"]
    )
    atrib = sorted({q.get("atribucion") for q in intl["paises"] if q.get("atribucion")})
    return (
        f'<h2>Un novillo de 450 kg: USD {_miles(ar * 450)} en Argentina, USD {_miles(eeuu["usd_kg_vivo"] * 450)} en {eeuu["pais"]}</h2>'
        f'<figure>{G2.barras_ordenadas(filas_g, ancho_mm=180, fila_h=26, L=120, R=120, destacar="Argentina", titulo="Novillo en pie, USD por kilo vivo")}'
        f'{pie("USDA AMS, INAC y MLA; Argentina: Índice Novillo del MAG al dólar blue", fecha=p.cierre["fecha"], nota="Solo fuentes que publican peso vivo: no se estima rendimiento de carcasa en ningún país.")}</figure>'
        f'<h3>El novillo argentino de los últimos dos años, contra el nivel de hoy afuera</h3>'
        f'<figure>{G2.argentina_vs_niveles(p.mensual("usd_blue"), intl["paises"])}'
        f'{pie("Índice Novillo del MAG al dólar blue (promedio mensual); USDA AMS, INAC y MLA", fecha=p.inmag.fecha_dato, nota="Las líneas punteadas son el último dato de cada país, no su serie.")}</figure>'
        f'<table class="chica"><thead><tr><th>País</th><th>USD/kg vivo</th><th>Dato nativo</th><th>Fecha</th><th>Fuente</th></tr></thead><tbody>{tabla}</tbody></table>'
        f'<div class="aviso">Argentina no es la más barata de la región: opera por encima de Brasil. La brecha que se sostiene es '
        f'contra el hemisferio norte y Uruguay. Brasil no figura porque la licencia de CEPEA prohíbe retransmitir sus series.</div>'
        + (f'<p class="nota">{I.esc(" ".join(atrib))}</p>' if atrib else "")
    )


def p_tierra(p: D.Paquete, x: D2.Extra) -> str:
    if not len(x.tierra):
        return ""
    t = x.tierra.puntos
    top = t[0]
    filas = "".join(
        f'<tr><td>{I.esc(z["provincia"])}{(" — " + I.esc(z["zona"])) if z["zona"] else ""}</td>'
        f'<td class="num">{_miles(z["usd_ha"])}</td><td class="num fuerte">{_miles(z["kg_novillo_ha"])}</td>'
        f'<td class="num">{_d(z["canon_kg_ano"]) if z["canon_kg_ano"] else "—"}{"" if z["canon_relevado"] else "*"}</td>'
        f'<td class="num">{(_d(z["rendimiento_pct"]) + "%") if z["rendimiento_pct"] else "—"}</td>'
        f'<td class="num">{z["repago"] or "—"}</td><td class="num">{z.get("n") or "?"}</td><td>{I.esc(z.get("fecha") or "s/f")}</td></tr>'
        for z in t
    )
    barras = [(f'{z["provincia"]}{" — " + z["zona"] if z["zona"] else ""}', z["kg_novillo_ha"],
               f'{_miles(z["kg_novillo_ha"])} kg') for z in t]
    nombre = f'{top["provincia"]}{" (" + top["zona"] + ")" if top["zona"] else ""}'
    return (
        f'<h2>La hectárea ganadera más cara del relevamiento, {I.esc(nombre)}, cuesta {_miles(top["kg_novillo_ha"])} kg de novillo</h2>'
        f'<figure>{G.rango_tierra(p.tierra.puntos, n=8)}'
        f'{pie("Relevamiento propio y Compañía Argentina de Tierras", nota="Barra: P25 a P75 relevado; marca: valor típico. Cada fila con su n y su fecha.")}</figure>'
        f'<h3>Lo que cuesta la hectárea, en kilos de novillo</h3>'
        f'<figure>{G2.barras_ordenadas(barras, ancho_mm=180, fila_h=15, L=230, R=70, titulo="Kilos de novillo por hectárea", corte=44)}'
        f'{pie("Relevamiento propio y Compañía Argentina de Tierras; Índice Novillo del MAG al dólar blue", fecha=p.inmag.fecha_dato)}</figure>'
        f'<table class="chica apretada"><thead><tr><th>Zona</th><th>USD/ha</th><th>Kg novillo/ha</th><th>Canon kg/ha/año</th>'
        f'<th>Renta</th><th>Repago (años)</th><th>n</th><th>Relev.</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">{I.esc(x.tierra.nota or "")} Kg de novillo por ha = USD/ha sobre ese precio. Renta = canon × precio del '
        f'novillo sobre el valor de la tierra; repago = 100 / renta. *Canon estimado: 30 % de la producción donde no hay '
        f'arrendamiento relevado. Es la cuenta de la tool farmland_yield. Campo ganadero únicamente: la tierra agrícola no '
        f'se tasa con canon de hacienda. Fuente: relevamiento propio y Compañía Argentina de Tierras; cálculo propio · consignatarias.com.ar</p>'
    )


def p_metodologia(p: D.Paquete, x: D2.Extra) -> str:
    """Metodología, fuentes, licencia, cita y contacto. El contacto queda al final, donde ya está la mano."""
    fuentes = [
        ("Índice Novillo (INMAG)", "Mercado Agroganadero de Cañuelas, diario, ponderado por volumen", "Empalme Liniers→MAG desde 2015 y dolarización"),
        ("Novillito", "Mercado Agroganadero, serie por rueda desde 2006", "Dolarización y promedios mensuales"),
        ("Banda VR y escalera de pesos", "Operaciones de lote del MAG", "P10, mediana y P90 por categoría y por 50 kg"),
        ("Subcategorías", "Informe por categoría del MAG (Resol. 32/2018)", "—"),
        ("% de hembras", "Lotes del MAG", "Hembras sobre todas las cabezas del mes"),
        ("Maíz/novillo", "Maíz FOB (MAGyP), INMAG y blue", "Relación en kg"),
        ("Brecha internacional", "USDA AMS, INAC (Uruguay), MLA (Australia)", "Comparación en USD por kg vivo"),
        ("Tierra", "Relevamiento propio y Compañía Argentina de Tierras", "Kilos de novillo, renta y repago"),
        ("Remates", "Calendario propio, scrape diario de firmas y cámaras", "Conteo por provincia y tipo"),
        ("Dólar", "Blue y oficial (dolarapi y series históricas)", "Forward-fill en días sin cotización"),
    ]
    tabla = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in fuentes)
    contacto = I.p_metodologia(p)
    contacto = contacto[contacto.index('<section class="contacto">'):]
    return (
        f'<h2>Cómo se construye esto</h2>'
        f'<p class="ancho"><span class="fuerte">Lo propio y lo de terceros.</span> El Índice Novillo, el novillito, las '
        f'subcategorías y los lotes los publica el Mercado Agroganadero. Nuestros son el empalme, la conversión a dólares, la '
        f'banda de precio, la estacionalidad, la proporción de hembras, las relaciones de precio y la cuenta de la tierra.</p>'
        f'<p class="ancho"><span class="fuerte">Lo que no está.</span> No publicamos precio de ternero ni la relación '
        f'ternero/novillo: el MAG no opera terneros. No comparamos las hembras de Cañuelas con la faena nacional. No sacamos '
        f'umbrales de afuera para leer una serie propia: se marca su mediana.</p>'
        f'<table class="chica"><thead><tr><th>Dato</th><th>Origen</th><th>Lo que hacemos</th></tr></thead><tbody>{tabla}</tbody></table>'
        f'<div class="cita-caja"><div class="rotulo">Licencia y cita</div>'
        f'<p class="ancho" style="margin:1mm 0 2mm">Citar es libre y gratis; la atribución es la condición de uso. Republicar '
        f'nuestras compilaciones o usarlas en un producto propio requiere licencia: {URL_LICENCIA.replace("https://www.", "")}</p>'
        f'<div class="cita-txt">{I.esc(cita(p))}</div></div>'
        f'<p class="nota">Este informe es una referencia de mercado, no una tasación ni una recomendación de compra o venta.</p>'
        f'{contacto}'
    )


def p_planilla(p: D.Paquete, x: D2.Extra) -> str:
    # La planilla del v1 apuntaba a "la banda de la página 4"; en el v2 la banda
    # está en otra página, así que la referencia se reescribe por nombre.
    base = I.p_planilla(p).replace("la banda de la página 4", "la banda de precio (Banda I)")
    # Al pie, la referencia por peso en tabla: es el número que el productor va a
    # copiar en la columna "$/kg ref.", y en papel no se lee de un gráfico.
    filas = [(g["categoria"], r) for g in p.por_peso.puntos for r in g["rangos"] if (r.get("lotes") or 0) >= 10]
    if not filas:
        return base

    def tabla(parte: list) -> str:
        cuerpo = "".join(
            f'<tr><td>{G2.nombre_cat(c)} {r["desde_kg"]}–{r["hasta_kg"]} kg</td><td class="num">{G.ars(r["p10"])}</td>'
            f'<td class="num fuerte">{G.ars(r["mediana"])}</td><td class="num">{G.ars(r["p90"])}</td></tr>'
            for c, r in parte
        )
        return (f'<table class="chica apretada"><thead><tr><th>Categoría y peso</th><th>P10</th><th>Mediana</th>'
                f'<th>P90</th></tr></thead><tbody>{cuerpo}</tbody></table>')

    mitad = (len(filas) + 1) // 2
    return (base + f'<h3 style="margin-top:4mm">La referencia para la columna $/kg, por categoría y peso</h3>'
            f'<div class="dos"><div>{tabla(filas[:mitad])}</div><div>{tabla(filas[mitad:])}</div></div>'
            f'<p class="nota">Ventana de 30 días al {p.por_peso.fecha_dato}; rangos con 10 lotes o más. Fuente: MAG, '
            f'operaciones de lote (Valor de Referencia VR v1.0); cálculo propio · consignatarias.com.ar</p>')


# ─── armado ────────────────────────────────────────────────────────────────────

PAGINAS = [
    (p_tapa, True), (p_resumen, False), (p_historia, False), (p_estacional, False), (p_banda1, False),
    (p_banda2, False), (p_relativos, False), (p_ciclo, False), (p_remates, False), (p_mundo, False),
    (p_tierra, False), (p_planilla, False), (p_metodologia, False),
]


def construir(p: D.Paquete, x: D2.Extra) -> tuple[str, list[str]]:
    """
    Devuelve el HTML y la lista de páginas que no fueron por falta de dato. Una
    página sin dato devuelve "" y se saca: el folio se numera con las que quedan.
    """
    ventana = f"{p.mes.desde} → {p.mes.hasta} · {len(p.ruedas_mes)} ruedas"
    hechas = [(fn.__name__, fn(p, x), tapa) for fn, tapa in PAGINAS]
    sin_dato = [n for n, html, _ in hechas if not html]
    hechas = [(n, html, tapa) for n, html, tapa in hechas if html]
    total = len(hechas)
    cuerpo = "".join(I.hoja(html, i + 1, total, ventana, tapa) for i, (_, html, tapa) in enumerate(hechas))

    plantilla = (AQUI / "plantilla_v2.html").read_text(encoding="utf-8")
    ctx = {"cuerpo": cuerpo, "fuentes": I.fuentes_embebidas(), "mes_etiqueta": p.mes.etiqueta}
    esperadas = set(re.findall(r"\$(\w+)", plantilla))
    if esperadas - set(ctx):
        raise RuntimeError(f"la plantilla pide claves que el contexto no trae: {esperadas - set(ctx)}")
    if set(ctx) - esperadas:
        raise RuntimeError(f"el contexto trae claves muertas: {set(ctx) - esperadas}")
    return Template(plantilla).substitute(ctx), sin_dato
