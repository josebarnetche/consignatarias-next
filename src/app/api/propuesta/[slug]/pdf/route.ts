import { NextRequest, NextResponse } from 'next/server'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { tokenPropuestaValido } from '@/lib/propuesta/token'
import { esAdmin } from '@/lib/propuesta/admin'
import { generarPresentacionPro } from '@/lib/pdf/propuesta/generar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/propuesta/<firma>/pdf?t=<token>[&contacto=]
 *
 * La presentación PRO en PDF, generada en el servidor (lib/pdf/propuesta). Mismo
 * acceso que la página /propuesta/<firma>: token firmado o sesión de admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const canonical = getCanonicalSlug(slug)
  const profile = canonical ? getProfile(canonical) : null
  if (!profile) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const t = req.nextUrl.searchParams.get('t')
  if (!(tokenPropuestaValido(profile.canonicalSlug, t) || (await esAdmin()))) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

  const contacto = (req.nextUrl.searchParams.get('contacto') ?? '').trim().slice(0, 80) || undefined
  const pdf = await generarPresentacionPro(profile, contacto)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Propuesta-PRO-${profile.canonicalSlug}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
