#!/usr/bin/env python3
"""
Capa de datos de El Corredor. Una sola puerta para todo lo que el informe imprime.

POR QUÉ EXISTE SEPARADA DEL RENDER
El generador viejo leía datos en 20 lugares distintos y, cuando faltaba uno,
imprimía una página A4 vacía sin avisar. Acá cada serie se pide una vez, se
valida, y lo que falta **rompe el build** si es crítico o se marca `None` si es
accesorio — pero nunca se publica un hueco silencioso.

LAS DOS REGLAS QUE ESTE ARCHIVO HACE CUMPLIR
1. **Nada sin fuente y fecha.** Cada serie viaja con `fuente` y `fecha_dato`; el
   render las imprime al pie. Un número sin eso no es citable y en papel no hay
   tooltip que lo arregle después.
2. **No se publica lo que el repo marca como no confiable.** Concretamente:
   · `market-prices.json → categories` NO se usa para precio por categoría: los
     días sin rueda el scraper reescribe el valor con un ratio fijo sobre el
     INMAG (medido: novillito −13 % de un día al otro sin que el mercado se
     mueva). La categoría sale de la banda VR y del PDF mensual del MAG.
   · **Terneros no se publica**: es siempre INMAG × 1,10 y el MAG no opera
     terneros. Por lo mismo, el ratio ternero/novillo como señal de ciclo es
     aritmética circular y acá no existe.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from calendar import monthrange
from datetime import date
from pathlib import Path
from statistics import median
from typing import Any

RAIZ = Path(__file__).resolve().parent.parent.parent
DATA = RAIZ / "src" / "lib" / "data"
AQUI = Path(__file__).resolve().parent
CACHE = AQUI / "cache"

SB_URL = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

MESES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


class FaltaDato(RuntimeError):
    """Un dato sin el cual el informe no se publica. Rompe el build a propósito."""


# ─── acceso crudo ──────────────────────────────────────────────────────────────

def _json_repo(nombre: str) -> Any:
    p = DATA / nombre
    if not p.exists():
        raise FaltaDato(f"falta {p.relative_to(RAIZ)}")
    return json.loads(p.read_text(encoding="utf-8"))


PAGINA = 1000  # PostgREST corta en 1.000 filas por respuesta, ignore el `limit` que se pida


def sb(tabla: str, **params: str) -> list[dict]:
    """
    Una consulta a Supabase por REST, PAGINADA.

    La paginación no es una optimización: **PostgREST tope las respuestas en 1.000
    filas** (`db-max-rows`). Sin paginar, pedir la serie del INMAG ordenada
    ascendente devolvía 2015→2019 y el mes en curso no existía — el síntoma era
    "sin ruedas del INMAG en 2026-09" con la tabla llena. Es la misma trampa que
    el repo ya documentó para `get_canuelas_hembras_mensual`.

    Devuelve [] si no hay credenciales, para que el render corra en una máquina sin
    secretos; quien decide si eso es fatal es el caller.
    """
    if not SB_URL or not SB_KEY:
        return []
    params.pop("limit", None)
    todas: list[dict] = []
    desplazamiento = 0
    while True:
        q = urllib.parse.urlencode({**params, "limit": str(PAGINA), "offset": str(desplazamiento)}, safe="(),.*:-")
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/{tabla}?{q}",
            headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=40) as r:
            lote = json.loads(r.read().decode("utf-8"))
        todas.extend(lote)
        if len(lote) < PAGINA:
            return todas
        desplazamiento += PAGINA
        if desplazamiento > 120_000:  # cinturón: ninguna serie del informe es tan grande
            return todas


# ─── el mes ────────────────────────────────────────────────────────────────────

@dataclass
class Mes:
    ym: str          # '2026-09'
    anio: int
    mes: int
    desde: str       # '2026-09-01'
    hasta: str       # '2026-09-30'
    nombre: str      # 'septiembre'

    @staticmethod
    def de(ym: str) -> "Mes":
        a, m = (int(x) for x in ym.split("-"))
        ultimo = monthrange(a, m)[1]
        return Mes(ym=ym, anio=a, mes=m, desde=f"{a:04d}-{m:02d}-01",
                   hasta=f"{a:04d}-{m:02d}-{ultimo:02d}", nombre=MESES[m])

    @property
    def etiqueta(self) -> str:
        return f"{self.nombre} {self.anio}"


# ─── series ────────────────────────────────────────────────────────────────────

@dataclass
class Serie:
    """Una serie con su procedencia. `propia` decide el cuadrado lleno o hueco del pie."""
    puntos: list[dict]
    fuente: str
    fecha_dato: str | None
    propia: bool = False
    nota: str | None = None

    def __len__(self) -> int:
        return len(self.puntos)


def inmag_diario(desde: str = "2015-01-01") -> Serie:
    """
    La serie del INMAG, empalmada Liniers→MAG, con su conversión a dólares.

    El INMAG lo publica el MAG: lo nuestro es el empalme desde 2015 y la
    normalización a USD (nadie publica la serie dolarizada). Por eso la fuente
    dice las dos cosas.
    """
    filas = sb(
        "mag_inmag_history",
        select="date,inmag_value,head_count",
        date=f"gte.{desde}",
        inmag_value="not.is.null",
        order="date.asc",
        limit="4000",
    )
    if not filas:
        raise FaltaDato("mag_inmag_history vacío o sin credenciales de Supabase")

    blue = {f["date"]: f.get("venta") for f in sb("usd_blue_history", select="date,venta", date=f"gte.{desde}", order="date.asc", limit="6000")}
    ofi = {f["date"]: f.get("venta") for f in sb("usd_oficial_history", select="date,venta", date=f"gte.{desde}", order="date.asc", limit="8000")}

    # Forward-fill del dólar: el MAG opera días que el mercado de cambio no cotiza.
    ult_b = ult_o = None
    puntos = []
    for f in filas:
        d = f["date"]
        ult_b = blue.get(d) or ult_b
        ult_o = ofi.get(d) or ult_o
        ars = float(f["inmag_value"])
        puntos.append({
            "fecha": d,
            "ars": ars,
            "usd_blue": round(ars / float(ult_b), 3) if ult_b else None,
            "usd_oficial": round(ars / float(ult_o), 3) if ult_o else None,
            "cabezas": f.get("head_count"),
        })
    return Serie(puntos, "Índice Novillo del MAG · empalme Liniers→MAG y dolarización propios",
                 puntos[-1]["fecha"], propia=True)


def bandas_vr() -> Serie:
    """Banda P10/mediana/P90 por categoría. 100 % propia: no existe en ninguna fuente oficial."""
    a = _json_repo("vr-bandas.json")
    cats = a.get("categorias") or {}
    puntos = [{"categoria": k, **v} for k, v in cats.items() if (v or {}).get("lotes")]
    if not puntos:
        raise FaltaDato("vr-bandas.json sin categorías con lotes")
    return Serie(puntos, f"Valor de Referencia VR v1.0 · ventana {a.get('ventana_dias')} días, lotes del MAG",
                 a.get("fecha_dato_hasta"), propia=True,
                 nota="Banda de las operaciones de lote realmente observadas, no una tasación.")


def bandas_por_peso() -> Serie:
    a = _json_repo("vr-bandas.json")
    return Serie([{"categoria": k, "rangos": v} for k, v in (a.get("por_peso") or {}).items() if v],
                 "Valor de Referencia VR v1.0 · por rango de 50 kg", a.get("fecha_dato_hasta"), propia=True)


def amplitud_historica() -> Serie:
    """
    Serie de la amplitud de la banda. ⚠️ Ventana móvil de 30 días: dos puntos
    consecutivos comparten 29 días de lotes, así que se lee NIVEL y TENDENCIA.
    No se testean diferencias día a día y el render lo declara al pie.
    """
    filas = sb("vr_bandas_history", select="date,category,p10,mediana,p90,amplitud_pct,lotes",
               metodologia="eq.VR v1.0", order="date.asc", limit="2000")
    por_cat: dict[str, list[dict]] = {}
    for f in filas:
        if f.get("amplitud_pct") is None:
            continue
        por_cat.setdefault(f["category"], []).append(
            {"fecha": f["date"], "amplitud": float(f["amplitud_pct"]), "mediana": f.get("mediana"), "lotes": f.get("lotes")}
        )
    return Serie([{"categoria": k, "puntos": v} for k, v in por_cat.items() if len(v) >= 10],
                 "Valor de Referencia VR v1.0", filas[-1]["date"] if filas else None, propia=True,
                 nota="Cada punto es una ventana móvil de 30 días: la serie está autocorrelacionada por construcción.")


def liquidacion_canuelas(hasta: str) -> Serie:
    """
    % de hembras sobre las cabezas operadas en Cañuelas, por mes, desde NUESTROS lotes.

    ⚠️ ACÁ ESTABA EL ERROR MÁS GRAVE DEL INFORME VIEJO. `render.py` tomaba UN
    bucket de vacas y UNO de vaquillonas de las 8 categorías de hembras que opera
    el MAG: publicaba 32 % cuando el real de septiembre era 58,8 %. Con los
    umbrales de >50 liquidación / <40 retención, el informe dijo "retención
    consolidada" TODOS los meses desde mayo y la regla impresa al productor fue
    "retener vientres" en plena fase de liquidación.

    Acá se suman todas las hembras contra el total operado, que es la única cuenta
    que responde la pregunta.

    ⚠️ Y no se compara con la faena nacional en el mismo eje: Cañuelas corre
    estructuralmente más alto porque concentra venta de vientres (60-68 % propio
    contra 46 % nacional). Los umbrales nacionales NO aplican a esta serie.
    """
    filas = sb("mag_consignataria_sales_lots", select="date,category,head_count",
               date=f"lte.{hasta}", order="date.asc", limit="40000")
    if not filas:
        return Serie([], "lotes del MAG (Cañuelas)", None, propia=True)

    HEMBRAS = {"VACA", "VAQUILLONA"}
    por_mes: dict[str, dict[str, int]] = {}
    for f in filas:
        cab = f.get("head_count") or 0
        if not cab:
            continue
        ym = str(f["date"])[:7]
        b = por_mes.setdefault(ym, {"hembras": 0, "total": 0, "lotes": 0})
        b["total"] += cab
        b["lotes"] += 1
        if str(f.get("category") or "").upper() in HEMBRAS:
            b["hembras"] += cab

    puntos = [
        {"ym": ym, "pct": round(100 * v["hembras"] / v["total"], 1), "cabezas": v["total"], "lotes": v["lotes"]}
        for ym, v in sorted(por_mes.items())
        if v["total"] >= 5000  # un mes con pocas cabezas no se publica como % del mercado
    ]
    return Serie(puntos, "Cabezas operadas en el MAG (Cañuelas) · cálculo propio sobre lotes",
                 filas[-1]["date"], propia=True,
                 nota="Cañuelas concentra venta de vientres: corre por encima de la faena nacional y no se compara 1:1.")


def faena_nacional() -> dict:
    """El ancla nacional, que es de tercero y viene con atraso. Se imprime con su fecha."""
    try:
        a = _json_repo("faena-hembras-nacional-actual.json")
    except FaltaDato:
        return {}
    return {"pct": a.get("pct_hembras"), "periodo": a.get("periodo") or a.get("hasta"),
            "faena_total": a.get("faena_total"), "fuente": a.get("fuente") or "MAGyP",
            "fecha_dato": a.get("actualizado") or a.get("fecha")}


def novillo_maiz() -> Serie:
    """
    Relación maíz/novillo: cuántos kg de maíz compra 1 kg de novillo. Umbral 12.
    El cálculo es propio; los insumos (INMAG, maíz FOB del MAGyP, blue) de terceros.
    """
    a = _json_repo("maiz-novillo-historico.json")
    serie = a.get("serie") or []
    if not serie:
        raise FaltaDato("maiz-novillo-historico.json sin serie")
    puntos = [{"ym": p.get("ym") or p.get("mes"), "relacion": p.get("relacion") or p.get("ratio")} for p in serie]
    puntos = [p for p in puntos if p["ym"] and p["relacion"]]
    return Serie(puntos, "Cálculo propio sobre INMAG, maíz FOB (MAGyP) y dólar blue",
                 puntos[-1]["ym"], propia=True)


def novillito_largo() -> Serie:
    """Novillito desde 2006: la serie más profunda del inventario, y no se usaba."""
    filas = sb("mag_novillito_history", select="date,price_median,price_avg,head_count",
               order="date.asc", limit="5000")
    puntos = [{"fecha": f["date"], "mediana": f.get("price_median"), "promedio": f.get("price_avg"),
               "cabezas": f.get("head_count")} for f in filas if f.get("price_median") or f.get("price_avg")]
    return Serie(puntos, "Novillito en el MAG, serie por rueda", puntos[-1]["fecha"] if puntos else None)


def subcategorias_mes(m: Mes) -> Serie:
    """
    Precio por subcategoría del MES CERRADO, del PDF mensual oficial del MAG.
    Reemplaza al `categories` del snapshot diario, que es el dato con el ratio.
    """
    p = CACHE / f"categories-{m.ym}.json"
    if not p.exists():
        return Serie([], "PDF mensual del MAG (haciinfo000502)", None,
                     nota=f"sin backfill del mes {m.ym}")
    a = json.loads(p.read_text(encoding="utf-8"))
    buckets = a.get("buckets") or []
    puntos = []
    for b in buckets:
        cab = b.get("cabezas") or 0
        kg_tot = b.get("peso_prom_kg") or 0  # el parser guarda kg TOTALES con nombre de promedio
        puntos.append({
            "nombre": b.get("full") or b.get("nombre"),
            "minimo": b.get("min"), "maximo": b.get("max"),
            "promedio": b.get("avg"), "mediana": b.get("median"),
            "cabezas": cab,
            "kg_promedio": round(kg_tot / cab) if cab and kg_tot else None,
        })
    puntos.sort(key=lambda x: x.get("promedio") or 0, reverse=True)
    return Serie(puntos, "PDF mensual del MAG (haciinfo000502) · mes cerrado", a.get("fecha") or m.hasta)


def composicion_mes(m: Mes) -> Serie:
    """Qué categoría trae el mercado, por lotes y cabezas. Propio, de los lotes."""
    filas = sb("mag_consignataria_sales_lots", select="date,category,head_count",
               date=f"gte.{m.desde}", order="date.asc", limit="20000")
    filas = [f for f in filas if str(f["date"])[:10] <= m.hasta]
    por_cat: dict[str, dict[str, int]] = {}
    for f in filas:
        cab = f.get("head_count") or 0
        if not cab:
            continue
        c = str(f.get("category") or "").upper()
        b = por_cat.setdefault(c, {"lotes": 0, "cabezas": 0})
        b["lotes"] += 1
        b["cabezas"] += cab
    total = sum(v["cabezas"] for v in por_cat.values()) or 1
    puntos = sorted(
        ({"categoria": k, **v, "share": round(100 * v["cabezas"] / total, 1)} for k, v in por_cat.items() if v["lotes"] >= 10),
        key=lambda x: x["cabezas"], reverse=True,
    )
    return Serie(puntos, "Lotes operados en el MAG · cálculo propio", m.hasta, propia=True)


def tierra() -> Serie:
    """
    Valor de la hectárea por zona. ⚠️ 41 de 67 filas tienen una sola observación y
    40 son de 2023-2024: se imprime SIEMPRE con `n` y fecha en la misma línea, y
    nunca se titula como relevamiento del año en curso. Solo aptitud ganadera: la
    tierra agrícola no se tasa con canon de hacienda.
    """
    a = _json_repo("tierra-por-kilo.json")
    filas = a if isinstance(a, list) else (a.get("zonas") or a.get("filas") or [])
    puntos = []
    for f in filas:
        if str(f.get("aptitud") or "").lower() != "ganadera":
            continue
        if not f.get("usd_ha"):
            continue
        puntos.append({
            "provincia": f.get("provincia"), "zona": f.get("zona"),
            "usd_ha": f.get("usd_ha"), "p25": f.get("p25"), "p75": f.get("p75"),
            "canon_kg_ha_mes": f.get("kg_ha_mes_canon"), "anios_repago": f.get("anos_repago"),
            "n": f.get("n"), "fecha": f.get("fecha") or f.get("fuente_fecha"),
        })
    puntos.sort(key=lambda x: x["usd_ha"] or 0, reverse=True)
    return Serie(puntos, "Relevamiento propio + Compañía Argentina de Tierras", None, propia=True,
                 nota="Campo ganadero únicamente. Cada fila con su n y su fecha de relevamiento.")


def remates(m: Mes) -> dict:
    """Remates del mes que viene, que es lo único del informe con fecha de caducidad."""
    try:
        todos = _json_repo("remates.json")
    except FaltaDato:
        return {"proximos": [], "por_dia": {}, "fuente": "calendario propio"}
    sig_mes = (m.mes % 12) + 1
    sig_anio = m.anio + (m.mes == 12)
    pref = f"{sig_anio:04d}-{sig_mes:02d}"
    hoy = date.today().isoformat()
    prox = [r for r in todos if str(r.get("date") or "")[:7] == pref]
    por_dia: dict[str, int] = {}
    for r in prox:
        por_dia[str(r["date"])[:10]] = por_dia.get(str(r["date"])[:10], 0) + 1
    prox.sort(key=lambda r: str(r.get("date")))
    return {
        "proximos": prox, "por_dia": por_dia, "mes": pref,
        "futuros_totales": len([r for r in todos if str(r.get("date") or "")[:10] >= hoy]),
        "fuente": "Calendario propio · scrape diario de firmas y cámaras",
    }


def macro(m: Mes) -> dict:
    """Dólar y maíz del cierre, con la fecha de observación a la vista."""
    try:
        mk = _json_repo("market-prices.json")
    except FaltaDato:
        return {}
    return {
        "usd_blue": (mk.get("usdBlue") or {}).get("value"),
        "usd_oficial": (mk.get("usdOficial") or {}).get("value"),
        "maiz_fob": (mk.get("corn") or {}).get("value"),
        "arrendamiento_indice": (mk.get("arrendamientoOficial") or {}).get("value"),
        "fecha_dato": mk.get("lastUpdate"),
        "fuente": "dolarapi · maíz FOB MAGyP · índice de arrendamiento del MAG",
    }


# ─── el paquete del mes ────────────────────────────────────────────────────────

@dataclass
class Paquete:
    mes: Mes
    inmag: Serie
    bandas: Serie
    por_peso: Serie
    amplitud: Serie
    liquidacion: Serie
    nacional: dict
    maiz: Serie
    novillito: Serie
    subcategorias: Serie
    composicion: Serie
    tierra: Serie
    remates: dict
    macro: dict
    faltantes: list[str] = field(default_factory=list)

    # — derivados del mes, calculados una vez —

    @property
    def ruedas_mes(self) -> list[dict]:
        return [p for p in self.inmag.puntos if self.mes.desde <= p["fecha"] <= self.mes.hasta]

    @property
    def cierre(self) -> dict | None:
        r = self.ruedas_mes
        return r[-1] if r else None

    @property
    def promedio_ars(self) -> float | None:
        r = self.ruedas_mes
        return round(sum(p["ars"] for p in r) / len(r), 2) if r else None

    @property
    def promedio_usd(self) -> float | None:
        v = [p["usd_blue"] for p in self.ruedas_mes if p["usd_blue"]]
        return round(sum(v) / len(v), 3) if v else None

    def mensual(self, campo: str = "ars") -> list[dict]:
        """La serie mensual del INMAG (promedio por mes) en el campo pedido."""
        por_mes: dict[str, list[float]] = {}
        for p in self.inmag.puntos:
            v = p.get(campo)
            if v:
                por_mes.setdefault(p["fecha"][:7], []).append(float(v))
        return [{"ym": k, "valor": round(sum(v) / len(v), 3)} for k, v in sorted(por_mes.items())]

    def variacion(self, campo: str = "ars", meses: int = 12) -> float | None:
        s = self.mensual(campo)
        idx = next((i for i, p in enumerate(s) if p["ym"] == self.mes.ym), None)
        if idx is None or idx - meses < 0:
            return None
        base = s[idx - meses]["valor"]
        return round(100 * (s[idx]["valor"] - base) / base, 1) if base else None


def cargar(ym: str) -> Paquete:
    """
    Todo el mes de una vez. Lo crítico rompe; lo accesorio se anota en `faltantes`
    y el render imprime la ausencia en vez de una página vacía.
    """
    m = Mes.de(ym)
    faltantes: list[str] = []

    inmag = inmag_diario()  # crítico: si no está, no hay informe
    if not [p for p in inmag.puntos if m.desde <= p["fecha"] <= m.hasta]:
        raise FaltaDato(f"sin ruedas del INMAG en {ym}")

    def opcional(nombre, fn, *a):
        try:
            s = fn(*a)
            if (isinstance(s, Serie) and len(s) == 0) or (isinstance(s, dict) and not s):
                faltantes.append(nombre)
            return s
        except Exception as e:  # noqa: BLE001 — una fuente de tercero no tira el informe
            faltantes.append(f"{nombre} ({e})")
            return Serie([], "—", None) if fn.__annotations__.get("return") is Serie else {}

    return Paquete(
        mes=m,
        inmag=inmag,
        bandas=bandas_vr(),  # crítico: es el producto propio del informe
        por_peso=opcional("bandas por peso", bandas_por_peso),
        amplitud=opcional("amplitud histórica", amplitud_historica),
        liquidacion=opcional("liquidación Cañuelas", liquidacion_canuelas, m.hasta),
        nacional=opcional("faena nacional", faena_nacional),
        maiz=opcional("relación maíz/novillo", novillo_maiz),
        novillito=opcional("novillito serie larga", novillito_largo),
        subcategorias=opcional("subcategorías del mes", subcategorias_mes, m),
        composicion=opcional("composición del mes", composicion_mes, m),
        tierra=opcional("valor de la tierra", tierra),
        remates=opcional("remates", remates, m),
        macro=opcional("macro", macro, m),
        faltantes=faltantes,
    )


if __name__ == "__main__":
    import sys
    p = cargar(sys.argv[1] if len(sys.argv) > 1 else date.today().strftime("%Y-%m"))
    print(f"{p.mes.etiqueta}: {len(p.ruedas_mes)} ruedas · cierre {p.cierre and p.cierre['ars']} ARS "
          f"({p.cierre and p.cierre['usd_blue']} USD) · promedio {p.promedio_ars}")
    print(f"INMAG serie: {len(p.inmag)} ruedas desde {p.inmag.puntos[0]['fecha']}")
    print(f"bandas VR: {len(p.bandas)} categorías · amplitud: {len(p.amplitud)} series")
    if p.liquidacion.puntos:
        u = p.liquidacion.puntos[-1]
        print(f"hembras Cañuelas {u['ym']}: {u['pct']}% sobre {u['cabezas']} cabezas ({u['lotes']} lotes)")
    print(f"subcategorías: {len(p.subcategorias)} · composición: {len(p.composicion)} · tierra: {len(p.tierra)}")
    print(f"remates del mes que viene: {len(p.remates.get('proximos', []))}")
    print(f"faltantes: {p.faltantes or 'ninguno'}")
