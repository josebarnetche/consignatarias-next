'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, GitCompare, ChevronDown, TrendingUp, Calendar } from 'lucide-react';

interface UserDTE {
  id: string;
  fecha_movimiento: string | null;
  cantidad_cabezas: number | null;
  categorias: Record<string, number>;
  motivo: string | null;
}

interface DTEPeriodCompareProps {
  dtes: UserDTE[];
}

type PeriodOption = {
  label: string;
  value: string;
  getRange: () => { start: Date; end: Date };
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const _MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                           'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getPeriodOptions(): PeriodOption[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const options: PeriodOption[] = [];
  
  // Current month
  options.push({
    label: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
    value: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
    getRange: () => ({
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentMonth + 1, 0),
    }),
  });
  
  // Previous 11 months
  for (let i = 1; i <= 11; i++) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    options.push({
      label: `${MONTH_NAMES[m]} ${y}`,
      value: `${y}-${String(m + 1).padStart(2, '0')}`,
      getRange: () => ({
        start: new Date(y, m, 1),
        end: new Date(y, m + 1, 0),
      }),
    });
  }
  
  // Quarters
  const currentQuarter = Math.floor(currentMonth / 3);
  for (let q = currentQuarter; q >= 0; q--) {
    const qStart = new Date(currentYear, q * 3, 1);
    const qEnd = new Date(currentYear, q * 3 + 3, 0);
    options.push({
      label: `Q${q + 1} ${currentYear}`,
      value: `Q${q + 1}-${currentYear}`,
      getRange: () => ({ start: qStart, end: qEnd }),
    });
  }
  
  // Previous year quarters
  for (let q = 3; q >= 0; q--) {
    const qStart = new Date(currentYear - 1, q * 3, 1);
    const qEnd = new Date(currentYear - 1, q * 3 + 3, 0);
    options.push({
      label: `Q${q + 1} ${currentYear - 1}`,
      value: `Q${q + 1}-${currentYear - 1}`,
      getRange: () => ({ start: qStart, end: qEnd }),
    });
  }
  
  // Years
  options.push({
    label: `${currentYear}`,
    value: `year-${currentYear}`,
    getRange: () => ({
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    }),
  });
  
  options.push({
    label: `${currentYear - 1}`,
    value: `year-${currentYear - 1}`,
    getRange: () => ({
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
    }),
  });
  
  return options;
}

function calcPeriodStats(dtes: UserDTE[], start: Date, end: Date) {
  const filtered = dtes.filter(d => {
    if (!d.fecha_movimiento) return false;
    const date = new Date(d.fecha_movimiento);
    return date >= start && date <= end;
  });
  
  const totalDtes = filtered.length;
  const totalCabezas = filtered.reduce((sum, d) => sum + (d.cantidad_cabezas || 0), 0);
  
  // Category breakdown
  const categories: Record<string, number> = {};
  filtered.forEach(dte => {
    if (dte.categorias) {
      Object.entries(dte.categorias).forEach(([cat, count]) => {
        const normalized = cat.toLowerCase().replace(/s$/, '');
        categories[normalized] = (categories[normalized] || 0) + count;
      });
    }
  });
  
  // Motivos breakdown
  const motivos: Record<string, number> = {};
  filtered.forEach(dte => {
    if (dte.motivo) {
      motivos[dte.motivo] = (motivos[dte.motivo] || 0) + (dte.cantidad_cabezas || 0);
    }
  });
  
  // Average per DTE
  const avgCabezasPerDte = totalDtes > 0 ? Math.round(totalCabezas / totalDtes) : 0;
  
  return {
    totalDtes,
    totalCabezas,
    avgCabezasPerDte,
    categories,
    motivos,
    isEmpty: totalDtes === 0,
  };
}

