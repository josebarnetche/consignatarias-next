import type { MedioPago } from '@/lib/dal/consignatarias'

interface Props {
  mediosPago: MedioPago[]
  consignatariaName: string
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
 * MediosPagoSection — condiciones comerciales publicadas por la consignataria.
 *
 * Solo se renderiza cuando la titular del perfil cargó la información: sin
 * datos no hay sección (nunca un placeholder ni un gate sobre datos que no
 * existen — regla "datos reales").
 */
export function MediosPagoSection({ mediosPago, consignatariaName }: Props) {
  if (mediosPago.length === 0) return null

  return (
    <section className="my-8">
      <div className="mb-4">
        <h2 className="text-zinc-200 text-base font-medium mb-1">Medios de pago</h2>
        <p className="text-zinc-500 text-xs font-mono">
          Cómo y a qué plazo cobra {consignatariaName}. Publicado por la titular del perfil.
        </p>
      </div>

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
    </section>
  )
}
