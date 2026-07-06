import type { Resend } from 'resend'
import { SEGMENT_SOURCES, PRODUCT_UPDATE_ONLY } from './newsletter-segments'

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
    <p style="color:#3f3f46;font-size:10px;line-height:1.6;margin:16px 0 0">
      Memola Medios SAS — consignatarias.com.ar. Obtuvimos su email del registro
      público del Mercado Agroganadero (MAG). Si no desea recibir más estos avisos,
      puede darse de baja en cualquier momento:
      <a href="${unsubscribeLink}" style="color:#52525b;text-decoration:underline">cancelar suscripción</a>.
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
    html: `
      ${emailBrandHeader()}
      <h2>Solicitud recibida</h2>
      <p>Recibimos tu solicitud de verificación del perfil de <strong>${safeName}</strong>.</p>
      <p>Nuestro equipo revisará tu solicitud y te contactaremos a la brevedad.</p>
      <p><a href="${APP_URL}/consignatarias/${slug}">Ver perfil</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — Directorio ganadero</p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Bienvenida a PRO</h2>
      <p>El perfil de <strong>${safeName}</strong> en consignatarias.com.ar quedó <strong>activo como PRO</strong>: aparecés con prioridad (destacado) ante los productores que buscan consignataria, con tu historial de remates, tu calendario y la analítica de tu perfil.</p>
      <p><a href="${APP_URL}/consignatarias/${slug}">Ver tu perfil</a> · <a href="${APP_URL}/dashboard">Ir a tu panel</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — la referencia del mercado ganadero</p>
    `,
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
      html: `
      ${emailBrandHeader()}
        <p>Hola, equipo de <strong>${safeName}</strong>:</p>
        <p>Tu perfil en consignatarias.com.ar fue visto <strong>${opts.views} veces</strong> en los últimos 30 días por productores que buscan dónde y con quién operar.</p>
        <p>Con <strong>PRO</strong> aparecés con prioridad (destacado), con tu badge verificado, tu calendario y la analítica de tu perfil — para que esas visitas se vuelvan consultas.</p>
        <p><a href="${APP_URL}/consignatarias/${opts.slug}/activar">Activá PRO acá</a> — ARS 45.000/mes, cancelás cuando quieras.</p>
        <p>Saludos,<br>José — consignatarias.com.ar</p>
        ${legalIdentificationHtml(opts.to)}
      `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Nueva solicitud de verificación</h2>
      <p><strong>Consignataria:</strong> ${safeName} (<code>${slug}</code>)</p>
      <p><strong>Email:</strong> ${safeClaim}</p>
      ${claimantName ? `<p><strong>Nombre:</strong> ${escapeHtml(claimantName)}</p>` : ''}
      ${cuit ? `<p><strong>CUIT:</strong> ${escapeHtml(cuit)}</p>` : ''}
      <p><a href="${APP_URL}/admin/claims">Revisar en admin</a></p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Solicitud de arrepentimiento / baja (Res. 424/2020 · art. 34 LDC)</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Identificador / contrato:</strong> ${ident}</p>
      <p><strong>Motivo (opcional):</strong> ${motivo}</p>
      <p>Plazo legal de respuesta y reversión inmediata del cargo si corresponde.</p>
    `,
  }).catch(() => {})

  // Acknowledge to the user
  await resend.emails.send({
    from: FROM,
    to: data.email,
    subject: 'Recibimos tu solicitud de arrepentimiento — Consignatarias.com.ar',
    html: `
      ${emailBrandHeader()}
      <h2>Recibimos tu solicitud</h2>
      <p>Hola ${nombre}, registramos tu solicitud de arrepentimiento / baja conforme al
      art. 34 de la Ley 24.240 y la Resolución 424/2020.</p>
      <p>La procesaremos sin costo a la brevedad. Si tu suscripción está activa, podés además
      darla de baja desde tu cuenta en <a href="${APP_URL}/cuenta">${APP_URL}/cuenta</a>.</p>
      <p>Ante cualquier duda: <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a>.</p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Tu perfil fue aprobado</h2>
      <p>Tu solicitud de verificación del perfil de <strong>${safeName}</strong> fue aprobada.</p>
      <p><a href="${APP_URL}/consignatarias/${slug}">Ver tu perfil</a></p>
      <p>Ya podés acceder a tu panel de consignataria:</p>
      <p><a href="${APP_URL}/login" style="background:#22c55e;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block">Acceder a mi panel</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — Directorio ganadero</p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Solicitud recibida</h2>
      <p>Recibimos tu solicitud de registro del frigorífico <strong>${safeName}</strong>.</p>
      <p>Nuestro equipo revisará tu solicitud y te contactaremos a la brevedad.</p>
      <p><a href="${APP_URL}/frigorificos">Ver directorio de frigoríficos</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — Directorio ganadero</p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <h2>Nueva solicitud de registro (frigorífico)</h2>
      <p><strong>Frigorífico:</strong> ${safeName}</p>
      <p><strong>CUIT:</strong> ${escapeHtml(cuit)}</p>
      <p><strong>Email:</strong> ${safeClaim}</p>
      ${claimantName ? `<p><strong>Nombre:</strong> ${escapeHtml(claimantName)}</p>` : ''}
      <p><a href="${APP_URL}/admin/claims">Revisar en admin</a></p>
    `,
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
    html: `
      ${emailBrandHeader()}
      <div style="font-family:monospace;max-width:480px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
        <h2 style="color:#fff;font-size:16px;margin:0 0 4px">RESUMEN MENSUAL</h2>
        <p style="color:#71717a;font-size:12px;margin:0 0 20px">${safeName} — ${escapeHtml(monthName)}</p>

        <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center;margin-bottom:16px">
          <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Vistas del perfil</p>
          <p style="color:#22c55e;font-size:32px;font-weight:bold;margin:0">${viewsFormatted}</p>
          <p style="color:#71717a;font-size:11px;margin:4px 0 0">productores vieron tu perfil este mes</p>
        </div>

        ${views > 0 ? `
        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Tu perfil de <strong style="color:#e4e4e7">${safeName}</strong> recibio ${viewsFormatted} visitas en ${escapeHtml(monthName)}.
          ${views >= 50 ? 'Excelente visibilidad.' : views >= 20 ? 'Buen alcance.' : 'Completa tu perfil para mejorar tu visibilidad.'}
        </p>
        ` : `
        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Tu perfil aun no recibio visitas este mes. Completa tus datos de contacto y descripcion para mejorar tu posicionamiento.
        </p>
        `}

        <div style="margin:20px 0;text-align:center">
          <a href="${APP_URL}/dashboard" style="background:#22c55e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-size:12px;font-weight:bold;letter-spacing:1px">VER MI PANEL</a>
        </div>

        <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
          <p style="color:#52525b;font-size:11px;margin:0">
            <a href="${APP_URL}/consignatarias/${slug}" style="color:#52525b">Ver perfil publico</a>
            &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/planes" style="color:#52525b">Mejorar mi plan</a>
          </p>
        </div>

        <p style="color:#3f3f46;font-size:10px;margin:16px 0 0">Consignatarias.com.ar — Directorio ganadero</p>
      </div>
    `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Cierre mensual · Índice Novillo Arrendamiento</p>
          <h2 style="color:#fff;font-size:18px;margin:0 0 20px">${escapeHtml(data.monthLabel)}</h2>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Promedio del mes</p>
            <p style="color:#f59e0b;font-size:36px;font-weight:bold;margin:0;font-family:monospace">${money(data.avg)}<span style="color:#71717a;font-size:16px">/kg</span></p>
            ${changePct !== null ? `<p style="color:${up ? '#22c55e' : '#ef4444'};font-size:13px;margin:6px 0 0">${up ? '▲' : '▼'} ${up ? '+' : ''}${changePct.toFixed(1)}% vs. ${escapeHtml(data.prevMonthLabel || 'mes anterior')}</p>` : ''}
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Mínimo del mes</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;border-bottom:1px solid #27272a;font-family:monospace">${money(data.min)}/kg</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Máximo del mes</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;border-bottom:1px solid #27272a;font-family:monospace">${money(data.max)}/kg</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px">Ruedas computadas</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;font-family:monospace">${data.ruedas}</td>
            </tr>
          </table>

          ${canon !== null && data.lease ? `
          <div style="background:#16161d;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 16px;margin-bottom:20px">
            <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px">Tu arrendamiento este mes</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0;line-height:1.6">
              ${data.lease.hectareas} ha × ${data.lease.kgHa} kg/ha × ${money(data.avg)} = <strong style="color:#f59e0b;font-size:16px">${money(canon)}</strong>/mes
            </p>
          </div>` : ''}

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/mercado/arrendamiento" style="background:#f59e0b;color:#0a0a0f;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">CALCULAR MI ARRENDAMIENTO</a>
          </div>

          <p style="color:#71717a;font-size:11px;margin:20px 0 0;line-height:1.6">
            Fuente: Mercado Agroganadero de Buenos Aires (INMAG). Promedio simple de las ruedas del mes.
          </p>
          <p style="color:#3f3f46;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar
            &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Alerta activada · ${cat}</p>
          <h2 style="color:#fff;font-size:18px;margin:0 0 16px">Te aviso cuando convenga vender</h2>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">
            Vas a recibir <strong style="color:#e4e4e7">un solo mail</strong> cuando el ${cat} esté
            <strong style="color:#34d399">caro vs el último año Y empiece a girar</strong> (precio real en la
            franja alta del año pero ya sin hacer nuevos máximos). Esa combinación —no el percentil solo— es la
            que históricamente marcó zona de salida. Nada de spam por cada movimiento, ni avisos de "vendé"
            mientras el mercado todavía sube.
          </p>
          ${data.pct365 !== null ? `
          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Hoy el mercado está en</p>
            <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0;font-family:monospace">percentil ${data.pct365}<span style="color:#71717a;font-size:14px"> / año</span></p>
          </div>` : ''}
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/mercado/vender-ahora" style="background:#38bdf8;color:#0a0a0f;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">VER EL ANÁLISIS COMPLETO</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Medimos el INMAG en dólares reales (INMAG ÷ dólar blue) para neutralizar la inflación.
            Para el novillo el percentil es preciso; para el resto refleja la dirección del mercado.
            Es información, no asesoramiento.
          </p>
          <p style="color:#3f3f46;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:#34d399;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Zona alta del año · ${cat}</p>
          <h2 style="color:#fff;font-size:19px;margin:0 0 16px">Precio alto y girando — históricamente, zona de salida</h2>
          <div style="background:#16161d;border:1px solid #34d39966;border-left:3px solid #34d399;border-radius:4px;padding:18px;margin-bottom:16px">
            <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0">
              En dólares reales, el ${cat} está en el <strong style="color:#34d399">percentil ${data.pct365} del último año</strong>
              y en el <strong style="color:#34d399">percentil ${data.pct30} del último mes</strong> — y ${trendTxt}.
              En esa combinación (precio alto del año que empieza a girar), la estadística histórica marca zona de salida.
              La decisión es tuya: esto describe dónde está el precio, no te dice qué hacer.
            </p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Percentil últimos 30 días</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;border-bottom:1px solid #27272a;font-family:monospace">${data.pct30}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px;border-bottom:1px solid #27272a">Percentil último año</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;border-bottom:1px solid #27272a;font-family:monospace">${data.pct365}</td>
            </tr>
            ${data.inmagUsdHoy !== null ? `<tr>
              <td style="padding:8px 0;color:#71717a;font-size:12px">INMAG en USD reales (hoy)</td>
              <td style="padding:8px 0;color:#e4e4e7;font-size:12px;text-align:right;font-family:monospace">USD ${data.inmagUsdHoy.toFixed(2)}/kg</td>
            </tr>` : ''}
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/mercado/vender-ahora" style="background:#34d399;color:#0a0a0f;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">CALCULAR MI LOTE A ESTE PRECIO</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Medido sobre el INMAG en dólares reales (INMAG ÷ dólar blue). Para el novillo el percentil es preciso;
            para el resto refleja la dirección del mercado. No considera condición del lote, costos de retención ni
            plaza zonal. Es información, no asesoramiento.
          </p>
          <p style="color:#3f3f46;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
  data: { categoryLabel: string; threshold: number; direction: 'above' | 'below'; current: number | null },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoryLabel)
  const verbo = data.direction === 'above' ? 'cruce' : 'baje de'
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Listo — te aviso cuando el ${data.categoryLabel} ${verbo} ${fmtArs(data.threshold)}`,
      headers: listUnsubHeaders(email, 'price-alert-confirm'),
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Alerta de precio activada · ${cat}</p>
          <h2 style="color:#fff;font-size:18px;margin:0 0 16px">Te aviso cuando ${data.direction === 'above' ? 'cruce' : 'baje de'} ${fmtArs(data.threshold)}</h2>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.7;margin:0 0 16px">
            Vas a recibir <strong style="color:#e4e4e7">un solo mail</strong> cuando el ${cat} ${verbo}
            <strong style="color:#34d399">${fmtArs(data.threshold)}/kg</strong>. Nada de spam por cada movimiento.
          </p>
          ${data.current !== null ? `
          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Precio hoy</p>
            <p style="color:#38bdf8;font-size:32px;font-weight:bold;margin:0;font-family:monospace">${fmtArs(data.current)}<span style="color:#71717a;font-size:14px">/kg</span></p>
          </div>` : ''}
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/precios" style="background:#38bdf8;color:#0a0a0f;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">VER PRECIOS EN VIVO</a>
          </div>
          <p style="color:#3f3f46;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** El disparo: el precio cruzó el umbral. */
