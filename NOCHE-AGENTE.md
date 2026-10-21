# Noche del agente cerrador — 21-10-2026 (00:22 → 07:00)

Bitácora del loop de 30 min. Rama `feat/agente-v2` (worktree `~/consignatarias-agente-noche`). **Nada va a main ni a producción hasta que José lo revise.**

## Alcance acordado con José
- **Sí:** código, tests y build en la rama; generalizar el agente a otros tipos de lead; mejoras de priorización y seguimiento.
- **No:**
  - push a main, publicar o tocar env vars y claves;
  - mandar mensajes a personas o disparar `agente.yml`;
  - aplicar migraciones;
  - aflojar las reglas de envío: días hábiles de 8 a 19, máximo 20 contactos nuevos por día, nadie dos veces el mismo día, BAJA para siempre, contacto solo tras ACEPTO, sin acordar precio, comisión del 1% a cargo de quien recibe el contacto.

## Punto de partida (00:30)
- El agente está **encendido en producción**: `AGENTE_IMAP_PASSWORD` está cargada en Production y las corridas por Actions salen bien (última a las 00:21).
- En main, otra sesión ya hizo `/admin/agente` (e97cae02: comisión potencial, en juego y cerrada) y la v1.237.0 (demandas de compra como contraparte, corrida cada 10 min). **El tablero no se rehace acá:** a lo sumo se extiende. Así no se pisan.
- Leads en la base al 21-10 00:30:

  | intent | total | abiertos | en el agente |
  |---|---|---|---|
  | comprar | 11 | 11 | 10 |
  | vender | 20 | 15 | 12 |
  | arrendar_busco | 4 | 4 | **0** |
  | tasar | 6 | 6 | **0** |

  → Arrendamiento y tasación no los toca nadie. Ovejero (`src/lib/leads/ovejero.ts`) cruza arrendamientos con campos publicados, pero **no escribe a terceros**: prepara el mensaje y una persona aprieta enviar.

## Decisiones de José (21-10-2026, 00:45)
- **Comisión de arrendamiento:** el mercado cobra un mes de canon completo; nosotros ofrecemos **20% off → 0,8 de un mes de canon**. Está en `tipos.ts`: `MESES_CANON_REFERENCIA`, `DESCUENTO_ARRENDAMIENTO`, `comisionArrendamiento()` y `comisionArrendamientoMercado()` (esta última para mostrar el ahorro).
- **Presentación:** servicio cerrado, "llave en mano", con el software trabajando atrás.
- **Investigación encargada** (3 agentes en paralelo). Los informes caen en `docs/agente/`:
  - `investigacion-comisionista-hacienda.md`: cómo trabaja un consignatario/comisionista, RUCA y su límite sin matrícula, comisiones reales y proceso de venta directa.
  - `investigacion-inmobiliaria-rural.md`: comisiones de arrendamiento y venta, Ley 13.246, **matrícula de corredor** y datos que pide el inmobiliario.
  - `investigacion-cierre-broker.md`: cadencias de seguimiento, cómo cobrar sin que las partes cierren por fuera, pipeline ponderado para el tablero y cómo comunicar el servicio llave en mano sin engañar.
  → **La próxima vuelta del loop los lee y convierte sus "reglas accionables" en pasos de la lista.** Si un informe marca un riesgo legal (por ejemplo, que cobrar comisión de arrendamiento exige matrícula de corredor), se anota acá como bloqueo y NO se habilita el envío de ese tipo.

## ⚠️ BLOQUEO LEGAL — arrendamiento (01:00, informe `docs/agente/investigacion-inmobiliaria-rural.md`)
- **CCyC art. 1351:** "En las locaciones de inmuebles la intermediación solo podrá estar a cargo de un profesional matriculado".
- **Art. 1346:** sin habilitación no nace el derecho a la comisión.
- Además hay riesgo de ejercicio ilegal (CP art. 247; en 2025 imputaron a alguien en Villa María, Córdoba).
- Lo que sí tiene respaldo en fallos: **publicar y conectar** (modelo clasificado, cobrar por publicación o suscripción). Una comisión atada al cierre es corretaje.
- **0,8 de un mes de canon contra los aranceles legales:**
  - Buenos Aires (Ley 10.973 art. 54): 1–2% por parte sobre el total del contrato.
  - En un contrato de 3 años, 0,8 meses ≈ 2,2%: entra.
  - En 1 año ≈ 6,7%: pasa el máximo bonaerense (4%) y el 5% supletorio de Córdoba.
  - En un pastaje de 6 meses ≈ 13,3%.
  - Conclusión: "barato contra el mercado" solo vale en contratos largos.
