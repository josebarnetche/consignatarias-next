'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { trackGuiaPurchase } from '@/lib/analytics'

interface Props {
  /**
   * True SOLO cuando la fila de `guia_purchases` existe. Nunca pasar el
   * `?comprada=` pelado: se puede llegar a esa URL sin que el webhook haya
   * otorgado nada, y contaríamos ventas que no ocurrieron.
   */
  confirmed: boolean
  slug: string
  priceArs: number
  /** Id estable de la compra, para deduplicar entre refresh y vueltas. */
  dedupeId: string | number
}

/**
 * Dispara el `purchase` de GA4 una sola vez, con la compra confirmada en base.
 * Recupera el origen que dejó GuiaViewTracker en sessionStorage, así la venta
 * se le atribuye al banner que la trajo y no a "direct". Después limpia el
 * `?comprada` de la URL para que un refresh no replique la conversión.
 */
export function GuiaPurchaseTracker({ confirmed, slug, priceArs, dedupeId }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const justBought = searchParams.get('comprada') === slug

  useEffect(() => {
    if (!justBought || !confirmed) return

    const key = `guia_purchase_fired:${dedupeId}`
    let alreadyFired = false
    try {
      alreadyFired = sessionStorage.getItem(key) === '1'
    } catch {
      /* storage no disponible — disparamos una vez por montaje */
    }

    if (!alreadyFired) {
      let source: string | null = null
      try {
        source = sessionStorage.getItem(`guia_source:${slug}`)
      } catch {
        /* ignore */
      }
      trackGuiaPurchase(slug, priceArs, source, String(dedupeId))
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('comprada')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [justBought, confirmed, slug, priceArs, dedupeId, pathname, router, searchParams])

  return null
}
