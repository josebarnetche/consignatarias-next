import { Metadata } from 'next'
import Link from 'next/link'
import ValuacionCampo from '@/components/campos/ValuacionCampo'
import CapturaCampoForm from '@/components/campos/CapturaCampoForm'
import { TIERRA, TIERRA_PROVINCIAS } from '@/lib/valuacion-campos'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema, SpeakableSchema } from '@/components/seo/JsonLd'

export const revalidate = 3600

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/campos/valuar`

const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')

// ── El número nacional, calculado del relevamiento (no escrito a mano) ────────
// "cuanto vale una hectarea en argentina" (GSC 09-2026: 74 impr, pos 7,0, 0 clics, más
// ~250 impresiones en variantes) no tenía respuesta directa: esta página la cubría con el
// título del tasador ("¿Cuánto vale mi campo?", una búsqueda que no existe en GSC) y el
// dato quedaba en la tabla, sin encabezado. Se responde arriba con el rango real que sale
// de tierra-por-kilo.json, para que cambie solo cuando cambie el relevamiento.
const PROV_ORDENADAS = [...TIERRA_PROVINCIAS].sort((a, b) => b.usd_ha - a.usd_ha)
const provMasCara = PROV_ORDENADAS[0]
const provMasBarata = PROV_ORDENADAS[PROV_ORDENADAS.length - 1]
const ZONAS_ORDENADAS = TIERRA.filter((t) => !!t.zona).sort((a, b) => b.usd_ha - a.usd_ha)
const zonaMasCara = ZONAS_ORDENADAS[0]
const zonaMasBarata = ZONAS_ORDENADAS[ZONAS_ORDENADAS.length - 1]
const FECHAS = TIERRA.map((t) => t.fecha).filter((f): f is string => !!f).sort()
const fechaRelevamiento = FECHAS[FECHAS.length - 1]

export const metadata: Metadata = {
  title: `¿Cuánto vale una hectárea en Argentina? ${fmtUsd(provMasBarata.usd_ha)}–${fmtUsd(provMasCara.usd_ha)} por provincia`,
  description: `Valor de la hectárea de campo en Argentina: de ${fmtUsd(provMasBarata.usd_ha)} (${provMasBarata.provincia}) a ${fmtUsd(provMasCara.usd_ha)} (${provMasCara.provincia}) de referencia provincial, y hasta ${fmtUsd(zonaMasCara.usd_ha)} en ${zonaMasCara.zona}. Tabla por provincia y por zona con fuente y fecha, y un tasador que cruza lo que el campo renta con lo que se paga.`,
  keywords: [
    'cuanto vale una hectarea en argentina',
    'cuanto vale una hectarea',
    'cuanto vale una hectarea de campo',
    'valor de la hectarea',
    'precio hectarea campo argentina',
    'precio de una hectarea en argentina',
    'cuanto vale mi campo',
    'tasar campo',
    'tasacion de campos',
    'valor campo ganadero',
    'tasador de campos',
  ],
  openGraph: {
    title: `¿Cuánto vale una hectárea en Argentina? De ${fmtUsd(provMasBarata.usd_ha)} a ${fmtUsd(provMasCara.usd_ha)} por provincia`,
    description: 'Valor de la hectárea por provincia y por zona, con fuente y fecha, y el tasador de campos.',
    url: PAGE_URL,
    type: 'website',
  },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Cuánto vale una hectárea de campo en Argentina?',
    answer: `Depende de la provincia y, mucho más, de la zona. Entre las ${TIERRA_PROVINCIAS.length} provincias relevadas, el valor de referencia va de ${fmtUsd(provMasBarata.usd_ha)} por hectárea en ${provMasBarata.provincia} a ${fmtUsd(provMasCara.usd_ha)} en ${provMasCara.provincia}. Dentro de una misma provincia la diferencia es todavía mayor: la zona más cara relevada, ${zonaMasCara.zona} (${zonaMasCara.provincia}), vale ${fmtUsd(zonaMasCara.usd_ha)} y la más barata, ${zonaMasBarata.zona} (${zonaMasBarata.provincia}), ${fmtUsd(zonaMasBarata.usd_ha)}. En campo ganadero lo que explica la diferencia es cuánto pasto produce; en campo agrícola, cuántos quintales.`,
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

const APTITUD: Record<string, string> = {
  ganadera: 'Ganadera',
  mixta: 'Mixta',
  agricola: 'Agrícola',
  forestal: 'Forestal',
}

const ZONAS = TIERRA.filter((t) => !!t.zona).sort(
  (a, b) => a.provincia.localeCompare(b.provincia, 'es') || b.usd_ha - a.usd_ha,
)

export default function ValuarCampoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />
      <DatasetSchema
        name="Valor de la hectárea de campo en Argentina, por provincia y por zona"
        description={`Relevamiento propio del valor de la hectárea de campo en ${TIERRA_PROVINCIAS.length} provincias y ${ZONAS_ORDENADAS.length} zonas de Argentina: valor de referencia, rango p25-p75, aptitud, canon de arrendamiento en kg de novillo, fuente y fecha de cada dato. De ${fmtUsd(provMasBarata.usd_ha)} (${provMasBarata.provincia}) a ${fmtUsd(provMasCara.usd_ha)} (${provMasCara.provincia}) por provincia.`}
        url={PAGE_URL}
        keywords={['valor hectarea argentina', 'precio de la tierra', 'cuanto vale una hectarea', 'campos', 'tasación de campos']}
        dateModified={fechaRelevamiento}
        updateFrequency="monthly"
        variableMeasured={{
          name: 'Valor de referencia de la hectárea de campo (provincia más cara relevada)',
          value: provMasCara.usd_ha,
          unitText: 'USD/ha',
        }}
      />
      <SpeakableSchema url={PAGE_URL} headline="¿Cuánto vale una hectárea de campo en Argentina?" />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">
          ← Campos
        </Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">¿Cuánto vale una hectárea de campo en Argentina?</h1>
        {/* Respuesta directa arriba de todo, con el rango real del relevamiento. */}
        <p className="speakable-content text-zinc-300 text-base mb-4">
          Una hectárea de campo en Argentina vale de{' '}
          <strong className="text-zinc-100">{fmtUsd(provMasBarata.usd_ha)}</strong> ({provMasBarata.provincia}) a{' '}
          <strong className="text-zinc-100">{fmtUsd(provMasCara.usd_ha)}</strong> ({provMasCara.provincia}) de
          referencia provincial, y dentro de cada provincia la zona manda: {zonaMasCara.zona} ({zonaMasCara.provincia})
          está en {fmtUsd(zonaMasCara.usd_ha)} y {zonaMasBarata.zona} ({zonaMasBarata.provincia}) en{' '}
          {fmtUsd(zonaMasBarata.usd_ha)}. Abajo, la tabla de las {TIERRA_PROVINCIAS.length} provincias y las{' '}
          {ZONAS_ORDENADAS.length} zonas relevadas, con la fuente y la fecha de cada dato.
        </p>
        <p className="text-zinc-400 text-base mb-6">
          Para tasar un campo concreto: poné la provincia, la superficie y lo que se paga de arrendamiento por
          hectárea. Cruzamos lo que el campo <strong className="text-zinc-200">renta</strong> con lo que se{' '}
          <strong className="text-zinc-200">paga</strong> en tu zona, y te mostramos dónde cae dentro del rango
          real de la provincia.
        </p>

        <div className="mb-8">
          <ValuacionCampo />
        </div>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Cuánto vale la hectárea, provincia por provincia</h2>
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
                    <td className="py-2 pr-3 text-zinc-500 font-sans">
                      {t.aptitud ? (APTITUD[t.aptitud] ?? t.aptitud) : '—'}
                    </td>
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

        <section className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-100 text-base font-medium mb-1">
            ¿Querés que lo miremos con vos?
          </p>
          <p className="text-zinc-400 mb-4">
            La calculadora da una referencia de mercado. Si nos dejás los datos, te pasamos la valuación
            con el detalle de tu zona y lo que estamos viendo de precios y de canon. Sin costo — y tus
            datos no se publican ni se los damos a nadie.
          </p>
          <CapturaCampoForm tipo="tengo" origen="tasador" compacto />
          <p className="text-zinc-600 text-xs mt-4 pt-3 border-t border-accent/20">
            Si ya querés ofrecerlo,{' '}
            <Link href="/campos/publicar" className="text-accent hover:underline">
              publicalo gratis
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Por provincia</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {TIERRA_PROVINCIAS.map((t) => (
              <Link
                key={t.provincia}
                href={`/campos/valor-hectarea/${t.provincia
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '-')}`}
                className="text-zinc-400 hover:text-accent transition-colors"
              >
                ¿Cuánto vale la hectárea en {t.provincia}?
              </Link>
            ))}
          </div>
        </section>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/campos" className="text-zinc-500 hover:text-accent transition-colors">
            Campos publicados →
          </Link>
          <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo vender un campo
          </Link>
          <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-500 hover:text-accent transition-colors">
            Impuestos de la venta
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
