import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendCampoOfertaOutreach } from '@/lib/email'
import { authorizeCron } from '@/lib/cron-auth'
import { trackCron } from '@/lib/ops'
import { TIERRA_PROVINCIAS } from '@/lib/valuacion-campos'

/**
 * POST /api/cron/campos-oferta-outreach
 *
 * Salir a buscar OFERTA de campos. La sección está viva y vacía, y el lado que
 * falta no es la demanda: es que alguien publique.
 *
 * A quién: las firmas del directorio cuyo perfil tuvo tracción real. Entramos
 * con un dato cierto y de ellas —las visitas a su propio perfil— y no con una
 * promesa. Warm, no cold.
 *
 * Selección (todas, en orden):
 *   1. email no nulo.
 *   2. ≥ min visitas de perfil en 90 días (default 10).
 *   3. NO dada de baja (newsletter_subscribers status='unsubscribed').
 *   4. outreach_log: una sola vez por slug para este tipo, y cooldown de 45 días
 *      por inbox contra CUALQUIER tipo — una firma no puede recibir tres pedidos
 *      distintos nuestros en la misma quincena.
 *
 * GOTEO: cap por corrida (default 5, tope duro 10). No es una campaña masiva:
 * si el mensaje no sirve, quiero enterarme con cinco y no con sesenta.
 *
 * ?dry=1 preview sin enviar · ?test=<email> manda uno solo sin tocar el log ·
 * ?as=<slug> hace que ese test se arme con los datos REALES de esa firma (nombre,
 *   provincia y visitas), para revisar el mensaje tal cual lo recibiría ella y no
 *   un placeholder · ?min=<n> umbral de visitas · ?cap=<n> tope de la corrida.
 */
