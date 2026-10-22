/**
 * El registro con consentimiento de `market_match`: de una consulta en un agente
 * a un lead en la mesa del closer.
 *
 * Tres condiciones, sin excepción (con test):
 *  · `consentimiento === true` explícito: el agente tiene que haberle preguntado
 *    a la persona. Un `"si"`, un 1 o la ausencia no alcanzan.
 *  · un nombre y al menos un email o teléfono que parezcan reales;
 *  · nada que no haya dicho la persona: la fila lleva lo que vino en la consulta.
 */
import crypto from 'crypto'
import { estimateOperation } from '@/lib/leads/routing'
import { triageLead } from '@/lib/leads/triage'
import type { ProducerLeadInsert } from '@/lib/leads/insertar-lead'
import type { ConsultaMercado } from './market-match'

export const SOURCE_MARKET_MATCH = 'mcp:market_match'

export interface ContactoConsentido {
  nombre?: unknown
  email?: unknown
  telefono?: unknown
  consentimiento?: unknown
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export function validarContacto(c: ContactoConsentido): { ok: true; nombre: string; email: string | null; telefono: string | null } | { ok: false; motivo: string } {
  if (c.consentimiento !== true) {
    return { ok: false, motivo: 'Falta consentimiento: true. Preguntale a la persona si quiere que consignatarias.com la contacte para armar la operación.' }
  }
  const nombre = texto(c.nombre, 120)
  if (!nombre || nombre.length < 2) return { ok: false, motivo: 'Falta el nombre de la persona.' }
  const email = texto(c.email, 160)?.toLowerCase() ?? null
  const telefono = texto(c.telefono, 40)
  const emailOk = email && EMAIL.test(email) ? email : null
  const telOk = telefono && telefono.replace(/\D/g, '').length >= 8 ? telefono : null
  if (!emailOk && !telOk) return { ok: false, motivo: 'Hace falta un email válido o un teléfono (8 dígitos o más).' }
  return { ok: true, nombre, email: emailOk, telefono: telOk }
}

export function consultaALead(
  q: ConsultaMercado,
  contacto: { nombre: string; email: string | null; telefono: string | null },
  ip?: string | null,
): ProducerLeadInsert {
  const esCampo = q.quiere.startsWith('arrendar') || q.quiere === 'tasar' || Boolean(q.hectareas)
  const headCount = !esCampo && q.cabezas && q.cabezas > 0 ? Math.round(q.cabezas) : null
  const hectareas = esCampo && q.hectareas && q.hectareas > 0 ? Math.round(q.hectareas) : null
  const category = esCampo ? null : (q.categoria?.toLowerCase().slice(0, 40) ?? null)
  const province = q.provincia?.slice(0, 60) ?? null
  const est = esCampo ? { estimatedValueArs: null, feeArs: null, feePct: 1 } : estimateOperation({ headCount, category })
  const message = 'Consulta desde un agente de IA (MCP, market_match) con consentimiento explícito para ser contactado.'
  const triage = triageLead({ intent: q.quiere, province, headCount, hectareas, message, name: contacto.nombre })
  return {
    intent: q.quiere,
    category,
    head_count: headCount,
    hectareas,
    province,
    name: contacto.nombre,
    email: contacto.email,
    phone: contacto.telefono,
    message,
    source: SOURCE_MARKET_MATCH,
    estimated_value_ars: est.estimatedValueArs,
    fee_pct: est.feePct,
    fee_ars: est.feeArs,
    // Lo que deja un agente no está verificado: el consentimiento es un booleano que
    // manda el agente y nada impide cargar el email de otro. Entra a revisión; lo
    // pasa a `new` una persona después de confirmar el contacto.
    status: 'needs_review',
    notes: `MCP sin verificar: confirmar el contacto antes de trabajarlo.${triage.motivo ? ` ${triage.motivo}` : ''}`,
    ip_hash: ip ? crypto.createHash('sha256').update(ip + contacto.nombre).digest('hex').slice(0, 16) : null,
  }
}
