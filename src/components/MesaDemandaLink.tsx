import Link from 'next/link'

/**
 * Una línea hacia /mercado/demanda (la mesa: cuántos compran y venden, agregado y anónimo).
 * Es el complemento del formulario corto para quien todavía no quiere dejar sus datos:
 * primero mira si hay del otro lado, después pide. Server component, sin JS.
 * Ancla a #hacienda: la página es ISR y no lee searchParams.
 */
export default function MesaDemandaLink({ plural, className = '' }: { plural?: string; className?: string }) {
  const que = plural ?? 'hacienda'
  return (
    <p className={`text-xs text-zinc-500 ${className}`}>
      ¿Hay compradores o vendedores de {que} ahora?{' '}
      <Link href="/mercado/demanda#hacienda" className="text-accent hover:underline">
        Ver la mesa de demanda →
      </Link>
    </p>
  )
}
