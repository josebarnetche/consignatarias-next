import type { ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import type { DatosFunciones } from '@/lib/propuesta/funciones'
import type { DatosFirma } from '@/lib/propuesta/datos'
import { RemateFila } from '@/components/remates/RemateFila'
import ProBadge from '@/components/badges/ProBadge'
import OrigenVisitas from '@/components/dashboard/OrigenVisitas'
import CarteraPanel from '@/components/dashboard/CarteraPanel'
import BenchmarkMercado from '@/components/dashboard/BenchmarkMercado'
import PreofertasManager from '@/components/dashboard/PreofertasManager'
import { buildWeeklyNewsletterHtml } from '@/lib/email'
import { CARTERA_MUESTRA, BENCHMARK_MUESTRA, ORIGEN_VISITAS_MUESTRA } from '@/lib/reports/muestras'
import { PREOFERTA_EJEMPLO, OFERTAS_EJEMPLO, LEADS_EJEMPLO } from '@/lib/propuesta/muestras'

/**
 * "Lo que va a ver y usar" — cada función de PRO con la captura de cómo queda dentro
 * del sitio (17-10-2026). Las capturas son los componentes reales renderizados, no
 * imágenes: el calendario con sus remates, el mail semanal tal como sale, el panel.
 * Lo que tiene datos de terceros va con datos de ejemplo y rotulado (ver
 * lib/propuesta/funciones.ts).
 */

/** Marco de navegador alrededor de una captura. */
function Captura({ url, children, ejemplo = false }: { url: string; children: React.ReactNode; ejemplo?: boolean }) {
  return (
    <figure className="propuesta-bloque mt-4 overflow-hidden rounded-xl border border-terminal-border bg-terminal-bg shadow-panel">
      <div className="flex items-center gap-3 border-b border-terminal-border bg-terminal-panel px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="block h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <i className="block h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <i className="block h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </span>
        <span className="flex-1 truncate rounded-md bg-terminal-bg px-3 py-1 text-[11px] text-zinc-500">{url}</span>
        {ejemplo && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-warning">Datos de ejemplo</span>}
      </div>
      <div className="pointer-events-none select-none p-4">{children}</div>
    </figure>
  )
}

function Funcion({
  n,
  titulo,
  para,
  children,
}: {
  n: number
  titulo: string
  /** Para qué le sirve a la firma: dos o tres líneas, sin adjetivos. */
  para: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="propuesta-funcion pt-10 print:break-before-page print:pt-0">
      <p className="text-xs font-semibold tabular-nums text-accent">Función {String(n).padStart(2, '0')}</p>
      <h3 className="mt-1 text-2xl font-semibold leading-tight text-ink">{titulo}</h3>
      <div className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{para}</div>
      {children}
    </article>
  )
}

export default function Funciones({
  profile,
  f,
  firma,
}: {
  profile: ConsignatariaProfile
  f: DatosFunciones
  firma: DatosFirma
}) {
  const slug = profile.canonicalSlug
  const htmlMail = buildWeeklyNewsletterHtml('ejemplo@consignatarias.com.ar', f.newsletter.remates, f.newsletter.total, f.newsletter.semana)
  const origenReal = f.origen && f.origen.total > 0
  let n = 0

  return (
    <div>
      {/* 1 · REMATES DESTACADOS */}
      <Funcion
        n={++n}
        titulo="Sus remates, resaltados en el calendario"
        para={
          <p>
            El productor que busca remate para esta semana recorre el calendario por fecha. Los de una firma PRO
            salen marcados con el sello y el color de la casa, en todos los listados (hoy, semana, mes, provincia) y
            en la ficha de cada remate. Así se ven los próximos de {profile.displayName}:
          </p>
        }
      >
        <Captura url="consignatarias.com.ar/remates/semana">
          <ul className="divide-y divide-terminal-border rounded-terminal border border-terminal-border bg-terminal-panel">
            {f.calendario.map(({ remate, pro }) => (
              <RemateFila key={`${remate.id}-${remate.date}`} remate={remate} conFecha pro={pro} />
            ))}
          </ul>
        </Captura>
      </Funcion>

      {/* 2 · CAMPAÑA DE EMAIL */}
      <Funcion
        n={++n}
        titulo="Una campaña de email por semana, con su remate primero"
        para={
          <>
            <p>
              Cada lunes sale el resumen de remates de la semana
              {f.destinatariosSemanal ? ` a ${f.destinatariosSemanal.toLocaleString('es-AR')} suscriptores` : ''}. Los
              remates de las firmas PRO van arriba, destacados. Queda registrado a cuántos les llegó cada envío y lo ve
              en su panel. Así saldría el próximo:
            </p>
          </>
        }
      >
        <Captura url="Bandeja de entrada · Remates de la semana">
          <iframe
            title="Ejemplo del mail semanal"
            srcDoc={htmlMail}
            className="h-[620px] w-full rounded-terminal border-0"
            loading="eager"
          />
        </Captura>
      </Funcion>

      {/* 3 · DIRECTORIO + IAs */}
      <Funcion
        n={++n}
        titulo="Primera cuando buscan consignataria, también desde una IA"
        para={
          <p>
            En el directorio de {f.provincia ?? 'su provincia'} y en el general, las firmas PRO van primero y con el sello.
            Cuando un asistente de IA (ChatGPT, Claude, Copilot) consulta nuestro directorio por el servidor MCP, la
            respuesta también las pone adelante.
          </p>
        }
      >
        <Captura url={`consignatarias.com.ar/consignatarias${f.provincia ? '/' + f.provincia.toLowerCase().replace(/\s+/g, '-') : ''}`}>
          <ol className="space-y-2">
            {f.directorio.map((d, i) => (
              <li
                key={d.slug}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${d.pro ? 'border border-accent/40 bg-accent/[0.06]' : 'border border-terminal-border'}`}
              >
                <span className="w-4 text-xs tabular-nums text-zinc-500">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-ink">{d.nombre}</span>
                <span className="text-xs text-zinc-500">{d.remates} {d.remates === 1 ? 'remate próximo' : 'remates próximos'}</span>
                {d.pro && <ProBadge size="sm" />}
              </li>
            ))}
          </ol>
        </Captura>
        <Captura url="Respuesta de un asistente de IA · consulta al directorio">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300">
{`find_livestock_broker({ provincia: "${f.provincia ?? '…'}" })

★ PRO · ${profile.displayName} · Consignataria · pro: true
  https://www.consignatarias.com.ar/consignatarias/${slug}
${f.directorio.slice(1).map((d) => `${d.nombre} · Consignataria\n  https://www.consignatarias.com.ar/consignatarias/${d.slug}`).join('\n')}`}
          </pre>
        </Captura>
      </Funcion>

      {/* 4 · PRE-OFERTA */}
      <Funcion
        n={++n}
        titulo="Pre-oferta: compradores identificados antes del martillo"
        para={
          <p>
            Desde su panel arma el remate, sube cada lote con su video y lo publica. El interesado mira el video y deja
            su oferta y su contacto; le llega a usted por mail y queda en el panel. Llega al remate sabiendo quién
            está interesado y en qué lote.
          </p>
        }
      >
        <Captura url="consignatarias.com.ar/dashboard · Pre-ofertas" ejemplo>
          <PreofertasManager slug={slug} esPro inicial={[PREOFERTA_EJEMPLO]} ofertas={OFERTAS_EJEMPLO} />
        </Captura>
      </Funcion>

      {/* 5 · CONSULTAS */}
      <Funcion
        n={++n}
        titulo="Cada consulta, con nombre y contacto"
        para={
          <p>
            Los productores que le escriben desde su ficha o desde su página propia le llegan por mail y quedan en la
            bandeja del panel con el teléfono o el email que dejaron. Sin PRO se ve que existe la consulta, pero no el
            contacto.
          </p>
        }
      >
        <Captura url="consignatarias.com.ar/dashboard · Leads" ejemplo>
          <ul className="divide-y divide-terminal-border rounded-terminal border border-terminal-border bg-terminal-panel text-sm">
            {LEADS_EJEMPLO.map(([nombre, contacto, msg, cuando]) => (
              <li key={nombre} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{nombre}</span>
                  <span className="text-xs text-zinc-500">{cuando}</span>
                </div>
                <p className="text-xs font-semibold text-accent">{contacto}</p>
                <p className="mt-1 text-xs text-zinc-400">{msg}</p>
              </li>
            ))}
          </ul>
        </Captura>
      </Funcion>

      {/* 6 · QUIÉN TE MIRA */}
      <Funcion
        n={++n}
        titulo="Quién lo mira, qué día y desde dónde"
        para={
          <p>
            Las vistas de su ficha día por día, de dónde llegan (Google, el calendario, el directorio, una IA, directo o
            QR) y qué día lo miran más.{' '}
            {origenReal ? `Estos son los números reales de ${profile.displayName} de los últimos 30 días:` : 'Así se ve el bloque:'}
          </p>
        }
      >
        <Captura url="consignatarias.com.ar/dashboard · Quién te mira" ejemplo={!origenReal}>
          <OrigenVisitas d={origenReal ? f.origen! : ORIGEN_VISITAS_MUESTRA} />
        </Captura>
      </Funcion>

      {/* 7 · CAÑUELAS (sólo si opera ahí) */}
      {firma.mag && (
        <Funcion
          n={++n}
          titulo="Su negocio contra el Mercado de Cañuelas"
          para={
            <p>
              Cruzamos las operaciones que el Mercado Agroganadero publica lote por lote —las 22 casas, cada día de
              remate— contra las suyas: qué remitentes dejaron de consignarle, a qué precio vendió contra el promedio,
              categoría por categoría, y su cuota. Su sistema sabe a quién le facturó; esto le dice qué hizo el resto.
            </p>
          }
        >
          <Captura url="consignatarias.com.ar/dashboard · Mercado" ejemplo>
            <CarteraPanel c={CARTERA_MUESTRA} />
            <BenchmarkMercado b={BENCHMARK_MUESTRA} />
          </Captura>
        </Funcion>
      )}

      {/* 8 · WIDGET + QR */}
      <Funcion
        n={++n}
        titulo="Sus remates en su web y en sus catálogos"
        para={
          <p>
            Un widget que muestra sus próximos remates en su propia página web, actualizado solo, y un QR para el
            catálogo y la feria que lleva a su página en el sitio, con su logo, el sello y el formulario de consulta.
          </p>
        }
      >
        <Captura url={`su-sitio-web.com.ar · consignatarias.com.ar/go/${slug}`}>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://www.consignatarias.com.ar/go/${slug}?utm_source=qr`)}`}
              alt={`QR de ${profile.displayName}`}
              width={150}
              height={150}
              className="rounded-lg bg-white p-2"
            />
            <iframe
              title="Widget de remates"
              src={`/api/widget/${slug}?theme=light&max=3`}
              className="h-[300px] w-full max-w-[400px] rounded-terminal border border-terminal-border"
              loading="eager"
            />
          </div>
        </Captura>
      </Funcion>

      {/* 9 · REPORTE MENSUAL */}
      <Funcion
        n={++n}
        titulo="Un reporte cada mes, sin entrar al sitio"
        para={<p>El primer día de cada mes le llega por mail el resumen del mes anterior:</p>}
      >
        <Captura url="Bandeja de entrada · Tu mes en consignatarias.com.ar">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Vistas de su perfil', firma.vistas30 ?? '—'],
                ['Visitas desde asistentes de IA', firma.ia90?.total ?? '—'],
                ['Consultas recibidas', firma.consultas90 ?? '—'],
                ['Envíos con sus remates', 'newsletter semanal'],
              ].map(([k, v]) => (
                <tr key={String(k)} className="border-b border-terminal-border">
                  <td className="py-2.5 text-zinc-400">{k}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-ink">{typeof v === 'number' ? v.toLocaleString('es-AR') : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-zinc-500">Cifras de hoy de {profile.displayName}, como referencia del formato.</p>
        </Captura>
      </Funcion>
    </div>
  )
}
