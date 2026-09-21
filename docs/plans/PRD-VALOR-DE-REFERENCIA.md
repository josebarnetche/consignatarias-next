# PRD — Valor de Referencia (VR): de calculadora a oráculo de precio

**Fecha:** 2026-09-20 · **Propietario:** Memola Medios SAS · **Estado:** ✅ **IMPLEMENTADO** (Sprints 1–4). Ver §12 para lo entregado y las correcciones al plan original.
**Origen:** `docs/strategy/TOKENIZACION-GANADERA-AGFINTECH-2026.md` §5.2 (jugadas 1 y 2) — *gitignorado, no está en el repo público*.
**Construye sobre:** `POSITIONING-THESIS.md` §1.1 (CEPEA/B3), `PLAN-DE-NEGOCIOS-2026.md` §24 (Motor 2), `docs/METODOLOGIA-INDICE-CONSIGNATARIAS.md` (v1.0 borrador — este PRD lo reemplaza).

> **La decisión en una línea.** No hay que construir un endpoint de valuación: **ya existe** (`valuar_tropa`, MCP + x402). Hay que convertirlo de **calculadora** en **referencia auditable**, porque hoy devuelve un número puntual donde el mercado real tiene entre 28% y 44% de amplitud — y un número puntual no sirve para colateralizar, asegurar ni licenciar. El producto es **la banda, la metodología versionada y el registro citable**, no el multiplicador.

---

## 1. El problema, con nuestro propio dato

`src/lib/valuaciones.ts` calcula hoy:

```
total = precio_categoria_MAG × kg_promedio × cabezas
```

Un solo número nacional, sin banda, sin n, sin plaza. El propio texto de salida lo admite: *"Es una valuación de referencia, no una cotización"*. Correcto y honesto — **y exactamente por eso hoy no es monetizable arriba del ticket de US$0,05.**

**Qué dice nuestra propia tabla `mag_consignataria_sales_lots`** (18.397 lotes, 100% con precio, 53 días operados, 2026-05-19 → 2026-09-18, 136.561 cabezas, 22 consignatarias, 11 provincias de origen, 16 categorías):

| Categoría | Lotes (30d) | Cabezas | P10 | Mediana | P90 | Amplitud P10–P90 |
|---|---:|---:|---:|---:|---:|---:|
| VACA | 1.956 | 10.422 | 2.500 | 2.900 | 3.600 | **44,0%** |
| VAQUILLONA | 746 | 8.162 | 3.500 | 4.500 | 5.000 | **42,9%** |
| NOVILLITO | 538 | 5.745 | 3.750 | 4.700 | 5.100 | **36,0%** |
| NOVILLO | 406 | 3.960 | 3.600 | 4.300 | 4.600 | **27,8%** |
| TORO | 596 | 1.313 | 2.700 | 3.200 | 3.700 | 37,0% |
| MEJ | 128 | 732 | 3.070 | 4.000 | 4.700 | 53,1% |

**Hecho:** sobre una tropa de 350 vacas, el rango real P10–P90 implica una diferencia de decenas de millones de pesos. `valuar_tropa` devuelve hoy un punto en el medio de ese rango, sin decir que el rango existe.

**Hecho (segunda consulta, VACA, 90 días):** el origen mueve la mediana entre **−6,5% (SLU) y +7,9% (CBA/LPA)** respecto de la nacional, con n≥30 en solo **6 provincias** (BUE domina con 5.039 lotes).

> **Inferencia clave, y es la que ordena todo el PRD:** *la varianza grande no es geográfica, es de calidad/composición del lote.* La banda vale ~4 a 6 veces más que el ajuste provincial. **Por lo tanto: la banda es el producto; el corte por provincia es un secundario que no hay que sobrevender.** Cualquier PRD que empiece por "precios por provincia" está optimizando el eje equivocado.

---

## 2. Inventario honesto: qué ya existe (no reconstruir)

