'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

/**
 * OnboardingPrompt — Shows a subtle nudge for logged-in users who haven't uploaded their first DT-e.
 * Disappears after first upload or on /mi-cuenta/guias page.
 * 
 * Shipped via Insight #92 — 2026-03-18
 * 
 * HIDDEN: 2026-03-28 — Feature poco desarrollado, ocupa espacio en header.
 * Reactivar cuando DTE esté más maduro.
 */
export default function OnboardingPrompt() {
  // Temporarily hidden — DTE feature not mature enough
  return null;
  const [user, setUser] = useState<User | null>(null);
  const [dteCount, setDteCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Get user and DTE count
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check if dismissed in session storage
        const dismissedKey = `dte_prompt_dismissed_${user.id}`;
        if (sessionStorage.getItem(dismissedKey)) {
          setDismissed(true);
          return;
        }

        // Fetch DTE count
        const { count } = await supabase
          .from('user_dtes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setDteCount(count || 0);
      }
    };

    fetchData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't show if:
  // - User not logged in
  // - Still loading DTE count
  // - User has DTEs
  // - Dismissed this session
  if (!user || dteCount === null || (dteCount ?? 0) > 0 || dismissed) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sessionStorage.setItem(`dte_prompt_dismissed_${user.id}`, 'true');
    setDismissed(true);
  };

  return (
    <Link
      href="/mi-cuenta/guias"
      className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/30 border border-amber-700/40 hover:bg-amber-900/50 hover:border-amber-600/50 transition-all"
      title="Subí tu primera guía DT-e y comenzá a construir tu historial"
    >
      <span className="text-amber-500 text-sm">📋</span>
      <span className="text-xxs font-terminal uppercase tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors hidden sm:inline">
        Subí tu primera guía
      </span>
      <span className="text-xxs font-terminal uppercase tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors sm:hidden">
        DT-e
      </span>
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="ml-1 p-0.5 text-amber-600 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Ocultar"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Link>
  );
}
