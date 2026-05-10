#!/usr/bin/env python3
"""
Backfill de categorías detalladas (18 buckets) del MAG por rango mensual.

Endpoint: haciinfo000502 — agrega min/max/avg/mediana/cabezas/importe por categoría
en el rango pedido. Ideal para extraer un MES completo de buckets ya promediados.

Uso:
    python parsers/categories_monthly.py --month 2026-04
    python parsers/categories_monthly.py --month 2026-04 --out cache/categories-2026-04.json
"""
from __future__ import annotations
import argparse
import calendar
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

ENDPOINT = "https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502"
HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / "cache"
CACHE.mkdir(parents=True, exist_ok=True)


def parse_ar_number(s: str) -> float | None:
    s = (s or "").replace(".", "").replace(",", ".").strip()
    if not s or s in ("-", "—"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fetch_month(ym: str) -> str:
    y, m = map(int, ym.split("-"))
    last = calendar.monthrange(y, m)[1]
    ini = f"01/{m:02d}/{y:04d}"
    fin = f"{last:02d}/{m:02d}/{y:04d}"
    url = f"{ENDPOINT}?txtFECHAINI={ini}&txtFECHAFIN={fin}&CP=&LISTADO=SI"
    req = urllib.request.Request(url, headers={"User-Agent": "consignatarias-report/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("cp1252", errors="replace")


def clean(html: str) -> str:
    out = re.sub(r"<[^>]+>", "", html or "")
    out = (out
           .replace("&nbsp;", " ")
           .replace("&iacute;", "í")
           .replace("&aacute;", "á")
           .replace("&oacute;", "ó")
           .replace("&eacute;", "é")
           .replace("&uacute;", "ú")
           .replace("&ntilde;", "ñ")
           .replace("&Iacute;", "Í")
           )
    return out.strip()


CATEGORY_HEAD_RE = re.compile(
    r"^(NOVILLOS|NOVILLITOS|VAQUILLONAS|VACAS|TOROS|TERNEROS|TERNERAS|MAMONES)\b",
    re.IGNORECASE,
)


def parse_response(html: str) -> dict:
    """Returns {'period':..., 'buckets':[...], 'subtotals':[...], 'totals': {...}}"""
    headline_m = re.search(r"PRECIOS POR CATEGORIA[^<]*", html)
    period = clean(headline_m.group(0)) if headline_m else ""

    rows_html = re.findall(r"<tr[^>]*>.*?</tr>", html, re.IGNORECASE | re.DOTALL)

    buckets: list[dict] = []
    subtotals: list[dict] = []
    current_group: str | None = None

    for tr in rows_html:
        cells_html = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.IGNORECASE | re.DOTALL)
        cells = [clean(c) for c in cells_html]
        if not any(cells):
            continue

        first = cells[0]

        # Subtotal-rule lines like '-------'
        if first == "" and any("---" in c for c in cells):
            continue

        # Subtotal numeric row: empty first cell, no min/max, has avg/cabezas/importe/peso
        if first == "" and len(cells) >= 8 and cells[1] == "" and cells[3]:
            avg = parse_ar_number(cells[3])
            cab = int((cells[5] or "0").replace(".", "").replace(",", "")) if cells[5] else 0
            importe = parse_ar_number(cells[6].replace("$", ""))
            peso = parse_ar_number(cells[7])
            if current_group:
                subtotals.append({
                    "group": current_group,
                    "avg": avg,
                    "cabezas": cab,
                    "importe_ars": importe,
                    "peso_prom_kg": peso,
                })
            continue

        # A real category row
        if CATEGORY_HEAD_RE.match(first) or " Esp" in first or " Regular" in first or " Conserva" in first or " Manuf" in first or first.startswith("VACAS") or first.startswith("TOROS") or first.startswith("TERNERO"):
            if len(cells) < 7:
                continue
            mn = parse_ar_number(cells[1])
            mx = parse_ar_number(cells[2])
            avg = parse_ar_number(cells[3])
            med = parse_ar_number(cells[4])
            cab = int((cells[5] or "0").replace(".", "").replace(",", "")) if cells[5] else 0
            importe = parse_ar_number((cells[6] or "").replace("$", ""))
            peso = parse_ar_number(cells[7]) if len(cells) > 7 else None

            if avg is None or cab == 0:
                continue

            # Determine group from first word
            group_match = CATEGORY_HEAD_RE.match(first)
            if group_match:
                current_group = group_match.group(1).upper()
                # NOVILLITOS / VAQUILLONAS etc come from FIRST word, but the row may say
                # "NOVILLITOS Esp. h 390" — strip the group prefix to get the bucket label
                bucket_label = first[len(group_match.group(1)):].strip() or first
            else:
                bucket_label = first

            buckets.append({
                "group": current_group,
                "label": bucket_label,
                "full": first,
                "min": mn,
                "max": mx,
                "avg": avg,
                "median": med,
                "cabezas": cab,
                "importe_ars": importe,
                "peso_prom_kg": peso,
            })

    # totals (last subtotal-style row with very high cabezas)
    totals = None
    if subtotals:
        # Find a row that aggregates more than any single subtotal
        totals_candidate = max(subtotals, key=lambda s: s["cabezas"]) if subtotals else None
        if totals_candidate and totals_candidate["cabezas"] > sum(b["cabezas"] for b in buckets) * 0.5:
            totals = totals_candidate

    return {
        "period_headline": period,
        "buckets": buckets,
        "subtotals": subtotals,
        "totals": totals,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True, help="YYYY-MM")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    print(f"→ fetching MAG haciinfo000502 for {args.month}…")
    html = fetch_month(args.month)
    parsed = parse_response(html)

    out_path = Path(args.out) if args.out else (CACHE / f"categories-{args.month}.json")
    payload = {
        "month": args.month,
        "source": "mercadoagroganadero.com.ar/haciinfo000502",
        "fetched_at": date.today().isoformat(),
        **parsed,
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    print(f"✓ headline: {parsed['period_headline']}")
    print(f"✓ buckets: {len(parsed['buckets'])}")
    print(f"✓ subtotals: {len(parsed['subtotals'])}")
    print(f"✓ saved: {out_path}")
    print()
    print("Top 5 buckets por cabezas:")
    for b in sorted(parsed["buckets"], key=lambda x: -x["cabezas"])[:5]:
        print(f"  {b['full']:<32} avg=${b['avg']:>8,.2f}  cab={b['cabezas']:>6,}  med={b['median']}  peso={b['peso_prom_kg']}")


if __name__ == "__main__":
    main()
