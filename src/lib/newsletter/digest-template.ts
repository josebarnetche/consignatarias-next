/**
 * digest-template.ts — Plantilla HTML del digest semanal "qué cambió".
 *
 * On-brand terminal (monospace, fondo #09090b, acentos verde/ámbar), sobria.
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
    const color = up ? '#34d399' : '#f87171'
    const sign = up ? '+' : ''
    const ref = prevDate ? `vs. ${formatDayMonth(prevDate)}` : 'vs. semana anterior'
    sections.push(`
      <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:24px;margin-bottom:16px">
        <p style="color:#8a8a93;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px">Índice INMAG (novillo $/kg vivo)</p>
        <p style="margin:0;line-height:1.2">
          <span style="color:#38bdf8;font-size:42px;font-weight:bold;font-family:ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace">${money(current)}</span>
          <span style="color:${color};font-size:20px;margin-left:12px;font-weight:bold">${arrow} ${sign}${changePct.toFixed(1)}%</span>
        </p>
        <p style="color:#8a8a93;font-size:13px;margin:10px 0 0">${ref} ·
          <a href="${withDigestUtm('/mercado/inmag', 'inmag')}" style="color:#38bdf8;text-decoration:none">ver la serie →</a>
        </p>
      </div>
    `)
  }

  // --- Sección categoría que más se movió ----------------------------------
  if (model.topCategory && model.topCategory.changePct !== 0) {
    const { label, changePct, current } = model.topCategory
    const up = changePct >= 0
    const color = up ? '#34d399' : '#f87171'
    const sign = up ? '+' : ''
    sections.push(`
      <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:24px;margin-bottom:16px">
        <p style="color:#8a8a93;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1.5px">Categoría que más se movió</p>
        <p style="margin:0;line-height:1.3">
          <span style="color:#e4e4e7;font-size:22px;font-weight:bold">${escapeHtml(label)}</span>
          <span style="color:${color};font-size:18px;margin-left:12px;font-weight:bold">${sign}${changePct.toFixed(1)}%</span>
          ${current > 0 ? `<span style="color:#8a8a93;font-size:15px;margin-left:10px">${money(current)}</span>` : ''}
        </p>
        <p style="color:#8a8a93;font-size:13px;margin:10px 0 0">
          <a href="${withDigestUtm('/mercado', 'categoria')}" style="color:#38bdf8;text-decoration:none">ver el panel de categorías →</a>
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
      <div style="border-top:1px solid #27272a;padding:14px 0">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <a href="${url}" style="color:#e4e4e7;font-size:17px;font-weight:bold;text-decoration:none">${escapeHtml(r.consignataria)}</a>
          <span style="color:#8a8a93;font-size:13px">${formatDayMonth(r.date)}</span>
        </div>
        <p style="color:#a1a1aa;font-size:14px;margin:5px 0 0;line-height:1.4">${escapeHtml(r.title)}</p>
        <p style="color:#6b6b73;font-size:13px;margin:4px 0 0">
          ${escapeHtml(r.location)}${r.heads ? ` · ${r.heads.toLocaleString('es-AR')} cab` : ''}
        </p>
      </div>`
    }).join('')
    sections.push(`
      <div style="background:#18181b;border:1px solid #27272a;border-radius:2px;padding:24px;margin-bottom:16px">
        <p style="color:#8a8a93;font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px">Remates de la semana</p>
        <p style="color:#a1a1aa;font-size:14px;margin:0 0 8px">${upcomingCount} programados en los próximos 7 días</p>
        ${rows}
        <p style="margin:16px 0 0">
          <a href="${withDigestUtm('/remates', 'remates-todos')}" style="color:#38bdf8;text-decoration:none;font-size:14px;font-weight:bold">VER TODOS LOS REMATES →</a>
        </p>
      </div>
    `)
  }

  const bodyHtml = sections.length > 0
    ? sections.join('')
    : `<p style="color:#a1a1aa;font-size:16px;line-height:1.5">Esta semana no hubo cambios destacados. Volvé a
       <a href="${withDigestUtm('/mercado', 'fallback')}" style="color:#38bdf8">ver el mercado</a>.</p>`

  // --- Subject: el "número extremo" de la semana (rankeado vs la ventana real)
  // es la mayor palanca de apertura. Fallback a los subjects previos. ----------
  const subject = model.headline
    || (model.inmag
      ? `INMAG ${model.inmag.changePct >= 0 ? '+' : ''}${model.inmag.changePct.toFixed(1)}% — qué cambió esta semana`
      : model.topCategory
        ? `${model.topCategory.label} ${model.topCategory.changePct >= 0 ? '+' : ''}${model.topCategory.changePct.toFixed(1)}% — qué cambió esta semana`
        : 'Qué cambió esta semana en el mercado ganadero')

  const html = `
    <div style="font-family:ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace;max-width:600px;margin:0 auto;background:#09090b;color:#e4e4e7;padding:32px;border-radius:2px">
      <p style="color:#8a8a93;font-size:13px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1.5px">Digest semanal · consignatarias.com.ar</p>
      <h2 style="color:#fff;font-size:26px;margin:0 0 6px;letter-spacing:0.5px">QUÉ CAMBIÓ ESTA SEMANA</h2>
      <p style="color:#8a8a93;font-size:15px;margin:0 0 24px">${escapeHtml(model.weekRange)}</p>

      ${bodyHtml}

      <div style="text-align:center;margin:32px 0 8px">
        <a href="${withDigestUtm('/mercado', 'cta-mercado')}" style="background:#38bdf8;color:#09090b;padding:14px 34px;text-decoration:none;border-radius:2px;display:inline-block;font-size:16px;font-weight:bold;letter-spacing:1px">VER EL MERCADO</a>
      </div>

      <div style="border-top:1px solid #27272a;padding-top:16px;margin-top:24px">
        <p style="color:#71717a;font-size:14px;margin:0">
          <a href="${withDigestUtm('/remates', 'footer-remates')}" style="color:#71717a">Remates</a>
          &nbsp;&bull;&nbsp;
          <a href="${withDigestUtm('/mercado', 'footer-mercado')}" style="color:#71717a">Precios</a>
          &nbsp;&bull;&nbsp;
          <a href="${withDigestUtm('/consignatarias', 'footer-directorio')}" style="color:#71717a">Directorio</a>
        </p>
      </div>

      <p style="color:#52525b;font-size:12px;margin:18px 0 0;line-height:1.5">
        Recibís este email porque te suscribiste a consignatarias.com.ar
        <br>
        <a href="${unsubscribeLink}" style="color:#52525b">Desuscribirme</a>
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
