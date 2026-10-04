'use client'

import { useSearchParams } from 'next/navigation'
import CompraLeadCapture from './CompraLeadCapture'

/**
 * Captura de la página de lotes, etiquetada por lote.
 *
 * El `source` sale del `?lote=<sku>` que pone el botón de cada tarjeta, así que
 * un lead que entra por un lote concreto queda como `lote:33981` en
 * `producer_leads` y se puede accionar sabiendo QUÉ hacienda miraba. Se lee en
 * el cliente a propósito: leerlo en el server volvería dinámica una página que
 * hoy es estática.
 */
export default function LoteLeadCapture() {
  const sku = useSearchParams().get('lote')
  const valido = sku && /^\d{1,8}$/.test(sku) ? sku : null
  return (
    <CompraLeadCapture
      source={valido ? `lote:${valido}` : 'lotes'}
      title={valido ? `Consultá por el lote #${valido}` : '¿Buscás hacienda? Te la conseguimos'}
      subtitle={
        valido
          ? 'Decinos cuántas cabezas necesitás y hasta cuánto pagás. Trabajamos la operación nosotros.'
          : 'Decinos qué categoría, cuántas cabezas y hasta cuánto pagás. Te buscamos la hacienda que entre en ese número, esté publicada donde esté.'
      }
    />
  )
}
