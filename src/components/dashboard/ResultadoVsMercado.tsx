import Link from 'next/link'
import type {
  ComparacionCategoria,
  PosicionBanda,
  ResultadoVsMercado as Resultado,
} from '@/lib/reports/resultado-vs-mercado'

/**
 * "Su precio contra el mercado" para las firmas que no rematan en Cañuelas. (17-10-2026)
 *
 * `BenchmarkMercado` necesita lotes del MAG; una casa de Corrientes no tiene ninguno.
 * Lo que sí tiene es su planilla de remate: la carga en Resultados y acá la ponemos
 * contra el Valor de Referencia de la misma fecha, categoría por categoría.
 *
 * Sólo importa TIPOS de la lib: este componente lo renderiza `DashboardClient`
 * (cliente) y la lib arrastra `vr-bandas.json`, que no tiene por qué ir al bundle.
 *
 * El rótulo dice "referencia nacional (MAG)" en el bloque y no en un pie: es la
 * diferencia entre "vendiste 5% arriba de lo que paga Cañuelas" —que es lo que se
 * puede afirmar— y "vendiste 5% arriba del mercado de Corrientes", que no existe.
 */

const ars = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const COLOR_POSICION: Record<PosicionBanda, string> = {
  'arriba de la banda': 'text-positive',
  'en la banda, arriba de la mediana': 'text-zinc-200',
  'en la banda, debajo de la mediana': 'text-zinc-200',
  'debajo de la banda': 'text-negative',
}

/** Barrita con la banda P10–P90 y dónde cayó el precio. Visual, no reemplaza al texto. */
function Banda({ f }: { f: ComparacionCategoria }) {
  const ref = f.referencia
  if (!ref || !f.precioFirma || ref.p90 <= ref.p10) return null
  // Escala con margen a ambos lados para que un precio fuera de la banda se vea fuera.
  const min = Math.min(ref.p10, f.precioFirma) * 0.95
  const max = Math.max(ref.p90, f.precioFirma) * 1.05
  const x = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (
    <div className="relative mt-1 h-1.5 w-full min-w-[80px] rounded-full bg-zinc-800" aria-hidden="true">
      <div
        className="absolute inset-y-0 rounded-full bg-zinc-600"
        style={{ left: x(ref.p10), width: `calc(${x(ref.p90)} - ${x(ref.p10)})` }}
      />
      <div className="absolute inset-y-0 w-px bg-zinc-400" style={{ left: x(ref.mediana) }} />
      <div
        className="absolute -top-0.5 h-2.5 w-1 -translate-x-1/2 rounded-sm bg-accent"
        style={{ left: x(f.precioFirma) }}
      />
    </div>
  )
}

