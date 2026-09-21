'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { Json } from '@/lib/database.types';

export interface GanadoItem {
  categoria: string;
  cabezas: number;
  peso: number;
}

interface GanadoRow {
  items: GanadoItem[];
  last_seen_at: string | null;
  last_seen_value_ars: number | null;
  alerts_opt_in: boolean | null;
}

/**
 * Mi Ganado — load/save the logged-in producer's herd composition.
 * Mirrors useFavorites: browser client + RLS, no API route. Free feature
 * (login only). The herd is persisted server-side so the producer comes back
 * to see what it's worth as the INMAG moves.
 */
export function useGanado() {
  const [items, setItems] = useState<GanadoItem[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [lastSeenValue, setLastSeenValue] = useState<number | null>(null);
  const [alertsOptIn, setAlertsOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasRow, setHasRow] = useState(false);
  const supabase = createClient();

  const fetchGanado = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    // `ganado_value_snapshots` ya no se lee ni se escribe (v1.211.0). La evolución del
    // rodeo se RECALCULA contra los precios de cada fecha (/api/ganado/historial): una
    // serie de fotos por visita mezclaba "cuánto tenías" con "cuánto valía" y producía
    // caídas que no ocurrieron. La tabla y sus filas quedan en la base, intactas.
    const { data } = await supabase
      .from('user_ganado')
      .select('items, last_seen_at, last_seen_value_ars, alerts_opt_in')
      .eq('user_id', user.id)
      .maybeSingle();

    const row = data as GanadoRow | null;
    setHasRow(!!row);
    setItems(row?.items ?? []);
    setLastSeenAt(row?.last_seen_at ?? null);
    setLastSeenValue(row?.last_seen_value_ars ?? null);
    setAlertsOptIn(row?.alerts_opt_in ?? false);
    setIsLoading(false);
  }, [supabase]);

  /** Upsert the herd composition. */
  const saveGanado = useCallback(async (newItems: GanadoItem[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'not_logged_in' as const };

    const { error } = await supabase
      .from('user_ganado')
      .upsert(
        { user_id: user.id, items: newItems as unknown as Json, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) return { error: 'save_failed' as const };
    setItems(newItems);
    setHasRow(true);
    return { error: null };
  }, [supabase]);

  /**
   * Registra el Valor de Referencia central que el usuario acaba de ver. Lo lee
   * /admin/ops; la página ya no muestra un "Δ desde tu última visita" armado con esto,
   * porque es una foto y las fotos mienten cuando cambia el rodeo o la fuente.
   */
  const markSeen = useCallback(async (valueArs: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_ganado')
      .update({ last_seen_at: new Date().toISOString(), last_seen_value_ars: valueArs })
      .eq('user_id', user.id);
  }, [supabase]);

  /** Toggle the Monday value-email opt-in. */
  const setAlerts = useCallback(async (optIn: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setAlertsOptIn(optIn); // optimistic
    await supabase
      .from('user_ganado')
      .update({ alerts_opt_in: optIn })
      .eq('user_id', user.id);
  }, [supabase]);

  useEffect(() => {
    fetchGanado();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchGanado();
    });
    return () => subscription.unsubscribe();
  }, [fetchGanado, supabase.auth]);

  return {
    items,
    lastSeenAt,
    lastSeenValue,
    alertsOptIn,
    isLoading,
    isLoggedIn,
    hasRow,
    saveGanado,
    markSeen,
    setAlerts,
    refresh: fetchGanado,
  };
}