| Pieza | Estado | Dónde |
|---|---|---|
| Cálculo de tropa | ✅ existe | `src/lib/valuaciones.ts` → `valuarTropa()` |
| Tool MCP `valuar_tropa` | ✅ existe, gratis con cupo 5/día por IP | `src/app/api/mcp/route.ts:835` |
| Endpoint x402 US$0,05 | ✅ existe | `src/app/api/x402/valuar-tropa/route.ts` |
| Dato de lote con precio | ✅ **18.397 filas, 100% con precio** | `mag_consignataria_sales_lots` |
| API de lote auth-gated | ✅ existe | `/api/lots` |
| Serie INMAG 2015→hoy | ✅ 2.237 filas ARS+USD | `mag_inmag_history` |
| Panel 16 subcategorías | ✅ diario | `mag_prices_detailed` |
| **Banda de dispersión** | ❌ **no existe** | — |
| **Metodología publicada y versionada** | ❌ borrador v1.0 de mar-2026, §2.2 "en desarrollo" | `docs/METODOLOGIA-INDICE-CONSIGNATARIAS.md` |
| **Registro citable de valuación** | ❌ no existe | — |

**Conclusión del inventario:** el 70% del trabajo está hecho. Lo que falta son las tres piezas que convierten un cálculo en una referencia: **banda + metodología + registro.**

---

## 3. El producto

**Nombre propuesto:** **Valor de Referencia (VR)** — *ver §11, es una decisión abierta.*

**Definición de una línea, para poner en la home del producto:**
> El rango de precio observado al que realmente se vendió una categoría de hacienda, con la cantidad de lotes y cabezas que lo sustentan, la fecha, y la metodología con la que se calculó.

### 3.1 El objeto `Valuación` (el corazón del PRD)

Hoy `valuarTropa()` devuelve un total. El VR devuelve **un objeto con banda y procedencia**:

```jsonc
{
  "vr_id": "vr_2026-09-20_vaca_a1b2c3",     // registro citable, permanente
  "categoria": "vaca",
  "cabezas": 350,
  "kg_promedio": 470,
  "kg_asumido": true,

  "referencia": {                            // ← LO NUEVO
    "unidad": "ARS/kg vivo",
    "p10": 2500, "mediana": 2900, "p90": 3600,
    "amplitud_pct": 44.0,
    "base": { "lotes": 1956, "cabezas": 10422, "ventana_dias": 30 },
    "ajuste_origen": { "provincia": "CBA", "factor": 1.079, "lotes": 148, "aplicado": true }
  },

  "valuacion": {
    "conservador_ars": 411250000,            // p10
    "central_ars":     477050000,            // mediana
    "optimista_ars":   592200000,            // p90
    "usd_blue": { "central": 318033 },
    "usd_oficial": { "central": 341464 }
  },

  "procedencia": {
    "fuente_precio": "mag_consignataria_sales_lots (observado, MAG haciinfo000007)",
    "fuente_fx": "dolarapi.com",
    "fecha_dato": "2026-09-18",
    "metodologia": "VR v1.0",
    "url_metodologia": "https://www.consignatarias.com.ar/metodologia/vr",
    "permalink": "https://www.consignatarias.com.ar/vr/vr_2026-09-20_vaca_a1b2c3"
  },

  "limites": [
    "Referencia de mercado, no tasación ni cotización en firme.",
    "Base nacional MAG; no hay serie oficial de precios por provincia.",
    "Ajuste por origen aplicado solo con n≥30 lotes en 90 días."
  ]
}
```

**Las cuatro propiedades que lo hacen un oráculo y no una calculadora:**
1. **Banda, no punto** — p10/mediana/p90.
2. **n visible** — lotes y cabezas que sustentan cada número. Sin n no hay auditoría.
3. **Metodología versionada** — `VR v1.0`, con URL. Cuando cambie el cálculo, cambia la versión, y las valuaciones viejas siguen siendo reproducibles.
4. **Permalink citable** — la valuación tiene URL propia. Es lo que un perito, un banco, un asegurador o un LLM citan.

### 3.2 Regla de degradación (la regla más importante del producto)

**Nunca inventar precisión.** Igual que la doctrina de `inmag-historico.ts` (recorta y lo declara, nunca niega):

