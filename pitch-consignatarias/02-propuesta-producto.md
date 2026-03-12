# Propuesta de Producto: Módulo Frigoríficos

## Concepto central

Transformar el directorio estático de frigoríficos en `/frigorificos` en un **portal autenticado** donde los frigoríficos se convierten en usuarios activos de consignatarias.com.ar. No es una app separada — es una extensión natural de la plataforma.

## Flujo del usuario frigorífico

```
consignatarias.com.ar/frigorificos
        │
        ├── [Público] Directorio de 364 frigoríficos (ya existe)
        │       + botón "Registrá tu frigorífico" (nuevo)
        │
        └── [Autenticado] Portal del frigorífico
                │
                ├── /frigorificos/panel ──── Dashboard con resumen
                ├── /frigorificos/watchlist ── Remates guardados + alertas
                ├── /frigorificos/remates ─── Calendario filtrado por preferencias
                ├── /frigorificos/alertas ─── Centro de notificaciones
                ├── /frigorificos/perfil ──── Perfil de empresa verificado
                └── /frigorificos/config ──── Preferencias de alerta
```

## Features detallados

### Feature 1: Registro y perfil verificado

**Qué:** Un formulario de registro que convierte una fila del directorio en un usuario activo con login.

**Flujo:**
1. Frigorífico entra a `/frigorificos` y ve el directorio (como hoy)
2. Hace click en "Registrá tu frigorífico" → `/frigorificos/registro`
3. Se autentica con teléfono + OTP (Supabase Auth — misma infra que el resto de la plataforma)
4. Completa perfil en 3 pasos:
   - **Paso 1 — Datos personales:** Nombre, cargo
   - **Paso 2 — Empresa:** Razón social, CUIT, provincia, localidad, dirección
   - **Paso 3 — Operación:** Capacidad de faena (cabezas/día), habilitación para exportación (sí/no), razas preferidas, categorías de interés, provincias de origen preferidas

**Valor para consignatarias.com.ar:** Datos estructurados de demanda. Saber que 15 frigoríficos de Buenos Aires buscan novillos Angus de 400+ kg es información que ninguna otra plataforma tiene.

### Feature 2: Watchlist de remates

**Qué:** El frigorífico marca remates que le interesan con un "guardar" (corazón/bookmark). Los remates guardados aparecen en su panel con estado actualizado.

**Cómo funciona:**
- En el calendario de remates (que ya existe en `/remates`), cada remate muestra un ícono de bookmark para usuarios logueados
- Click → se guarda en la watchlist personal
- La watchlist vive en `/frigorificos/watchlist`
- Cada remate guardado muestra: consignataria, fecha, ubicación, categorías, cabezas estimadas, estado (programado/en curso/finalizado)
- Filtros: por fecha, por consignataria, por categoría, por provincia

**Valor para consignatarias.com.ar:** Engagement diario. Un frigorífico con 8 remates en watchlist vuelve todos los días a chequear. Además: la señal de demanda (qué remates se guardan más) es data valiosa.

### Feature 3: Alertas inteligentes por criterios

**Qué:** El frigorífico configura criterios de búsqueda y recibe notificaciones cuando se publica un remate que matchea.

**Criterios configurables:**
- Categoría: novillo, novillito, vaquillona, vaca, toro, ternero
- Raza: Angus, Hereford, Brangus, Braford, Holando, cruza
- Provincia de origen
- Rango de peso estimado
- Consignatarias específicas (seguir a una consignataria)
- Tipo de remate: invernada, cría, general

**Canales de notificación (MVP):**
- Notificación in-app (centro de alertas en `/frigorificos/alertas`)
- Email (opcional)

**Canales futuros:**
- WhatsApp Business API
- Push notification (si se agrega PWA)

**Valor para consignatarias.com.ar:** Retención. Un frigorífico que configura alertas no necesita buscar — la plataforma trabaja para él. Es el paso de "herramienta" a "servicio".

### Feature 4: Panel del frigorífico (Dashboard)

**Qué:** Vista resumen cuando el frigorífico entra logueado.

