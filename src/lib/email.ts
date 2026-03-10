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

const FROM = 'Consignatarias.com.ar <noreply@consignatarias.com.ar>'
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
