import { Metadata } from 'next'
import FrigorificosClient from './FrigorificosClient'

export const metadata: Metadata = {
  title: 'Directorio de Frigoríficos MAGYP Argentina',
  description: 'Base de datos completa de 364 plantas frigoríficas habilitadas por MAGYP. Busca por nombre, filtra por provincia o etapa habilitada.',
  keywords: [
    'frigorificos argentina',
    'plantas frigorificas MAGYP',
    'directorio frigorificos',
    'plantas faena habilitadas',
    'ciclo II ciclo III',
  ],
  openGraph: {
    title: 'Directorio de 364 Frigoríficos Argentina | Consignatarias.com.ar',
    description: 'Plantas frigoríficas habilitadas por MAGYP. Datos oficiales: CUIT, matrícula, provincia, etapa.',
    url: 'https://www.consignatarias.com.ar/frigorificos',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos',
  },
}

export default function FrigorificosPage() {
  return <FrigorificosClient />
}
