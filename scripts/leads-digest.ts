#!/usr/bin/env npx tsx
/**
 * Digest diario de leads abiertos: qué hay, cuánto vale y qué sigue.
 *
 * Por qué existe: el acuse automático le promete al productor «te vamos a
 * contactar a la brevedad». El 04-10-2026 había 22 leads en `new`/`needs_review`,
 * uno de 1.500 cabezas con 19 días encima. El aviso de lead nuevo ya existía —
 * lo que faltaba era algo que todas las mañanas diga qué quedó sin responder y
 * en qué orden conviene llamar.
 *
 * NO manda nada a los leads. Va sólo a LEAD_ALERT_TO (casillas de la casa). Todo
 * correo al productor lo aprueba Jose uno por uno.
 *
 * Uso:
 *   npx tsx scripts/leads-digest.ts            → imprime nada más
 *   npx tsx scripts/leads-digest.ts --enviar    → además manda el digest interno
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { calificarLead, proximaAccion, ORDEN_NIVEL, type NivelLead } from '../src/lib/leads/calidad'
import { sendDigestEmail, LEAD_ALERT_TO } from '../src/lib/email'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MATCHES_PATH = resolve(__dirname, '../src/lib/data/lotes-matches.json')

const ENVIAR = process.argv.includes('--enviar')
const ABIERTOS = ['new', 'needs_review', 'routed']

type Fila = {
  id: number
  created_at: string
  intent: string
  category: string | null
  province: string | null
  head_count: number | null
  desired_price_ars: string | number | null
  status: string
  email: string | null
  phone: string | null
}

const ETIQUETA: Record<NivelLead, string> = {
  pro: 'PRO — operación grande',
  trabajable: 'TRABAJABLES',
  contacto: 'CONSULTAS A PLANTAS — rutear',
  sin_datos: 'FALTA PREGUNTAR',
  chico: 'CHICOS — no se derivan',
}

function matchesDeLotes(): Map<number, { titulo: string; score: number }[]> {
  try {
    const j = JSON.parse(readFileSync(MATCHES_PATH, 'utf-8'))
    return new Map((j.matches || []).map((m: any) => [m.lead_id, m.lotes || []]))
  } catch {
    return new Map()
  }
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data, error } = await sb
    .from('producer_leads')
    .select('id,created_at,intent,category,province,head_count,desired_price_ars,status,email,phone')
    .in('status', ABIERTOS)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('no se pudieron leer los leads:', error.message)
    process.exit(1)
  }

  const lotes = matchesDeLotes()
  const filas = (data as Fila[]).map((l) => {
    const c = calificarLead({
      intent: l.intent,
      category: l.category,
      province: l.province,
      headCount: l.head_count,
      desiredPriceArs: l.desired_price_ars ? Number(l.desired_price_ars) : null,
      status: l.status,
      createdAt: l.created_at,
    })
    return { lead: l, cal: c, accion: proximaAccion(c, l.intent), lotes: lotes.get(l.id) || [] }
  })

  filas.sort(
    (a, b) =>
      ORDEN_NIVEL[a.cal.nivel] - ORDEN_NIVEL[b.cal.nivel] ||
      (b.cal.diasSinContactar ?? 0) - (a.cal.diasSinContactar ?? 0),
  )

  const porNivel = (n: NivelLead) => filas.filter((f) => f.cal.nivel === n)
  const masViejo = Math.max(0, ...filas.map((f) => f.cal.diasSinContactar ?? 0))
  const resumen =
    `${filas.length} leads abiertos · ${porNivel('pro').length} pro · ${porNivel('trabajable').length} trabajables · ` +
    `${porNivel('sin_datos').length} sin datos · ${porNivel('chico').length} chicos · el más viejo, ${masViejo} días sin contactar`

  console.log(`\n=== Leads abiertos — ${new Date().toISOString().slice(0, 10)} ===`)
  console.log(resumen + '\n')

  const bloques: string[] = []
  for (const nivel of ['pro', 'trabajable', 'contacto', 'sin_datos', 'chico'] as NivelLead[]) {
    const grupo = porNivel(nivel)
    if (grupo.length === 0) continue
    console.log(`-- ${ETIQUETA[nivel]} (${grupo.length})`)
    const items = grupo.map((f) => {
      const l = f.lead
      const quien = [l.intent, l.head_count ? `${l.head_count} cab` : null, l.category, l.province]
        .filter(Boolean)
        .join(' · ')
      const dias = f.cal.diasSinContactar
      const via = l.email ? 'email' : l.phone ? 'teléfono' : 'SIN contacto'
      const lot = f.lotes.length ? ` · ${f.lotes.length} lote(s) compatibles: ${f.lotes[0].titulo}` : ''
      console.log(`   #${l.id} ${quien} — ${dias != null ? `${dias}d` : 'contactado'} · ${via}${lot}`)
      console.log(`      → ${f.accion}`)
      return (
        `<li style="margin:0 0 12px"><strong>#${l.id}</strong> ${quien}` +
        `${dias != null ? ` — <strong>${dias} días</strong> sin contactar` : ''} · ${via}${lot}` +
        `<br><span style="color:#555">→ ${f.accion}</span></li>`
      )
    })
    bloques.push(`<h3 style="margin:18px 0 6px">${ETIQUETA[nivel]} (${grupo.length})</h3><ul style="padding-left:18px;margin:0">${items.join('')}</ul>`)
    console.log('')
  }

  if (!ENVIAR) {
    console.log('(no se envió: correr con --enviar para mandarlo a las casillas de la casa)\n')
    return
  }

  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:680px"><p style="margin:0 0 4px"><strong>${resumen}</strong></p>` +
    `<p style="margin:0 0 8px;color:#555;font-size:13px">El acuse automático promete contacto "a la brevedad". Esto es lo que quedó sin responder.</p>` +
    bloques.join('') +
    `<p style="margin:18px 0 0;font-size:12px;color:#777">Board: https://www.consignatarias.com.ar/admin/leads · umbrales en src/lib/leads/calidad.ts</p></div>`

  for (const to of LEAD_ALERT_TO) {
    const r = await sendDigestEmail(to, { subject: `Leads abiertos: ${filas.length} · ${porNivel('pro').length} pro · el más viejo ${masViejo}d`, html })
    console.log(r.success ? `enviado a ${to}` : `falló a ${to}: ${r.error}`)
  }
}

main().catch((err) => {
  console.error('digest falló:', err instanceof Error ? err.message : err)
  process.exit(1)
})
