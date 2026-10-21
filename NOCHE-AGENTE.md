# Noche del agente cerrador — 21-10-2026 (00:22 → 07:00)

Bitácora del loop de 30 min. Rama `feat/agente-v2` (worktree `~/consignatarias-agente`). **Nada va a main ni a producción hasta que José lo revise.**

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

## Hueco de negocio (decide José)
La comisión del 1% está definida **solo para hacienda**. Para arrendamiento y venta de campo no hay porcentaje, ni base, ni quién paga. No lo invento. En el código esos tipos tienen `comisionPct: null`, y `enviaAContrapartes()` da false mientras esté así: se calculan y se muestran, pero no salen.

## Iteraciones
### #1 — 00:40
- `src/lib/agente/tipos.ts` + `tipos.test.ts` (12 tests).
  - Es el registro de tipos de operación: hacienda, arrendamiento, campo y tasación.
  - Define, para cada tipo, los datos mínimos, las contrapartes, la comisión (solo hacienda = 1%) y el primer paso.
  - `valuarLead()` calcula el bruto de referencia (para arrendamiento, el canon anual = ha × kg/ha/mes × 12 × precio del novillo) y la comisión, solo si José la definió.
  - `prioridad()` = comisión × peso del estado, para ordenar qué caso mover primero.
- Todavía no está conectado al motor: es la base pura.

## Próximos pasos
1. Usar `tipoDeIntent` en el motor (`motor.ts` ~l.487) para que tome arrendamiento y tasación con su primer paso. Los tipos sin comisión quedan en "calificar o pedir datos" **solo hacia el propio lead** (el que nos escribió), nunca a contrapartes. Ojo: escribirle al lead que nos escribió también es mandar un mail → queda detrás del mismo encendido, y se deja listo para que José lo prenda.
2. Plantillas por tipo en `mensajes.ts` (pedir hectáreas/aptitud; tasación: "¿querés venderlo o arrendarlo?").
3. Ordenar la cola del motor por `prioridad()` en vez de por fecha.
4. Sumar al tablero `/admin/agente` (el de main) una fila por tipo con el bruto de referencia y "comisión sin definir".
