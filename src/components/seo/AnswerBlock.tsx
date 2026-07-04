import type { ReactNode } from 'react'

/**
 * GEO answer-block — a concise, self-contained answer to the page's primary
 * question, rendered right under the H1 so answer engines (Google AI Overviews,
 * featured snippets, AI assistants) can lift it verbatim. The emerging
 * "AI Assistant" traffic channel rewards pages that state the answer cleanly up
 * top.
 *
 * Keep `answer` to ~40-60 words and free of inline links so it stays a clean,
 * extractable unit. The `.speakable-content` class pairs with <SpeakableSchema>
 * (h1 + .speakable-content) for voice/answer surfaces.
 */
export function AnswerBlock({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <div className="mb-6 max-w-2xl rounded-lg border border-sky-500/25 bg-sky-500/[0.04] px-4 py-3">
      <p className="text-xxs font-terminal uppercase tracking-wider text-accent/80 mb-1.5">
        {question}
      </p>
      <p className="speakable-content text-sm text-zinc-200 leading-relaxed">{answer}</p>
    </div>
  )
}
