import Link from 'next/link'
import Image from 'next/image'
import manifest from '../../public/el-corredor/manifest.json'
import { ElCorredorInlineForm } from './ElCorredorInlineForm'

type Variant = 'card' | 'banner' | 'inline'

interface Props {
  variant?: Variant
  context?: string
}

// Current edition, read from the manifest so the CTA never goes stale
// (was hardcoded "Abril 2026" + abril cover even after Mayo shipped).
const EDITION = manifest.current.edition_label // e.g. "Mayo · 2026"
const EDITION_MONTH = EDITION.split('·')[0].trim() // "Mayo"
const COVER = manifest.current.cover_path // "/el-corredor/cover-mayo-2026.png"

/**
 * CTA reusable para "El Corredor" — el lead magnet mensual.
 * - card: bloque grande con captura de email INLINE + cover (homepage, /mercado/inmag)
 * - banner: tira horizontal compacta → linkea a /el-corredor (donde está el form completo)
 * - inline: link de texto (footers, fin de listas)
 */
export function ElCorredorCTA({ variant = 'card', context = 'unknown' }: Props) {
  const href = `/el-corredor${context !== 'unknown' ? `?ref=${context}` : ''}`

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm font-mono text-sky-400 hover:text-sky-300 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        Recibí <strong className="font-semibold">El Corredor</strong> · cierre mensual gratis
        <span aria-hidden="true">→</span>
      </Link>
    )
  }

  if (variant === 'banner') {
    return (
      <Link
        href={href}
        className="block group bg-zinc-900/80 border border-sky-500/20 hover:border-sky-400/60 rounded-xl px-4 py-3 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
              <span className="relative rounded-full h-2 w-2 bg-sky-400" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-0.5 truncate">
                Mesa de hacienda · cierre mensual
              </div>
              <div className="text-sm font-mono text-white truncate">
                <strong>El Corredor</strong>
                <span className="text-zinc-500 mx-1.5">·</span>
                <span className="text-zinc-300">Edición {EDITION} disponible</span>
              </div>
            </div>
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-sky-400 group-hover:text-sky-300 whitespace-nowrap shrink-0">
            Recibir PDF →
          </span>
        </div>
      </Link>
    )
  }

  // card (default) — captura inline en /mercado/inmag, homepage, etc.
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-zinc-900/40">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative grid sm:grid-cols-[1fr_auto] gap-6 p-6 lg:p-8 items-center">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
              <span className="relative rounded-full h-2 w-2 bg-sky-400" />
            </span>
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-sky-400 font-semibold">
              Mesa de hacienda · cierre mensual · {EDITION}
            </span>
          </div>

          <h3 className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight mb-2">
            El Corredor
          </h3>

          <p className="text-sm font-mono text-zinc-400 leading-relaxed mb-5 max-w-xl">
            El cierre mensual del mercado bovino argentino. INMAG en USD reales, comparable interanual,
            18 categorías de hacienda del MAG, lectura del ciclo y tesis del mes próximo.
            <span className="text-zinc-300 ml-1">12 páginas · PDF gratis con email.</span>
          </p>

          {/* Inline capture — subscribe right here, no navigation */}
          <ElCorredorInlineForm editionLabel={EDITION_MONTH} context={context} />
        </div>

        <Link href={href} className="hidden sm:block shrink-0">
          <Image
            src={COVER}
            alt={`El Corredor — ${EDITION}`}
            width={144}
            height={192}
            className="w-36 h-auto rounded shadow-xl shadow-black/50 border border-zinc-800 hover:border-sky-500/40 transition-colors"
          />
        </Link>
      </div>
    </div>
  )
}
