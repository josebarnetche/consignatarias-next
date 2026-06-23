'use client';

import { useState } from 'react';
import { trackWatchlistNotifyOptin } from '@/lib/analytics';

/**
 * Opt-in de email para notificaciones del watchlist — SEGUNDO paso.
 *
 * El guardado (FollowButton) es instantáneo y anónimo (localStorage). El email
 * NO se pide en el primer save: este componente aparece SOLO cuando el anónimo
 * quiere ser notificado de un nuevo remate / movida. Reusa la misma infra que
 * PriceAlertSignup: POST a /api/newsletter con source='watchlist-notify' y
 * dispara trackWatchlistNotifyOptin({ item_type }).
 *
 * Copy on-brand: además de avisar, deja claro que el email evita perder lo
 * guardado (Safari/ITP borra el localStorage a los 7 días sin visita).
 */
export default function WatchlistNotifyOptin({
  itemType,
  displayName,
  className = '',
}: {
  /** Tipo de item guardado para el evento GA ('consignataria' | 'remate' | …). */
  itemType: string;
  /** Nombre del item seguido, para el copy. */
  displayName?: string;
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'loading') return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState('error'); setMsg('Email inválido'); return;
    }
    setState('loading'); setMsg('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'watchlist-notify' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState('ok');
        setMsg(
          data.message?.includes('Ya estás')
            ? 'Ya estabas anotado ✓'
            : 'Listo — te avisamos cuando se mueva.'
        );
        trackWatchlistNotifyOptin({ item_type: itemType });
      } else {
        setState('error'); setMsg(data.error || 'No se pudo anotar. Probá de nuevo.');
      }
    } catch {
      setState('error'); setMsg('Error de red. Probá de nuevo.');
    }
  }

  const subtitle = displayName
    ? `Te avisamos cuando ${displayName} tenga un remate nuevo — sin cuenta, un mail. Así no perdés lo guardado.`
    : 'Te avisamos cuando haya un remate nuevo — sin cuenta, un mail. Así no perdés lo guardado.';

  return (
    <div className={`bg-zinc-900 border border-amber-500/20 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-bold text-white mb-1">Avisame cuando se mueva</h4>
      <p className="text-zinc-400 text-xs mb-3 leading-relaxed">{subtitle}</p>

      {state === 'ok' ? (
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
          <span>✓</span><span>{msg}</span>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-amber-500/60">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
            />
          </div>
          <button
            type="submit"
            disabled={state === 'loading'}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {state === 'loading' ? 'Anotando…' : 'Avisame'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="text-red-400 text-xs mt-2">{msg}</p>}
      {state !== 'ok' && (
        <p className="text-xs text-zinc-600 mt-2">Sin cuenta. Un mail cuando hay movimiento — y para no perder lo guardado.</p>
      )}
    </div>
  );
}
