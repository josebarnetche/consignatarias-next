/**
 * Precomputa las bandas del VR (Valor de Referencia) desde el dato de lote del MAG
 * y las escribe en src/lib/data/vr-bandas.json.
 *
 * Corre una vez por día, después de mag-lots-pipeline.yml. Hace dos cosas:
 *
 *  1. Escribe `src/lib/data/vr-bandas.json` con la banda VIGENTE. Se commitea, y
 *     `src/lib/vr.ts` lo lee síncrono para no meter una query de percentiles en el
 *     camino caliente del MCP ni volver dinámicas las páginas SSG.
 *  2. Inserta esa misma banda en `vr_bandas_history`, que es la SERIE. El JSON se
 *     pisa en cada corrida; la tabla acumula. Sin el paso 2 no hay forma de
 *     responder "¿se está abriendo la dispersión?", que es lo que compra quien
 *     modela riesgo.
 *
 * Env:
 *   SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VR_SIN_SERIE=1   → escribe sólo el JSON y NO toca `vr_bandas_history`. Es el modo
 *                      para correrlo a mano desde una máquina de desarrollo: la serie
 *                      es de producción y la escribe únicamente el workflow.
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
/** Puntos de tendencia que se embeben en el JSON para la sparkline pública. */
const PUNTOS_TENDENCIA = 12

const MIN_LOTES_BANDA = 10
const MIN_LOTES_AJUSTE_ORIGEN = 30
/**
 * Piso de la SERIE. Es 30 y no 10 a propósito: `getReferencia` colapsa las bandas
 * de menos de 30 lotes en la mediana con amplitud 0. Si la serie aceptara 10, la
 * misma categoría y fecha daría amplitud 0 por `?vr=1` y una banda ancha por
 * `?vr=historico`. Debe coincidir con MIN_LOTES_BANDA_COMPLETA de src/lib/vr.ts.
 */
const MIN_LOTES_SERIE = 30

/**
 * Banda por rango de peso. Medido el 21-sep sobre 30 días de lotes: dentro de una misma
 * categoría el peso mueve la mediana más que el origen — vaca de 250-299 kg a 2.400 $/kg
 * contra 3.200 a 500-549 kg (+33 %); vaquillona 4.850 → 3.500 entre 250 y 500 kg (−28 %).
 * El productor que carga su rodeo SABE el peso, así que valuarlo contra toda la categoría
 * tira información que tiene. Rangos de 50 kg; se publica un rango sólo con la misma base
 * que la banda completa (30 lotes). Con menos, `vr.ts` cae a la banda de la categoría y
 * lo dice.
 */
const RANGO_PESO_KG = 50
const MIN_LOTES_RANGO_PESO = 30

/** Versión de metodología. Forma parte de la PK de la serie: un cambio de cálculo
 *  crea una serie nueva en vez de pisar la vieja. Debe coincidir con VR_METODOLOGIA
 *  de src/lib/vr.ts. */
const METODOLOGIA = 'VR v1.0'

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
      .select('date, category, provincia, price, head_count, kg_avg')
      .gte('date', desde)
      .gt('price', 0)
      // El orden NO es cosmético: sin ORDER BY, LIMIT/OFFSET puede repetir o
      // saltear filas entre páginas, y son ~19 páginas sobre 18k+ lotes.
      .order('id', { ascending: true })
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

