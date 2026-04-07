import { Metadata } from 'next'
import FrigorificoVerificarClient from './FrigorificoVerificarClient'
import frigorificosData from '@/lib/data/frigorificos.json'

/* ------------------------------------------------------------------ */
/*  CONFIG — Skip static generation (dynamic searchParams)            */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: 'Registrar Frigorífico — Consignatarias.com.ar',
  description: 'Registrá tu frigorífico en Consignatarias.com.ar para reclamar y completar tu perfil.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos/verificar',
  },
}

/* ------------------------------------------------------------------ */
/*  PAGE — Static (no searchParams on server = no dynamic rendering)   */
/* ------------------------------------------------------------------ */

const frigorificos = (frigorificosData as { cuit: string; name: string; province: string }[])
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  .map(({ cuit, name, province }) => ({ cuit, name, province }))

export default function FrigorificoVerificarPage() {
  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-6">
      <FrigorificoVerificarClient frigorificos={frigorificos} />
    </div>
  )
}
