'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, TrendingUp } from 'lucide-react';

interface DteStats {
  totalDtes: number;
  uniqueUsers: number;
  recentDtes: number;
  totalCabezas: number;
}

export function SocialProofStats() {
  const [stats, setStats] = useState<DteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats/dte');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching DTE stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-6 text-sm text-gray-500 animate-pulse">
        <div className="h-4 w-32 bg-gray-800 rounded"></div>
        <div className="h-4 w-28 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!stats || stats.totalDtes === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <FileText className="w-4 h-4 text-accent" />
        <span>
          <span className="font-semibold text-white">{stats.totalDtes.toLocaleString('es-AR')}</span>
          {' '}guías procesadas
        </span>
      </div>
      
      {stats.uniqueUsers > 1 && (
        <div className="flex items-center gap-2 text-gray-400">
          <Users className="w-4 h-4 text-accent" />
          <span>
            <span className="font-semibold text-white">{stats.uniqueUsers}</span>
            {' '}productores activos
          </span>
        </div>
      )}

      {stats.totalCabezas > 0 && (
        <div className="flex items-center gap-2 text-gray-400">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span>
            <span className="font-semibold text-white">{stats.totalCabezas.toLocaleString('es-AR')}</span>
            {' '}cabezas registradas
          </span>
        </div>
      )}
    </div>
  );
}
