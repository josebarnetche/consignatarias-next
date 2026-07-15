# Reporte de producto vendible — PRO Consignataria

Fecha: 2026-07-11  
Alcance: revision del codebase local de `consignatarias.com.ar`. No se consulto DB productiva en vivo ni fuentes externas en este pase.

## 1. Veredicto ejecutivo

El producto mas vendible ahora no es "perfil verificado" aislado. Es:

**PRO Consignataria: presencia medible para captar demanda de remates.**

El paquete deberia venderse como:

1. Perfil reclamado/verificado.
2. Agenda de remates propia y distribuible.
3. Destaque PRO en directorio y calendario.
4. Landing `/go/<firma>` con QR, calendario y WhatsApp.
5. Distribucion de remates en canales propios.
6. Tracking de vistas, clicks, seguidores, marcas y leads.
7. Reporte mensual simple de performance.

Estado real: **vendible como piloto pago con operacion manual**. Todavia no esta listo para prometer un SaaS autoservicio maduro ni una plataforma de generacion garantizada de leads.

Mi lectura cuantitativa:

| Modulo | Listo para piloto | Listo para escalar self-serve | Comentario |
|---|---:|---:|---|
| Perfil verificado | 80% | 60% | Flujo de claim y dashboard existen; aprobacion sigue manual. |
| Remates destacados | 70% | 50% | Directorio prioriza PRO; remates muestran estilo PRO, pero no cambian orden ni APIs. |
| Distribucion | 55% | 35% | Hay newsletter/alertas/recordatorios; falta log de campana por remate y reporting al cliente. |
| Tracking de leads | 70% | 45% | Vistas, WhatsApp clicks y leads existen; captura de datos no ocurre en todas las superficies. |
| Reporte | 40% | 25% | Hay PDF y email mensual de vistas; no hay reporte de ROI comercial integrado. |
| Pago/activacion | 75% | 55% | Checkout Rebill y webhook existen; hay inconsistencias de cache/fuente PRO que corregir. |

**Conclusion:** se puede vender ya a 5-10 consignatarias como "PRO Fundador" si el equipo promete alcance medible, no resultados comerciales garantizados. Antes de vender a escala hay que cerrar 7 gaps tecnicos y operativos.

## 2. Evidencia principal del codebase

Superficies revisadas:

- Perfil publico: `src/app/(terminal)/consignatarias/[slug]/page.tsx` y `ConsignatariaProfileClient.tsx`.
- Claim/verificacion: `src/app/api/claims/route.ts`, `src/app/api/admin/claims/[id]/route.ts`, `src/components/claims/ClaimForm.tsx`.
- Dashboard de consignataria: `src/app/(terminal)/dashboard/page.tsx` y `DashboardClient.tsx`.
- Pago PRO: `src/components/consignataria/ActivarProForm.tsx`, `src/app/api/consignataria/checkout-public/route.ts`, `src/app/api/webhooks/rebill/route.ts`.
- PRO/featured: `src/lib/featured.ts`, `src/lib/features.ts`, `src/app/api/featured-slugs/route.ts`.
- Directorio/remates: `src/app/(terminal)/consignatarias/page.tsx`, `ConsignatariasDirectoryClient.tsx`, `src/app/(terminal)/remates/RematesClient.tsx`.
- Leads/tracking: `src/app/api/profile-views/route.ts`, `src/app/api/track/whatsapp/route.ts`, `src/app/api/leads/route.ts`, `src/components/LeadCaptureModal.tsx`, `src/components/ContactlessLeadForm.tsx`.
- Distribucion: `src/app/api/cron/weekly-newsletter/route.ts`, `src/app/api/cron/remate-reminders/route.ts`, `src/app/api/cron/new-remate-alerts/route.ts`, `src/app/api/cron/pro-consignataria-outreach/route.ts`, `src/app/api/cron/post-remate-outreach/route.ts`.
- Reportes: `src/app/api/cron/monthly-metrics/route.ts`, `src/app/api/consignatarias/[slug]/report/route.ts`, `src/lib/pdf/generateConsignatariaPDF.ts`.

Numeros del dataset local al 2026-07-11:

- 107 perfiles canonicos de consignatarias.
- 735 remates en `remates.json`.
- 283 remates futuros/programados.
- 166 remates con cabezas estimadas.
- `PLATFORM_STATS.newsletterSubscribers = 500`, hardcodeado, no derivado de DB en runtime.

## 3. Que esta hecho

### 3.1 Perfil verificado

Hecho:

- Form publico de reclamo por slug, nombre y email.
- Rate limiting por IP/email.
- Creacion de claim pendiente.
- Notificacion al admin.
- Aprobacion/rechazo desde `/admin/claims`.
- Al aprobar: `verified=true`, `claimed_at`, `claimed_by_email`, usuario auth y rol `owner`.
- Dashboard para owner con tabs de resumen, leads, remates, editar, resultados y plan.
- Edicion de telefono, email, web, descripcion, WhatsApp, CUIT y logo.

Valor comercial:

El perfil verificado es el "derecho de propiedad" sobre la ficha. Sirve para confianza y onboarding, pero por si solo no justifica ARS 45.000/mes. La monetizacion empieza cuando se combina con remates, distribucion y medicion.

Gaps:

- La aprobacion manual es correcta para confianza, pero limita self-serve.
- El claim promete "publicas tus propios remates" y "recibis consultas"; eso existe, pero debe estar muy claro en onboarding para que el usuario lo encuentre.
- No hay checklist juridico/comercial fuerte para verificar identidad mas alla de email + revision manual.

### 3.2 Remates destacados

Hecho:

- Pago/webhook activa subscription y marca `consignatarias.featured = true`.
- `getFeaturedSlugs()` unifica `featured=true` + subscription activa.
- Directorio prioriza firmas PRO en todos los ordenamientos.
- Calendario de remates carga `/api/featured-slugs` y pinta filas PRO con badge y estilo destacado.
- Dashboard permite cargar remates propios en `consignataria_auctions`.
- Perfil fusiona remates scrapeados y remates propios.

