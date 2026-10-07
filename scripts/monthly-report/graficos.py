#!/usr/bin/env python3
"""
Los gráficos de El Corredor, como SVG inline para papel.

TRES DECISIONES QUE EXPLICAN TODO LO DEMÁS

1. **Fondo blanco y tinta mínima.** El informe se imprime en una impresora de
   oficina. No hay rellenos a sangre, no hay sombras, no hay grilla punteada
   (a 0,5 px se imprime como una fila de puntos sucios: la grilla va sólida de
   1 px). Ningún trazo por debajo de 1 px, porque Chromium rasteriza el
   sub-píxel y en papel desaparece.

2. **La identidad se codifica por CLARIDAD, no por tono.** Medidos en escala de
   grises, los ocho tonos de una paleta categórica caen en una franja de 14
   puntos de luminancia: fotocopiado, el color deja de distinguir. La rampa de
   un solo azul separa 11 puntos por paso. Así que: un azul, pasos de claridad,
   máximo dos o tres identidades por gráfico, y textura cuando hay que
   diferenciar dos áreas.

3. **Etiquetado directo, no leyenda.** En papel no hay hover. Se etiquetan tres
   cosas y solo tres —último valor, máximo y mínimo— y cada figura lleva su
   tabla al pie en el render, porque un valor encerrado en una imagen no se
   puede consultar.

Geometría: el `viewBox` va en px a 96 dpi y el `width` en mm, así que 1 unidad =
1 px CSS = la medida impresa. `font-size` en px se convierte con 1 pt = 1,3333 px.
"""

from __future__ import annotations

from datetime import date
from typing import Callable, Sequence

MM = 3.7795  # px CSS por mm a 96 dpi

# Paleta de papel, derivada de los tokens del tema claro del sitio.
TINTA = "#18181b"        # 17,7:1 sobre blanco
TINTA_2 = "#52525b"      # 7,7:1  — rótulos y ticks
TINTA_3 = "#71717a"      # 4,8:1  — notas, y la serie de comparación
FILETE = "#d4d4d8"       # grilla
FILETE_FUERTE = "#a1a1aa"  # eje base
SERIE = "#1d4ed8"        # cielo: el único acento de marca
SERIE_OSC = "#1e40af"
BANDA = "#bfdbfe"
BANDA_CLARA = "#dbeafe"
POSITIVO = "#065f46"
NEGATIVO = "#b91c1c"
BLANCO = "#ffffff"

# Rampa ordinal de un solo tono (validada: luminosidad monótona, un solo matiz).
RAMPA = ["#60a5fa", "#3b82f6", "#1d4ed8", "#1e3a8a"]

PT = 1.3333  # px por punto tipográfico


def _f(x: float) -> str:
    """Un decimal: más precisión solo infla el PDF."""
    return f"{x:.1f}".rstrip("0").rstrip(".") if abs(x) < 10000 else f"{x:.0f}"


def abrir(ancho_mm: float, alto_mm: float, titulo: str = "") -> str:
    w, h = round(ancho_mm * MM), round(alto_mm * MM)
    t = f"<title>{titulo}</title>" if titulo else ""
    return (
        f'<svg width="{ancho_mm}mm" height="{alto_mm}mm" viewBox="0 0 {w} {h}" '
        f'xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" '
        f'font-family="Inter, system-ui, sans-serif" role="img">{t}'
    )


def texto(x: float, y: float, s: str, pt: float = 7.5, color: str = TINTA_3,
          peso: int = 500, anchor: str = "start", mono: bool = False) -> str:
    fam = ' font-family="JetBrains Mono, monospace"' if mono else ""
    return (f'<text x="{_f(x)}" y="{_f(y)}" font-size="{_f(pt * PT)}" fill="{color}" '
            f'font-weight="{peso}" text-anchor="{anchor}"{fam}>{s}</text>')


def _escala(v0: float, v1: float, p0: float, p1: float) -> Callable[[float], float]:
    if v1 == v0:
        return lambda v: (p0 + p1) / 2
    k = (p1 - p0) / (v1 - v0)
    return lambda v: p0 + (v - v0) * k


def _ticks(lo: float, hi: float, n: int = 4) -> list[float]:
    """Cifras redondas, máximo 5 líneas de grilla."""
    if hi <= lo:
        return [lo]
    crudo = (hi - lo) / n
    mag = 10 ** (len(str(int(abs(crudo)))) - 1) if abs(crudo) >= 1 else 0.1
    paso = max(mag, round(crudo / mag) * mag)
    t, x = [], (int(lo / paso) * paso)
    while x <= hi + paso * 0.01:
        if x >= lo - paso * 0.01:
            t.append(round(x, 4))
        x += paso
    return t or [lo, hi]


DIAS = {0: "lunes", 1: "martes", 2: "miércoles", 3: "jueves", 4: "viernes", 5: "sábado", 6: "domingo"}
MESES_AB = {1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun",
            7: "jul", 8: "ago", 9: "sep", 10: "oct", 11: "nov", 12: "dic"}


