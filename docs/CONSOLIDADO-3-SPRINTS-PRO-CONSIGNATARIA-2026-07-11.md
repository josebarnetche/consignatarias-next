# Consolidado de 3 sprints — PRO Consignataria

Fecha: 2026-07-11  
Fuente principal: revision local del codebase de `consignatarias.com.ar` y reporte base `REPORTE-PRO-CONSIGNATARIA-VENDIBLE-2026-07-11.md`.  
Alcance: perfil verificado, remates destacados, distribucion, tracking de leads, dashboard, reportes, pricing y errores que afectan la venta de PRO Consignataria.  
Limitacion: no se consulto base productiva en vivo. Este documento se basa en codigo, migraciones, datos locales y lectura funcional.

## 1. Veredicto consolidado

El producto mas vendible ahora es:

**PRO Consignataria — remates visibles y medibles.**

No debe venderse como "perfil verificado" aislado, ni como CRM completo, ni como marketplace transaccional. La propuesta que el codebase ya empieza a soportar es una capa B2B para que una consignataria:

1. Reclame y edite su perfil.
2. Muestre identidad, contacto, logo y datos comerciales.
3. Publique o corrija sus remates.
4. Tenga una landing compartible con QR.
5. Aparezca destacada en directorio/calendario.
6. Distribuya remates por canales propios de la plataforma.
7. Vea demanda generada: vistas, clicks, seguidores, marcas y leads.
8. Reciba un reporte mensual que explique que obtuvo por pagar.

Estado comercial actual:

**Vendible como piloto pago asistido, no como self-serve masivo.**

Precio recomendado ahora:

- **ARS 45.000/mes** como precio fundador para los primeros 5-10 pilotos.
- **ARS 120.000 por 90 dias** si se quiere prepago fundador.
- Subir a **ARS 75.000/mes** solo despues de cerrar distribucion auditable, reporte mensual y lead tracking mas claro.

La razon para vender ya:

- El producto existe lo suficiente para activar consignatarias reales.
- Hay dashboard, claim, perfiles, pagos, remates propios, QR, widget, iCal, leads y metricas.
- El beneficio es facil de explicar en lenguaje del sector: presencia, remates, consultas, reporte.

La razon para no escalar todavia:

- Varias promesas comerciales no estan respaldadas por una unica fuente de datos.
- Hay bugs de schema y cache que pueden hacer que una firma paga no vea beneficios.
- La distribucion no es aun completamente auditable por remate/campana.
- El dashboard muestra interes, pero todavia no demuestra ROI con suficiente precision.

## 2. Que hizo cada sprint

### Sprint 1 — Producto vendible, estado real y precio

Objetivo:

Determinar que producto puede venderse ahora mirando el codebase, no el roadmap imaginado.

Resultado:

- El producto vendible no es "perfil verificado".
- El producto vendible es **presencia medible para captar demanda de remates**.
- El paquete minimo incluye perfil verificado, remates propios, landing `/go`, QR, destaque, distribucion, dashboard y reporte.
- El precio visible actual de ARS 45.000/mes es coherente como piloto fundador.
- El producto todavia no soporta un precio premium fuerte porque no prueba ROI por cliente de manera autoservicio.

Hallazgos centrales:

- Perfil verificado: bastante avanzado.
- Remates destacados: parcialmente avanzado, pero con diferencias entre destaque visual y prioridad real.
- Distribucion: existe, pero necesita log por campana/remate.
- Tracking de leads: existe, pero mezcla clicks anonimos con leads identificados.
- Reporte: existe como PDF/email parcial, pero no como reporte comercial de performance.

Decision derivada:

Vender **PRO Fundador 90 dias** a pocas consignatarias, con operacion manual y promesa controlada:

> "Mayor presencia medible frente a productores que buscan remates y consignatarias."

No prometer:

- "Te generamos X leads".
- "Llenamos tu remate".
- "Apareces primero en todos lados".
- "Cada remate llega garantizado a toda la base".
- "Esto reemplaza tu relacion comercial historica".

### Sprint 2 — Motivo, impacto de negocio y busqueda de patrones

Objetivo:

Tomar los hallazgos del sprint 1, explicar por que importan, que significan para el negocio si no se arreglan, y buscar errores similares en el codebase.

Resultado:

Se tradujo cada gap tecnico a impacto comercial. La regla fue:

> Si el cliente paga y no puede ver, medir o explicar el beneficio, el riesgo es alto aunque la feature exista en codigo.

Patrones encontrados:

1. Dato capturado pero no accionable.
2. Evento medido pero no identificable.
3. Promesa comercial sin log.
4. Fuentes de verdad duplicadas.
5. Superficie estatica con estado comercial dinamico.
6. Feature del owner que no llega al publico.
7. Metricas internas sin version cliente.
8. Attribution incompleta.

Resultado del subagente:

- Confirmo que remates propios no propagan a todas las superficies.
- Confirmo que la bandeja de leads sobrepromete identidad.
- Confirmo que el PDF usa una query PRO vieja.
- Confirmo que ranking provincial ignora remates propios.
- Confirmo que `source` de leads es insuficiente.
- Agrego que telefono/email/web se trackean pero no se muestran al cliente.
- Agrego que la promesa de citas IA no se ve en dashboard.
- Agrego que las metricas internas son mas ricas que las visibles para el pagador.

Decision derivada:

El dashboard debe convertirse en un **embudo comercial visible**, no solo en un tablero de conteos.

Embudo objetivo:

1. Vistas de perfil y landing.
2. Interes anonimo: WhatsApp, telefono, email, web, catalogo, YouTube.
3. Leads identificados: nombre, telefono/email, mensaje.
4. Origen: perfil, QR, `/go`, newsletter, reminder, remate, Google, IA, referido.
5. Remate asociado.
6. Estado comercial: nuevo, contactado, interesado, cerrado, descartado.
7. Reporte mensual con interpretacion.

### Sprint 3 — Busqueda de errores concretos

Objetivo:

Repetir el proceso con foco en bugs, inconsistencias de schema, copy enganoso, cache/revalidacion y errores que puedan romper la venta de PRO Consignataria.

Resultado:

Se encontraron errores mas concretos:

- PDF de consignataria consulta `subscriptions.consignataria_slug`, columna vieja.
- Videos PRO buscan `consignatarias.slug`, pero el schema actual usa `canonical_slug`.
- CTA dice "Proba gratis" aunque checkout cobra ARS 45.000/mes.
- JSON-LD/FAQ habla en USD mientras UI visible vende ARS.
- Perfil y `/go` son estaticos; no todas las acciones revalidan.
- Cancelacion PRO apaga beneficios inmediatamente aunque el copy promete fin de periodo.
- Canje por puntos activa subscription pero no actualiza/revalida todas las superficies.
- `getEntityTier()` y `getFeaturedSlugs()` no validan `current_period_end` para entidades.
- WhatsApp principal del perfil no usa modal de lead capture.
- `remates/hoy` usa UTC pese a comentar timezone Argentina.
- `Mis reportes` y download directo tienen reglas de acceso opuestas.
- `Destacado del Mes` puede confundirse con destaque PRO pago.

Decision derivada:

Antes de vender fuerte hay que resolver coherencia contractual:

1. Lo que se cobra debe coincidir con lo que dice la pagina.
2. Lo que se activa debe verse inmediatamente.
3. Lo que el owner carga debe distribuirse donde se promete.
4. Lo que se mide debe aparecer en dashboard/reporte.
5. Lo que se cancela debe respetar el periodo pagado.

## 3. Producto objetivo consolidado

### Nombre recomendado

**PRO Consignataria — Remates visibles y medibles**

### Cliente inicial ideal

Consignataria regional activa que:

- Tiene remates frecuentes o remates especiales.
- Difunde por WhatsApp, flyers, Instagram, radio o web propia.
- No tiene equipo digital fuerte.
- Tiene necesidad de mostrarse fuera de su red historica.
- Valora tener una landing simple con QR.
- Puede pagar ARS 45.000/mes si recibe presencia y reporte.
- Quiere ver datos, pero no necesita aun un CRM sofisticado.

### Promesa segura

> "Te damos una ficha verificada, una landing con QR para tus remates, destaque en el directorio/calendario, distribucion en nuestros canales y un reporte mensual con cuanta gente vio, siguio y contacto tu consignataria."

### Promesa insegura por ahora

No usar estas frases hasta tener instrumentacion completa:

- "Te garantizamos leads".
- "Cada remate llega a mas de 500 productores".
- "Tus remates aparecen en todos los canales automaticamente".
- "Medimos exactamente quien clickeo WhatsApp".
- "Tu reporte muestra ROI completo".
- "Tenes prioridad en todo el calendario".
- "Proba gratis" si el checkout cobra.

### Unidad de valor

No cobrar por:

- Un badge.
- Una ficha.
- Una base de datos.
- Un dashboard.

Cobrar por:

**Presencia + distribucion + medicion.**

La consignataria paga porque quiere que sus remates sean encontrados y quiere prueba de que hubo interes.

## 4. Estado actual por modulo

