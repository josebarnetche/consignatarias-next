/**
 * La casilla del agente: `agente@consignatarias.com` (Hostinger).
 *
 * Sale por Resend (consignatarias.com es el dominio verificado) con responder-a
 * la misma casilla, y entra por IMAP. Cada correo que sale lleva un Message-ID
 * propio que guardamos: la respuesta trae ese id en In-Reply-To y así se sabe a
 * qué caso pertenece sin adivinar.
 */
import { randomUUID } from 'node:crypto'
import type { Resend } from 'resend'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { aHtml, type Correo } from './mensajes'

export const CASILLA = process.env.AGENTE_EMAIL || 'agente@consignatarias.com'
const FROM = `Consignatarias <${CASILLA}>`

let resend: Resend | null = null
async function cliente(): Promise<Resend | null> {
  if (resend) return resend
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  const { Resend: R } = await import('resend')
  resend = new R(key)
  return resend
}

export interface Enviado {
  ok: boolean
  messageId: string
  error?: string
}

export async function enviar(o: {
  para: string | string[]
  correo: Correo
  /** Message-ID del correo al que se responde: mantiene el hilo en el cliente de correo. */
  enRespuestaA?: string | null
  /** Para contactos que no nos escribieron: encabezado de baja en un clic. */
  conBaja?: boolean
  /** Solo para los avisos internos: que la respuesta de José vaya directo a quien escribió. */
  responderA?: string
}): Promise<Enviado> {
  const messageId = `<agente-${randomUUID()}@consignatarias.com>`
  const r = await cliente()
  if (!r) return { ok: false, messageId, error: 'sin RESEND_API_KEY' }
  const headers: Record<string, string> = { 'Message-ID': messageId }
  if (o.enRespuestaA) {
    headers['In-Reply-To'] = o.enRespuestaA
    headers.References = o.enRespuestaA
  }
  if (o.conBaja) headers['List-Unsubscribe'] = `<mailto:${CASILLA}?subject=BAJA>`
  try {
    const { error } = await r.emails.send({
      from: FROM,
      to: o.para,
      replyTo: o.responderA || CASILLA,
      subject: o.correo.asunto,
      text: o.correo.texto,
      html: aHtml(o.correo.texto),
      headers,
    })
    if (error) return { ok: false, messageId, error: `${error.name ?? ''} ${error.message ?? ''}`.trim() }
    return { ok: true, messageId }
  } catch (e) {
    return { ok: false, messageId, error: e instanceof Error ? e.message : String(e) }
  }
}

export interface Entrante {
  uid: number
  messageId: string
  inReplyTo: string | null
  references: string[]
  de: string
  asunto: string
  texto: string
  headers: Record<string, string | undefined>
}

/**
 * Lee los correos sin leer y se los pasa a `procesar` uno por uno. Solo los marca
 * como leídos si `procesar` termina bien: un fallo a mitad de camino se reintenta
 * en la próxima corrida (y `agente_mensajes.message_id` único evita el doble proceso).
 */
export async function leerBandeja(procesar: (m: Entrante) => Promise<void>, max = 25): Promise<{ leidos: number; errores: string[] }> {
  const pass = process.env.AGENTE_IMAP_PASSWORD
  if (!pass) return { leidos: 0, errores: ['sin AGENTE_IMAP_PASSWORD'] }
  const imap = new ImapFlow({
    host: process.env.AGENTE_IMAP_HOST || 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: { user: CASILLA, pass },
    logger: false,
  })
  const errores: string[] = []
  let leidos = 0
  await imap.connect()
  const lock = await imap.getMailboxLock('INBOX')
  try {
    const uids = (await imap.search({ seen: false }, { uid: true })) || []
    for (const uid of uids.slice(0, max)) {
      const msg = await imap.fetchOne(String(uid), { source: true }, { uid: true })
      if (!msg || !msg.source) continue
      const p = await simpleParser(msg.source)
      const headers: Record<string, string | undefined> = {}
      for (const [k, v] of p.headers) headers[k.toLowerCase()] = typeof v === 'string' ? v : undefined
      const refs = Array.isArray(p.references) ? p.references : p.references ? [p.references] : []
      const m: Entrante = {
        uid,
        messageId: p.messageId || `<sin-id-${uid}@imap>`,
        inReplyTo: p.inReplyTo || null,
        references: refs,
        de: (p.from?.value?.[0]?.address || '').toLowerCase(),
        asunto: p.subject || '',
        texto: p.text || '',
        headers,
      }
      try {
        await procesar(m)
        await imap.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
        leidos++
      } catch (e) {
        errores.push(`${m.messageId}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  } finally {
    lock.release()
    await imap.logout().catch(() => {})
  }
  return { leidos, errores }
}
