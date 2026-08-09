import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { APTITUD_LABEL, capacidadEstimada, fmtArs, fmtHa, fmtUsd, precioVenta, tituloCampo, type Aptitud, type Campo } from '@/lib/campos'
import { canonEnPlata, valuarCampo } from '@/lib/valuacion-campos'
import ConsultarCampoForm from '@/components/campos/ConsultarCampoForm'

export const revalidate = 1800
export const dynamicParams = true

const BASE_URL = 'https://www.consignatarias.com.ar'

async function traerCampo(slug: string): Promise<Campo | null> {
  const db = createServiceClient()
  if (!db) return null
  const { data } = await db
    .from('campos')
    .select(
      'id, slug, operacion, hectareas, provincia, partido, aptitud, titulo, descripcion, mejoras, precio_kg_ha_mes, precio_usd_ha, capacidad_cabezas, destacado, status, created_at, published_at',
    )
    .eq('slug', slug)
    .eq('status', 'publicado')
    .maybeSingle()
  return (data as Campo) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = await traerCampo(slug)
  if (!c) return { title: 'Campo no encontrado' }
  const titulo = tituloCampo(c)
  const precio = c.precio_kg_ha_mes
    ? `${c.precio_kg_ha_mes} kg de novillo por ha por mes (${fmtArs(canonEnPlata(c.hectareas, c.precio_kg_ha_mes).mensualArs)} por mes)`
    : c.precio_usd_ha
      ? `${fmtUsd(c.precio_usd_ha)} por hectárea`
      : 'consultar'
  return {
    title: titulo,
    description: `${fmtHa(c.hectareas)} en ${c.partido ? `${c.partido}, ` : ''}${c.provincia}${c.aptitud ? `, aptitud ${APTITUD_LABEL[c.aptitud as Aptitud].toLowerCase()}` : ''}. Precio: ${precio}. Consultá por el campo en consignatarias.com.ar.`,
    openGraph: { title: titulo, url: `${BASE_URL}/campos/${slug}`, type: 'article' },
    alternates: { canonical: `${BASE_URL}/campos/${slug}` },
  }
}

