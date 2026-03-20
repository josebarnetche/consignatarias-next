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

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDaysUntil(days: number): { text: string; urgent: boolean } {
  if (days === 0) return { text: 'HOY', urgent: true };
  if (days === 1) return { text: 'MAÑANA', urgent: true };
  if (days <= 3) return { text: `En ${days} días`, urgent: true };
  if (days <= 7) return { text: `En ${days} días`, urgent: false };
  return { text: `En ${days} días`, urgent: false };
}

/**
 * Format "following since" duration - psychological ownership/lock-in
 * Longer = more invested = higher switching cost
 */
function formatFollowingSince(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Desde hoy';
  if (days === 1) return 'Desde ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  }
  const years = Math.floor(days / 365);
  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

function getUpcomingRemates(slug: string): Auction[] {
  const today = new Date().toISOString().slice(0, 10);
  const slugLower = slug.toLowerCase();
  
  return auctions
    .filter(a => {
      const auctionSlug = a.consignatariaName?.toLowerCase().replace(/\s+/g, '-') || '';
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
            {/* Urgent Alert - Next 3 days */}
            {(() => {
              const urgent = allUpcoming.filter(r => getDaysUntil(r.date) <= 3);
              if (urgent.length === 0) return null;
              
              const next = urgent[0];
              const daysUntil = getDaysUntil(next.date);
              const countdown = formatDaysUntil(daysUntil);
              
              return (
                <Link
                  href={`/go/${next.consignataria_slug}`}
                  className="block bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-700/40 rounded-xl p-4 hover:border-emerald-600/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    {countdown.text.toUpperCase()}
                  </div>
                  <div className="text-white font-medium">{next.title}</div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {next.displayName} · {formatDate(next.date)} {next.time && `· ${next.time}`}
                  </div>
                  {urgent.length > 1 && (
                    <div className="text-xs text-emerald-500 mt-2">
                      +{urgent.length - 1} más en los próximos 3 días
                    </div>
                  )}
                </Link>
              );
            })()}

            {/* Unified Calendar */}
            {allUpcoming.length > 0 && (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Próximos Remates</span>
                </div>
                <div className="divide-y divide-zinc-700/50">
                  {allUpcoming.slice(0, 8).map((r, i) => {
                    const daysUntil = getDaysUntil(r.date);
                    const countdown = formatDaysUntil(daysUntil);
                    
                    return (
                      <Link
                        key={`${r.consignataria_slug}-${i}`}
                        href={`/go/${r.consignataria_slug}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-700/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm text-white truncate">{r.title}</div>
                          <div className="text-xs text-zinc-500">{r.displayName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-amber-400 font-medium">{formatDate(r.date)}</div>
                          <div className={`text-xs font-medium ${countdown.urgent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {countdown.text}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
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
                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>{upcoming.length} remate{upcoming.length !== 1 ? 's' : ''} próximo{upcoming.length !== 1 ? 's' : ''}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-600">{formatFollowingSince(fav.created_at)}</span>
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
                    
                    {nextRemate && (() => {
                      const daysUntil = getDaysUntil(nextRemate.date);
                      const countdown = formatDaysUntil(daysUntil);
                      
                      return (
                        <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${countdown.urgent ? 'bg-emerald-900/30 border border-emerald-700/30' : 'bg-zinc-900/50'}`}>
                          <div className="text-sm text-zinc-300 truncate flex-1 mr-4">
                            {nextRemate.title}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-medium whitespace-nowrap ${countdown.urgent ? 'text-emerald-400' : 'text-zinc-400'}`}>
                              {formatDate(nextRemate.date)}
                            </div>
                            {countdown.urgent && (
                              <div className="text-xs text-emerald-500 font-medium">
                                {countdown.text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
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
