'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Refresca el árbol de server components de la página cada `intervalMs`
 * (default 45s) llamando router.refresh(). Como la página es force-dynamic,
 * cada refresh re-corre todos los cards con datos frescos sin full reload.
 * Limpia el intervalo en unmount.
 */
export default function AutoRefresh({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
