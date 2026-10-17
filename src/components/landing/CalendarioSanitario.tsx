import Link from 'next/link'
import CalendarioMensual from '@/components/sanidad/CalendarioMensual'
import { VACUNADOR_2027 } from '@/lib/data/senasa-sanidad'

/**
 * Banda "Calendario sanitario" para la landing. Muestra las campañas de
 * vacunación antiaftosa 2026 (Res. SENASA 711/2025) de forma compacta, el
 * cambio 2027 (Res. SENASA 201/2026: el productor elige el veterinario que
 * vacuna, con plazo de la Disp. DNSA 27/2026) y enlaza a /sanidad. Sin lógica
 * de fecha (SSG): el plazo va con su año; el detalle y las fuentes viven en /sanidad.
 */
export default function CalendarioSanitario() {
  return (
    <section id="calendario-sanitario" className="max-w-7xl mx-auto px-6 pt-24 pb-24">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 claro:bg-terminal-panel claro:shadow-panel p-8 sm:p-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-1 text-xs font-mono uppercase tracking-widest text-emerald-300 claro:border-emerald-600/30 claro:text-emerald-700">
              Sanidad · SENASA
            </span>
            <h2 className="mt-4 text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight">
              Calendario sanitario
            </h2>
            <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-xl">
              Las campañas de vacunación antiaftosa 2026, las zonas con y sin vacunación, y los
              requisitos para mover hacienda — cada regla con su resolución SENASA.
            </p>
          </div>
          <Link
            href="/sanidad"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-accent hover:text-accent transition-colors"
          >
            Ver calendario completo →
          </Link>
        </div>

        {/* Cambio 2027 — Res. SENASA 201/2026. Va arriba del calendario: es lo que
            tiene plazo y lo que el productor tiene que decidir ahora. */}
        <Link
          href="/sanidad#vacunador-2027"
          className="group mb-8 grid gap-4 rounded-xl border border-accent/40 bg-accent/[0.06] p-5 sm:grid-cols-[1fr_auto] sm:items-center hover:border-accent transition-colors"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-accent px-1.5 py-0.5 text-xxs font-semibold uppercase tracking-wide text-zinc-950 claro:text-white">
                Nuevo
              </span>
              <span className="text-xxs text-zinc-500">Res. SENASA 201/2026 · Disp. DNSA 27/2026</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-ink">
              Desde 2027 elegís el veterinario que vacuna contra aftosa y brucelosis
            </h3>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
              Se informa en SIGTrámites de SENASA y el veterinario acreditado acepta. Si no elegís, seguís
              con el Ente Sanitario de tu zona, como hasta ahora.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xxs uppercase tracking-wide text-zinc-500">Plazo para elegir</div>
            <div className="mt-0.5 text-base font-semibold text-accent tabular-nums">15/10 al 15/12/2026</div>
            <div className="mt-1 text-xs text-zinc-400 group-hover:text-accent transition-colors">Cómo funciona →</div>
          </div>
        </Link>

        <CalendarioMensual />

        <p className="mt-6 text-xs text-zinc-600 claro:text-zinc-500">
          Fuente: Res. SENASA 711/2025 (calendario 2026) y Res. SENASA 201/2026 (vacunador desde{' '}
          {VACUNADOR_2027.vigencia.replace('Desde el ', '')}). El día exacto por distrito lo fija el Ente
          Sanitario local. Detalle, brucelosis, garrapata y requisitos de movimiento en{' '}
          <Link href="/sanidad" className="text-zinc-400 hover:text-accent underline underline-offset-2">
            /sanidad
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