Valor comercial:

Este es uno de los beneficios vendibles. Para una consignataria, aparecer arriba en directorio y diferenciado en remates es entendible y facil de explicar. Pero hay que venderlo como visibilidad, no como "mejor posicion absoluta en todo el sitio".

Gaps:

- En `/remates`, el destaque es visual; el orden sigue siendo fecha/hora. No es "ranking prioritario" en calendario.
- El destacado se agrega client-side luego de hidratar. El HTML inicial no nace destacado.
- APIs publicas de remates no inyectan `featured`.
- Los remates cargados por el owner se ven en el perfil, pero no alimentan automaticamente todas las superficies vendibles: calendario global `/remates`, landing `/go`, widget, iCal y newsletter siguen leyendo principalmente `remates.json`.
- El copy habla varias veces de "badge dorado", pero `ProBadge` es sky/azul.
- Hay una inconsistencia entre `getFeaturedSlugs()` y `getEntityTier()`: algunas superficies consideran PRO por `featured=true`, otras solo por subscription activa.

### 3.3 Distribucion

Hecho:

- Newsletter semanal con remates PRO arriba.
- Recordatorios T-24h/T-1h a productores opt-in o watchers.
- Alertas de nuevos remates para usuarios con alertas activas.
- Outreach post-remate a consignatarias para pedir resultados.
- `outreach_log` evita duplicados y deja rastro interno de envios.
- Landing `/go/<firma>` lista proximo remate, mas remates, contacto, follow y calendario.
- Dashboard genera QR, link compartible, iCal y widget embebible.

Valor comercial:

La distribucion es el argumento central, pero solo si se vuelve auditable. El cliente no compra "estar en el directorio"; compra que sus proximos remates sean vistos por productores y compradores en momentos de decision.

Gaps:

- "+500 productores" aparece como promesa, pero el numero esta hardcodeado en stats y no se ve como conteo real de destinatarios por campana.
- No hay entidad `campaign` o `auction_promotion` por remate.
- No hay reporte de entregados, aperturas, clicks y leads por remate.
- `weekly-newsletter` informa `sent`, `total`, `proCount`, pero ese dato queda como metadata interna del cron, no como reporte por consignataria.
- `remate-reminders` no es exclusivo PRO por defecto; puede operar abierto a opt-ins de cualquier firma segun configuracion. Por eso hoy conviene vender "inclusion preferente", no "canal exclusivo".
- La landing `/go/<slug>` es estatica y usa `getEntityTier()`. El webhook revalida `/consignatarias/<slug>`, pero no `/go/<slug>`. Un pago puede no reflejarse ahi hasta el proximo deploy.

### 3.4 Tracking de leads

Hecho:

- `profile_views` registra vistas first-party con bot filtering basico.
- `whatsapp_clicks` registra clicks de WhatsApp por slug y source.
- `consignataria_leads` guarda nombre, telefono, email, mensaje, source, remate_id, status e ip_hash.
- Rate limit de leads por IP/consignataria/dia.
- Dashboard muestra vistas, clicks WhatsApp, leads, seguidores, marcas, watchlist, ranking provincial y percentil.
- Dashboard tiene bandeja de leads con WhatsApp/email.
- `ContactlessLeadForm` captura datos cuando una firma no tiene contacto publico.
- En `/go`, para PRO, `SmartWhatsAppCTA` puede mostrar modal de captura antes de abrir WhatsApp.

Valor comercial:

Este modulo convierte el producto en algo que una consignataria revisa. El hook es: "te mostramos quien te busco y que remates generaron interes".

Gaps:

- En el perfil publico principal, el WhatsApp va directo y solo registra click; no captura nombre/contacto aunque la firma sea PRO.
- El dashboard dice/insinua que un click de WhatsApp puede aparecer como lead, pero en realidad `whatsapp_clicks` no trae identidad.
- La bandeja no permite cambiar estado, asignar responsable, exportar CSV ni cerrar seguimiento.
- No hay atribucion por campana/remate/email. `source` es muy grueso.
- `profile_views` cuenta eventos brutos; no hay visitantes unicos ni dedupe por sesion.

### 3.5 Reporte

Hecho:

- Email mensual de metricas a consignatarias reclamadas con vistas de perfil del mes anterior.
- PDF por consignataria con datos de perfil, stats de remates, cabezas, provincias, tipos y proximos remates.
- Dashboard con metricas actuales de ultimos 30 dias.

Valor comercial:

El reporte es necesario para retencion. Sin reporte, el cliente percibe PRO como "pague y me pusieron un badge". Con reporte, percibe "pague y recibi X vistas, Y clicks, Z productores siguiendo y N consultas".

Gaps:

- El PDF actual es mas una pieza institucional / reporte de agenda que un reporte de performance.
- `report/route.ts` consulta `subscriptions` por `consignataria_slug`, pero el esquema vigente usa `entity_type/entity_slug`. Puede no reconocer PRO correctamente.
- El email mensual solo reporta vistas; no incluye WhatsApp, leads, remates publicados, envios, seguidores ni comparativa.
- No hay reporte por remate.
- No hay version "lista para mandar al cliente" desde admin.

## 4. Producto mas vendible ahora

Nombre recomendado:

**PRO Consignataria — Remates visibles y medibles**

No lo venderia como:

- "SaaS de gestion de consignatarias".
- "CRM ganadero completo".
- "Marketplace de hacienda".
- "Generador garantizado de operaciones".
- "Ranking de mejores consignatarias".

Si lo venderia como:

> "Te damos una ficha verificada, una landing con QR para tus remates, destaque en el directorio/calendario, distribucion en nuestros canales y un reporte mensual con cuanta gente vio, siguio y contacto tu consignataria."

