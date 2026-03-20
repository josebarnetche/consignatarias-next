'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Bell, Calendar, ExternalLink } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import rematesData from '@/lib/data/remates.json';
import type { Auction } from '@/lib/db/schema';
import { getProfile } from '@/lib/data/consignataria-slugs';

const auctions = rematesData as Auction[];

function formatDate(dateStr: string): string {
  const [_y, m, d] = dateStr.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function getUpcomingRemates(slug: string): Auction[] {
  const today = new Date().toISOString().slice(0, 10);
  const slugLower = slug.toLowerCase();
  
  return auctions
    .filter(a => {
      const auctionSlug = a.consignataria?.toLowerCase().replace(/\s+/g, '-') || '';
      return auctionSlug.includes(slugLower) || slugLower.includes(auctionSlug.split('-')[0]);
    })
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
}

export default function FavoritosPage() {
  const { favorites, isLoading, isLoggedIn, removeFavorite } = useFavorites();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Cargando...</div>
      </div>
    );
  }

  // Build calendar from all favorites
  const allUpcoming: Array<Auction & { consignataria_slug: string; displayName: string }> = [];
  favorites.forEach(fav => {
    const profile = getProfile(fav.consignataria_slug);
    const remates = getUpcomingRemates(fav.consignataria_slug);
    remates.forEach(r => {
      allUpcoming.push({
        ...r,
        consignataria_slug: fav.consignataria_slug,
        displayName: profile?.displayName || fav.consignataria_slug,
      });
    });
  });
  allUpcoming.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/mi-cuenta" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Mi Cuenta
          </Link>
          
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Star className="w-6 h-6 text-amber-400 fill-current" />
            Mis Consignatarias
          </h1>
          
          {favorites.length > 0 && (
            <p className="text-zinc-400 mt-2">
              Seguís {favorites.length} consignataria{favorites.length !== 1 ? 's' : ''} · {allUpcoming.length} remates próximos
            </p>
          )}
        </div>

        {/* Auth Gate */}
        {!isLoggedIn && !isLoading && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8 text-center">
            <Star className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Iniciá sesión para ver tus favoritos
            </h2>
            <p className="text-zinc-400 mb-6">
              Seguí consignatarias para ver todos sus remates en un solo lugar.
            </p>
            <Link
              href="/auth/login?redirect=/mi-cuenta/favoritos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {/* Loading */}
        {isLoading && isLoggedIn && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-zinc-800/30 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-zinc-700 rounded w-1/3 mb-2" />
                <div className="h-4 bg-zinc-700/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && isLoggedIn && favorites.length === 0 && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8 text-center">
            <Star className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Todavía no seguís ninguna consignataria
            </h2>
            <p className="text-zinc-400 mb-6">
              Explorá el directorio y seguí a las que te interesan para ver sus remates en un solo lugar.
            </p>
            <Link
              href="/consignatarias"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
            >
              Explorar consignatarias →
            </Link>
          </div>
        )}

        {/* Favorites List */}
        {!isLoading && isLoggedIn && favorites.length > 0 && (
          <div className="space-y-6">
            {/* Unified Calendar */}
            {allUpcoming.length > 0 && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Próximos Remates</span>
                </div>
                <div className="divide-y divide-zinc-700/50">
                  {allUpcoming.slice(0, 8).map((r, i) => (
                    <Link
                      key={`${r.consignataria_slug}-${i}`}
                      href={`/go/${r.consignataria_slug}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-700/30 transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white">{r.title}</div>
                        <div className="text-xs text-zinc-500">{r.displayName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-amber-400 font-medium">{formatDate(r.date)}</div>
                        {r.time && <div className="text-xs text-zinc-500">{r.time}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Favorites Grid */}
            <div className="space-y-3">
              <div className="text-xs text-zinc-500 uppercase tracking-wider px-1">
                Consignatarias que seguís
              </div>
              
              {favorites.map(fav => {
                const profile = getProfile(fav.consignataria_slug);
                const upcoming = getUpcomingRemates(fav.consignataria_slug);
                const nextRemate = upcoming[0];
                
                return (
                  <div
                    key={fav.id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link 
                          href={`/go/${fav.consignataria_slug}`}
                          className="text-white font-medium hover:text-amber-400 transition-colors flex items-center gap-2"
                        >
                          {profile?.displayName || fav.consignataria_slug}
                          <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                        </Link>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {upcoming.length} remate{upcoming.length !== 1 ? 's' : ''} próximo{upcoming.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(fav.notify_new_remate || fav.notify_catalog) && (
                          <Bell className="w-4 h-4 text-amber-400" />
                        )}
                        <button
                          onClick={() => removeFavorite(fav.consignataria_slug)}
                          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          Dejar de seguir
                        </button>
                      </div>
                    </div>
                    
                    {nextRemate && (
                      <div className="bg-zinc-900/50 rounded-lg px-3 py-2 flex items-center justify-between">
                        <div className="text-sm text-zinc-300 truncate flex-1 mr-4">
                          {nextRemate.title}
                        </div>
                        <div className="text-sm text-emerald-400 font-medium whitespace-nowrap">
                          {formatDate(nextRemate.date)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/consignatarias" className="hover:text-white transition-colors">
            Explorar más consignatarias →
          </Link>
        </div>
      </div>
    </div>
  );
}