const OUTREACH_TYPE = 'campos_oferta'
const COOLDOWN_DIAS = 45
const CAP_DURO = 10

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const testEmail = (url.searchParams.get('test') || '').trim().toLowerCase()
  const minViews = parseInt(url.searchParams.get('min') || '10', 10)
  const cap = Math.min(CAP_DURO, Math.max(1, parseInt(url.searchParams.get('cap') || '5', 10)))
  const dry = url.searchParams.get('dry') === '1'

  const outcome = await trackCron('campos-oferta-outreach', async () => {
    const db = requireServiceClient()

    if (testEmail) {
      const comoSlug = (url.searchParams.get('as') || '').trim().toLowerCase()
      let demo = {
        displayName: 'Consignataria (TEST)',
        slug: 'test',
        views: 42,
        provincia: 'Corrientes' as string | null,
      }
      if (comoSlug) {
        const { data: f } = await db
          .from('consignatarias')
          .select('canonical_slug, display_name, province')
          .eq('canonical_slug', comoSlug)
          .maybeSingle()
        if (f) {
          const r = f as { canonical_slug: string; display_name: string; province: string | null }
          const { count } = await db
            .from('profile_views')
            .select('id', { count: 'exact', head: true })
            .eq('entity_type', 'consignataria')
            .eq('entity_slug', r.canonical_slug)
            .gte('viewed_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
          demo = {
            displayName: r.display_name,
            slug: r.canonical_slug,
            views: count ?? 0,
            provincia: r.province ? capitalizar(r.province) : null,
          }
        }
      }
      const valorPorProv = new Map(
        TIERRA_PROVINCIAS.map((t) => [
          t.provincia.toLowerCase(),
          `US$${Math.round(t.usd_ha).toLocaleString('es-AR')} por hectárea`,
        ]),
      )
      const r = await sendCampoOfertaOutreach({
        ...demo,
        to: testEmail,
        valorHectarea: demo.provincia ? (valorPorProv.get(demo.provincia.toLowerCase()) ?? null) : null,
      })
      return {
        message: `test → ${testEmail}${comoSlug ? ` (como ${demo.displayName})` : ''}`,
        metadata: { sent: r.success ? 1 : 0, test: true, como: demo.displayName, vistas90: demo.views },
      }
    }

    const [{ data: firmas }, { data: vistas }, { data: bajas }, { data: previos }] = await Promise.all([
      db.from('consignatarias').select('canonical_slug, display_name, email, province').not('email', 'is', null),
      db
        .from('profile_views')
        .select('entity_slug')
        .eq('entity_type', 'consignataria')
        .gte('viewed_at', new Date(Date.now() - 90 * 86_400_000).toISOString()),
      db.from('newsletter_subscribers').select('email').eq('status', 'unsubscribed'),
      db.from('outreach_log').select('type, consignataria_slug, email_sent_to, sent_at'),
    ])

    const conteo = new Map<string, number>()
    for (const v of vistas ?? []) {
      const s = (v as { entity_slug: string }).entity_slug
      conteo.set(s, (conteo.get(s) ?? 0) + 1)
    }

    const desuscritos = new Set((bajas ?? []).map((b) => String((b as { email: string }).email).toLowerCase()))

    // Ya invitados a publicar campos (nunca dos veces) y contactados hace poco por
    // cualquier motivo (no saturar el mismo inbox).
    const yaInvitados = new Set<string>()
    const contactadoReciente = new Set<string>()
    const corte = Date.now() - COOLDOWN_DIAS * 86_400_000
    for (const o of previos ?? []) {
      const r = o as { type: string; consignataria_slug: string | null; email_sent_to: string | null; sent_at: string | null }
      if (r.type === OUTREACH_TYPE && r.consignataria_slug) yaInvitados.add(r.consignataria_slug)
      if (r.email_sent_to && r.sent_at && new Date(r.sent_at).getTime() > corte) {
        contactadoReciente.add(r.email_sent_to.toLowerCase())
      }
    }

    const valorPorProvincia = new Map(
      TIERRA_PROVINCIAS.map((t) => [
        t.provincia.toLowerCase(),
        `US$${Math.round(t.usd_ha).toLocaleString('es-AR')} por hectárea`,
      ]),
    )

    const candidatas = (firmas ?? [])
      .map((f) => {
        const r = f as { canonical_slug: string; display_name: string; email: string; province: string | null }
        const provincia = r.province ? capitalizar(r.province) : null
        return {
          slug: r.canonical_slug,
          nombre: r.display_name,
          email: String(r.email).trim().toLowerCase(),
          provincia,
          views: conteo.get(r.canonical_slug) ?? 0,
          valorHectarea: provincia ? (valorPorProvincia.get(provincia.toLowerCase()) ?? null) : null,
        }
      })
      .filter(
        (c) =>
          c.email &&
          c.views >= minViews &&
          !desuscritos.has(c.email) &&
          !yaInvitados.has(c.slug) &&
          !contactadoReciente.has(c.email),
      )
      .sort((a, b) => b.views - a.views)

    if (dry) {
      return {
        message: `dry · ${candidatas.length} elegibles, mostraría ${Math.min(cap, candidatas.length)}`,
        metadata: {
          dry: true,
          elegibles: candidatas.length,
          enviaria: candidatas.slice(0, cap).map((c) => ({
            firma: c.nombre,
            email: c.email,
            provincia: c.provincia,
            vistas90: c.views,
            valorHectarea: c.valorHectarea,
          })),
        },
      }
    }

    let enviados = 0
    for (const c of candidatas.slice(0, cap)) {
      const r = await sendCampoOfertaOutreach({
        to: c.email,
        displayName: c.nombre,
        slug: c.slug,
        views: c.views,
        provincia: c.provincia,
        valorHectarea: c.valorHectarea,
      })
      if (!r.success) continue
      enviados++
      // Se registra DESPUÉS de un envío exitoso: si el mail falla, la firma sigue
      // elegible en la próxima corrida en vez de quedar quemada sin haber recibido nada.
      await db.from('outreach_log').insert({
        type: OUTREACH_TYPE,
        consignataria_slug: c.slug,
        email_sent_to: c.email,
        notes: `campos_oferta · ${c.views} vistas 90d${c.provincia ? ` · ${c.provincia}` : ''}`,
      })
    }

    return {
      message: `${enviados} invitaciones enviadas de ${candidatas.length} elegibles`,
      metadata: { sent: enviados, elegibles: candidatas.length, cap },
    }
  })

  return NextResponse.json(outcome)
}

function capitalizar(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
