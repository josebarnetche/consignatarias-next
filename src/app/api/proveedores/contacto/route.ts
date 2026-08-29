import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getProveedor } from '@/lib/proveedores'
import { requireServiceClient } from '@/lib/supabase'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'
import { sendProveedorLead } from '@/lib/email'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1),
  nombre: z.string().trim().min(2).max(120),
  // Con uno de los dos alcanza: hay quien deja el teléfono y no usa mail, y al revés.
  telefono: z.string().trim().max(40).optional(),
  email: z.string().email().max(160).optional(),
  empresa: z.string().trim().max(160).optional(),
  mensaje: z.string().trim().max(1000).optional(),
})

/**
 * POST /api/proveedores/contacto
 *
 * "Quiero que me contacten": el interesado deja SUS datos y nosotros se los pasamos al
 * proveedor. Es la contracara de no publicar el contacto del proveedor — el canal existe,
 * pero pasa por acá y queda registrado.
 *
 * El lead se guarda en `producer_leads` con `category='proveedor'` y `routed_to_slug`
 * apuntando al proveedor, así aparece en el mismo panel de leads que el resto y no hay
 * una segunda bandeja que nadie mira.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`proveedor-contacto:${getClientId(req)}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Probá en un minuto.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { slug, nombre, telefono, email, empresa, mensaje } = parsed.data
  if (!telefono && !email) {
    return NextResponse.json(
      { error: 'Dejanos un teléfono o un email para que te puedan contactar.' },
      { status: 400 },
    )
  }

  const proveedor = getProveedor(slug)
  if (!proveedor || !proveedor.publicado) {
    return NextResponse.json({ error: 'Proveedor no encontrado.' }, { status: 404 })
  }

  const service = requireServiceClient()
  const { error } = await service.from('producer_leads').insert({
    intent: 'contacto_proveedor',
    category: 'proveedor',
    name: nombre,
    phone: telefono || null,
    email: email || null,
    message: [empresa ? `Empresa: ${empresa}` : null, mensaje || null].filter(Boolean).join(' — ') || null,
    source: 'proveedores',
    routed_to_slug: proveedor.slug,
    routed_at: new Date().toISOString(),
    status: 'new',
  })

  if (error) {
    console.error('[proveedor-contacto] insert falló:', error.message)
    return NextResponse.json({ error: 'No pudimos registrar tu consulta.' }, { status: 500 })
  }

  // Derivación por mail. El contacto del proveedor NO está en el código (repo público):
  // vive en `proveedor_contactos`, service-role only, y se lee recién acá.
  //
  // Best-effort: el lead ya quedó guardado, así que si el envío se cae —cupo de Resend,
  // o el proveedor todavía sin contacto cargado— la consulta no se pierde: queda en el
  // panel para derivarla a mano.
  try {
    const { data: contacto } = await service
      .from('proveedor_contactos')
      .select('contacto_nombre, contacto_email')
      .eq('slug', proveedor.slug)
      .maybeSingle()

    if (contacto?.contacto_email) {
      await sendProveedorLead({
        proveedor: {
          empresa: proveedor.empresa,
          slug: proveedor.slug,
          contactoNombre: contacto.contacto_nombre,
          contactoEmail: contacto.contacto_email,
        },
        interesado: { nombre, telefono, email, empresa, mensaje },
      })
    } else {
      console.warn(
        `[proveedor-contacto] ${proveedor.slug} no tiene contacto cargado en proveedor_contactos. El lead quedó guardado, hay que derivarlo a mano.`,
      )
    }
  } catch (err) {
    console.error('[proveedor-contacto] mail al proveedor falló:', err)
  }

  return NextResponse.json({ ok: true })
}
