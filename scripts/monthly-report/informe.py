#!/usr/bin/env python3
"""
El Corredor — armado del informe.

El generador viejo usaba `Template.safe_substitute`, que ante un placeholder
faltante imprime el `$nombre` literal en el PDF en vez de fallar. Tenía además 6
claves de contexto muertas y una (`categories_grid`) a un `$placeholder` de
publicar el precio del ternero, que es INMAG × 1,10. Acá se usa `substitute`, que
rompe, y además se verifica que el contexto y la plantilla coincidan exactamente.

Páginas: 12, pensadas para alguien que lee en papel. La 1 y la 2 son las que se
leen; el medio se consulta; la última es la que tiene el contacto, porque es
donde la mano ya está.
"""

from __future__ import annotations

import argparse
import base64
import re
import subprocess
import sys
from datetime import date
from pathlib import Path
from string import Template

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

import datos as D  # noqa: E402
import graficos as G  # noqa: E402

SALIDA = AQUI / "output"
FUENTES = AQUI / "fuentes"
MONO = AQUI.parent.parent / "src" / "fonts"

CORREO = "agro@memola.com.ar"
WHATSAPP = "5493773418130"
WHATSAPP_VISIBLE = "+54 9 3773 41-8130"


# ─── utilidades ────────────────────────────────────────────────────────────────

def esc(s) -> str:
    """Escapar lo que viene de scraping: nombres de firma y localidad entran crudos."""
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def fuentes_embebidas() -> str:
    """
    Las fuentes van en base64 y no por URL: con el HTML cargado por file://, una
    @font-face relativa la bloquea CORS y cae al fallback en silencio. Es la causa
    de que el PDF del runner no fuera igual al local.
    """
    caras = []
    for arch, peso in ((FUENTES / "Inter-Regular.woff2", 400), (FUENTES / "Inter-Medium.woff2", 500),
                       (FUENTES / "Inter-SemiBold.woff2", 600)):
        if arch.exists():
            b64 = base64.b64encode(arch.read_bytes()).decode()
            caras.append(f"@font-face{{font-family:'Inter';font-weight:{peso};font-style:normal;"
                         f"font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}")
    for arch, peso in ((MONO / "JetBrainsMono-Medium.ttf", 500), (MONO / "JetBrainsMono-Bold.ttf", 700)):
        if arch.exists():
            b64 = base64.b64encode(arch.read_bytes()).decode()
            caras.append(f"@font-face{{font-family:'JetBrains Mono';font-weight:{peso};font-style:normal;"
                         f"font-display:block;src:url(data:font/ttf;base64,{b64}) format('truetype');}}")
    if not caras:
        raise RuntimeError("no hay fuentes para embeber: el PDF saldría distinto en cada máquina")
    # Sin envolver en <style>: esto se inserta DENTRO del <style> de la plantilla.
    # Anidarlo cerraba la hoja de estilos en el primer </style> y el resto del CSS
    # se imprimía como texto en la primera página.
    return "".join(caras)


def delta(v: float | None, bueno_sube: bool = True, suf: str = "%") -> str:
    if v is None:
        return '<span class="delta neutro">sin comparable</span>'
    flecha = "↑" if v > 0 else ("↓" if v < 0 else "→")
    clase = "neutro" if v == 0 else ("sube" if (v > 0) == bueno_sube else "baja")
    return f'<span class="delta {clase}">{flecha} {G.pct(v)}{"" if suf == "%" else suf}</span>'


def ficha(etiqueta: str, valor: str, pie: str = "", spark: str = "") -> str:
    return (f'<div class="ficha"><div class="et">{etiqueta}</div>'
            f'<div class="val">{valor}</div>{pie}{spark}</div>')


