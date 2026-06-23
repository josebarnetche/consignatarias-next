/**
 * digest-template.ts — Plantilla HTML del digest semanal "qué cambió".
 *
 * On-brand terminal (monospace, fondo #0a0a0f, acentos verde/ámbar), sobria.
 * Imita el estilo de sendWeeklyNewsletter / sendMonthlyClose en src/lib/email.ts.
 *
 * Todos los enlaces internos llevan UTM (utm_source=digest, utm_campaign=que-cambio)
 * para poder medir digest_click del lado sitio cuando el visitante aterriza.
 * Incluye un pixel de digest_open (1x1) apuntando a un endpoint que queda
 * PREPARADO (ver buildDigestEmail.openPixelUrl) — sin activar el envío real.
 *
 * NO envía: sólo produce { subject, html, headers }. El envío vivo queda intacto.
 */

import type { DigestModel } from './digest-content'
import { DIGEST_CAMPAIGN } from './digest-content'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Agrega UTM de digest a una URL interna. `target` queda en utm_content para medir qué bloque clickeó. */
export function withDigestUtm(path: string, target: string): string {
  const base = path.startsWith('http') ? path : `${APP_URL}${path}`
  const sep = base.includes('?') ? '&' : '?'
  const params = new URLSearchParams({
    utm_source: 'digest',
    utm_medium: 'email',
    utm_campaign: DIGEST_CAMPAIGN,
    utm_content: target,
  })
  return `${base}${sep}${params.toString()}`
}

