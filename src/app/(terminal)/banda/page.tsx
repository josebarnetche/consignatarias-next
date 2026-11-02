import { Metadata } from 'next'
import Link from 'next/link'
import { DatasetSchema } from '@/components/seo/JsonLd'
import { CitaBlock } from '@/components/seo/CitaBlock'
import Compartir from '@/components/Compartir'
import { LICENCIA_PROPIA } from '@/lib/seo/schemas'
import { etiquetaCategoria, VR_METODOLOGIA, VR_VENTANA_DIAS } from '@/lib/vr'
import { cargarBanda } from '@/lib/mercado/banda-datos'
import {
  descripcionRangos,
  descripcionSerie,
  escalaRangos,
  fechaCorta,
  geometriaSerie,
  posicionPct,
  MIN_LOTES_PUBLICAR,
} from '@/lib/mercado/banda-pagina'

/**
 * /banda — la Banda Consignatarias, el número propio del sitio, con página propia.
 *
 * Hasta acá vivía en la tool MCP `consignatarias_band`, en llms.txt y en /mcp: lo
 * leía un agente y no lo podía enlazar un periodista. Esta página es la que se
 * cita y la que se comparte por WhatsApp (su tarjeta OG lleva las barras).
 *
 * No calcula nada: `cargarBanda()` lee la misma serie que el MCP y la pasa por la
 * misma `bandaSemanal()`, así que la cita es la que recibe un agente. ISR de una
 * hora: la serie se escribe martes, miércoles y viernes, y la consulta es una
 * por hora, no una por visita.
 */

export const revalidate = 3600

const PAGINA_URL = 'https://www.consignatarias.com.ar/banda'
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const pct = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

export async function generateMetadata(): Promise<Metadata> {
  const { banda } = await cargarBanda()
  const t = banda.titular
  const dato = t ? ` del ${etiquetaCategoria(t.categoria).toLowerCase()}: ${pct(t.amplitudPct)}` : ''
  return {
    title: { absolute: `Banda Consignatarias${dato} · cuánto se abre el precio de la hacienda` },
    description:
      `Cuánto se abre el precio de la misma categoría de hacienda: la distancia entre el 10 % de los lotes que menos ` +
      `cobró y el 10 % que más, en el Mercado Agroganadero, ventana de ${VR_VENTANA_DIAS} días. Dato al ${fechaCorta(banda.fecha)}. Gratis.`,
    alternates: { canonical: PAGINA_URL },
    openGraph: {
      title: `Banda Consignatarias${dato}`,
      description: 'Cuánto se abre el precio de la hacienda: P10, mediana y P90 por categoría, sobre lotes realmente operados.',
      url: PAGINA_URL,
      type: 'website',
    },
  }
}

