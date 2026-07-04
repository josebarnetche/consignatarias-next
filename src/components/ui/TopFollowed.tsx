'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp } from 'lucide-react';

interface TopConsignataria {
  slug: string;
  displayName: string;
  followerCount: number;
}

/**
 * TopFollowed — Social Proof Discovery Component
 * 
 * Lock-in mechanisms:
 * - FOMO: Shows what others follow
 * - Bandwagon: Validates popular choices
 * - Discovery: Surfaces quality consignatarias
 * - Social proof: "X productores siguen"
 */
export function TopFollowed({ className = '' }: { className?: string }) {
  const [topFollowed, setTopFollowed] = useState<TopConsignataria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTopFollowed() {
      try {
        const res = await fetch('/api/top-followed');
        if (res.ok) {
          const data = await res.json();
          setTopFollowed(data.consignatarias || []);
        }
      } catch (err) {
        console.error('Failed to fetch top followed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTopFollowed();
  }, []);

  // Don't render if no data (graceful degradation)
  if (!isLoading && topFollowed.length === 0) return null;

  return (
    <div className={`terminal-panel ${className}`}>
      <div className="terminal-panel-header flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-accent" />
        <span className="text-xxs text-zinc-400 uppercase tracking-widest font-terminal">
          Más Seguidas
        </span>
      </div>
      
      <div className="px-panel py-2 space-y-1">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-6 bg-zinc-800/50 rounded" />
            ))}
          </div>
        ) : (
          topFollowed.map((c, index) => (
            <Link
              key={c.slug}
              href={`/consignatarias/${c.slug}`}
              className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xxs text-zinc-600 w-4 text-right font-mono">
                  {index + 1}
                </span>
                <span className="text-data text-zinc-200 truncate group-hover:text-accent transition-colors">
                  {c.displayName}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xxs text-zinc-500 shrink-0">
                <Star className="w-3 h-3 text-amber-500/60 fill-amber-500/60" />
                <span className="tabular-nums">{c.followerCount}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {!isLoading && topFollowed.length > 0 && (
        <div className="border-t border-terminal-border px-panel py-2">
          <p className="text-xxs text-zinc-500 leading-relaxed">
            Las consignatarias más seguidas por productores. 
            <Link href="/mi-cuenta/favoritos" className="text-accent/80 hover:text-accent ml-1">
              Ver tus favoritas →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for tighter layouts (e.g., mobile sidebar)
 */
export function TopFollowedCompact({ className = '' }: { className?: string }) {
  const [topFollowed, setTopFollowed] = useState<TopConsignataria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTopFollowed() {
      try {
        const res = await fetch('/api/top-followed?limit=3');
        if (res.ok) {
          const data = await res.json();
          setTopFollowed(data.consignatarias || []);
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchTopFollowed();
  }, []);

  if (!isLoading && topFollowed.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 text-xxs ${className}`}>
      <span className="text-zinc-500 uppercase shrink-0">🔥 Top:</span>
      {isLoading ? (
        <span className="text-zinc-600">...</span>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto">
          {topFollowed.map(c => (
            <Link
              key={c.slug}
              href={`/consignatarias/${c.slug}`}
              className="text-zinc-400 hover:text-accent whitespace-nowrap"
            >
              {c.displayName}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
