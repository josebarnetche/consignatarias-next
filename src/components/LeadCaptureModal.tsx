'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface LeadCaptureModalProps {
  slug: string
  consignatariaName: string
  whatsappUrl: string
  source?: 'profile' | 'go_landing' | 'remate'
  remateId?: number
  onClose: () => void
}

/**
 * Lead Capture Modal
 * 
 * Shown before WhatsApp redirect to capture contact info.
 * "Dejá tus datos para que te contacten" or skip to WhatsApp.
 */
export default function LeadCaptureModal({
  slug,
  consignatariaName,
  whatsappUrl,
  source = 'profile',
  remateId,
  onClose,
}: LeadCaptureModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          phone: phone || undefined,
          email: email || undefined,
          message: message || undefined,
          source,
          remateId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar')
        return
      }

      setSubmitted(true)
      
      // Auto-redirect to WhatsApp after 1.5s
      setTimeout(() => {
        window.open(whatsappUrl, '_blank')
        onClose()
      }, 1500)
    } catch {
      setError('Error de conexión')
    } finally {
      setIsSubmitting(false)
    }
  }

  const skipToWhatsApp = () => {
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {submitted ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                ¡Consulta enviada!
              </h3>
              <p className="text-zinc-400 mb-4">
                {consignatariaName} recibirá tus datos y te contactará.
              </p>
              <p className="text-sm text-zinc-500">
                Redirigiendo a WhatsApp...
              </p>
            </div>
          ) : (
            /* Form State */
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Contactar a {consignatariaName}
                </h3>
                <p className="text-sm text-zinc-400">
                  Dejá tus datos para que te contacten directamente
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                    Tu nombre *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Juan Pérez"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 9 11 1234-5678"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@ejemplo.com"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                    Mensaje (opcional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Quisiera consultar sobre..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !name || (!phone && !email)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar y continuar a WhatsApp'}
                </button>
              </form>

              {/* Skip option */}
              <div className="mt-4 text-center">
                <button
                  onClick={skipToWhatsApp}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Saltar y ir directo a WhatsApp →
                </button>
              </div>

              <p className="mt-4 text-xs text-zinc-600 text-center">
                Tus datos se envían solo a {consignatariaName}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
