import { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { FAQPageSchema } from '@/components/seo/JsonLd'
import RenspaValidator from './RenspaValidator'
import {
  SANIDAD_DISCLAIMER, PLANES, CALENDARIO_AFTOSA_2026, REQUISITOS_MOVIMIENTO,
  ZONAS_AFTOSA, FUENTES, fuentesDe, COMO_FUNCIONA, TRAMITES, FAQ_SANIDAD,
} from '@/lib/data/senasa-sanidad'

export const metadata: Metadata = {
  title: 'Sanidad ganadera SENASA — vacunación, planes y requisitos de movimiento | Consignatarias',
  description:
    'Régimen sanitario del ganado argentino, codificado desde resoluciones SENASA públicas y citado: calendario de vacunación antiaftosa 2026, brucelosis, tuberculosis y garrapata, zonas con/sin vacunación, y requisitos sanitarios para mover hacienda (RENSPA, DT-e, serología).',
  keywords: [
    'SENASA', 'vacunación aftosa 2026', 'calendario aftosa', 'brucelosis bovina', 'tuberculosis bovina',
    'garrapata bovino', 'RENSPA', 'DT-e', 'requisitos movimiento hacienda', 'sanidad ganadera Argentina',
    'zona con vacunación', 'zona sin vacunación', 'Patagonia', 'Res. SENASA 711/2025',
  ],
  alternates: { canonical: 'https://www.consignatarias.com.ar/sanidad' },
}

const zonasSin = ZONAS_AFTOSA.filter((z) => z.estado === 'sin_vacunacion')
const zonasMixtas = ZONAS_AFTOSA.filter((z) => z.estado === 'mixta')

function FuenteLinks({ keys }: { keys: string[] }) {
  const fuentes = fuentesDe(keys)
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xxs">
      {fuentes.map((f) => (
        <a
          key={f.norma}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-bright underline decoration-terminal-border underline-offset-2"
        >
          {f.norma} ↗
        </a>
      ))}
    </div>
  )
}