function formatDayMonth(dateStr: string): string {
  const [_y, m, d] = dateStr.split('-')
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export interface DigestEmail {
  subject: string
  html: string
  /** Headers RFC 8058 listos para pasar a resend.emails.send({ headers }). */
  headers: Record<string, string>
  /** URL del pixel de apertura (digest_open) — preparada; ver nota de activación. */
  openPixelUrl: string
}

/**
 * buildDigestEmail — convierte el modelo en { subject, html, headers }.
 *
 * @param model     salida de buildDigestModel()
 * @param recipient email del destinatario (para baja + pixel; en PREVIEW puede ir un placeholder)
 */
export function buildDigestEmail(model: DigestModel, recipient: string): DigestEmail {
  const safeEmail = encodeURIComponent(recipient)

  // --- Link de baja (link humano) + endpoint one-click (RFC 8058) -----------
  // El link GET ya existe en el sitio (mismo patrón que el resto de los emails).
  // El POST one-click apunta al MISMO path; queda PENDIENTE crear el handler POST
  // /api/newsletter/unsubscribe (ver reporte). Hasta entonces el cliente de correo
  // cae al link GET, que sí funciona.
  const unsubscribeLink = `${APP_URL}/unsubscribe?email=${safeEmail}`
  const oneClickUrl = `${APP_URL}/api/newsletter/unsubscribe?email=${safeEmail}&campaign=${DIGEST_CAMPAIGN}`

  // --- Pixel de apertura (digest_open) --------------------------------------
  // Endpoint preparado (no creado en WAVE 3): un 1x1 transparente que registra
  // la apertura. Lo dejamos en el HTML para no tener que re-tocar la plantilla
  // cuando se active; si el endpoint no existe todavía, el <img> simplemente
  // no carga (soft-fail visual, no rompe el email).
  const openPixelUrl = `${APP_URL}/api/newsletter/digest/open?email=${safeEmail}&campaign=${DIGEST_CAMPAIGN}`

  const sections: string[] = []

  // --- Sección INMAG --------------------------------------------------------
  if (model.inmag) {
    const { current, changePct, prevDate } = model.inmag
    const up = changePct >= 0
    const arrow = up ? '▲' : '▼'
    const color = up ? '#22c55e' : '#ef4444'
    const sign = up ? '+' : ''
    const ref = prevDate ? `vs. ${formatDayMonth(prevDate)}` : 'vs. semana anterior'
    sections.push(`
      <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:18px;margin-bottom:12px">
        <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px">Índice INMAG (novillo $/kg vivo)</p>
        <p style="margin:0">
          <span style="color:#f59e0b;font-size:28px;font-weight:bold;font-family:monospace">${money(current)}</span>
          <span style="color:${color};font-size:14px;margin-left:10px">${arrow} ${sign}${changePct.toFixed(1)}%</span>
        </p>
        <p style="color:#71717a;font-size:11px;margin:6px 0 0">${ref} ·
          <a href="${withDigestUtm('/mercado/inmag', 'inmag')}" style="color:#f59e0b;text-decoration:none">ver la serie →</a>
        </p>
      </div>
    `)
  }

  // --- Sección categoría que más se movió ----------------------------------
  if (model.topCategory && model.topCategory.changePct !== 0) {
    const { label, changePct, current } = model.topCategory
    const up = changePct >= 0
    const color = up ? '#22c55e' : '#ef4444'
    const sign = up ? '+' : ''
    sections.push(`
      <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:18px;margin-bottom:12px">
        <p style="color:#71717a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px">Categoría que más se movió</p>
        <p style="margin:0">
          <span style="color:#e4e4e7;font-size:16px;font-weight:bold">${escapeHtml(label)}</span>
          <span style="color:${color};font-size:14px;margin-left:10px">${sign}${changePct.toFixed(1)}%</span>
          ${current > 0 ? `<span style="color:#71717a;font-size:12px;margin-left:8px">${money(current)}</span>` : ''}
        </p>
        <p style="color:#71717a;font-size:11px;margin:6px 0 0">
          <a href="${withDigestUtm('/mercado', 'categoria')}" style="color:#f59e0b;text-decoration:none">ver el panel de categorías →</a>
        </p>
      </div>
    `)
  }

  // --- Sección remates de la semana ----------------------------------------
  if (model.remates && model.remates.top.length > 0) {
    const { upcomingCount, top } = model.remates
    const rows = top.map((r) => {
      const url = withDigestUtm(`/consignatarias/${r.slug}`, 'remate')
      return `
      <div style="border-top:1px solid #27272a;padding:10px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <a href="${url}" style="color:#e4e4e7;font-size:13px;font-weight:bold;text-decoration:none">${escapeHtml(r.consignataria)}</a>
          <span style="color:#71717a;font-size:11px">${formatDayMonth(r.date)}</span>
        </div>
        <p style="color:#a1a1aa;font-size:12px;margin:3px 0 0">${escapeHtml(r.title)}</p>
        <p style="color:#52525b;font-size:11px;margin:2px 0 0">
          ${escapeHtml(r.location)}${r.heads ? ` · ${r.heads.toLocaleString('es-AR')} cab` : ''}
        </p>
      </div>`
    }).join('')
    sections.push(`
      <div style="background:#16161d;border:1px solid #27272a;border-radius:4px;padding:18px;margin-bottom:12px">
        <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Remates de la semana</p>
        <p style="color:#a1a1aa;font-size:12px;margin:0 0 6px">${upcomingCount} programados en los próximos 7 días</p>
        ${rows}
        <p style="margin:12px 0 0">
          <a href="${withDigestUtm('/remates', 'remates-todos')}" style="color:#22c55e;text-decoration:none;font-size:12px;font-weight:bold">VER TODOS LOS REMATES →</a>
        </p>
      </div>
    `)
  }

  const bodyHtml = sections.length > 0
    ? sections.join('')
    : `<p style="color:#a1a1aa;font-size:13px">Esta semana no hubo cambios destacados. Volvé a
       <a href="${withDigestUtm('/mercado', 'fallback')}" style="color:#22c55e">ver el mercado</a>.</p>`

  // --- Subject: lead con el dato más fuerte (INMAG si está) -----------------
  let subject = 'Qué cambió esta semana en el mercado ganadero'
  if (model.inmag) {
    const up = model.inmag.changePct >= 0
    subject = `INMAG ${up ? '+' : ''}${model.inmag.changePct.toFixed(1)}% — qué cambió esta semana`
  } else if (model.topCategory) {
    subject = `${model.topCategory.label} ${model.topCategory.changePct >= 0 ? '+' : ''}${model.topCategory.changePct.toFixed(1)}% — qué cambió esta semana`
  }

  const html = `
    <div style="font-family:monospace;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e4e4e7;padding:24px;border-radius:4px">
      <p style="color:#71717a;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Digest semanal · consignatarias.com.ar</p>
      <h2 style="color:#fff;font-size:18px;margin:0 0 4px">QUÉ CAMBIÓ ESTA SEMANA</h2>
      <p style="color:#71717a;font-size:12px;margin:0 0 20px">${escapeHtml(model.weekRange)}</p>

      ${bodyHtml}

      <div style="text-align:center;margin:24px 0 8px">
        <a href="${withDigestUtm('/mercado', 'cta-mercado')}" style="background:#22c55e;color:#0a0a0f;padding:11px 26px;text-decoration:none;border-radius:4px;display:inline-block;font-size:12px;font-weight:bold;letter-spacing:1px">VER EL MERCADO</a>
      </div>

      <div style="border-top:1px solid #27272a;padding-top:12px;margin-top:20px">
        <p style="color:#52525b;font-size:11px;margin:0">
          <a href="${withDigestUtm('/remates', 'footer-remates')}" style="color:#52525b">Remates</a>
          &nbsp;&bull;&nbsp;
          <a href="${withDigestUtm('/mercado', 'footer-mercado')}" style="color:#52525b">Precios</a>
          &nbsp;&bull;&nbsp;
          <a href="${withDigestUtm('/consignatarias', 'footer-directorio')}" style="color:#52525b">Directorio</a>
        </p>
      </div>

      <p style="color:#3f3f46;font-size:10px;margin:16px 0 0">
        Recibís este email porque te suscribiste a consignatarias.com.ar
        <br>
        <a href="${unsubscribeLink}" style="color:#3f3f46">Desuscribirme</a>
      </p>
      <img src="${openPixelUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;opacity:0" />
    </div>
  `

  // RFC 8058: one-click unsubscribe. List-Unsubscribe-Post habilita el botón
  // nativo de Gmail/Apple Mail. Apunta al endpoint POST (pendiente de crear) y,
  // como fallback, al link GET que ya existe.
  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${oneClickUrl}>, <${unsubscribeLink}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }

  return { subject, html, headers, openPixelUrl }
}
