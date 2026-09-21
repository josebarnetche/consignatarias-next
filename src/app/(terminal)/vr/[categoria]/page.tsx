import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DatasetSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { PriceSparkline } from '@/components/PriceSparkline'
import {
  SLUGS_CONOCIDOS,
  getSlugsConBanda,
  getTendenciaPorSlug,
  getMovimiento,
  getBandaPorSlug,
  getOrigenPorSlug,
  getRangosPesoPorSlug,
  vrCobertura,
  PROVINCIA_NOMBRE,
  VR_METODOLOGIA,
  VR_VENTANA_DIAS,
  VR_VENTANA_ORIGEN_DIAS,
} from '@/lib/vr'

/**
 * Página citable por categoría: /vr/vaca, /vr/novillo…
 *
 * Es el "permalink" del VR. Deliberadamente POR CATEGORÍA y no por valuación
 * individual: una URL por consulta generaría miles de páginas thin y casi
 * duplicadas, que es justo lo que el sitemap del sitio excluye. Una URL estable
 * por categoría se indexa, se cita y se puede linkear desde una respuesta de IA.
 */
/**
 * Se generan TODOS los slugs conocidos, no solo los que hoy tienen banda.
 *
 * Con `generateStaticParams` atado a `getSlugsConBanda()`, una categoría que cae
 * bajo el mínimo (MEJ está en 128 lotes, no sobra tanto) haría que su URL —ya
 * indexada y citada por schema— pase a 404 duro de un build al otro. Un 404 en
 * una URL citada es la peor degradación posible: rompe la cita en vez de
 * declarar que falta base. Así que la página existe siempre y, sin banda,
 * muestra el estado degradado y se marca noindex hasta que vuelva el dato.
 */
export const dynamicParams = false

export async function generateStaticParams() {
  return SLUGS_CONOCIDOS.map((categoria) => ({ categoria }))
}

const fmt = (n: number) => '$' + n.toLocaleString('es-AR')

