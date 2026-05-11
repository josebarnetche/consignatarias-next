'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-zinc-500 hover:text-zinc-300 font-mono text-xs transition-colors disabled:opacity-60"
    >
      {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  )
}
