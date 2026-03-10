'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 hover:text-zinc-100 transition-colors"
      >
        Ingresar
      </Link>
    )
  }

  const email = user.email ?? ''
  const short = email.length > 20 ? email.slice(0, 18) + '…' : email

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright transition-colors"
      >
        Mi Panel
      </Link>
      <span className="text-zinc-700 text-xxs select-none hidden sm:inline">|</span>
      <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline" title={email}>
        {short}
      </span>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-xxs font-terminal uppercase tracking-wider text-zinc-600 hover:text-negative transition-colors"
        >
          Salir
        </button>
      </form>
    </div>
  )
}