- **En el código:** `TIPOS.arrendamiento.bloqueoLegal`. Con eso `enviaAContrapartes('arrendamiento')` = **false**. La comisión se sigue calculando para el tablero.
- **Opciones para José** (las del informe):
  - (a) un corredor matriculado por provincia cobra y factura, y consignatarias le cobra software o publicación;
  - (b) cobrar al que publica o busca por publicación o suscripción, sin comisión al cierre;
  - (c) consultarlo con un abogado antes de cualquier envío.
- Ajuste de la regla de comisión si se sigue: calcularla sobre el total del contrato con tope por provincia, no en meses fijos.

## ⚠️ RIESGO LEGAL — hacienda, el 1% que YA corre en producción (01:15, informe `docs/agente/investigacion-comisionista-hacienda.md`)
- **El RUCA ya no existe:** lo reemplazó el SIOCAL (Res. SAGyP 50/2025, anexo vigente en la Res. 103/2026).
- La inscripción es obligatoria para quien "intervenga en el comercio" de ganados. Sin inscripción: interdicción y sanciones (Leyes 21.453, 21.740 y 25.507).
- **No hay excepción para quien solo pone en contacto** en hacienda. La figura "vincular oferta y demanda" existe solo para granos (SISA).
- **El 1% puede no ser cobrable en juicio** si un juez lo ve como corretaje sin matrícula. Los fallos son inmobiliarios: aplicarlos a hacienda es una inferencia y hay que validarla con un abogado.
- **Encuadre sugerido:** cobrar la **venta del dato o del contacto**, pactada por escrito antes de pasar el contacto, en vez de una "comisión sobre el bruto". Avisar por escrito que no cobramos, no pagamos ni garantizamos el pago. Ningún interés propio en un lote (CCyC art. 1348). Verificar que el comprador esté en el SIOCAL y que el RENSPA sea válido.
- **Contexto de mercado** (cifras viejas, 2004 y 2018): el consignatario cobra 2-5% al vendedor, más un fondo de garantía. En venta directa a faena el comprador hoy no paga comisión, y nuestro 1% le cae a él.
- **NO se tocó producción** (fuera del alcance de la noche). En la rama, hacienda sigue saliendo. **Decide José, idealmente con un abogado, antes de las 8, que es cuando el agente vuelve a escribir.**

## Pendiente de José
- **Quién paga la comisión de arrendamiento:** el arrendatario, el arrendador o los dos. Supuesto provisorio, por analogía con hacienda: quien recibe el contacto. Confirmar.
- **Comisión de venta de campo:** sin definir (sigue apagada).

## Hueco de negocio (decide José) — RESUELTO PARCIAL
La comisión del 1% está definida **solo para hacienda**. Para arrendamiento y venta de campo no hay porcentaje, ni base, ni quién paga. No lo invento. En el código esos tipos tienen `comisionPct: null`, y `enviaAContrapartes()` da false mientras esté así: se calculan y se muestran, pero no salen.

## Iteraciones
### #1 — 00:40
- `src/lib/agente/tipos.ts` + `tipos.test.ts` (12 tests).
  - Es el registro de tipos de operación: hacienda, arrendamiento, campo y tasación.
  - Define, para cada tipo, los datos mínimos, las contrapartes, la comisión (solo hacienda = 1%) y el primer paso.
  - `valuarLead()` calcula el bruto de referencia (para arrendamiento, el canon anual = ha × kg/ha/mes × 12 × precio del novillo) y la comisión, solo si José la definió.
  - `prioridad()` = comisión × peso del estado, para ordenar qué caso mover primero.
- Todavía no está conectado al motor: es la base pura.

