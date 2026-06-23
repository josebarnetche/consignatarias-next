'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { trackWatchlistMerge, trackWatchlistReturn } from '@/lib/analytics';

interface Favorite {
  id: string;
  consignataria_slug: string;
  notify_new_remate: boolean;
  notify_catalog: boolean;
  created_at: string;
}

/** Clave localStorage para favoritos de usuarios anónimos (patrón cnsg_*). */
const LS_KEY = 'cnsg_favorites';
/** Marca de visita previa que escribe SinceLastVisit → detecta recurrencia. */
const LS_LAST_VISIT = 'cnsg_last_visit';

/** Lee los favoritos anónimos del localStorage. Soft-fail → []. */
function readLocalFavorites(): Favorite[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Favorite[]) : [];
  } catch {
    return [];
  }
}

/** Persiste los favoritos anónimos. Soft-fail si localStorage no está. */
function writeLocalFavorites(favs: Favorite[]): void {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(favs));
  } catch {
    /* noop */
  }
}

/** Construye un Favorite local (anónimo) para un slug. */
function makeLocalFavorite(slug: string): Favorite {
  return {
    id: `local:${slug}`,
    consignataria_slug: slug,
    notify_new_remate: false,
    notify_catalog: false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Hook for managing user favorites (watchlist)
 * Lock-in: User-curated data that creates switching costs
 *
 * Desmurado (Wave 2): el 99,5% del tráfico es anónimo. Los anónimos guardan
 * contra localStorage ('cnsg_favorites') de forma instantánea, sin login. Al
 * loguearse, esos favoritos se migran a user_favorites (dedupe por slug) y se
 * limpia el localStorage. Logueado sigue 100% contra Supabase.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  // Para no disparar trackWatchlistReturn más de una vez por montaje.
  const returnTracked = useRef(false);

  // Dispara trackWatchlistReturn una vez si hay favoritos y es visita recurrente.
  const maybeTrackReturn = useCallback((favs: Favorite[]) => {
    if (returnTracked.current) return;
    if (favs.length === 0) return;
    let recurring = false;
    try {
      recurring = !!window.localStorage.getItem(LS_LAST_VISIT);
    } catch {
      recurring = false;
    }
    if (!recurring) return;
    returnTracked.current = true;
    trackWatchlistReturn({ count: favs.length });
  }, []);

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    if (!user) {
      // Anónimo → leer favoritos del localStorage.
      const local = readLocalFavorites();
      setFavorites(local);
      maybeTrackReturn(local);
      setIsLoading(false);
      return;
    }

    // Logueado: si hay favoritos anónimos pendientes, migrarlos primero.
    const local = readLocalFavorites();
    if (local.length > 0) {
      let merged = 0;
      for (const fav of local) {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, consignataria_slug: fav.consignataria_slug });
        // 23505 = unique violation → ya existía, no cuenta como nuevo merge.
        if (!error) merged += 1;
      }
      writeLocalFavorites([]); // limpiar tras migrar
      if (merged > 0) trackWatchlistMerge({ merged });
    }

    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const rows = data || [];
    setFavorites(rows);
    maybeTrackReturn(rows);
    setIsLoading(false);
  }, [supabase, maybeTrackReturn]);

  const addFavorite = useCallback(async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Anónimo → guardar en localStorage de forma instantánea.
      const local = readLocalFavorites();
      if (!local.some(f => f.consignataria_slug === slug)) {
        const next = [makeLocalFavorite(slug), ...local];
        writeLocalFavorites(next);
        setFavorites(next);
      }
      return { error: null };
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, consignataria_slug: slug });

    if (error) {
      if (error.code === '23505') {
        // Already exists
        return { error: null };
      }
      return { error: 'insert_failed' as const };
    }

    await fetchFavorites();
    return { error: null };
  }, [supabase, fetchFavorites]);

  const removeFavorite = useCallback(async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Anónimo → quitar del localStorage.
      const next = readLocalFavorites().filter(f => f.consignataria_slug !== slug);
      writeLocalFavorites(next);
      setFavorites(next);
      return;
    }

    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('consignataria_slug', slug);

    await fetchFavorites();
  }, [supabase, fetchFavorites]);

  const toggleNotifications = useCallback(async (slug: string, type: 'remate' | 'catalog', enabled: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const field = type === 'remate' ? 'notify_new_remate' : 'notify_catalog';

    await supabase
      .from('user_favorites')
      .update({ [field]: enabled })
      .eq('user_id', user.id)
      .eq('consignataria_slug', slug);

    await fetchFavorites();
  }, [supabase, fetchFavorites]);

  const isFavorite = useCallback((slug: string) => {
    return favorites.some(f => f.consignataria_slug === slug);
  }, [favorites]);

  const getFavorite = useCallback((slug: string) => {
    return favorites.find(f => f.consignataria_slug === slug);
  }, [favorites]);

  useEffect(() => {
    fetchFavorites();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchFavorites();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchFavorites, supabase.auth]);

  return {
    favorites,
    isLoading,
    isLoggedIn: !!userId,
    addFavorite,
    removeFavorite,
    toggleNotifications,
    isFavorite,
    getFavorite,
    refresh: fetchFavorites,
    count: favorites.length,
  };
}
