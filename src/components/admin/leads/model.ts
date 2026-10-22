/**
 * Modelo de la bandeja de leads (/admin/leads): tipos, rótulos, pestañas y
 * helpers puros. Sin React ni deps de server — se puede testear suelto.
 *
 * La forma de `Lead` y `Stats` es la que devuelve GET /api/admin/leads; no
 * agregar campos que la API no manda.
 */

import type { BadgeTone } from '@/components/ui/Badge'
import { provinciaNombre } from '@/lib/ui/tokens'
import type { OrigenLead } from '@/lib/leads/origen-admin'
import { pendienteVerificacion } from '@/lib/agente/verificacion'

export interface Lead {
  id: number
  created_at: string
  intent: string
  category: string | null
  head_count: number | null
  hectareas: number | null
  desired_price_ars: number | null
  province: string | null
  zona: string | null
  name: string
  phone: string | null
  email: string | null
  message: string | null
  source: string | null
  /** `source` en palabras, resuelto por la API (la planta con nombre, no el CUIT). */
  origen?: OrigenLead
  estimated_value_ars: number | null
  fee_pct: number
  fee_ars: number | null
  status: string
  routed_to_slug: string | null
  notes: string | null
}

export const LEAD_STATUSES = ['new', 'needs_review', 'routed', 'contacted', 'won', 'lost', 'discarded'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  new: { label: 'Nuevo', tone: 'accent' },
  needs_review: { label: 'A revisar', tone: 'warning' },
  routed: { label: 'Ruteado', tone: 'neutral' },
  contacted: { label: 'Contactado', tone: 'neutral' },
  won: { label: 'Ganado', tone: 'positive' },
  lost: { label: 'Perdido', tone: 'neutral' },
  discarded: { label: 'Descartado', tone: 'neutral' },
}

/** El paso que sigue en el embudo — el botón sugerido del panel. */
export const NEXT_STEP: Record<string, LeadStatus | undefined> = {
  new: 'routed',
  needs_review: 'routed',
  routed: 'contacted',
  contacted: 'won',
}

/**
 * El paso sugerido para ESTE lead. Un pedido del MCP o una demanda de compra sin
 * verificar no se rutea: su paso es "contacto verificado" → `new`, y ahí lo toma el
 * agente (src/lib/agente/verificacion.ts).
 */
export function siguientePaso(l: { status: string; source: string | null }): LeadStatus | undefined {
  return pendienteVerificacion(l) ? 'new' : NEXT_STEP[l.status]
}

export const INTENT_LABEL: Record<string, string> = {
  vender: 'Vende',
  comprar: 'Compra',
  tasar: 'Tasa',
  consignar: 'Consigna',
  arrendar: 'Arrienda',
  arrendar_busco: 'Busca campo',
  arrendar_ofrezco: 'Ofrece campo',
  'busca-campo': 'Busca campo',
  contactar_frigorifico: 'Frigorífico',
  contacto_proveedor: 'Proveedor',
}
export const intentLabel = (i: string) => INTENT_LABEL[i] ?? i

/* ---------- Pestañas ---------- */

export type TabKey = 'sin-trabajar' | 'ruteados' | 'contactados' | 'ganados' | 'cerrados' | 'todos'

export const TABS: Array<{ key: TabKey; label: string; statuses: string[] | null }> = [
  { key: 'sin-trabajar', label: 'Sin trabajar', statuses: ['new', 'needs_review'] },
  { key: 'ruteados', label: 'Ruteados', statuses: ['routed'] },
  { key: 'contactados', label: 'Contactados', statuses: ['contacted'] },
  { key: 'ganados', label: 'Ganados', statuses: ['won'] },
  { key: 'cerrados', label: 'Cerrados', statuses: ['lost', 'discarded'] },
  { key: 'todos', label: 'Todos', statuses: null },
]

export function inTab(l: Lead, tab: TabKey): boolean {
  const t = TABS.find((x) => x.key === tab)
  return !t?.statuses || t.statuses.includes(l.status)
}

/** La pestaña "natural" de un estado (para el deep link ?lead=). */
export function tabFor(status: string): TabKey {
  return TABS.find((t) => t.statuses?.includes(status))?.key ?? 'todos'
}

/* ---------- KPIs (misma semántica que el GET del server) ---------- */

/** Vivos para el fee potencial: igual que la API (new/routed/contacted). */
export const FEE_OPEN = ['new', 'routed', 'contacted']
export const ABIERTOS = ['new', 'needs_review', 'routed', 'contacted']

export function computeKpis(leads: Lead[]) {
  let sinTrabajar = 0
  let abiertos = 0
  let openFeePotential = 0
  let wonFee = 0
  for (const l of leads) {
    if (l.status === 'new' || l.status === 'needs_review') sinTrabajar++
    if (ABIERTOS.includes(l.status)) abiertos++
    if (FEE_OPEN.includes(l.status)) openFeePotential += Number(l.fee_ars || 0)
    if (l.status === 'won') wonFee += Number(l.fee_ars || 0)
  }
  return { sinTrabajar, abiertos, openFeePotential, wonFee }
}

/* ---------- Formato ---------- */

export const nf = (n: number) => n.toLocaleString('es-AR')
export const ars = (n: number | null | undefined) => (n ? '$' + Math.round(n).toLocaleString('es-AR') : '—')

