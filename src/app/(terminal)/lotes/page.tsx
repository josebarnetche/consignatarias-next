import type { Metadata } from 'next'
import { Suspense } from 'react'
import lotesDcac from '@/lib/data/lotes-dcac.json'
import { getReferenciaPorPeso } from '@/lib/vr'
import { nombrePropio, provinciaNombre } from '@/lib/ui/tokens'
import LoteLeadCapture from '@/components/leads/LoteLeadCapture'

/**
 * Lotes de hacienda en vidriera.
 *
 * El inventario NO es nuestro: son los lotes que deCampoaCampo publica en sus
 * páginas públicas, con su ficha enlazada y la foto servida desde su propio
 * almacenamiento (no se copia nada). Lo que aportamos es lo que a ese lote le
 * falta para decidir: la BANDA realmente observada en las operaciones de lote
 * del MAG para esa categoría y ese peso (VR v1.0), que convierte un aviso en
 * una comparación.
 *
 * Nuestros propios leads NO se publican acá. La captura es de demanda y queda
 * etiquetada por lote (`lote:<sku>`), que es lo único que hace accionable el
 * interés de un comprador.
 */

type Lote = {
  sku: string
  titulo: string
  categoria: string | null
  cabezas: number | null
  kg_promedio: number | null
  raza: string | null
  provincia: string | null
  descripcion: string | null
  imagen_url: string | null
  url: string
  fuente: string
  primera_vez: string
  ultima_vez: string
  activo: boolean
}

const LOTES = (lotesDcac as Lote[]).filter((l) => l.activo)

const fmtArs = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export const metadata: Metadata = {
  title: 'Lotes de hacienda en venta — con la banda de precio observada',
  description:
    'Lotes de invernada y cría publicados hoy, cada uno comparado contra la banda de precio realmente observada en las operaciones de lote del Mercado Agroganadero (P10, mediana y P90) para su categoría y su peso.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/lotes' },
}

/** La banda para el lote, y el total que implica la mediana. Null si no hay base. */
function referenciaDe(lote: Lote) {
  if (!lote.categoria || !lote.kg_promedio) return null
  const ref = getReferenciaPorPeso(lote.categoria, lote.kg_promedio)
  if (!ref.banda) return null
  const kilos = (lote.cabezas || 0) * lote.kg_promedio
  return {
    p10: ref.banda.p10,
    mediana: ref.banda.mediana,
    p90: ref.banda.p90,
    lotes: ref.banda.lotes,
    base: ref.base,
    rango: ref.rango,
    fecha: ref.fecha_dato,
    total: kilos > 0 ? kilos * ref.banda.mediana : null,
    kilos,
  }
}

export default function LotesPage() {
  const conBanda = LOTES.map((l) => ({ lote: l, ref: referenciaDe(l) }))
  const provincias = [...new Set(LOTES.map((l) => l.provincia).filter(Boolean))].sort()
  const cabezasTotales = LOTES.reduce((a, l) => a + (l.cabezas || 0), 0)

  return (
    <div className="min-h-screen">
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <p className="text-label tracking-widest text-zinc-400 mb-2">LOTES DE HACIENDA</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
          Lotes en vidriera, con la banda de precio observada
        </h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-3xl">
          {LOTES.length} lotes publicados hoy{cabezasTotales > 0 ? ` · ${cabezasTotales.toLocaleString('es-AR')} cabezas` : ''}
          {provincias.length > 0 ? ` · ${provincias.length} provincias` : ''}. Cada uno va con la banda que
          realmente pagó el mercado por esa categoría y ese peso —P10, mediana y P90 de las operaciones de
          lote del Mercado Agroganadero—, para que el aviso se pueda comparar y no solo leer.
        </p>
        <p className="text-xs text-zinc-500 mt-3">
          Los lotes son publicaciones de{' '}
          <a href="https://www.decampoacampo.com" className="text-zinc-400 underline hover:text-sky-300" rel="noopener">
            deCampoaCampo
          </a>
          , con su ficha original enlazada en cada tarjeta. No fijamos ni publicamos su precio: la referencia de
          mercado es nuestra, el lote es de ellos.{' '}
          <a href="/metodologia/vr" className="text-zinc-400 underline hover:text-sky-300">
            Cómo se calcula la banda
          </a>
          .
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-10">
        {conBanda.length === 0 ? (
          <div className="terminal-panel rounded-xl p-6">
            <p className="text-sm text-zinc-300">
              Hoy no hay lotes en vidriera. El catálogo se arma con lo que se publica cada día: si buscás
              hacienda, dejanos qué necesitás acá abajo y la salimos a buscar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {conBanda.map(({ lote, ref }) => (
              <article key={lote.sku} className="terminal-panel rounded-xl overflow-hidden flex flex-col">
                {lote.imagen_url && (
                  /* La foto se sirve desde el almacenamiento de dCaC: no se copia ni se re-aloja. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lote.imagen_url}
                    alt={lote.titulo}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-44 object-cover bg-zinc-900"
                  />
                )}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h2 className="text-base font-semibold text-ink leading-snug">{nombrePropio(lote.titulo)}</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      {[
                        lote.provincia ? provinciaNombre(lote.provincia) : null,
                        lote.cabezas ? `${lote.cabezas} cabezas` : null,
                        lote.kg_promedio ? `${lote.kg_promedio} kg` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  {ref ? (
                    <div className="rounded-lg border border-terminal-border bg-black/20 px-3 py-2">
                      <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">
                        Banda observada {ref.base === 'rango_peso' && ref.rango ? `· ${ref.rango.desde_kg}-${ref.rango.hasta_kg} kg` : '· categoría'}
                      </p>
                      <p className="text-sm text-zinc-300 font-mono">
                        {fmtArs(ref.p10)} <span className="text-zinc-600">·</span>{' '}
                        <span className="text-ink font-semibold">{fmtArs(ref.mediana)}</span>{' '}
                        <span className="text-zinc-600">·</span> {fmtArs(ref.p90)}{' '}
                        <span className="text-zinc-500 text-xs">/kg</span>
                      </p>
                      {ref.total && (
                        <p className="text-xs text-zinc-400 mt-1">
                          A la mediana, el lote ({ref.kilos.toLocaleString('es-AR')} kg) da {fmtArs(ref.total)}
                        </p>
                      )}
                      <p className="text-xxs text-zinc-600 mt-1">
                        {ref.lotes} lotes del MAG · dato al {ref.fecha}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Sin base suficiente de lotes para esta categoría y peso: no inventamos un rango.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <a
                      href={`?lote=${lote.sku}#consulta`}
                      className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-sky-300 transition-colors"
                    >
                      Me interesa este lote
                    </a>
                    <a
                      href={lote.url}
                      rel="noopener"
                      className="rounded-lg border border-terminal-border px-3 py-2 text-xs font-terminal uppercase tracking-wider text-zinc-300 hover:border-sky-500/60 hover:text-sky-300 transition-colors"
                    >
                      Ficha en deCampoaCampo
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="consulta" className="max-w-5xl mx-auto px-4 pb-16 scroll-mt-16">
        <Suspense fallback={null}>
          <LoteLeadCapture />
        </Suspense>
      </section>
    </div>
  )
}