export default async function CampoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await traerCampo(slug)
  if (!c) notFound()

  const arr = c.precio_kg_ha_mes ? canonEnPlata(c.hectareas, c.precio_kg_ha_mes) : null
  const val = valuarCampo({ hectareas: c.hectareas, provincia: c.provincia, kgHaMes: c.precio_kg_ha_mes })
  const vta = c.precio_usd_ha ? precioVenta(c.hectareas, c.precio_usd_ha) : null
  const cap = capacidadEstimada(c)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
      <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">
        ← Todos los campos
      </Link>

      <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-2">{tituloCampo(c)}</h1>
      <p className="text-zinc-400 mb-6">
        {fmtHa(c.hectareas)}
        {c.partido ? ` · ${c.partido}` : ''} · {c.provincia}
        {c.aptitud ? ` · aptitud ${APTITUD_LABEL[c.aptitud as Aptitud].toLowerCase()}` : ''}
        {cap ? ` · ${cap.cabezas.toLocaleString('es-AR')} cabezas${cap.estimada ? ' (estimado)' : ''}` : ''}
      </p>

      {/* Canon: mensual, como se pacta */}
      {arr && (
        <section className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Canon de arrendamiento</p>
          <p className="text-zinc-100 text-2xl font-mono mb-1">
            {c.precio_kg_ha_mes} <span className="text-base text-zinc-400">kg de novillo / ha / mes</span>
          </p>
          <p className="text-accent text-lg font-mono mb-3">
            ≈ {fmtArs(arr.mensualArs)} por mes · {fmtUsd(arr.mensualUsd)}
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
            <p>
              Al año: <span className="text-zinc-200">{fmtArs(arr.anualArs)}</span>
            </p>
            <p>
              Por hectárea: <span className="text-zinc-200">{fmtArs(arr.porHaMensualArs)}/mes</span>
            </p>
          </div>
          <p className="text-zinc-500 text-xs mt-3">
            Se liquida con el {arr.etiqueta} del novillo ({fmtArs(arr.referencia)}/kg
            {arr.ruedas ? `, ${arr.ruedas} ruedas` : ''}), como se hace en el campo: el monto en pesos
            acompaña al mercado y el canon en kilos no se mueve.
          </p>
        </section>
      )}

      {/* Valuación: el número que interesa si se piensa en comprar */}
      {val.usdHa > 0 && (
        <section className="border border-zinc-800 rounded-lg bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-5 mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.16em] mb-2">Valor estimado del campo</p>
          <div className="flex items-end gap-3 flex-wrap mb-1">
            <span className="text-3xl font-mono text-zinc-50 leading-none tabular-nums">{fmtUsd(val.usdHa)}</span>
            <span className="text-zinc-500 text-sm mb-0.5">por hectárea</span>
          </div>
          <p className="text-accent text-lg font-mono tabular-nums mb-3">
            {fmtUsd(val.usdTotal)} <span className="text-zinc-500 text-sm font-sans">el campo entero</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
            {val.porRenta && (
              <p>
                Por lo que renta: <span className="text-zinc-200">{fmtUsd(val.porRenta.usdHa)}/ha</span>{' '}
                <span className="text-zinc-600">({val.porRenta.anos} años de canon)</span>
              </p>
            )}
            {val.porComparables && (
              <p>
                Por la zona: <span className="text-zinc-200">{fmtUsd(val.porComparables.usdHa)}/ha</span>{' '}
                <span className="text-zinc-600">
                  ({fmtUsd(val.porComparables.p25)}–{fmtUsd(val.porComparables.p75)})
                </span>
              </p>
            )}
          </div>
          <p className="text-zinc-600 text-xxs mt-3">
            Estimación orientativa.{' '}
            <Link href="/campos/valuar" className="text-accent hover:text-accent-bright">
              Probar con otros números
            </Link>
          </p>
        </section>
      )}

      {vta && (
        <section className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Precio de venta pedido</p>
          <p className="text-zinc-100 text-2xl font-mono mb-1">
            {fmtUsd(vta.usdHa)} <span className="text-base text-zinc-400">por hectárea</span>
          </p>
          <p className="text-accent text-lg font-mono">{fmtUsd(vta.totalUsd)} el campo entero</p>
          {val.usdHa > 0 && (
            <p className="text-zinc-500 text-xs mt-3 border-t border-zinc-800 pt-3">
              {vta.usdHa > val.usdHa * 1.15
                ? `Pedido ${Math.round((vta.usdHa / val.usdHa - 1) * 100)}% por encima de nuestra estimación.`
                : vta.usdHa < val.usdHa * 0.85
                  ? `Pedido ${Math.round((1 - vta.usdHa / val.usdHa) * 100)}% por debajo de nuestra estimación.`
                  : 'En línea con nuestra estimación.'}
            </p>
          )}
        </section>
      )}

      {c.descripcion && (
        <section className="mb-6">
          <h2 className="text-zinc-200 text-lg font-medium mb-2">El campo</h2>
          <p className="text-zinc-400 whitespace-pre-line">{c.descripcion}</p>
        </section>
      )}

      {c.mejoras && (
        <section className="mb-6">
          <h2 className="text-zinc-200 text-lg font-medium mb-2">Mejoras</h2>
          <p className="text-zinc-400 whitespace-pre-line">{c.mejoras}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Consultar por este campo</h2>
        <ConsultarCampoForm campoId={c.id} resumen={`${fmtHa(c.hectareas)} en ${c.partido || c.provincia}`} />
      </section>

      <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
        <Link href="/campos" className="text-zinc-500 hover:text-accent transition-colors">
          Ver todos los campos →
        </Link>
        <Link href="/campos/publicar" className="text-zinc-500 hover:text-accent transition-colors">
          Publicar el mío
        </Link>
        <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
          Índice de arrendamiento
        </Link>
      </div>
      <p className="text-zinc-500 text-xs mt-4">
        Los datos del campo los declara quien lo ofrece. Verificá superficie, títulos y estado antes de
        cerrar cualquier operación.
      </p>
    </div>
  )
}
