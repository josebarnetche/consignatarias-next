import type { Resend } from 'resend'
import { SEGMENT_SOURCES, PRODUCT_UPDATE_ONLY } from './newsletter-segments'
import { computeSpread, spreadReading } from './leads/spread'

let resendInstance: Resend | null = null

async function getResend(): Promise<Resend | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (resendInstance) return resendInstance
  const { Resend: R } = await import('resend')
  resendInstance = new R(key)
  return resendInstance
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Consignatarias <noreply@consignatarias.com>'
// Personal sender for cold outreach. Visible name = human, address = verified domain.
// "noreply@" kills reply intent; never use it for asks-for-response emails.
// IMPORTANT: only consignatarias.com is verified in Resend. memola.com.ar is NOT.
// Any from: address must end in @consignatarias.com or Resend rejects the send.
const FROM_PERSONAL = process.env.RESEND_FROM_PERSONAL || 'José Barnetche <hola@consignatarias.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

/* ------------------------------------------------------------------ */
/*  MARCA EN EMAILS — header/footer del isotipo (v1.114.0)             */
/*  Solo para templates HTML de producto. Los mails PERSONALES de      */
/*  outreach (texto plano, "escritos desde Gmail") NO llevan marca:    */
/*  es diseño deliberado, no un olvido.                                */
/* ------------------------------------------------------------------ */

export function emailBrandHeader(dark = false): string {
  const iso = `${APP_URL}/marca/email/isotipo-${dark ? 'cielo' : 'carbon'}.png`
  const color = dark ? '#fafafa' : '#18181b'
  const border = dark ? '#27272a' : '#e4e4e7'
  return `<div style="padding:0 0 14px 0;border-bottom:1px solid ${border};margin-bottom:18px">` +
    `<img src="${iso}" width="26" height="26" alt="" style="vertical-align:middle;border:0">` +
    `<span style="font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:600;color:${color};vertical-align:middle;margin-left:8px">consignatarias<span style="color:#38bdf8">.</span>com</span>` +
    `</div>`
}

export function emailBrandFooter(dark = false): string {
  const muted = dark ? '#71717a' : '#888888'
  return `<p style="font-family:ui-monospace,Menlo,monospace;color:${muted};font-size:11px;margin-top:22px;border-top:1px solid ${dark ? '#27272a' : '#e4e4e7'};padding-top:12px">` +
    `consignatarias<span style="color:#38bdf8">.</span>com — el precio de referencia del ganado argentino · ` +
    `<a href="${APP_URL}" style="color:#0284c7">consignatarias.com.ar</a></p>`
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'agro@memola.com.ar'

/**
 * Destinatarios de TODA alerta de lead nuevo. Jose quiere recibirlas en su correo
 * personal además del de Memola. Configurable por env LEAD_ALERT_EMAILS (lista
 * separada por comas); default: Memola + Gmail personal del founder.
 */
export const LEAD_ALERT_TO = (process.env.LEAD_ALERT_EMAILS || 'agro@memola.com.ar,jose.barnetche19@gmail.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/* ------------------------------------------------------------------ */
/*  SHELL OSCURO — manual de marca v2 (mismo patrón que la newsletter   */
/*  semanal): carbón #09090b, header oscuro integrado (isotipo cielo +  */
/*  wordmark hueso con punto cielo, border-bottom #27272a), tablas      */
/*  role="presentation", máx 560px centrado, mono en todo.              */
/* ------------------------------------------------------------------ */

const EMAIL_MONO = "ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace"

function darkEmailShell(inner: string): string {
  return `
  <body style="margin:0;padding:0;background:#09090b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

    <tr><td style="padding:0 0 18px 0;border-bottom:1px solid #27272a">
      <img src="${APP_URL}/marca/email/isotipo-cielo.png" width="26" height="26" alt="" style="vertical-align:middle;border:0">
      <span style="font-family:${EMAIL_MONO};font-size:14px;font-weight:600;color:#fafafa;vertical-align:middle;margin-left:8px">consignatarias<span style="color:#38bdf8">.</span>com</span>
    </td></tr>

    <tr><td style="padding:22px 0 0">
      <div style="font-family:${EMAIL_MONO};color:#fafafa">
${inner}
      </div>
    </td></tr>

  </table>
  </td></tr></table>
  </body>`
}

/**
 * listUnsubHeaders — headers RFC 8058 (List-Unsubscribe + List-Unsubscribe-Post)
 * para emails warm/recordatorios. Calcado del bloque canónico del digest
 * (buildDigestEmail en src/lib/newsletter/digest-template.ts):
 *   List-Unsubscribe = <POST one-click /api/newsletter/unsubscribe>, <GET /unsubscribe>
 *   List-Unsubscribe-Post = List-Unsubscribe=One-Click
 *
 * El POST one-click lo dispara el botón nativo de Gmail/Apple Mail; el GET es el
 * fallback humano (ambos endpoints ya existen). `campaign` es opcional: la route
 * lo acepta null y lo usa sólo para ops logging (distinguir de qué mail vino la baja).
 * Es prerrequisito de deliverability del motor warm.
 */
function listUnsubHeaders(email: string, campaign?: string): Record<string, string> {
  const safeEmail = encodeURIComponent(email)
  const camp = campaign ? `&campaign=${encodeURIComponent(campaign)}` : ''
  const oneClickUrl = `${APP_URL}/api/newsletter/unsubscribe?email=${safeEmail}${camp}`
  const unsubscribeLink = `${APP_URL}/unsubscribe?email=${safeEmail}`
  return {
    'List-Unsubscribe': `<${oneClickUrl}>, <${unsubscribeLink}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

/**
 * legalIdentificationHtml — bloque reusable de identificación legal para emails
 * warm/recordatorios a contactos institucionales obtenidos del registro público
 * del MAG. Razón social (Memola Medios SAS) + origen del dato + opt-out destacado.
 * Texto institucional mínimo, alineado a buenas prácticas de la AAIP / Ley 25.326.
 * NO usar en transaccional de pago (esos no son cold/warm). Devuelve HTML listo
 * para concatenar en el footer del cuerpo.
 */
function legalIdentificationHtml(email: string): string {
  const unsubscribeLink = `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`
  return `
    <p style="color:#52525b;font-size:10px;line-height:1.6;margin:16px 0 0">
      Memola Medios SAS — consignatarias.com.ar. Obtuvimos su email del registro
      público del Mercado Agroganadero (MAG). Si no desea recibir más estos avisos,
      puede darse de baja en cualquier momento:
      <a href="${unsubscribeLink}" style="color:#71717a;text-decoration:underline">cancelar suscripción</a>.
    </p>
  `
}

export async function sendClaimConfirmation(email: string, displayName: string, slug: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Solicitud de verificación — ${displayName}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Verificaci&oacute;n de perfil</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Solicitud recibida</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 10px">Recibimos tu solicitud de verificación del perfil de <strong style="color:#fafafa">${safeName}</strong>.</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">Nuestro equipo revisará tu solicitud y te contactaremos a la brevedad.</p>
      <p style="margin:0 0 20px"><a href="${APP_URL}/consignatarias/${slug}" style="color:#38bdf8">Ver perfil</a></p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/** Alerta a agro@memola.com.ar cuando entra una pre-oferta (lead). Fire-and-forget. */
export async function sendPreofertaAlert(opts: {
  remate: string; remateSlug: string; lote: string; loteRp: string; monto: number
  nombre: string; cuit: string; telefono: string; email: string; consignataria: string
  elruralHref: string; localidad?: string | null; rep?: string | null
}) {
  const resend = await getResend()
  if (!resend) return
  const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR')
  const e = escapeHtml
  resend.emails.send({
    from: FROM,
    to: LEAD_ALERT_TO,
    subject: `Pre-oferta ${fmt(opts.monto)} — Lote ${opts.lote} · ${opts.remate}`,
    html: darkEmailShell(`
      <p style="color:#22c55e;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Nueva pre-oferta (lead)</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 4px">${fmt(opts.monto)} · Lote ${e(opts.lote)} (RP ${e(opts.loteRp)})</h2>
      <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px">${e(opts.remate)} — ${e(opts.consignataria)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#e4e4e7">
        <tr><td style="padding:4px 0;color:#71717a">Ofertante</td><td style="padding:4px 0;color:#fafafa"><strong>${e(opts.nombre)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#71717a">CUIT</td><td style="padding:4px 0;font-family:monospace">${e(opts.cuit)}</td></tr>
        <tr><td style="padding:4px 0;color:#71717a">Tel&eacute;fono</td><td style="padding:4px 0">${e(opts.telefono)}</td></tr>
        ${opts.localidad ? `<tr><td style="padding:4px 0;color:#71717a">Localidad</td><td style="padding:4px 0">${e(opts.localidad)}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#71717a">Email</td><td style="padding:4px 0">${e(opts.email)}</td></tr>
      </table>
      ${opts.rep ? `<div style="margin:14px 0 0;padding:10px 12px;border:1px solid #14532d;background:#0b1f13;border-radius:8px"><span style="color:#4ade80;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Rep de Reggi sugerido (por zona)</span><div style="color:#e4e4e7;font-size:13px;margin-top:3px">${e(opts.rep)}</div></div>` : ''}
      <p style="margin:18px 0 6px"><a href="${APP_URL}/admin/preoferta/${e(opts.remateSlug)}" style="color:#38bdf8">Ver en la consola &rarr;</a></p>
      <p style="margin:0 0 20px"><a href="${e(opts.elruralHref)}" style="color:#38bdf8">Cargar en elrural &rarr;</a></p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">Flujo: CUIT &rarr; InfoExperto &rarr; cargar en elrural con tu user. El comprador queda nuestro.</p>
    `),
  }).catch(() => {})
}

export async function sendConsignatariaProWelcome(email: string, displayName: string, slug: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Tu perfil PRO está activo — ${displayName}`,
    html: darkEmailShell(`
      <p style="color:#fbbf24;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">&#9733; Consignataria PRO</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Bienvenida a PRO</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">El perfil de <strong style="color:#fafafa">${safeName}</strong> en consignatarias.com.ar quedó <strong style="color:#fafafa">activo como PRO</strong>: aparecés con prioridad (destacado) ante los productores que buscan consignataria, con tu historial de remates, tu calendario y la analítica de tu perfil.</p>
      <p style="margin:0 0 20px"><a href="${APP_URL}/consignatarias/${slug}" style="color:#38bdf8">Ver tu perfil</a> &middot; <a href="${APP_URL}/dashboard" style="color:#38bdf8">Ir a tu panel</a></p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">Consignatarias.com.ar — la referencia del mercado ganadero</p>
    `),
  }).catch(() => {})
}

/**
 * sendConsignatariaViewsOutreach — the 1:1 conversion email: "tu perfil fue visto
 * N veces → activá PRO". Uses the personal sender (outreach asks for action; noreply
 * kills reply intent). Returns success so the caller logs to outreach_log only on send.
 */
export async function sendConsignatariaViewsOutreach(opts: {
  to: string
  displayName: string
  slug: string
  views: number
}): Promise<{ success: boolean }> {
  const resend = await getResend()
  if (!resend) return { success: false }
  const safeName = escapeHtml(opts.displayName)
  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to: opts.to,
      // List-Unsubscribe RFC 8058 (warm outreach): prerrequisito de deliverability.
      // Mismo bloque de headers que el digest / sendRemateResultsToProducer.
      headers: listUnsubHeaders(opts.to, 'views_outreach'),
      subject: `Tu perfil en consignatarias.com.ar fue visto ${opts.views} veces este mes`,
      html: darkEmailShell(`
        <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Hola, equipo de <strong style="color:#fafafa">${safeName}</strong>:</p>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Tu perfil en consignatarias.com.ar fue visto <strong style="color:#fafafa">${opts.views} veces</strong> en los últimos 30 días por productores que buscan dónde y con quién operar.</p>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Con <strong style="color:#fbbf24">PRO</strong> aparecés con prioridad (destacado), con tu badge verificado, tu calendario y la analítica de tu perfil — para que esas visitas se vuelvan consultas.</p>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px"><a href="${APP_URL}/consignatarias/${opts.slug}/activar" style="color:#38bdf8">Activá PRO acá</a> — ARS 45.000/mes, cancelás cuando quieras.</p>
        <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 4px">Saludos,<br>José — consignatarias.com.ar</p>
        ${legalIdentificationHtml(opts.to)}
      `),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function sendClaimNotificationToAdmin(
  displayName: string,
  slug: string,
  claimantEmail: string,
  claimantName?: string,
  cuit?: string,
) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  const safeClaim = escapeHtml(claimantEmail)
  resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nueva solicitud de verificación: ${displayName}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Admin &middot; claims</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">Nueva solicitud de verificación</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Consignataria:</strong> ${safeName} (<code style="color:#38bdf8">${slug}</code>)</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Email:</strong> ${safeClaim}</p>
      ${claimantName ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Nombre:</strong> ${escapeHtml(claimantName)}</p>` : ''}
      ${cuit ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">CUIT:</strong> ${escapeHtml(cuit)}</p>` : ''}
      <p style="margin:16px 0 0"><a href="${APP_URL}/admin/claims" style="color:#38bdf8">Revisar en admin</a></p>
    `),
  }).catch(() => {})
}

/**
 * Right-of-withdrawal (Botón de Arrepentimiento, Res. 424/2020) request.
 * Notifies the team (agro@ + legales@) and confirms receipt to the user.
 */
export async function sendArrepentimientoRequest(data: {
  nombre: string
  email: string
  identificador?: string
  motivo?: string
}) {
  const resend = await getResend()
  if (!resend) return
  const nombre = escapeHtml(data.nombre)
  const email = escapeHtml(data.email)
  const ident = data.identificador ? escapeHtml(data.identificador) : '—'
  const motivo = data.motivo ? escapeHtml(data.motivo) : '—'

  // Notify the team (current inbox + legal inbox)
  await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL, 'legales@memola.com.ar'],
    replyTo: data.email,
    subject: `Botón de Arrepentimiento — solicitud de ${data.nombre}`,
    html: darkEmailShell(`
      <p style="color:#fbbf24;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Admin &middot; legales</p>
      <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 14px">Solicitud de arrepentimiento / baja (Res. 424/2020 &middot; art. 34 LDC)</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Nombre:</strong> ${nombre}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Email:</strong> ${email}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Identificador / contrato:</strong> ${ident}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Motivo (opcional):</strong> ${motivo}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:16px 0 0">Plazo legal de respuesta y reversión inmediata del cargo si corresponde.</p>
    `),
  }).catch(() => {})

  // Acknowledge to the user
  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Recibimos tu solicitud de arrepentimiento — Consignatarias.com.ar',
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Bot&oacute;n de arrepentimiento</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Recibimos tu solicitud</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Hola ${nombre}, registramos tu solicitud de arrepentimiento / baja conforme al
      art. 34 de la Ley 24.240 y la Resolución 424/2020.</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">La procesaremos sin costo a la brevedad. Si tu suscripción está activa, podés además
      darla de baja desde tu cuenta en <a href="${APP_URL}/cuenta" style="color:#38bdf8">${APP_URL}/cuenta</a>.</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0">Ante cualquier duda: <a href="mailto:${ADMIN_EMAIL}" style="color:#38bdf8">${ADMIN_EMAIL}</a>.</p>
    `),
  }).catch(() => {})
}

