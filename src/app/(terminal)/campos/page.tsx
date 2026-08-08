import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'
import {
  APTITUD_LABEL,
  calcularArrendamiento,
  fmtArs,
  fmtHa,
  fmtUsd,
  indiceArrendamiento,
  precioVenta,
  tituloCampo,
  type Aptitud,
  type Campo,
} from '@/lib/campos'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const revalidate = 1800

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Campos en arrendamiento y venta — con el canon en kg de novillo',
  description:
    'Campos ganaderos y agrícolas ofrecidos en arrendamiento o venta en Argentina. El arrendamiento se publica en kg de novillo por hectárea por año y lo convertimos a pesos y dólares con el índice del día, para que compares peras con peras.',
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
      'El canon publicado en kg de novillo por ha por año, convertido a pesos y dólares con el índice de hoy.',
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
      'id, slug, operacion, hectareas, provincia, partido, aptitud, titulo, descripcion, mejoras, precio_kg_ha_anio, precio_usd_ha, capacidad_cabezas, destacado, status, created_at, published_at',
    )
    .eq('status', 'publicado')
    .order('destacado', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(200)
  return (data ?? []) as Campo[]
}

function CampoCard({ c }: { c: Campo }) {
  const arr = c.precio_kg_ha_anio ? calcularArrendamiento(c.hectareas, c.precio_kg_ha_anio) : null
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

      <p className="text-zinc-500 text-xs mb-3">
        {fmtHa(c.hectareas)}
        {c.partido ? ` · ${c.partido}` : ''} · {c.provincia}
        {c.aptitud ? ` · ${APTITUD_LABEL[c.aptitud as Aptitud]}` : ''}
      </p>

      {arr && (
        <div className="mb-2">
          <p className="text-zinc-200 text-sm font-mono">
            {c.precio_kg_ha_anio} kg/ha/año
            <span className="text-zinc-500"> · </span>
            <span className="text-accent">{fmtArs(arr.mensualArs)}/mes</span>
          </p>
          <p className="text-zinc-500 text-xs">
            {fmtArs(arr.anualArs)}/año · {fmtUsd(arr.anualUsd)}/año
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
  const idx = indiceArrendamiento()
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
              <strong className="text-zinc-200">kg de novillo por hectárea por año</strong> — y nosotros lo
              pasamos a pesos y dólares con el índice del día. Así comparás dos campos de verdad, sin hacer
              la cuenta a mano.
            </p>
          </div>
          <Link
            href="/campos/publicar"
            className="shrink-0 px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
          >
            Publicar mi campo
          </Link>
        </div>

        <p className="text-zinc-500 text-xs mb-8 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/40">
          Índice usado hoy: <span className="text-zinc-300 font-mono">{fmtArs(idx.valor)}/kg</span> —{' '}
          {idx.fuente}
          {idx.fecha ? ` al ${idx.fecha}` : ''}.{' '}
          <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright">
            Cómo se calcula
          </Link>
        </p>

        {campos.length === 0 ? (
          <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-8 text-center">
            <p className="text-zinc-200 mb-2">Todavía no hay campos publicados.</p>
            <p className="text-zinc-400 text-sm mb-5 max-w-lg mx-auto">
              Estamos abriendo esta sección. Si tenés un campo para arrendar o vender, publicalo: hay
              productores buscando en el sitio todas las semanas y no les tenemos qué ofrecer.
            </p>
            <Link
              href="/campos/publicar"
              className="inline-block px-5 py-2.5 text-sm bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
            >
              Publicar el primero
            </Link>
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
      </div>
    </>
  )
}
