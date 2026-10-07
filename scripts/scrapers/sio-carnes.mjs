/**
 * SIO Carnes — el precio operado FUERA del Mercado Agroganadero.
 *
 * POR QUÉ IMPORTA. El informe se apoya en Cañuelas, que es la referencia, pero por
 * ahí pasa una fracción de la hacienda del país. SIO Carnes (MAGyP) publica las
 * operaciones de hacienda **con destino a faena** declaradas en todo el territorio:
 * sale de las liquidaciones electrónicas presentadas a ARCA (RG 3964/2016)
 * cruzadas con los DT-e de SENASA. Es el único dato público del precio operado
 * fuera del concentrador.
 *
 * ⚠️⚠️ SE TOMA EL AGREGADO OFICIAL, NO EL MICRODATO. El sitio ofrece las dos
 * cosas y la tentación es bajar las operaciones una por una y calcular. NO.
 * Medido sobre el export oficial de septiembre de 2026 (98.881 filas):
 *   - **33 % de las filas están duplicadas exactas.**
 *   - Las cabezas suman **9,85 millones en un mes**, más que la faena nacional de
 *     un trimestre. Hay filas con 2.649.004 cabezas pesando 13 toneladas.
 *   - El precio por kilo va de 0 a **$18.683.076**. 128 filas por encima de
 *     $8.000 y 342 por debajo de $500.
 * Calculado desde ahí, el novillo daba entre $3.600 y $5.500 el kilo; el agregado
 * oficial del mismo mes dice **$3.021**. Publicar lo primero citando a SIO Carnes
 * sería publicar un número que no pagó nadie — exactamente el error del indicador
 * de hembras que estuvo seis meses impreso al revés.
 *
 * `GetResumenPrecios` ya viene depurado del lado del servidor (con un filtro que
 * no está documentado) y cierra zona por zona contra el total nacional. Eso es lo
 * que se cita.
 *
 * LO QUE ESTE DATO NO ES. Sólo hacienda con destino a FAENA: no hay invernada, ni
 * cría, ni reposición. Y el corte es por **zona de DESTINO**, no por provincia de
 * origen: dice qué pagaron las plantas de una zona, no qué cobró el productor de
 * una provincia. Para eso haría falta el microdato, que es el que está sucio.
 *
 * Uso: node scripts/scrapers/sio-carnes.mjs 2026-09
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'

const BASE = 'https://siocarnes.magyp.gob.ar'
const UA = 'ConsignatariasBot/1.0 (+https://www.consignatarias.com.ar/mcp; agro@memola.com.ar)'
const SALIDA = 'src/lib/data/sio-carnes.json'
/** -1 es el total país; 1 a 12 son las zonas de destino; 99 es "sin determinar". */
const ZONAS = [-1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * Qué provincias cubre cada zona de destino, según `/Zonas/ListadoZona` (512
 * partidos, relevado el 06-10-2026). Sin esto una zona es un número y el lector
 * no sabe si le habla a él. La zona 9 es el NEA; la 11 y la 12 no tuvieron
 * operaciones en septiembre de 2026.
 */
export const PROVINCIAS_POR_ZONA = {
  1: 'Buenos Aires — norte y AMBA',
  2: 'Buenos Aires — centro',
  3: 'Buenos Aires — oeste y sur',
  4: 'Buenos Aires — sudeste',
  5: 'Córdoba, Santa Fe y Entre Ríos',
  6: 'La Pampa y San Luis',
  7: 'Patagonia — Neuquén, Río Negro, Chubut y Santa Cruz',
  8: 'Cuyo — San Juan, La Rioja y Mendoza',
  9: 'NEA — Chaco, Corrientes, Misiones y Formosa',
  10: 'NOA — Santiago del Estero, Salta, Tucumán y Jujuy',
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * El servidor corta conexiones sin devolver código: de 12 requests seguidos, 3
 * fallan. No es rate limiting (no hay 429 ni robots.txt), es inestabilidad. Por
 * eso todo pasa por acá.
 */
async function conReintento(url, intentos = 4) {
  let ultimo
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Referer: `${BASE}/` },
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      ultimo = e
      await dormir([2000, 5000, 15000][i] ?? 15000)
    }
  }
  throw new Error(`${url} falló tras ${intentos} intentos: ${ultimo?.message}`)
}

