/**
 * Datos de EJEMPLO de la propuesta PRO: la pre-oferta y las consultas que se muestran
 * en la presentación. Inventados a propósito —la propuesta la puede pedir cualquiera
 * con un mail y no puede mostrar contactos ni ofertas reales— y rotulados "datos de
 * ejemplo" donde aparecen. Los usan la versión web (Funciones.tsx) y la página de
 * capturas que alimenta el PDF.
 */
import type { PreofertaFirma, OfertaRecibida } from '@/lib/preofertas-firma'

export const PREOFERTA_EJEMPLO: PreofertaFirma = {
  id: 'ejemplo',
  consignataria_slug: 'ejemplo',
  titulo: 'Remate especial de invernada',
  fecha_remate: '2026-11-12',
  lugar: 'Sociedad Rural',
  cierre: '2026-11-11T20:00:00-03:00',
  condiciones: 'Plazo 30 días. Flete a cargo del comprador.',
  estado: 'publicada',
  created_at: '2026-11-01T10:00:00-03:00',
  updated_at: '2026-11-01T10:00:00-03:00',
  lotes: [
    { id: 'l1', orden: 1, titulo: 'Lote 4 · Novillitos Angus', categoria: 'Novillitos', cabezas: 60, peso_kg: 280, video_url: 'https://www.youtube.com/watch?v=Ejemplo0001', descripcion: null, precio_base: null },
    { id: 'l2', orden: 2, titulo: 'Lote 7 · Vaquillonas para entore', categoria: 'Vaquillonas', cabezas: 40, peso_kg: 310, video_url: 'https://www.youtube.com/watch?v=Ejemplo0001', descripcion: null, precio_base: null },
  ],
}
export const OFERTAS_EJEMPLO: OfertaRecibida[] = [
  { id: 'o1', preoferta_id: 'ejemplo', lote_id: 'l1', lote_titulo: 'Lote 4 · Novillitos Angus', nombre: 'Productor de ejemplo', telefono: '11 5555-0000', email: null, monto: 3400, mensaje: 'Me interesa si viene con sanidad al día.', fecha: '2026-11-05T09:30:00-03:00' },
]

/** Consultas de ejemplo: [nombre, contacto, mensaje, cuándo]. */
export const LEADS_EJEMPLO: [string, string, string, string][] = [
  ['Productor de ejemplo', '11 5555-0000', 'Busco 80 terneros de invernada para fines de noviembre.', 'hace 2 h'],
  ['Establecimiento de ejemplo', 'contacto@ejemplo.com', '¿El remate del jueves tiene vacas de descarte?', 'ayer'],
]
