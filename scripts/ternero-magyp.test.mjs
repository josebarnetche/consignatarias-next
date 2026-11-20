import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";
import { parseTerneroMagyp, entradaTernero, scrapeTerneroMagyp, MAGYP_TERNERO_SOURCE } from "./ternero-magyp.mjs";

// Planilla con el layout real de MAGyP: hoja "Series ", B4 = "TERNERO", col A = fecha serial.
function planilla({ hoja = "Series ", control = "TERNERO ", filas = [] } = {}) {
  const serial = (y, m) => (Date.UTC(y, m - 1, 1) - Date.UTC(1899, 11, 30)) / 86_400_000;
  const aoa = [[""], ["Precios bovinos"], ["", ""], ["", control], ["", "Precio (KgVivo en Pesos)"]];
  for (const [y, m, v] of filas) aoa.push([serial(y, m), v]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), hoja);
  return XLSX.write(wb, { type: "buffer", bookType: "biff8" });
}

describe("parseTerneroMagyp", () => {
  it("toma la última fila con dato (caso real: oct-2026 = 6.389)", () => {
    const buf = planilla({ filas: [[2026, 9, 6572], [2026, 10, 6389], [2026, 11, ""]] });
    expect(parseTerneroMagyp(buf)).toEqual({ current: 6389, mes: "2026-10" });
  });
  it("aborta si cambió el layout: nunca lee otra columna", () => {
    expect(parseTerneroMagyp(planilla({ control: "NOVILLO", filas: [[2026, 10, 6389]] }))).toBeNull();
    expect(parseTerneroMagyp(planilla({ hoja: "Hoja1", filas: [[2026, 10, 6389]] }))).toBeNull();
  });
  it("descarta un valor implausible (p. ej. en USD o en miles)", () => {
    expect(parseTerneroMagyp(planilla({ filas: [[2026, 10, 6.389]] }))).toBeNull();
  });
});

describe("scrapeTerneroMagyp", () => {
  it("HTTP de error o excepción → null, nunca un número", async () => {
    expect(await scrapeTerneroMagyp(vi.fn().mockResolvedValue({ ok: false, status: 503 }))).toBeNull();
    expect(await scrapeTerneroMagyp(vi.fn().mockRejectedValue(new Error("timeout")))).toBeNull();
  });
});

describe("entradaTernero", () => {
  const sintetico = { current: 4486, prev: 4486, change: 0, source: "MAG (derived from INMAG)" };

  it("con MAGyP: observado, con mes y fuente; deja de ser el ratio", () => {
    const e = entradaTernero(sintetico, { current: 6389, mes: "2026-10" }, 4078.59);
    expect(e).toMatchObject({ current: 6389, observado: true, observedDate: "2026-10", source: MAGYP_TERNERO_SOURCE, metodo: null });
    expect(e.change).toBe(0); // contra el sintético no se compara
  });
  it("mes nuevo: la variación es contra el mes anterior de MAGyP", () => {
    const oct = { current: 6389, prev: 6572, change: -2.8, source: MAGYP_TERNERO_SOURCE, observedDate: "2026-10" };
    const e = entradaTernero(oct, { current: 6200, mes: "2026-11" }, 4000);
    expect(e.prev).toBe(6389);
    expect(e.change).toBe(-3);
  });
  it("mismo mes releído al día siguiente: conserva la variación (sin 0% falso)", () => {
    const oct = { current: 6389, prev: 6572, change: -2.8, source: MAGYP_TERNERO_SOURCE, observedDate: "2026-10" };
    const e = entradaTernero(oct, { current: 6389, mes: "2026-10" }, 4100);
    expect(e.prev).toBe(6572);
    expect(e.change).toBe(-2.8);
  });
  it("MAGyP no respondió: se conserva el último observado, no vuelve el ratio", () => {
    const oct = { current: 6389, prev: 6572, change: -2.8, source: MAGYP_TERNERO_SOURCE, observedDate: "2026-10", observado: true };
    expect(entradaTernero(oct, null, 4100)).toBe(oct);
  });
  it("sin MAGyP y sin observado previo: respaldo sintético rotulado", () => {
    const e = entradaTernero(sintetico, null, 4078.59);
    expect(e).toMatchObject({ current: 4486, observado: false, observedDate: null, metodo: "INMAG × 1,10" });
  });
});
