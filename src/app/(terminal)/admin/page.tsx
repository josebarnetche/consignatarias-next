import Link from 'next/link'
import type { Metadata } from 'next'
import Stat from '@/components/ui/Stat'
import { AdminPageHeader, AdminSection, KpiRow, KpiCell, TodoRow, AdminEmpty } from '@/components/admin/kit'
import { getAdminPendientes, idsLeadsSinTrabajar } from '@/lib/admin/pendientes'
import { getFeaturedSlugs } from '@/lib/featured'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'Hoy · Admin' }

/**
 * /admin — la portada del panel. Responde, en este orden:
 *   1. ¿Qué espera una decisión mía? (bandeja con contadores → cada cola)
 *   2. ¿Está todo andando? (crons en rojo, errores)
 *   3. ¿Cómo viene el negocio? (cuatro números, sin repetir)
 *   4. ¿Quién entró último? (leads sin trabajar)
 * El detalle vive en cada página; acá nada se duplica.
 */

const nf = (n: number) => n.toLocaleString('es-AR')
const INTENT: Record<string, string> = { vender: 'Vende', comprar: 'Compra', tasar: 'Tasa', 'busca-campo': 'Busca campo' }

type Db = NonNullable<ReturnType<typeof createServiceClient>>

async function count(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await q
    return error || count == null ? null : count
  } catch {
    return null
  }
}

async function getPulso(db: Db | null) {
  if (!db) return null
  const now = Date.now()
  const iso = (ms: number) => new Date(now - ms).toISOString()
  const D = 86_400_000
  const [v24, v7, vPrev7, newsletter, newsletter7d, featured] = await Promise.all([
    count(db.from('profile_views').select('*', { count: 'exact', head: true }).gte('viewed_at', iso(D))),
    count(db.from('profile_views').select('*', { count: 'exact', head: true }).gte('viewed_at', iso(7 * D))),
    count(
      db.from('profile_views').select('*', { count: 'exact', head: true }).gte('viewed_at', iso(14 * D)).lt('viewed_at', iso(7 * D)),
    ),
    count(db.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active')),
    count(
      db.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('subscribed_at', iso(7 * D)),
    ),
    getFeaturedSlugs().then((s) => s.size).catch(() => null),
  ])
  const delta7 = v7 != null && vPrev7 ? ((v7 - vPrev7) / vPrev7) * 100 : null
  return { v24, v7, delta7, newsletter, newsletter7d, featured }
}

interface LeadRow {
  id: number
  name: string
  intent: string
  head_count: number | null
  hectareas: number | null
  category: string | null
  province: string | null
  created_at: string
  status: string
}

async function getLeadsSinTrabajar(db: Db | null): Promise<LeadRow[] | null> {
  if (!db) return null
  // Mismo criterio que el contador: sin caso del agente o escalado (src/lib/admin/pendientes.ts).
  const ids = await idsLeadsSinTrabajar(db)
  if (ids == null) return null
  if (ids.length === 0) return []
  const { data, error } = await db
    .from('producer_leads')
    .select('id, name, intent, head_count, hectareas, category, province, created_at, status')
    .in('id', ids)
    .order('created_at', { ascending: false })
    .limit(6)
  return error ? null : ((data ?? []) as LeadRow[])
}

function hace(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (h < 1) return 'recién'
  if (h < 24) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} d`
}

export default async function AdminHoyPage() {
  const db = createServiceClient()
  const [p, pulso, leads] = await Promise.all([getAdminPendientes(), getPulso(db), getLeadsSinTrabajar(db)])

  const cronsRojo = p.cronsEnRojo
  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  return (
    <>
      <AdminPageHeader title="Hoy" meta={fecha} description="Lo que espera una decisión, la salud del sistema y el pulso del negocio." />

      <div className="grid gap-px lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminSection title="Por decidir" flush>
          <TodoRow
            href="/admin/claims"
            label="Verificaciones de consignatarias"
            hint="Firmas que reclaman su perfil"
            count={p.claimsConsignatarias}
          />
          <TodoRow
            href="/admin/frigorifico-claims"
            label="Verificaciones de frigoríficos"
            hint="Frigoríficos que reclaman su ficha"
            count={p.claimsFrigorificos}
          />
          <TodoRow href="/admin/leads" label="Leads sin trabajar" hint="Sin caso del agente o escalados a vos" count={p.leadsSinTrabajar} />
          <TodoRow href="/admin/campos" label="Campos por publicar" hint="Avisos cargados esperando revisión" count={p.campos} />
          <TodoRow href="/admin/reviews" label="Reseñas por moderar" count={p.reviews} />
        </AdminSection>

        <AdminSection title="Sistema" action={<Link href="/admin/ops" className="text-accent text-xxs">Ver ops →</Link>} flush>
          <TodoRow
            href="/admin/ops"
            label="Crons en rojo"
            hint={
              cronsRojo && cronsRojo.length > 0
                ? cronsRojo.map((c) => c.workflow_name).slice(0, 3).join(' · ')
                : 'Todos corrieron en su intervalo'
            }
            count={cronsRojo ? cronsRojo.length : null}
            tone="negative"
          />
          <TodoRow
            href="/admin/ops#errores"
            label="Errores en las últimas 24 h"
            hint="Requests y tareas que terminaron en error"
            count={p.opsErrores24h}
            tone="warning"
          />
        </AdminSection>
      </div>

      <KpiRow cols={4}>
        <KpiCell>
          <Stat label="Vistas de perfil · 24 h" value={pulso?.v24 != null ? nf(pulso.v24) : null} sub={<Link href="/admin/overview" className="text-accent">en vivo →</Link>} />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Vistas de perfil · 7 d"
            value={pulso?.v7 != null ? nf(pulso.v7) : null}
            delta={pulso?.delta7 ?? null}
            sub="contra los 7 días previos"
          />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Newsletter activos"
            value={pulso?.newsletter != null ? nf(pulso.newsletter) : null}
            sub={pulso?.newsletter7d != null ? `+${nf(pulso.newsletter7d)} en 7 días` : undefined}
          />
        </KpiCell>
        <KpiCell>
          <Stat
            label="Firmas PRO"
            value={pulso?.featured != null ? nf(pulso.featured) : null}
            sub={<Link href="/admin/dashboard" className="text-accent">negocio →</Link>}
          />
        </KpiCell>
      </KpiRow>

      <AdminSection
        title="Últimos leads sin trabajar"
        action={<Link href="/admin/leads" className="text-accent text-xxs">Abrir leads →</Link>}
        flush
      >
        {leads == null ? (
          <AdminEmpty>No se pudieron leer los leads.</AdminEmpty>
        ) : leads.length === 0 ? (
          <AdminEmpty>No hay leads esperando. Todo lo que entró ya tiene un estado.</AdminEmpty>
        ) : (
          <table className="terminal-table">
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="w-24 text-zinc-500 text-xxs whitespace-nowrap">{hace(l.created_at)}</td>
                  <td className="w-24 text-xxs uppercase tracking-wider text-zinc-400">{INTENT[l.intent] ?? l.intent}</td>
                  <td className="text-ink">
                    <Link href={`/admin/leads?lead=${l.id}`} className="hover:text-accent">
                      {l.name}
                    </Link>
                  </td>
                  <td className="text-zinc-400 hidden sm:table-cell">
                    {[
                      l.head_count ? `${nf(l.head_count)} cab` : null,
                      l.hectareas ? `${nf(l.hectareas)} ha` : null,
                      l.category,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </td>
                  <td className="text-zinc-500 text-xxs hidden md:table-cell">{l.province}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSection>
    </>
  )
}