| Modulo | Estado piloto | Estado self-serve | Valor comercial | Riesgo principal |
|---|---:|---:|---|---|
| Claim/perfil verificado | Alto | Medio | Da propiedad y confianza sobre la ficha. | Verificacion manual limita escala, pero es aceptable al inicio. |
| Perfil editable | Alto | Medio | Permite que la firma se vea seria y contactable. | Cambios pueden quedar cacheados si no se revalida. |
| Remates propios | Medio/Alto | Medio/Bajo | La firma puede cargar agenda y venderla como landing/QR. | No propaga a todas las superficies. |
| Destaque PRO | Medio | Medio/Bajo | Beneficio facil de entender. | Fuentes PRO duplicadas y promesa de prioridad poco clara. |
| Landing `/go` | Medio | Bajo/Medio | Muy vendible para QR/flyers/catalogos. | Estatica; puede no reflejar estado PRO o remates propios. |
| Distribucion email/reminders | Medio | Bajo | Argumento central de alcance. | Falta log por campana/remate y conteo auditable. |
| Tracking de WhatsApp | Medio/Alto | Medio | Prueba demanda anonima. | No es lead identificable. |
| Lead capture | Medio | Bajo/Medio | Permite accion comercial. | No cubre el WhatsApp principal del perfil. |
| Bandeja de leads | Medio | Bajo | Primer paso hacia mini-CRM. | Sin estado editable, notas, export ni atribucion granular. |
| Reporte mensual | Bajo/Medio | Bajo | Clave para retencion. | No muestra ROI completo ni campanas/remates. |
| Pago/activacion | Medio | Medio/Bajo | Permite cobrar. | Copy, cancelacion, revalidacion y fuente PRO requieren hardening. |
| Videos PRO | Bajo/Medio | Bajo | Feature visual interesante. | Ruta usa columna equivocada. |

## 5. Hallazgos consolidados priorizados

### P0 — Bloqueantes de venta seria

Estos son los puntos que pueden romper confianza con una consignataria paga.

| Hallazgo | Motivo tecnico | Impacto de negocio | Arreglo minimo | Criterio de aceptacion |
|---|---|---|---|---|
| Fuente PRO duplicada | `getFeaturedSlugs()` usa `featured=true` + subscription; `getEntityTier()` solo subscription activa. | Una firma puede verse PRO en un lugar y FREE en otro. | Crear helper unico `getConsignatariaPlanStatus(slug)`. | Perfil, `/go`, directorio, calendario, widget y reporte devuelven el mismo estado. |
| PDF PRO con schema viejo | `report/route.ts` usa `subscriptions.consignataria_slug`. | Reporte pago puede salir sin branding PRO. | Usar `entity_type='consignataria'` + `entity_slug=canonical`. | Test manual con sub activa muestra `isPro=true` en PDF. |
| Remates propios no distribuyen | `consignataria_auctions` se fusiona en perfil, pero muchas superficies leen `remates.json`. | La promesa "carga tu remate y lo distribuimos" puede fallar. | Helper `getMergedAuctionsForConsignataria`. | Un remate owner-created aparece en perfil, `/go`, widget, iCal y reporte. |
| `/go` no se revalida | Rebill revalida perfil, no landing `/go`; CRUD de remates tampoco revalida. | El cliente paga o edita y su QR puede quedar viejo. | `revalidatePath('/go/${slug}')` junto con perfil. | Tras activar/editar/cargar remate, `/go` refleja el cambio. |
| Cancelacion contradice contrato | UI dice acceso hasta fin de periodo; API apaga status/featured al instante. | Reclamo de facturacion y perdida de confianza. | Soportar `cancel_at_period_end` o mantener beneficios hasta `current_period_end`. | Cancelar renovacion no quita PRO antes del vencimiento. |
| Copy de prueba gratis enganoso | CTA dice "Proba gratis"; Rebill cobra ARS 45.000. | Abandono y desconfianza en checkout. | Cambiar copy o implementar trial real. | Ningun CTA promete gratis si no hay trial. |
| Moneda inconsistente | Schema/FAQ habla USD; UI cobra ARS. | Confusion comercial y SEO enganoso. | Unificar ARS/USD en UI, JSON-LD, FAQ y checkout. | Toda la pagina de planes comunica la misma moneda. |
| Lead tracking sobrepromete identidad | Click de WhatsApp no trae nombre/contacto. | Cliente ve clicks pero no puede accionar. | Separar "clicks anonimos" de "leads identificados". | Dashboard distingue claramente ambos conceptos. |

### P1 — Necesarios para retencion y repeticion