El producto pago minimo deberia incluir:

1. Perfil verificado y editable.
2. Logo, descripcion, WhatsApp, email, web, CUIT y medios de contacto.
3. Publicacion de remates propios.
4. Landing `/go/<slug>` con QR para catalogo/carteleria.
5. iCal/calendario suscribible.
6. Widget embebible para web propia.
7. Badge PRO.
8. Prioridad en directorio.
9. Destaque visual en calendario de remates.
10. Inclusion preferente en newsletter/recordatorios cuando corresponda.
11. Tracking: vistas, clicks, follows, marcas, leads.
12. Bandeja de leads.
13. Reporte mensual manual o semi-automatizado.

Promesa comercial segura:

> "Mayor presencia medible frente a productores que buscan remates y consignatarias."

Promesa que no haria todavia:

> "Te generamos X leads", "llenamos tu remate", "vendemos mas hacienda", "apareces primero en todos lados", "llegas a toda la base en cada remate".

## 5. Precio recomendado

### Precio visible actual

El codebase vende PRO Consignataria a **ARS 45.000/mes**:

- `ActivarProForm`: "Activar PRO — ARS 45.000/mes".
- `/api/planes`: plan PRO `price: 45000`.
- Dashboard: CTA "Activar PRO Consignataria — $45.000/mes".
- Landing para consignatarias: "ARS 45.000/mes · sin permanencia".

### Mi recomendacion

Mantener **ARS 45.000/mes** solo como precio fundador de los primeros pilotos, no como precio definitivo.

Propuesta:

| Etapa | Precio | Condicion | Razon |
|---|---:|---|---|
| Piloto fundador | ARS 45.000/mes | Maximo 10 consignatarias, 90 dias | Alinea con el codigo actual y reduce friccion mientras el reporte sigue manual. |
| Precio objetivo v1 | ARS 75.000/mes | Luego de cerrar reportes + distribucion auditable | Mas defendible si incluye reporte mensual y campanas trazables. |
| Trimestral recomendado | ARS 200.000/trimestre | Pago anticipado | Baja churn y cubre onboarding manual. |
| Add-on remate especial | ARS 35.000-60.000 por remate | Solo con log de campana | Para remates de reproductores/especiales donde el valor por evento es mayor. |
| Enterprise/data | A medida | API, integraciones, reportes sectoriales | Producto distinto; no mezclar en la venta inicial. |

No subiria a ARS 120.000-150.000/mes todavia porque el producto aun no prueba ROI por cliente. Ese precio exige por lo menos: reporte por campana, leads identificables, base real de destinatarios y caso de exito.

Unidad de valor correcta:

- No cobrar por "perfil".
- No cobrar por "badge".
- Cobrar por **presencia + distribucion + medicion**.

## 6. Oferta para vender en los proximos 90 dias

Oferta:

**PRO Fundador — 90 dias**

Incluye:

- Activacion y verificacion del perfil.
- Carga inicial asistida de datos, logo y contactos.
- Hasta 10 remates cargados o auditados.
- Landing con QR para usar en catalogos.
- Destaque PRO en directorio y calendario.
- Inclusion preferente en newsletter semanal cuando haya remates proximos.
- Dashboard de vistas, WhatsApp, leads y seguidores.
- Reporte mensual enviado por email.
- Soporte por WhatsApp/email.

Precio:

- **ARS 45.000/mes**, sin permanencia, o
- **ARS 120.000 por 90 dias** prepago fundador.

Cliente ideal inicial:

- Consignataria regional activa.
- Tiene calendario recurrente.
- Usa WhatsApp y flyers/manualidad para difundir.
- Tiene 2-8 remates por mes o remates especiales de alto valor.
- No tiene equipo digital propio fuerte.
- Valora que el productor la encuentre y que sus remates circulen.

Argumento de venta:

> "Hoy tus remates estan dispersos entre flyer, WhatsApp, Instagram, web propia y llamados. Nosotros te damos una landing unica con QR, te destacamos donde el productor ya busca remates y te devolvemos metricas: vistas, clicks, seguidores y consultas."

## 7. Gaps criticos antes de vender mas de 10 pilotos

Ordenados por impacto comercial.

### P0 — Corregir fuente de verdad PRO

Problema:

- `getFeaturedSlugs()` considera PRO por `featured=true` o subscription activa.
- `getEntityTier()` solo considera subscription activa.
- `/go` y perfil dependen de `getEntityTier()`.
- `report/route.ts` usa una columna vieja (`consignataria_slug`) para subscription.

Impacto:

Una firma bonificada o recien activada puede verse PRO en una superficie y FREE en otra.

Accion:

- Crear helper unico `isProConsignataria(slug)` o hacer que `getEntityTier()` contemple `featured=true`.
- Actualizar `report/route.ts` a `entity_type/entity_slug`.
- Revalidar tambien `/go/<slug>` al activar/cancelar.

### P0 — Unificar la fuente de remates distribuibles

Problema:

Los remates cargados por una consignataria en el dashboard se guardan en `consignataria_auctions` y el perfil los fusiona con los scrapeados, pero varias piezas comerciales leen solo `remates.json`: `/go/<slug>`, `/api/widget/<slug>`, `/api/calendario/<slug>`, `/remates` y newsletter semanal.

Impacto:

Una firma podria pagar, cargar su remate propio y verlo en su perfil, pero no verlo en la landing con QR, widget, calendario suscribible, calendario global o newsletter. Eso rompe la promesa "publica tu remate y lo distribuimos".

Accion:

- Extraer helper server `getMergedAuctionsForConsignataria(slug)` que combine `remates.json` + `consignataria_auctions`.
- Usarlo en perfil, `/go`, widget, iCal y reportes.
- Definir si `/remates` global y newsletter consumen DB en runtime o si hay un job que materializa owner-remates al dataset.
- Agregar un indicador en dashboard: "visible en perfil / visible en landing / visible en newsletter" para evitar ambiguedad operativa.

