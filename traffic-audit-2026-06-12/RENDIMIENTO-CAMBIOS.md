# Rendimiento de los últimos cambios (changelog × data diaria) — 2026-06-12

Profundización de [AUDIT.md](./AUDIT.md). Fuentes: GSC date×page (9.823 filas, 06/05–10/06),
GA4 eventos diarios (20/05–12/06), Supabase (signups/newsletter/profile_views por día).
Pull: `scripts/archive/audit-changes-2026-06-12.js`.

## 1. Scorecard: qué se shippeó vs qué movió la aguja

| Cambio (versión) | Fecha | Resultado medido | Veredicto |
|---|---|---|---|
| PRO merchandising (1.21) | 30/05 | prompt views suben, clicks siguen 0–1/día | ✗ |
| **Long-tail geo 78 págs + mesh provincias (1.22–1.25)** | 31/05 | clicks/día 23→64 **al día siguiente**; `precios/*` 0→10 clicks/día | ✓✓ |
| Conversion swarm: copy prompt + email-first checkout + Corredor inline (1.29.8–.12) | 04/06 | `form_submit` ≈ 0/día; newsletter ~1/día; `pro_prompt_click` sin cambio | ✗ |
| Build roto "nothing was deploying" (1.29.14→1.30.3) | 04/06 | ventana corta (mismo día); sin impacto visible en data | — |
| Honesty fix + basis estimado en `/precios/[cat]/[prov]` (1.30.9–.10) | 05/06 | `precios/*` decae 10/día → 0–4/día desde el 05/06 | ⚠ vigilar |
| **Geo CTR sprint — titles provincia (1.30.12)** | 08/06 | CTR `frig/[prov]` **1,44% → 2,58%** en 3 días; inmag 2,27→2,61% | ✓ |
| Suite PRO ProReveal (1.30.13) | 09/06 | `pro_prompt_view` récord (72–83/día), clicks **siguen 0–1/día** | ✗ |
| Rediseño landing "cinta viva" (1.30.16) | 09/06 | la home recibe **5–6 sesiones/día (~3% del tráfico)** — palanca ≈ 0 sobre el funnel | ∅ |
| Fuentes NEA (1.30.14) | 09/06 | `/remates/corrientes` ya convierte CTR 7,7% — refuerza un grupo que funciona | ✓ |

Señales no atribuidas a ningún release:
- **Ola de indexación fichas CUIT desde el 08/06**: impresiones totales 1.300→4.500/día; `frig/[cuit]` pasó de ~8 a **33–41 clicks/día** — hoy es el grupo #1 de clicks del sitio. CTR del grupo cayendo (1,94%→1,61%) por impresiones frescas en posiciones bajas.
- **`ai_referral` aparece desde el 05/06** (2–4/día) — primer fruto medible del trabajo GEO/citabilidad.
- **`profile_views` ×3**: ~10/día a fines de mayo → 25–40/día esta semana.

## 2. Diagnóstico profundo

**a) Los titles SÍ funcionan — para clicks. Pero los clicks no son el constraint.**
El sprint del 08/06 casi duplicó el CTR del grupo objetivo en 3 días. El patrón es consistente:
toda intervención SEO (31/05, 08/06) produce resultado medible en 24–72h. El motor de adquisición
responde; el problema vive después del click.

**b) Tres iteraciones del prompt PRO con elasticidad CERO = no es UI, ni copy, ni placement.**
30/05 (merch), 04/06 (copy swarm), 09/06 (ProReveal blur). La exposición escaló 10→50→80 views/día;
los clicks quedaron clavados en 0–1/día en las tres variantes. Cuando tres tratamientos distintos
no mueven nada, el problema es el **offer a esa audiencia en ese momento de confianza**, no el botón.

**c) La razón estructural: el sitio no tiene loop de retorno.**
`first_visit` 1.816 / usuarios totales 1.865 en 28d → **~97% del tráfico es nuevo cada mes**; nadie
vuelve identificado. Se le pide ARS 7.900/mes a un anónimo en su primera visita de 3 minutos.
Las queries son habituales ("inmag hoy", "precio novillo arrendamiento hoy") — el usuario tiene el
hábito, pero lo ejerce en Google, no en el sitio.

**d) El "middle" del funnel existe en el código pero está fragmentado y enterrado.**
En `/mercado/inmag` conviven TRES asks de email compitiendo, todos abajo del fold:
`CierreMensualSubscribe` (L246), `ElCorredorCTA` (L328), `ProUpgradePrompt` (L333) — cada uno con
una promesa distinta. Resultado real: ~1 alta de newsletter/día sobre ~100 sesiones/día (≈1%).

**e) Lo que crece y nadie está explotando:** el inventario B2B. 409 profile_views/28d, triplicándose,
ya registrados en tabla. El cron de outreach post-remate ya existe. Falta solo conectar "tu perfil
fue visto N veces" → claim/featured.

## 3. Plan revisado (reemplaza la sección 4 de AUDIT.md)

**Regla del plan: congelar lo que ya probó elasticidad cero.** Sin más iteraciones de prompt PRO,
home, ni superficies UI de conversión hasta que exista el escalón intermedio del funnel.

### Frente 1 — Construir el loop de retorno (el agujero estructural)
1. **UN solo ask, arriba del fold, en inmag + arrendamiento**: "El INMAG en tu mail/WhatsApp, todos
   los días" — fusionar los 3 asks fragmentados en uno. KPI: % captura sobre sesión orgánica
   (hoy ~1% enterrado; meta 3%+).
2. **Canal de WhatsApp "INMAG hoy"** (WhatsApp Channels, zero-build): audiencia rural + 53% de los
   clicks son mobile. Para este público el canal probablemente capture más que el email. El número
   del día ya se genera solo (cron 14:00). KPI: suscriptores del canal.
