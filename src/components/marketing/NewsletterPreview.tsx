'use client'

import { Mail, Calendar, MapPin, Users } from 'lucide-react'

interface NewsletterPreviewProps {
  consignatariaName?: string
}

export default function NewsletterPreview({ consignatariaName = 'Tu Consignataria' }: NewsletterPreviewProps) {
  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white text-zinc-900 max-w-md mx-auto shadow-xl">
      {/* Email Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">consignatarias.com.ar</span>
        </div>
      </div>
      
      {/* Email Body */}
      <div className="p-4">
        <p className="text-xs text-zinc-500 mb-2">Nuevo remate destacado</p>
        
        <h3 className="text-lg font-bold text-zinc-900 mb-3 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
            PRO
          </span>
          {consignatariaName}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Jueves 20 de Marzo, 10:00hs</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>Mercedes, Corrientes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Users className="w-4 h-4 text-amber-500" />
            <span>~500 cabezas • Invernada</span>
          </div>
        </div>
        
        <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
          Ver detalles del remate →
        </button>
        
        <p className="text-center text-xs text-zinc-400 mt-3">
          Enviado a 500+ productores suscritos
        </p>
      </div>
      
      {/* Email Footer */}
      <div className="bg-zinc-50 px-4 py-2 border-t border-zinc-200">
        <p className="text-xs text-zinc-400 text-center">
          Este es un ejemplo del email que reciben los suscriptores
        </p>
      </div>
    </div>
  )
}
