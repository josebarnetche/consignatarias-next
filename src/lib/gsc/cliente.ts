import 'server-only'
import { google, type searchconsole_v1 } from 'googleapis'

/**
 * Cliente de Google Search Console para producción (17-10-2026).
 *
 * POR QUÉ UNA CUENTA DE SERVICIO
 * Los scripts de scripts/ usan un token OAuth (scripts/archive/oauth-*.json) de una
 * app en modo "testing": Google lo vence a los 7 días, así que en un cron de
 * producción dejaría de andar sin avisar. La cuenta de servicio no vence; se la
 * agrega como usuario (Restringido alcanza) a la propiedad sc-domain:consignatarias.com.ar.
 * Pasos para crearla: docs/GSC-SERVICE-ACCOUNT.md.
 *
 * GSC_SERVICE_ACCOUNT_JSON acepta el JSON tal cual o en base64 (Vercel y GitHub a
 * veces rompen los saltos de línea de la private_key; el base64 los protege).
 * Sin la variable, devuelve null y el que llama decide (el cron sale con "sin configurar").
 */

export const GSC_SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'

interface CredencialServicio {
  client_email: string
  private_key: string
}

export function parsearCredencial(raw: string | undefined | null): CredencialServicio | null {
  const txt = (raw ?? '').trim()
  if (!txt) return null
  const intentos = [txt]
  try {
    intentos.push(Buffer.from(txt, 'base64').toString('utf8'))
  } catch {
    /* no era base64 */
  }
  for (const t of intentos) {
    try {
      const j = JSON.parse(t) as Partial<CredencialServicio>
      if (j.client_email && j.private_key) {
        // Si la clave llegó con "\n" literales (pegada a mano en un panel), se reponen.
        return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, '\n') }
      }
    } catch {
      /* siguiente intento */
    }
  }
  return null
}

/** Cliente autenticado de Search Console, o null si GSC_SERVICE_ACCOUNT_JSON no está. */
export async function crearClienteGsc(): Promise<searchconsole_v1.Searchconsole | null> {
  const cred = parsearCredencial(process.env.GSC_SERVICE_ACCOUNT_JSON)
  if (!cred) return null
  const jwt = new google.auth.JWT({
    email: cred.client_email,
    key: cred.private_key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  await jwt.authorize()
  return google.searchconsole({ version: 'v1', auth: jwt })
}
