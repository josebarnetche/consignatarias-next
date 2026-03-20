'use client';

import { useState, useRef, useEffect } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

interface FollowButtonProps {
  slug: string;
  displayName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Follow/unfollow button for consignatarias
 * Lock-in: Creates user-invested data and habit formation
 */
export function FollowButton({ slug, displayName: _displayName, className = '', size = 'md' }: FollowButtonProps) {
  const { isFavorite, addFavorite, removeFavorite, isLoading, isLoggedIn, getFavorite, toggleNotifications } = useFavorites();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isFollowing = isFavorite(slug);
  const favorite = getFavorite(slug);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = async () => {
    if (isProcessing) return;

    if (!isLoggedIn) {
      // Redirect to login with return URL
      window.location.href = `/auth/login?redirect=/go/${slug}&action=follow`;
      return;
    }

    if (isFollowing) {
      setShowDropdown(prev => !prev);
    } else {
      setIsProcessing(true);
      await addFavorite(slug);
      setIsProcessing(false);
    }
  };

  const handleUnfollow = async () => {
    setIsProcessing(true);
    await removeFavorite(slug);
    setShowDropdown(false);
    setIsProcessing(false);
  };

  const handleToggleNotify = async (type: 'remate' | 'catalog') => {
    if (!favorite) return;
    const currentValue = type === 'remate' ? favorite.notify_new_remate : favorite.notify_catalog;
    await toggleNotifications(slug, type, !currentValue);
  };

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (isLoading) {
    return (
      <button 
        disabled 
        className={`inline-flex items-center ${sizeClasses[size]} bg-zinc-800 text-zinc-500 rounded-lg ${className}`}
      >
        <svg className={`${iconSizes[size]} animate-spin`} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={`inline-flex items-center ${sizeClasses[size]} rounded-lg font-medium transition-all ${
          isFollowing
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
            : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-transparent'
        } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
      >
        {/* Star icon */}
        <svg 
          className={`${iconSizes[size]} ${isFollowing ? 'fill-current' : ''}`} 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill={isFollowing ? 'currentColor' : 'none'}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        
        <span>{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
        
        {isFollowing && (
          <svg className={`${iconSizes[size]} ml-0.5`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Notificaciones</div>
          </div>
          
          <button 
            onClick={() => handleToggleNotify('remate')}
            className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-700/50 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>🔔</span> Nuevos remates
            </span>
            <span className={`w-4 h-4 rounded ${favorite?.notify_new_remate ? 'bg-amber-500' : 'bg-zinc-600'}`}>
              {favorite?.notify_new_remate && (
                <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
          
          <button 
            onClick={() => handleToggleNotify('catalog')}
            className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-700/50 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>📋</span> Catálogos
            </span>
            <span className={`w-4 h-4 rounded ${favorite?.notify_catalog ? 'bg-amber-500' : 'bg-zinc-600'}`}>
              {favorite?.notify_catalog && (
                <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>

          <div className="border-t border-zinc-700" />
          
          <button 
            onClick={() => window.location.href = '/mi-cuenta/favoritos'}
            className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-700/50 flex items-center gap-2"
          >
            <span>⭐</span> Ver favoritos
          </button>
          
          <div className="border-t border-zinc-700" />
          
          <button 
            onClick={handleUnfollow}
            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-zinc-700/50"
          >
            Dejar de seguir
          </button>
        </div>
      )}
    </div>
  );
}