3. **Formalizar doctrina B**: gratis = el precio de hoy (web/mail/canal); PRO = monitoreo
   personalizado (alertas por umbral, tus categorías, seguimiento de remates). El prompt PRO se
   reescribe UNA vez más recién cuando exista este escalón — vendiendo monitoreo, no features.
   Al decidir, actualizar §8.2 del doc UADE.

### Frente 2 — Monetizar donde la data muestra señal
4. **PRO Consignataria sales-led con data real**: mail mensual automatizado a cada consignataria
   con "tu perfil fue visto N veces este mes" (profile_views ya lo registra; infra de outreach ya
   existe) + CTA reclamar perfil/featured. Es el único activo con curva creciente clara.
5. **Verificar el checkout Enterprise end-to-end** (estuvo roto "couldn't pay" hasta 1.30.2; el
   primer pago de prueba sigue pendiente — también lo pide el checklist UADE para el pitch).

### Frente 3 — SEO: consolidar la ola, no abrir frentes nuevos
6. **Aplicar la fórmula de titles probada a las 364 fichas CUIT de frigoríficos** — son HOY el grupo
   #1 de clicks, en plena ola de indexación con CTR diluyéndose; es el momento exacto de capturar
   posición. (Nombre + CUIT formateado + provincia + estado SENASA en title/H1.)
7. **Vigilar `precios/*`**: decayó de 10/día a ~0–4 desde el honesty fix del 05/06. Si en 7 días no
   se recupera, investigar si el cambio de copy/estimado afectó el ranking o fue decay de frescura.
8. GEO/citabilidad: continuar — `ai_referral` ya es un canal medible.

### Medición (sin esto el próximo audit vuelve a adivinar)
9. **Redefinir key events en GA4**: hoy "key events" mezcla profile_view/auction_click y no mide el
   funnel real. Marcar: newsletter_sub, signup, pro_prompt_click, api_key_created, payment.
   Una sola fuente de verdad del funnel por etapa.

### Qué NO hacer (evidencia en mano)
- Más redesigns de home (3% del tráfico aterriza ahí).
- Cuarta iteración del prompt PRO sin escalón intermedio.
- Más adquisición paga/nuevos frentes SEO: el orgánico se duplica solo cada mes.

---

## 4. Forensia `/precios`: la honestidad no bajó clics — bajó answer-eligibility (y el scoreboard estaba mal)

Pull dedicado: `scripts/archive/audit-precios-2026-06-12.js`. Ventanas: antes (22/05–04/06) vs después del honesty fix 1.30.9 (05/06–10/06).

**Qué pasó realmente (no es CTR, es impresiones con ranking intacto):**
- Impresiones `/precios` venían **subiendo** (105→193→224→181→176/día hasta el 04/06) y se **cortaron a la mitad** el 05/06 (→62/día). **La posición media no cayó — mejoró** (5,1–5,3 los últimos días). Caída de oferta de impresiones, no de ranking ni de clickability.
- Las queries que se evaporaron son exactamente las conversacionales/GEO: **impresiones GEO-intent 227 → 23**, queries distintas **111 → 22**. "cuánto sale una vaca en argentina 2026", "precio de hacienda en pie", "cuánto cuesta una vaca adulta" — todas desaparecen tras el fix. **Tu instinto era correcto.**

**Pero el matiz que cambia la decisión:** esas queries tenían **CTR ~0% desde siempre**. 227 impresiones de "cuánto sale una vaca" → **0 clics**, antes y después. Los 10 clics/día del 03–04/06 vinieron de queries anonimizadas (el sample visible es 362i de ~1.877i totales), no atribuibles a GEO. **Medir `/precios` por clics de GSC fue siempre el scoreboard equivocado** — el valor de la query conversacional no es el clic, es ser **la fuente que cita el snippet / la IA**. El payoff real es `ai_referral` (vivo desde el 05/06, 2–4/día), que GSC no cuenta.

**El fix fue correcto — la implementación perdió la respuesta.** La página hoy tiene cerebro partido: el H1 afirma el número **nacional** como "el precio en Formosa" (`Precio del ternero en Formosa hoy: $4.721/kg`) y el cuerpo lo desmiente con el estimado honesto en origen ($4.039/kg, −14%) **enterrado en panel ámbar + FAQ**. Google y los motores de IA premian **una** respuesta nítida y citable; el hedge volvió la página no-citable para la pregunta provincial **sin hacerla más honesta** — el número honesto ya está ahí, solo degradado a nota al pie.

**No hay conflicto valores-vs-GEO; hubo un bug de presentación.** La salida que satisface ambos: **hacer del estimado honesto la respuesta directa**, no el caveat. H1/snippet/FAQ#1 → "En Formosa el ternero ronda **~$4.039/kg estimado en origen** (−14% vs referencia nacional $4.721/kg)". Honesto (declara método + que es estimación, valor de marca #1 intacto) **y** crisp-quotable → recupera answer-eligibility para "precio ternero formosa" sin revertir el fix ni mentir.

**Acción (reemplaza el paso 7 de §3):** reescribir `/precios/[cat]/[prov]` para que el **estimado en origen lidere** el H1, la meta description y la respuesta del FAQ schema (el nacional pasa a contexto "referencia"). No revertir 1.30.9. **Medir por `ai_referral` + presencia en featured snippet, NO por clics GSC.** Esto es además material de tesis: ejemplo limpio de la tensión "no afirmar sin fuente" resuelta por diseño, no por sacrificio de tráfico — refuerza el pilar de citabilidad del doc UADE.