def pie_figura(serie: D.Serie, extra: str = "") -> str:
    clase = "propio" if serie.propia else "externo"
    cual = "Medición propia" if serie.propia else "Fuente externa"
    fecha = f" · dato al {serie.fecha_dato}" if serie.fecha_dato else ""
    nota = f" {serie.nota}" if serie.nota else ""
    return (f'<figcaption class="{clase}"><span class="marca-dato"></span>'
            f'{cual}: {esc(serie.fuente)}{fecha}.{esc(nota)} {extra}</figcaption>')


def hoja(contenido: str, n: int, total: int, ventana: str, tapa: bool = False) -> str:
    cab = "" if tapa else (
        f'<div class="cabecera"><span class="marca">EL CORREDOR</span>'
        f'<span class="ventana">{ventana}</span></div>'
    )
    return (f'<section class="hoja{" tapa" if tapa else ""}">{cab}{contenido}'
            f'<div class="folio">{n:02d}/{total:02d}</div></section>')


# ─── páginas ───────────────────────────────────────────────────────────────────

def p_tapa(p: D.Paquete) -> str:
    c = p.cierre
    var_mes = p.variacion("ars", 1)
    var_usd = p.variacion("usd_blue", 12)
    spark = G.sparkline([x["valor"] for x in p.mensual("ars")[-12:]])
    liq = p.liquidacion.puntos[-1] if p.liquidacion.puntos else None
    return (
        f'<p class="rotulo" style="margin-top:14mm">Informe mensual del mercado ganadero argentino</p>'
        f'<h1>El Corredor</h1>'
        f'<p class="bajada" style="margin-bottom:14mm">{p.mes.etiqueta.capitalize()} · cerrado con {len(p.ruedas_mes)} ruedas del Mercado Agroganadero</p>'
        f'<p class="rotulo">Índice Novillo al cierre del mes</p>'
        f'<div class="hero">{G.ars(c["ars"])}</div>'
        f'<div class="hero-sub">por kilo vivo · {G.usd(c["usd_blue"])} al blue · rueda del {G.fecha_larga_es(c["fecha"])}</div>'
        f'<div style="margin:12mm 0 0">{spark}<div class="nota">Promedio mensual, últimos 12 meses</div></div>'
        f'<div class="fichas" style="margin-top:12mm">'
        f'{ficha("Promedio del mes", G.ars(p.promedio_ars), delta(var_mes))}'
        f'{ficha("En dólares", G.usd(p.promedio_usd), delta(var_usd) + " interanual")}'
        f'{ficha("Hembras operadas", f"{G._f(liq['pct'])}%" if liq else "—", f"<div class=\'delta neutro\'>{liq['cabezas']:,} cabezas</div>".replace(",", ".") if liq else "")}'
        f'{ficha("Ruedas del mes", str(len(p.ruedas_mes)), f"<div class=\'delta neutro\'>{sum(x.get('cabezas') or 0 for x in p.ruedas_mes):,} cabezas</div>".replace(",", "."))}'
        f'</div>'
        f'<p class="nota" style="position:absolute;bottom:18mm">consignatarias.com.ar · Memola Medios SAS · '
        f'Los datos de este informe se publican con su fuente y su fecha. Lo que no tiene base suficiente, no se publica.</p>'
    )


