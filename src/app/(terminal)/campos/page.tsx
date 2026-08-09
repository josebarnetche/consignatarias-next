import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import { APTITUD_LABEL, fmtArs, fmtHa, fmtUsd, precioVenta, tituloCampo, type Aptitud, type Campo } from '@/lib/campos'
import { canonEnPlata, promedioMesAnterior } from '@/lib/valuacion-campos'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import CapturaCampoForm from '@/components/campos/CapturaCampoForm'
import { consignatariaProfilePath, getAllProfiles } from '@/lib/data/consignataria-slugs'
import { PROVINCIAS_CON_DATO } from '@/lib/campos-seo'

export const revalidate = 1800

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Campos en arrendamiento y venta — canon en kg de novillo por mes',
  description:
    'Campos ganaderos y agrícolas ofrecidos en arrendamiento o venta en Argentina. El arrendamiento se publica en kg de novillo por hectárea por mes, como se pacta, y lo pasamos a pesos y dólares con el promedio del mes anterior.',
  keywords: [
    'campos en arrendamiento',
    'campos en venta',
    'arrendamiento de campos ganaderos',
    'campo para arrendar',
    'alquiler de campo ganadero',
    'campos ganaderos en venta',
  ],
  openGraph: {
    title: 'Campos en arrendamiento y venta — consignatarias.com.ar',
    description:
      'El canon publicado en kg de novillo por ha por mes, convertido a pesos y dólares.',
    url: `${BASE_URL}/campos`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/campos` },
}

async function traerCampos(): Promise<Campo[]> {
  const db = createServiceClient()
  if (!db) return []
  const { data } = await db
    .from('campos')
    .select(
      'id, slug, operacion, hectareas, provincia, partido, aptitud, titulo, descripcion, mejoras, precio_kg_ha_mes, precio_usd_ha, capacidad_cabezas, consignataria_slug, destacado, status, created_at, published_at',
    )
    .eq('status', 'publicado')
    .order('destacado', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(200)
  return (data ?? []) as Campo[]
}

function nombreFirma(slug: string | null): string | null {
  if (!slug) return null
  return getAllProfiles().find((p) => p.canonicalSlug === slug)?.displayName ?? null
}

function CampoCard({ c }: { c: Campo }) {
  const firma = nombreFirma(c.consignataria_slug)
  const arr = c.precio_kg_ha_mes ? canonEnPlata(c.hectareas, c.precio_kg_ha_mes) : null
  const vta = c.precio_usd_ha ? precioVenta(c.hectareas, c.precio_usd_ha) : null
  return (
    <article className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-zinc-100 text-base font-medium">
          <Link href={`/campos/${c.slug}`} className="hover:text-accent transition-colors">
            {tituloCampo(c)}
          </Link>
        </h2>
        {c.destacado && (
          <span className="shrink-0 text-xxs uppercase tracking-wider border border-accent/50 text-accent rounded px-2 py-0.5">
            Destacado
          </span>
        )}
      </div>

      {firma && (
        <p className="text-xxs text-zinc-500 mb-2">
          Ofrecido por{' '}
          <Link href={consignatariaProfilePath(c.consignataria_slug)} className="text-accent hover:underline">
            {firma}
          </Link>
        </p>
      )}

      <p className="text-zinc-500 text-xs mb-3">
        {fmtHa(c.hectareas)}
        {c.partido ? ` · ${c.partido}` : ''} · {c.provincia}
        {c.aptitud ? ` · ${APTITUD_LABEL[c.aptitud as Aptitud]}` : ''}
      </p>

      {arr && (
        <div className="mb-2">
          <p className="text-zinc-200 text-sm font-mono">
            {c.precio_kg_ha_mes} kg/ha/mes
            <span className="text-zinc-500"> · </span>
            <span className="text-accent">{fmtArs(arr.mensualArs)}/mes</span>
          </p>
          <p className="text-zinc-500 text-xs">
            {fmtUsd(arr.mensualUsd)}/mes · {fmtArs(arr.anualArs)} al año
          </p>
        </div>
      )}
      {vta && (
        <div className="mb-2">
          <p className="text-zinc-200 text-sm font-mono">
            {fmtUsd(vta.usdHa)}/ha <span className="text-zinc-500">·</span>{' '}
            <span className="text-accent">{fmtUsd(vta.totalUsd)}</span> total
          </p>
        </div>
      )}

      {c.descripcion && <p className="text-zinc-400 text-sm mt-3 line-clamp-2">{c.descripcion}</p>}

      <Link href={`/campos/${c.slug}`} className="inline-block mt-3 text-xs text-accent hover:text-accent-bright">
        Ver el campo →
      </Link>
    </article>
  )
}

export default async function CamposPage() {
  const campos = await traerCampos()
  const idx = promedioMesAnterior()
  const arrend = campos.filter((c) => c.operacion !== 'venta')
  const venta = campos.filter((c) => c.operacion !== 'arrendamiento')

  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <div className="max-w-4xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-zinc-100 text-2xl font-medium mb-2">Campos en arrendamiento y venta</h1>
            <p className="text-zinc-400 max-w-2xl">
              El arrendamiento se publica como se pacta en el campo —{' '}
              <strong className="text-zinc-200">kg de novillo por hectárea por mes</strong>, liquidado con el
              promedio del mes anterior — y nosotros lo pasamos a pesos y dólares. Así comparás dos campos
              de verdad, sin hacer la cuenta a mano.
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <Link href="/campos/publicar" className="px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors text-center">
              Publicar mi campo
            </Link>
            <Link href="/campos/valuar" className="px-4 py-2 text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded transition-colors text-center">
              ¿Cuánto vale?
            </Link>
          </div>
        </div>

        <p className="text-zinc-500 text-xs mb-8 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/40">
          El canon se liquida con el <span className="text-zinc-300">{idx.etiqueta}</span> del novillo:{' '}
          <span className="text-zinc-300 font-mono">{fmtArs(idx.valor)}/kg</span>
          {idx.ruedas ? ` (${idx.ruedas} ruedas)` : ''}.{' '}
          <Link href="/campos/valuar" className="text-accent hover:text-accent-bright">
            ¿Cuánto vale tu campo?
          </Link>
        </p>

        {/* Con la sección vacía, lo que NO hay que hacer es pedir disculpas y no
            pedir nada. Se anota qué busca cada uno: esa lista es lo que después
            consigue la oferta, y es nuestra. */}
        {campos.length === 0 ? (
          <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-6 mb-10">
            <p className="text-zinc-100 text-base font-medium mb-1">
              Decinos qué campo estás buscando
            </p>
            <p className="text-zinc-400 text-sm mb-5 max-w-2xl">
              Estamos abriendo la sección y todavía no hay avisos publicados. Dejanos qué buscás —zona,
              superficie, si es para arrendar o comprar— y te escribimos cuando aparezca algo que encaje.
              Somos nosotros los que te avisamos: tu contacto no circula.
            </p>
            <CapturaCampoForm tipo="busco" origen="campos-vacio" />
            <p className="text-zinc-600 text-xs mt-5 pt-4 border-t border-zinc-800">
              ¿Al revés, tenés un campo para arrendar o vender?{' '}
              <Link href="/campos/publicar" className="text-accent hover:underline">
                Publicalo gratis
              </Link>{' '}
              o{' '}
              <Link href="/campos/valuar" className="text-accent hover:underline">
                fijate cuánto vale
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {arrend.length > 0 && (
              <section className="mb-10">
                <h2 className="text-zinc-200 text-lg font-medium mb-3">
                  En arrendamiento <span className="text-zinc-600 text-sm font-normal">({arrend.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {arrend.map((c) => (
                    <CampoCard key={c.id} c={c} />
                  ))}
                </div>
              </section>
            )}
            {venta.length > 0 && (
              <section className="mb-10">
                <h2 className="text-zinc-200 text-lg font-medium mb-3">
                  En venta <span className="text-zinc-600 text-sm font-normal">({venta.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {venta.map((c) => (
                    <CampoCard key={c.id} c={c} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/campos/publicar" className="text-zinc-500 hover:text-accent transition-colors">
            Publicar un campo →
          </Link>
          <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Índice de arrendamiento
          </Link>
          <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Cómo se calcula el canon
          </Link>
          <Link href="/quiero-comprar" className="text-zinc-500 hover:text-accent transition-colors">
            Busco hacienda
          </Link>
        </div>

        <section className="border-t border-zinc-800 pt-5 mt-8">
          <h2 className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-3">
            Comprar, vender y tasar un campo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <Link href="/campos/valuar" className="text-zinc-400 hover:text-accent transition-colors">
              ¿Cuánto vale mi campo? — tasador
            </Link>
            <Link href="/como-comprar-un-campo" className="text-zinc-400 hover:text-accent transition-colors">
              Cómo comprar un campo — requisitos y papeles
            </Link>
            <Link href="/como-vender-un-campo" className="text-zinc-400 hover:text-accent transition-colors">
              Cómo vender un campo — precio y tiempos
            </Link>
            <Link href="/como-publicar-un-campo" className="text-zinc-400 hover:text-accent transition-colors">
              Cómo publicar tu campo — guía del aviso
            </Link>
            <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-400 hover:text-accent transition-colors">
              Impuestos por la venta de un campo
            </Link>
            <Link href="/creditos-para-comprar-un-campo" className="text-zinc-400 hover:text-accent transition-colors">
              Créditos y financiación
            </Link>
            <Link href="/inmobiliarias-rurales" className="text-zinc-400 hover:text-accent transition-colors">
              Inmobiliarias rurales
            </Link>
            <Link href="/mercado/arrendamiento" className="text-zinc-400 hover:text-accent transition-colors">
              Índice de arrendamiento
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-900">
            <p className="text-zinc-500 text-xs mb-2">Cuánto vale la hectárea, provincia por provincia:</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xxs">
              {PROVINCIAS_CON_DATO.map((p) => (
                <Link
                  key={p.slug}
                  href={`/campos/valor-hectarea/${p.slug}`}
                  className="text-zinc-500 hover:text-accent transition-colors"
                >
                  {p.provincia}
                </Link>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
