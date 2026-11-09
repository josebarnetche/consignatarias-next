import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEdicion, getEdiciones } from '@/lib/el-corredor-archivo'
import { absoluta, fechaLarga, mensajeWhatsApp, vecinas, SITE } from '@/lib/el-corredor-ediciones'
import { ReportSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import { CitaBlock } from '@/components/seo/CitaBlock'
import Compartir from '@/components/Compartir'
import { SubscribeForm } from '../SubscribeForm'
import { AccionesPieza, BotonPdf } from './Acciones'

/**
 * /el-corredor/[edicion] — una página por edición (p. ej. /el-corredor/octubre-2026).
 *
 * Hasta acá cada edición era solo un PDF: no se indexaba, no se citaba y no se podía
 * mandar un link que dijera algo sin abrirlo. Acá van los cinco hechos del mes en
 * HTML (texto que lee Google y un agente), la tapa, el PDF, las piezas para compartir
 * (si el manifest las trae), la cita lista para copiar y una tarjeta OG propia.
 *
 * Estática: una ruta por edición del manifest. Una edición nueva entra con su commit
 * y su deploy, así que no hace falta ISR.
 */

export const dynamicParams = false

export function generateStaticParams() {
  return getEdiciones().map((e) => ({ edicion: e.slug }))
}

type Props = { params: Promise<{ edicion: string }> }

const resumenMeta = (hechos: string[]) =>
  hechos.length ? hechos.slice(0, 2).join(' ') : 'Cierre mensual del mercado de hacienda argentino: Índice Novillo, dólares, banda de precios y ciclo.'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { edicion } = await params
  const e = getEdicion(edicion)
  if (!e) return {}
  const title = `El Corredor ${e.titulo} — cierre del mercado de hacienda`
  const description = resumenMeta(e.hechos).slice(0, 300)
  return {
    title: { absolute: `${title} | Consignatarias` },
    description,
    alternates: { canonical: e.url },
    openGraph: { title, description, url: e.url, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function EdicionPage({ params }: Props) {
  const { edicion } = await params
  const e = getEdicion(edicion)
  if (!e) notFound()

  const todas = getEdiciones()
  const { anterior, siguiente } = vecinas(todas, e.ym)
  const publicada = fechaLarga(e.publicadaEl)
  const igs = e.piezas.filter((p) => p.tipo === 'ig')
  const estados = e.piezas.filter((p) => p.tipo === 'estado')

  return (
    <div className="min-h-screen bg-zinc-950">
      <SectionBreadcrumbSchema section="el-corredor" sectionName="El Corredor" pageName={e.titulo} pagePath={e.path} />
      <ReportSchema
        name={`El Corredor — ${e.titulo}`}
        description={`Cierre mensual del mercado de hacienda argentino, edición ${e.numero}. ${resumenMeta(e.hechos)}`}
        url={e.url}
        reportNumber={e.numero}
        datePublished={e.publicadaEl}
        image={e.ogPath ? absoluta(e.ogPath) : null}
        pdfUrl={absoluta(e.pdfPath)}
        serie={{ name: 'El Corredor', url: `${SITE}/el-corredor` }}
        hechos={e.hechos}
        temporalCoverage={e.ym}
        citas={[
          { name: 'Mercado Agroganadero de Cañuelas (INMAG y lotes operados)', url: 'https://www.mercadoagroganadero.com.ar' },
          { name: 'MAGYP — faena y existencias', url: 'https://www.magyp.gob.ar' },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 lg:pt-12">
        <nav className="mb-6 text-xs font-mono text-zinc-500" aria-label="Ruta">
          <Link href="/el-corredor" className="hover:text-zinc-300">El Corredor</Link>
          <span className="mx-2 text-zinc-700">/</span>
          <span className="text-zinc-400">Edición {e.numero}</span>
        </nav>

        <header className="mb-8">
          <div className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
            Cierre mensual · edición {e.numero}
            {e.esVigente && <span className="ml-2 text-sky-400">· la más reciente</span>}
          </div>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            El Corredor · {e.titulo}
          </h1>
          {publicada && <p className="mt-3 text-sm font-mono text-zinc-500">Publicado el {publicada}.</p>}
        </header>

        <div className="grid gap-8 md:grid-cols-[1fr_220px] md:items-start">
          {/* Los hechos van primero: en el teléfono es lo que se lee sin bajar. */}
          <section aria-labelledby="hechos">
            <h2 id="hechos" className="mb-1 font-mono text-lg font-semibold text-ink">
              {e.hechos.length ? 'Los cinco hechos del mes' : 'Esta edición'}
            </h2>
            {e.hechos.length > 0 ? (
              <>
                <p className="mb-5 text-sm font-mono text-zinc-500">Con el número y la fuente detrás de cada uno.</p>
                <ol className="space-y-4">
                  {e.hechos.map((h, i) => (
                    <li key={i} className="flex gap-3 border-l-2 border-sky-400/60 pl-4">
                      <span className="font-mono text-sm font-bold text-sky-400 tabular-nums">{i + 1}</span>
                      <p className="font-mono text-sm leading-relaxed text-zinc-200 sm:text-base">{h}</p>
                    </li>
                  ))}
                </ol>
                {e.faltantes.length > 0 && (
                  <p className="mt-5 rounded-terminal border border-zinc-800 bg-zinc-900/40 p-3 text-xs font-mono leading-relaxed text-zinc-400">
                    Lo que esta edición no pudo medir: {e.faltantes.join(', ')}. Preferimos declararlo a completarlo con una estimación.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm font-mono leading-relaxed text-zinc-400">
                Esta edición se publicó solo en PDF, con el formato anterior del informe. El resumen en página empieza con la
                edición de septiembre de 2026.
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <BotonPdf href={e.pdfPath} ym={e.ym} origen="edicion" />
              <Compartir
                titulo={`El Corredor · ${e.titulo}`}
                path={e.path}
                resumen={e.hechos[0]}
              />
            </div>
          </section>

          {e.coverPath && (
            <a href={e.pdfPath} target="_blank" rel="noopener" className="order-first block md:order-none" aria-label={`Abrir el PDF de ${e.titulo}`}>
              <Image
                src={e.coverPath}
                alt={`Tapa de El Corredor, ${e.titulo}`}
                width={384}
                height={512}
                className="mx-auto h-auto w-40 rounded border border-zinc-800 shadow-lg md:w-full"
                priority
              />
            </a>
          )}
        </div>

        {e.piezas.length > 0 && (
          <section className="mt-14" aria-labelledby="piezas">
            <h2 id="piezas" className="mb-1 font-mono text-lg font-semibold text-ink">Para compartir</h2>
            <p className="mb-6 text-sm font-mono text-zinc-500">
              Imágenes listas para el estado de WhatsApp o el feed. Cada una lleva la fuente adentro.
            </p>
            {[{ titulo: 'Estados de WhatsApp', lista: estados, clase: 'aspect-[9/16]' }, { titulo: 'Feed (4:5)', lista: igs, clase: 'aspect-[4/5]' }]
              .filter((g) => g.lista.length > 0)
              .map((g) => (
                <div key={g.titulo} className="mb-8">
                  <h3 className="mb-3 text-xs font-mono uppercase tracking-widest text-zinc-500">{g.titulo}</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {g.lista.map((p) => {
                      const nombre = p.ruta.split('/').pop() || `el-corredor-${e.slug}.png`
                      return (
                        <figure key={p.ruta} className="flex flex-col gap-2">
                          <div className={`relative ${g.clase} overflow-hidden rounded border border-zinc-800 bg-zinc-900`}>
                            <Image src={p.ruta} alt={p.titulo} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover" />
                          </div>
                          <figcaption className="text-xs font-mono text-zinc-400">{p.titulo}</figcaption>
                          <AccionesPieza
                            ruta={p.ruta}
                            url={e.url}
                            nombreArchivo={nombre}
                            mensaje={mensajeWhatsApp(e, p)}
                            ym={e.ym}
                            tipo={p.tipo}
                          />
                        </figure>
                      )
                    })}
                  </div>
                </div>
              ))}
          </section>
        )}

        <section className="mt-14" aria-labelledby="citar">
          <h2 id="citar" className="mb-3 font-mono text-lg font-semibold text-ink">Para citar esta edición</h2>
          <CitaBlock citation={e.cita} sourceUrl={e.url} />
          <p className="text-xs font-mono text-zinc-500">
            Los datos se pueden reproducir con esta cita. Condiciones en{' '}
            <Link href="/licencia-datos" className="underline hover:text-zinc-300">licencia de datos</Link>.
          </p>
        </section>

        <section className="mt-14 border-t border-zinc-800 pt-10" aria-labelledby="recibir">
          <h2 id="recibir" className="mb-2 font-mono text-lg font-semibold text-ink">Recibí la próxima edición</h2>
          <p className="mb-5 text-sm font-mono text-zinc-400">Sale el primer día hábil de cada mes. Gratis, por correo.</p>
          {/* source "hero": si entra con Google, la vuelta cae en /el-corredor y es el formulario "hero" el que completa el alta. */}
          <SubscribeForm source="hero" />
        </section>

        <nav className="mt-14 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-6 text-sm font-mono" aria-label="Otras ediciones">
          <div>
            {anterior && (
              <Link href={anterior.path} className="text-zinc-400 hover:text-ink">
                ← {anterior.titulo}
              </Link>
            )}
          </div>
          <div className="text-right">
            {siguiente && (
              <Link href={siguiente.path} className="text-zinc-400 hover:text-ink">
                {siguiente.titulo} →
              </Link>
            )}
          </div>
          <div className="col-span-2 text-center">
            <Link href="/el-corredor#archivo" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
              Todas las ediciones
            </Link>
          </div>
        </nav>
      </div>
    </div>
  )
}
