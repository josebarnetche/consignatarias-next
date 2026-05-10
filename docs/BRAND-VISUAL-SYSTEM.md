# consignatarias.com.ar — Manual visual del sistema

> **Para producción de comerciales, video, Figma, decks y assets gráficos.**
> Este documento traduce el manual de marca a especificaciones reproducibles.
> Si vas a hacer un comercial, una pieza, un mockup, una landing — empezá acá.

**Versión 1.0** — 10 de mayo de 2026
**Companion**: [`BRAND-MANUAL.md`](./BRAND-MANUAL.md) (la estrategia)
**Aplicación**: After Effects, Figma, Premiere, decks, social, video, print

---

## Quick reference card (para clavar en el monitor)

```
BACKGROUND         #09090b   (zinc-950 — fondo dominante)
TEXT               #fafafa   (zinc-50 — texto principal)
ACCENT             #38bdf8   (sky-400 — el ÚNICO color de marca)
POSITIVE           #10b981   (emerald-500 — variación al alza, en vivo)
NEGATIVE           #f87171   (red-400 — variación a la baja)
WARN               #fbbf24   (amber-400 — alertas, callouts)
PANEL              #18181b   (zinc-900 — cards, paneles)
LINE               #27272a   (zinc-800 — bordes, divisores)
MUTED              #a1a1aa   (zinc-400 — texto secundario)

TIPOGRAFÍA         SF Mono / JetBrains Mono / Cascadia Code (TODA la marca, sin excepciones)

LOGO               consignatarias.com  (siempre lower case, mono semibold)
PULSE              ● 6-12px sky-400 con halo radial sky-400 al 18%

DENSIDAD           Bloomberg Terminal vibes — datos densos, líneas finas, mucho texto
PROHIBIDO          Sans-serif, gradientes vistosos, emojis, fotos de campo, gauchos
```

---

## I. Sistema de color

### Paleta primaria

| Token | Hex | RGB | Uso | NO usar para |
|---|---|---|---|---|
| `--bg` | `#09090b` | `9, 9, 11` | Fondo dominante de todo | Texto |
| `--bg-elev` | `#0c0a0a` | `12, 10, 10` | Fondo elevado (sutilmente más cálido) | — |
| `--panel` | `#18181b` | `24, 24, 27` | Cards, paneles, KPI containers | Fondo página |
| `--panel-2` | `#27272a` | `39, 39, 42` | Paneles secundarios, hover states | — |
| `--text` | `#fafafa` | `250, 250, 250` | Texto principal, números, headers | Fondos |
| `--muted` | `#a1a1aa` | `161, 161, 170` | Texto secundario, párrafos | Headers |
| `--muted-2` | `#71717a` | `113, 113, 122` | Metadatos, footers, labels chiquitos | — |
| `--line` | `#27272a` | `39, 39, 42` | Bordes principales | Backgrounds |
| `--line-d` | `#18181b` | `24, 24, 27` | Bordes sutiles, divisores internos | — |

### Paleta de acento (uso muy disciplinado)

| Token | Hex | RGB | Cuándo |
|---|---|---|---|
| `--accent` | `#38bdf8` | `56, 189, 248` | **El único color de marca**. Links, CTAs, highlights, pulses, sky-400 |
| `--accent-bright` | `#0ea5e9` | `14, 165, 233` | Active state en CTAs (al hacer click) |
| `--positive` | `#10b981` | `16, 185, 129` | "Sube" / "en vivo" / "OK" / variaciones positivas |
| `--negative` | `#f87171` | `248, 113, 113` | "Baja" / "error" / variaciones negativas |
| `--warn` | `#fbbf24` | `251, 191, 36` | Callouts FCV-UBA, advertencias institucionales |

### Reglas duras de color

