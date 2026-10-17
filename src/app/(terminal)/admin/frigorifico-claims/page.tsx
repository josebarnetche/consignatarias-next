import type { Metadata } from 'next'
import VerificacionesBoard from '@/components/admin/verificaciones/VerificacionesBoard'

export const metadata: Metadata = { title: 'Verificaciones · Frigoríficos · Admin' }

/** URL contrato: la enlazan los mails de reclamo de ficha de frigorífico. */
export default function AdminFrigorificoClaimsPage() {
  return <VerificacionesBoard kind="frigorificos" />
}
