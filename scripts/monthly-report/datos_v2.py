#!/usr/bin/env python3
"""
Capa de datos de El Corredor v2. Se apoya en `datos.py` y no lo modifica: la
corrida mensual de hoy sigue leyendo exactamente lo mismo.

QUÉ AGREGA
Nada de fuentes nuevas. Todo lo de acá sale de series que el repo ya tiene y que
el informe v1 no usaba o usaba a medias:
  · el dólar oficial desde 2006 y el blue desde 2011, para llevar el novillito
    (`mag_novillito_history`, la serie más larga del inventario) a dólares;
  · la mediana por categoría de `vr_bandas_history`, que `amplitud_historica()`
    ya trae y el v1 tiraba;
  · `precios-internacionales.json` (la misma fuente de la tool MCP
    `international_price_gap`) y `tierra-por-kilo.json` con la cuenta de la tool
    `farmland_yield`;
  · `remates.json` del mes cerrado, no solo del que viene.

LAS REGLAS DE `datos.py` SIGUEN VALIENDO
Nada sin fuente y fecha, y no se publica lo que el repo marca como no confiable:
el precio del ternero no existe acá (el MAG no opera terneros; el ternero de
`market-prices.json` es INMAG × 1,10), así que tampoco existe la relación
ternero/novillo. Si un dato falta, la página no va: no se completa con una
estimación.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import median

import datos as D

#: Años que entran en el "promedio de 5 años" EN DÓLARES: los de cambio unificado.
#: Entre 2020 y 2024 la brecha entre el blue y el oficial llegó a pasar el 150 %,
#: así que el mismo kilo valía dos cifras en dólares según qué dólar se usara: un
#: promedio que mezcla esos años mide la brecha, no el precio. Se usan los años
#: anteriores a 2020 con brecha chica y 2025 en adelante. Solo cuentan los que son
#: anteriores al año del informe: el año en curso nunca se compara contra sí mismo.
ANIOS_CAMBIO_UNIFICADO = (2016, 2017, 2018, 2019, 2025)
ANIOS_PROMEDIO = len(ANIOS_CAMBIO_UNIFICADO)


def anios_base(anio: int) -> list[int]:
    """Los años de cambio unificado anteriores al del informe (los últimos cinco)."""
    return [a for a in ANIOS_CAMBIO_UNIFICADO if a < anio][-ANIOS_PROMEDIO:]


def etiqueta_base(anios: list[int]) -> str:
    """[2016, 2017, 2018, 2019, 2025] → "2016–2019 y 2025": los tramos consecutivos se juntan."""
    tramos: list[list[int]] = []
    for a in sorted(anios):
        if tramos and a == tramos[-1][-1] + 1:
            tramos[-1].append(a)
        else:
            tramos.append([a])
    partes = [f"{t[0]}–{t[-1]}" if len(t) > 2 else ", ".join(map(str, t)) if len(t) == 2 else str(t[0]) for t in tramos]
    return partes[0] if len(partes) == 1 else ", ".join(partes[:-1]) + " y " + partes[-1]


#: Antigüedad máxima, en meses, de un dato de tierra para entrar al informe.
TIERRA_MESES_MAX = 12
#: Observaciones mínimas de una zona de tierra.
TIERRA_N_MIN = 5



# ─── utilidades de serie ───────────────────────────────────────────────────────

def a_mensual(puntos: list[dict], campo: str, clave_fecha: str = "fecha") -> list[dict]:
    """Promedio por mes de un campo diario. Igual a `aMensual()` de senales.ts."""
    por_mes: dict[str, list[float]] = {}
    for p in puntos:
        v = p.get(campo)
        if v and v > 0:
            por_mes.setdefault(str(p[clave_fecha])[:7], []).append(float(v))
    return [{"ym": k, "valor": sum(v) / len(v), "ruedas": len(v)} for k, v in sorted(por_mes.items())]


def _valor_a(puntos: list[dict], campo: str, hasta: str) -> dict | None:
    """El último punto con fecha ≤ `hasta` (los puntos vienen ordenados)."""
    previo = None
    for p in puntos:
        if p["fecha"] > hasta:
            break
        if p.get(campo):
            previo = p
    return previo


def _var(a: float | None, b: float | None) -> float | None:
    return round(100 * (a / b - 1), 1) if a and b else None


def con_dolar(puntos: list[dict], campo: str, blue: dict, oficial: dict) -> list[dict]:
    """
    Agrega `usd_blue` y `usd_oficial` a una serie diaria en pesos, con el mismo
    forward-fill que `datos.inmag_diario()`: el MAG opera días que el mercado de
    cambio no cotiza.
    """
    ult_b = ult_o = None
    fb = sorted(blue)
    fo = sorted(oficial)
    ib = io = 0
    out = []
    for p in puntos:
        d = p["fecha"]
        while ib < len(fb) and fb[ib] <= d:
            ult_b = blue[fb[ib]] or ult_b
            ib += 1
        while io < len(fo) and fo[io] <= d:
            ult_o = oficial[fo[io]] or ult_o
            io += 1
        ars = p.get(campo)
        out.append({**p, "ars": ars,
                    "usd_blue": round(ars / float(ult_b), 4) if ars and ult_b else None,
                    "usd_oficial": round(ars / float(ult_o), 4) if ars and ult_o else None})
    return out


# ─── series nuevas ─────────────────────────────────────────────────────────────

def dolares() -> tuple[dict, dict]:
    """Blue y oficial completos (2011 y 2006 en adelante): el novillito arranca en 2006."""
    blue = {f["date"]: f.get("venta") for f in D.sb("usd_blue_history", select="date,venta", order="date.asc")}
    ofi = {f["date"]: f.get("venta") for f in D.sb("usd_oficial_history", select="date,venta", order="date.asc")}
    return blue, ofi


def novillito_usd(novillito: D.Serie, blue: dict, oficial: dict) -> D.Serie:
    """
    El novillito del MAG por rueda, en pesos y en dólares. Se toma el promedio de
    la rueda (la mediana está vacía en la serie vieja). Antes de 2011 no hay
    dólar blue en la base: ahí la serie va solo al oficial, y el gráfico lo dice.
    """
    pts = [{"fecha": p["fecha"], "precio": p.get("promedio") or p.get("mediana")} for p in novillito.puntos]
    pts = [p for p in pts if p["precio"]]
    if not pts:
        return D.Serie([], "Novillito en el MAG", None)
    return D.Serie(con_dolar(pts, "precio", blue, oficial),
                   "Novillito en el MAG (serie por rueda) · dólar oficial y blue",
                   pts[-1]["fecha"], nota="Antes de 2011 la base no tiene dólar blue: esos años van solo al oficial.")


def estacionalidad(mensual: list[dict]) -> dict:
    """
    Índice estacional del INMAG en dólares. Es un port 1:1 de `estacionalidad()`
    de `src/lib/mercado/senales.ts`, la misma cuenta que contesta la tool MCP
    `price_seasonality`, para que el informe y el MCP digan el mismo número.

    Razón sobre media móvil centrada de 12 meses; el índice del mes calendario es
    la MEDIANA de esas razones entre años, normalizada a 1,00. Los últimos 6 meses
    no tienen razón: la media centrada necesita medio año por delante.
    """
    serie = sorted(mensual, key=lambda p: p["ym"])
    V = 12
    ratios: dict[int, list[float]] = {}
    razon: dict[str, float] = {}
    for i in range(V // 2, len(serie) - V // 2):
        ventana = serie[i - V // 2: i + V // 2]
        if len(ventana) < V:
            continue
        ma = sum(p["valor"] for p in ventana) / len(ventana)
        if not ma > 0:
            continue
        r = serie[i]["valor"] / ma
        ratios.setdefault(int(serie[i]["ym"][5:7]), []).append(r)
        razon[serie[i]["ym"]] = r
    crudos = {m: median(rs) for m, rs in ratios.items()}
    escala = sum(crudos.values()) / len(crudos) if crudos else 1
    return {
        "indice": {m: round(v / escala, 3) for m, v in sorted(crudos.items())},
        "razon": {ym: r / escala for ym, r in razon.items()},
        "anios": len({ym[:4] for ym in razon}),
    }


def bandas_historicas() -> D.Serie:
    """
    P10, mediana y P90 por categoría y fecha. Es la misma tabla que lee
    `amplitud_historica()`, que se queda solo con la amplitud: para dibujar la
    banda hacen falta los dos bordes.
    """
    filas = D.sb("vr_bandas_history", select="date,category,p10,mediana,p90,amplitud_pct,lotes",
                 metodologia="eq.VR v1.0", order="date.asc", limit="2000")
    por_cat: dict[str, list[dict]] = {}
    for f in filas:
        if f.get("p10") is None or f.get("p90") is None:
            continue
        por_cat.setdefault(f["category"], []).append(
            {"fecha": f["date"], "p10": float(f["p10"]), "p90": float(f["p90"]),
             "mediana": float(f["mediana"]) if f.get("mediana") is not None else None,
             "amplitud": f.get("amplitud_pct"), "lotes": f.get("lotes")})
    return D.Serie([{"categoria": k, "puntos": v} for k, v in por_cat.items() if len(v) >= 10],
                   "Valor de Referencia VR v1.0 · lotes del MAG", filas[-1]["date"] if filas else None,
                   propia=True, nota="Cada punto es una ventana móvil de 30 días.")


def relativos(amplitud: D.Serie) -> D.Serie:
    """
    Precio de cada categoría contra el novillo, con la mediana de la banda VR de la
    misma fecha. Solo categorías que el MAG opera por lote: el ternero no está y
    no se reemplaza por nada.
    """
    por_cat = {s["categoria"]: {p["fecha"]: p.get("mediana") for p in s["puntos"]} for s in amplitud.puntos}
    nov = por_cat.get("NOVILLO") or {}
    puntos = []
    for cat in ("VACA", "VAQUILLONA", "NOVILLITO"):
        # Sin redondear: el redondeo va una sola vez, al imprimir.
        serie = [{"fecha": f, "relacion": v / nov[f]}
                 for f, v in sorted((por_cat.get(cat) or {}).items()) if v and nov.get(f)]
        if len(serie) >= 10:
            puntos.append({"categoria": cat, "puntos": serie})
    return D.Serie(puntos, "Valor de Referencia VR v1.0 · mediana de cada categoría sobre la del novillo",
                   amplitud.fecha_dato, propia=True,
                   nota="Ventana móvil de 30 días: se lee nivel y tendencia, no un día contra otro.")


def internacional(cierre_usd: float | None) -> dict:
    """
    La brecha contra el mundo, con la misma fuente y la misma cuenta que la tool
    MCP `international_price_gap`: USD por kilo VIVO, sin estimar rendimiento de
    carcasa, Argentina = INMAG al dólar libre. Brasil no entra (la licencia de
    CEPEA prohíbe retransmitir sus series).
    """
    try:
        a = D._json_repo("precios-internacionales.json")
    except D.FaltaDato:
        return {}
    paises = a.get("paises") or []
    if not paises or not cierre_usd:
        return {}
    def periodo(p: dict) -> str:
        if p.get("semana"):
            return f'semana {p["semana"]}'
        if "weekly" in str(p.get("fuente") or "").lower():
            return "promedio semanal"
        return "indicador diario"

    import re
    filas = sorted(({**p, "ratio": p["usd_kg_vivo"] / cierre_usd,
                     # EE.UU. publica la fecha mes/día/año; el resto, día/mes/año o ISO.
                     "fecha_ar": fecha_ddmmaaaa(p.get("fecha"), mes_primero=p.get("pais") == "Estados Unidos"),
                     "nativo_ar": re.sub(r"(?<=\d)\.(?=\d)", ",", str(p.get("nativo") or "")),
                     "periodo": periodo(p)} for p in paises),
                   key=lambda p: p["usd_kg_vivo"], reverse=True)
    return {"argentina": cierre_usd, "paises": filas, "generado": a.get("generadoEl"),
            "metodo": a.get("metodo"), "fallas": a.get("fallas") or []}


def _meses_entre(fecha: str | None, m: D.Mes) -> int | None:
    """Meses entre el dato ('2026-08' o '2024') y el mes del informe. Un año pelado cuenta desde enero."""
    if not fecha:
        return None
    s = str(fecha)
    try:
        a = int(s[:4])
        mm = int(s[5:7]) if len(s) >= 7 else 1
    except ValueError:
        return None
    return (m.anio - a) * 12 + (m.mes - mm)


def renta_tierra(novillo_usd: float | None, m: D.Mes) -> D.Serie:
    """
    Kilos de novillo que cuesta la hectárea ganadera, renta y años de repago, con la
    cuenta de `rentaCampo()` (senales.ts) que usa la tool `farmland_yield`:
      · rendimiento = canon × novillo USD / USD por ha;
      · repago = 100 / rendimiento.

    EL FILTRO (más estricto que la tool, porque esto se imprime y circula):
      · entra solo la zona con n ≥ 5 y dato de 12 meses o menos;
      · renta y repago SOLO con canon relevado en ESA zona: una fila de zona con
        `canon_fuente`. La fila provincial no cuenta aunque traiga canon: el de
        Buenos Aires es el del Salado, el de Corrientes una cita provincial de 2023.
        Tampoco se estima el canon como fracción de la producción;
      · el resto que pasa n y fecha va como "sin canon de la zona", sin renta ni
        repago. Lo que no pasa n o fecha, no va.
    """
    if not novillo_usd:
        return D.Serie([], "Relevamiento propio + Compañía Argentina de Tierras", None)
    a = D._json_repo("tierra-por-kilo.json")
    filas = a if isinstance(a, list) else (a.get("zonas") or [])
    puntos = []
    fuera = 0
    for z in filas:
        if str(z.get("aptitud") or "ganadera").lower() != "ganadera" or not z.get("usd_ha"):
            continue
        edad = _meses_entre(z.get("fecha"), m)
        if (z.get("n") or 0) < TIERRA_N_MIN or edad is None or edad > TIERRA_MESES_MAX:
            fuera += 1
            continue
        de_zona = bool(z.get("zona") and z.get("canon_fuente") and z.get("kg_ha_mes_canon"))
        canon = z["kg_ha_mes_canon"] * 12 if de_zona else None
        rend = 100 * canon * novillo_usd / z["usd_ha"] if canon else None
        puntos.append({
            "provincia": z.get("provincia"), "zona": z.get("zona") or z.get("region"),
            "usd_ha": z["usd_ha"], "p25": z.get("p25"), "p75": z.get("p75"),
            "kg_novillo_ha": round(z["usd_ha"] / novillo_usd),
            "canon_kg_mes": z["kg_ha_mes_canon"] if de_zona else None,
            "canon_relevado": de_zona,
            "rendimiento_pct": rend,
            "repago": round(100 / rend) if rend else None,
            "n": z.get("n"), "fecha": z.get("fecha"),
        })
    puntos.sort(key=lambda x: x["usd_ha"], reverse=True)
    return D.Serie(puntos, "Relevamiento propio + Compañía Argentina de Tierras · cuenta de farmland_yield",
                   None, propia=True,
                   nota=(f"Novillo a {D_usd(novillo_usd)}/kg vivo (Índice Novillo al blue, cierre del mes). "
                         f"Fuera del informe por n < {TIERRA_N_MIN} o dato de más de {TIERRA_MESES_MAX} meses: {fuera} zonas."))


def D_usd(v: float) -> str:
    return f"USD {v:.2f}".replace(".", ",")


def fecha_ddmmaaaa(s: str | None, mes_primero: bool = False) -> str:
    """'2026-10-31', '28/10/2026' o '10/26/2026' (EE.UU.) → '31/10/2026'."""
    if not s:
        return "sin dato"
    s = str(s)[:10]
    if len(s) == 10 and s[4] == "-":
        return f"{s[8:10]}/{s[5:7]}/{s[:4]}"
    partes = s.split("/")
    if len(partes) == 3:
        a, b, c = partes
        if mes_primero:
            a, b = b, a
        return f"{int(a):02d}/{int(b):02d}/{c}"
    return s


def remates_mes(m: D.Mes) -> dict:
    """Los remates del MES CERRADO según el calendario propio: cuántos, dónde, y las cabezas anunciadas."""
    try:
        todos = D._json_repo("remates.json")
    except D.FaltaDato:
        return {}
    del_mes = [r for r in todos if str(r.get("date") or "")[:7] == m.ym]
    if not del_mes:
        return {}
    prov: dict[str, int] = {}
    tipos: dict[str, int] = {}
    for r in del_mes:
        k = (r.get("province") or "").strip() or "SIN DATO"
        prov[k] = prov.get(k, 0) + 1
        t = r.get("type") or "otro"
        tipos[t] = tipos.get(t, 0) + 1
    con_cab = [r for r in del_mes if r.get("estimatedHeads")]
    return {
        "total": len(del_mes),
        "jornadas": len({str(r["date"])[:10] for r in del_mes}),
        "firmas": len({r.get("consignatariaSlug") or r.get("consignatariaName") for r in del_mes}),
        "por_provincia": sorted(prov.items(), key=lambda x: x[1], reverse=True),
        "por_tipo": sorted(tipos.items(), key=lambda x: x[1], reverse=True),
        "cabezas_anunciadas": sum(r["estimatedHeads"] for r in con_cab),
        "con_cabezas": len(con_cab),
        "fuente": "Calendario propio · scrape diario de firmas y cámaras",
    }


# ─── derivados del mes ─────────────────────────────────────────────────────────

def _fila_semaforo(nombre: str, unidad: str, diario: list[dict], campo: str, m: D.Mes,
                   cinco: bool, color: bool, fuente: str) -> dict | None:
    """
    Una fila del semáforo. Las ventanas cortas comparan puntos (el último dato del
    mes contra el último de una y cuatro semanas antes); las largas comparan
    promedios mensuales, que es la misma cuenta del interanual de la tapa.
    """
    del_mes = [p for p in diario if m.desde <= p["fecha"] <= m.hasta and p.get(campo)]
    if not del_mes:
        return None
    u = del_mes[-1]
    d = date.fromisoformat(u["fecha"])
    s1 = _valor_a(diario, campo, (d - timedelta(days=7)).isoformat())
    s4 = _valor_a(diario, campo, (d - timedelta(days=28)).isoformat())
    mens = {x["ym"]: x["valor"] for x in a_mensual(diario, campo)}
    actual = mens.get(m.ym)
    ia = mens.get(f"{m.anio - 1:04d}-{m.mes:02d}")
    previos = [mens.get(f"{a:04d}-{m.mes:02d}") for a in anios_base(m.anio)]
    prom5 = sum(previos) / len(previos) if cinco and previos and all(previos) else None
    # La misma cuenta al oficial contra los últimos cinco años corridos, que la nota
    # al pie muestra al lado: es la que sale si no se descartan los años con brecha.
    p5_alt = None
    if cinco and campo == "usd_blue":
        mo = {x["ym"]: x["valor"] for x in a_mensual(diario, "usd_oficial")}
        alt = [mo.get(f"{m.anio - k:04d}-{m.mes:02d}") for k in range(1, 6)]
        if all(alt) and mo.get(m.ym):
            p5_alt = _var(mo[m.ym], sum(alt) / len(alt))
    return {
        "nombre": nombre, "unidad": unidad, "ultimo": u[campo], "fecha": u["fecha"],
        "s1": _var(u[campo], s1 and s1[campo]), "s4": _var(u[campo], s4 and s4[campo]),
        "ia": _var(actual, ia), "p5": _var(actual, prom5), "p5_oficial_5": p5_alt,
        "color": color, "fuente": fuente,
    }


def semaforo(p: D.Paquete, nov: D.Serie) -> list[dict]:
    """
    Variación a 1 semana, 4 semanas, interanual y contra el promedio de 5 años.

    El color va SOLO donde el signo se lee sin discusión: el precio en dólares
    (sube = el kilo vale más). En pesos, con inflación de dos dígitos, una suba
    nominal puede ser una baja real, así que esas filas van sin color; y contra el
    promedio de 5 años en pesos no se compara nada, porque mediría la inflación.
    Las categorías de la banda VR tienen serie desde junio de 2026: solo las dos
    ventanas cortas.
    """
    filas = [
        _fila_semaforo("Índice Novillo", "$/kg", p.inmag.puntos, "ars", p.mes, False, False, "MAG"),
        _fila_semaforo("Índice Novillo", "USD/kg", p.inmag.puntos, "usd_blue", p.mes, True, True, "MAG · blue"),
        _fila_semaforo("Novillito", "$/kg", nov.puntos, "ars", p.mes, False, False, "MAG"),
        _fila_semaforo("Novillito", "USD/kg", nov.puntos, "usd_blue", p.mes, True, True, "MAG · blue"),
    ]
    # El interanual del índice sale de `Paquete.variacion()`, el mismo método que
    # imprime la tapa: si se recalculara acá, el redondeo de los promedios
    # mensuales podía dar una décima distinta y el PDF se contradecía solo.
    for f, campo in ((filas[0], "ars"), (filas[1], "usd_blue")):
        if f:
            f["ia"] = p.variacion(campo, 12)
    for s in sorted(p.amplitud.puntos, key=lambda s: s["categoria"]):
        diario = [{"fecha": x["fecha"], "mediana": x.get("mediana")} for x in s["puntos"]]
        filas.append(_fila_semaforo(f'{s["categoria"] if s["categoria"] == "MEJ" else s["categoria"].capitalize()} (mediana de la Banda)', "$/kg", diario,
                                    "mediana", p.mes, False, False, "banda VR"))
    return [f for f in filas if f]


def amplitud_contra(p: D.Paquete, categoria: str, dias: int = 28) -> tuple[float | None, float | None, str | None]:
    """Amplitud actual de una categoría y la de `dias` antes, de la serie histórica."""
    s = next((x for x in p.amplitud.puntos if x["categoria"] == categoria), None)
    actual = next((b.get("amplitud_pct") for b in p.bandas.puntos if b["categoria"] == categoria), None)
    if not s or actual is None:
        return actual, None, None
    u = s["puntos"][-1]
    hasta = (date.fromisoformat(u["fecha"]) - timedelta(days=dias)).isoformat()
    previo = _valor_a(s["puntos"], "amplitud", hasta)
    return actual, (previo or {}).get("amplitud"), (previo or {}).get("fecha")


# ─── el paquete v2 ─────────────────────────────────────────────────────────────

@dataclass
class Extra:
    novillito: D.Serie
    bandas_hist: D.Serie
    estacional: dict
    relativos: D.Serie
    internacional: dict
    tierra: D.Serie
    remates_mes: dict
    semaforo: list[dict]
    ruedas: dict = field(default_factory=dict)
    nacional: dict = field(default_factory=dict)
    maiz_vigente: bool = False
    composicion: list[dict] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    faltantes: list[str] = field(default_factory=list)


def control_ruedas(p: D.Paquete) -> dict:
    """
    Cuántas ruedas tuvo el mes y en cuántas hay Índice Novillo. El v1 contaba como
    "ruedas" solo las que tienen índice (11 en octubre de 2026) y las otras dos no
    existían para el lector.

    Fuentes, sin inventar nada:
      · las ruedas: fechas con lotes en `mag_consignataria_sales_lots` más las filas
        del mes en `mag_inmag_history` (con o sin índice);
      · "el MAG no publicó": la fila existe y `inmag_value` es NULL. El scraper solo
        deja NULL cuando el MAG imprime "-" o "*" en la columna (el MAG calcula el
        índice solo con más de 300 novillos en la rueda);
      · "falta en la base": hay lotes ese día y no hay fila del INMAG. Eso no se
        explica en el texto: se avisa en la corrida, porque puede ser el scraper.
    """
    m = p.mes
    lotes = D.sb("mag_consignataria_sales_lots", select="date,category,head_count",
                 date=f"gte.{m.desde}", order="date.asc", limit="20000")
    cab_lotes: dict[str, int] = {}
    for f in lotes:
        d = str(f["date"])[:10]
        if d <= m.hasta:
            cab_lotes[d] = cab_lotes.get(d, 0) + (f.get("head_count") or 0)
    filas = [f for f in D.sb("mag_inmag_history", select="date,inmag_value,head_count",
                             date=f"gte.{m.desde}", order="date.asc", limit="100")
             if str(f["date"])[:10] <= m.hasta]
    con = {p_["fecha"] for p_ in p.ruedas_mes}
    tabla = {str(f["date"])[:10]: f for f in filas}
    sin_indice = sorted(d for d, f in tabla.items() if f.get("inmag_value") is None and (f.get("head_count") or 0) > 0
                        and (d in cab_lotes or not cab_lotes))
    sin_fila = sorted(d for d in cab_lotes if d not in tabla)
    ruedas = sorted(con | set(sin_indice) | set(sin_fila))
    cab = {d: (tabla.get(d) or {}).get("head_count") or cab_lotes.get(d) or 0 for d in ruedas}
    min_con = min((cab[d] for d in con if cab.get(d)), default=0)
    return {"ruedas": ruedas, "con_indice": sorted(con), "sin_indice_mag": sin_indice, "sin_fila": sin_fila,
            "bajo_volumen": bool(sin_indice) and all(cab[d] < min_con for d in sin_indice),
            "lotes": sorted(cab_lotes)}


def nacional_hembras() -> dict:
    """La faena nacional con el mes que informa (el v1 no lo trae: `periodo` le queda vacío)."""
    try:
        a = D._json_repo("faena-hembras-nacional-actual.json")
    except D.FaltaDato:
        return {}
    return {"pct": a.get("pct_hembras"), "mes_informe": a.get("mes_informe"), "fuente": a.get("fuente"),
            "actualizado": a.get("actualizado")}


def maiz_vigente(p: D.Paquete) -> bool:
    """La relación maíz/novillo va si su último dato es del mes anterior al del informe o posterior."""
    if not p.maiz.puntos:
        return False
    a, mm = p.mes.anio, p.mes.mes - 1
    if mm == 0:
        a, mm = a - 1, 12
    return str(p.maiz.puntos[-1]["ym"]) >= f"{a:04d}-{mm:02d}"


def composicion(p: D.Paquete) -> list[dict]:
    """
    Qué entró al mercado, sobre la MISMA base que la tabla de hembras (todas las
    cabezas del mes): las categorías con menos de 10 lotes se juntan en "otras",
    así las partes suman el total que la tabla imprime.
    """
    liq = next((q for q in p.liquidacion.puntos if q["ym"] == p.mes.ym), None)
    filas = list(p.composicion.puntos)
    if not liq or not filas:
        return filas
    total = liq["cabezas"]
    out = [{**f, "share": 100 * f["cabezas"] / total} for f in filas[:6]]
    resto = total - sum(f["cabezas"] for f in out)
    if resto > 0:
        out.append({"categoria": "OTRAS", "cabezas": resto, "share": 100 * resto / total, "lotes": None})
    return out


def cargar(ym: str) -> tuple[D.Paquete, Extra]:
    """El paquete del v1, intacto, más lo que agrega el v2. Lo accesorio que falte se anota."""
    faltan: list[str] = []
    # En el v1 la banda VR es crítica y su falta corta la edición. En el v2 lo único
    # indispensable es el INMAG: sin banda, sus páginas se omiten y se anotan.
    original = D.bandas_vr

    def bandas_o_vacio() -> D.Serie:
        try:
            return original()
        except Exception as e:  # noqa: BLE001
            faltan.append(f"Banda Consignatarias del mes ({e})")
            return D.Serie([], "Valor de Referencia VR v1.0", None, propia=True)

    D.bandas_vr = bandas_o_vacio
    try:
        p = D.cargar(ym)
    finally:
        D.bandas_vr = original
    try:
        blue, ofi = dolares()
    except Exception as e:  # noqa: BLE001 — una serie accesoria no tira el informe
        blue, ofi = {}, {}
        faltan.append(f"dólar histórico ({e})")
    nov = novillito_usd(p.novillito, blue, ofi) if blue or ofi else D.Serie([], "Novillito en el MAG", None)
    if not len(nov):
        faltan.append("novillito en dólares")
    try:
        bh = bandas_historicas()
    except Exception as e:  # noqa: BLE001
        bh = D.Serie([], "Valor de Referencia VR v1.0", None)
        faltan.append(f"bandas históricas ({e})")
    if not len(bh) and not any(x.startswith("bandas") for x in faltan):
        faltan.append("bandas históricas")
    # La estacionalidad va al OFICIAL: al blue, los años con brecha deforman el
    # índice (octubre daba 0,873 al blue, 0,899 al oficial y 0,926 en pesos).
    def seguro(nombre: str, fn, vacio):
        """Una serie accesoria que rompe no tira la edición: queda vacía y se anota."""
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            faltan.append(f"{nombre} ({e})")
            return vacio

    serie_vacia = D.Serie([], "—", None)
    est = seguro("estacionalidad", lambda: estacionalidad(p.mensual("usd_oficial")), {})
    rel = seguro("precios relativos por categoría", lambda: relativos(p.amplitud), serie_vacia)
    if not len(rel) and not any(f.startswith("precios relativos") for f in faltan):
        faltan.append("precios relativos por categoría")
    intl = seguro("brecha internacional", lambda: internacional(p.cierre and p.cierre.get("usd_blue")), {})
    if not intl and not any(f.startswith("brecha internacional") for f in faltan):
        faltan.append("brecha internacional")
    ultimo_usd = next((x["usd_blue"] for x in reversed(p.inmag.puntos) if x.get("usd_blue")), None)
    tie = seguro("valor de la tierra", lambda: renta_tierra(ultimo_usd, p.mes), serie_vacia)
    rm = seguro("remates del mes", lambda: remates_mes(p.mes), {})
    if not rm and not any(f.startswith("remates del mes") for f in faltan):
        faltan.append("remates del mes")
    avisos: list[str] = []
    try:
        ru = control_ruedas(p)
    except Exception as e:  # noqa: BLE001
        ru = {}
        avisos.append(f"control de ruedas sin correr ({e})")
    if ru and ru["lotes"] and set(ru["con_indice"]) != set(ru["lotes"]):
        avisos.append(f'ruedas con Índice Novillo ({len(ru["con_indice"])}) ≠ ruedas con lotes ({len(ru["lotes"])}): '
                      f'sin índice publicado por el MAG {ru["sin_indice_mag"] or "ninguna"}; '
                      f'sin fila en mag_inmag_history {ru["sin_fila"] or "ninguna"}')
    mv = seguro("relación maíz/novillo", lambda: maiz_vigente(p), False)
    if p.maiz.puntos and not mv:
        u = p.maiz.puntos[-1]["ym"]
        faltan.append(f"relación maíz/novillo (último dato {u[5:7]}/{u[:4]})")
    return p, Extra(novillito=nov, bandas_hist=bh, estacional=est, relativos=rel, internacional=intl, tierra=tie,
                    remates_mes=rm, semaforo=seguro("semáforo", lambda: semaforo(p, nov), []), ruedas=ru,
                    nacional=seguro("faena nacional", nacional_hembras, {}), maiz_vigente=mv,
                    composicion=seguro("composición del mes", lambda: composicion(p), []), avisos=avisos,
                    faltantes=faltan)
