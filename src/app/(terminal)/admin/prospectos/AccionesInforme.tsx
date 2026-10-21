'use client'

import { useState } from 'react'

/**
 * Copiar el informe y, si el envío está encendido, mandarlo. El botón de envío
 * pide confirmación: cada correo a una firma lo decide una persona.
 */
export default function AccionesInforme({
  slug,
  nombre,
  email,
  texto,
  asunto,
  envioHabilitado,
  bloqueo,
}: {
  slug: string
  nombre: string
  email: string | null
  texto: string
  asunto: string
  envioHabilitado: boolean
  /** Motivo por el que no se puede mandar (sin mail, baja, ya recibió). */
  bloqueo: string | null
}) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`Asunto: ${asunto}\n\n${texto}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      setMsg('No se pudo copiar: seleccioná el texto a mano.')
    }
  }

  async function enviar() {
    if (!email || !window.confirm(`¿Mandar el informe a ${nombre} (${email})?`)) return
    setEstado('enviando')
    setMsg(null)
    try {
      const r = await fetch('/api/admin/prospectos/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string; para?: string }
      if (!r.ok) {
        setEstado('error')
        setMsg(j.error ?? `Error ${r.status}`)
        return
      }
      setEstado('ok')
      setMsg(`Enviado a ${j.para ?? email}`)
    } catch {
      setEstado('error')
      setMsg('No hubo respuesta del servidor')
    }
  }

  const btn = 'terminal-btn text-xxs px-2 py-1'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copiar} className={btn}>
        {copiado ? 'Copiado' : 'Copiar mail'}
      </button>
      {email && (
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`}
          className={btn}
        >
          Abrir en mi correo
        </a>
      )}
      <button
        type="button"
        onClick={enviar}
        disabled={!envioHabilitado || !!bloqueo || estado === 'enviando' || estado === 'ok'}
        title={!envioHabilitado ? 'Envío apagado: falta PRO_PROSPECTOS_ENVIO=on en Vercel' : (bloqueo ?? undefined)}
        className={`${btn} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {estado === 'enviando' ? 'Enviando…' : estado === 'ok' ? 'Enviado' : 'Enviar desde hola@'}
      </button>
      {msg && <span className={`text-xxs font-terminal ${estado === 'error' ? 'text-negative' : 'text-positive'}`}>{msg}</span>}
    </div>
  )
}
