/**
 * Preguntas frecuentes VISIBLES. Toda página que emite FAQPageSchema tiene que
 * mostrar las mismas preguntas y respuestas (pautas de Google para datos
 * estructurados: el markup describe contenido que el usuario ve). Pasale el mismo
 * array que a <FAQPageSchema items={...}>.
 *
 * Server component, sin JS: <details>/<summary> nativos, accesibles con teclado.
 */
export interface FaqItem {
  question: string
  answer: string
}

export function FaqList({
  items,
  titulo = 'Preguntas frecuentes',
  id = 'preguntas-frecuentes',
  className = '',
}: {
  items: FaqItem[]
  titulo?: string
  id?: string
  className?: string
}) {
  if (!items.length) return null
  return (
    <section aria-labelledby={id} className={`terminal-panel ${className}`}>
      <h2 id={id} className="px-panel pt-4 pb-2 text-base font-semibold text-ink">
        {titulo}
      </h2>
      <div className="divide-y divide-terminal-border">
        {items.map((it) => (
          <details key={it.question} className="group px-panel py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium text-zinc-200 hover:text-accent [&::-webkit-details-marker]:hidden">
              <span>{it.question}</span>
              <span aria-hidden className="mt-0.5 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{it.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default FaqList