### P0 — Reporte mensual comercial

Problema:

El reporte actual no responde "que recibi por pagar".

Accion:

Crear un reporte mensual por slug con:

- Vistas de perfil.
- Clicks WhatsApp.
- Leads capturados.
- Seguidores.
- Marcas/watchlist de remates.
- Remates publicados.
- Envios de newsletter/recordatorios atribuibles.
- Top remate por interes.
- Comparacion vs mes anterior.
- Link a dashboard y proximo paso.

Puede empezar manual con SQL + template email. No hace falta dashboard sofisticado para vender los primeros 10.

### P0 — Distribucion auditable

Problema:

La promesa "+500 productores" no esta instrumentada como campana por remate.

Accion:

Agregar tabla/logica minima:

- `promotion_campaigns`: slug, remate_id, channel, sent_count, opened_count si existe, clicked_count si existe, created_at.
- Registrar cuando un remate PRO entra en weekly/reminders.
- Agregar UTM por slug/remate.

### P1 — Captura de lead en perfil principal

Problema:

El perfil publico principal registra click de WhatsApp pero no captura datos personales.

Accion:

- Usar `SmartWhatsAppCTA` tambien en perfil para firmas PRO.
- Dejar "saltar e ir a WhatsApp" para no matar conversion.
- Etiquetar el lead source como `profile_whatsapp_modal`.

### P1 — Bandeja de leads minima

Problema:

La bandeja muestra leads, pero no permite gestion.

Accion:

- Estado: nuevo/contactado/descartado.
- Nota interna.
- Export CSV.
- Filtro por source/remate.

### P1 — Copy consistente

Problemas:

- "badge dorado" vs badge sky.
- "Probar gratis" en landing vs checkout pago.
- "cada remate llega a +500 productores" sin contador dinamico.

Accion:

- Cambiar a "badge PRO".
- Cambiar "Probar gratis" por "Activar PRO" o "Solicitar piloto".
- Mostrar "base newsletter activa" solo si viene de DB real o decir "base de productores suscriptos".

## 8. Roadmap recomendado

### 0-14 dias

Objetivo: poder vender sin prometer de mas.

- Unificar fuente PRO.
- Unificar fuente de remates distribuibles entre perfil, `/go`, widget, iCal y reportes.
- Revalidar `/go`.
- Arreglar `report/route.ts`.
- Crear reporte mensual manual.
- Revisar copy de precio/badge/+500.
- Usar lead modal PRO en perfil principal.
- Armar one-pager comercial y lista de 20 prospects.

Criterio de avance:

- Una firma paga y ve su badge/landing/dashboard correctamente en todas las superficies.
- Se puede generar un reporte mensual aunque sea manual.

### 15-45 dias

Objetivo: 5 pilotos pagos.

- Onboarding asistido de 5 consignatarias.
- Cargar logo/contacto/remates.
- Enviar 1 reporte por piloto.
- Medir: vistas, clicks, leads, remates distribuidos.
- Registrar objeciones de venta.

Criterio de avance:

- 3 de 5 pilotos quieren seguir luego del primer mes o aceptan trimestre.
- Al menos 2 usan la landing/QR o cargan remates propios.

### 46-90 dias

Objetivo: volverlo repetible.

- Campanas por remate con log.
- Reporte automatizado.
- Estado/export de leads.
- Casos de uso con screenshots reales.
- Subir precio nuevo a ARS 75.000/mes para nuevas altas.

Criterio de avance:

- 10 clientes pagos o pipeline verificable de 25 conversaciones calificadas.
- Churn de piloto menor a 30% luego del primer ciclo.

## 9. Riesgos

| Riesgo | Probabilidad | Impacto | Indicador temprano | Mitigacion |
|---|---:|---:|---|---|
| La consignataria no percibe ROI | Alta | Alta | Mira dashboard pero no renueva | Reporte mensual con acciones concretas y comparacion mes a mes. |
| Se promete distribucion no auditable | Alta | Alta | Preguntan "a cuantos llego mi remate?" | Log de campana por remate antes de escalar. |
| Baja captura de leads identificables | Media | Alta | Muchos WhatsApp clicks, pocos leads | Modal opcional PRO en perfil y landing. |
| Confusion FREE/verificado/PRO | Media | Media | Reclamos por "ya verifique, por que pagar?" | Separar copy: verificado = identidad; PRO = alcance + medicion. |
| Cache muestra PRO tarde | Media | Media | Cliente paga y no ve cambios | Revalidar perfil, directorio, `/go`, featured endpoint. |
| Precio demasiado bajo queda anclado | Media | Media | Clientes nuevos piden fundador meses despues | Limitar fundador por cantidad y fecha. |
| Consignatarias ven comparacion como amenaza | Media | Alta | Rechazo a ranking o reputacion | Vender "perfil y alcance", no ranking agresivo. |
| Datos de remates incompletos | Media | Media | Remates no aparecen o aparecen tarde | Carga propia desde dashboard + asistencia de onboarding. |

## 10. Recomendacion inequivoca

**Que debe ser ahora:**  
Una herramienta B2B liviana para que las consignatarias tengan presencia verificada, remates distribuibles y medicion comercial.

**Que no debe intentar ser todavia:**  
Un marketplace transaccional, un CRM completo, un ranking definitivo de consignatarias o una garantia de venta de hacienda.

**Quien debe pagar:**  
Consignatarias regionales activas y digitalmente subatendidas. Luego, consignatarias grandes para add-ons/campanas especiales.

**Por que pagaria:**  
Porque necesita que sus remates se encuentren fuera de su red historica de WhatsApp/telefono, y porque recibe datos concretos de interes: vistas, clicks, seguidores y consultas.

