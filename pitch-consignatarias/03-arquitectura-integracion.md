# Arquitectura de Integración Técnica

## Principio: extensión, no reemplazo

El módulo se construye **dentro** de la app existente de consignatarias.com.ar. No es un repo separado, no es un subdominio, no requiere deploy independiente. Es un conjunto de rutas, componentes y tablas que se agregan al proyecto actual.

## Stack compartido

| Componente | consignatarias.com.ar (actual) | Módulo frigoríficos (nuevo) |
|-----------|-------------------------------|----------------------------|
| Framework | Next.js (App Router) | Misma app |
| Base de datos | Supabase (PostgreSQL) | Mismas instancia, tablas nuevas |
| Auth | — | Supabase Auth (Phone OTP) — se agrega |
| Realtime | — | Supabase Realtime (para alertas) |
| Styling | Tailwind CSS | Mismo config |
| Hosting | Vercel | Mismo deploy |
| Fuentes | Inter | Misma |

## Rutas nuevas

```
src/app/
├── frigorificos/
│   ├── page.tsx                    # Directorio público (ya existe, se mejora)
│   ├── registro/
│   │   └── page.tsx                # Registro + onboarding (3 pasos)
│   ├── (portal)/                   # Layout autenticado
│   │   ├── layout.tsx              # Shell con nav lateral/bottom tabs
│   │   ├── panel/
│   │   │   └── page.tsx            # Dashboard personalizado
│   │   ├── watchlist/
│   │   │   └── page.tsx            # Remates guardados
│   │   ├── alertas/
│   │   │   └── page.tsx            # Centro de notificaciones
│   │   ├── perfil/
│   │   │   └── page.tsx            # Ver/editar perfil empresa
│   │   └── config/
│   │       └── page.tsx            # Preferencias de alertas
```

### Route groups de Next.js

Se usa `(portal)` como route group para aplicar un layout autenticado sin afectar la URL. El middleware de Next.js protege todas las rutas bajo `(portal)`.

## Tablas nuevas en Supabase

### `frigorifico_profile`

Extiende la información del directorio existente con datos del usuario registrado.

```sql
CREATE TABLE frigorifico_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nombre_empresa text NOT NULL,
  cuit text UNIQUE,
  provincia text,
  localidad text,
  direccion text,
  telefono text,
  email text,
  web text,
  capacidad_cabezas_dia integer,
  habilitado_exportacion boolean DEFAULT false,
  razas_preferidas text[] DEFAULT '{}',
  categorias_preferidas text[] DEFAULT '{}',
  provincias_preferidas text[] DEFAULT '{}',
  nombre_contacto text NOT NULL,
  cargo_contacto text,
  logo_url text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: cada usuario solo ve/edita su propio perfil
ALTER TABLE frigorifico_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON frigorifico_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON frigorifico_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON frigorifico_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### `remate_watchlist`

```sql
CREATE TABLE remate_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  remate_id text NOT NULL,  -- ID del remate en la tabla existente
  notas text,               -- nota personal del frigorífico
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, remate_id)
);

ALTER TABLE remate_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist"
  ON remate_watchlist FOR ALL
  USING (auth.uid() = user_id);
```

### `alerta_config`

```sql
CREATE TABLE alerta_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Mi alerta',
  categorias text[] DEFAULT '{}',     -- novillo, vaquillona, etc.
  razas text[] DEFAULT '{}',          -- Angus, Hereford, etc.
  provincias text[] DEFAULT '{}',     -- Buenos Aires, Santa Fe, etc.
  tipo_remate text[] DEFAULT '{}',    -- invernada, cría, general
  consignataria_ids text[] DEFAULT '{}', -- seguir consignatarias específicas
  activa boolean DEFAULT true,
  canal_email boolean DEFAULT true,
  canal_inapp boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alerta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts"
  ON alerta_config FOR ALL
  USING (auth.uid() = user_id);
