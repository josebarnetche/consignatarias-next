import Skeleton from '@/components/ui/Skeleton'
import { AdminSection } from '@/components/admin/kit'

/**
 * Esqueleto de un panel del kit mientras su contenido llega por streaming
 * (fallback de <Suspense>) o por fetch del cliente. Mismo rótulo que el panel
 * real para que no salte el layout.
 */
export function SectionSkeleton({ title, rows = 4 }: { title: string; rows?: number }) {
  return (
    <AdminSection title={title}>
      <div className="space-y-2.5" aria-busy="true" aria-label={`Cargando ${title}`}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} width={i === rows - 1 ? '60%' : '100%'} height="0.875rem" className="block" />
        ))}
      </div>
    </AdminSection>
  )
}

/** Celda de KPI en carga: rótulo + número. */
export function KpiSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <Skeleton width="w-24" height="0.625rem" className="block" />
      <Skeleton width="w-20" height="1.5rem" className="block" />
      <Skeleton width="w-28" height="0.625rem" className="block" />
    </div>
  )
}
