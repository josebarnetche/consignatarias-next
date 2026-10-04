#!/usr/bin/env node
/**
 * Cruza los leads de COMPRA abiertos contra los lotes de hacienda en vidriera.
 *
 * Corre después del scraper diario: cuando aparece un lote que le sirve a alguien
 * que ya pidió comprar, el match queda escrito y sale en el log de la corrida.
 * El que trabaja el lead decide; esto solo deja de perder el cruce.
 *
 * NO escribe datos personales: el archivo de salida lleva el id del lead, lo que
 * pidió y los sku que matchean. El contacto vive en `producer_leads` y se lee
 * desde el board, nunca desde un JSON del repo.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/lib/data')
const LOTES_PATH = resolve(DATA_DIR, 'lotes-dcac.json')
const SALIDA_PATH = resolve(DATA_DIR, 'lotes-matches.json')

const URL_SB = process.env.SUPABASE_URL
const KEY_SB = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Categorías que se consideran intercambiables para un comprador. */
const EQUIVALENTES = {
  terneros: ['terneros', 'terneras'],
  terneras: ['terneras', 'terneros'],
  novillitos: ['novillitos', 'novillos'],
  novillos: ['novillos', 'novillitos'],
  vaquillonas: ['vaquillonas', 'vaquillonas_madre', 'vaquillonas_prenadas'],
  vacas: ['vacas', 'vacas_prenadas', 'vacas_con_cria'],
  toros: ['toros'],
}

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Qué tan bien le sirve un lote a un lead, y por qué. El motivo se guarda: un
 * score sin explicación no se puede trabajar por teléfono.
 */
function evaluar(lead, lote) {
  const motivos = []
  let score = 0

  const catLead = sinTildes(lead.category)
  if (catLead) {
    const aceptadas = (EQUIVALENTES[catLead] || [catLead]).map(sinTildes)
    if (!aceptadas.includes(sinTildes(lote.categoria))) return null
    score += sinTildes(lote.categoria) === catLead ? 50 : 35
    motivos.push(sinTildes(lote.categoria) === catLead ? 'misma categoría' : 'categoría equivalente')
  } else {
    score += 15
    motivos.push('el lead no declaró categoría')
  }

  if (lead.province && lote.provincia) {
    if (sinTildes(lead.province) === sinTildes(lote.provincia)) {
      score += 35
      motivos.push('misma provincia')
    } else {
      score += 5
      motivos.push(`otra provincia (${lote.provincia})`)
    }
  }

  if (lead.head_count && lote.cabezas) {
    const ratio = lote.cabezas / lead.head_count
    if (ratio >= 0.5 && ratio <= 2) {
      score += 15
      motivos.push('cantidad compatible')
    } else if (ratio < 0.5) {
      motivos.push(`el lote es chico (${lote.cabezas} contra ${lead.head_count} pedidas)`)
    } else {
      motivos.push(`el lote es grande (${lote.cabezas} contra ${lead.head_count} pedidas)`)
    }
  }

  return score >= 35 ? { sku: lote.sku, titulo: lote.titulo, score, motivos, url: lote.url } : null
}

async function leerLeadsDeCompra() {
  if (!URL_SB || !KEY_SB) {
    console.warn('  ⚠ matcher: sin credenciales de Supabase, no se puede leer producer_leads')
    return null
  }
  const q = new URLSearchParams({
    select: 'id,created_at,intent,category,province,head_count,status',
    intent: 'eq.comprar',
    status: 'in.(new,routed,contacted,needs_review)',
    order: 'created_at.desc',
  })
  const res = await fetch(`${URL_SB}/rest/v1/producer_leads?${q}`, {
    headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}` },
  })
  if (!res.ok) {
    console.warn(`  ⚠ matcher: producer_leads respondió ${res.status}`)
    return null
  }
  return await res.json()
}

async function main() {
  const lotes = JSON.parse(readFileSync(LOTES_PATH, 'utf-8')).filter((l) => l.activo)
  const leads = await leerLeadsDeCompra()
  if (leads === null) process.exit(0)

  const matches = []
  for (const lead of leads) {
    const encontrados = lotes
      .map((l) => evaluar(lead, l))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    if (encontrados.length === 0) continue
    matches.push({
      lead_id: lead.id,
      lead_fecha: String(lead.created_at).slice(0, 10),
      pidio: {
        categoria: lead.category || null,
        provincia: lead.province || null,
        cabezas: lead.head_count || null,
        estado: lead.status,
      },
      lotes: encontrados,
    })
  }

  writeFileSync(
    SALIDA_PATH,
    JSON.stringify({ generado: new Date().toISOString(), leads_de_compra: leads.length, matches }, null, 2) + '\n',
  )

  console.log(`\n--- Lotes × leads de compra ---`)
  console.log(`Leads de compra abiertos: ${leads.length} · con al menos un lote compatible: ${matches.length}`)
  for (const m of matches) {
    const p = m.pidio
    console.log(
      `\n  Lead ${m.lead_id} (${m.lead_fecha}, ${p.estado}) pidió ${p.cabezas || '?'} ${p.categoria || 'hacienda'}${p.provincia ? ` en ${p.provincia}` : ''}`,
    )
    for (const l of m.lotes) console.log(`    ${l.score} · ${l.titulo} — ${l.motivos.join(', ')}`)
  }
  if (matches.length === 0) console.log('  (ningún cruce hoy)')
  console.log('')
}

main().catch((err) => {
  console.error('matcher falló:', err.message)
  process.exit(0) // no tira la corrida del scraper
})
