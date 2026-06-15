import type { ReactNode } from 'react'

/**
 * <MethodologyMicroBlock> — a native <details> provenance disclosure. Collapses
 * dense methodology/citation prose while keeping it IN the DOM (crawlable +
 * Speakable-weightable via .speakable-content). Server component, zero JS, no deps —
 * so it can also be imported into client components later.
 */
export function MethodologyMicroBlock({
  summary = 'Cómo calculamos esto',
  children,
  defaultOpen = false,
}: {
  summary?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      {...(defaultOpen ? { open: true } : {})}
      className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.04] px-4 py-2.5"
    >
      <summary className="cursor-pointer list-none text-xxs font-terminal uppercase tracking-wider text-amber-500/80 [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="speakable-content mt-2 text-xxs leading-relaxed text-zinc-600">{children}</div>
    </details>
  )
}