function formatChange(current: number, previous: number): { value: string; type: 'up' | 'down' | 'same' } {
  if (previous === 0) {
    if (current === 0) return { value: '—', type: 'same' };
    return { value: '+∞', type: 'up' };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  if (Math.abs(change) < 1) return { value: '0%', type: 'same' };
  
  const sign = change > 0 ? '+' : '';
  return {
    value: `${sign}${Math.round(change)}%`,
    type: change > 0 ? 'up' : 'down',
  };
}

export function DTEPeriodCompare({ dtes }: DTEPeriodCompareProps) {
  const periodOptions = useMemo(() => getPeriodOptions(), []);
  
  // Default: this month vs last month
  const [period1, setPeriod1] = useState(periodOptions[0]?.value || '');
  const [period2, setPeriod2] = useState(periodOptions[1]?.value || '');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { stats1, stats2, comparison } = useMemo(() => {
    const opt1 = periodOptions.find(p => p.value === period1);
    const opt2 = periodOptions.find(p => p.value === period2);
    
    if (!opt1 || !opt2) {
      return { stats1: null, stats2: null, comparison: null };
    }
    
    const range1 = opt1.getRange();
    const range2 = opt2.getRange();
    
    const s1 = calcPeriodStats(dtes, range1.start, range1.end);
    const s2 = calcPeriodStats(dtes, range2.start, range2.end);
    
    return {
      stats1: { ...s1, label: opt1.label },
      stats2: { ...s2, label: opt2.label },
      comparison: {
        dtes: formatChange(s1.totalDtes, s2.totalDtes),
        cabezas: formatChange(s1.totalCabezas, s2.totalCabezas),
        avgPerDte: formatChange(s1.avgCabezasPerDte, s2.avgCabezasPerDte),
      },
    };
  }, [dtes, period1, period2, periodOptions]);
  
  // Need at least 2 DTEs to compare
  if (dtes.length < 2) return null;
  
  // Check if there's data in at least one non-empty period
  const hasData = stats1 && stats2 && (!stats1.isEmpty || !stats2.isEmpty);
  
  const ChangeIndicator = ({ change }: { change: { value: string; type: 'up' | 'down' | 'same' } }) => {
    if (change.type === 'same') {
      return <span className="text-gray-500 text-sm">{change.value}</span>;
    }
    
    return (
      <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
        change.type === 'up' ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {change.type === 'up' ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        {change.value}
      </span>
    );
  };
  
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-sky-500/5 border border-indigo-500/20 rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <GitCompare className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Comparar períodos</h3>
            <p className="text-xs text-gray-400">Analizá tu evolución mes a mes</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Period Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Período actual</label>
              <select
                value={period1}
                onChange={(e) => setPeriod1(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                           text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {periodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Comparar con</label>
              <select
                value={period2}
                onChange={(e) => setPeriod2(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                           text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {periodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {hasData && stats1 && stats2 && comparison ? (
            <>
              {/* Main Comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* Guías */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ChangeIndicator change={comparison.dtes} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                    <span className="text-white">{stats1.totalDtes}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-gray-400">{stats2.totalDtes}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">guías</p>
                </div>
                
                {/* Cabezas */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ChangeIndicator change={comparison.cabezas} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                    <span className="text-accent">{stats1.totalCabezas.toLocaleString('es-AR')}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-accent/60">{stats2.totalCabezas.toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">cabezas</p>
                </div>
                
                {/* Promedio por DTE */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ChangeIndicator change={comparison.avgPerDte} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-lg font-bold">
                    <span className="text-indigo-400">{stats1.avgCabezasPerDte}</span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-indigo-400/60">{stats2.avgCabezasPerDte}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">cab/guía</p>
                </div>
              </div>
              
              {/* Category Comparison */}
              {(Object.keys(stats1.categories).length > 0 || Object.keys(stats2.categories).length > 0) && (
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Categorías: {stats1.label} vs {stats2.label}
                  </h4>
                  <div className="space-y-2">
                    {/* Merge categories from both periods */}
                    {[...new Set([...Object.keys(stats1.categories), ...Object.keys(stats2.categories)])]
                      .sort((a, b) => {
                        const totalA = (stats1.categories[a] || 0) + (stats2.categories[a] || 0);
                        const totalB = (stats1.categories[b] || 0) + (stats2.categories[b] || 0);
                        return totalB - totalA;
                      })
                      .slice(0, 5)
                      .map(cat => {
                        const v1 = stats1.categories[cat] || 0;
                        const v2 = stats2.categories[cat] || 0;
                        const change = formatChange(v1, v2);
                        
                        return (
                          <div key={cat} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 capitalize">{cat}s</span>
                            <div className="flex items-center gap-3">
                              <span className="text-white">{v1.toLocaleString('es-AR')}</span>
                              <span className="text-gray-600">vs</span>
                              <span className="text-gray-400">{v2.toLocaleString('es-AR')}</span>
                              <ChangeIndicator change={change} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* Insight message */}
              {comparison.cabezas.type !== 'same' && (
                <div className={`px-3 py-2 rounded-lg text-sm ${
                  comparison.cabezas.type === 'up' 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}>
                  {comparison.cabezas.type === 'up' ? '📈' : '📉'}{' '}
                  {comparison.cabezas.type === 'up' 
                    ? `Aumentaste tu volumen ${comparison.cabezas.value} respecto a ${stats2.label}.`
                    : `Tu volumen bajó ${comparison.cabezas.value.replace('-', '')} respecto a ${stats2.label}.`
                  }
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay datos suficientes en los períodos seleccionados</p>
              <p className="text-xs text-gray-500 mt-1">Subí más guías para ver la comparativa</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
