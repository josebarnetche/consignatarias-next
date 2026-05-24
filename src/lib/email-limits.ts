/**
 * Resend free plan limits: 100 emails/día, 3.000/mes.
 *
 * Cada envío masivo se topea a un presupuesto diario para que un blast nunca
 * falle a medias al pasar el límite duro de Resend. Deja aire para los emails
 * transaccionales (welcome, claims, alertas) que TAMBIÉN cuentan contra el cupo.
 *
 * Cuando los suscriptores se acerquen al tope: subir a Resend Pro (50k/mes) o
 * batchear el envío en varios días. Ajustable con RESEND_DAILY_BATCH_CAP.
 */
export const RESEND_FREE = { perDay: 100, perMonth: 3000 } as const

export const DAILY_BATCH_CAP = Math.max(
  1,
  parseInt(process.env.RESEND_DAILY_BATCH_CAP || '80', 10),
)

/** Topea una lista de destinatarios al presupuesto diario del plan free. */
export function capForFreePlan<T>(
  recipients: T[],
  cap: number = DAILY_BATCH_CAP,
): { toSend: T[]; skipped: number } {
  if (recipients.length <= cap) return { toSend: recipients, skipped: 0 }
  return { toSend: recipients.slice(0, cap), skipped: recipients.length - cap }
}