/** Resta días a una fecha ISO sin pasar por la zona horaria local. */
function isoRestar(iso, dias) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10)
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const desdeOrigen = isoHaceDias(VENTANA_ORIGEN_DIAS)
  const todas = await traerLotes(sb, desdeOrigen)

  // La ventana se ancla en la ÚLTIMA RUEDA CON DATO, no en el reloj de la corrida.
  // Si se anclara en "hoy", una corrida fuera de cron (o un día sin operaciones)
  // recalcularía el MISMO punto de la serie con una ventana distinta y lo pisaría:
  // la PK promete reproducibilidad y esto la rompía en silencio. Pasó de verdad —
  // el primer backfill quedó con fecha 2026-09-18 y ventana arrancando el 08-21
  // en vez del 08-19, porque se generó un domingo.
  const ultimaRueda = todas.reduce((max, f) => (f.date > max ? f.date : max), '')
  const desdeBanda = isoRestar(ultimaRueda, VENTANA_DIAS)
  const deBanda = todas.filter((f) => f.date > desdeBanda && f.date <= ultimaRueda)

  // El guard mira la ventana de la BANDA, no la de origen: si el pipeline estuvo
  // caído varias semanas, `todas` puede traer datos viejos mientras `deBanda`
  // queda vacío. Reescribir con categorias:{} tiraría 404 las seis páginas /vr
  // y dejaría temporalCoverage en "undefined/undefined". Mejor no tocar nada:
  // una banda vieja se declara por su fecha, un archivo vacío miente.
  if (deBanda.length === 0) {
    console.error(
      `Sin lotes en los últimos ${VENTANA_DIAS} días — se conserva el archivo anterior.`,
    )
    process.exit(1)
  }

  const categorias = {}
  for (const cat of new Set(deBanda.map((f) => f.category))) {
    const filas = deBanda.filter((f) => f.category === cat)
    if (filas.length < MIN_LOTES_BANDA) continue
    categorias[cat] = bandaDe(filas)
  }

  // Banda por rango de peso, sobre la misma ventana que la banda de la categoría.
  const por_peso = {}
  for (const cat of Object.keys(categorias)) {
    const grupos = new Map()
    for (const f of deBanda) {
      if (f.category !== cat) continue
      const kg = Number(f.kg_avg)
      if (!(kg > 0)) continue
      const desde = Math.floor(kg / RANGO_PESO_KG) * RANGO_PESO_KG
      if (!grupos.has(desde)) grupos.set(desde, [])
      grupos.get(desde).push(f)
    }
    const rangos = [...grupos.entries()]
      .filter(([, filas]) => filas.length >= MIN_LOTES_RANGO_PESO)
      .map(([desde, filas]) => ({ desde_kg: desde, hasta_kg: desde + RANGO_PESO_KG - 1, ...bandaDe(filas) }))
      .sort((a, b) => a.desde_kg - b.desde_kg)
    if (rangos.length) por_peso[cat] = rangos
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
    rango_peso_kg: RANGO_PESO_KG,
    fecha_dato_desde: fechas[0],
    fecha_dato_hasta: fechas[fechas.length - 1],
    categorias,
    por_peso,
    origen,
  }

  // La serie, fechada en la ÚLTIMA RUEDA del dato y no en "hoy": así una corrida
  // que se ejecuta un día sin operaciones no inventa un punto nuevo, y un re-run
  // del mismo día es idempotente por la PK.
  const fechaSerie = ultimaRueda
  const filas = Object.entries(categorias).map(([category, b]) => ({
    date: fechaSerie,
    category,
    metodologia: METODOLOGIA,
    p10: b.p10,
    mediana: b.mediana,
    p90: b.p90,
    amplitud_pct: b.amplitud_pct,
    lotes: b.lotes,
    cabezas: b.cabezas,
    ventana_dias: VENTANA_DIAS,
  }))
  // Los CHECK de la tabla rechazarían una banda desordenada o sin base; filtrar
  // acá evita que una fila mala aborte el upsert entera y deje la serie sin el día.
  const validas = filas.filter(
    (f) => f.p10 > 0 && f.p10 <= f.mediana && f.mediana <= f.p90 && f.lotes >= MIN_LOTES_SERIE,
  )
  if (validas.length !== filas.length) {
    console.warn(
      `Descartadas ${filas.length - validas.length} bandas de la serie (invariantes o menos de ${MIN_LOTES_SERIE} lotes).`,
    )
  }
  if (process.env.VR_SIN_SERIE === '1') {
    console.log('VR_SIN_SERIE=1 — no se escribe vr_bandas_history.')
  } else if (validas.length > 0) {
    const { error } = await sb
      .from('vr_bandas_history')
      .upsert(validas, { onConflict: 'date,category,metodologia' })
    if (error) {
      // No aborta: el JSON de la banda vigente es lo que sirven las superficies,
      // y perder un punto de la serie es recuperable con un re-run.
      console.error(`No se pudo escribir la serie histórica: ${error.message}`)
    } else {
      console.log(`vr_bandas_history — ${validas.length} filas al ${fechaSerie}`)
    }
  }

  // Tendencia para la sparkline pública: los últimos N puntos de la serie, leídos
  // de vuelta de la tabla. Se embeben en el JSON a propósito — así las páginas /vr
  // siguen siendo SSG puro y no agregan una query de build ni un fetch de runtime.
  // Que la serie completa sea Enterprise y la tendencia corta sea pública es la
  // misma doctrina de siempre: el número se ve, la profundidad se paga.
  const { data: hist, error: errHist } = await sb
    .from('vr_bandas_history')
    .select('date, category, amplitud_pct, mediana')
    .eq('metodologia', METODOLOGIA)
    .order('date', { ascending: false })
    .limit(PUNTOS_TENDENCIA * 20)
  if (errHist) {
    console.error(`No se pudo leer la tendencia: ${errHist.message}`)
  } else if (hist) {
    const porCat = {}
    for (const r of hist) {
      const arr = (porCat[r.category] ??= [])
      if (arr.length < PUNTOS_TENDENCIA) arr.push(r)
    }
    salida.tendencia = Object.fromEntries(
      Object.entries(porCat).map(([cat, filas]) => [
        cat,
        filas
          .slice()
          .reverse()
          .map((f) => ({
            date: f.date,
            amplitud: Number(f.amplitud_pct),
            mediana: Number(f.mediana),
          })),
      ]),
    )
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