1. **Sky-400 es el único color de marca.** No agregar púrpura, naranja, magenta, cyan, azul oscuro.
2. **Emerald solo para "positivo / en vivo".** Nunca como fondo de un panel.
3. **Amarillo (warn) solo en callouts académicos.** Una caja amarilla sutil = "esto es contexto crítico" (típicamente cita FCV-UBA o disclosure metodológico).
4. **El fondo SIEMPRE es zinc-950.** Light theme NO existe en la marca. Si una pieza necesita fondo claro, replanteá si está alineada con la marca.
5. **Sin gradientes vistosos.** Solo gradientes muy sutiles:
   - Áreas bajo curva en gráficos: `linear-gradient(180deg, sky-400 18% → 0%)`
   - Halos radiales detrás de elementos hero: `bg-sky-500/5 blur-[120px] rounded-full`
6. **Sin tints rosas/violetas/turquesas.** Si dudás, `--accent` o `--text` o `--muted`.

### Halos / glow (para hero shots de video)

```
Hero halo:        radial-gradient sky-400 al 5% opacity + blur 120px
Pulse halo:       box-shadow: 0 0 0 3px rgba(56,189,248,0.18)
Card hover halo:  border sky-500 + bg sky-500/5 + transition 200ms
```

---

## II. Tipografía

### Fuente única — monospace

```
Stack:
  'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code',
  ui-monospace, Menlo, Consolas, monospace
```

**Regla absoluta**: TODA la tipografía de la marca es monospace. No hay sans, no hay serif. La mono dice "datos / terminal / mercado / Bloomberg" — es la firma tipográfica.

### Pesos disponibles

| Peso | CSS | Uso |
|---|---|---|
| Regular | `400` | Texto base, body, párrafos |
| Medium | `500` | Labels, metadatos, KPIs en sub |
| Semibold | `600` | Títulos cortos, headers de tabla, brand name |
| Bold | `700` | Headlines, KPI values, page titles, display |

### Escala tipográfica (en pixeles, base 16)

| Tamaño | Peso | Uso | Ejemplo |
|---|---|---|---|
| 8-9 px | 500 uppercase tracking 0.06em | Metadatos minúsculos, footers | "ABRIL 2026 · 02" |
| 10-11 px | 400 / 500 | Texto base de body, labels | "El INMAG cerró $4.275" |
| 12-14 px | 600 | Subheaders, links, CTAs | "Recibir Edición 04/26" |
| 16-22 px | 600-700 | Section titles (h2/h3) | "Cómo se calcula el INMAG" |
| 32-48 px | 700 | Page titles | (cierre de mes) |
| 64-96 px | 700 | Display, cover de informe, hero del comercial | "EL CORREDOR" |

### Tracking (letter-spacing)

| Caso | Tracking |
|---|---|
| Texto body normal | `0` (default mono) |
| KPI values grandes | `-0.01em` (sutil, para juntar) |
| Display gigante (cover) | `-0.04em` (apretar fuerte) |
| Labels uppercase | `0.06em` |
| Eyebrow brand mark | `0.18em` a `0.22em` (super espaciado) |

### Reglas tipográficas

1. **Lowercase para producto y URLs**: `consignatarias.com`, `/mercado/inmag`, `/el-corredor`
2. **Mayúsculas SOLO** para:
   - Siglas oficiales: `INMAG`, `MAG`, `RESOL-2018-32`, `USD`, `ARS`, `MAGYP`
   - Display de cover: `EL CORREDOR`
   - Eyebrow super-tracked: `MESA DE HACIENDA · CIERRE MENSUAL`
   - Labels de KPI: `CIERRE INMAG`, `VAR. INTERANUAL`
3. **Numeración argentina**: separador miles `.`, decimales `,`
   - ✅ `$4.275,46`
   - ❌ `$4,275.46`
   - ❌ `$4275`

### Para After Effects / video

Si SF Mono no está disponible en la maquina del director:
- **Free alternative**: JetBrains Mono (descargable gratis, similar al SF Mono)
- **Adobe alternative**: Source Code Pro (en Adobe Fonts)
- **Last resort**: Fira Code, Menlo

**No usar nunca** en la marca: Helvetica, Arial, Inter, Roboto, Times New Roman, Georgia, Avenir, Futura, ningún sans-serif geométrico.

---

## III. Layout y espaciado

### Grid

