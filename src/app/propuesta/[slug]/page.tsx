import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'
import { BENEFICIOS_PRO_CONSIGNATARIA } from '@/lib/pro-consignataria-beneficios'
import { ISO_RING } from '@/lib/og/brand'
import { tokenPropuestaValido } from '@/lib/propuesta/token'
import { getDatosFirma, getDatosSitio } from '@/lib/propuesta/datos'
import IdentityMark from '@/components/consignataria/IdentityMark'
import BotonPdf from './BotonPdf'
import Funciones from './Funciones'
import { getDatosFunciones } from '@/lib/propuesta/funciones'
import { esAdmin } from '@/lib/propuesta/admin'

/**
 * Propuesta PRO Consignataria, personalizada por firma.
 *
 * Fuera del grupo (terminal) a propósito: es un documento que se manda a una firma,
 * no una página del sitio — sin menú, sin reloj, sin banners. Se lee en pantalla o
 * se guarda como PDF con el diálogo de impresión (ver los estilos de impresión al
 * final). Los datos se leen en el momento: cada vez que se abre el link, la firma
 * ve sus números al día.
 *
 * Acceso: `?t=` firmado (src/lib/propuesta/token.ts) o sesión de admin. Cualquier
 * otro caso es 404, no 403: no confirmamos que exista una propuesta para esa firma.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Propuesta PRO Consignataria · consignatarias.com.ar' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

const RESERVAR_REUNION = 'https://calendar.app.google/gr2BXY1ooDMki8TK7'
const CONTACTO_EMAIL = 'agro@memola.com.ar'
const SITIO = 'https://www.consignatarias.com.ar'
const PRECIO_MENSUAL = 45_000
const NOTA_MAX = 600
const CONTACTO_MAX = 80

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string; contacto?: string; nota?: string }>
}

const num = (n: number) => n.toLocaleString('es-AR')

function fechaLarga(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function fechaCorta(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** Texto plano: sin saltos raros ni espacios repetidos, recortado. */
function textoPlano(s: string | undefined, max: number): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/* ------------------------------------------------------------------ */
/*  PIEZAS                                                             */
/* ------------------------------------------------------------------ */

function Marca() {
  return (
    <div className="flex items-center gap-3">
      {/* Isotipo oficial: misma geometría que src/lib/og/brand.tsx (marca v2.0). */}
      <svg viewBox="0 0 512 512" className="h-9 w-9" aria-hidden="true">
        <path d={ISO_RING} className="fill-ink" />
        <rect x="379.7" y="168.1" width="118" height="118" className="fill-accent" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-ink lowercase">
        consignatarias<span className="text-accent">.</span>com<span className="text-accent">.</span>ar
      </span>
    </div>
  )
}