export default function SanidadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Herramientas', href: '/calculadora' }, { name: 'Sanidad / SENASA' }]} />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Sanidad ganadera · SENASA</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-balance">
          El régimen sanitario del ganado argentino, medido y citado
        </h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          Planes obligatorios, calendario de vacunación antiaftosa 2026, zonas con y sin vacunación, y los
          requisitos sanitarios para mover hacienda — cada regla con su resolución SENASA de origen.
        </p>
      </header>

      {/* Nota de fuentes */}
      <div className="rounded-terminal border border-terminal-border bg-terminal-panel px-4 py-3 text-data text-zinc-400">
        {SANIDAD_DISCLAIMER}
      </div>

      {/* Índice navegable */}
      <nav aria-label="Índice" className="mt-6 flex flex-wrap gap-2 text-xxs">
        {[
          ['#planes', 'Planes sanitarios'],
          ['#aftosa', 'Vacunación aftosa'],
          ['#movimiento', 'Mover hacienda'],
          ['#renspa', 'Validar RENSPA'],
          ['#tramites', 'Trámites'],
          ['#faq', 'Preguntas frecuentes'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-terminal-border bg-terminal-panel px-3 py-1 text-zinc-400 hover:border-accent hover:text-accent transition-colors"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Cómo funciona el sistema */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-4">Cómo funciona el sistema sanitario</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {COMO_FUNCIONA.map((c) => (
            <div key={c.titulo} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
              <h3 className="text-data font-semibold text-white">{c.titulo}</h3>
              <p className="mt-2 text-data text-zinc-400">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planes sanitarios */}
      <section id="planes" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-1">Planes sanitarios obligatorios</h2>
        <p className="text-data text-zinc-500 mb-4">Bovinos y bubalinos. Cada ficha cita su resolución.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLANES.map((p) => (
            <article key={p.id} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-white">{p.enfermedad}</h3>
                {p.zoonosis && (
                  <span className="shrink-0 rounded-sm bg-negative/10 text-negative text-xxs px-1.5 py-0.5 uppercase tracking-wide">
                    Zoonosis
                  </span>
                )}
              </div>
              <p className="mt-1 text-xxs text-zinc-500 italic">{p.agente}</p>
              <dl className="mt-3 space-y-2 text-data text-zinc-300">
                <div>
                  <dt className="text-xxs uppercase tracking-wide text-zinc-500">Régimen</dt>
                  <dd>{p.regimen}</dd>
                </div>
                <div>
                  <dt className="text-xxs uppercase tracking-wide text-zinc-500">Categorías afectadas</dt>
                  <dd>{p.categorias_afectadas}</dd>
                </div>
              </dl>
              <FuenteLinks keys={p.fuentes} />
            </article>
          ))}
        </div>
      </section>

      {/* Calendario aftosa + zonas */}
      <section id="aftosa" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-1">Vacunación antiaftosa 2026</h2>
        <p className="text-data text-zinc-500 mb-4">
          Res. SENASA 711/2025. El día exacto por distrito lo fija el Plan Local del Ente Sanitario.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CALENDARIO_AFTOSA_2026.map((c) => (
            <div key={c.campana} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-white">{c.campana} campaña</h3>
                <span className="text-xxs text-accent">{c.ventana}</span>
              </div>
              <p className="mt-1 text-data text-zinc-200 font-medium">{c.categorias}</p>
              <p className="mt-2 text-data text-zinc-400">{c.detalle}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-terminal border border-terminal-border bg-terminal-panel p-4">
          <h3 className="text-data font-semibold text-white mb-2">Zonas sanitarias</h3>
          <p className="text-data text-zinc-300">
            <span className="text-warning">Zona libre SIN vacunación:</span>{' '}
            {zonasSin.map((z) => z.provincia).join(', ')}.
          </p>
          {zonasMixtas.length > 0 && (
            <ul className="mt-2 space-y-1 text-xxs text-zinc-400">
              {zonasMixtas.map((z) => (
                <li key={z.provincia}>
                  <span className="text-zinc-200">{z.provincia}</span> — {z.nota}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-data text-zinc-300">
            <span className="text-positive">Zona libre CON vacunación:</span> resto del país (norte y centro,
            unificada en mayo 2025).
          </p>
          <FuenteLinks keys={['aftosa_calendario_2026', 'aftosa_plan']} />
        </div>
      </section>

      {/* Requisitos de movimiento */}
      <section id="movimiento" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-1">Requisitos para mover hacienda</h2>
        <p className="text-data text-zinc-500 mb-4">
          Bovinos. El DT-e se emite en SIGSA (requiere clave fiscal ARCA); acá está qué se exige.
        </p>
        <div className="rounded-terminal border border-terminal-border bg-terminal-panel divide-y divide-terminal-border">
          {REQUISITOS_MOVIMIENTO.map((r) => (
            <div key={r.concepto} className="p-4">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-data font-semibold text-white">{r.concepto}</h3>
                <span className="text-xxs text-zinc-500">
                  {fuentesDe(r.fuentes).map((f) => f.norma).join(' · ')}
                </span>
              </div>
              <p className="mt-1 text-data text-zinc-300">{r.regla}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Validador RENSPA (interactivo) */}
      <section id="renspa" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-1">Validar / decodificar un RENSPA</h2>
        <p className="text-data text-zinc-500 mb-4">
          Pegá un código RENSPA (17 caracteres, formato 00.000.0.00000.00) y te lo descompongo en sus
          segmentos. Se valida la estructura, no la vigencia.
        </p>
        <RenspaValidator />
      </section>

      {/* Trámites */}
      <section id="tramites" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-4">Trámites</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRAMITES.map((t) => (
            <a
              key={t.titulo}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-terminal border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors"
            >
              <h3 className="text-data font-semibold text-white group-hover:text-accent">{t.titulo} ↗</h3>
              <p className="mt-1 text-data text-zinc-400">{t.descripcion}</p>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white mb-4">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQ_SANIDAD.map((f) => (
            <details key={f.pregunta} className="rounded-terminal border border-terminal-border bg-terminal-panel p-4 group">
              <summary className="cursor-pointer text-data font-medium text-zinc-100 marker:text-accent list-disc list-inside">
                {f.pregunta}
              </summary>
              <p className="mt-2 text-data text-zinc-400">{f.respuesta}</p>
              {f.fuentes && f.fuentes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 text-xxs">
                  {fuentesDe(f.fuentes).map((x) => (
                    <a key={x.norma} href={x.url} target="_blank" rel="noopener noreferrer" className="text-accent/80 hover:text-accent">
                      {x.norma} ↗
                    </a>
                  ))}
                </div>
              )}
            </details>
          ))}
        </div>
      </section>

      {/* CTA MCP / IA */}
      <section className="mt-10 rounded-terminal border border-accent/30 bg-accent/5 p-5">
        <h2 className="text-base font-semibold text-white">Consultá esto con un agente de IA</h2>
        <p className="mt-2 text-data text-zinc-300">
          Estos datos también se exponen como <span className="text-accent">5 tools MCP</span> —
          <code className="text-accent"> sanidad_plan</code>, <code className="text-accent">sanidad_calendario_aftosa</code>,{' '}
          <code className="text-accent">sanidad_requisitos_movimiento</code>, <code className="text-accent">sanidad_renspa</code> y{' '}
          <code className="text-accent">sanidad_dte_tropa</code> — para que Claude, Cursor u otro agente respondan
          “¿qué tengo que vacunar este mes?” o “¿qué necesito para mover de Corrientes a Buenos Aires?” citando la resolución.
        </p>
        <Link href="/mcp" className="mt-3 inline-block text-data text-accent hover:text-accent-bright underline underline-offset-2">
          Ver el servidor MCP →
        </Link>
      </section>

      {/* Fuentes maestras */}
      <section className="mt-8 border-t border-terminal-border pt-5">
        <h2 className="text-xxs uppercase tracking-widest text-zinc-500 mb-2">Fuentes oficiales</h2>
        <ul className="grid gap-1 sm:grid-cols-2 text-xxs">
          {Object.values(FUENTES).map((f) => (
            <li key={f.norma}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-accent">
                {f.norma} — {f.titulo}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <FAQPageSchema items={FAQ_SANIDAD.map((f) => ({ question: f.pregunta, answer: f.respuesta }))} />
    </div>
  )
}
