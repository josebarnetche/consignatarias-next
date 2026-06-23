import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { ChicagoReference } from '@/components/market/ChicagoReference'
import { fetchChicagoCattle } from '@/lib/markets/chicago'
import { fetchInmagUsdJoined } from '@/lib/charts/data'

export const revalidate = 21600 // 6 h — alineado al feed CME (cotización diferida)

export const metadata: Metadata = {
  title: 'Precio internacional de la hacienda — Chicago (CME) en USD/kg',
  description:
    'Novillo gordo (Live Cattle) e invernada (Feeder Cattle) de Chicago (CME) convertidos a USD/kg vivo, comparados contra el novillo argentino (INMAG en dólares). La referencia global del precio de la hacienda en pie.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/internacional' },
  openGraph: {
    title: 'Precio internacional de la hacienda — Chicago (CME)',
    description:
      'Live Cattle y Feeder Cattle en USD/kg vivo, comparados con el novillo argentino (INMAG USD).',
    url: 'https://www.consignatarias.com.ar/mercado/internacional',
    type: 'website',
  },
}

const fmtUsd = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export default async function InternacionalPage() {
  const { liveCattle } = await fetchChicagoCattle()

  // Novillo local en USD (INMAG ÷ blue), último dato disponible — para el contraste.
  const today = new Date().toISOString().slice(0, 10)
  const from = new Date()
  from.setUTCMonth(from.getUTCMonth() - 3)
  const joined = await fetchInmagUsdJoined(from.toISOString().slice(0, 10), today)
  const localLatest = [...joined].reverse().find((d) => d.inmag_usd !== null)
  const localUsd = localLatest?.inmag_usd ?? null

  // Razón local/Chicago: a qué % del novillo de Chicago cotiza el gordo argentino.
  const ratioPct =
    localUsd !== null && liveCattle ? (localUsd / liveCattle.usdPerKg) * 100 : null

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/internacional" sectionName="Referencia internacional" />
      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/mercado"
            className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 hover:text-accent transition-colors"
          >
            ← Mercado
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mt-2 mb-1 leading-tight">
            Precio internacional de la hacienda — Chicago (CME)
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl">
            El benchmark global del precio de la hacienda en pie: el novillo gordo (Live Cattle)
            y la invernada (Feeder Cattle) de Chicago, convertidos a USD/kg vivo para leerlos en
            el mismo lenguaje que el precio argentino.
          </p>
        </div>

        {/* Panel en vivo (mismo componente que /mercado) */}
        <ChicagoReference />

        {/* Local vs Chicago — el contraste que importa al productor argentino */}
        {localUsd !== null && liveCattle && (
          <div className="terminal-panel">
            <div className="terminal-panel-header">Novillo argentino vs. Chicago</div>
            <div className="px-panel py-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-1">
                  Novillo local (INMAG)
                </div>
                <div className="font-terminal tabular-nums text-zinc-100">
                  <span className="text-xl">US$ {fmtUsd(localUsd)}</span>
                  <span className="text-xxs text-zinc-500">/kg</span>
                </div>
                <div className="text-xxs text-zinc-600 mt-0.5">MAG ÷ dólar blue</div>
              </div>
              <div>
                <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-1">
                  Novillo Chicago (Live Cattle)
                </div>
                <div className="font-terminal tabular-nums text-zinc-100">
                  <span className="text-xl">US$ {fmtUsd(liveCattle.usdPerKg)}</span>
                  <span className="text-xxs text-zinc-500">/kg</span>
                </div>
                <div className="text-xxs text-zinc-600 mt-0.5">CME · diferido</div>
              </div>
            </div>
            {ratioPct !== null && (
              <div className="px-panel pb-4 -mt-1">
                <p className="text-data font-terminal text-zinc-300 leading-relaxed">
                  El gordo argentino cotiza a{' '}
                  <span className="text-accent tabular-nums">{ratioPct.toFixed(0)}%</span>{' '}
                  del valor del novillo en Chicago — la brecha entre el precio local del kilo
                  vivo y la referencia internacional.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Qué es cada cosa — contenido único, indexable */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">Qué mide cada contrato</div>
          <div className="px-panel py-4 space-y-4 text-data font-terminal text-zinc-400 leading-relaxed">
            <div>
              <p className="text-zinc-200 mb-1">Live Cattle (novillo gordo)</p>
              <p>
                Futuro del animal terminado, listo para faena, en EE.UU. Es el equivalente al
                novillo gordo argentino: la referencia del precio de salida de la hacienda en pie.
                Cotiza en centavos de dólar por libra; acá lo convertimos a USD/kg vivo.
              </p>
            </div>
            <div>
              <p className="text-zinc-200 mb-1">Feeder Cattle (invernada)</p>
              <p>
                Futuro del ternero/novillito de invernada que entra al engorde. Marca el precio de
                la reposición — la pata que en Argentina sigue el ternero. Suele cotizar por encima
                del gordo por kilo, igual que acá.
              </p>
            </div>
          </div>
        </div>

        {/* Metodología / caveat */}
        <div className="terminal-panel">
          <div className="terminal-panel-header">Metodología y alcance</div>
          <div className="px-panel py-4 space-y-2 text-xxs font-terminal text-zinc-500 leading-relaxed">
            <p>
              Conversión: ¢/lb ÷ 100 × 2,2046 = USD/kg vivo. Los futuros de hacienda de Chicago
              cotizan sobre peso vivo, igual que el INMAG, así que la comparación es de kilo vivo
              a kilo vivo.
            </p>
            <p>
              Es una <span className="text-zinc-300">referencia internacional</span>, no un precio
              local: refleja el mercado estadounidense (otra moneda real, otra cadena, otros
              costos). Sirve para leer dónde está el precio argentino respecto del mundo, no para
              fijar el precio de un remate.
            </p>
            <p>
              Fuente: cotización pública diferida de los contratos CME (Live Cattle · LE, Feeder
              Cattle · GF). El novillo local es el INMAG del Mercado Agroganadero dividido por el
              dólar blue.
            </p>
          </div>
        </div>

        <div>
          <Link
            href="/mercado"
            className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright transition-colors"
          >
            ← Volver al mercado
          </Link>
        </div>
      </div>
    </>
  )
}