def p_resumen(p: D.Paquete) -> str:
    """La página que se fotografía y se manda por WhatsApp. Cinco hechos, sin adornos."""
    puntos = []
    v1 = p.variacion("ars", 1)
    v12 = p.variacion("ars", 12)
    vu12 = p.variacion("usd_blue", 12)
    c = p.cierre
    if v1 is not None and v12 is not None:
        puntos.append(f'El Índice Novillo cerró en <span class="fuerte">{G.ars(c["ars"])}</span> por kilo vivo, '
                      f'{"subió" if v1 > 0 else "bajó"} {G.pct(v1)} contra el mes anterior y {G.pct(v12)} en doce meses.')
    if vu12 is not None:
        gana = "ganó" if vu12 > 0 else "perdió"
        puntos.append(f'Medido en dólares, el novillo {gana} <span class="fuerte">{G.pct(vu12)}</span> interanual: '
                      f'{G.usd(p.promedio_usd)} de promedio en el mes. Es la lectura que el precio en pesos no da.')
    if p.bandas.puntos:
        b = max(p.bandas.puntos, key=lambda x: x.get("lotes") or 0)
        puntos.append(f'La categoría más operada fue <span class="fuerte">{b["categoria"]}</span>, con una banda de '
                      f'{G.ars(b["p10"])} a {G.ars(b["p90"])} por kilo sobre {b["lotes"]} lotes: '
                      f'{G._f(b.get("amplitud_pct") or 0)}% de amplitud entre lo que se pagó barato y lo que se pagó caro.')
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        prev = p.liquidacion.puntos[-2] if len(p.liquidacion.puntos) > 1 else None
        mov = f', {G.pct(u["pct"]-prev["pct"])} pp contra el mes anterior' if prev else ""
        puntos.append(f'Las hembras fueron el <span class="fuerte">{G._f(u["pct"])}%</span> de las cabezas operadas'
                      f'{mov}. Es el dato de oferta futura: cada vaca que se vende hoy es un ternero que no nace.')
    if p.maiz.puntos:
        m = p.maiz.puntos[-1]
        puntos.append(f'La relación maíz/novillo quedó en <span class="fuerte">{G._f(m["relacion"])} kg</span> de maíz '
                      f'por kilo de novillo ({m["ym"]}), contra un umbral de referencia de 12.')

    faltan = ""
    if p.faltantes:
        faltan = (f'<div class="aviso">Lo que esta edición no pudo medir, dicho antes de que lo busques: '
                  f'{esc(", ".join(p.faltantes))}. Preferimos declararlo a completarlo con una estimación.</div>')
    return (
        f'<h2>Si sólo leés una página, es ésta</h2>'
        f'<p class="bajada">Los cinco hechos del mes, con el número y la fuente detrás de cada uno.</p>'
        f'<ol class="lista-num">' + "".join(f"<li>{x}</li>" for x in puntos) + "</ol>" + faltan
    )


def p_inmag_largo(p: D.Paquete) -> str:
    g = G.linea_dolares(p.inmag.puntos)
    mensual_usd = p.mensual("usd_blue")[-13:]
    filas = "".join(
        f'<tr><td>{x["ym"]}</td><td class="num">{G.usd(x["valor"])}</td></tr>' for x in mensual_usd[-6:]
    )
    return (
        f'<h2>El novillo en dólares, desde 2015</h2>'
        f'<p class="ancho">El Mercado Agroganadero publica el índice en pesos. La serie empalmada desde 2015 y su '
        f'conversión a dólares son nuestras, y son las que dicen si el negocio mejoró o si solo subieron los precios. '
        f'El área sombreada es la brecha entre el dólar blue y el oficial.</p>'
        f'<figure>{g}{pie_figura(p.inmag, "Serie empalmada Liniers→MAG; el quiebre de mayo de 2022 está en la metodología.")}</figure>'
        f'<div class="dos"><div>{G.base100(p.mensual("ars"), p.mensual("usd_blue"), p.mes.ym)}'
        f'<div class="nota">Pesos y dólares indexados a 100 doce meses atrás, en un solo eje: la distancia entre las '
        f'dos líneas es cuánto de la suba fue nominal.</div></div>'
        f'<div><h3>Promedio mensual en dólares</h3><table><thead><tr><th>Mes</th><th>USD/kg</th></tr></thead>'
        f'<tbody>{filas}</tbody></table></div></div>'
    )


