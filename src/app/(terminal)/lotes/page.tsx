import type { Metadata } from 'next'
import lotesDcac from '@/lib/data/lotes-dcac.json'
import { getReferenciaPorPeso } from '@/lib/vr'
import { nombrePropio, provinciaNombre } from '@/lib/ui/tokens'
import OfertaLote from '@/components/leads/OfertaLote'
import { ImagenTema } from '@/components/ui/ImagenTema'

/**
 * Lotes de hacienda en vidriera.
 *
 * Se publican los DATOS del lote (categoría, cabezas, kilos, raza, provincia),
 * que son hechos, más UNA referencia de precio propia —la mediana observada en
 * las operaciones de lote del MAG para esa categoría y ese peso— y un botón para
 * ofertar. La oferta entra como `lote:<sku>`: por eso existe la página.
 *
 * Sin foto y sin ficha enlazada por decisión del 04-10-2026. La foto es lo único
 * del aviso que sí tiene dueño, así que si no va la atribución tampoco va la
 * imagen. Lo que sí queda es la línea que aclara que no somos el vendedor: sin
 * eso la página implica que la hacienda es nuestra, que no lo es.
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

/**
 * Las subcategorías del aviso contra las categorías que el VR mide.
 *
 * Una vaca preñada se vende como vaca: la banda de VACA es la base observable y
 * es la referencia honesta. Lo que la banda NO contiene es la prima por preñez,
 * servicio o cría al pie — eso se pacta, no se observa en el lote del MAG, así
 * que la tarjeta lo dice en vez de meterlo en el número.
 *
 * Terneros y terneras quedan sin referencia a propósito: el MAG no opera terneros
 * (en `market-prices.json` son INMAG × 1,10, un ratio, no una observación) y MEJ
 * es macho entero joven, no un ternero. Antes de inventarles un precio, no se da.
 */
const A_CATEGORIA_VR: Record<string, { vr: string; prima?: string }> = {
  novillos: { vr: 'novillos' },
  novillitos: { vr: 'novillitos' },
  vacas: { vr: 'vacas' },
  vacas_prenadas: { vr: 'vacas', prima: 'la preñez se pacta aparte' },
  vacas_con_cria: { vr: 'vacas', prima: 'la cría al pie se pacta aparte' },
  vaquillonas: { vr: 'vaquillonas' },
  vaquillonas_prenadas: { vr: 'vaquillonas', prima: 'la preñez se pacta aparte' },
  vaquillonas_madre: { vr: 'vaquillonas', prima: 'el destino de madre se pacta aparte' },
  toros: { vr: 'toros' },
}

/**
 * El glifo de marca de cada categoría. La imagen de la tarjeta es NUESTRA: los
 * glifos de `public/marca/glifos-color/` ya existen con variante para tema claro,
 * así que la página tiene imagen sin usar la foto del aviso, que es lo único del
 * aviso con dueño. Si en algún momento se quieren las fotos reales de los
 * animales, van con el crédito al aviso original — no sin él.
 */
const GLIFO: Record<string, string> = {
  novillos: 'novillo',
  novillitos: 'novillito',
  vacas: 'vaca',
  vacas_prenadas: 'vaca',
  vacas_con_cria: 'vaca',
  vaquillonas: 'vaquillona',
  vaquillonas_prenadas: 'vaquillona',
  vaquillonas_madre: 'vaquillona',
  terneros: 'ternero',
  terneras: 'ternero',
  toros: 'toro',
}

const fmtArs = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

export const metadata: Metadata = {
  title: 'Lotes de hacienda en venta — categoría, kilos y referencia de precio',
  description:
    'Lotes de invernada y cría disponibles hoy: categoría, cabezas, kilos y provincia, con la referencia de precio observada en las operaciones de lote del Mercado Agroganadero. Ofertá por el lote que te sirve.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/lotes' },
}

