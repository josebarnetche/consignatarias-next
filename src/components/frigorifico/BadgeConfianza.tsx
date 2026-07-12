/**
 * Escalera de confianza del frigorífico (spec privado §3.4). NO es binario: ordena
 * por confianza y muestra el estado más alto que el establecimiento acredita, con
 * copy honesto. La afirmación de alcance nacional vive SOLO en el estado 3, y sólo
 * si hay constancia verificada por un admin — nunca se deriva del dato scrapeado.
 *
 *  0. No en registro        → gris   "No figura en registro SENASA vigente"
 *  1. En registro           → neutro "Figura en registro SENASA · dato al DD/MM"
 *  2. Reclamado/verificado  → teal   "Perfil verificado por el titular"
 *  3. Provincial verificado → ámbar  "Venta provincial · [Provincia]"
 *  3. Federal verificado    → verde  "Habilitado para envío nacional · Tránsito Federal"
 */
export default function BadgeConfianza({
  senasaActive,
  senasaScrapedDate,
  verified,
  habilitacionNivel,
  habilitacionVerificada,
  province,
}: {
  senasaActive: boolean
  senasaScrapedDate: string | null
  verified: boolean
  habilitacionNivel: string | null
  habilitacionVerificada: boolean
  province: string
}) {
  const base = 'inline-flex items-center gap-1.5 text-xxs font-terminal px-2 py-1 rounded-terminal border'

  // Estado 3 — habilitación verificada por constancia (la única que afirma alcance).
  if (habilitacionVerificada && habilitacionNivel === 'nacional') {
    return (
      <span className={`${base} border-positive/40 text-positive`}>
        <span aria-hidden>✓</span> Habilitado para envío nacional · Tránsito Federal
      </span>
    )
  }
  if (habilitacionVerificada && habilitacionNivel === 'provincial') {
    return (
      <span className={`${base} border-amber-500/40 text-amber-300`}>
        Venta provincial · {province}
      </span>
    )
  }

  // Estado 2 — perfil reclamado y verificado por el titular (no afirma alcance).
  if (verified) {
    return (
      <span className={`${base} border-sky-500/40 text-sky-300`}>
        <span aria-hidden>✓</span> Perfil verificado por el titular
      </span>
    )
  }

  // Estado 1 — figura en el registro SENASA (dato factual, con fecha). No alcance.
  if (senasaActive) {
    return (
      <span className={`${base} border-terminal-border text-zinc-400`} title="Figura en el registro SENASA scrapeado. No implica alcance de venta nacional.">
        Figura en registro SENASA{senasaScrapedDate ? ` · dato al ${senasaScrapedDate}` : ''}
      </span>
    )
  }

  // Estado 0 — no figura en el registro vigente.
  return (
    <span className={`${base} border-zinc-700 text-zinc-500`}>
      No figura en registro SENASA vigente
    </span>
  )
}
