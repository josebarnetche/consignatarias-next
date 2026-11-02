#!/usr/bin/env python3
"""
Los gráficos nuevos de El Corredor v2. Mismas reglas que `graficos.py` (papel,
un solo azul con pasos de claridad, etiquetado directo, trazos de 1 px o más) y
los mismos helpers: este archivo no define una paleta propia.

Lo que agrega es lo que pedía el benchmark de noviembre de 2026: la serie larga
del novillito, la estacionalidad (espagueti y mapa de calor), la banda por
categoría en el tiempo, la escalera de pesos, los precios relativos, el ciclo
con su franja, los remates por provincia y la brecha contra el mundo.

Todos devuelven un SVG con `width` en mm y `viewBox` en px a 96 dpi. Las piezas
para redes los reusan tal cual: el CSS de la pieza los estira al ancho del
lienzo, y como es vectorial no pierde nada.
"""

from __future__ import annotations

from datetime import date

from graficos import (  # noqa: F401 — la paleta y los helpers son los del v1, a propósito
    BANDA, BANDA_CLARA, BLANCO, FILETE, FILETE_FUERTE, MESES_AB, MM, NEGATIVO, POSITIVO, RAMPA,
    SERIE, SERIE_OSC, TINTA, TINTA_2, TINTA_3, _corto, _escala, _f, _ticks, abrir, ars, pct, texto, usd,
)

GRIS_SERIE = "#d4d4d8"   # años anteriores en el espagueti: contexto, no figura
CERO = "#f4f4f5"


def _vacio(ancho_mm: float, alto_mm: float, msg: str) -> str:
    return abrir(ancho_mm, alto_mm) + texto(8, 20, msg, 8) + "</svg>"


def _num(v: float, dec: int = 2) -> str:
    return f"{v:.{dec}f}".replace(".", ",")


def _fc(v: float) -> str:
    """El `_f` del v1 con coma decimal: en un rótulo se lee "27,5 %", no "27.5 %"."""
    return _f(v).replace(".", ",")


def ticks_lindos(lo: float, hi: float, n: int = 4) -> list[float]:
    """
    Ticks en 1, 2, 2,5 o 5 × 10^k, con el último EN o POR ENCIMA del máximo: el eje
    se estira hasta el tick siguiente para que ningún dato quede afuera de la grilla
    (el 2026 del espagueti y el mayo de las hembras quedaban por encima del último
    tick). No reemplaza al `_ticks` del v1, que tiene que seguir saliendo igual.
    """
    import math
    if hi <= lo:
        return [lo]
    crudo = (hi - lo) / max(n, 1)
    k = 10 ** math.floor(math.log10(crudo))
    paso = next(m * k for m in (1, 2, 2.5, 5, 10) if m * k >= crudo * 0.999)
    t0 = math.floor(lo / paso + 1e-9) * paso
    out, x = [], t0
    while x < hi - paso * 1e-6:
        out.append(round(x, 6))
        x += paso
    out.append(round(x, 6))
    return out


def eje(lo: float, hi: float, n: int = 4) -> tuple[float, float, list[float]]:
    """(lo, hi, ticks) con los bordes llevados a los ticks lindos."""
    t = ticks_lindos(lo, hi, n)
    return t[0], t[-1], t


def num_ar(v: float, dec: int = 1) -> str:
    """Miles con punto y decimal con coma: 1234,5 → "1.234,5"."""
    return f"{v:,.{dec}f}".replace(",", "@").replace(".", ",").replace("@", ".")


def nombre_cat(c: str) -> str:
    """"MEJ" es una sigla (macho entero joven) y queda en mayúsculas; el resto, en nombre propio."""
    return c if c == "MEJ" else c.capitalize()


# ─── la serie más larga: novillito desde 2006 ─────────────────────────────────

