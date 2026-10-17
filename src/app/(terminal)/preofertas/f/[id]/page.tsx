import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { getPreofertaFirmaPublica, urlPreofertaFirma, type LoteFirma } from '@/lib/preofertas-firma'
import { preofertaAbierta, videoDelLote } from '@/lib/validators/preoferta-firma'
import { cierreCorto, fechaCorta } from '@/components/PreofertasFirmaLista'
import OfertaLoteForm from './OfertaLoteForm'

const BASE = 'https://www.consignatarias.com.ar'

// Ficha pública de una pre-oferta cargada por la firma (17-10-2026). No lee cookies:
// el formulario no pide sesión. ISR corto + revalidatePath desde las rutas del dueño
// (cada edición, publicación o cierre la refresca al instante).
export const revalidate = 300

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const p = await getPreofertaFirmaPublica(createServiceClient(), id)
  if (!p) return { title: 'Pre-oferta', robots: { index: false, follow: false } }
  const title = `Pre-oferta · ${p.titulo}`
  const description = `${p.consignataria_nombre}: ${p.lotes.length} ${p.lotes.length === 1 ? 'lote' : 'lotes'} del remate del ${fechaCorta(p.fecha_remate)}${p.lugar ? ` en ${p.lugar}` : ''}. Mirá los videos y dejá tu oferta antes del remate.`
  const url = `${BASE}${urlPreofertaFirma(p.id)}`
  // Cerrada = registro, no destino: noindex (el sitemap tampoco la ofrece).
  const abierta = preofertaAbierta(p, Date.now())
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    ...(!abierta && { robots: { index: false, follow: true } }),
  }
}

function fmtPesos(n: number): string {
  return '$ ' + n.toLocaleString('es-AR')
}

function VideoLote({ lote }: { lote: LoteFirma }) {
  const v = videoDelLote(lote.video_url)
  if (!v) return null
  if (v.tipo === 'drive') {
    return (
      <a
        href={v.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-terminal text-accent hover:text-ink"
      >
        Ver el video del lote &rarr;
      </a>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-terminal border border-terminal-border bg-zinc-950" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={v.embed}
        title={`Video · ${lote.titulo}`}
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export default async function PreofertaFirmaPage({ params }: Props) {
  const { id } = await params
  const p = await getPreofertaFirmaPublica(createServiceClient(), id)
  if (!p) notFound()
  const abierta = preofertaAbierta(p, Date.now())

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-xxs font-terminal text-zinc-500 mb-3">
        <Link href="/preofertas" className="hover:text-zinc-300">Pre-ofertas</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-zinc-400">{p.consignataria_nombre}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-heading text-zinc-100">{p.titulo}</h1>
      <p className="text-zinc-400 text-data mt-1">
        <Link href={`/consignatarias/${p.consignataria_slug}`} className="hover:text-ink">{p.consignataria_nombre}</Link>
        {' · '}Remate del {fechaCorta(p.fecha_remate)}{p.lugar ? ` en ${p.lugar}` : ''}
      </p>

      <div
        className={`mt-4 rounded-terminal border px-3.5 py-2.5 text-sm ${
          abierta ? 'border-positive/40 bg-positive/[0.06] text-zinc-200' : 'border-terminal-border bg-zinc-900/40 text-zinc-400'
        }`}
      >
        {abierta
          ? <>Recibe ofertas hasta el <strong className="text-zinc-100">{cierreCorto(p.cierre)}</strong>. La oferta no es vinculante: la consignataria te contacta antes del remate.</>
          : <>La pre-oferta cerró el {cierreCorto(p.cierre)}. Los lotes quedan publicados como referencia del remate.</>}
      </div>

      {p.condiciones && (
        <section className="mt-5">
          <h2 className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-1.5">Condiciones</h2>
          <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{p.condiciones}</p>
        </section>
      )}

      <section className="mt-6 space-y-5" aria-label="Lotes">
        {p.lotes.map((l, i) => (
          <article key={l.id} id={`lote-${l.id}`} className="rounded-terminal border border-terminal-border bg-zinc-900/40 p-4 scroll-mt-20">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                <span className="text-zinc-500 font-terminal text-sm mr-2 tabular-nums">#{i + 1}</span>{l.titulo}
              </h2>
              {l.precio_base != null && (
                <span className="text-sm font-terminal tabular-nums text-zinc-300">Base {fmtPesos(l.precio_base)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-zinc-400">
              {l.categoria && <span>{l.categoria}</span>}
              {l.cabezas != null && <span className="tabular-nums">{l.cabezas.toLocaleString('es-AR')} {l.cabezas === 1 ? 'cabeza' : 'cabezas'}</span>}
              {l.peso_kg != null && <span className="tabular-nums">{l.peso_kg.toLocaleString('es-AR')} kg</span>}
            </div>
            {l.descripcion && <p className="mt-2 text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{l.descripcion}</p>}
            {l.video_url && <div className="mt-3"><VideoLote lote={l} /></div>}
            {abierta && (
              <div className="mt-4 border-t border-terminal-border pt-4">
                <OfertaLoteForm preofertaId={p.id} loteId={l.id} loteTitulo={l.titulo} />
              </div>
            )}
          </article>
        ))}
      </section>

      <p className="mt-6 text-xxs text-zinc-500 leading-relaxed">
        Tus datos le llegan solo a {p.consignataria_nombre}; no se publican. consignatarias.com.ar no es parte de la operación.
      </p>
    </div>
  )
}
