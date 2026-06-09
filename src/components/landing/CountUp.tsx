'use client'

import { useEffect, useRef, useState } from 'react'

/** Cuenta hasta `value` cuando entra en viewport. SSR/hidratación = valor final
 *  (sin mismatch, SEO ve el número). Se saltea con prefers-reduced-motion. */
export default function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 900,
  className = '',
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(value)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !done.current) {
            done.current = true
            const start = value * 0.85
            const t0 = performance.now()
            const tick = (t: number) => {
              const p = Math.min(1, (t - t0) / duration)
              const eased = 1 - Math.pow(1 - p, 4)
              setN(start + (value - start) * eased)
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
