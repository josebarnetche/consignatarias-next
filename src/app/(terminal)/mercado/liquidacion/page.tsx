import { Metadata } from 'next'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { DatasetSchema, SpeakableSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { getLiquidacion, LIQUIDACION_CAVEAT, type PuntoHembras } from '@/lib/data/liquidacion'

export const revalidate = 43200 // 12h — la serie de Cañuelas se actualiza con el scraper diario

export const metadata: Metadata = {
  title: 'Índice de Liquidación — participación de hembras en la hacienda | Consignatarias',
  description:
    'La participación de hembras (vacas + vaquillonas) en la hacienda operada en el Mercado Agroganadero: el indicador adelantado de liquidación vs. retención del rodeo argentino. Con el contexto histórico de la faena nacional de hembras (1998-2025, MAGyP).',
  keywords: [
    'índice de liquidación', 'liquidación de vientres', 'participación de hembras', 'faena de hembras',
    'retención de vientres', 'stock ganadero', 'rodeo argentino', 'vacas vaquillonas', 'ciclo ganadero',
    'Mercado Agroganadero', 'Cañuelas', 'descarga de hacienda',
  ],
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/liquidacion' },
}

// ── Chart SVG del histórico nacional (1998-2025), server-rendered ────────────
function HistoricoChart({ serie }: { serie: PuntoHembras[] }) {
  const W = 720, H = 240, padX = 8, padY = 16
  const vals = serie.map((p) => p.pct)
  const min = Math.floor(Math.min(...vals) - 1)
  const max = Math.ceil(Math.max(...vals) + 1)
  // Eje X por FECHA real (no por índice): la serie mezcla puntos mensuales (1998-2019)
  // y trimestrales (2019-2025); escalar por índice comprimiría los últimos 6 años en
  // ~8% del ancho. Convertimos 'YYYY-MM' a año decimal.
  const toT = (mes: string) => {
    const [y, m] = mes.split('-').map(Number)
    return y + (m - 1) / 12
  }
  const ts = serie.map((p) => toT(p.mes))
  const tMin = ts[0]
  const tMax = ts[ts.length - 1]
  const x = (i: number) => padX + ((ts[i] - tMin) / (tMax - tMin)) * (W - 2 * padX)
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (H - 2 * padY)
  const path = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ')
  const area = `${path} L${x(serie.length - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`
  // Líneas de referencia por año (cada ~4 años) para ubicarse.
  const yearTicks = serie
    .map((p, i) => ({ year: p.mes.slice(0, 4), i }))
    .filter((t, idx, arr) => t.year !== arr[idx - 1]?.year && Number(t.year) % 4 === 0)
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Serie histórica de participación de hembras en la faena nacional, 1998 a 2025">
        <defs>
          <linearGradient id="liqfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[min, Math.round((min + max) / 2), max].map((v) => (
          <g key={v}>
            <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="#27272a" strokeWidth="1" />
            <text x={padX} y={y(v) - 3} fill="#52525b" fontSize="10" fontFamily="monospace">{v}%</text>
          </g>
        ))}
        {yearTicks.map((t) => (
          <text key={t.year} x={x(t.i)} y={H - 3} fill="#52525b" fontSize="9" fontFamily="monospace" textAnchor="middle">{t.year}</text>
        ))}
        <path d={area} fill="url(#liqfill)" />
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

