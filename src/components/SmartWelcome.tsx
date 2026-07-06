'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Ctx {
  segment: 'consignataria' | 'ai-curious' | 'returning' | 'nuevo'
  isReturning: boolean
  aiEngine: string | null
  visits: number
}

/**
 * Personalización progresiva: pide el contexto del visitante (/api/visitor/me, derivado
 * de la cookie `cid`) y muestra un mensaje adaptado a su segmento. No des-optimiza la
 * página (client-side, sobre HTML estático). Se muestra 1×/sesión, descartable.
 * Segmento 'nuevo' → no muestra nada (no molestamos al que recién llega).
 */
const MESSAGES: Record<Ctx['segment'], { text: string; cta: string; href: string } | null> = {
  consignataria: {
    text: 'Vimos que te interesa destacar tu firma en el mercado.',
    cta: 'Ver Consignataria PRO',
    href: '/planes#consignataria',
  },
  'ai-curious': {
    text: 'Llegaste desde una IA. Tenemos el dato del mercado como servicio para tu asistente.',
    cta: 'Ver API + MCP',
    href: '/enterprise',
  },
  returning: {
    text: 'Bienvenido de nuevo.',
    cta: 'Ver el pulso del mercado',
    href: '/mercado/pulso',
  },
  nuevo: null,
}

export default function SmartWelcome() {
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('smartwelcome_off')) return
    } catch {
      return
    }
    setDismissed(false)
    fetch('/api/visitor/me')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.segment) setCtx(d as Ctx)
      })
      .catch(() => {})
  }, [])

  if (dismissed || !ctx) return null
  const msg = MESSAGES[ctx.segment]
  if (!msg) return null

  const off = () => {
    try {
      sessionStorage.setItem('smartwelcome_off', '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div className="border-b border-terminal-border bg-terminal-panel/60">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
        <p className="text-xxs text-zinc-400 font-terminal flex-1 leading-relaxed">
          {msg.text}{' '}
          <Link href={msg.href} className="text-sky-400 hover:underline">
            {msg.cta} →
          </Link>
        </p>
        <button onClick={off} aria-label="Cerrar" className="text-zinc-600 hover:text-zinc-300 text-sm leading-none shrink-0">
          ×
        </button>
      </div>
    </div>
  )
}
