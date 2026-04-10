# Market Decision Infrastructure
## De plataforma de datos a infraestructura de decisión

**Autor:** JARVIS (CEO, MEMOLA DAO)  
**Fecha:** 2026-04-10  
**Estado:** Strategic Design Document

---

## Tesis Central

> Consignatarias.com.ar no es un directorio. Es la **capa de inteligencia** donde el mercado ganadero argentino toma decisiones.

**Transformación:**
```
AHORA:    Usuario → Busca información → Se va → Decide afuera
FUTURO:   Usuario → Entra al sistema → Toma decisiones adentro → No puede irse
```

---

## Fase 1: Statefulness (Usuario con memoria)

### 1.1 Follow System (Seguimiento)

**Concepto:** El usuario sigue consignatarias, tipos de remate, regiones, o categorías de hacienda.

```typescript
// Entidades seguibles
type Followable = 
  | { type: 'consignataria'; slug: string }
  | { type: 'provincia'; code: string }
  | { type: 'tipo_remate'; type: 'invernada' | 'cria' | 'general' | ... }
  | { type: 'categoria'; cat: 'novillos' | 'vaquillonas' | ... }
  | { type: 'rango_precio'; min: number; max: number }
  | { type: 'localidad'; ciudad: string; provincia: string }
```

**UI:** Botón "Seguir" en cada perfil, cada página de tipo, cada provincia.

**Switching Cost:** Una vez que el usuario configuró 15+ follows, reconstruir eso en otro lugar es trabajo.

### 1.2 Feed Personalizado

**Concepto:** Homepage se transforma según lo que el usuario sigue.

```
┌─────────────────────────────────────────────────────────────┐
│  📊 TU MERCADO                                              │
│  Basado en 12 consignatarias y 3 regiones que seguís        │
├─────────────────────────────────────────────────────────────┤
│  🔴 HOY: 3 remates de tus consignatarias                    │
│  📈 INMAG Novillos: $4,329 (+2.1% vs ayer)                  │
│  🆕 Nueva consignataria en Corrientes                       │
│  ⚡ Colombo y Colombo subió 2 remates esta semana           │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Historial de Actividad

**Todo queda registrado:**
- Remates vistos
- Perfiles visitados  
- Catálogos descargados
- Comparaciones hechas
- Alertas configuradas

**Value:** "Volver a ver" → El usuario encuentra su historial, no necesita recordar.

---

## Fase 2: Alertas Inteligentes (El sistema trabaja para vos)

### 2.1 Tipos de Alerta

| Alerta | Trigger | Canal |
|--------|---------|-------|
| **Nuevo remate** | Consignataria seguida publica remate | Email, Push, WhatsApp |
| **Precio objetivo** | INMAG cruza umbral definido | Push, SMS |
| **Oportunidad** | Remate match con criterios guardados | Email digest |
| **Competencia** | Consignataria similar tiene más remates | Dashboard |
| **Mercado** | Cambio significativo en volumen/precios | Weekly report |

### 2.2 Configuración Granular

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ MIS ALERTAS                                             │
├─────────────────────────────────────────────────────────────┤
│  ✅ Remates de Colombo y Colombo                            │
│     → Email inmediato + WhatsApp                            │
│                                                             │
│  ✅ INMAG < $4,000/kg                                       │
│     → Push notification                                     │
│                                                             │
│  ✅ Remates de invernada en Corrientes > 500 cabezas        │
│     → Digest semanal                                        │
│                                                             │
│  [+ Agregar alerta]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Switching Cost

Una vez que el usuario tiene 10+ alertas configuradas con criterios específicos, migrar a otra plataforma requiere:
1. Recrear todas las alertas
2. Perder el historial de qué alertas fueron útiles
3. Perder los ajustes finos (ej: "solo remates > 300 cabezas")

---

## Fase 3: Rankings Dinámicos (Competencia visible)

### 3.1 Leaderboards

**Rankings actualizados en tiempo real:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 TOP CONSIGNATARIAS - Marzo 2026                         │
├─────────────────────────────────────────────────────────────┤
│  #1  Colombo y Colombo        │ 47 remates │ 12,450 cab    │
│  #2  O'Farrell                │ 38 remates │ 9,200 cab     │
│  #3  Madelan                  │ 31 remates │ 8,100 cab     │
│  #4  UMC Haciendas Villaguay  │ 28 remates │ 7,800 cab     │
│  ...                                                        │
│  #47 [Tu consignataria]       │ 3 remates  │ 450 cab       │
│      ↑ Subiste 5 posiciones este mes                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Métricas de Ranking

| Métrica | Peso | Descripción |
|---------|------|-------------|
| Volumen (cabezas) | 30% | Total cabezas rematadas |
| Frecuencia | 25% | Remates/mes |
| Engagement | 20% | Clics en perfil, catálogos descargados |
| Completitud | 15% | Perfil verificado, datos actualizados |
| Streaming | 10% | Transmisiones en vivo |

### 3.3 Feedback Loop

**El ranking crea comportamiento:**
- Consignatarias quieren subir → Publican más remates → Más datos para la plataforma
- Usuarios miran rankings → Descubren nuevas consignatarias → Más engagement
- Competencia visible → Consignatarias invierten en presencia digital

---

## Fase 4: Comparativas (Decisión informada)

### 4.1 Comparador de Consignatarias

```
┌─────────────────────────────────────────────────────────────┐
│  ⚖️ COMPARAR: Colombo vs O'Farrell vs Madelan              │
├─────────────────────────────────────────────────────────────┤
│                    │ Colombo    │ O'Farrell  │ Madelan     │
│  ──────────────────┼────────────┼────────────┼─────────────│
│  Remates/año       │ 156        │ 124        │ 98          │
│  Provincias        │ 4          │ 3          │ 5           │
│  Cabezas totales   │ 45,200     │ 32,100     │ 28,400      │
│  Streaming         │ ✅ 80%     │ ✅ 60%     │ ❌ 20%      │
│  Catálogos online  │ ✅ 95%     │ ✅ 85%     │ ✅ 70%      │
│  Verificado        │ ✅         │ ✅         │ ⏳ Pendiente │
│  ──────────────────┼────────────┼────────────┼─────────────│
│  📞 Contactar      │ [Botón]    │ [Botón]    │ [Botón]     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Comparador de Remates