| Hallazgo | Motivo tecnico | Impacto de negocio | Arreglo minimo | Criterio de aceptacion |
|---|---|---|---|---|
| Lead capture no esta en WhatsApp principal del perfil | Perfil usa `wa.me` directo; modal vive en `/go`. | Se pierden leads identificables en la superficie mas importante. | Usar `SmartWhatsAppCTA` para perfiles PRO/verificados. | Un click PRO en perfil abre modal opcional antes de WhatsApp. |
| `source` de leads es demasiado grueso | Solo `profile`, `go_landing`, `remate`. | No se prueba ROI por canal. | Ampliar source y guardar UTM/campaign/remate. | Lead indica canal, remate y landing/campana cuando aplica. |
| Bandeja de leads no gestiona pipeline | No hay PATCH/status/notas/export/paginacion. | El cliente no lo incorpora a rutina comercial. | Estado editable, nota, CSV, filtros. | Owner puede cambiar estado y exportar leads. |
| Contactos por telefono/email/web no aparecen | Se emiten eventos `contact_phone/email/web`, dashboard no los consulta. | Se subestima el valor generado. | Panel de contactos anonimos por canal. | Reporte muestra WhatsApp, telefono, email y web. |
| Distribucion no es auditable | No hay tabla de campana por remate. | No se responde "a cuantos llego mi remate?". | `promotion_campaigns` o log equivalente. | Cada envio por remate queda asociado a slug/remate/canal. |
| Reporte mensual no explica ROI | Email mensual actual se centra en vistas. | Churn despues del primer mes. | Template de performance: vistas, contactos, leads, remates, campanas. | Cada cliente recibe reporte mensual accionable. |
| Videos PRO usan columna vieja | API busca `slug`, schema usa `canonical_slug`. | Feature PRO de medios puede fallar. | Resolver por `canonical_slug` y `id`. | GET/POST videos funciona con slug canonico. |
| PRO por puntos puede quedar vencido activo | Helpers miran `status='active'`, no periodo. | Bonificaciones se extienden sin control. | Validar `current_period_end`. | Vencido el periodo, superficies vuelven a FREE si no hay sub activa. |

### P2 — Calidad, claridad y expansion

| Hallazgo | Motivo tecnico | Impacto de negocio | Arreglo sugerido |
|---|---|---|---|
| `remates/hoy` usa UTC | `toISOString()` en vez de timezone Argentina. | De noche puede mostrar mal "hoy". | Helper de fecha ART. |
| `Mis reportes` y descarga tienen reglas opuestas | Pagina exige PRO; API dice gratis con login. | Funnel confuso. | Definir politica unica. |
| `Destacado del Mes` se confunde con PRO | Naming cercano a `featured` pago. | Confunde merito, actividad y beneficio pago. | Renombrar a actividad/ranking mensual. |
| Promesa de citas IA no esta productizada | Dashboard no muestra `ai_referrals` ni engine por firma. | Argumento comercial IA puede generar churn. | Agregar modulo IA solo cuando el dato sea atribuible por firma. |
| Ranking provincial ignora remates propios | Usa `rematesData`, no owner-remates. | El producto no recompensa uso del dashboard. | Calcular sobre dataset mergeado. |

## 6. Arquitectura objetivo del producto

Para que PRO Consignataria sea vendible sin friccion, el producto necesita seis capas coherentes.

### 6.1 Identidad

Responsabilidad:

- Saber quien es la consignataria.
- Verificar quien la administra.
- Mantener datos publicos confiables.

Componentes actuales:

- `claims`.
- `consignatarias`.
- `claimed_by_email`.
- Dashboard owner.

Gap:

- Falta un estado claro visible para separar:
  - perfil listado,
  - perfil reclamado,
  - perfil verificado,
  - perfil PRO,
  - perfil bonificado.

### 6.2 Oferta/remates

Responsabilidad:

- Mantener agenda de remates.
- Combinar datos scrapeados y datos cargados por owner.
- Exponer remates en todas las superficies.

Componentes actuales:

- `remates.json`.
- `consignataria_auctions`.
- Perfil publico.
- `/go`.
- Widget.
- iCal.
- APIs de remates.

Gap:

- La fuente mergeada no esta centralizada.

Helper recomendado:

```ts
getMergedAuctionsForConsignataria(slug, options)
```

Debe devolver:

- remates scrapeados,
- remates owner-created,
- source,
- status,
- visible surfaces,
- canonical normalized fields.

### 6.3 Distribucion

Responsabilidad:

- Tomar remates y llevarlos a audiencias/canales.
- Registrar que se envio, por donde, a cuantos y con que resultado.

Componentes actuales:

- Weekly newsletter.
- Remate reminders.
- New-remate alerts.
- Outreach logs.
- Newsletter subscribers.

Gap:

