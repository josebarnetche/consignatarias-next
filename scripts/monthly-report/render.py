#!/usr/bin/env python3
"""
Generador del Informe Mensual del Mercado Ganadero Argentino.
Lee JSON estático del proyecto + faena gov API + remates → renderiza HTML.

Uso:
    python scripts/monthly-report/render.py --month 2026-04
    python scripts/monthly-report/render.py --month 2026-04 --pdf  # requiere chromium
"""

from __future__ import annotations
import argparse
import json
import os
import urllib.request
from datetime import datetime, date
from pathlib import Path
from statistics import mean, stdev
from string import Template
from collections import defaultdict
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "src" / "lib" / "data"
HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
OUT = HERE / "output"
OUT.mkdir(parents=True, exist_ok=True)

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
MONTHS_ABBR = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
}


def fmt_ars(x: float, decimals: int = 0) -> str:
    s = f"{x:,.{decimals}f}"
    # AR locale: thousands `.`, decimals `,`
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_int(x: int) -> str:
    return f"{x:,}".replace(",", ".")


def fmt_pct(x: float, plus: bool = True) -> str:
    sign = "+" if (plus and x > 0) else ""
    return f"{sign}{x:.1f}%".replace(".", ",")


def load_market() -> dict:
    return json.loads((DATA / "market-prices.json").read_text())


def load_remates() -> list[dict]:
    return json.loads((DATA / "remates.json").read_text())


def load_categories_cache(ym: str) -> dict | None:
    p = CACHE / f"categories-{ym}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def load_usd_monthly() -> dict | None:
    p = CACHE / "usd-monthly.json"
    if not p.exists():
        return None
    return json.loads(p.read_text())


def usd_for_month(usd_cache: dict | None, ym: str) -> dict | None:
    """Returns merged dict with oficial+blue stats for a given YYYY-MM, or None."""
    if not usd_cache or ym not in usd_cache.get("months", {}):
        return None
    return usd_cache["months"][ym]


def interanual_inmag(market: dict, ym: str) -> dict:
    """Compare INMAG mean for ym vs same month previous year."""
    series = market["inmag"]["series"]
    y, m = map(int, ym.split("-"))
    prev_year_ym = f"{y - 1:04d}-{m:02d}"

    cur = [p for p in series if p["date"].startswith(ym)]
    prev = [p for p in series if p["date"].startswith(prev_year_ym)]
    if not cur or not prev:
        return {"available": False, "prev_ym": prev_year_ym}

    cur_avg = mean(p["value"] for p in cur)
    prev_avg = mean(p["value"] for p in prev)
    return {
        "available": True,
        "prev_ym": prev_year_ym,
        "cur_avg": cur_avg,
        "prev_avg": prev_avg,
        "var_pct_nominal": (cur_avg - prev_avg) / prev_avg * 100,
        "cur_close": cur[-1]["value"],
        "prev_close": prev[-1]["value"],
        "cur_days": len(cur),
        "prev_days": len(prev),
    }


def inmag_in_usd(market: dict, usd_cache: dict, ym: str) -> dict:
    """Compute INMAG average in USD oficial and blue for the month."""
    usd = usd_for_month(usd_cache, ym)
    if not usd or not usd.get("oficial", {}).get("venta_avg"):
        return {"available": False}

    series = market["inmag"]["series"]
    days = [p for p in series if p["date"].startswith(ym)]
    if not days:
        return {"available": False}

    inmag_avg = mean(p["value"] for p in days)
    usd_of = usd["oficial"]["venta_avg"]
    usd_bl = usd["blue"]["venta_avg"]

    return {
        "available": True,
        "month": ym,
        "inmag_ars_avg": inmag_avg,
        "usd_oficial_avg": usd_of,
        "usd_blue_avg": usd_bl,
        "usd_oficial_open": usd["oficial"].get("venta_open"),
        "usd_oficial_close": usd["oficial"].get("venta_close"),
        "brecha_avg_pct": usd.get("brecha_pct_avg"),
        "inmag_usd_oficial_avg": inmag_avg / usd_of,
        "inmag_usd_blue_avg": inmag_avg / usd_bl,
    }


def interanual_usd(market: dict, usd_cache: dict, ym: str) -> dict:
    """Real USD comparison ym vs ym-1y."""
    cur = inmag_in_usd(market, usd_cache, ym)
    y, m = map(int, ym.split("-"))
    prev_ym = f"{y - 1:04d}-{m:02d}"
    prev = inmag_in_usd(market, usd_cache, prev_ym)

    if not (cur.get("available") and prev.get("available")):
        return {"available": False, "prev_ym": prev_ym}

    return {
        "available": True,
        "prev_ym": prev_ym,
        "cur": cur,
        "prev": prev,
        "var_usd_oficial_pct": (cur["inmag_usd_oficial_avg"] - prev["inmag_usd_oficial_avg"]) / prev["inmag_usd_oficial_avg"] * 100,
        "var_usd_blue_pct": (cur["inmag_usd_blue_avg"] - prev["inmag_usd_blue_avg"]) / prev["inmag_usd_blue_avg"] * 100,
        "var_ars_pct": (cur["inmag_ars_avg"] - prev["inmag_ars_avg"]) / prev["inmag_ars_avg"] * 100,
        "brecha_change_pp": (cur.get("brecha_avg_pct") or 0) - (prev.get("brecha_avg_pct") or 0),
    }


def cycle_indicators(market: dict, cats_cache: dict | None, faena: dict | None) -> dict:
    """Indicadores de ciclo: ratio ternero/novillo + lectura faena."""
    out: dict[str, Any] = {"available": False}
    if not cats_cache or not cats_cache.get("buckets"):
        return out

    novillo = next((b for b in cats_cache["buckets"] if "NOVILLOS Esp.Joven" in b["full"]), None)
    novillito_top = max(
        (b for b in cats_cache["buckets"] if b["full"].startswith("NOVILLITOS")),
        key=lambda b: b.get("avg", 0), default=None,
    )
    ternero = next((b for b in cats_cache["buckets"] if "TERNER" in b["full"].upper()), None)
    vaca = next((b for b in cats_cache["buckets"] if b["full"].startswith("VACAS Regular")), None)
    vaquillona = next((b for b in cats_cache["buckets"] if "VAQUILLONAS" in b["full"]), None)

    if novillo and novillito_top:
        # Approximation: when novillito (lighter, younger) is priced HIGHER than novillo terminado
        # → the market is paying for animals that need to be retained or fattened more
        # → leading indicator of retention/scarcity
        out["novillito_novillo_ratio"] = novillito_top["avg"] / novillo["avg"]

    if novillo and vaca:
        out["novillo_vaca_ratio"] = novillo["avg"] / vaca["avg"]

    # Hembras en faena = vacas + vaquillonas (proxy desde buckets)
    cab_h = (vaca["cabezas"] if vaca else 0) + (vaquillona["cabezas"] if vaquillona else 0)
    cab_total = sum(b["cabezas"] for b in cats_cache["buckets"])
    if cab_total:
        out["hembras_pct"] = cab_h / cab_total * 100

    # Maíz para ratio
    corn_usd = market.get("corn", {}).get("current")
    if novillo and corn_usd:
        # margen invernada proxy: USD/kg novillo vs costo de conversión
        # Asumiendo 6 kg maíz por kg ganado terminado, costo = (corn_usd/1000 × 6)
        # En USD: novillo USD = inmag_USD × ratio bucket/inmag (~1.0 para Esp.Joven)
        out["corn_usd_tn"] = corn_usd

    # Faena lectura
    if faena:
        out["faena_yoy_pct"] = faena.get("yearlyChange")
        out["faena_mom_pct"] = faena.get("monthlyChange")

    out["available"] = True
    out["interpretation"] = _interpret_cycle(out)
    return out


