'use client';

import { useMemo } from 'react';
import { Trophy, Target, TrendingUp, Calendar, Award, BarChart3, Sparkles } from 'lucide-react';

interface UserDTE {
  id: string;
  fecha_movimiento: string | null;
  cantidad_cabezas: number | null;
  categorias: Record<string, number>;
  motivo: string | null;
}

interface DTEStatsProps {
  dtes: UserDTE[];
}

// Milestone thresholds
const DTE_MILESTONES = [5, 10, 25, 50, 100];
const CABEZAS_MILESTONES = [500, 1000, 2500, 5000, 10000, 25000];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function DTEStats({ dtes }: DTEStatsProps) {
  const stats = useMemo(() => {
    const totalDtes = dtes.length;
    const totalCabezas = dtes.reduce((sum, d) => sum + (d.cantidad_cabezas || 0), 0);

    // Calculate this month's activity
    const now = new Date();
    const thisMonth = dtes.filter(d => {
      if (!d.fecha_movimiento) return false;
      const date = new Date(d.fecha_movimiento);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const thisMonthCabezas = thisMonth.reduce((sum, d) => sum + (d.cantidad_cabezas || 0), 0);

    // Find next milestones
    const nextDteMilestone = DTE_MILESTONES.find(m => m > totalDtes) || null;
    const nextCabezasMilestone = CABEZAS_MILESTONES.find(m => m > totalCabezas) || null;

    // Calculate milestone progress
    const prevDteMilestone = DTE_MILESTONES.filter(m => m <= totalDtes).pop() || 0;
    const dteProgress = nextDteMilestone 
      ? ((totalDtes - prevDteMilestone) / (nextDteMilestone - prevDteMilestone)) * 100 
      : 100;

    const prevCabezasMilestone = CABEZAS_MILESTONES.filter(m => m <= totalCabezas).pop() || 0;
    const cabezasProgress = nextCabezasMilestone 
      ? ((totalCabezas - prevCabezasMilestone) / (nextCabezasMilestone - prevCabezasMilestone)) * 100 
      : 100;

    // Aggregate categories across all DTEs
    const categoryTotals: Record<string, number> = {};
    dtes.forEach(dte => {
      if (dte.categorias) {
        Object.entries(dte.categorias).forEach(([cat, count]) => {
          const normalizedCat = cat.toLowerCase().replace(/s$/, ''); // normalize plural
          categoryTotals[normalizedCat] = (categoryTotals[normalizedCat] || 0) + count;
        });
      }
    });

    // Calculate achieved milestones for badges
    const achievedDteMilestones = DTE_MILESTONES.filter(m => m <= totalDtes);
    const achievedCabezasMilestones = CABEZAS_MILESTONES.filter(m => m <= totalCabezas);

    // === PERSONAL INSIGHTS (lock-in: shows value of accumulated data) ===
    
    // Group by month for monthly analysis
    const monthlyData: Record<string, { dtes: number; cabezas: number }> = {};
    dtes.forEach(dte => {
      if (!dte.fecha_movimiento) return;
      const date = new Date(dte.fecha_movimiento);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { dtes: 0, cabezas: 0 };
      monthlyData[key].dtes += 1;
      monthlyData[key].cabezas += dte.cantidad_cabezas || 0;
    });

    const monthKeys = Object.keys(monthlyData).sort();
    const activeMonths = monthKeys.length;
    
    // Average monthly volume (only count months with activity)
    const avgMonthlyCabezas = activeMonths > 0 
      ? Math.round(totalCabezas / activeMonths) 
      : 0;
    
    // Peak month
    let peakMonth: { name: string; cabezas: number } | null = null;
    if (activeMonths > 0) {
      const peak = Object.entries(monthlyData).reduce((max, [key, data]) => 
        data.cabezas > max.cabezas ? { key, cabezas: data.cabezas } : max
      , { key: '', cabezas: 0 });
      
      const [year, month] = peak.key.split('-');
      peakMonth = {
        name: `${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
        cabezas: peak.cabezas,
      };
    }

    // Top category with percentage
    let topCategory: { name: string; count: number; percentage: number } | null = null;
    const categoryEntries = Object.entries(categoryTotals);
    if (categoryEntries.length > 0) {
      const totalInCategories = categoryEntries.reduce((sum, [, count]) => sum + count, 0);
      const top = categoryEntries.reduce((max, [cat, count]) => 
        count > max.count ? { name: cat, count } : max
      , { name: '', count: 0 });
      
      topCategory = {
        name: top.name,
        count: top.count,
        percentage: totalInCategories > 0 ? Math.round((top.count / totalInCategories) * 100) : 0,
      };
    }

    // Trend: compare last 2 months (if data available)
    let trend: 'up' | 'down' | 'stable' | null = null;
    if (monthKeys.length >= 2) {
      const lastMonth = monthlyData[monthKeys[monthKeys.length - 1]];
      const prevMonth = monthlyData[monthKeys[monthKeys.length - 2]];
      if (lastMonth.cabezas > prevMonth.cabezas * 1.1) trend = 'up';
      else if (lastMonth.cabezas < prevMonth.cabezas * 0.9) trend = 'down';
      else trend = 'stable';
    }

    return {
      totalDtes,
      totalCabezas,
      thisMonthDtes: thisMonth.length,
      thisMonthCabezas,
      nextDteMilestone,
      nextCabezasMilestone,
      dtesToNextMilestone: nextDteMilestone ? nextDteMilestone - totalDtes : null,
      cabezasToNextMilestone: nextCabezasMilestone ? nextCabezasMilestone - totalCabezas : null,
      dteProgress,
      cabezasProgress,
      categoryTotals,
      achievedDteMilestones,
      achievedCabezasMilestones,
      // Personal insights
      avgMonthlyCabezas,
      peakMonth,
      topCategory,
      trend,
      activeMonths,
    };
  }, [dtes]);

  if (dtes.length === 0) return null;

  const categoryColors: Record<string, string> = {
    novillo: 'bg-amber-500',
    novillito: 'bg-yellow-500',
    vaquillona: 'bg-orange-500',
    vaca: 'bg-red-500',
    toro: 'bg-purple-500',
    ternero: 'bg-green-500',
    ternera: 'bg-emerald-500',
  };

  const sortedCategories = Object.entries(stats.categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const maxCategoryCount = Math.max(...sortedCategories.map(([, count]) => count), 1);

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* DTE Milestone Progress */}
        {stats.nextDteMilestone && (
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Target className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Próximo logro</p>
                <p className="text-lg font-bold text-white">{stats.nextDteMilestone} guías</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.dteProgress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-amber-400/80">
              {stats.dtesToNextMilestone === 1 
                ? '¡Solo 1 guía más!' 
                : `${stats.dtesToNextMilestone} guías más para desbloquear`}
            </p>
          </div>
        )}

        {/* Cabezas Milestone Progress */}
        {stats.nextCabezasMilestone && (
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Próximo hito</p>
                <p className="text-lg font-bold text-white">{stats.nextCabezasMilestone.toLocaleString('es-AR')} cabezas</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.cabezasProgress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-emerald-400/80">
              {stats.cabezasToNextMilestone?.toLocaleString('es-AR')} cabezas más
            </p>
          </div>
        )}
      </div>

      {/* Monthly Activity */}
      {stats.thisMonthDtes > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white">Este mes</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{stats.thisMonthDtes}</p>
              <p className="text-sm text-gray-400">guías subidas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-400">{stats.thisMonthCabezas.toLocaleString('es-AR')}</p>
              <p className="text-sm text-gray-400">cabezas movidas</p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Insights — HIGH LOCK-IN: Shows unique value of accumulated data */}
      {stats.activeMonths >= 2 && (
        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Tu perfil ganadero</h3>
              <p className="text-xs text-gray-400">Basado en {stats.activeMonths} meses de datos</p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Average Monthly Volume */}
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-gray-800 rounded-lg">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {stats.avgMonthlyCabezas.toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-400">cabezas promedio/mes</p>
              </div>
            </div>

            {/* Peak Month */}
            {stats.peakMonth && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-gray-800 rounded-lg">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{stats.peakMonth.name}</p>
                  <p className="text-xs text-gray-400">
                    mes récord ({stats.peakMonth.cabezas.toLocaleString('es-AR')} cab)
                  </p>
                </div>
              </div>
            )}

            {/* Top Category */}
            {stats.topCategory && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-gray-800 rounded-lg">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white capitalize">{stats.topCategory.name}s</p>
                  <p className="text-xs text-gray-400">
                    categoría principal ({stats.topCategory.percentage}% del total)
                  </p>
                </div>
              </div>
            )}

            {/* Trend */}
            {stats.trend && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-gray-800 rounded-lg">
                  <TrendingUp className={`w-4 h-4 ${
                    stats.trend === 'up' ? 'text-emerald-400' : 
                    stats.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className={`text-lg font-bold ${
                    stats.trend === 'up' ? 'text-emerald-400' : 
                    stats.trend === 'down' ? 'text-red-400' : 'text-white'
                  }`}>
                    {stats.trend === 'up' ? 'En alza' : 
                     stats.trend === 'down' ? 'En baja' : 'Estable'}
                  </p>
                  <p className="text-xs text-gray-400">tendencia vs mes anterior</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown (visual lock-in - shows value of data) */}
      {sortedCategories.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Tu composición de hacienda</h3>
          <div className="space-y-3">
            {sortedCategories.map(([category, count]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300 capitalize">{category}s</span>
                  <span className="text-gray-400">{count.toLocaleString('es-AR')}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${categoryColors[category] || 'bg-gray-500'} transition-all duration-500`}
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achieved Badges */}
      {(stats.achievedDteMilestones.length > 0 || stats.achievedCabezasMilestones.length > 0) && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-white">Tus logros</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.achievedDteMilestones.map(milestone => (
              <div 
                key={`dte-${milestone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm text-amber-300">{milestone} guías</span>
              </div>
            ))}
            {stats.achievedCabezasMilestones.map(milestone => (
              <div 
                key={`cabezas-${milestone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full"
              >
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-emerald-300">{milestone.toLocaleString('es-AR')} cab</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
