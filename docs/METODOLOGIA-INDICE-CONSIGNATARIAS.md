# Metodología del Índice de Precios Consignatarias

**Versión:** 1.0 (Borrador)  
**Fecha:** Marzo 2026  
**Autor:** Memola Medios S.A.S.

---

## 1. Introducción

El Índice de Precios Consignatarias (IPC) es un indicador de precios de hacienda en pie calculado a partir de datos observados en remates públicos de consignatarias argentinas.

### 1.1 Objetivo

Proveer una referencia de precios del mercado ganadero argentino con:
- Transparencia metodológica
- Trazabilidad de fuentes
- Actualización regular
- Cobertura geográfica representativa

### 1.2 Alcance

- **Geográfico:** Argentina (foco inicial en NEA/Litoral)
- **Especies:** Bovinos
- **Fuente:** Remates públicos de consignatarias asociadas
- **Frecuencia:** Actualización diaria con cierre semanal

---

## 2. Fuentes de Datos

### 2.1 Fuente Primaria: INMAG (MAG)

Los precios base provienen del Mercado de Invernada de Mercado Agroganadero (INMAG), fuente oficial del sector.

- **Categorías reportadas:** Novillo, Ternero, Vaquillona, Vaca, Toro
- **Unidad:** Pesos argentinos por kilogramo vivo (ARS/kg)
- **Frecuencia:** Diaria (días hábiles)
- **Método de recolección:** Scraping automatizado + validación manual

### 2.2 Fuentes Secundarias (En desarrollo)

- **Remates directos:** Datos de precios realizados en remates de consignatarias asociadas
- **SENASA SIO:** Datos de movimientos por provincia y categoría
- **Bolsas de cereales:** Precios de maíz (para cálculo de spreads)

### 2.3 Validación de Datos

Cada dato ingresado pasa por:
1. Validación de rango (precio dentro de límites históricos ±3σ)
2. Comparación con día anterior (alertas si variación >10%)
3. Cruce con fuentes secundarias (cuando disponible)

---

## 3. Cálculo del Índice

### 3.1 Índice General

El índice general se calcula como promedio ponderado de categorías:

```
IPC = Σ (Precio_categoria × Peso_categoria) / Σ Peso_categoria
```

**Ponderaciones actuales (basadas en composición típica de faena):**
| Categoría | Ponderación |
|-----------|-------------|
| Novillo | 35% |
| Ternero | 25% |
| Vaquillona | 20% |
| Vaca | 15% |
| Toro | 5% |

### 3.2 VWAP (Volume-Weighted Average Price)

Cuando datos de volumen están disponibles:

```
VWAP = Σ (Precio × Volumen) / Σ Volumen
```

**Estado:** En implementación. Requiere datos de volumen (cabezas) por remate.

### 3.3 Spread Maíz-Novillo

Indicador de rentabilidad del engorde:

```
Spread = Precio_novillo_kg / Precio_maiz_ton × 1000
```

Valores de referencia:
- >15: Favorable para engorde
- 10-15: Neutro
- <10: Desfavorable (maíz caro relativo a hacienda)

---

## 4. Cobertura y Representatividad

### 4.1 Cobertura Geográfica Actual

| Provincia | Consignatarias | Remates/mes | Estado |
|-----------|----------------|-------------|--------|
| Corrientes | 25 | ~60 | ✅ Activo |
| Santa Fe | 18 | ~45 | ✅ Activo |
| Entre Ríos | 12 | ~30 | ✅ Activo |
| Chaco | 8 | ~20 | ✅ Activo |
| Buenos Aires | 5 | ~15 | 🔄 Expandiendo |

### 4.2 Limitaciones Conocidas

1. **Sesgo regional:** Mayor cobertura en NEA/Litoral vs. Pampa Húmeda
2. **Datos de volumen:** Incompletos en ~70% de remates
3. **Precios realizados:** Mayoría son precios de referencia, no transaccionados
4. **Latencia:** Datos T+1 (día siguiente al remate)

---

## 5. Publicación y Acceso

### 5.1 Canales de Publicación

- **Web:** https://www.consignatarias.com.ar/mercado/inmag
- **API:** https://www.consignatarias.com.ar/api/market/history
- **Newsletter:** Semanal (viernes)

### 5.2 Niveles de Acceso

| Dato | Acceso |
|------|--------|
| Índice general diario | Público |
| Precios por categoría | Público |
| Histórico 30 días | Público |
| Histórico completo | API (libre) |
| Datos por provincia | PRO |
| Datos por consignataria | PRO |
| Exportación bulk | PRO |

---

## 6. Gobernanza

### 6.1 Responsable

**Memola Medios S.A.S.**  
CUIT: 30-71863222-2  
Email: agro@memola.com.ar

### 6.2 Revisión Metodológica

- Revisión trimestral de ponderaciones
- Actualización anual de metodología
- Publicación de cambios con 30 días de anticipación

### 6.3 Contacto

Para consultas metodológicas:  
📧 agro@memola.com.ar  
📱 WhatsApp: +54 9 3773 418130

---

## 7. Roadmap Metodológico

### Etapa 1: Actual (2026 Q1)
- ✅ Índice basado en INMAG
- ✅ 365 días de histórico
- ✅ API pública
- ✅ Spread maíz-novillo

### Etapa 2: Q2 2026
- ⏳ Volumen (cabezas) en cálculo
- ⏳ VWAP cuando datos disponibles
- ⏳ Integración SENASA SIO

### Etapa 3: Q3-Q4 2026
- ⏳ Precios observados por remate
- ⏳ Índices regionales (NEA, Pampa, Patagonia)
- ⏳ Auditoría externa metodológica

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-03-18 | Documento inicial (borrador) |

---

*Este documento establece la metodología actual del Índice de Precios Consignatarias. Está sujeto a revisión y mejora continua.*