**Primer producto pago:**  
PRO Fundador 90 dias.

**Precio ahora:**  
ARS 45.000/mes o ARS 120.000 por 90 dias prepago para las primeras 10.

**Precio objetivo despues de hardening:**  
ARS 75.000/mes o ARS 200.000/trimestre.

**Que vender en los proximos 90 dias:**  
No vender "software". Vender "tu proximo remate con landing, QR, destaque, distribucion y reporte".

**Hipotesis que podria invalidar el negocio:**  
Que aun viendo metricas claras de vistas/clicks/leads, las consignatarias no asignen presupuesto mensual porque perciben que su red personal y WhatsApp ya resuelven suficiente.

**Ventaja competitiva a construir en 3 anos:**  
Historico propio y confiable de actividad por consignataria/remate: calendario, resultados, demanda observada, clicks, seguidores y distribucion. No scraping bruto; datos de interaccion y performance que solo la plataforma ve.

## 11. Matriz de hallazgos: motivo e impacto de negocio

Esta matriz traduce cada hallazgo tecnico a una consecuencia comercial simple. La regla usada para priorizar: si el cliente paga y no puede ver, medir o explicar el beneficio, el riesgo es alto aunque la feature "exista" en codigo.

| Hallazgo | Motivo tecnico | Que significa para el negocio si no se arregla | Severidad |
|---|---|---|---|
| PRO tiene fuentes de verdad distintas | `getFeaturedSlugs()` usa `featured=true` + subscriptions; `getEntityTier()` solo subscriptions. | Una consignataria puede pagar o estar bonificada y verse PRO en un lugar pero FREE en otro. Eso rompe confianza en el primer dia de venta. | Alta |
| Perfil PRO se revalida, `/go` no | Webhook Rebill revalida `/consignatarias/<slug>`, pero no la landing `/go/<slug>`. | El cliente paga, escanea su QR o abre su landing y no ve el beneficio. Es una falla visible para quien acaba de pagar. | Alta |
| Remates propios no alimentan todo | `consignataria_auctions` se fusiona en el perfil, pero `/go`, widget, iCal, `/remates` y newsletter leen mayormente `remates.json`. | La promesa "carga tu remate y lo distribuimos" puede fallar. El cliente carga un remate y no aparece en los canales que le vendimos. | Critica |
| Destaque en `/remates` es solo visual | `RematesClient` agrega `featured` client-side; el orden sigue por fecha/hora. | Si ventas promete "prioridad en calendario", el producto no lo cumple. Hay que vender "destaque visual", no posicion garantizada. | Media |
| "+500 productores" no es auditable por campana | `newsletterSubscribers` esta hardcodeado; newsletter devuelve metadata interna pero no reporte por slug/remate. | La consignataria pregunta "a cuantos llego mi remate?" y no hay respuesta defendible. Dificulta renovacion. | Alta |
| Recordatorios no son exclusivos PRO | `remate-reminders` puede operar abierto a opt-ins de cualquier firma segun config. | No se puede vender como canal exclusivo PRO. Se debe vender como inclusion preferente hasta que haya reglas por plan. | Media |
| Lead de WhatsApp no siempre es lead identificable | Perfil principal registra click, pero no captura nombre/telefono/email; `/go` PRO si puede usar modal. | El dashboard puede mostrar interes, pero no "quien fue". La consignataria no puede accionar muchos leads. | Alta |
| `source` de leads es grueso | `source` distingue `profile`, `go_landing`, `remate`, pero no campana, newsletter, QR, remate concreto en todos los casos. | No se puede atribuir ROI: no sabemos que canal/remate genero el lead. | Alta |
| Bandeja de leads es lectura, no gestion | Dashboard lista leads y botones WhatsApp/email, pero no estado, notas, responsable ni export. | La firma lo mira una vez, pero no lo incorpora a su rutina comercial. Menor retencion. | Media |
| Reporte PDF no es reporte de ROI | PDF resume agenda/perfil; mensual solo manda vistas. | El cliente percibe que pago por badge, no por resultados. Churn alto despues del primer mes. | Alta |
| `report/route.ts` usa columna vieja | Chequea `subscriptions.consignataria_slug`, pero el esquema vigente usa `entity_type/entity_slug`. | Reporte puede no reconocer PRO. Un beneficio pago puede verse degradado por un bug de esquema. | Alta |
| Copy promete mas que el producto | "badge dorado", "probar gratis", "cada remate llega a +500" no esta alineado 1:1 con UI/datos. | Objeciones comerciales y perdida de confianza. La primera venta depende mucho de credibilidad. | Media |

## 12. Patrones de busqueda para encontrar problemas similares

Use esta simplificacion para orientar un subagente de busqueda sobre el repo:

1. **Dato capturado pero no accionable:** tablas/eventos que guardan algo, pero el dashboard no lo expone o no permite operar sobre eso.
2. **Evento medido pero no identificable:** clicks o vistas que prueban interes, pero no dejan nombre, telefono, email o remate asociado.
3. **Promesa comercial sin log:** copy que promete distribucion, prioridad, base de destinatarios o analytics sin una tabla/reporte que lo respalde.
4. **Fuentes de verdad duplicadas:** helpers distintos para PRO, claims, remates, leads o suscripciones.
5. **Superficie estatica con estado comercial dinamico:** paginas/cache que muestran PRO, remates o contacto pero no se revalidan al cambiar el estado.
6. **Feature de owner que no llega al publico:** datos que el owner carga y solo aparecen en dashboard/perfil, pero no en landing, widget, calendario, newsletter o reporte.
7. **Metricas internas sin version cliente:** cron/admin/logs que miden algo pero no se convierten en reporte visible para la consignataria.
8. **Attribution incompleta:** `source` demasiado generico para probar que un canal vendible produjo un lead.

## 13. Como se ve hoy el dashboard de una consignataria