def p_banda(p: D.Paquete) -> str:
    g = G.dumbbell_bandas(p.bandas.puntos)
    filas = "".join(
        f'<tr><td>{esc(b["categoria"])}</td><td class="num">{G.ars(b["p10"])}</td>'
        f'<td class="num">{G.ars(b.get("mediana") or 0)}</td><td class="num">{G.ars(b["p90"])}</td>'
        f'<td class="num">{G._f(b.get("amplitud_pct") or 0)}%</td><td class="num">{b.get("lotes")}</td></tr>'
        for b in sorted(p.bandas.puntos, key=lambda x: x.get("mediana") or 0, reverse=True)
    )
    return (
        f'<h2>Cuánto se pagó de verdad, por categoría</h2>'
        f'<p class="ancho">Un precio único esconde lo que importa: entre lo que se paga barato y lo que se paga caro por '
        f'la misma categoría hay hasta 44% de diferencia. La barra es el rango entre el percentil 10 y el 90 de las '
        f'operaciones de lote; el punto es la mediana. Un lote no se vende "al precio del mercado": se vende en algún '
        f'punto de esta banda, y ahí está la plata.</p>'
        f'<figure>{g}{pie_figura(p.bandas)}</figure>'
        f'<table><thead><tr><th>Categoría</th><th>P10</th><th>Mediana</th><th>P90</th><th>Amplitud</th><th>Lotes</th></tr></thead>'
        f'<tbody>{filas}</tbody></table>'
        f'<p class="nota">Las categorías con menos de 10 lotes en la ventana no se publican: con esa base, la mediana es ruido.</p>'
    )


def p_amplitud(p: D.Paquete) -> str:
    g = G.paneles_amplitud(p.amplitud.puntos)
    return (
        f'<h2>¿El mercado se está emparejando?</h2>'
        f'<p class="ancho">La amplitud de la banda dice cuánto vale elegir bien a quién venderle. Si se cierra, el '
        f'mercado paga parecido y la diferencia la hace el animal; si se abre, la hace el comprador.</p>'
        f'<figure>{g}{pie_figura(p.amplitud)}</figure>'
        f'<div class="aviso">Cada punto resume una ventana móvil de 30 días, así que dos puntos consecutivos comparten '
        f'29 días de operaciones. Sirve para leer el nivel y la tendencia; no para comparar un día contra otro.</div>'
    )


def p_oferta(p: D.Paquete) -> str:
    g = G.columnas_liquidacion(p.liquidacion.puntos)
    nac = p.nacional or {}
    comp = G.barras_composicion(p.composicion.puntos)
    filas = "".join(
        f'<tr><td>{x["ym"]}</td><td class="num">{G._f(x["pct"])}%</td>'
        f'<td class="num">{x["cabezas"]:,}</td><td class="num">{x["lotes"]:,}</td></tr>'.replace(",", ".")
        for x in p.liquidacion.puntos[-6:]
    )
    bloque_nac = ""
    if nac.get("pct"):
        detalle = " · ".join(x for x in (esc(nac.get("periodo")), esc(nac.get("fuente"))) if x)
        bloque_nac = (f'<div class="aviso">A nivel nacional, las hembras fueron el {G._f(nac["pct"])}% de la faena'
                      f'{f" ({detalle})" if detalle else ""}. <strong>No se compara con la serie de arriba</strong>: '
                      f'Cañuelas concentra venta de vientres y corre quince a veinte puntos por encima del promedio del país.</div>')
    return (
        f'<h2>Qué está entrando al mercado</h2>'
        f'<p class="ancho">La proporción de hembras sobre las cabezas operadas es el dato de oferta futura, y se mide '
        f'sobre todas las hembras del mes, no sobre una categoría.</p>'
        f'<figure>{g}{pie_figura(p.liquidacion)}</figure>'
        f'{bloque_nac}'
        f'<div class="dos"><div><h3>Hembras por mes</h3><table><thead><tr><th>Mes</th><th>Hembras</th><th>Cabezas</th><th>Lotes</th></tr></thead>'
        f'<tbody>{filas}</tbody></table></div>'
        f'<div><h3>Composición del mes</h3>{comp}<div class="nota">Cabezas operadas por categoría.</div></div></div>'
    )


