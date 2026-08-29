import type { ServiceClient } from '@/lib/supabase'

/**
 * acceso.ts — quién puede bajar qué.
 *
 * Un único lugar decide el acceso a un entregable, porque hay dos caminos para tenerlo y
 * mezclarlos en cada ruta es como se cuelan los agujeros:
 *
 *  · **Compra única** (`informe_purchases`) — no vence nunca. Se compró o no.
 *  · **Suscripción** (`producto_subscriptions`) — vale mientras el período esté pagado.
 *
 * LA REGLA DE LA GRACIA, heredada del resto del repo: **cancelar no corta el acceso**. Se
 * honra hasta `current_period_end`, porque ese período ya se cobró. Por eso una fila con
 * `status='cancelled'` y período vigente sigue habilitada, y el corte lo decide la fecha.
 * Al revés también: una `active` con período vencido NO habilita — es una renovación que
 * no entró, y seguir sirviendo el producto ahí es regalarlo.
 */

export type ViaDeAcceso = 'compra' | 'suscripcion'

export interface Acceso {
  permitido: boolean
  via: ViaDeAcceso | null
  /** Id de la fila que habilita, para contabilizar la descarga contra ella. */
  filaId: number | null
  /** Descargas previas de esa fila. Se usa para incrementar sin un round-trip extra. */
  descargasPrevias: number
  /** Sólo en suscripciones: hasta cuándo. */
  vigenteHasta: string | null
  /** true si está cancelada pero todavía dentro del período pagado. */
  enGracia: boolean
}

const SIN_ACCESO: Acceso = {
  permitido: false,
  via: null,
  filaId: null,
  descargasPrevias: 0,
  vigenteHasta: null,
  enGracia: false,
}

export async function verificarAcceso(
  service: ServiceClient,
  opts: { productoSlug: string; varianteSlug: string; email: string; ahora?: Date },
): Promise<Acceso> {
  const ahora = opts.ahora ?? new Date()
  const email = opts.email.trim().toLowerCase()

  // 1) Compra única. Gana sobre la suscripción porque no vence: si alguien compró el
  //    informe y además está suscripto, la compra sigue valiendo cuando la sub caiga.
  const { data: compra, error: errCompra } = await service
    .from('informe_purchases')
    .select('id, download_count')
    .eq('producto_slug', opts.productoSlug)
    .eq('variante_slug', opts.varianteSlug)
    .eq('email', email)
    .eq('status', 'paid')
    .maybeSingle()

  if (errCompra) throw new Error(`[acceso] compra: ${errCompra.message}`)
  if (compra) {
    return {
      permitido: true,
      via: 'compra',
      filaId: compra.id,
      descargasPrevias: compra.download_count ?? 0,
      vigenteHasta: null,
      enGracia: false,
    }
  }

  // 2) Suscripción. `past_due` queda afuera a propósito: es un cobro que falló, y el
  //    período que habilitaba ya venció o está por vencer.
  const { data: sub, error: errSub } = await service
    .from('producto_subscriptions')
    .select('id, status, current_period_end, delivery_count')
    .eq('producto_slug', opts.productoSlug)
    .eq('email', email)
    .in('status', ['active', 'cancelled'])
    .maybeSingle()

  if (errSub) throw new Error(`[acceso] suscripcion: ${errSub.message}`)
  if (!sub) return SIN_ACCESO

  // Sin fecha de fin no se puede afirmar que esté pagado. Se habilita sólo si está
  // activa: es el hueco entre el alta y el primer webhook que sella el período.
  if (!sub.current_period_end) {
    return sub.status === 'active'
      ? {
          permitido: true,
          via: 'suscripcion',
          filaId: sub.id,
          descargasPrevias: sub.delivery_count ?? 0,
          vigenteHasta: null,
          enGracia: false,
        }
      : SIN_ACCESO
  }

  const vigente = new Date(sub.current_period_end) > ahora
  if (!vigente) return SIN_ACCESO

  return {
    permitido: true,
    via: 'suscripcion',
    filaId: sub.id,
    descargasPrevias: sub.delivery_count ?? 0,
    vigenteHasta: sub.current_period_end,
    enGracia: sub.status === 'cancelled',
  }
}

/** Registra la descarga contra la fila que la habilitó. Nunca bloquea la entrega. */
export function contabilizarDescarga(service: ServiceClient, acceso: Acceso): void {
  if (!acceso.permitido || acceso.filaId == null) return

  const ahora = new Date().toISOString()

  if (acceso.via === 'compra') {
    service
      .from('informe_purchases')
      .update({ download_count: acceso.descargasPrevias + 1, last_downloaded_at: ahora })
      .eq('id', acceso.filaId)
      .then(({ error }) => {
        if (error) console.error('[acceso] contador de compra falló:', error.message)
      })
    return
  }

  service
    .from('producto_subscriptions')
    .update({ delivery_count: acceso.descargasPrevias + 1, last_delivered_at: ahora })
    .eq('id', acceso.filaId)
    .then(({ error }) => {
      if (error) console.error('[acceso] contador de suscripción falló:', error.message)
    })
}