Lectura desde codigo, no desde una sesion productiva en vivo.

Ruta principal: `/dashboard`. Si el usuario tiene una consignataria reclamada (`claimed_by_email = user.email`), ve el dashboard B2B. Si no tiene claim ni empresa, cae al dashboard de productor.

### Estructura visual

El dashboard es una UI oscura tipo "terminal", con ancho contenido (`max-w-3xl`), paneles rectangulares y navegacion por tabs.

Header:

- Email del usuario.
- Nombre de la consignataria.
- Link "Ver perfil publico".
- Badge `VERIFICADA` si corresponde.
- Badge `PRO`/`ENTERPRISE` si hay subscription o upgrade confirmado.

Tabs visibles para consignataria verificada:

1. `Resumen`.
2. `Leads (N)`.
3. `Remates (N)`.
4. `Editar`.
5. `Resultados`.
6. `Mi plan`.

### Resumen

El resumen muestra:

- Bienvenida con vistas ultimos 30 dias.
- Pulso de mercado (`MagPulse`).
- Panel de inteligencia de mercado (`MarketIntelPanel`).
- Checklist si faltan datos de perfil.
- Tracker de puntos para canjear PRO si esta en free.
- Panel **"Tu impacto — ultimos 30 dias"** con:
  - productores que siguen la firma,
  - marcas en remates,
  - vistas del perfil,
  - clicks de WhatsApp,
  - leads capturados,
  - ranking provincial.
- Alerta si hay clicks de WhatsApp pero cero leads: "no tenes forma de saber quienes son".
- Senal de demanda: productores pendientes de los remates.
- CTA a PRO si esta free.
- Acciones rapidas: agregar remate, editar perfil, cargar resultados, guias DTe.
- QR y link `/go/<slug>`.
- Widget para web, solo PRO.
- Lista de proximos remates scrapeados.

### Leads

La tab `Leads` muestra:

- Titulo "Leads · quien te busco".
- Empty state si no hay leads.
- Lista de ultimos leads con nombre, fecha, telefono, email, source y mensaje.
- Botones para abrir WhatsApp o email.

Lo que no tiene todavia:

- Cambiar estado del lead.
- Asignar responsable.
- Agregar notas.
- Exportar CSV.
- Ver historial de contacto.
- Agrupar por remate/campana.
- Diferenciar "click anonimo de WhatsApp" de "lead identificable".

Traduccion de negocio: el dashboard ya muestra interes comercial, pero todavia no es un mini-CRM. Sirve para vender un piloto y demostrar demanda; no alcanza para prometer "gestion comercial completa".

### Remates

La tab `Remates` permite:

- Crear remate propio.
- Editar o eliminar remates propios.
- Ver remates automaticos del calendario.
- Compartir por WhatsApp.
- Cargar titulo, fecha, hora, ubicacion, provincia, tipo, categoria, cabezas, catalogo, YouTube y descripcion.

Limitacion de negocio: la carga propia es valiosa, pero debe propagarse a `/go`, widget, iCal, calendario global, newsletter y reporte. Si queda solo en dashboard/perfil, se convierte en una herramienta administrativa incompleta.

### Editar

Permite editar:

- Telefono.
- Email.
- Sitio web.
- WhatsApp.
- CUIT.
- Descripcion.
- Logo.

Valor: resuelve verificacion y presencia basica.

### Resultados

Permite ver resultados cargados y linkear a carga de resultado nuevo.

Valor potencial: si se completa, alimenta reputacion, precios observados y reporte. Hoy todavia parece mas una promesa de futuro que un loop comercial central.

### Mi plan

Muestra:

- Plan actual.
- Estado de subscription.
- Vencimiento.
- Cancelacion.
- CTA a PRO si free.
- Scarcity de lugares fundador.

Riesgo: copy sigue diciendo "cada remate tuyo -> +500 productores" y "badge dorado"; ambos deben alinearse con producto medible.

## 14. Hallazgos adicionales de busqueda local

Estos salieron de una busqueda local antes de recibir el resultado del subagente.

| Hallazgo adicional | Motivo tecnico | Que significa para el negocio si no se arregla | Severidad |
|---|---|---|---|
| `source` de leads acepta solo 3 valores | `/api/leads` valida `source` como `profile`, `go_landing`, `remate`. | No se puede saber si un lead vino de QR, newsletter, widget, reminder, remate especial o campana. ROI pobre. | Alta |
| WhatsApp FAB usa `source='fab'`, pero `/api/leads` no lo acepta | El FAB solo trackea click en `/api/track/whatsapp`; si se quisiera capturar lead desde ese origen, el schema lo rechazaria. | Los canales de contacto quedan fragmentados: clicks anonimos por un lado, leads identificables por otro. | Media |
| No hay endpoint de actualizacion de lead | Solo existe `POST /api/leads`; dashboard lee `status`, pero no hay PATCH visible para cambiarlo. | `status` queda como dato muerto. La consignataria no puede gestionar pipeline. | Alta |
| Dashboard muestra ultimos 50 leads sin paginacion | Query `.limit(50)` y UI lista directa. | En un cliente activo, los leads viejos desaparecen de la vista operativa. Malo para seguimiento. | Media |
| Muchas superficies importan `remates.json` directo | Home, `/go`, iCal, widget, newsletters, MCP, calendario global, sitemap y varias vistas usan el JSON estatico. | Cualquier remate cargado por owner corre riesgo de no estar en la experiencia publica completa. | Alta |
| Reporte de dashboard es 30 dias fijos | `dashboard/page.tsx` cuenta vistas/clicks/leads con `thirtyDaysAgo`. | Sirve para snapshot, pero no para reporte mensual cerrado ni comparacion contra periodo anterior. | Media |
| Leads y WhatsApp no comparten entidad de funnel | `whatsapp_clicks` no tiene lead_id ni identidad; `consignataria_leads` no referencia click previo. | No se puede medir conversion click -> lead ni recuperar usuarios que saltaron el modal. | Alta |