function Seccion({
  numero,
  titulo,
  children,
  saltoAntes = true,
}: {
  numero: string
  titulo: string
  children: React.ReactNode
  saltoAntes?: boolean
}) {
  return (
    <section className={`propuesta-seccion pt-10 ${saltoAntes ? 'print:break-before-page print:pt-0' : ''}`}>
      <div className="mb-5 flex items-baseline gap-3 border-b border-terminal-border pb-2">
        <span className="text-xs font-semibold tabular-nums text-accent">{numero}</span>
        <h2 className="text-xl font-semibold text-ink">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

/** Una cifra con su período y su fuente, en una fila de tabla. */
function Fila({ dato, valor, detalle }: { dato: string; valor: string; detalle: string }) {
  return (
    <tr className="border-b border-terminal-border align-top">
      <td className="py-3 pr-4 text-sm text-zinc-300">
        {dato}
        {/* En el teléfono la tercera columna no entra: el detalle va debajo del dato. */}
        <span className="mt-1 block text-xs text-zinc-500 sm:hidden">{detalle}</span>
      </td>
      <td className="py-3 pr-4 text-right text-lg font-semibold tabular-nums text-ink whitespace-nowrap sm:pr-4">{valor}</td>
      <td className="hidden py-3 text-xs text-zinc-500 sm:table-cell">{detalle}</td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  PÁGINA                                                             */
/* ------------------------------------------------------------------ */

export default async function PropuestaPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const canonical = getCanonicalSlug(slug)
  const profile = canonical ? getProfile(canonical) : null
  if (!profile) notFound()

  // El token se firma sobre el slug canónico: un link con un alias no vale.
  const autorizado = (slug === profile.canonicalSlug && tokenPropuestaValido(profile.canonicalSlug, sp.t)) || (await esAdmin())
  if (!autorizado) notFound()

  const contacto = textoPlano(sp.contacto, CONTACTO_MAX)
  const nota = textoPlano(sp.nota, NOTA_MAX)

  const [firma, sitio, funciones] = await Promise.all([getDatosFirma(profile), getDatosSitio(), getDatosFunciones(profile)])
  const generado = new Date()
  const hoyTexto = generado.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const generadoHora = generado.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

  const ficha = `${SITIO}/consignatarias/${profile.canonicalSlug}`
  // El PDF real (generado en el servidor) con el mismo token y destinatario que esta página.
  const qPdf = new URLSearchParams()
  if (sp.t) qPdf.set('t', sp.t)
  if (contacto) qPdf.set('contacto', contacto)
  const linkPdf = `/api/propuesta/${profile.canonicalSlug}/pdf${qPdf.toString() ? `?${qPdf}` : ''}`
  const activar = `${ficha}/activar`
  const beneficios = [...BENEFICIOS_PRO_CONSIGNATARIA]

  const proximosVisibles = firma.proximos.slice(0, 6)

  return (
    <div className="propuesta-root min-h-screen bg-terminal-bg font-heading text-ink print:bg-terminal-panel">
      {/* Documento en tema claro siempre: se imprime y se manda, y el oscuro del
          terminal no es papel. Se saca data-theme del <html> (lo pone el script del
          layout si el visitante eligió oscuro) sin tocar su preferencia guardada. */}
      <script
        dangerouslySetInnerHTML={{ __html: `document.documentElement.removeAttribute('data-theme')` }}
      />
      <style
        // Estilos de impresión y aislamiento del documento. Sin colores: todo
        // color sale de los tokens del tema claro.
        dangerouslySetInnerHTML={{
          __html: `
            body:has(> .propuesta-root) > :not(.propuesta-root):not(script):not(style) { display: none !important; }
            @page { size: A4; margin: 16mm 16mm 18mm; }
            @media print {
              html, body { background: rgb(var(--t-panel)) !important; }
              .propuesta-root { min-height: 0 !important; }
              .propuesta-hoja { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; margin: 0 !important; }
              .propuesta-seccion { break-inside: auto; }
              .propuesta-seccion table, .propuesta-seccion li, .propuesta-bloque { break-inside: avoid; }
              .propuesta-funcion figure { break-inside: avoid; }
              .propuesta-portada { min-height: 245mm !important; }
              a { text-decoration: none !important; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `,
        }}
      />

      {/* Barra de acciones: sólo en pantalla. */}
      <div className="print:hidden sticky top-0 z-10 border-b border-terminal-border bg-terminal-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-2">
          <span className="truncate text-xs text-zinc-500">Propuesta PRO · {profile.displayName}</span>
          <BotonPdf href={linkPdf} />
        </div>
      </div>

      <main className="propuesta-hoja mx-auto my-6 max-w-[210mm] bg-terminal-panel px-6 py-10 shadow-panel sm:px-14 sm:py-14 rounded-lg print:my-0">
        {/* 1 · PORTADA */}
        <header className="propuesta-portada flex min-h-[70vh] flex-col justify-between gap-12">
          <Marca />

          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Propuesta comercial</p>
            <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">Propuesta PRO Consignataria</h1>
            <div className="flex items-center gap-5">
              {/* IdentityMark resuelve los logos blancos (van sobre el color de marca de
                  la firma, no sobre papel, donde desaparecerían). */}
              {firma.logoUrl && (
                <IdentityMark slug={profile.canonicalSlug} name={profile.displayName} logoUrl={firma.logoUrl} size={80} />
              )}
              <div>
                <p className="text-2xl font-semibold text-ink">{profile.displayName}</p>
                {contacto && <p className="mt-1 text-sm text-zinc-400">Para: {contacto}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-terminal-border pt-5 text-sm text-zinc-400">
            <p>{hoyTexto.charAt(0).toUpperCase() + hoyTexto.slice(1)}</p>
            <p>Preparada por Memola Medios SAS · consignatarias.com.ar</p>
          </div>
        </header>

        {nota && (
          <div className="propuesta-bloque mt-10 border-l-2 border-accent pl-5 print:mt-0 print:break-before-page">
            <p className="whitespace-pre-line text-base leading-relaxed text-zinc-200">{nota}</p>
          </div>
        )}

        {/* 2 · LA FIRMA HOY */}
        {/* Con nota, el salto de página va antes de la nota y la sección 01 la sigue en la misma hoja. */}
        <Seccion numero="01" titulo="Su firma hoy en consignatarias.com.ar" saltoAntes={!nota}>
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">
            Lo que el sitio registra hoy sobre {profile.displayName}. Cada cifra indica su período y de dónde
            sale.
          </p>
          <table className="w-full border-collapse">
            <tbody>
              <Fila
                dato="Próximos remates publicados en el calendario"
                valor={num(firma.proximos.length)}
                detalle={`Desde hoy · calendario del sitio${firma.proximos.length === 0 ? ' · hoy no hay remates próximos cargados' : ''}`}
              />
              <Fila
                dato="Remates de los últimos 90 días"
                valor={num(firma.remates90)}
                detalle="Calendario del sitio"
              />
              {firma.vistas30 !== null && (
                <Fila
                  dato="Vistas de su ficha"
                  valor={num(firma.vistas30)}
                  detalle="Últimos 30 días · registro propio de visitas a la ficha"
                />
              )}
              {firma.ia90 !== null && (
                <Fila
                  dato="Visitas a su ficha que llegaron desde asistentes de IA"
                  valor={num(firma.ia90.total)}
                  detalle={`Últimos 90 días${
                    firma.ia90.porMotor.length > 0
                      ? ` · ${firma.ia90.porMotor.map((m) => `${m.motor} ${num(m.visitas)}`).join(', ')}`
                      : ''
                  } · registro propio de origen de la visita`}
                />
              )}
              {firma.seguidores !== null && (
                <Fila
                  dato="Personas que siguen a la firma"
                  valor={num(firma.seguidores)}
                  detalle="Total a hoy · usuarios registrados que la marcaron para recibir sus remates"
                />
              )}
              {firma.consultas90 !== null && (
                <Fila
                  dato="Consultas recibidas desde el sitio"
                  valor={num(firma.consultas90)}
                  detalle="Últimos 90 días · formularios y contactos registrados para la firma"
                />
              )}
              {firma.mag && (
                <Fila
                  dato="Cabezas operadas en el Mercado Agroganadero de Cañuelas"
                  valor={num(firma.mag.cabezas)}
                  detalle={`Últimos 30 días · puesto ${firma.mag.puesto} de ${firma.mag.totalCasas} casas activas (${firma.mag.cuota.toLocaleString('es-AR')}% de las cabezas) · lotes publicados por el MAG`}
                />
              )}
            </tbody>
          </table>

          {proximosVisibles.length > 0 && (
            <div className="propuesta-bloque mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Próximos remates en el calendario</p>
              <ul className="divide-y divide-terminal-border border-y border-terminal-border">
                {proximosVisibles.map((r, i) => (
                  <li key={`${r.fecha}-${i}`} className="flex gap-4 py-2 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-zinc-400">{fechaCorta(r.fecha)}</span>
                    <span className="text-zinc-200">
                      {/* Algunos títulos del scrape arrancan con un punto o un guion suelto. */}
                      {r.titulo.replace(/^[\s.·\-–]+/, '')}
                      {r.lugar && <span className="text-zinc-500"> · {r.lugar}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {firma.proximos.length > proximosVisibles.length && (
                <p className="mt-2 text-xs text-zinc-500">
                  Y {num(firma.proximos.length - proximosVisibles.length)} más en {ficha.replace('https://www.', '')}.
                </p>
              )}
            </div>
          )}
        </Seccion>

        {/* 3 · LO QUE VA A VER Y USAR — una función por hoja, con su captura. */}
        <Seccion numero="02" titulo="Lo que va a ver y usar">
          <p className="text-sm leading-relaxed text-zinc-400">
            Cada función de PRO, con la captura de cómo queda dentro del sitio. Donde dice «datos de ejemplo» la
            información es inventada para mostrar el formato; el resto son datos reales de {profile.displayName}.
          </p>
          <ol className="mt-5 grid gap-x-6 gap-y-2 text-sm text-zinc-300 sm:grid-cols-2">
            {beneficios.map((b, i) => (
              <li key={b} className="flex gap-3">
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span>{b}</span>
              </li>
            ))}
          </ol>
          <Funciones profile={profile} f={funciones} firma={firma} />
        </Seccion>

        {/* 4 · EL ALCANCE DEL SITIO */}
        <Seccion numero="03" titulo="El alcance del sitio">
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">
            Dónde aparecen hoy las firmas del directorio. Son cifras del sitio entero, no de una firma en particular.
          </p>
          <table className="w-full border-collapse">
            <tbody>
              <Fila
                dato="Veces que el sitio apareció en una búsqueda de Google"
                valor={num(ALCANCE_GOOGLE.impresiones)}
                detalle={`Del ${fechaLarga(ALCANCE_GOOGLE.desde)} al ${fechaLarga(ALCANCE_GOOGLE.hasta)} · Google Search Console`}
              />
              <Fila
                dato="Clics desde Google al sitio"
                valor={num(ALCANCE_GOOGLE.clics)}
                detalle={`Mismo período · Google Search Console`}
              />
              {sitio.iaMesAnterior && (
                <Fila
                  dato="Visitas que llegaron desde ChatGPT, Copilot, Gemini y otros asistentes de IA"
                  valor={num(sitio.iaMesAnterior.visitas)}
                  detalle={`${sitio.iaMesAnterior.mes} · registro propio de origen de la visita`}
                />
              )}
              {sitio.ia90 !== null && (
                <Fila
                  dato="Visitas desde asistentes de IA"
                  valor={num(sitio.ia90)}
                  detalle="Últimos 90 días · registro propio de origen de la visita"
                />
              )}
              <Fila dato="Consignatarias en el directorio" valor={num(sitio.firmas)} detalle="A hoy · directorio del sitio" />
              <Fila
                dato="Próximos remates en el calendario"
                valor={num(sitio.proximosCalendario)}
                detalle="Desde hoy · todas las firmas"
              />
            </tbody>
          </table>
        </Seccion>

        {/* 5 · INVERSIÓN + 6 · CÓMO EMPEZAMOS (misma hoja al imprimir) */}
        <Seccion numero="04" titulo="Inversión">
          <div className="propuesta-bloque rounded-lg border border-terminal-border p-6">
            <p className="text-3xl font-semibold tabular-nums text-ink">
              ARS {num(PRECIO_MENSUAL)} <span className="text-base font-normal text-zinc-400">por mes</span>
            </p>
            <ul className="mt-4 space-y-1 text-sm text-zinc-300">
              <li>Facturación mensual en pesos, a través de Rebill.</li>
              <li>Sin permanencia: se cancela desde el panel de la firma, sin pedirlo a nadie.</li>
            </ul>
            <p className="mt-5 text-sm text-zinc-400">
              Activación:{' '}
              <a href={activar} className="break-words font-medium text-accent">
                {activar.replace('https://', '')}
              </a>
            </p>
          </div>
        </Seccion>

        <Seccion numero="05" titulo="Cómo empezamos" saltoAntes={false}>
          <ol className="space-y-4 text-sm leading-relaxed text-zinc-200">
            <li className="propuesta-bloque flex gap-4">
              <span className="w-6 shrink-0 font-semibold tabular-nums text-accent">1</span>
              <span>
                Reclamar la ficha de la firma: en{' '}
                <a href={ficha} className="break-words text-accent">
                  {ficha.replace('https://', '')}
                </a>
                , botón «Reclamar». Verificamos que quien la reclama pertenece a la firma.
              </span>
            </li>
            <li className="propuesta-bloque flex gap-4">
              <span className="w-6 shrink-0 font-semibold tabular-nums text-accent">2</span>
              <span>
                Ingresar con su email en{' '}
                <a href={`${SITIO}/login`} className="text-accent">
                  consignatarias.com.ar/login
                </a>
                . Llega un enlace al correo; no hay contraseña.
              </span>
            </li>
            <li className="propuesta-bloque flex gap-4">
              <span className="w-6 shrink-0 font-semibold tabular-nums text-accent">3</span>
              <span>Activar PRO desde el enlace de activación de la sección anterior.</span>
            </li>
            <li className="propuesta-bloque flex gap-4">
              <span className="w-6 shrink-0 font-semibold tabular-nums text-accent">4</span>
              <span>Cargar remates y lotes desde el panel.</span>
            </li>
          </ol>

          <div className="propuesta-bloque mt-8 flex flex-col gap-2 rounded-lg bg-terminal-bg p-5 text-sm text-zinc-300 print:border print:border-terminal-border">
            <p>
              Para cualquier consulta, escribimos y respondemos desde{' '}
              <a href={`mailto:${CONTACTO_EMAIL}`} className="font-medium text-accent">
                {CONTACTO_EMAIL}
              </a>
              .
            </p>
            <p>
              Si prefieren verlo juntos:{' '}
              <a href={RESERVAR_REUNION} className="font-medium text-accent">
                reservar una reunión
              </a>
              <span className="hidden print:inline text-zinc-500"> ({RESERVAR_REUNION.replace('https://', '')})</span>.
            </p>
          </div>
        </Seccion>

        {/* 7 · FUENTES */}
        <footer className="propuesta-bloque mt-12 border-t border-terminal-border pt-5 text-xs leading-relaxed text-zinc-500">
          <p className="mb-1 font-semibold text-zinc-400">Fuentes</p>
          <p>
            Remates: calendario de consignatarias.com.ar, armado con lo que publica cada firma. Vistas, consultas,
            seguidores y visitas desde asistentes de IA: registros propios del sitio. Búsquedas de Google: Google Search
            Console, propiedad consignatarias.com.ar.
            {firma.mag ? ' Cañuelas: lotes publicados por el Mercado Agroganadero (MAG), agregados por casa.' : ''}
          </p>
          <p className="mt-2">Datos generados el {generadoHora} (hora de Argentina).</p>
          <p className="mt-2">Memola Medios SAS · consignatarias.com.ar</p>
        </footer>
      </main>

      <div className="print:hidden pb-10 text-center">
        <BotonPdf href={linkPdf} />
      </div>
    </div>
  )
}
