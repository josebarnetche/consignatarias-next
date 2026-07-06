'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const KEY = 'cookie_consent_v1'

/**
 * Banner de consentimiento discreto (consentimiento implícito por navegación,
 * suficiente para Argentina — Ley 25.326). Usamos cookies propias (first-party):
 * `cid` para identidad/atribución + analytics. Al aceptar/seguir se guarda el flag
 * y no vuelve a aparecer. Alineado a la Política de Privacidad.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(KEY, 'implied')
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] border-t border-terminal-border bg-black/90 backdrop-blur px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <p className="text-zinc-400 text-xxs leading-relaxed flex-1">
          Usamos cookies propias para que el sitio funcione, medir el uso y personalizar tu experiencia. Al seguir
          navegando, aceptás su uso.{' '}
          <Link href="/privacidad" className="text-sky-400 hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="terminal-btn text-xxs shrink-0"
          style={{ borderColor: 'rgba(56,189,248,0.5)', color: '#38bdf8' }}
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}