```

### `notificacion`

```sql
CREATE TABLE notificacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'remate_nuevo',        -- remate que matchea criterios
    'remate_actualizado',  -- cambio en un remate de la watchlist
    'remate_hoy',          -- recordatorio: remate guardado es hoy
    'remate_cancelado',    -- remate guardado fue cancelado
    'sistema'              -- notificaciones de plataforma
  )),
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  data jsonb,              -- metadata (remate_id, consignataria, etc.)
  leida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notificacion FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark own notifications read"
  ON notificacion FOR UPDATE
  USING (auth.uid() = user_id);
```

## Middleware de autenticación

```typescript
// src/middleware.ts (nuevo o se extiende el existente)

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Rutas protegidas del módulo frigoríficos
  const protectedPaths = [
    '/frigorificos/panel',
    '/frigorificos/watchlist',
    '/frigorificos/alertas',
    '/frigorificos/perfil',
    '/frigorificos/config',
  ]

  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!isProtected) return NextResponse.next()

  // Verificar sesión Supabase
  const supabase = createServerClient(/* ... */)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const loginUrl = new URL('/frigorificos/registro', request.url)
    loginUrl.searchParams.set('returnTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
```

## Integración con funcionalidades existentes

### Directorio de frigoríficos (`/frigorificos`)

La página actual se **extiende**, no se reemplaza:

```
ANTES:
[Lista estática de 364 frigoríficos]

DESPUÉS:
[Botón "Registrá tu frigorífico →" destacado arriba]
[Lista de frigoríficos — los verificados tienen badge ✓]
[Cada frigorífico verificado muestra preferencias: "Busca: Angus, Novillos, Buenos Aires"]
```

### Calendario de remates (`/remates`)

Se agrega un ícono de bookmark en cada remate **solo para usuarios logueados**:

```
ANTES (sin login):
[Remate card] — consignataria, fecha, ubicación, cabezas

DESPUÉS (con login):
[Remate card] — mismo + ícono bookmark (guardar en watchlist)
                + badge "Relevante" si matchea criterios del perfil
```

### Header/navbar

Se agrega un estado logueado al header existente:

```
ANTES:
[Logo] [Remates] [Frigoríficos] [Mercado] [Ingresar]

DESPUÉS (logueado):
[Logo] [Remates] [Frigoríficos] [Mercado] [🔔 3] [Mi portal →]
```

## Supabase Realtime

Para las alertas en tiempo real, se usa Supabase Realtime con subscription al canal de notificaciones:

```typescript
// Hook para notificaciones en tiempo real
const channel = supabase
  .channel('notificaciones')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notificacion',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Actualizar badge del 🔔 y mostrar toast
  })
  .subscribe()
```

## Generación de notificaciones

Cuando se publica un nuevo remate en la tabla existente, un **Supabase Edge Function** o **Database Trigger** compara los datos del remate contra las `alerta_config` de todos los frigoríficos y genera notificaciones para los que matchean:

```sql
-- Trigger conceptual (se implementa como Edge Function para mayor flexibilidad)
-- Cuando INSERT en tabla de remates:
--   1. Leer todas las alerta_config activas
--   2. Para cada config, evaluar si el remate matchea (categoría, raza, provincia)
--   3. Si matchea → INSERT en notificacion
```

## Componentes nuevos estimados

| Componente | Descripción | Complejidad |
|-----------|-------------|-------------|
| `LoginOTP` | Formulario teléfono + verificación OTP | Baja |
| `RegistroWizard` | Formulario 3 pasos de onboarding | Media |
| `PortalLayout` | Shell autenticado con nav | Media |
| `PanelDashboard` | Cards resumen + remates relevantes | Media |
| `WatchlistPage` | Lista de remates guardados con filtros | Baja |
| `AlertaConfigForm` | Formulario de criterios de alerta | Media |
| `NotificacionPanel` | Slide-over con lista de notificaciones | Baja |
| `BookmarkToggle` | Ícono guardar/quitar de watchlist | Baja |
| `RelevanceBadge` | Badge "Relevante para vos" en remate cards | Baja |
| `PerfilEmpresa` | Vista y edición de perfil | Baja |

**Estimación total: ~15-20 componentes nuevos, 4 tablas, 6 rutas.**
