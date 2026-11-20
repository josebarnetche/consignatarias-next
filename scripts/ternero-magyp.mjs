// Precio OBSERVADO del ternero: serie mensual de MAGyP (Coordinación de Análisis
// Pecuario), fuente Entre Surcos y Corrales, ternero de 160-180 kg, $/kg vivo.
//
// Por qué: el Mercado Agroganadero no opera terneros, así que el scraper lo
// calculaba como INMAG × 1,10. El 20/11/2026 eso daba 4.486 $/kg contra 6.389 de
// MAGyP (oct-2026): 29,8% abajo, publicado como si fuera un precio. Esta serie es
// mensual —se pierde la frecuencia diaria—, pero es una observación con fuente.
//
// La planilla se sobrescribe con el mismo nombre cada mes (sale ~18 días después
// del cierre). Si cambia el layout se ABORTA (null): nunca se lee otra columna.
import * as XLSX from "xlsx";

export const MAGYP_TERNERO_URL =
  "https://www.magyp.gob.ar/sitio/areas/ss_ganaderia/archivos/Planilla_de_precios_bovinos_en_moneda_corriente.xls";
export const MAGYP_TERNERO_SOURCE = "MAGyP · Entre Surcos y Corrales (mensual)";
const HOJA = "Series ";
const COL = 1; // columna B
const FILA_CONTROL = 3; // fila 4: «TERNERO»
// Fuera de este rango el número no es un ternero en $/kg vivo de 2026: se descarta.
const MIN_KG = 500;
const MAX_KG = 100_000;

/** Fecha de Excel (serial) → "AAAA-MM". */
function mesDeSerial(v) {
  // A mano y no con XLSX.SSF: en el import ESM de node, SSF no viene en el namespace.
  if (typeof v !== "number" || !Number.isFinite(v) || v < 1) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lee la última fila con dato de la planilla. Devuelve null (y el motivo por
 * consola) si el layout no es el esperado o el valor no es plausible.
 * @returns {{ current: number, mes: string } | null}
 */
export function parseTerneroMagyp(buf) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[HOJA];
  if (!sheet) {
    console.warn(`  [WARN] MAGyP ternero: no está la hoja "${HOJA}"`);
    return null;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const control = String(rows[FILA_CONTROL]?.[COL] ?? "").trim().toUpperCase();
  if (control !== "TERNERO") {
    console.warn(`  [WARN] MAGyP ternero: cambió el layout (B${FILA_CONTROL + 1} = "${control}")`);
    return null;
  }
  for (let r = rows.length - 1; r > FILA_CONTROL; r--) {
    const v = rows[r]?.[COL];
    const mes = mesDeSerial(rows[r]?.[0]);
    if (typeof v === "number" && mes) {
      if (v < MIN_KG || v > MAX_KG) {
        console.warn(`  [WARN] MAGyP ternero: valor implausible ${v} (${mes})`);
        return null;
      }
      return { current: v, mes };
    }
  }
  console.warn("  [WARN] MAGyP ternero: la planilla no trae ninguna fila con dato");
  return null;
}

export async function scrapeTerneroMagyp(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(MAGYP_TERNERO_URL, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; consignatarias.com.ar)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`  [WARN] MAGyP ternero: HTTP ${res.status}`);
      return null;
    }
    return parseTerneroMagyp(Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    console.warn(`  [WARN] MAGyP ternero: ${e?.message ?? e}`);
    return null;
  }
}

/**
 * Nueva entrada de categories.terneros.
 * - Con dato de MAGyP: el observado, con su mes.
 * - Sin dato pero con un observado previo de MAGyP: se CONSERVA (un precio viejo
 *   con fecha se declara; uno inventado no).
 * - Sin nada: el respaldo sintético, rotulado como tal.
 */
export function entradaTernero(prev, magyp, inmagValue, ratio = 1.1) {
  const p = prev || {};
  if (magyp) {
    // La variación se mide entre observaciones de MAGyP, mes contra mes:
    // - mismo mes que ya teníamos (el scraper corre a diario): se conserva el prev
    //   de ese mes, así la variación no cae a un 0% falso al día siguiente;
    // - mes nuevo: prev = el mes anterior;
    // - primer dato después del sintético: no hay contra qué comparar (0, sin prev distinto).
    const eraMagyp = p.source === MAGYP_TERNERO_SOURCE && p.current > 0;
    const base = !eraMagyp ? magyp.current : p.observedDate === magyp.mes ? p.prev || p.current : p.current;
    return {
      ...p,
      current: magyp.current,
      prev: base,
      change: round1(((magyp.current - base) / base) * 100),
      source: MAGYP_TERNERO_SOURCE,
      observado: true,
      observedDate: magyp.mes,
      metodo: null,
    };
  }
  if (p.source === MAGYP_TERNERO_SOURCE && p.current > 0) return p;
  const newVal = Math.round(inmagValue * ratio);
  const prevVal = p.current || newVal;
  return {
    ...p,
    current: newVal,
    prev: prevVal,
    change: prevVal ? round1(((newVal - prevVal) / prevVal) * 100) : 0,
    source: "MAG (derived from INMAG)",
    observado: false,
    observedDate: null,
    metodo: `INMAG × ${ratio.toFixed(2).replace(".", ",")}`,
  };
}

function round1(x) {
  return Number.isFinite(x) ? parseFloat(x.toFixed(1)) : 0;
}
