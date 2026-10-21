# INFORME PARA JOSÉ — mañana del 21-10-2026

> Rama `feat/agente-v2` (worktree `~/consignatarias-agente-noche`). **Nada publicado, nada mandado a nadie, ninguna variable ni clave tocada.**
> Contra main: 22 archivos, casi todos nuevos. En `motor.ts` hay 4 cambios chicos y en `page.tsx` de `/admin/agente`, 2 líneas.

## 1. Lo que necesita tu decisión ANTES DE LAS 8 (el agente de producción vuelve a escribir)
1. **Riesgo SIOCAL en hacienda (legal).** El 1% como "comisión", sin estar inscriptos en el SIOCAL, puede no ser cobrable, y además hay riesgo de sanción. Opciones:
   - (a) seguir y consultar a un abogado hoy;
   - (b) pausar el agente hasta la consulta. Hoy la única pausa es sacar `AGENTE_IMAP_PASSWORD`, y eso lo hacés vos o me lo pedís;
   - (c) pasar al encuadre "servicio de contacto". Está en borrador: `src/lib/agente/mensajes-contacto.ts`.
2. **La oferta que sale hoy le muestra a la contraparte el precio pedido del productor.** Es su piso. Sacarlo es una línea en `mensajes.ts → detalle()`.
3. **A la oferta le falta el aviso de "comunicación comercial"** (Ley 25.326 art. 27). La BAJA ya está.

## 2. Lo que se hizo esta noche (todo con tests: 751 en verde, build OK)
- **El agente generalizado por tipo de operación** (`tipos.ts`):
  - Hacienda: 1%.
  - Arrendamiento: 0,8 de un mes de canon (tu decisión), con **bloqueo legal**.
  - Campo: sin comisión.
  - Tasación: califica.
- **Leads de campo y tasación** (`campos-agente.ts`): le escribe solo a quien consultó (pedir datos o calificar), le recuerda, lo duerme o te lo pasa con aviso. **Apagado**: se prende con `AGENTE_TIPOS=on`. Nunca escribe a contrapartes.
- **Cola por plata** (`cola.ts`): el cupo de 20 contactos nuevos por día va primero a lo que más puede dejar.
- **Correos por tipo y cadencia de seguimiento** 0/3/7/14 días, con pie comercial (`mensajes-tipos.ts`).
- **Tablero `/admin/agente`:**
  - "Decisiones pendientes", leídas del código: desaparecen solas al resolverlas.
  - "Por tipo de operación": plata abierta y qué la frena.
- **3 informes con fuentes** en `docs/agente/`: comisionista de hacienda, inmobiliaria rural y cierre de operaciones.

## 3. Qué revisar antes de publicar
- `/admin/agente` con datos reales (preview no sirve: no tiene Supabase. Se mira en producción, como el admin).
- Los textos de `mensajes-tipos.ts` y `mensajes-contacto.ts`: son la voz de la casa hacia productores.
- Que la v1.237.0 de la otra sesión siga compatible. Hoy mergea limpio: mi rama tiene `origin/main` integrado y no tiene conflictos.
- Versión: al publicar, la siguiente libre (hoy main está en v1.237.0 → **v1.238.0**) y su entrada en el CHANGELOG.

