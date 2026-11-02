"""
Contrato común de las fuentes externas de El Corredor.

Cada módulo de `fuentes_nuevas/` trae UNA serie de un organismo público y la
devuelve como `SerieExterna`: los puntos más su procedencia (organismo, URL,
fecha en que la miramos, último período publicado, rezago y licencia).

LAS TRES REGLAS
1. **Nada sin procedencia.** Una serie sin URL ni fecha de observación no se
   construye: `SerieExterna.__post_init__` lo rechaza.
2. **Si el formato cambió, se rompe.** El parser valida encabezados, unidades y
   rangos plausibles y levanta `FormatoCambiado` con un mensaje que dice QUÉ
   esperaba y QUÉ encontró. Nunca se "adapta" en silencio.
3. **Nunca se estima un faltante.** Un período sin dato no aparece en `puntos`
   (o aparece con `valor: None` si la fuente lo publica vacío). No se interpola,
   no se arrastra el último valor, no se completa con un promedio.

Solo biblioteca estándar: el XLSX se lee con `zipfile` + `xml.etree`, para no
sumarle dependencias al render del informe.
"""

from __future__ import annotations

import json
import re
import urllib.request
import zipfile
from dataclasses import asdict, dataclass, field
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

AQUI = Path(__file__).resolve().parent
CACHE = AQUI.parent / "cache"
VERSION_ESQUEMA = 1
USER_AGENT = "consignatarias.com.ar El Corredor/1.0 (+https://www.consignatarias.com.ar)"


class FormatoCambiado(RuntimeError):
    """El archivo de la fuente no tiene la forma que el parser conoce. Rompe a propósito."""


@dataclass
class Procedencia:
    fuente: str                 # organismo + publicación, ej. "MAGyP · Indicadores bovinos"
    url: str                    # URL exacta de la que se bajó el archivo
    fecha_observacion: str      # ISO: el día en que lo bajamos
    fecha_dato: str | None      # último período con dato, ej. "2026-09"
    rezago: str                 # texto: "~10 días después del cierre del mes"
    licencia: str               # texto corto + URL de términos si existe
    nota: str | None = None


@dataclass
class SerieExterna:
    id: str                     # slug estable, ej. "faena-bovina-mensual"
    unidad: str                 # "cabezas", "kg res con hueso", "índice 2014-2016=100"...
    frecuencia: str             # "mensual" | "anual" | "trimestral"
    puntos: list[dict[str, Any]]
    procedencia: Procedencia
    columnas: dict[str, str] = field(default_factory=dict)  # nombre → descripción/unidad

    def __post_init__(self) -> None:
        p = self.procedencia
        if not p.url or not p.fecha_observacion or not p.fuente:
            raise ValueError(f"{self.id}: serie sin procedencia completa")
        if not self.puntos:
            raise FormatoCambiado(f"{self.id}: la fuente no devolvió ningún punto")

    def __len__(self) -> int:
        return len(self.puntos)

    def a_dict(self) -> dict[str, Any]:
        return {"version_esquema": VERSION_ESQUEMA, **asdict(self)}


# ─── cache versionado ──────────────────────────────────────────────────────────

def ruta_cache(id_serie: str) -> Path:
    return CACHE / f"externa-{id_serie}.json"


def guardar_cache(serie: SerieExterna, ruta: Path | None = None) -> Path:
    ruta = ruta or ruta_cache(serie.id)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(serie.a_dict(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return ruta


def cargar_cache(id_serie: str, ruta: Path | None = None) -> SerieExterna:
    ruta = ruta or ruta_cache(id_serie)
    d = json.loads(ruta.read_text(encoding="utf-8"))
    if d.get("version_esquema") != VERSION_ESQUEMA:
        raise FormatoCambiado(f"{ruta.name}: version_esquema {d.get('version_esquema')} != {VERSION_ESQUEMA}")
    d.pop("version_esquema")
    d["procedencia"] = Procedencia(**d["procedencia"])
    return SerieExterna(**d)


# ─── red ───────────────────────────────────────────────────────────────────────

def descargar(url: str, timeout: int = 60) -> bytes:
    """GET simple, sin cookies ni credenciales. Falla ruidosamente si no es 200."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status} en {url}")
        return r.read()


def hoy() -> str:
    return date.today().isoformat()


# ─── XLSX mínimo (stdlib) ──────────────────────────────────────────────────────

_NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
       "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def _col_idx(ref: str) -> int:
    letras = re.match(r"[A-Z]+", ref).group(0)  # type: ignore[union-attr]
    n = 0
    for ch in letras:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def leer_xlsx(contenido: bytes) -> dict[str, list[list[Any]]]:
    """
    Devuelve {nombre_hoja: filas}, cada fila una lista de celdas (str, float o None).
    Las fechas quedan como número serial de Excel: convertir con `serial_a_fecha`.
    No evalúa fórmulas: toma el valor cacheado que guardó Excel.
    """
    try:
        z = zipfile.ZipFile(BytesIO(contenido))
    except zipfile.BadZipFile as e:
        raise FormatoCambiado(f"no es un XLSX: {e}") from e
    compartidas: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        raiz = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in raiz.findall("m:si", _NS):
            compartidas.append("".join(t.text or "" for t in si.iter(f"{{{_NS['m']}}}t")))
    libro = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    destino = {r.get("Id"): r.get("Target") for r in rels}
    hojas: dict[str, list[list[Any]]] = {}
    for h in libro.find("m:sheets", _NS):  # type: ignore[union-attr]
        target = destino[h.get(_REL)].lstrip("/")
        path = target if target.startswith("xl/") else f"xl/{target}"
        raiz = ET.fromstring(z.read(path))
        filas: list[list[Any]] = []
        for fila in raiz.iter(f"{{{_NS['m']}}}row"):
            celdas: list[Any] = []
            for c in fila.findall("m:c", _NS):
                i = _col_idx(c.get("r", "A1"))
                while len(celdas) < i:
                    celdas.append(None)
                t = c.get("t")
                v = c.find("m:v", _NS)
                if t == "s" and v is not None:
                    val: Any = compartidas[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter(f"{{{_NS['m']}}}t"))
                elif v is None or v.text is None:
                    val = None
                elif t in ("str", "e"):
                    val = v.text
                else:
                    try:
                        val = float(v.text)
                    except ValueError:
                        val = v.text
                celdas.append(val)
            idx = int(fila.get("r", len(filas) + 1)) - 1
            while len(filas) < idx:
                filas.append([])
            filas.append(celdas)
        hojas[h.get("name")] = filas
    return hojas


def serial_a_fecha(n: float) -> date:
    """Número serial de Excel (sistema 1900) → date."""
    from datetime import timedelta
    return date(1899, 12, 30) + timedelta(days=int(n))


def numero_ar(s: Any) -> float | None:
    """'1.234,5' → 1234.5 · '' / '-' / None → None. Un float pasa tal cual."""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    t = str(s).strip().replace(" ", "").replace(" ", "")
    if t in ("", "-", "—", "s/d", "s.d.", "///", "..."):
        return None
    t = t.replace(".", "").replace(",", ".")
    try:
        return float(t)
    except ValueError as e:
        raise FormatoCambiado(f"número ilegible: {s!r}") from e


def exigir(condicion: bool, mensaje: str) -> None:
    """Assert que no desaparece con `python -O`."""
    if not condicion:
        raise FormatoCambiado(mensaje)
