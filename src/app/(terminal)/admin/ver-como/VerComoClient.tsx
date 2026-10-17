'use client'

import { useMemo, useState } from 'react'
import { METODOS_VERIFICACION } from '@/lib/claims/aprobar'

export interface FirmaFila {
  slug: string
  nombre: string
  titular: string | null
  pro: boolean
}

export default function VerComoClient({ firmas }: { firmas: FirmaFila[] }) {
  const [q, setQ] = useState('')
  const [alta, setAlta] = useState<FirmaFila | null>(null)
  const [email, setEmail] = useState('')
  const [verificacion, setVerificacion] = useState('')
  const [nota, setNota] = useState('')
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? firmas.filter((f) => f.nombre.toLowerCase().includes(t) || f.slug.includes(t)) : firmas
  }, [firmas, q])

  async function darDeAlta(e: React.FormEvent) {
    e.preventDefault()
    if (!alta) return
    setEnviando(true)
    setEstado(null)
    try {
      const res = await fetch('/api/admin/firmas/alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: alta.slug, email, verificacion, nota: nota || undefined }),
      })
      const d = await res.json()
      if (!res.ok) {
        setEstado({ ok: false, texto: d.error ?? 'No se pudo dar de alta' })
      } else {
        setEstado({
          ok: true,
          texto: `Listo: ${alta.nombre} quedó a nombre de ${email}.${d.aviso_enviado ? ' Le mandamos el mail con el acceso.' : ' El mail de bienvenida NO salió: avisale vos que entre con su mail en /login.'}${d.advertencia ? ` ${d.advertencia}` : ''}`,
        })
      }
    } catch {
      setEstado({ ok: false, texto: 'Error de conexión' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="terminal-panel mt-4">
      <div className="terminal-panel-header flex items-center justify-between gap-2">
        <span className="text-zinc-200 text-label tracking-widest">FIRMAS · VER COMO Y ALTA</span>
        <span className="text-xxs font-terminal text-zinc-500">{firmas.length} firmas</span>
      </div>
      <div className="px-panel py-4 space-y-4">
        <p className="text-xs text-zinc-400">
          <strong className="text-zinc-200">Ver como</strong> abre el panel de la firma tal como lo vería su dueño
          (sólo lectura). <strong className="text-zinc-200">Alta</strong> le asigna la ficha a un mail y le manda el
          acceso: entra con ese mail en /login, sin contraseña. El alta no activa PRO.
        </p>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar firma…"
          className="w-full rounded-terminal border border-terminal-border bg-terminal-bg px-3 py-2 text-sm text-zinc-100"
        />

        {alta && (
          <form onSubmit={darDeAlta} className="space-y-3 rounded-terminal border border-accent/40 bg-accent/5 p-4">
            <p className="text-sm text-zinc-100">
              Dar de alta <strong>{alta.nombre}</strong>
              {alta.titular && <span className="text-warning"> · hoy a nombre de {alta.titular}</span>}
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Mail del dueño o de quien maneja la firma"
              className="w-full rounded-terminal border border-terminal-border bg-terminal-bg px-3 py-2 text-sm text-zinc-100"
            />
            <select
              required
              value={verificacion}
              onChange={(e) => setVerificacion(e.target.value)}
              className="w-full rounded-terminal border border-terminal-border bg-terminal-bg px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">¿Cómo verificaste que es la firma?</option>
              {Object.entries(METODOS_VERIFICACION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={500}
              placeholder="Nota interna (opcional)"
              className="w-full rounded-terminal border border-terminal-border bg-terminal-bg px-3 py-2 text-sm text-zinc-100"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={enviando || !email || !verificacion}
                className="rounded-terminal bg-accent px-4 py-2 text-xs font-semibold text-white oscuro:text-zinc-950 disabled:opacity-50"
              >
                {enviando ? 'Dando de alta…' : 'Dar de alta y mandar acceso'}
              </button>
              <button type="button" onClick={() => { setAlta(null); setEstado(null) }} className="text-xs text-zinc-400 hover:underline">
                Cancelar
              </button>
            </div>
            {estado && <p className={`text-xs ${estado.ok ? 'text-positive' : 'text-negative'}`}>{estado.texto}</p>}
          </form>
        )}

        <ul className="divide-y divide-terminal-border rounded-terminal border border-terminal-border">
          {visibles.slice(0, 200).map((f) => (
            <li key={f.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 text-zinc-200">
                {f.nombre}
                {f.pro && <span className="ml-2 text-xxs font-semibold text-accent">★ PRO</span>}
                <span className="block text-xxs text-zinc-500">{f.titular ? `Titular: ${f.titular}` : 'Sin reclamar'}</span>
              </span>
              <a href={`/dashboard?como=${f.slug}&vista=pro`} className="text-xs text-accent hover:underline">Ver como PRO</a>
              <a href={`/dashboard?como=${f.slug}&vista=real`} className="text-xs text-zinc-400 hover:underline">Plan real</a>
              <button
                onClick={() => { setAlta(f); setEmail(''); setVerificacion(''); setNota(''); setEstado(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="text-xs text-zinc-400 hover:text-accent hover:underline"
              >
                Alta
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
