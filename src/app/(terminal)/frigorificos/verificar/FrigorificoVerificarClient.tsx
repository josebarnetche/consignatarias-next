'use client'

import { useSearchParams } from 'next/navigation'
import FrigorificoClaimForm from '@/components/claims/FrigorificoClaimForm'

interface Frigorifico {
  cuit: string
  name: string
  province: string
}

export default function FrigorificoVerificarClient({ frigorificos }: { frigorificos: Frigorifico[] }) {
  const searchParams = useSearchParams()
  const cuit = searchParams.get('cuit')

  const frigorifico = cuit
    ? frigorificos.find(f => f.cuit === cuit)
    : null

  if (frigorifico) {
    return (
      <FrigorificoClaimForm
        frigorificoName={frigorifico.name}
        frigorificoCuit={frigorifico.cuit}
      />
    )
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">REGISTRAR FRIGORIFICO</span>
      </div>
      <div className="px-panel py-4 space-y-4">
        <p className="text-data text-zinc-400 font-terminal">
          Seleccioná tu frigorífico del listado para iniciar el proceso de registro y reclamar tu perfil.
        </p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {frigorificos.map(f => (
            <a
              key={f.cuit}
              href={`/frigorificos/verificar?cuit=${f.cuit}`}
              className="flex items-center justify-between px-2 py-1.5 text-data font-terminal hover:bg-accent/5 transition-colors group"
            >
              <span className="text-zinc-300 group-hover:text-zinc-100 truncate">{f.name}</span>
              <span className="text-zinc-500 text-xxs tracking-wider flex-shrink-0 ml-2">{f.province}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