## 15. Resultado del subagente de busqueda

Se lanzo un subagente explorador sobre el codebase con la simplificacion de la seccion 12. No edito archivos. Su salida refuerza los hallazgos centrales y agrega riesgos puntuales sobre lead tracking, atribucion y dashboard.

### Hallazgos confirmados

| Hallazgo confirmado | Motivo tecnico encontrado por el subagente | Significado de negocio | Severidad |
|---|---|---|---|
| Remates propios no propagan | Dashboard crea/lee `consignataria_auctions`; el perfil los fusiona, pero `/api/remates/proximos`, widget y PDF usan `remates.json`. | El cliente puede cargar un remate y no verlo en API, widget, PDF, calendario o newsletter. Rompe la promesa PRO. | Alta |
| Bandeja de leads sobrepromete identidad | `whatsapp_clicks` guarda solo slug, fecha y source; identidad viene solo de `consignataria_leads`. Dashboard habla de productores que "te contactaron" y empty state sugiere nombre/contacto. | Una firma puede esperar nombres luego de muchos clicks de WhatsApp, pero solo hay clicks anonimos salvo form enviado. | Alta |
| PDF usa query PRO vieja | Dashboard consulta subscriptions por `entity_type/entity_slug`; PDF consulta `consignataria_slug`. | Una firma paga puede recibir reporte sin branding/estado PRO correcto. | Alta |
| Ranking provincial ignora remates propios | Ranking del dashboard se calcula desde `rematesData`, no desde owner-remates. | Cargar remates en el producto no mejora el ranking que el propio producto muestra. | Media |
| Lead source es insuficiente | Leads: `profile | go_landing | remate`; WhatsApp tiene enum chico; existe attribution first-party en `visitors`, pero no se usa en dashboard. | El cliente no puede saber si el lead vino de QR, email, Google, IA, widget o remate. | Media/Alta |

### Hallazgos nuevos agregados

| Hallazgo nuevo | Motivo tecnico | Que significa para el negocio si no se arregla | Severidad |
|---|---|---|---|
| Contacto por telefono/email/web se mide pero no se muestra al cliente | En perfil se emiten eventos `contact_phone`, `contact_email`, `contact_web`, pero dashboard solo consulta `profile_views`, `whatsapp_clicks` y `consignataria_leads`. | Si una firma recibe llamadas, mails o clicks web, el dashboard subestima el valor real. La firma puede creer que PRO no genera demanda. | Media |
| Promesa de citas IA no aparece en dashboard | Marketing dice que PRO permite medir cuanto la citan las IAs, pero `/dashboard` no consulta `ai_referrals`, `visitors`, `ai_engine` ni citas por firma. | El argumento comercial IA puede generar churn si no se ve en el panel del cliente. | Media |
| Las metricas internas son mas ricas que las del cliente | Admin/live/visitor stats tienen fuentes, actividad y breakdowns que no se productizan para consignatarias. | El equipo puede probar valor internamente, pero el pagador no lo puede ver sin pedirlo. Menor retencion y ventas mas manuales. | Media |

### Recomendacion derivada del subagente

El dashboard de consignataria debe convertirse en un **embudo comercial visible**, no solo en un tablero de conteos:

1. Impresiones/vistas.
2. Interes anonimo: WhatsApp clicks, telefono, email, web, catalogo, YouTube.
3. Leads identificados: nombre, telefono/email, mensaje.
4. Origen: perfil, QR, `/go`, newsletter, reminder, remate, Google, IA, referido.
5. Remate asociado.
6. Estado comercial: nuevo, contactado, interesado, cerrado, descartado.
7. Reporte mensual que explique todo eso en una pagina.

Sin ese embudo, el producto puede mostrar actividad, pero no logra demostrar retorno economico de forma autoservicio.

## 16. Tercera tanda de busqueda de errores

Esta tanda repitio el proceso con dos fuentes: barrido local y subagente explorador. El criterio fue buscar errores que afecten directamente el producto vendible ahora: perfil verificado, remates destacados, distribucion, tracking de leads, dashboard y reporte.

### Hallazgos de tercera tanda

