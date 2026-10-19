import type { Metadata } from 'next'

// La página es de cliente y no puede exportar metadata: sin esto la pestaña heredaba el título del sitio.
export const metadata: Metadata = { title: 'Suscriptores · Admin' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