| n de lotes en ventana | Qué devuelve |
|---|---|
| ≥ 100 | banda completa + ajuste por origen si n_prov ≥ 30 |
| 30–99 | banda completa, **sin** ajuste por origen, con aviso |
| 10–29 | solo mediana + aviso explícito de base fina |
| < 10 | **cae a la referencia MAG nacional actual** y lo declara |

El caso `VAC.MUERTA` (40 lotes, precio 0) prueba que la regla hace falta: hay categorías basura en el dato crudo que no pueden llegar a una respuesta.

---

## 4. Alcance v1 / fuera de alcance

### Dentro (v1)
- Librería `src/lib/vr.ts`: banda por categoría + ventana + ajuste por origen + regla de degradación.
- `valuarTropa()` devuelve `referencia` y `valuacion` de tres puntos (retrocompatible: `total_ars` sigue existiendo = central).
- Página pública `/metodologia/vr` (metodología VR v1.0, indexable, citable).
- Permalinks `/vr/[id]` (SSG-friendly, `DatasetSchema`, indexable).
- Las 5 superficies MCP sincronizadas (ver §6).
- Superficie de productor: la banda visible en `/mercado` por categoría.

### Fuera (v1) — explícito para que no se cuele
- ❌ Emitir, custodiar o tokenizar nada.
- ❌ Originar crédito o seguro.
- ❌ Precio por provincia como producto propio (§1: eje equivocado).
- ❌ Valuación de rodeo multi-categoría (v2 — requiere composición, que es un input que el usuario no tiene a mano).
- ❌ Cambiar el pricing de Enterprise o de x402.

---

## 5. Gating (aplica la doctrina de CLAUDE.md, no la inventa)

| Superficie | Acceso | Por qué |
|---|---|---|
| Banda del día por categoría en `/mercado` | **Pública, sin login** | Es "el número del día" — cita GEO, va con `DatasetSchema` |
| `/metodologia/vr` | **Pública** | Sin metodología pública no hay autoridad. Es el activo CEPEA. |
| Permalink `/vr/[id]` | **Público** | El punto entero es que sea citable |
| `valuar_tropa` (MCP) | Gratis con cupo 5/día por IP → x402 US$0,05 | **Sin cambios** |
| Banda histórica / serie de dispersión | Enterprise (`/api/precios?vr=1`) | Es el dato que compra un modelador |
| Export CSV/JSON de valuación | Cuenta (`requireLoginForDownload`) | Doctrina vigente: gratis ≠ anónimo |

**Nota de doctrina:** publicar la banda gratis parece regalar el producto. No lo es — es el movimiento de CEPEA y de IBLI: *el índice público es lo que crea el mercado que después paga por el histórico, la API y el servicio.* Lo que se cobra no es el número, es **la serie, el SLA y el derecho a citarlo como proveedor**.

---

## 6. Superficies a sincronizar (obligatorio en el mismo PR)

`CLAUDE.md` exige que cualquier cambio de MCP toque **las cuatro** superficies, más el manifiesto como quinta. Este PRD toca `valuar_tropa`, así que:

1. `src/app/api/mcp/route.ts` — descripción de la tool + string `instructions` del `initialize`
2. `/mcp` page — array `TOOLS` + copy de la nota al pie
3. `src/app/llms.txt/route.ts` — lista de tools + párrafo de acceso/pricing
4. `src/app/llms-full.txt/route.ts` — el callout de MCP
5. `mcp-registry/server.json` (+ `server.json` + `public/.well-known/mcp/server.json`) — **solo si cambia de qué se trata el server.** Bump de `version` y republicación por `mcp-registry/PUBLISH-RUNBOOK.md`. **Límite duro: 100 caracteres de descripción.**

> **Criterio para el punto 5:** agregar banda a una tool existente *no* cambia de qué se trata el server → **no** se republica. Si en v2 se agrega una tool nueva de valuación de rodeo, sí.

---

## 7. Métricas de éxito

**Que no sea vanidad.** La pregunta que el producto tiene que contestar en 90 días es la kill hypothesis #3 del doc de estrategia: *¿alguien paga por esto?*

