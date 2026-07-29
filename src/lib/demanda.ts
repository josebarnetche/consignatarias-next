/**
 * GROWTH ENGINE — demanda de compra de hacienda.
 * "Quiero comprar 300 terneros en Corrientes" → (1) matching inmediato contra
 * los remates programados del scrape diario, (2) demanda persistida: el cron
 * demanda-matching avisa al comprador de cada remate nuevo que matchee,
 * (3) lead interno a LEAD_ALERT_TO (comprador + volumen + contacto = el activo
 * del motor comisionista). Entra por MCP (agentes) o /quiero-comprar (web).
 */
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { requireServiceClient } from '@/lib/supabase'
import { sendDemandaLeadInternal, sendDemandaMatchAlert } from '@/lib/email'

const auctions = rematesData as Auction[]
const BASE_URL = 'https://www.consignatarias.com.ar'

export const CATEGORIAS_DEMANDA = ['terneros', 'novillos', 'vaquillonas', 'vaca_gorda', 'toros', 'mixto'] as const
export type CategoriaDemanda = (typeof CATEGORIAS_DEMANDA)[number]

/** Sinónimos que tira la gente / los agentes → categoría canónica de remates. */
const CATEGORIA_ALIASES: Record<string, CategoriaDemanda> = {
  terneros: 'terneros', ternero: 'terneros', ternera: 'terneros', terneras: 'terneros', destete: 'terneros', invernada: 'terneros',
  novillos: 'novillos', novillo: 'novillos', novillitos: 'novillos', novillito: 'novillos',
  vaquillonas: 'vaquillonas', vaquillona: 'vaquillonas',
  vacas: 'vaca_gorda', vaca: 'vaca_gorda', vaca_gorda: 'vaca_gorda', 'vaca gorda': 'vaca_gorda', conserva: 'vaca_gorda',
  toros: 'toros', toro: 'toros', reproductores: 'toros', reproductor: 'toros',
  mixto: 'mixto', mixta: 'mixto', general: 'mixto', hacienda: 'mixto',
}

export function normalizarCategoria(raw: unknown): CategoriaDemanda | null {
  const k = String(raw ?? '').trim().toLowerCase()
  return CATEGORIA_ALIASES[k] ?? null
}

// Misma fórmula que /remates/[slug]/page.tsx (generateRemateSlug). Este slug es
// además la CLAVE ESTABLE de notificación: los `id` numéricos de remates.json se
// reasignan en cada scrape (¡no son estables!) y usarlos de clave re-avisaba
// remates ya vistos — el bug de los 20+ mails del 28-jul.
function remateSlug(r: Auction): string {
  return [
    r.consignatariaSlug || 'remate',
    r.type || 'general',
    r.province?.toLowerCase().replace(/\s+/g, '-') || 'argentina',
    r.date,
  ].join('-')
}

function remateUrl(r: Auction): string {
  return `${BASE_URL}/remates/${remateSlug(r)}`
}

export interface RemateMatch {
  id: number
  key: string
  titulo: string
  consignataria: string
  fecha: string
  hora: string | null
  lugar: string
  provincia: string
  categoria: string
  cabezas_estimadas: number | null
  url: string
}

/**
 * Remates programados que matchean la demanda. Un remate 'mixto' matchea
 * cualquier categoría (los remates-feria llevan de todo); si se pide 'mixto',
 * matchea todos. Provincia por subcadena, insensible a mayúsculas.
 */
export function matchRemates(categoria: CategoriaDemanda, provincia?: string | null, limite = 5): RemateMatch[] {
  const hoy = new Date().toISOString().slice(0, 10)
  const prov = provincia?.trim().toLowerCase() || null
  return auctions
    .filter((r) => r.status === 'scheduled' && r.date >= hoy)
    .filter((r) => categoria === 'mixto' || r.mainCategory === 'mixto' || r.mainCategory === categoria)
    .filter((r) => !prov || r.province.toLowerCase().includes(prov) || r.location.toLowerCase().includes(prov))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limite)
    .map((r) => ({
      id: r.id,
      key: remateSlug(r),
      titulo: r.title,
      consignataria: r.consignatariaName,
      fecha: r.date,
      hora: r.time,
      lugar: r.location,
      provincia: r.province,
      categoria: r.mainCategory,
      cabezas_estimadas: r.estimatedHeads,
      url: remateUrl(r),
    }))
}

export interface DemandaInput {
  categoria: CategoriaDemanda
  cabezas: number | null
  provincia: string | null
  email: string | null
  webhookUrl: string | null
  origen: 'mcp' | 'web'
  originIp: string
  notas?: string | null
}