export async function sendPriceThresholdAlert(
  email: string,
  data: { categoryLabel: string; threshold: number; direction: 'above' | 'below'; current: number },
) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }
  const cat = escapeHtml(data.categoryLabel)
  const verboPasado = data.direction === 'above' ? 'cruzó' : 'bajó de'
  const color = data.direction === 'above' ? '#34d399' : '#f87171'
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `El ${data.categoryLabel} ${verboPasado} ${fmtArs(data.threshold)} — está en ${fmtArs(data.current)}`,
      headers: listUnsubHeaders(email, 'price-alert'),
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:${color};font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Alerta de precio · ${cat}</p>
          <h2 style="color:#fff;font-size:19px;margin:0 0 16px">El ${cat} ${verboPasado} ${fmtArs(data.threshold)}</h2>
          <div style="background:#16161d;border:1px solid ${color}66;border-left:3px solid ${color};border-radius:4px;padding:18px;margin-bottom:16px;text-align:center">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Precio de referencia hoy</p>
            <p style="color:${color};font-size:34px;font-weight:bold;margin:0;font-family:monospace">${fmtArs(data.current)}<span style="color:#71717a;font-size:14px">/kg</span></p>
            <p style="color:#a1a1aa;font-size:12px;margin:8px 0 0">Tu umbral: ${fmtArs(data.threshold)}</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/precios" style="background:${color};color:#0a0a0f;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">VER PRECIOS Y REMATES</a>
          </div>
          <p style="color:#71717a;font-size:11px;margin:16px 0 0;line-height:1.6">
            Precio de referencia del Mercado Agroganadero (categoría ${cat}). No considera condición del lote ni plaza zonal. Es información, no asesoramiento.
          </p>
          <p style="color:#3f3f46;font-size:10px;margin:12px 0 0">
            Consignatarias.com.ar &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
) {
  const resend = await getResend()
  if (!resend) return

  const formatDate = (dateStr: string) => {
    const [_y, m, d] = dateStr.split('-')
    return `${d}/${m}`
  }

  const rematesHtml = featuredRemates.map(r => `
    <div style="background:#16161d;border:1px solid ${r.isPro ? '#fbbf24' : '#27272a'};border-radius:4px;padding:12px;margin-bottom:8px;${r.isPro ? 'border-left:3px solid #fbbf24;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <span style="color:${r.isPro ? '#fbbf24' : '#e4e4e7'};font-weight:bold;font-size:13px">
          ${r.isPro ? '★ ' : ''}${escapeHtml(r.consignataria)}
        </span>
        <span style="color:#71717a;font-size:11px">${formatDate(r.date)}${r.time ? ` ${r.time}` : ''}</span>
      </div>
      <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px">${escapeHtml(r.title)}</p>
      <p style="color:#52525b;font-size:11px;margin:0">
        📍 ${escapeHtml(r.location)}
        ${r.heads ? ` · 🐄 ${r.heads.toLocaleString('es-AR')} cab` : ''}
      </p>
    </div>
  `).join('')

  resend.emails.send({
    from: FROM,
    to: email,
    subject: `🐄 ${featuredRemates.length} Remates Destacados — ${weekRange}`,
    html: `
      ${emailBrandHeader()}
      <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
        <h2 style="color:#fff;font-size:16px;margin:0 0 4px">REMATES DE LA SEMANA</h2>
        <p style="color:#71717a;font-size:12px;margin:0 0 20px">${escapeHtml(weekRange)} — ${totalRemates} remates programados</p>

        <div style="margin-bottom:20px">
          ${rematesHtml}
        </div>

        <div style="text-align:center;margin:20px 0">
          <a href="${APP_URL}/remates" style="background:#22c55e;color:#fff;padding:10px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-size:12px;font-weight:bold;letter-spacing:1px">VER TODOS LOS REMATES</a>
        </div>

        <div style="background:#16161d;border:1px solid #fbbf24;border-radius:4px;padding:12px;margin:20px 0;text-align:center">
          <p style="color:#fbbf24;font-size:11px;margin:0 0 4px;font-weight:bold">★ CONSIGNATARIAS PRO</p>
          <p style="color:#a1a1aa;font-size:11px;margin:0">
            Los remates destacados son de consignatarias PRO verificadas.
            <a href="${APP_URL}/planes" style="color:#fbbf24">Conocé los beneficios →</a>
          </p>
        </div>

        <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
          <p style="color:#52525b;font-size:11px;margin:0">
            <a href="${APP_URL}/remates" style="color:#52525b">Ver calendario</a>
            &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/mercado" style="color:#52525b">Precios del mercado</a>
            &nbsp;&bull;&nbsp;
            <a href="${APP_URL}/consignatarias" style="color:#52525b">Directorio</a>
          </p>
        </div>

        <p style="color:#3f3f46;font-size:10px;margin:16px 0 0">
          Recibís este email porque te suscribiste a consignatarias.com.ar
          <br>
          <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#3f3f46">Desuscribirme</a>
        </p>
      </div>
    `,
  }).catch(() => {})
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
    html: `
      ${emailBrandHeader()}
      <h2>Verificación rechazada</h2>
      <p>Lamentamos informarte que tu solicitud de verificación del perfil de <strong>${safeName}</strong> fue rechazada.</p>
      ${reason ? `<p><strong>Motivo:</strong> ${escapeHtml(reason)}</p>` : ''}
      <p>Si creés que es un error, contactanos a <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a>.</p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — Directorio ganadero</p>
    `,
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
          Consignatarias.com.ar — Directorio ganadero
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
    const color = pct >= 0 ? '#22c55e' : '#ef4444'
    return `<span style="color:${color};font-weight:bold">${sign}${pct.toFixed(1)}%</span>`
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `📊 Faena ${currentMonth}: ${formatNumber(cabezas)} cabezas`,
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <h2 style="color:#fff;font-size:16px;margin:0 0 4px">REPORTE MENSUAL DE FAENA</h2>
          <p style="color:#71717a;font-size:12px;margin:0 0 20px">${escapeHtml(currentMonth)} — Datos oficiales</p>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Faena total</p>
            <p style="color:#22c55e;font-size:36px;font-weight:bold;margin:0">${formatNumber(cabezas)}</p>
            <p style="color:#71717a;font-size:12px;margin:8px 0 0">cabezas faenadas</p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
            <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center">
              <p style="color:#71717a;font-size:10px;margin:0 0 6px;text-transform:uppercase">vs mes anterior</p>
              <p style="font-size:18px;margin:0">${formatChange(monthlyChange)}</p>
            </div>
            <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center">
              <p style="color:#71717a;font-size:10px;margin:0 0 6px;text-transform:uppercase">vs año anterior</p>
              <p style="font-size:18px;margin:0">${formatChange(yearlyChange)}</p>
            </div>
          </div>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Últimos 12 meses</p>
            <p style="color:#fff;font-size:24px;font-weight:bold;margin:0">${formatNumber(total12Months)}</p>
            <p style="color:#71717a;font-size:11px;margin:4px 0 0">cabezas faenadas (acumulado)</p>
          </div>

          <p style="color:#a1a1aa;font-size:11px;line-height:1.5;margin-bottom:16px">
            Fuente: Secretaría de Agricultura, Ganadería y Pesca — datos.gob.ar
          </p>

          <div style="text-align:center;margin:20px 0">
            <a href="${APP_URL}/frigorificos" style="background:#22c55e;color:#fff;padding:10px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-size:12px;font-weight:bold;letter-spacing:1px">VER FRIGORÍFICOS</a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
            <p style="color:#52525b;font-size:11px;margin:0">
              <a href="${APP_URL}/remates" style="color:#52525b">Ver remates</a>
              &nbsp;&bull;&nbsp;
              <a href="${APP_URL}/mercado" style="color:#52525b">Precios del mercado</a>
              &nbsp;&bull;&nbsp;
              <a href="${APP_URL}/frigorificos" style="color:#52525b">Directorio</a>
            </p>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:16px 0 0">
            Recibís este email porque te suscribiste al reporte de faena.
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      subject: '🐄 Bienvenido a Consignatarias.com.ar',
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <h2 style="color:#fff;font-size:18px;margin:0 0 16px">${greeting}</h2>
          
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            Ya tenés acceso a la plataforma más completa de remates ganaderos de Argentina.
          </p>

          <div style="background:#16161d;border:1px solid #22c55e;border-left:3px solid #22c55e;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#22c55e;font-size:12px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">
              📋 Tu próximo paso
            </p>
            <p style="color:#e4e4e7;font-size:14px;margin:0 0 8px">
              <strong>Subí tu primera guía DT-e</strong>
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0">
              Guardamos tus guías de manera segura y te damos acceso a estadísticas sobre tus operaciones.
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">
              IR A MI PANEL
            </a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:16px;margin-top:24px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">
              También podés:
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              → <a href="${APP_URL}/remates" style="color:#22c55e;text-decoration:none">Ver próximos remates</a><br>
              → <a href="${APP_URL}/mercado/inmag" style="color:#22c55e;text-decoration:none">Consultar precios INMAG</a><br>
              → <a href="${APP_URL}/consignatarias" style="color:#22c55e;text-decoration:none">Explorar consignatarias</a>
            </p>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0">
            Consignatarias.com.ar — Directorio ganadero
          </p>
        </div>
      `,
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
      subject: '📋 Subí tu primera guía DT-e y llevá el control',
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <h2 style="color:#fff;font-size:16px;margin:0 0 16px">${greeting},</h2>
          
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${timeContext} en consignatarias.com.ar pero todavía no subiste tu primera guía DT-e.
          </p>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;margin-bottom:16px">
            <p style="color:#fbbf24;font-size:12px;margin:0 0 12px;font-weight:bold">
              ¿Por qué subir tus guías?
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              ✓ Tus datos, guardados de forma segura<br>
              ✓ Historial de todas tus operaciones<br>
              ✓ Estadísticas: categorías, pesos, consignatarias<br>
              ✓ Exportá tus datos cuando quieras
            </p>
          </div>

          <p style="color:#a1a1aa;font-size:12px;margin:0 0 20px">
            Solo tenés que sacarle una foto a tu guía — nosotros extraemos los datos automáticamente.
          </p>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">
              IR A MI PANEL
            </a>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0">
            Consignatarias.com.ar — Directorio ganadero
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      subject: '🎉 ¡Subiste tu primera guía DT-e!',
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <div style="text-align:center;margin-bottom:20px">
            <span style="font-size:48px">🎉</span>
          </div>

          <h2 style="color:#fff;font-size:18px;margin:0 0 16px;text-align:center">${greeting}</h2>
          
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px;text-align:center">
            Ya ${dteCount > 1 ? `tenés ${dteCount} guías` : 'tenés tu primera guía'} guardada en tu cuenta.
          </p>

          <div style="background:#16161d;border:1px solid #22c55e;border-radius:4px;padding:20px;margin-bottom:20px;text-align:center">
            <p style="color:#22c55e;font-size:32px;font-weight:bold;margin:0">${dteCount}</p>
            <p style="color:#71717a;font-size:11px;margin:4px 0 0;text-transform:uppercase">guía${dteCount > 1 ? 's' : ''} guardada${dteCount > 1 ? 's' : ''}</p>
          </div>

          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 16px">
            Seguí subiendo tus guías para construir tu historial completo de operaciones.
          </p>

          <div style="background:#16161d;border:1px solid #fbbf24;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">
              ★ CON PRO
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Exportá tus datos, alertas ilimitadas, y estadísticas avanzadas de tus operaciones.
            </p>
            <p style="margin:12px 0 0">
              <a href="${APP_URL}/planes" style="color:#fbbf24;font-size:12px;text-decoration:none">
                Ver planes PRO →
              </a>
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">
              VER MIS GUÍAS
            </a>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0;text-align:center">
            Consignatarias.com.ar — Directorio ganadero
          </p>
        </div>
      `,
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
      subject: `📋 Tu historial te espera — ${formatNumber(totalCabezas)} cabezas registradas`,
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <h2 style="color:#fff;font-size:16px;margin:0 0 16px">${greeting},</h2>
          
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${timeMessage} que no subís guías DT-e. Tu historial sigue esperándote.
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
            <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center">
              <p style="color:#22c55e;font-size:24px;font-weight:bold;margin:0">${totalDtes}</p>
              <p style="color:#71717a;font-size:10px;margin:4px 0 0;text-transform:uppercase">guías guardadas</p>
            </div>
            <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;text-align:center">
              <p style="color:#22c55e;font-size:24px;font-weight:bold;margin:0">${formatNumber(totalCabezas)}</p>
              <p style="color:#71717a;font-size:10px;margin:4px 0 0;text-transform:uppercase">cabezas</p>
            </div>
          </div>

          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;margin:0 0 16px">
            ¿Participaste en algún remate esta semana? Sumá tu próxima guía y mantené tu historial actualizado.
          </p>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/dashboard" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">
              IR A MI PANEL
            </a>
          </div>

          <div style="background:#16161d;border:1px solid #fbbf24;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">
              ★ CONSEJO PRO
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Los productores PRO pueden exportar todas sus guías y ver estadísticas avanzadas por categoría y consignataria.
            </p>
            <p style="margin:8px 0 0">
              <a href="${APP_URL}/planes" style="color:#fbbf24;font-size:11px;text-decoration:none">
                Ver planes →
              </a>
            </p>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0">
            Consignatarias.com.ar — Directorio ganadero
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
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
    subject: `🐄 Nuevo remate: ${consignataria} — ${formatDate(fecha)}`,
    html: `
      ${emailBrandHeader()}
      <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
        <p style="color:#fbbf24;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">
          ★ NUEVA PUBLICACIÓN
        </p>
        <h2 style="color:#fff;font-size:18px;margin:0 0 16px">${safeConsig}</h2>
        
        <div style="background:#16161d;border:1px solid #fbbf24;border-left:3px solid #fbbf24;border-radius:4px;padding:16px;margin-bottom:16px">
          <p style="color:#e4e4e7;font-size:14px;margin:0 0 8px;font-weight:bold">${safeTitle}</p>
          <p style="color:#a1a1aa;font-size:12px;margin:0">
            📅 ${formatDate(fecha)} &nbsp;&bull;&nbsp; 📍 ${safeProv}
          </p>
        </div>

        <p style="color:#a1a1aa;font-size:12px;line-height:1.5">
          Una consignataria PRO que seguís acaba de publicar un nuevo remate. 
          Visitá el link para ver los detalles completos.
        </p>

        <div style="text-align:center;margin:20px 0">
          <a href="${url}" style="background:#22c55e;color:#fff;padding:10px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-size:12px;font-weight:bold;letter-spacing:1px">VER REMATE</a>
        </div>

        <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
          <p style="color:#52525b;font-size:11px;margin:0">
            Recibís este email porque tenés una alerta activa para ${safeProv || 'esta zona'}.
            <br>
            <a href="${APP_URL}/alertas/unsubscribe?email=${encodeURIComponent(to)}" style="color:#52525b">
              Modificar mis alertas
            </a>
          </p>
        </div>

        <p style="color:#3f3f46;font-size:10px;margin:16px 0 0">Consignatarias.com.ar — Directorio ganadero</p>
      </div>
    `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <p style="color:#71717a;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">
            Resultados del remate
          </p>
          <h2 style="color:#fff;font-size:18px;margin:0 0 16px">${safeConsig}</h2>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            Cerró el remate de <strong style="color:#e4e4e7">${safeConsig}</strong> en ${safeLoc}.
          </p>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">${safeCat}</p>
            <p style="color:#f59e0b;font-size:32px;font-weight:bold;margin:0;font-family:monospace">${money(avgPrice)}<span style="color:#71717a;font-size:16px">/kg</span></p>
            <p style="color:#71717a;font-size:11px;margin:6px 0 0">promedio sobre ${cabezasFmt} cabezas</p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${perfilUrl}" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">VER TODOS LOS PROMEDIOS</a>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0">
            Recibís este email porque seguís a ${safeConsig} en consignatarias.com.ar
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      ? '📊 <strong>Cierre mensual del Índice Novillo</strong> — el promedio del mes que cerró, el 1°'
    : isFaena
      ? '🥩 <strong>Reporte mensual de faena</strong> — cabezas faenadas, variación interanual y acumulado'
    : isCorredor
      ? '📄 <strong>El Corredor</strong> — el cierre mensual del mercado bovino, en PDF'
    : isSubastaPorFirma
      ? '🔔 <strong>Recordatorios de remate</strong> — te avisamos antes de cada subasta de las firmas que seguís (el día previo y al arrancar) y cómo cerró'
    : isProductOnly
      ? '🔔 Te avisamos cuando <strong>mejoremos la herramienta</strong> o agreguemos nuevos campos'
    : isWeekly
      ? '📅 <strong>Resumen semanal de remates</strong> — los más importantes, cada lunes'
      : '📅 <strong>Resumen semanal de remates</strong> — los más importantes, cada lunes' // fail-safe: igual que isWeeklyRecipient

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: '🐄 Bienvenido al newsletter de Consignatarias.com.ar',
      html: `
      ${emailBrandHeader()}
        <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
          <h2 style="color:#fff;font-size:18px;margin:0 0 16px">¡Gracias por suscribirte!</h2>
          
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px">
            ${sourceContext}
          </p>

          <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 20px">
            A partir de ahora vas a recibir:
          </p>

          <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#e4e4e7;font-size:13px;margin:0;line-height:1.8">
              ${bullets}
            </p>
          </div>

          <div style="background:#16161d;border:1px solid #22c55e;border-left:3px solid #22c55e;border-radius:4px;padding:16px;margin-bottom:20px">
            <p style="color:#22c55e;font-size:12px;margin:0 0 8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">
              💡 ¿Sabías que podés crear una cuenta gratis?
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.6">
              Con una cuenta podés guardar tus guías DT-e, configurar alertas personalizadas y acceder a estadísticas de tus operaciones.
            </p>
            <p style="margin:12px 0 0">
              <a href="${APP_URL}/registro" style="color:#22c55e;font-size:12px;text-decoration:none;font-weight:bold">
                Crear cuenta gratis →
              </a>
            </p>
          </div>

          <div style="text-align:center;margin:24px 0">
            <a href="${APP_URL}/remates" style="background:#22c55e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;display:inline-block;font-size:13px;font-weight:bold;letter-spacing:1px">
              VER PRÓXIMOS REMATES
            </a>
          </div>

          <div style="border-top:1px solid #27272a;padding-top:16px;margin-top:24px">
            <p style="color:#71717a;font-size:11px;margin:0 0 8px">
              También podés explorar:
            </p>
            <p style="color:#a1a1aa;font-size:12px;margin:0;line-height:1.8">
              → <a href="${APP_URL}/mercado/inmag" style="color:#22c55e;text-decoration:none">Precios INMAG actualizados</a><br>
              → <a href="${APP_URL}/consignatarias" style="color:#22c55e;text-decoration:none">Directorio de consignatarias</a><br>
              → <a href="${APP_URL}/frigorificos" style="color:#22c55e;text-decoration:none">Frigoríficos habilitados</a>
            </p>
          </div>

          <p style="color:#3f3f46;font-size:10px;margin:24px 0 0">
            Consignatarias.com.ar — Directorio ganadero
            <br>
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#3f3f46">Desuscribirme</a>
          </p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;font-size:15px;line-height:1.6">
          <p>${saludo}</p>
          <p>Soy José Barnetche. Armamos <strong>consignatarias.com.ar</strong> — el INMAG y los precios del Mercado Agroganadero, al día.</p>
          <p>Todos los meses publicamos el <strong>cierre del Índice Novillo</strong>${precio ? ` (hoy <strong>${precio}</strong>)` : ''} — el número que se usa para liquidar arrendamientos y seguir el mercado.</p>
          <p>Si te sirve, te lo puedo mandar <strong>el 1° de cada mes</strong>. Suscribite acá (30 segundos):</p>
          <p style="margin:24px 0">
            <a href="${subscribeUrl}" style="background:#16a34a;color:#fff;padding:11px 22px;text-decoration:none;border-radius:6px;font-weight:600">Recibir el cierre mensual →</a>
          </p>
          <p style="color:#666;font-size:13px">Si no te interesa, ignorá este mail — no te escribo de nuevo. Cualquier cosa, respondé a este correo.</p>
          <p style="color:#999;font-size:13px">José · consignatarias.com.ar</p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family: 'SF Mono', 'Cascadia Code', ui-monospace, Menlo, Consolas, monospace; max-width: 560px; background: #09090b; color: #fafafa; padding: 32px;">
          <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #71717a; margin-bottom: 28px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#38bdf8; margin-right:10px;"></span>
            <strong style="color:#fafafa">consignatarias.com</strong>
            <span style="color:#38bdf8; margin: 0 8px;">·</span>
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
            Mesa de mercado · consignatarias.com
          </p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family: 'SF Mono', 'Cascadia Code', ui-monospace, Menlo, Consolas, monospace; max-width: 560px; background: #09090b; color: #fafafa; padding: 32px;">
          <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #71717a; margin-bottom: 28px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#38bdf8; margin-right:10px;"></span>
            <strong style="color:#fafafa">consignatarias.com</strong>
            <span style="color:#38bdf8; margin: 0 8px;">·</span>
            Enterprise · ${planLabel}
          </div>

          <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #fafafa; margin: 0 0 16px 0;">
            Tu plan Enterprise ${planLabel} está activo
          </h1>

          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin: 0 0 16px 0;">
            Bienvenido. Tenés acceso a <strong style="color:#38bdf8">${quota}</strong>
            sobre toda nuestra API (INMAG histórico, 16 sub-categorías, calendario
            de remates, directorios, lote-level).
          </p>

          <div style="background: #18181b; border: 1px solid #27272a; padding: 16px; margin: 24px 0;">
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
            Mesa de mercado · consignatarias.com
          </p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family: 'SF Mono', 'Cascadia Code', ui-monospace, Menlo, Consolas, monospace; max-width: 560px; background: #09090b; color: #fafafa; padding: 32px;">
          <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #71717a; margin-bottom: 28px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fbbf24; margin-right:10px;"></span>
            <strong style="color:#fafafa">consignatarias.com</strong>
            <span style="color:#fbbf24; margin: 0 8px;">·</span>
            Enterprise API · ${planLabel}
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

          <div style="background: #18181b; border: 1px solid #27272a; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; font-size: 13px; color: #d4d4d8;">
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
            Mesa de mercado · consignatarias.com
          </p>
        </div>
      `,
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
      html: `
      ${emailBrandHeader()}
        <div style="font-family: 'SF Mono', 'Cascadia Code', ui-monospace, Menlo, Consolas, monospace; max-width: 560px; background: #09090b; color: #fafafa; padding: 32px;">
          <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #71717a; margin-bottom: 28px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#38bdf8; margin-right:10px;"></span>
            <strong style="color:#fafafa">consignatarias.com</strong>
            <span style="color:#38bdf8; margin: 0 8px;">·</span>
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

          <div style="background: #18181b; border: 1px solid #27272a; padding: 18px; margin: 24px 0;">
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

          <div style="background: #0c1f2b; border: 1px solid #164e63; padding: 18px; margin: 24px 0;">
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
            Mesa de mercado · consignatarias.com
          </p>
        </div>
      `,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
