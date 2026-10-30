/**
 * Forma del secret de firma de Rebill, sin exponer su valor.
 *
 * Según la documentación oficial (docs.rebill.com/guides/webhooks, "Verify the
 * signature"), el signing secret de un webhook es `whsec_` + 64 caracteres hex
 * (70 en total), y es la clave HMAC-SHA256 tal cual, prefijo incluido. El id del
 * webhook, en cambio, es `we_` + 32 hex (35 en total): se ve en el panel y en
 * cada payload (`webhook.id`), y es fácil cargarlo por error en lugar del secret.
 *
 * Esta función devuelve solo el prefijo público y el largo, que son formato y no
 * contenido: alcanzan para saber, desde /admin/ops, si la variable tiene un
 * secret de firma o un id de webhook, sin imprimir nunca el valor.
 */
export type FormaSecret = 'whsec' | 'id_de_webhook' | 'otra'

export function formaDelSecret(secret: string | undefined | null): {
  secret_forma: FormaSecret
  secret_largo: number
} {
  const s = (secret ?? '').trim()
  let forma: FormaSecret = 'otra'
  if (/^whsec_[0-9a-f]{64}$/i.test(s)) forma = 'whsec'
  else if (/^we_[0-9a-f]{32}$/i.test(s)) forma = 'id_de_webhook'
  return { secret_forma: forma, secret_largo: s.length }
}
