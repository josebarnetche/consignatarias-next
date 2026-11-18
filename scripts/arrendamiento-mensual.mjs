#!/usr/bin/env node
// Cierres MENSUALES del índice oficial de arrendamiento del MAG (haciinfo000013,
// "INMAG sugerido para arrendamientos rurales / ROFEX"). No es lo mismo que el INMAG
// mensual (haciinfo000011, todas las categorías): ej. octubre 2026 INMAG $4.122,039 vs.
// índice arrendamiento $4.186,564, ambos sobre 80.045 cab. ingresadas.
// Pide cada mes completo y guarda la fila "Totales" (índice del período = el mes).
// Uso: node scripts/arrendamiento-mensual.mjs [meses=13]
import { writeFileSync } from 'node:fs'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const N = Number(process.argv[2] || 13)
const pad = (n) => String(n).padStart(2, '0')
const parseNum = (s) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'))

async function totalesDelMes(y, m) {
  const last = new Date(y, m, 0).getDate()
  const url =
    'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000013' +
    `?txtFECHAINI=${encodeURIComponent(`01/${pad(m)}/${y}`)}&txtFECHAFIN=${encodeURIComponent(`${pad(last)}/${pad(m)}/${y}`)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const html = await res.text()
  const rows = [...html.matchAll(/<TR[^>]*>([\s\S]*?)<\/TR>/gi)].map((r) =>
    [...r[1].matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim(),
    ),
  )
  for (const cells of rows) {
    const ne = cells.filter(Boolean)
    if (ne.length < 4 || !/Totales/i.test(ne[0])) continue
    // Totales | Cab | Importe | Índice
    const idx = ne.find((c, i) => i >= 1 && /\d,\d{3}$/.test(c))
    const cab = parseNum(ne[1])
    if (!idx) continue
    return { index: Math.round(parseNum(idx) * 1000) / 1000, cabezas: Number.isFinite(cab) ? cab : null, url }
  }
  return null
}

const now = new Date()
const out = []
for (let k = 1; k <= N; k++) {
  const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  try {
    const t = await totalesDelMes(y, m)
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
writeFileSync(
  new URL('../src/lib/data/arrendamiento-mensual.json', import.meta.url),
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