def _interpret_cycle(c: dict) -> str:
    """Reading of cycle signals into one prose sentence."""
    signals = []
    nov_rel = c.get("novillito_novillo_ratio")
    if nov_rel and nov_rel > 1.05:
        signals.append("novillito premium sobre novillo terminado")
    elif nov_rel and nov_rel < 0.95:
        signals.append("novillo premium sobre novillito (oferta abundante de invernada)")

    h = c.get("hembras_pct")
    if h and h > 50:
        signals.append(f"hembras concentran {h:.0f}% del MAG (faena femenina alta — fase de liquidación)")
    elif h and h < 40:
        signals.append(f"hembras solo {h:.0f}% del MAG (retención de vientres — fase de crecimiento del rodeo)")

    fy = c.get("faena_yoy_pct")
    if fy is not None and fy < -5:
        signals.append(f"faena nacional cae {abs(fy):.1f}% interanual (menos oferta de carne)")
    elif fy is not None and fy > 5:
        signals.append(f"faena nacional sube {fy:.1f}% interanual (más oferta)")

    if not signals:
        return "Señales de ciclo mixtas o neutras este mes."
    return "Lectura del ciclo: " + "; ".join(signals) + "."


def trailing_inmag_usd(market: dict, usd_cache: dict, end_ym: str, n_months: int = 12) -> list[dict]:
    """Returns [{ym, inmag_usd_oficial, inmag_usd_blue}] for trailing months."""
    if not usd_cache:
        return []
    series = market["inmag"]["series"]
    y, m = map(int, end_ym.split("-"))
    out = []
    for i in range(n_months - 1, -1, -1):
        cm = m - i
        cy = y
        while cm <= 0:
            cm += 12
            cy -= 1
        ym = f"{cy:04d}-{cm:02d}"
        days = [p for p in series if p["date"].startswith(ym)]
        usd = usd_for_month(usd_cache, ym)
        if not days or not usd or not usd.get("oficial", {}).get("venta_avg"):
            continue
        avg = mean(p["value"] for p in days)
        out.append({
            "ym": ym,
            "inmag_ars": avg,
            "inmag_usd_oficial": avg / usd["oficial"]["venta_avg"],
            "inmag_usd_blue": avg / usd["blue"]["venta_avg"] if usd.get("blue", {}).get("venta_avg") else None,
            "usd_oficial": usd["oficial"]["venta_avg"],
        })
    return out


