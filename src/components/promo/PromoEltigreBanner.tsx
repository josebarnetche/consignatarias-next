import Link from 'next/link'
import { getPreoferta } from '@/lib/data/preofertas'

/* Banner promocional TEMPORAL del 34° Remate Cabaña El Tigre. Estilo premium
   (no terminal): bordó de marca + atardecer, video autoreproducible (muteado,
   loop), mobile-first. Se auto-oculta cuando cierra la pre-oferta. */

export default function PromoEltigreBanner() {
  const p = getPreoferta('el-tigre')
  if (!p || Date.now() >= new Date(p.cierre_preoferta).getTime()) return null

  return (
    <Link
      href="/preoferta/el-tigre"
      aria-label="Comprá toros en el 34° Remate Cabaña El Tigre"
      className="group block overflow-hidden rounded-2xl no-underline"
      style={{ background: 'linear-gradient(120deg,#4a1420 0%,#6d1a2e 45%,#8a2540 100%)' }}
    >
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Video vertical (autoplay muteado) */}
        <div className="relative sm:w-[150px] shrink-0 bg-black/30">
          <video
            className="w-full h-[210px] sm:h-full object-cover"
            autoPlay muted loop playsInline preload="metadata"
            poster="/promo/eltigre-preoferta.jpg"
          >
            <source src="/promo/eltigre-preoferta.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Copy + CTA */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center text-white">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 mb-2"
            style={{ background: 'rgba(212,162,78,.18)', border: '1px solid rgba(212,162,78,.5)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#e7c37a] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider" style={{ color: '#e7c37a' }}>PRE-OFERTA ABIERTA</span>
          </div>
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-tight" style={{ fontFamily: 'Georgia,serif' }}>
            El próximo padre de tu rodeo
          </h3>
          <p className="text-[13.5px] mt-1" style={{ color: 'rgba(255,255,255,.82)' }}>
            <b>70 toros</b> seleccionados — Braford · Brangus · P. Hereford. 34° Remate Anual <b>Cabaña El Tigre</b>,
            viernes 17 de julio en Soc. Rural de Mercedes. Flete gratis.
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-bold text-[#4a1420] transition-transform group-hover:translate-x-0.5"
              style={{ background: 'linear-gradient(180deg,#f0d49a,#d4a24e)' }}>
              Ver los toros y pre-ofertar &rarr;
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,.6)' }}>Pre-oferta cierra jue 16-jul 20:00</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
