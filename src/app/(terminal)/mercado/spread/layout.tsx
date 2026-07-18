import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Relación Maíz/Novillo | Indicador de Rentabilidad Feedlot',
  description: 'Spread maíz/novillo en tiempo real. El indicador más importante para feedlots: ratio actual, umbral de rentabilidad (12:1), y análisis de márgenes.',
  keywords: [
    'relación maíz novillo',
    'spread maíz novillo',
    'rentabilidad feedlot',
    'costo engorde',
    'indicador ganadero',
    'precio novillo',
    'precio maíz',
    'feedlot argentina',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: 'Relación Maíz/Novillo | Indicador de Rentabilidad Feedlot',
    description: 'Spread maíz/novillo en tiempo real. Umbral de rentabilidad y análisis de márgenes para feedlots.',
    type: 'website',
    locale: 'es_AR',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/mercado/spread',
  },
}

export default function SpreadLayout({ children }: { children: React.ReactNode }) {
  return children
}
