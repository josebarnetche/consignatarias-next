'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_TABS = [
  { href: '/admin/claims', label: 'VERIFICACIONES' },
  { href: '/admin/consignatarias', label: 'CONSIGNATARIAS' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="terminal-panel mb-px">
      <div className="px-panel py-2 flex items-center gap-4">
        <span className="text-xxs text-zinc-600 font-terminal uppercase tracking-wider mr-2">ADMIN</span>
        {ADMIN_TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`text-xxs font-terminal uppercase tracking-wider transition-colors ${
              pathname.startsWith(tab.href)
                ? 'text-accent'
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
