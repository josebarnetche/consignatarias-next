import { getCurrentSession } from '@/lib/user-tier'
import { PaywallCard } from '@/components/Paywall'
import type { MedioPago } from '@/lib/dal/consignatarias'

interface Props {
  mediosPago: MedioPago[]
  consignatariaName: string
  /** Path actual para volver después del upgrade */
  redirectTo?: string
}

const METODO_LABELS: Record<string, string> = {
  'transferencia': 'Transferencia bancaria',
  'cheque': 'Cheque',
  'efectivo': 'Efectivo',
  'al-rinde': 'Al rinde (post-faena)',
  'al-gancho': 'Al gancho (post-faena)',
  'usd-billete': 'USD billete',
  'usdt': 'USDT / stablecoin',
  'permuta': 'Permuta',
  'mercado-pago': 'Mercado Pago',
}

function formatMetodo(metodo: string): string {
  return METODO_LABELS[metodo.toLowerCase()] || metodo
}

function formatPlazo(dias: number | null | undefined): string {
  if (!dias) return '—'
  if (dias === 0) return 'Contado'
  if (dias === 1) return '1 día'
  return `${dias} días`
}

/**
 * MediosPagoSection — bloque PRO-gated en perfil de consignataria.
 *
 * - Anonymous / Free: muestra PaywallCard.
 * - PRO: muestra tabla con métodos de pago + plazos + comentarios.
 * - Si no hay data: el dueño aún no cargó esta info (mensaje suave).
 */
export async function MediosPagoSection({ mediosPago, consignatariaName, redirectTo }: Props) {
  const { user, tier } = await getCurrentSession()

  return (
    <section className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-zinc-200 text-base font-medium mb-1 flex items-center gap-2">
            Medios de pago
            <span className="text-xxs font-mono text-sky-400 uppercase tracking-widest border border-sky-500/30 bg-sky-500/5 rounded px-1.5 py-0.5">
              PRO USUARIO
            </span>
          </h2>
          <p className="text-zinc-500 text-xs font-mono">
            Cómo y a qué plazo cobra {consignatariaName}.
          </p>
        </div>
      </div>

      {tier === 'pro' ? (
        mediosPago.length === 0 ? (
          <div className="border border-zinc-800 bg-zinc-900/40 rounded p-4 text-zinc-500 font-mono text-xs leading-relaxed">
            Esta consignataria todavía no publicó sus medios de pago. La información se actualiza
            cuando la consignataria es titular del perfil y completa la sección.
          </div>
        ) : (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-zinc-900/60 text-zinc-400 uppercase tracking-widest">
                  <th className="px-3 py-2 text-left font-medium border-b border-zinc-800">
                    Método
                  </th>
                  <th className="px-3 py-2 text-right font-medium border-b border-zinc-800">
                    Plazo de cobro
                  </th>
                  <th className="px-3 py-2 text-left font-medium border-b border-zinc-800">
                    Comentario
                  </th>
                </tr>
              </thead>
              <tbody>
                {mediosPago.map((mp, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-3 py-2.5 text-zinc-200">{formatMetodo(mp.metodo)}</td>
                    <td className="px-3 py-2.5 text-zinc-300 text-right tabular-nums">
                      {formatPlazo(mp.plazo_dias)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{mp.comentario || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <PaywallCard
          loggedIn={user !== null}
          feature="Los medios de pago de cada consignataria"
          redirectTo={redirectTo}
        />
      )}
    </section>
  )
}
