#!/usr/bin/env node
// Cierres MENSUALES del índice oficial de arrendamiento del MAG (haciinfo000013,
// "INMAG sugerido para arrendamientos rurales / ROFEX"). No es lo mismo que el INMAG
// mensual (haciinfo000011, todas las categorías): ej. octubre 2026 INMAG $4.122,039 vs.
// índice arrendamiento $4.186,564, ambos sobre 80.045 cab. ingresadas.
// Pide cada mes completo y guarda la fila "Totales" (índice del período = el mes).
// El parser vive en src/lib/mag/arrendamiento-index.ts (con test) y es el MISMO que usa
// el cron arrendamiento-cierre para el mail → página y mail no pueden divergir.
// Solo reescribe el JSON si cambió algún mes (sin commits de ruido por el campo "updated").
// Uso: npx tsx scripts/arrendamiento-mensual.mjs [meses=13]
//      (lo corre .github/workflows/arrendamiento-mensual.yml el 2 de cada mes)
import { readFileSync, writeFileSync } from 'node:fs'
import { fetchArrendamientoMonthClose } from '../src/lib/mag/arrendamiento-index.ts'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const N = Number(process.argv[2] || 13)
const FILE = new URL('../src/lib/data/arrendamiento-mensual.json', import.meta.url)

const now = new Date()
const out = []
for (let k = 1; k <= N; k++) {
  const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  try {
    const t = await fetchArrendamientoMonthClose(y, m)
    if (t) out.push({ year: y, month: m, label: `${MESES[m - 1]} ${y}`, index: t.index, cabezas: t.cabezas })
    console.log(y, m, t ? t.index : '—', t ? t.cabezas : '')
  } catch (e) {
    console.warn('  [WARN]', y, m, e.message)
  }
}
if (out.length === 0) {
  console.error('Sin datos: no se escribe el archivo')
  process.exit(1)
}

let prevMonths = null
try {
  prevMonths = JSON.parse(readFileSync(FILE, 'utf8')).months
} catch {
  /* primer corrida o JSON roto: se escribe */
}
if (prevMonths && JSON.stringify(prevMonths) === JSON.stringify(out)) {
  console.log('Sin cambios en los cierres: no se reescribe el archivo')
  process.exit(0)
}
// Si el MAG falló en algún mes de la ventana, no achicar la serie: se completa con lo que ya había.
if (prevMonths) {
  const have = new Set(out.map((r) => `${r.year}-${r.month}`))
  const desde = new Date(now.getFullYear(), now.getMonth() - N, 1)
  const desdeKey = desde.getFullYear() * 12 + desde.getMonth() + 1
  for (const r of prevMonths) {
    if (!have.has(`${r.year}-${r.month}`) && r.year * 12 + r.month >= desdeKey) out.push(r)
  }
  out.sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))
}

writeFileSync(
  FILE,
  JSON.stringify(
    {
      updated: now.toISOString().slice(0, 10),
      source: 'Mercado Agroganadero — haciinfo000013 (índice sugerido para arrendamientos rurales), fila Totales del mes',
      months: out,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Escrito: ${out.length} meses (último: ${out[0].label} ${out[0].index})`)