| Métrica | Baseline | Meta 90d | Cómo se mide |
|---|---|---|---:|
| Citas de `/metodologia/vr` en respuestas LLM | 0 | ≥ 3 | `src/lib/ai-citations.ts` |
| Llamadas a `valuar_tropa` con banda | — | +40% vs. hoy | `ops_events` |
| Conversiones x402 `valuar-tropa` | (medir hoy) | ×2 | `ops_events` |
| **Conversaciones Enterprise iniciadas citando VR** | 0 | **≥ 2** | manual, CRM |
| Permalinks `/vr/[id]` indexados | 0 | ≥ 50 | GSC |

**La métrica que decide** es la cuarta. Las otras tres pueden subir sin que el negocio exista.

---

## 8. Plan de entrega

**Sprint 1 — el núcleo (la banda).** `src/lib/vr.ts` + tests + regla de degradación + `valuarTropa()` retrocompatible. Nada visible todavía. *Es la única parte que no tiene decisiones de negocio pendientes.*

**Sprint 2 — la autoridad.** `/metodologia/vr` reescrita desde cero (la v1.0 borrador no resiste auditoría: §2.2 dice "en desarrollo"). Banda visible en `/mercado` con `DatasetSchema`.

**Sprint 3 — la citabilidad.** Permalinks `/vr/[id]`, sitemap, export gated, las 4 superficies MCP.

**Sprint 4 — la venta.** `?vr=1` en `/api/precios` para Enterprise + las 2 conversaciones de la métrica que decide.

---

## 9. Riesgos y criterios de muerte

1. **La base de lote es corta: 53 días.** No hay estacionalidad, no hay ciclo. Una banda de 30 días sobre 4 meses de historia es honesta como *dispersión actual*, **no** como *referencia histórica*. **Mitigación: decirlo en la metodología, no maquillarlo.** El histórico largo lo aporta INMAG (2.237 días), que es un punto, no una banda. Son dos activos distintos y no hay que fundirlos.
2. **22 consignatarias de 107 perfiles canónicos.** La base es el MAG, no el país. La metodología tiene que decir *"observado en MAG"*, nunca *"mercado argentino"*. Sobrevender la cobertura es la forma más rápida de perder la autoridad que es todo el activo.
3. **Riesgo de responsabilidad.** Si alguien colateraliza contra un VR y sale mal, el `limites[]` del objeto es la defensa. **No es opcional** — va en la respuesta, no en un footer.
4. **Criterio de muerte:** si a los 90 días la métrica que decide (§7) es 0 y ninguna conversación Enterprise menciona valuación, **el VR se queda como feature de GEO/autoridad y no se invierte más.** No se escala a v2.

---

## 10. Lo que este PRD deliberadamente NO hace

No propone tokenizar. El doc de estrategia (§5.1) lo descarta y este PRD lo respeta. El VR es **el insumo** que un Cowmed argentino necesitaría — construirlo nos pone del lado del proveedor de datos, que es el lado con margen y sin licencia. Si la tokenización ganadera argentina nunca arranca, **el VR igual se justifica** por el negocio institucional actual. Ese es el test que el doc de estrategia exigía (§6.2) y este PRD pasa.

---

## 11. Decisiones abiertas (necesitan tu input)

1. **Nombre.** "Valor de Referencia (VR)" es descriptivo y aburrido, que para un índice es una virtud (CEPEA no se llama nada). Alternativas: mantenerlo dentro de la familia INMAG, o un nombre propio tipo "Proof of Land" de Landtoken.
2. **¿La banda va pública o es el diferencial pago?** §5 propone pública por doctrina CEPEA/IBLI. Es la decisión de negocio más importante del PRD y es reversible en una dirección sola (publicar y después cerrar quema autoridad).
3. **¿Reemplazamos `METODOLOGIA-INDICE-CONSIGNATARIAS.md` o convive?** Ese doc describe un "IPC" con ponderaciones que hoy no se calcula. Mi recomendación: **archivarlo** y que VR v1.0 sea la metodología única, para no tener dos índices que no se hablan.


