'use client';

import { useState } from 'react';
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { DTEData } from '@/hooks/useOCR';

interface DTEFormProps {
  initialData: DTEData;
  onSubmit: (data: DTEData) => void;
  onCancel: () => void;
}

const CATEGORIAS = [
  'novillos',
  'novillitos', 
  'vaquillonas',
  'vacas',
  'toros',
  'terneros',
  'terneras',
  'toritos',
  'vientres',
];

const MOTIVOS = [
  { value: 'remate', label: 'Remate' },
  { value: 'faena', label: 'Faena' },
  { value: 'invernada', label: 'Invernada' },
  { value: 'cria', label: 'Cría' },
  { value: 'recria', label: 'Recría' },
  { value: 'engorde', label: 'Engorde' },
  { value: 'exposicion', label: 'Exposición' },
];

export function DTEForm({ initialData, onSubmit, onCancel }: DTEFormProps) {
  const [data, setData] = useState<DTEData>(initialData);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categorias, setCategorias] = useState<Record<string, number>>(
    initialData.categorias || {}
  );

  const handleChange = (field: keyof DTEData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoriaChange = (categoria: string, cantidad: number) => {
    setCategorias(prev => {
      const updated = { ...prev };
      if (cantidad > 0) {
        updated[categoria] = cantidad;
      } else {
        delete updated[categoria];
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...data,
      categorias: Object.keys(categorias).length > 0 ? categorias : undefined,
    });
  };

  const totalCategorias = Object.values(categorias).reduce((sum, n) => sum + n, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Nº DT-e
          </label>
          <input
            type="text"
            value={data.numero_dte || ''}
            onChange={(e) => handleChange('numero_dte', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="24-0012345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Cabezas
          </label>
          <input
            type="number"
            value={data.cantidad_cabezas || ''}
            onChange={(e) => handleChange('cantidad_cabezas', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="150"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Fecha Emisión
          </label>
          <input
            type="date"
            value={data.fecha_emision || ''}
            onChange={(e) => handleChange('fecha_emision', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Fecha Movimiento
          </label>
          <input
            type="date"
            value={data.fecha_movimiento || ''}
            onChange={(e) => handleChange('fecha_movimiento', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            RENSPA Origen
          </label>
          <input
            type="text"
            value={data.renspa_origen || ''}
            onChange={(e) => handleChange('renspa_origen', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="04.123.0.12345/00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            RENSPA Destino
          </label>
          <input
            type="text"
            value={data.renspa_destino || ''}
            onChange={(e) => handleChange('renspa_destino', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="04.789.0.67890/00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Motivo
        </label>
        <select
          value={data.motivo || ''}
          onChange={(e) => handleChange('motivo', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Seleccionar...</option>
          {MOTIVOS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Categorias */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Categorías {totalCategorias > 0 && (
            <span className="text-amber-500">({totalCategorias} cabezas)</span>
          )}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIAS.map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={categorias[cat] || ''}
                onChange={(e) => handleCategoriaChange(cat, parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-amber-500"
                placeholder="0"
              />
              <span className="text-sm text-gray-400 capitalize">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced fields toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Campos avanzados
      </button>

      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Titular Origen
              </label>
              <input
                type="text"
                value={data.titular_origen || ''}
                onChange={(e) => handleChange('titular_origen', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Titular Destino
              </label>
              <input
                type="text"
                value={data.titular_destino || ''}
                onChange={(e) => handleChange('titular_destino', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Establecimiento Origen
              </label>
              <input
                type="text"
                value={data.establecimiento_origen || ''}
                onChange={(e) => handleChange('establecimiento_origen', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Establecimiento Destino
              </label>
              <input
                type="text"
                value={data.establecimiento_destino || ''}
                onChange={(e) => handleChange('establecimiento_destino', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Peso Total (kg)
            </label>
            <input
              type="number"
              value={data.peso_total_kg || ''}
              onChange={(e) => handleChange('peso_total_kg', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="57000"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
