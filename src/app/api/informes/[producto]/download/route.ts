import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getProducto } from '@/lib/productos-datos'
import { verificarAcceso, contabilizarDescarga } from '@/lib/informes/acceso'
import { armarInformeCanon } from '@/lib/informes/canon'
import { generateInformeCanonPDF } from '@/lib/pdf/generateInformeCanonPDF'
import { armarParteSemanal } from '@/lib/informes/semanal'
import { generateParteSemanalPDF } from '@/lib/pdf/generateParteSemanalPDF'
import { armarInformeDepartamental } from '@/lib/informes/departamental'
import { generateInformeDepartamentalPDF } from '@/lib/pdf/generateInformeDepartamentalPDF'
import { armarInformeProvincial } from '@/lib/informes/provincial'
import { generateInformeProvincialPDF } from '@/lib/pdf/generateInformeProvincialPDF'
import { armarInformeValuacion } from '@/lib/informes/valuacion'
import { generateInformeValuacionPDF } from '@/lib/pdf/generateInformeValuacionPDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/informes/[producto]/download?variante=corrientes
 *
 * Entrega de un informe pago. A diferencia de las guías, acá **no hay maestro en disco**:
 * el PDF se genera en el momento con el dato del día, porque el mismo producto tiene una
 * variante por zona y el precio con el que se convierten los kilos cambia todos los días.
 * El email del comprador se estampa en el pie de cada página desde el propio generador.
 *
 * Doble llave, igual que en las guías: el entitlement se ancla al EMAIL (la compra es
 * email-first, sin cuenta), y para descargar hay que estar logueado con ese mismo email
 * — el magic-link es la prueba de que quien baja controla la casilla que pagó.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ producto: string }> },
) {
  const { producto: productoSlug } = await params
  const variante = req.nextUrl.searchParams.get('variante')?.trim() ?? ''

  const producto = getProducto(productoSlug)
  if (!producto) {
    return NextResponse.json({ error: 'producto_not_found', productoSlug }, { status: 404 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user?.email) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent('/cuenta/informes')}`, req.url),
    )
  }
  const email = user.email.trim().toLowerCase()

  const service = requireServiceClient()

  // Dos vías posibles: compra única o suscripción vigente. La regla de cuál habilita
  // —incluido el período de gracia de una suscripción cancelada— vive en un solo lugar.
  let acceso
  try {
    acceso = await verificarAcceso(service, {
      productoSlug: producto.slug,
      varianteSlug: variante,
      email,
    })
  } catch (err) {
    console.error('[informe-download] verificación de acceso falló:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  if (!acceso.permitido) {
    // No lo tiene: al sales page, no un 403 seco. Es una venta, no un error.
    return NextResponse.redirect(new URL(`${producto.landing}?falta_compra=1`, req.url))
  }

  const doc = construir(producto.slug, variante, email)
  if (!doc) {
    // El entitlement es válido pero hoy no se puede armar el PDF (zona retirada del
    // relevamiento, o sin precio del día). Se avisa en vez de entregar un PDF con ceros.
    console.error('[informe-download] sin datos para armar', { producto: producto.slug, variante })
    return NextResponse.json({ error: 'informe_no_disponible' }, { status: 503 })
  }

  // Contabilidad — contra la fila que habilitó, y sin bloquear la entrega.
  contabilizarDescarga(service, acceso)

  const nombreArchivo = [producto.slug, variante.replace(/\//g, '-')].filter(Boolean).join('-')

  return new NextResponse(new Uint8Array(doc.output('arraybuffer')), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

/** Despacho por producto. Cada uno tiene su armador y su generador. */
function construir(productoSlug: string, variante: string, email: string) {
  if (productoSlug === 'informe-canon-arrendamiento') {
    const data = armarInformeCanon(variante, email)
    return data ? generateInformeCanonPDF(data) : null
  }
  if (productoSlug === 'informe-productivo-departamento') {
    const data = armarInformeDepartamental(variante, email)
    return data ? generateInformeDepartamentalPDF(data) : null
  }
  if (productoSlug === 'informe-prospeccion-provincial') {
    const data = armarInformeProvincial(variante, email)
    return data ? generateInformeProvincialPDF(data) : null
  }
  if (productoSlug === 'informe-valuacion-campo') {
    const data = armarInformeValuacion(variante, email)
    return data ? generateInformeValuacionPDF(data) : null
  }
  if (productoSlug === 'parte-semanal-mercado') {
    // Sin variante: el parte es uno solo por semana, el mismo para todos. Se regenera
    // con el dato del día, así que bajarlo un martes o un viernes no da lo mismo.
    return generateParteSemanalPDF(armarParteSemanal(email))
  }
  // Los demás productos del catálogo todavía no tienen generador. Devolver null hace que
  // la ruta responda 503 en vez de entregar un archivo vacío.
  return null
}