def fecha_es(iso: str, con_dia: bool = True) -> str:
    """
    Fecha en castellano rioplatense: "martes 1/9". Nunca `strftime("%a")`, que en
    Python depende del locale del sistema y en el runner de CI devuelve "Tue" —
    así se imprimió el informe hasta ahora.
    """
    d = date.fromisoformat(str(iso)[:10])
    cuerpo = f"{d.day}/{d.month}"
    return f"{DIAS[d.weekday()]} {cuerpo}" if con_dia else cuerpo


def fecha_larga_es(iso: str) -> str:
    """'1 de septiembre de 2026', para cuerpos de texto."""
    d = date.fromisoformat(str(iso)[:10])
    largos = {"ene": "enero", "feb": "febrero", "mar": "marzo", "abr": "abril", "may": "mayo",
              "jun": "junio", "jul": "julio", "ago": "agosto", "sep": "septiembre",
              "oct": "octubre", "nov": "noviembre", "dic": "diciembre"}
    return f"{d.day} de {largos[MESES_AB[d.month]]} de {d.year}"


def _corto(s: str, n: int) -> str:
    """Trunca con elipsis. Nunca se recorta con overflow:hidden, que esconde el corte."""
    return s if len(s) <= n else s[: n - 1] + "…"


def ars(v: float) -> str:
    return "$" + f"{round(v):,}".replace(",", ".")


def usd(v: float, dec: int = 2) -> str:
    return f"USD {v:,.{dec}f}".replace(",", "@").replace(".", ",").replace("@", ".")


def pct(v: float, dec: int = 1) -> str:
    return f"{v:+.{dec}f}%".replace(".", ",")


# ─── G1 · la serie larga en dólares ────────────────────────────────────────────

