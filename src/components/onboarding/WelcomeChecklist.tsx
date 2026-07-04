'use client'

import { useRouter } from 'next/navigation'

interface WelcomeChecklistProps {
  profileSlug: string
  displayName: string
  completedFields: {
    phone: boolean
    email: boolean
    website: boolean
    description: boolean
    whatsapp: boolean
  }
}

const CHECKLIST_ITEMS: { key: keyof WelcomeChecklistProps['completedFields']; label: string }[] = [
  { key: 'phone', label: 'Agregar telefono' },
  { key: 'email', label: 'Agregar email' },
  { key: 'website', label: 'Agregar sitio web' },
  { key: 'description', label: 'Escribir descripcion' },
  { key: 'whatsapp', label: 'Agregar WhatsApp' },
]

export default function WelcomeChecklist({ profileSlug: _profileSlug, displayName, completedFields }: WelcomeChecklistProps) {
  const router = useRouter()
  const completed = Object.values(completedFields).filter(Boolean).length
  const total = CHECKLIST_ITEMS.length

  const handleEditClick = () => {
    router.push('/dashboard?tab=editar')
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  if (completed >= total) return null

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">COMPLETÁ TU PERFIL</span>
        <span className="text-xxs font-terminal tabular-nums text-zinc-500">
          {completed}/{total} completados
        </span>
      </div>
      <div className="px-panel py-3 space-y-3">
        <p className="text-data font-terminal text-zinc-400">
          Cada campo de <span className="text-zinc-200">{displayName}</span> que completás te hace más fácil de encontrar para los productores.
        </p>

        <div className="space-y-0.5">
          {CHECKLIST_ITEMS.map(item => {
            const done = completedFields[item.key]
            const row = (
              <span className="flex items-center gap-2 w-full">
                <span className={`text-data font-terminal ${done ? 'text-positive' : 'text-zinc-500'}`}>
                  {done ? '\u2713' : '\u25CB'}
                </span>
                <span className={`text-xxs font-terminal ${done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                  {item.label}
                </span>
              </span>
            )
            return done ? (
              <div key={item.key} className="flex items-center w-full px-1.5 py-2">{row}</div>
            ) : (
              <button
                key={item.key}
                onClick={handleEditClick}
                className="flex items-center w-full text-left px-1.5 py-2 rounded-terminal hover:bg-zinc-800/40 transition-colors"
              >
                {row}
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="gradient-bar w-full max-w-[200px]">
          <div
            className="gradient-bar-fill"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
          <button
            onClick={handleEditClick}
            className="px-3 py-1.5 text-xxs font-terminal text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
          >
            Completar perfil →
          </button>
          <a
            href={`https://wa.me/5493773418130?text=${encodeURIComponent(`Hola, necesito ayuda con mi perfil de ${displayName} en consignatarias.com.ar`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xxs font-terminal text-positive/70 hover:text-positive transition-colors"
          >
            ¿Necesitás ayuda? →
          </a>
        </div>
      </div>
    </div>
  )
}