function Fila({ f }: { f: ComparacionCategoria }) {
  const ref = f.referencia
  const pct = f.pctVsMediana
  return (
    <tr className="border-t border-terminal-border align-top">
      <td className="py-2 pr-3">
        <span className="block text-xs font-terminal text-zinc-200">{f.categoria}</span>
        <span className="block text-[10px] font-terminal text-zinc-600">
          {[f.cabezas ? `${f.cabezas.toLocaleString('es-AR')} cab.` : null, f.pesoKg ? `${f.pesoKg} kg` : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </td>
      <td className="py-2 pr-3 text-right font-terminal tabular-nums text-sm text-ink">
        {f.precioFirma ? ars(f.precioFirma) : '—'}
      </td>
      <td className="py-2 pr-3 text-right font-terminal tabular-nums text-xs text-zinc-500">
        {ref ? (
          <>
            <span className="block">{ars(ref.mediana)}</span>
            {ref.p90 > ref.p10 && (
              <span className="block text-[10px] text-zinc-600">
                {ars(ref.p10)} – {ars(ref.p90)}
              </span>
            )}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="py-2 pr-3 text-right font-terminal tabular-nums text-sm text-zinc-200">
        {pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct.toLocaleString('es-AR')}%`}
      </td>
      <td className="py-2 min-w-[140px]">
        {f.posicion ? (
          <>
            <span className={`block text-xxs font-terminal ${COLOR_POSICION[f.posicion]}`}>{f.posicion}</span>
            <Banda f={f} />
          </>
        ) : (
          <span className="block text-[10px] leading-snug text-zinc-500">{f.nota}</span>
        )}
      </td>
    </tr>
  )
}

function Remate({ r }: { r: Resultado }) {
  // Las notas de las filas comparadas van abajo, numeradas por categoría: en la
  // celda ocuparían más que el dato. Las de las filas SIN comparación ya están en
  // su celda, porque ahí son la respuesta.
  const notas = r.filas.filter((f) => f.posicion && f.nota)
  return (
    <div className="mt-3 first:mt-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-terminal text-zinc-300">{r.titulo}</span>
        <span className="text-[10px] font-terminal text-zinc-600">{fechaCorta(r.fecha)}</span>
      </div>
      {r.filas.length === 0 ? (
        <p className="text-xxs text-zinc-500">
          Este remate no tiene desglose por categoría, así que no hay nada que comparar.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-[10px] font-terminal uppercase tracking-widest text-zinc-600">
                  <th className="pb-1 text-left font-normal">Categoría</th>
                  <th className="pb-1 pr-3 text-right font-normal">Tu $/kg vivo</th>
                  <th className="pb-1 pr-3 text-right font-normal">VR mediana (P10–P90)</th>
                  <th className="pb-1 pr-3 text-right font-normal">vs mediana</th>
                  <th className="pb-1 text-left font-normal">Posición</th>
                </tr>
              </thead>
              <tbody>
                {r.filas.map((f, i) => <Fila key={`${f.categoria}-${i}`} f={f} />)}
              </tbody>
            </table>
          </div>
          {notas.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {notas.map((f, i) => (
                <li key={`${f.categoria}-${i}`} className="text-[10px] leading-snug text-zinc-600">
                  <span className="text-zinc-500">{f.categoria}:</span> {f.nota}
                  {f.referencia ? ` ${f.referencia.lotes.toLocaleString('es-AR')} lotes, confianza ${f.referencia.confianza}.` : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function ResultadoVsMercado({ resultados }: { resultados: Resultado[] }) {
  if (resultados.length === 0) {
    return (
      <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Tu precio contra el mercado
        </h3>
        <p className="mt-2 text-sm leading-snug text-zinc-200">
          Cargá los resultados de tu último remate y te mostramos, categoría por categoría,
          dónde quedó tu precio contra el Valor de Referencia de esa semana.
        </p>
        <p className="mt-1 text-xs leading-snug text-zinc-500">
          Con el promedio en $ por kg vivo de cada categoría alcanza. Si sumás el peso
          promedio, la comparación es contra los lotes de ese mismo peso.
        </p>
        <Link
          href="/dashboard/resultados/nuevo"
          className="mt-3 inline-block rounded-terminal bg-accent px-4 py-2 text-xs font-semibold text-terminal-bg transition-colors hover:bg-accent-bright"
        >
          Cargar el último remate
        </Link>
      </div>
    )
  }

  const provincia = resultados.find((r) => r.provincia)?.provincia ?? null

  return (
    <div className="mb-4 rounded-terminal border border-terminal-border bg-terminal-bg/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-terminal uppercase tracking-widest text-zinc-300">
          Tu precio contra el mercado
        </h3>
        <span className="text-xxs font-terminal text-zinc-600">
          Referencia nacional (MAG) · tus últimos {resultados.length} remates
        </span>
      </div>

      {resultados.map((r) => <Remate key={r.id} r={r} />)}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-terminal-border pt-3">
        <Link href="/dashboard/resultados/nuevo" className="text-xxs font-terminal text-accent hover:underline">
          + Cargar otro remate
        </Link>
        <Link href="/metodologia/vr" className="text-xxs font-terminal text-zinc-500 hover:underline">
          Cómo se calcula el Valor de Referencia
        </Link>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-zinc-600">
        Tu promedio por categoría, tal como lo cargaste, contra la banda del Valor de
        Referencia: el 80% central de los precios por kg vivo de los lotes vendidos en el
        Mercado Agroganadero de Cañuelas en la ventana de 30 días que cubre la fecha del remate. Es una
        referencia nacional: no hay una serie oficial de precios
        {provincia ? ` de ${provincia}` : ' por provincia'}, y el ajuste por origen se
        aplica sólo cuando nuestra base lo sostiene. Un remate más viejo que la ventana se
        compara con la banda de su fecha, nunca con la de hoy. Terneros no tienen
        referencia: el MAG no los opera por lote.
      </p>
    </div>
  )
}