def p_maiz(p: D.Paquete) -> str:
    g = G.ratio_maiz(p.maiz.puntos)
    return (
        f'<h2>¿Conviene encerrar?</h2>'
        f'<p class="ancho">Cuántos kilos de maíz compra un kilo de novillo. Es una sola serie y un solo eje: poner el '
        f'novillo en pesos y el maíz en dólares en dos escalas deja que la alineación cuente la historia que uno quiera.</p>'
        f'<figure>{g}{pie_figura(p.maiz, "Por encima del umbral, el grano es barato contra la hacienda.")}</figure>'
    )


def p_tierra(p: D.Paquete) -> str:
    g = G.rango_tierra(p.tierra.puntos)
    return (
        f'<h2>La otra mitad del patrimonio</h2>'
        f'<p class="ancho">Valor de la hectárea ganadera por zona. La barra es el rango relevado y la marca es el valor '
        f'típico. Cada fila lleva cuántas observaciones tiene y de cuándo: una zona con una sola observación de 2024 '
        f'no vale lo mismo como referencia que una con cuarenta y cinco de este año.</p>'
        f'<figure>{g}{pie_figura(p.tierra)}</figure>'
        f'<div class="aviso">Campo ganadero únicamente. La tierra agrícola no se tasa con canon de hacienda: en la zona '
        f'núcleo la hectárea vale por la soja, no por los novillos, y mezclarlas hace incomparable el número.</div>'
    )



def p_sio(p: D.Paquete) -> str:
    """
    Lo que se pagó lejos del mercado. Es la página que le habla al que no vende en
    Cañuelas, que son casi todos.
    """
    if not len(p.sio):
        return (
            '<h2>Lo que se pagó fuera de Cañuelas</h2>'
            '<p class="ancho">SIO Carnes no devolvió datos para este mes. La página queda para que se note '
            'la ausencia: no se reemplaza el dato por una estimación.</p>'
        )
    g = G.barras_sio_zonas(p.sio.puntos)
    pub = [x for x in p.sio.puntos if x.get("representativo")]
    peor = min(pub, key=lambda x: x["vs_pais_pct"]) if pub else None
    mejor = max(pub, key=lambda x: x["vs_pais_pct"]) if pub else None

    lectura = ""
    if peor and mejor and peor is not mejor:
        brecha = mejor["precio_kg"] - peor["precio_kg"]
        # Lo que se muestra es la plata, no el porcentaje: 12 % no se siente,
        # $230.000 en una jaula de 20 novillos sí.
        jaula = brecha * 460 * 20
        lectura = (
            f'<p class="ancho">La distancia entre la zona que más pagó y la que menos es de '
            f'<span class="fuerte">{G.ars(brecha)}</span> por kilo. Sobre una jaula de 20 novillos de 460 kg '
            f'son <span class="fuerte">{G.ars(jaula)}</span> de diferencia por el mismo animal, según dónde '
            f'termine. Esa brecha es flete, competencia entre plantas y poder de negociación: no es calidad.</p>'
        )

    return (
        f'<h2>Lo que se pagó fuera de Cañuelas</h2>'
        f'<p class="ancho">Todo lo anterior mira el Mercado Agroganadero, que es la referencia del país pero por donde '
        f'pasa una parte de la hacienda. Esta página mira el resto: las operaciones con destino a faena declaradas en '
        f'todo el territorio. Cada barra es cuánto se apartó esa zona del promedio nacional.</p>'
        f'<figure>{g}{pie_figura(p.sio)}</figure>'
        f'{lectura}'
        f'<div class="aviso">Tres salvedades que conviene tener presentes. Es hacienda con destino a <span class="fuerte">faena</span>: '
        f'no hay invernada ni cría, así que no sirve para leer el ternero. El corte es por zona de <span class="fuerte">destino</span>, '
        f'no por provincia de origen: dice qué pagaron las plantas de una zona, no qué cobró el productor de una provincia. '
        f'Y las zonas se agrupan a propósito, para no identificar al frigorífico. Las que no llegan a las '
        f'{D.MINIMO_CABEZAS_ZONA} cabezas en el mes se nombran sin precio: con esos volúmenes el promedio es ruido, '
        f'y el organismo no publica ningún aviso al respecto — el piso es nuestro.</div>'
    )