def linea_dolares(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 72) -> str:
    """
    El INMAG en dólares, blue y oficial, con el área de la brecha entre los dos.

    Las dos conversiones no son series rivales: son el techo y el piso de la misma
    magnitud, así que la brecha se vuelve la figura en vez de un estorbo. Un solo
    eje —las dos están en USD/kg— y desde cero, porque truncar el eje de una serie
    de precio exagera la pendiente.

    Hueco de más de 5 ruedas: se corta el trazo. No se interpola, porque
    interpolar inventa ruedas que no existieron.
    """
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 46, 92, 14, 34  # canal izquierdo, derecho (rótulos), arriba, abajo
    datos = [p for p in puntos if p.get("usd_blue")]
    if len(datos) < 10:
        return abrir(ancho_mm, alto_mm) + texto(8, H / 2, "serie insuficiente", 8) + "</svg>"

    # Decimado preservando extremos: más de ~600 puntos en 680 px es peso, no resolución.
    if len(datos) > 600:
        paso = len(datos) / 600
        idx = sorted({int(i * paso) for i in range(600)} | {0, len(datos) - 1})
        mn = min(range(len(datos)), key=lambda i: datos[i]["usd_blue"])
        mx = max(range(len(datos)), key=lambda i: datos[i]["usd_blue"])
        datos = [datos[i] for i in sorted(set(idx) | {mn, mx})]

    vals = [p["usd_blue"] for p in datos] + [p["usd_oficial"] for p in datos if p.get("usd_oficial")]
    hi = max(vals) * 1.08
    x = _escala(0, len(datos) - 1, L, W - R)
    y = _escala(0, hi, H - B, T)

    o = [abrir(ancho_mm, alto_mm, "Índice Novillo en dólares")]

    for t in _ticks(0, hi, 4):
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, usd(t, 1), 7.5, TINTA_3, 500, "end", mono=True))

    # años en el eje x
    ult_anio = None
    for i, p in enumerate(datos):
        a = p["fecha"][:4]
        if a != ult_anio and int(a) % 2 == 0:
            o.append(texto(x(i), H - B + 14, a, 7.5, TINTA_3, 500, "middle", mono=True))
            ult_anio = a
    o.append(f'<line x1="{L}" y1="{_f(y(0))}" x2="{W-R}" y2="{_f(y(0))}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')

    # área de la brecha + las dos líneas, cortando huecos largos
    def tramos(campo: str) -> list[list[tuple[float, float]]]:
        out, actual, prev = [], [], None
        for i, p in enumerate(datos):
            v = p.get(campo)
            d = date.fromisoformat(p["fecha"])
            if v is None or (prev and (d - prev).days > 40):
                if len(actual) > 1:
                    out.append(actual)
                actual = []
            if v is not None:
                actual.append((x(i), y(v)))
            prev = d
        if len(actual) > 1:
            out.append(actual)
        return out

    for tr_b, tr_o in zip(tramos("usd_blue"), tramos("usd_oficial")):
        if len(tr_b) > 1 and len(tr_o) > 1:
            d = "M" + " L".join(f"{_f(a)} {_f(b)}" for a, b in tr_b)
            d += " L" + " L".join(f"{_f(a)} {_f(b)}" for a, b in reversed(tr_o)) + " Z"
            o.append(f'<path d="{d}" fill="{BANDA_CLARA}" style="print-color-adjust:exact"/>')
    for campo, color, grosor, guion in (("usd_oficial", TINTA_3, 1.5, ' stroke-dasharray="6 3"'),
                                        ("usd_blue", SERIE, 1.75, "")):
        for tr in tramos(campo):
            d = "M" + " L".join(f"{_f(a)} {_f(b)}" for a, b in tr)
            o.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{grosor}"{guion} stroke-linejoin="round"/>')

    # etiquetado directo: último, máximo y mínimo. Tres, no uno por punto.
    ult = datos[-1]
    o.append(f'<circle cx="{_f(x(len(datos)-1))}" cy="{_f(y(ult["usd_blue"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
    # Las dos etiquetas se separan si quedan a menos de 16 px, con línea guía: dos
    # rótulos encimados en el extremo es el modo típico de arruinar este gráfico.
    yb = y(ult["usd_blue"])
    yo = y(ult["usd_oficial"]) if ult.get("usd_oficial") else None
    if yo is not None and abs(yo - yb) < 16:
        yo, yb = min(yo, yb) - 8, max(yo, yb) + 8
        o.append(f'<line x1="{_f(x(len(datos)-1))}" y1="{_f(y(ult["usd_blue"]))}" x2="{W-R+4}" y2="{_f(yb-3)}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')
    o.append(texto(W - R + 8, yb + 3, f'blue {usd(ult["usd_blue"])}', 7.5, TINTA, 600))
    if yo is not None:
        o.append(texto(W - R + 8, yo + 3, f'oficial {usd(ult["usd_oficial"])}', 7.5, TINTA_2, 500))
    pmax = max(datos, key=lambda p: p["usd_blue"])
    pmin = min(datos, key=lambda p: p["usd_blue"])
    for p, dy, lbl in ((pmax, -8, "máx"), (pmin, 14, "mín")):
        i = datos.index(p)
        o.append(texto(x(i), y(p["usd_blue"]) + dy, f'{lbl} {usd(p["usd_blue"])} · {p["fecha"][:7]}', 7, TINTA_2, 500, "middle"))
    o.append("</svg>")
    return "".join(o)


# ─── G2 · la banda por categoría ───────────────────────────────────────────────

def dumbbell_bandas(bandas: list[dict], ancho_mm: float = 180, alto_mm: float = 62) -> str:
    """
    P10 → P90 como barra, mediana como punto. No es un box plot a propósito: no
    tenemos cuartiles, solo P10/mediana/P90, y dibujar una caja afirmaría un Q1 y
    un Q3 que no existen. Tampoco es una barra a la mediana, que es exactamente el
    número único que el Valor de Referencia existe para no publicar.

    Base fina (menos de 30 lotes): barra hueca y el n a la vista. Menos de 10
    lotes: la fila no se dibuja y se declara al pie.
    """
    filas = [b for b in bandas if (b.get("lotes") or 0) >= 10 and b.get("p10") and b.get("p90")]
    filas.sort(key=lambda b: b.get("mediana") or 0, reverse=True)
    if not filas:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "sin base suficiente en ninguna categoría", 8) + "</svg>"

    W = round(ancho_mm * MM)
    L, R, T = 118, 196, 16
    fila_h = 26
    H = round(T + fila_h * len(filas) + 18)
    hi = max(b["p90"] for b in filas) * 1.02
    x = _escala(0, hi, L, W - R)

    o = [abrir(ancho_mm, H / MM, "Banda de precio por categoría")]
    for t in _ticks(0, hi, 4):
        o.append(f'<line x1="{_f(x(t))}" y1="{T-6}" x2="{_f(x(t))}" y2="{_f(T + fila_h*len(filas))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(x(t), T - 10, ars(t), 7, TINTA_3, 500, "middle", mono=True))

    for i, b in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        fina = (b.get("lotes") or 0) < 30
        o.append(texto(0, cy + 3, (b.get("etiqueta") or b["categoria"]).upper(), 8, TINTA, 600))
        x1, x2 = x(b["p10"]), x(b["p90"])
        if fina:
            o.append(f'<rect x="{_f(x1)}" y="{_f(cy-5)}" width="{_f(x2-x1)}" height="10" rx="4" fill="none" stroke="{SERIE}" stroke-width="1"/>')
        else:
            o.append(f'<rect x="{_f(x1)}" y="{_f(cy-5)}" width="{_f(x2-x1)}" height="10" rx="4" fill="{BANDA}" style="print-color-adjust:exact"/>')
        if b.get("mediana"):
            o.append(f'<circle cx="{_f(x(b["mediana"]))}" cy="{_f(cy)}" r="5" fill="{SERIE_OSC}" stroke="{BLANCO}" stroke-width="2"/>')
            o.append(texto(x(b["mediana"]), cy - 11, ars(b["mediana"]), 7.5, TINTA, 600, "middle", mono=True))
        o.append(texto(x1 - 5, cy + 3, ars(b["p10"]), 7, TINTA_2, 500, "end", mono=True))
        o.append(texto(x2 + 5, cy + 3, ars(b["p90"]), 7, TINTA_2, 500, mono=True))
        nota = f'n={b.get("lotes")}' + (f' · amplitud {_f(b["amplitud_pct"])}%' if b.get("amplitud_pct") else "")
        o.append(texto(W - 2, cy + 1, nota, 7, TINTA_3, 500, "end"))
        if fina:
            o.append(texto(W - 2, cy + 10, "base fina", 6.5, TINTA_3, 400, "end"))
    o.append("</svg>")
    return "".join(o)


# ─── G3 · amplitud, panel por categoría ────────────────────────────────────────

def paneles_amplitud(series: list[dict], ancho_mm: float = 180, alto_mm: float = 76) -> str:
    """
    Cuatro paneles de línea, uno por categoría, con la MISMA escala: es lo que los
    hace comparables. Un multi-línea no sirve acá porque la amplitud de las cuatro
    vive en la misma franja y las curvas se superponen.
    """
    series = [s for s in series if len(s.get("puntos") or []) >= 10][:4]
    if not series:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "sin serie de amplitud", 8) + "</svg>"
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    cols, pw, gap = 2, (round(ancho_mm * MM) - 22) / 2, 22
    ph = (H - 26) / 2
    todos = [p["amplitud"] for s in series for p in s["puntos"]]
    lo, hi = min(todos) * 0.9, max(todos) * 1.08
    prom = sum(todos) / len(todos)

    o = [abrir(ancho_mm, alto_mm, "Evolución de la amplitud")]
    for k, s in enumerate(series):
        ox = (k % cols) * (pw + gap)
        oy = 16 + (k // cols) * (ph + 10)
        pts = s["puntos"]
        x = _escala(0, len(pts) - 1, ox + 26, ox + pw)
        y = _escala(lo, hi, oy + ph - 14, oy)
        o.append(f'<circle cx="{_f(ox+4)}" cy="{_f(oy-5)}" r="3" fill="{SERIE}"/>')
        o.append(texto(ox + 11, oy - 2, (s.get("etiqueta") or s["categoria"]).upper(), 7.5, TINTA, 600))
        o.append(f'<line x1="{_f(ox+26)}" y1="{_f(y(prom))}" x2="{_f(ox+pw)}" y2="{_f(y(prom))}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')
        for t in (_ticks(lo, hi, 2)[:1] + _ticks(lo, hi, 2)[-1:]):
            o.append(texto(ox + 22, y(t) + 3, f"{_f(t)}%", 7, TINTA_3, 500, "end", mono=True))
        d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['amplitud']))}" for i, p in enumerate(pts))
        o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.75" stroke-linejoin="round"/>')
        u = pts[-1]
        flecha = "↓" if u["amplitud"] < pts[0]["amplitud"] else "↑"
        o.append(f'<circle cx="{_f(x(len(pts)-1))}" cy="{_f(y(u["amplitud"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
        o.append(texto(ox + pw, oy + 8, f'{_f(u["amplitud"])}% {flecha}', 8, TINTA, 600, "end"))
    o.append(texto(0, H - 2, f"Línea gris: promedio de las {len(series)} categorías ({_f(prom)}%). Misma escala en los cuatro paneles.", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


# ─── G5 · liquidación, columnas divergentes ────────────────────────────────────

def columnas_liquidacion(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 58,
                         umbral: float | None = None) -> str:
    """
    % de hembras por mes, como desvío respecto de un umbral: el eje mide la
    distancia al cero semántico, no el porcentaje absoluto (que va en la tabla).

    El umbral por defecto es la MEDIANA DE NUESTRA PROPIA SERIE, no el de la faena
    nacional: Cañuelas concentra venta de vientres y corre estructuralmente más
    alto (60-68 % contra 46 % nacional). Aplicarle el umbral nacional sería leer
    liquidación permanente.
    """
    if len(puntos) < 3:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "serie propia aún corta", 8) + "</svg>"
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, T, B = 44, 20, 30
    base = umbral if umbral is not None else sorted(p["pct"] for p in puntos)[len(puntos) // 2]
    desv = [p["pct"] - base for p in puntos]
    m = max(abs(min(desv)), abs(max(desv))) * 1.2 or 1
    x = _escala(0, max(len(puntos) - 1, 1), L + 14, W - 18)
    y = _escala(-m, m, H - B, T)
    ancho = min(24, (W - L - 40) / len(puntos) - 2)

    o = [abrir(ancho_mm, alto_mm, "Hembras sobre el total operado")]
    o.append(f'<defs><pattern id="tr45" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
             f'<line x1="0" y1="0" x2="0" y2="4" stroke="{NEGATIVO}" stroke-width="0.75"/></pattern></defs>')
    for t in _ticks(-m, m, 4):
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-10}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, f"{t:+.0f} pp", 7, TINTA_3, 500, "end", mono=True))
    o.append(f'<line x1="{L}" y1="{_f(y(0))}" x2="{W-10}" y2="{_f(y(0))}" stroke="{TINTA}" stroke-width="1.5"/>')
    o.append(texto(L - 5, y(0) + 3, f"{_f(base)}%", 7.5, TINTA, 600, "end", mono=True))

    for i, p in enumerate(puntos):
        d = p["pct"] - base
        y0, y1 = y(0), y(d)
        alto = abs(y1 - y0)
        arriba = d >= 0
        relleno = f'url(#tr45)' if arriba else BANDA
        color = NEGATIVO if arriba else SERIE
        o.append(f'<rect x="{_f(x(i)-ancho/2)}" y="{_f(min(y0,y1))}" width="{_f(ancho)}" height="{_f(max(alto,1))}" '
                 f'rx="3" fill="{relleno}" stroke="{color}" stroke-width="1" style="print-color-adjust:exact"/>')
        if i == len(puntos) - 1 or i % 3 == 0:
            o.append(texto(x(i), H - B + 12, p["ym"][2:], 7, TINTA_3, 500, "middle", mono=True))
    u = puntos[-1]
    # No se escribe "liquidación"/"retención": esas palabras están definidas contra el
    # umbral NACIONAL (~43 %), y esta serie es de Cañuelas, que corre 15-20 puntos más
    # alto porque concentra venta de vientres. Acá se dice el hecho: cuántas hembras,
    # y cuánto se movió contra nuestra propia mediana.
    o.append(texto(W - 10, T - 6, f'{_f(u["pct"])}% de hembras · {pct(u["pct"]-base, 1)} pp vs la mediana propia', 8, TINTA, 600, "end"))
    o.append(texto(L, T - 6, "Trama: más hembras que la mediana · Azul: menos", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)


# ─── G4 · relación novillo/maíz ────────────────────────────────────────────────

def ratio_maiz(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 54, umbral: float = 12) -> str:
    """
    Una sola serie: kg de maíz que compra 1 kg de novillo, contra su propio umbral.
    Un gráfico de novillo en $/kg y maíz en USD/t con dos ejes es el error clásico
    de los informes de mercado: la alineación de las dos escalas es arbitraria y
    cuenta la historia que uno quiera. El ratio lo resuelve con un eje.
    """
    pts = [p for p in puntos if p.get("relacion")][-72:]
    if len(pts) < 6:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "serie insuficiente", 8) + "</svg>"
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 44, 70, 16, 26
    vals = [p["relacion"] for p in pts]
    lo, hi = min(min(vals), umbral) * 0.9, max(max(vals), umbral) * 1.08
    x = _escala(0, len(pts) - 1, L, W - R)
    y = _escala(lo, hi, H - B, T)

    o = [abrir(ancho_mm, alto_mm, "Relación maíz / novillo")]
    o.append(f'<defs><pattern id="trF" width="4" height="4" patternTransform="rotate(135)" patternUnits="userSpaceOnUse">'
             f'<line x1="0" y1="0" x2="0" y2="4" stroke="{SERIE}" stroke-width="0.75"/></pattern></defs>')
    for t in _ticks(lo, hi, 4):
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 5, y(t) + 3, _f(t), 7, TINTA_3, 500, "end", mono=True))
    # el área entre la serie y el umbral, con textura según el lado
    d_arriba = f'M{_f(x(0))} {_f(y(umbral))}' + "".join(f' L{_f(x(i))} {_f(y(max(p["relacion"], umbral)))}' for i, p in enumerate(pts)) + f' L{_f(x(len(pts)-1))} {_f(y(umbral))} Z'
    d_abajo = f'M{_f(x(0))} {_f(y(umbral))}' + "".join(f' L{_f(x(i))} {_f(y(min(p["relacion"], umbral)))}' for i, p in enumerate(pts)) + f' L{_f(x(len(pts)-1))} {_f(y(umbral))} Z'
    # La trama marca lo EXCEPCIONAL (grano barato contra la hacienda), no lo habitual:
    # tramar los 5 años que estuvieron por debajo del umbral llenaba el gráfico de rayas
    # y escondía la línea, que es el dato.
    o.append(f'<path d="{d_abajo}" fill="#f4f4f5" style="print-color-adjust:exact"/>')
    o.append(f'<path d="{d_arriba}" fill="url(#trF)" style="print-color-adjust:exact"/>')
    o.append(f'<line x1="{L}" y1="{_f(y(umbral))}" x2="{W-R}" y2="{_f(y(umbral))}" stroke="{TINTA}" stroke-width="1.5"/>')
    o.append(texto(L + 4, y(umbral) - 5, f"umbral de referencia: {_f(umbral)}", 7, TINTA_2, 500))
    d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['relacion']))}" for i, p in enumerate(pts))
    o.append(f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.75" stroke-linejoin="round"/>')
    u = pts[-1]
    o.append(f'<circle cx="{_f(x(len(pts)-1))}" cy="{_f(y(u["relacion"]))}" r="4" fill="{SERIE}" stroke="{BLANCO}" stroke-width="2"/>')
    o.append(texto(W - R + 6, y(u["relacion"]) + 3, f'{_f(u["relacion"])} kg', 8, TINTA, 600))
    o.append(texto(W - R + 6, y(u["relacion"]) + 15, f'{u["ym"]}', 7, TINTA_3, 500))
    for i, p in enumerate(pts):
        if i % 12 == 0 or i == len(pts) - 1:
            o.append(texto(x(i), H - B + 12, p["ym"][:4], 7, TINTA_3, 500, "middle", mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── G12 · el reloj del ciclo (gráfico nuevo) ──────────────────────────────────

def reloj_ciclo(liq: list[dict], inmag_mensual: list[dict], ancho_mm: float = 87, alto_mm: float = 80) -> str:
    """
    Liquidación contra precio en dólares, como trayectoria. Nadie en el sector
    publica esto: todos publican las dos series por separado y dejan la relación
    al lector. Acá se ve el bucle, que es la pregunta real: en qué punto del ciclo
    estamos y hacia dónde giramos.

    El eje x va invertido para que "retención" quede a la derecha y el giro se lea
    como un reloj. Los puntos usan la rampa de claridad como codificación temporal,
    así que el orden sobrevive el blanco y negro.
    """
    usd = {p["ym"]: p["valor"] for p in inmag_mensual}
    pares = [(p["ym"], p["pct"], usd[p["ym"]]) for p in liq if p["ym"] in usd]
    if len(pares) < 8:
        return ""  # el ciclo necesita al menos 8 meses propios: antes de eso no es un ciclo, es ruido
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 38, 16, 26, 30
    xs = [p[1] for p in pares]
    ys = [p[2] for p in pares]
    x = _escala(max(xs) * 1.02, min(xs) * 0.98, L, W - R)  # invertido
    y = _escala(min(ys) * 0.96, max(ys) * 1.04, H - B, T)

    o = [abrir(ancho_mm, alto_mm, "Reloj del ciclo")]
    for t in _ticks(min(ys), max(ys), 3):
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 4, y(t) + 3, usd(t) if False else f"{t:.2f}".replace(".", ","), 7, TINTA_3, 500, "end", mono=True))
    for t in _ticks(min(xs), max(xs), 3):
        o.append(texto(x(t), H - B + 12, f"{_f(t)}%", 7, TINTA_3, 500, "middle", mono=True))
    o.append(texto(L, T - 14, "← más hembras: liquidando", 7, TINTA_2, 500))
    o.append(texto(W - R, T - 14, "reteniendo →", 7, TINTA_2, 500, "end"))
    o.append(texto(2, T - 2, "USD/kg", 7, TINTA_3, 500))

    d = "M" + " L".join(f"{_f(x(p[1]))} {_f(y(p[2]))}" for p in pares)
    o.append(f'<path d="{d}" fill="none" stroke="{TINTA_3}" stroke-width="1.75" stroke-linejoin="round"/>')
    for i, p in enumerate(pares):
        color = RAMPA[min(int(i / max(len(pares) - 1, 1) * (len(RAMPA) - 1)), len(RAMPA) - 1)]
        r = 6 if i == len(pares) - 1 else 4.5
        o.append(f'<circle cx="{_f(x(p[1]))}" cy="{_f(y(p[2]))}" r="{r}" fill="{color}" stroke="{BLANCO}" stroke-width="2" style="print-color-adjust:exact"/>')
    pri, ult = pares[0], pares[-1]
    o.append(texto(x(pri[1]), y(pri[2]) - 9, pri[0], 7, TINTA_2, 500, "middle", mono=True))
    o.append(texto(x(ult[1]), y(ult[2]) - 11, f"{ult[0]} · {_f(ult[1])}% · {ult[2]:.2f}".replace(".", ","), 7.5, TINTA, 600, "middle"))
    o.append("</svg>")
    return "".join(o)


# ─── G6 · el valor de la tierra ────────────────────────────────────────────────

def rango_tierra(filas: list[dict], ancho_mm: float = 180, n: int = 12) -> str:
    """
    Rango mínimo-máximo de USD/ha por zona, con el típico marcado. Es un rango
    porque el relevamiento da un rango: publicar el punto medio escondería la
    dispersión, que es el mismo pecado que la banda VR denuncia. Cada fila lleva su
    n y su fecha, porque 41 de las 67 filas del relevamiento tienen una sola
    observación y 40 son de 2023-2024.
    """
    filas = [f for f in filas if f.get("usd_ha")][:n]
    if not filas:
        return abrir(ancho_mm, 20) + texto(8, 14, "sin relevamiento publicable", 8) + "</svg>"
    W = round(ancho_mm * MM)
    L, R, T, fila_h = 186, 168, 16, 24
    H = T + fila_h * len(filas) + 12
    hi = max((f.get("p75") or f["usd_ha"]) for f in filas) * 1.05
    x = _escala(0, hi, L, W - R)

    o = [abrir(ancho_mm, H / MM, "Valor de la hectárea ganadera")]
    for t in _ticks(0, hi, 4):
        o.append(f'<line x1="{_f(x(t))}" y1="{T-6}" x2="{_f(x(t))}" y2="{_f(T+fila_h*len(filas))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(x(t), T - 10, f"{round(t):,}".replace(",", "."), 7, TINTA_3, 500, "middle", mono=True))
    for i, f in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        o.append(texto(0, cy - 5, (f.get("provincia") or "").upper(), 6.5, TINTA_3, 500))
        o.append(texto(0, cy + 6, _corto((f.get("zona") or "").upper(), 26), 7.5, TINTA, 600))
        lo_v, hi_v = f.get("p25") or f["usd_ha"], f.get("p75") or f["usd_ha"]
        o.append(f'<rect x="{_f(x(lo_v))}" y="{_f(cy-3)}" width="{_f(max(x(hi_v)-x(lo_v),2))}" height="6" rx="3" fill="{BANDA}" style="print-color-adjust:exact"/>')
        o.append(f'<line x1="{_f(x(f["usd_ha"]))}" y1="{_f(cy-7)}" x2="{_f(x(f["usd_ha"]))}" y2="{_f(cy+7)}" stroke="{SERIE_OSC}" stroke-width="2"/>')
        det = f'USD {round(f["usd_ha"]):,}'.replace(",", ".")
        if f.get("canon_kg_ha_mes"):
            det += f' · {_f(f["canon_kg_ha_mes"])} kg/ha'
        o.append(texto(W - 2, cy + 1, det, 7, TINTA, 500, "end"))
        meta = f'n={f.get("n") or "?"}'
        if f.get("fecha"):
            meta += f' · rel. {str(f["fecha"])[:7]}'
        o.append(texto(W - 2, cy + 10, meta, 6.5, TINTA_3, 400, "end"))
    o.append("</svg>")
    return "".join(o)


# ─── G7 · sparkline para las fichas ────────────────────────────────────────────

def sparkline(valores: Sequence[float], ancho_mm: float = 36, alto_mm: float = 9) -> str:
    """Una silueta: sin eje, sin ticks, sin etiquetas. El valor va en la ficha."""
    v = [float(x) for x in valores if x is not None]
    if len(v) < 3:
        return ""
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    x = _escala(0, len(v) - 1, 1, W - 5)
    y = _escala(min(v), max(v), H - 3, 3)
    d = "M" + " L".join(f"{_f(x(i))} {_f(y(p))}" for i, p in enumerate(v))
    return (abrir(ancho_mm, alto_mm) +
            f'<path d="{d}" fill="none" stroke="{SERIE}" stroke-width="1.75" stroke-linejoin="round"/>'
            f'<circle cx="{_f(x(len(v)-1))}" cy="{_f(y(v[-1]))}" r="2.5" fill="{SERIE}"/></svg>')


# ─── G9 · base 100 ─────────────────────────────────────────────────────────────

def base100(mensual_ars: list[dict], mensual_usd: list[dict], ym_hasta: str,
            ancho_mm: float = 87, alto_mm: float = 54, meses: int = 13) -> str:
    """
    Pesos y dólares indexados a 100 en un solo eje. Es el gráfico que contesta
    cuánto de la subida en pesos fue mercado y cuánto fue dólar, y la única forma
    honesta de ponerlos juntos sin un doble eje.
    """
    def recorte(s):
        idx = next((i for i, p in enumerate(s) if p["ym"] == ym_hasta), len(s) - 1)
        return s[max(0, idx - meses + 1): idx + 1]
    a, u = recorte(mensual_ars), recorte(mensual_usd)
    if len(a) < 4 or len(u) < 4:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "serie insuficiente", 7.5) + "</svg>"
    base_a, base_u = a[0]["valor"], u[0]["valor"]
    ia = [{"ym": p["ym"], "v": 100 * p["valor"] / base_a} for p in a]
    iu = [{"ym": p["ym"], "v": 100 * p["valor"] / base_u} for p in u]
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    L, R, T, B = 34, 76, 16, 26
    todos = [p["v"] for p in ia + iu]
    lo, hi = min(min(todos), 100) * 0.95, max(todos) * 1.06
    x = _escala(0, len(ia) - 1, L, W - R)
    y = _escala(lo, hi, H - B, T)

    o = [abrir(ancho_mm, alto_mm, "Pesos y dólares, base 100")]
    for t in _ticks(lo, hi, 3):
        o.append(f'<line x1="{L}" y1="{_f(y(t))}" x2="{W-R}" y2="{_f(y(t))}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(L - 4, y(t) + 3, f"{round(t)}", 7, TINTA_3, 500, "end", mono=True))
    o.append(f'<line x1="{L}" y1="{_f(y(100))}" x2="{W-R}" y2="{_f(y(100))}" stroke="{FILETE_FUERTE}" stroke-width="1"/>')
    o.append(texto(L, T - 5, f'base {a[0]["ym"]} = 100', 7, TINTA_2, 500))
    for serie, color, grosor, guion, rot in ((ia, SERIE_OSC, 1.75, "", "pesos"), (iu, TINTA_3, 1.5, ' stroke-dasharray="6 3"', "dólares")):
        d = "M" + " L".join(f"{_f(x(i))} {_f(y(p['v']))}" for i, p in enumerate(serie))
        o.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{grosor}"{guion} stroke-linejoin="round"/>')
        o.append(texto(W - R + 5, y(serie[-1]["v"]) + 3, f'{rot} {round(serie[-1]["v"])}', 7.5, TINTA if rot == "pesos" else TINTA_2, 600 if rot == "pesos" else 500))
    o.append(texto(L, H - 4, f'{a[0]["ym"]} → {a[-1]["ym"]}', 7, TINTA_3, 400, mono=True))
    o.append("</svg>")
    return "".join(o)


# ─── composición del mes ───────────────────────────────────────────────────────

def barras_composicion(filas: list[dict], ancho_mm: float = 87, alto_mm: float = 54) -> str:
    """Qué trae el mercado, por cabezas. Nominal → un solo tono: la posición ya ordena."""
    filas = [f for f in filas if f.get("cabezas")][:6]
    if not filas:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "sin composición del mes", 7.5) + "</svg>"
    W = round(ancho_mm * MM)
    L, R, T, fila_h = 86, 118, 10, 22
    H = T + fila_h * len(filas) + 8
    hi = max(f["cabezas"] for f in filas) * 1.02
    x = _escala(0, hi, L, W - R)
    o = [abrir(ancho_mm, H / MM, "Composición del mes")]
    for i, f in enumerate(filas):
        cy = T + fila_h * i + fila_h / 2
        o.append(texto(0, cy + 3, f["categoria"], 7.5, TINTA, 600))
        o.append(f'<rect x="{L}" y="{_f(cy-6)}" width="{_f(max(x(f["cabezas"])-L,2))}" height="12" rx="4" fill="{SERIE}" style="print-color-adjust:exact"/>')
        o.append(texto(W - 2, cy + 3, f'{f["cabezas"]:,}'.replace(",", ".") + f' cab · {_f(f["share"])}%', 7, TINTA, 500, "end"))
    o.append("</svg>")
    return "".join(o)


# ─── G11 · precio por zona fuera de Cañuelas (SIO Carnes) ──────────────────────

def barras_sio_zonas(puntos: list[dict], ancho_mm: float = 180, alto_mm: float = 70) -> str:
    """
    Cuánto se apartó cada zona del promedio país, en barras divergentes desde el
    cero. La pregunta que contesta no es "cuánto vale el novillo" —eso ya está en
    todo el informe— sino **cuánto más o menos le pagaron al que está lejos**.

    El cero es el promedio país ponderado, no Cañuelas: SIO mide lo operado fuera
    del concentrador, y compararlo contra el concentrador mezclaría dos
    poblaciones. El dato de Cañuelas va en el texto de la página, al lado.

    Las zonas que no llegan al piso de cabezas se dibujan huecas y sin número: se
    las nombra para que no parezca que no existen, pero no se les publica precio.
    """
    pub = [p for p in puntos if p.get("vs_pais_pct") is not None]
    if len(pub) < 3:
        return abrir(ancho_mm, alto_mm) + texto(8, 20, "sin datos de SIO Carnes para el mes", 8) + "</svg>"
    W, H = round(ancho_mm * MM), round(alto_mm * MM)
    # El margen izquierdo tiene que aguantar "NOA — Santiago del Estero, Salta…"
    # y el derecho el porcentaje más el precio. Con menos, se recortan los dos.
    L, T, B, R = 162, 16, 16, 92
    m = max(abs(p["vs_pais_pct"]) for p in pub) * 1.35 or 1
    x = _escala(-m, m, L, W - R)
    alto = (H - T - B) / len(pub)
    barra = min(13, alto - 4)

    o = [abrir(ancho_mm, alto_mm, "Precio del novillo por zona, contra el promedio país")]
    o.append(f'<defs><pattern id="sio45" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
             f'<line x1="0" y1="0" x2="0" y2="4" stroke="{SERIE}" stroke-width="0.75"/></pattern></defs>')
    for t in _ticks(-m, m, 4):
        o.append(f'<line x1="{_f(x(t))}" y1="{T}" x2="{_f(x(t))}" y2="{H-B}" stroke="{FILETE}" stroke-width="1"/>')
        o.append(texto(x(t), H - B + 10, f"{t:+.0f}%", 6.5, TINTA_3, 500, "middle", mono=True))
    o.append(f'<line x1="{_f(x(0))}" y1="{T}" x2="{_f(x(0))}" y2="{H-B}" stroke="{TINTA}" stroke-width="1.5"/>')

    for i, p in enumerate(pub):
        cy = T + alto * i + alto / 2
        d = p["vs_pais_pct"]
        fino = not p.get("representativo", True)
        x0, x1 = x(0), x(d)
        # Arriba del promedio con trama; abajo en sólido. La zona fina va hueca.
        relleno = "none" if fino else ("url(#sio45)" if d >= 0 else BANDA)
        o.append(f'<rect x="{_f(min(x0,x1))}" y="{_f(cy-barra/2)}" width="{_f(max(abs(x1-x0),1))}" '
                 f'height="{_f(barra)}" rx="2.5" fill="{relleno}" stroke="{SERIE}" '
                 f'stroke-width="1" stroke-dasharray="{"2 2" if fino else "0"}" style="print-color-adjust:exact"/>')
        etiqueta = _corto(p.get("provincias") or p["zona"], 31)
        o.append(texto(L - 7, cy + 3, etiqueta, 7, TINTA if not fino else TINTA_3, 500, "end"))
        if fino:
            o.append(texto(W - 8, cy + 3, f'sólo {p["cabezas"]} cab.', 6.5, TINTA_3, 400, "end", mono=True))
        else:
            o.append(texto(W - 8, cy + 3, f'{pct(d,1)} · {ars(p["precio_kg"])}', 7, TINTA, 600, "end", mono=True))
    o.append(texto(L, T - 5, "Trama: pagó más que el promedio país · Sólido: pagó menos", 7, TINTA_3, 400))
    o.append("</svg>")
    return "".join(o)
