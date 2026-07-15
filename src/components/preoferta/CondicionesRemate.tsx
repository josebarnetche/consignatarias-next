import type { Preoferta } from '@/lib/data/preofertas'

/* Dossier de condiciones del remate: sanidad, garantías y financiación —
   fiel al catálogo. Transmite que comprás un activo genético serio, no carne.
   Server component (acordeones nativos <details>, sin JS). */

export default function CondicionesRemate({ remate }: { remate: Preoferta }) {
  const c = remate.condiciones
  if (!c) return null

  return (
    <div className="mt-6 space-y-3">
      {/* Franja de confianza */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          'Libre Brucelosis y TBC',
          'Aptitud genital completa',
          'Inmunizado Tristeza (INTA)',
          `Garantía ${c.garantia.plazo.split(' ').slice(0, 2).join(' ')}`,
        ].map((s) => (
          <div key={s} className="flex items-center gap-1.5 rounded-terminal border border-terminal-border bg-black/20 px-2.5 py-2">
            <span className="text-positive text-sm leading-none">✓</span>
            <span className="text-xxs font-terminal uppercase tracking-wide text-zinc-300 leading-tight">{s}</span>
          </div>
        ))}
      </div>

      {/* Sanidad */}
      <details open className="rounded-terminal border border-terminal-border bg-black/20 px-3.5 py-2.5">
        <summary className="cursor-pointer text-xxs font-terminal uppercase tracking-widest text-zinc-400 list-none flex items-center justify-between">
          Sanidad · reproductores controlados <span className="text-zinc-600">▾</span>
        </summary>
        <ul className="mt-2.5 space-y-1.5">
          {c.sanidad.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-zinc-300 leading-snug">
              <span className="text-positive mt-0.5 shrink-0">✓</span><span>{s}</span>
            </li>
          ))}
        </ul>
        {remate.veterinario && (
          <p className="text-zinc-500 text-xs mt-2.5 pt-2 border-t border-terminal-border/60">
            Sanidad y control reproductivo: <b className="text-zinc-300">{remate.veterinario}</b>.
          </p>
        )}
      </details>

      {/* Garantías */}
      <details className="rounded-terminal border border-terminal-border bg-black/20 px-3.5 py-2.5">
        <summary className="cursor-pointer text-xxs font-terminal uppercase tracking-widest text-zinc-400 list-none flex items-center justify-between">
          Garantía de cabaña · {c.garantia.plazo.split(' ').slice(0, 2).join(' ')} <span className="text-zinc-600">▾</span>
        </summary>
        <p className="text-xs text-zinc-500 mt-2.5">{c.garantia.plazo}</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2.5">
          <div>
            <div className="text-xxs font-terminal uppercase tracking-wider text-positive mb-1">Qué cubre</div>
            <p className="text-sm text-zinc-300 leading-snug">{c.garantia.cubre}</p>
          </div>
          <div>
            <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">Qué no cubre</div>
            <p className="text-sm text-zinc-400 leading-snug">{c.garantia.no_cubre}</p>
          </div>
        </div>
        <div className="mt-3 rounded border border-amber-500/30 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200/90 leading-snug">
          <b className="text-amber-100">Plazo de reclamo:</b> {c.garantia.exclusion}
        </div>
      </details>

      {/* Financiación */}
      <details className="rounded-terminal border border-terminal-border bg-black/20 px-3.5 py-2.5">
        <summary className="cursor-pointer text-xxs font-terminal uppercase tracking-widest text-zinc-400 list-none flex items-center justify-between">
          Financiación {remate.flete_gratis && <span className="text-positive normal-case tracking-normal font-sans">· flete gratis</span>} <span className="text-zinc-600">▾</span>
        </summary>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {c.financiacion.puntos.map((p) => (
            <span key={p} className="text-xs font-terminal text-zinc-200 border border-terminal-border rounded-terminal px-2 py-1 bg-black/20">{p}</span>
          ))}
        </div>
        {c.financiacion.nota && <p className="text-sm text-zinc-400 leading-snug mt-2.5">{c.financiacion.nota}</p>}
      </details>
    </div>
  )
}