def p_planilla(p: D.Paquete) -> str:
    """La página que justifica imprimir el informe: se completa con lapicera."""
    c = p.cierre
    ref = p.bandas.puntos[0] if p.bandas.puntos else None
    ejemplo = ""
    if ref and ref.get("mediana"):
        kg, cab = 460, 50
        bruto = ref["mediana"] * kg * cab
        com = bruto * 0.05
        ejemplo = (f'<p class="ancho">Ejemplo con los números de este mes: {cab} cabezas de {ref["categoria"].lower()} '
                   f'de {kg} kg a la mediana de {G.ars(ref["mediana"])} son <span class="fuerte">{G.ars(bruto)}</span> '
                   f'brutos. Con 5% de comisión, {G.ars(com)} se van ahí. El resto depende de flete, gastos y plazo, '
                   f'que son tuyos y por eso van en blanco.</p>')
    filas = "".join(
        '<tr><td class="vacia">&nbsp;</td><td class="vacia"></td><td class="vacia"></td><td class="vacia"></td>'
        '<td class="vacia"></td><td class="vacia"></td><td class="vacia"></td></tr>' for _ in range(9)
    )
    return (
        f'<h2>Tu lote, tu cuenta</h2>'
        f'<p class="ancho">Esta página está para completar a mano, con la referencia del mes al lado. '
        f'El precio de referencia sale de la banda de la página 4: usá la mediana de tu categoría, o el P10 si querés '
        f'la cuenta conservadora.</p>'
        f'{ejemplo}'
        f'<table class="planilla"><thead><tr><th>Categoría</th><th>Cabezas</th><th>Kg prom.</th><th>$/kg ref.</th>'
        f'<th>Bruto</th><th>Comisión + gastos</th><th>Neto</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">Referencia del mes: cierre {G.ars(c["ars"])} por kilo vivo ({G.fecha_larga_es(c["fecha"])}). '
        f'La comisión y los gastos varían por firma y por canal: preguntá antes de consignar, que es tu derecho y nadie se ofende.</p>'
    )


def p_remates(p: D.Paquete) -> str:
    r = p.remates or {}
    # Ordenado por fecha y cortado a 22, el "calendario del mes" terminaba siendo
    # una lista del primer día (el informe viejo tenía el mismo defecto). Se toman
    # hasta 2 por jornada para que la tabla cubra el mes, que es lo que se consulta.
    por_dia: dict[str, int] = {}
    prox = []
    for x in (r.get("proximos") or []):
        d = str(x.get("date"))[:10]
        if por_dia.get(d, 0) >= 2:
            continue
        por_dia[d] = por_dia.get(d, 0) + 1
        prox.append(x)
        if len(prox) >= 22:
            break
    filas = "".join(
        f'<tr><td>{esc(G.fecha_es(x.get("date")))}</td><td>{esc(x.get("consignatariaName"))}</td>'
        f'<td>{esc(x.get("location") or "—")}</td><td>{esc(x.get("province") or "—")}</td></tr>'
        for x in prox
    )
    if not filas:
        filas = '<tr><td colspan="4">Sin remates cargados para el mes que viene al cierre de esta edición.</td></tr>'
    return (
        f'<h2>Dónde y cuándo se vende</h2>'
        f'<p class="ancho">Los remates del mes que viene, que es lo único de este informe con fecha de vencimiento. '
        f'El calendario completo, con los que se agreguen después, está en consignatarias.com.ar/remates.</p>'
        f'<table><thead><tr><th>Fecha</th><th>Firma</th><th>Lugar</th><th>Provincia</th></tr></thead><tbody>{filas}</tbody></table>'
        f'<p class="nota">{len(r.get("proximos") or [])} remates convocados para {esc(r.get("mes"))} en {len(r.get("por_dia") or {})} jornadas, al cierre de esta edición. La tabla muestra hasta dos por día para cubrir el mes completo · '
        f'{esc(r.get("fuente"))}.</p>'
    )


