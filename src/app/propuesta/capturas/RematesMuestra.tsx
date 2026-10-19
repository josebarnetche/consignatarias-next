'use client'

import { AuctionManager } from '@/app/(terminal)/dashboard/DashboardClient'

/** La pestaña Remates del panel con datos de ejemplo, para la captura de la propuesta. */
export default function RematesMuestra() {
  return (
    <AuctionManager
      slug="ejemplo"
      displayName="Consignataria Ejemplo"
      onAuctionsChange={() => {}}
      ownerAuctions={[
        {
          id: 1, title: 'Remate especial de invernada — 1.800 terneros', date: '2026-11-06', time: '14:00',
          location: 'Sociedad Rural, Curuzú Cuatiá', province: 'CORRIENTES', type: 'invernada', main_category: 'terneros',
          estimated_heads: 1800, description: null, catalog_url: 'https://ejemplo.com/catalogo.pdf',
          youtube_url: 'https://youtube.com/@ejemplo', flyer_url: 'https://ejemplo/flyer.jpg', status: 'scheduled',
        },
      ]}
      scrapedAuctions={[
        { title: 'Remate feria mensual', date: '2026-11-13', time: '14:30', location: 'Mercedes, CORRIENTES', clave: 'a' },
        { title: 'Remate de reproductores', date: '2026-11-20', time: null, location: 'Goya, CORRIENTES', clave: 'b' },
      ]}
    />
  )
}