/** "2026-08-25" → "25-ago". Se parsea a mano: `new Date('2026-08-25')` es UTC
 *  y en ART se corre un día para atrás. */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtFecha = (iso: string) => {
  const [, m, d] = iso.split('-')
  const mes = MESES[Number(m) - 1]
  return mes ? `${Number(d)}-${mes}` : iso
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>
}): Promise<Metadata> {
  const { categoria } = await params
  const b = getBandaPorSlug(categoria)
  const url = `https://www.consignatarias.com.ar/vr/${categoria}`
  if (!b) {
    // Sin base: la URL sigue viva (no rompemos la cita) pero sale del índice
    // hasta que vuelva el dato.
    return {
      title: 'Valor de Referencia — sin base suficiente esta semana',
      robots: { index: false, follow: true },
      alternates: { canonical: url },
    }
  }
  const title = `A cuánto se vendió ${b.categoria.toLowerCase()}: ${fmt(b.p10)} a ${fmt(b.p90)} por kilo`
  const description =
    `Banda de precio observada para ${b.categoria.toLowerCase()} en el Mercado Agroganadero: P10 ${fmt(b.p10)}, ` +
    `mediana ${fmt(b.mediana)} y P90 ${fmt(b.p90)} por kilo vivo, sobre ${b.lotes.toLocaleString('es-AR')} operaciones ` +
    `de los últimos ${VR_VENTANA_DIAS} días. Metodología ${VR_METODOLOGIA}.`
  return {
    title,
    description,
    openGraph: { title, description, url, type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
    alternates: { canonical: url },
  }
}

export default async function VrCategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>
}) {
  const { categoria } = await params
  if (!SLUGS_CONOCIDOS.includes(categoria)) notFound()
  const b = getBandaPorSlug(categoria)
  const cob = vrCobertura()

  if (!b) {
    // Degradar, no negar: misma doctrina que el resto del VR.
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/mercado" className="hover:text-sky-400">Mercado</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">Valor de Referencia</span>
        </nav>
        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Sin base suficiente para publicar una banda
        </h1>
        <p className="text-zinc-400 mb-4">
          Esta categoría no reunió operaciones suficientes en los últimos {VR_VENTANA_DIAS} días
          como para publicar un rango que el dato sostenga. Preferimos decirlo antes que
          mostrar un número inventado — es la misma regla que gobierna toda la metodología.
        </p>
        <p className="text-zinc-400 mb-6">
          Categorías con banda vigente al {cob.hasta}:{' '}
          {getSlugsConBanda().map((s, i, arr) => (
            <span key={s}>
              <Link href={`/vr/${s}`} className="text-sky-400 hover:underline">{s}</Link>
              {i < arr.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
        <p className="text-zinc-500 text-xs">
          <Link href="/metodologia/vr" className="text-sky-400 hover:underline">
            Cómo se calcula ({VR_METODOLOGIA}) y cuándo no se publica
          </Link>
        </p>
      </div>
    )
  }

  const origen = getOrigenPorSlug(categoria)
  const rangosPeso = getRangosPesoPorSlug(categoria)
  const tendencia = getTendenciaPorSlug(categoria)
  const mov = getMovimiento(categoria)
  const url = `https://www.consignatarias.com.ar/vr/${categoria}`
  const nombre = b.categoria.toLowerCase()

  const faqs = [
    {
      question: `¿A cuánto se está vendiendo ${nombre}?`,
      answer:
        `En el Mercado Agroganadero, ${nombre} se vendió entre ${fmt(b.p10)} y ${fmt(b.p90)} por kilo vivo en los últimos ` +
        `${VR_VENTANA_DIAS} días, con mediana de ${fmt(b.mediana)}. La banda surge de ${b.lotes.toLocaleString('es-AR')} operaciones ` +
        `de lote que suman ${b.cabezas.toLocaleString('es-AR')} cabezas, al ${cob.hasta}. La amplitud entre el P10 y el P90 ` +
        `es de ${b.amplitud_pct}%, así que un precio único sería engañoso.`,
    },
    {
      question: `¿Por qué hay tanta diferencia de precio en ${nombre}?`,
      answer:
        `Porque el precio depende del peso, la calidad y la composición del lote, no solo de la categoría. En ${nombre} la diferencia ` +
        `entre el percentil 10 y el 90 es de ${b.amplitud_pct}%. El peso explica una parte grande: por eso publicamos también la ` +
        `banda por rango de peso. El origen del remitente influye mucho menos: los ajustes por provincia medidos sobre nuestra base ` +
        `se mueven en pocos puntos porcentuales.`,
    },
    {
      question: `¿De dónde sale este precio de ${nombre}?`,
      answer:
        `De las planillas de lote del Mercado Agroganadero de Cañuelas (haciinfo000007), donde cada fila es una pesada real: ` +
        `remitente, consignataria, categoría, cabezas, kilos y precio. Es dato de operación observada, no una encuesta. ` +
        `La metodología completa está publicada en consignatarias.com.ar/metodologia/vr.`,
    },
  ]

  return (
    <>
      <DatasetSchema
        name={`Valor de Referencia — ${b.categoria} (banda de precio observado)`}
        description={
          `Percentil 10 (${fmt(b.p10)}), mediana (${fmt(b.mediana)}) y percentil 90 (${fmt(b.p90)}) del precio en ARS por kilo ` +
          `vivo de ${nombre}, observados en ${b.lotes.toLocaleString('es-AR')} operaciones de lote del Mercado Agroganadero ` +
          `en una ventana de ${VR_VENTANA_DIAS} días.`
        }
        url={url}
        keywords={[`precio ${nombre}`, `${nombre} precio kilo vivo`, 'mercado agroganadero', 'hacienda en pie', 'ganadería argentina']}
        dateModified={cob.hasta}
        temporalCoverage={`${cob.desde}/${cob.hasta}`}
        variableMeasured={{
          name: `Precio de ${nombre} — mediana observada`,
          unitText: 'ARS/kg vivo',
          value: b.mediana,
          observationDate: cob.hasta,
        }}
        updateFrequency="Martes, miércoles y viernes, tras el cierre de operaciones del MAG"
      />
      <FAQPageSchema items={faqs} />
      <SpeakableSchema url={url} headline={`A cuánto se vendió ${nombre} en el Mercado Agroganadero`} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/vr" className="hover:text-sky-400">Valor de Referencia</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-400">{b.categoria}</span>
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-1">
          A cuánto se vendió {nombre}
        </h1>
        <p className="text-zinc-500 text-xs mb-6">
          Banda observada en el Mercado Agroganadero · ventana de {VR_VENTANA_DIAS} días al {cob.hasta} · {VR_METODOLOGIA}
        </p>

        {/* La banda, que es el número */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="border border-zinc-800 rounded p-4 text-center">
            <div className="text-zinc-500 text-xs mb-1">P10 · el 10 % más barato</div>
            <div className="text-zinc-300 text-xl tabular-nums">{fmt(b.p10)}</div>
          </div>
          <div className="border border-sky-900 rounded p-4 text-center">
            <div className="text-zinc-500 text-xs mb-1">Mediana</div>
            <div className="text-zinc-100 text-xl tabular-nums font-medium">{fmt(b.mediana)}</div>
          </div>
          <div className="border border-zinc-800 rounded p-4 text-center">
            <div className="text-zinc-500 text-xs mb-1">P90 · el 10 % más caro</div>
            <div className="text-zinc-300 text-xl tabular-nums">{fmt(b.p90)}</div>
          </div>
        </div>
        <p className="text-zinc-400 mb-8">
          Pesos por kilo vivo. La amplitud entre P10 y P90 es de{' '}
          <span className="text-amber-400">{b.amplitud_pct}%</span>, sobre{' '}
          <span className="text-zinc-200">{b.lotes.toLocaleString('es-AR')} operaciones</span> que suman{' '}
          <span className="text-zinc-200">{b.cabezas.toLocaleString('es-AR')} cabezas</span>.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Por qué es una banda y no un precio</h2>
        <p className="text-zinc-400 mb-8">
          Un precio único de {nombre} sugiere una precisión que el mercado no tiene. Dos lotes de la misma
          categoría, el mismo día y en el mismo mercado pueden diferir un {b.amplitud_pct}% según calidad,
          terminación y composición. Publicar la banda —y la cantidad de operaciones que la sostiene— es la
          única forma honesta de responder &ldquo;¿cuánto vale?&rdquo;. Si vas a vender, el número que te
          importa es dónde cae <em>tu</em> lote dentro de este rango.
        </p>

        {rangosPeso.length > 0 && (
          <>
            <h2 className="text-zinc-100 text-lg font-medium mb-2">Según el peso</h2>
            <p className="text-zinc-400 mb-3">
              Dentro de la misma categoría, el peso mueve el precio por kilo. Esta es la banda de {nombre} por rango
              de peso promedio del lote, sobre la misma ventana de {VR_VENTANA_DIAS} días. Se publica un rango sólo
              si tiene al menos 30 lotes.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 font-normal">Peso por cabeza</th>
                    <th className="text-right py-2 font-normal">P10</th>
                    <th className="text-right py-2 font-normal">Mediana</th>
                    <th className="text-right py-2 font-normal">P90</th>
                    <th className="text-right py-2 font-normal">Lotes</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {rangosPeso.map((r) => (
                    <tr key={r.desde_kg} className="border-b border-zinc-900">
                      <td className="py-2 text-zinc-200">{r.desde_kg}–{r.hasta_kg} kg</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.p10)}</td>
                      <td className="py-2 text-right tabular-nums text-zinc-100 font-medium">{fmt(r.mediana)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.p90)}</td>
                      <td className="py-2 text-right tabular-nums text-zinc-500">{r.lotes.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-zinc-500 text-xs mb-8">
              ¿Tenés {nombre}?{' '}
              <Link href="/mi-ganado" className="text-sky-400 hover:underline">Cargá tu rodeo en Mi Ganado</Link>{' '}
              y lo valuamos contra el rango de su peso, gratis.
            </p>
          </>
        )}

        {tendencia.length >= 2 && mov && (
          <>
            <h2 className="text-zinc-100 text-lg font-medium mb-2">Cómo se viene moviendo la dispersión</h2>
            <p className="text-zinc-400 mb-3">
              {mov.direccion === 'abriendo' && (
                <>
                  La dispersión <span className="text-amber-400">se está abriendo</span>: la amplitud pasó de{' '}
                  {mov.amplitudInicial}% a {mov.amplitudFinal}% ({mov.deltaPuntos > 0 ? '+' : ''}
                  {mov.deltaPuntos} puntos) entre el {fmtFecha(mov.desde)} y el {fmtFecha(mov.hasta)}. Dos lotes de {nombre} se
                  parecen menos entre sí que hace unas semanas.
                </>
              )}
              {mov.direccion === 'cerrando' && (
                <>
                  La dispersión <span className="text-emerald-400">se está cerrando</span>: la amplitud pasó de{' '}
                  {mov.amplitudInicial}% a {mov.amplitudFinal}% ({mov.deltaPuntos} puntos) entre el {fmtFecha(mov.desde)} y
                  el {fmtFecha(mov.hasta)}. El mercado de {nombre} está más parejo que hace unas semanas.
                </>
              )}
              {mov.direccion === 'estable' && (
                <>
                  La dispersión está <span className="text-zinc-200">estable</span>: la amplitud se movió menos de
                  un punto ({mov.amplitudInicial}% → {mov.amplitudFinal}%) entre el {fmtFecha(mov.desde)} y el {fmtFecha(mov.hasta)}.
                </>
              )}
            </p>
            <div className="border border-zinc-800 rounded p-3 mb-3">
              <div className="text-zinc-500 text-xs mb-2">Amplitud P10–P90, últimos {tendencia.length} puntos</div>
              <PriceSparkline
                data={tendencia.map((t) => ({ date: t.date, value: t.amplitud }))}
                width={640}
                height={110}
              />
            </div>
            <p className="text-zinc-500 text-xs mb-8">
              Cada punto es una ventana móvil de {VR_VENTANA_DIAS} días, así que dos puntos consecutivos
              comparten la mayor parte de sus lotes: la curva es suave por construcción y no hay que leerla
              como observaciones independientes. La serie completa, por categoría y rango, está en la{' '}
              <Link href="/api-docs" className="text-sky-400 hover:underline">API</Link>.
            </p>
          </>
        )}

        {origen.length > 0 && (
          <>
            <h2 className="text-zinc-100 text-lg font-medium mb-2">Según la provincia de origen</h2>
            <p className="text-zinc-400 mb-3">
              No existe una serie oficial de precios por provincia. Esto es lo que se mide en nuestra propia
              base: cuánto se desvía la mediana de cada origen respecto de la nacional, sobre{' '}
              {VR_VENTANA_ORIGEN_DIAS} días y solo donde hay suficientes operaciones.
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 font-normal">Origen</th>
                    <th className="text-right py-2 font-normal">Mediana ajustada</th>
                    <th className="text-right py-2 font-normal">vs. nacional</th>
                    <th className="text-right py-2 font-normal">Lotes</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {origen.map((o) => {
                    const delta = (o.factor - 1) * 100
                    return (
                      <tr key={o.provincia} className="border-b border-zinc-900">
                        <td className="py-2 text-zinc-200">{PROVINCIA_NOMBRE[o.provincia] ?? o.provincia}</td>
                        <td className="py-2 text-right tabular-nums">{fmt(Math.round(b.mediana * o.factor))}</td>
                        <td className={`py-2 text-right tabular-nums ${delta > 0.5 ? 'text-emerald-400' : delta < -0.5 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right tabular-nums text-zinc-500">{o.lotes.toLocaleString('es-AR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-zinc-500 text-xs mb-8">
              El efecto del origen es real pero chico comparado con la amplitud de la banda ({b.amplitud_pct}%):
              en este mercado la varianza grande es de calidad de lote, no geográfica.
            </p>
          </>
        )}

        <div className="border-t border-zinc-800 pt-6 mt-10 text-xs text-zinc-500">
          <p className="mb-2">
            Es una referencia de mercado observada, no una tasación: el precio final lo define el remate.{' '}
            <Link href="/metodologia/vr" className="text-sky-400 hover:underline">Cómo se calcula ({VR_METODOLOGIA})</Link>
          </p>
          <p className="mb-2">
            Otras categorías:{' '}
            {getSlugsConBanda()
              .filter((s) => s !== categoria)
              .map((s, i, arr) => (
                <span key={s}>
                  <Link href={`/vr/${s}`} className="text-sky-400 hover:underline">{s}</Link>
                  {i < arr.length - 1 ? ' · ' : ''}
                </span>
              ))}
          </p>
          <p>
            ¿Querés venderla? <Link href="/consignatarias" className="text-sky-400 hover:underline">Consignatarias por provincia</Link>
          </p>
        </div>
      </div>
    </>
  )
}