- No hay campana por remate/firma con metricas visibles al cliente.

Entidad recomendada:

```txt
promotion_campaigns
- id
- consignataria_slug
- remate_id
- channel
- campaign_type
- sent_count
- delivered_count
- opened_count
- clicked_count
- lead_count
- started_at
- finished_at
- metadata
```

### 6.4 Captura de demanda

Responsabilidad:

- Medir interes anonimo.
- Capturar leads identificados cuando el usuario acepta dejar datos.
- No confundir ambos.

Componentes actuales:

- `profile_views`.
- `whatsapp_clicks`.
- `value_events`.
- `consignataria_leads`.
- `visitors`.
- `LeadCaptureModal`.
- `ContactlessLeadForm`.

Gap:

- El dashboard no integra todas las senales.
- El WhatsApp principal del perfil evita el modal.
- Falta attribution granular.

Modelo recomendado:

- `contact_events`: eventos anonimos accionables.
- `consignataria_leads`: identidad y mensaje.
- `lead_events` o `lead_notes`: seguimiento comercial.

### 6.5 Dashboard y reporte

Responsabilidad:

- Traducir datos en valor de negocio.
- Mostrar embudo y proximos pasos.
- Producir reporte mensual exportable.

Dashboard objetivo:

1. Resumen ejecutivo: "este mes generaste X vistas, Y contactos, Z leads".
2. Embudo: vistas -> contactos anonimos -> leads -> remates con interes.
3. Leads: tabla accionable.
4. Remates: estado de distribucion por remate.
5. Canales: perfil, `/go`, QR, email, WhatsApp, Google, IA, referido.
6. Reporte: descargar/reenviar.
7. Plan: estado, vencimiento, renovacion/cancelacion.

### 6.6 Billing/plan

Responsabilidad:

- Cobrar.
- Activar.
- Mantener estado.
- Cancelar respetando contrato.
- Revalidar superficies publicas.

Componentes actuales:

- Rebill checkout.
- `subscriptions`.
- `user_subscriptions`.
- `getEntityTier`.
- `getFeaturedSlugs`.
- Rebill webhook.

Gap:

- Las reglas de plan no estan centralizadas.
- Cancelacion no respeta la promesa de fin de periodo.
- Bonificaciones por puntos no tienen ciclo de expiracion claro.

Helper recomendado:

```ts
getConsignatariaPlanStatus(slug): {
  tier: 'free' | 'pro' | 'enterprise'
  status: 'none' | 'active' | 'past_due' | 'cancelled' | 'expired'
  isPro: boolean
  source: 'subscription' | 'featured_flag' | 'points' | 'manual' | null
  currentPeriodEnd: string | null
}
```

## 7. Dashboard consolidado: que debe mostrar

### Estado actual

Hoy el dashboard ya muestra:

- Email y firma.
- Link al perfil publico.
- Badges verificada/PRO.
- Tabs: resumen, leads, remates, editar, resultados, plan.
- Vistas ultimos 30 dias.
- Clicks WhatsApp.
- Leads capturados.
- Seguidores y marcas.
- Ranking provincial.
- QR y link `/go`.
- Widget PRO.
- Remates propios y automaticos.
- Edicion de datos basicos.
- Estado de plan.

### Problema

El dashboard esta cerca de ser vendible, pero todavia no responde con suficiente fuerza:

> "Que negocio me genero pagar PRO?"

Muestra actividad, pero no siempre la conecta con:

- canal,
- remate,
- periodo,
- contacto accionable,
- distribucion,
- resultado comercial.

### Dashboard objetivo para los pilotos

#### Panel 1 — Resultado del periodo

Mostrar:

- Vistas de perfil.
- Visitas a `/go`.
- Contactos anonimos:
  - WhatsApp,
  - telefono,
  - email,
  - web,
  - catalogo,
  - YouTube.
- Leads identificados.
- Seguidores/watchlist.
- Remates publicados.
- Remates distribuidos.
- Variacion vs periodo anterior.

Texto sugerido:

> "En los ultimos 30 dias, tu firma recibio X vistas, Y acciones de contacto y Z leads identificados."

#### Panel 2 — Embudo

Estructura:

```txt
Vistas -> Contactos anonimos -> Leads identificados -> Contactados -> Cerrados/manual
```

En la primera version, "cerrados" puede ser manual. No hace falta automatizar operacion ganadera.

#### Panel 3 — Leads

Debe permitir:

- Ver nombre, telefono, email, mensaje.
- Ver source/canal.
- Ver remate asociado.
- Cambiar estado.
- Agregar nota.
- Exportar CSV.
- Filtrar por fecha/source/remate/status.

Estados recomendados:

- nuevo,
- contactado,
- interesado,
- no_responde,
- cerrado,
- descartado.

#### Panel 4 — Remates y distribucion

Para cada remate:

- visible en perfil,
- visible en `/go`,
- visible en widget,
- visible en iCal,
- incluido en newsletter,
- incluido en reminder,
- vistas/clicks/leads asociados,
- link para compartir.

#### Panel 5 — Reporte

Acciones:

- Descargar reporte mensual.
- Reenviar reporte por email.
- Ver historial de reportes.
- Ver resumen de campanas.

## 8. Roadmap consolidado

Este roadmap combina los tres sprints de auditoria en un plan de ejecucion de 90 dias.

### Etapa 1 — 0 a 14 dias: coherencia comercial y tecnica

Objetivo:

Que una consignataria pueda pagar y ver el beneficio correcto sin inconsistencias visibles.

Tareas P0:

1. Unificar estado PRO.
2. Arreglar query PRO del PDF.
3. Revalidar perfil y `/go` en activacion/cancelacion/edicion/remates.
4. Corregir cancelacion hasta fin de periodo.
5. Corregir copy de "Proba gratis".
6. Unificar moneda ARS/USD en planes, FAQ y schema.
7. Arreglar API de videos por `canonical_slug`.
8. Llevar lead capture al WhatsApp principal del perfil PRO.
9. Separar dashboard entre clicks anonimos y leads identificados.
10. Crear reporte mensual manual con metricas basicas.

Criterio para avanzar:

- Una firma paga y aparece PRO en perfil, `/go`, directorio, calendario y reporte.
- Una firma cancela renovacion y conserva beneficios hasta vencimiento.
- El QR `/go` refleja datos actuales.
- El dashboard ya no promete identidad en clicks anonimos.
- No hay copy comercial que contradiga el checkout.

### Etapa 2 — 15 a 45 dias: pilotos pagos y aprendizaje

Objetivo:

Vender 5 pilotos pagos y aprender si la propuesta tiene disposicion real a pagar.

Tareas:

1. Seleccionar 20 prospects regionales.
2. Activar 5 pilotos con onboarding asistido.
3. Cargar logo, contacto, descripcion, remates y QR.
4. Usar reporte mensual manual.
5. Registrar cada objecion comercial.
6. Medir uso real de `/go`, QR, dashboard y leads.
7. Armar primer caso de exito si una firma recibe demanda medible.

Oferta:

- PRO Fundador 90 dias.
- ARS 45.000/mes o ARS 120.000 prepago.
- Sin prometer volumen garantizado.

Criterio para avanzar:

- 3 de 5 pilotos quieren seguir.
- 2 de 5 usan activamente QR/landing o cargan remates.
- Al menos 3 entienden el reporte sin explicacion adicional.
- No hay reclamos por beneficios no visibles.

### Etapa 3 — 46 a 90 dias: repeticion y automatizacion

Objetivo:

Pasar de piloto asistido a producto repetible.

Tareas:

1. Centralizar remates mergeados en DAL unico.
2. Alimentar `/go`, widget, iCal, APIs y reportes desde la fuente mergeada.
3. Crear log de campanas por remate.
4. Automatizar reporte mensual.
5. Agregar lead status/notas/export/filtros.
6. Agregar contactos anonimos por canal.
7. Crear pantalla "distribucion por remate".
8. Definir nuevo precio para altas: ARS 75.000/mes.

Criterio para avanzar:

- 10 clientes pagos o pipeline de 25 conversaciones calificadas.
- Reporte mensual generado sin trabajo manual pesado.
- Cliente puede responder "que recibi por pagar" mirando dashboard.
- Cada remate owner-created aparece en todas las superficies prometidas.

## 9. Backlog tecnico detallado

### Epic A — Plan PRO y billing

Objetivo:

Tener una sola verdad de plan.

Tareas:

- Crear helper unico de status PRO.
- Reemplazar llamadas directas a `getFeaturedSlugs()` y `getEntityTier()` donde haya decision comercial.
- Validar `current_period_end` para entidades.
- Soportar cancelacion a fin de periodo.
- Revalidar superficies despues de cambios de plan.
- Agregar tests unitarios o integration light para:
  - active,
  - past_due,
  - cancelled con periodo vigente,
  - expired,
  - featured manual.

### Epic B — Remates mergeados

Objetivo:

Que un remate cargado por el owner sea realmente distribuible.

Tareas:

- Crear DAL `getMergedAuctionsForConsignataria`.
- Normalizar campos entre `remates.json` y `consignataria_auctions`.
- Usar DAL en:
  - perfil,
  - `/go`,
  - widget,
  - iCal,
  - PDF,
  - dashboard,
  - eventualmente APIs globales.
