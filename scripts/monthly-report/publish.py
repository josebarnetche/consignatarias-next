#!/usr/bin/env python3
"""
Publica una nueva edición de "El Corredor".

Pipeline:
  1. Refresh datos: USD histórico + categorías mensuales
  2. Render PDF + product images
  3. Copia assets a public/el-corredor/ con slug del mes
  4. Actualiza public/el-corredor/manifest.json (current + history)

Después de correr esto, hay que:
  - git commit + push (lo hace el workflow)
  - llamar /api/el-corredor/blast con el bearer token (el workflow también)

Uso:
    python scripts/monthly-report/publish.py --month 2026-04
    python scripts/monthly-report/publish.py --month auto    # mes anterior al actual
"""
from __future__ import annotations
import argparse
import json
import shutil
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
HERE = Path(__file__).resolve().parent
PUBLIC = ROOT / "public" / "el-corredor"
OUT = HERE / "output"
PARSERS = HERE / "parsers"

MONTHS_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril", 5: "mayo", 6: "junio",
    7: "julio", 8: "agosto", 9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}


def previous_month_ym() -> str:
    today = date.today()
    y, m = today.year, today.month
    if m == 1:
        return f"{y - 1:04d}-12"
    return f"{y:04d}-{m - 1:02d}"


def trailing_months(end_ym: str, n: int) -> list[str]:
    y, m = map(int, end_ym.split("-"))
    out = []
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(out))


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    if result.stdout.strip():
        # Print last 5 lines for visibility
        for line in result.stdout.splitlines()[-5:]:
            print(f"    {line}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", default="auto", help="YYYY-MM o 'auto' (mes anterior)")
    ap.add_argument("--skip-data-refresh", action="store_true",
                    help="No correr parsers de USD/categorías (útil para re-renderizar sin re-fetch)")
    args = ap.parse_args()

    target_ym = previous_month_ym() if args.month == "auto" else args.month
    y, m = map(int, target_ym.split("-"))
    month_slug = f"{MONTHS_ES[m]}-{y}"
    edition_label = f"{MONTHS_ES[m].title()} · {y}"
    edition_short = f"{m:02d}/{str(y)[2:]}"

    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║  El Corredor — publish pipeline                              ║")
    print(f"║  Target: {target_ym}  ({edition_label})                       ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")

    # 1. Refresh data
    if not args.skip_data_refresh:
        print(f"\n→ [1/4] Refresh USD (13 meses trailing)")
        usd_months = trailing_months(target_ym, 13)
        run(["python3", str(PARSERS / "usd_monthly.py"), "--months", *usd_months])

        print(f"\n→ [2/4] Refresh categorías mensuales")
        run(["python3", str(PARSERS / "categories_monthly.py"), "--month", target_ym])
    else:
        print("\n→ [1-2/4] Skipping data refresh (--skip-data-refresh)")

    # 2. Render PDF + product images
    print(f"\n→ [3/4] Render PDF + product images")
    run(["python3", str(HERE / "render.py"), "--month", target_ym, "--pdf"])
    run(["python3", str(HERE / "product_image.py"), "--month", target_ym])

    # 3. Copy to public/
    print(f"\n→ [4/4] Publish assets to public/el-corredor/")
    PUBLIC.mkdir(parents=True, exist_ok=True)

    pairs = [
        (OUT / f"informe-{target_ym}.pdf", PUBLIC / f"{month_slug}.pdf"),
        (OUT / f"el-corredor-{target_ym}-cover-portrait-768x1024.png", PUBLIC / f"cover-{month_slug}.png"),
        (OUT / f"el-corredor-{target_ym}-og-1200x630.png", PUBLIC / f"og-{month_slug}.png"),
        (OUT / f"el-corredor-{target_ym}-square-1080x1080.png", PUBLIC / f"square-{month_slug}.png"),
    ]
    for src, dst in pairs:
        if src.exists():
            shutil.copy2(src, dst)
            print(f"    {dst.name}  ({dst.stat().st_size // 1024} KB)")
        else:
            print(f"    ⚠ MISSING: {src.name}")

    # 4. Update manifest
    manifest_path = PUBLIC / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"history": []}

    new_current = {
        "ym": target_ym,
        "edition_label": edition_label,
        "edition_short": edition_short,
        "month_slug": month_slug,
        "pdf_path": f"/el-corredor/{month_slug}.pdf",
        "cover_path": f"/el-corredor/cover-{month_slug}.png",
        "og_path": f"/el-corredor/og-{month_slug}.png",
        "published_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    history = manifest.get("history", [])
    # de-dup by ym
    history = [h for h in history if h.get("ym") != target_ym]
    history.insert(0, {
        "ym": target_ym,
        "edition_label": edition_label,
        "pdf_path": new_current["pdf_path"],
        "published_at": new_current["published_at"],
    })

    manifest = {"current": new_current, "history": history}
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"\n  manifest.json updated → current = {target_ym}")

    print(f"\n✓ El Corredor · {edition_label} publicado")
    print(f"  Próximo paso: git commit + push, después POST /api/el-corredor/blast")


if __name__ == "__main__":
    main()
