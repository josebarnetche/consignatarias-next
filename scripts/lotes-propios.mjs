#!/usr/bin/env node
/**
 * La hacienda que nos ofrecieron a nosotros, anonimizada, para publicarla en /lotes.
 *
 * Son los `producer_leads` con intent `vender`: productores que dijeron qué tienen
 * y esperan que los contactemos. Es la única oferta de la vidriera sobre la que
 * tenemos mandato, así que va primero.
 *
 * QUÉ SALE Y QUÉ NO. Sale el hecho: categoría, cabezas, provincia, fecha. NO sale
 * nada que identifique a la persona —ni nombre, ni email, ni teléfono, ni el texto
 * libre del mensaje— y tampoco el precio que pidió: publicar su piso de
 * negociación es jugarle en contra. Es el mismo criterio que ya rige en campos:
 * «el contacto del oferente NUNCA se publica, la conexión la hace Jose».
 *
 * El id interno sí viaja, porque es lo que permite que una oferta entrante vuelva
 * a cruzarse con el lead correcto (`oferta:<id>`). No dice nada de la persona.
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SALIDA = resolve(__dirname, '../src/lib/data/lotes-propios.json')

const URL_SB = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY_SB = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Estados que siguen vivos. `discarded` y los cerrados no se publican. */
const VIVOS = ['new', 'routed', 'contacted', 'needs_review']

/**
 * Piso para PUBLICAR en la vidriera (Jose, 05-10-2026). No es el piso comercial
 * de `src/lib/leads/calidad.ts` —ese son 40 cabezas y decide a quién se llama—:
 * esto es más bajo porque una oferta de 15 cabezas puede servirle a un vecino,
 * pero una de 2 le baja el nivel a la página. El lead chico NO se descarta: sigue
 * en `producer_leads` y se trabaja, solo no sale en vidriera.
 */
const CABEZAS_MINIMAS_VIDRIERA = 10

/** Los campos que se publican. Todo lo demás se descarta acá, no en la página. */
function anonimizar(l) {
  if (!l.category || !l.head_count) return null // sin categoría o sin cabezas no hay aviso
  if (Number(l.head_count) < CABEZAS_MINIMAS_VIDRIERA) return null
  return {
    id: l.id,
    categoria: String(l.category).toLowerCase(),
    cabezas: Number(l.head_count),
    provincia: l.province || null,
    desde: String(l.created_at).slice(0, 10),
  }
}

async function main() {
  if (!URL_SB || !KEY_SB) {
    console.warn('  ⚠ lotes propios: sin credenciales de Supabase, no se regenera el archivo')
    process.exit(0)
  }
  const q = new URLSearchParams({
    select: 'id,created_at,category,province,head_count,status,intent',
    intent: 'eq.vender',
    status: `in.(${VIVOS.join(',')})`,
    order: 'created_at.desc',
  })
  const res = await fetch(`${URL_SB}/rest/v1/producer_leads?${q}`, {
    headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}` },
  })
  if (!res.ok) {
    console.warn(`  ⚠ lotes propios: producer_leads respondió ${res.status}`)
    process.exit(0)
  }
  const filas = await res.json()
  const publicables = filas.map(anonimizar).filter(Boolean)

  // Guardarraíl: si por un cambio de consulta se colara un campo con datos de la
  // persona, el archivo no se escribe. Es más barato quedarse sin avisos que
  // publicar un teléfono.
  const PROHIBIDOS = ['email', 'phone', 'name', 'message', 'notes', 'desired_price_ars']
  const serializado = JSON.stringify(publicables)
  const fuga = PROHIBIDOS.filter((k) => serializado.includes(`"${k}"`))
  if (fuga.length > 0) {
    console.error(`::error::lotes propios: la salida incluía ${fuga.join(', ')} — no se escribe nada`)
    process.exit(1)
  }

  writeFileSync(SALIDA, JSON.stringify(publicables, null, 2) + '\n')
  const cabezas = publicables.reduce((a, l) => a + l.cabezas, 0)
  const chicas = filas.filter((l) => l.category && l.head_count && Number(l.head_count) < CABEZAS_MINIMAS_VIDRIERA).length
  console.log(
    `  Lotes propios: ${publicables.length} ofertas publicables (${cabezas} cabezas) de ${filas.length} leads de venta` +
      (chicas > 0 ? ` · ${chicas} por debajo de ${CABEZAS_MINIMAS_VIDRIERA} cabezas no salen en vidriera (siguen en el board)` : ''),
  )
}

main().catch((err) => {
  console.error('lotes propios falló:', err.message)
  process.exit(0) // no tira la corrida del scraper
})
