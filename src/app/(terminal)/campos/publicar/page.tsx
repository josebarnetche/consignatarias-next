import { Metadata } from 'next'
import Link from 'next/link'
import PublicarCampoForm from '@/components/campos/PublicarCampoForm'
import { fmtArs } from '@/lib/campos'
import { promedioMesAnterior } from '@/lib/valuacion-campos'

export const revalidate = 3600

const BASE_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Publicar un campo en arrendamiento o venta — gratis',
  description:
    'Publicá tu campo para arrendar o vender. Gratis y sin comisión por publicar. El canon se carga en kg de novillo por hectárea por año y el aviso muestra cuánto es en pesos y dólares al índice del día.',
  keywords: ['publicar campo', 'ofrecer campo en arrendamiento', 'arrendar mi campo', 'vender mi campo', 'campo para alquilar'],
  openGraph: {
    title: 'Publicá tu campo — consignatarias.com.ar',
    description: 'Gratis. Tu contacto no se publica: las consultas te las pasamos nosotros.',
    url: `${BASE_URL}/campos/publicar`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/campos/publicar` },
}

export default function PublicarCampoPage() {
  const idx = promedioMesAnterior()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
      <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">
        ← Campos
      </Link>

      <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">Publicá tu campo</h1>
      <p className="text-zinc-300 text-base mb-6">
        Gratis, sin comisión por publicar, y en dos minutos. Hay productores buscando campo en el sitio
        todas las semanas — hoy no les tenemos qué ofrecer.
      </p>

      <ul className="text-zinc-400 mb-8 space-y-2 list-disc pl-5">
        <li>
          <strong className="text-zinc-200">El canon se carga en kilos de novillo por mes</strong>, como se
          pacta y se liquida. El aviso muestra solo cuánto es en pesos y en dólares.
        </li>
        <li>
          <strong className="text-zinc-200">Tu contacto no se publica.</strong> Cuando alguien consulta, te
          avisamos nosotros y vos decidís con quién hablás.
        </li>
        <li>
          Revisamos cada aviso antes de que salga, así el que busca encuentra campos de verdad.
        </li>
      </ul>

      <p className="text-zinc-500 text-xs mb-6 border border-zinc-800 rounded px-3 py-2 bg-zinc-900/40">
        Se liquida con el {idx.etiqueta} del novillo:{' '}
        <span className="text-zinc-300 font-mono">{fmtArs(idx.valor)}/kg</span>
        {idx.ruedas ? ` (${idx.ruedas} ruedas)` : ''}.
      </p>

      <PublicarCampoForm indice={idx.valor} />

      <div className="border-t border-zinc-800 pt-4 mt-8 flex flex-wrap gap-4 text-xs">
        <Link href="/campos" className="text-zinc-500 hover:text-accent transition-colors">
          Ver los campos publicados →
        </Link>
        <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
          Cómo se calcula el canon
        </Link>
        <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
          Índice de arrendamiento
        </Link>
      </div>
    </div>
  )
}
