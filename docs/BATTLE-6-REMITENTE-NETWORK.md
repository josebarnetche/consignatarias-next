# BATTLE #6 — Remitente Network Display

**Fecha:** 2026-03-20
**Prioridad:** -1 (VIGIL Priority Queue)
**Estimación:** ~8 horas
**Impacto:** ALTO — Diferenciador competitivo, nadie más tiene esto

---

## CONCEPTO

MAG's `haciinfo000006` nos da datos a nivel PRODUCTOR que nadie más surfacea:

```
BLASFER S.A. | Gral. Belgrano | 63 cab
LA GLORIA S.C.A. | Laprida | 60 cab
PEREYRA IRAOLA | Ayacucho | 42 cab
```

**Transformación:** Calendario de remates → Inteligencia de mercado ganadero

---

## WHO SAYS "HOLY SHIT"

| Persona | Reacción |
|---------|----------|
| **Productor** | "Veo qué estancias de MI zona usan qué consignataria" |
| **Comprador** | "Sé qué productores entregan lotes de calidad" |
| **VC** | "Mapearon la supply chain ganadera a nivel productor" |

---

## DATA DISPONIBLE

### Fuente: MAG haciinfo000006

Ya lo scrapeamos. Campos:
- `establecimiento`: Nombre del establecimiento/productor
- `localidad`: Ubicación
- `cabezas`: Cantidad de animales
- `categorias`: Breakdown por tipo
- `consignataria_slug`: Quién los comercializa

### Volumen
- ~50-100 remitentes/día en días de remate
- Histórico de semanas disponible
- Geolocalización por localidad

---

## IMPLEMENTACIÓN

### Sprint 1: Panel "Remitentes del día" en perfiles (~3h) ✅ SHIPPED

**Commit:** 7f71ca6 (2026-03-20)

**Implementado:**
- New `/consignatarias/[slug]/remitentes` page with full remitente list
- Enhanced MAG panel renamed to "RED DE REMITENTES" with MAG badge
- Groups by localidad with total cabezas
- Province breakdown badges
- "Ver todos" link when >5 remitentes
- Mobile responsive table view
- SEO: canonical URLs, descriptive metadata

### Sprint 2: Top remitentes en cards de remates (~2h)

**Archivo:** `src/components/remates/RemateCard.tsx`

```tsx
// Agregar debajo de la info básica:
{remate.topRemitentes && (
  <div className="text-xs text-zinc-500">
    🏠 {remate.topRemitentes.slice(0,3).map(r => r.localidad).join(', ')}
  </div>
)}
```

### Sprint 3: Patrones de origen para consignatarias (~3h)

**Archivo:** `src/app/(terminal)/consignatarias/[slug]/remitentes/page.tsx`

Nueva página:
- Mapa de calor por localidad
- Top 10 establecimientos históricos
- Tendencias de volumen
- Filtros por fecha

---

## DATA MODEL

### Tabla existente (verificar)
```sql
-- Si no existe, crear:
CREATE TABLE remitente_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remate_date DATE NOT NULL,
  consignataria_slug TEXT NOT NULL,
  establecimiento TEXT NOT NULL,
  localidad TEXT,
  cabezas INTEGER,
  categorias JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_remitente_consig ON remitente_entries(consignataria_slug);
CREATE INDEX idx_remitente_date ON remitente_entries(remate_date);
```

---

## PRIVACY CONSIDERATIONS

- Datos son públicos (MAG publica esto)
- No mostramos CUIT ni datos fiscales
- Solo nombre comercial + localidad + volumen
- Opt-out disponible si algún productor lo solicita

---

## SUCCESS METRICS

| Métrica | Target |
|---------|--------|
| Tiempo en perfil | +30% |
| Páginas/sesión | +2 |
| Menciones PR/VC | "supply chain mapping" |
| Diferenciación | Único en Argentina |

---

## DEPENDENCIAS

- [ ] Verificar que scraper de MAG está guardando remitentes
- [ ] Confirmar estructura de datos en Supabase
- [ ] José approval para mostrar datos de productores

---

## NOTAS

- deCampoaCampo NO tiene esto (son marketplace cerrado)
- Muu NO tiene esto (solo transacciones)
- Rosgan/CACG NO muestran remitentes públicamente
- **Somos los únicos que podemos hacer esto**

---

*BATTLE #6 creado 2026-03-20 — El diferenciador que nadie tiene*
