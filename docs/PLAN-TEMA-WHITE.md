# Plan: tema WHITE por defecto, con switch que recuerda la elección

**Fecha:** 01-10-2026 · **Objetivo:** que el sitio abra en claro, que el usuario pueda pasar a la terminal oscura, que el navegador recuerde su elección y que el cambio alcance **todo** el estilo.

---

## 1. Lo que hay hoy (medido, no supuesto)

| Dato | Valor |
|---|---:|
| Archivos `.tsx` | 470 |
| Archivos con color oscuro escrito a mano | **360** |
| `text-zinc-N` | 6.295 |
| `bg-zinc-N` / `border-zinc-N` | 699 / 719 |
| `text-white` / `bg-black` | 425 / 58 |
| `terminal-*` (token de Tailwind) | 1.770 |
| `text-accent` y familia semántica | 1.707 |
| Variantes `dark:` | **0** |

**Traducción:** no hay sistema de temas. Hay dos capas de color:
- **Capa buena (≈3.500 usos):** `terminal-bg`, `terminal-panel`, `terminal-border`, `accent`, `positive`, `negative`, `warning`, `live`. Son nombres definidos en `tailwind.config.js` con un hex fijo.
- **Capa cruda (≈8.200 usos):** `zinc-N`, `white`, `black` escritos directamente en los componentes.

Cambiar la capa buena es trivial. La capa cruda es el trabajo real, y es la que decide si el plan cuesta una semana o un mes.

---

## 2. La decisión que hace barato el proyecto: invertir la rampa, no reescribir las clases

No hay que tocar 8.200 clases. Hay que cambiar **qué color significa cada número**.

En el código, `zinc` se usa semánticamente y siempre en el mismo sentido: número bajo = texto claro, número alto = fondo oscuro. Si la paleta `zinc` pasa a ser variables CSS y en el tema claro se **invierte la escala**, cada clase sigue significando lo mismo:

| Clase en el código | Significado | Tema oscuro | Tema claro (invertido) |
|---|---|---|---|
| `text-zinc-300` | texto secundario | gris claro | gris oscuro |
| `text-zinc-500` | texto apagado | gris medio | gris medio |
| `bg-zinc-900` | fondo de panel | casi negro | casi blanco |
| `border-zinc-800` | borde sutil | gris oscuro | gris claro |
| `text-white` | texto fuerte | blanco | casi negro |
| `bg-black` | fondo base | negro | blanco |

El mapeo es espejo: 50↔950, 100↔900, 200↔800, 300↔700, 400↔600, 500↔500.

**Cómo se implementa:** en `tailwind.config.js`, `zinc`, `white` y `black` dejan de ser hex y pasan a `rgb(var(--z-300) / <alpha-value>)`. El formato con canales sueltos es obligatorio para que sigan funcionando los cientos de `bg-zinc-900/30` con transparencia.

---

## 3. Los cuatro cambios de infraestructura

1. **`globals.css`** define los dos juegos de variables:
   - `:root` (tema claro, el default) con la rampa invertida.
   - `[data-theme="dark"]` con la rampa original, idéntica a los hex de hoy. El tema oscuro queda pixel a pixel como está.
2. **`tailwind.config.js`**: `zinc`, `white`, `black`, `terminal.*` y los semánticos (`accent`, `positive`, `negative`, `warning`, `live`) pasan a leer variables.
3. **Script en el `<head>`, antes de pintar:** lee `localStorage.theme` y, si dice `dark`, pone `data-theme="dark"` en `<html>`. Como el default es claro y el HTML se sirve claro, no hay parpadeo para la mayoría; quien eligió oscuro no ve el flash blanco porque el script corre antes del primer pintado.
4. **Un botón de cambio** en el header y en el pie: escribe `localStorage.theme` y alterna el atributo. Tres líneas de estado, sin librería.

Con esto, el 100 % del color del sitio cambia sin tocar un solo componente.

---

## 4. Lo que la inversión NO resuelve (la lista corta, y es el trabajo fino)

