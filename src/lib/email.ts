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
  slug,
  location,
  remateDate: _remateDate,
  remateTitle,
}: PostRemateRequestParams) {
  const resend = await getResend()
  if (!resend) return { success: false, error: 'Resend not configured' }

  // Reserved for future use: format date for email body
  void _remateDate

  const safeName = escapeHtml(consignatariaName)
  const safeLocation = escapeHtml(location)
  // Reserved for future use: remate title in email
  void remateTitle
  const profileUrl = `${APP_URL}/consignatarias/${slug}`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      replyTo: 'agro@memola.com.ar',
      subject: `Resultados de su remate de hoy — consignatarias.com.ar`,
      html: `
        <div style="font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;color:#1a1a1a">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6">
            Estimados <strong>${safeName}</strong>,
          </p>
          
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
            Mi nombre es José Barnetche, Director de <strong>Memola Medios SAS</strong>, la empresa detrás de 
            <a href="${APP_URL}" style="color:#16a34a;text-decoration:none;font-weight:500">consignatarias.com.ar</a> 
            — un directorio gratuito de consignatarias y remates ganaderos de Argentina.
          </p>
          
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
            Notamos que hoy tuvieron un remate en <strong>${safeLocation}</strong>. 
            Estamos construyendo una base de datos pública de resultados de remates para darle más visibilidad al sector.
          </p>
          
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:24px 0">
            <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#166534">
              ¿Nos podrían compartir los promedios de su remate?
            </p>
            <p style="margin:0;font-size:14px;color:#166534">
              Pueden responder a este email con una imagen o los números directamente.
            </p>
          </div>
          
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
            Su consignataria ya tiene un perfil en nuestra plataforma:
          </p>
          
          <p style="margin:0 0 24px">
            <a href="${profileUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px">
              👉 Ver perfil de ${safeName}
            </a>
          </p>
          
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6">
            Publicamos los resultados con su nombre y un link a su perfil, dándoles exposición a compradores de todo el país.
          </p>
          
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6">
            ¡Desde ya muchas gracias!
          </p>
          
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600">José Barnetche</p>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Director — Memola Medios SAS</p>
            <p style="margin:0 0 4px;font-size:13px">
              <a href="${APP_URL}" style="color:#16a34a;text-decoration:none">consignatarias.com.ar</a>
            </p>
            <p style="margin:0;font-size:13px;color:#6b7280">+54 3773 418130</p>
          </div>
        </div>
      `,
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
