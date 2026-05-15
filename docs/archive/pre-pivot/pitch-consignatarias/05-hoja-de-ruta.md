# Hoja de Ruta: Implementación por fases

## Timeline general

```
MES 1-2          MES 3-4          MES 5-6          MES 7-12         AÑO 2+
─────────        ─────────        ─────────        ─────────        ─────────
Fundación        Core MVP         Lanzamiento      Monetización     Marketplace
DB + Auth +      Watchlist +      Onboarding de    Tier premium +   Negociación
Registro         Alertas +        30 frigoríficos  Señales de       directa +
                 Panel                             demanda          Comisión
```

## Fase 0: Preparación (Semana 1-2)

### Tareas

- [ ] Definir estructura de datos del remate existente en Supabase (entender el schema actual)
- [ ] Configurar Supabase Auth con Phone OTP en el proyecto existente
- [ ] Crear las 4 tablas nuevas (`frigorifico_profile`, `remate_watchlist`, `alerta_config`, `notificacion`) con RLS
- [ ] Configurar middleware de autenticación para rutas `/frigorificos/(portal)/*`
- [ ] Generar TypeScript types con `supabase gen types`

### Entregable

Auth funcional + tablas listas + types generados. Cero cambios visibles en producción.

## Fase 1A: Registro y perfil (Semana 3-4)

### Tareas

- [ ] Página `/frigorificos/registro` — Login con teléfono + OTP
- [ ] Wizard de onboarding en 3 pasos (datos personales → empresa → operación)
- [ ] Validación de CUIT (formato XX-XXXXXXXX-X con dígito verificador)
- [ ] Página `/frigorificos/perfil` — Ver y editar datos del perfil
- [ ] Agregar botón "Registrá tu frigorífico" en la página existente `/frigorificos`
- [ ] Agregar estado logueado al header (bell icon + "Mi portal")

### Entregable

Un frigorífico puede registrarse, completar su perfil, y ver el portal vacío. El directorio público muestra el CTA de registro.

## Fase 1B: Watchlist y panel (Semana 5-6)

### Tareas

- [ ] Componente `BookmarkToggle` — ícono para guardar/quitar remate de watchlist
- [ ] Integrar `BookmarkToggle` en las cards de remate existentes (solo visible logueado)
- [ ] Página `/frigorificos/watchlist` — Lista de remates guardados con estado, filtros, y notas
- [ ] Página `/frigorificos/panel` — Dashboard con resumen: remates en watchlist, remates relevantes recientes, indicadores de mercado
- [ ] Componente `RelevanceBadge` — Badge "Relevante" en remates que matchean preferencias del perfil
- [ ] Layout autenticado `(portal)/layout.tsx` con navegación (sidebar desktop / bottom tabs mobile)

### Entregable

Un frigorífico puede guardar remates, ver su watchlist, y tiene un panel personalizado. La experiencia de remates se enriquece para usuarios logueados.

## Fase 1C: Alertas y notificaciones (Semana 7-8)

### Tareas

- [ ] Página `/frigorificos/config` — Formulario para configurar criterios de alerta
- [ ] Supabase Edge Function: cuando se publica un nuevo remate, evaluar contra todas las `alerta_config` activas y generar notificaciones
- [ ] Página `/frigorificos/alertas` — Centro de notificaciones con lista, marcar como leída, click para navegar al remate
- [ ] Componente `NotificacionBell` — Badge en el header con contador de no leídas
- [ ] Supabase Realtime subscription para actualizar badge en tiempo real
- [ ] Email de alerta (opcional, via Supabase Edge Function + Resend/SendGrid)

### Entregable

Sistema de alertas funcional. Un frigorífico configura "Novillos Angus en Buenos Aires" y recibe notificación cuando se publica un remate que matchea.

## Fase 2: Lanzamiento y onboarding (Semana 9-12)

### Tareas de producto

- [ ] Landing/marketing dentro de `/frigorificos` explicando el módulo
- [ ] Onboarding email secuence (3 emails: bienvenida → configurar alertas → primer watchlist)
- [ ] FAQ / ayuda contextual en el portal
- [ ] Tracking de métricas: registros, DAU, watchlist saves, alertas configuradas

### Tareas de go-to-market

- [ ] Armar lista de los 50 frigoríficos más relevantes del directorio (por provincia, capacidad, tipo)
- [ ] Outreach directo: llamada/WhatsApp a directores comerciales
- [ ] Mensaje: "consignatarias.com.ar ahora tiene un portal exclusivo para frigoríficos. Registrate gratis y recibí alertas de remates que te sirven."
- [ ] Programa early adopter: los primeros 20 registrados obtienen "Frigorífico Fundador" badge + acceso permanente a features premium

### Entregable

30+ frigoríficos registrados. Métricas de engagement para validar hipótesis.

## Fase 3: Monetización (Meses 7-12)

### Tareas

- [ ] Implementar tier premium con límites en tier gratuito
- [ ] Integración de pagos (Mercado Pago o Stripe para suscripción mensual)
- [ ] Dashboard de demanda para consignatarias (datos agregados de watchlist + alertas)
- [ ] Analytics expandido: historial de precios INMAG 12 meses, tendencias por categoría
- [ ] Alertas por WhatsApp Business API (requiere cuenta verificada)

### Entregable

Revenue por suscripción. Datos de demanda disponibles para consignatarias.

## Fase 4: Marketplace (Año 2+)

### Tareas

- [ ] Feature "Señalizar intención" en remates de watchlist
- [ ] Dashboard consignataria: ver intenciones de frigoríficos en sus remates
- [ ] Canal de negociación directa (mensajes pre-remate entre partes)
- [ ] Comisión por transacción cerrada a través de la plataforma
- [ ] Scoring de consignatarias (rating por frigoríficos post-transacción)

### Entregable

Primeras transacciones directas facilitadas por la plataforma.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Baja adopción de frigoríficos (industria conservadora) | Media | Alto | Outreach personal, no masivo. Early adopter program. El valor es inmediato (alertas) sin cambiar su flujo de trabajo |
| Consignatarias ven al módulo como amenaza | Baja | Alto | Posicionar como herramienta que les trae más compradores a sus remates. Datos de demanda son valor directo para ellas |
| Complejidad técnica de matching alertas | Baja | Medio | El matching es simple (categoría ∈ criterios AND provincia ∈ criterios). No requiere ML, solo queries SQL |
| Free riders que nunca convierten a premium | Media | Bajo | El tier gratuito tiene valor suficiente para generar datos. La conversión a premium es upside, no el core business |
| Competidor copia la idea | Baja | Medio | consignatarias.com.ar tiene el asset (directorio + remates + tráfico). First mover advantage + data moat |

## Equipo necesario

| Rol | Dedicación | Fase |
|-----|-----------|------|
| Full-stack developer (Next.js + Supabase) | Full-time | Todas |
| Product/UX (diseño + copy) | Part-time | Fase 1-2 |
| Outreach/ventas (onboarding frigoríficos) | Part-time → Full-time | Fase 2+ |
| DevOps (Supabase Edge Functions, email) | Puntual | Fase 1C |
