'use client'

/**
 * StickyBar — barra de acción fija al pie, solo mobile (md:hidden). Da al productor
 * la única acción siempre a mano: ver el próximo remate y contactar por WhatsApp.
 * Absorbe el WhatsApp FAB flotante (que tapaba el cronograma). En desktop el hero
 * ya expone todo, así que no aparece.
 */
export function StickyBar({
  nextDateLabel,
  isLive,
  whatsapp,
  onSeeRemates,
}: {
  nextDateLabel: string | null
  isLive: boolean
  whatsapp: string | null
  onSeeRemates: () => void
}) {
  if (!nextDateLabel && !whatsapp) return null
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-terminal-border bg-terminal-bg/95 backdrop-blur supports-[backdrop-filter]:bg-terminal-bg/80 px-3 py-2 flex items-center justify-between gap-3">
      {nextDateLabel ? (
        <a
          href="#remates"
          onClick={onSeeRemates}
          className="flex items-center gap-2 min-w-0 text-xxs font-terminal"
        >
          {isLive ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="status-dot-live" />
              <span className="text-positive uppercase tracking-wider">En vivo</span>
            </span>
          ) : (
            <span className="text-zinc-500 uppercase tracking-wider shrink-0">Próximo:</span>
          )}
          <span className="text-zinc-200 tabular-nums truncate">{nextDateLabel}</span>
        </a>
      ) : (
        <span className="text-xxs text-zinc-500 font-terminal">Sin remates programados</span>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-terminal text-xxs font-terminal uppercase tracking-wider text-positive border border-positive/40 hover:bg-positive/10 transition-colors"
        >
          WhatsApp
        </a>
      )}
    </div>
  )
}
