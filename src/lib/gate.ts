import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/user-tier'
import { hasAuthHeader } from '@/lib/api-auth'

/**
 * Gate de descarga: las acciones clave (exportar CSV/JSON, PDF de reporte)
 * requieren cuenta. El contenido indexable NO pasa por acá — este gate es
 * solo para el archivo que se baja, no para la página que Google lee.
 *
 * Devuelve `null` si el request puede seguir. Si no:
 *   - navegación del browser (Accept: text/html) → redirect a /login?next=…
 *   - fetch / API                                → 401 JSON con needsAuth
 *
 * Un request con API key (`Authorization` / `x-api-key`) no se toca: ese
 * camino ya tiene su propia autenticación y cuota en `api-auth.ts`.
 */
export async function requireLoginForDownload(
  request: NextRequest,
  next: string,
): Promise<NextResponse | null> {
  if (hasAuthHeader(request)) return null

  const { user } = await getCurrentSession()
  if (user) return null

  const wantsHtml = (request.headers.get('accept') || '').includes('text/html')
  if (wantsHtml) {
    const url = new URL(`/login?next=${encodeURIComponent(next)}`, request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.json(
    { error: 'Ingresá para descargar.', needsAuth: true },
    { status: 401 },
  )
}
