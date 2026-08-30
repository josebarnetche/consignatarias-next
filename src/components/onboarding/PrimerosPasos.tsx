'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent, emitValueBeacon } from '@/lib/analytics'

/**
 * Los primeros pasos, para el que recién creó su cuenta.
 *
 * EL PROBLEMA QUE RESUELVE
 * El gate de login subió las altas 4,4×, así que la gente sí crea cuenta. Pero **el 91 %
 * no vuelve otro día**. Entre el alta y el segundo día no hay nada: nadie le dice qué
 * puede hacer ahora ni le da un motivo para volver.
 *
 * Son tres pasos y ninguno vende:
 *  1. Algo que se hace en un minuto y devuelve un número propio.
 *  2. Algo que se lleva puesto —un archivo— para que el alta deje algo material.
 *  3. **Una razón para el segundo día**, que es la única que ataca el 9 % de retorno.
 *
 * Se guarda en `localStorage` que ya se completó o se descartó, para no volver a
 * mostrarlo. Si el navegador no lo permite, se muestra igual: repetir el saludo es menos
 * malo que perder el onboarding entero.
 */

const CLAVE = 'onboarding:primeros-pasos:v1'

interface Paso {
  n: number
  titulo: string
  detalle: string
  cta: string
  href: string
  clave: string
}

const PASOS: Paso[] = [
  {
    n: 1,
    titulo: 'Mirá el número de tu zona',
    detalle:
      'Cuántas cabezas hay en tu partido, cuántos establecimientos y cuántos terneros por vaca saca, con catorce años de serie. Son 455 partidos y es gratis.',
    cta: 'Buscar mi partido',
    href: '/productividad',
    clave: 'zona',
  },
  {
    n: 2,
    titulo: 'Bajate un informe entero, gratis',
    detalle:
      'El informe de canon de arrendamiento completo, tal cual lo recibe quien lo compra. Para que veas qué se vende acá antes de pagar nada.',
    cta: 'Descargar el PDF',
    href: '/api/informes/muestra',
    clave: 'muestra',
  },
  {
    n: 3,
    titulo: 'Que te avisemos cuando el precio se mueva de verdad',
    detalle:
      'Una sola alerta, sin nada que configurar. Suena cuando el novillo en dólares se aparta más de 12 % de su promedio del mes: unas cuatro veces por año. Si no pasa nada, no te escribimos.',
    cta: 'Anotarme',
    href: '/mercado/inmag-dolares#alerta',
    clave: 'alerta',
  },
]

export function PrimerosPasos({ nombre }: { nombre?: string | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE)) return
    } catch {
      /* sin storage se muestra igual: mejor repetirlo que perderlo */
    }
    setVisible(true)
    trackEvent('onboarding_view', { paso: 'primeros-pasos' })
    emitValueBeacon('onboarding_view', { meta: { paso: 'primeros-pasos' } })
  }, [])

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, String(Date.now()))
    } catch {
      /* ignore */
    }
    setVisible(false)
    trackEvent('onboarding_dismiss', { paso: 'primeros-pasos' })
  }

  if (!visible) return null

  return (
    <section className="mb-8 rounded-lg border border-sky-900/60 bg-slate-950/80 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-sky-500">Para empezar</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">
            {nombre ? `Bienvenido, ${nombre}` : 'Tu cuenta está lista'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Tres cosas que podés hacer ahora. Ninguna cuesta nada.
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          className="shrink-0 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
        >
          No mostrar más
        </button>
      </div>

      <ol className="mt-6 space-y-4">
        {PASOS.map((p) => (
          <li
            key={p.clave}
            className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-800 text-sm font-semibold text-sky-400">
                {p.n}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-100">{p.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.detalle}</p>
              </div>
            </div>
            <Link
              href={p.href}
              onClick={() => {
                trackEvent('onboarding_paso_click', { paso: p.clave })
                emitValueBeacon('onboarding_paso_click', { meta: { paso: p.clave } })
              }}
              className="shrink-0 rounded bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-sky-500 sm:ml-4"
            >
              {p.cta}
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        El precio del día, los remates, las guías y las fichas por partido son gratis y van
        a seguir siéndolo. Lo que se cobra son los informes por zona y la profundidad de
        las series —{' '}
        <Link href="/pro" className="text-sky-400 underline underline-offset-2">
          qué incluye PRO
        </Link>
        .
      </p>
    </section>
  )
}