- **Container max-width**: `1152px` (max-w-6xl en Tailwind) para reportes
- **Wide container**: `1280px` (max-w-7xl) para landing
- **Reading container**: `768px` (max-w-3xl) para texto largo
- **Padding lateral**: `16px` mobile, `24px` desktop

### Spacing tokens

Sistema basado en múltiplos de 4px (Tailwind default).

| Token | Valor | Uso típico |
|---|---|---|
| `gap-1` | 4px | Inline icons + texto |
| `gap-2` | 8px | Items de una lista densa |
| `gap-3` | 12px | KPIs en grid |
| `gap-4` | 16px | Cards en grid |
| `gap-6` | 24px | Secciones internas de un panel |
| `gap-8` | 32px | Entre secciones grandes |
| `gap-12` | 48px | Entre bloques de página |
| `py-16` / `py-24` | 64-96px | Vertical padding entre secciones de landing |

### Border radius

- **Default**: `2px` (casi cuadrado, vibe terminal)
- **Cards mobile-grandes**: `8px` (rounded)
- **CTA buttons**: `2-4px` (no pill, no full-rounded)
- **NUNCA**: `rounded-full` en cards o paneles. Solo en pulses (●).

### Sombras

- **En print/PDF**: ninguna sombra (todo solid + bordes)
- **En web**: `box-shadow: 0 32px 80px rgba(0,0,0,0.5)` SOLO para covers/hero showcases
- **Cards/paneles**: SIN sombras. El borde + el `--panel` ya dan separación.

---

## IV. Componentes visuales

### Brand mark (chrome de página)

```
[ ●  consignatarias.com  ·  Mercado Decision Infrastructure ]

Donde:
  ●  = pulse 6-12px sky-400 + halo radial 3px sky-400/18%
  consignatarias.com = mono 600, --text
  · = sky-400, --accent, márgenes 6-12px
  descriptor = mono 400 uppercase tracking 0.18em, --muted-2
```

Tamaño en distintos contextos:
- **Cover de PDF**: 9-11px
- **Web nav**: 12-14px
- **Hero del comercial**: 32-48px (entrada visual de marca)

### Pulse animation (la firma viva)

```css
.pulse {
  display: inline-block;
  width: 8px; height: 8px;
  background: #38bdf8;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Variante con ping (más vivo) — para landing */
.pulse-ping::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.4);
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ping {
  75%, 100% { transform: scale(2.2); opacity: 0; }
}
```

**Para el comercial**: el pulse es la mejor idea visual de marca para usar como "leitmotiv" — un punto sky que late, aparece en cada momento que algo sucede en el mercado. Loop de 2 segundos.

### KPI card (la unidad básica de datos)

```
┌─────────────────────────────────┐
│ CIERRE INMAG                    │  ← label 9px, --muted-2, uppercase, tracking 0.06em
│                                 │
│ $4.275                          │  ← value 22-44px, --text, peso 700, mono
│                                 │
│ /kg vivo · 29/04/2026           │  ← sub 9px, --muted, regular
└─────────────────────────────────┘

Spec:
  background:    --panel (#18181b)
  border:        1px solid --line (#27272a)
  border-radius: 2px
  padding:       16-24px
  width:         flex / 1fr en grids
```

Variantes:
- **Pequeña** (chrome lateral): 9px label + 22px value
- **Standard** (resumen ejecutivo): 9px label + 32px value
- **Hero** (cover de informe): 11px label + 44-64px value

### CTA button

```
┌─────────────────────────┐
│  Recibir Edición 04/26 → │
└─────────────────────────┘

Spec:
  background:    sky-400 (#38bdf8)
  color:         zinc-950 (#09090b) — INVERSO del default
  font:          mono bold uppercase tracking 0.12em
  font-size:     12-14px
  padding:       12px 24px
  border-radius: 2-4px

Hover:           background sky-300 (#7dd3fc)
Active:          background sky-500 (#0ea5e9)
Transition:      200ms ease-out
```

Critical: el CTA es siempre **sky sobre dark**, nunca al revés. El texto va `zinc-950`, no blanco.

### Chart de líneas (la firma de datos)