---

## 12. Estado de entrega (cierre 2026-09-20)

### Lo que se construyó

| Sprint | Entregable | Estado |
|---|---|---|
| 1 | `src/lib/vr.ts` + regla de degradación + `valuarTropa()` retrocompatible | ✅ |
| 1 | `scripts/compute-vr-bandas.mjs` + job en `mag-lots-pipeline.yml` | ✅ |
| 2 | `/metodologia/vr` pública e indexable + enlace desde `/metodologia` | ✅ |
| 2 | Banda visible en `/mercado` (`VrBandas`, sin login) | ✅ |
| 3 | Sitemap + las 4 superficies MCP sincronizadas | ✅ |
| 3 | Permalinks citables | ✅ **con corrección — ver abajo** |
| 4 | `?vr=1` en `/api/precios` | ✅ |
| 4 | `?vr=historico` + tabla `vr_bandas_history` | ✅ **(ver §13)** |
| 4 | Export CSV/JSON gated | ❌ **no hecho — ver pendientes** |

**Decisiones tomadas (§11 resuelto):** banda **pública** (doctrina CEPEA/IBLI); nombre **Valor de Referencia (VR)**; `METODOLOGIA-INDICE-CONSIGNATARIAS.md` queda **archivado de hecho** — la metodología viva es `/metodologia/vr` + la página general `/metodologia` (v1.3), que ya estaba a mejor nivel que el borrador.

### Corrección al plan: permalinks por categoría, no por valuación

El §3.1 proponía `/vr/[id]` con un id hasheado por valuación (`vr_2026-09-20_vaca_a1b2c3`). **Se descartó al implementar.** Una URL por consulta generaría miles de páginas casi duplicadas y de contenido fino — exactamente lo que el sitemap del sitio ya excluye para los perfiles thin. Peor: para que un permalink de ese tipo funcione hay que **persistir cada valuación**, lo que agrega una tabla, un ciclo de vida y una superficie de datos nueva para un beneficio que nadie pidió.

Lo entregado es **`/vr/[categoria]`**: `/vr/vaca`, `/vr/novillo`, `/vr/vaquillona`, `/vr/novillito`, `/vr/toro`, `/vr/mej`. Seis URLs estables, SSG, con `DatasetSchema` + `FAQPageSchema`, que es lo que un motor de IA cita. `generateStaticParams` sale de `getSlugsConBanda()`, así que **el sitemap nunca emite una página sin dato**: la regla de degradación gobierna también qué se publica.

El objeto `Valuación` del §3.1 sigue siendo correcto en todo lo demás (banda, n, metodología versionada); lo único que cambia es que `permalink` apunta a la categoría, no a la consulta.

### Pendientes conscientes

1. **Export CSV/JSON gated.** No se hizo. Hoy no hay a qué colgarlo: no existe una superficie de descarga del VR. Cuando exista, va con `requireLoginForDownload()`.
2. ~~**La serie histórica de dispersión.**~~ **Hecho — ver §13.**
3. **`mag-lots-pipeline.yml` corre Mar/Mié/Vie.** Las bandas se refrescan con esa cadencia, no a diario. Está declarado en la metodología (`updateFrequency`).

### Qué queda por validar (la métrica que decide, §7)

Nada de lo anterior prueba que alguien pague. La kill hypothesis #3 sigue abierta y el criterio de muerte del §9.4 sigue en pie: **si a los 90 días no hay ≥2 conversaciones Enterprise citando el VR, se congela como activo de autoridad y no se invierte más.**


---

## 14. Revisión del 21-sep-2026 (v1.211.0) — leer primero

Este PRD quedó incorporado a la rama `feat/valor-de-referencia-v1`, que lo convierte en el núcleo del
producto junto con Mi Ganado. Las correcciones medidas contra el dato —banda por rango de peso, `mej` en
`getReferencia`, etiquetas P10/P90, MEJ = Macho Entero Joven, y `VR_SIN_SERIE` para no escribir la serie
desde una PC— están en `docs/strategy/DECISION-PRODUCTO-2026-09-21.md` §4. El "fuera de v1" de la
valuación de rodeo multi-categoría (§4) se revirtió: Mi Ganado ya existía con rodeos cargados y es la
superficie recurrente del productor.