### #1b — 00:55 (incidente, corregido)
- `~/consignatarias-agente` **ya existía**: es el worktree de OTRA sesión que trabaja el mismo agente esta noche, en la rama `feat/cerrador-v2` (commits de 00:30 a 00:38: demandas de compra, recordatorio a la contraparte, el interruptor `AGENTE_FIRMAS`, el tablero). El commit #1 cayó en su rama.
- Lo moví a `feat/agente-v2` y devolví `feat/cerrador-v2` a su commit (`c9272144`, con `reset --keep`). No tenía cambios sin commitear y no se pisó nada suyo. No se había subido nada.
- Desde ahora el loop trabaja en `~/consignatarias-agente-noche`. En cada vuelta integra `origin/feat/cerrador-v2` y toca lo mínimo de sus archivos.

### #2 — 00:48
- Arrendamiento ahora tiene comisión: 0,8 de un mes de canon. `enviaAContrapartes('arrendamiento')` = true **en la rama**, sin publicar. 14 tests.

### #3 — 01:20
- **Sync:** la otra sesión pasó `feat/cerrador-v2` a main como v1.237.0 (#71) y siguió en `feat/conversion-leads`. Mergeé `origin/main` en `feat/agente-v2` sin conflictos. Ya no hay que integrar `cerrador-v2`.
- `src/lib/agente/mensajes-tipos.ts` + tests (9):
  - `pedirDatosCampo`: arrendamiento y campo; pide ha, aptitud, zona y plazo.
  - `calificarTasacion`: "¿vender, arrendar o solo saber cuánto vale?" + link a `/campos/valor-hectarea`. `leerIntencionCampo` lee la respuesta.
  - `primerCorreo(tipo, lead)`.
  - `CADENCIA_CONTRAPARTE_DIAS = [0,3,7,14]` y `tocaSeguimiento()`: 1 inicial + 3 seguimientos en 14 días, según el informe de cierre.
  - `PIE_COMERCIAL` / `conPieComercial()`: Ley 25.326 art. 27, baja visible y aviso de comunicación comercial.
- Estos correos van **solo al lead que nos escribió**. No hay plantilla de oferta a contrapartes para estos tipos (bloqueo legal o sin comisión).
- Check 718 tests OK, build OK.
- **Para José:** la plantilla `oferta()` de hacienda que está en producción tiene BAJA, pero **no tiene la leyenda de "comunicación comercial"** (Disp. 4/2009). Sumarla es cambiar un texto que ya sale: va en el informe como recomendación y no lo toqué.

### #4 — 01:50
- `src/lib/agente/cola.ts` + tests (4): `ordenarCola()` ordena por prioridad = comisión estimada × peso de la etapa; a igual prioridad, el más vencido.
- `motor.ts`: **un solo cambio**, el `for` de la corrida recorre `ordenarCola(aMirar, comisionEstimada)`. El tope de 20 contactos nuevos por día va primero a los casos que más pueden dejar. No cambia qué se hace con cada caso ni ninguna regla de envío.
- Check 722 tests OK, build OK.

## Próximos pasos
0. (los 3 informes llegaron ✅) Leer los 3 informes de `docs/agente/` y bajar sus reglas a esta lista. Riesgos legales → bloqueos.
1. Usar `tipoDeIntent` en el motor (`motor.ts` ~l.487) para que tome arrendamiento y tasación con su primer paso. Los tipos sin comisión quedan en "calificar o pedir datos" **solo hacia el propio lead** (el que nos escribió), nunca a contrapartes. Ojo: escribirle al lead que nos escribió también es mandar un mail → queda detrás del mismo encendido, y se deja listo para que José lo prenda.
2. ✅ (#3) Plantillas por tipo en un archivo nuevo `mensajes-tipos.ts`:
   - arrendamiento: pedir ha, aptitud, zona y fecha; la oferta a la contraparte explica el servicio llave en mano, "0,8 de un mes de canon contra el mes completo del mercado" y que la aceptación es por escrito;
   - tasación: "¿querés venderlo o arrendarlo?".
3. ✅ (#4) Ordenar la cola del motor por prioridad en vez de por fecha.
4. Sumar al tablero `/admin/agente` (el de main) una fila por tipo con el bruto de referencia y "comisión sin definir".