/**
 * Crea la demanda, siembra como "ya avisados" los matches devueltos en la
 * respuesta (el cron solo avisa remates NUEVOS) y dispara el lead interno.
 */
export async function crearDemanda(input: DemandaInput): Promise<{ id: number; matches: RemateMatch[] }> {
  const matches = matchRemates(input.categoria, input.provincia)
  // Sembrar TODOS los matches actuales (no solo los 5 mostrados): el cron avisa
  // únicamente remates genuinamente nuevos respecto del momento de creación.
  const todosLosMatches = matchRemates(input.categoria, input.provincia, 1000)
  const service = requireServiceClient()

  const { data, error } = await service
    .from('demanda_compra')
    .insert({
      categoria: input.categoria,
      cabezas: input.cabezas,
      provincia: input.provincia,
      email: input.email,
      webhook_url: input.webhookUrl,
      origen: input.origen,
      origin_ip: input.originIp,
      notas: input.notas ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`No se pudo registrar la demanda: ${error.message}`)

  if (todosLosMatches.length > 0) {
    await service
      .from('demanda_notificaciones')
      .insert(todosLosMatches.map((m) => ({ demanda_id: data.id, remate_key: m.key, remate_id: m.id })))
  }

  // Lead interno (fire-and-forget): la demanda ES el activo del motor comisionista.
  sendDemandaLeadInternal({
    id: data.id,
    categoria: input.categoria,
    cabezas: input.cabezas,
    provincia: input.provincia,
    email: input.email,
    webhookUrl: input.webhookUrl,
    origen: input.origen,
    matches: matches.length,
  })

  return { id: data.id, matches }
}

export function formatMatches(matches: RemateMatch[]): string {
  if (matches.length === 0) return 'Ahora mismo no hay remates programados que matcheen — te avisamos apenas aparezca uno.'
  return matches
    .map((m) => `· ${m.fecha}${m.hora ? ` ${m.hora}` : ''} — ${m.consignataria} · ${m.lugar}${m.cabezas_estimadas ? ` · ~${m.cabezas_estimadas.toLocaleString('es-AR')} cab` : ''}\n  ${m.url}`)
    .join('\n')
}

/**
 * Pase del cron post-scrape: por cada demanda activa, detectar remates matcheados
 * aún no notificados (por CLAVE ESTABLE, no id) y avisar con UN email resumen por
 * corrida (no un mail por remate — el bug de spam del 28-jul). El webhook sí va
 * por remate (los consumidores programáticos esperan un evento por entidad).
 */
export async function notificarDemandas(): Promise<{ demandas: number; avisos: number; errores: number }> {
  const service = requireServiceClient()
  const out = { demandas: 0, avisos: 0, errores: 0 }

  const { data: demandas, error } = await service
    .from('demanda_compra')
    .select('id, categoria, cabezas, provincia, email, webhook_url')
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  if (!demandas?.length) return out

  const { data: yaAvisadas } = await service
    .from('demanda_notificaciones')
    .select('demanda_id, remate_key')
    .in('demanda_id', demandas.map((d) => d.id))
  const avisadasSet = new Set((yaAvisadas ?? []).map((n) => `${n.demanda_id}:${n.remate_key}`))

  for (const d of demandas) {
    out.demandas++
    const cat = normalizarCategoria(d.categoria) ?? 'mixto'
    const nuevos = matchRemates(cat, d.provincia, 50).filter((m) => !avisadasSet.has(`${d.id}:${m.key}`))
    if (nuevos.length === 0) continue

    try {
      // Registrar ANTES de avisar: si el email/webhook falla, preferimos perder un
      // aviso a repetirlo (el calendario completo siempre está en /remates).
      const { error: insErr } = await service
        .from('demanda_notificaciones')
        .insert(nuevos.map((m) => ({ demanda_id: d.id, remate_key: m.key, remate_id: m.id })))
      if (insErr) { out.errores++; continue }

      if (d.email) {
        sendDemandaMatchAlert({
          to: d.email,
          categoria: d.categoria,
          cabezas: d.cabezas,
          remates: nuevos.map((m) => ({ titulo: m.titulo, consignataria: m.consignataria, fecha: m.fecha, lugar: m.lugar, url: m.url })),
        })
      }
      if (d.webhook_url) {
        for (const m of nuevos) {
          await fetch(d.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'remate.matched', demanda_id: d.id, remate: m }),
            signal: AbortSignal.timeout(10_000),
          }).catch(() => { out.errores++ })
        }
      }
      out.avisos += nuevos.length
    } catch {
      out.errores++
    }
  }
  return out
}