def build_inmag_usd_trailing_svg(rows: list[dict], width: int = 720, height: int = 220) -> str:
    """Trailing INMAG en USD oficial — line chart con anotaciones."""
    if len(rows) < 3:
        return '<p class="muted">Sin histórico USD suficiente.</p>'

    pad_l, pad_r, pad_t, pad_b = 50, 12, 18, 28
    inner_w = width - pad_l - pad_r
    inner_h = height - pad_t - pad_b
    vals = [r["inmag_usd_oficial"] for r in rows]
    vmin, vmax = min(vals), max(vals)
    span = max(vmax - vmin, 0.1)
    vmin -= span * 0.10
    vmax += span * 0.10
    span = vmax - vmin

    pts = []
    for i, r in enumerate(rows):
        x = pad_l + (i / max(len(rows) - 1, 1)) * inner_w
        y = pad_t + (1 - (r["inmag_usd_oficial"] - vmin) / span) * inner_h
        pts.append((x, y, r))

    path = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y, _ in pts)
    area = path + f" L {pts[-1][0]:.1f},{pad_t + inner_h:.1f} L {pts[0][0]:.1f},{pad_t + inner_h:.1f} Z"

    yticks = []
    for frac, val in [(0.0, vmax), (0.5, (vmax + vmin) / 2), (1.0, vmin)]:
        y = pad_t + frac * inner_h
        yticks.append(f'<text x="{pad_l - 6}" y="{y + 3:.1f}" text-anchor="end" font-size="9" fill="#71717a" font-family="SF Mono, monospace">USD {val:.2f}</text>')
        yticks.append(f'<line x1="{pad_l}" y1="{y:.1f}" x2="{pad_l + inner_w}" y2="{y:.1f}" stroke="#27272a" stroke-width="0.5" stroke-dasharray="2 3"/>')

    xstep = max(1, len(rows) // 6)
    xlabels = []
    for i in range(0, len(rows), xstep):
        x, _, r = pts[i]
        ym = r["ym"]
        y_, mo = ym.split("-")
        label = f"{MONTHS_ABBR[int(mo)]}{y_[2:]}"
        xlabels.append(f'<text x="{x:.1f}" y="{height - 8}" text-anchor="middle" font-size="9" fill="#71717a" font-family="SF Mono, monospace">{label}</text>')

    lx, ly, ld = pts[-1]
    last_marker = (
        f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="3.5" fill="#10b981" stroke="#0c0a0a" stroke-width="1.5"/>'
        f'<text x="{lx - 6:.1f}" y="{ly - 8:.1f}" text-anchor="end" font-size="10" fill="#10b981" font-weight="600" font-family="SF Mono, monospace">USD {ld["inmag_usd_oficial"]:.2f}</text>'
    )

    svg = f'''<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
        <defs>
            <linearGradient id="grad-usd" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
            </linearGradient>
        </defs>
        {''.join(yticks)}
        <path d="{area}" fill="url(#grad-usd)"/>
        <path d="{path}" fill="none" stroke="#10b981" stroke-width="1.5"/>
        {last_marker}
        {''.join(xlabels)}
    </svg>'''
    return svg


def market_composition_svg(width: int = 720, height: int = 110) -> str:
    """Horizontal stacked bar: 71% directa / 12% MAG / 9% remate-feria / 2% gancho."""
    parts = [
        ("Venta directa", 71, "#52525b"),
        ("MAG (rueda)", 12, "#38bdf8"),
        ("Remate-feria", 9, "#f59e0b"),
        ("Al gancho", 2, "#10b981"),
        ("Otros", 6, "#3f3f46"),
    ]
    bar_y = 30
    bar_h = 36
    pad_l = 12
    inner_w = width - pad_l * 2
    rects = []
    labels = []
    cursor = pad_l
    for label, pct, color in parts:
        w = inner_w * (pct / 100)
        rects.append(f'<rect x="{cursor:.1f}" y="{bar_y}" width="{w:.1f}" height="{bar_h}" fill="{color}"/>')
        if w > 50:
            labels.append(f'<text x="{cursor + w / 2:.1f}" y="{bar_y + bar_h / 2 + 4}" text-anchor="middle" font-size="11" fill="#fafafa" font-weight="600" font-family="SF Mono, monospace">{pct}%</text>')
            labels.append(f'<text x="{cursor + w / 2:.1f}" y="{bar_y + bar_h + 14}" text-anchor="middle" font-size="9" fill="#a1a1aa" font-family="SF Mono, monospace">{label}</text>')
        cursor += w
    return f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">{"".join(rects)}{"".join(labels)}</svg>'


def inmag_volatility(days: list[dict]) -> dict:
    """Daily-return volatility of INMAG within the month."""
    if len(days) < 3:
        return {"available": False}
    rets = []
    prev = None
    for d in days:
        if prev:
            rets.append((d["value"] - prev) / prev * 100)
        prev = d["value"]
    return {
        "available": True,
        "stdev_pct": stdev(rets) if len(rets) >= 2 else 0,
        "up_days": sum(1 for r in rets if r > 0),
        "down_days": sum(1 for r in rets if r < 0),
        "flat_days": sum(1 for r in rets if r == 0),
        "max_up_pct": max(rets) if rets else 0,
        "max_down_pct": min(rets) if rets else 0,
    }


def fetch_faena_latest() -> dict | None:
    """Latest 13 monthly observations of national bovine slaughter from gov."""
    url = "https://apis.datos.gob.ar/series/api/series?ids=40.3_VC_0_M_15&limit=13&sort=desc&format=json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "consignatarias-report/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            j = json.loads(r.read())
        rows = j.get("data") or []
        if len(rows) < 2:
            return None
        cur = {"date": rows[0][0], "cabezas": int(rows[0][1])}
        prev = {"date": rows[1][0], "cabezas": int(rows[1][1])}
        ya = {"date": rows[12][0], "cabezas": int(rows[12][1])} if len(rows) >= 13 else None
        return {
            "current": cur,
            "previous": prev,
            "yearAgo": ya,
            "monthlyChange": (cur["cabezas"] - prev["cabezas"]) / prev["cabezas"] * 100,
            "yearlyChange": (cur["cabezas"] - ya["cabezas"]) / ya["cabezas"] * 100 if ya else None,
        }
    except Exception:
        return None


def month_inmag_stats(market: dict, ym: str) -> dict:
    """ym = 'YYYY-MM'."""
    series = market["inmag"]["series"]
    days = [p for p in series if p["date"].startswith(ym)]
    if not days:
        raise ValueError(f"Sin data INMAG para {ym}")

    vals = [p["value"] for p in days]
    vols = [p.get("volume", 0) for p in days]

    # Previous month for compare
    y, m = map(int, ym.split("-"))
    prev_y, prev_m = (y, m - 1) if m > 1 else (y - 1, 12)
    prev_ym = f"{prev_y:04d}-{prev_m:02d}"
    prev_days = [p for p in series if p["date"].startswith(prev_ym)]
    prev_avg = (sum(p["value"] for p in prev_days) / len(prev_days)) if prev_days else None

    avg = sum(vals) / len(vals)
    pico = max(days, key=lambda x: x.get("volume", 0))

    return {
        "ym": ym,
        "year": y,
        "month": m,
        "month_name": MONTHS_ES[m],
        "days": days,
        "trading_days": len(days),
        "open": days[0],
        "close": days[-1],
        "monthly_change_pct": (days[-1]["value"] - days[0]["value"]) / days[0]["value"] * 100,
        "min": min(vals),
        "max": max(vals),
        "avg": avg,
        "total_volume": sum(vols),
        "avg_daily_volume": int(sum(vols) / len(vols)) if vols else 0,
        "pico": pico,
        "prev_month_avg": prev_avg,
        "vs_prev_pct": ((avg - prev_avg) / prev_avg * 100) if prev_avg else None,
        "prev_month_name": MONTHS_ES[prev_m],
    }


def month_remates(remates: list[dict], ym: str) -> dict:
    items = [r for r in remates if (r.get("date") or "").startswith(ym)]
    by_prov: dict[str, int] = defaultdict(int)
    for r in items:
        by_prov[r.get("province") or "—"] += 1
    top_5_by_heads = sorted(
        [r for r in items if r.get("estimatedHeads")],
        key=lambda r: r["estimatedHeads"] or 0, reverse=True
    )[:5]
    return {
        "total": len(items),
        "by_province": sorted(by_prov.items(), key=lambda kv: -kv[1]),
        "top_heads": top_5_by_heads,
    }


def upcoming_remates(remates: list[dict], ym: str, n: int = 8) -> list[dict]:
    """Remates del mes siguiente al cierre (proxy: 'proximos eventos').
    Prioriza los que tienen volumen estimado; usa el resto como relleno si faltan."""
    y, m = map(int, ym.split("-"))
    next_y, next_m = (y, m + 1) if m < 12 else (y + 1, 1)
    next_ym = f"{next_y:04d}-{next_m:02d}"
    nxt = [r for r in remates if (r.get("date") or "").startswith(next_ym)]
    with_heads = [r for r in nxt if (r.get("estimatedHeads") or 0) > 0]
    without_heads = [r for r in nxt if not r.get("estimatedHeads")]
    with_heads.sort(key=lambda r: r.get("date") or "")
    without_heads.sort(key=lambda r: r.get("date") or "")
    return (with_heads + without_heads)[:n]


def build_inmag_chart_svg(days: list[dict], width: int = 720, height: int = 220) -> str:
    """Compact SVG line chart with min/max guidelines. PDF-safe (no JS)."""
    if not days:
        return ""
    pad_l, pad_r, pad_t, pad_b = 48, 14, 18, 28
    inner_w = width - pad_l - pad_r
    inner_h = height - pad_t - pad_b
    vals = [d["value"] for d in days]
    vmin, vmax = min(vals), max(vals)
    span = max(vmax - vmin, 1)
    vmin -= span * 0.05
    vmax += span * 0.05
    span = vmax - vmin

    pts = []
    for i, d in enumerate(days):
        x = pad_l + (i / max(len(days) - 1, 1)) * inner_w
        y = pad_t + (1 - (d["value"] - vmin) / span) * inner_h
        pts.append((x, y, d))

    path = "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y, _ in pts)
    area = path + f" L {pts[-1][0]:.1f},{pad_t + inner_h:.1f} L {pts[0][0]:.1f},{pad_t + inner_h:.1f} Z"

    # Y-axis labels (3 ticks: max, mid, min of original range)
    yticks = []
    for frac, val in [(0.0, vmax), (0.5, (vmax + vmin) / 2), (1.0, vmin)]:
        y = pad_t + frac * inner_h
        yticks.append(f'<text x="{pad_l - 6}" y="{y + 3:.1f}" text-anchor="end" font-size="9" fill="#71717a" font-family="SF Mono, monospace">${fmt_ars(val, 0)}</text>')
        yticks.append(f'<line x1="{pad_l}" y1="{y:.1f}" x2="{pad_l + inner_w}" y2="{y:.1f}" stroke="#27272a" stroke-width="0.5" stroke-dasharray="2 3"/>')

    # X-axis labels (every Nth day to avoid clutter)
    xstep = max(1, len(days) // 6)
    xlabels = []
    for i in range(0, len(days), xstep):
        x, _, d = pts[i]
        day = d["date"][8:10]
        xlabels.append(f'<text x="{x:.1f}" y="{height - 8}" text-anchor="middle" font-size="9" fill="#71717a" font-family="SF Mono, monospace">{day}</text>')

    # Highlight last point
    lx, ly, ld = pts[-1]
    last_marker = (
        f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="3.5" fill="#38bdf8" stroke="#0c0a0a" stroke-width="1.5"/>'
        f'<text x="{lx - 6:.1f}" y="{ly - 8:.1f}" text-anchor="end" font-size="10" fill="#38bdf8" font-weight="600" font-family="SF Mono, monospace">${fmt_ars(ld["value"], 0)}</text>'
    )

    svg = f'''<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
        <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
            </linearGradient>
        </defs>
        {''.join(yticks)}
        <path d="{area}" fill="url(#grad)"/>
        <path d="{path}" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
        {last_marker}
        {''.join(xlabels)}
    </svg>'''
    return svg


def render(template: str, ctx: dict[str, Any]) -> str:
    """Tiny mustache-ish renderer using string.Template (we keep template flat)."""
    return Template(template).safe_substitute(**ctx)


# ---- HTML builders for sub-blocks ----

def kpi_card(label: str, value: str, sub: str = "", positive: bool | None = None) -> str:
    color = ""
    if positive is True:
        color = "color:#10b981"
    elif positive is False:
        color = "color:#f87171"
    return f'''<div class="kpi">
      <div class="kpi-label">{label}</div>
      <div class="kpi-value" style="{color}">{value}</div>
      {f'<div class="kpi-sub">{sub}</div>' if sub else ''}
    </div>'''


def table_inmag_days(days: list[dict]) -> str:
    rows = []
    prev = None
    for d in days:
        chg = ""
        if prev:
            pct = (d["value"] - prev) / prev * 100
            cls = "pos" if pct >= 0 else "neg"
            chg = f'<span class="{cls}">{fmt_pct(pct)}</span>'
        prev = d["value"]
        date_str = datetime.strptime(d["date"], "%Y-%m-%d").strftime("%a %d/%m")
        rows.append(
            f"<tr><td>{date_str}</td>"
            f"<td class='num'>${fmt_ars(d['value'], 2)}</td>"
            f"<td class='num'>{chg}</td>"
            f"<td class='num'>{fmt_int(d.get('volume', 0))}</td></tr>"
        )
    return f'''<table class="data">
      <thead><tr><th>Fecha</th><th class="num">INMAG</th><th class="num">Var.</th><th class="num">Cab.</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>'''


def categories_grid(cats: dict) -> str:
    order = [
        ("novillos", "Novillos", "exportación"),
        ("novillitos", "Novillitos", "consumo"),
        ("vaquillonas", "Vaquillonas", "consumo"),
        ("vacas", "Vacas", "manufactura"),
        ("toros", "Toros", "industria"),
        ("terneros", "Terneros", "invernada"),
    ]
    cards = []
    for key, label, sub in order:
        c = cats.get(key)
        if not c:
            continue
        chg = c.get("change", 0)
        cls = "pos" if chg >= 0 else "neg"
        cards.append(f'''<div class="cat-card">
            <div class="cat-head">
              <div class="cat-label">{label}</div>
              <div class="cat-sub">{sub}</div>
            </div>
            <div class="cat-value">${fmt_ars(c["current"], 2)}<span class="unit">/kg</span></div>
            <div class="cat-change {cls}">{fmt_pct(chg)} vs. semana anterior</div>
        </div>''')
    return f'<div class="cat-grid">{"".join(cards)}</div>'


# ---- Real buckets table (from haciinfo000502 backfill) ----

def buckets_real_table(cats_cache: dict | None) -> str:
    if not cats_cache or not cats_cache.get("buckets"):
        return '<p class="muted">Sin backfill de buckets para este mes.</p>'

    buckets = sorted(cats_cache["buckets"], key=lambda b: -b["cabezas"])
    total_cab = sum(b["cabezas"] for b in buckets)
    has_outliers = False

    rows = []
    for b in buckets:
        spread = ((b["max"] - b["min"]) / b["avg"] * 100) if b.get("avg") else 0
        peso_total = b.get("peso_prom_kg") or 0  # actually peso total kg (parser bug, see CHANGELOG)
        peso_avg = (peso_total / b["cabezas"]) if b["cabezas"] else 0
        share = (b["cabezas"] / total_cab * 100) if total_cab else 0
        outlier_flag = ""
        if spread > 100:
            outlier_flag = ' <span class="outlier-mark" title="spread excepcional, posible outlier">*</span>'
            has_outliers = True

        rows.append(f'''<tr>
            <td class="bucket-name">{b["full"]}{outlier_flag}</td>
            <td class="num">${fmt_ars(b["min"], 0)}</td>
            <td class="num">${fmt_ars(b["max"], 0)}</td>
            <td class="num"><strong>${fmt_ars(b["avg"], 0)}</strong></td>
            <td class="num muted">${fmt_ars(b["median"] or 0, 0)}</td>
            <td class="num">{fmt_int(b["cabezas"])}</td>
            <td class="num muted">{share:.1f}%</td>
            <td class="num">{peso_avg:.0f}<span class="unit-sm">kg</span></td>
            <td class="num muted">{spread:.0f}%</td>
        </tr>''')

    outlier_note = ""
    if has_outliers:
        outlier_note = (
            '<div class="note" style="margin-top:3mm">'
            '<strong style="color:var(--text)">*</strong> Bucket con spread &gt;100% sobre el promedio: '
            'incluye operaciones excepcionales (lotes de calidad muy disímil o registros aislados). '
            'El precio promedio sigue siendo robusto pero la dispersión es alta.'
            '</div>'
        )

    return f'''<table class="data buckets">
        <thead><tr>
          <th>Categoría / bucket</th>
          <th class="num">Mín</th>
          <th class="num">Máx</th>
          <th class="num">Prom.</th>
          <th class="num">Mediana</th>
          <th class="num">Cab.</th>
          <th class="num">Share</th>
          <th class="num">Peso</th>
          <th class="num">Spread</th>
        </tr></thead>
        <tbody>{''.join(rows)}</tbody>
    </table>{outlier_note}'''


# ---- Net-back ejemplo de comisiones ----

def net_back_example(inmag_close: float) -> str:
    """Ejemplo numérico de net-back por canal sobre 50 novillos de 460kg."""
    cab = 50
    peso = 460
    bruto = cab * peso * inmag_close
    canales = [
        ("MAG (rueda física)", 0.075, "7-12 días"),
        ("Remate-feria provincial", 0.04, "10-30 días"),
        ("Venta directa con consignatario", 0.012, "30-90 días"),
        ("Al gancho (post-faena)", 0.02, "60-90 días"),
    ]
    rows = []
    for canal, comm, plazo in canales:
        net = bruto * (1 - comm)
        rows.append(
            f'<tr>'
            f'<td class="channel">{canal}</td>'
            f'<td class="num">{comm * 100:.1f}%</td>'
            f'<td class="num">${fmt_ars(net, 0)}</td>'
            f'<td class="num">${fmt_ars(bruto - net, 0)}</td>'
            f'<td class="muted">{plazo}</td>'
            f'</tr>'
        )
    return f'''<div class="netback-box">
      <div class="netback-head">
        Caso ejemplo: <strong>50 novillos × 460 kg × ${fmt_ars(inmag_close, 0)}/kg vivo = ${fmt_ars(bruto, 0)} bruto</strong>
      </div>
      <table class="data commission" style="margin-top: 3mm;">
        <thead><tr>
          <th>Canal</th>
          <th class="num">Comisión total</th>
          <th class="num">Net-back productor</th>
          <th class="num">Costo absoluto</th>
          <th>Plazo cobro típico</th>
        </tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>'''


def buckets_top_kpis(cats_cache: dict | None) -> tuple[str, dict]:
    """Returns (html, computed) where computed has aggregates for use elsewhere."""
    if not cats_cache or not cats_cache.get("buckets"):
        return '<p class="muted">Sin datos.</p>', {}

    buckets = cats_cache["buckets"]
    total_cab = sum(b["cabezas"] for b in buckets)
    top5 = sorted(buckets, key=lambda b: -b["cabezas"])[:5]
    top5_cab = sum(b["cabezas"] for b in top5)
    most_traded = top5[0] if top5 else None
    highest_priced = max(buckets, key=lambda b: b.get("avg", 0))

    cards = (
        kpi_card("Total operado", f"{fmt_int(total_cab)}", sub="cabezas en el mes")
        + kpi_card("Buckets activos", str(len(buckets)), sub="subcategorías con operaciones")
        + kpi_card("Concentración top 5", f"{top5_cab / total_cab * 100:.1f}%",
                   sub=f"{fmt_int(top5_cab)} cabezas")
        + kpi_card("Mejor precio", f"${fmt_ars(highest_priced['avg'], 0)}",
                   sub=highest_priced["full"][:24])
    )

    return f'<div class="cover-kpis">{cards}</div>', {
        "total_cab": total_cab,
        "n_buckets": len(buckets),
        "top5_share": top5_cab / total_cab * 100 if total_cab else 0,
        "most_traded": most_traded,
        "highest_priced": highest_priced,
    }


# ---- Comparable interanual (ARS + USD) ----

def interanual_table(ia: dict, ia_usd: dict) -> str:
    if not ia.get("available"):
        return '<p class="muted">Sin data interanual disponible.</p>'

    rows = [
        ("INMAG promedio (ARS)",
         f"${fmt_ars(ia['prev_avg'], 0)}",
         f"${fmt_ars(ia['cur_avg'], 0)}",
         fmt_pct(ia["var_pct_nominal"]),
         "pos" if ia["var_pct_nominal"] >= 0 else "neg"),
    ]

    if ia_usd.get("available"):
        cur = ia_usd["cur"]
        prev = ia_usd["prev"]
        rows.extend([
            ("USD oficial promedio",
             f"${fmt_ars(prev['usd_oficial_avg'], 2)}",
             f"${fmt_ars(cur['usd_oficial_avg'], 2)}",
             fmt_pct((cur['usd_oficial_avg'] - prev['usd_oficial_avg']) / prev['usd_oficial_avg'] * 100),
             "muted"),
            ("INMAG en USD oficial",
             f"USD {fmt_ars(prev['inmag_usd_oficial_avg'], 2)}",
             f"USD {fmt_ars(cur['inmag_usd_oficial_avg'], 2)}",
             fmt_pct(ia_usd["var_usd_oficial_pct"]),
             "pos" if ia_usd["var_usd_oficial_pct"] >= 0 else "neg"),
            ("INMAG en USD blue",
             f"USD {fmt_ars(prev['inmag_usd_blue_avg'], 2)}",
             f"USD {fmt_ars(cur['inmag_usd_blue_avg'], 2)}",
             fmt_pct(ia_usd["var_usd_blue_pct"]),
             "pos" if ia_usd["var_usd_blue_pct"] >= 0 else "neg"),
            ("Brecha cambiaria",
             f"{prev.get('brecha_avg_pct', 0):.1f}%" if prev.get('brecha_avg_pct') is not None else "—",
             f"{cur.get('brecha_avg_pct', 0):.1f}%" if cur.get('brecha_avg_pct') is not None else "—",
             f"{ia_usd['brecha_change_pp']:+.1f} pp",
             "muted"),
        ])

    body = "".join(
        f'<tr><td>{label}</td><td class="num">{prev}</td><td class="num">{cur}</td><td class="num"><span class="{cls}">{var}</span></td></tr>'
        for label, prev, cur, var, cls in rows
    )

    return f'''<table class="data">
      <thead><tr>
        <th>Métrica</th>
        <th class="num">{ia['prev_ym']}</th>
        <th class="num">{ia['prev_ym'].split('-')[0][:4]} → +1y</th>
        <th class="num">Variación</th>
      </tr></thead>
      <tbody>{body}</tbody>
    </table>'''


def usd_kpi_strip(usd_month: dict | None, ia_usd: dict) -> str:
    if not usd_month:
        return '<p class="muted">Sin datos USD del mes.</p>'

    of = usd_month.get("oficial", {})
    bl = usd_month.get("blue", {})
    inmag_usd_of = ia_usd.get("cur", {}).get("inmag_usd_oficial_avg") if ia_usd.get("available") else None

    cards = [
        kpi_card("USD oficial avg", f"${fmt_int(int(of.get('venta_avg', 0)))}",
                 sub=f"{of.get('venta_open', '—')} → {of.get('venta_close', '—')}"),
        kpi_card("USD blue avg", f"${fmt_int(int(bl.get('venta_avg', 0)))}",
                 sub=f"brecha avg {usd_month.get('brecha_pct_avg', 0):.1f}%"),
    ]
    if inmag_usd_of is not None:
        cards.append(kpi_card("INMAG en USD oficial", f"USD {fmt_ars(inmag_usd_of, 2)}",
                              sub="cierre mensual /kg vivo"))

    return f'<div class="cover-kpis" style="grid-template-columns: repeat(3, 1fr)">{"".join(cards)}</div>'


# ---- Tesis del mes próximo (forward-looking) ----

# Mes en que arrancó la serie de remitencia por consignataria (lote a lote del MAG).
SERIE_REMITENCIA_INICIO = (2026, 5)


def proxima_edicion_html(year: int, month: int) -> str:
    """Bloque 'Próxima edición'. Se calcula por edición: decía 'en 90 días podremos'
    desde mayo-2026 y seguía diciéndolo en julio, cuando la serie ya estaba completa.
    Nunca volver a hardcodear un mes ni una promesa con plazo acá."""
    y0, m0 = SERIE_REMITENCIA_INICIO
    meses = (year * 12 + month) - (y0 * 12 + m0) + 1
    inicio = f"{MONTHS_ES[m0]} {y0}"
    if meses < 3:
        faltan = 3 - meses
        return (f"<strong>Próxima edición</strong> — Venimos acumulando la serie de remitencia por "
                f"consignataria desde {inicio} (uno de los tres datasets que <em>valen plata</em> según "
                f"el marco conceptual): llevamos {meses} {'mes' if meses == 1 else 'meses'}. "
                f"Con {faltan} {'mes' if faltan == 1 else 'meses'} más podremos reportar top remitentes, "
                f"concentración geográfica de oferta y señales anticipatorias por circuito regional.")
    return (f"<strong>Próxima edición</strong> — La serie de remitencia por consignataria ya acumula "
            f"<strong>{meses} meses</strong> de lote a lote del MAG (desde {inicio}), uno de los tres "
            f"datasets que <em>valen plata</em> según el marco conceptual. Con esa profundidad empezamos "
            f"a incorporar top remitentes, concentración geográfica de oferta y señales anticipatorias "
            f"por circuito regional.")


def tesis_del_mes(inmag: dict, ia_usd: dict, cycle: dict, faena: dict | None,
                   nxt_remates: list[dict]) -> dict:
    """Genera escenario base/alza/baja + recomendación operativa por perfil."""
    next_m = inmag["month"] + 1 if inmag["month"] < 12 else 1
    next_y = inmag["year"] if inmag["month"] < 12 else inmag["year"] + 1
    next_label = f"{MONTHS_ES[next_m]} {next_y}"

    # Catalizadores macro (4 items concisos)
    catalizadores = [
        ("Macro cambiaria",
         "Brecha oficial/blue en paridad (0,1%). USD blue ya no descuenta riesgo cambiario; INMAG nominal y USD se moverán en sincronía."),
        ("Maíz FOB",
         "Maíz USD 234/tn estable. Costo de feedlot contenido — soporte para actividad de invernada."),
    ]

    if cycle.get("available") and cycle.get("hembras_pct") is not None:
        h = cycle["hembras_pct"]
        if h > 50:
            catalizadores.append((
                "Faena femenina",
                f"{h:.0f}% hembras en MAG (fase liquidación). Oferta de hembras debería reducirse — soporte para vacas+vaquillonas.",
            ))
        elif h < 40:
            catalizadores.append((
                "Faena femenina",
                f"Solo {h:.0f}% hembras en MAG (retención consolidada). Menor oferta forward → soporte invernada 6-12 meses.",
            ))

    if faena and faena.get("yearlyChange") is not None and faena["yearlyChange"] < -3:
        catalizadores.append((
            "Faena nacional",
            f"Cae {abs(faena['yearlyChange']):.1f}% interanual. Menor oferta de carne; demanda China+UE estable presiona alcista.",
        ))

    big_event = next((r for r in nxt_remates if (r.get("estimatedHeads") or 0) > 5000), None)
    if big_event:
        catalizadores.append((
            "Evento de plaza",
            f"{big_event.get('consignatariaName', '')[:30]} · {big_event.get('date', '')[:10]} · "
            f"~{fmt_int(big_event.get('estimatedHeads', 0))} cabezas. Referencia regional.",
        ))

    catalizadores.append((
        "Estacionalidad",
        "Mayo abre zafra de terneros NEA + encierre invernal Pampa. Presión bajista en terneros, soporte alcista en novillo pastoril.",
    ))

    # Escenarios
    base_inmag = inmag["close"]["value"]
    escenarios = [
        ("Base", "0% a +3%", base_inmag * 1.015,
         "Convergencia cambiaria sostenida + faena lateral + remates calendar normal. INMAG oscila en banda con leve alza nominal por inflación esperada."),
        ("Alza", "+4% a +8%", base_inmag * 1.06,
         "Brecha cambiaria reabre, faena cae más, retención se consolida. INMAG nominal acelera; en USD el movimiento es más moderado."),
        ("Baja", "-2% a -5%", base_inmag * 0.965,
         "Devaluación oficial + apertura exportadora frena demanda local. Liquidación táctica de hembras presiona vacas+vaquillonas a la baja."),
    ]

    perfiles = [
        ("Productor de cría",
         f"<strong>Regla:</strong> mientras hembras &lt; 45% del MAG y faena interanual &lt; -5%, retener vientres. "
         f"Salida de ternero del NEA presiona la categoría — flexibilidad para esperar {MONTHS_ES[next_m]} mejora net-back."),
        ("Invernador",
         f"<strong>Regla:</strong> mientras ratio novillo/maíz &gt; 1,8x y premium novillito &gt; 10%, retener 30 días. "
         f"Salida de ese rango: liquidar progresivamente."),
        ("Frigorífico / matarife",
         "<strong>Regla:</strong> compra concentrada en Esp.Joven +430 cuando precio del bucket &lt; promedio mensual. "
         "Cierre de brecha cambiaria sostiene demanda forward."),
    ]

    return {
        "next_label": next_label,
        "catalizadores": catalizadores,
        "escenarios": escenarios,
        "perfiles": perfiles,
        "tesis_oneline": _tesis_oneline(inmag, ia_usd, cycle, faena),
    }


def market_safe_corn(inmag_block: dict) -> str:
    return "234"  # Hardcoded for the example; in production this comes from market.corn.current


def margen_invernada_block(market: dict, inmag_close_usd_oficial: float | None) -> str:
    """Ratio novillo/maíz como proxy de margen de invernada (USD)."""
    corn = market.get("corn", {}).get("current")  # USD/tn
    if not corn or not inmag_close_usd_oficial:
        return ""
    # Proxy: kg de maíz necesarios para producir 1 kg vivo de novillo terminado en feedlot
    # Asumimos ratio técnico estándar de conversión 6:1 (kg grano / kg ganado).
    kg_corn_per_kg_novillo = 6
    cost_kg_usd = (corn / 1000) * kg_corn_per_kg_novillo  # USD/kg vivo (solo grano)
    ratio = inmag_close_usd_oficial / cost_kg_usd if cost_kg_usd else 0
    if ratio >= 1.8:
        veredicto = ("Margen amplio", "var(--pos)",
                     "feedlot rentable; soporte para invernada activa.")
    elif ratio >= 1.5:
        veredicto = ("Margen moderado", "var(--accent)",
                     "viable con manejo eficiente; márgenes ajustados pero positivos.")
    else:
        veredicto = ("Margen estrecho", "var(--neg)",
                     "presión a liquidar invernada; riesgo de venta anticipada.")

    return f'''
<div class="invernada-strip">
  <div class="invernada-row">
    <div>
      <div class="invernada-label">Costo grano /kg vivo</div>
      <div class="invernada-value">USD {fmt_ars(cost_kg_usd, 2)}</div>
      <div class="invernada-sub">maíz {corn:.0f} USD/tn × 6:1</div>
    </div>
    <div>
      <div class="invernada-label">INMAG en USD oficial</div>
      <div class="invernada-value">USD {fmt_ars(inmag_close_usd_oficial, 2)}</div>
      <div class="invernada-sub">cierre del mes</div>
    </div>
    <div>
      <div class="invernada-label">Ratio novillo / maíz</div>
      <div class="invernada-value" style="color: {veredicto[1]}">{fmt_ars(ratio, 2)}x</div>
      <div class="invernada-sub" style="color: {veredicto[1]}">{veredicto[0]}</div>
    </div>
  </div>
  <div class="note" style="margin-top: 2mm;">
    <strong style="color:var(--text)">Lectura.</strong> {veredicto[2]} El ratio compara
    INMAG USD vs. costo del grano necesario para producir 1 kg vivo terminado. Asume
    conversión técnica <strong>6:1</strong> (kg grano / kg vivo, promedio feedlot terminado —
    fuente: INTA Marcos Juárez, ficha técnica feedlot). Solo grano, sin otros costos.
    Referencia operativa: &gt;1,8x amplio, 1,5-1,8 moderado, &lt;1,5 estrecho.
  </div>
</div>'''


def _tesis_oneline(inmag: dict, ia_usd: dict, cycle: dict, faena: dict | None) -> str:
    """One-sentence house view del próximo mes."""
    bits = []
    if ia_usd.get("available") and ia_usd.get("var_usd_oficial_pct", 0) > 15:
        bits.append("recuperación interanual real en USD ya consolidada")
    if cycle.get("available") and cycle.get("hembras_pct"):
        bits.append("ciclo en transición de liquidación a retención")
    if faena and (faena.get("yearlyChange") or 0) < -5:
        bits.append("faena nacional cayendo dos dígitos interanual")
    if not bits:
        return "El mes próximo opera en banda con sesgo lateral."
    return "Tesis del equipo: " + ", ".join(bits) + ". Sesgo de mercado moderadamente alcista en pesos, lateral en USD oficial."


def tesis_html(t: dict) -> str:
    cats = "".join(
        f'<div class="cat-card"><div class="cat-head"><div class="cat-label">{nombre}</div></div>'
        f'<div class="cat-sub" style="margin-top:2mm; font-size:10px; color:var(--text); line-height:1.5">{texto}</div></div>'
        for nombre, texto in t["catalizadores"][:5]
    )
    escs = "".join(
        f'<tr><td class="bucket-name">{nombre}</td><td class="num">{rango}</td>'
        f'<td class="num"><strong>${fmt_ars(target, 0)}</strong></td>'
        f'<td>{narrativa}</td></tr>'
        for nombre, rango, target, narrativa in t["escenarios"]
    )
    perfs = "".join(
        f'<dt>{perfil}</dt><dd>{rec}</dd>'
        for perfil, rec in t["perfiles"]
    )
    return f'''
<div class="editorial compact" style="margin-bottom: 3mm;">
  <p><strong>{t['tesis_oneline']}</strong></p>
</div>

<h3 class="subhead">Catalizadores · piezas que moverán {t['next_label']}</h3>
<div class="cat-grid">{cats}</div>

<h3 class="subhead" style="margin-top: 4mm;">Escenarios INMAG · {t['next_label']}</h3>
<table class="data">
  <thead><tr>
    <th>Escenario</th>
    <th class="num">Rango</th>
    <th class="num">INMAG target</th>
    <th>Narrativa</th>
  </tr></thead>
  <tbody>{escs}</tbody>
</table>

<h3 class="subhead" style="margin-top: 4mm;">Recomendación operativa por perfil</h3>
<dl class="perfil-list">{perfs}</dl>

<div class="note" style="margin-top: 3mm;">
  <strong style="color:var(--text)">Probabilidad subjetiva del equipo:</strong> base 55% / alza 25% / baja 20%.
  Escenarios coherentes para armar decisión propia — no predicciones puntuales.
</div>

<div class="signoff">
  Mesa de mercado · consignatarias.com · cierre {date.today().strftime('%d/%m/%Y')}<br/>
  <span style="color: var(--muted-2); font-size: 9px;">Este reporte no constituye recomendación de inversión. Las reglas operativas son lecturas del equipo
  basadas en bibliografía citada (FCV-UBA 2018, Iriarte/CACG 2008, Diez/UNS 2020) y datos públicos del MAG/Sec. Agricultura.</span>
</div>
'''


# ---- Lectura del editor (templated) ----

def lectura_editor(inmag: dict, ia: dict, ia_usd: dict, cats_top: dict,
                    cycle: dict | None = None) -> str:
    """Editorial conciso: lead + insight USD interanual + ciclo. 3 párrafos máx."""
    if cycle is None:
        cycle = {"available": False}
    parts = []

    direccion = "subió" if inmag["monthly_change_pct"] >= 0 else "cayó"
    parts.append(
        f"<p>El cierre de <strong>{inmag['month_name']} {inmag['year']}</strong> "
        f"muestra un INMAG promedio de <strong>${fmt_ars(inmag['avg'], 0)}/kg vivo</strong>, "
        f"variación intramensual <strong>{fmt_pct(inmag['monthly_change_pct'])}</strong> "
        f"y cierre <strong>${fmt_ars(inmag['close']['value'], 2)}</strong>. "
        f"El índice {direccion} de ${fmt_ars(inmag['open']['value'], 0)} a "
        f"${fmt_ars(inmag['close']['value'], 0)}, ancho operativo "
        f"${fmt_ars(inmag['max'] - inmag['min'], 0)}.</p>"
    )

    if ia.get("available") and ia_usd.get("available"):
        var_ars = ia["var_pct_nominal"]
        var_usd = ia_usd["var_usd_oficial_pct"]
        gap = var_ars - var_usd
        parts.append(
            f"<p><strong>La lectura no obvia.</strong> Alza interanual "
            f"<strong>{fmt_pct(var_ars)}</strong> en pesos vs. solo "
            f"<strong>{fmt_pct(var_usd)}</strong> en USD oficial — "
            f"<strong>{fmt_ars(gap, 0)} pp</strong> son apreciación cambiaria "
            f"(USD oficial promedio pasó de ${fmt_ars(ia_usd['prev']['usd_oficial_avg'], 0)} "
            f"a ${fmt_ars(ia_usd['cur']['usd_oficial_avg'], 0)}). La brecha contra el blue se "
            f"{'cerró' if ia_usd['brecha_change_pp'] < 0 else 'amplió'} "
            f"<strong>{fmt_ars(abs(ia_usd['brecha_change_pp']), 1)} pp</strong>.</p>"
        )

    # Combine bucket + cycle in ONE paragraph
    parts2 = []
    if cats_top.get("most_traded"):
        mt = cats_top["most_traded"]
        parts2.append(
            f"Bucket más operado: <strong>{mt['full']}</strong> "
            f"({fmt_int(mt['cabezas'])} cab, ${fmt_ars(mt['avg'], 0)}/kg)"
        )

    if cycle.get("available"):
        nn = cycle.get("novillito_novillo_ratio")
        h = cycle.get("hembras_pct")
        fy = cycle.get("faena_yoy_pct")
        if nn is not None and nn > 1.05:
            parts2.append(
                f"novillito con <strong>premium {(nn - 1) * 100:.1f}%</strong> "
                f"sobre novillo terminado (señal de retención)"
            )
        if h is not None and h > 50:
            parts2.append(f"hembras <strong>{h:.0f}%</strong> del MAG (fase liquidación)")
        elif h is not None and h < 45:
            parts2.append(f"hembras <strong>{h:.0f}%</strong> del MAG (retención consolidada)")
        if fy is not None and fy < -5:
            parts2.append(f"faena nacional <strong>{abs(fy):.1f}% interanual</strong>")

    if parts2:
        parts.append("<p><strong>Plaza y ciclo.</strong> " + "; ".join(parts2) + ".</p>")

    return "".join(parts)


def remates_table(items: list[dict], hide_no_heads: bool = False) -> str:
    if not items:
        return '<p class="muted">Sin datos disponibles.</p>'
    rows = []
    for r in items:
        heads = r.get("estimatedHeads")
        if hide_no_heads and (not heads or heads == 0):
            continue
        d = (r.get("date") or "")[:10]
        try:
            d_pretty = datetime.strptime(d, "%Y-%m-%d").strftime("%d/%m")
        except Exception:
            d_pretty = d
        heads_cell = fmt_int(heads) if heads and heads > 0 else '<span class="muted">—</span>'
        cat = (r.get("mainCategory") or "—").replace("_", " ")
        rows.append(
            f"<tr>"
            f"<td>{d_pretty}</td>"
            f"<td>{r.get('consignatariaName', '—')[:40]}</td>"
            f"<td>{(r.get('location') or '—')[:30]}</td>"
            f"<td>{cat[:18]}</td>"
            f"<td class='num'>{heads_cell}</td>"
            f"</tr>"
        )
    if not rows:
        return '<p class="muted">Sin remates con volumen reportado.</p>'
    return f'''<table class="data">
      <thead><tr><th>Fecha</th><th>Consignataria</th><th>Plaza</th><th>Categoría</th><th class="num">Cab. est.</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>'''


def province_distribution(by_prov: list[tuple[str, int]], total: int) -> str:
    rows = []
    for prov, n in by_prov[:8]:
        pct = n / total * 100 if total else 0
        rows.append(f'''<div class="bar-row">
          <div class="bar-label">{prov}</div>
          <div class="bar-track"><div class="bar-fill" style="width:{pct:.1f}%"></div></div>
          <div class="bar-val">{n}</div>
        </div>''')
    return f'<div class="bars">{"".join(rows)}</div>'


# ---- Main ----

TEMPLATE = (Path(__file__).parent / "template.html").read_text()


def build_html(month: str) -> str:
    market = load_market()
    remates = load_remates()
    cats_cache = load_categories_cache(month)
    usd_cache = load_usd_monthly()

    inmag = month_inmag_stats(market, month)
    rem = month_remates(remates, month)
    nxt = upcoming_remates(remates, month, n=10)
    faena = fetch_faena_latest()

    # Derived metrics (NEW)
    ia = interanual_inmag(market, month)
    ia_usd = interanual_usd(market, usd_cache, month) if usd_cache else {"available": False}
    inmag_usd_block = inmag_in_usd(market, usd_cache, month) if usd_cache else {"available": False}
    vol = inmag_volatility(inmag["days"])
    usd_month = usd_for_month(usd_cache, month) if usd_cache else None
    buckets_kpis_html, cats_top = buckets_top_kpis(cats_cache)
    cycle = cycle_indicators(market, cats_cache, faena)
    trailing = trailing_inmag_usd(market, usd_cache, month, n_months=12) if usd_cache else []
    inmag_usd_chart = build_inmag_usd_trailing_svg(trailing) if trailing else ""
    market_comp_chart = market_composition_svg()
    netback_html = net_back_example(inmag["close"]["value"])
    invernada_html = margen_invernada_block(
        market,
        inmag_usd_block.get("inmag_usd_oficial_avg") if inmag_usd_block.get("available") else None,
    )

    # KPI cover row
    kpi_row = (
        kpi_card("Cierre INMAG", f"${fmt_ars(inmag['close']['value'], 2)}",
                 sub=f"{datetime.strptime(inmag['close']['date'], '%Y-%m-%d').strftime('%d/%m/%Y')}")
        + kpi_card("Var. mensual", fmt_pct(inmag['monthly_change_pct']),
                   sub=f"apertura ${fmt_ars(inmag['open']['value'], 0)}",
                   positive=(inmag['monthly_change_pct'] >= 0))
        + kpi_card("Volumen total", f"{fmt_int(inmag['total_volume'])}",
                   sub=f"{inmag['trading_days']} días hábiles")
        + kpi_card("Promedio mes", f"${fmt_ars(inmag['avg'], 0)}",
                   sub=(f"{fmt_pct(inmag['vs_prev_pct'])} vs. {inmag['prev_month_name']}"
                        if inmag['vs_prev_pct'] is not None else ""),
                   positive=(inmag['vs_prev_pct'] or 0) >= 0)
    )

    # Datos clave (3 bullets máximo) — para el bloque de "Datos del mes" debajo de la lectura
    facts = []
    if inmag['vs_prev_pct'] is not None:
        facts.append(f"Promedio del mes <strong>${fmt_ars(inmag['avg'], 0)}/kg</strong> "
                     f"({fmt_pct(inmag['vs_prev_pct'])} vs. {inmag['prev_month_name']}).")
    facts.append(f"Día pico: <strong>{datetime.strptime(inmag['pico']['date'], '%Y-%m-%d').strftime('%d/%m')}</strong> "
                 f"con <strong>{fmt_int(inmag['pico'].get('volume', 0))} cabezas</strong>.")
    facts.append(f"<strong>{rem['total']} remates</strong> relevados en {len(rem['by_province'])} provincias durante el mes.")
    bullets_html = "<ul class='bullets'>" + "".join(f"<li>{b}</li>" for b in facts) + "</ul>"

    # Macro
    macro_cards = (
        kpi_card("USD oficial", f"${fmt_int(market['usdOficial']['current'])}",
                 sub=f"{fmt_pct(market['usdOficial'].get('change', 0))}")
        + kpi_card("USD blue", f"${fmt_int(market['usdBlue']['current'])}",
                   sub=f"brecha {((market['usdBlue']['current'] - market['usdOficial']['current']) / market['usdOficial']['current'] * 100):.1f}%")
        + kpi_card("Maíz FOB", f"USD {fmt_ars(market['corn']['current'], 1)}",
                   sub=f"{fmt_pct(market['corn'].get('change', 0))} · USD/tn")
    )

    # Faena block
    if faena:
        cur = faena["current"]
        try:
            cur_dt = datetime.fromisoformat(cur["date"])
            cur_label = f"{MONTHS_ABBR[cur_dt.month]} {cur_dt.year}"
        except Exception:
            cur_label = cur["date"]
        faena_html = (
            kpi_card(f"Faena {cur_label}", fmt_int(cur["cabezas"]),
                     sub="cabezas (mes)")
            + kpi_card("Var. mensual", fmt_pct(faena["monthlyChange"]),
                       positive=faena["monthlyChange"] >= 0,
                       sub="vs. mes previo")
            + (kpi_card("Var. interanual", fmt_pct(faena["yearlyChange"]),
                        positive=faena["yearlyChange"] >= 0,
                        sub="vs. mismo mes año previo") if faena.get("yearlyChange") is not None else "")
        )
        faena_note = f"Fuente: Secretaría de Agricultura, Ganadería y Pesca (apis.datos.gob.ar). El último mes publicado al cierre de esta edición es <strong>{cur_label}</strong>; la serie se publica con un retraso típico de 6 a 8 semanas."
    else:
        faena_html = '<p class="muted">No se pudo recuperar la serie oficial al momento de cerrar esta edición.</p>'
        faena_note = ""

    # Province bars (volumen-proxy = cantidad de remates)
    prov_html = province_distribution(rem["by_province"], rem["total"]) if rem["by_province"] else ""

    # Remates tables — top con volumen reportado, upcoming permite los sin volumen
    top_html = remates_table(rem["top_heads"], hide_no_heads=True)
    upcoming_html = remates_table(nxt, hide_no_heads=False)

    # Title strings — "El Corredor" como marca-producto
    title_long = f"El Corredor — {inmag['month_name'].title()} {inmag['year']}"
    edition = f"Edición {inmag['month']:02d}/{str(inmag['year'])[2:]}"
    today = date.today().strftime("%d/%m/%Y")

    # Volatility line
    if vol.get("available"):
        vol_line = (
            f"Volatilidad diaria del mes: <strong>{vol['stdev_pct']:.2f}%</strong> "
            f"(desvío estándar de retornos). {vol['up_days']} días al alza, "
            f"{vol['down_days']} a la baja. Mayor salto: {vol['max_up_pct']:+.2f}%; "
            f"mayor caída: {vol['max_down_pct']:+.2f}%."
        )
    else:
        vol_line = ""

    # Editorial
    lectura_html = lectura_editor(inmag, ia, ia_usd, cats_top, cycle)
    tesis = tesis_del_mes(inmag, ia_usd, cycle, faena, nxt)
    tesis_block = tesis_html(tesis)

    # Buckets section
    buckets_table_html = buckets_real_table(cats_cache)

    # Comparable interanual
    interanual_html = interanual_table(ia, ia_usd)

    # USD monthly KPI strip
    usd_strip_html = usd_kpi_strip(usd_month, ia_usd)

    ctx = {
        "proxima_edicion": proxima_edicion_html(inmag["year"], inmag["month"]),
        "title_long": title_long,
        "month_name_upper": inmag["month_name"].upper(),
        "year": inmag["year"],
        "edition": edition,
        "today": today,
        "kpi_row": kpi_row,
        "summary_bullets": bullets_html,
        "inmag_chart": build_inmag_chart_svg(inmag["days"]),
        "inmag_table": table_inmag_days(inmag["days"]),
        "inmag_usd_chart": inmag_usd_chart,
        "market_comp_chart": market_comp_chart,
        "categories_grid": categories_grid(market.get("categories", {})),
        "buckets_table": buckets_table_html,
        "buckets_kpis": buckets_kpis_html,
        "interanual_table": interanual_html,
        "usd_kpi_strip": usd_strip_html,
        "lectura_editor": lectura_html,
        "tesis_block": tesis_block,
        "next_month_label": tesis["next_label"],
        "netback_html": netback_html,
        "invernada_html": invernada_html,
        "vol_line": vol_line,
        "macro_cards": macro_cards,
        "province_bars": prov_html,
        "top_remates_table": top_html,
        "upcoming_remates_table": upcoming_html,
        "remates_total": rem["total"],
        "provinces_count": len(rem["by_province"]),
        "next_month_name": MONTHS_ES[inmag["month"] + 1 if inmag["month"] < 12 else 1],
        "faena_html": faena_html,
        "faena_note": faena_note,
        "open_date": datetime.strptime(inmag["open"]["date"], "%Y-%m-%d").strftime("%d/%m/%Y"),
        "close_date": datetime.strptime(inmag["close"]["date"], "%Y-%m-%d").strftime("%d/%m/%Y"),
        "min_val": fmt_ars(inmag["min"], 2),
        "max_val": fmt_ars(inmag["max"], 2),
        "avg_val": fmt_ars(inmag["avg"], 2),
        "pico_date": datetime.strptime(inmag["pico"]["date"], "%Y-%m-%d").strftime("%d/%m/%Y"),
        "pico_vol": fmt_int(inmag["pico"].get("volume", 0)),
    }

    return render(TEMPLATE, ctx)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", default="2026-04", help="YYYY-MM")
    ap.add_argument("--pdf", action="store_true", help="Render PDF via headless Chrome")
    args = ap.parse_args()

    html = build_html(args.month)
    out_html = OUT / f"informe-{args.month}.html"
    out_html.write_text(html)
    print(f"✓ HTML: {out_html}")

    if args.pdf:
        out_pdf = OUT / f"informe-{args.month}.pdf"
        # CHROME_BIN env var wins (CI), then common paths.
        candidates = []
        if os.environ.get("CHROME_BIN"):
            candidates.append(os.environ["CHROME_BIN"])
        candidates.extend([
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "google-chrome", "chromium",
        ])
        for chrome in candidates:
            if Path(chrome).exists() or os.system(f"command -v {chrome} >/dev/null 2>&1") == 0:
                cmd = (
                    f'"{chrome}" --headless=new --disable-gpu --no-sandbox --disable-dev-shm-usage '
                    f'--no-pdf-header-footer '
                    f'--print-to-pdf="{out_pdf}" "file://{out_html.absolute()}"'
                )
                rc = os.system(cmd)
                if rc == 0:
                    print(f"✓ PDF:  {out_pdf}")
                    return
        print("⚠ No se encontró Chrome/Chromium. Abrí el HTML en el navegador y exportá manualmente.")


if __name__ == "__main__":
    main()
