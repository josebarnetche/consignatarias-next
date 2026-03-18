'use client';

import { FileText, History, TrendingUp } from 'lucide-react';
import { DTEUploader } from '@/components/dte';

export default function MisGuiasPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mis Guías DT-e
          </h1>
          <p className="text-gray-400">
            Subí tus documentos de tránsito y construí tu historial de movimientos.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <FileText className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold text-white mb-1">Extracción automática</h3>
            <p className="text-sm text-gray-400">
              Subí una foto y extraemos los datos automáticamente.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <History className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold text-white mb-1">Historial completo</h3>
            <p className="text-sm text-gray-400">
              Todas tus guías en un solo lugar, buscables y exportables.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <TrendingUp className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold text-white mb-1">Analytics</h3>
            <p className="text-sm text-gray-400">
              Visualizá tu operación: cabezas por mes, categorías, tendencias.
            </p>
          </div>
        </div>

        {/* Uploader */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">
            Subir nueva guía
          </h2>
          <DTEUploader 
            onSave={(data) => {
              // TODO: Save to Supabase
              console.log('DTE saved:', data);
            }}
          />
        </div>

        {/* History placeholder */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">
            Mi historial
          </h2>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-500">
              Todavía no subiste ninguna guía.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Subí tu primera guía DT-e para empezar a construir tu historial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
