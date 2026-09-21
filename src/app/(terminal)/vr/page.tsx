import { Metadata } from 'next'
import Link from 'next/link'
import VrBandas from '@/components/VrBandas'
import { DatasetSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import {
  getBandasPublicas,
  getSlugsConBanda,
  getRangosPesoPorSlug,
  vrCobertura,
  VR_METODOLOGIA,
  VR_VENTANA_DIAS,
} from '@/lib/vr'

/**
 * /vr — el hub del producto.
 *
 * Qué es consignatarias.com.ar en una frase: cuánto vale tu hacienda hoy, medido en lo
 * que realmente se vendió. Esta página es esa frase con los números abajo: la banda de
 * cada categoría, la banda por peso, el camino al rodeo propio (Mi Ganado, gratis) y el
 * camino al uso institucional (API, pago). Ver docs/strategy/DECISION-PRODUCTO-2026-09-21.md.
 *
 * Todo sale de `vr-bandas.json` (SSG, sin queries). Si una categoría no tiene base, no
 * aparece: la regla de degradación gobierna también qué se publica.
 */

const cob = vrCobertura()
const fmt = (n: number) => n.toLocaleString('es-AR')

export const metadata: Metadata = {
  title: 'Valor de Referencia de la hacienda — lo que realmente se pagó, por categoría y peso',
  description:
    `El rango de precio al que se vendió cada categoría de hacienda en el Mercado Agroganadero en los últimos ${VR_VENTANA_DIAS} días, ` +
    `por categoría y por peso, con los ${fmt(cob.lotes)} lotes que lo sostienen. Metodología ${VR_METODOLOGIA} publicada. Gratis.`,
  alternates: { canonical: 'https://www.consignatarias.com.ar/vr' },
}

const FAQS = [
  {
    question: '¿Qué es el Valor de Referencia?',
    answer:
      `El rango de precio al que realmente se vendió cada categoría de hacienda en el Mercado Agroganadero: el precio del ` +
      `10 % más barato de los lotes (P10), la mediana y el del 10 % más caro (P90), sobre los últimos ${VR_VENTANA_DIAS} días, ` +
      `con la cantidad de lotes que lo sostienen. Se publica también por rango de peso de 50 kg.`,
  },
  {
    question: '¿En qué se diferencia del INMAG?',
    answer:
      'El INMAG es el índice oficial del Mercado Agroganadero: un número por día, que lo publica el propio MAG. El Valor de ' +
      'Referencia lo calculamos nosotros sobre cada lote vendido y responde otra pregunta: no cuánto promedió el mercado, sino ' +
      'entre qué precios se vendieron lotes como el tuyo. Son complementarios.',
  },
  {
    question: '¿Por qué no hay Valor de Referencia de terneros?',
    answer:
      'Porque el Mercado Agroganadero no opera terneros: es hacienda de invernada, que se vende en ferias y remates de campo. ' +
      'No tenemos una base de lotes observados con la que medirla, y preferimos no publicar un número inventado.',
  },
  {
    question: '¿Es una tasación?',
    answer:
      'No. Es una referencia de mercado observada, con su metodología publicada. El precio final de un lote lo define el remate ' +
      'o la negociación, según calidad, sanidad, flete y condiciones de pago.',
  },
]

export default function VrHubPage() {
  const bandas = getBandasPublicas()
  const slugs = new Set(getSlugsConBanda())
  const conPeso = bandas
    .map((b) => ({ b, rangos: getRangosPesoPorSlug(b.codigo.toLowerCase()) }))
    .filter((x) => x.rangos.length > 0 && slugs.has(x.b.codigo.toLowerCase()))

  return (
    <>
      <DatasetSchema
        name="Valor de Referencia de la hacienda argentina — bandas de precio observado"
        description={
          `Percentil 10, mediana y percentil 90 del precio en ARS por kilo vivo de cada categoría de hacienda, por categoría y ` +
          `por rango de peso, observados en ${fmt(cob.lotes)} lotes del Mercado Agroganadero entre el ${cob.desde} y el ${cob.hasta}.`
        }
        url="https://www.consignatarias.com.ar/vr"
        keywords={['precio hacienda', 'valor de la hacienda', 'precio por kilo vivo', 'mercado agroganadero', 'valuación de rodeo']}
        dateModified={cob.hasta}
        temporalCoverage={`${cob.desde}/${cob.hasta}`}
        updateFrequency="Martes, miércoles y viernes, tras el cierre de operaciones del MAG"
      />
      <FAQPageSchema items={FAQS} />

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <p className="text-[11px] font-terminal uppercase tracking-[0.18em] text-zinc-500 mb-3">
          Valor de Referencia · {VR_METODOLOGIA} · lotes del {cob.desde} al {cob.hasta}
        </p>
        <h1 className="text-3xl md:text-4xl text-zinc-100 font-normal tracking-tight leading-tight mb-4 max-w-3xl">
          Cuánto vale tu hacienda hoy, <span className="text-accent">medido en lo que realmente se vendió.</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed max-w-3xl mb-6">
          El precio de referencia es un punto; el mercado es un rango. Acá está el rango: a cuánto se vendió cada
          categoría en el Mercado Agroganadero en los últimos {VR_VENTANA_DIAS} días, con los{' '}
          {fmt(cob.lotes)} lotes que lo sostienen. Gratis y sin registro.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <Link
            href="/mi-ganado"
            className="inline-flex items-center justify-center text-sm font-medium text-zinc-950 bg-accent hover:bg-sky-300 transition-colors rounded py-3 px-6"
          >
            Valuar mi rodeo gratis →
          </Link>
          <Link
            href="/metodologia/vr"
            className="inline-flex items-center justify-center text-sm font-medium text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-colors rounded py-3 px-6"
          >
            Cómo se calcula
          </Link>
        </div>
      </div>

      <VrBandas />

      {conPeso.length > 0 && (
        <section className="px-4 pt-8 max-w-6xl mx-auto">
          <h2 className="text-zinc-200 text-lg font-medium mb-1">El peso cambia el precio por kilo</h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-3xl">
            Mediana por rango de peso promedio del lote, sobre la misma ventana. Se publica un rango sólo con 30 lotes o
            más. Es la banda que usa Mi Ganado para valuar tu rodeo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conPeso.map(({ b, rangos }) => (
              <div key={b.codigo} className="border border-zinc-800 rounded p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <Link href={`/vr/${b.codigo.toLowerCase()}`} className="text-zinc-100 text-sm font-medium hover:text-sky-400">
                    {b.categoria}
                  </Link>
                  <span className="text-[11px] text-zinc-500">$/kg · mediana</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {rangos.map((r) => (
                      <tr key={r.desde_kg} className="border-t border-zinc-900">
                        <td className="py-1 text-zinc-400">{r.desde_kg}–{r.hasta_kg} kg</td>
                        <td className="py-1 text-right tabular-nums text-zinc-100">${fmt(r.mediana)}</td>
                        <td className="py-1 text-right tabular-nums text-zinc-600">{fmt(r.lotes)} lotes</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 pt-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-sky-500/30 bg-sky-500/[0.04] rounded p-5">
          <div className="text-[11px] font-terminal uppercase tracking-[0.18em] text-sky-300 mb-2">Productor · gratis</div>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">Tu rodeo, valuado contra esto</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            Cargás categoría, cabezas y peso una vez. Ves cuánto vale tu rodeo con su rango, qué lotes lo sostienen,
            cómo se movió en el tiempo, y te llega cada lunes por mail si querés.
          </p>
          <Link href="/mi-ganado" className="text-sm text-accent hover:text-accent-bright">Ir a Mi Ganado →</Link>
        </div>
        <div className="border border-zinc-800 rounded p-5">
          <div className="text-[11px] font-terminal uppercase tracking-[0.18em] text-zinc-500 mb-2">Empresas · pago</div>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">El dato dentro de tu sistema</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            Bancos, aseguradoras, agtech y frigoríficos que valúan hacienda: la banda por API y MCP, la serie
            histórica de dispersión y el INMAG desde 2015, con metodología versionada para citar.
          </p>
          <Link href="/enterprise" className="text-sm text-accent hover:text-accent-bright">Planes para empresas →</Link>
        </div>
      </section>

      <section className="px-4 pt-10 pb-16 max-w-3xl mx-auto">
        <h2 className="text-zinc-200 text-lg font-medium mb-4">Preguntas</h2>
        <div className="space-y-5">
          {FAQS.map((f) => (
            <div key={f.question}>
              <h3 className="text-zinc-100 text-sm font-medium mb-1">{f.question}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
