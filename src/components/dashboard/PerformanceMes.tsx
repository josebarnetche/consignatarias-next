import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { Performance, Cambio } from '@/lib/reports/performance'

/**
 * "Tu mes" — el bloque de performance del panel de una consignataria.
 *
 * Es la respuesta a la única pregunta que la firma hace en la reunión de venta:
 * *¿esto me sirvió?*. Y la respuesta tiene que ser defendible, porque este bloque es
 * el que la firma le muestra a su socio.
 *
 * Por eso el estado de cada número no es la flecha: es la **confianza**. Un +100%
 * que va de 2 a 4 contactos se pinta gris y dice "muy pocos datos", no verde con una
 * flecha para arriba. La flecha verde se gana superando la variación normal del mes
 * — ver `clasificarCambio()`.
 */

const MES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function nombreMes(clave: string): string {
  const [a, m] = clave.split('-')
  return `${MES_LARGO[Number(m) - 1] ?? clave} ${a}`
}

function Metrica({ titulo, cambio }: { titulo: string; cambio: Cambio }) {
  // Sólo un cambio que superó el ruido se pinta con color y flecha. El resto es gris:
  // no es "malo", es "todavía no se puede afirmar".
  const esSeñal = cambio.confianza === 'señal'
  const Icono = !esSeñal ? Minus : cambio.direccion === 'sube' ? TrendingUp : TrendingDown
  const color = !esSeñal
    ? 'text-zinc-500'
    : cambio.direccion === 'sube'
      ? 'text-positive'
      : 'text-negative'

  return (
    <div className="bg-zinc-800/50 rounded-terminal p-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-terminal tabular-nums font-bold text-zinc-100">
          {cambio.actual.toLocaleString('es-AR')}
        </span>
        <span className={`flex items-center gap-0.5 text-xs font-terminal ${color}`}>
          <Icono className="h-3 w-3" />
          {cambio.delta > 0 ? '+' : ''}{cambio.delta}
        </span>
      </div>
      <div className="text-[10px] text-zinc-500 uppercase font-terminal mt-1">{titulo}</div>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{cambio.leyenda}</p>
    </div>
  )
}

export default function PerformanceMes({ perf }: { perf: Performance }) {
  const { actual, anterior, cambios, ranking, recomendaciones } = perf

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Tu mes · {nombreMes(actual.mes)}
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">
          comparado con {nombreMes(anterior.mes)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metrica titulo="visitas a tu perfil" cambio={cambios.vistas} />
        <Metrica titulo="contactos recibidos" cambio={cambios.contactos} />
        <Metrica titulo="leads con datos" cambio={cambios.leads} />
      </div>

      {/* Desglose por canal — sólo si hubo contactos. */}
      {actual.contactos > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(actual.porCanal)
            .sort((a, b) => b[1] - a[1])
            .map(([canal, n]) => (
              <span key={canal} className="rounded bg-zinc-800/60 px-2 py-1 text-xxs font-terminal text-zinc-400">
                {{ contact_whatsapp: 'WhatsApp', contact_web: 'Web', contact_phone: 'Teléfono', contact_email: 'Email' }[canal] ?? canal}
                {' · '}{n}
              </span>
            ))}
        </div>
      )}

      {ranking && (
        <p className="mt-3 text-xs font-terminal text-amber-300">
          {ranking.posicion}º de {ranking.total} en {ranking.provincia} por contactos recibidos.
        </p>
      )}

      {recomendaciones.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-terminal-border pt-3">
          {recomendaciones.map((r) => (
            <li key={r} className="flex gap-2 text-xs leading-snug text-zinc-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Un cambio se marca en verde o rojo sólo cuando supera la variación normal de un
        mes a otro. Si dice &ldquo;se mantiene&rdquo; o &ldquo;pocos datos&rdquo;, el número se movió pero
        todavía no alcanza para afirmar que algo cambió.
      </p>
    </div>
  )
}
