# DRAFT — Captura de resultados de remate con AI (parked 2026-06-08)

> Estado: **EN DRAFT, no priorizado.** Idea capturada para retomar. No construir todavía.

## Problema (verificado 2026-06-08)
- `auction_results` está **vacía (0 filas)**. El dark pool (invernada/vientres/cría) no se captura.
- El cron `post-remate-outreach` **sí envía**: 61 correos a consignatarias (19/03→04/06) → **0 resultados**.
- **Dos fallas:**
  - **(A) Nadie responde** — pedido de alta fricción, sin incentivo, a inboxes `info@`.
  - **(B) No hay pipeline de ingesta** — no existe handler de inbound; aunque respondan, la data llega como texto libre / PDF / foto de planilla / captura WhatsApp / Excel y nadie la estructura.
- Señal de demanda real: el cliente API **Martín Apesteguía** saca invernada/vientres de **Rosgan** porque nosotros no lo tenemos (ver [[martin-apesteguia-api-cliente]]).

## Solución propuesta (cuando se retome)
Parser **multimodal con AI** (Claude visión): entra email + adjuntos (foto/PDF/Excel/texto) → salen filas `{categoría, peso, $/kg, cabezas, fecha, remate}` → validación zod + dedup → `auction_results`, con **cola de revisión humana** para baja confianza.

```
reply consignatario → Resend Inbound / forward Hostinger → /api/inbound/remate-results
   → AI parse → zod → (confianza alta) auction_results | (baja) cola /admin
scraper de sitios/YouTube que YA publican resultados  → fuente complementaria sin pedir nada
```

**Insight clave:** el AI también arregla (A). El pedido pasa de *"respondé con todos tus resultados"* a *"mandá lo que tengas — foto de la planilla, PDF, lo que sea — nosotros lo cargamos"*. Baja la fricción que mata las respuestas.

**Por qué importa:** es el motor de la tesis del data layer (captura del 71-78% dark pool) y cubre la demanda de invernada/vientres vía API. No es lateral.

## Bloqueante para arrancar
No hay **muestras** de resultados (ni los consignatarios las pasan). Sin ejemplos reales no se puede entrenar/validar el parser. Retomar cuando aparezca material de muestra o se decida priorizar la adquisición.