---

## 13. La serie de dispersión (entregado)

### Qué es y por qué es el producto que se vende

`vr-bandas.json` guarda la banda **vigente** y se pisa en cada corrida. Eso responde *"¿cuánto vale hoy?"*. No responde *"¿se está abriendo o cerrando la dispersión?"* — que es la pregunta de quien modela riesgo o calcula una prima, y la que el precio puntual **no puede** contestar por definición.

`vr_bandas_history` es esa serie. Backfill: **234 filas, 39 ruedas, 6 categorías, 2026-06-19 → 2026-09-18**, calculadas con la misma ventana móvil de 30 días que la banda vigente.

**Y la dispersión se mueve, que es lo que valida el producto:**

| Categoría | Amplitud mín. | Amplitud máx. | Recorrido | Variación de la mediana |
|---|---:|---:|---:|---:|
| MEJ | 34,8% | 74,9% | 40,1 pts | 7,5% |
| VACA | 44,0% | 60,0% | 16,0 pts | 20,8% |
| VAQUILLONA | 38,9% | 52,9% | 14,0 pts | 6,5% |
| TORO | 37,0% | 50,0% | 13,0 pts | 23,1% |
| NOVILLITO | 30,0% | 42,2% | 12,2 pts | 3,7% |
| NOVILLO | 25,0% | 33,8% | 8,8 pts | 5,2% |

**El dato que importa:** amplitud y mediana **se mueven independientemente**. En vaca la mediana subió 20,8% mientras la amplitud se abría 16 puntos; en novillito la mediana casi no se movió (3,7%) y la amplitud recorrió 12 puntos. Una dispersión que se abre mientras el precio hace otra cosa es exactamente la señal de riesgo que un asegurador o un prestamista necesita, y **no se puede derivar del precio**. Ese es el argumento de venta.

### Decisiones de diseño

- **PK `(date, category, metodologia)`.** La versión de metodología es parte de la identidad de la fila, no un atributo. Cuando VR v1.1 cambie el cálculo, la serie nueva **convive** con la v1.0 en vez de pisarla — es lo que promete `/metodologia/vr` §7 sobre reproducibilidad.
- **`CHECK` en la base, no solo en el código:** `p10 <= mediana <= p90`, `lotes >= 10`, `p10 > 0`. Los invariantes de la metodología viven donde no se pueden saltear.
- **Fechado en la última rueda del dato, no en "hoy".** Una corrida en un día sin operaciones no inventa un punto, y un re-run del mismo día es idempotente por la PK.
- **Escribir la serie no puede voltear la corrida.** Si el upsert falla, el script loguea y sigue: el JSON de la banda vigente es lo que sirven todas las superficies, y un punto perdido se recupera con un re-run.
- **Paginado obligatorio en el endpoint.** PostgREST devuelve 1000 filas por request; 6 categorías × 3650 días son ~22.000. Un `.limit()` alto truncaría **en silencio**, que en una serie es el peor error posible.

### Límite honesto, que va en la respuesta

Cada punto es una **ventana móvil de 30 días**: dos puntos consecutivos comparten la mayor parte de sus lotes, así que la serie está autocorrelacionada por construcción y no debe leerse como observaciones independientes. Y arranca en junio de 2026: **no cubre un ciclo ganadero ni estacionalidad.** Ambas cosas van en `limites[]` de la respuesta, no en una nota al pie.

### Pendiente identificado

Un tool MCP para la serie (`get_vr_historico`) sería la superficie natural para agentes. **No se agregó**: una tool nueva cambia *de qué se trata* el server y obliga a republicar el manifiesto del registry (`mcp-registry/PUBLISH-RUNBOOK.md`), y la clave privada vive en `~/.mcp-keys/` — fuera de esta sesión. Queda como la próxima entrega, con republicación incluida.
