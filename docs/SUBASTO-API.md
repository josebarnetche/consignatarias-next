# Subasto API — Documentación

**Base URL:** `https://www.consignatarias.com.ar/api`  
**Versión:** 1.0  
**Última actualización:** 2026-03-12

---

## Descripción

Subasto API provee acceso programático a datos del mercado ganadero argentino:
- Calendario de remates (302+ eventos indexados)
- 75 consignatarias activas
- 13 provincias cubiertas
- Precios de referencia INMAG
- Datos de frigoríficos

**Ideal para:** Apps agro, dashboards financieros, bots de alertas, análisis de mercado.

---

## Endpoints

### 1. GET /api/remates/hoy

Remates programados para hoy.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| provincia | string | Filtrar por provincia (ej: `BUENOS AIRES`) |
| consignataria | string | Filtrar por slug de consignataria |

**Ejemplo:**
```bash
curl https://www.consignatarias.com.ar/api/remates/hoy
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "fecha": "2026-03-12",
    "remates": [...],
    "total": 22
  }
}
```

---

### 2. GET /api/remates/proximos

Remates de los próximos 7 días.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| provincia | string | Filtrar por provincia |
| consignataria | string | Filtrar por slug |
| days | int | Días a buscar (1-30, default 7) |
| limit | int | Máximo de resultados |
| offset | int | Paginación |

**Ejemplo:**
```bash
curl "https://www.consignatarias.com.ar/api/remates/proximos?provincia=SANTA%20FE&days=14"
```

---

### 3. GET /api/remates/calendario

Vista de calendario semanal organizada por día.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| provincia | string | Filtrar por provincia |
| consignataria | string | Filtrar por slug |
| dias | int | Días a mostrar (1-14, default 7) |

**Ejemplo:**
```bash
curl https://www.consignatarias.com.ar/api/remates/calendario
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "semana": "2026-03-12 a 2026-03-19",
    "dias": [
      {
        "fecha": "2026-03-12",
        "dia_semana": "Jueves",
        "remates": [...],
        "total": 22
      },
      ...
    ],
    "total_semana": 81,
    "provincias_activas": ["BUENOS AIRES", "SANTA FE", ...]
  }
}
```

---

### 4. GET /api/remates/stats

Estadísticas generales del mercado.

**Ejemplo:**
```bash
curl https://www.consignatarias.com.ar/api/remates/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "totalRemates": 302,
      "rematesHoy": 22,
      "rematesProximos7dias": 81,
      "provinciasActivas": 13,
      "consignatariasActivas": 75
    },
    "porProvincia": [...],
    "topConsignatarias": [...],
    "porTipo": {...},
    "porCategoria": {...}
  }
}
```

---

### 5. GET /api/remates/buscar

Búsqueda de texto en remates.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| q | string | Término de búsqueda (requerido) |
| provincia | string | Filtrar por provincia |
| limit | int | Máximo resultados (default 20) |

**Ejemplo:**
```bash
curl "https://www.consignatarias.com.ar/api/remates/buscar?q=invernada"
```

---

### 6. GET /api/precios

Precios de referencia INMAG.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| categoria | string | Filtrar categoría (novillos, vacas, terneros, etc.) |

**Ejemplo:**
```bash
curl https://www.consignatarias.com.ar/api/precios
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "precios": [
      {"categoria": "novillos", "precio_kg": 4377, "variacion_semanal": "-3.3%"},
      {"categoria": "terneros", "precio_kg": 4815, "variacion_semanal": "-3.3%"},
      ...
    ],
    "indice_inmag": {"valor": 4377.21, "unidad": "$/kg vivo"}
  }
}
```

---

### 7. GET /api/consignataria/[slug]

Perfil completo de una consignataria.

**Ejemplo:**
```bash
curl https://www.consignatarias.com.ar/api/consignataria/colombo-y-colombo
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "consignataria": {
      "nombre": "Colombo y Colombo SA",
      "slug": "colombo-y-colombo",
      "provincia": "BUENOS AIRES",
      ...
    },
    "remates": {
      "proximos": [...],
      "pasados": [...],
      "total": 18
    }
  }
}
```

---

### 8. POST /api/webhooks/register

Registrar webhook para notificaciones (Premium).

**Body:**
```json
{
  "url": "https://tu-app.com/webhook",
  "events": ["remate.created", "price.update"],
  "filters": {
    "provincia": "BUENOS AIRES"
  }
}
```

**Eventos disponibles:**
- `remate.created` — Nuevo remate agregado
- `remate.updated` — Remate modificado
- `remate.cancelled` — Remate cancelado
- `remate.starting_soon` — Remate inicia en 1 hora
- `remate.live` — Remate en vivo ahora
- `price.update` — Actualización de precios INMAG

---

## Cache

Todas las respuestas incluyen headers de cache:

| Endpoint | Cache |
|----------|-------|
| /hoy | 5 minutos |
| /proximos | 15 minutos |
| /calendario | 15 minutos |
| /stats | 15 minutos |
| /precios | 1 hora |

---

## Límites

| Plan | Requests/día | Webhooks | Soporte |
|------|-------------|----------|---------|
| Free | 100 | - | Community |
| Pro | 10,000 | 5 | Email |
| Enterprise | Ilimitado | Ilimitado | Dedicado |

---

## Contacto

**API Questions:** api@consignatarias.com.ar  
**Ventas:** jose@memola.com.ar

---

*Subasto API es un producto de Memola Medios S.A.S.*
