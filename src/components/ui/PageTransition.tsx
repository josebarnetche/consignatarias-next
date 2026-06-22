'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/* ================================================================== */
/*  PageTransition (DESIGN-SYSTEM.md §5)                               */
/*  Cross-fade sutil del contenido en cambios de ruta. La terminal se  */
/*  siente continua (hub→provincia→perfil) en vez de recargas planas.  */
/*                                                                     */
/*  SSR-safe: el primer render (server + hidratación) NO anima — el    */
/*  HTML server-rendered es el estado final (opacity:1). La animación  */
/*  solo corre en navegaciones client-side posteriores, re-montando    */
/*  por `key={pathname}` y aplicando `.page-transition` (160ms).       */
/*                                                                     */
/*  Performance: solo opacity/transform. Degrada a no-op con           */
/*  prefers-reduced-motion (la clase se neutraliza en globals.css).    */
/* ================================================================== */

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Tras el primer mount, las siguientes rutas sí animan. El primer paint
  // (server HTML / hidratación) queda estático para no parpadear ni romper SSR.
  const mounted = useRef(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setAnimate(true)
  }, [pathname])

  return (
    <div
      key={pathname}
      className={animate ? 'page-transition' : undefined}
      style={{ minHeight: 'inherit' }}
    >
      {children}
    </div>
  )
}
