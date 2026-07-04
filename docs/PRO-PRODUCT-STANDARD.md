> ⚠️ **OBSOLETO (2026-07-04).** PRO Usuario fue **retirado**: todas las herramientas del productor
> son gratis y los gates (`ProReveal`/`RequirePro`) quedaron en passthrough. NO construyas nuevos
> muros PRO Usuario siguiendo este documento — queda como referencia histórica del estándar de
> gating blando. El modelo vigente: productor gratis; revenue = Enterprise API/MCP + PRO Consignataria.

# PRO Product Standard — consignatarias.com.ar

> El estándar de los productos **PRO Usuario** (ARS 7.900/mes). Todo agente que construye
> una superficie PRO sigue este documento al pie de la letra. Componentes compartidos en
> [`src/components/pro/`](../src/components/pro/).

---

## 0. Regla de marca #1 — NO inventar datos

Los números salen **solo de fuentes reales**: `market-prices.json`, `mag_inmag_history`,
`mag_prices_detailed`, `usd_blue_history`, conteos del directorio (`getAllProfiles()`),
endpoints internos. Si falta data para algo:

- etiquetalo honesto (`—`, "sin dato", "próximamente"), **o**
- dejalo fuera.

Nunca se fabrica un número, ni siquiera como "ejemplo" o relleno visual. El placeholder
borroso de un gate **no lleva números reales ni inventados** (ver §1).

---

## 1. Patrón de gating (soft-gate, nunca muro duro)

El modelo es **gancho gratis → premium bloqueado**, nunca redirect ni login wall.

1. **El gancho gratis** es data pública/indexable que ya aporta valor por sí sola
   (el valor por cabeza a precio de mercado, el INMAG de hoy, el conteo de remates).
   Vive **fuera** del gate. El usuario free *siempre* se lleva algo real.
2. **La capa premium** es la *decisión*: percentiles en dólares reales, lectura del
   mercado, comparador con medios de pago, histórico completo + CSV, estacionalidad.
   Vive **dentro** de `<ProReveal>`.
3. Al usuario free se le muestra esa capa **borrosa, inerte y `aria-hidden`**, con un
   overlay central: beneficio + CTA `Desbloquear con PRO — ARS $7.900/mes →` que apunta a
   `/upgrade?next=<ruta-actual>` (vuelve acá después de pagar).
4. **Prohibido:** redirigir al free a `/planes`, bloquear con login, o mostrar página en
   blanco. El free ve QUÉ se está perdiendo (forma, no dato), no un portón cerrado.

### El borroso no es data
El contenido borroso detrás del overlay debe ser:
- el render **real pero tapado** (si el dato no es sensible y el blur lo oculta), **o**
- un **skeleton no-real** (barras grises obvias — el default de `<ProReveal>`).

Nunca números reales de PRO legibles, nunca números fabricados. Ante la duda, skeleton.

Referencia viva del patrón:
[`src/app/(terminal)/mercado/vender-ahora/VenderAhoraClient.tsx`](../src/app/(terminal)/mercado/vender-ahora/VenderAhoraClient.tsx).

---

## 2. Principio de utilidad — "decisión, no dato suelto"

