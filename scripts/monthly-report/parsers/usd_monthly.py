#!/usr/bin/env python3
"""
Pull USD oficial + blue histórico desde argentinadatos.com.
Cobertura completa desde 2011 — alcanza para comparable interanual.

Uso:
    python parsers/usd_monthly.py --months 2025-04 2026-03 2026-04
    python parsers/usd_monthly.py --month 2026-04
"""
from __future__ import annotations
import argparse
import json
import urllib.request
from datetime import date
from pathlib import Path
from statistics import mean

ENDPOINTS = {
    "oficial": "https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial",
    "blue": "https://api.argentinadatos.com/v1/cotizaciones/dolares/blue",
}
HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / "cache"
CACHE.mkdir(parents=True, exist_ok=True)


def fetch_full_series(casa: str) -> list[dict]:
    url = ENDPOINTS[casa]
    req = urllib.request.Request(url, headers={"User-Agent": "consignatarias-report/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def month_stats(rows: list[dict], ym: str) -> dict | None:
    days = [r for r in rows if r.get("fecha", "").startswith(ym)]
    if not days:
        return None
    venta = [float(d["venta"]) for d in days if d.get("venta") is not None]
    compra = [float(d["compra"]) for d in days if d.get("compra") is not None]
    return {
        "month": ym,
        "days": len(days),
        "venta_avg": round(mean(venta), 2) if venta else None,
        "venta_open": round(venta[0], 2) if venta else None,
        "venta_close": round(venta[-1], 2) if venta else None,
        "venta_min": round(min(venta), 2) if venta else None,
        "venta_max": round(max(venta), 2) if venta else None,
        "compra_avg": round(mean(compra), 2) if compra else None,
        "by_day": [{"date": d["fecha"], "venta": float(d["venta"]), "compra": float(d.get("compra", 0))} for d in days],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--months", nargs="+", default=None, help="lista de YYYY-MM")
    ap.add_argument("--month", default=None, help="un solo YYYY-MM")
    args = ap.parse_args()

    months = args.months or ([args.month] if args.month else ["2026-04"])

    print(f"→ fetching argentinadatos USD oficial + blue (full history)…")
    oficial = fetch_full_series("oficial")
    blue = fetch_full_series("blue")
    print(f"✓ oficial: {len(oficial)} días totales (desde {oficial[0]['fecha']})")
    print(f"✓ blue:    {len(blue)} días totales (desde {blue[0]['fecha']})")
    print()

    out = {
        "fetched_at": date.today().isoformat(),
        "source": "api.argentinadatos.com/v1/cotizaciones/dolares",
        "months": {},
    }

    for ym in months:
        of = month_stats(oficial, ym) or {}
        bl = month_stats(blue, ym) or {}
        out["months"][ym] = {
            "oficial": of,
            "blue": bl,
            "brecha_pct_avg": (
                round((bl["venta_avg"] - of["venta_avg"]) / of["venta_avg"] * 100, 2)
                if of.get("venta_avg") and bl.get("venta_avg") else None
            ),
        }
        print(f"📅 {ym}:")
        if of:
            print(f"   Oficial venta: avg ARS {of['venta_avg']:>7,.2f}  "
                  f"({of['venta_open']:>6} → {of['venta_close']:>6}, {of['days']} días)")
        if bl:
            print(f"   Blue venta:    avg ARS {bl['venta_avg']:>7,.2f}  "
                  f"({bl['venta_open']:>6} → {bl['venta_close']:>6}, {bl['days']} días)")
        if out["months"][ym]["brecha_pct_avg"] is not None:
            print(f"   Brecha avg:    {out['months'][ym]['brecha_pct_avg']:>5.2f}%")
        print()

    out_path = CACHE / "usd-monthly.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"✓ saved: {out_path}")


if __name__ == "__main__":
    main()