export default async function BandaPage() {
  const { banda, serie, origen } = await cargarBanda()
  const cats = banda.categorias
  const escala = escalaRangos(cats)
  const t = banda.titular
  const lotesTotal = cats.reduce((s, c) => s + c.lotes, 0)

  return (
    <>
      <DatasetSchema
        name="Banda Consignatarias — dispersión semanal del precio de la hacienda"
        description={
          `Percentil 10, mediana y percentil 90 del precio en ARS por kilo vivo de cada categoría de hacienda y su amplitud ` +
          `((P90 − P10) / mediana), sobre los lotes operados en el Mercado Agroganadero en una ventana móvil de ${VR_VENTANA_DIAS} días. ` +
          `Indicador propio de consignatarias.com.ar.`
        }
        url={PAGINA_URL}
        keywords={['banda consignatarias', 'dispersión de precios hacienda', 'precio hacienda', 'mercado agroganadero', 'P10 P90']}
        dateModified={banda.fecha}
        variableMeasured={
          t ? { name: `Amplitud P10–P90 del ${etiquetaCategoria(t.categoria).toLowerCase()}`, unitText: '%', value: t.amplitudPct, observationDate: banda.fecha } : undefined
        }
        updateFrequency="Martes, miércoles y viernes, tras el cierre de operaciones del MAG"
        license={LICENCIA_PROPIA}
      />

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <p className="text-[11px] font-terminal uppercase tracking-[0.18em] text-zinc-500 mb-3">
          Banda Consignatarias · {VR_METODOLOGIA} · dato al {fechaCorta(banda.fecha)}
        </p>
        <h1 className="text-3xl md:text-4xl text-zinc-100 font-normal tracking-tight leading-tight mb-3">
          Banda Consignatarias
        </h1>
        <p className="text-zinc-300 text-base leading-relaxed max-w-3xl">
          Cuánto se abre el precio de la misma categoría en la semana: entre el decil que menos cobró y el que más.
        </p>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-3xl mb-5">
          Lotes realmente operados en el Mercado Agroganadero, ventana móvil de {VR_VENTANA_DIAS} días. Dato al{' '}
          <time dateTime={banda.fecha}>{fechaCorta(banda.fecha)}</time>.
        </p>

        {t && (
          <div className="inline-flex flex-wrap items-baseline gap-x-4 gap-y-1 border border-zinc-800 rounded-terminal px-4 py-3 mb-2">
            <span className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
              {etiquetaCategoria(t.categoria)}
            </span>
            <span className="font-terminal tabular-nums text-3xl text-ink">{pct(t.amplitudPct)}</span>
            {t.deltaSemanaPp != null && (
              // Sin color semántico: que el mercado se abra no es "bueno" ni "malo" (emerald y
              // rojo dirían eso); depende de qué lado del mostrador esté el que lee.
              <span className="font-terminal tabular-nums text-sm text-zinc-400">
                {t.deltaSemanaPp > 0 ? '+' : ''}
                {t.deltaSemanaPp.toLocaleString('es-AR')} pp vs. semana previa
              </span>
            )}
            {banda.lectura && (
              <span className="text-sm text-zinc-400">
                {banda.lectura === 'se_abre'
                  ? 'El mercado se está abriendo.'
                  : banda.lectura === 'se_cierra'
                    ? 'El mercado se está cerrando.'
                    : 'Estable.'}
              </span>
            )}
          </div>
        )}
      </div>

      {cats.length === 0 ? (
        <section className="px-4 pt-8 max-w-6xl mx-auto">
          <p className="text-zinc-400 text-sm">{banda.cita}</p>
        </section>
      ) : (
        <section className="px-4 pt-8 max-w-6xl mx-auto" aria-labelledby="banda-hoy">
          <h2 id="banda-hoy" className="text-zinc-200 text-lg font-medium mb-1">
            P10, mediana y P90 por categoría
          </h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-3xl">
            Cada barra va del precio del 10 % de los lotes que menos cobró (P10) al del 10 % que más cobró (P90). La
            marca es la mediana. Todas en la misma escala de pesos por kilo vivo: la barra más larga es el mercado más
            abierto.
          </p>

          <div role="img" aria-label={descripcionRangos(banda.fecha, cats)} className="border border-zinc-800 rounded-terminal p-4">
            <div className="space-y-3" aria-hidden="true">
              {cats.map((c) => {
                const a = posicionPct(c.p10, escala)
                const z = posicionPct(c.p90, escala)
                const m = posicionPct(c.mediana, escala)
                const titular = c.categoria === t?.categoria
                return (
                  <div key={c.categoria} className="grid grid-cols-[6.5rem_1fr_3.5rem] sm:grid-cols-[9rem_1fr_4rem] items-center gap-3">
                    <span className={`text-xs truncate ${titular ? 'text-ink font-medium' : 'text-zinc-300'}`}>
                      {etiquetaCategoria(c.categoria)}
                    </span>
                    <div className="relative h-6">
                      <div className="absolute inset-y-[11px] left-0 right-0 bg-zinc-800/60" />
                      <div
                        className={`absolute inset-y-1 rounded-[2px] border ${titular ? 'bg-accent/30 border-accent' : 'bg-accent/15 border-accent/50'}`}
                        style={{ left: `${a}%`, width: `${Math.max(z - a, 0.5)}%` }}
                      />
                      <div className="absolute inset-y-0 w-[2px] bg-ink" style={{ left: `calc(${m}% - 1px)` }} />
                    </div>
                    <span className="text-xs text-right font-terminal tabular-nums text-zinc-200">{pct(c.amplitudPct)}</span>
                  </div>
                )
              })}
            </div>
            {/* Eje: mismo grid que las filas, para que los ticks caigan bajo las barras. */}
            <div className="grid grid-cols-[6.5rem_1fr_3.5rem] sm:grid-cols-[9rem_1fr_4rem] gap-3 mt-2" aria-hidden="true">
              <span />
              <div className="relative h-4 border-t border-zinc-800">
                {escala.ticks.map((v, i) => (
                  <span
                    key={v}
                    className={`absolute top-1 text-[10px] font-terminal tabular-nums text-zinc-500 ${
                      i === 0 ? '' : i === escala.ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
                    } ${i % 2 === 1 && escala.ticks.length > 5 ? 'hidden sm:inline' : ''}`}
                    style={{ left: `${posicionPct(v, escala)}%` }}
                  >
                    {pesos(v)}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-right text-zinc-500">amplitud</span>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs border-collapse">
              <caption className="sr-only">
                Banda Consignatarias al {fechaCorta(banda.fecha)}: P10, mediana, P90, amplitud y lotes por categoría
              </caption>
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th scope="col" className="text-left py-2 font-normal">Categoría</th>
                  <th scope="col" className="text-right py-2 font-normal">P10</th>
                  <th scope="col" className="text-right py-2 font-normal">Mediana</th>
                  <th scope="col" className="text-right py-2 font-normal">P90</th>
                  <th scope="col" className="text-right py-2 font-normal">Amplitud</th>
                  <th scope="col" className="text-right py-2 font-normal hidden sm:table-cell">vs. semana previa</th>
                  <th scope="col" className="text-right py-2 font-normal">Lotes</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300 font-terminal">
                {cats.map((c) => (
                  <tr key={c.categoria} className="border-b border-zinc-900">
                    <th scope="row" className="py-2 text-left font-normal text-zinc-200">{etiquetaCategoria(c.categoria)}</th>
                    <td className="py-2 text-right tabular-nums">{pesos(c.p10)}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-100 font-medium">{pesos(c.mediana)}</td>
                    <td className="py-2 text-right tabular-nums">{pesos(c.p90)}</td>
                    <td className="py-2 text-right tabular-nums text-ink">{pct(c.amplitudPct)}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-500 hidden sm:table-cell">
                      {c.deltaSemanaPp == null ? '—' : `${c.deltaSemanaPp > 0 ? '+' : ''}${c.deltaSemanaPp.toLocaleString('es-AR')} pp`}
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-500">{c.lotes.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-500 text-xs mt-2 max-w-3xl">
            ARS por kilo vivo. Amplitud = (P90 − P10) / mediana. Sobre {lotesTotal.toLocaleString('es-AR')} lotes; se
            publica una categoría sólo con {MIN_LOTES_PUBLICAR} lotes o más en la ventana. Es una referencia de mercado
            observada, no una tasación.
            {banda.posicion &&
              ` El ${etiquetaCategoria(banda.titular!.categoria).toLowerCase()}, contra su propia serie (${banda.posicion.semanas} observaciones): mínimo ${pct(banda.posicion.minimo)}, promedio ${pct(banda.posicion.promedio)}, máximo ${pct(banda.posicion.maximo)}.`}
          </p>
        </section>
      )}

      {serie.length > 0 && (
        <section className="px-4 pt-10 max-w-6xl mx-auto" aria-labelledby="banda-serie">
          <h2 id="banda-serie" className="text-zinc-200 text-lg font-medium mb-1">
            ¿Se abre o se cierra?
          </h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-3xl">
            La amplitud de cada categoría en el tiempo
            {origen === 'serie' ? ', desde que arranca la serie' : `, últimos ${serie[0].puntos.length} puntos`}. Cada
            eje va del mínimo al máximo de su propia categoría.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {serie.map((s) => {
              const W = 320
              const H = 72
              const g = geometriaSerie(s, W, H)
              const a = s.puntos[0]
              const z = s.puntos[s.puntos.length - 1]
              return (
                <figure key={s.categoria} className="border border-zinc-800 rounded-terminal p-3">
                  <figcaption className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-zinc-200">{etiquetaCategoria(s.categoria)}</span>
                    <span className="text-xs font-terminal tabular-nums text-accent">{pct(z.amplitud)}</span>
                  </figcaption>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" role="img" aria-label={descripcionSerie(s)} preserveAspectRatio="none">
                    <path d={g.d} fill="none" className="stroke-accent" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                    <circle cx={g.ultimo.x} cy={g.ultimo.y} r={3} className="fill-accent" />
                  </svg>
                  <div className="flex justify-between text-[10px] font-terminal tabular-nums text-zinc-500 mt-1">
                    <span>{fechaCorta(a.date)} · {pct(a.amplitud)}</span>
                    <span>{g.min}–{g.max}%</span>
                  </div>
                </figure>
              )
            })}
          </div>
          <p className="text-zinc-500 text-xs mt-2 max-w-3xl">{banda.advertencia}</p>
        </section>
      )}

      <section className="px-4 pt-10 max-w-6xl mx-auto" aria-labelledby="banda-cita">
        <h2 id="banda-cita" className="text-zinc-200 text-lg font-medium mb-3">
          Para publicar
        </h2>
        <CitaBlock citation={banda.cita} sourceUrl={PAGINA_URL} />
        <p className="text-zinc-500 text-xs -mt-3 mb-4 max-w-2xl">
          Si reproducís este dato, incluí esa línea: la atribución es la condición de uso (
          <Link href="/licencia-datos" className="text-accent hover:underline">
            licencia de datos
          </Link>
          ).
        </p>
        <Compartir titulo="Banda Consignatarias" path="/banda" resumen={banda.cita} />
      </section>

      <section className="px-4 pt-10 pb-16 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/metodologia/vr" className="text-accent hover:underline">
            Cómo se calcula ({VR_METODOLOGIA}) →
          </Link>
          <Link href="/vr" className="text-accent hover:underline">
            Precio por categoría y peso →
          </Link>
          <Link href="/mcp" className="text-accent hover:underline">
            La misma banda por MCP →
          </Link>
        </div>
        {origen === 'archivo' && (
          <p className="text-zinc-600 text-xs mt-4">
            Dato de la banda vigente publicada; la serie completa no estuvo disponible al generar esta página.
          </p>
        )}
      </section>
    </>
  )
}
