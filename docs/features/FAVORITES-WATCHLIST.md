# Feature: Favoritos / Watchlist de Consignatarias

## Status (2026-03-20)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Core Follow | ✅ DONE | FollowButton, useFavorites hook, /mi-cuenta/favoritos |
| Phase 2: Dashboard | ✅ DONE | Unified calendar, next remate preview, empty state |
| Phase 3: Notifications | 🔜 PENDING | Email/push alerts |
| Phase 4: Social Proof | 🔜 PENDING | Follower counts for consignatarias |

**Lock-in Score:** HIGH — Foundation shipped, core habit loop enabled.

## Overview

Allow users to "follow" or "save" consignatarias they care about. Creates a personalized dashboard with their preferred consignatarias' upcoming remates.

## Why This Creates Lock-in

| Dimension | Impact | Lock-in Score |
|-----------|--------|---------------|
| **User-curated data** | They invest time selecting favorites | HIGH |
| **Account requirement** | Must register to save | HIGH |
| **Personalized experience** | Dashboard only they have | HIGH |
| **Notification foundation** | Enables "alert me" for new remates | CRITICAL |
| **Habit formation** | Check "my consignatarias" daily | HIGH |
| **Switching cost** | Recreating list elsewhere = friction | HIGH |

**Overall Lock-in: HIGH** — This is the #1 missing lock-in mechanism.

## User Stories

### Producer (Buyer)
> "Sigo a 5 consignatarias de mi zona. Quiero ver todos sus remates en un solo lugar."

### Consignatario (Seller)
> "Quiero saber cuántos usuarios me siguen."

### Power User
> "Quiero alertas cuando mis consignatarias favoritas publiquen nuevos remates."

## User Flow

```
1. [Browse] User finds /go/rosgan
2. [Action] Clicks "★ Seguir" button
3. [Auth Gate] If not logged in → prompt signup
4. [Confirm] Toast: "Agregaste Rosgan a favoritos"
5. [Dashboard] /mi-cuenta/favoritos shows all followed
6. [Notify] (Future) Email/push when new remate
```

## UI Components

### 1. Follow Button (on /go/[slug])

```
┌─────────────────────────────────────────────┐
│  ROSGAN                     [★ Seguir]      │
│  ★★★ Consignataria PRO                      │
│                                             │
│  Próximo Remate: 25 Mar 2026                │
│  ...                                        │
└─────────────────────────────────────────────┘

[After following]
┌─────────────────────────────────────────────┐
│  ROSGAN                     [★ Siguiendo ▼] │
│  ★★★ Consignataria PRO                      │
│  ...                                        │
└─────────────────────────────────────────────┘

[Dropdown on "Siguiendo"]
├─ 🔔 Activar notificaciones
├─ ⭐ Ver en favoritos
├─ ✕ Dejar de seguir
```

### 2. Favorites Dashboard (/mi-cuenta/favoritos)

```
┌─────────────────────────────────────────────────────────┐
│  MIS CONSIGNATARIAS                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Seguís 5 consignatarias • 12 remates próximos          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ROSGAN              Próximo: 25 Mar   [Ver →]   │   │
│  │ Ganadera del Litoral   Próximo: 28 Mar  [Ver →] │   │
│  │ Colombo y Magliano     Sin remates       [Ver →] │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📅 CALENDARIO UNIFICADO                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Mar 25 │ Rosgan — Remate Especial Otoño         │   │
│  │ Mar 28 │ Ganadera del Litoral — Invernada       │   │
│  │ Abr 02 │ Rosgan — General                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Empty State (No Favorites)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          ⭐                                              │
│          Todavía no seguís ninguna consignataria        │
│                                                         │
│          Explorá el directorio y seguí a las que       │
│          te interesan para ver sus remates en un       │
│          solo lugar.                                    │
│                                                         │
│          [Explorar consignatarias →]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- User favorites
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_slug TEXT NOT NULL,
  notify_new_remate BOOLEAN DEFAULT false,
  notify_catalog BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, consignataria_slug)
);

-- RLS: Users can only manage their own favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" ON user_favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_slug ON user_favorites(consignataria_slug);

-- Aggregated follower counts (for consignatarias to see)
CREATE VIEW consignataria_followers AS
SELECT 
  consignataria_slug,
  COUNT(*) as follower_count
FROM user_favorites
GROUP BY consignataria_slug;
```

## API / Hooks

### useFavorites Hook

