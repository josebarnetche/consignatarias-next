'use client';

import { Star, Zap, Crown, Trophy, CheckCircle, Share2 } from 'lucide-react';
import { trackMilestoneShare } from '@/lib/analytics';

interface MilestoneBadgesProps {
  dteCount: number;
  totalCabezas?: number;
  showAll?: boolean;
  showShare?: boolean;
}

const MILESTONES = [
  {
    id: 'primera',
    name: 'Primera Guía',
    description: 'Subiste tu primera DT-e',
    threshold: 1,
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'activo',
    name: 'Productor Activo',
    description: '5 guías registradas',
    threshold: 5,
    icon: Star,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'frecuente',
    name: 'Operador Frecuente',
    description: '20 guías registradas',
    threshold: 20,
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'profesional',
    name: 'Profesional',
    description: '50 guías registradas',
    threshold: 50,
    icon: Crown,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'experto',
    name: 'Experto',
    description: '100 guías registradas',
    threshold: 100,
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
  },
];

export function MilestoneBadges({ dteCount, showAll = false, showShare = true }: MilestoneBadgesProps) {
  // Get earned badges
  const earnedBadges = MILESTONES.filter(m => dteCount >= m.threshold);
  const nextBadge = MILESTONES.find(m => dteCount < m.threshold);
  const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;
  
  // Show nothing if no badges earned and showAll is false
  if (earnedBadges.length === 0 && !showAll) {
    return null;
  }

  const displayBadges = showAll ? MILESTONES : earnedBadges;
  
  // WhatsApp share functionality
  const handleShare = () => {
    if (!highestBadge) return;
    
    const message = `🏆 Alcancé el logro "${highestBadge.name}" en consignatarias.com.ar — ya tengo ${dteCount} guías de hacienda registradas!\n\nRegistrá tus DT-e y llevá el control de tu producción:\nhttps://www.consignatarias.com.ar/mi-cuenta/guias`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    trackMilestoneShare(highestBadge.id, highestBadge.name, dteCount);
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Badge display */}
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => {
          const Icon = badge.icon;
          const earned = dteCount >= badge.threshold;
          
          return (
            <div
              key={badge.id}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm
                transition-all duration-200
                ${earned 
                  ? `${badge.bgColor} ${badge.borderColor} ${badge.color}` 
                  : 'bg-gray-800/50 border-gray-700 text-gray-500'
                }
              `}
              title={badge.description}
            >
              <Icon className={`w-4 h-4 ${earned ? badge.color : 'text-gray-600'}`} />
              <span className={earned ? 'font-medium' : 'opacity-50'}>
                {badge.name}
              </span>
              {!earned && showAll && (
                <span className="text-xs opacity-50">({badge.threshold})</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress to next badge */}
      {nextBadge && dteCount > 0 && (
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              Próximo logro: <span className={nextBadge.color}>{nextBadge.name}</span>
            </span>
            <span className="text-xs text-gray-500">
              {dteCount}/{nextBadge.threshold}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className={`${nextBadge.bgColor.replace('/20', '')} h-1.5 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min((dteCount / nextBadge.threshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* WhatsApp share button for earned badges */}
      {showShare && highestBadge && earnedBadges.length > 0 && (
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600/20 hover:bg-green-600/30 
                     text-green-400 border border-green-500/30 rounded-lg transition-colors w-full justify-center"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir logro en WhatsApp</span>
        </button>
      )}
    </div>
  );
}
