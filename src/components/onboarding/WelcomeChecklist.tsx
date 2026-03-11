'use client'

import Link from 'next/link'

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

export default function WelcomeChecklist({ profileSlug, displayName, completedFields }: WelcomeChecklistProps) {
  const completed = Object.values(completedFields).filter(Boolean).length
  const total = CHECKLIST_ITEMS.length

  if (completed >= total) return null

  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-200 text-label tracking-widest">BIENVENIDO</span>
        <span className="text-xxs font-terminal tabular-nums text-zinc-500">
          {completed}/{total} completados
        </span>
      </div>
      <div className="px-panel py-3 space-y-3">
        <p className="text-data font-terminal text-zinc-400">
          Completa tu perfil de <span className="text-zinc-200">{displayName}</span> para que los productores te encuentren.
        </p>

        <div className="space-y-1.5">
          {CHECKLIST_ITEMS.map(item => {
            const done = completedFields[item.key]
            return (
              <div key={item.key} className="flex items-center gap-2">
                <span className={`text-data font-terminal ${done ? 'text-positive' : 'text-zinc-500'}`}>
                  {done ? '\u2713' : '\u25CB'}
                </span>
                <span className={`text-xxs font-terminal ${done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="gradient-bar w-full max-w-[200px]">
          <div
            className="gradient-bar-fill-amber"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Link
            href="/dashboard?tab=editar"
            className="text-xxs font-terminal text-accent hover:underline"
          >
            Editar perfil →
          </Link>
          <a
            href={`https://wa.me/5493773418130?text=${encodeURIComponent(`Hola, necesito ayuda con mi perfil de ${displayName} en consignatarias.com.ar`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xxs font-terminal text-positive hover:underline"
          >
            Soporte por WhatsApp →
          </a>
        </div>
      </div>
    </div>
  )
}