| Hallazgo | Motivo tecnico | Que significa para el negocio si no se arregla | Severidad | Arreglo sugerido |
|---|---|---|---|---|
| PDF de consignataria detecta mal PRO | `src/app/api/consignatarias/[slug]/report/route.ts` consulta `subscriptions.consignataria_slug`, pero el schema actual usa `entity_type` y `entity_slug`. | Una firma paga puede descargar un reporte sin branding/beneficio PRO. El producto que deberia justificar el pago parece roto. | Alta | Cambiar a `.eq('entity_type', 'consignataria').eq('entity_slug', canonical)` y testear con una sub activa. |
| CTA de venta promete prueba gratis, pero el checkout cobra | `PlanesToggle.tsx` dice `Proba gratis`, mientras `createConsignatariaSubscriptionLink` crea link recurrente de ARS 45.000/mes. No se ve trial tecnico. | El primer flujo de venta puede generar desconfianza, abandono o reclamo: se promete gratis y se cobra. | Alta | Implementar trial real o cambiar copy a `Activar PRO` / `Contratar PRO`. |
| Pricing estructurado habla en USD y la UI vende ARS | `planes/page.tsx` mantiene JSON-LD/FAQ con `priceCurrency: USD` y facturacion en USD, mientras la UI visible muestra ARS 45.000. | SEO, FAQ y checkout cuentan historias distintas. En B2B chico, esta friccion baja conversion. | Media | Unificar moneda y condicion comercial en UI, FAQ, schema y Rebill. |
| Galeria de videos PRO busca por columna vieja | `videos/route.ts` y `fetchConsignatariaVideos()` buscan `consignatarias.slug`; el schema expone `canonical_slug` y `id`. | Una funcion visual vendible puede devolver 404 o no mostrar videos en perfiles validos. | Alta | Resolver slug canonico y consultar por `canonical_slug`; usar `id` UUID para `consignataria_videos`. |
| Perfil y `/go` son estaticos, pero varios cambios no revalidan | Ambas paginas tienen `revalidate = false`. Rebill revalida solo `/consignatarias/[slug]` al activar; no revalida `/go/[slug]`. Rutas de remates manuales tampoco revalidan. | Un cliente paga, edita perfil o carga remate, pero la pagina compartida/QR puede seguir vieja. Parece que el producto no funciona. | Alta | Revalidar `/consignatarias/${slug}` y `/go/${slug}` en activacion, cancelacion, edicion de perfil y CRUD de remates. |
| Cancelacion PRO contradice el copy | Dashboard dice que el plan sigue activo hasta fin de periodo; `/api/subscriptions/cancel` marca `status='cancelled'` y apaga `featured=false` inmediatamente. | Riesgo de reclamo: el cliente paga el mes, cancela renovacion y pierde beneficios al instante. | Alta | Separar `cancel_at_period_end` de baja efectiva o hacer que `getEntityTier` honre `current_period_end` para entidades. |
| Canje por puntos activa subscripcion pero no actualiza todas las superficies | `/api/redeem-points` crea `subscriptions(active)` pero no setea `consignatarias.featured=true` ni revalida perfil/`/go`. | El cliente recibe mensaje de "mes PRO activo" pero puede no ver destaque inmediato. Malo para confianza en el onboarding. | Media/Alta | Setear estado visible de forma consistente y revalidar superficies publicas. |
| Vencimiento de PRO por puntos puede quedar activo | `getEntityTier()` y `getFeaturedSlugs()` miran `status='active'`; no validan `current_period_end`. En busqueda local no aparecio un cierre automatico de subscripciones vencidas de entidad. | Bonificaciones pueden seguir dando PRO despues del mes. Pierde control comercial y distorsiona cupos/escasez. | Media | Validar `current_period_end > now()` en helpers o crear cron de expiracion para `subscriptions`. |
| Captura de leads no cubre el contacto principal del perfil | En `ConsignatariaProfileClient.tsx` el WhatsApp principal va directo a `wa.me`; `SmartWhatsAppCTA` con modal se usa en `/go`. | El dashboard muestra clicks, pero muchos no se vuelven leads identificables. El cliente puede ver "0 leads" aunque haya demanda real. | Alta | Usar `SmartWhatsAppCTA` en el perfil para PRO/verificadas o ajustar la promesa: clicks anonimos vs leads identificados. |
| Eventos de telefono/email/web no se productizan en dashboard | El perfil emite `contact_phone`, `contact_email`, `contact_web`, pero dashboard solo muestra vistas, WhatsApp y leads. | Se subestima el ROI: una firma puede recibir llamadas o emails y no verlo en el reporte. | Media | Agregar "contactos anonimos" por canal y periodo, con comparacion mensual. |
| `remates/hoy` usa fecha UTC | La ruta dice Argentina timezone, pero calcula `todayStr` con `new Date().toISOString()`. Entre 21:00 y 23:59 ART ya es manana en UTC. | En horario de uso nocturno puede mostrar remates de manana como "hoy". Deteriora confianza en datos. | Media | Formatear fecha con `America/Argentina/Buenos_Aires` o reutilizar helper de la pagina. |
| `Mis reportes` y descarga directa tienen reglas opuestas | `/cuenta/reportes` exige PRO/Enterprise; la ruta de descarga dice que los reportes son gratis para cualquier cuenta logueada. | Funnel confuso: algunos usuarios pueden descargar por URL directa, pero no navegar la biblioteca. | Media | Decidir politica unica: gratis con login o premium, y aplicarla en pagina y API. |
| `Destacado del Mes` se mezcla con PRO destacado | `/api/featured/check` calcula top 10% por actividad desde `remates.json` + vistas; no incluye remates owner-created y usa naming cercano a `featured` pago. | Puede confundir merito editorial, actividad real y beneficio pago. Ademas ignora acciones del cliente dentro del producto. | Media | Renombrar a `actividad_del_mes`, incluir remates propios o separar claramente de PRO. |

### Prioridad operativa

1. **Antes de vender fuerte:** corregir copy de `Proba gratis`, moneda ARS/USD, query del PDF PRO y cancelacion hasta fin de periodo.
2. **Antes de prometer distribucion:** centralizar remates para que `consignataria_auctions` alimente perfil, `/go`, calendario, widget, APIs, newsletter y reportes.
3. **Antes de vender lead tracking:** llevar `SmartWhatsAppCTA` al perfil PRO, mostrar contactos anonimos por canal y crear gestion real de leads: status editable, notas, export, paginacion y origen granular.
4. **Antes de vender reporte mensual:** arreglar revalidacion, corte de periodo, fuentes de datos y branding PRO.

### Sintesis de negocio de la tercera tanda

El producto vendible existe, pero el riesgo ya no es "falta una feature": el riesgo es **prometer un sistema comercial integrado cuando el codebase todavia opera como piezas separadas**.

La venta deberia esperar a que el circuito minimo sea coherente:

1. La firma paga o activa PRO.
2. El perfil y `/go` se actualizan inmediatamente.
3. El remate cargado aparece en todas las superficies prometidas.
4. El contacto del productor queda medido como click anonimo o lead identificado, sin mezclar ambos.
5. El dashboard muestra el embudo completo.
6. El reporte PDF refleja el plan PRO y el periodo correcto.

Sin eso, el precio recomendado de ARS 45.000/mes sigue siendo defendible como posicionamiento, pero la entrega actual soporta mejor una venta piloto asistida que una suscripcion autoservicio masiva.