## 4. Cómo se junta con lo de la otra sesión
- La otra sesión ya pasó su `feat/cerrador-v2` a main como v1.237.0 (#71) y ahora trabaja en `feat/conversion-leads`.
- Mi rama sale de su trabajo y lo tiene integrado: se publica con un merge común a main, previo `git fetch` y merge de lo último.

## 5. Decisiones pendientes (también aparecen en el tablero)
- **Arrendamiento:**
  - circuito con un corredor matriculado por provincia, cobro por publicación o suscripción, o abogado;
  - quién paga;
  - calcular sobre el total del contrato con el tope provincial (0,8 meses de un contrato de 1 año ≈ 6,7%, por encima del 4% bonaerense).
- **Venta de campo:** sin comisión definida.
- **Prender `AGENTE_TIPOS`:** son 10 correos a quienes nos consultaron (4 de arrendamiento, 6 de tasación).

## 6. Estimación honesta de comisión
- **Hoy: $0 cobrado y $0 en juego.** Embudo real a las 04:55:
  - 4 ofertas enviadas, 0 respuestas, 0 ACEPTO, 0 presentados.
  - Para cobrar falta una contraparte que acepte, la presentación, que negocien, que cierren y que informen el cierre: **no entra en un día**.
- **Meta de $100.000 antes del fin del día: no la veo alcanzable** con este embudo, y no la voy a disfrazar.
- **Qué la acercaría:**
  - Una sola operación chica de hacienda supera la meta: 100 novillos de ~400 kg a ~$4.200/kg ≈ $168M de bruto → 1% ≈ **$1,7M**. El cuello no es el tamaño, es conseguir el primer ACEPTO.
  - **Llamar hoy** a los productores que están en "Para llamar hoy" (el tablero ya trae el WhatsApp con el guion). El informe de cierre dice que la velocidad de respuesta es lo que más pesa.
  - Arrendamiento: ~$21,7M de comisión de referencia en 4 leads (casi todo el de 1.661 ha de Corrientes), **bloqueado legalmente**. Es el número más grande y también el que más riesgo tiene.

---

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

### #5 — 02:25
- **Tablero por tipo de operación** en `/admin/agente`:
  - `src/lib/agente/por-tipo.ts` + tests (5): `resumenPorTipo`, `estadoEnvio`, y `kgHaMesTipico` (canon típico por provincia, de `tierra-por-kilo.json`).
  - `src/components/admin/agente/PorTipo.tsx`: tabla con leads abiertos, cuántos tiene el agente, bruto de referencia, comisión y estado (Lo trabaja / Bloqueo legal / Sin comisión definida).
  - `page.tsx`: **una línea** (`<PorTipo />` arriba del embudo).
- **Números reales** (base al 21-10 02:24, precio de referencia ≈ $4.176/kg):
  - 4 leads `arrendar_busco` (80, 100 y 100 ha en Buenos Aires; 1.661 ha en Corrientes) → canon anual de referencia ≈ **$325M** → comisión a 0,8 de un mes ≈ **$21,7M**.
  - ⚠️ Es una estimación con canon típico por provincia, no ofertas. Y está **bloqueada legalmente** (matrícula de corredor). Casi todo es el lead de 1.661 ha de Corrientes.
  - 6 tasaciones (53 a 20.000 ha): sin comisión. Sirven para calificar si detrás hay una venta o un arrendamiento.
- Check 727 tests OK, build OK.

### #6 — 02:55
- `src/lib/agente/campos-agente.ts` + tests (11). El agente con leads de campo (arrendar_busco/ofrezco, busca-campo, tasar):
  - **Le escribe solo a quien consultó:** le pide ha, aptitud, zona y plazo, o en tasación le pregunta si es para vender o arrendar. Recordatorio a los 3 días, máximo 2, después lo duerme.
  - **Con los datos completos, o si el lead contesta:** `escalado`, lo sigue José. **Nunca escribe a contrapartes.**
  - **APAGADO por defecto:** solo corre con `AGENTE_TIPOS=on`. No creé la variable. Prenderla es decisión de José.
  - Los casos van en `agente_casos` con `datos.tipo`: no hace falta migración, `datos` es jsonb. Los casos viejos sin `tipo` cuentan como hacienda.
- `motor.ts`, 3 cambios chicos:
  - la cola de hacienda filtra `esCasoDeHacienda`;
  - en la bandeja, la respuesta a un caso de campo se reenvía a José, como en un caso escalado;
  - llamada a `trabajarCampos()`, que no hace nada si está apagado.
- Check 738 tests OK, build OK.
- **Si José lo prende hoy:** 4 arrendar_busco + 6 tasar = 10 correos a gente que nos escribió, a razón de hasta 5 por corrida, de 7 a 22. Ninguno compromete precio ni comisión.

### #7 — 03:25
- `src/lib/agente/mensajes-contacto.ts` + tests (6). **BORRADOR sin usar**: `ofertaServicioContacto()`, la oferta de hacienda con el encuadre "servicio de contacto" para el riesgo SIOCAL.
  - Mismo asunto y referencia que la oferta actual.
  - Cobra "el servicio de contacto: 1% del bruto si se concreta", en vez de "comisión".
  - Aclara lo que no hacemos (no negociamos precio, no cobramos ni pagamos por terceros, no emitimos liquidaciones ni DT-e, no garantizamos el pago).
  - Pide verificar SIOCAL y RENSPA.
  - Pie comercial con BAJA.
  - El monto es el mismo que definió José: cambia qué se cobra, no cuánto.
- **Hallazgo para José:** la `oferta()` que sale hoy incluye **"Precio pretendido: $X/kg" del productor** (`detalle()` en `mensajes.ts`). Es su piso, se lo damos a la contraparte antes de que negocie, y va contra la regla de `/lotes` de no publicar el precio pedido. El borrador no lo incluye. No toqué la plantilla de producción.
- Check y build OK.

### #8 — 03:55
- **"Decisiones pendientes" arriba de todo en `/admin/agente`:**
  - `src/lib/agente/decisiones.ts` + tests (5) y `src/components/admin/agente/Decisiones.tsx`. `page.tsx`: una línea.
  - La lista se arma **desde el código**: `TIPOS` (bloqueos y comisiones), `AGENTE_TIPOS`, y una oferta de prueba que se genera con la plantilla real para ver si muestra el precio pedido, si lleva el pie comercial y qué encuadre usa. Cuando una decisión se refleja en el código, desaparece sola.
  - Hoy muestra 7 decisiones:
    - Legal: SIOCAL, arrendamiento bloqueado, falta el pie comercial.
    - Plata: comisión de campo, quién paga el arrendamiento y su tope, precio pedido en la oferta.
    - Producto: AGENTE_TIPOS apagado.
- Check 749 tests OK, build OK.

### #9 — 04:25 (auditoría de envíos del agente de campos)
- **Hueco corregido:** un caso de campo que llegaba con datos completos pasaba a `escalado` **sin avisarle a José**, así que quedaba olvidado. Ahora `trabajarCampos` recibe `avisar` (el `escalar` del motor) y le manda a José ha, aptitud y zona, con responder-a el lead.
- **Test de punta a punta con base falsa:**
  - 3 leads → 3 casos;
  - correos SOLO a quienes consultaron (2);
  - 1 aviso a José por el caso completo;
  - a las 3 AM no hace nada.
- **Verificado leyendo el código:**
  - BAJA: `mandar()` filtra `agente_bajas`.
  - Horario: 7 a 22, el mismo que usa hacienda para escribirle al lead.
  - Hacienda no toma intents de campo y campo no toma casos de hacienda, así que nadie recibe dos flujos.
  - Recordatorio cada 3 días, como máximo 2.
- Check 751 tests OK, build OK.

### #10 — 04:55 (foto del agente en producción, para el informe)
- **Casos:** 11 descartados · 5 nuevos · 5 pidiendo datos · 2 ofreciendo · 1 escalado · 1 sin contraparte. **0 presentados, 0 cerrados.**
- **Ofertas a contrapartes:** 4 enviadas, **0 respuestas, 0 ACEPTO.**
- **Correos últimos 7 días:**
  - salieron 14: 5 pedidos de datos, 4 ofertas, 3 avisos de "estamos ofreciendo", 1 manual de José, 1 sin contraparte;
  - entró 1 (sin caso).
- **Lectura:** el embudo todavía no tiene a nadie en la etapa en que se cobra. Para que haya comisión, una contraparte tiene que responder ACEPTO, el agente presenta, las partes negocian y cierran, y después informan el cierre. Ese recorrido no entra en un día.

### #11 — 05:50
- Sin cambios en main. Anotado para el informe: el motor usa su propio `RECORDATORIO_CONTRAPARTE_DIAS` (en `reglas.ts`, de la otra sesión) y no la cadencia 0/3/7/14 de `mensajes-tipos.ts`. Unificarlo cambia lógica que ya corre en producción → queda como decisión.

## Próximos pasos
- Siguientes candidatos:
  - (a) leyenda "comunicación comercial" como propuesta en `mensajes.ts` hacia contrapartes de hacienda, o dejarla para que José decida;
  - (b) ✅ (#7) borrador de plantilla de hacienda con encuadre "venta del contacto" (opción 3 del riesgo SIOCAL), sin activar;
  - (c) ✅ (#8) en `/admin/agente`, una sección "Decisiones pendientes de José" que lea `TIPOS`;
  - (d) informe final a las 07:00.
0. (los 3 informes llegaron ✅) Leer los 3 informes de `docs/agente/` y bajar sus reglas a esta lista. Riesgos legales → bloqueos.
1. ✅ (#6) Usar `tipoDeIntent` en el motor (`motor.ts` ~l.487) para que tome arrendamiento y tasación con su primer paso. Los tipos sin comisión quedan en "calificar o pedir datos" **solo hacia el propio lead** (el que nos escribió), nunca a contrapartes. Ojo: escribirle al lead que nos escribió también es mandar un mail → queda detrás del mismo encendido, y se deja listo para que José lo prenda.
2. ✅ (#3) Plantillas por tipo en un archivo nuevo `mensajes-tipos.ts`:
   - arrendamiento: pedir ha, aptitud, zona y fecha; la oferta a la contraparte explica el servicio llave en mano, "0,8 de un mes de canon contra el mes completo del mercado" y que la aceptación es por escrito;
   - tasación: "¿querés venderlo o arrendarlo?".
3. ✅ (#4) Ordenar la cola del motor por prioridad en vez de por fecha.
4. ✅ (#5) Sumar al tablero `/admin/agente` (el de main) una fila por tipo con el bruto de referencia y "comisión sin definir".
