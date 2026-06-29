# Remate en vivo — transcripción automática del cantaleo

Herramienta que transcribe el audio de un remate en vivo (YouTube) y publica un
**ticker preliminar** de precios por categoría en `/remates/en-vivo`.

> **Estado:** validado offline contra ground truth (JUA Mercedes 22/05/25): ~3% de error
> en categorías limpias, novillos flojo (ambigüedad gordo/invernada). El número se muestra
> SIEMPRE como **"lectura automática · preliminar"**, nunca como precio oficial.

## Arquitectura (dos piezas)

```
[WORKER off-Vercel]                          [SITIO en Vercel]
maquina/VPS persistente                       Next.js
  yt-dlp (live) -> ffmpeg chunks 30s     -->  /api/live-remate (no-store)
  faster-whisper (small, VAD)                   lee live_remate_* (Supabase)
  parser del cantaleo                       -->  <LiveRemateTicker> en /remates/en-vivo
  escribe a Supabase (service_role)             (se auto-oculta si no hay sesion activa)
```

El worker **no corre en Vercel** (serverless, sin proceso persistente). Corre en una
máquina con `yt-dlp`, `ffmpeg` y `faster-whisper`.

## Piezas en el repo
- `scripts/live-remate-worker.py` — el worker (captura → transcribe → parsea → emite).
- `supabase/migrations/20260629_live_remate.sql` — tablas `live_remate_session` + `live_remate_lot`.
- `src/lib/live-remate.ts` — lectura (sesión activa + lotes + promedios corrientes, soft-fail).
- `src/app/api/live-remate/route.ts` — endpoint de polling público.
- `src/components/LiveRemateTicker.tsx` — el ticker (polling 8s).

## Puesta en marcha
1. **Aplicar la migración** a Supabase (additiva, sin pérdida de datos):
   `supabase db push` (o vía dashboard/MCP).
2. **Deployar** el sitio (API + componente ya integrados en `/remates/en-vivo`).
3. **Correr el worker** cuando un remate arranca, en una máquina con las deps:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL=...        # mismo proyecto que el sitio
   export SUPABASE_SERVICE_ROLE_KEY=...
   python scripts/live-remate-worker.py \
     --url "<youtube live url>" \
     --session-id <remate-id-del-calendario> \
     --consignataria "UMC HV" --location "Villaguay, ER" \
     --inmag <INMAG-novillo-del-dia> \
     --model small
   ```
   La URL de vivo sale de la propia página `/remates/en-vivo` (`resolveYoutubeUrl` ya
   matchea el live del canal de la consignataria al remate).

   **`--inmag` (recomendado):** el precio del novillo de Cañuelas del día (de
   `mag_inmag_history`). Hace las bandas de plausibilidad DINÁMICAS (multiplos del INMAG)
   en vez de absolutas — así el worker generaliza a cualquier firma/fecha/inflación, no
   solo al rango de JUA-mayo-2025. Sin el flag, usa bandas absolutas calibradas a ese rango.

## Modo test (sin Supabase, sobre un VOD)
```bash
python scripts/live-remate-worker.py --file remate.mp3 --session-id test --no-supabase
# escribe live_state.json con lotes + promedios
```

## Operación
- El ticker aparece solo cuando hay sesión `status='live'` y `last_seen` < 3 min.
- Si el worker se cae, el sitio deja de mostrar el ticker (no queda fantasma).
- `--model small` da colchón de tiempo real (~0.4x); `medium` es más preciso pero spikea
  en chunks de silencio. El VAD saltea no-habla. Latencia: ~30-60s detrás del vivo.

## Límites honestos (declarar al usuario)
- Precio **preliminar**, no oficial.
- Novillos: ambigüedad gordo/invernada → error alto; las demás categorías ~3%.
- Sin ground truth en vivo para calibrar.
- Pantalla (Rosgan) NO sirve para este pipeline (no hay cantaleo → datos en pantalla, OCR aparte).