```
Spec:
  Línea principal: 1.5px stroke, --accent (#38bdf8)
  Área bajo curva: linear-gradient sky-400 18% → 0%
  Grid: dashed 0.5px, --line, opacity 50%
  Eje Y labels: 9px mono, --muted-2
  Eje X labels: 9px mono, --muted-2
  Marcador final: círculo 3.5px sky-400 + halo 1.5px zinc-950
  Label del último valor: mono 600 sky-400 al lado del marcador
```

**Sin leyendas si no hace falta**. El último punto labeled basta.

### Tabla de datos

```
Spec:
  Border-collapse: collapse
  Border: 1px solid --line entre rows
  Headers: 9px mono 500 uppercase tracking 0.06em, --muted-2
  Body: 10-11px mono 400, --text
  Numeric cells: text-align right + font-variant-numeric tabular-nums
  Hover row: rgba(56, 189, 248, 0.04)
  Padding: 8-10px vertical, 8px horizontal
```

### Callout institucional (FCV-UBA-style)

```
┌─────────────────────────────────────────────────────┐
│ ⚠ COMPOSICIÓN DEL MERCADO                          │
│                                                     │
│ El MAG (ex-Liniers) representa el ~12% del volumen │
│ comercial bovino argentino. 71% opera por venta     │
│ directa sin price discovery público.                │
│                                                     │
│ Fuente: FCV-UBA, Gil/Fornieles/Demarco, 2018.         │
└─────────────────────────────────────────────────────┘

Spec:
  background:        rgba(251, 191, 36, 0.04) — amber al 4%
  border-left:       3px solid amber-400 (#fbbf24)
  padding:           12-16px
  text:              10-11px mono, --muted
  strong inside:     --text
  cite (final):      9px --muted-2 italic-no
```

---

## V. Wordmark y producto

### Forma del wordmark principal

```
consignatarias.com
```