- Agregar indicador de superficie visible.
- Revalidar despues de POST/PATCH/DELETE.

### Epic C — Leads y contactos

Objetivo:

Diferenciar interes anonimo de lead accionable y mejorar atribucion.

Tareas:

- Llevar `SmartWhatsAppCTA` al perfil PRO.
- Ampliar `source`.
- Guardar UTM/campaign/remate cuando exista.
- Crear PATCH de lead para status/notas.
- Crear export CSV.
- Agregar filtros y paginacion.
- Mostrar telefono/email/web/clicks como contactos anonimos.
- Crear metrica click -> lead.

### Epic D — Distribucion auditable

Objetivo:

Convertir la promesa de alcance en datos defendibles.

Tareas:

- Crear `promotion_campaigns`.
- Registrar inclusion de remates PRO en newsletter/reminders.
- Generar links con UTM por slug/remate/canal.
- Guardar sent_count y clicked_count cuando existan.
- Mostrar por remate:
  - enviado,
  - canal,
  - fecha,
  - clicks,
  - leads.

### Epic E — Reporte mensual

Objetivo:

Hacer tangible el valor.

Tareas:

- Arreglar query PRO del PDF.
- Cambiar PDF de "perfil institucional" a "performance mensual".
- Incluir:
  - vistas,
  - contactos anonimos,
  - leads,
  - remates,
  - distribucion,
  - comparacion vs periodo anterior,
  - top remate,
  - recomendaciones.
- Permitir reenviar/descargar desde dashboard.
- Definir politica de reportes free/pro y aplicarla en pagina/API.

### Epic F — Copy y pricing

Objetivo:

No perder confianza por promesas inconsistentes.

Tareas:

- Reemplazar "Proba gratis" si no hay trial.
- Unificar ARS/USD.
- Cambiar "badge dorado" por "badge PRO" o alinear UI.
- Cambiar "+500 productores" por numero dinamico o wording defensible.
- Separar verificado vs PRO.
- Revisar copy de dashboard para no llamar lead a un click anonimo.

## 10. Modelo comercial consolidado

### Oferta inicial

**PRO Fundador — 90 dias**

Incluye:

- Perfil reclamado/verificado.
- Setup asistido.
- Logo, contactos, descripcion, CUIT.
- Hasta 10 remates cargados/auditados.
- Landing `/go` con QR.
- Destaque PRO.
- Widget e iCal.
- Inclusion preferente en canales propios.
- Dashboard de vistas, contactos y leads.
- Reporte mensual.
- Soporte por WhatsApp/email.

Precio:

- ARS 45.000/mes.
- ARS 120.000 por 90 dias prepago.

Condicion:

- Maximo 10 firmas.
- Se vende como fundador/piloto.
- El equipo puede operar manualmente parte del reporte.

### Precio objetivo v1

Luego de hardening:

- ARS 75.000/mes.
- ARS 200.000/trimestre.

Condiciones para subir:

- Reporte mensual automatico.
- Campanas por remate trazables.
- Leads accionables.
- Remates propios en todas las superficies.
- 2-3 casos con datos reales.

### Add-ons

Posibles despues:

- Remate especial destacado: ARS 35.000-60.000 por evento.
- Campana adicional por email/newsletter.
- Carga asistida mensual.
- Reporte avanzado por plaza/categoria.
- API/data para empresas, separado del plan consignataria.

## 11. Go-to-market recomendado

### No vender como marketing digital generico

Evitar:

- "te hacemos publicidad",
- "somos una agencia",
- "te damos SEO",
- "te generamos ventas".

Vender:

- "tu agenda de remates ordenada",
- "QR para compartir en catalogos y flyers",
- "destaque donde el productor ya busca",
- "datos de quien mostro interes",
- "reporte mensual".

### Pitch de 30 segundos

> "Hoy tus remates estan repartidos entre WhatsApp, flyer, Instagram y llamados. Con PRO tenes una ficha verificada, una landing con QR para tus remates, destaque en el calendario de consignatarias.com.ar y un reporte mensual con vistas, contactos y consultas. No reemplaza tu relacion comercial: la hace mas visible y medible."

### Objeciones esperables

