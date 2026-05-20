'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface GanadoItem {
  categoria: string;
  cabezas: number;
  peso: number;
}

interface GanadoRow {
  items: GanadoItem[];
  last_seen_at: string | null;
  last_seen_value_ars: number | null;
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

    const { data } = await supabase
      .from('user_ganado')
      .select('items, last_seen_at, last_seen_value_ars')
      .eq('user_id', user.id)
      .maybeSingle();

    const row = data as GanadoRow | null;
    setHasRow(!!row);
    setItems(row?.items ?? []);
    setLastSeenAt(row?.last_seen_at ?? null);
    setLastSeenValue(row?.last_seen_value_ars ?? null);
    setIsLoading(false);
  }, [supabase]);

  /** Upsert the herd composition. */
  const saveGanado = useCallback(async (newItems: GanadoItem[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'not_logged_in' as const };

    const { error } = await supabase
      .from('user_ganado')
      .upsert(
        { user_id: user.id, items: newItems, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    if (error) return { error: 'save_failed' as const };
    setItems(newItems);
    setHasRow(true);
    return { error: null };
  }, [supabase]);

  /** Stamp the value the user just saw, so the next visit can show the delta. */
  const markSeen = useCallback(async (valueArs: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_ganado')
      .update({ last_seen_at: new Date().toISOString(), last_seen_value_ars: valueArs })
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
    isLoading,
    isLoggedIn,
    hasRow,
    saveGanado,
    markSeen,
    refresh: fetchGanado,
  };
}
