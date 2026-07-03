# Proyecto B — Motivos para quedarse (retención por audiencia)

> Fecha: 2026-07-03. Base: data de engagement GA4 (30d) + inventario de features + JTBD por audiencia.

## 1. Tesis

El sitio es hoy una **referencia de solo-lectura**: mirás un número (arrendamiento, INMAG, un precio) y te vas. La data lo prueba:

- `/mercado/arrendamiento` (entrada #1, 728 sesiones) → **57% bounce, 1,46 pág/sesión**.
- `/mercado/inmag` → **12 min de lectura** y se van (1,88 pág/sesión).
- Eventos de recurrencia en 30 días: `calendar_subscribe` **1**, `alert_subscribe` **4**, `newsletter_subscribe` **0**. Muertos.
- Usuarios recurrentes: **13%** de la base, pero duran **2×** y ven **2×** más páginas.

**La oportunidad no es construir de cero — la maquinaria de retención YA EXISTE** (mi-ganado, alertas de zona de venta, DTE, favoritos, iCal, watch-remate, dashboard de consignataria con analytics). Está **dispersa, casi sin uso y mal instrumentada** (ver Proyecto A). El proyecto es: **pasar de "referencia que consultás" a "espacio de trabajo donde vivís"** — activar, conectar y dar en cada pantalla un motivo para volver, más cerrar los huecos obvios.

Regla rectora: **cada lectura tiene que ofrecer una próxima acción** que (a) personaliza (guardá/trackeá), (b) suscribe (alerta/calendario/digest), o (c) para la consignataria, reclama/gestiona.

---

## 2. EL PRODUCTOR — ¿por qué se quedaría?

**Su negocio:** criar hacienda → decidir cuándo/dónde vender → vender al mejor precio y plazo. Preguntas recurrentes: *¿cuánto vale mi hacienda hoy? ¿conviene vender ahora? ¿a qué precio y a quién? ¿cuándo hay remate de lo mío? avisame cuando…*

**Por qué VUELVE (los 3 hooks reales):**
1. **Sus datos viven acá.** Si "Mi Ganado" trackea el valor de su rodeo en el tiempo, vuelve a mirarlo/actualizarlo. Es un portfolio.
2. **Una alerta lo trae de vuelta** en el momento justo (zona de venta / precio objetivo / remate de su categoría cerca).
3. **La decisión es recurrente.** Vender hacienda es cíclico; si el sitio es *la herramienta* con la que decide, vuelve cada ciclo.

**Cosas para HACER (existen hoy — hay que activarlas):**
- Trackear **Mi Ganado** (`/mi-ganado`, persiste con login) — el mejor hook, casi sin uso.
- **Alerta zona de venta** (`SellZoneAlertSignup`, email-first, motor real) — la retención validada que dispara 4 veces en 30d.
- **¿Vendo ahora?** + **Calculadora** net-back.
- **Seguir consignatarias** (`FollowButton`) por plazo de cobro; **watch remate** (avisame antes de que empiece).
- **Suscribir el calendario iCal** de su categoría/zona (`/api/calendario/ical` — evento de mayor peso, w12).
- **DTE con OCR** (`/dte`, persiste) — lock-in por dato propio.

**Huecos (cosas que un productor querría HACER y no puede):**
1. **No hay panel unificado del productor.** Las herramientas están dispersas; `/dashboard` es del *dueño de firma*. → Falta **"Mi Panel"**: rodeo + alertas + remates seguidos + DTEs + firmas seguidas en un lugar.
2. **No hay alerta por precio objetivo** ("avisame cuando el novillo pase $X"). Solo existe zona-de-venta (percentil). Es lo primero que pide un productor.
3. **Las calculadoras no guardan nada** (efímeras): sin historial de escenarios ni "guardá esta tropa".
4. **No se cierra el loop de venta.** Mi Ganado valúa, pero no registra la consignación real (a qué firma vendí, precio logrado, rinde, si cobré). Falta valor estimado → venta → P&L.
5. **Búsquedas de remates no persisten.** Se filtra pero no se guarda "mis búsquedas" ni alerta cuando aparece un match (existe vía webhooks B2B, no como UI de productor).

---

## 3. LA CONSIGNATARIA — ¿por qué se quedaría?

**Su negocio:** captar consigners (productores) y compradores a sus remates; construir reputación; llenar remates. Preguntas recurrentes: *¿me están encontrando? ¿quién me buscó / me quiere contactar? ¿cómo promociono mi próximo remate? ¿cómo me comparo con la competencia?*

**Por qué VUELVE (el hook killer = negocio, no lectura):**
1. **Sus leads viven acá.** Si el sitio captura leads (`whatsapp_lead`, `ContactlessLeadForm`, clics de WhatsApp) y le muestra *"3 productores te buscaron esta semana"*, vuelve a revisarlos/responder. **Este es el hook de pago.**
2. **Su analytics.** *"tu perfil tuvo X vistas, Y clics de WhatsApp, sos #3 en Entre Ríos"* → lo chequea semanal, como su perfil de Google Business.
3. **Gestiona sus remates acá** (publica, sube resultados) → vuelve cada ciclo de remate.

**Cosas para HACER (existen — el dashboard ya es potente):**
- **Reclamar + gestionar perfil** (`/dashboard`, editar datos/logo/medios de pago).
- **Publicar/gestionar remates propios** (`consignataria_auctions`, owner-only) y **subir videos**.
- **Cargar resultados** (precios observados) → alimenta su reputación de dato + SEO.
- **Analytics de perfil**: vistas, clics WhatsApp, leads, watchers, **ranking provincial**, "Top X% del país".
- **Activar PRO** (badge + destaque + delivery de leads).

**Huecos (lo que falta para que sea un producto que se paga):**
1. **Leads sin CRM.** El panel cuenta `leadsCount` y hasta marca el "wow moment" (*"tenés clics de WhatsApp pero no sabés quiénes son"*) — pero no hay **bandeja de leads** con nombre, estado, seguimiento ni export. La captura existe (`consignataria_leads`); falta la gestión. **Este es el gap #1.**
2. **Sin responder in-platform.** No se puede contestar un lead ni una reseña desde el sitio; todo deriva a WhatsApp externo. Falta **responder reseñas** (defensa reputacional).
3. **Publicar remate exige reclamar primero** (gateado por aprobación admin). Sin camino self-serve rápido.
4. **Sin compra self-serve de destaque.** Existe `featured` pero no un flujo donde la firma compre placement.
5. **Sin campañas propias.** El blast "El Corredor" a +500 productores lo ejecuta la plataforma (cron), no la firma.
6. **Benchmarking limitado.** Da percentil/ranking, pero no comparación vs. competidores nombrados ni evolución de su propio funnel (vistas→clics→leads en el tiempo).

---

## 4. Motivos para quedarse EN TODOS LADOS (matriz por página)

Cada página de alto tráfico/dwell recibe una próxima acción. Prioridad por volumen × fuga actual:

| Página | Qué pasa hoy | Motivo para quedarse a agregar |
|---|---|---|
| `/mercado/arrendamiento` (entrada #1, 57% bounce) | leen y se van | **"Guardá el valor de tu campo y recibí el arrendamiento actualizado cada mes"** (email/alerta) + "Calculá cuánto te queda si vendés →" |
| `/mercado/inmag` (12 min, se van) | lectura profunda, sin acción | **"Seguí el INMAG: recibí el cierre semanal"** + "¿Estás en zona de venta? →" |
| `/precios/*` | consulta puntual | **"Alertame cuando [categoría] llegue a $X"** (alerta objetivo) + "Encontrá tu consignataria" (ya agregado en `/precios`) |
| `/frigorificos/*` (11-15 min, muy sticky) | referencia | Productor: "Alertame cambios de faena" · Frigorífico: "¿Es tu planta? Reclamala" |
| Perfil de consignataria | lander frío mira y va (Lehmann 31s) | Productor: botón WhatsApp / "Pedí que te contacten" / "Seguí esta firma" (hechos) · Consignataria: "¿Es tu firma? Reclamala + mirá tu panel" |
| `/remates/*` (93% eng) | muy enganchado, sin captura | **"Suscribí este calendario"** / "Avisame antes del próximo remate" |
| `/calculadora`, `/mi-ganado` (90%+ eng, escondidas) | joyas ocultas | Surfacearlas desde las páginas de mercado de alto volumen |

---

## 5. Los dos productos-ancla (el motor de recurrencia)

Concentrar el esfuerzo en dos "workspaces", uno por audiencia:

### 5.1 "Mi Panel" del productor
Unificar lo disperso (mi-ganado + alertas + remates seguidos + DTEs + firmas seguidas) en un solo hub post-login, con un **feed personalizado** ("desde tu última visita: novillo +3%, 2 remates de invernada cerca tuyo, tu rodeo vale $X"). Convierte herramientas sueltas en una razón diaria/semanal para volver.

### 5.2 "Mi Panel" de la consignataria (el producto que se paga)
El dashboard ya tiene analytics; el salto es la **bandeja de leads** (quién te buscó, estado, responder) + **evolución del funnel** (vistas→clics→leads) + **benchmarking vs. competencia**. Ese es el valor por el que una firma paga PRO y entra cada semana.

---

## 6. Roadmap priorizado

**Fase 1 — Activar lo que existe (bajo esfuerzo, alto impacto):**
1. CTA de suscripción/recurrencia en las 4 páginas de alto-dwell (arrendamiento, inmag, frigoríficos, precios). *(Nota: requiere el Proyecto A para MEDIR si funciona — hoy `alert_create`/`newsletter_subscribe` no llegan al ledger.)*
2. Surfacear las joyas (`/calculadora`, `/mi-ganado`) desde las páginas de mercado.
3. Instrumentar bien los eventos de recurrencia (depende de Proyecto A §5).

**Fase 2 — Conectar (esfuerzo medio):**
4. "Mi Panel" del productor (unificar hubs existentes).
5. Bandeja de leads de la consignataria (gap #1, la captura ya existe).
6. Alerta por precio objetivo (productor) + guardar escenarios de calculadora.

**Fase 3 — Construir (esfuerzo alto, mayor lock-in):**
7. Cierre del loop de venta (P&L real) para el productor.
8. Responder reseñas + benchmarking del funnel para la consignataria.
9. Publicar remate self-serve sin fricción de claim; destaque self-serve.

**Métrica de éxito:** subir el % de usuarios recurrentes de 13% → 25%+, y despertar los eventos de recurrencia (`alert_create`, `calendar_subscribe`, `newsletter_subscribe`) de ~5/mes a cientos. Dependencia dura: sin el Proyecto A, no se puede medir nada de esto.
