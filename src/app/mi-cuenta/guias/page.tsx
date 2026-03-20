'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { FileText, History, TrendingUp, RefreshCw, Camera, Zap, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import { DTEUploader, DTEHistory, SocialProofStats, MilestoneBadges, ActivationChecklist } from '@/components/dte';
import { createClient } from '@/lib/supabase-browser';
import { DTEData } from '@/hooks/useOCR';
import { trackDtePageView, trackDteSave, trackDteMilestone } from '@/lib/analytics';
import { HowToSchema } from '@/components/seo/JsonLd';

export default function MisGuiasPage() {
  const [refreshKey, setRefreshKey] = useState(0);
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
    }
  }, [supabase, dteCount]);

  // HowTo structured data for SEO
  const howToSteps = [
    {
      name: 'Fotografiá tu guía DT-e',
      text: 'Usá tu celular para sacar una foto clara de tu documento de tránsito electrónico (DT-e). Asegurate de que todo el texto sea legible.',
    },
    {
      name: 'Subí la imagen',
      text: 'Arrastrá la foto al área de carga o hacé clic para seleccionarla. Aceptamos JPG, PNG, WEBP y PDF.',
    },
    {
      name: 'Revisá los datos extraídos',
      text: 'Nuestro OCR extrae automáticamente los datos: número de guía, RENSPA, cantidad de cabezas, fechas y más. Revisá y corregí si es necesario.',
    },
    {
      name: 'Guardá en tu historial',
      text: 'Confirmá los datos y guardá la guía en tu historial personal. Podrás buscarla, exportarla y ver estadísticas de tu operación.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navigation breadcrumb */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Mi Panel</span>
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-medium">Mis Guías DT-e</span>
        </div>
      </div>
      
      {/* HowTo Schema for SEO */}
      <HowToSchema
        name="Cómo subir y guardar guías DT-e en Consignatarias.com.ar"
        description="Guía paso a paso para digitalizar tus documentos de tránsito electrónico (DT-e) usando reconocimiento óptico de caracteres (OCR) y construir tu historial de movimientos ganaderos."
        steps={howToSteps}
        totalTime="PT2M"
      />
      
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mis Guías DT-e
          </h1>
          <p className="text-gray-400 mb-4">
            Subí tus documentos de tránsito y construí tu historial de movimientos.
          </p>
          {/* Social proof */}
          <SocialProofStats />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Activation checklist for new users */}
        {dteCount !== null && (
          <ActivationChecklist dteCount={dteCount} />
        )}

        {/* How it works - Step by step visual guide */}
        <div className="mb-12 bg-gradient-to-r from-amber-900/20 to-gray-900/50 border border-amber-800/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            ¿Cómo funciona?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {howToSteps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step number */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 h-full">
                  <div className="flex items-start gap-2 mb-2">
                    {index === 0 && <Camera className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {index === 1 && <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {index === 2 && <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    {index === 3 && <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                    <h3 className="text-sm font-medium text-white">{step.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Tus datos se guardan de forma privada y segura. Solo vos podés verlos.
          </p>
        </div>

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
          <div className="flex items-center justify-between mb-4">
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
          
          {/* Milestone badges - gamification */}
          {dteCount !== null && dteCount > 0 && (
            <div className="mb-6">
              <MilestoneBadges dteCount={dteCount} />
            </div>
          )}
          
          <DTEHistory key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
