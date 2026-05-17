import { Metadata } from 'next'
import SpreadClient from './SpreadClient'

export const metadata: Metadata = {
  title: 'Relación Maíz/Novillo Argentina | Rentabilidad Feedlot 2026',
  description: 'Indicador de rentabilidad para feedlots argentinos. Relación maíz/novillo actualizada diariamente con precios INMAG y maíz FOB. Umbral de rentabilidad 12:1.',
  keywords: [
    'relacion maiz novillo',
    'rentabilidad feedlot argentina',
    'costo engorde ganado',
    'precio maiz ganaderia',
    'spread ganadero',
    'indicador feedlot',
    'conversion maiz carne',
  ],
  openGraph: {
    title: 'Relación Maíz/Novillo — Rentabilidad Feedlot',
    description: 'Indicador clave para feedlots: cuántos kilos de maíz se necesitan para un kilo de novillo. Actualizado diariamente.',
    url: 'https://www.consignatarias.com.ar/mercado/spread',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/mercado/spread',
  },
}

export default function SpreadPage() {
  return <SpreadClient />
}
