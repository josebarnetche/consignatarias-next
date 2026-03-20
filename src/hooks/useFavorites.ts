'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Favorite {
  id: string;
  consignataria_slug: string;
  notify_new_remate: boolean;
  notify_catalog: boolean;
  created_at: string;
}

/**
 * Hook for managing user favorites (watchlist)
 * Lock-in: User-curated data that creates switching costs
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setFavorites(data || []);
    setIsLoading(false);
  }, [supabase]);

  const addFavorite = useCallback(async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'not_logged_in' as const };

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
    if (!user) return;

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
