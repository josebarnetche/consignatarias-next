import type { Preoferta } from '@/lib/data/preofertas'

/* Dossier de condiciones del remate: sanidad, garantías y financiación —
   fiel al catálogo. Transmite que comprás un activo genético serio, no carne.
   Server component (acordeones nativos <details>, sin JS). */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fmtDia(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export default function CondicionesRemate({ remate }: { remate: Preoferta }) {
  const c = remate.condiciones
  if (!c) return null
  const t = c.financiacion.tasas

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
      <details id="financiacion" open className="rounded-terminal border border-terminal-border bg-black/20 px-3.5 py-2.5 scroll-mt-20">
        <summary className="cursor-pointer text-xxs font-terminal uppercase tracking-widest text-zinc-400 list-none flex items-center justify-between">
          Financiación bancaria {remate.flete_gratis && <span className="text-positive normal-case tracking-normal font-sans">· flete gratis</span>} <span className="text-zinc-600">▾</span>
        </summary>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {c.financiacion.puntos.map((p) => (
            <span key={p} className="text-xs font-terminal text-zinc-200 border border-terminal-border rounded-terminal px-2 py-1 bg-black/20">{p}</span>
          ))}
        </div>
        {c.financiacion.nota && <p className="text-sm text-zinc-400 leading-snug mt-2.5">{c.financiacion.nota}</p>}

        {t && (
          <div className="mt-3.5 space-y-4">
            {/* Tasas en pesos */}
            {t.pesos && (
              <div>
                <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-1.5">Tasas en pesos · TNA</div>
                <div className="overflow-x-auto rounded-terminal border border-terminal-border">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[10px] font-terminal uppercase tracking-wider text-zinc-500 bg-black/30">
                        <th className="text-left py-1.5 px-2.5 font-medium">Canal</th>
                        {t.pesos.columnas.map((col) => (
                          <th key={col} className="text-right py-1.5 px-2.5 font-medium tabular-nums">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.pesos.canales.map((ch) => (
                        <tr key={ch.entidad} className="border-t border-terminal-border/60">
                          <td className="py-1.5 px-2.5 text-zinc-300 whitespace-nowrap">{ch.entidad}</td>
                          {ch.unico ? (
                            <td colSpan={t.pesos!.columnas.length} className="py-1.5 px-2.5 text-right text-zinc-200">
                              <span className="text-zinc-500 mr-1.5 normal-case">{ch.unico.plazo} ·</span>
                              <span className="font-mono tabular-nums text-accent-bright">{ch.unico.tasa}</span>
                            </td>
                          ) : (
                            ch.tasas!.map((v, i) => (
                              <td key={i} className="py-1.5 px-2.5 text-right font-mono tabular-nums text-zinc-100">{v}</td>
                            ))
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {t.pesos.nota && <p className="text-xs text-zinc-500 mt-1.5">{t.pesos.nota}</p>}
              </div>
            )}

            {/* Tasas en dólares */}
            {t.dolares && (
              <div>
                <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-1.5">Tasas en dólares · TNA</div>
                <div className="overflow-x-auto rounded-terminal border border-terminal-border">
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {t.dolares.canales.map((ch, i) => (
                        <tr key={ch.entidad} className={i > 0 ? 'border-t border-terminal-border/60' : ''}>
                          <td className="py-1.5 px-2.5 text-zinc-300 whitespace-nowrap">{ch.entidad}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-zinc-100">{ch.tna}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {t.dolares.nota && <p className="text-xs text-zinc-500 mt-1.5">{t.dolares.nota}</p>}
              </div>
            )}

            {/* Aclaración + prefactura + asesoramiento */}
            <div className="rounded-terminal border border-terminal-border/60 bg-black/20 px-3 py-2.5 space-y-2">
              {t.prefactura_hasta && (
                <p className="text-xs text-amber-200/90 leading-snug">
                  <b className="text-amber-100">Importante:</b> para acceder a estos beneficios hay que solicitar la prefactura antes del <b className="text-amber-100 tabular-nums">{fmtDia(t.prefactura_hasta)}</b>.
                </p>
              )}
              {t.aclaracion && <p className="text-xs text-zinc-500 leading-snug">{t.aclaracion}</p>}
              {t.asesoramiento && t.asesoramiento.length > 0 && (
                <p className="text-xs text-zinc-400 leading-snug">
                  <span className="text-zinc-500">Asesoramiento:</span>{' '}
                  {t.asesoramiento.map((tel, i) => (
                    <span key={tel} className="font-mono text-zinc-300">{tel}{i < t.asesoramiento!.length - 1 ? ' · ' : ''}</span>
                  ))}
                </p>
              )}
            </div>
          </div>
        )}
      </details>
    </div>
  )
}
