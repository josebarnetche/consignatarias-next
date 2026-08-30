'use client'

import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * "Bajate uno entero, gratis".
 *
 * Es el uso gratuito que resuelve la objeción real de un PDF pago: nadie compra un
 * archivo que no vio. Se entrega un informe completo de una zona fija —el mismo
 * generador, sin marcas de agua ni páginas recortadas— y lo único que no da es la zona
 * del que lo baja, que es lo que se vende.
 *
 * Pide cuenta, no tarjeta. El email que queda es el activo.
 */
export function MuestraGratis({ zona = 'Corrientes' }: { zona?: string }) {
  return (
    <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/15 p-5">
      <h3 className="font-semibold text-emerald-200">Bajate uno entero, gratis</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        No una muestra recortada: el informe completo de{' '}
        <strong className="text-slate-100">{zona}</strong>, tal cual lo recibe quien lo
        compra. Así ves exactamente qué estás comprando antes de pagar nada.
      </p>
      <a
        href="/api/informes/muestra"
        onClick={() => {
          trackEvent('informe_muestra_descarga', { zona })
          emitValueBeacon('informe_muestra_descarga', { meta: { zona } })
        }}
        className="mt-4 inline-block rounded border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-950/40"
      >
        Descargar el informe de muestra
      </a>
      <p className="mt-3 text-xs text-slate-500">
        Sólo pide que tengas cuenta. Lo único que no trae es tu zona.
      </p>
    </div>
  )
}
