'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  completed: boolean;
}

interface ActivationChecklistProps {
  dteCount: number;
}

/**
 * Shows a gamified checklist for new users to guide activation.
 * Disappears once user reaches 3+ DTEs (fully activated).
 */
export function ActivationChecklist({ dteCount }: ActivationChecklistProps) {
  const [hasAlerts, setHasAlerts] = useState(false);
  const [hasSavedRemates, setHasSavedRemates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Consumimos el endpoint server-side en vez de consultar tablas directo con el
    // client anon: antes hacía `.from('alerts')`/`.from('saved_remates')` — tablas
    // INEXISTENTES (los nombres reales son `alertas`/`remate_favorites`) y, aunque
    // existieran, RLS las bloquea al browser. El endpoint usa la tabla real
    // (`user_favorites`) con service_role. Ver /api/me/activation.
    let cancelled = false;
    fetch('/api/me/activation')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setHasAlerts(Boolean(data.hasAlerts));
        setHasSavedRemates(Boolean(data.hasSavedRemates));
      })
      .catch(() => { /* best-effort */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Hide once user is fully activated (3+ DTEs)
  if (dteCount >= 3) return null;
  
  // Hide while loading
  if (isLoading) return null;

  const items: ChecklistItem[] = [
    {
      id: 'first-dte',
      label: 'Subí tu primera guía',
      description: 'Digitalizá tu primera DT-e para comenzar tu historial',
      completed: dteCount >= 1,
    },
    {
      id: 'second-dte',
      label: 'Sumá una segunda guía',
      description: 'Construí tu historial con más operaciones',
      completed: dteCount >= 2,
    },
    {
      id: 'create-alert',
      label: 'Creá una alerta de remates',
      description: 'Recibí notificaciones de nuevos remates en tu zona',
      href: '/remates',
      completed: hasAlerts,
    },
    {
      id: 'save-remate',
      label: 'Guardá un remate',
      description: 'Marcá remates de interés para no perdértelos',
      href: '/remates',
      completed: hasSavedRemates,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = (completedCount / items.length) * 100;

  // All complete? Show celebration briefly, then hide
  if (completedCount === items.length) {
    return (
      <div className="bg-gradient-to-r from-green-900/30 to-gray-900/50 border border-green-700/50 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-green-400">¡Activación completa!</h3>
            <p className="text-sm text-gray-400">
              Completaste todos los pasos. Ya sos un usuario activo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/20 to-gray-900/50 border border-blue-800/30 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-blue-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tu progreso de activación
          </h3>
          <p className="text-sm text-gray-500">
            Completá estos pasos para aprovechar la plataforma al máximo
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{completedCount}</span>
          <span className="text-gray-500">/{items.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-green-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              item.completed 
                ? 'bg-green-900/10 border border-green-900/30' 
                : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-gray-600 shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${item.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                {item.label}
              </p>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>

            {!item.completed && item.href && (
              <Link 
                href={item.href}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* PRO hint */}
      <div className="mt-6 pt-4 border-t border-gray-800/50">
        <Link 
          href="/planes"
          className="flex items-center justify-between text-sm group"
        >
          <span className="text-amber-500">
            ★ Completá tu perfil y desbloqueá beneficios PRO
          </span>
          <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
