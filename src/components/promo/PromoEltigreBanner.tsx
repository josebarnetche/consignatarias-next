import Link from 'next/link'
import { getPreoferta } from '@/lib/data/preofertas'
import CorrientesSilueta from '@/components/marca/CorrientesSilueta'

/* Vidriera informativa del 34° Remate Cabaña El Tigre: flyer oficial + los lotes
   de mejor valor (pedigree, con EPD) con su mini-video (YouTube limpio, sin
   controles), los datos del toro, el valor del lote y acceso directo a pre-ofertar.
   Tono informativo, no vendedor. Se auto-oculta al cerrar la pre-oferta. */

const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR')

export default function PromoEltigreBanner() {
  const p = getPreoferta('el-tigre')
  if (!p || Date.now() >= new Date(p.cierre_preoferta).getTime()) return null

  // "mejores valores" = los toros de pedigree (traen EPD), hasta 4.
  const destacados = p.lotes.filter((l) => l.epd && l.video).slice(0, 4)
  if (destacados.length === 0) return null

  return (
    <section aria-label={`Lotes destacados — ${p.remate}`}
      className="rounded-2xl border border-terminal-border overflow-hidden"
      style={{ background: 'linear-gradient(180deg,rgba(109,26,46,.12),transparent 60%)' }}>
      {/* Cabecera informativa: flyer + datos del remate */}
      <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-terminal-border/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/promo/flyer-eltigre.jpg" alt="Flyer 34° Remate Cabaña El Tigre"
          className="w-[52px] sm:w-[64px] rounded-md border border-terminal-border shrink-0" loading="lazy" />
        <div className="min-w-0">
          <div className="text-zinc-100 font-medium leading-snug">34° Remate Anual · Cabaña El Tigre</div>
          <div className="text-zinc-400 text-xs mt-0.5">
            70 toros · vie 17-jul · Soc. Rural de Mercedes · Reggi &amp; Cía
          </div>
          <div className="text-xxs font-terminal uppercase tracking-wider text-positive mt-1 inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" /> Pre-oferta abierta · cierra jue 16-jul 20:00
          </div>
        </div>
        {/* Sello: silueta real de Corrientes + Toros Correntinos */}
        <div className="ml-auto flex items-center gap-2.5 shrink-0 pl-2 border-l border-terminal-border/60">
          <CorrientesSilueta className="w-8 h-8 sm:w-9 sm:h-9 text-accent/80" />
          <div className="leading-none">
            <div className="text-[9px] font-terminal uppercase tracking-[0.18em] text-zinc-500">Toros</div>
            <div className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">Correntinos</div>
            <Link href="/preoferta/el-tigre" className="hidden sm:inline-block mt-0.5 text-[10px] font-terminal uppercase tracking-wider text-accent hover:text-accent-bright">
              Ver los 86 lotes &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Vidriera: lotes de mejor valor con su mini-video */}
      <div className="flex gap-3 p-3 sm:p-4 overflow-x-auto">
        {destacados.map((l) => {
          const valor = l.base ?? p.base
          const pd = l.epd!.pd.v
          const ce = l.epd!.ce.v
          return (
            <div key={l.rp} className="shrink-0 w-[210px] rounded-xl border border-terminal-border bg-black/30 overflow-hidden flex flex-col">
              <div className="relative bg-black" style={{ aspectRatio: '16 / 9' }}>
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay muted loop playsInline preload="metadata"
                >
                  <source src={`/promo/lotes/lote-${l.rp}.mp4`} type="video/mp4" />
                </video>
              </div>
              <div className="p-2.5 flex-1 flex flex-col">
                <div className="text-zinc-100 text-sm font-semibold leading-tight truncate">{l.nombre ?? `Lote ${l.lote}`}</div>
                <div className="text-zinc-500 text-xxs mt-0.5">Lote {l.lote} · RP {l.rp}{l.peso ? ` · ${l.peso} kg` : ''}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {pd > 0 && <span className="text-xxs font-terminal text-zinc-300 border border-terminal-border rounded px-1.5 py-0.5">P.D. +{String(pd).replace('.', ',')}</span>}
                  <span className="text-xxs font-terminal text-zinc-300 border border-terminal-border rounded px-1.5 py-0.5">C.E. {String(ce).replace('.', ',')}</span>
                </div>
                <div className="mt-auto pt-2">
                  <div className="text-positive font-mono font-bold tabular-nums text-sm">{fmt(valor)}</div>
                  <Link href={`/preoferta/el-tigre?lote=${l.rp}`}
                    className="mt-1.5 block text-center rounded-lg bg-negative hover:bg-red-700 text-white text-xxs font-bold uppercase tracking-wider py-2">
                    Pre-ofertar &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