def novillito_largo(mensual: list[dict], ancho_mm: float = 180, alto_mm: float = 62) -> str:
    """
    El novillito en dólares por mes, oficial desde 2006 y blue desde 2011, en un
    solo eje desde cero (las dos son USD/kg). El oficial va punteado y gris, como
    en el gráfico del Índice Novillo: el lector ya aprendió ese código.
    """
    pts = [p for p in mensual if p.get("usd_oficial")]
    if len(pts) < 24:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 46, 92, 16, 26
    _, hi, tk = eje(0, max(max(p["usd_oficial"] for p in pts), max(p.get("usd_blue") or 0 for p in pts)) * 1.04, 4)
    x = _escala(0, len(pts) - 1, L, W - R)
    y = _escala(0, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Novillito en dólares desde 2006")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, usd(t, 1), 7, TINTA_3, 500, "end", mono=True))
    for i, p in enumerate(pts):
        if p["ym"].endswith("-01") and int(p["ym"][:4]) % 2 == 0:
            o.append(texto(x(i), H - B + 13, p["ym"][:4], 7, TINTA_3, 500, "middle", mono=True))
    for campo, color, grosor, guion in (("usd_oficial", TINTA_3, 1.5, ' stroke-dasharray="6 3"'),
                                        ("usd_blue", SERIE, 1.75, "")):
        idx = [i for i, p in enumerate(pts) if p.get(campo)]
        if len(idx) > 1:
            d = "M" + " L".join(f"{_f(x(i))} {_f(y(pts[i][campo]))}" for i in idx)
            o.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{grosor}"{guion} stroke-linejoin="round"/>')
    u = pts[-1]
    yb, yo = y(u.get("usd_blue") or u["usd_oficial"]), y(u["usd_oficial"])
    if abs(yo - yb) < 14:
        yo, yb = min(yo, yb) - 7, max(yo, yb) + 7
    o.append(f'<circle cx="{_f(x(len(pts)-1))}" cy="{_f(y(u.get("usd_blue") or u["usd_oficial"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
    if u.get("usd_blue"):
        o.append(texto(W - R + 8, yb + 3, f'blue {usd(u["usd_blue"])}', 7.5, TINTA, 600))
    o.append(texto(W - R + 8, yo + 3, f'oficial {usd(u["usd_oficial"])}', 7.5, TINTA_2, 500))
    con_b = [p for p in pts if p.get("usd_blue")]
    pmax = max(con_b, key=lambda p: p["usd_blue"])
    pmin = min(con_b, key=lambda p: p["usd_blue"])
    for p, dy, lbl in ((pmax, -8, "máx"), (pmin, 14, "mín")):
        i = pts.index(p)
        o.append(texto(x(i), y(p["usd_blue"]) + dy, f'{lbl} {usd(p["usd_blue"])} · {p["ym"]}', 7, TINTA_2, 500, "middle"))
    o.append(texto(L, T - 6, "Promedio mensual, USD corrientes por kilo vivo (valores nominales) · blue desde 2011", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


# ─── estacionalidad: espagueti ─────────────────────────────────────────────────

def espagueti(mensual: list[dict], anio: int, base: list[int], ancho_mm: float = 180, alto_mm: float = 72,
              rotulo_base: str = "") -> str:
    """
    Un año por línea, enero a diciembre, en USD/kg. Los años completos van en gris
    fino: son el contexto. Se rotulan tres líneas y solo tres: el año anterior, el
    promedio de la base (punteado) y el año en curso (azul, marcador en cada mes).
    La base son los años que se le pasan (los de cambio unificado), no "los últimos
    cinco". El eje no arranca en cero: acá se lee la forma del año, no el nivel.
    """
    por_anio: dict[int, dict[int, float]] = {}
    for p in mensual:
        por_anio.setdefault(int(p["ym"][:4]), {})[int(p["ym"][5:7])] = p["valor"]
    previos = [a for a in sorted(por_anio) if a < anio and len(por_anio[a]) >= 10]
    base = [a for a in base if a in por_anio]
    if anio not in por_anio or len(previos) < 3 or not base:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    prom = {m: sum(por_anio[a][m] for a in base if m in por_anio[a]) / max(1, sum(1 for a in base if m in por_anio[a]))
            for m in range(1, 13)}
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 44, 96, 18, 24
    todos = [v for a in previos + [anio] for v in por_anio[a].values()]
    lo, hi, tk = eje(min(todos) * 0.97, max(todos) * 1.02, 6)
    x = _escala(1, 12, L, W - R)
    y = _escala(lo, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Estacionalidad del novillo en dólares")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, usd(t, 1), 7, TINTA_3, 500, "end", mono=True))
    for m in range(1, 13):
        o.append(texto(x(m), H - B + 13, MESES_AB[m], 7, TINTA_3, 500, "middle"))

    def linea(serie: dict[int, float], color: str, grosor: float, extra: str = "") -> str:
        ms = sorted(serie)
        d = "M" + " L".join(f"{_f(x(m))} {_f(y(serie[m]))}" for m in ms)
        return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{grosor}" stroke-linejoin="round"{extra}/>'

    anterior = anio - 1 if (anio - 1) in previos else None
    for a in previos:
        if a != anterior:
            o.append(linea(por_anio[a], GRIS_SERIE, 1))
    if anterior:
        o.append(linea(por_anio[anterior], TINTA_3, 1.25))
    o.append(linea(prom, TINTA_2, 1.5, ' stroke-dasharray="6 3"'))
    rot = []
    if anterior:
        rot.append([y(por_anio[anterior][max(por_anio[anterior])]) + 3, str(anterior), TINTA_3, 500])
    # El rótulo de la base va en dos renglones ("promedio" / "2016–2019 y 2025").
    rot.append([y(prom[12]) + 3, rotulo_base or "promedio base", TINTA_2, 600])
    rot.sort(key=lambda r: r[0])
    for k in range(1, len(rot)):
        alto_prev = 20 if "\n" in rot[k - 1][1] else 10
        if rot[k][0] - rot[k - 1][0] < alto_prev:
            rot[k][0] = rot[k - 1][0] + alto_prev
    for yy, t, c, pz in rot:
        for j, renglon in enumerate(t.split("\n")):
            o.append(texto(x(12) + 6, yy + 10 * j, renglon, 7, c, pz))
    actual = por_anio[anio]
    o.append(linea(actual, SERIE, 2.25))
    for m, v in actual.items():
        o.append(f'<circle cx="{_f(x(m))}" cy="{_f(y(v))}" r="3.5" fill="{SERIE}" stroke="{BLANCO}" stroke-width="1.5"/>')
    um = max(actual)
    o.append(texto(x(um) + 8, y(actual[um]) + 16, f"{anio} · {usd(actual[um])}", 8, TINTA, 600))
    o.append("</svg>")
    return "".join(o)


# ─── estacionalidad: mapa de calor mes × año ───────────────────────────────────

def mapa_calor(razon: dict[str, float], indice: dict[int, float], ancho_mm: float = 180) -> str:
    """
    Cada celda: cuánto se apartó ese mes de su propio vecindario de doce meses
    (la razón sobre media móvil centrada que usa la tool `price_seasonality`).
    Azul: más caro que su entorno; gris: más barato. El número va escrito en la
    celda, porque fotocopiado el color se pierde y el número no. La última fila es
    el índice típico de cada mes. Los últimos seis meses no tienen celda: la media
    centrada necesita medio año por delante, y no se rellena.
    """
    anios = sorted({int(ym[:4]) for ym in razon})
    if len(anios) < 3:
        return _vacio(ancho_mm, 20, "serie insuficiente")
    W = round(ancho_mm * MM)
    L, T, fila = 40, 16, 15
    filas = anios + ["típico"]
    H = T + fila * len(filas) + 6
    cw = (W - L) / 12
    o = [abrir(ancho_mm, H / MM, "Mapa de calor estacional")]
    for m in range(1, 13):
        o.append(texto(L + cw * (m - 0.5), T - 5, MESES_AB[m], 7, TINTA_3, 500, "middle"))

    def color(desvio: float) -> str:
        # Cuatro pasos por lado. ±2 % es ruido de un promedio mensual: blanco.
        paso = min(3, int(abs(desvio) / 3))
        if abs(desvio) < 2:
            return BLANCO
        azul = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"]
        gris = ["#f4f4f5", "#e4e4e7", "#d4d4d8", "#a1a1aa"]
        return (azul if desvio > 0 else gris)[paso]

    for k, a in enumerate(filas):
        cy = T + fila * k
        tipico = a == "típico"
        o.append(texto(L - 5, cy + fila / 2 + 3, str(a), 7, TINTA if tipico else TINTA_2, 600 if tipico else 500, "end", mono=True))
        if tipico:
            o.append(f'<line x1="{L}" y1="{_f(cy)}" x2="{W}" y2="{_f(cy)}" stroke="{TINTA}" stroke-width="1"/>')
        for m in range(1, 13):
            v = indice.get(m) if tipico else razon.get(f"{a:04d}-{m:02d}")
            if v is None:
                continue
            d = 100 * (v - 1)
            o.append(f'<rect x="{_f(L + cw*(m-1) + 1)}" y="{_f(cy + 1)}" width="{_f(cw - 2)}" height="{fila - 2}" '
                     f'fill="{color(d)}" style="print-color-adjust:exact"/>')
            o.append(texto(L + cw * (m - 0.5), cy + fila / 2 + 3, f"{d:+.0f}".replace("+0", "0").replace("-0", "0"),
                           6.5, TINTA if abs(d) >= 2 else TINTA_3, 600 if tipico else 500, "middle", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── banda I: grilla de bandas por categoría ───────────────────────────────────

def grilla_bandas(series: list[dict], ancho_mm: float = 180, alto_mm: float = 150) -> str:
    """
    Seis paneles, uno por categoría, con la MISMA escala de pesos: es lo que deja
    ver que la vaca se paga en otra franja que el novillito. El área es la banda
    P10–P90 de cada ventana de 30 días y la línea es la mediana. Rótulo directo:
    la última mediana y la amplitud, nada más.
    """
    orden = ["NOVILLO", "NOVILLITO", "VAQUILLONA", "VACA", "TORO", "MEJ"]
    series = sorted((s for s in series if s["categoria"] in orden), key=lambda s: orden.index(s["categoria"]))
    if not series:
        return _vacio(ancho_mm, alto_mm, "sin serie de bandas")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    cols, gap_x, gap_y = 2, 26, 30
    filas = (len(series) + 1) // 2
    pw = (W - gap_x - 40) / cols
    ph = (H - 32 - gap_y * (filas - 1)) / filas
    todos = [v for s in series for p in s["puntos"] for v in (p["p10"], p["p90"])]
    lo, hi, tk = eje(min(todos) * 0.98, max(todos) * 1.01, 4 if ph > 120 else 2)
    o = [abrir(ancho_mm, alto_mm, "Banda Consignatarias por categoría en el tiempo")]
    for k, s in enumerate(series):
        ox = 40 + (k % cols) * (pw + gap_x)
        oy = 18 + (k // cols) * (ph + gap_y)
        pts = s["puntos"]
        x = _escala(0, len(pts) - 1, ox, ox + pw)
        y = _escala(lo, hi, oy + ph, oy + 24)
        for t in tk:
            o.append(f'<line x1="{_f(ox)}" y1="{_f(y(t))}" x2="{_f(ox+pw)}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
            if k % cols == 0:
                o.append(texto(ox - 4, y(t) + 3, ars(t), 6.5, TINTA_3, 500, "end", mono=True))
        area = ("M" + " L".join(f"{_f(x(i))} {_f(y(p['p90']))}" for i, p in enumerate(pts)) +
                " L" + " L".join(f"{_f(x(i))} {_f(y(p['p10']))}" for i, p in reversed(list(enumerate(pts)))) + " Z")
        # Más saturada que el BANDA del v1 y con los bordes P10 y P90 trazados: en
        # una fotocopia en blanco y negro el celeste pálido desaparecía.
        o.append(f'<path d="{area}" fill="#93c5fd" style="print-color-adjust:exact"/>')
        for borde in ("p90", "p10"):
            d = "M" + " L".join(f"{_f(x(i))} {_f(y(p[borde]))}" for i, p in enumerate(pts))
            o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1" stroke-linejoin="round"/>')
        conm = [(i, p) for i, p in enumerate(pts) if p.get("mediana")]
        if conm:
            d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['mediana']))}" for i, p in conm)
            o.append(f'<path d="{d}" fill="none" stroke="{TINTA}" stroke-width="1.75" stroke-linejoin="round"/>')
        u = pts[-1]
        o.append(texto(ox, oy + 2, nombre_cat(s["categoria"]), 8.5, TINTA, 600))
        amp = f' · Banda {_fc(u["amplitud"])}%' if u.get("amplitud") is not None else ""
        o.append(texto(ox, oy + 13, f'mediana {ars(u["mediana"] or 0)}{amp}', 7, TINTA_2, 500))
        o.append(texto(ox, oy + ph + 11, f'{date.fromisoformat(pts[0]["fecha"]).day}/{date.fromisoformat(pts[0]["fecha"]).month}', 6.5, TINTA_3, 500, mono=True))
        o.append(texto(ox + pw, oy + ph + 11, f'{date.fromisoformat(u["fecha"]).day}/{date.fromisoformat(u["fecha"]).month}', 6.5, TINTA_3, 500, "end", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── banda II: escalera de pesos ───────────────────────────────────────────────

def escalera_pesos(por_peso: list[dict], ancho_mm: float = 180, fila_h: int = 19, letra: float = 1.0) -> str:
    """
    La banda por rango de 50 kg dentro de cada categoría, con una escala común.
    Contesta la pregunta del criador: cuánto se castiga el kilo a medida que el
    animal pesa más. Barra P10–P90, punto en la mediana, el n a la derecha.
    """
    orden = ["NOVILLITO", "NOVILLO", "VAQUILLONA", "VACA", "TORO"]
    grupos = sorted((g for g in por_peso if g.get("rangos")), key=lambda g: orden.index(g["categoria"]) if g["categoria"] in orden else 9)
    filas = [(g["categoria"], r) for g in grupos for r in g["rangos"] if (r.get("lotes") or 0) >= 10]
    if not filas:
        return _vacio(ancho_mm, 20, "sin bandas por peso")
    W = round(ancho_mm * MM)
    L, R, T = round(128 * letra), round(76 * letra), round(18 * letra)
    cab_h = round(12 * letra)
    n_cab = len({c for c, _ in filas})
    H = T + fila_h * len(filas) + cab_h * n_cab + 6
    # Con letra grande el área de dibujo se achica: menos ticks para que no se pisen.
    lo, hi, tk = eje(min(r["p10"] for _, r in filas) * 0.98, max(r["p90"] for _, r in filas) * 1.02,
                     4 if W - R - L > 340 else 2)
    x = _escala(lo, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, "Escalera de pesos")]
    for t in tk:
        o.append(f'<line x1="{_f(x(t))}" y1="{T-6}" x2="{_f(x(t))}" y2="{H-6}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(x(t), T - 9, ars(t), 7 * letra, TINTA_3, 500, "middle", mono=True))
    cy = T
    previa = None
    for cat, r in filas:
        if cat != previa:
            cy += cab_h
            o.append(texto(0, cy - 2, nombre_cat(cat), 8 * letra, TINTA, 600))
            o.append(f'<line x1="0" y1="{_f(cy+1)}" x2="{L-10}" y2="{_f(cy+1)}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')
            previa = cat
        c = cy + fila_h / 2 + 2
        o.append(texto(L - 10, c + 3, f'{r["desde_kg"]}–{r["hasta_kg"]} kg', 7.5 * letra, TINTA_2, 500, "end", mono=True))
        fina = (r.get("lotes") or 0) < 30
        x1, x2 = x(r["p10"]), x(r["p90"])
        relleno = "none" if fina else "#93c5fd"
        o.append(f'<rect x="{_f(x1)}" y="{_f(c-4*letra)}" width="{_f(max(x2-x1,2))}" height="{_f(8*letra)}" rx="3" fill="{relleno}" '
                 f'stroke="{SERIE}" stroke-width="1" style="print-color-adjust:exact"/>')
        if r.get("mediana"):
            o.append(f'<circle cx="{_f(x(r["mediana"]))}" cy="{_f(c)}" r="{_f(4.5*letra)}" fill="{SERIE_OSC}" stroke="{BLANCO}" stroke-width="1.5"/>')
            o.append(texto(x2 + 5, c + 3, ars(r["mediana"]), 7 * letra, TINTA, 600, mono=True))
        o.append(texto(W - 2, c + 3, f'n={r.get("lotes")}' + (" · fina" if fina else ""), 6.5 * letra, TINTA_3, 500, "end"))
        cy += fila_h
    o.append("</svg>")
    return "".join(o)


# ─── precios relativos ─────────────────────────────────────────────────────────

def relativos_paneles(series: list[dict], ancho_mm: float = 180, alto_mm: float = 46, letra: float = 1.0) -> str:
    """
    Tres paneles chicos, uno por relación (vaca, vaquillona y novillito sobre
    novillo), con UNA escala común: con escalas propias, la vaquillona que se movió
    de 0,98 a 1,07 parecía tan agitada como la vaca que pasó de 0,56 a 0,71. La
    línea de 1,00 es el novillo; la punteada, el promedio de la propia serie. No
    hay umbral externo: la serie empieza en junio de 2026.
    """
    if not series:
        return _vacio(ancho_mm, alto_mm, "sin serie de precios relativos")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    n = len(series)
    gap = 18
    L0 = round(30 * letra)
    pw = (W - L0 - gap * (n - 1)) / n
    todos = [p["relacion"] for s in series for p in s["puntos"]] + [1.0]
    lo, hi, tk = eje(min(todos) * 0.99, max(todos) * 1.01, 4)
    o = [abrir(ancho_mm, alto_mm, "Precios relativos contra el novillo")]
    T = round(34 * letra)
    for k, s in enumerate(series):
        ox = L0 + k * (pw + gap)
        pts = s["puntos"]
        vals = [p["relacion"] for p in pts]
        prom = sum(vals) / len(vals)
        x = _escala(0, len(pts) - 1, ox, ox + pw)
        y = _escala(lo, hi, H - 18, T)
        for t in tk:
            o.append(f'<line x1="{_f(ox)}" y1="{_f(y(t))}" x2="{_f(ox+pw)}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
            if k == 0:
                o.append(texto(ox - 4, y(t) + 3, _num(t), 6.5 * letra, TINTA_3, 500, "end", mono=True))
        o.append(f'<line x1="{_f(ox)}" y1="{_f(y(1))}" x2="{_f(ox+pw)}" y2="{_f(y(1))}" stroke="{TINTA}" stroke-width="1"/>')
        o.append(texto(ox, 10 * letra, f'{nombre_cat(s["categoria"])} / novillo', 8 * letra, TINTA, 600))
        o.append(f'<line x1="{_f(ox)}" y1="{_f(y(prom))}" x2="{_f(ox+pw)}" y2="{_f(y(prom))}" stroke="{FILETE_FUERTE}" stroke-width="1" stroke-dasharray="4 3"/>')
        d = "M" + " L".join(f"{_f(x(i))} {_f(y(v))}" for i, v in enumerate(vals))
        o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.75" stroke-linejoin="round"/>')
        o.append(f'<circle cx="{_f(x(len(vals)-1))}" cy="{_f(y(vals[-1]))}" r="3.5" fill="{SERIE}" stroke="{BLANCO}" stroke-width="1.5"/>')
        o.append(texto(ox, 22 * letra, f'de {_num(vals[0])} a {_num(vals[-1])} · promedio {_num(prom)}', 7 * letra, TINTA_2, 500))
        f0, f1 = date.fromisoformat(pts[0]["fecha"]), date.fromisoformat(pts[-1]["fecha"])
        o.append(texto(ox, H - 6, f"{f0.day}/{f0.month}", 6.5 * letra, TINTA_3, 500, mono=True))
        o.append(texto(ox + pw, H - 6, f"{f1.day}/{f1.month}", 6.5 * letra, TINTA_3, 500, "end", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── ciclo: % hembras con franja propia ────────────────────────────────────────

def hembras_franja(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 58) -> str:
    """
    % de hembras por mes como línea, con la franja entre el cuartil 1 y el 3 de la
    PROPIA serie y la mediana marcada. No hay umbral externo dibujado: los
    umbrales de liquidación (~43–45 %) son de la faena nacional y Cañuelas corre
    quince a veinte puntos por encima porque concentra venta de vientres.
    """
    if len(puntos) < 3:
        return _vacio(ancho_mm, alto_mm, "serie propia aún corta")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 40, 140, 16, 24
    vals = sorted(p["pct"] for p in puntos)
    n = len(vals)
    q1, med, q3 = vals[n // 4], vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2, vals[(3 * n) // 4]
    lo, hi, tk = eje(min(vals) - 1, max(vals) + 0.5, 4)
    x = _escala(0, n - 1, L + 10, W - R)
    y = _escala(lo, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Hembras sobre el total operado")]
    o.append(f'<rect x="{L}" y="{_f(y(q3))}" width="{_f(W-R-L)}" height="{_f(max(y(q1)-y(q3),1))}" fill="{CERO}" style="print-color-adjust:exact"/>')
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, f"{_fc(t)}%", 7, TINTA_3, 500, "end", mono=True))
    o.append(f'<line x1="{L}" y1="{_f(y(med))}" x2="{W-R}" y2="{_f(y(med))}" stroke="{TINTA}" stroke-width="1.25" stroke-dasharray="5 3"/>')
    o.append(texto(W - R + 6, y(med) + 3, f"mediana propia {_fc(med)}%", 7, TINTA, 600))
    # Los rótulos de los cuartiles se corren si quedan pegados al de la mediana.
    y3, y1 = min(y(q3), y(med) - 10), max(y(q1), y(med) + 10)
    o.append(texto(W - R + 6, y3 + 3, f"cuartil 3 · {_fc(q3)}%", 6.5, TINTA_3, 500))
    o.append(texto(W - R + 6, y1 + 3, f"cuartil 1 · {_fc(q1)}%", 6.5, TINTA_3, 500))
    d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['pct']))}" for i, p in enumerate(puntos))
    o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="2" stroke-linejoin="round"/>')
    for i, p in enumerate(puntos):
        o.append(f'<circle cx="{_f(x(i))}" cy="{_f(y(p["pct"]))}" r="3.5" fill="{SERIE}" stroke="{BLANCO}" stroke-width="1.5"/>')
        # Con más de 12 meses, un rótulo cada tres: si no, se pisan.
        if n <= 12 or i % 3 == (n - 1) % 3:
            o.append(texto(x(i), H - B + 13, p["ym"][2:], 7, TINTA_3, 500, "middle", mono=True))
    u = puntos[-1]
    # El último valor va del lado de la línea que no tiene los rótulos de la franja.
    dy = 16 if u["pct"] < med else -9
    o.append(texto(x(n - 1) - 8, y(u["pct"]) + dy, f'{_fc(u["pct"])}%', 8, TINTA, 600, "end"))
    o.append(texto(L, T - 5, f"Franja gris: entre el cuartil 1 y el 3 de los {n} meses medidos", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


# ─── barras horizontales ordenadas ─────────────────────────────────────────────

def barras_ordenadas(filas: list[tuple[str, float, str]], ancho_mm: float = 87, fila_h: int = 18,
                     L: int = 104, R: int = 52, destacar: str | None = None, titulo: str = "",
                     corte: int = 60, barra: float = 11, letra: float = 7.5) -> str:
    """
    Barras horizontales de mayor a menor, etiqueta a la izquierda y valor al final.
    Nominal: un solo tono, salvo la fila que se quiere señalar.
    """
    if not filas:
        return _vacio(ancho_mm, 20, "sin datos")
    W = round(ancho_mm * MM)
    T = 6
    H = T + fila_h * len(filas) + 4
    hi = max(v for _, v, _ in filas) * 1.02
    x = _escala(0, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, titulo)]
    for i, (et, v, rot) in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        fuerte = destacar is not None and et == destacar
        o.append(texto(L - 6, cy + letra * 0.45, _corto(et, corte), letra, TINTA, 600 if fuerte else 500, "end"))
        o.append(f'<rect x="{L}" y="{_f(cy-barra/2)}" width="{_f(max(x(v)-L,2))}" height="{_f(barra)}" rx="3" '
                 f'fill="{SERIE_OSC if fuerte else (SERIE if destacar is None else "#93c5fd")}" '
                 f'stroke="{SERIE_OSC if fuerte or destacar is None else SERIE}" stroke-width="1" style="print-color-adjust:exact"/>')
        o.append(texto(x(v) + 5, cy + letra * 0.45, rot, letra, TINTA, 600 if fuerte else 500, mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── Argentina contra los niveles de afuera ────────────────────────────────────

def argentina_vs_niveles(mensual_usd: list[dict], paises: list[dict], cierre: dict, meses: int = 24,
                         ancho_mm: float = 180, alto_mm: float = 62) -> str:
    """
    El Índice Novillo en dólares de los últimos dos años, contra el nivel de HOY
    de cada país como línea horizontal. No es una serie de los otros países (no la
    tenemos): es una regla para medir cuánto tendría que subir el novillo
    argentino para alcanzarlos, y el rótulo lleva la fecha del dato de afuera.
    """
    pts = mensual_usd[-meses:]
    if len(pts) < 6 or not paises:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 46, 150, 12, 24
    _, hi, tk = eje(0, max(max(p["valor"] for p in pts), max(q["usd_kg_vivo"] for q in paises)) * 1.02, 4)
    x = _escala(0, len(pts) - 1, L, W - R)
    y = _escala(0, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Argentina contra los niveles de afuera")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, usd(t, 1), 7, TINTA_3, 500, "end", mono=True))
    usados: list[float] = []
    for q in sorted(paises, key=lambda q: q["usd_kg_vivo"], reverse=True):
        yy = y(q["usd_kg_vivo"])
        o.append(f'<line x1="{L}" y1="{_f(yy)}" x2="{W-R}" y2="{_f(yy)}" stroke="{TINTA_2}" stroke-width="1" stroke-dasharray="5 3"/>')
        yt = yy + 3
        while any(abs(yt - u) < 10 for u in usados):
            yt += 10
        usados.append(yt)
        o.append(texto(W - R + 6, yt, f'{q["pais"]} {usd(q["usd_kg_vivo"])} · {q.get("fecha_ar") or q["fecha"]}', 7, TINTA_2, 500))
    # La línea es el promedio mensual (la serie); el punto rotulado es el CIERRE, la
    # misma base argentina que usa toda la página.
    d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['valor']))}" for i, p in enumerate(pts))
    o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="2" stroke-linejoin="round"/>')
    cx = x(len(pts) - 1)
    o.append(f'<circle cx="{_f(cx)}" cy="{_f(y(cierre["usd_blue"]))}" r="4" fill="{SERIE_OSC}" stroke="{BLANCO}" stroke-width="2"/>')
    fc = date.fromisoformat(cierre["fecha"])
    o.append(texto(cx - 6, y(cierre["usd_blue"]) + 15, f'Argentina, cierre {fc.day:02d}/{fc.month:02d}/{fc.year}: {usd(cierre["usd_blue"])}', 7.5, TINTA, 600, "end"))
    for i, p in enumerate(pts):
        if i % 6 == 0 or i == len(pts) - 1:
            o.append(texto(x(i), H - B + 13, f'{p["ym"][5:7]}/{p["ym"][:4]}', 7, TINTA_3, 500, "middle", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── maíz / novillo, contra su mediana propia ──────────────────────────────────

def ratio_maiz(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 54) -> str:
    """
    Kg de maíz que compra 1 kg de novillo. A diferencia del v1 no hay "umbral de
    referencia" de afuera: se marca la mediana de la propia serie dibujada y nada
    más, sin frase que la interprete.
    """
    pts = [p for p in puntos if p.get("relacion")][-72:]
    if len(pts) < 6:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 44, 80, 16, 26
    vals = sorted(p["relacion"] for p in pts)
    n = len(vals)
    med = vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2
    lo, hi, tk = eje(min(vals) * 0.95, max(vals) * 1.02, 4)
    x = _escala(0, len(pts) - 1, L, W - R)
    y = _escala(lo, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Relación maíz / novillo")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, _num(t, 0), 7, TINTA_3, 500, "end", mono=True))
    o.append(f'<line x1="{L}" y1="{_f(y(med))}" x2="{W-R}" y2="{_f(y(med))}" stroke="{TINTA}" stroke-width="1.25" stroke-dasharray="5 3"/>')
    o.append(texto(W - R + 6, y(med) + 3, f"mediana {_num(med, 1)}", 7, TINTA, 600))
    d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['relacion']))}" for i, p in enumerate(pts))
    o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.75" stroke-linejoin="round"/>')
    u = pts[-1]
    o.append(f'<circle cx="{_f(x(len(pts)-1))}" cy="{_f(y(u["relacion"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
    o.append(texto(W - R + 6, y(u["relacion"]) - 6, f'{_num(u["relacion"], 1)} kg · {u["ym"][5:7]}/{u["ym"][:4]}', 7.5, TINTA, 600))
    for i, p in enumerate(pts):
        if i % 12 == 0 or i == len(pts) - 1:
            o.append(texto(x(i), H - B + 12, p["ym"][:4], 7, TINTA_3, 500, "middle", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── composición del mes, con "otras" ──────────────────────────────────────────

def barras_composicion(filas: list[dict], ancho_mm: float = 87) -> str:
    """Cabezas por categoría sobre el total del mes; la última fila junta lo que no llega a 10 lotes."""
    filas = [f for f in filas if f.get("cabezas")]
    if not filas:
        return _vacio(ancho_mm, 20, "sin composición del mes")
    W = round(ancho_mm * MM)
    L, R, T, fila_h = 74, 118, 6, 20
    H = T + fila_h * len(filas) + 6
    hi = max(f["cabezas"] for f in filas)
    x = _escala(0, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, "Composición del mes")]
    for i, f in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        otras = f["categoria"] == "OTRAS"
        o.append(texto(0, cy + 3, "Otras" if otras else nombre_cat(f["categoria"]), 7.5, TINTA_2 if otras else TINTA, 600))
        o.append(f'<rect x="{L}" y="{_f(cy-6)}" width="{_f(max(x(f["cabezas"])-L,2))}" height="12" rx="3" '
                 f'fill="{"none" if otras else SERIE}" stroke="{SERIE}" stroke-width="1" style="print-color-adjust:exact"/>')
        o.append(texto(W - 2, cy + 3, f'{num_ar(f["cabezas"], 0)} cab · {num_ar(f["share"], 1)}%', 7, TINTA, 500, "end", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── fuentes públicas nuevas ───────────────────────────────────────────────────
#
# Lo que suman la faena y el stock del MAGyP/SENASA, las exportaciones del INDEC,
# el IPC y el clima. Mismas reglas: un solo azul, el gris para lo que compara,
# rótulo directo y el número escrito donde el color se pierde al fotocopiar.

GRIS_BARRA = "#a1a1aa"


def _mm_aa(ym: str) -> str:
    return f"{ym[5:7]}/{ym[2:4]}"


def lineas_mensuales(series: list[dict], ancho_mm: float = 180, alto_mm: float = 62, fmt=ars,
                     leyenda: str = "", extremos: bool = True, R: int = 96) -> str:
    """
    Varias series mensuales en la misma unidad, en un eje desde cero. Cada serie es
    {"nombre", "puntos": [{"ym", "valor"}], "color", "grosor", "guion"}; la primera
    es la figura (lleva el máximo y el mínimo rotulados) y el resto, comparación.
    Rótulo directo al final de cada línea, sin leyenda aparte.
    """
    meses = sorted({q["ym"] for s in series for q in s["puntos"]})
    if len(meses) < 12:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, T, B = 50, 16, 24
    _, hi, tk = eje(0, max(q["valor"] for s in series for q in s["puntos"]) * 1.04, 4)
    pos = {ym: i for i, ym in enumerate(meses)}
    x = _escala(0, len(meses) - 1, L, W - R)
    y = _escala(0, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, leyenda)]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, fmt(t), 7, TINTA_3, 500, "end", mono=True))
    paso = 1 if len(meses) <= 72 else 2
    for ym in meses:
        if ym.endswith("-01") and (int(ym[:4]) % paso == 0):
            o.append(texto(x(pos[ym]), H - B + 13, ym[:4], 7, TINTA_3, 500, "middle", mono=True))
    rot = []
    for s in series:
        pts = sorted(s["puntos"], key=lambda q: q["ym"])
        d = "M" + " L".join(f"{_f(x(pos[q['ym']]))} {_f(y(q['valor']))}" for q in pts)
        o.append(f'<path d="{d}" fill="none" stroke="{s.get("color", SERIE)}" stroke-width="{s.get("grosor", 1.75)}"'
                 f'{s.get("guion", "")} stroke-linejoin="round"/>')
        u = pts[-1]
        rot.append([y(u["valor"]) + 3, f'{s["nombre"]} {fmt(u["valor"])}', s.get("color", SERIE)])
    rot.sort(key=lambda r: r[0])
    for k in range(1, len(rot)):
        if rot[k][0] - rot[k - 1][0] < 11:
            rot[k][0] = rot[k - 1][0] + 11
    for yy, t, c in rot:
        o.append(texto(W - R + 8, yy, t, 7.5, TINTA if c == SERIE else TINTA_2, 600 if c == SERIE else 500))
    u0 = sorted(series[0]["puntos"], key=lambda q: q["ym"])[-1]
    o.append(f'<circle cx="{_f(x(pos[u0["ym"]]))}" cy="{_f(y(u0["valor"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
    if extremos:
        pts = series[0]["puntos"]
        pmax, pmin = max(pts, key=lambda q: q["valor"]), min(pts, key=lambda q: q["valor"])
        for q, dy, lbl in ((pmax, -8, "máx"), (pmin, 14, "mín")):
            o.append(texto(x(pos[q["ym"]]), y(q["valor"]) + dy, f'{lbl} {fmt(q["valor"])} · {_mm_aa(q["ym"])}', 7,
                           TINTA_2, 500, "middle"))
    if leyenda:
        o.append(texto(L, T - 6, leyenda, 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


def columnas_exportacion(mensual: list[dict], meses: int = 36, ancho_mm: float = 87, alto_mm: float = 56) -> str:
    """
    Toneladas exportadas por mes (peso producto). La parte de arriba de cada
    columna, hueca, es la partida 0202.20 (congelada con hueso, que trae los huesos
    de desposte): así se ve cuánto del volumen no es carne deshuesada sin restarlo.
    """
    pts = mensual[-meses:]
    if len(pts) < 12:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 40, 8, 24, 22
    _, hi, tk = eje(0, max(q["t"] for q in pts) * 1.04, 4)
    cw = (W - L - R) / len(pts)
    y = _escala(0, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "Exportaciones de carne bovina por mes")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 4, y(t) + 3, f"{num_ar(t / 1000, 0)} mil", 6.5, TINTA_3, 500, "end", mono=True))
    for i, q in enumerate(pts):
        x0 = L + cw * i + cw * 0.15
        w = cw * 0.7
        base = q["t"] - (q.get("t_hueso") or 0)
        o.append(f'<rect x="{_f(x0)}" y="{_f(y(base))}" width="{_f(w)}" height="{_f(y(0) - y(base))}" fill="{SERIE}" '
                 f'style="print-color-adjust:exact"/>')
        if q.get("t_hueso"):
            o.append(f'<rect x="{_f(x0)}" y="{_f(y(q["t"]))}" width="{_f(w)}" height="{_f(y(base) - y(q["t"]))}" '
                     f'fill="{BLANCO}" stroke="{SERIE}" stroke-width="1"/>')
        if i % 6 == (len(pts) - 1) % 6:
            o.append(texto(x0 + w / 2, H - B + 12, _mm_aa(q["ym"]), 6.5, TINTA_3, 500, "middle", mono=True))
    u = pts[-1]
    o.append(texto(W - R, T - 12, f'{_mm_aa(u["ym"])}: {num_ar(u["t"], 0)} t · hueco: 0202.20', 7, TINTA, 600, "end"))
    o.append("</svg>")
    return "".join(o)


def barras_pareadas(filas: list[dict], ancho_mm: float = 180, fila_h: int = 22, L: int = 150, R: int = 170,
                    et_actual: str = "", et_anterior: str = "", letra: float = 7.5) -> str:
    """
    Destinos ordenados: dos barras por fila, el año en curso (azul lleno) y el
    mismo período del año anterior (gris hueco), en la misma escala. Barras y no
    torta: con trece destinos y China en el 60 %, la torta no deja leer el resto.
    filas: [{"nombre", "v", "v_ant", "rot"}].
    """
    if not filas:
        return _vacio(ancho_mm, 20, "sin datos")
    W = round(ancho_mm * MM)
    T = 18
    H = T + fila_h * len(filas) + 4
    hi = max(max(f["v"], f["v_ant"] or 0) for f in filas) * 1.02
    x = _escala(0, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, "Destinos")]
    o.append(f'<rect x="{L}" y="2" width="14" height="7" fill="{SERIE}"/>')
    o.append(texto(L + 18, 9, et_actual, 7, TINTA, 600))
    o.append(f'<rect x="{L + 150}" y="2" width="14" height="7" fill="{BLANCO}" stroke="{GRIS_BARRA}" stroke-width="1"/>')
    o.append(texto(L + 168, 9, et_anterior, 7, TINTA_2, 500))
    for i, f in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        o.append(texto(L - 6, cy + 3, f["nombre"], letra, TINTA, 500, "end"))
        b = fila_h * 0.32
        o.append(f'<rect x="{L}" y="{_f(cy - b - 1)}" width="{_f(max(x(f["v"]) - L, 1.5))}" height="{_f(b)}" '
                 f'fill="{SERIE}" style="print-color-adjust:exact"/>')
        if f.get("v_ant") is not None:
            o.append(f'<rect x="{L}" y="{_f(cy + 1)}" width="{_f(max(x(f["v_ant"]) - L, 1.5))}" height="{_f(b)}" '
                     f'fill="{BLANCO}" stroke="{GRIS_BARRA}" stroke-width="1"/>')
        o.append(texto(max(x(f["v"]), x(f.get("v_ant") or 0)) + 5, cy + 3, f["rot"], letra - 0.5, TINTA, 500, mono=True))
    o.append("</svg>")
    return "".join(o)


def enso_barras(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 58) -> str:
    """
    El RONI por trimestre móvil (columnas) y el ONI (línea gris punteada) para
    comparar. Las líneas de ±0,5 °C son el umbral del CPC; azul a partir de +0,5
    (El Niño), gris oscuro por debajo de −0,5 (La Niña), gris claro en el medio.
    """
    pts = [q for q in puntos if q.get("roni") is not None]
    if len(pts) < 12:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 40, 70, 14, 24
    vals = [q["roni"] for q in pts] + [q["oni"] for q in pts if q.get("oni") is not None]
    lo, hi, tk = eje(min(min(vals), -1.0) - 0.1, max(max(vals), 1.0) + 0.1, 5)
    cw = (W - L - R) / len(pts)
    y = _escala(lo, hi, H - B, T)
    o = [abrir(ancho_mm, alto_mm, "ENSO: RONI y ONI")]
    for t in tk:
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 4, y(t) + 3, f"{t:+.1f}".replace(".", ",").replace("+0,0", "0"), 7, TINTA_3, 500, "end", mono=True))
    o.append(f'<line x1="{L}" y1="{_f(y(0))}" x2="{W-R}" y2="{_f(y(0))}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')
    for u, et in ((0.5, "+0,5 · El Niño"), (-0.5, "−0,5 · La Niña")):
        o.append(f'<line x1="{L}" y1="{_f(y(u))}" x2="{W-R}" y2="{_f(y(u))}" stroke="{TINTA_2}" stroke-width="1" stroke-dasharray="4 3"/>')
        o.append(texto(W - R + 6, y(u) + 3, et, 7, TINTA_2, 500))
    for i, q in enumerate(pts):
        v = q["roni"]
        color = SERIE if v >= 0.5 else (TINTA_3 if v <= -0.5 else FILETE)
        x0 = L + cw * i + cw * 0.12
        o.append(f'<rect x="{_f(x0)}" y="{_f(min(y(v), y(0)))}" width="{_f(cw * 0.76)}" height="{_f(abs(y(v) - y(0)))}" '
                 f'fill="{color}" style="print-color-adjust:exact"/>')
        if q["periodo"].endswith("-01") or i == len(pts) - 1:
            o.append(texto(x0 + cw * 0.38, H - B + 13, f'{q["temporada"]} {q["periodo"][2:4]}', 6.5, TINTA_3, 500,
                           "middle", mono=True))
    con_oni = [(i, q["oni"]) for i, q in enumerate(pts) if q.get("oni") is not None]
    if len(con_oni) > 1:
        d = "M" + " L".join(f"{_f(L + cw * (i + 0.5))} {_f(y(v))}" for i, v in con_oni)
        o.append(f'<path d="{d}" fill="none" stroke="{TINTA}" stroke-width="1.25" stroke-dasharray="5 3" stroke-linejoin="round"/>')
    u = pts[-1]
    yr, yo = y(u["roni"]) + 3, y(u.get("oni") if u.get("oni") is not None else u["roni"]) + 3
    if abs(yr - yo) < 11:
        yr, yo = max(yr, yo) + 6, min(yr, yo) - 5
    o.append(texto(W - R + 6, yr, f'RONI {u["roni"]:+.2f}'.replace(".", ","), 7.5, TINTA, 600))
    if u.get("oni") is not None:
        o.append(texto(W - R + 6, yo, f'ONI {u["oni"]:+.2f}'.replace(".", ","), 7, TINTA_2, 500))
    o.append(texto(L, T - 5, "°C de anomalía en Niño 3.4, trimestre móvil · columnas: RONI · punteada: ONI", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


def barras_lluvia(filas: list[dict], ancho_mm: float = 180, fila_h: int = 17, L: int = 170, R: int = 150) -> str:
    """
    Lluvia del mes como % de la normal 1991–2020, con la línea del 100 %. Las
    estaciones van de norte a sur (el orden del corredor), no por valor: lo que se
    lee es dónde llovió de más y dónde de menos. Azul por encima de la normal, gris
    por debajo. filas: [{"nombre", "pct", "rot"}].
    """
    filas = [f for f in filas if f.get("pct") is not None]
    if not filas:
        return _vacio(ancho_mm, 20, "sin estaciones con dato")
    W = round(ancho_mm * MM)
    T = 16
    H = T + fila_h * len(filas) + 4
    hi = max(200, max(f["pct"] for f in filas) * 1.02)
    x = _escala(0, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, "Lluvia sobre la normal")]
    for t in (0, 50, 100, 150, 200) + ((300,) if hi >= 300 else ()):
        o.append(f'<line x1="{_f(x(t))}" y1="{T - 4}" x2="{_f(x(t))}" y2="{H - 4}" stroke="{TINTA if t == 100 else FILETE}" '
                 f'stroke-width="1"{"" if t == 100 else ""}/>')
        o.append(texto(x(t), T - 7, f"{t}%", 6.5, TINTA if t == 100 else TINTA_3, 600 if t == 100 else 500, "middle", mono=True))
    for i, f in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        o.append(texto(L - 6, cy + 3, f["nombre"], 7, TINTA, 500, "end"))
        v = f["pct"]
        x0, x1 = sorted((x(100), x(v)))
        o.append(f'<rect x="{_f(x0)}" y="{_f(cy - 5)}" width="{_f(max(x1 - x0, 1.5))}" height="10" '
                 f'fill="{SERIE if v >= 100 else GRIS_BARRA}" style="print-color-adjust:exact"/>')
        o.append(texto(max(x(v), x(100)) + 5, cy + 3, f["rot"], 7, TINTA, 500, mono=True))
    o.append("</svg>")
    return "".join(o)


def stock_paneles(puntos: list[dict], cats: list[tuple[str, str]], ancho_mm: float = 180, alto_mm: float = 64) -> str:
    """
    El stock al 31/12 por categoría, un panel por categoría y CADA UNO CON SU
    ESCALA: las vacas son 21 millones y los novillos 2, en una escala común los
    novillos serían una raya. Por eso cada panel lleva escritos el primer y el
    último valor, en millones: el número manda, no la pendiente.
    cats: [(clave o "a+b", nombre)].
    """
    if len(puntos) < 3:
        return _vacio(ancho_mm, alto_mm, "serie insuficiente")
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    cols = 4
    filas = (len(cats) + cols - 1) // cols
    gx, gy = 16, 16
    pw = (W - gx * (cols - 1)) / cols
    ph = (H - gy * (filas - 1)) / filas
    o = [abrir(ancho_mm, alto_mm, "Stock bovino por categoría")]

    def valor(q: dict, clave: str) -> float:
        return sum(q[c] for c in clave.split("+"))

    for k, (clave, nombre) in enumerate(cats):
        ox, oy = (k % cols) * (pw + gx), (k // cols) * (ph + gy)
        vals = [valor(q, clave) for q in puntos]
        lo, hi = min(vals), max(vals)
        pad = (hi - lo) * 0.15 or hi * 0.05
        x = _escala(0, len(vals) - 1, ox + 4, ox + pw - 4)
        y = _escala(lo - pad, hi + pad, oy + ph - 14, oy + 26)
        o.append(f'<rect x="{_f(ox)}" y="{_f(oy + 20)}" width="{_f(pw)}" height="{_f(ph - 30)}" fill="none" '
                 f'stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(ox, oy + 8, nombre, 7.5, TINTA, 600))
        u, a = vals[-1], vals[-2]
        o.append(texto(ox, oy + 17, f"{num_ar(u / 1e6, 2)} M · {'+' if u >= a else '−'}{num_ar(abs(100 * (u / a - 1)), 1)}% vs {puntos[-2]['periodo']}",
                       6.5, TINTA_2, 500))
        d = "M" + " L".join(f"{_f(x(i))} {_f(y(v))}" for i, v in enumerate(vals))
        o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.5" stroke-linejoin="round"/>')
        o.append(f'<circle cx="{_f(x(len(vals) - 1))}" cy="{_f(y(u))}" r="2.5" fill="{SERIE}"/>')
        o.append(texto(ox + 4, oy + ph - 3, f'{puntos[0]["periodo"]}: {num_ar(vals[0] / 1e6, 2)}', 6, TINTA_3, 500, mono=True))
        o.append(texto(ox + pw - 4, oy + ph - 3, puntos[-1]["periodo"], 6, TINTA_3, 500, "end", mono=True))
    o.append("</svg>")
    return "".join(o)
