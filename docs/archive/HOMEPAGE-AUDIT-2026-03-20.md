# HOMEPAGE AUDIT — 2026-03-20

**Problema:** 48 páginas en producción, homepage linkea ~10. Features nuevas invisibles.

---

## INVENTARIO: Páginas que NO aparecen en Homepage

### 🔴 CRÍTICO — Alto impacto, fácil de agregar

| Página | URL | Por qué importa |
|--------|-----|-----------------|
| Remates anteriores | /remates/anteriores | SEO "historial remates", usuarios que llegan tarde |
| Remates por mes | /remates/mes/marzo | SEO estacional "remates marzo 2026" |
| Remates por tipo | /remates/tipo/invernada | SEO "remates de invernada argentina" |
| Watchlist/Favoritos | /mi-cuenta/favoritos | **LOCK-IN** — crea stickiness |
| INMAG dedicada | /mercado/inmag | SEO "precio INMAG hoy" |

### 🟡 IMPORTANTE — Buen impacto

| Página | URL | Por qué importa |
|--------|-----|-----------------|
| Remates hoy | /remates/hoy | Urgencia, usuarios diarios |
| Remates mañana | /remates/manana | Planning, usuarios recurrentes |
| Remates semana | /remates/semana | Vista semanal |
| Por ciudad | /remates/ciudad/mercedes | SEO local "remates ganaderos mercedes" |
| Por provincia + tipo | /remates/corrientes/invernada | SEO long-tail |
| Liniers | /mercado/liniers | SEO "precio liniers hoy" |
| Spread analysis | /mercado/spread | Diferenciador vs competencia |

### 🟢 NICE TO HAVE

| Página | URL |
|--------|-----|
| Glosario | /glosario |
| API Docs | /api-docs |
| Metodología | /metodologia |
| Calidad datos | /calidad |

---

## ANÁLISIS POR PERSPECTIVA

### 👁️ VIGIL — Revenue Impact

**Features que generan conversión pero están ocultas:**

1. **Watchlist/Favoritos** — El lock-in más importante
   - Usuario guarda consignatarias → vuelve → convierte a PRO
   - **Acción:** Agregar sección "Guardá tus favoritos" con CTA de registro

2. **Sistema de puntos** — Gamificación → PRO gratis
   - No se menciona en homepage
   - **Acción:** Sección "Ganá PRO gratis completando tu perfil"

3. **Calendario sincronizable** — Sticky feature
   - Está en "Herramientas gratuitas" pero muy abajo
   - **Acción:** Destacar más arriba, es diferenciador

4. **Video catalogs** — PRO value prop
   - No se menciona
   - **Acción:** Agregar a sección PRO

**Prioridad revenue:**
```
1. Watchlist (lock-in)
2. Sistema de puntos (gamificación → upgrade)
3. Calendario sync (stickiness)
4. Video catalogs (PRO value)
```

---

### 🎯 CLOSER — Conversion Funnels

**Funnel PRODUCTOR (ver → registrar → usar):**
```
Homepage → /remates → ??? → Registro
                              ↓
                         Newsletter
```

**Problema:** No hay CTA claro para registro desde /remates
**Fix:** Agregar "Guardá tus remates favoritos" que requiere login

**Funnel CONSIGNATARIA (ver perfil → reclamar → PRO):**
```
Homepage → /consignatarias/[slug] → Reclamar → Verificar → Dashboard → PRO
```

**Problema:** Homepage no explica el valor de reclamar
**Fix:** Sección dedicada "¿Sos consignatario? Reclamá tu perfil gratis"

**Conversion Leaks identificados:**

1. **Hero:** 2 CTAs compiten (remates vs cómo funciona)
2. **Mobile:** Demasiado scroll antes de CTA
3. **PRO section:** Muy abajo (después de FAQ)
4. **Sin urgencia:** No hay scarcity en homepage
5. **Sin social proof:** No testimonios, no logos

---

### 🔍 HUNTER — SEO Opportunities

**Internal links faltantes (authority leak):**

La homepage debería linkear a:

```html
<!-- Remates por tiempo -->
<a href="/remates/hoy">Remates hoy</a>
<a href="/remates/manana">Remates mañana</a>
<a href="/remates/semana">Esta semana</a>
<a href="/remates/anteriores">Histórico</a>

<!-- Remates por tipo -->
<a href="/remates/tipo/invernada">Invernada</a>
<a href="/remates/tipo/cria">Cría</a>
<a href="/remates/tipo/general">General</a>

<!-- Remates por mes (estacional) -->
<a href="/remates/mes/marzo">Marzo 2026</a>
<a href="/remates/mes/abril">Abril 2026</a>

<!-- Mercado -->
<a href="/mercado/inmag">INMAG</a>
<a href="/mercado/liniers">Liniers</a>

<!-- Provincias principales -->
<a href="/remates/buenos-aires">Buenos Aires</a>
<a href="/remates/santa-fe">Santa Fe</a>
<a href="/remates/cordoba">Córdoba</a>
```

**Keywords que se podrían capturar con secciones:**

| Keyword | Vol. estimado | Sección sugerida |
|---------|---------------|------------------|
| "remates ganaderos hoy" | Alto | Quick links "Hoy / Mañana / Semana" |
| "precio hacienda argentina" | Alto | Valuation widget |
| "remates de invernada" | Medio | Links por tipo |
| "INMAG hoy" | Medio | Link destacado a /mercado/inmag |
| "calendario remates 2026" | Medio | Links mensuales |

---

## PROPUESTA: Nueva estructura Homepage

```
1. NAVBAR (igual)

2. HERO
   - Headline + subheadline
   - Stats strip (INMAG, remates, frigoríficos, dólar)
   - CTA: "Ver remates de hoy" + "Buscar mi consignataria"

3. ⭐ NUEVO: Valuation Widget
   "¿Cuánto vale tu hacienda hoy?"
   → Email capture

4. ⭐ NUEVO: Quick Links — Remates
   [Hoy] [Mañana] [Esta semana] [Histórico]
   [Invernada] [Cría] [General] [Especiales]

5. Sección Remates (condensada)

6. ⭐ NUEVO: Watchlist Teaser
   "Seguí tus consignatarias favoritas"
   → CTA registro

7. Sección Frigoríficos (condensada)

8. Sección Mercado (con links a INMAG, Liniers, Spread)

9. ⭐ NUEVO: Para Consignatarias (subir)
   - Reclamar perfil gratis
   - Sistema de puntos
   - Video catalogs
   - Upgrade PRO

10. Comparación antes/después (igual)

11. FAQ (reducir a 5-6 preguntas)

12. Herramientas (igual)

13. Newsletter + Footer
```

---

## IMPLEMENTACIÓN PRIORIZADA

### Sprint 1: Quick Links + Internal Linking (1h)
```tsx
// Después del hero stats
<section className="max-w-7xl mx-auto px-6 py-8">
  <div className="flex flex-wrap gap-3 justify-center">
    <Link href="/remates/hoy" className="...">Hoy</Link>
    <Link href="/remates/manana" className="...">Mañana</Link>
    <Link href="/remates/semana" className="...">Esta semana</Link>
    <Link href="/remates/anteriores" className="...">Histórico</Link>
    <span className="text-zinc-700">|</span>
    <Link href="/remates/tipo/invernada" className="...">Invernada</Link>
    <Link href="/remates/tipo/cria" className="...">Cría</Link>
    <Link href="/remates/tipo/general" className="...">General</Link>
  </div>
</section>
```

### Sprint 2: Valuation Widget (2h)
- Componente ValuationWidget.tsx
- Después de quick links
- Email capture integrado

### Sprint 3: Watchlist Teaser (1h)
```tsx
<section className="...">
  <h2>Seguí tus consignatarias favoritas</h2>
  <p>Guardá remates, recibí alertas, nunca te pierdas una oportunidad.</p>
  <Link href="/mi-cuenta/favoritos">Crear mi watchlist →</Link>
</section>
```

### Sprint 4: Para Consignatarias (subir + expandir) (1h)
- Mover antes de FAQ
- Agregar sistema de puntos
- Agregar video catalogs

### Sprint 5: Mercado links (30min)
- Agregar links a INMAG, Liniers, Spread en sección mercado

---

## MÉTRICAS

| Antes | Después (target) |
|-------|------------------|
| ~10 internal links | 30+ internal links |
| 0 quick navigation | 8 quick links |
| PRO section: posición 11 | PRO section: posición 9 |
| Sin valuation widget | Con widget + email capture |
| Sin watchlist teaser | Con watchlist CTA |

---

*Audit completado 2026-03-20 10:45 ART*