/** La referencia del lote: un número, el que el mercado pagó en la mediana. */
function referenciaDe(lote: Lote) {
  const mapa = lote.categoria ? A_CATEGORIA_VR[lote.categoria] : null
  if (!mapa || !lote.kg_promedio) return null
  const ref = getReferenciaPorPeso(mapa.vr, lote.kg_promedio)
  if (!ref.banda) return null
  const kilos = (lote.cabezas || 0) * lote.kg_promedio
  return {
    mediana: ref.banda.mediana,
    lotes: ref.banda.lotes,
    porPeso: ref.base === 'rango_peso',
    fecha: ref.fecha_dato,
    total: kilos > 0 ? kilos * ref.banda.mediana : null,
    kilos,
    prima: mapa.prima,
  }
}

export default function LotesPage() {
  const filas = LOTES.map((l) => ({ lote: l, ref: referenciaDe(l) }))
  const cabezasTotales = LOTES.reduce((a, l) => a + (l.cabezas || 0), 0)
  const provincias = [...new Set(LOTES.map((l) => l.provincia).filter(Boolean))]

  return (
    <div className="min-h-screen">
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <p className="text-label tracking-widest text-zinc-400 mb-2">LOTES DE HACIENDA</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Lotes disponibles hoy</h1>
        <p className="text-sm text-zinc-400 mt-3 max-w-3xl">
          {LOTES.length} lotes{cabezasTotales > 0 ? ` · ${cabezasTotales.toLocaleString('es-AR')} cabezas` : ''}
          {provincias.length > 0 ? ` · ${provincias.length} provincias` : ''}. Cada uno con la referencia de precio
          que salió de las operaciones de lote del Mercado Agroganadero para esa categoría y ese peso. Si te sirve,
          poné tu precio y lo trabajamos.
        </p>
        <p className="text-xs text-zinc-500 mt-3">
          No somos los vendedores: publicamos los datos del lote y trabajamos tu oferta.{' '}
          <a href="/metodologia/vr" className="text-zinc-400 underline hover:text-sky-300">
            Cómo se calcula la referencia
          </a>
          .
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        {filas.length === 0 ? (
          <div className="terminal-panel rounded-xl p-6">
            <p className="text-sm text-zinc-300">
              Hoy no hay lotes en vidriera. Decinos qué hacienda buscás en{' '}
              <a href="/quiero-comprar" className="text-sky-300 underline">
                quiero comprar
              </a>{' '}
              y te avisamos cuando aparezca.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filas.map(({ lote, ref }) => (
              <article key={lote.sku} className="terminal-panel rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-3 border-b border-terminal-border bg-zinc-100 claro:bg-zinc-100 px-4 py-3">
                  <ImagenTema
                    src={`/marca/glifos-color/glifo-${GLIFO[lote.categoria ?? ''] ?? 'vaca'}.png`}
                    alt=""
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
                      {lote.raza ? nombrePropio(lote.raza.split(' - ')[0]) : 'Hacienda'}
                    </p>
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {lote.cabezas ? `${lote.cabezas} cabezas` : 'Lote'}
                      {lote.kg_promedio ? ` · ${lote.kg_promedio} kg` : ''}
                    </p>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
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

                  {ref ? (
                  <div className="rounded-lg border border-terminal-border bg-black/20 px-3 py-2">
                    <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
                      Referencia {ref.porPeso ? 'para ese peso' : 'de la categoría'}
                    </p>
                    <p className="text-lg text-ink font-mono font-semibold leading-tight">
                      {fmtArs(ref.mediana)} <span className="text-xs text-zinc-500 font-sans font-normal">/kg</span>
                    </p>
                    {ref.total && (
                      <p className="text-xs text-zinc-400">
                        A ese valor, el lote ({ref.kilos.toLocaleString('es-AR')} kg) da {fmtArs(ref.total)}
                      </p>
                    )}
                    <p className="text-xxs text-zinc-600 mt-1">
                      {ref.lotes} lotes del MAG · dato al {ref.fecha}
                      {ref.prima ? ` · ${ref.prima}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Sin referencia observada para esta categoría: el MAG no la opera por lote, y no le ponemos un
                    número inventado.
                  </p>
                )}

                <div className="mt-auto pt-1">
                  <OfertaLote
                    sku={lote.sku}
                    categoria={lote.categoria}
                    provincia={lote.provincia}
                    cabezas={lote.cabezas}
                    referencia={ref?.mediana ?? null}
                  />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