```typescript
// src/hooks/useFavorites.ts
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Favorite {
  id: string;
  consignataria_slug: string;
  notify_new_remate: boolean;
  notify_catalog: boolean;
  created_at: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id);

    setFavorites(data || []);
    setIsLoading(false);
  }, [supabase]);

  const addFavorite = useCallback(async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };

    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, consignataria_slug: slug });

    if (!error) {
      fetchFavorites();
    }
    return { error };
  }, [supabase, fetchFavorites]);

  const removeFavorite = useCallback(async (slug: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('consignataria_slug', slug);

    fetchFavorites();
  }, [supabase, fetchFavorites]);

  const isFavorite = useCallback((slug: string) => {
    return favorites.some(f => f.consignataria_slug === slug);
  }, [favorites]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    refresh: fetchFavorites,
  };
}
```

### FollowButton Component

```typescript
// src/components/ui/FollowButton.tsx
'use client';

import { useState } from 'react';
import { Star, Bell, BellOff, ChevronDown } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FollowButtonProps {
  slug: string;
  displayName: string;
}

export function FollowButton({ slug, displayName }: FollowButtonProps) {
  const { isFavorite, addFavorite, removeFavorite, isLoading } = useFavorites();
  const [showDropdown, setShowDropdown] = useState(false);
  const isFollowing = isFavorite(slug);

  const handleFollow = async () => {
    if (isFollowing) {
      setShowDropdown(prev => !prev);
    } else {
      await addFavorite(slug);
    }
  };

  const handleUnfollow = async () => {
    await removeFavorite(slug);
    setShowDropdown(false);
  };

  if (isLoading) {
    return (
      <button disabled className="px-4 py-2 bg-zinc-800 text-zinc-500 rounded-lg">
        ...
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleFollow}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isFollowing
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
        }`}
      >
        <Star className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
        {isFollowing ? 'Siguiendo' : 'Seguir'}
        {isFollowing && <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
          <button className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Activar notificaciones
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
            <Star className="w-4 h-4" /> Ver en favoritos
          </button>
          <hr className="border-zinc-700" />
          <button 
            onClick={handleUnfollow}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
          >
            Dejar de seguir
          </button>
        </div>
      )}
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Follow (2 days)
- [x] Create Supabase table `user_favorites` — ARCHITECT 2026-03-20
- [x] Implement `useFavorites` hook — ARCHITECT 2026-03-20
- [x] Add `FollowButton` to `/go/[slug]` — ARCHITECT 2026-03-20
- [x] Create `/mi-cuenta/favoritos` page (basic list) — ARCHITECT 2026-03-20

### Phase 2: Dashboard (1 day) ✅ COMPLETE
- [x] Unified calendar view of all followed consignatarias ✅
- [x] "Next remate" preview for each ✅
- [x] Empty state with CTA ✅

**Shipped in:** 7fba601 (Watchlist Phase 1-2) — 2026-03-20

### Phase 2.5: Urgency Indicators ✅ COMPLETE
- [x] "Days until" countdown for upcoming remates
- [x] Urgent highlighting for ≤3 day remates (pulsing green badge)
- [x] Prominent alert banner for imminent remates
- [x] Visual differentiation: urgent vs regular events

**Shipped in:** bb76eb8 (Urgency countdown) — 2026-03-20

**Lock-in impact:** Urgency creates habit of daily return visits. Users treat these as "their" remates.

### Phase 2.6: Ownership Psychology ✅ COMPLETE
- [x] "Following since..." duration display on each favorite
- [x] Human-readable format: días, semanas, meses, años
- [x] Creates psychological investment (longer = more switching cost)

**Shipped in:** 9722972 (Following since) — 2026-03-20

**Lock-in impact:** Users see their relationship investment. "Hace 3 meses" feels like commitment.

### Phase 3: Notifications (Future - PRO)
- [ ] Email notifications for new remates
- [ ] Push notifications (PWA)
- [ ] WhatsApp integration

### Phase 4: Social Proof (Future)
- [ ] Show follower count to consignatarias (PRO dashboard)
- [ ] "123 productores siguen a esta consignataria"

## Success Metrics

| Metric | Target |
|--------|--------|
| Users with 1+ favorite | 20% of registered |
| Average favorites per user | 3-5 |
| Dashboard daily visits | +30% vs general /mi-cuenta |
| Notification opt-in rate | 40% of followers |

## PRO Integration

**FREE:**
- Follow up to 10 consignatarias
- Basic favorites dashboard
- Manual checking

**PRO:**
- Unlimited favorites
- Email notifications
- WhatsApp alerts
- Export calendar (ICS)

---

**Priority:** HIGH (critical lock-in mechanism)
**Effort:** ~3-4 days
**Lock-in Score:** HIGH — foundation for retention loop

*Spec by ARCHITECT — 2026-03-20*