export default async function LiquidacionPage() {
  const { actual, canuelas, nacional, nacionalActual, interpretacion, fuenteNacional } = await getLiquidacion()
  const natMin = nacional.reduce((m, p) => (p.pct < m.pct ? p : m), nacional[0])
  const natMax = nacional.reduce((m, p) => (p.pct > m.pct ? p : m), nacional[0])

  const faqs = [
    { question: '¿Qué es el Índice de Liquidación?', answer: 'Es la participación de hembras (vacas + vaquillonas) en la hacienda. Una participación alta señala liquidación —el productor descarga vientres, el rodeo se achica— y una baja señala retención —se guardan vientres para armar rodeo—. Es un termómetro del ciclo ganadero.' },
    { question: '¿De dónde sale el dato?', answer: 'La lectura fresca sale de la hacienda operada en el Mercado Agroganadero (Cañuelas), rueda por rueda, desde 2026. El contexto histórico nacional es la faena de hembras: mensual de MAGyP/DNCCA (1998-2019) y trimestral del IPCVA (2019-2025), la misma métrica unida.' },
    { question: '¿Por qué el número de Cañuelas es más alto que el histórico nacional?', answer: 'Porque son métricas distintas: Cañuelas es la hacienda operada en el mercado concentrador (que recibe mucha venta de vaca y vaquillona), y corre estructuralmente por encima de la faena nacional. No se comparan 1:1 en nivel; la señal está en la magnitud y la tendencia.' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Mercado', href: '/mercado' }, { name: 'Índice de Liquidación' }]} />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Mercado · Familia de índices</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-balance">Índice de Liquidación</h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          La participación de hembras en la hacienda: el indicador adelantado de <strong className="text-zinc-200">liquidación</strong> (descarga
          de vientres) vs. <strong className="text-zinc-200">retención</strong> (armado de rodeo) del ganado argentino.
        </p>
      </header>

      {/* Lectura fresca (Cañuelas) */}
      <section className="rounded-terminal border border-accent/30 bg-accent/5 p-5 sm:p-6">
        <p className="text-xxs uppercase tracking-widest text-accent">Lectura del mercado de referencia (Cañuelas)</p>
        {actual ? (
          <>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-semibold text-white tabular-nums">{actual.pct}%</span>
              <span className="text-data text-zinc-400">hembras · {actual.mes}</span>
            </div>
            <p className="mt-3 text-data text-zinc-200">{interpretacion}</p>
            {canuelas.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {canuelas.map((p) => (
                  <span key={p.mes} className="rounded-terminal border border-terminal-border bg-terminal-panel px-3 py-1.5 text-xxs">
                    <span className="text-zinc-500">{p.mes}</span> <span className="text-zinc-100 font-terminal">{p.pct}%</span>
                    <span className="text-zinc-600"> · {p.cabezas?.toLocaleString('es-AR')} cab</span>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-data text-zinc-400">Sin dato reciente del mercado.</p>
        )}
        <p className="mt-4 text-xxs text-zinc-500">{LIQUIDACION_CAVEAT}</p>
      </section>

      {/* Contexto histórico nacional */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-1">El contexto: faena de hembras nacional, 1998-2025</h2>
        <p className="text-data text-zinc-500 mb-4">
          El arco de largo plazo del ciclo ganadero argentino. Mensual 1998-2019 (MAGyP/DNCCA) + trimestral 2019-2025 (IPCVA), la misma métrica unida.
        </p>
        <div className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
          <HistoricoChart serie={nacional} />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xxs text-zinc-500">
            <span>Mínimo: <span className="text-positive">{natMin.pct}%</span> ({natMin.mes}) — retención</span>
            <span>Máximo: <span className="text-warning">{natMax.pct}%</span> ({natMax.mes}) — liquidación</span>
            <span>Último dato oficial: {nacional[nacional.length - 1].pct}% ({nacional[nacional.length - 1].mes})</span>
          </div>
        </div>
        <p className="mt-3 text-xxs text-zinc-600">
          El tramo 1998-2025 es mensual (MAGyP/DNCCA, congelado en 2019); de ahí a 2025 es trimestral (informes del IPCVA,
          reconstruido). Es el telón de fondo nacional; la lectura fresca de arriba es nuestra, del operado en Cañuelas.
        </p>

        {/* Ancla nacional actual (PDF mensual MAGyP) — puentea el hueco 2019→hoy */}
        {nacionalActual?.pct_hembras != null && (
          <div className="mt-4 rounded-terminal border border-terminal-border bg-terminal-panel p-4">
            <p className="text-xxs uppercase tracking-widest text-zinc-500 mb-1">Ancla nacional actual</p>
            <p className="text-data text-zinc-200">
              Faena de hembras nacional, acumulado a <span className="text-zinc-100">{nacionalActual.mes_informe}</span>:{' '}
              <span className="text-white font-semibold">{nacionalActual.pct_hembras}%</span>
              {nacionalActual.pct_hembras_anio_previo != null && (
                <span className="text-zinc-500"> (vs {nacionalActual.pct_hembras_anio_previo}% el año previo)</span>
              )}
              {nacionalActual.faena_total_cabezas != null && (
                <span className="text-zinc-500"> · {nacionalActual.faena_total_cabezas.toLocaleString('es-AR')} cabezas faenadas</span>
              )}
              .
            </p>
            <p className="mt-2 text-xxs text-zinc-600">
              Es el dato acumulado del año (YTD), no mensual, del{' '}
              <a href={nacionalActual.fuente_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-accent underline underline-offset-2">informe mensual de MAGyP</a>.
              La faena nacional corre por debajo del operado en Cañuelas.
            </p>
          </div>
        )}
      </section>

      {/* Metodología */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-3">Metodología</h2>
        <ul className="space-y-2 text-data text-zinc-300">
          <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" /><span><strong className="text-zinc-100">Hembras</strong> = vacas + vaquillonas (incluye sus estados), sobre el total de cabezas operadas.</span></li>
          <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" /><span><strong className="text-zinc-100">Lectura Cañuelas</strong> (2026→): hacienda operada en el Mercado Agroganadero, mercado concentrador de referencia (~12% de la faena nacional). Es un indicador <strong className="text-zinc-100">adelantado</strong>, más granular y propietario.</span></li>
          <li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" /><span><strong className="text-zinc-100">Contexto nacional</strong> (1998-2025): faena de hembras nacional — mensual de MAGyP/DNCCA (1998-2019) + trimestral del IPCVA (2019-2025), la misma métrica. Es la faena (rezagada), no el operado — corre en un nivel más bajo. No comparar 1:1 con Cañuelas.</span></li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-4">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
              <summary className="cursor-pointer text-data font-medium text-zinc-100 marker:text-accent">{f.question}</summary>
              <p className="mt-2 text-data text-zinc-400">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xxs text-zinc-600">
        Fuente del contexto histórico:{' '}
        <a href={fuenteNacional.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-accent underline underline-offset-2">{fuenteNacional.nombre}</a>.
        Lectura fresca: elaboración propia sobre la hacienda operada en el Mercado Agroganadero.
      </p>

      <DatasetSchema
        name="Índice de Liquidación — participación de hembras en la hacienda argentina"
        description="Participación de hembras (vacas + vaquillonas) en la hacienda operada en el Mercado Agroganadero (2026→), con el contexto histórico de la faena nacional de hembras (1998-2025)."
        url="https://www.consignatarias.com.ar/mercado/liquidacion"
        keywords={['índice de liquidación', 'participación de hembras', 'faena de hembras', 'ciclo ganadero', 'retención de vientres']}
      />
      <SpeakableSchema url="https://www.consignatarias.com.ar/mercado/liquidacion" headline="Índice de Liquidación — participación de hembras en la hacienda argentina" cssSelectors={['h1', 'section p']} />
      <FAQPageSchema items={faqs} />
    </div>
  )
}
