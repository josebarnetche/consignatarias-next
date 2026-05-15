# Propuesta de Integración: Módulo Frigoríficos para consignatarias.com.ar

## Resumen Ejecutivo

**consignatarias.com.ar** ya es la plataforma de referencia para inteligencia de mercado ganadero en Argentina: 373 remates programados, 300.000+ cabezas, datos de mercado en tiempo real, y un directorio de 364 frigoríficos habilitados por MAGYP.

Hoy la plataforma tiene el **lado de la oferta** resuelto (consignatarias y sus remates). Lo que falta es activar el **lado de la demanda**: los frigoríficos que compran esa hacienda.

### La propuesta

Agregar un módulo autenticado dentro de consignatarias.com.ar — accesible desde la sección `/frigorificos` que ya existe — donde los frigoríficos puedan:

1. **Crear un perfil verificado** con capacidad de faena, certificaciones, y preferencias de compra
2. **Armar una watchlist de remates** que matcheen sus necesidades (raza, categoría, provincia, rango de peso)
3. **Recibir alertas** cuando se publiquen remates relevantes a sus criterios
4. **Señalizar intención de compra** antes de cada remate (pre-bidding)
5. **Conectar directamente con consignatarias** a través de un canal dentro de la plataforma

### Por qué esto tiene sentido para consignatarias.com.ar

| Hoy | Con el módulo |
|-----|---------------|
| Los frigoríficos son filas en un directorio estático | Los frigoríficos son usuarios activos que vuelven todos los días |
| Las consignatarias publican remates sin saber quién mira | Las consignatarias ven demanda real antes del remate |
| El tráfico es informativo (consulta → se va) | El tráfico es transaccional (consulta → watchlist → alerta → acción) |
| Monetización limitada a publicidad/tráfico | Monetización por suscripción, señales de demanda, y match de compraventa |

### Números clave

- **364 frigoríficos** ya listados en el directorio — son el mercado cautivo
- **~450 frigoríficos activos** en Argentina, operando al 50-65% de capacidad
- Cada uno hace **30-50 llamadas telefónicas por día** para abastecerse de hacienda
- La industria cárnica argentina mueve **USD 14.000M anuales**
- No existe ninguna plataforma digital que conecte la oferta de remates con la demanda de frigoríficos

### Modelo de negocio propuesto

**Fase 1 (gratis):** Registro de frigoríficos + watchlist + alertas. Objetivo: onboardear 30+ frigoríficos en 90 días.

**Fase 2 (monetización):** Suscripción premium para frigoríficos (alertas avanzadas, señales de demanda para consignatarias, analytics de mercado). ARS $15.000-50.000/mes por frigorífico.

**Fase 3 (marketplace):** Canal de negociación directa entre consignatarias y frigoríficos dentro de la plataforma. Comisión por transacción cerrada.

### Inversión técnica estimada

- **Complejidad:** Media — se construye sobre la infraestructura existente (Next.js, Supabase, Tailwind)
- **Scope MVP:** 4-6 semanas de desarrollo
- **Tablas nuevas en Supabase:** 4 (company_profile, user_profile, watchlist, notification)
- **Rutas nuevas:** 6 (registro, dashboard, watchlist, alertas, perfil, configuración)
- **Cero cambios** en las funcionalidades actuales de consignatarias.com.ar

---

*Documento completo con investigación de mercado, arquitectura técnica, modelo de negocio y hoja de ruta en los archivos adjuntos.*