| Objecion | Respuesta recomendada |
|---|---|
| "Mis clientes ya me escriben por WhatsApp." | "Perfecto. La idea no es reemplazar WhatsApp, sino medir cuantos llegan desde busquedas, QR y calendario, y no perder consultas nuevas." |
| "No quiero ranking que me compare." | "El plan no se vende como ranking; se vende como perfil propio, remates y medicion. La comparacion publica agresiva no es el foco." |
| "No se si me trae ventas." | "Por eso el piloto mide vistas, contactos y leads. No prometemos venta cerrada; prometemos presencia medible." |
| "Ya tengo web." | "El QR y widget pueden complementar tu web y ordenar el calendario en una pagina liviana." |
| "45.000 por mes es otro costo." | "Se evalua contra lo que cuesta difundir un remate especial y contra perder consultas no registradas." |

## 12. Riesgos consolidados

| Riesgo | Probabilidad | Impacto | Indicador temprano | Mitigacion |
|---|---:|---:|---|---|
| El cliente no percibe ROI | Alta | Alta | No abre dashboard o no renueva | Reporte mensual accionable y llamado de seguimiento en pilotos. |
| Distribucion no auditable | Alta | Alta | Preguntan "a cuantos llego?" y no hay respuesta | Log por remate/campana antes de escalar. |
| Bugs visibles post-pago | Media | Alta | Paga y `/go`/perfil no muestran PRO | Revalidacion y helper unico de plan. |
| Clicks no se convierten en leads | Media | Alta | Muchos WhatsApp clicks, pocos leads | Modal opcional y separacion clara click/lead. |
| Copy genera reclamos | Media | Alta | Preguntas sobre "gratis", USD, +500 | Unificar copy antes de venta. |
| Owner carga remate y no se distribuye | Alta | Alta | Remate aparece solo en perfil | Fuente mergeada central. |
| Cancelacion genera conflicto | Media | Media/Alta | Cliente cancela y pierde beneficios | Cancelacion a fin de periodo. |
| Mercado no paga mensual | Media | Alta | Pilotos no renuevan pese a metricas | Probar trimestral y add-on por remate especial. |
| Consignatarias perciben amenaza | Media | Alta | Rechazo a comparadores/rankings | Posicionar como herramienta de presencia, no ranking. |
| Operacion manual no escala | Alta | Media | Reportes atrasados | Automatizar luego de 5 pilotos, no antes. |

## 13. Definicion de listo

### Listo para 5 pilotos pagos

El producto esta listo para 5 pilotos si:

- Plan PRO se ve igual en perfil, `/go`, dashboard y reporte.
- Copy de precio/trial/moneda es coherente.
- Reporte PDF reconoce PRO.
- WhatsApp principal puede capturar lead o el dashboard aclara que es click anonimo.
- Se puede generar reporte mensual manual.
- Remates owner-created aparecen al menos en perfil y `/go`.
- El equipo puede explicar que todavia la distribucion es asistida.

### Listo para 10-20 clientes

El producto esta listo para 10-20 clientes si:

- Remates owner-created alimentan perfil, `/go`, widget, iCal y reporte.
- Existe log de distribucion por remate.
- Leads tienen status/notas/export.
- Reporte mensual es semi-automatico.
- Cancelacion y vencimiento son correctos.
- No hay inconsistencias de copy.

### Listo para self-serve

El producto esta listo para self-serve si:

- Claim, pago, activacion y revalidacion son automaticos.
- Onboarding guia al owner hasta publicar/rematar.
- El dashboard explica valor sin llamada humana.
- Las campanas se registran automaticamente.
- El reporte mensual sale solo.
- Soporte no depende de corregir datos manuales por cada alta.

## 14. Recomendacion final

La prioridad no es agregar mas features. La prioridad es cerrar el circuito minimo de valor:

1. La firma paga.
2. El estado PRO se activa correctamente.
3. Perfil y `/go` se actualizan inmediatamente.
4. El remate que carga aparece donde se prometio.
5. La demanda queda medida como click anonimo o lead identificado, sin confundirlos.
6. El dashboard muestra el embudo.
7. El reporte mensual transforma datos en valor comercial.

Mientras ese circuito no este cerrado, la venta debe ser piloto asistido.

Cuando este cerrado, el producto puede defender ARS 75.000/mes porque ya no vende "un perfil": vende una infraestructura liviana de presencia, distribucion y medicion para consignatarias.

Recomendacion inequivoca:

- **Vender ahora:** PRO Fundador, ARS 45.000/mes, maximo 5-10 pilotos, con soporte manual.
- **No vender todavia:** SaaS self-serve, CRM completo, marketplace, ranking de mejores consignatarias, garantia de leads.
- **Arreglar primero:** fuente PRO, revalidacion, remates mergeados, reporte PRO, copy de pricing, lead capture del perfil y cancelacion.
- **Ventaja a construir:** historico propio de actividad por remate/firma/canal: calendario, demanda, contactos, leads, distribucion y reportes. Eso es mas defendible que scraping de remates.
