import Link from 'next/link'

/**
 * Conversion CTA for the SEO price pages. They were data-only and bounced every
 * organic visitor (no path toward signup/value). Advances the visitor to the
 * (instrumented) calculator lead funnel + the consignataria directory.
 */
export function PriceCTA() {
  return (
    <div className="terminal-panel mb-6" style={{ borderColor: 'rgba(56,189,248,0.30)' }}>
      <div className="px-panel py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-zinc-100 text-sm font-medium">¿Vas a vender hacienda?</p>
          <p className="text-zinc-500 text-xs">Calculá tu neto en mano y encontrá la consignataria de tu zona.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/calculadora"
            className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-sky-500/20"
          >
            Calcular neto →
          </Link>
          <Link
            href="/consignatarias"
            className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Ver consignatarias →
          </Link>
        </div>
      </div>
    </div>
  )
}