Una superficie PRO no entrega un número: entrega una **decisión apoyada**. El free ve el
*qué* (valor actual); el PRO ve el *y entonces* (¿conviene vender hoy o aguantar?). Si una
feature PRO no cambia una decisión del productor/asesor, no es PRO: es ruido. Cada panel
premium debería poder cerrarse con una frase de **lectura** ("Estás en el percentil 72 del
último año en dólares reales: precio alto, momento razonable para vender").

---

## 3. Sistema visual

Tema terminal oscuro. Tokens en `tailwind.config` + `globals.css`. No hardcodear hex salvo
los semánticos de abajo (ya son los tokens).

### Color semántico
| Tono | Hex | Uso |
|---|---|---|
| positive | `#34d399` | a favor / sube / "buen momento" / percentil ≥70 |
| warning | `#fbbf24` | atención / neutral / percentil 40–69 / cuota alta |
| negative | `#f87171` | en contra / baja / percentil <40 / error |
| accent (sky-400) | `#38bdf8` | interactivo, links, foco, marca PRO |
| neutral | `#f4f4f5` / `#a1a1aa` | números/labels sin carga |

### Número-hero
Usar `<HeroNumber>`: label xxs uppercase + número grande `font-terminal tabular-nums` +
sub-línea opcional. Siempre `tabular-nums`. El número llega **pre-formateado** (es.AR),
el componente no calcula nada.

### Barras / sparklines
Usar `<StatPill>` para "label + barra + valor%". Coloreo `percentile` por defecto
(verde/ámbar/rojo según corte 70/40). Barra clamp 0–100.

### Paneles
`terminal-panel` + `terminal-panel-header`. Los paneles PRO se distinguen con borde accent:
`style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}` y header `color: '#38bdf8'`.
`<ProReveal>` ya aplica esto.

### Estados
- **loading**: mientras `useSessionTier().loading` es true **no** se renderiza el CTA de
  upgrade (evita el flash de "desbloqueá" a alguien que resulta ser PRO). `<ProReveal>` ya
  lo maneja: muestra el skeleton borroso sin overlay.
- **empty / sin dato**: texto honesto en `text-zinc-500 text-data` ("Sin operaciones para
  esta categoría hoy."). Nunca un cero inventado ni una barra al azar.
- **error**: caja `border-red-500/30 bg-red-500/5 px-4 py-3 text-data text-red-300`.

### Mobile
Mobile-first. Grids de números: `grid-cols-2` colapsa a stack natural; tablero de stats
full-width. Tap targets ≥ 40px (`py-2`). El overlay de `<ProReveal>` es responsive y centra
el CTA. No tablas que desborden: en mobile, key→value apilado.

---

## 4. Cómo usar `<ProReveal>`

```tsx
'use client'
import { ProReveal, HeroNumber, StatPill } from '@/components/pro'

export default function MiSuperficie({ data }: { data: Resultado }) {
  return (
    <div className="space-y-4">
      {/* GANCHO GRATIS — data pública, fuera del gate */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">Valor actual</div>
        <div className="px-panel py-4">
          <HeroNumber
            label="Por cabeza (ARS)"
            value={`$${data.valorCabeza.toLocaleString('es-AR')}`}
            sub={`$${data.precioKg.toLocaleString('es-AR')}/kg × ${data.kgs} kg`}
          />
        </div>
      </div>

      {/* CAPA PREMIUM — la decisión, dentro del gate */}
      <ProReveal
        from="/mercado/mi-superficie"
        title="¿Conviene vender hoy? · PRO Usuario"
        benefit="Percentiles en dólares reales + lectura del mercado para decidir si vender o aguantar."
      >
        <div className="space-y-3">
          <StatPill label="Percentil últimos 30 días" value={data.p30} />
          <StatPill label="Percentil último año" value={data.p365} />
          <p className="text-zinc-200 text-data pt-2">{data.lectura}</p>
        </div>
      </ProReveal>
    </div>
  )
}
```

- PRO → ve los `children` reales tal cual.
- free/anon → ve un skeleton borroso + overlay con beneficio + CTA a
  `/upgrade?next=/mercado/mi-superficie`.
- Si el render real filtra números PRO que el free no debe ver, pasá un `placeholder`
  no-real explícito en vez de confiar en el blur:
  ```tsx
  <ProReveal from="..." benefit="..." placeholder={<MiSkeletonNoReal />}>
    <ContenidoConDatosSensibles />
  </ProReveal>
  ```

### API exacta

**`<ProReveal>`** (client)
| prop | tipo | req | descripción |
|---|---|---|---|
| `children` | `ReactNode` | sí | contenido premium; verbatim si PRO, borroso/inerte si no |
| `benefit` | `string` | sí | frase de valor en el overlay |
| `from` | `string` | sí | ruta actual → `/upgrade?next=<from>` + clave de analytics |
| `placeholder` | `ReactNode` | no | render no-real para el blur (default: skeleton interno) |
| `title` | `string` | no | header del panel |

**`<HeroNumber>`** (server) — `label`, `value` (pre-formateado), `sub?`, `tone?`
(`neutral`/`positive`/`warning`/`negative`/`accent`), `size?` (clase Tailwind, default
`text-2xl`), `center?`.

**`<StatPill>`** (server) — `label`, `value` (0–100, real), `tone?`
(`percentile` default | `SemanticTone`), `suffix?` (default `%`).

Analytics: `<ProReveal>` emite `pro_prompt_view` / `pro_prompt_click` con
`prompt_variant: 'reveal'` (impresión contada una vez, solo a no-PRO).
