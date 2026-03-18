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
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-700" />
        <p className="text-gray-500">Todavía no subiste ninguna guía.</p>
        <p className="text-sm text-gray-600 mt-1">
          Subí tu primera guía DT-e para empezar a construir tu historial.
        </p>
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
