'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Revela su contenido con fade-up al entrar en viewport (IntersectionObserver).
 *  Liviano, una sola vez, y se saltea con prefers-reduced-motion (muestra de una). */
export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={`transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0'
      } ${className}`}
      style={{
        transform: shown ? 'translateY(0)' : `translateY(${y}px)`,
        transitionDelay: shown ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </Tag>
  )
}
