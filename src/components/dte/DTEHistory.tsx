'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { FileText, Trash2, Edit2, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import { trackDteDelete } from '@/lib/analytics';
import { DTEStats } from './DTEStats';

interface UserDTE {
  id: string;
  numero_dte: string | null;
  fecha_emision: string | null;
  fecha_movimiento: string | null;
  renspa_origen: string | null;
  titular_origen: string | null;
  establecimiento_origen: string | null;
  renspa_destino: string | null;
  titular_destino: string | null;
  establecimiento_destino: string | null;
  especie: string;
  cantidad_cabezas: number | null;
  categorias: Record<string, number>;
  peso_total_kg: number | null;
  motivo: string | null;
  notas: string | null;
  ocr_confidence: number | null;
  created_at: string;
}

interface DTEHistoryProps {
  onEdit?: (dte: UserDTE) => void;
}

export function DTEHistory({ onEdit }: DTEHistoryProps) {
  const [dtes, setDtes] = useState<UserDTE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalDtes: 0,
    totalCabezas: 0,
    thisMonth: 0,
  });

  const supabase = createClient();

  const fetchDTEs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Iniciá sesión para ver tus guías');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_dtes')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha_movimiento', { ascending: false, nullsFirst: false });

      if (fetchError) {
        throw fetchError;
      }

      setDtes(data || []);

      // Calculate stats
      const now = new Date();
      const thisMonth = data?.filter(d => {
        if (!d.fecha_movimiento) return false;
        const date = new Date(d.fecha_movimiento);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }) || [];

      setStats({
        totalDtes: data?.length || 0,
        totalCabezas: data?.reduce((sum, d) => sum + (d.cantidad_cabezas || 0), 0) || 0,
        thisMonth: thisMonth.length,
      });

    } catch (err) {
      console.error('Error fetching DTEs:', err);
      setError('Error al cargar las guías');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDTEs();
  }, [fetchDTEs]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta guía?')) return;

    setDeletingId(id);
    try {
      const { error: deleteError } = await supabase
        .from('user_dtes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      trackDteDelete();
      setDtes(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting DTE:', err);
      alert('Error al eliminar la guía');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-amber-500 animate-spin" />
        <p className="text-gray-400">Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (dtes.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {/* Hero section */}
        <div className="p-8 text-center border-b border-gray-700/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <FileText className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Tu historial está vacío
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Subí tu primera guía DT-e y empezá a construir tu historial de movimientos.
          </p>
        </div>
        
        {/* Benefits grid */}
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-700/50">
          <div className="p-6 text-center">
            <div className="text-2xl mb-2">📸</div>
            <p className="text-sm font-medium text-white mb-1">Foto → Datos</p>
            <p className="text-xs text-gray-500">OCR automático extrae toda la info</p>
          </div>
          <div className="p-6 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-medium text-white mb-1">Analytics gratis</p>
            <p className="text-xs text-gray-500">Cabezas por mes, categorías, tendencias</p>
          </div>
          <div className="p-6 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-sm font-medium text-white mb-1">Tus datos, tu control</p>
            <p className="text-xs text-gray-500">Exportá cuando quieras, 100% privado</p>
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 bg-gray-800/30 text-center">
          <p className="text-sm text-gray-400 mb-3">
            👆 Usá el formulario de arriba para subir tu primera guía
          </p>
          <a
            href="https://wa.me/5493777123456?text=Hola%2C%20necesito%20ayuda%20para%20subir%20mi%20primera%20guía%20DT-e"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            ¿Necesitás ayuda? Contactanos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalDtes}</p>
          <p className="text-sm text-gray-400">Guías totales</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats.totalCabezas.toLocaleString('es-AR')}</p>
          <p className="text-sm text-gray-400">Cabezas movidas</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{stats.thisMonth}</p>
          <p className="text-sm text-gray-400">Este mes</p>
        </div>
      </div>

      {/* Gamification & Analytics - Lock-in enhancer */}
      <DTEStats dtes={dtes} />

      {/* History list */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">N° DT-e</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Origen</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Destino</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Cabezas</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Motivo</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {dtes.map((dte) => (
                <tr key={dte.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-white">
                    {formatDate(dte.fecha_movimiento)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                    {dte.numero_dte || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm">{dte.establecimiento_origen || dte.titular_origen || '—'}</div>
                    {dte.renspa_origen && (
                      <div className="text-gray-500 text-xs">{dte.renspa_origen}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm">{dte.establecimiento_destino || dte.titular_destino || '—'}</div>
                    {dte.renspa_destino && (
                      <div className="text-gray-500 text-xs">{dte.renspa_destino}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-500 font-medium">
                    {dte.cantidad_cabezas?.toLocaleString('es-AR') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {dte.motivo && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-300 capitalize">
                        {dte.motivo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(dte)}
                          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(dte.id)}
                        disabled={deletingId === dte.id}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === dte.id ? (
                          <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export hint */}
      <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-200">
            <strong>PRO:</strong> Exportá tu historial completo a Excel con analytics detallado.
          </p>
        </div>
        <a 
          href="/planes" 
          className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
        >
          Ver planes →
        </a>
      </div>
    </div>
  );
}
