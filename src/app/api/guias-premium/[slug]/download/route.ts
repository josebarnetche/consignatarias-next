import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getGuiaPremium } from '@/lib/guias-premium'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/guias-premium/[slug]/download
 *
 * Entrega de una guía paga. El archivo maestro NUNCA vive en /public: se lee de
 * `private/guias/` y se sirve por acá, previa verificación de que ESTE email
 * compró ESTA guía. Cada copia sale estampada con el email del comprador al pie
 * de cada página — no impide copiar el PDF, pero le pone nombre y apellido a la
 * copia que circule, que es lo único que hace un watermark honesto.
 *
 * El entitlement se ancla al email (la compra es email-first, sin cuenta). Para
 * bajarla hay que estar logueado con ese mismo email: el magic-link de Supabase
 * es la prueba de que quien descarga controla la casilla que pagó.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const guia = getGuiaPremium(slug)
  if (!guia) {
    return NextResponse.json({ error: 'guia_not_found', slug }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user?.email) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent('/cuenta/guias')}`, req.url),
    )
  }
  const email = user.email.trim().toLowerCase()

  const service = requireServiceClient()
  const { data: purchase, error } = await service
    .from('guia_purchases')
    .select('id, download_count')
    .eq('guia_slug', guia.slug)
    .eq('email', email)
    .eq('status', 'paid')
    .maybeSingle()

  if (error) {
    console.error('[guia-download] lookup falló:', error.message)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
  if (!purchase) {
    // No la compró: al sales page, no un 403 seco (es una venta, no un error).
    return NextResponse.redirect(new URL(`${guia.landing}?falta_compra=1`, req.url))
  }

  let master: Buffer
  try {
    master = await readFile(path.join(process.cwd(), 'private', 'guias', guia.file))
  } catch (err) {
    console.error('[guia-download] no se pudo leer el maestro:', err)
    return NextResponse.json({ error: 'file_unavailable' }, { status: 503 })
  }

  const stamped = await stampPdf(master, email, guia.title)

  // Contabilidad de descargas (no bloquea la entrega).
  service
    .from('guia_purchases')
    .update({
      download_count: (purchase.download_count ?? 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)
    .then(({ error: updErr }) => {
      if (updErr) console.error('[guia-download] contador falló:', updErr.message)
    })

  return new NextResponse(new Uint8Array(stamped), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${guia.slug}-v${guia.version}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

/**
 * Sello con el email del comprador en cada hoja. Va ARRIBA, en el margen
 * superior: el pie ya lo ocupa el footer de la guía, y superponerlos deja
 * las dos líneas ilegibles.
 */
async function stampPdf(master: Buffer, email: string, title: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.load(master)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const stamp = `Licencia personal de ${email} — consignatarias.com.ar`

  doc.setTitle(title)
  doc.setSubject(stamp)

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    page.drawText(stamp, {
      x: 45,
      y: height - 22,
      size: 6.5,
      font,
      color: rgb(0.55, 0.55, 0.58),
      maxWidth: width - 90,
    })
  }

  return doc.save()
}