def p_metodologia(p: D.Paquete) -> str:
    svg_mail = ('<svg class="via-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" '
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3.2 6.6 12 13.1l8.8-6.5"/></svg>')
    svg_wa = ('<svg class="via-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
              '<path d="M12 2.4A9.6 9.6 0 0 0 3.76 17L2.4 21.6l4.74-1.33A9.6 9.6 0 1 0 12 2.4Z"/>'
              '<path d="M8.3 7.3c.3-.1.7 0 .9.4l.9 1.8c.2.3.1.7-.1.9l-.6.6c-.2.2-.2.4-.1.6.5 1 1.4 1.9 2.4 2.4.2.1.4.1.6-.1'
              'l.6-.6c.2-.2.6-.3.9-.1l1.8.9c.4.2.5.6.4.9-.3 1-1.3 1.7-2.4 1.6-3-.3-5.5-2.8-5.8-5.8-.1-1.1.6-2.1 1.5-2.4Z" fill="#fff"/></svg>')
    asunto = f"El%20Corredor%20{p.mes.nombre}%20{p.mes.anio}"
    texto_wa = f"Hola%2C%20le%C3%AD%20El%20Corredor%20de%20{p.mes.nombre}%20y%20tengo%20una%20consulta"
    return (
        f'<h2>Cómo se construye esto</h2>'
        f'<p class="ancho"><span class="fuerte">El Índice Novillo</span> lo publica el Mercado Agroganadero de Cañuelas: '
        f'es diario y ponderado por volumen. Nuestro es el empalme con la serie del Mercado de Liniers desde 2015 y la '
        f'conversión a dólares.</p>'
        f'<p class="ancho"><span class="fuerte">La banda de precio</span> sale de las operaciones de lote del propio '
        f'mercado, no de una encuesta: para cada categoría se toman los lotes de los últimos 30 días y se calculan los '
        f'percentiles 10, 50 y 90. Con menos de 10 lotes no se publica; con menos de 30 se marca como base fina.</p>'
        f'<p class="ancho"><span class="fuerte">Lo que no está acá.</span> No publicamos precio de ternero: el Mercado '
        f'Agroganadero no opera terneros y cualquier número sería un derivado del índice, no una observación. Tampoco '
        f'comparamos la proporción de hembras de Cañuelas con la faena nacional, porque miden cosas distintas.</p>'
        f'<p class="nota">Este informe es una referencia de mercado, no una tasación ni una recomendación de compra o '
        f'venta. Memola Medios SAS · consignatarias.com.ar</p>'
        f'<section class="contacto">'
        f'<p class="rotulo">¿Tenés alguna duda?</p>'
        f'<p class="fallback">Escribinos. Contesta una persona, no un formulario.</p>'
        f'<div class="vias">'
        f'<a class="via" href="mailto:{CORREO}?subject={asunto}">{svg_mail}'
        f'<span class="via-txt"><span class="via-rot">Correo</span><span class="via-dato">{CORREO}</span></span></a>'
        f'<a class="via" href="https://wa.me/{WHATSAPP}?text={texto_wa}">{svg_wa}'
        f'<span class="via-txt"><span class="via-rot">WhatsApp</span><span class="via-dato">{WHATSAPP_VISIBLE}</span></span></a>'
        f'</div>'
        f'<p class="fallback">Si estás leyendo esto en papel: <strong>{CORREO}</strong> · '
        f'WhatsApp <strong>{WHATSAPP_VISIBLE}</strong> · consignatarias.com.ar</p>'
        f'</section>'
        f'<div class="colofon">El Corredor · {p.mes.etiqueta} · generado el {date.today().isoformat()}</div>'
    )


# ─── armado ────────────────────────────────────────────────────────────────────

def construir(p: D.Paquete) -> str:
    ventana = f"{p.mes.desde} → {p.mes.hasta} · {len(p.ruedas_mes)} ruedas"
    paginas = [
        (p_tapa, True), (p_resumen, False), (p_inmag_largo, False), (p_banda, False),
        (p_amplitud, False), (p_oferta, False), (p_maiz, False), (p_sio, False), (p_tierra, False),
        (p_planilla, False), (p_remates, False), (p_metodologia, False),
    ]
    total = len(paginas)
    cuerpo = "".join(
        hoja(fn(p), i + 1, total, ventana, tapa) for i, (fn, tapa) in enumerate(paginas)
    )

    plantilla = (AQUI / "plantilla.html").read_text(encoding="utf-8")
    ctx = {"cuerpo": cuerpo, "fuentes": fuentes_embebidas(), "mes_etiqueta": p.mes.etiqueta}

    # El contexto y la plantilla tienen que coincidir EXACTO. `safe_substitute`
    # imprimía `$lectura_editor` dentro del PDF cuando faltaba una clave; con
    # `substitute` eso es un error, y acá además se detectan las claves de más.
    esperadas = set(re.findall(r"\$(\w+)", plantilla))
    if esperadas - set(ctx):
        raise RuntimeError(f"la plantilla pide claves que el contexto no trae: {esperadas - set(ctx)}")
    if set(ctx) - esperadas:
        raise RuntimeError(f"el contexto trae claves muertas: {set(ctx) - esperadas}")
    return Template(plantilla).substitute(ctx)


def a_pdf(html_path: Path, pdf_path: Path) -> bool:
    import os
    candidatos = [os.environ.get("CHROME_BIN"), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                  "google-chrome", "chromium", "chromium-browser"]
    for c in candidatos:
        if not c:
            continue
        try:
            subprocess.run(
                [c, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
                 f"--print-to-pdf={pdf_path}", html_path.as_uri()],
                check=True, capture_output=True, timeout=180,
            )
            return pdf_path.exists()
        except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            continue
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description="El Corredor — informe mensual")
    ap.add_argument("--mes", default="auto", help="YYYY-MM o 'auto' (el mes anterior)")
    ap.add_argument("--pdf", action="store_true")
    a = ap.parse_args()

    if a.mes == "auto":
        hoy = date.today()
        ym = f"{hoy.year - (hoy.month == 1)}-{(hoy.month - 1) or 12:02d}"
    else:
        ym = a.mes

    print(f"El Corredor · {ym}")
    p = D.cargar(ym)
    print(f"  {len(p.ruedas_mes)} ruedas · cierre {G.ars(p.cierre['ars'])} · {len(p.inmag)} ruedas de histórico")
    if p.faltantes:
        print(f"  ⚠ sin dato: {', '.join(p.faltantes)}")

    html = construir(p)
    SALIDA.mkdir(parents=True, exist_ok=True)
    hp = SALIDA / f"el-corredor-{ym}.html"
    hp.write_text(html, encoding="utf-8")
    print(f"  HTML: {hp} ({len(html)//1024} KB)")

    if a.pdf:
        pp = SALIDA / f"el-corredor-{ym}.pdf"
        if a_pdf(hp, pp):
            print(f"  PDF: {pp} ({pp.stat().st_size//1024} KB)")
        else:
            print("  ✗ no se pudo generar el PDF (¿chromium?)")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
