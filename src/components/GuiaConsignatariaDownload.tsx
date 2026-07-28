'use client'

import { useState } from 'react'
import Image from 'next/image'
import { trackValueEvent } from '@/lib/analytics'

const PDF_URL = '/descargas/que-es-una-consignataria.pdf'
const SOURCE = 'guia-consignataria'

/**
 * Lead magnet de /que-es-una-consignataria: la guía visual (5 láminas, PDF)
 * a cambio del email. Suscribe al newsletter vía /api/newsletter y dispara
 * la descarga al confirmar.
 */
export default function GuiaConsignatariaDownload() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function startDownload() {
    const a = document.createElement('a')
    a.href = PDF_URL
    a.download = 'que-es-una-consignataria.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: SOURCE }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setEmail('')
        trackValueEvent('newsletter_subscribe', { meta: { source: SOURCE } })
        startDownload()
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al suscribirse')
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 5000)
      }
    } catch {
      setStatus('error')
      setMessage('Error de conexión')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)
    }
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch">
        <div className="sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-800 bg-zinc-950 flex items-center">
          <Image
            src="/marca/educativas/educativa-01-definicion.png"
            alt="Primera lámina de la guía: qué es una consignataria"
            width={512}
            height={288}
            className="w-full h-auto"
          />
        </div>
        <div className="flex-1 p-5">
          <p className="text-zinc-200 font-medium mb-1">
            La guía visual, en PDF
          </p>
          <p className="text-zinc-400 text-xs leading-relaxed mb-4">
            Las 5 láminas de esta página en un PDF para guardar o compartir: la definición, los
            servicios, el remate paso a paso, la liquidación y la cadena ganadera. Dejás tu email,
            te la llevás — y cada mes te llega el cierre del mercado. Gratis.
          </p>

          {status === 'success' ? (
            <div className="text-xs text-zinc-400">
              <span className="text-emerald-400">✓ Listo, la descarga ya empezó.</span>{' '}
              Si no arranca,{' '}
              <a href={PDF_URL} download className="text-accent hover:text-accent-bright underline">
                descargala acá
              </a>
              .
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={status === 'loading'}
                className="flex-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'loading' ? 'Enviando...' : 'Descargar la guía'}
              </button>
            </form>
          )}

          {status === 'error' && message && (
            <div className="mt-2 text-xs text-red-400">{message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