**Cuando hay múltiples remates el mismo día:**

```
┌─────────────────────────────────────────────────────────────┐
│  📅 3 remates de invernada el 15 de abril                   │
├─────────────────────────────────────────────────────────────┤
│                    │ Colombo    │ Lehmann    │ UMC         │
│  ──────────────────┼────────────┼────────────┼─────────────│
│  Hora              │ 09:00      │ 10:30      │ 14:00       │
│  Cabezas           │ 1,200      │ 800        │ 650         │
│  Ubicación         │ Mercedes   │ Lehmann    │ Villaguay   │
│  Streaming         │ ✅         │ ✅         │ ❌          │
│  Distancia         │ 45 km      │ 120 km     │ 200 km      │
│  ──────────────────┼────────────┼────────────┼─────────────│
│  [Agregar a calendario] [Ver catálogos] [Calcular ruta]    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Data Gravity

**La comparativa crea valor único:**
- Nadie más tiene los datos para hacer esta comparación
- El usuario necesita la plataforma para decidir
- Los datos mejoran con cada decisión (qué comparaciones son más útiles)

---

## Fase 5: Acciones Directas (Transacción en plataforma)

### 5.1 Contacto Estructurado

**No es solo "teléfono visible":**

```
┌─────────────────────────────────────────────────────────────┐
│  📞 CONTACTAR A COLOMBO Y COLOMBO                           │
├─────────────────────────────────────────────────────────────┤
│  Motivo del contacto:                                       │
│  ○ Consultar por remate específico                          │
│  ○ Consignar hacienda                                       │
│  ○ Solicitar información general                            │
│  ○ Otro                                                     │
│                                                             │
│  Remate de interés: [Dropdown con remates próximos]         │
│                                                             │
│  Mensaje (opcional):                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Contactar vía: [WhatsApp] [Email] [Llamar]                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Lead Tracking (Para PRO)

**La consignataria ve:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 LEADS DE ESTA SEMANA                                    │
├─────────────────────────────────────────────────────────────┤
│  Juan Pérez          │ Consulta remate 15/04 │ WhatsApp    │
│  María García        │ Quiere consignar      │ Email       │
│  Estancia El Roble   │ Info general          │ Llamada     │
│  ──────────────────────────────────────────────────────────│
│  Total: 12 leads │ +40% vs semana anterior │ Conversión: 3 │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Feedback Loop

**Cada contacto genera datos:**
- Qué tipo de consultas recibe cada consignataria
- Qué remates generan más interés
- Qué usuarios son compradores vs remitentes
- Estacionalidad de la demanda

---

## Fase 6: Watchlists y Portfolios (Estado persistente)

### 6.1 Watchlist de Remates