/** "$1,2 M" / "$850 k" — para la columna angosta de la fila. */
export function arsCorto(n: number | null | undefined): string {
  if (!n) return '—'
  const a = Math.abs(n)
  if (a >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
  if (a >= 10_000) return `$${Math.round(n / 1000).toLocaleString('es-AR')} k`
  return ars(n)
}

export function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function hace(iso: string, now = Date.now()) {
  const min = (now - new Date(iso).getTime()) / 60_000
  if (min < 60) return min < 2 ? 'recién' : `${Math.round(min)} min`
  const h = min / 60
  if (h < 24) return `${Math.round(h)} h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)} d`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function ubicacion(l: Pick<Lead, 'zona' | 'province'>): string {
  return [l.zona, provinciaNombre(l.province)].filter(Boolean).join(', ')
}

export const provinciaLead = (l: Pick<Lead, 'province'>) => provinciaNombre(l.province)

/** Qué ofrece/pide, en una línea: "40 cab · novillos · pide $2.900". */
export function queBits(l: Lead): string[] {
  return [
    l.head_count ? `${nf(l.head_count)} cab` : null,
    l.hectareas ? `${nf(l.hectareas)} ha` : null,
    l.category,
    l.desired_price_ars ? `pide ${ars(l.desired_price_ars)}` : null,
  ].filter((x): x is string => Boolean(x))
}

/* ---------- Origen ---------- */

/**
 * El `source` trae CUITs e ids (`frigorifico:30718669592:otra-consulta`), así que
 * agrupar por el valor crudo daba ~33 chips. Se agrupa por familia: el prefijo
 * antes del primer ':'.
 */
export function sourceFamily(source: string | null): string {
  const s = (source || '').trim()
  if (!s) return '—'
  return s.split(':')[0].toLowerCase()
}

const FAMILY_LABEL: Record<string, string> = {
  frigorifico: 'Frigorífico',
  campos: 'Campos',
  campo: 'Aviso de campo',
  arrendamiento: 'Arrendamiento',
  'arrendamiento-liquidacion': 'Arrendamiento',
  inmag: 'INMAG',
  spread: 'Spread',
  lote: 'Lote',
  oferta: 'Oferta de lote',
  vr: 'Valor de referencia',
  proveedores: 'Proveedores',
  'vender-ahora': '¿Vendo ahora?',
  calculadora: 'Calculadora',
  '—': 'Sin origen',
}

export function familyLabel(family: string): string {
  if (FAMILY_LABEL[family]) return FAMILY_LABEL[family]
  const t = family.replace(/[-_]+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Lo que sigue a la familia, sin CUITs ni ids numéricos: "otra consulta". */
export function sourceDetail(source: string | null): string {
  const parts = (source || '').split(':').slice(1)
  return parts
    .filter((p) => p && !/^\d+$/.test(p) && !/^[0-9a-f-]{20,}$/i.test(p))
    .map((p) => p.replace(/[-_]+/g, ' '))
    .join(' · ')
}

/** Origen para leer: el que resolvió la API si vino; si no, el derivado del `source`. */
export function origenDe(l: Pick<Lead, 'source' | 'origen'>): string {
  return l.origen && l.origen.grupo !== 'Sin origen' ? l.origen.etiqueta : origenLabel(l.source)
}

export function origenLabel(source: string | null): string {
  const fam = familyLabel(sourceFamily(source))
  const det = sourceDetail(source)
  return det ? `${fam} · ${det}` : fam
}

/* ---------- Contacto ---------- */

/**
 * wa.me para un teléfono argentino, o null si no es plausible. Misma regla que
 * `whatsappLink` de lib/leads/routing.ts (no se importa: ese módulo arrastra
 * remates.json al bundle del cliente): sin 54/0, con el 9 de móvil, 10 dígitos
 * nacionales. No intenta sacar el "15" viejo.
 */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  let nacional = digits.startsWith('54') ? digits.slice(2) : digits
  nacional = nacional.replace(/^0/, '')
  const conNueve = nacional.startsWith('9') ? nacional : `9${nacional}`
  // 9 + 10 dígitos nacionales (área + abonado). Fuera de eso, el link no abre.
  if (conNueve.length !== 11) return null
  return `https://wa.me/54${conNueve}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/* ---------- Búsqueda / señales ---------- */

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function matchesSearch(l: Lead, q: string): boolean {
  const t = fold(q.trim())
  if (!t) return true
  const hay = fold(
    [l.name, l.email, l.phone, l.province, provinciaNombre(l.province), l.zona, l.source, l.message, l.category, `#${l.id}`]
      .filter(Boolean)
      .join(' '),
  )
  // Teléfono: también por dígitos ("2214189529" encuentra "+54 221 418-9529").
  const qDigits = t.replace(/\D/g, '')
  if (qDigits.length >= 4 && (l.phone || '').replace(/\D/g, '').includes(qDigits)) return true
  return t.split(/\s+/).every((w) => hay.includes(w))
}

/** Probable prueba/spam: no decide nada, sólo lo marca para descartarlo rápido. */
export function pareceTest(l: Lead): boolean {
  const s = [l.name, l.email, l.message].filter(Boolean).join(' ')
  return /\b(test|testing|prueba|asdf|qwerty|lorem)\b/i.test(s) || /@(test|example)\./i.test(l.email || '')
}

/** Clave YYYY-MM-DD en hora local (para el ritmo de 14 días). */
export function diaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function ritmo14(leads: Lead[]): Array<{ key: string; count: number }> {
  const map = new Map<string, number>()
  for (const l of leads) {
    const k = diaLocal(new Date(l.created_at))
    map.set(k, (map.get(k) || 0) + 1)
  }
  const out: Array<{ key: string; count: number }> = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(today)
    dt.setDate(dt.getDate() - i)
    const key = diaLocal(dt)
    out.push({ key, count: map.get(key) || 0 })
  }
  return out
}
