import { Metadata } from 'next'
import FrigorificoClaimForm from '@/components/claims/FrigorificoClaimForm'
import frigorificosData from '@/lib/data/frigorificos.json'

/* ------------------------------------------------------------------ */
/*  METADATA                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: 'Registrar Frigorífico — Consignatarias.com.ar',
  description: 'Registrá tu frigorífico en Consignatarias.com.ar para reclamar y completar tu perfil.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/frigorificos/verificar',
  },
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  searchParams: Promise<{ cuit?: string }>
}

export default async function FrigorificoVerificarPage({ searchParams }: Props) {
  const { cuit } = await searchParams

  // If a CUIT was passed via query param, find the frigorifico
  const frigorifico = cuit
    ? (frigorificosData as { cuit: string; name: string }[]).find(f => f.cuit === cuit)
    : null

  return (
    <div className="max-w-lg mx-auto px-2 sm:px-4 py-6">
      {frigorifico ? (
        <FrigorificoClaimForm
          frigorificoName={frigorifico.name}
          frigorificoCuit={frigorifico.cuit}
        />
      ) : (
        <FrigorificoSelectForm />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SELECT FORM (when no CUIT provided)                                */
/* ------------------------------------------------------------------ */

function FrigorificoSelectForm() {
  const frigorificos = (frigorificosData as { cuit: string; name: string; province: string }[])
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

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
