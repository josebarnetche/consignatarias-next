import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/kit'
import DataHealthCard from '@/components/admin/DataHealthCard'
import OutreachActivityCard from '@/components/admin/OutreachActivityCard'
import EmailHealthCard from '@/components/admin/EmailHealthCard'
import CobrosRebill from '@/components/admin/metricas/CobrosRebill'
import { SectionSkeleton } from '@/components/admin/metricas/SectionSkeleton'
import {
  NegocioProvider,
  NegocioReload,
  IngresosKpis,
  SuscripcionesTabla,
  AudienciaKpis,
  TopPerfiles30d,
  VerificacionesFila,
} from '@/components/admin/metricas/NegocioData'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Negocio · Admin' }

/**
 * /admin/dashboard — "Negocio": ingresos y conversión en un solo lugar.
 *
 *   1. Ingresos: MRR, PRO Consignataria (pagas/bonificadas), API Enterprise,
 *      PRO usuario + eventos de Rebill.
 *   2. Suscripciones de firmas (tabla).
 *   3. Audiencia: vistas 30 d / históricas, usuarios, perfiles más vistos 30 d.
 *   4. Verificaciones: una fila con enlace (los pendientes viven en la barra).
 *   5. Datos y canales: frescura de datos, outreach y salud de email.
 *
 * Las piezas cliente comparten UNA lectura de GET /api/admin/dashboard
 * (contrato sin cambios). Los paneles server llegan por streaming.
 *
 * No repite: vistas 24 h/7 d, newsletter activos y firmas PRO (Hoy); el detalle
 * de newsletter (Suscriptores); crons y errores (Hoy/Ops).
 */
export default function AdminNegocioPage() {
  return (
    <NegocioProvider>
      <AdminPageHeader
        title="Negocio"
        description="Ingresos y conversión, la audiencia que los alimenta y la salud de los canales."
        actions={<NegocioReload />}
      />

      <IngresosKpis />
      <Suspense fallback={null}>
        <CobrosRebill />
      </Suspense>

      <SuscripcionesTabla />

      <AudienciaKpis />
      <TopPerfiles30d />

      <VerificacionesFila />

      <div className="grid gap-px lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Frescura de datos" rows={6} />}>
          <DataHealthCard />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Salud de email · 30 d" rows={4} />}>
          <EmailHealthCard />
        </Suspense>
      </div>
      <Suspense fallback={<SectionSkeleton title="Outreach" rows={8} />}>
        <OutreachActivityCard />
      </Suspense>
    </NegocioProvider>
  )
}