- **Lowercase siempre**, sin mayúsculas
- Mono 600, color `--text` (#fafafa)
- En contexto donde se necesita más peso visual: `consignatarias·com` con el punto en sky-400 (ornamental)
- Nunca añadir `.ar` en wordmark visible (queda implícito en el contexto)

### Producto sub-marca

```
EL CORREDOR  / El Corredor
```

- **MAYÚSCULAS** en cover/display (cover de PDF, hero del comercial)
- **Title case** en chrome de pages (`El Corredor`)
- Mono 700, color `--text`
- Tracking `-0.04em` cuando es display gigante

### Combinación en chrome interna

```
[ ●  consignatarias.com  ·  El Corredor  ·  Lectura del editor ]
```

El producto va entre el brand y la sección. `·` separator en sky-400.

---

## VI. Motion (para web y video)

### Principios

1. **Cero animación decorativa**. Si no aporta info, no se mueve.
2. **Duración estándar**: `200ms ease-out`. Más de eso se siente lento; menos, brusco.
3. **Easing**: `cubic-bezier(0, 0, 0.2, 1)` (ease-out) para entrada de elementos
4. **Pulse**: `2s` loop, infinite (ya specd arriba)
5. **Sin parallax. Sin scroll-jacking. Sin tilt. Sin morphing.**

### Recetas concretas para video

**A. Marca de entrada (intro 2-3s)**
```
0.0s  Fondo zinc-950 sólido
0.2s  Pulse sky-400 fade-in en centro (escala 0.8 → 1, opacity 0 → 1)
0.6s  Wordmark "consignatarias.com" type-in (mono semibold, --text)
       efecto "cursor": una barra vertical sky-400 que va apareciendo letra a letra
1.2s  Pulse mantiene loop 2s
2.0s  Sub-tagline "Mercado Decision Infrastructure" fade-in en --muted-2 uppercase tracking
2.8s  Cierre (corte limpio) o transición a contenido
```

**B. Animated counter (KPIs subiendo)**
```
Duración: 2800ms
Easing: ease-out con requestAnimationFrame
Formato: locale es-AR ($ + tabular-nums)
Ej: $0 → $4.275 en 2.8s, NO en saltos de 100s
```

**C. Chart drawing (entrada de gráfico)**
```
Duración: 1200ms
Path: stroke-dasharray + dashoffset animados de 100% a 0%
Easing: ease-out
Después: marcador final aparece con scale 0.5 → 1 + fade-in (200ms)
```

**D. Card hover / focus**
```
Border: --line → --accent, 200ms
Background: --panel → --panel + sky/5%, 200ms
```

### Sound design (si el comercial es con audio)

- **No música épica.** Nada de strings/épico.
- **Sí**: clicks de teclado, blips de terminal, beeps minimalistas tipo Bloomberg/Reuters.
- **Si necesitás música**: ambient minimalista (Brian Eno, Nils Frahm), o silencio + sound design puro.
- **Ritmo**: data-driven. Cada cierre del INMAG = un click. Cada nueva edición = un beep.
- **Voz**: si hay narración, en argentino neutro institucional. La voz de un economista en una columna. NO la del community manager.

---

## VII. Iconografía

### Reglas

1. **Solo iconos lineales, stroke 1.5px**. No filled, no duotone.
2. **Color**: `currentColor` (hereda del texto que lo rodea).
3. **Tamaño**: 14-18px, alineado al baseline del texto.
4. **Solo cuando son funcionales** (↑↓ variación, ⚠ alerta, ☞ CTA, → next, ← prev, × close).
5. **Sin iconos decorativos** que no agreguen función.

### Librerías permitidas

- **lucide-react** (preferida, vector limpio)
- **Heroicons** (alternativa, también linear)
- **Custom SVG** si lucide/heroicons no tiene lo que se necesita, mantener el stroke 1.5px

### Símbolos especiales en mono

```
●  pulse activo (sky-400)
○  pulse inactivo
→  next / continúa
←  back
·  separador (sky-400 o muted-2 según contexto)
↑  variación al alza (positive)
↓  variación a la baja (negative)
—  null / sin dato (NO usar 0 ni "n/a")
```

### Sin emojis (regla dura)

**No usar emojis** en ningún PDF, web, email, o pieza institucional. Único permitido: `📈` o `🐂` en redes sociales si la pieza es muy informal — y solo uno por post, nunca decorativo.

---

## VIII. Fotografía / imagery

### Reglas duras

1. **Cero stock photos de campo.** Nada de gauchos, atardeceres, banderas, paisajes.
2. **Cero fotos de animales.** Nada de novillos, vacas, terneros en imagen.
3. **Cero retratos de fundadores en lugares importantes.** Sin "vista al horizonte".

### Qué SÍ usar como imagery

- **Charts**. El gráfico ES la imagen. Si una sección necesita un visual, es un chart.
- **Datos tabulares estilizados**. Una matriz de números bien tipografiada es imagen suficiente.
- **Renders 3D minimalistas en zinc + sky**. Si necesitás textura, esos sí — wireframes, simulaciones de mercado, holograms tipo finance/AI.
- **Capturas de UI propias**. La página de `/mercado/inmag` ES la mejor pieza visual de la marca.

### Para el comercial específico

**Lo que filmaríamos / generaríamos**:
- Pantallas con la UI corriendo (zoom in al cierre del INMAG cambiando)
- Macro shots del PDF imprimiéndose
- Sombras de tickers con nombres de consignatarias subiendo
- Closeup de una pizarra de remate-feria (única excepción a "sin imagen de campo" — porque la pizarra es el dato)
- Manos tipeando en teclado mecánico (fragmento, sin rostro)

**Lo que NO filmaríamos**:
- Productores caminando por el campo
- Animales en corral con luz dorada
- Camionetas blancas en ruta interminable
- Founders en oficina apuntando algo
- Pantallas con gráficos genéricos de stock images

---

## IX. Densidad y composición

### Principio

> La página de un reporte de mercado debe verse **llena pero legible**. Como una pantalla de Bloomberg.

Esto se traduce en:
- Mucho texto, pero bien tipografiado (mono ayuda a la legibilidad densa)
- Líneas finas (1px) en lugar de borders gruesos
- Spacing apretado (8-16px) en vez de generoso
- Información jerarquizada por size + weight, no por color

### Anti-patrones (NO usar)

- Mucho whitespace estilo SaaS landing (Notion, Linear) — eso es minimalismo distinto, no es nuestro
- Grandes héroes con un solo dato gigante y nada más — necesitamos al menos 4-6 datos comparables
- Cards con padding 32-48px — eso es para wellness apps, no para mercados
- Iconos grandes 32-48px decorativos — los nuestros son 14-18px funcionales

### Composición de un screen/frame

| Tier | Contenido | Tipografía |
|---|---|---|
| Top | Brand mark + chrome (status, edición, fecha) | 9-11px mono |
| Hero | Display giganta (KPI o título) | 32-96px mono bold |
| Sub-hero | Eyebrow + tagline (1 línea) | 11-14px mono |
| Datos | Grid de KPI cards o tabla | 10-22px mono |
| Footer | Metadata + CTA | 9-12px mono |

---

## X. Backgrounds y atmósfera

### Fondo dominante

Siempre `#09090b` (zinc-950). Solid. Sin texturas, sin noise, sin nada.

### Halos atmosféricos (uso en hero shots / video)

Para crear "aire" en escenas hero o landing:

```css
/* Halo arriba-centro */
.halo-top {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: rgba(56, 189, 248, 0.05);  /* sky-400 al 5% */
  filter: blur(120px);
  border-radius: 9999px;
  pointer-events: none;
}

/* Halo lateral derecha */
.halo-right {
  position: absolute;
  top: 0;
  right: 0;
  width: 256px;
  height: 256px;
  background: rgba(56, 189, 248, 0.05);
  filter: blur(48px);
  border-radius: 9999px;
  transform: translate(50%, -50%);
  pointer-events: none;
}
```

**Regla**: máximo 2 halos por escena. Más es ruido visual.

### Gradientes permitidos

- **Hero gradient sutil**: `linear-gradient(180deg, rgba(56, 189, 248, 0.05), transparent)`
- **Área bajo chart**: `linear-gradient(180deg, rgba(56, 189, 248, 0.18), transparent)`
- **Card especial**: `linear-gradient(135deg, rgba(56, 189, 248, 0.05), #18181b, #18181b)` para cards "destacadas" tipo CTA blocks

**Prohibidos**: gradientes purpura→cyan, naranja→pink, "modo IA". Si un gradiente parece de Midjourney trending, no es nuestro.

---

## XI. Recetas para After Effects

### Setup de proyecto AE

```
Comp settings:
  Resolution:     1920×1080 (HD) o 3840×2160 (4K)
  Frame rate:     30 fps (web) o 24 fps (cine)
  Background:     #09090b (zinc-950)
  Color depth:    16-bit (para gradients limpios)
  Color profile:  sRGB
```

### Color palette en AE (importar como solids)

```
Background        → solid #09090b
Panel             → solid #18181b
Accent            → solid #38bdf8
Positive          → solid #10b981
Negative          → solid #f87171
Warn              → solid #fbbf24
Text              → solid #fafafa
Muted             → solid #a1a1aa
Muted-2           → solid #71717a
Line              → solid #27272a
```

### Tipografía en AE

- Importar **JetBrains Mono** (free) o **SF Mono** (si está en el sistema)
- Tracking en AE: dividir el em-tracking CSS por 1000 (ej. 0.06em → 60 en AE)
- Pesos: Bold (700), SemiBold (600), Medium (500), Regular (400)

### Animación de KPI counter

```javascript
// Expression en AE para animar un número de A a B en N segundos
// Pegá esto en la propiedad "Source Text"

start = 0;
end = 4275;
duration = 2.8;
t = time - inPoint;
n = ease(t, 0, duration, start, end);

// Formato AR ($X.XXX)
n = Math.round(n);
formatted = "$" + n.toLocaleString('es-AR');
formatted;
```

### Animación de pulse (loop infinito)

```javascript
// Expression en propiedad "Opacity"
freq = 0.5; // 2s loop = 0.5 Hz
amp = 0.6;
base = 1;
base - amp + amp * (Math.sin(time * 2 * Math.PI * freq) * 0.5 + 0.5);
```

### Chart line drawing

Usar **Trim Paths** en una shape layer:
- Inicio: `End = 0%`
- Fin: `End = 100%`
- Easing: ease-out (Keyframe Assistant > Easy Ease)
- Duración: 1200ms

---

## XII. Recetas para Figma

### Local styles a configurar

```
COLORS (sólidos):
  bg/primary           #09090b
  bg/elev              #0c0a0a
  panel/default        #18181b
  panel/elevated       #27272a
  text/primary         #fafafa
  text/muted           #a1a1aa
  text/muted-2         #71717a
  accent/sky           #38bdf8
  accent/sky-bright    #0ea5e9
  semantic/positive    #10b981
  semantic/negative    #f87171
  semantic/warn        #fbbf24
  border/default       #27272a
  border/faint         #18181b

EFFECTS:
  pulse-glow:          drop shadow 0/0/0/3px sky-400/18%
  hero-halo:           background blur 120px sky-400/5%

TEXT STYLES:
  display/96-700       96px / 92% / -4% / Bold mono
  display/48-700       48px / 95% / -2% / Bold mono
  heading/22-700       22px / 110% / -1% / Bold mono
  heading/16-600       16px / 130% / Semibold mono
  body/12-500          12px / 145% / Medium mono
  body/11-400          11px / 145% / Regular mono
  caption/10-500       10px / 130% / Medium mono uppercase tracking 6%
  caption/9-500        9px / 130% / Medium mono uppercase tracking 6%
  eyebrow/9-600        9px / 100% / Semibold mono uppercase tracking 22%
```

### Components base a crear

1. **PulseDot** (8px sky-400 + glow + animación)
2. **BrandMark** (pulse + wordmark + descriptor)
3. **KPICard** (label / value / sub) en 3 tamaños (sm, md, lg)
4. **ButtonPrimary** (sky bg + zinc-950 text)
5. **CalloutInstitutional** (border-left amber + bg amber/4%)
6. **ChromeHeader** (branded chrome de página de PDF/web)
7. **DataTable** (header + rows + hover)

---

## XIII. Para el director del comercial — directrices específicas

### Concepto general

El comercial debe transmitir: **"hay un mercado en silencio, nosotros lo hacemos legible"**.

No es un comercial de campo argentino. Es un comercial de Bloomberg con tema agro. Como si Stratechery o The Economist hicieran un anuncio para un servicio del agro.

### Pacing

- **Nunca lento de más**. Cortes cada 2-4 segundos máximo.
- **Sin "respirar entre planos"**. Cada frame contiene info.
- **No fade-to-black entre escenas**. Cortes secos o cross-fade rápido (200ms).

### Estructura sugerida (15s)

```
0:00 - 0:02  Pulse + brand mark aparece
0:02 - 0:05  Tres KPIs animados subiendo en cascada (counter animation)
0:05 - 0:08  Closeup de página del PDF abriéndose (página 5 — la del 71% opaco con el SVG)
0:08 - 0:12  Cover del PDF "EL CORREDOR · ABRIL 2026" con KPIs flotando
0:12 - 0:15  CTA: "consignatarias.com/el-corredor — PDF gratis con email"
```

### Tipografía en pantalla

- Display: JetBrains Mono Bold 96-128px
- Body en pantalla: 24-32px (porque la TV tiene menos resolución que la pantalla del usuario)
- **Nunca** texto menor a 24px en video — ilegible en mobile.

### Color en video

- Fondo: zinc-950 puro (no negro, hay diferencia: zinc-950 tiene un sutil tinte cálido)
- Sky-400 puede leer "frío" en TV — agregar vignette sutil amber al fondo si la cámara/render lo necesita
- Verde positivo: usar emerald-500 NO un verde cualquiera
- Brillos: NO bloom excesivo. La marca es nítida, no glamorosa.

### Audio del comercial

Recomendación de tracks (no son obligatorios, son referencia de mood):
- Brian Eno — "Music for Airports"
- Nils Frahm — "Says"
- Burial — "Untrue" (ambient sections)
- O **silencio + sound design**: blips de terminal, click de teclado mecánico, beep agudo en cada KPI

Si hay voz en off:
- Voz argentina neutra, NO porteña marcada
- Tono: economista que escribe en La Nación Campo. Sin épica. Sin emoción.
- Volumen: medio bajo, deja que la imagen lleve.
- Línea final típica: *"Lo que el mercado decide, nosotros lo escribimos. Cada mes, en tu inbox. consignatarias.com."*

### Logo final

En el último frame:

```
●  consignatarias.com
   Mercado Decision Infrastructure
```

Mantener el pulse vivo durante 2-3 segundos extra después del corte de la voz. La marca queda latiendo.

---

## XIV. Assets disponibles (referencia para producción)

Todos los assets de El Corredor (referencia para el director):

```
public/el-corredor/
├── abril-2026.pdf                  ← El PDF de 12 páginas, ejemplo de tipografía + layout
├── cover-abril-2026.png            ← 768×1024 cover preview, perfecto para "filmar el PDF"
├── og-abril-2026.png               ← 1200×630 frame de OG, listo para usar
├── square-abril-2026.png           ← 1080×1080 cuadrado, listo para social
└── manifest.json                   ← (data, no usar)

scripts/monthly-report/output/
└── informe-2026-04.html             ← Source HTML del PDF — abrirlo en el browser
                                       muestra cómo respira la tipografía
```

### Pages del PDF que más vibe de marca tienen (para referencia visual)

- **Página 1 (Cover)**: el display "EL CORREDOR" en mono 96px es la pieza más cinematográfica
- **Página 4 (INMAG en USD)**: el chart trailing 12m en sky-400 es el chart icónico de la marca
- **Página 5 (Lo que el INMAG no ve)**: el SVG sankey 71/12/9 es la pieza institucional clave
- **Página 11 (Tesis del mes)**: catalizadores en grid + escenarios en tabla — ejemplo de "Bloomberg vibes"

---

## XV. Don'ts visuales (para todos)

- ❌ Sans-serif (Helvetica, Arial, Roboto, Inter, etc.)
- ❌ Light theme / fondo blanco
- ❌ Gradientes púrpura→cyan o cualquier "modo IA"
- ❌ Emojis decorativos
- ❌ Fotos de campo, animales, gauchos, atardeceres
- ❌ Iconos filled o duotone
- ❌ Texto en mayúsculas largas (más de 6 palabras)
- ❌ Números formato US (`$4,275.46`)
- ❌ Animaciones excesivas (rebote, parallax, tilt)
- ❌ Bordes redondeados grandes (>8px)
- ❌ Sombras drop-shadow generosas
- ❌ Halos de cualquier color que no sea sky-400
- ❌ Hashtags decorativos o "#agro #argentina"

---

## XVI. Checklist final antes de entregar

Antes de entregar cualquier pieza visual al cliente / al equipo:

- [ ] ¿El fondo es `#09090b`?
- [ ] ¿La tipografía es 100% mono?
- [ ] ¿El acento es solo sky-400 (`#38bdf8`)?
- [ ] ¿Los números están en formato AR (con `.` y `,`)?
- [ ] ¿Hay al menos un pulse vivo en algún lado?
- [ ] ¿Cero emojis decorativos?
- [ ] ¿Cero fotos de campo / animales / gauchos?
- [ ] ¿La densidad de información se siente "Bloomberg" y no "wellness app"?
- [ ] ¿El wordmark `consignatarias.com` está en lower case?
- [ ] ¿El producto `El Corredor` está mayúscula correcta según contexto?

Si cualquier respuesta es "no", se reescribe.

---

## XVII. Historial

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-10 | Versión inicial. Owner: Memola Medios SAS. Aplicación: El Corredor + producto consignatarias.com. |

---

*Companion del [Brand Manual estratégico](./BRAND-MANUAL.md). Este documento es para producción — el otro es para decisiones. Si hay conflicto, gana este para visual y el estratégico para voz.*