export async function sendClaimApproved(email: string, displayName: string, slug: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Perfil aprobado — ${displayName}`,
    html: darkEmailShell(`
      <p style="color:#34d399;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Verificaci&oacute;n aprobada</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Tu perfil fue aprobado</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Tu solicitud de verificación del perfil de <strong style="color:#fafafa">${safeName}</strong> fue aprobada.</p>
      <p style="margin:0 0 12px"><a href="${APP_URL}/consignatarias/${slug}" style="color:#38bdf8">Ver tu perfil</a></p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 14px">Ya podés acceder a tu panel de consignataria:</p>
      <p style="margin:0 0 20px"><a href="${APP_URL}/login" style="background:#38bdf8;color:#09090b;padding:11px 26px;text-decoration:none;border-radius:2px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Acceder a mi panel</a></p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  FRIGORIFICO CLAIMS                                                 */
/* ------------------------------------------------------------------ */

export async function sendFrigorificoClaimConfirmation(email: string, frigorificoName: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(frigorificoName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Solicitud de registro — ${frigorificoName}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Registro de frigor&iacute;fico</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Solicitud recibida</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 10px">Recibimos tu solicitud de registro del frigorífico <strong style="color:#fafafa">${safeName}</strong>.</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">Nuestro equipo revisará tu solicitud y te contactaremos a la brevedad.</p>
      <p style="margin:0 0 20px"><a href="${APP_URL}/frigorificos" style="color:#38bdf8">Ver directorio de frigoríficos</a></p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

export async function sendFrigorificoClaimNotificationToAdmin(
  frigorificoName: string,
  cuit: string,
  claimantEmail: string,
  claimantName?: string,
) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(frigorificoName)
  const safeClaim = escapeHtml(claimantEmail)
  resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nuevo registro frigorífico: ${frigorificoName}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Admin &middot; claims</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">Nueva solicitud de registro (frigorífico)</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Frigorífico:</strong> ${safeName}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">CUIT:</strong> ${escapeHtml(cuit)}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Email:</strong> ${safeClaim}</p>
      ${claimantName ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Nombre:</strong> ${escapeHtml(claimantName)}</p>` : ''}
      <p style="margin:16px 0 0"><a href="${APP_URL}/admin/frigorifico-claims" style="color:#38bdf8">Revisar en admin</a></p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  FRIGORÍFICO — RFQ (pedido de cotización mayorista)                 */
/* ------------------------------------------------------------------ */

interface RfqPayload {
  frigorificoName: string
  cuit: string
  provinciaEntrega: string
  tipoComprador?: string | null
  nombre?: string | null
  empresa?: string | null
  whatsapp?: string | null
  email: string
  mensaje?: string | null
  resumenProductos?: string | null
}

/**
 * Avisa del RFQ al dueño del frigorífico (si el perfil está reclamado) y SIEMPRE
 * a agro@ (doble captura: lead al dueño + señal a la capa de datos; y fallback
 * — es la casilla donde hoy cae el pedido de San Miguel). `to` = dueño || admin.
 */
export async function sendFrigorificoRfqNotification(ownerEmail: string | null, p: RfqPayload) {
  const resend = await getResend()
  if (!resend) return
  const to = ownerEmail || ADMIN_EMAIL
  const rows: [string, string | null | undefined][] = [
    ['Frigorífico', p.frigorificoName],
    ['Entrega en', p.provinciaEntrega],
    ['Tipo de comprador', p.tipoComprador],
    ['Productos', p.resumenProductos],
    ['Contacto', p.nombre],
    ['Empresa', p.empresa],
    ['WhatsApp', p.whatsapp],
    ['Email', p.email],
    ['Mensaje', p.mensaje],
  ]
  const body = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">${k}:</strong> ${escapeHtml(String(v))}</p>`)
    .join('')
  resend.emails.send({
    from: FROM,
    to,
    ...(ownerEmail ? { bcc: ADMIN_EMAIL } : {}),
    replyTo: p.email,
    subject: `Nuevo pedido mayorista — ${p.frigorificoName} (${p.provinciaEntrega})`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Pedido mayorista &middot; RFQ</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">Te llegó un pedido de cotización</h2>
      ${body}
      <p style="margin:16px 0 0"><a href="${APP_URL}/dashboard" style="color:#38bdf8">Ver en tu panel</a></p>
    `),
  }).catch(() => {})
}

/** Confirmación al comprador mayorista. */
export async function sendFrigorificoRfqConfirmation(buyerEmail: string, frigorificoName: string) {
  const resend = await getResend()
  if (!resend) return
  resend.emails.send({
    from: FROM,
    to: buyerEmail,
    subject: `Pedido enviado — ${frigorificoName}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Pedido mayorista</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Recibimos tu pedido</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 10px">Tu pedido de cotización a <strong style="color:#fafafa">${escapeHtml(frigorificoName)}</strong> fue enviado. El establecimiento te contactará con la cotización a la brevedad.</p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  MONTHLY METRICS                                                    */
/* ------------------------------------------------------------------ */

export async function sendMonthlyMetrics(
  email: string,
  displayName: string,
  slug: string,
  views: number,
  monthName: string,
) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  const viewsFormatted = views.toLocaleString('es-AR')
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Resumen ${monthName} — ${displayName}`,
    html: darkEmailShell(`
        <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Resumen mensual</p>
        <p style="color:#71717a;font-size:12px;margin:0 0 20px">${safeName} — ${escapeHtml(monthName)}</p>

        <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center;margin-bottom:16px">
          <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Vistas del perfil</p>
          <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0">${viewsFormatted}</p>
          <p style="color:#71717a;font-size:11px;margin:4px 0 0">productores vieron tu perfil este mes</p>
        </div>

        ${views > 0 ? `
        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Tu perfil de <strong style="color:#fafafa">${safeName}</strong> recibio ${viewsFormatted} visitas en ${escapeHtml(monthName)}.
          ${views >= 50 ? 'Excelente visibilidad.' : views >= 20 ? 'Buen alcance.' : 'Completa tu perfil para mejorar tu visibilidad.'}
        </p>
        ` : `
        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Tu perfil aun no recibio visitas este mes. Completa tus datos de contacto y descripcion para mejorar tu posicionamiento.
        </p>
        `}

        <div style="margin:20px 0;text-align:center">
          <a href="${APP_URL}/dashboard" style="background:#38bdf8;color:#09090b;padding:11px 26px;text-decoration:none;border-radius:2px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver mi panel</a>
        </div>

        <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
          <p style="color:#71717a;font-size:11px;margin:0">
            <a href="${APP_URL}/consignatarias/${slug}" style="color:#71717a">Ver perfil publico</a>
            &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/planes" style="color:#71717a">Mejorar mi plan</a>
          </p>
        </div>

        <p style="color:#52525b;font-size:10px;margin:16px 0 0">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  CIERRE MENSUAL — Índice Novillo (arrendamiento)                    */
/* ------------------------------------------------------------------ */

/**
 * Sent on the 1st of each month to "cierre-mensual" subscribers: the closing
 * average of the previous month's INMAG (the number producers use to settle
 * rural-lease canon). Data computed in /api/cron/monthly-close.
 */
export async function sendMonthlyClose(
  email: string,
  data: {
    monthLabel: string          // "Mayo 2026"
    avg: number                 // promedio mensual $/kg
    min: number
    max: number
    ruedas: number              // días con rueda en el mes
    prevMonthLabel?: string | null
    prevAvg?: number | null
    lease?: { kgHa: number; hectareas: number } | null  // arriendo guardado por el suscriptor
  },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
  const changePct = data.prevAvg && data.prevAvg > 0
    ? ((data.avg - data.prevAvg) / data.prevAvg) * 100
    : null
  const up = (changePct ?? 0) >= 0
  // Canon personalizado SOLO si el suscriptor guardó su arriendo (kg/ha + ha).
  // Si no, va el promedio sin ejemplo de arrendamiento.
  const canon = data.lease && data.lease.kgHa > 0 && data.lease.hectareas > 0
    ? data.avg * data.lease.kgHa * data.lease.hectareas
    : null

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Cierre ${data.monthLabel}: Índice Novillo promedio ${money(data.avg)}/kg`,
      headers: listUnsubHeaders(email, 'monthly-close'),
      html: darkEmailShell(`
          <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Cierre mensual &middot; &Iacute;ndice Novillo Arrendamiento</p>
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 20px">${escapeHtml(data.monthLabel)}</h2>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Promedio del mes</p>
            <p style="color:#38bdf8;font-size:36px;font-weight:bold;margin:0">${money(data.avg)}<span style="color:#71717a;font-size:16px">/kg</span></p>
            ${changePct !== null ? `<p style="color:${up ? '#34d399' : '#f87171'};font-size:13px;margin:6px 0 0">${up ? '&#9650;' : '&#9660;'} ${up ? '+' : ''}${changePct.toFixed(1)}% vs. ${escapeHtml(data.prevMonthLabel || 'mes anterior')}</p>` : ''}
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Mínimo del mes</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right;border-bottom:1px solid #27272a">${money(data.min)}/kg</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Máximo del mes</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right;border-bottom:1px solid #27272a">${money(data.max)}/kg</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px">Ruedas computadas</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right">${data.ruedas}</td>
            </tr>
          </table>

          ${canon !== null && data.lease ? `
          <div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:14px 16px;margin-bottom:20px">
            <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em">Tu arrendamiento este mes</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0;line-height:1.6">
              ${data.lease.hectareas} ha × ${data.lease.kgHa} kg/ha × ${money(data.avg)} = <strong style="color:#38bdf8;font-size:16px">${money(canon)}</strong>/mes
            </p>
          </div>` : `
          <div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:14px 16px;margin-bottom:20px">
            <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em">Recibí TU canon ya calculado</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0;line-height:1.6">
              Cargá tus hectáreas y kg/ha una sola vez y cada mes te llega tu arrendamiento liquidado a este promedio.
              <a href="${APP_URL}/mercado/arrendamiento" style="color:#38bdf8;text-decoration:none;white-space:nowrap">Cargar mi canon →</a>
            </p>
          </div>`}

          <div style="text-align:center;margin:24px 0 8px">
            <a href="${APP_URL}/mercado/arrendamiento" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Calcular mi arrendamiento</a>
          </div>
          <p style="text-align:center;color:#a1a1aa;font-size:12px;margin:0 0 8px;line-height:1.6">
            ¿Dudas con tu canon o querés que te ayudemos con el contrato?
            <a href="mailto:agro@memola.com.ar?subject=Consulta%20arrendamiento" style="color:#38bdf8;text-decoration:none;white-space:nowrap">Escribinos a agro@memola.com.ar →</a>
          </p>

          <p style="color:#71717a;font-size:11px;margin:20px 0 0;line-height:1.6">
            Fuente: Mercado Agroganadero de Buenos Aires (INMAG). Promedio mensual ponderado (importe total / kilos del mes).
          </p>
          <p style="color:#52525b;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar
            &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  SELL-ZONE ALERTS (motor de alertas personalizadas — FASE 1)        */
/* ------------------------------------------------------------------ */

/**
 * Confirmación de alta a la alerta de zona de venta. Single opt-in: el usuario la
 * pidió en el sitio, este mail confirma la promesa concreta (qué, cuándo, sin spam).
 */
export async function sendSellZoneAlertConfirm(
  email: string,
  data: { categoriaLabel: string; pct365: number | null },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoriaLabel)
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Listo — te aviso cuando el ${data.categoriaLabel} entre en zona de venta`,
      headers: listUnsubHeaders(email, 'sell-zone-confirm'),
      html: darkEmailShell(`
          <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Alerta activada &middot; ${cat}</p>
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">Te aviso cuando convenga vender</h2>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">
            Vas a recibir <strong style="color:#fafafa">un solo mail</strong> cuando el ${cat} esté
            <strong style="color:#34d399">caro vs el último año Y empiece a girar</strong> (precio real en la
            franja alta del año pero ya sin hacer nuevos máximos). Esa combinación —no el percentil solo— es la
            que históricamente marcó zona de salida. Nada de spam por cada movimiento, ni avisos de "vendé"
            mientras el mercado todavía sube.
          </p>
          ${data.pct365 !== null ? `
          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Hoy el mercado está en</p>
            <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0">percentil ${data.pct365}<span style="color:#71717a;font-size:14px"> / año</span></p>
          </div>` : ''}
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/mercado/vender-ahora" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver el análisis completo</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Medimos el INMAG en dólares reales (INMAG ÷ dólar blue) para neutralizar la inflación.
            Para el novillo el percentil es preciso; para el resto refleja la dirección del mercado.
            Es información, no asesoramiento.
          </p>
          <p style="color:#52525b;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * El disparo real: el mercado entró en zona de venta. El gancho es la decisión
 * sobre SU categoría, con el percentil concreto, y un CTA al análisis completo.
 */
export async function sendSellZoneAlert(
  email: string,
  data: { categoriaLabel: string; pct30: number; pct365: number; trend?: string; inmagUsdHoy: number | null },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoriaLabel)
  const trendTxt = data.trend === 'bajando' ? 'y empezó a girar a la baja' : 'y dejó de hacer máximos'
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `El ${data.categoriaLabel} está caro vs el año (percentil ${data.pct365}) ${trendTxt}`,
      headers: listUnsubHeaders(email, 'sell-zone-alert'),
      html: darkEmailShell(`
          <p style="color:#34d399;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Zona alta del año &middot; ${cat}</p>
          <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 16px">Precio alto y girando — históricamente, zona de salida</h2>
          <div style="background:#18181b;border:1px solid rgba(52,211,153,.4);border-left:3px solid #34d399;border-radius:2px;padding:18px;margin-bottom:16px">
            <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0">
              En dólares reales, el ${cat} está en el <strong style="color:#34d399">percentil ${data.pct365} del último año</strong>
              y en el <strong style="color:#34d399">percentil ${data.pct30} del último mes</strong> — y ${trendTxt}.
              En esa combinación (precio alto del año que empieza a girar), la estadística histórica marca zona de salida.
              La decisión es tuya: esto describe dónde está el precio, no te dice qué hacer.
            </p>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Percentil últimos 30 días</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right;border-bottom:1px solid #27272a">${data.pct30}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Percentil último año</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right;border-bottom:1px solid #27272a">${data.pct365}</td>
            </tr>
            ${data.inmagUsdHoy !== null ? `<tr>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#71717a;font-size:12px">INMAG en USD reales (hoy)</td>
              <td style="padding:8px 0;font-family:${EMAIL_MONO};color:#fafafa;font-size:12px;text-align:right">USD ${data.inmagUsdHoy.toFixed(2)}/kg</td>
            </tr>` : ''}
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/mercado/vender-ahora" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Calcular mi lote a este precio</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Medido sobre el INMAG en dólares reales (INMAG ÷ dólar blue). Para el novillo el percentil es preciso;
            para el resto refleja la dirección del mercado. No considera condición del lote, costos de retención ni
            plaza zonal. Es información, no asesoramiento.
          </p>
          <p style="color:#52525b;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  PRICE THRESHOLD ALERTS ("avisame cuando el X cruce $Y")           */
/* ------------------------------------------------------------------ */

const fmtArs = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

/** Confirmación de alta de una alerta de precio por umbral. */
export async function sendPriceAlertConfirm(
  email: string,
  data: { categoryLabel: string; threshold: number; direction: 'above' | 'below'; current: number | null; currency?: 'ars' | 'usd' },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoryLabel)
  const verbo = data.direction === 'above' ? 'cruce' : 'baje de'
  const money = (n: number) => (data.currency === 'usd' ? 'USD ' + Math.round(n).toLocaleString('es-AR') : fmtArs(n))
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Listo — te aviso cuando el ${data.categoryLabel} ${verbo} ${money(data.threshold)}`,
      headers: listUnsubHeaders(email, 'price-alert-confirm'),
      html: darkEmailShell(`
          <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Alerta de precio activada &middot; ${cat}</p>
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">Te aviso cuando ${data.direction === 'above' ? 'cruce' : 'baje de'} ${money(data.threshold)}</h2>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">
            Vas a recibir <strong style="color:#fafafa">un solo mail</strong> cuando el ${cat} ${verbo}
            <strong style="color:#38bdf8">${money(data.threshold)}/kg</strong>. Nada de spam por cada movimiento.
          </p>
          ${data.current !== null ? `
          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Precio hoy</p>
            <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0">${money(data.current)}<span style="color:#71717a;font-size:14px">/kg</span></p>
          </div>` : ''}
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/precios" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver precios en vivo</a>
          </div>
          <p style="color:#52525b;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** El disparo: el precio cruzó el umbral. */
export async function sendPriceThresholdAlert(
  email: string,
  data: { categoryLabel: string; threshold: number; direction: 'above' | 'below'; current: number; currency?: 'ars' | 'usd' },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoryLabel)
  const verboPasado = data.direction === 'above' ? 'cruzó' : 'bajó de'
  const color = data.direction === 'above' ? '#34d399' : '#f87171'
  // USD explícito (en Argentina "$" = pesos); ARS con el formato de siempre.
  const money = (n: number) => (data.currency === 'usd' ? 'USD ' + Math.round(n).toLocaleString('es-AR') : fmtArs(n))
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `El ${data.categoryLabel} ${verboPasado} ${money(data.threshold)} — está en ${money(data.current)}`,
      headers: listUnsubHeaders(email, 'price-alert'),
      html: darkEmailShell(`
          <p style="color:${color};font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Alerta de precio &middot; ${cat}</p>
          <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 16px">El ${cat} ${verboPasado} ${money(data.threshold)}</h2>
          <div style="background:#18181b;border:1px solid ${color}66;border-left:3px solid ${color};border-radius:2px;padding:18px;margin-bottom:16px;text-align:center">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">Precio de referencia hoy</p>
            <p style="color:${color};font-size:34px;font-weight:bold;margin:0">${money(data.current)}<span style="color:#71717a;font-size:14px">/kg</span></p>
            <p style="color:#a1a1aa;font-size:12px;margin:8px 0 0">Tu umbral: ${money(data.threshold)}</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/precios" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver precios y remates</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Precio de referencia del Mercado Agroganadero (categoría ${cat}). No considera condición del lote ni plaza zonal. Es información, no asesoramiento.
          </p>
          <p style="color:#52525b;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&middot;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  WEEKLY NEWSLETTER                                                  */
/* ------------------------------------------------------------------ */

interface FeaturedRemate {
  title: string
  date: string
  time: string | null
  location: string
  consignataria: string
  slug: string
  heads: number | null
  isPro: boolean
}

export async function sendWeeklyNewsletter(
  email: string,
  featuredRemates: FeaturedRemate[],
  totalRemates: number,
  weekRange: string,
): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'no-resend' }

  try {
    // await + return: antes era fire-and-forget con .catch(()=>{}), así el cron
    // reportaba siempre sent==total aunque Resend fallara/rebotara. Ahora se
    // detecta la falla. + List-Unsubscribe (RFC 8058) que Gmail/Yahoo exigen a bulk.
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Remates de la semana — ${weekRange} · ${totalRemates} programados`,
      html: buildWeeklyNewsletterHtml(email, featuredRemates, totalRemates, weekRange),
      headers: listUnsubHeaders(email, 'weekly'),
    })
    if (error) return { success: false, error: String((error as { message?: string }).message || error) }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * HTML de la newsletter semanal, 100% manual de marca v2:
 * carbón #09090b · panel #18181b · línea #27272a · hueso · cielo ÚNICO acento
 * (CTA), ámbar SOLO para PRO consignataria, radius 2px, mono, sin emojis.
 * Exportado puro para poder previsualizar/testear sin enviar.
 */
export function buildWeeklyNewsletterHtml(
  email: string,
  featuredRemates: FeaturedRemate[],
  totalRemates: number,
  weekRange: string,
): string {
  const MONO = "ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace"
  const formatDate = (dateStr: string) => {
    const [, m, d] = dateStr.split('-')
    return `${d}/${m}`
  }

  const rematesHtml = featuredRemates.map(r => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid ${r.isPro ? 'rgba(251,191,36,.5)' : '#27272a'};${r.isPro ? 'border-left:3px solid #fbbf24;' : ''}border-radius:2px;margin-bottom:8px">
      <tr><td style="padding:12px 14px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:${MONO};color:${r.isPro ? '#fbbf24' : '#fafafa'};font-weight:600;font-size:13px">${r.isPro ? '&#9733; ' : ''}${escapeHtml(r.consignataria)}</td>
          <td align="right" style="font-family:${MONO};color:#71717a;font-size:11px;white-space:nowrap">${formatDate(r.date)}${r.time ? ` &middot; ${r.time}` : ''}</td>
        </tr></table>
        <p style="font-family:${MONO};color:#a1a1aa;font-size:12px;margin:6px 0 3px;line-height:1.4">${escapeHtml(r.title)}</p>
        <p style="font-family:${MONO};color:#71717a;font-size:11px;margin:0">${escapeHtml(r.location)}${r.heads ? ` &middot; ${r.heads.toLocaleString('es-AR')} cab` : ''}</p>
      </td></tr>
    </table>
  `).join('')

  return `
  <body style="margin:0;padding:0;background:#09090b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

    <tr><td style="padding:0 0 18px 0;border-bottom:1px solid #27272a">
      <img src="${APP_URL}/marca/email/isotipo-cielo.png" width="26" height="26" alt="" style="vertical-align:middle;border:0">
      <span style="font-family:${MONO};font-size:14px;font-weight:600;color:#fafafa;vertical-align:middle;margin-left:8px">consignatarias<span style="color:#38bdf8">.</span>com</span>
    </td></tr>

    <tr><td style="padding:22px 0 4px">
      <p style="font-family:${MONO};color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Cierre semanal &middot; calendario</p>
      <h1 style="font-family:${MONO};color:#fafafa;font-size:19px;margin:0 0 4px;font-weight:700">Remates de la semana</h1>
      <p style="font-family:${MONO};color:#71717a;font-size:12px;margin:0 0 18px">${escapeHtml(weekRange)} &middot; ${totalRemates} remates programados en el pa&iacute;s</p>
    </td></tr>

    <tr><td>${rematesHtml}</td></tr>

    <tr><td align="center" style="padding:20px 0">
      <a href="${APP_URL}/remates" style="font-family:${MONO};background:#38bdf8;color:#09090b;padding:11px 26px;text-decoration:none;border-radius:2px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver todos los remates &rarr;</a>
    </td></tr>

    <tr><td style="background:#18181b;border:1px solid rgba(251,191,36,.4);border-radius:2px;padding:12px 14px;text-align:center">
      <p style="font-family:${MONO};color:#fbbf24;font-size:11px;margin:0 0 4px;font-weight:700;letter-spacing:.08em">&#9733; CONSIGNATARIAS PRO</p>
      <p style="font-family:${MONO};color:#a1a1aa;font-size:11px;margin:0;line-height:1.5">Los remates destacados son de consignatarias PRO verificadas. <a href="${APP_URL}/planes" style="color:#fbbf24">Conoc&eacute; los beneficios &rarr;</a></p>
    </td></tr>

    <tr><td style="border-top:1px solid #27272a;padding:14px 0 0;margin-top:18px">
      <p style="font-family:${MONO};color:#71717a;font-size:11px;margin:14px 0 0">
        <a href="${APP_URL}/remates" style="color:#71717a">Calendario</a> &nbsp;&middot;&nbsp;
        <a href="${APP_URL}/mercado" style="color:#71717a">Precios</a> &nbsp;&middot;&nbsp;
        <a href="${APP_URL}/consignatarias" style="color:#71717a">Directorio</a> &nbsp;&middot;&nbsp;
        <a href="${APP_URL}/mi-ganado" style="color:#71717a">Mi Ganado</a>
      </p>
      <p style="font-family:${MONO};color:#52525b;font-size:10px;margin:14px 0 0;line-height:1.6">
        consignatarias<span style="color:#38bdf8">.</span>com &mdash; el precio de referencia del ganado argentino.<br>
        Recib&iacute;s este email porque te suscribiste.
        <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#52525b">Desuscribirme</a>
      </p>
    </td></tr>

  </table>
  </td></tr></table>
  </body>`
}

/* ------------------------------------------------------------------ */
/*  WEEKLY DIGEST — "qué cambió esta semana" (envío separado del PRO)   */
/* ------------------------------------------------------------------ */

/**
 * Envía el digest semanal "qué cambió" ya renderizado por buildDigestEmail().
 *
 * Recibe { subject, html, headers } tal cual (los headers traen List-Unsubscribe /
 * List-Unsubscribe-Post RFC 8058). Mismo FROM verificado y mismo getResend() que el
 * resto del archivo. Devuelve { success } para que el cron cuente enviados/errores.
 */
export async function sendDigestEmail(
  email: string,
  built: { subject: string; html: string; headers?: Record<string, string> },
): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: built.subject,
      html: built.html,
      headers: built.headers,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  CLAIM REJECTION                                                    */
/* ------------------------------------------------------------------ */

export async function sendClaimRejected(email: string, displayName: string, reason?: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Verificación rechazada — ${displayName}`,
    html: darkEmailShell(`
      <p style="color:#f87171;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Verificaci&oacute;n de perfil</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 12px">Verificación rechazada</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Lamentamos informarte que tu solicitud de verificación del perfil de <strong style="color:#fafafa">${safeName}</strong> fue rechazada.</p>
      ${reason ? `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px"><strong style="color:#fafafa">Motivo:</strong> ${escapeHtml(reason)}</p>` : ''}
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 20px">Si creés que es un error, contactanos a <a href="mailto:${ADMIN_EMAIL}" style="color:#38bdf8">${ADMIN_EMAIL}</a>.</p>
      <p style="color:#52525b;font-size:11px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  REMATE REMINDERS (PRO feature)                                     */
/* ------------------------------------------------------------------ */

export async function sendRemateReminder(email: string, subject: string, htmlBody: string) {
  const resend = await getResend()
  if (!resend) return
  
  resend.emails.send({
    from: FROM,
    to: email,
    // List-Unsubscribe RFC 8058: faltaba en el recordatorio (sólo tenía link en footer).
    headers: listUnsubHeaders(email, 'remate_reminder'),
    subject,
    html: `
      ${emailBrandHeader()}
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fafafa">
        ${htmlBody}
        <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
        <p style="color:#71717a;font-size:12px">
          consignatarias.com — el precio de referencia del ganado argentino
          <br>
          <a href="${APP_URL}/alertas/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">
            Desuscribirme de recordatorios
          </a>
        </p>
      </div>
    `,
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  POST-REMATE RESULTS REQUEST                                        */
/* ------------------------------------------------------------------ */

interface PostRemateRequestParams {
  to: string
  consignatariaName: string
  slug: string
  location: string
  remateDate: string
  remateTitle: string
  /** Productores únicos que siguen a la casa / sus remates en la terminal (dato real; 0 = omitir) */
  seguidores?: number
}

export async function sendPostRemateResultsRequest({
  to,
  consignatariaName,
  slug: _slug,
  location,
  remateDate: _remateDate,
  remateTitle: _remateTitle,
  seguidores = 0,
}: PostRemateRequestParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  void _slug
  void _remateDate
  void _remateTitle

  // Strip HTML tags from name/location so the plain-text body never includes
  // raw markup if upstream data has any. Plain text only — feels like a person
  // typed it from Gmail, not a template blast.
  const cleanName = consignatariaName.replace(/<[^>]+>/g, '').trim()
  const cleanLocation = location.replace(/<[^>]+>/g, '').trim()

  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to,
      replyTo: 'agro@memola.com.ar',
      subject: `¿Me pasan los promedios del remate de hoy en ${cleanLocation}?`,
      text: [
        `Buenas, soy José de consignatarias.com.ar.`,
        ``,
        `Vi que tuvieron remate hoy en ${cleanLocation}. ¿Me podés`,
        `pasar los promedios? Con 3 datos me sobra:`,
        ``,
        `  1. Categoría más operada (ej. terneros)`,
        `  2. Precio promedio $/kg`,
        `  3. Cabezas vendidas`,
        ``,
        `Respondé este mail con los números o una foto de la`,
        `planilla. Lo publico en el perfil de ${cleanName}${seguidores > 0 ? ` —` : ' y te'}`,
        ...(seguidores > 0
          ? [`${seguidores} productor${seguidores === 1 ? ' sigue' : 'es siguen'} sus remates en la terminal — y te paso el link.`]
          : [`paso el link.`]),
        ``,
        `Gracias,`,
        `José — +54 3773 418130`,
      ].join('\n'),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  REMATE CONFIRM REQUEST (a consignataria, goteo personal — NO blast) */
/* ------------------------------------------------------------------ */

interface RemateConfirmRequestParams {
  to: string
  consignatariaName: string
  slug: string
  location: string
  remateDate: string   // YYYY-MM-DD
  remateTitle?: string
}

/**
 * sendRemateConfirmRequest — pedido 1:1 a la consignataria para que CONFIRME el
 * horario del remate próximo y, si transmiten, pase el link de YouTube.
 *
 * Calcado EXACTO de sendPostRemateResultsRequest: texto plano (se siente escrito a
 * mano desde Gmail, no un template), FROM_PERSONAL (pide respuesta → nunca noreply),
 * replyTo agro@memola.com.ar. Header List-Unsubscribe agregado (cold outreach a
 * emails institucionales — mitigación AUP de Resend).
 *
 * RIESGO AUP ALTO: es cold outreach. El caller (post-remate-outreach route) DEBE
 * mantenerlo EN GOTEO (poquitos/día) con outreach_log type='remate_confirm'
 * (1/slug/remate + 30d/dirección). NUNCA blast a toda la tabla consignatarias.email.
 */
export async function sendRemateConfirmRequest({
  to,
  consignatariaName,
  slug: _slug,
  location,
  remateDate,
  remateTitle: _remateTitle,
}: RemateConfirmRequestParams): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  void _slug
  void _remateTitle

  // Strip HTML del nombre/lugar por si la data upstream trae markup. Texto plano only.
  const cleanName = consignatariaName.replace(/<[^>]+>/g, '').trim()
  const cleanLocation = location.replace(/<[^>]+>/g, '').trim()

  // Fecha legible es-AR (remateDate viene YYYY-MM-DD; armar como fecha local sin TZ shift).
  const fechaLegible = (() => {
    const [y, m, d] = remateDate.split('-').map(Number)
    if (!y || !m || !d) return remateDate
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  })()

  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to,
      replyTo: 'agro@memola.com.ar',
      // List-Unsubscribe en cold outreach: mitigación AUP. /unsubscribe ya existe.
      headers: {
        'List-Unsubscribe': `<${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      subject: `¿Me confirmás el horario del remate del ${fechaLegible}?`,
      text: [
        `Buenas, soy José de consignatarias.com.ar.`,
        ``,
        `Vi que tienen remate el ${fechaLegible} en ${cleanLocation}. Lo`,
        `tenemos publicado y lo siguen varios productores.`,
        ``,
        `¿Me confirmás el horario y, si transmiten, me pasás el link`,
        `de YouTube? Lo sumo a la ficha de ${cleanName} así los`,
        `compradores entran directo a la transmisión.`,
        ``,
        `Respondé este mail con los datos. Gracias,`,
        `José — +54 3773 418130`,
      ].join('\n'),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  NEW REMATE ALERTS (PRO consignataria posts new auction)           */
/* ------------------------------------------------------------------ */

interface NewRemateAlertParams {
  to: string
  remateTitle: string
  consignataria: string
  provincia: string
  fecha: string
  url: string
}

/* ------------------------------------------------------------------ */
/*  FAENA NEWSLETTER (Monthly cattle slaughter stats)                  */
/* ------------------------------------------------------------------ */

interface FaenaNewsletterParams {
  to: string
  currentMonth: string // e.g., "enero 2026"
  cabezas: number
  monthlyChange: number // percentage
  yearlyChange: number // percentage
  total12Months: number
}

export async function sendFaenaNewsletter({
  to,
  currentMonth,
  cabezas,
  monthlyChange,
  yearlyChange,
  total12Months,
}: FaenaNewsletterParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const formatNumber = (n: number) => n.toLocaleString('es-AR')
  const formatChange = (pct: number) => {
    const sign = pct >= 0 ? '+' : ''
    const color = pct >= 0 ? '#34d399' : '#f87171'
    return `<span style="color:${color};font-weight:bold">${sign}${pct.toFixed(1)}%</span>`
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Faena ${currentMonth}: ${formatNumber(cabezas)} cabezas`,
      headers: listUnsubHeaders(to, 'faena'),
      html: darkEmailShell(`
          <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Reporte mensual de faena</p>
          <p style="color:#71717a;font-size:12px;margin:0 0 20px">${escapeHtml(currentMonth)} — Datos oficiales</p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em">Faena total</p>
            <p style="color:#38bdf8;font-size:36px;font-weight:bold;margin:0">${formatNumber(cabezas)}</p>
            <p style="color:#71717a;font-size:12px;margin:8px 0 0">cabezas faenadas</p>
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr>
            <td width="49%" style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center">
              <p style="font-family:${EMAIL_MONO};color:#71717a;font-size:10px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em">vs mes anterior</p>
              <p style="font-family:${EMAIL_MONO};font-size:18px;margin:0">${formatChange(monthlyChange)}</p>
            </td>
            <td width="2%"></td>
            <td width="49%" style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center">
              <p style="font-family:${EMAIL_MONO};color:#71717a;font-size:10px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.12em">vs año anterior</p>
              <p style="font-family:${EMAIL_MONO};font-size:18px;margin:0">${formatChange(yearlyChange)}</p>
            </td>
          </tr></table>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em">Últimos 12 meses</p>
            <p style="color:#fafafa;font-size:24px;font-weight:bold;margin:0">${formatNumber(total12Months)}</p>
            <p style="color:#71717a;font-size:11px;margin:4px 0 0">cabezas faenadas (acumulado)</p>
          </div>

          <p style="color:#a1a1aa;font-size:11px;line-height:1.5;margin:0 0 16px">
            Fuente: Secretaría de Agricultura, Ganadería y Pesca — datos.gob.ar
          </p>

          <div style="text-align:center;margin:20px 0">
            <a href="${APP_URL}/frigorificos" style="background:#38bdf8;color:#09090b;padding:11px 26px;text-decoration:none;border-radius:2px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver frigoríficos</a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
            <p style="color:#71717a;font-size:11px;margin:0">
              <a href="${APP_URL}/remates" style="color:#71717a">Ver remates</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/mercado" style="color:#71717a">Precios del mercado</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/frigorificos" style="color:#71717a">Directorio</a>
            </p>
          </div>

          <p style="color:#52525b;font-size:10px;margin:16px 0 0">
            Recibís este email porque te suscribiste al reporte de faena.
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  USER ONBOARDING EMAILS                                             */
/* ------------------------------------------------------------------ */

interface WelcomeEmailParams {
  to: string
  userName?: string
}

/**
 * Sent immediately after user signup.
 * CTA: Upload your first DT-e guide.
 */
export async function sendWelcomeEmail({ to, userName }: WelcomeEmailParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const greeting = userName ? `¡Hola ${escapeHtml(userName)}!` : '¡Bienvenido!'

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Bienvenido a Consignatarias.com.ar',
      html: darkEmailShell(`
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">${greeting}</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            Ya tenés acceso a la plataforma más completa de remates ganaderos de Argentina.
          </p>

          <div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#38bdf8;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:.12em">
              Tu próximo paso
            </p>
            <p style="color:#fafafa;font-size:14px;margin:0 0 8px">
              <strong>Subí tu primera guía DT-e</strong>
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0">
              Guardamos tus guías de manera segura y te damos acceso a estadísticas sobre tus operaciones.
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
              Ir a mi panel
            </a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:16px;margin-top:24px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em">
              También podés:
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              &rarr; <a href="${APP_URL}/remates" style="color:#38bdf8;text-decoration:none">Ver próximos remates</a><br>
              &rarr; <a href="${APP_URL}/mercado/inmag" style="color:#38bdf8;text-decoration:none">Consultar precios INMAG</a><br>
              &rarr; <a href="${APP_URL}/consignatarias" style="color:#38bdf8;text-decoration:none">Explorar consignatarias</a>
            </p>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0">
            consignatarias.com — el precio de referencia del ganado argentino
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface DteReminderParams {
  to: string
  userName?: string
  daysSinceSignup: number
}

/**
 * Sent 24-48h after signup if user hasn't uploaded a DT-e.
 * Gentle nudge to complete activation.
 */
export async function sendDteUploadReminder({ to, userName, daysSinceSignup }: DteReminderParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const greeting = userName ? `Hola ${escapeHtml(userName)}` : 'Hola'
  const timeContext = daysSinceSignup === 1 
    ? 'Ayer te registraste' 
    : `Hace ${daysSinceSignup} días te registraste`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Subí tu primera guía DT-e y llevá el control',
      html: darkEmailShell(`
          <h2 style="color:#fafafa;font-size:16px;font-weight:700;margin:0 0 16px">${greeting},</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${timeContext} en consignatarias.com.ar pero todavía no subiste tu primera guía DT-e.
          </p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;margin-bottom:16px">
            <p style="color:#38bdf8;font-size:11px;margin:0 0 12px;font-weight:bold;text-transform:uppercase;letter-spacing:.12em">
              ¿Por qué subir tus guías?
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              &#10003; Tus datos, guardados de forma segura<br>
              &#10003; Historial de todas tus operaciones<br>
              &#10003; Estadísticas: categorías, pesos, consignatarias<br>
              &#10003; Exportá tus datos cuando quieras
            </p>
          </div>

          <p style="color:#a1a1aa;font-size:12px;margin:0 0 20px">
            Solo tenés que sacarle una foto a tu guía — nosotros extraemos los datos automáticamente.
          </p>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
              Ir a mi panel
            </a>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0">
            consignatarias.com — el precio de referencia del ganado argentino
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface FirstDteSuccessParams {
  to: string
  userName?: string
  dteCount: number
}

/**
 * Sent after user uploads their first DT-e.
 * Celebrates milestone and hints at PRO features.
 */
export async function sendFirstDteSuccess({ to, userName, dteCount }: FirstDteSuccessParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const greeting = userName ? `¡Felicitaciones ${escapeHtml(userName)}!` : '¡Felicitaciones!'

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: '¡Subiste tu primera guía DT-e!',
      html: darkEmailShell(`
          <p style="color:#34d399;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 10px;text-align:center">Primera gu&iacute;a cargada</p>

          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px;text-align:center">${greeting}</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px;text-align:center">
            Ya ${dteCount > 1 ? `tenés ${dteCount} guías` : 'tenés tu primera guía'} guardada en tu cuenta.
          </p>

          <div style="background:#18181b;border:1px solid rgba(52,211,153,.5);border-radius:2px;padding:20px;margin-bottom:20px;text-align:center">
            <p style="color:#34d399;font-size:32px;font-weight:bold;margin:0">${dteCount}</p>
            <p style="color:#71717a;font-size:11px;margin:4px 0 0;text-transform:uppercase;letter-spacing:.12em">guía${dteCount > 1 ? 's' : ''} guardada${dteCount > 1 ? 's' : ''}</p>
          </div>

          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 16px">
            Seguí subiendo tus guías para construir tu historial completo de operaciones.
          </p>

          <div style="background:#18181b;border:1px solid rgba(251,191,36,.4);border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:.12em">
              &#9733; Con PRO
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Exportá tus datos, alertas ilimitadas, y estadísticas avanzadas de tus operaciones.
            </p>
            <p style="margin:12px 0 0">
              <a href="${APP_URL}/planes" style="color:#fbbf24;font-size:12px;text-decoration:none">
                Ver planes PRO &rarr;
              </a>
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
              Ver mis guías
            </a>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0;text-align:center">
            consignatarias.com — el precio de referencia del ganado argentino
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface DteRetentionReminderParams {
  to: string
  userName?: string
  daysSinceLastUpload: number
  totalDtes: number
  totalCabezas: number
}

/**
 * Sent to users who uploaded DTEs but stopped (7+ days inactive).
 * Re-engages churned users with their stats.
 */
export async function sendDteRetentionReminder({
  to,
  userName,
  daysSinceLastUpload,
  totalDtes,
  totalCabezas,
}: DteRetentionReminderParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const greeting = userName ? `Hola ${escapeHtml(userName)}` : 'Hola'
  const formatNumber = (n: number) => n.toLocaleString('es-AR')

  const timeMessage = daysSinceLastUpload >= 30
    ? 'Hace más de un mes'
    : daysSinceLastUpload >= 14
    ? 'Hace dos semanas'
    : 'Hace una semana'

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tu historial te espera — ${formatNumber(totalCabezas)} cabezas registradas`,
      html: darkEmailShell(`
          <h2 style="color:#fafafa;font-size:16px;font-weight:700;margin:0 0 16px">${greeting},</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${timeMessage} que no subís guías DT-e. Tu historial sigue esperándote.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr>
            <td width="49%" style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center">
              <p style="font-family:${EMAIL_MONO};color:#38bdf8;font-size:24px;font-weight:bold;margin:0">${totalDtes}</p>
              <p style="font-family:${EMAIL_MONO};color:#71717a;font-size:10px;margin:4px 0 0;text-transform:uppercase;letter-spacing:.12em">guías guardadas</p>
            </td>
            <td width="2%"></td>
            <td width="49%" style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;text-align:center">
              <p style="font-family:${EMAIL_MONO};color:#38bdf8;font-size:24px;font-weight:bold;margin:0">${formatNumber(totalCabezas)}</p>
              <p style="font-family:${EMAIL_MONO};color:#71717a;font-size:10px;margin:4px 0 0;text-transform:uppercase;letter-spacing:.12em">cabezas</p>
            </td>
          </tr></table>

          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 16px">
            ¿Participaste en algún remate esta semana? Sumá tu próxima guía y mantené tu historial actualizado.
          </p>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
              Ir a mi panel
            </a>
          </div>

          <div style="background:#18181b;border:1px solid rgba(251,191,36,.4);border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:.12em">
              &#9733; Consejo PRO
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Los productores PRO pueden exportar todas sus guías y ver estadísticas avanzadas por categoría y consignataria.
            </p>
            <p style="margin:8px 0 0">
              <a href="${APP_URL}/planes" style="color:#fbbf24;font-size:11px;text-decoration:none">
                Ver planes &rarr;
              </a>
            </p>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0">
            consignatarias.com — el precio de referencia del ganado argentino
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Lead interno del growth engine: entró una demanda de compra. Fire-and-forget. */
export async function sendDemandaLeadInternal(opts: {
  id: number
  categoria: string
  cabezas: number | null
  provincia: string | null
  email: string | null
  webhookUrl: string | null
  origen: string
  matches: number
}) {
  const resend = await getResend()
  if (!resend) return
  const linea = (k: string, v: string) =>
    `<p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">${k}:</strong> ${escapeHtml(v)}</p>`
  resend.emails.send({
    from: FROM,
    to: LEAD_ALERT_TO,
    subject: `Demanda de compra #${opts.id}: ${opts.cabezas ?? '?'} ${opts.categoria}${opts.provincia ? ` — ${opts.provincia}` : ''}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Growth &middot; demanda de compra</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">Comprador buscando hacienda</h2>
      ${linea('Busca', `${opts.cabezas ? opts.cabezas.toLocaleString('es-AR') + ' cab de ' : ''}${opts.categoria}${opts.provincia ? ' en ' + opts.provincia : ''}`)}
      ${opts.email ? linea('Email', opts.email) : ''}
      ${opts.webhookUrl ? linea('Webhook', opts.webhookUrl) : ''}
      ${linea('Origen', opts.origen)}
      ${linea('Remates que ya matchean', String(opts.matches))}
      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:14px 0 0">Rutear a la consignataria que corresponda — este contacto es el activo del motor comisionista.</p>
    `),
  }).catch(() => {})
}

/** Aviso al comprador: remates NUEVOS que matchean su demanda — UN email resumen
 *  por corrida del cron, nunca un mail por remate. Fire-and-forget. */
export async function sendDemandaMatchAlert(opts: {
  to: string
  categoria: string
  cabezas: number | null
  remates: Array<{ titulo: string; consignataria: string; fecha: string; lugar: string; url: string }>
}) {
  const resend = await getResend()
  if (!resend || opts.remates.length === 0) return
  const n = opts.remates.length
  const cards = opts.remates
    .slice(0, 12)
    .map(
      (r) => `
      <div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:14px;margin-bottom:10px">
        <p style="color:#fafafa;font-size:14px;margin:0 0 6px;font-weight:bold"><a href="${r.url}" style="color:#fafafa;text-decoration:none">${escapeHtml(r.titulo)}</a></p>
        <p style="color:#a1a1aa;font-size:12px;margin:0">${escapeHtml(r.consignataria)} &nbsp;&middot;&nbsp; ${escapeHtml(r.fecha)} &nbsp;&middot;&nbsp; ${escapeHtml(r.lugar)} &nbsp;&middot;&nbsp; <a href="${r.url}" style="color:#38bdf8">ver &rarr;</a></p>
      </div>`,
    )
    .join('')
  resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: n === 1 ? `1 remate nuevo matchea tu búsqueda de ${opts.categoria}` : `${n} remates nuevos matchean tu búsqueda de ${opts.categoria}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Tu b&uacute;squeda de hacienda</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">${n === 1 ? 'Apareci&oacute; un remate para vos' : `Aparecieron ${n} remates para vos`}</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 12px">Buscabas ${opts.cabezas ? `${opts.cabezas.toLocaleString('es-AR')} cabezas de ` : ''}${escapeHtml(opts.categoria)} — ${n === 1 ? 'este remate programado matchea' : 'estos remates programados matchean'}:</p>
      ${cards}
      ${n > 12 ? `<p style="color:#71717a;font-size:12px;margin:0 0 12px">&hellip;y ${n - 12} m&aacute;s en el calendario.</p>` : ''}
      <p style="color:#71717a;font-size:11px;line-height:1.6;margin:14px 0 0">Un solo resumen por corrida — sin spam. Calendario completo: ${APP_URL}/remates</p>
    `),
  }).catch(() => {})
}

/** Aviso interno: entró un pago x402 (USDC). Fire-and-forget a LEAD_ALERT_TO. */
export async function sendX402PaymentAlert(opts: {
  route: string
  usdCents: number
  payer: string
  transaction: string
  network: string
}) {
  const resend = await getResend()
  if (!resend) return
  const usd = (opts.usdCents / 100).toFixed(2)
  const txUrl = opts.network === 'base' ? `https://basescan.org/tx/${opts.transaction}` : `https://sepolia.basescan.org/tx/${opts.transaction}`
  resend.emails.send({
    from: FROM,
    to: LEAD_ALERT_TO,
    subject: `💸 Pago x402: US$${usd} en USDC — ${opts.route}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">x402 &middot; pago recibido</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">US$${usd} en USDC</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Endpoint:</strong> ${escapeHtml(opts.route)}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Pagador:</strong> <code style="color:#38bdf8">${escapeHtml(opts.payer)}</code></p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Red:</strong> ${escapeHtml(opts.network)}</p>
      <p style="margin:16px 0 0"><a href="${txUrl}" style="color:#38bdf8">Ver transacci&oacute;n en Basescan &rarr;</a> &nbsp;&middot;&nbsp; <a href="${APP_URL}/admin/ops" style="color:#38bdf8">/admin/ops</a></p>
    `),
  }).catch(() => {})
}

export async function sendNewRemateAlert({
  to,
  remateTitle,
  consignataria,
  provincia,
  fecha,
  url,
}: NewRemateAlertParams) {
  const resend = await getResend()
  if (!resend) return

  const formatDate = (dateStr: string) => {
    const [_y, m, d] = dateStr.split('-')
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${parseInt(d)} de ${months[parseInt(m) - 1]}`
  }

  const safeTitle = escapeHtml(remateTitle)
  const safeConsig = escapeHtml(consignataria)
  const safeProv = escapeHtml(provincia)

  resend.emails.send({
    from: FROM,
    to,
    subject: `Nuevo remate: ${consignataria} — ${formatDate(fecha)}`,
    html: darkEmailShell(`
        <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em">
          &#9733; Nueva publicaci&oacute;n
        </p>
        <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">${safeConsig}</h2>

        <div style="background:#18181b;border:1px solid rgba(251,191,36,.5);border-left:3px solid #fbbf24;border-radius:2px;padding:16px;margin-bottom:16px">
          <p style="color:#fafafa;font-size:14px;margin:0 0 8px;font-weight:bold">${safeTitle}</p>
          <p style="color:#a1a1aa;font-size:12px;margin:0">
            ${formatDate(fecha)} &nbsp;&middot;&nbsp; ${safeProv}
          </p>
        </div>

        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Una consignataria PRO que seguís acaba de publicar un nuevo remate.
          Visitá el link para ver los detalles completos.
        </p>

        <div style="text-align:center;margin:20px 0">
          <a href="${url}" style="background:#38bdf8;color:#09090b;padding:11px 26px;text-decoration:none;border-radius:2px;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver remate</a>
        </div>

        <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
          <p style="color:#71717a;font-size:11px;margin:0">
            Recibís este email porque tenés una alerta activa para ${safeProv || 'esta zona'}.
            <br>
            <a href="${APP_URL}/alertas/unsubscribe?email=${encodeURIComponent(to)}" style="color:#71717a">
              Modificar mis alertas
            </a>
          </p>
        </div>

        <p style="color:#52525b;font-size:10px;margin:16px 0 0">consignatarias.com — el precio de referencia del ganado argentino</p>
    `),
  }).catch(() => {})
}

/* ------------------------------------------------------------------ */
/*  REMATE RESULTS TO PRODUCER (Mail 3 — post-remate, gated)          */
/* ------------------------------------------------------------------ */

interface RemateResultsToProducerParams {
  to: string
  consignataria: string
  slug: string
  location: string
  /** Categoría más operada (ej. "Terneros"). */
  topCategoria: string
  /** Precio promedio $/kg de la categoría más operada. */
  avgPrice: number
  /** Cabezas vendidas (de esa categoría o total del remate). */
  cabezas: number
}

/**
 * sendRemateResultsToProducer — Mail 3 de la secuencia de subasta al productor:
 * "así cerró el remate de {firma}". Va a quien sigue la firma (watchlist/alerta).
 *
 * GATED: el caller SOLO debe dispararlo cuando hay promedios cargados en el perfil
 * (avgPrice/cabezas reales) — nunca en seco. Transaccional → FROM=noreply (no pide
 * respuesta), respeta /unsubscribe + headers List-Unsubscribe. Calcado del patrón
 * de los mails de mercado (mismo tema terminal, mismo getResend, success/error).
 */
export async function sendRemateResultsToProducer({
  to,
  consignataria,
  slug,
  location,
  topCategoria,
  avgPrice,
  cabezas,
}: RemateResultsToProducerParams): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  const safeConsig = escapeHtml(consignataria)
  const safeLoc = escapeHtml(location)
  const safeCat = escapeHtml(topCategoria)
  const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
  const cabezasFmt = cabezas.toLocaleString('es-AR')
  const perfilUrl = `${APP_URL}/consignatarias/${slug}?utm_source=email&utm_medium=remate_results&utm_campaign=auction_mail_3`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      headers: {
        'List-Unsubscribe': `<${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      subject: `Así cerró el remate de ${consignataria}`,
      html: darkEmailShell(`
          <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 8px">
            Resultados del remate
          </p>
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">${safeConsig}</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            Cerró el remate de <strong style="color:#fafafa">${safeConsig}</strong> en ${safeLoc}.
          </p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.12em">${safeCat}</p>
            <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0">${money(avgPrice)}<span style="color:#71717a;font-size:16px">/kg</span></p>
            <p style="color:#71717a;font-size:11px;margin:6px 0 0">promedio sobre ${cabezasFmt} cabezas</p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${perfilUrl}" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Ver todos los promedios</a>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0">
            Recibís este email porque seguís a ${safeConsig} en consignatarias.com.ar
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  NEWSLETTER SUBSCRIBER WELCOME                                      */
/* ------------------------------------------------------------------ */

interface NewsletterWelcomeParams {
  to: string
  source?: string
}

/**
 * Sent to new newsletter subscribers.
 * Different from user welcome - these are anonymous subscribers interested in remates.
 */
export async function sendNewsletterWelcome({ to, source }: NewsletterWelcomeParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  // Source normalizado + helpers de pertenencia a segmento. Importamos los arrays
  // canónicos de newsletter-segments en vez de re-listarlos a mano: así el "qué vas a
  // recibir" del welcome no se desincroniza del ruteo real (los 3 sources de alerta —
  // alerta-arrendamiento/alerta-inmag/watchlist-notify — ya no caen al bullet genérico
  // que contradecía lo que el form prometió).
  const src = (source ?? '').trim().toLowerCase()
  const inSegment = (seg: readonly string[]) => (seg as readonly string[]).includes(src)
  const isWeekly = inSegment(SEGMENT_SOURCES.weekly)
  const isMonthlyClose = inSegment(SEGMENT_SOURCES.monthlyClose)
  const isFaena = inSegment(SEGMENT_SOURCES.faena)
  const isCorredor = inSegment(SEGMENT_SOURCES.corredor)
  const isSubastaPorFirma = inSegment(SEGMENT_SOURCES.subastaPorFirma)
  const isProductOnly = inSegment(PRODUCT_UPDATE_ONLY)

  const sourceContext = src === 'remates'
    ? 'Te suscribiste desde nuestra página de remates.'
    : src === 'frigorificos'
    ? 'Te suscribiste desde nuestra sección de frigoríficos.'
    : isMonthlyClose
    ? 'Te suscribiste al cierre mensual del Índice Novillo. El 1° de cada mes vas a recibir el promedio del mes que cerró — el número que se usa para liquidar arrendamientos.'
    : isSubastaPorFirma
    ? 'Te suscribiste a los recordatorios de remate de las firmas que seguís.'
    : 'Te suscribiste a nuestro newsletter.'

  // Qué recibe REALMENTE según a qué se suscribió (alineado con newsletter-segments).
  const bullets =
    isMonthlyClose
      ? '<strong>Cierre mensual del Índice Novillo</strong> — el promedio del mes que cerró, el 1°'
    : isFaena
      ? '<strong>Reporte mensual de faena</strong> — cabezas faenadas, variación interanual y acumulado'
    : isCorredor
      ? '<strong>El Corredor</strong> — el cierre mensual del mercado bovino, en PDF'
    : isSubastaPorFirma
      ? '<strong>Recordatorios de remate</strong> — te avisamos antes de cada subasta de las firmas que seguís (el día previo y al arrancar) y cómo cerró'
    : isProductOnly
      ? 'Te avisamos cuando <strong>mejoremos la herramienta</strong> o agreguemos nuevos campos'
    : isWeekly
      ? '<strong>Resumen semanal de remates</strong> — los más importantes, cada lunes'
      : '<strong>Resumen semanal de remates</strong> — los más importantes, cada lunes' // fail-safe: igual que isWeeklyRecipient

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Bienvenido al newsletter de Consignatarias.com.ar',
      html: darkEmailShell(`
          <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 16px">¡Gracias por suscribirte!</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${sourceContext}
          </p>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 20px">
            A partir de ahora vas a recibir:
          </p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#fafafa;font-size:13px;margin:0;line-height:1.8">
              ${bullets}
            </p>
          </div>

          <div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:16px;margin-bottom:20px">
            <p style="color:#38bdf8;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:.12em">
              ¿Sabías que podés crear una cuenta gratis?
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Con una cuenta podés guardar tus guías DT-e, configurar alertas personalizadas y acceder a estadísticas de tus operaciones.
            </p>
            <p style="margin:12px 0 0">
              <a href="${APP_URL}/registro" style="color:#38bdf8;font-size:12px;text-decoration:none;font-weight:bold">
                Crear cuenta gratis &rarr;
              </a>
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/remates" style="background:#38bdf8;color:#09090b;padding:12px 28px;text-decoration:none;border-radius:2px;display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">
              Ver próximos remates
            </a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:16px;margin-top:24px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px">
              También podés explorar:
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              &rarr; <a href="${APP_URL}/mercado/inmag" style="color:#38bdf8;text-decoration:none">Precios INMAG actualizados</a><br>
              &rarr; <a href="${APP_URL}/consignatarias" style="color:#38bdf8;text-decoration:none">Directorio de consignatarias</a><br>
              &rarr; <a href="${APP_URL}/frigorificos" style="color:#38bdf8;text-decoration:none">Frigoríficos habilitados</a>
            </p>
          </div>

          <p style="color:#52525b;font-size:10px;margin:24px 0 0">
            consignatarias.com — el precio de referencia del ganado argentino
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">Desuscribirme</a>
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  INVITACIÓN A SUSCRIBIRSE — one-time, a contactos warm              */
/* ------------------------------------------------------------------ */

/**
 * Invitación ÚNICA y personal (de José) a contactos con relación previa para
 * que SE SUSCRIBAN ellos al cierre mensual. No los agrega a la lista — los
 * lleva a opt-in. From personal (reply-able), no "noreply". Una sola vez.
 */
export async function sendSubscriptionInvite(
  to: string,
  opts: { nombre?: string; inmagToday?: number } = {},
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const saludo = opts.nombre ? `Hola ${escapeHtml(opts.nombre)},` : 'Hola,'
  const precio = opts.inmagToday
    ? `$${Math.round(opts.inmagToday).toLocaleString('es-AR')}/kg`
    : null
  const subscribeUrl = `${APP_URL}/mercado/inmag?ref=invite`
  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to,
      replyTo: 'hola@consignatarias.com',
      subject: precio ? `El Índice Novillo cerró en ${precio} — ¿te lo mando cada mes?` : 'El cierre mensual del Índice Novillo — ¿te interesa?',
      html: darkEmailShell(`
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 12px">${saludo}</p>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 12px">Soy José Barnetche. Armamos <strong style="color:#fafafa">consignatarias.com.ar</strong> — el INMAG y los precios del Mercado Agroganadero, al día.</p>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 12px">Todos los meses publicamos el <strong style="color:#fafafa">cierre del Índice Novillo</strong>${precio ? ` (hoy <strong style="color:#38bdf8">${precio}</strong>)` : ''} — el número que se usa para liquidar arrendamientos y seguir el mercado.</p>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 12px">Si te sirve, te lo puedo mandar <strong style="color:#fafafa">el 1° de cada mes</strong>. Suscribite acá (30 segundos):</p>
          <p style="margin:24px 0">
            <a href="${subscribeUrl}" style="background:#38bdf8;color:#09090b;padding:11px 22px;text-decoration:none;border-radius:2px;font-weight:600;font-size:13px">Recibir el cierre mensual &rarr;</a>
          </p>
          <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 8px">Si no te interesa, ignorá este mail — no te escribo de nuevo. Cualquier cosa, respondé a este correo.</p>
          <p style="color:#52525b;font-size:13px;margin:0">José &middot; consignatarias.com.ar</p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ----------------------------------------------------------------
// El Corredor — entrega del PDF al suscribirse al lead magnet
// ----------------------------------------------------------------

export async function sendElCorredorDelivery(email: string, edition: string, pdfUrl: string) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY no configurado' }

  const safeEdition = escapeHtml(edition)
  const safeUrl = escapeHtml(pdfUrl)

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `El Corredor · ${edition} — tu copia adentro`,
      html: darkEmailShell(`
          <div style="font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #71717a; margin-bottom: 24px;">
            Mercado Decision Infrastructure
          </div>

          <h1 style="font-size: 36px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 4px 0;">El Corredor</h1>
          <div style="font-size: 14px; color: #38bdf8; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 24px;">${safeEdition}</div>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 20px 0;">
            Acá va tu copia del cierre mensual del mercado bovino argentino.
            12 páginas con INMAG en USD reales, comparable interanual, 18 buckets del MAG,
            lectura del ciclo y tesis del mes próximo.
          </p>

          <p style="margin: 28px 0;">
            <a href="${safeUrl}" style="display: inline-block; background: #38bdf8; color: #09090b; padding: 14px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; border-radius: 2px;">
              Descargar PDF →
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;">

          <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0 0 12px 0;">
            La próxima edición sale el primer día hábil del mes que viene. Si no la querés recibir,
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #71717a;">desuscribite acá</a>.
          </p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0;">
            Mesa de mercado &middot; consignatarias.com
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Corrección de El Corredor — se manda cuando el blast salió con la edición
 * equivocada (2026-08-01: el manifest importado estáticamente hizo que el mail de
 * agosto linkeara Junio). Dice el error de frente, da el link correcto y abre el
 * canal directo por WhatsApp. No reemplaza al delivery normal.
 */
export async function sendElCorredorCorreccion(email: string, edition: string, pdfUrl: string) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY no configurado' }

  const safeEdition = escapeHtml(edition)
  const safeUrl = escapeHtml(pdfUrl)
  const waText = encodeURIComponent('Hola, les escribo por El Corredor de consignatarias.com.ar')
  const waUrl = `https://wa.me/5493773418130?text=${waText}`

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Perdón — te mandamos El Corredor equivocado. Acá va el de ${edition}`,
      html: darkEmailShell(`
          <div style="font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #71717a; margin-bottom: 24px;">
            Mercado Decision Infrastructure
          </div>

          <h1 style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 4px 0;">El Corredor</h1>
          <div style="font-size: 14px; color: #38bdf8; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 24px;">${safeEdition} &middot; corrección</div>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0;">
            Hace un rato te enviamos <strong style="color:#fafafa">El Corredor</strong>, nuestro resumen
            mensual de lo que sucede en el mercado. Cometimos un error: te mandamos el de
            <strong style="color:#fafafa">Junio</strong> en lugar del de ${safeEdition}.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 20px 0;">
            Tocá el botón para abrir el de ${safeEdition}, que es el que corresponde.
          </p>

          <p style="margin: 28px 0;">
            <a href="${safeUrl}" style="display: inline-block; background: #38bdf8; color: #09090b; padding: 14px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; border-radius: 2px;">
              Abrir El Corredor de ${safeEdition} →
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;">

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0;">
            Si querés comunicarte directamente con nosotros para conocer más del proyecto, o dejarnos
            cualquier comentario, bienvenido sea. Gracias.
          </p>

          <p style="margin: 20px 0 28px 0;">
            <a href="${waUrl}" style="display: inline-block; background: #18181b; border: 1px solid #10b981; color: #10b981; padding: 12px 22px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; font-size: 13px; border-radius: 2px;">
              Escribinos por WhatsApp
            </a>
          </p>

          <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0 0 12px 0;">
            La próxima edición sale el primer día hábil del mes que viene. Si no la querés recibir,
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #71717a;">desuscribite acá</a>.
          </p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0;">
            Mesa de mercado &middot; consignatarias.com
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Qué se suscribió cada uno, en criollo. Se le nombra al lector lo que él pidió,
 * no el slug interno. Si aparece un source nuevo cae en el genérico.
 */
const SOURCE_EN_CRIOLLO: Record<string, string> = {
  'cierre-mensual': 'el cierre mensual del precio del novillo',
  frigorificos: 'las novedades de frigoríficos',
  'arrendamiento-liquidacion': 'la liquidación de arrendamientos',
  'alerta-arrendamiento': 'el aviso del valor del arrendamiento',
  'alerta-inmag': 'el aviso del precio del novillo',
  'exportar-datos': 'la descarga de datos del mercado',
  valuation_widget: 'la calculadora de cuánto vale tu hacienda',
  calculadora: 'la calculadora del sitio',
  'watchlist-notify': 'los avisos de lo que seguís',
  'cuenta-checklist': 'tu cuenta en el sitio',
}

export function sourceEnCriollo(source: string | null): string {
  return (source && SOURCE_EN_CRIOLLO[source]) || 'una de las alertas del sitio'
}

/**
 * Invitación a El Corredor para quien NO está en la audiencia del informe.
 *
 * TEXTO PLANO a propósito: se tiene que sentir un correo de una persona, no una
 * pieza de marca (el lector es un productor, no un usuario de terminal). Mismo
 * patrón que sendRemateConfirmRequest: FROM_PERSONAL, replyTo real,
 * List-Unsubscribe (mitigación AUP). El opt-in es responder el correo — cero
 * fricción para el lector y pone a Jose a hablar con él, que es el punto.
 */
export async function sendElCorredorInvitacion(email: string, source: string | null) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY no configurado' }

  const waText = encodeURIComponent('Hola José, te escribo por el resumen mensual del mercado')
  const waUrl = `https://wa.me/5493773418130?text=${waText}`

  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to: email,
      replyTo: 'agro@memola.com.ar',
      headers: {
        'List-Unsubscribe': `<${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      subject: '¿Te sirve un resumen del mercado, una vez por mes?',
      // OJO: cada párrafo va en UNA sola línea. Si se cortan a mano (~65 chars),
      // el cliente de mail vuelve a cortar por ancho de pantalla y quedan saltos
      // en la segunda palabra del renglón. Los únicos \n son entre párrafos y
      // entre viñetas.
      text: [
        'Hola, soy José Barnetche, de consignatarias.com.ar.',
        '',
        `Tengo tu correo anotado porque te suscribiste a ${sourceEnCriollo(source)}. Te escribo por otra cosa, y es corta.`,
        '',
        'Todos los meses armamos un resumen de lo que pasó en el Mercado de Cañuelas. Sale el primer día del mes y trae:',
        '',
        '· A cuánto cerró el novillo, en pesos y en dólares.',
        '· Cómo se movió cada categoría: terneros, vaquillonas, vacas, toros.',
        '· Cuánta hacienda se vendió, y si fue más o menos que el mes pasado.',
        '· Si se están reteniendo vientres o vendiendo. Eso le marca a uno si conviene esperar o salir.',
        '· Qué esperar para el mes que viene.',
        '',
        'Es gratis y son doce carillas, con los números y de dónde salen.',
        '',
        '¿Querés que te lo mande? Respondeme este correo con un "sí" y te sumo.',
        '',
        `Si preferís, escribime por WhatsApp: ${waUrl}`,
        '',
        'Y si no te interesa, no hace falta que hagas nada. Igual seguís recibiendo lo que pediste.',
        '',
        'Gracias,',
        'José',
        '',
        '—',
        'José Barnetche · consignatarias.com.ar',
      ].join('\n'),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Aviso interno: entró un campo nuevo para moderar. Fire-and-forget. */
export async function sendCampoPublicadoOps(opts: {
  id: number
  resumen: string
  precio: string
  contacto: string
}) {
  const resend = await getResend()
  if (!resend) return
  resend.emails.send({
    from: FROM,
    to: LEAD_ALERT_TO,
    subject: `🌾 Campo nuevo para revisar #${opts.id}: ${opts.resumen}`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Inmobiliaria rural &middot; alta</p>
      <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 14px">Entró un campo</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Campo:</strong> ${escapeHtml(opts.resumen)}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Precio:</strong> ${escapeHtml(opts.precio)}</p>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 8px"><strong style="color:#fafafa">Contacto:</strong> ${escapeHtml(opts.contacto)}</p>
      <p style="color:#71717a;font-size:12px;line-height:1.6;margin:14px 0 0">Está en <strong>pendiente</strong>: no se ve en el sitio hasta que lo apruebes.</p>
      <p style="margin:16px 0 0"><a href="${APP_URL}/admin/campos" style="color:#38bdf8">Revisar en admin &rarr;</a></p>
    `),
  }).catch(() => {})
}

/**
 * Consulta de El Ovejero a una consignataria: "tengo este productor en tu zona,
 * ¿podés resolverlo?". Es outreach en frío, así que va con los mismos recaudos que
 * sendRemateConfirmRequest: texto plano, FROM_PERSONAL, replyTo real,
 * List-Unsubscribe. El cupo diario y el freno de 30 días viven en ovejero.ts.
 *
 * La vara para mandarlo: tiene que ser una OPORTUNIDAD para quien lo recibe —un
 * comprador o un arrendatario concreto de su zona—, no una novedad nuestra. Si
 * alguna vez deja de serlo, se apaga con OVEJERO_OUTREACH=off.
 */
export async function sendConsultaLeadAConsignataria(opts: {
  to: string
  firma: string
  resumenLead: string
  zona: string
  leadId: number
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend no configurado' }

  try {
    await resend.emails.send({
      from: FROM_PERSONAL,
      to: opts.to,
      replyTo: 'agro@memola.com.ar',
      headers: {
        'List-Unsubscribe': `<${APP_URL}/unsubscribe?email=${encodeURIComponent(opts.to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      subject: `Un productor de ${opts.zona} — ¿lo pueden atender?`,
      text: [
        `Buenas, soy José de consignatarias.com.ar.`,
        '',
        `Nos entró un productor por el sitio y es de la zona de ustedes: ${opts.resumenLead}.`,
        '',
        `¿Tenés algo así en cartera? Avisame y se lo comunico.`,
        '',
        `Si no es lo suyo, respondeme igual con un "no" y no te escribo más por este tipo de consultas.`,
        '',
        `Gracias,`,
        `José`,
        '',
        '—',
        `José Barnetche · consignatarias.com.ar · ref ${opts.leadId}`,
      ].join('\n'),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Digest diario de El Ovejero. Sale SOLO si hay algo que hacer — un agente que
 * manda "hoy no pasó nada" todos los días deja de leerse a la semana.
 * Todo viene con el link de WhatsApp armado: la acción a un toque.
 */
export async function sendOvejeroDigest(opts: {
  matches: Array<{ quienBusca: string; queBusca: string; quienOfrece: string; queOfrece: string; motivo: string; waBusca: string | null; waOfrece: string | null }>
  pendientes: Array<{ nombre: string; detalle: string; dias: number; urgente: boolean; wa: string | null; email: string | null }>
  zonas: Array<{ provincia: string; buscan: number; mensaje: string; firmas: Array<{ nombre: string; wa: string | null }> }>
  consultas?: Array<{ firma: string; leadResumen: string; email: string }>
  sinRespuesta?: Array<{ nombre: string; resumen: string; diagnostico: string; agotado: boolean; wa: string | null }>
  ranking?: Array<{ nombre: string; resumen: string; score: number; porQue: string }>
}) {
  const resend = await getResend()
  if (!resend) return
  const { matches, pendientes, zonas } = opts
  const consultas = opts.consultas ?? []
  const sinRespuesta = opts.sinRespuesta ?? []
  const ranking = opts.ranking ?? []

  const bloque = (titulo: string, cuerpo: string) =>
    `<h3 style="color:#fafafa;font-size:15px;font-weight:700;margin:26px 0 10px">${titulo}</h3>${cuerpo}`

  const matchesHtml = matches.length
    ? bloque(
        `🤝 ${matches.length} ${matches.length === 1 ? 'cruce posible' : 'cruces posibles'} de arrendamiento`,
        matches
          .map(
            (m) => `<div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #10b981;border-radius:2px;padding:14px;margin-bottom:10px">
              <p style="color:#fafafa;font-size:14px;margin:0 0 6px"><strong>${escapeHtml(m.quienBusca)}</strong> busca ${escapeHtml(m.queBusca)}</p>
              <p style="color:#fafafa;font-size:14px;margin:0 0 6px"><strong>${escapeHtml(m.quienOfrece)}</strong> ofrece ${escapeHtml(m.queOfrece)}</p>
              <p style="color:#a1a1aa;font-size:12px;margin:0 0 8px">${escapeHtml(m.motivo)}</p>
              ${m.waBusca ? `<a href="${m.waBusca}" style="color:#10b981;font-size:12px;margin-right:14px">WhatsApp a quien busca &rarr;</a>` : ''}
              ${m.waOfrece ? `<a href="${m.waOfrece}" style="color:#10b981;font-size:12px">WhatsApp a quien ofrece &rarr;</a>` : ''}
            </div>`,
          )
          .join(''),
      )
    : ''

  const pendientesHtml = pendientes.length
    ? bloque(
        `⏳ ${pendientes.length} ${pendientes.length === 1 ? 'lead esperando' : 'leads esperando'} respuesta`,
        pendientes
          .map(
            (p) => `<div style="background:#18181b;border:1px solid ${p.urgente ? '#f87171' : '#27272a'};border-left:3px solid ${p.urgente ? '#f87171' : '#fbbf24'};border-radius:2px;padding:14px;margin-bottom:10px">
              <p style="color:#fafafa;font-size:14px;margin:0 0 4px"><strong>${escapeHtml(p.nombre)}</strong> — ${escapeHtml(p.detalle)}</p>
              <p style="color:${p.urgente ? '#f87171' : '#a1a1aa'};font-size:12px;margin:0 0 8px">${p.dias} ${p.dias === 1 ? 'día' : 'días'} esperando${p.urgente ? ' · se está enfriando' : ''}</p>
              ${p.wa ? `<a href="${p.wa}" style="color:#10b981;font-size:12px;margin-right:14px">Escribirle por WhatsApp &rarr;</a>` : ''}
              ${p.email ? `<a href="mailto:${escapeHtml(p.email)}" style="color:#38bdf8;font-size:12px">Mail &rarr;</a>` : ''}
            </div>`,
          )
          .join(''),
      )
    : ''

  const zonasHtml = zonas.length
    ? bloque(
        `📍 Falta oferta en ${zonas.length} ${zonas.length === 1 ? 'zona' : 'zonas'}`,
        zonas
          .map(
            (z) => `<div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #38bdf8;border-radius:2px;padding:14px;margin-bottom:10px">
              <p style="color:#fafafa;font-size:14px;margin:0 0 6px"><strong>${escapeHtml(z.provincia)}</strong> — ${z.buscan} ${z.buscan === 1 ? 'productor busca' : 'productores buscan'} campo y no tenemos ninguno para ofrecer.</p>
              <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 10px;font-style:italic">"${escapeHtml(z.mensaje)}"</p>
              <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.1em">Pedirle cartera a:</p>
              ${z.firmas.map((f) => (f.wa ? `<a href="${f.wa}" style="color:#10b981;font-size:12px;display:inline-block;margin:0 12px 4px 0">${escapeHtml(f.nombre)} &rarr;</a>` : `<span style="color:#71717a;font-size:12px;display:inline-block;margin:0 12px 4px 0">${escapeHtml(f.nombre)} (sin tel)</span>`)).join('')}
            </div>`,
          )
          .join(''),
      )
    : ''

  // Lo que el agente ya hizo solo — va PRIMERO: es lo único que no requiere a Jose.
  const consultasHtml = consultas.length
    ? bloque(
        `✉️ ${consultas.length} ${consultas.length === 1 ? 'consulta enviada' : 'consultas enviadas'} en tu nombre`,
        `<div style="background:#18181b;border:1px solid #27272a;border-left:3px solid #10b981;border-radius:2px;padding:14px;margin-bottom:10px">
          ${consultas.map((c) => `<p style="color:#d4d4d8;font-size:13px;margin:0 0 6px">→ <strong style="color:#fafafa">${escapeHtml(c.firma)}</strong> — ${escapeHtml(c.leadResumen)}<br><span style="color:#71717a;font-size:11px">${escapeHtml(c.email)}</span></p>`).join('')}
          <p style="color:#71717a;font-size:11px;margin:10px 0 0">Las respuestas llegan a agro@memola.com.ar. Cuando alguna diga que tiene, avisale al productor vos.</p>
        </div>`,
      )
    : ''

  // El "¿y si no responden?": lo agotado va arriba porque necesita decisión.
  const sinRespuestaHtml = sinRespuesta.length
    ? bloque(
        `🔁 ${sinRespuesta.length} ${sinRespuesta.length === 1 ? 'lead consultado sin respuesta' : 'leads consultados sin respuesta'}`,
        sinRespuesta
          .map(
            (s) => `<div style="background:#18181b;border:1px solid ${s.agotado ? '#fbbf24' : '#27272a'};border-left:3px solid ${s.agotado ? '#fbbf24' : '#71717a'};border-radius:2px;padding:14px;margin-bottom:10px">
              <p style="color:#fafafa;font-size:14px;margin:0 0 4px"><strong>${escapeHtml(s.nombre)}</strong> — ${escapeHtml(s.resumen)}${s.agotado ? ' <span style="color:#fbbf24;font-size:11px">· AGOTADO, decide vos</span>' : ''}</p>
              <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 8px">${escapeHtml(s.diagnostico)}</p>
              ${s.wa ? `<a href="${s.wa}" style="color:#10b981;font-size:12px">Escribirle al productor &rarr;</a>` : ''}
            </div>`,
          )
          .join(''),
      )
    : ''

  const rankingHtml = ranking.length
    ? bloque(
        '📊 Dónde conviene poner la energía',
        `<div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:14px">
          ${ranking.map((r, i) => `<p style="color:#d4d4d8;font-size:13px;margin:0 0 6px"><span style="color:#71717a">${i + 1}.</span> <strong style="color:#fafafa">${escapeHtml(r.nombre)}</strong> — ${escapeHtml(r.resumen)}<br><span style="color:#71717a;font-size:11px">${escapeHtml(r.porQue)}</span></p>`).join('')}
        </div>`,
      )
    : ''

  const total = matches.length + pendientes.length + zonas.length + consultas.length
  resend.emails.send({
    from: FROM,
    to: LEAD_ALERT_TO,
    subject: `El Ovejero — ${consultas.length ? `${consultas.length} ${consultas.length === 1 ? 'consulta enviada' : 'consultas enviadas'}, ` : ''}${total - consultas.length} para vos`,
    html: darkEmailShell(`
      <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">El Ovejero &middot; parte del día</p>
      <h2 style="color:#fafafa;font-size:20px;font-weight:700;margin:0 0 4px">Lo que hice y lo que te dejo</h2>
      <p style="color:#71717a;font-size:12px;margin:0 0 4px">Solo te escribo cuando hay algo para hacer.</p>
      ${consultasHtml}${sinRespuestaHtml}${matchesHtml}${pendientesHtml}${zonasHtml}${rankingHtml}
      <p style="margin:26px 0 0"><a href="${APP_URL}/admin/leads" style="color:#38bdf8;font-size:13px">Abrir el board de leads &rarr;</a></p>
    `),
  }).catch(() => {})
}

/* ============================================================
   Enterprise welcome — sent on api_tier activation
   ============================================================ */
interface EnterpriseWelcomeParams {
  to: string
  plan: 'starter' | 'growth' | 'scale'
}

const ENTERPRISE_PLAN_LABEL: Record<'starter' | 'growth' | 'scale', string> = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
}

const ENTERPRISE_PLAN_QUOTA: Record<'starter' | 'growth' | 'scale', string> = {
  starter: '1.000 req/mes',
  growth: '50.000 req/mes',
  scale: '100.000+ req/mes',
}

export async function sendEnterpriseWelcome(p: EnterpriseWelcomeParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not set' }

  const planLabel = ENTERPRISE_PLAN_LABEL[p.plan]
  const quota = ENTERPRISE_PLAN_QUOTA[p.plan]
  const dashboardUrl = `${APP_URL}/cuenta/api-keys`
  const docsUrl = `${APP_URL}/api-docs`

  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      replyTo: ADMIN_EMAIL,
      subject: `Bienvenido a Enterprise ${planLabel} — consignatarias.com.ar`,
      html: darkEmailShell(`
          <div style="font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #38bdf8; margin-bottom: 24px;">
            Enterprise &middot; ${planLabel}
          </div>

          <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 16px 0;">
            Tu plan Enterprise ${planLabel} está activo
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0;">
            Bienvenido. Tenés acceso a <strong style="color:#38bdf8">${quota}</strong>
            sobre toda nuestra API (INMAG histórico, 16 sub-categorías, calendario
            de remates, directorios, lote-level).
          </p>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 2px; padding: 16px; margin: 24px 0;">
            <p style="margin:0 0 8px 0; color:#fafafa; font-weight:600; font-size:13px;">Próximos 3 pasos:</p>
            <ol style="margin:0; padding-left:20px; color:#d4d4d8; font-size:13px; line-height:1.7;">
              <li>Andá a <a href="${dashboardUrl}" style="color:#38bdf8">/cuenta/api-keys</a> y generá tu primera key</li>
              <li>Guardala en tu .env como <code style="color:#fbbf24">CONSIGNATARIAS_API_KEY</code></li>
              <li>Probá un endpoint: <code style="color:#fbbf24">curl /api/precios?detallado=true -H "Authorization: Bearer …"</code></li>
            </ol>
          </div>

          <p style="margin: 28px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #38bdf8; color: #09090b; padding: 14px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; border-radius: 2px;">
              Generar API key →
            </a>
            <a href="${docsUrl}" style="display: inline-block; color: #a1a1aa; padding: 14px 12px; text-decoration: none; font-size: 13px;">
              Ver docs
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;">

          <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0;">
            Te avisamos por email cuando tu cuota mensual llegue al 80%.
            La suscripción se renueva automáticamente cada mes; cancelás
            desde tu dashboard cuando quieras.
          </p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0;">
            Mesa de mercado &middot; consignatarias.com
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ============================================================
   Enterprise API quota alert (80% threshold)
   ============================================================ */
interface QuotaAlertParams {
  to: string
  keyName: string
  prefix: string
  plan: 'starter' | 'growth' | 'scale'
  used: number
  limit: number
}

export async function sendQuotaAlert(p: QuotaAlertParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not set' }

  const safeName = escapeHtml(p.keyName)
  const safePrefix = escapeHtml(p.prefix)
  const pct = Math.round((p.used / p.limit) * 100)
  const usedFmt = p.used.toLocaleString('en-US')
  const limitFmt = p.limit.toLocaleString('en-US')
  const remainingFmt = (p.limit - p.used).toLocaleString('en-US')
  const planLabel = p.plan.charAt(0).toUpperCase() + p.plan.slice(1)
  const dashboardUrl = `${APP_URL}/cuenta/api-keys`
  const enterpriseUrl = `${APP_URL}/enterprise`

  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      replyTo: ADMIN_EMAIL,
      subject: `Tu API key "${p.keyName}" llegó al ${pct}% del cupo mensual`,
      html: darkEmailShell(`
          <div style="font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #fbbf24; margin-bottom: 24px;">
            Enterprise API &middot; ${planLabel}
          </div>

          <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 16px 0;">
            Tu cupo mensual está al ${pct}%
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 20px 0;">
            La key <strong style="color:#fafafa">${safeName}</strong>
            (<code style="color:#fbbf24">${safePrefix}…</code>) ya consumió
            <strong style="color:#fbbf24">${usedFmt}</strong> requests de las
            <strong>${limitFmt}</strong> incluidas en tu plan
            <strong style="color:#38bdf8">${planLabel}</strong>.
          </p>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 2px; padding: 16px; margin: 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; font-family:${EMAIL_MONO}; font-size: 13px; color: #d4d4d8;">
              <tr><td style="padding: 4px 0; color: #71717a;">Usado este mes</td><td style="padding: 4px 0; text-align: right; color: #fbbf24;">${usedFmt}</td></tr>
              <tr><td style="padding: 4px 0; color: #71717a;">Restante</td><td style="padding: 4px 0; text-align: right;">${remainingFmt}</td></tr>
              <tr><td style="padding: 4px 0; color: #71717a;">Cupo plan ${planLabel}</td><td style="padding: 4px 0; text-align: right;">${limitFmt}</td></tr>
            </table>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 20px 0;">
            Si superás el cupo, las requests siguientes devolverán
            <code style="color:#f87171">429 quota_exceeded</code> hasta el 1ero del próximo mes.
            No cortamos sin avisar — este es ese aviso.
          </p>

          <p style="margin: 28px 0;">
            <a href="${enterpriseUrl}" style="display: inline-block; background: #38bdf8; color: #09090b; padding: 14px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; border-radius: 2px;">
              Pasar al plan siguiente →
            </a>
            <a href="${dashboardUrl}" style="display: inline-block; color: #a1a1aa; padding: 14px 12px; text-decoration: none; font-size: 13px;">
              Ver mi uso
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;">

          <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0;">
            Te enviamos este aviso una sola vez por mes. Si necesitás un upgrade prorrateado
            o tenés dudas, respondé este mail.
          </p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0;">
            Mesa de mercado &middot; consignatarias.com
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ============================================================
   Trial nudge — free-credits invite, 7 and 3 days before end
   Subtle, usage-aware. Showcases the full API + Growth. No cutoff.
   ============================================================ */
interface TrialNudgeParams {
  to: string
  daysLeft: number // 7 or 3
  used: number
  limit: number
  plan: 'starter' | 'growth' | 'scale'
  trialEndsAtIso: string
}

export async function sendTrialNudge(p: TrialNudgeParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not set' }

  const usedFmt = p.used.toLocaleString('en-US')
  const limitFmt = p.limit.toLocaleString('en-US')
  const endsFmt = new Date(p.trialEndsAtIso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  })
  const enterpriseUrl = `${APP_URL}/enterprise`
  const docsUrl = `${APP_URL}/api-docs`

  const subject =
    p.daysLeft <= 3
      ? `Tu prueba de la API termina el ${endsFmt} — ¿seguimos?`
      : `Llevás ${usedFmt} requests — ¿cómo venís usando la API?`

  try {
    await resend.emails.send({
      from: FROM,
      to: p.to,
      replyTo: ADMIN_EMAIL,
      subject,
      html: darkEmailShell(`
          <div style="font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #38bdf8; margin-bottom: 24px;">
            Enterprise API
          </div>

          <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 16px 0;">
            Llevás <span style="color:#38bdf8">${usedFmt}</span> requests en tu prueba
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0;">
            Queríamos saber, sin apuro, <strong style="color:#fafafa">cómo las venís usando</strong>.
            ¿Estás valorizando rodeos, integrando el calendario, siguiendo el INMAG?
            Contanos en qué la estás enchufando — respondé este mail y lo charlamos.
          </p>

          <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px 0;">
            Tu acceso de prueba sigue activo${
              p.daysLeft <= 3
                ? ` hasta el <strong style="color:#fafafa">${endsFmt}</strong>`
                : `; va hasta el <strong style="color:#fafafa">${endsFmt}</strong>`
            }.
            Usaste ${usedFmt} de ${limitFmt} requests del período.
          </p>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 2px; padding: 18px; margin: 24px 0;">
            <p style="margin:0 0 12px 0; color:#fafafa; font-weight:600; font-size:13px;">Todo lo que ya tenés a mano en la API:</p>
            <ul style="margin:0; padding-left:18px; color:#d4d4d8; font-size:13px; line-height:1.8;">
              <li>INMAG diario + serie histórica completa (desde 2015)</li>
              <li>16 sub-categorías oficiales del MAG con corte por peso (novillos, novillitos, vaquillonas, vacas, toros, terneros)</li>
              <li>USD oficial y blue, serie histórica desde 2011</li>
              <li>Calendario de remates: próximos, búsqueda, por consignataria y por provincia</li>
              <li>Directorio de 104 consignatarias + 364 frigoríficos</li>
              <li>Webhooks firmados (nuevo remate, cambio de INMAG, alertas de precio)</li>
              <li>Exports CSV/JSON bajo demanda</li>
              <li>Documentación + ejemplos en Python y JS</li>
            </ul>
          </div>

          <div style="background: #18181b; border: 1px solid rgba(56,189,248,.4); border-left: 3px solid #38bdf8; border-radius: 2px; padding: 18px; margin: 24px 0;">
            <p style="margin:0 0 8px 0; color:#38bdf8; font-weight:700; font-size:13px; letter-spacing:0.04em;">Si la prueba te cierra, el paso natural es Growth</p>
            <p style="margin:0 0 12px 0; color:#d4d4d8; font-size:13px; line-height:1.7;">
              <strong style="color:#fafafa">50.000 req/mes</strong> · 300 req/min — pensado para apps en producción.
            </p>
            <ul style="margin:0; padding-left:18px; color:#d4d4d8; font-size:13px; line-height:1.8;">
              <li>Todo lo del Starter, ×50 de cupo</li>
              <li>Webhooks ilimitados</li>
              <li>Reporte semanal en PDF + JSON</li>
              <li>Dashboards web personalizados</li>
              <li>Alertas configurables (INMAG, sub-categoría, USD, remates)</li>
              <li>Acceso directo al analista por email/Slack</li>
              <li>Datos lote-level transaccionales (próximamente)</li>
              <li>SLA 99,8% — soporte en 4 h hábiles</li>
            </ul>
            <p style="margin:12px 0 0 0; color:#71717a; font-size:12px;">USD 500/mes · mensual o anual (–15%)</p>
          </div>

          <p style="margin: 28px 0;">
            <a href="${enterpriseUrl}" style="display: inline-block; background: #38bdf8; color: #09090b; padding: 14px 24px; text-decoration: none; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px; border-radius: 2px;">
              Ver planes y features →
            </a>
            <a href="${docsUrl}" style="display: inline-block; color: #a1a1aa; padding: 14px 12px; text-decoration: none; font-size: 13px;">
              Ver docs
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #27272a; margin: 32px 0;">

          <p style="font-size: 12px; line-height: 1.6; color: #a1a1aa; margin: 0;">
            Sin compromiso — si querés extender la prueba, cambiar de plan o solo
            mostrarnos qué armaste, respondé este mail y te leemos.
          </p>
          <p style="font-size: 11px; color: #71717a; margin: 16px 0 0 0;">
            Mesa de mercado &middot; consignatarias.com
          </p>
      `),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Cierre mensual del INMAG para el arrendamiento — se envía a principio de cada
 * mes a los suscriptos de /mercado/arrendamiento (source arrendamiento-liquidacion).
 * Trae el promedio ponderado OFICIAL del mes que cerró (el número para la factura)
 * y, si el suscripto guardó su contrato (kg/ha × ha), su canon ya calculado.
 */
export async function sendArrendamientoCierre(opts: {
  to: string
  mesLabel: string
  inmag: number
  change?: number | null
  kgHa?: number | null
  hectareas?: number | null
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY no configurada' }

  const inmagFmt = opts.inmag.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const changeStr =
    opts.change != null ? `${opts.change >= 0 ? '+' : ''}${opts.change.toFixed(1)}% vs. el mes anterior` : ''
  const canon = opts.kgHa && opts.hectareas ? opts.kgHa * opts.hectareas * opts.inmag : null
  const canonBlock = canon
    ? `<p style="margin:18px 0 0 0;font-size:15px;color:#a1a1aa">Con tu contrato (<strong style="color:#fafafa">${escapeHtml(String(opts.kgHa))} kg/ha × ${escapeHtml(String(opts.hectareas))} ha</strong>), el canon de ${escapeHtml(opts.mesLabel)} es <strong style="color:#38bdf8">$${Math.round(canon).toLocaleString('es-AR')}</strong>.</p>`
    : ''

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Cierre INMAG ${opts.mesLabel}: $${inmagFmt}/kg — para tu arrendamiento`,
      headers: listUnsubHeaders(opts.to, 'arrendamiento-cierre'),
      html: darkEmailShell(`
        <p style="font-size:15px;line-height:1.6;color:#a1a1aa;margin:0 0 6px 0">El cierre del INMAG de <strong style="color:#fafafa">${escapeHtml(opts.mesLabel)}</strong> — el promedio oficial del Mercado Agroganadero para liquidar tu arrendamiento del mes:</p>
        <div style="font-size:34px;font-weight:700;color:#38bdf8;margin:14px 0 2px 0">$${inmagFmt}<span style="font-size:15px;color:#71717a;font-weight:400"> /kg</span></div>
        ${changeStr ? `<p style="margin:0;font-size:13px;color:#71717a">${changeStr}</p>` : ''}
        ${canonBlock}
        <p style="margin:24px 0 8px"><a href="${APP_URL}/mercado/arrendamiento" style="display:inline-block;background:#38bdf8;color:#09090b;padding:12px 22px;text-decoration:none;font-weight:600;font-size:13px;border-radius:2px">Ver el detalle y la serie &rarr;</a></p>
        <p style="font-size:13px;color:#a1a1aa;margin:0 0 8px;line-height:1.6">¿Querés que te ayudemos con el contrato o tenés alguna consulta? <a href="mailto:agro@memola.com.ar?subject=Consulta%20arrendamiento%20${encodeURIComponent(opts.mesLabel)}" style="color:#38bdf8;text-decoration:none;white-space:nowrap">Escribinos a agro@memola.com.ar &rarr;</a></p>
        <p style="font-size:12px;color:#a1a1aa;margin:0">Es el mismo número que publica el MAG. Un mail por mes, al cierre.</p>
        <p style="font-family:${EMAIL_MONO};color:#52525b;font-size:10px;margin:22px 0 0;border-top:1px solid #27272a;padding-top:12px;line-height:1.6">consignatarias<span style="color:#38bdf8">.</span>com &mdash; el precio de referencia del ganado argentino &middot; <a href="${APP_URL}" style="color:#71717a">consignatarias.com.ar</a> &middot; <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(opts.to)}" style="color:#52525b">Desuscribirme</a></p>
      `),
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/* ------------------------------------------------------------------ */
/*  ALERTA INTERNA — primer consumo MCP real e identificable.          */
/*  Se dispara cuando un tools/call trae clientInfo NOMBRADO (no un    */
/*  crawler anónimo). Es el hito que importa seguir del MCP.           */
/* ------------------------------------------------------------------ */
export interface McpConsumptionEvent {
  tool: string
  client: string
  version?: string | null
  at: string // ISO
  args?: string | null
}

export async function sendMcpConsumptionAlert(events: McpConsumptionEvent[]) {
  const resend = await getResend()
  if (!resend || events.length === 0) return { success: false, error: 'no_resend_or_empty' }
  const to = process.env.OPS_ALERT_EMAIL || 'agro@memola.com.ar'

  const rows = events
    .map(
      (e) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace">${escapeHtml(e.client)}${e.version ? ' <span style="color:#999">v' + escapeHtml(e.version) + '</span>' : ''}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace">${escapeHtml(e.tool)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#555">${escapeHtml(e.at)}</td>
        </tr>`,
    )
    .join('')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="font-size:18px">🎯 Consumo real del MCP</h2>
      <p style="color:#444">Un agente <strong>identificado</strong> (con clientInfo nombrado) llamó tools del servidor MCP — no es un crawler anónimo. ${events.length} llamada(s):</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #111">Cliente</th>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #111">Tool</th>
          <th align="left" style="padding:6px 10px;border-bottom:2px solid #111">Cuándo (UTC)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">Se filtran crawlers/scoring/probes y llamadas anónimas. Detalle en /admin/ops.</p>
    </div>`

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `🎯 MCP: consumo real de ${events.map((e) => e.client).filter((c, i, a) => a.indexOf(c) === i).join(', ')}`,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Alerta instantánea a la consignataria cuando entra un lead. Se dispara desde
 * /api/leads tras el insert. Solo se envía si el perfil está reclamado
 * (consignatarias.claimed_by_email). El contacto (nombre/teléfono/email/mensaje)
 * va COMPLETO si el perfil es PRO (featured); si no, va enmascarado con CTA a PRO
 * — ver el lead sin poder tocarlo empuja la conversión.
 */
export async function sendLeadAlert(opts: {
  to: string | string[]
  /** Copia oculta (p.ej. Jose, para recibir toda alerta de lead nuevo). */
  bcc?: string | string[]
  consignataria: string
  slug: string
  isPro: boolean
  lead: { name: string; phone?: string | null; email?: string | null; message?: string | null }
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'no-resend' }
  const { to, bcc, consignataria, slug, isPro, lead } = opts
  const profileUrl = `${APP_URL}/consignatarias/${slug}`

  const contact = isPro
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:2px;margin:16px 0">
        <tr><td style="padding:16px">
          <p style="color:#fafafa;font-size:15px;font-weight:700;margin:0 0 8px">${escapeHtml(lead.name)}</p>
          ${lead.phone ? `<p style="margin:0 0 4px"><a href="tel:${escapeHtml(lead.phone)}" style="color:#38bdf8;font-size:14px;text-decoration:none">📞 ${escapeHtml(lead.phone)}</a></p>` : ''}
          ${lead.email ? `<p style="margin:0 0 4px"><a href="mailto:${escapeHtml(lead.email)}" style="color:#38bdf8;font-size:14px;text-decoration:none">✉ ${escapeHtml(lead.email)}</a></p>` : ''}
          ${lead.message ? `<p style="color:#a1a1aa;font-size:13px;margin:10px 0 0;border-top:1px solid #27272a;padding-top:10px">"${escapeHtml(lead.message)}"</p>` : ''}
        </td></tr>
      </table>
      <p style="color:#a1a1aa;font-size:13px;margin:0">Respondé rápido: el primero en contactar suele ganar la operación.</p>`
    : `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #f59e0b40;border-radius:2px;margin:16px 0">
        <tr><td style="padding:16px">
          <p style="color:#fafafa;font-size:14px;margin:0 0 10px">Tenés una consulta nueva de <b>${escapeHtml(lead.name)}</b>${lead.message ? ` sobre: "${escapeHtml(lead.message.slice(0, 60))}${lead.message.length > 60 ? '…' : ''}"` : ''}.</p>
          <p style="color:#f59e0b;font-size:13px;margin:0">🔒 El teléfono y el email del interesado están disponibles con <b>PRO Consignataria</b>.</p>
          <a href="${APP_URL}/planes?audience=consignataria&from=lead-alert" style="display:inline-block;margin-top:12px;background:#f59e0b;color:#09090b;font-size:13px;font-weight:700;padding:9px 16px;border-radius:2px;text-decoration:none">Activar PRO y ver el contacto →</a>
        </td></tr>
      </table>`

  const html = darkEmailShell(`
    <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Nueva consulta</p>
    <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 4px">Un productor consultó por ${escapeHtml(consignataria)}</h2>
    <p style="color:#71717a;font-size:12px;margin:0 0 4px">Entró por tu perfil en consignatarias.com</p>
    ${contact}
    <p style="margin:16px 0 0"><a href="${profileUrl}" style="color:#71717a;font-size:12px">Ver tu perfil →</a></p>
  `)

  const primaryTo = Array.isArray(to) ? to[0] : to
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      ...(bcc ? { bcc } : {}),
      subject: isPro ? `Nueva consulta de ${lead.name} · ${consignataria}` : `Tenés una consulta nueva · ${consignataria}`,
      html,
      headers: listUnsubHeaders(primaryTo, 'lead-alert'),
    })
    if (error) return { success: false, error: String((error as { message?: string }).message || error) }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * sendProducerLeadOps — alerta INTERNA (a agro@memola.com.ar) por cada producer_lead
 * capturado en las herramientas gratis. Es el DRIVER del ruteo a performance: las
 * consignatarias no usan la web, así que Jose recibe el lead + las firmas candidatas
 * de la zona con links de WhatsApp/tel ya armados, y las conecta a mano. Cobramos 1%
 * al cierre. No se le manda mail cold a las firms sin opt-in; esto va a inbox propio.
 */
export async function sendProducerLeadOps(opts: {
  leadId: number
  intent: string
  category?: string | null
  headCount?: number | null
  hectareas?: number | null
  desiredPriceArs?: number | null
  province?: string | null
  zona?: string | null
  source?: string | null
  lead: { name: string; phone?: string | null; email?: string | null; message?: string | null }
  estimatedValueArs?: number | null
  feeArs?: number | null
  feePct?: number
  matches: Array<{
    displayName: string
    slug: string
    province: string | null
    location: string | null
    featured: boolean
    contactable: boolean
    waLink: string | null
    phone: string | null
  }>
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'no-resend' }
  const { leadId, intent, category, headCount, hectareas, desiredPriceArs, province, zona, source, lead, estimatedValueArs, feeArs, feePct, matches } = opts

  const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
  const intentLabel: Record<string, string> = {
    vender: 'Quiere VENDER hacienda', comprar: 'Quiere COMPRAR hacienda',
    arrendar: 'Consulta por ARRENDAMIENTO', consignar: 'Quiere CONSIGNAR', tasar: 'Pide una TASACIÓN',
    arrendar_ofrezco: 'OFRECE campo para arrendar', arrendar_busco: 'BUSCA campo para arrendar',
  }
  const isArrendamiento = intent.startsWith('arrendar')
  const zonaTxt = [zona, province].filter(Boolean).join(', ') || 'sin zona'
  const catTxt = [
    headCount ? `${headCount.toLocaleString('es-AR')} cab` : null,
    hectareas ? `${hectareas.toLocaleString('es-AR')} ha` : null,
    category,
    desiredPriceArs ? `pide ${ars(desiredPriceArs)}${isArrendamiento ? '' : '/kg'}` : null,
  ].filter(Boolean).join(' · ')

  // Inteligencia de spread: precio pedido vs. mercado de la categoría.
  const spread = computeSpread(category, desiredPriceArs)
  const spreadHtml = spread
    ? `<p style="color:${spread.spreadPct <= 3 ? '#4ade80' : '#f59e0b'};font-size:12px;margin:6px 0 0">
         Spread: pide ${ars(desiredPriceArs || 0)}/kg vs. mercado ${ars(spread.marketPrice)}/kg →
         <b>${spread.spreadPct >= 0 ? '+' : ''}${spread.spreadPct.toFixed(1)}%</b> (${spreadReading(spread.spreadPct)})
       </p>`
    : ''

  const economics = estimatedValueArs
    ? `<tr><td style="padding:12px 16px;background:#0f1a12;border:1px solid #16a34a40;border-radius:2px">
         <p style="color:#4ade80;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 6px">Potencial de la operación</p>
         <p style="color:#fafafa;font-size:15px;margin:0">Valor estimado <b>${ars(estimatedValueArs)}</b> · Fee ${feePct ?? 1}% ≈ <b style="color:#4ade80">${feeArs ? ars(feeArs) : '—'}</b></p>
         <p style="color:#71717a;font-size:11px;margin:6px 0 0">Estimación cabezas × peso ref × INMAG. El fee real se fija al cierre.</p>
         ${spreadHtml}
       </td></tr>`
    : `<tr><td style="padding:10px 16px;background:#18181b;border:1px solid #27272a;border-radius:2px">
         <p style="color:#a1a1aa;font-size:13px;margin:0">${isArrendamiento
           ? `Arrendamiento${hectareas ? ` · ${hectareas.toLocaleString('es-AR')} ha` : ''}${desiredPriceArs ? ` · pide ${ars(desiredPriceArs)} de canon` : ''} — el negocio es el canon/spread, no valor de hacienda.`
           : 'Sin cabezas para estimar valor — priorizar por zona/intención.'}</p>
       </td></tr>`

  const firmRows = matches.length
    ? matches.map((m) => `
      <tr><td style="padding:10px 0;border-top:1px solid #27272a">
        <p style="margin:0 0 3px">
          <span style="color:#fafafa;font-size:14px;font-weight:600">${escapeHtml(m.displayName)}</span>
          ${m.featured ? '<span style="color:#f59e0b;font-size:10px;font-weight:700;margin-left:6px">★ PARTNER</span>' : ''}
          ${!m.contactable ? '<span style="color:#52525b;font-size:10px;margin-left:6px">(sin tel en DB → backoffice)</span>' : ''}
        </p>
        <p style="color:#71717a;font-size:12px;margin:0 0 6px">${escapeHtml([m.location, m.province].filter(Boolean).join(', ') || '')}</p>
        <p style="margin:0">
          ${m.waLink ? `<a href="${m.waLink}" style="display:inline-block;background:#25D366;color:#052e16;font-size:12px;font-weight:700;padding:6px 12px;border-radius:2px;text-decoration:none;margin-right:6px">WhatsApp →</a>` : ''}
          ${m.phone ? `<a href="tel:${escapeHtml(m.phone)}" style="color:#38bdf8;font-size:12px;text-decoration:none;margin-right:6px">📞 ${escapeHtml(m.phone)}</a>` : ''}
          <a href="${APP_URL}/consignatarias/${m.slug}" style="color:#71717a;font-size:12px;text-decoration:none">perfil ↗</a>
        </p>
      </td></tr>`).join('')
    : `<tr><td style="padding:10px 0;color:#a1a1aa;font-size:13px">Sin firmas cargadas en esa zona — rutear desde el backoffice.</td></tr>`

  const html = darkEmailShell(`
    <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 4px">Nuevo lead · #${leadId}</p>
    <h2 style="color:#fafafa;font-size:18px;font-weight:700;margin:0 0 2px">${escapeHtml(intentLabel[intent] || intent)}</h2>
    <p style="color:#71717a;font-size:12px;margin:0 0 16px">${escapeHtml(zonaTxt)}${catTxt ? ` · ${escapeHtml(catTxt)}` : ''}${source ? ` · vía ${escapeHtml(source)}` : ''}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:2px;margin:0 0 12px"><tr><td style="padding:14px 16px">
      <p style="color:#fafafa;font-size:15px;font-weight:700;margin:0 0 6px">${escapeHtml(lead.name)}</p>
      ${lead.phone ? `<p style="margin:0 0 3px"><a href="tel:${escapeHtml(lead.phone)}" style="color:#38bdf8;font-size:14px;text-decoration:none">📞 ${escapeHtml(lead.phone)}</a></p>` : ''}
      ${lead.email ? `<p style="margin:0 0 3px"><a href="mailto:${escapeHtml(lead.email)}" style="color:#38bdf8;font-size:14px;text-decoration:none">✉ ${escapeHtml(lead.email)}</a></p>` : ''}
      ${lead.message ? `<p style="color:#a1a1aa;font-size:13px;margin:8px 0 0;border-top:1px solid #27272a;padding-top:8px">"${escapeHtml(lead.message)}"</p>` : ''}
    </td></tr></table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td>${economics}</td></tr></table>

    <p style="color:#71717a;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 2px">Firmas candidatas (zona)</p>
    <table width="100%" cellpadding="0" cellspacing="0">${firmRows}</table>

    <p style="margin:18px 0 0"><a href="${APP_URL}/admin/leads" style="color:#38bdf8;font-size:13px;font-weight:600;text-decoration:none">Abrir la board de leads →</a></p>
  `)

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: LEAD_ALERT_TO,
      subject: `🐄 Lead #${leadId} · ${intentLabel[intent] || intent} · ${zonaTxt}${feeArs ? ` · fee ≈${ars(feeArs)}` : ''}`,
      html,
    })
    if (error) return { success: false, error: String((error as { message?: string }).message || error) }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Número de WhatsApp directo del founder para consultas de solicitantes. */
const FOUNDER_WHATSAPP = process.env.FOUNDER_WHATSAPP || '5493773418130'

/**
 * sendProducerLeadConfirmation — acuse de recibo al PRODUCTOR que cargó una
 * solicitud (venta / arrendamiento). Confirma que la recibimos, avisa que lo
 * contactamos por email, y deja una vía directa por WhatsApp al founder para
 * cualquier consulta. replyTo = agro@memola.com.ar (las respuestas caen ahí).
 */
export async function sendProducerLeadConfirmation(opts: {
  to: string
  name: string
  intent: string
  zona?: string | null
  province?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'no-resend' }
  const { to, name, intent, zona, province } = opts

  const intentPhrase: Record<string, string> = {
    vender: 'vender tu hacienda',
    comprar: 'comprar hacienda',
    consignar: 'consignar / rematar',
    tasar: 'una tasación',
    arrendar: 'arrendar tu campo',
    arrendar_ofrezco: 'arrendar tu campo',
    arrendar_busco: 'conseguir un campo para arrendar',
  }
  const phrase = intentPhrase[intent] || 'tu solicitud'
  const lugar = [zona, province].filter(Boolean).join(', ')
  const firstName = name.split(' ')[0] || name

  const waText = encodeURIComponent('Hola, cargué una solicitud en consignatarias.com y quería consultar.')
  const waLink = `https://wa.me/${FOUNDER_WHATSAPP}?text=${waText}`

  const html = darkEmailShell(`
    <p style="color:#4ade80;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Solicitud recibida</p>
    <h2 style="color:#fafafa;font-size:20px;font-weight:700;margin:0 0 10px">Recibimos tu solicitud, ${escapeHtml(firstName)}</h2>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 16px">
      Tomamos tu pedido para <b style="color:#fafafa">${escapeHtml(phrase)}</b>${lugar ? ` en <b style="color:#fafafa">${escapeHtml(lugar)}</b>` : ''}.
      Ya lo estamos trabajando y <b style="color:#fafafa">te vamos a contactar por email</b> a la brevedad.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:2px;margin:0 0 16px"><tr><td style="padding:16px">
      <p style="color:#e4e4e7;font-size:14px;margin:0 0 12px">Cualquier consulta, escribinos directamente:</p>
      <a href="${waLink}" style="display:inline-block;background:#25D366;color:#052e16;font-size:14px;font-weight:700;padding:10px 18px;border-radius:4px;text-decoration:none">WhatsApp →</a>
    </td></tr></table>
    <p style="color:#71717a;font-size:12px;margin:0">consignatarias.com — el precio de referencia del ganado argentino</p>
  `)

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: 'agro@memola.com.ar',
      subject: 'Recibimos tu solicitud — consignatarias.com',
      html,
    })
    if (error) return { success: false, error: String((error as { message?: string }).message || error) }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * sendFrigorificoLeadAlert — re-rutea automáticamente al frigorífico una consulta de
 * venta de un productor, GATEANDO el contacto: la planta ve QUÉ le ofrecen (categoría,
 * cabezas, zona, precio) pero NO el contacto del productor. Para avanzar responde el
 * email → cae en agro@memola.com.ar y nosotros conectamos las puntas (queda la
 * comisión). Menos intervención manual: la planta se entera sola. Los emails salen del
 * registro público MAGYP/SENASA → footer de identificación legal + opt-out.
 */
export async function sendFrigorificoLeadAlert(opts: {
  to: string
  frigorificoName: string
  lead: {
    category?: string | null
    headCount?: number | null
    province?: string | null
    zona?: string | null
    desiredPriceArs?: number | null
    message?: string | null
  }
}): Promise<{ success: boolean; error?: string }> {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'no-resend' }
  const { to, frigorificoName, lead } = opts
  const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
  const e = escapeHtml
  const lugar = [lead.zona, lead.province].filter(Boolean).join(', ')

  const rows = [
    lead.category ? ['Categoría', e(lead.category)] : null,
    lead.headCount ? ['Cabezas', lead.headCount.toLocaleString('es-AR')] : null,
    lugar ? ['Zona', e(lugar)] : null,
    lead.desiredPriceArs ? ['Precio que pide', `${ars(lead.desiredPriceArs)}/kg`] : null,
  ].filter(Boolean) as Array<[string, string]>

  const html = darkEmailShell(`
    <p style="color:#38bdf8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px">Consulta de un productor</p>
    <h2 style="color:#fafafa;font-size:19px;font-weight:700;margin:0 0 6px">Tenés una consulta de un usuario de nuestra página</h2>
    <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px">
      Un productor de <b style="color:#fafafa">consignatarias.com</b> quiere venderle hacienda a <b style="color:#fafafa">${e(frigorificoName)}</b>. Esto es lo que ofrece:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:2px;margin:0 0 16px"><tr><td style="padding:14px 16px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#e4e4e7">
        ${rows.map(([k, v]) => `<tr><td style="padding:4px 0;color:#71717a">${k}</td><td style="padding:4px 0;color:#fafafa;text-align:right"><b>${v}</b></td></tr>`).join('')}
      </table>
      ${lead.message ? `<p style="color:#a1a1aa;font-size:13px;margin:10px 0 0;border-top:1px solid #27272a;padding-top:10px">"${e(lead.message)}"</p>` : ''}
    </td></tr></table>
    <p style="color:#e4e4e7;font-size:14px;line-height:1.6;margin:0 0 4px">
      Para tomar contacto con el productor y coordinar la operación, <b style="color:#fafafa">respondé este email</b> y te ponemos en contacto.
    </p>
    ${legalIdentificationHtml(to)}
  `)

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: 'agro@memola.com.ar',
      subject: `Tenés una consulta de un productor · consignatarias.com`,
      html,
      headers: listUnsubHeaders(to, 'frigorifico-lead'),
    })
    if (error) return { success: false, error: String((error as { message?: string }).message || error) }
    return { success: true }
  } catch (e2) {
    return { success: false, error: e2 instanceof Error ? e2.message : String(e2) }
  }
}
