'use client'

import { useEffect, useRef } from 'react'
import { trackProPromptView, type ProPromptVariant } from '@/lib/analytics'

/**
 * Dispara `pro_prompt_view` a través del helper deduplicado (una impresión por
 * página, GA + ledger). Reemplaza a `<TrackOnMount event="pro_prompt_view">` en
 * server components como el Paywall, para que TODAS las superficies del muro
 * converjan al mismo conteo.
 */
export default function ProPromptView({
  context = 'paywall',
  variant = 'card',
}: {
  context?: string
  variant?: ProPromptVariant
}) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackProPromptView(context, variant)
  }, [context, variant])
  return null
}
