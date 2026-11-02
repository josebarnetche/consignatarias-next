#!/usr/bin/env python3
"""
Publica una nueva edición de "El Corredor".

Pipeline (v2, por defecto desde la edición de noviembre de 2026):
  1. Refresh datos: USD histórico + categorías mensuales
  2. Fuentes públicas nuevas (`fuentes_nuevas/corrida.py`): faena, stock,
     exportaciones, IPC, ENSO y lluvias. Cada una es tolerante a fallo: si un
     organismo no responde o cambió el formato, queda su cache anterior y la nota
     va a los avisos del informe; nunca corta la publicación
  3. Render PDF v2 + piezas para redes + imágenes de producto (tapa, OG, cuadrado)
  4. Copia assets a public/el-corredor/ con slug del mes (las piezas como
     ig-<mes-año>-N.png y estado-<mes-año>-N.png)
  5. Actualiza public/el-corredor/manifest.json (current + history), con
     `hechos`, `faltantes` y `piezas` en cada ítem (lo lee /el-corredor/[edicion])

Con --v1 corre el pipeline anterior (informe v1 + product_image_v1.py), sin piezas
ni hechos en el manifest, y sin el paso 2. Con --sin-fuentes-nuevas se saltea el
paso 2 y el informe usa los caches como estén (--skip-data-refresh saltea solo el
paso 1). Con --salida DIR todo se escribe dentro de DIR (render en
DIR/output, público y manifest en DIR/public/el-corredor): sirve para probar sin
tocar public/ del repo.

Después de correr esto, hay que:
  - git commit + push (lo hace el workflow)
  - llamar /api/el-corredor/blast con el bearer token (el workflow también)

Uso:
    python scripts/monthly-report/publish.py --month 2026-04
    python scripts/monthly-report/publish.py --month auto    # mes anterior al actual
    python scripts/monthly-report/publish.py --month 2026-10 --salida /tmp/prueba   # ensayo
    python scripts/monthly-report/publish.py --v1             # vuelve al informe anterior
    python scripts/monthly-report/publish.py --month 2026-10 --sin-fuentes-nuevas   # re-render sin red
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
    # El v2 es el default. --v1 vuelve al pipeline anterior; --v2 queda aceptado
    # (no hace nada) para no romper llamadas viejas.
    ap.add_argument("--v1", action="store_true", help="publicar con el informe anterior (v1)")
    ap.add_argument("--v2", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--sin-fuentes-nuevas", action="store_true",
                    help="no actualizar faena/stock/exportaciones/IPC/ENSO/lluvias: usa los caches como estén")
    ap.add_argument("--salida", default=None,
                    help="ensayo: render, public/el-corredor y manifest dentro de esta carpeta (no toca el repo)")
    args = ap.parse_args()
    if args.v1 and args.v2:
        ap.error("--v1 y --v2 se excluyen")
    out = Path(args.salida) / "output" if args.salida else OUT
    public = Path(args.salida) / "public" / "el-corredor" if args.salida else PUBLIC

    target_ym = previous_month_ym() if args.month == "auto" else args.month
    y, m = map(int, target_ym.split("-"))
    month_slug = f"{MONTHS_ES[m]}-{y}"
    edition_label = f"{MONTHS_ES[m].title()} · {y}"
    edition_short = f"{m:02d}/{str(y)[2:]}"

    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║  El Corredor — publish pipeline                              ║")
    print(f"║  Target: {target_ym}  ({edition_label})                       ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")

    # 1. Refresh data. Con --v1 la numeración queda la de antes (4 pasos).
    total = 4 if args.v1 else 5
    if not args.skip_data_refresh:
        print(f"\n→ [1/{total}] Refresh USD (13 meses trailing)")
        usd_months = trailing_months(target_ym, 13)
        run(["python3", str(PARSERS / "usd_monthly.py"), "--months", *usd_months])

        print(f"\n→ [2/{total}] Refresh categorías mensuales")
        run(["python3", str(PARSERS / "categories_monthly.py"), "--month", target_ym])
    else:
        print(f"\n→ [1-2/{total}] Skipping data refresh (--skip-data-refresh)")

    # 1b. Fuentes públicas nuevas. Solo el v2 las usa: con --v1 no se corre nada
    # nuevo, para que el pipeline anterior salga idéntico. No va dentro de
    # --skip-data-refresh porque son otra cosa (organismos públicos, no el MAG) y
    # tienen su propio flag. Nunca corta: lo que falla queda como nota.
    notas_fuentes: list[str] = []
    if not args.v1:
        if args.sin_fuentes_nuevas:
            print("\n→ [3/5] Fuentes públicas nuevas: salteadas (--sin-fuentes-nuevas), se usan los caches")
        else:
            print(f"\n→ [3/5] Fuentes públicas nuevas")
            sys.path.insert(0, str(HERE))
            try:
                from fuentes_nuevas import corrida
                notas_fuentes = corrida.actualizar_todas()
            except Exception as e:  # noqa: BLE001 — ni la corrida entera corta la edición
                notas_fuentes = [f"fuentes públicas nuevas sin actualizar ({type(e).__name__}: {e}); se usan los caches"]
            for n in notas_fuentes:
                print(f"  ⚠ {n}")

    # 2. Render. `informe.py` / `informe_v2.py` son los generadores vigentes;
    # `render.py` quedó como referencia histórica: NO se publica más desde ahí,
    # porque imprimía el indicador de ciclo al revés.
    print(f"\n→ [{'3/4' if args.v1 else '4/5'}] Render PDF + piezas + imágenes de producto")
    out.mkdir(parents=True, exist_ok=True)
    extra_manifest: dict = {}
    piezas_hechas: list[dict] = []
    if args.v1:
        run(["python3", str(HERE / "informe.py"), "--mes", target_ym, "--pdf", "--v1", "--salida", str(out)])
        run(["python3", str(HERE / "product_image_v1.py"), "--month", target_ym, "--salida", str(out)])
    else:
        piezas_hechas, extra_manifest = render_v2(target_ym, out, notas_fuentes)

    # 3. Copy to public/
    print(f"\n→ [{'4/4' if args.v1 else '5/5'}] Publish assets to {public}")
    public.mkdir(parents=True, exist_ok=True)

    pairs = [
        (out / f"el-corredor-{target_ym}.pdf", public / f"{month_slug}.pdf"),
        (out / f"el-corredor-{target_ym}-cover-portrait-768x1024.png", public / f"cover-{month_slug}.png"),
        (out / f"el-corredor-{target_ym}-og-1200x630.png", public / f"og-{month_slug}.png"),
        (out / f"el-corredor-{target_ym}-square-1080x1080.png", public / f"square-{month_slug}.png"),
    ]
    for src, dst in pairs:
        if src.exists():
            shutil.copy2(src, dst)
            print(f"    {dst.name}  ({dst.stat().st_size // 1024} KB)")
        else:
            print(f"    ⚠ MISSING: {src.name}")
            # El PDF no es opcional: sin él, el manifest se actualizaba igual y el
            # blast mandaba a la gente a la edición del mes anterior.
            if src.suffix == ".pdf":
                print("::error::no se generó el PDF de la edición — no se publica nada")
                sys.exit(1)

    # Las piezas: ig-<mes-año>-N.png (1080×1350) y estado-<mes-año>-N.png (1080×1920),
    # numeradas en el orden de piezas.PIEZAS. Una pieza sin dato no está y no se lista.
    piezas_manifest = []
    contador = {"ig": 0, "estado": 0}
    for pz in piezas_hechas:
        contador[pz["tipo"]] += 1
        nombre = f'{pz["tipo"]}-{month_slug}-{contador[pz["tipo"]]}.png'
        shutil.copy2(pz["archivo"], public / nombre)
        item = {"tipo": pz["tipo"], "ruta": f"/el-corredor/{nombre}", "titulo": pz["titulo"]}
        if pz.get("texto"):
            item["texto"] = pz["texto"]
        piezas_manifest.append(item)
        print(f"    {nombre}  ({(public / nombre).stat().st_size // 1024} KB) · {pz['nombre']}")

    # 4. Update manifest. Con --salida se parte del manifest real (solo lectura) y se
    # escribe la copia en la carpeta de ensayo.
    manifest_src = PUBLIC / "manifest.json"
    manifest_path = public / "manifest.json"
    base_path = manifest_path if manifest_path.exists() else manifest_src
    manifest = json.loads(base_path.read_text()) if base_path.exists() else {"history": []}

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
    if not args.v1:
        new_current.update({**extra_manifest, "piezas": piezas_manifest})

    history = manifest.get("history", [])
    # de-dup by ym
    history = [h for h in history if h.get("ym") != target_ym]
    item_hist = {
        "ym": target_ym,
        "edition_label": edition_label,
        "pdf_path": new_current["pdf_path"],
        "published_at": new_current["published_at"],
    }
    if not args.v1:
        item_hist.update({**extra_manifest, "piezas": piezas_manifest})
    history.insert(0, item_hist)

    manifest = {"current": new_current, "history": history}
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"\n  manifest.json updated → current = {target_ym} ({manifest_path})")

    print(f"\n✓ El Corredor · {edition_label} publicado{' (v1)' if args.v1 else ''}")
    print(f"  Próximo paso: git commit + push, después POST /api/el-corredor/blast")


def render_v2(target_ym: str, out: Path, notas_fuentes: list[str] | None = None) -> tuple[list[dict], dict]:
    """
    El v2 en el mismo proceso: los datos se leen UNA vez (`datos_v2.cargar`, por
    `datos.sb()` con SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) y de ahí salen el PDF,
    las piezas, las imágenes de producto, los hechos y las ausencias, así ninguna
    superficie puede contradecir a otra. Lo único que corta es el INMAG (y el PDF):
    lo demás que falte se omite y queda en `faltantes`. `notas_fuentes` son las
    fuentes públicas que no se pudieron actualizar (`corrida.actualizar_todas`): van
    a los avisos junto con los controles de los datos.
    """
    sys.path.insert(0, str(HERE))
    import datos_v2 as D2
    import informe as I
    import informe_v2 as I2
    import piezas as P
    import product_image as PI

    p, x = D2.cargar(target_ym)
    x.avisos.extend(notas_fuentes or [])
    print(f"  {len(p.ruedas_mes)} ruedas con índice · cierre {p.cierre['ars']:.0f} ARS")
    for f in I2.ausencias(p, x):
        print(f"  ⚠ sin dato: {f}")
    for a in x.avisos:
        print(f"  ⚠ control: {a}")
    html, sin_dato = I2.construir(p, x)
    if sin_dato:
        print(f"  ⚠ páginas que no van por falta de dato: {', '.join(sin_dato)}")
    hp = out / f"el-corredor-{target_ym}.html"
    hp.write_text(html, encoding="utf-8")
    pdf = out / f"el-corredor-{target_ym}.pdf"
    if not I.a_pdf(hp, pdf):
        print("::error::no se pudo generar el PDF (¿chromium?)")
        sys.exit(1)
    print(f"  PDF: {pdf.name} ({pdf.stat().st_size // 1024} KB)")
    piezas = P.generar(p, x, out / "piezas")
    PI.generar(p, x, out)
    extra = {"hechos": I2.hechos_texto(p, x), "faltantes": I2.ausencias(p, x)}
    return piezas, extra


if __name__ == "__main__":
    main()
