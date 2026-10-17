import type { Metadata } from 'next'
import VerificacionesBoard from '@/components/admin/verificaciones/VerificacionesBoard'

export const metadata: Metadata = { title: 'Verificaciones · Consignatarias · Admin' }

/** URL contrato: la enlazan los mails de reclamo de perfil. */
export default function AdminClaimsPage() {
  return <VerificacionesBoard kind="consignatarias" />
}
