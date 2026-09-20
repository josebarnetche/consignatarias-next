/**
 * Precomputa las bandas del VR (Valor de Referencia) desde el dato de lote del MAG
 * y las escribe en src/lib/data/vr-bandas.json.
 *
 * Corre una vez por día, después de mag-lots-pipeline.yml. El resultado se commitea:
 * `src/lib/vr.ts` lo lee síncrono para no meter una query de percentiles en el
 * camino caliente del MCP ni volver dinámicas las páginas SSG.
 *
 * Env:
 *   SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso: node scripts/compute-vr-bandas.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/lib/data/vr-bandas.json')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Ventana de la banda. Corta a propósito: refleja el mercado de hoy, no el ciclo. */
const VENTANA_DIAS = 30
/** El ajuste de origen necesita más base, así que mira más atrás. */
const VENTANA_ORIGEN_DIAS = 90

const MIN_LOTES_BANDA = 10
const MIN_LOTES_AJUSTE_ORIGEN = 30

/** Categorías que nunca deben llegar a una respuesta (precio 0, casos de descarte). */
const CATEGORIAS_EXCLUIDAS = new Set(['VAC.MUERTA', 'VAC.CAIDAS'])

function percentil(ordenados, q) {
  if (ordenados.length === 0) return 0
  const pos = (ordenados.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return ordenados[lo]
  return ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (pos - lo)
}

async function traerLotes(sb, desde) {
  // Paginado: Supabase corta en 1000 filas por request.
  const filas = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb
      .from('mag_consignataria_sales_lots')
      .select('date, category, provincia, price, head_count')
      .gte('date', desde)
      .gt('price', 0)
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`Supabase: ${error.message}`)
    if (!data || data.length === 0) break
    filas.push(...data)
    if (data.length < PAGE) break
  }
  return filas.filter((f) => f.category && !CATEGORIAS_EXCLUIDAS.has(f.category))
}

function bandaDe(filas) {
  const precios = filas.map((f) => Number(f.price)).sort((a, b) => a - b)
  const p10 = percentil(precios, 0.1)
  const mediana = percentil(precios, 0.5)
  const p90 = percentil(precios, 0.9)
  return {
    p10: Math.round(p10),
    mediana: Math.round(mediana),
    p90: Math.round(p90),
    amplitud_pct: p10 > 0 ? Number((((p90 / p10) - 1) * 100).toFixed(1)) : 0,
    lotes: filas.length,
    cabezas: filas.reduce((s, f) => s + (Number(f.head_count) || 0), 0),
  }
}

function isoHaceDias(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const desdeOrigen = isoHaceDias(VENTANA_ORIGEN_DIAS)
  const desdeBanda = isoHaceDias(VENTANA_DIAS)

  const todas = await traerLotes(sb, desdeOrigen)
  if (todas.length === 0) {
    console.error('Sin lotes en la ventana — no se reescribe el archivo.')
    process.exit(1)
  }

  const deBanda = todas.filter((f) => f.date >= desdeBanda)

  const categorias = {}
  for (const cat of new Set(deBanda.map((f) => f.category))) {
    const filas = deBanda.filter((f) => f.category === cat)
    if (filas.length < MIN_LOTES_BANDA) continue
    categorias[cat] = bandaDe(filas)
  }

  // Ajuste por origen: mediana provincial / mediana nacional, sobre la ventana larga.
  const origen = {}
  for (const cat of Object.keys(categorias)) {
    const filasCat = todas.filter((f) => f.category === cat)
    const medianaNac = bandaDe(filasCat).mediana
    if (!medianaNac) continue
    const porProv = []
    for (const prov of new Set(filasCat.map((f) => f.provincia).filter(Boolean))) {
      const filas = filasCat.filter((f) => f.provincia === prov)
      if (filas.length < MIN_LOTES_AJUSTE_ORIGEN) continue
      porProv.push({
        provincia: String(prov).trim().toUpperCase(),
        factor: Number((bandaDe(filas).mediana / medianaNac).toFixed(4)),
        lotes: filas.length,
      })
    }
    if (porProv.length) origen[cat] = porProv.sort((a, b) => b.lotes - a.lotes)
  }

  const fechas = deBanda.map((f) => f.date).sort()
  const salida = {
    generado: new Date().toISOString(),
    ventana_dias: VENTANA_DIAS,
    ventana_origen_dias: VENTANA_ORIGEN_DIAS,
    fecha_dato_desde: fechas[0],
    fecha_dato_hasta: fechas[fechas.length - 1],
    categorias,
    origen,
  }

  writeFileSync(OUT, JSON.stringify(salida, null, 2) + '\n')
  console.log(
    `vr-bandas.json — ${Object.keys(categorias).length} categorías, ` +
      `${deBanda.length} lotes en ${VENTANA_DIAS}d, ${fechas[0]} → ${fechas[fechas.length - 1]}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
