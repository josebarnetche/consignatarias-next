'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function DteCtaClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])
  
  if (!isLoggedIn) return null
  
  return (
    <section className="mt-8 bg-gradient-to-r from-sky-500/10 to-sky-500/5 border border-sky-500/20 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-sky-500/20 rounded-lg shrink-0">
          <Upload className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-zinc-100 mb-1">
            ¿Participaste en un remate hoy?
          </h3>
          <p className="text-sm text-zinc-400 mb-3">
            Guardá tu DT-e para llevar un registro de todas tus operaciones. 
            Escaneamos automáticamente los datos de la guía.
          </p>
          <Link
            href="/mi-cuenta/guias"
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 border border-sky-500/30 text-accent text-sm font-medium rounded hover:bg-sky-500/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Subir mi DT-e
          </Link>
        </div>
      </div>
    </section>
  )
}
