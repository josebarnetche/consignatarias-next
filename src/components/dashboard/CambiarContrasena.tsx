'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

/**
 * Cambiar la contraseña (17-10-2026). Las firmas que damos de alta con un usuario
 * provisorio entran con una contraseña temporal: la primera vez la cambian acá.
 */
export default function CambiarContrasena() {
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (clave.length < 10) return setEstado({ ok: false, texto: 'Usá al menos 10 caracteres.' })
    if (clave !== repetir) return setEstado({ ok: false, texto: 'Las dos contraseñas no coinciden.' })
    setGuardando(true)
    const { error } = await createClient().auth.updateUser({ password: clave })
    setGuardando(false)
    if (error) return setEstado({ ok: false, texto: 'No se pudo cambiar. Volvé a ingresar y probá de nuevo.' })
    setClave('')
    setRepetir('')
    setEstado({ ok: true, texto: 'Listo: la próxima vez entrás con la contraseña nueva.' })
  }

  return (
    <form onSubmit={guardar} className="terminal-panel">
      <div className="terminal-panel-header">
        <span className="text-zinc-200 text-label tracking-widest">CONTRASEÑA</span>
      </div>
      <div className="px-panel py-3 space-y-2">
        <p className="text-xxs text-zinc-500">Si entraste con una contraseña temporal, cambiala por una tuya.</p>
        <input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Contraseña nueva" className="terminal-input w-full" />
        <input type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} placeholder="Repetila" className="terminal-input w-full" />
        <button type="submit" disabled={guardando || !clave} className="terminal-btn disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
        {estado && <p className={`text-xs ${estado.ok ? 'text-positive' : 'text-negative'}`}>{estado.texto}</p>}
      </div>
    </form>
  )
}
