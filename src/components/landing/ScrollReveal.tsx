'use client'

import { useEffect } from 'react'

/** Aplica reveal-on-scroll a todas las <section> de la landing sin tocar el markup.
 *  SSR-safe: sin JS todo queda visible (no esconde nada en el HTML). Saltea el hero
 *  (ya animado) y las secciones above-the-fold (evita flash). Respeta reduced-motion. */
export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const sections = Array.from(document.querySelectorAll('main > section')) as HTMLElement[]
    const targets = sections.slice(1) // el hero (primera) ya tiene su animación propia

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    )

    for (const s of targets) {
      // Solo escondemos + observamos lo que está bien debajo del fold (sin flash visible).
      if (s.getBoundingClientRect().top > window.innerHeight * 0.9) {
        s.classList.add('reveal-init')
        io.observe(s)
      }
    }
    return () => io.disconnect()
  }, [])

  return null
}
