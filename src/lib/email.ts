import type { Resend } from 'resend'

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'agro@memola.com.ar'

export async function sendClaimConfirmation(email: string, displayName: string, slug: string) {
  const resend = await getResend()
  if (!resend) return
  const safeName = escapeHtml(displayName)
  resend.emails.send({
    from: FROM,
    to: email,
    subject: `Solicitud de verificación — ${displayName}`,
    html: `
      <h2>Solicitud recibida</h2>
      <p>Recibimos tu solicitud de verificación del perfil de <strong>${safeName}</strong>.</p>
      <p>Nuestro equipo revisará tu solicitud y te contactaremos a la brevedad.</p>
      <p><a href="${APP_URL}/consignatarias/${slug}">Ver perfil</a></p>
      <hr>
      <p style="color:#888;font-size:12px">Consignatarias.com.ar — Directorio ganadero</p>
    `,
  }).catch(() => {})
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
    subject,
    html: `
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
}

export async function sendPostRemateResultsRequest({
  to,
  consignatariaName,
  slug: _slug,
  location,
  remateDate: _remateDate,
  remateTitle: _remateTitle,
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
        `planilla. Lo publico en el perfil de ${cleanName} y te`,
        `paso el link.`,
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

  const sourceContext = source === 'remates'
    ? 'Te suscribiste desde nuestra página de remates.'
    : source === 'frigorificos'
    ? 'Te suscribiste desde nuestra sección de frigoríficos.'
    : source === 'cierre-mensual'
    ? 'Te suscribiste al cierre mensual del Índice Novillo. El 1° de cada mes vas a recibir el promedio del mes que cerró.'
    : 'Te suscribiste a nuestro newsletter.'

  // Qué recibe REALMENTE según a qué se suscribió (alineado con newsletter-segments).
  const bullets =
    ['remates', 'reporte-semanal', 'homepage'].includes(source ?? '')
      ? '📅 <strong>Resumen semanal de remates</strong> — los más importantes, cada lunes'
    : ['cierre-mensual', 'valuation_widget', 'calculadora'].includes(source ?? '')
      ? '📊 <strong>Cierre mensual del Índice Novillo</strong> — el promedio del mes que cerró, el 1°'
    : source === 'frigorificos'
      ? '🥩 <strong>Reporte mensual de faena</strong> — cabezas faenadas, variación interanual y acumulado'
    : source === 'el-corredor'
      ? '📄 <strong>El Corredor</strong> — el cierre mensual del mercado bovino, en PDF'
    : ['exportar-datos', 'calendar-export', 'comparar-consignatarias'].includes(source ?? '')
      ? '🔔 Te avisamos cuando <strong>mejoremos la herramienta</strong> o agreguemos nuevos campos'
      : '📅 Novedades del mercado ganadero argentino'

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: '🐄 Bienvenido al newsletter de Consignatarias.com.ar',
      html: `
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
              <li>Directorio de 74 consignatarias + 364 frigoríficos</li>
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