**Contenido:**
- **Resumen rápido:** "Tenés X remates en tu watchlist esta semana"
- **Remates relevantes nuevos:** Últimos remates que matchean tus criterios (últimas 24-48hs)
- **Indicadores de mercado:** INMAG, precios por categoría, variación semanal (ya disponible en consignatarias.com.ar — se reutiliza)
- **Accesos rápidos:** Ir a watchlist, ir a calendario filtrado, editar alertas

**Valor para consignatarias.com.ar:** Punto de entrada diario. En vez de scrollear el calendario genérico, el frigorífico ve su vista personalizada.

### Feature 5: Vista de remates filtrada por preferencias

**Qué:** El calendario de remates ya existente, pero pre-filtrado según las preferencias del perfil del frigorífico.

**Diferencia con el calendario público:**
- Remates que matchean criterios aparecen destacados (borde verde, badge "Relevante para vos")
- Filtros pre-aplicados según perfil (pero editables)
- Botón "Guardar en watchlist" integrado
- Contador: "X remates esta semana matchean tus criterios"

**Valor para consignatarias.com.ar:** El frigorífico encuentra lo que busca más rápido → más engagement → más uso de watchlist → más data de demanda.

### Feature 6: Señal de intención (futuro — Fase 2)

**Qué:** Antes de un remate, el frigorífico puede indicar "Me interesa este remate" con un rango de precio y cantidad de cabezas que busca.

**Cómo funciona:**
- En un remate guardado, el frigorífico puede agregar: "Busco 100-150 novillos Angus, dispuesto a pagar $X-Y/kg"
- Esta señal es visible **solo para la consignataria** que organiza el remate
- La consignataria ve: "3 frigoríficos señalizaron interés en tu remate del jueves"

**Valor para consignatarias.com.ar:** Esto es el puente hacia marketplace. La consignataria sabe que tiene demanda confirmada antes del remate. Puede ajustar la oferta, contactar al frigorífico directamente, o priorizar la comunicación.

## Lo que NO incluye el MVP

- No procesamos pagos ni escrow
- No reemplazamos el remate presencial o televisado
- No intermediamos la transacción legal (DTE, SENASA)
- No mostramos precios de cierre de remates anteriores (futuro)
- No incluimos chat en tiempo real entre partes (futuro)

## Design system: consistencia visual

El módulo frigoríficos adopta **exactamente** el mismo lenguaje visual de consignatarias.com.ar:

| Elemento | Valor |
|----------|-------|
| Background | `#09090b` (zinc-950) |
| Texto primario | `zinc-100` |
| Texto secundario | `zinc-400` |
| Bordes | `zinc-800` / `white/5` |
| Acento (indicadores activos) | `emerald-500` |
| Hover | `zinc-800` |
| Font | Inter (300-700) |
| Tracking | `tracking-tight` (default), `tracking-widest` (labels) |
| Framework | Tailwind CSS |
| Componentes | shadcn/ui (dark mode) |

Las nuevas pantallas son **indistinguibles** del resto de la plataforma. Un usuario no debería notar dónde termina lo existente y empieza lo nuevo.

## User stories MVP

| ID | Como... | Quiero... | Para... |
|----|---------|-----------|---------|
| F-001 | Frigorífico no registrado | Registrarme con mi teléfono y completar el perfil de mi empresa | Acceder al portal de frigoríficos |
| F-002 | Frigorífico logueado | Ver un panel con remates relevantes a mis preferencias | No perder tiempo buscando en el calendario general |
| F-003 | Frigorífico logueado | Guardar remates en mi watchlist | Trackear los que me interesan |
| F-004 | Frigorífico logueado | Configurar alertas por categoría, raza y provincia | Que me avisen cuando hay remates que me sirven |
| F-005 | Frigorífico logueado | Recibir notificaciones cuando se publica un remate relevante | No tener que chequear la plataforma constantemente |
| F-006 | Frigorífico logueado | Ver y editar el perfil de mi empresa | Mantener mis datos actualizados |
| F-007 | Consignataria (existente) | Ver cuántos frigoríficos guardaron mi remate | Saber el nivel de interés antes del remate |
