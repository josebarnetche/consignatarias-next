'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileText, History, TrendingUp, RefreshCw } from 'lucide-react';
import { DTEUploader, DTEHistory } from '@/components/dte';
import { createClient } from '@/lib/supabase-browser';
import { DTEData } from '@/hooks/useOCR';
import { trackDtePageView, trackDteSave, trackDteMilestone } from '@/lib/analytics';

export default function MisGuiasPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dteCount, setDteCount] = useState<number | null>(null);
  const supabase = createClient();

  // Track page view on mount
  useEffect(() => {
    trackDtePageView();
    
    // Get current DT-e count for first-upload detection
    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('user_dtes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setDteCount(count || 0);
      }
    };
    fetchCount();
  }, [supabase]);

  const handleSave = useCallback(async (
    data: DTEData & { ocr_raw_text?: string; ocr_confidence?: number }
  ) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Iniciá sesión para guardar guías');
        return;
      }

      // Map DTEData to database columns
      const dbData = {
        user_id: user.id,
        numero_dte: data.numero_dte || null,
        fecha_emision: data.fecha_emision || null,
        fecha_movimiento: data.fecha_movimiento || null,
        renspa_origen: data.renspa_origen || null,
        titular_origen: data.titular_origen || null,
        establecimiento_origen: data.establecimiento_origen || null,
        renspa_destino: data.renspa_destino || null,
        titular_destino: data.titular_destino || null,
        establecimiento_destino: data.establecimiento_destino || null,
        especie: data.especie || 'bovino',
        cantidad_cabezas: data.cantidad_cabezas || null,
        categorias: data.categorias || {},
        peso_total_kg: data.peso_total_kg || null,
        motivo: data.motivo || null,
        ocr_raw_text: data.ocr_raw_text || null,
        ocr_confidence: data.ocr_confidence || null,
        user_edited: true, // They reviewed the form
      };

      const { error } = await supabase
        .from('user_dtes')
        .insert(dbData);

      if (error) {
        console.error('Error saving DTE:', error);
        alert('Error al guardar la guía. Intentá de nuevo.');
        return;
      }

      // Track the save
      const isFirst = dteCount === 0;
      trackDteSave(isFirst, data.cantidad_cabezas || null);
      
      // Update count and check for milestones
      const newCount = (dteCount || 0) + 1;
      setDteCount(newCount);
      trackDteMilestone(newCount);

      // Refresh history
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error saving DTE:', err);
      alert('Error al guardar la guía');
    } finally {
      setSaving(false);
    }
  }, [supabase]);

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
          <DTEUploader onSave={handleSave} />
        </div>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Mi historial
            </h2>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
          <DTEHistory key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
