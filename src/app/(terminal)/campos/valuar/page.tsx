import { Metadata } from 'next'
import Link from 'next/link'
import ValuacionCampo from '@/components/campos/ValuacionCampo'
import { TIERRA, TIERRA_PROVINCIAS } from '@/lib/valuacion-campos'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'

export const revalidate = 3600

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: '¿Cuánto vale mi campo? — tasador de campos en dólares',
  description:
    'Calculá cuánto vale tu campo en dólares por hectárea. Cruza lo que renta de arrendamiento con los precios relevados en tu provincia, y te muestra dónde cae tu campo dentro del rango real de la zona.',
  keywords: [
    'cuanto vale mi campo',
    'tasar campo',
    'valor de la hectarea',
    'precio hectarea campo argentina',
    'tasacion de campos',
    'valor campo ganadero',
    'cuanto vale una hectarea',
  ],
  openGraph: {
    title: '¿Cuánto vale mi campo?',
    description: 'Tasador de campos: lo que renta cruzado con lo que se paga en tu provincia.',
    url: `${BASE_URL}/campos/valuar`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/campos/valuar` },
}

const FAQ = [
  {
    question: '¿Cuánto vale una hectárea de campo en Argentina?',
    answer:
      'Depende muchísimo de la zona, y mucho más de lo que la gente supone. Dentro de la misma provincia de Buenos Aires, la hectárea de la zona núcleo ronda los US$18.500 y la de la cuenca del Salado, que es campo de cría, unos US$3.200: casi seis veces menos. En el NEA se mueve entre US$850 y US$1.900, en el semiárido pampeano unos US$780, y en la estepa patagónica baja a US$90. En campo ganadero lo que explica la diferencia es cuánto pasto produce; en campo agrícola, cuántos quintales.',
  },
  {
    question: '¿Cómo se calcula el valor de un campo?',
    answer:
      'Hay dos caminos y conviene mirar los dos. Uno es por lo que renta: un campo vale, a grandes rasgos, unos veinte años de su arrendamiento, y como el canon se pacta en kilos de novillo ya viene ajustado por la calidad del campo. El otro es por comparables: qué se pagó por campos parecidos en la misma zona. Cuando los dos números dan parecido, la estimación es firme; cuando se separan mucho, hay algo que mirar.',
  },
  {
    question: '¿Por qué el arrendamiento se mide en kilos de novillo?',
    answer:
      'Porque es la moneda que no se devalúa dentro del negocio. El canon se pacta en kilos de novillo por hectárea por mes y se liquida con el promedio del mes anterior, así el arrendador cobra siempre lo mismo en términos de hacienda, sin importar la inflación ni el tipo de cambio.',
  },
]

const ZONAS = TIERRA.filter((t) => !!t.zona).sort(
  (a, b) => a.provincia.localeCompare(b.provincia, 'es') || b.usd_ha - a.usd_ha,
)

export default function ValuarCampoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">
          ← Campos
        </Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">¿Cuánto vale tu campo?</h1>
        <p className="text-zinc-300 text-base mb-6">
          Poné la provincia, la superficie y lo que se paga de arrendamiento por hectárea. Cruzamos lo que
          el campo <strong className="text-zinc-100">renta</strong> con lo que se{' '}
          <strong className="text-zinc-100">paga</strong> en tu zona, y te mostramos dónde cae dentro del
          rango real de la provincia.
        </p>

        <div className="mb-8">
          <ValuacionCampo />
        </div>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Lo que vale la hectárea, por zona</h2>
          <p className="text-zinc-400 mb-4">
            Valores de referencia para campo ganadero, provincia por provincia. La última columna es la que
            explica todo: cuántos dólares se pagan por cada kilo de novillo que el campo produce al año.
            Abajo está el detalle por zona, que es donde de verdad se define el precio.
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse min-w-[520px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-normal py-2 pr-3">Provincia</th>
                  <th className="text-left font-normal py-2 pr-3">Región</th>
                  <th className="text-right font-normal py-2 pr-3">US$/ha</th>
                  <th className="text-right font-normal py-2 pr-3">Rango</th>
                  <th className="text-right font-normal py-2 pr-3">kg/ha/año</th>
                  <th className="text-right font-normal py-2">US$/kg</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {TIERRA_PROVINCIAS.map((t) => (
                  <tr key={t.provincia} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-200 font-sans">{t.provincia}</td>
                    <td className="py-2 pr-3 text-zinc-500 font-sans">{t.region}</td>
                    <td className="py-2 pr-3 text-right text-accent tabular-nums">
                      {t.usd_ha.toLocaleString('es-AR')}
                    </td>
                    <td className="py-2 pr-3 text-right text-zinc-500 tabular-nums">
                      {t.p25.toLocaleString('es-AR')}–{t.p75.toLocaleString('es-AR')}
                    </td>
                    <td className="py-2 pr-3 text-right text-zinc-300 tabular-nums">{t.kg_ha_ano}</td>
                    <td className="py-2 text-right text-zinc-300 tabular-nums">{t.usd_por_kg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El detalle por zona</h2>
          <p className="text-zinc-400 mb-4">
            El promedio de una provincia dice poco: entre la zona núcleo bonaerense y la cuenca del Salado
            hay casi seis veces de diferencia, y entre Marcos Juárez y Minas, en Córdoba, cuarenta. Estas son
            las zonas relevadas, con la fuente y la fecha de cada una.
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse min-w-[560px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-normal py-2 pr-3">Zona</th>
                  <th className="text-left font-normal py-2 pr-3">Provincia</th>
                  <th className="text-left font-normal py-2 pr-3">Aptitud</th>
                  <th className="text-right font-normal py-2 pr-3">US$/ha</th>
                  <th className="text-left font-normal py-2 pl-3">Fuente</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {ZONAS.map((t) => (
                  <tr key={`${t.provincia}-${t.zona}`} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-200 font-sans">{t.zona}</td>
                    <td className="py-2 pr-3 text-zinc-500 font-sans">{t.provincia}</td>
                    <td className="py-2 pr-3 text-zinc-500 font-sans">{t.aptitud}</td>
                    <td className="py-2 pr-3 text-right text-accent tabular-nums">
                      {t.usd_ha.toLocaleString('es-AR')}
                    </td>
                    <td className="py-2 pl-3 text-zinc-600 font-sans text-xxs">
                      {t.fuente}
                      {t.fecha ? ` · ${t.fecha}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-zinc-600 text-xxs mt-3 leading-relaxed">
            Los valores de tasadores son de operación; los que salen de avisos son precio pedido y se ajustan
            antes de usarlos. Faltan provincias enteras y se van sumando a medida que aparece dato serio: es
            preferible no tener una zona a tenerla mal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
          <dl className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.question} className="border-l-2 border-zinc-700 pl-4">
                <dt className="text-accent font-medium text-base mb-1">{f.question}</dt>
                <dd className="text-zinc-400">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-200 font-medium mb-1">¿Lo querés arrendar o vender?</p>
          <p className="text-zinc-400 mb-3">
            Publicalo gratis. Hay productores buscando campo en el sitio todas las semanas, y tu contacto no
            se publica: las consultas te las pasamos nosotros.
          </p>
          <Link
            href="/campos/publicar"
            className="inline-block px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
          >
            Publicar mi campo
          </Link>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/campos" className="text-zinc-500 hover:text-accent transition-colors">
            Campos publicados →
          </Link>
          <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Índice de arrendamiento
          </Link>
          <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo se calcula el canon
          </Link>
        </div>
      </div>
    </>
  )
}