/** "$  3.021,43" → 3021.43 · "1.392" → 1392. Vienen como texto con formato AR. */
export function numeroAR(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  const s = String(v).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "Bovino Novillo Especial Joven Liviano hasta 430 kilos (6 dientes)" → "Novillo". */
export function categoriaBase(sub) {
  const s = String(sub || '').replace(/^Bovino\s+/i, '')
  const m = s.match(/^(Novillito|Novillo|Vaquillona|Vaca|Ternero|Ternera|Toro)/i)
  return m ? m[1] : s.split(' ')[0] || 'Otra'
}

const ultimoDia = (ym) => {
  const [a, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

/** Hasta qué día tiene datos el sistema. Se guarda para poder citarlo. */
export async function fechaDeCorte() {
  const res = await fetch(`${BASE}/MonitorSioCarnes/GetUltimaFecha`, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Length': '0' },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) return null
  const d = await res.json()
  return d?.Hasta ?? null
}

async function resumenZona(ym, zona) {
  const q = new URLSearchParams({
    desde: `01/${ym.slice(5)}/${ym.slice(0, 4)}`,
    hasta: `${ultimoDia(ym)}/${ym.slice(5)}/${ym.slice(0, 4)}`,
    offset: '0',
    limit: '200',
    id_zona: String(zona),
    id_Animal: '1', // bovino
  })
  const d = await conReintento(`${BASE}/GrillaSIOCarnes/GetResumenPrecios?${q}`)
  const filas = Array.isArray(d) ? d : d.rows || []
  return filas
    .map((f) => ({
      subcategoria: f.Subcategoria,
      categoria: categoriaBase(f.Subcategoria),
      cabezas: numeroAR(f.CabezasComercializadas),
      precio_kg: numeroAR(f.PrecioPromedioKg),
    }))
    .filter((f) => f.cabezas && f.precio_kg)
}

async function main() {
  const ym = process.argv[2]
  if (!/^\d{4}-\d{2}$/.test(ym || '')) {
    console.error('uso: node scripts/scrapers/sio-carnes.mjs YYYY-MM')
    process.exit(1)
  }

  const corte = await fechaDeCorte()
  const zonas = {}
  for (const z of ZONAS) {
    const filas = await resumenZona(ym, z)
    if (filas.length) {
      zonas[z === -1 ? 'pais' : `zona_${z}`] =
        z === -1 ? filas : { provincias: PROVINCIAS_POR_ZONA[z] ?? null, filas }
    }
    process.stderr.write(`\rzona ${z}: ${filas.length} subcategorías    `)
    await dormir(800)
  }
  process.stderr.write('\n')

  if (!zonas.pais?.length) throw new Error(`SIO Carnes no devolvió el total país para ${ym}`)

  const previo = existsSync(SALIDA) ? JSON.parse(readFileSync(SALIDA, 'utf8')) : { meses: {} }
  previo.fuente = 'SIO Carnes — MAGyP (liquidaciones electrónicas RG 3964/2016 + DT-e SENASA)'
  previo.url = `${BASE}/`
  previo.alcance = 'Hacienda bovina con destino a faena. El corte es por zona de DESTINO, no por provincia de origen.'
  previo.meses[ym] = { generadoEl: new Date().toISOString(), fechaDeCorte: corte, zonas }
  mkdirSync('src/lib/data', { recursive: true })
  writeFileSync(SALIDA, JSON.stringify(previo, null, 1) + '\n')

  const pais = zonas.pais
  const cab = pais.reduce((s, f) => s + f.cabezas, 0)
  console.error(
    `${ym}: ${pais.length} subcategorías país, ${cab.toLocaleString('es-AR')} cabezas, ` +
      `${Object.keys(zonas).length - 1} zonas. Corte del sistema: ${corte}. → ${SALIDA}`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