| Caso | Por qué falla | Qué se hace |
|---|---|---|
| **Acento `sky-400` sobre blanco** | Contraste ~1,9:1, ilegible. Falla accesibilidad | En claro el acento baja a `sky-600`. Lo mismo `positive` y `negative`: de `-400` a `-600` |
| **Gráficos y SVG** | Leen hex de JavaScript (`SEMANTIC_HEX` en `tokens.ts`), no clases CSS | Un segundo mapa por tema, o leer la variable CSS en runtime. Es un archivo y sus consumidores |
| **Sombras, brillos y `terminal-panel`** | El glow de terminal sobre blanco se ve sucio | Sombra propia por tema en el CSS del panel |
| **Overlays `bg-black/50`** | Un velo negro sobre fondo claro sigue siendo correcto para modales | Se revisan uno por uno: la mayoría quedan |
| **Imágenes con fondo oscuro** | Logos, isotipo, hero-pampa, íconos del universo gráfico | Variante clara de los que lo necesiten, o fondo de contención |
| **Mapas, iframes y embeds** | Tienen estilo propio | Se dejan o se les pasa el tema si lo aceptan |
| **Mails y las imágenes OG** | Se generan en el servidor, no tienen navegador ni `localStorage` | **No cambian.** Siguen con su paleta actual. Es correcto: un mail no tiene tema |

---

## 5. Orden de trabajo

**Fase 1 — infraestructura (medio día).** Los cuatro cambios de la sección 3 más el botón. Al terminar, el sitio entero ya alterna. Se ve feo en algunos lugares, pero alterna.

**Fase 2 — la lista corta (uno a dos días).** Los siete casos de la sección 4. Acá está el grueso del tiempo real.

**Fase 3 — barrido visual (uno a dos días).** Recorrer en claro las 15 plantillas que cubren el sitio: home, mercado, arrendamiento, precios por categoría, remates, listado y ficha de consignataria, listado y ficha de frigorífico, campos, guías, informes, planes, cuenta, admin. Capturar en claro y oscuro, comparar, corregir.

**Fase 4 — guardarraíl.** Una prueba que falle si alguien vuelve a escribir un hex de color en un componente, y una línea en `CLAUDE.md`: el color se escribe con tokens, nunca con un hex.

---

## 6. Decisiones de Jose (tomadas el 01-10-2026)

1. **Fondo: blanco puro** (`#ffffff`).
2. **Acento en claro: azul oscuro.** Reemplaza al cielo `sky-400`, que sobre blanco es ilegible.
3. **Imágenes (logos, isotipo, hero, íconos con fondo oscuro): se adaptan después.** No bloquean el lanzamiento del tema.
4. Pendientes menores, se resuelven en la implementación: ubicación del botón (recomendado: header) y si el default claro manda siempre por encima de la preferencia del sistema operativo (recomendado: sí).

## 6b. Decisiones originales planteadas

1. **El blanco.** ¿Blanco puro o un hueso tipo `#fafaf9`? El hueso cansa menos la vista y combina con el sistema de marca. Recomiendo hueso.
2. **El acento en claro.** El cielo de marca pierde contraste. ¿Bajamos a `sky-600` (sigue leyéndose como el mismo celeste, más oscuro) o se elige otro acento para el tema claro?
3. **Dónde va el botón.** Header siempre visible, o solo en el pie y en cuenta.
4. **Qué pasa con quien no eligió nada.** Default blanco siempre, o respetar la preferencia del sistema operativo si el visitante tiene el equipo en modo oscuro. Recomiendo blanco siempre: es la decisión del negocio, y el que quiera oscuro lo elige una vez.

---

## 7. Riesgo principal

El tema oscuro de hoy es la identidad del producto y está afinado. La inversión automática lo deja intacto porque sus variables son los hex actuales. El riesgo está del otro lado: que el claro salga como "el oscuro con los colores dados vuelta" y se vea barato. Eso se evita en la Fase 3, mirando pantalla por pantalla, no en la Fase 1.
