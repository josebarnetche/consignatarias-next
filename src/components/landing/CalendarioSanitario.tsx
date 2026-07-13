import Link from 'next/link'
import CalendarioMensual from '@/components/sanidad/CalendarioMensual'

/**
 * Banda "Calendario sanitario" para la landing. Muestra las campañas de
 * vacunación antiaftosa 2026 (Res. SENASA 711/2025) de forma compacta y
 * enlaza a /sanidad. Sin lógica de fecha (SSG): presenta ambas campañas;
 * el detalle y las fuentes viven en /sanidad.
 */
export default function CalendarioSanitario() {
  return (
    <section id="calendario-sanitario" className="max-w-7xl mx-auto px-6 pt-24 pb-24">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-1 text-xs font-mono uppercase tracking-widest text-emerald-300">
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

        <CalendarioMensual />

        <p className="mt-6 text-xs text-zinc-600">
          Fuente: Res. SENASA 711/2025. El día exacto por distrito lo fija el Ente Sanitario local.
          Detalle, brucelosis, garrapata y requisitos de movimiento en{' '}
          <Link href="/sanidad" className="text-zinc-400 hover:text-accent underline underline-offset-2">
            /sanidad
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
