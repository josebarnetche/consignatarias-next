import Link from 'next/link'

/**
 * GodCommandsCard — el "panel de comandos" del overview.
 *
 * Launchpad estático con accesos rápidos a las herramientas de gestión que ya
 * existen bajo /admin. No consulta datos: es navegación pura, on-brand terminal.
 * Cada fila linkea a una herramienta con un label + descripción corta.
 */

interface Command {
  label: string
  desc: string
  href: string
}

const COMMANDS: Command[] = [
  {
    label: 'Editar consignatarias',
    desc: 'nombre, datos, verificada/destacada',
    href: '/admin/consignatarias',
  },
  {
    label: 'Claims consignataria',
    desc: 'aprobar reclamos de perfil',
    href: '/admin/claims',
  },
  {
    label: 'Claims frigorífico',
    desc: 'aprobar reclamos de frigoríficos',
    href: '/admin/frigorifico-claims',
  },
  {
    label: 'Reseñas',
    desc: 'moderar reseñas de usuarios',
    href: '/admin/reviews',
  },
  {
    label: 'Suscriptores',
    desc: 'newsletter y altas',
    href: '/admin/suscriptores',
  },
  {
    label: 'Ops',
    desc: 'observabilidad, crons, errores',
    href: '/admin/ops',
  },
]

export default function GodCommandsCard() {
  return (
    <div className="terminal-panel">
      <div className="terminal-panel-header flex items-center justify-between">
        <span className="text-zinc-400 text-xxs tracking-widest">GOD COMMANDS</span>
        <span className="text-zinc-600 text-xxs font-terminal uppercase tracking-wider">
          gestión
        </span>
      </div>

      <div>
        {COMMANDS.map((cmd) => (
          <Link
            key={cmd.href}
            href={cmd.href}
            className="border-b border-terminal-border px-cell py-1.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-data font-terminal text-zinc-200 truncate">
                {cmd.label}
              </span>
              <span className="block text-xxs font-terminal text-zinc-600 truncate">
                {cmd.desc}
              </span>
            </span>
            <span className="flex-shrink-0 text-xxs font-terminal text-zinc-700 group-hover:text-accent group-hover:translate-x-0.5 transition-all">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
