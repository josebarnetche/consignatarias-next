import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { armarInformeCanon } from '@/lib/informes/canon'
import { generateInformeCanonPDF } from '@/lib/pdf/generateInformeCanonPDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/informes/muestra — un informe completo, gratis, con cuenta.
 *
 * POR QUÉ ESTO EXISTE
 * La objeción más dura de un PDF pago es comprarlo sin haberlo visto. Un sales page con
 * capturas no la resuelve: el que duda quiere tener el archivo en la mano.
 *
 * Así que se regala uno **entero y de verdad** —el mismo generador, la misma calidad, sin
 * marcas de agua ni páginas recortadas— de una zona fija. El que lo baja ve exactamente
 * qué compra; lo único que no obtiene es SU zona, que es justamente lo que se vende.
 *
 * Pide cuenta, no pago: es el uso gratuito que convierte un registro en alguien que
 * entendió el producto. Y el email queda, que es el activo.
 *
 * La zona de muestra es Corrientes a propósito: tiene n=45, confianza alta y una brecha
 * chica entre las dos vías, así que muestra el informe en su mejor forma sin exagerar
 * nada — todos los números son reales.
 */
const ZONA_MUESTRA = 'corrientes'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user?.email) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent('/informes/canon-de-arrendamiento?muestra=1')}`, req.url),
    )
  }

  const data = armarInformeCanon(ZONA_MUESTRA, user.email.trim().toLowerCase())
  if (!data) {
    return NextResponse.json({ error: 'muestra_no_disponible' }, { status: 503 })
  }

  const doc = generateInformeCanonPDF(data)

  return new NextResponse(new Uint8Array(doc.output('arraybuffer')), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="informe-canon-muestra-corrientes.pdf"',
      'Cache-Control': 'private, no-store',
    },
  })
}