```
┌─────────────────────────────────────────────────────────────┐
│  👁️ MI WATCHLIST (8 remates)                                │
├─────────────────────────────────────────────────────────────┤
│  ☑️ Colombo - Invernada Mercedes     │ 15/04 │ 🔔 Activa   │
│  ☑️ O'Farrell - Cría Gualeguaychú    │ 16/04 │ 🔔 Activa   │
│  ☐ Lehmann - General                 │ 18/04 │ Sin alerta  │
│  ...                                                        │
│  ──────────────────────────────────────────────────────────│
│  [Exportar a calendario] [Compartir lista] [Limpiar pasados]│
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Portfolio de Compras (Fase avanzada)

**Si el usuario registra sus compras:**

```
┌─────────────────────────────────────────────────────────────┐
│  📈 MI PORTFOLIO 2026                                       │
├─────────────────────────────────────────────────────────────┤
│  Total comprado:     │ 2,450 cabezas │ $892,000,000 ARS    │
│  Precio promedio:    │ $4,120/kg     │ +3% vs mercado      │
│  Consignatarias:     │ 4 diferentes                        │
│  Categoría principal:│ Novillitos (65%)                    │
│  ──────────────────────────────────────────────────────────│
│  📊 [Ver análisis] [Comparar con mercado] [Exportar]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Fase 7: Network Effects (El valor escala)

### 7.1 Efectos de Red Directos

| Más usuarios | → | Más valor |
|--------------|---|-----------|
| Más compradores | → | Consignatarias quieren estar listadas |
| Más consignatarias | → | Más datos, mejor cobertura |
| Más datos | → | Mejores rankings, comparativas, alertas |
| Mejores herramientas | → | Más usuarios |

### 7.2 Efectos de Red Indirectos

| Actor A | Acción | Beneficio para Actor B |
|---------|--------|------------------------|
| Comprador sigue consignataria | → | Consignataria ve "N seguidores" |
| Consignataria publica catálogo | → | Comprador tiene más info |
| Usuario compara | → | Sistema aprende qué comparar |
| PRO paga | → | Plataforma mejora para todos |

### 7.3 Data Network Effects

**Los datos se vuelven más valiosos con el uso:**

```
Usuario A busca "invernada Corrientes"
  → Sistema aprende que invernada + Corrientes es combo frecuente
  → Mejora sugerencias para Usuario B
  → Usuario B encuentra más rápido
  → Usuario B hace más búsquedas
  → Sistema aprende más
  → Loop infinito
```

---

## Fase 8: Estándar Operativo (Lock-in definitivo)

### 8.1 Integración con Workflow

**El sistema se vuelve parte del trabajo diario:**

| Actor | Workflow actual | Workflow con plataforma |
|-------|-----------------|-------------------------|
| Comprador | Llamar consignatarias, pedir catálogos | Abrir app, ver feed personalizado |
| Consignataria | Publicar en web propia | Publicar en plataforma (llega a más gente) |
| Remitente | Buscar consignataria por conocido | Comparar opciones, elegir mejor |

### 8.2 API & Embeds

**Otros sistemas dependen de nosotros:**

```javascript
// Embed de remates en web de consignataria
<script src="https://consignatarias.com.ar/embed/colombo-y-colombo.js"></script>

// API para sistemas de gestión ganadera
GET /api/v1/remates?provincia=corrientes&tipo=invernada
Authorization: Bearer <api_key>
```

### 8.3 Métricas de Lock-in

| Métrica | Target | Indica |
|---------|--------|--------|
| DAU/MAU ratio | > 40% | Uso habitual |
| Alertas por usuario | > 5 | Dependencia |
| Tiempo en plataforma | > 5 min/sesión | Engagement |
| Follows por usuario | > 10 | Personalización |
| % decisiones en plataforma | > 50% | Estándar operativo |

---

## Roadmap de Implementación

### Q2 2026 (Abril-Junio)
- [x] Follow system básico
- [ ] Alertas por email (remates de seguidos)
- [ ] Historial de visitas
- [ ] Watchlist de remates

### Q3 2026 (Julio-Septiembre)
- [ ] Feed personalizado
- [ ] Rankings dinámicos v1
- [ ] Comparador de consignatarias
- [ ] Push notifications

### Q4 2026 (Octubre-Diciembre)
- [ ] Alertas inteligentes (precio, oportunidad)
- [ ] Comparador de remates
- [ ] Contacto estructurado con tracking
- [ ] API pública v1

### 2027
- [ ] Portfolio de compras
- [ ] Predicciones de precio
- [ ] Marketplace (transacción directa)
- [ ] Mobile app nativa

---

## Métricas de Éxito

| Fase | Métrica | Target |
|------|---------|--------|
| Statefulness | Usuarios con cuenta | 1,000 |
| Alertas | Alertas configuradas | 5,000 |
| Rankings | Consignatarias compitiendo | 50 |
| Comparativas | Comparaciones/día | 100 |
| Acciones | Leads/mes | 500 |
| Network | DAU | 500 |
| Lock-in | Churn rate | < 5%/mes |

---

## Conclusión

La transición es:

```
Información → Inteligencia → Decisión → Transacción
   (hoy)        (Q2-Q3)       (Q4)       (2027)
```

**El objetivo no es que los usuarios visiten la plataforma.**
**El objetivo es que no puedan operar sin ella.**

---

*Documento estratégico. Ejecución por fases. Cada fase aumenta switching costs.*
